/**
 * Public-Ready Differential Sync Engine
 * 
 * Safely allows synchronous localStorage operations to be persisted to Supabase
 * without arrays clashing. It computes the diff between old and new states 
 * and only pushes the specific items that were inserted, updated, or deleted.
 */

(function() {
    const TABLES_TO_SYNC = {
        'nd_products_data': 'products',
        'nd_requests_data': 'requests',
        'nd_messages': 'messages',
        'nd_comm_messages': 'community_messages',
        'nd_sales_history': 'sales_history',
        'nd_debtor_notes': 'debtor_notes',
        'nd_debt_requests': 'debt_requests',
        'nd_expenses_notebook': 'expenses_notebook',
        'nd_user_cart_data': 'user_carts',
        'nd_income_allocations': 'income_allocations',
        'nd_ai_chat_history': 'ai_chat_history',
        'nd_ai_chat_threads': 'ai_chat_threads',
        'nd_user_ai_chat_threads': 'user_ai_chat_threads'
    };

    const SETTINGS_KEYS = [
        'nd_maintenance_mode', 'nd_payout_rate', 'nd_payout_enabled',
        'nd_reward_purchase_enabled', 'nd_referral_earnings_enabled', 'nd_admin_locks', 'nd_bank_account_num',
        'nd_bank_account_name', 'nd_bank_name', 'nd_delete_pin',
        'nd_shop_name', 'nd_shop_owner_phone', 'nd_about_text',
        'nd_lend_service_enabled', 'nd_lend_price', 'nd_lend_announcement',
        'nd_lend_bank_num', 'nd_lend_bank_name', 'nd_lend_bank_acc_name', 'nd_lend_phone'
    ];
    
    // We keep an in-memory cache of the "last known good state" to compute diffs against
    let stateCache = {};

    // Track timestamps of last local writes to prevent in-flight fetches from overwriting newer local state
    const lastLocalWrite = {};

    const nativeSetItem = Storage.prototype.setItem;
    const nativeRemoveItem = Storage.prototype.removeItem;
    const nativeClear = Storage.prototype.clear;
    const AUTH_KEYS = ['nd_token', 'nd_admin_logged_in', 'nd_logged_in_user', 'nd_admin_id'];
    
    // Initialize cache and pull fresh data from Supabase
    async function initSync() {
        if (!navigator.onLine) {
            console.log("[sync] Browser is offline, skipping pull.");
            return;
        }

        // Determine the current user context
        let userId = '';
        // Prefer sessionStorage (tab-isolated) to avoid cross-tab session bleed
        const token = sessionStorage.getItem('nd_token') || localStorage.getItem('nd_token') || '';
        if (sessionStorage.getItem('nd_admin_logged_in') === 'true') {
            userId = localStorage.getItem('nd_admin_id') || '';
        } else {
            const userStr = sessionStorage.getItem('nd_logged_in_user') || localStorage.getItem('nd_logged_in_user');
            if (userStr) {
                try {
                    const u = JSON.parse(userStr);
                    userId = u.id || '';
                } catch(e){}
            }
        }

        const authHeaders = token
            ? { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
            : { 'Content-Type': 'application/json' };

        for (const [localKey, tableName] of Object.entries(TABLES_TO_SYNC)) {
            // Skip user-specific tables if there is no logged-in user or admin
            const userSpecificTables = ['requests', 'messages', 'user_carts', 'ai_chat_history', 'ai_chat_threads', 'user_ai_chat_threads'];
            if (userSpecificTables.includes(tableName) && !userId) {
                console.log(`[sync] Skipping pull for user-specific table ${tableName} because no user is logged in.`);
                continue;
            }
            try {
                // Read what's currently in localStorage
                const currentLocal = JSON.parse(localStorage.getItem(localKey) || '[]');
                stateCache[localKey] = currentLocal;

                const fetchStartTime = Date.now();

                // Pull absolute truth from server with auth token and timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 seconds timeout

                const res = await fetch(`${window.API_BASE}/api/get-table/${tableName}?userId=${userId}&_t=${Date.now()}`, {
                    headers: authHeaders,
                    signal: controller.signal,
                    cache: 'no-store'
                });
                clearTimeout(timeoutId);
                const data = await res.json();
                
                if (data.success && data.data) {
                    // Check if a local write occurred while the fetch was in progress
                    if (lastLocalWrite[localKey] && lastLocalWrite[localKey] >= fetchStartTime) {
                        console.log(`[sync] Skipping pull update for ${localKey} because a newer local change occurred.`);
                        continue;
                    }

                    // Prevent overwriting local data if there are pending optimistic updates
                    const freshQueue = JSON.parse(localStorage.getItem('nd_sync_retry_queue') || '[]');
                    const hasPendingOps = freshQueue.some(q => q.table === tableName);
                    if (!hasPendingOps) {
                        let serverData = data.data;
                        if (localKey === 'nd_products_data') {
                            serverData = serverData.map(p => ({
                                ...p,
                                isSpecial: p.isSpecial === true || p.isSpecial === 'true',
                                isFlexible: p.isFlexible === true || p.isFlexible === 'true',
                                isCustom: p.isCustom === true || p.isCustom === 'true'
                            }));
                        }
                        // Update localStorage with truth
                        nativeSetItem.call(localStorage, localKey, JSON.stringify(serverData));
                        stateCache[localKey] = serverData; // Update cache
                    }
                }
            } catch (err) {
                console.error(`Failed to pull ${tableName} from server:`, err);
            }
        }

        try {
            const fetchStartTime = Date.now();
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 seconds timeout

            const res = await fetch(`${window.API_BASE}/api/get-table/admin_settings?_t=${Date.now()}`, {
                headers: authHeaders,
                signal: controller.signal,
                cache: 'no-store'
            });
            clearTimeout(timeoutId);
            const data = await res.json();
            if (data.success && data.data) {
                // Prevent overwriting local settings if there are pending optimistic updates
                const freshQueue = JSON.parse(localStorage.getItem('nd_sync_retry_queue') || '[]');
                const hasPendingSettings = freshQueue.some(q => q.table === 'admin_settings');
                if (!hasPendingSettings) {
                    const receivedKeys = new Set(data.data.map(s => s.id));
                    
                    for (const setting of data.data) {
                        // Check if a local write occurred while the fetch was in progress
                        if (lastLocalWrite[setting.id] && lastLocalWrite[setting.id] >= fetchStartTime) {
                            continue;
                        }
                        // admin_settings rows have { id, value } columns
                        const val = typeof setting.value === 'object' && setting.value !== null
                            ? JSON.stringify(setting.value)
                            : String(setting.value ?? '');
                        nativeSetItem.call(localStorage, setting.id, val);
                        stateCache[setting.id] = val;
                    }

                    // For keys in SETTINGS_KEYS that were NOT returned by the server,
                    // remove them from localStorage and stateCache so the local state reflects backend deletions
                    for (const key of SETTINGS_KEYS) {
                        if (!receivedKeys.has(key)) {
                            if (lastLocalWrite[key] && lastLocalWrite[key] >= fetchStartTime) {
                                continue;
                            }
                            localStorage.removeItem(key);
                            delete stateCache[key];
                        }
                    }
                }
            }
        } catch (err) {
            console.error(`Failed to pull admin settings:`, err);
        }
        
        // Let the app know data is fresh
        window.dispatchEvent(new Event('nd_sync_complete'));
        processSyncQueue();
    }

    // Intercept localStorage/sessionStorage writes
    Storage.prototype.setItem = function(key, value) {
        if (key === 'nd_products_data') {
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed)) {
                    const normalized = parsed.map(p => ({
                        ...p,
                        isSpecial: p.isSpecial === true || p.isSpecial === 'true',
                        isFlexible: p.isFlexible === true || p.isFlexible === 'true',
                        isCustom: p.isCustom === true || p.isCustom === 'true'
                    }));
                    value = JSON.stringify(normalized);
                }
            } catch (e) {
                console.error('[sync] Error normalizing products on write:', e);
            }
        }
        
        nativeSetItem.call(this, key, value);
        
        if (TABLES_TO_SYNC[key]) {
            lastLocalWrite[key] = Date.now();
            handleMutation(key, value);
        } else if (SETTINGS_KEYS.includes(key)) {
            lastLocalWrite[key] = Date.now();
            handleSettingsMutation(key, value);
            // Dispatch custom event to notify local listeners
            const event = new CustomEvent('local-storage-update', { detail: { key: key, value: value } });
            window.dispatchEvent(event);
            window.dispatchEvent(new Event('nd_sync_complete'));
        } else if (AUTH_KEYS.includes(key)) {
            console.log(`[sync] Auth key ${key} updated in storage. Debouncing re-sync...`);
            if (window._syncDebounce) clearTimeout(window._syncDebounce);
            window._syncDebounce = setTimeout(() => {
                initSync();
            }, 200);
        }
    };

    Storage.prototype.removeItem = function(key) {
        nativeRemoveItem.call(this, key);
        if (AUTH_KEYS.includes(key)) {
            console.log(`[sync] Auth key ${key} removed from storage. Debouncing re-sync...`);
            if (window._syncDebounce) clearTimeout(window._syncDebounce);
            window._syncDebounce = setTimeout(() => {
                initSync();
            }, 200);
        }
    };

    Storage.prototype.clear = function() {
        nativeClear.call(this);
        console.log('[sync] Storage cleared. Debouncing re-sync...');
        if (window._syncDebounce) clearTimeout(window._syncDebounce);
        window._syncDebounce = setTimeout(() => {
            initSync();
        }, 200);
    };

    function handleSettingsMutation(key, value) {
        try {
            if (stateCache[key] === value) return;
            stateCache[key] = value;
            queueOperations('admin_settings', [{ type: 'UPDATE', data: { id: key, value: value } }]);
            processSyncQueue();
        } catch (e) {}
    }

    function queueOperations(table, operations) {
        let queue = [];
        try {
            queue = JSON.parse(localStorage.getItem('nd_sync_retry_queue') || '[]');
        } catch (e) {}
        
        operations.forEach(op => {
            let existingIdx = queue.findIndex(q => {
                if (q.table !== table) return false;
                if (op.id && q.operation.id === op.id) return true;
                if (op.data && op.data.id && q.operation.data && q.operation.data.id === op.data.id) return true;
                return false;
            });

            if (existingIdx !== -1) {
                if (op.type === 'DELETE') {
                    queue[existingIdx].operation = op;
                    queue[existingIdx].timestamp = Date.now();
                } else if (op.type === 'UPDATE') {
                    if (queue[existingIdx].operation.type === 'INSERT') {
                        queue[existingIdx].operation.data = op.data;
                        queue[existingIdx].timestamp = Date.now();
                    } else {
                        queue[existingIdx].operation = op;
                        queue[existingIdx].timestamp = Date.now();
                    }
                } else if (op.type === 'INSERT') {
                     // Should not normally happen, but overwrite anyway
                     queue[existingIdx].operation = op;
                     queue[existingIdx].timestamp = Date.now();
                }
            } else {
                queue.push({
                    id: 'sync_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                    table,
                    operation: op,
                    timestamp: Date.now(),
                    retries: 0
                });
            }
        });
        
        try {
            localStorage.setItem('nd_sync_retry_queue', JSON.stringify(queue));
        } catch(e) {}
    }

    let isSyncingQueue = false;
    async function processSyncQueue() {
        if (isSyncingQueue) return;
        isSyncingQueue = true;
        
        let queue = [];
        try {
            queue = JSON.parse(localStorage.getItem('nd_sync_retry_queue') || '[]');
        } catch (e) {}
        
        if (queue.length === 0) {
            isSyncingQueue = false;
            return;
        }
        
        const groups = {};
        queue.forEach(item => {
            if (!groups[item.table]) groups[item.table] = [];
            groups[item.table].push(item);
        });
        
        // Prefer sessionStorage (tab-isolated) for auth token
        const token = sessionStorage.getItem('nd_token') || localStorage.getItem('nd_token') || '';
        const headers = {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        };
        
        let progressMade = false;
        let networkErrorOccurred = false;
        
        for (const [table, items] of Object.entries(groups)) {
            const operations = items.map(item => item.operation);
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 seconds timeout

                 const res = await fetch(`${window.API_BASE}/api/sync-items`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ table, operations }),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                const data = await res.json();
                if (data.success) {
                    const itemIds = items.map(item => item.id);
                    let currentQueue = JSON.parse(localStorage.getItem('nd_sync_retry_queue') || '[]');
                    currentQueue = currentQueue.filter(item => {
                        if (!itemIds.includes(item.id)) return true;
                        const originalItem = items.find(x => x.id === item.id);
                        if (originalItem && item.timestamp > originalItem.timestamp) {
                            return true;
                        }
                        return false;
                    });
                    localStorage.setItem('nd_sync_retry_queue', JSON.stringify(currentQueue));
                    console.log(`[sync-queue] Successfully synced ${operations.length} pending ops for ${table}`);
                    progressMade = true;
                } else {
                    console.warn(`[sync-queue] Sync failed for ${table}:`, data.error);
                    let currentQueue = JSON.parse(localStorage.getItem('nd_sync_retry_queue') || '[]');
                    let updatedQueue = currentQueue.map(item => {
                        if (items.some(x => x.id === item.id)) {
                            item.retries = (item.retries || 0) + 1;
                        }
                        return item;
                    }).filter(item => {
                        if (item.retries >= 5) {
                            console.warn(`[sync-queue] Discarding persistently failing sync item ${item.id} for table ${item.table} after 5 retries. Error:`, data.error);
                            return false;
                        }
                        return true;
                    });
                    localStorage.setItem('nd_sync_retry_queue', JSON.stringify(updatedQueue));
                }
            } catch (err) {
                console.error(`[sync-queue] Network error syncing ${table} (offline/poor network):`, err);
                networkErrorOccurred = true;
                break; 
            }
        }
        
        isSyncingQueue = false;

        if (progressMade && !networkErrorOccurred) {
            let freshQueue = [];
            try { freshQueue = JSON.parse(localStorage.getItem('nd_sync_retry_queue') || '[]'); } catch(e){}
            if (freshQueue.length > 0) {
                processSyncQueue();
            }
        }
    }

    // Attempt to process queue when user comes online
    window.addEventListener('online', processSyncQueue);

    function handleMutation(key, newValueString) {
        try {
            const oldList = stateCache[key] || [];
            let newList = JSON.parse(newValueString || '[]');
            
            // AUTO-ID: assign stable IDs to items that don't have one
            let needsWriteback = false;
            newList = newList.map(item => {
                if (item && !item.id) {
                    item.id = key + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    needsWriteback = true;
                }
                return item;
            });

            // Write back with IDs so they persist in localStorage
            if (needsWriteback) {
                nativeSetItem.call(localStorage, key, JSON.stringify(newList));
            }

            const tableName = TABLES_TO_SYNC[key];
            const operations = [];

            // Build maps - skip items without id (safety check)
            const oldMap = new Map(oldList.filter(i => i && i.id).map(item => [String(item.id), item]));
            const newMap = new Map(newList.filter(i => i && i.id).map(item => [String(item.id), item]));

            // Detect Inserts and Updates
            for (const [id, newItem] of newMap.entries()) {
                const oldItem = oldMap.get(id);
                if (!oldItem) {
                    operations.push({ type: 'INSERT', data: newItem });
                } else if (JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
                    operations.push({ type: 'UPDATE', data: newItem });
                }
            }

            // Detect Deletes
            for (const [id] of oldMap.entries()) {
                if (!newMap.has(id)) {
                    operations.push({ type: 'DELETE', id: id });
                }
            }

            if (operations.length > 0) {
                queueOperations(tableName, operations);
                processSyncQueue();
            }
            
            // Update cache to reflect new state
            stateCache[key] = newList;

        } catch (e) {
            console.error('Error handling mutation for', key, e);
        }
    }


    // Start initialization
    initSync();
    
    function applyServerDelta(table, operations) {
        let localKey = null;
        for (const [key, t] of Object.entries(TABLES_TO_SYNC)) {
            if (t === table) { localKey = key; break; }
        }
        
        if (!localKey && table === 'admin_settings') {
            operations.forEach(op => {
                if (op.type === 'INSERT' || op.type === 'UPDATE') {
                    if (op.data && op.data.id) {
                        const key = op.data.id;
                        const val = typeof op.data.value === 'object' ? JSON.stringify(op.data.value) : String(op.data.value ?? '');
                        nativeSetItem.call(localStorage, key, val);
                        stateCache[key] = val;
                        // Notify all local-storage-update listeners (product.js, payout.js, etc.)
                        // so they re-render immediately without waiting for the 1-second polling cycle.
                        const evt = new CustomEvent('local-storage-update', { detail: { key: key, value: val } });
                        window.dispatchEvent(evt);
                    }
                } else if (op.type === 'DELETE') {
                    localStorage.removeItem(op.id);
                    delete stateCache[op.id];
                }
            });
            window.dispatchEvent(new Event('nd_sync_complete'));
            return;
        }

        if (!localKey) return;

        let currentList = [];
        try {
            currentList = JSON.parse(localStorage.getItem(localKey) || '[]');
        } catch(e) {}

        let changed = false;
        operations.forEach(op => {
            if (op.type === 'INSERT' || op.type === 'UPDATE') {
                const idx = currentList.findIndex(item => String(item.id) === String(op.data.id));
                if (idx !== -1) {
                    currentList[idx] = op.data;
                } else {
                    currentList.push(op.data);
                }
                changed = true;
            } else if (op.type === 'DELETE') {
                const oldLen = currentList.length;
                currentList = currentList.filter(item => String(item.id) !== String(op.id));
                if (currentList.length !== oldLen) changed = true;
            }
        });

        if (changed) {
            let valList = currentList;
            if (localKey === 'nd_products_data') {
                valList = valList.map(p => ({
                    ...p,
                    isSpecial: p.isSpecial === true || p.isSpecial === 'true',
                    isFlexible: p.isFlexible === true || p.isFlexible === 'true',
                    isCustom: p.isCustom === true || p.isCustom === 'true'
                }));
            }
            const val = JSON.stringify(valList);
            nativeSetItem.call(localStorage, localKey, val);
            stateCache[localKey] = valList;
            const evt = new CustomEvent('local-storage-update', { detail: { key: localKey, value: val } });
            window.dispatchEvent(evt);
            window.dispatchEvent(new Event('nd_sync_complete'));
        }
    }

    // Connect to SSE for instant updates
    function connectSSE() {
        if (!window.API_BASE) return;
        try {
            const eventSource = new EventSource(`${window.API_BASE}/api/stream`);
            eventSource.onopen = () => {
                // Ensure we are fully synced upon connection (catches missed updates while disconnected)
                initSync();
            };
            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'sync') {
                        if (data.payload && data.payload.table && data.payload.operations) {
                            applyServerDelta(data.payload.table, data.payload.operations);
                        } else {
                            if (window._syncDebounce) clearTimeout(window._syncDebounce);
                            window._syncDebounce = setTimeout(() => {
                                initSync();
                            }, 200);
                        }
                    }
                } catch (e) {}
            };
            eventSource.onerror = () => {
                eventSource.close();
                setTimeout(connectSSE, 1500); // Attempt to reconnect after 1.5s
            };
        } catch (e) {
            console.warn('[sync] SSE connection failed:', e);
        }
    }
    
    connectSSE();
    
    // Listen for storage changes from other tabs to keep stateCache in sync
    window.addEventListener('storage', (e) => {
        if (e.key && TABLES_TO_SYNC[e.key]) {
            lastLocalWrite[e.key] = Date.now();
            try {
                stateCache[e.key] = JSON.parse(e.newValue || '[]');
            } catch (err) {}
        } else if (e.key && SETTINGS_KEYS.includes(e.key)) {
            lastLocalWrite[e.key] = Date.now();
            stateCache[e.key] = e.newValue;
            // Dispatch custom event so UI components in this tab update immediately
            const event = new CustomEvent('local-storage-update', { detail: { key: e.key, value: e.newValue } });
            window.dispatchEvent(event);
        }
    });

})();


