async function getAdminUser() {
    let users = [];
    try {
        const res = await fetch(`${window.API_BASE}/api/users?_t=${Date.now()}`);
        const data = await res.json();
        if (data.success && data.users) {
            let localUsers = [];
            try { localUsers = JSON.parse(localStorage.getItem('nd_users') || '[]'); } catch(e) {}
            data.users.forEach(dbU => {
                let idx = localUsers.findIndex(lu => lu.id === dbU.id);
                if (idx >= 0) localUsers[idx] = dbU;
                else localUsers.push(dbU);
            });
            users = localUsers;
            localStorage.setItem('nd_users', JSON.stringify(users));
        }
    } catch (e) {
        console.error('Failed to fetch fresh users, falling back to cache:', e);
        try {
            const cached = localStorage.getItem('nd_users');
            if (cached) users = JSON.parse(cached);
        } catch (err) {}
    }

    let admin = users.find(u => u.id && u.id.startsWith('nd_admin_'));
    if (!admin) admin = users.find(u => u.email === 'admin@nd-shop.sbs');
    if (!admin) admin = users.find(u => u.is_admin === true);
    return admin;
}

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
            const adminName = localStorage.getItem('nd_admin_name') || 'Fundsafe Technologies Lmt';
            document.getElementById('asecName').value = adminName;

            const adminEmail = localStorage.getItem('nd_admin_email') || 'admin@nd-shop.sbs';
            document.getElementById('asecLoginId').value = adminEmail;
            
            // Populate locks
            const locks = JSON.parse(localStorage.getItem('nd_admin_locks') || '{}');
            const toggleKeys = [
                'tab-register', 'tab-progress', 'tab-product', 'tab-request', 'tab-menu',
                'addBtn', 'adminAddProductBtn',
                'btnManageUsers', 'btnAdminMessages', 'btnRestock', 'btnDebtorBook', 'btnDebtPayments',
                'btnAdminCommunity', 'btnPayoutPurchase', 'btnCustomerInsights', 'btnSalesBook',
                'btnReceiptGenerator', 'btnExpensesNotebook', 'btnTaxRecords', 'btnDeleteSales',
                'btnRecycleBin', 'btnHiddenShopProducts', 'btnIncomeStructure', 'btnYearlyOverview',
                'btnFinancialSettings', 'btnMaintenance', 'btnAppContactSettings', 'btnSystemBackup', 'btnAiMode', 'btnMyEarnings', 'btnLendService'
            ];
            toggleKeys.forEach(k => {
                const cb = document.getElementById('lock-' + k);
                if(cb) cb.checked = !!locks[k];
            });

            // Bind forgot buttons immediately (avoiding race conditions)
            const btnPass = document.getElementById('asecForgotPassBtn');
            if (btnPass) btnPass.onclick = triggerAsecForgotPass;
            const btnPin = document.getElementById('asecForgotPinBtn');
            if (btnPin) btnPin.onclick = triggerAsecForgotPin;

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
    if (typeof window.clearAdminModalPersistence === 'function') {
        window.clearAdminModalPersistence();
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

async function saveAdminName() {
    const name = document.getElementById('asecName').value.trim() || 'Fundsafe Technologies Lmt';
    
    const btn = document.querySelector('#asecPanelProfile .asec-save-btn');
    const originalText = btn ? btn.textContent : 'Update Profile';
    if (btn) { btn.textContent = 'Updating...'; btn.disabled = true; }

    try {
        const response = await fetch(`${window.API_BASE}/api/admin/update-credentials`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + (localStorage.getItem('nd_token') || ''),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name })
        });
        const data = await response.json();
        if (data.success) {
            localStorage.setItem('nd_admin_name', name);
            const menuName = document.querySelector('.admin-name');
            if (menuName) menuName.textContent = name;
            
            if (typeof customAlert !== 'undefined') {
                customAlert("Profile name updated successfully!");
            } else {
                alert("Profile name updated successfully!");
            }
        } else {
            if (typeof customAlert !== 'undefined') {
                customAlert("Failed to update display name: " + (data.error || 'Unknown error'));
            } else {
                alert("Failed to update name.");
            }
        }
    } catch (err) {
        console.error(err);
        if (typeof customAlert !== 'undefined') customAlert("Network error updating profile.");
    } finally {
        if (btn) { btn.textContent = originalText; btn.disabled = false; }
    }
}

