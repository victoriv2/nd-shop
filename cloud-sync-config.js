/**
 * Nd shop — Cloud sync registry
 * Syncs EVERY localStorage key starting with nd_ (no business exclusions).
 * Only internal poll cache is skipped to avoid sync loops.
 */
(function () {
    /** Internal only — never upload (polling metadata) */
    const INTERNAL_ONLY = new Set(['nd_storage_poll_cache']);

    const SYNC_MANIFEST = {
        products_inventory: {
            keys: ['nd_products_data'],
            modules: ['Products', 'Restock', 'Top-up', 'Recycle bin', 'Hidden products', 'Product details', 'User shop']
        },
        sales_register: {
            keys: ['nd_sales_history', 'nd_sales_history_fixed_payout_v2'],
            modules: ['Register', 'Sales book', 'Delete sales', 'Payout purchase', 'Yearly overview', 'Tax records']
        },
        orders_requests: {
            keys: ['nd_requests_data', 'nd_user_cart_data'],
            modules: ['Requests', 'Cart', 'Manage users', 'Payout']
        },
        debt_credit: {
            keys: ['nd_debt_requests', 'nd_debtor_notes'],
            modules: ['Debt requests', 'Debtor book', 'Pay debt']
        },
        expenses_finance: {
            keys: ['nd_expenses_notebook', 'nd_Tax_records', 'nd_income_allocations', 'nd_payout_rate', 'nd_payout_enabled', 'nd_reward_purchase_enabled'],
            modules: ['Expenses', 'Tax records', 'Income structure', 'Financial settings']
        },
        messaging: {
            keys: ['nd_messages', 'nd_pinned_chats', 'nd_blocked_messaging_users'],
            modules: ['Messaging', 'Admin inbox']
        },
        community: {
            keys: ['nd_comm_messages', 'nd_comm_settings'],
            modules: ['Community']
        },
        ai_assistants: {
            keys: ['nd_ai_chat_threads', 'nd_ai_chat_history', 'nd_user_ai_chat_threads'],
            modules: ['Admin AI mode', 'User AI', 'Credit AI']
        },
        users_activity: {
            keys: ['nd_users', 'nd_user_last_seen', 'nd_logged_in_user'],
            modules: ['Users', 'Customer insights', 'Auth session cache', 'Profile']
        },
        branding_contact: {
            keys: ['nd_shop_name', 'nd_shop_owner_phone'],
            modules: ['Branding', 'Contact owner', 'Receipts']
        },
        banking: {
            keys: ['nd_bank_account_num', 'nd_bank_account_name', 'nd_bank_name'],
            modules: ['Debtor book', 'Pay debt']
        },
        admin_security: {
            keys: ['nd_admin_name', 'nd_admin_id', 'nd_admin_pwd', 'nd_admin_locks', 'nd_delete_pin', 'nd_admin_cloud_login', 'nd_admin_cloud_password', 'nd_admin_cloud_login_type'],
            modules: ['Admin security', 'Bypass cloud credentials', 'Tab locks', 'Delete PIN']
        },
        ui_state: {
            keys: ['nd_active_tab', 'nd_admin_active_tab', 'nd_user_page_state', 'nd_admin_page_state', 'nd_page_state'],
            modules: ['User tab memory', 'Admin tab memory', 'Page restore']
        },
        system: {
            keys: ['nd_maintenance_mode', 'nd_last_backup_date', 'nd_xai_api_key'],
            modules: ['Maintenance', 'Backup', 'AI API key']
        },
        community_views: {
            keys: ['nd_comm_last_viewed_*'],
            modules: ['Community unread badges per user']
        },
        migrations: {
            keys: ['nd_migrated_*'],
            modules: ['One-time migration flags']
        }
    };

    function shouldSyncKey(key) {
        if (!key || typeof key !== 'string') return false;
        if (!key.startsWith('nd_')) return false;
        if (INTERNAL_ONLY.has(key)) return false;
        return true;
    }

    /** All nd_* keys currently in localStorage (dynamic — catches every feature) */
    function allSyncKeys() {
        try {
            return Object.keys(localStorage).filter(shouldSyncKey);
        } catch (e) {
            return [];
        }
    }

    function valueForLocalStorage(data) {
        if (data === null || data === undefined) return '';
        if (typeof data === 'string') return data;
        if (typeof data === 'number' || typeof data === 'boolean') return String(data);
        return JSON.stringify(data);
    }

    function pushAllLocalStateToCloud() {
        if (!window.supabaseClient) return Promise.resolve();
        const keys = allSyncKeys();
        window.__isSupabaseSyncing = true;
        const jobs = keys.map(key => {
            const raw = localStorage.getItem(key);
            if (raw === null) return Promise.resolve();
            let parsed = raw;
            try { parsed = JSON.parse(raw); } catch (e) { /* plain string */ }
            return window.supabaseClient.from('app_state').upsert({ key, data: parsed }, { onConflict: 'key' });
        });
        return Promise.all(jobs).finally(() => {
            window.__isSupabaseSyncing = false;
            console.log('[CloudSync] Pushed ALL', keys.length, 'nd_* keys to cloud');
        });
    }

    window.NdCloudSync = {
        INTERNAL_ONLY,
        SYNC_MANIFEST,
        shouldSyncKey,
        allSyncKeys,
        valueForLocalStorage,
        pushAllLocalStateToCloud
    };
})();
