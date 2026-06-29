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

        // Listen for storage changes from other tabs (or polling within same tab)
        window.addEventListener('storage', (e) => {
            if (e.key && e.newValue !== e.oldValue) {
                this.broadcastChange(e.key);
            }
        });

        // Listen for local storage updates within the same tab to bypass polling delay
        window.addEventListener('local-storage-update', (e) => {
            if (e.detail && e.detail.key) {
                this.broadcastChange(e.detail.key);
            }
        });

        // Also set up polling for same-tab changes (since storage event doesn't fire in same tab)
        setInterval(() => this.pollForChanges(), 1000);

        // Restore page state on load
        this.restorePageState();

        console.log('[RealtimeSync] Engine initialized');
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

        // Check monitored keys for changes
        Object.keys(this.listeners).forEach(key => {
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
            localStorage.setItem(storageSyncKey, JSON.stringify(cache));
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
