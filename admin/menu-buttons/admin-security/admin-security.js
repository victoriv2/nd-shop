function openAdminSecurity() {
    fetch('menu-buttons/admin-security/admin-security.html')
        .then(res => res.text())
        .then(html => {
            const container = document.getElementById('modal-container');
            container.innerHTML = html;
            const modal = document.getElementById('adminSecurityModal');
            setTimeout(() => {
                modal.style.display = 'flex';
                modal.offsetHeight;
                modal.classList.add('show');
            }, 10);

            // Populate current values
            const adminName = localStorage.getItem('nd_admin_name') || 'Shop Administrator';
            document.getElementById('asecName').value = adminName;

            const adminId = localStorage.getItem('nd_admin_id') || '08109316532';
            document.getElementById('asecLoginId').value = adminId;
            
            // Populate locks
            const locks = JSON.parse(localStorage.getItem('nd_admin_locks') || '{}');
            const toggleKeys = [
                'tab-register', 'tab-progress', 'tab-product', 'tab-request', 'tab-menu',
                'addBtn', 'adminAddProductBtn',
                'btnManageUsers', 'btnAdminMessages', 'btnRestock', 'btnDebtorBook', 'btnDebtPayments',
                'btnAdminCommunity', 'btnPayoutPurchase', 'btnCustomerInsights', 'btnSalesBook',
                'btnReceiptGenerator', 'btnExpensesNotebook', 'btnTaxRecords', 'btnDeleteSales',
                'btnRecycleBin', 'btnHiddenShopProducts', 'btnIncomeStructure', 'btnYearlyOverview',
                'btnFinancialSettings', 'btnMaintenance', 'btnAppContactSettings', 'btnSystemBackup', 'btnAiMode', 'btnMyEarnings'
            ];
            toggleKeys.forEach(k => {
                const cb = document.getElementById('lock-' + k);
                if(cb) cb.checked = !!locks[k];
            });

            // Default to profile tab
            switchAsecTab('profile');
        });
}

function closeAdminSecurity() {
    const modal = document.getElementById('adminSecurityModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => document.getElementById('modal-container').innerHTML = '', 400);
    }
}

function switchAsecTab(tabName) {
    // Update tab bar
    const tabBar = document.getElementById('asecTabBar');
    if(tabBar) {
        tabBar.setAttribute('data-active', tabName);
        document.querySelectorAll('.asec-tab').forEach(t => t.classList.remove('active'));
        const activeTab = document.querySelector(`.asec-tab[data-sec-tab="${tabName}"]`);
        if(activeTab) activeTab.classList.add('active');
    }

    // Hide all panels, show active
    document.querySelectorAll('.asec-panel').forEach(p => p.classList.add('hidden'));
    
    if (tabName === 'profile') {
        document.getElementById('asecPanelProfile').classList.remove('hidden');
    } else if (tabName === 'login') {
        document.getElementById('asecPanelLogin').classList.remove('hidden');
    } else if (tabName === 'password') {
        document.getElementById('asecPanelPassword').classList.remove('hidden');
    } else if (tabName === 'pin') {
        document.getElementById('asecPanelPin').classList.remove('hidden');
    } else if (tabName === 'locks') {
        document.getElementById('asecPanelLocks').classList.remove('hidden');
    }
}

function saveAdminName() {
    const name = document.getElementById('asecName').value.trim() || 'Shop Administrator';
    localStorage.setItem('nd_admin_name', name);
    
    const menuName = document.querySelector('.admin-name');
    if (menuName) menuName.textContent = name;
    
    if (typeof customAlert !== 'undefined') {
        customAlert("Profile name updated successfully!");
    } else {
        alert("Profile name updated successfully!");
    }
}

function saveAdminId() {
    const loginId = document.getElementById('asecLoginId').value.trim() || '08109316532';
    const confirmPass = document.getElementById('asecIdPass').value;
    const currentPass = localStorage.getItem('nd_admin_pwd') || 'admin123';
    
    if (!confirmPass) {
        return typeof customAlert !== 'undefined' ? customAlert('Please enter your password to confirm.') : alert('Required password');
    }
    
    if (confirmPass !== currentPass) {
        return typeof customAlert !== 'undefined' ? customAlert('Incorrect password.') : alert('Incorrect password.');
    }
    
    localStorage.setItem('nd_admin_id', loginId);
    document.getElementById('asecIdPass').value = '';
    
    if (typeof customAlert !== 'undefined') {
        customAlert("Login ID updated successfully!");
    } else {
        alert("Login ID updated successfully!");
    }
}

