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
        'nd_income_allocations': 'income_allocations',
        'nd_ai_chat_history': 'ai_chat_history',
        'nd_user_cart_data': 'user_carts'
    };

    const SETTINGS_KEYS = [
        'nd_maintenance_mode', 'nd_payout_rate', 'nd_payout_enabled',
        'nd_reward_purchase_enabled', 'nd_admin_locks', 'nd_bank_account_num',
        'nd_bank_account_name', 'nd_bank_name', 'nd_delete_pin'
    ];
    
    // We keep an in-memory cache of the "last known good state" to compute diffs against
    let stateCache = {};

    const nativeSetItem = Storage.prototype.setItem;
    
    // Initialize cache and pull fresh data from Supabase
    async function initSync() {
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

                // Pull absolute truth from server with auth token
                const res = await fetch(`${window.API_BASE}/api/get-table/${tableName}?userId=${userId}`, {
                    headers: authHeaders
                });
                const data = await res.json();
                
                if (data.success && data.data) {
                    // Update localStorage with truth
                    nativeSetItem.call(localStorage, localKey, JSON.stringify(data.data));
                    stateCache[localKey] = data.data; // Update cache
                }
            } catch (err) {
                console.error(`Failed to pull ${tableName} from server:`, err);
            }
        }

        try {
            const res = await fetch(`${window.API_BASE}/api/get-table/admin_settings`, {
                headers: authHeaders
            });
            const data = await res.json();
            if (data.success && data.data) {
                for (const setting of data.data) {
                    // admin_settings rows have { id, value } columns
                    const val = typeof setting.value === 'object' && setting.value !== null
                        ? JSON.stringify(setting.value)
                        : String(setting.value ?? '');
                    nativeSetItem.call(localStorage, setting.id, val);
                    stateCache[setting.id] = val;
                }
            }
        } catch (err) {
            console.error(`Failed to pull admin settings:`, err);
        }
        
        // Let the app know data is fresh
        window.dispatchEvent(new Event('nd_sync_complete'));
    }

    // Intercept localStorage writes
    Storage.prototype.setItem = function(key, value) {
        nativeSetItem.apply(this, arguments);
        
        if (TABLES_TO_SYNC[key]) {
            handleMutation(key, value);
        } else if (SETTINGS_KEYS.includes(key)) {
            handleSettingsMutation(key, value);
        }
    };

    function handleSettingsMutation(key, value) {
        try {
            if (stateCache[key] === value) return;
            stateCache[key] = value;
            fetch(`${window.API_BASE}/api/sync-items`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + (localStorage.getItem('nd_token') || ''), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    table: 'admin_settings',
                    operations: [{ type: 'UPDATE', data: { id: key, value: value } }]
                })
            }).catch(err => console.error('Settings sync error:', err));
        } catch (e) {}
    }

    function handleMutation(key, newValueString) {
        try {
            const oldList = stateCache[key] || [];
            let newList = JSON.parse(newValueString || '[]');
            
            // AUTO-ID: assign stable IDs to items that don't have one
            // (products are created without id - generate and persist)
            let needsWriteback = false;
            newList = newList.map(item => {
                if (!item.id) {
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
                // Push to server immediately
                fetch(`${window.API_BASE}/api/sync-items`, {
                    method: 'POST',
                    headers: {
                    'Authorization': 'Bearer ' + (localStorage.getItem('nd_token') || ''), 'Content-Type': 'application/json' },
                    body: JSON.stringify({ table: tableName, operations })
                }).then(res => res.json()).then(data => {
                    if (!data.success) console.error('Sync failed', data.error);
                    else console.log(`[sync] Synced ${operations.length} ops to ${tableName}`);
                }).catch(err => {
                    console.error('Network error during sync:', err);
                });
            }
            
            // Update cache to reflect new state
            stateCache[key] = newList;

        } catch (e) {
            console.error('Error handling mutation for', key, e);
        }
    }


    // Start initialization
    initSync();
    
    // Poll for updates every 15 seconds to simulate real-time
    setInterval(initSync, 15000);

})();
