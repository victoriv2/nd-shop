/**
 * REAL-TIME SYNC ENGINE
 * 
 * This module enables real-time data synchronization across browser tabs/windows
 * and automatic UI updates when data changes. It also persists the current page
 * state so users stay on the same page after refresh.
 */

class RealtimeSyncEngine {
    constructor() {
        this.listeners = {}; // { dataKey: [callbacks] }
        this.anyListeners = []; // called for every synced key change
        this.lastSync = {}; // Track last sync to debounce
        this.syncDelay = 300; // ms
        this.isInitialized = false;
    }

    /**
     * Initialize the sync engine - call this once on page load
     * Add "realtimeRefresh" callbacks that will be called when data changes
     */
    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;

        // Listen for storage changes from other tabs (legacy/fallback)
        window.addEventListener('storage', (e) => {
            if (e.key && e.newValue !== e.oldValue) {
                this.broadcastChange(e.key);
            }
        });

        // Also set up polling for same-tab changes (legacy/fallback)
        setInterval(() => this.pollForChanges(), 1000);

        // Supabase Real-Time Subscriptions
        if (window.supabaseClient) {
            console.log('[RealtimeSync] Setting up Supabase Realtime Channels');
            
            // Listen to messages
            window.supabaseClient.channel('custom-messages-channel')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
                    console.log('Message change received!', payload);
                    if (payload.new && payload.new.raw_data) {
                        const msgs = JSON.parse(localStorage.getItem('nd_messages') || '[]');
                        // Avoid duplicates
                        if (!msgs.some(m => m.id === payload.new.raw_data.id)) {
                            msgs.push(payload.new.raw_data);
                            window.__isSupabaseSyncing = true;
                            localStorage.setItem('nd_messages', JSON.stringify(msgs));
                            window.__isSupabaseSyncing = false;
                            this.broadcastChange('nd_messages');
                        }
                    }
                })
                .subscribe();

            // Listen to community messages
            window.supabaseClient.channel('custom-community-channel')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_messages' }, payload => {
                    console.log('Community message received!', payload);
                    if (payload.new && payload.new.raw_data) {
                        const msgs = JSON.parse(localStorage.getItem('nd_comm_messages') || '[]');
                        // Avoid duplicates
                        if (!msgs.some(m => m.id === payload.new.raw_data.id)) {
                            msgs.push(payload.new.raw_data);
                            window.__isSupabaseSyncing = true;
                            localStorage.setItem('nd_comm_messages', JSON.stringify(msgs));
                            window.__isSupabaseSyncing = false;
                            this.broadcastChange('nd_comm_messages');
                        }
                    }
                })
                .subscribe();
                
            // Products table changes — app_state is the canonical sync path for full product JSON
            window.supabaseClient.channel('custom-products-channel')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
                    this.broadcastChange('nd_products_data');
                })
                .subscribe();
                
            // Listen to payouts / sales / requests
            window.supabaseClient.channel('custom-sales-channel')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, payload => {
                    this.broadcastChange('nd_sales_history');
                })
                .subscribe();

            // Listen to App State (Global Sync Bridge)
            window.supabaseClient.channel('custom-app-state-channel')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'app_state' }, payload => {
                    const row = payload.new || payload.old;
                    if (!row || !row.key) return;
                    if (window.NdCloudSync && !window.NdCloudSync.shouldSyncKey(row.key)) return;

                    window.__isSupabaseSyncing = true;
                    if (payload.eventType === 'DELETE') {
                        localStorage.removeItem(row.key);
                    } else if (row.data !== undefined && row.data !== null) {
                        const val = window.NdCloudSync
                            ? window.NdCloudSync.valueForLocalStorage(row.data)
                            : JSON.stringify(row.data);
                        localStorage.setItem(row.key, val);
                    }
                    window.__isSupabaseSyncing = false;
                    this.broadcastChange(row.key);
                })
                .subscribe();
                
            // Perform Initial Data Fetch to hydrate localStorage
            this.initialFetch();
        }

        // Restore page state on load
        this.restorePageState();

        console.log('[RealtimeSync] Engine initialized');
    }

    async initialFetch() {
        try {
            // Fetch Community Messages
            const { data: commData } = await window.supabaseClient.from('community_messages').select('raw_data').not('raw_data', 'is', null);
            if (commData && commData.length > 0) {
                const mappedComm = commData.map(d => d.raw_data);
                window.__isSupabaseSyncing = true;
                localStorage.setItem('nd_comm_messages', JSON.stringify(mappedComm));
                window.__isSupabaseSyncing = false;
                this.broadcastChange('nd_comm_messages');
            }

            // Fetch Direct Messages
            const { data: msgData } = await window.supabaseClient.from('messages').select('raw_data').not('raw_data', 'is', null);
            if (msgData && msgData.length > 0) {
                const mappedMsg = msgData.map(d => d.raw_data);
                window.__isSupabaseSyncing = true;
                localStorage.setItem('nd_messages', JSON.stringify(mappedMsg));
                window.__isSupabaseSyncing = false;
                this.broadcastChange('nd_messages');
            }

            // Fetch App State (Global Sync Bridge)
            const { data: appStateData } = await window.supabaseClient.from('app_state').select('*');
            if (appStateData && appStateData.length > 0) {
                window.__isSupabaseSyncing = true;
                appStateData.forEach(row => {
                    if (window.NdCloudSync && !window.NdCloudSync.shouldSyncKey(row.key)) return;
                    const val = window.NdCloudSync
                        ? window.NdCloudSync.valueForLocalStorage(row.data)
                        : JSON.stringify(row.data);
                    localStorage.setItem(row.key, val);
                    this.broadcastChange(row.key);
                });
                window.__isSupabaseSyncing = false;
            }

        } catch(e) {
            console.error('[RealtimeSync] Initial fetch failed:', e);
        }
    }

    /**
     * Register a listener for a specific data key
     * When this key changes in localStorage, callback will be called
     * 
     * Example:
     *   realtimeSync.on('nd_products_data', () => window.refreshProducts?.())
     */
    on(dataKey, callback) {
        if (!this.listeners[dataKey]) {
            this.listeners[dataKey] = [];
        }
        this.listeners[dataKey].push(callback);
    }

    /** Fires on every synced nd_* key change */
    onAny(callback) {
        this.anyListeners.push(callback);
    }

    /**
     * Broadcast a change to all registered listeners
     */
    broadcastChange(dataKey) {
        // Debounce rapid changes
        if (this.lastSync[dataKey] && Date.now() - this.lastSync[dataKey] < this.syncDelay) {
            return;
        }
        this.lastSync[dataKey] = Date.now();

        if (this.listeners[dataKey]) {
            this.listeners[dataKey].forEach(callback => {
                try {
                    callback();
                } catch (e) {
                    console.warn(`[RealtimeSync] Error in callback for ${dataKey}:`, e);
                }
            });
        }

        if (window.NdCloudSync && window.NdCloudSync.shouldSyncKey(dataKey)) {
            this.anyListeners.forEach(callback => {
                try {
                    callback(dataKey);
                } catch (e) {
                    console.warn(`[RealtimeSync] Error in onAny for ${dataKey}:`, e);
                }
            });
            try {
                window.dispatchEvent(new CustomEvent('nd-cloud-key-updated', { detail: { key: dataKey } }));
            } catch (e) { /* ignore */ }
        }
    }

    /**
     * Manually trigger a sync for a data key (useful after manual save)
     */
    syncNow(dataKey) {
        // Remove debounce
        this.lastSync[dataKey] = 0;
        this.broadcastChange(dataKey);
    }

    /**
     * Determine which localStorage key to use for page state
     */
    getPageStateKey() {
        const isAdmin = window.location.pathname.includes('/admin/') ||
                       window.location.href.includes('/admin/');
        return isAdmin ? 'nd_admin_page_state' : 'nd_user_page_state';
    }

    /**
     * Save current page/tab state to localStorage
     * Call this when user navigates to a new page/tab
     */
    savePageState(pageInfo) {
        try {
            localStorage.setItem(this.getPageStateKey(), JSON.stringify({
                timestamp: Date.now(),
                ...pageInfo
            }));
        } catch (e) {
            console.warn('[RealtimeSync] Failed to save page state:', e);
        }
    }

    /**
     * Restore page state from localStorage and navigate to it
     */
    restorePageState() {
        try {
            if (window.__pageStateRestored) return;

            const isAdmin = window.location.pathname.includes('/admin/') ||
                           window.location.href.includes('/admin/');

            // Admin panel restores in admin/index.html to avoid duplicate competing loaders
            if (isAdmin && window.__adminPageRestoreHandled) return;

            const saved = localStorage.getItem(this.getPageStateKey());
            if (!saved) return;

            const state = JSON.parse(saved);
            
            // Only restore if state is recent (within 24 hours)
            if (Date.now() - state.timestamp > 86400000) {
                localStorage.removeItem(this.getPageStateKey());
                return;
            }

            // Restore based on what was stored
            if (state.tab && typeof window.switchToTab === 'function') {
                console.log('[RealtimeSync] Restoring to tab:', state.tab);
                window.switchToTab(state.tab);
                window.__pageStateRestored = true;
            }

            if (state.page && isAdmin && typeof window.loadAdminPage === 'function') {
                console.log('[RealtimeSync] Restoring to admin page:', state.page, 'subpage:', state.subpage);
                try {
                    const result = window.loadAdminPage(state.page, state.subpage);
                    if (result && typeof result.then === 'function') {
                        result.then(() => { window.__pageStateRestored = true; }).catch(() => {});
                    } else {
                        window.__pageStateRestored = true;
                    }
                } catch (e) {
                    console.warn('[RealtimeSync] Error while restoring admin page:', e);
                }
            }

            if (state.scrollY && !state.tab) {
                setTimeout(() => {
                    window.scrollY = state.scrollY;
                }, 100);
            }
        } catch (e) {
            console.warn('[RealtimeSync] Failed to restore page state:', e);
        }
    }

    /**
     * Polling mechanism for detecting changes in the same tab
     * (storage event doesn't fire when same tab modifies localStorage)
     */
    pollForChanges() {
        const storageSyncKey = 'nd_storage_poll_cache';
        let cache = {};
        
        try {
            const cached = localStorage.getItem(storageSyncKey);
            if (cached) {
                cache = JSON.parse(cached);
            }
        } catch (e) {
            // Ignore parse errors
        }

        const keysToCheck = new Set(Object.keys(this.listeners));
        if (window.NdCloudSync && typeof window.NdCloudSync.allSyncKeys === 'function') {
            window.NdCloudSync.allSyncKeys().forEach(k => keysToCheck.add(k));
        }

        keysToCheck.forEach(key => {
            try {
                const current = localStorage.getItem(key);
                const cached_val = cache[key];
                
                if (current !== cached_val) {
                    cache[key] = current;
                    this.broadcastChange(key);
                }
            } catch (e) {
                // Ignore
            }
        });

        // Update cache
        try {
            originalSetItem.call(localStorage, storageSyncKey, JSON.stringify(cache));
        } catch (e) {
            // Ignore quota exceeded
        }
    }
}