async function saveAdminId() {
    const loginId = document.getElementById('asecLoginId').value.trim();
    const confirmPass = document.getElementById('asecIdPass').value;
    const currentPass = localStorage.getItem('nd_admin_pwd') || 'admin123';
    
    if (!loginId) {
        return typeof customAlert !== 'undefined' ? customAlert('Please enter your new Login ID.') : alert('Required Login ID');
    }
    if (!confirmPass) {
        return typeof customAlert !== 'undefined' ? customAlert('Please enter your password to confirm.') : alert('Required password');
    }
    
    if (confirmPass !== currentPass) {
        return typeof customAlert !== 'undefined' ? customAlert('Incorrect password.') : alert('Incorrect password.');
    }

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginId);
    const isPhone = /^\+?\d{7,}$/.test(loginId.replace(/[\s\-\(\)]/g, ''));
    
    if (!isEmail && !isPhone) {
        return typeof customAlert !== 'undefined' ? customAlert('Please enter a valid email or phone number.') : alert('Invalid Login ID format');
    }

    const updatePayload = {};
    if (isEmail) updatePayload.email = loginId;
    if (isPhone) updatePayload.phone = loginId;

    const btn = document.querySelector('#asecPanelLogin .asec-save-btn');
    const originalText = btn ? btn.textContent : 'Update Login ID';
    if (btn) { btn.textContent = 'Updating...'; btn.disabled = true; }

    try {
        const response = await fetch(`${window.API_BASE}/api/admin/update-credentials`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + (localStorage.getItem('nd_token') || ''),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatePayload)
        });
        const data = await response.json();
        if (data.success) {
            if (isEmail) localStorage.setItem('nd_admin_email', loginId);
            if (isPhone) localStorage.setItem('nd_admin_phone', loginId);
            localStorage.setItem('nd_admin_id', loginId);
            document.getElementById('asecIdPass').value = '';
            
            if (typeof customAlert !== 'undefined') {
                customAlert("Login ID updated successfully!");
            } else {
                alert("Login ID updated successfully!");
            }
        } else {
            if (typeof customAlert !== 'undefined') {
                customAlert("Failed to update Login ID: " + (data.error || 'Unknown error'));
            } else {
                alert("Failed to update Login ID.");
            }
        }
    } catch (err) {
        console.error(err);
        if (typeof customAlert !== 'undefined') customAlert("Network error updating Login ID.");
    } finally {
        if (btn) { btn.textContent = originalText; btn.disabled = false; }
    }
}

async function saveAdminPassword() {
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
    
    const btn = document.querySelector('#asecPanelPassword .asec-save-btn');
    const originalText = btn ? btn.textContent : 'Update Password';
    if (btn) { btn.textContent = 'Updating...'; btn.disabled = true; }

    try {
        const response = await fetch(`${window.API_BASE}/api/admin/update-credentials`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + (localStorage.getItem('nd_token') || ''),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password: newPass })
        });
        const data = await response.json();
        if (data.success) {
            localStorage.setItem('nd_admin_pwd', newPass);
            document.getElementById('asecOldPass').value = '';
            document.getElementById('asecNewPass').value = '';
            
            if (typeof customAlert !== 'undefined') {
                customAlert("Password updated successfully!");
            } else {
                alert("Password updated!");
            }
        } else {
            if (typeof customAlert !== 'undefined') {
                customAlert("Failed to update password: " + (data.error || 'Unknown error'));
            } else {
                alert("Failed to update password.");
            }
        }
    } catch (err) {
        console.error(err);
        if (typeof customAlert !== 'undefined') customAlert("Network error updating password.");
    } finally {
        if (btn) { btn.textContent = originalText; btn.disabled = false; }
    }
}