function saveAdminPassword() {
    const oldPass = document.getElementById('asecOldPass').value;
    const newPass = document.getElementById('asecNewPass').value;
    const currentPass = localStorage.getItem('nd_admin_pwd') || 'admin123';
    
    if (!oldPass || !newPass) {
        return typeof customAlert !== 'undefined' ? customAlert('Please fill out all fields.') : alert('Required fields mapping');
    }
    
    if (oldPass !== currentPass) {
        return typeof customAlert !== 'undefined' ? customAlert('Current password is incorrect.') : alert('Incorrect existing password.');
    }
    
    if (oldPass === newPass) {
        return typeof customAlert !== 'undefined' ? customAlert('New password must be different.') : alert('New password must differ.');
    }
    
    localStorage.setItem('nd_admin_pwd', newPass);
    document.getElementById('asecOldPass').value = '';
    document.getElementById('asecNewPass').value = '';
    
    if (typeof customAlert !== 'undefined') {
        customAlert("Password updated successfully!");
    } else {
        alert("Password updated!");
    }
}

function saveAdminDeletePin() {
    const oldPinEl = document.getElementById('asecOldPin');
    const newPinEl = document.getElementById('asecNewPin');
    const currentPin = localStorage.getItem('nd_delete_pin') || '1234';
    
    if(!oldPinEl.value || !newPinEl.value) {
        return typeof customAlert !== 'undefined' ? customAlert('Please fill both PIN fields.') : alert('Please fill both PIN fields');
    }
    
    if(!/^\d{4}$/.test(newPinEl.value)) {
        return typeof customAlert !== 'undefined' ? customAlert('New PIN must be exactly 4 digits.') : alert('New PIN must be exactly 4 digits.');
    }

    if(oldPinEl.value !== currentPin) {
        return typeof customAlert !== 'undefined' ? customAlert('Current PIN is incorrect.') : alert('Current PIN is incorrect.');
    }

    localStorage.setItem('nd_delete_pin', newPinEl.value);
    oldPinEl.value = '';
    newPinEl.value = '';
    
    if (typeof customAlert !== 'undefined') {
        customAlert("PIN successfully updated!");
    } else {
        alert("PIN successfully updated!");
    }
}

function saveAdminLocks() {
    if (typeof _checkModuleAdminAuth === 'function') {
        _checkModuleAdminAuth('Locks Auth', () => {
            _doSaveLocks();
        });
    } else {
        _doSaveLocks();
    }
}

function _doSaveLocks() {
    const locks = {};
    const toggleKeys = [
        'tab-register', 'tab-progress', 'tab-product', 'tab-request', 'tab-menu',
        'addBtn', 'adminAddProductBtn',
        'btnManageUsers', 'btnAdminMessages', 'btnRestock', 'btnDebtorBook', 'btnDebtPayments',
        'btnAdminCommunity', 'btnPayoutPurchase', 'btnCustomerInsights', 'btnSalesBook',
        'btnReceiptGenerator', 'btnExpensesNotebook', 'btnTaxRecords', 'btnDeleteSales',
        'btnRecycleBin', 'btnHiddenShopProducts', 'btnIncomeStructure', 'btnYearlyOverview',
        'btnFinancialSettings', 'btnMaintenance', 'btnAppContactSettings', 'btnSystemBackup', 'btnAiMode', 'btnMyEarnings'
    ];
    toggleKeys.forEach(k => {
        const cb = document.getElementById('lock-' + k);
        if(cb) locks[k] = cb.checked;
    });
    localStorage.setItem('nd_admin_locks', JSON.stringify(locks));
    if (typeof customAlert !== 'undefined') {
        customAlert("Access configuration successfully saved and locked!");
    } else {
        alert("Access config saved.");
    }
    closeAdminSecurity();
}

// ========================================
// Admin Forgot Password Logic
// ========================================
function triggerAsecForgotPass(e) {
    if(e) e.preventDefault();
    const adminId = localStorage.getItem('nd_admin_id') || 'admin@nd.shop';
    const subtitle = document.getElementById('asecPassVerifySubtitle');
    if(subtitle) subtitle.textContent = `A 4-digit code has been sent to ${adminId}.`;
    
    if (typeof customAlert !== 'undefined') {
        customAlert(`Verification code sent to ${adminId}`);
    }

    const modal = document.getElementById('asecPassVerifyModal');
    if(modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    }
}