// Create global instance
window.realtimeSync = new RealtimeSyncEngine();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.realtimeSync.init();
    });
} else {
    window.realtimeSync.init();
}

// ==========================================
// GLOBAL SYNC BRIDGE (INTERCEPTOR)
// ==========================================
window.__isSupabaseSyncing = false;
const originalSetItem = localStorage.setItem;
const originalRemoveItem = localStorage.removeItem;
const originalClear = localStorage.clear;

function shouldSyncKeyToCloud(key) {
    if (window.NdCloudSync && typeof window.NdCloudSync.shouldSyncKey === 'function') {
        return window.NdCloudSync.shouldSyncKey(key);
    }
    return key && key.startsWith('nd_');
}

localStorage.setItem = function(key, value) {
    originalSetItem.apply(this, arguments);

    if (shouldSyncKeyToCloud(key) && !window.__isSupabaseSyncing && window.supabaseClient) {
        try {
            let parsedData = value;
            try { parsedData = JSON.parse(value); } catch (e) { /* plain string */ }

            if (window.NdCloudSync && typeof window.NdCloudSync.prepareDataForCloud === 'function') {
                parsedData = window.NdCloudSync.prepareDataForCloud(key, parsedData);
            }

            window.supabaseClient.from('app_state').upsert(
                { key: key, data: parsedData },
                { onConflict: 'key' }
            ).then(({ error }) => {
                if (error) console.error('[Global Sync Bridge] Failed to sync', key, error);
            });
        } catch (e) {
            console.error('[Global Sync Bridge] Error intercepting', key, e);
        }
    }
};

