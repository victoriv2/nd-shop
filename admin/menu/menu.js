// admin/menu/menu.js

function loadMenu() {
    const container = document.getElementById('register-container');
    if (!container) return Promise.resolve();

    // Fetch the menu HTML content
    return fetch('menu/menu.html?v=1.2')
        .then(response => response.text())
        .then(html => {
            if (window.adminExpectedTabId && window.adminExpectedTabId !== 'tab-menu') return;
            container.innerHTML = html;
            initAdminMenu();
            calculateStorageUsage();
        })
        .catch(err => {
            console.error('Error loading admin menu:', err);
            container.innerHTML = `<div style="padding: 20px; text-align: center; color: #888;">
                <h3>System Error</h3>
                <p>Could not load menu options. Please refresh.</p>
            </div>`;
        });
}

function executeMenuAction(key, callback, adminStateKey) {
    const locks = JSON.parse(localStorage.getItem('nd_admin_locks') || '{}');
    const runAction = () => {
        callback();
        if (adminStateKey && window.realtimeSync) {
            window.realtimeSync.savePageState({ page: 'menu', subpage: adminStateKey });
        }
    };

    if (key === 'btnAdminSecurity' || locks[key]) {
        if (typeof _checkModuleAdminAuth === 'function') {
            _checkModuleAdminAuth(key, runAction);
        } else {
            runAction(); // fallback
        }
    } else {
        runAction();
    }
}

