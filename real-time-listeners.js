/**
 * REAL-TIME LISTENERS SETUP
 * 
 * Register listeners for all data keys that need real-time updates.
 * This file should be included after real-time-sync.js and after all the load functions are defined.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for all modules to load
    setTimeout(() => {
        // ========================================
        // USER SIDE LISTENERS (index.html)
        // ========================================
        
        // Products - refresh when admin adds/updates/deletes products
        if (typeof window.refreshProducts === 'function') {
            window.realtimeSync.on('nd_products_data', () => {
                console.log('[RealtimeListener] Products changed, refreshing...');
                window.refreshProducts();
            });
        }

        // Requests/Orders - refresh when admin creates orders or updates status
        if (typeof window.refreshRequestHistory === 'function') {
            window.realtimeSync.on('nd_requests_data', () => {
                console.log('[RealtimeListener] Requests changed, refreshing...');
                window.refreshRequestHistory?.();
                if (typeof window.refreshPayouts === 'function') {
                    window.refreshPayouts();
                }
            });
        }

        // Freezes on request changes when payout totals should update
        if (typeof window.refreshPayouts === 'function') {
            window.realtimeSync.on('nd_sales_history', () => {
                console.log('[RealtimeListener] Sales history changed, refreshing payouts...');
                window.refreshPayouts();
            });
        }

        // Cart - refresh if user changes cart in another tab
        if (typeof window.refreshCart === 'function') {
            window.realtimeSync.on('nd_user_cart_data', () => {
                console.log('[RealtimeListener] Cart changed, refreshing...');
                window.refreshCart?.();
            });
        }

        // Sales History - update if new transactions occur
        if (typeof window.refreshSalesHistory === 'function') {
            window.realtimeSync.on('nd_sales_history', () => {
                console.log('[RealtimeListener] Sales history changed, refreshing...');
                window.refreshSalesHistory?.();
            });
        }

        // User credits/debt data
        window.realtimeSync.on('nd_logged_in_user', () => {
            console.log('[RealtimeListener] User data changed, updating session...');
            const userStr = localStorage.getItem('nd_logged_in_user');
            if (userStr) {
                try {
                    window.loggedInUser = JSON.parse(userStr);
                    if (typeof window.refreshPayouts === 'function') {
                        window.refreshPayouts();
                    }
                } catch (e) {
                    console.warn('Failed to parse updated user data');
                }
            }
        });

        // ========================================
        // ADMIN SIDE LISTENERS (admin/index.html)
        // ========================================
        
        // Admin Products - refresh when changes occur
        if (typeof window.reloadAdminProducts === 'function') {
            window.realtimeSync.on('nd_products_data', () => {
                console.log('[RealtimeListener] Admin products changed, reloading...');
                window.reloadAdminProducts();
                // Re-render product list if it's currently active
                const activeTab = document.querySelector('.bottom-bar-item.active');
                if (activeTab?.id === 'tab-product') {
                    if (typeof window.renderProductsGlobal === 'function') {
                        window.renderProductsGlobal();
                    }
                }
            });
        }

        // Admin Requests/Orders - refresh when user places new orders
        window.realtimeSync.on('nd_requests_data', () => {
            console.log('[RealtimeListener] Admin requests changed, refreshing...');
            // Re-render request list if it's currently active
            const activeTab = document.querySelector('.bottom-bar-item.active');
            if (activeTab?.id === 'tab-request') {
                if (typeof window.renderRequestList === 'function') {
                    window.renderRequestList();
                } else if (typeof window.loadRequest === 'function') {
                    window.loadRequest();
                }
            }
        });

        // Admin Sales - update if new transactions occur
        window.realtimeSync.on('nd_sales_history', () => {
            console.log('[RealtimeListener] Admin sales history changed, refreshing...');
            // Re-render sales table if it's currently active
            const activeTab = document.querySelector('.bottom-bar-item.active');
            if (activeTab?.id === 'tab-register') {
                if (typeof window.renderSalesTable === 'function') {
                    window.renderSalesTable();
                } else if (typeof window.loadRegister === 'function') {
                    window.loadRegister();
                }
            }
        });

        // Admin Tax Records
        window.realtimeSync.on('nd_Tax_records', () => {
            console.log('[RealtimeListener] Tax records changed, refreshing...');
            // Will auto-refresh when modal is reopened
        });

        console.log('[RealtimeListener] All listeners registered successfully');
    }, 500);
});

/**
 * ENHANCED SAVE FUNCTIONS WITH AUTO-SYNC
 * 
 * Wrap existing save functions to trigger real-time sync
 */

// Override saveProductsToMemory to trigger sync (if it exists)
if (typeof saveProductsToMemory === 'function') {
    const originalSaveProducts = saveProductsToMemory;
    window.saveProductsToMemory = function() {
        originalSaveProducts.call(this);
        window.realtimeSync?.syncNow('nd_products_data');
    };
}

// Helper to wrap localStorage.setItem with auto-sync
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
    const previousValue = this.getItem(key);
    if (previousValue === value) {
        // If the value is unchanged, do not broadcast a sync event.
        return originalSetItem.call(this, key, value);
    }

    originalSetItem.call(this, key, value);
    
    // Auto-sync important data keys
    const autoSyncKeys = [
        'nd_products_data',
        'nd_requests_data',
        'nd_sales_history',
        'nd_user_cart_data',
        'nd_Tax_records',
        'nd_logged_in_user',
        'nd_shop_owner_phone',
        'nd_shop_name'
    ];
    
    if (autoSyncKeys.includes(key) && window.realtimeSync) {
        window.realtimeSync.syncNow(key);
    }
};