localStorage.removeItem = function (key) {
    originalRemoveItem.apply(this, arguments);
    if (shouldSyncKeyToCloud(key) && !window.__isSupabaseSyncing && window.supabaseClient) {
        window.supabaseClient.from('app_state').delete().eq('key', key).then(({ error }) => {
            if (error) console.error('[Global Sync Bridge] Failed to delete', key, error);
        });
        if (window.realtimeSync) window.realtimeSync.syncNow(key);
    }
};

localStorage.clear = function () {
    const keys = Object.keys(localStorage).filter(shouldSyncKeyToCloud);
    originalClear.apply(this, arguments);
    if (!window.__isSupabaseSyncing && window.supabaseClient && keys.length) {
        Promise.all(
            keys.map(key => window.supabaseClient.from('app_state').delete().eq('key', key))
        ).catch(e => console.error('[Global Sync Bridge] clear sync failed', e));
    }
};

// ==========================================
// SUPABASE STORAGE UPLOAD HELPER
// ==========================================
window.uploadBase64ToSupabase = async function(base64Str, folder = 'uploads') {
    if (!window.supabaseClient) return base64Str;
    if (!base64Str || !base64Str.startsWith('data:')) return base64Str; // Not a base64 string
    
    try {
        // Convert Base64 to Blob
        const arr = base64Str.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        
        // Generate unique filename
        const ext = mime.split('/')[1] || 'bin';
        const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
        
        // Upload to 'media' bucket
        const { data, error } = await window.supabaseClient.storage
            .from('media')
            .upload(fileName, blob, {
                cacheControl: '3600',
                upsert: false
            });
            
        if (error) throw error;
        
        // Get public URL
        const { data: publicUrlData } = window.supabaseClient.storage
            .from('media')
            .getPublicUrl(fileName);
            
        return publicUrlData.publicUrl;
    } catch (e) {
        console.error('Supabase upload failed:', e);
        return base64Str; // fallback to base64 if upload fails
    }
};

// Global Financial Helpers
window.getPayoutRate = function() { return (parseFloat(localStorage.getItem('nd_payout_rate')) || 2) / 100; };
window.getPayoutRateText = function() { return (localStorage.getItem('nd_payout_rate') || '2') + '%'; };
