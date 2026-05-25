/**
 * UI refresh handlers when cloud/local data changes (all modules).
 */
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (!window.realtimeSync) return;

        const on = (key, fn) => window.realtimeSync.on(key, fn);

        const isVisible = (id) => {
            const el = document.getElementById(id);
            return el && el.style.display !== 'none' && el.offsetParent !== null;
        };

        const isAdminModalOpen = (id) => {
            const el = document.getElementById(id);
            return el && (el.classList.contains('show') || el.style.display === 'flex');
        };

        // --- Products / restock / shop ---
        on('nd_products_data', () => {
            window.reloadAdminProducts?.();
            window.renderProductsGlobal?.();
            window.refreshProducts?.();
            window.renderDynamicProducts?.(document.getElementById('productSearchInput')?.value || '');
            window.renderRestockListGlobal?.();
            window.renderRestockList?.();
        });

        // --- Sales / register / sales book ---
        on('nd_sales_history', () => {
            window.refreshSalesTable?.();
            window.renderSalesTable?.();
            window.refreshPayouts?.();
            window.refreshSalesHistory?.();
            if (isVisible('salesBookPage') && typeof window.renderSalesBook === 'function') {
                const saved = localStorage.getItem('nd_sales_history');
                if (saved && typeof sbSalesData !== 'undefined') {
                    try { sbSalesData = JSON.parse(saved); } catch (e) { /* ignore */ }
                }
                window.renderSalesBook();
            }
            if (typeof window.renderYearlyOverview === 'function' && isAdminModalOpen('yearlyOverviewModal')) {
                window.renderYearlyOverview();
            }
        });

        // --- Requests / cart ---
        on('nd_requests_data', () => {
            window.refreshRequestHistory?.();
            window.renderRequestList?.();
            if (document.querySelector('.bottom-bar-item.active')?.id === 'tab-request') {
                window.loadRequest?.();
            }
        });

        on('nd_user_cart_data', () => {
            window.refreshCart?.();
        });

        // --- Debt ---
        on('nd_debt_requests', () => {
            if (typeof window.renderDebtRequestsList === 'function') window.renderDebtRequestsList();
            if (typeof window.openDebtRequests === 'function' && isVisible('debtRequestsPage')) {
                /* list re-reads localStorage on render */
            }
        });

        on('nd_debtor_notes', () => {
            window.renderDebtorNotes?.();
        });

        // --- Expenses / tax / income / payout settings ---
        on('nd_expenses_notebook', () => {
            if (isAdminModalOpen('expensesNotebookModal') || isVisible('expensesNotebookPage')) {
                window.renderExpenses?.();
            }
        });

        on('nd_Tax_records', () => {
            if (typeof window.renderTaxRecords === 'function') window.renderTaxRecords();
        });

        on('nd_income_allocations', () => {
            window.renderIncomeStructure?.();
        });

        on('nd_payout_rate', () => window.refreshPayouts?.());
        on('nd_payout_enabled', () => window.refreshPayouts?.());
        on('nd_reward_purchase_enabled', () => { /* payout UI reads on next open */ });

        // --- AI chat (admin + user) — debounced so cloud sync does not flash/reload while typing ---
        let adminAiRefreshTimer = null;
        let userAiRefreshTimer = null;
        const scheduleAdminAiRefresh = () => {
            clearTimeout(adminAiRefreshTimer);
            adminAiRefreshTimer = setTimeout(() => window.refreshAdminAiChatFromCloud?.(), 1500);
        };
        const scheduleUserAiRefresh = () => {
            clearTimeout(userAiRefreshTimer);
            userAiRefreshTimer = setTimeout(() => window.refreshUserAiChatFromCloud?.(), 1500);
        };
        on('nd_ai_chat_threads', scheduleAdminAiRefresh);
        on('nd_ai_chat_history', scheduleAdminAiRefresh);
        on('nd_user_ai_chat_threads', scheduleUserAiRefresh);

        // --- Users / insights ---
        on('nd_users', () => {
            if (typeof window.renderManageUsersList === 'function') window.renderManageUsersList();
        });

        on('nd_user_last_seen', () => {
            if (typeof window.renderCustomerInsights === 'function' && isVisible('customerInsightsPage')) {
                window.renderCustomerInsights();
            }
        });

        // --- Banking ---
        on('nd_bank_account_num', () => window.refreshPayDebtBankDisplay?.());
        on('nd_bank_account_name', () => window.refreshPayDebtBankDisplay?.());
        on('nd_bank_name', () => window.refreshPayDebtBankDisplay?.());

        // --- Maintenance ---
        on('nd_maintenance_mode', () => {
            const isMaint = localStorage.getItem('nd_maintenance_mode') === 'true';
            if (isMaint && !window.location.pathname.includes('/admin/')) {
                window.location.reload();
            }
        });

        // --- Branding (also in global-fixes) ---
        on('nd_shop_name', () => window.updateShopBranding?.());
        on('nd_shop_owner_phone', () => window.updateShopContactPhone?.());

        // --- Community settings ---
        on('nd_comm_settings', () => {
            if (typeof window.renderCommMessages === 'function' && isVisible('communityPage')) {
                window.renderCommMessages();
            }
        });

        // Catch-all: any nd_* key change triggers generic UI refresh hooks
        window.realtimeSync.onAny((key) => {
            if (key === 'nd_logged_in_user') {
                const userStr = localStorage.getItem('nd_logged_in_user');
                if (userStr) {
                    try {
                        window.loggedInUser = JSON.parse(userStr);
                        window.refreshPayouts?.();
                    } catch (e) { /* ignore */ }
                }
            }
            if (key === 'nd_admin_name') {
                const menuName = document.querySelector('.admin-name');
                if (menuName) menuName.textContent = localStorage.getItem('nd_admin_name') || 'Shop Administrator';
            }
            if (key.startsWith('nd_comm_last_viewed_') && typeof window.updateCommunityBadge === 'function') {
                window.updateCommunityBadge();
            }
        });

        console.log('[CloudSyncHandlers] Sync-everything handlers active');
    }, 700);
});