function initAdminMenu() {
    document.getElementById('btnManageUsers')?.addEventListener('click', () => {
        executeMenuAction('btnManageUsers', () => { if (typeof openManageUsers === 'function') openManageUsers(); }, 'manageUsers');
    });

    document.getElementById('btnAdminMessages')?.addEventListener('click', () => {
        executeMenuAction('btnAdminMessages', () => { if (typeof openAdminInbox === 'function') openAdminInbox(); }, 'adminMessages');
    });

    document.getElementById('btnRestock')?.addEventListener('click', () => {
        executeMenuAction('btnRestock', () => { if (typeof openRestockModal === 'function') openRestockModal(); }, 'restock');
    });

    document.getElementById('btnDebtorBook')?.addEventListener('click', () => {
        executeMenuAction('btnDebtorBook', () => { if (typeof openDebtorBook === 'function') openDebtorBook(); }, 'debtorBook');
    });

    document.getElementById('btnDebtPayments')?.addEventListener('click', () => {
        executeMenuAction('btnDebtPayments', () => { if (typeof openDebtRequests === 'function') openDebtRequests(); }, 'debtPayments');
    });

    document.getElementById('btnLendService')?.addEventListener('click', () => {
        executeMenuAction('btnLendService', () => { if (typeof openCustomersLend === 'function') openCustomersLend(); }, 'customersLend');
    });

    document.getElementById('btnAdminCommunity')?.addEventListener('click', () => {
        executeMenuAction('btnAdminCommunity', () => { if (typeof openCommunityChat === 'function') openCommunityChat(); }, 'adminCommunity');
    });

    document.getElementById('btnPayoutPurchase')?.addEventListener('click', () => {
        executeMenuAction('btnPayoutPurchase', () => { if (typeof openPayoutPurchaseModal === 'function') openPayoutPurchaseModal(); }, 'payoutPurchase');
    });

    document.getElementById('btnCustomerInsights')?.addEventListener('click', () => {
        executeMenuAction('btnCustomerInsights', () => { if (typeof openCustomerInsights === 'function') openCustomerInsights(); }, 'customerInsights');
    });

    document.getElementById('btnSalesBook')?.addEventListener('click', () => {
        executeMenuAction('btnSalesBook', () => { if (typeof openSalesBook === 'function') openSalesBook(); }, 'salesBook');
    });

    document.getElementById('btnReceiptGenerator')?.addEventListener('click', () => {
        executeMenuAction('btnReceiptGenerator', () => { if (typeof window.openReceiptGeneratorAdmin === 'function') window.openReceiptGeneratorAdmin(); }, 'receiptGenerator');
    });

    document.getElementById('btnExpensesNotebook')?.addEventListener('click', () => {
        executeMenuAction('btnExpensesNotebook', () => { if (typeof openExpensesNotebook === 'function') openExpensesNotebook(); }, 'expensesNotebook');
    });

    document.getElementById('btnTaxRecords')?.addEventListener('click', () => {
        executeMenuAction('btnTaxRecords', () => { if (typeof openTaxRecords === 'function') openTaxRecords(); }, 'taxRecords');
    });

    document.getElementById('btnDeleteSales')?.addEventListener('click', () => {
        executeMenuAction('btnDeleteSales', () => { if (typeof openDeleteSales === 'function') openDeleteSales(); }, 'deleteSales');
    });

    document.getElementById('btnRecycleBin')?.addEventListener('click', () => {
        executeMenuAction('btnRecycleBin', () => { if (typeof openRecycleBin === 'function') openRecycleBin(); }, 'recycleBin');
    });

    document.getElementById('btnHiddenShopProducts')?.addEventListener('click', () => {
        executeMenuAction('btnHiddenShopProducts', () => { if (typeof openHiddenProducts === 'function') openHiddenProducts(); }, 'hiddenShopProducts');
    });

    document.getElementById('btnIncomeStructure')?.addEventListener('click', () => {
        executeMenuAction('btnIncomeStructure', () => { if (typeof openIncomeStructure === 'function') openIncomeStructure(); }, 'incomeStructure');
    });

    document.getElementById('btnYearlyOverview')?.addEventListener('click', () => {
        executeMenuAction('btnYearlyOverview', () => { if (typeof openYearlyOverview === 'function') openYearlyOverview(); }, 'yearlyOverview');
    });

    // Add pending request badge to Manage Users card
    updateManageUsersBadge();
    updateMessagesBadge();
    updateCommunityBadge();
    updateDebtRequestsBadge();
    setInterval(updateManageUsersBadge, 2000);
    setInterval(updateMessagesBadge, 2000);
    setInterval(updateCommunityBadge, 2000);
    setInterval(updateDebtRequestsBadge, 2000);

    document.getElementById('btnFinancialSettings')?.addEventListener('click', () => {
        executeMenuAction('btnFinancialSettings', () => { if (typeof openFinancialSettings === 'function') openFinancialSettings(); }, 'financialSettings');
    });

    document.getElementById('btnAdminSecurity')?.addEventListener('click', () => {
        executeMenuAction('btnAdminSecurity', () => { if (typeof openAdminSecurity === 'function') openAdminSecurity(); }, 'adminSecurity');
    });

    document.getElementById('btnMaintenance')?.addEventListener('click', () => {
        executeMenuAction('btnMaintenance', () => { if (typeof openMaintenance === 'function') openMaintenance(); }, 'maintenance');
    });

    document.getElementById('btnAppContactSettings')?.addEventListener('click', () => {
        executeMenuAction('btnAppContactSettings', () => { if (typeof openAppContactSettings === 'function') openAppContactSettings(); }, 'appContactSettings');
    });

    document.getElementById('btnSystemBackup')?.addEventListener('click', () => {
        executeMenuAction('btnSystemBackup', () => { if (typeof openSystemBackup === 'function') openSystemBackup(); }, 'systemBackup');
    });

    document.getElementById('btnAiMode')?.addEventListener('click', () => {
        executeMenuAction('btnAiMode', () => { if (typeof openAiChat === 'function') openAiChat(); }, 'aiMode');
    });

    // My Earnings link interceptor
    document.getElementById('btnMyEarnings')?.addEventListener('click', (e) => {
        const locks = JSON.parse(localStorage.getItem('nd_admin_locks') || '{}');
        if (locks['btnMyEarnings']) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof _checkModuleAdminAuth === 'function') {
                _checkModuleAdminAuth('My Earnings', () => {
                    window.open('https://ec5.empoweredconsumerism.com/', '_blank');
                });
            }
        }
    });

    document.getElementById('btnAdminLogout')?.addEventListener('click', () => {
        customConfirm('Are you sure you want to securely log out of the admin panel?', true).then(confirmed => {
            if (confirmed) {
                sessionStorage.removeItem('nd_admin_logged_in');
                sessionStorage.removeItem('nd_admin_bypass');
                window.location.reload();
            }
        });
    });

    // Set dynamic name if saved
    const nameStr = localStorage.getItem('nd_admin_name');
    if (nameStr) {
        const titleEl = document.querySelector('.admin-name');
        if (titleEl) titleEl.textContent = nameStr;
    }

    // Search Logic
    const searchInput = document.getElementById('adminMenuSearchInput');
    const clearBtn = document.getElementById('clearMenuSearch');
    const menuCards = document.querySelectorAll('.admin-menu-card');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            
            if (clearBtn) {
                clearBtn.style.display = query.length > 0 ? 'flex' : 'none';
            }

            menuCards.forEach(card => {
                const title = card.querySelector('h3')?.textContent.toLowerCase() || '';
                const desc = card.querySelector('p')?.textContent.toLowerCase() || '';
                
                if (title.includes(query) || desc.includes(query)) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input'));
            searchInput.focus();
        });
    }
}

