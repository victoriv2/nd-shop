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
        'nd_reward_purchase_enabled', 'nd_admin_locks', 'nd_bank_account_num',
        'nd_bank_account_name', 'nd_bank_name', 'nd_delete_pin',
        'nd_shop_name', 'nd_shop_owner_phone'
    ];
    
    // We keep an in-memory cache of the "last known good state" to compute diffs against
    let stateCache = {};

    // Track timestamps of last local writes to prevent in-flight fetches from overwriting newer local state
    const lastLocalWrite = {};

    const nativeSetItem = Storage.prototype.setItem;
    
    // Initialize cache and pull fresh data from Supabase
    async function initSync() {
        if (!navigator.onLine) {
            console.log("[sync] Browser is offline, skipping pull.");
            return;
        }

        // Determine the current user context
        let userId = '';
        const token = localStorage.getItem('nd_token') || '';
        if (sessionStorage.getItem('nd_admin_logged_in') === 'true') {
            userId = localStorage.getItem('nd_admin_id') || '';
        } else {
            const userStr = localStorage.getItem('nd_logged_in_user');
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
                        // Update localStorage with truth
                        nativeSetItem.call(localStorage, localKey, JSON.stringify(data.data));
                        stateCache[localKey] = data.data; // Update cache
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
                    for (const setting of data.data) {
                        // Check if a local write occurred while the fetch was in progress
                        if (lastLocalWrite[setting.key] && lastLocalWrite[setting.key] >= fetchStartTime) {
                            continue;
                        }
                        // admin_settings rows have { key, value } columns
                        const val = typeof setting.value === 'object' && setting.value !== null
                            ? JSON.stringify(setting.value)
                            : String(setting.value ?? '');
                        nativeSetItem.call(localStorage, setting.key, val);
                        stateCache[setting.key] = val;
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

    // Intercept localStorage writes
    Storage.prototype.setItem = function(key, value) {
        nativeSetItem.apply(this, arguments);
        
        if (TABLES_TO_SYNC[key]) {
            lastLocalWrite[key] = Date.now();
            handleMutation(key, value);
        } else if (SETTINGS_KEYS.includes(key)) {
            lastLocalWrite[key] = Date.now();
            handleSettingsMutation(key, value);
        }
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
                    timestamp: Date.now()
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
        
        const token = localStorage.getItem('nd_token') || '';
        const headers = {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        };
        
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
                    currentQueue = currentQueue.filter(item => !itemIds.includes(item.id));
                    localStorage.setItem('nd_sync_retry_queue', JSON.stringify(currentQueue));
                    console.log(`[sync-queue] Successfully synced ${operations.length} pending ops for ${table}`);
                } else {
                    console.warn(`[sync-queue] Sync failed for ${table}:`, data.error);
                }
            } catch (err) {
                console.error(`[sync-queue] Network error syncing ${table} (offline/poor network):`, err);
                break; 
            }
        }
        
        isSyncingQueue = false;
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
    
    // Connect to SSE for instant updates
    function connectSSE() {
        if (!window.API_BASE) return;
        try {
            const eventSource = new EventSource(`${window.API_BASE}/api/stream`);
            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'sync') {
                        // Debounce slightly to prevent API spam if multiple changes happen instantly
                        if (window._syncDebounce) clearTimeout(window._syncDebounce);
                        window._syncDebounce = setTimeout(() => {
                            initSync();
                        }, 200);
                    }
                } catch (e) {}
            };
            eventSource.onerror = () => {
                eventSource.close();
                setTimeout(connectSSE, 5000); // Attempt to reconnect after 5s
            };
        } catch (e) {
            console.warn('[sync] SSE connection failed:', e);
        }
    }
    
    connectSSE();
    
    // Keep a slower background poll as a safety net (10 seconds instead of 3)
    setInterval(initSync, 10000);
    
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
        }
    });

})();