async function saveAdminDeletePin() {
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

    const newPin = newPinEl.value;
    const btn = document.querySelector('#asecPanelPin .asec-save-btn');
    const originalText = btn ? btn.textContent : 'Update PIN';
    if (btn) { btn.textContent = 'Updating...'; btn.disabled = true; }

    try {
        const response = await fetch(`${window.API_BASE}/api/admin/update-credentials`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + (localStorage.getItem('nd_token') || ''),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ pin: newPin })
        });
        const data = await response.json();
        if (data.success) {
            localStorage.setItem('nd_delete_pin', newPin);
            oldPinEl.value = '';
            newPinEl.value = '';
            
            if (typeof customAlert !== 'undefined') {
                customAlert("PIN successfully updated!");
            } else {
                alert("PIN successfully updated!");
            }
        } else {
            if (typeof customAlert !== 'undefined') {
                customAlert("Failed to update PIN: " + (data.error || 'Unknown error'));
            } else {
                alert("Failed to update PIN.");
            }
        }
    } catch (err) {
        console.error(err);
        if (typeof customAlert !== 'undefined') customAlert("Network error updating PIN.");
    } finally {
        if (btn) { btn.textContent = originalText; btn.disabled = false; }
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
        'btnFinancialSettings', 'btnMaintenance', 'btnAppContactSettings', 'btnSystemBackup', 'btnAiMode', 'btnMyEarnings', 'btnLendService'
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

// State for the reset flow
window._asecOtpContact = null;
window._asecOtpMethod = 'email';
window._asecRecoveryType = 'password'; // 'password' or 'pin'

function triggerAsecForgotPass(e) {
    if(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    const adminId = localStorage.getItem('nd_admin_id') || 'admin@nd-shop.sbs';
    window._asecRecoveryType = 'password';

    // Show method selection modal first
    _openAsecMethodModal(adminId);
}

function triggerAsecForgotPin(e) {
    if(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    const adminId = localStorage.getItem('nd_admin_id') || 'admin@nd-shop.sbs';
    window._asecRecoveryType = 'pin';

    // Show method selection modal first
    _openAsecMethodModal(adminId);
}

function _openAsecMethodModal(adminId) {
    // Build a method selection modal on the fly
    let overlay = document.getElementById('asecMethodSelectModal');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'asecMethodSelectModal';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:200010;display:flex;align-items:center;justify-content:center;';
        overlay.innerHTML = `
<style>
.sec-verify-method-label { font-size: 0.95rem; font-weight: 600; color: #4a5568; display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; justify-content: flex-start; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; transition: all 0.2s; background: #fff; }
.sec-verify-method-label:hover { border-color: #cbd5e0; background: #f8fafc; }
.sec-verify-method-radio { display: none; }
.sec-verify-method-square { width: 22px; height: 22px; border: 2px solid #cbd5e0; border-radius: 6px; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; background-color: #fff; flex-shrink: 0; }
.sec-verify-method-radio:checked + .sec-verify-method-square { background-color: #8b5cf6; border-color: #8b5cf6; }
.sec-verify-method-square svg { color: #fff; width: 14px; height: 14px; opacity: 0; transform: scale(0.5); transition: all 0.2s; }
.sec-verify-method-radio:checked + .sec-verify-method-square svg { opacity: 1; transform: scale(1); }
</style>
            <div style="background:#fff;border-radius:20px;padding:0;max-width:400px;width:90%;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.25);text-align:center;position:relative;">
                <div style="padding:24px 24px 0; display:flex; justify-content:center; align-items:center; position:relative;">
                    <h3 style="margin:0;font-size:1.25rem;color:#1e293b;">Choose OTP Method</h3>
                    <span onclick="document.getElementById('asecMethodSelectModal').remove()" style="position:absolute;right:24px;top:24px;font-size:1.8rem;color:#a0aec0;cursor:pointer;line-height:1;">&times;</span>
                </div>
                <div style="padding:20px 24px 24px;">
                    <p style="color:#64748b; margin-top:0; margin-bottom:20px; font-size:0.95rem;">Where would you like to receive your 4-digit verification code?</p>
                    <div style="display:flex; flex-direction:column; gap:15px; text-align:left;">
                        <label class="sec-verify-method-label">
                            <input type="radio" name="asecModalVerifyMethod" class="sec-verify-method-radio" value="email" checked>
                            <div class="sec-verify-method-square">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                            <div>
                                <strong style="display: block; color: #1e293b;">Email</strong>
                                <span style="font-size: 0.8rem; color: #64748b; font-weight: normal;">Send to registered email</span>
                            </div>
                        </label>
                        <label class="sec-verify-method-label">
                            <input type="radio" name="asecModalVerifyMethod" class="sec-verify-method-radio" value="sms">
                            <div class="sec-verify-method-square">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                            <div>
                                <strong style="display: block; color: #1e293b;">SMS</strong>
                                <span style="font-size: 0.8rem; color: #64748b; font-weight: normal;">Send to phone number</span>
                            </div>
                        </label>
                    </div>
                    <button id="asecMethodSendBtn" style="margin-top:25px;width:100%;padding:14px;border:none;border-radius:14px;font-size:1.05rem;font-weight:700;cursor:pointer;background-color:#8b5cf6;color:white;display:flex;justify-content:center;align-items:center;">Send Code</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);

        const btn = document.getElementById('asecMethodSendBtn');
        if (btn) {
            btn.addEventListener('click', () => {
                const method = document.querySelector('input[name="asecModalVerifyMethod"]:checked').value;
                _selectAsecMethod(method);
            });
        }
    }
    overlay.style.display = 'flex';
    window._asecRecoveryAdminId = adminId;
}

async function _selectAsecMethod(method) {
    window._asecOtpMethod = method;
    const overlay = document.getElementById('asecMethodSelectModal');
    if (overlay) overlay.remove();

    const admin = await getAdminUser();
    let contact = '';
    
    if (method === 'email') {
        contact = admin ? admin.email : (localStorage.getItem('nd_admin_email') || 'admin@nd-shop.sbs');
    } else if (method === 'sms') {
        contact = admin ? admin.phone : (localStorage.getItem('nd_admin_phone') || '08109316532');
    }

    if (method === 'sms' && contact) {
        let cleaned = contact.replace(/[\s\-\(\)]/g, '');
        if (cleaned.length === 11 && cleaned.startsWith('0')) {
            cleaned = '+234' + cleaned.substring(1);
        }
        contact = cleaned;
    }

    if (!contact) {
        if (typeof customAlert !== 'undefined') {
            customAlert(`No registered ${method} found for this admin account.`);
        } else {
            alert(`No registered ${method} found.`);
        }
        return;
    }

    window._asecOtpContact = contact;

    const subtitle = document.getElementById('asecPassVerifySubtitle');
    if(subtitle) subtitle.textContent = `A 4-digit code has been sent to ${contact}.`;

    // Show the OTP verify modal
    const modal = document.getElementById('asecPassVerifyModal');
    if(modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    }

    // Actually send OTP
    try {
        const response = await fetch(`${window.API_BASE}/api/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ method, contact, name: 'Admin' })
        });
        const data = await response.json();
        if (data.success) {
            if (typeof customAlert !== 'undefined') customAlert(`Verification code sent to ${contact}`);
        } else {
            if (typeof customAlert !== 'undefined') customAlert('Failed to send OTP: ' + (data.error || 'Unknown error'));
        }
    } catch (err) {
        console.error(err);
        if (typeof customAlert !== 'undefined') customAlert('Network error. Is the server running?');
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
            document.getElementById('asecResetStep2Pin').style.display = 'none';
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

async function goToAsecStep2() {
    const inputs = document.querySelectorAll('.asec-pass-otp');
    const code = Array.from(inputs).map(i => i.value).join('');
    
    if (code.length < 4) {
        return typeof customAlert !== 'undefined' ? customAlert('Please enter the 4-digit code.') : alert('Required 4 digits');
    }

    const btn = document.getElementById('btnAsecGoToStep2');
    btn.classList.add('saving');
    btn.textContent = 'Verifying...';
    btn.disabled = true;

    try {
        const contact = window._asecOtpContact || localStorage.getItem('nd_admin_id') || 'admin@nd-shop.sbs';
        const response = await fetch(`${window.API_BASE}/api/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contact, code })
        });
        const data = await response.json();
        if (data.success) {
            window._asecOtpCode = code; // Cache verified code
            
            document.getElementById('asecResetStep1').style.display = 'none';
            if (window._asecRecoveryType === 'pin') {
                document.getElementById('asecResetStep2Pin').style.display = 'block';
                const firstPinInput = document.getElementById('resetAsecNewPin');
                if (firstPinInput) firstPinInput.focus();
            } else {
                document.getElementById('asecResetStep2').style.display = 'block';
                const firstPassInput = document.getElementById('resetAsecNewPass');
                if (firstPassInput) firstPassInput.focus();
            }
        } else {
            if (typeof customAlert !== 'undefined') customAlert(data.error || 'Invalid OTP. Please try again.');
            else alert('Invalid OTP.');
        }
    } catch (err) {
        console.error(err);
        if (typeof customAlert !== 'undefined') customAlert('Network error. Is the server running?');
    } finally {
        btn.classList.remove('saving');
        btn.textContent = 'Verify Code';
        btn.disabled = false;
    }
}

let asecResendCooldown = 0;
async function resendAsecPassCode(e) {
    if(e) e.preventDefault();
    if (asecResendCooldown > 0) return;

    const contact = window._asecOtpContact || localStorage.getItem('nd_admin_id') || 'admin@nd-shop.sbs';
    const method = window._asecOtpMethod || 'email';

    const btn = document.getElementById('asecResendPassCode');
    if (btn) { btn.style.opacity = '0.5'; btn.textContent = 'Sending...'; btn.style.cursor = 'not-allowed'; }

    try {
        const response = await fetch(`${window.API_BASE}/api/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ method, contact, name: 'Admin' })
        });
        const data = await response.json();
        if (typeof customAlert !== 'undefined') {
            customAlert(data.success ? `A new code has been sent to ${contact}.` : ('Error: ' + (data.error || 'Unknown')));
        }
    } catch (err) {
        if (typeof customAlert !== 'undefined') customAlert('Network error. Is the server running?');
    }

    asecResendCooldown = 60;
    const timer = setInterval(() => {
        asecResendCooldown--;
        if (asecResendCooldown <= 0) {
            clearInterval(timer);
            if (btn) { btn.style.opacity = '1'; btn.style.cursor = 'pointer'; btn.textContent = 'Resend Code'; }
        } else {
            if (btn) btn.textContent = `Resend Code (${asecResendCooldown}s)`;
        }
    }, 1000);
}