async function calculateStorageUsage() {
    const bar = document.getElementById('storagePercent');
    const label = document.querySelector('.stat-label');

    if (label) label.textContent = `SYSTEM STORAGE: CALCULATING...`;

    try {
        const response = await fetch(`${window.API_BASE || ''}/api/storage-stats`);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const resData = await response.json();
        if (!resData.success) throw new Error(resData.error);

        // Supabase Free Tier gives 500MB
        const dbSizeBytes = resData.sizeBytes || 0;
        const limitBytes = 500 * 1024 * 1024;
        
        let percent = (dbSizeBytes / limitBytes) * 100;
        percent = Math.min(percent, 100).toFixed(1);

        if (bar) bar.style.width = percent + '%';
        if (label) label.textContent = `SYSTEM STORAGE: ${percent}% FULL`;
    } catch (e) {
        console.warn('Could not fetch true DB size:', e);
        if (label) label.textContent = `SYSTEM STORAGE: UNKNOWN`;
    }
}

function updateManageUsersBadge() {
    const requests = JSON.parse(localStorage.getItem('nd_requests_data') || '[]');
    const pendingCount = requests.filter(r => r.status === 'Pending').length;

    const card = document.getElementById('btnManageUsers');
    if (!card) return;

    // Remove existing badge if any
    const existingBadge = card.querySelector('.mu-pending-badge');
    if (existingBadge) existingBadge.remove();

    if (pendingCount > 0) {
        const badge = document.createElement('span');
        badge.className = 'mu-pending-badge';
        badge.textContent = pendingCount > 9 ? '9+' : pendingCount;
        badge.style.cssText = 'position:absolute; top:10px; right:10px; background:#ff4d4d; color:white; font-size:10px; font-weight:800; width:20px; height:20px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid white; box-shadow:0 0 8px rgba(255,77,77,0.4);';
        card.style.position = 'relative';
        card.appendChild(badge);
    }
}

function updateMessagesBadge() {
    const card = document.getElementById('btnAdminMessages');
    const existingBadge = card ? card.querySelector('.msg-live-badge') : null;
    if (existingBadge) existingBadge.remove();

    // Get real unread count
    const unreadCount = typeof getUnreadMessageCount === 'function' ? getUnreadMessageCount() : 0;

    if (card && unreadCount > 0) {
        const badge = document.createElement('span');
        badge.className = 'msg-live-badge';
        badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
        badge.style.cssText = 'position:absolute; top:10px; right:10px; background:#ff4d4d; color:white; font-size:10px; font-weight:800; width:20px; height:20px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid white; box-shadow:0 0 8px rgba(255,77,77,0.4);';
        card.style.position = 'relative';
        card.appendChild(badge);
    }
}

function updateCommunityBadge() {
    const card = document.getElementById('btnAdminCommunity');
    if (!card) return;

    const existingBadge = card.querySelector('.comm-live-badge');
    if (existingBadge) existingBadge.remove();

    const count = typeof getCommUnreadCount === 'function' ? getCommUnreadCount() : 0;
    if (count > 0) {
        const badge = document.createElement('span');
        badge.className = 'comm-live-badge';
        badge.textContent = count > 9 ? '9+' : count;
        badge.style.cssText = 'position:absolute; top:10px; right:10px; background:#ff4d4d; color:white; font-size:10px; font-weight:800; width:20px; height:20px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid white; box-shadow:0 0 8px rgba(255,77,77,0.4); z-index:10;';
        card.style.position = 'relative';
        card.appendChild(badge);
    }
}

