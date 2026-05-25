/**
 * Nd shop — Cloud sync registry
 * All nd_* business data keys sync to Supabase app_state unless excluded below.
 */
(function () {
    const EXACT_EXCLUDE = new Set([
        'nd_admin_cloud_login',
        'nd_admin_cloud_password',
        'nd_admin_cloud_login_type',
        'nd_admin_pwd',
        'nd_admin_id',
        'nd_admin_name',
        'nd_admin_locks',
        'nd_delete_pin',
        'nd_xai_api_key',
        'nd_storage_poll_cache',
        'nd_storage_sync_key',
        'nd_active_tab',
        'nd_admin_active_tab',
        'nd_user_page_state',
        'nd_admin_page_state',
        'nd_page_state',
        'nd_logged_in_user',
        'nd_sales_history_fixed_payout_v2'
    ]);

    const PREFIX_EXCLUDE = [
        'nd_comm_last_viewed_',
        'nd_admin_cloud_',
        'nd_migrated_'
    ];

    /** Human-readable manifest (for docs / debugging) */
    const SYNC_MANIFEST = {
        products_inventory: {
            keys: ['nd_products_data'],
            modules: ['Products tab', 'Restock', 'Top-up', 'Recycle bin', 'Hidden products', 'Product details', 'User shop', 'Financial settings']
        },
        sales_register: {
            keys: ['nd_sales_history'],
            modules: ['Register / Sales table', 'Sales book', 'Delete sales', 'Payout purchase', 'Yearly overview', 'Tax records', 'AI mode (sales context)']
        },
        orders_requests: {
            keys: ['nd_requests_data', 'nd_user_cart_data'],
            modules: ['Request tab', 'User cart', 'Manage users', 'Payout', 'AI mode']
        },
        debt_credit: {
            keys: ['nd_debt_requests', 'nd_debtor_notes'],
            modules: ['Debt requests', 'Debtor book', 'Pay debt', 'AI mode']
        },
        expenses_finance: {
            keys: ['nd_expenses_notebook', 'nd_Tax_records', 'nd_income_allocations', 'nd_payout_rate', 'nd_payout_enabled', 'nd_reward_purchase_enabled'],
            modules: ['Expenses notebook', 'Tax records', 'Income structure', 'Financial settings', 'Restock expenses']
        },
        messaging: {
            keys: ['nd_messages', 'nd_pinned_chats', 'nd_blocked_messaging_users'],
            modules: ['Admin inbox', 'User messaging', 'User details']
        },
        community: {
            keys: ['nd_comm_messages', 'nd_comm_settings'],
            modules: ['Community chat', 'AI mode context']
        },
        ai_assistants: {
            keys: ['nd_ai_chat_threads', 'nd_ai_chat_history', 'nd_user_ai_chat_threads'],
            modules: ['Admin AI mode', 'User AI / Credit AI chat history']
        },
        users_activity: {
            keys: ['nd_users', 'nd_user_last_seen'],
            modules: ['Manage users', 'Customer insights', 'Receipt generator', 'Auth cache']
        },
        branding_contact: {
            keys: ['nd_shop_name', 'nd_shop_owner_phone'],
            modules: ['Header logo', 'Contact owner', 'Receipts', 'AI prompts']
        },
        banking: {
            keys: ['nd_bank_account_num', 'nd_bank_account_name', 'nd_bank_name'],
            modules: ['Debtor book bank details', 'Pay debt screen']
        },
        system: {
            keys: ['nd_maintenance_mode', 'nd_last_backup_date'],
            modules: ['Maintenance mode', 'System backup date']
        }
    };

    function shouldSyncKey(key) {
        if (!key || !key.startsWith('nd_')) return false;
        if (EXACT_EXCLUDE.has(key)) return false;
        if (PREFIX_EXCLUDE.some(p => key.startsWith(p))) return false;
        return true;
    }

    function allSyncKeys() {
        const keys = new Set();
        Object.values(SYNC_MANIFEST).forEach(group => group.keys.forEach(k => keys.add(k)));
        return Array.from(keys);
    }

    function valueForLocalStorage(data) {
        if (data === null || data === undefined) return '';
        if (typeof data === 'string') return data;
        if (typeof data === 'number' || typeof data === 'boolean') return String(data);
        return JSON.stringify(data);
    }

    function pushAllLocalStateToCloud() {
        if (!window.supabaseClient || !window.NdCloudSync) return Promise.resolve();
        const keys = Object.keys(localStorage).filter(shouldSyncKey);
        const jobs = keys.map(key => {
            const raw = localStorage.getItem(key);
            if (raw === null) return Promise.resolve();
            let parsed = raw;
            try { parsed = JSON.parse(raw); } catch (e) { /* keep string */ }
            return window.supabaseClient.from('app_state').upsert({ key, data: parsed }, { onConflict: 'key' });
        });
        return Promise.all(jobs).then(() => console.log('[CloudSync] Pushed', keys.length, 'keys to cloud'));
    }

    window.NdCloudSync = {
        EXACT_EXCLUDE,
        PREFIX_EXCLUDE,
        SYNC_MANIFEST,
        shouldSyncKey,
        allSyncKeys,
        valueForLocalStorage,
        pushAllLocalStateToCloud
    };
})();