async function verifyAsecPasswordReset() {
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

    try {
        const contact = window._asecOtpContact || localStorage.getItem('nd_admin_id') || 'admin@nd-shop.sbs';
        const code = window._asecOtpCode;
        
        const response = await fetch(`${window.API_BASE}/api/reset-admin-credentials`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contact, code, type: 'password', newValue: newPass })
        });
        const data = await response.json();
        
        if (data.success) {
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
        } else {
            btn.classList.remove('saving');
            btn.textContent = 'Update Password';
            if (typeof customAlert !== 'undefined') customAlert("Reset failed: " + (data.error || 'Invalid session.'));
        }
    } catch (err) {
        console.error(err);
        btn.classList.remove('saving');
        btn.textContent = 'Update Password';
        if (typeof customAlert !== 'undefined') customAlert("Network error resetting password.");
    }
}

async function verifyAsecPinReset() {
    const newPinInput = document.getElementById('resetAsecNewPin');
    const confirmPinInput = document.getElementById('resetAsecConfirmPin');
    const newPin = newPinInput ? newPinInput.value : '';
    const confirmPin = confirmPinInput ? confirmPinInput.value : '';

    if (!newPin || !/^\d{4}$/.test(newPin)) {
        return typeof customAlert !== 'undefined' ? customAlert('PIN must be exactly 4 digits.') : alert('PIN must be exactly 4 digits.');
    }

    if (newPin !== confirmPin) {
        return typeof customAlert !== 'undefined' ? customAlert('PINs do not match.') : alert('PINs do not match.');
    }

    const btn = document.getElementById('btnAsecPinFinal');
    btn.classList.add('saving');
    btn.textContent = 'Updating...';

    try {
        const contact = window._asecOtpContact || localStorage.getItem('nd_admin_id') || 'admin@nd-shop.sbs';
        const code = window._asecOtpCode;
        
        const response = await fetch(`${window.API_BASE}/api/reset-admin-credentials`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contact, code, type: 'pin', newValue: newPin })
        });
        const data = await response.json();
        
        if (data.success) {
            localStorage.setItem('nd_delete_pin', newPin);
            btn.classList.remove('saving');
            btn.classList.add('success');
            btn.textContent = 'PIN Updated Successfully!';

            setTimeout(() => {
                btn.classList.remove('success');
                btn.textContent = 'Update PIN';
                
                // Reset fields and close
                document.querySelectorAll('.asec-pass-otp').forEach(i => i.value = '');
                document.getElementById('asecOldPin').value = '';
                document.getElementById('asecNewPin').value = '';
                if (newPinInput) newPinInput.value = '';
                if (confirmPinInput) confirmPinInput.value = '';
                
                closeAsecPassVerify();
                closeAdminSecurity();
            }, 1500);
        } else {
            btn.classList.remove('saving');
            btn.textContent = 'Update PIN';
            if (typeof customAlert !== 'undefined') customAlert("Reset failed: " + (data.error || 'Invalid session.'));
        }
    } catch (err) {
        console.error(err);
        btn.classList.remove('saving');
        btn.textContent = 'Update PIN';
        if (typeof customAlert !== 'undefined') customAlert("Network error resetting PIN.");
    }
}