function updateDebtRequestsBadge() {
    const requests = JSON.parse(localStorage.getItem('nd_debt_requests') || '[]');
    const pendingCount = requests.filter(r => r.status === 'Pending').length;

    const card = document.getElementById('btnDebtPayments');
    if (!card) return;

    const existingBadge = card.querySelector('.dr-pending-badge');
    if (existingBadge) existingBadge.remove();

    if (pendingCount > 0) {
        const badge = document.createElement('span');
        badge.className = 'dr-pending-badge';
        badge.textContent = pendingCount > 9 ? '9+' : pendingCount;
        badge.style.cssText = 'position:absolute; top:10px; right:10px; background:#ff4d4d; color:white; font-size:10px; font-weight:800; width:20px; height:20px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid white; box-shadow:0 0 8px rgba(255,77,77,0.4);';
        card.style.position = 'relative';
        card.appendChild(badge);
    }
}

// Contact Support Settings Logic
window.openAppContactSettings = function() {
    const modal = document.getElementById('appContactSettingsModal');
    if (modal) {
        document.getElementById('appShopNameInput').value = localStorage.getItem('nd_shop_name') || '';
        document.getElementById('appContactPhoneInput').value = localStorage.getItem('nd_shop_owner_phone') || '';
        document.getElementById('appAboutTextInput').value = localStorage.getItem('nd_about_text') || '';
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    }
}

window.closeAppContactSettings = function() {
    const modal = document.getElementById('appContactSettingsModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    }
}

window.saveAppContactSettings = function() {
    const shopName = document.getElementById('appShopNameInput').value.trim();
    const phone = document.getElementById('appContactPhoneInput').value.trim();
    const aboutText = document.getElementById('appAboutTextInput').value.trim();
    
    if (!shopName || !phone) {
        const msg = !shopName ? "Please enter a shop name." : "Please enter a valid phone number.";
        if(typeof customAlert === 'function') customAlert(msg);
        else alert(msg);
        return;
    }
    
    // Admin PIN authorization check using customPrompt
    if (typeof customPrompt === 'function') {
        customPrompt("Please enter the Admin Authorization PIN to save these changes:", 'password').then(pin => {
            if (pin === null) return; // Cancelled
            const requiredPin = localStorage.getItem('nd_delete_pin') || '1234';
            if (pin !== requiredPin) {
                customAlert("Incorrect PIN. Changes not saved.");
                return;
            }
            _finishSavingAppContact(shopName, phone, aboutText);
        });
    } else {
        const pin = prompt("Please enter the Admin Authorization PIN to save these changes:");
        if (pin === null) return;
        const requiredPin = localStorage.getItem('nd_delete_pin') || '1234';
        if (pin !== requiredPin) {
            alert("Incorrect PIN. Changes not saved.");
            return;
        }
        _finishSavingAppContact(shopName, phone, aboutText);
    }
}

window._finishSavingAppContact = function(shopName, phone, aboutText) {
    localStorage.setItem('nd_shop_name', shopName);
    localStorage.setItem('nd_shop_owner_phone', phone);
    localStorage.setItem('nd_about_text', aboutText);

    if (typeof window.updateShopBranding === 'function') window.updateShopBranding();
    if (typeof window.updateShopContactPhone === 'function') window.updateShopContactPhone();
    if (window.realtimeSync) {
        window.realtimeSync.syncNow('nd_shop_name');
        window.realtimeSync.syncNow('nd_shop_owner_phone');
        window.realtimeSync.syncNow('nd_about_text');
    }
    
    if(typeof customAlert === 'function') customAlert("Branding & Contact settings updated successfully!");
    else alert("Branding & Contact settings updated successfully!");
    
    window.closeAppContactSettings();
}
