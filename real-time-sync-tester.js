/**
 * REAL-TIME SYNC VERIFICATION & TESTING UTILITY
 * 
 * Paste this in your browser console to verify everything is working correctly.
 * This file can be embedded or run from DevTools.
 */

window.realtimeSyncTest = {
    /**
     * Check if the real-time sync engine is initialized
     */
    checkEngineStatus: function() {
        console.log('=== Real-Time Sync Engine Status ===');
        if (!window.realtimeSync) {
            console.error('❌ Real-time sync engine NOT found! Make sure real-time-sync.js is loaded.');
            return false;
        }
        
        console.log('✅ Real-time sync engine initialized');
        console.log('  - Listeners registered:', Object.keys(window.realtimeSync.listeners).length);
        console.log('  - Debounce delay:', window.realtimeSync.syncDelay, 'ms');
        return true;
    },

    /**
     * Check what listeners are registered
     */
    checkListeners: function() {
        console.log('=== Registered Data Listeners ===');
        if (!window.realtimeSync) {
            console.error('Real-time sync not initialized');
            return;
        }

        const listeners = window.realtimeSync.listeners;
        if (Object.keys(listeners).length === 0) {
            console.warn('⚠️  No listeners registered!');
            return;
        }

        Object.entries(listeners).forEach(([key, callbacks]) => {
            console.log(`✅ ${key}: ${callbacks.length} listener(s)`);
        });
    },

    /**
     * Check if page state is saved
     */
    checkPageState: function() {
        console.log('=== Page State Persistence ===');
        const userSaved = localStorage.getItem('nd_user_page_state');
        const adminSaved = localStorage.getItem('nd_admin_page_state');
        const legacySaved = localStorage.getItem('nd_page_state');

        if (!userSaved && !adminSaved && !legacySaved) {
            console.log('ℹ️  No saved page state found (first visit or expired)');
            return;
        }

        if (userSaved) {
            try {
                const state = JSON.parse(userSaved);
                console.log('✅ User page state found:');
                console.log('  - Tab:', state.tab || 'N/A');
                console.log('  - Page:', state.page || 'N/A');
                console.log('  - Scroll Y:', state.scrollY || 'N/A');
                const age = Date.now() - state.timestamp;
                console.log('  - Age:', Math.round(age / 1000) + ' seconds');
                if (age > 86400000) {
                    console.warn('⚠️  User page state is older than 24 hours and will expire on next refresh');
                }
            } catch (e) {
                console.error('❌ Failed to parse user page state:', e.message);
            }
        }

        if (adminSaved) {
            try {
                const state = JSON.parse(adminSaved);
                console.log('✅ Admin page state found:');
                console.log('  - Tab:', state.tab || 'N/A');
                console.log('  - Page:', state.page || 'N/A');
                console.log('  - Scroll Y:', state.scrollY || 'N/A');
                const age = Date.now() - state.timestamp;
                console.log('  - Age:', Math.round(age / 1000) + ' seconds');
                if (age > 86400000) {
                    console.warn('⚠️  Admin page state is older than 24 hours and will expire on next refresh');
                }
            } catch (e) {
                console.error('❌ Failed to parse admin page state:', e.message);
            }
        }

        if (legacySaved) {
            console.warn('⚠️  Legacy page state key found: nd_page_state. This is no longer used by the app.');
        }
    },

    /**
     * Manually trigger a sync for testing
     */
    testSync: function(dataKey = 'nd_products_data') {
        console.log(`=== Testing Sync: ${dataKey} ===`);
        
        if (!window.realtimeSync) {
            console.error('Real-time sync not initialized');
            return;
        }

        console.log(`Triggering sync for: ${dataKey}`);
        window.realtimeSync.syncNow(dataKey);
        console.log('✅ Sync triggered! Check if refresh functions were called.');
    },

    /**
     * Simulate a data change to test listeners
     */
    simulateDataChange: function(dataKey = 'nd_products_data') {
        console.log(`=== Simulating Data Change: ${dataKey} ===`);
        
        if (!window.realtimeSync) {
            console.error('Real-time sync not initialized');
            return;
        }

        const current = localStorage.getItem(dataKey);
        const newData = current ? current + '_updated' : '{}';
        
        console.log('Simulating change by setting localStorage...');
        localStorage.setItem(dataKey, newData);
        
        console.log('✅ Simulated change complete!');
        console.log('Check if any listeners were triggered.');
        console.log('Revert change:', () => {
            localStorage.setItem(dataKey, current);
            window.realtimeSync.syncNow(dataKey);
        });
    },

    /**
     * Save current page state for testing
     */
    saveTestPageState: function() {
        console.log('=== Saving Test Page State ===');
        
        if (!window.realtimeSync) {
            console.error('Real-time sync not initialized');
            return;
        }

        const testState = {
            tab: 'product',
            page: 'test',
            scrollY: 100,
            timestamp: Date.now()
        };

        window.realtimeSync.savePageState(testState);
        console.log('✅ Test page state saved:');
        console.log(testState);
        console.log('Now refresh the page to test restoration.');
    },

    /**
     * Clear all sync data and states
     */
    clearAll: function() {
        console.log('=== Clearing All Sync Data ===');
        localStorage.removeItem('nd_user_page_state');
        localStorage.removeItem('nd_admin_page_state');
        localStorage.removeItem('nd_page_state');
        localStorage.removeItem('nd_storage_poll_cache');
        console.log('✅ Cleared:');
        console.log('  - nd_user_page_state');
        console.log('  - nd_admin_page_state');
        console.log('  - nd_page_state (legacy)');
        console.log('  - nd_storage_poll_cache');
        console.log('Note: Data keys (products, requests, etc.) were NOT cleared.');
    },

    /**
     * Run full diagnostic
     */
    runFullDiagnostic: function() {
        console.log('╔════════════════════════════════════════╗');
        console.log('║   REAL-TIME SYNC FULL DIAGNOSTIC      ║');
        console.log('╚════════════════════════════════════════╝\n');

        this.checkEngineStatus();
        console.log('');
        this.checkListeners();
        console.log('');
        this.checkPageState();
        console.log('');

        console.log('=== Next Steps ===');
        console.log('1. Test a data change:');
        console.log('   > window.realtimeSyncTest.simulateDataChange()');
        console.log('');
        console.log('2. Test page restoration:');
        console.log('   > window.realtimeSyncTest.saveTestPageState()');
        console.log('   > Then refresh the page');
        console.log('');
        console.log('3. Clear all sync data:');
        console.log('   > window.realtimeSyncTest.clearAll()');
    }
};

// Auto-run diagnostic when loaded
console.log('✅ Real-Time Sync Tester loaded!');
console.log('Run diagnostic: window.realtimeSyncTest.runFullDiagnostic()');