function closeAsecPassVerify() {
    const modal = document.getElementById('asecPassVerifyModal');
    if(modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            // Reset to step 1 for next time
            document.getElementById('asecResetStep1').style.display = 'block';
            document.getElementById('asecResetStep2').style.display = 'none';
        }, 300);
    }
}

function moveAsecOtp(input, index) {
    if (input.value.length > 1) input.value = input.value.slice(-1);
    if (input.value) {
        const inputs = document.querySelectorAll('.asec-pass-otp');
        if (index < inputs.length - 1) inputs[index + 1].focus();
    }
}

function goToAsecStep2() {
    const inputs = document.querySelectorAll('.asec-pass-otp');
    const code = Array.from(inputs).map(i => i.value).join('');
    
    if (code.length < 4) {
        return typeof customAlert !== 'undefined' ? customAlert('Please enter the 4-digit code.') : alert('Required 4 digits');
    }

    const btn = document.getElementById('btnAsecGoToStep2');
    btn.classList.add('saving');
    btn.textContent = 'Verifying...';

    setTimeout(() => {
        btn.classList.remove('saving');
        btn.textContent = 'Verify Code';
        
        document.getElementById('asecResetStep1').style.display = 'none';
        document.getElementById('asecResetStep2').style.display = 'block';
        
        const firstPassInput = document.getElementById('resetAsecNewPass');
        if (firstPassInput) firstPassInput.focus();
    }, 800);
}

let asecResendCooldown = 0;
function resendAsecPassCode(e) {
    if(e) e.preventDefault();
    if (asecResendCooldown > 0) return;

    const adminId = localStorage.getItem('nd_admin_id') || 'admin@nd.shop';
    if (typeof customAlert !== 'undefined') {
        customAlert(`A new code has been sent to ${adminId}.`);
    }

    const btn = document.getElementById('asecResendPassCode');
    asecResendCooldown = 60;
    btn.style.opacity = '0.5';
    btn.style.cursor = 'not-allowed';
    btn.textContent = `Resend Code (60s)`;

    const timer = setInterval(() => {
        asecResendCooldown--;
        if (asecResendCooldown <= 0) {
            clearInterval(timer);
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
            btn.textContent = 'Resend Code';
        } else {
            btn.textContent = `Resend Code (${asecResendCooldown}s)`;
        }
    }, 1000);
}

function verifyAsecPasswordReset() {
    const newPassInput = document.getElementById('resetAsecNewPass');
    const confirmPassInput = document.getElementById('resetAsecConfirmPass');
    const newPass = newPassInput ? newPassInput.value : '';
    const confirmPass = confirmPassInput ? confirmPassInput.value : '';

    if (!newPass || newPass !== confirmPass) {
        return typeof customAlert !== 'undefined' ? customAlert('Passwords do not match.') : alert('Passwords do not match.');
    }

    const btn = document.getElementById('btnAsecFinal');
    btn.classList.add('saving');
    btn.textContent = 'Updating...';

    setTimeout(() => {
        // Update Admin Password
        localStorage.setItem('nd_admin_pwd', newPass);
        
        btn.classList.remove('saving');
        btn.classList.add('success');
        btn.textContent = 'Password Updated Successfully!';

        setTimeout(() => {
            btn.classList.remove('success');
            btn.textContent = 'Update Password';
            
            // Reset fields and close
            document.querySelectorAll('.asec-pass-otp').forEach(i => i.value = '');
            document.getElementById('asecOldPass').value = '';
            document.getElementById('asecNewPass').value = '';
            if (newPassInput) newPassInput.value = '';
            if (confirmPassInput) confirmPassInput.value = '';
            
            closeAsecPassVerify();
            closeAdminSecurity();
        }, 1500);
    }, 1000);
}

// Add event listener for the forgot password link when modal opens
(function() {
    const originalOpen = openAdminSecurity;
    window.openAdminSecurity = function() {
        originalOpen();
        setTimeout(() => {
            const btn = document.getElementById('asecForgotPassBtn');
            if(btn) btn.onclick = triggerAsecForgotPass;
        }, 500);
    };
})();
