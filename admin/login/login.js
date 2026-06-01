function checkAdminAuth() {
    const isLoggedIn = sessionStorage.getItem('nd_admin_logged_in');
    if (!isLoggedIn) {
        showAdminLoginScreen();
    }
}

function showAdminLoginScreen() {
    fetch('login/login.html')
        .then(res => res.text())
        .then(html => {
            const loginWrapper = document.createElement('div');
            loginWrapper.innerHTML = html;
            document.body.appendChild(loginWrapper);

            if (!document.querySelector('link[href="login/login.css"]')) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'login/login.css';
                document.head.appendChild(link);
            }

            // Wire OTP input navigation after HTML is injected
            setTimeout(() => {
                const inputs = document.querySelectorAll('.admin-otp-input');
                inputs.forEach((input, index) => {
                    input.addEventListener('input', () => {
                        if (input.value.length > 1) input.value = input.value.slice(-1);
                        if (input.value && index < inputs.length - 1) inputs[index + 1].focus();
                    });
                    input.addEventListener('keydown', (e) => {
                        if (e.key === 'Backspace' && !input.value && index > 0) inputs[index - 1].focus();
                    });
                    input.addEventListener('paste', (e) => {
                        e.preventDefault();
                        const pasteData = (e.clipboardData || window.clipboardData).getData('text').trim();
                        if (/^\d{4}$/.test(pasteData)) {
                            inputs.forEach((inp, idx) => {
                                inp.value = pasteData[idx];
                            });
                            inputs[3].focus();
                        }
                    });
                });
            }, 300);
        });
}

function toggleForgotPassword() {
    const formSection = document.getElementById('loginFormSection');
    const pwdSection = document.getElementById('forgotPwdSection');

    // Reset recovery input values
    const idInput = document.getElementById('adminRecoveryId');
    const pwdInput = document.getElementById('adminNewPassword');
    if (idInput) idInput.value = '';
    if (pwdInput) pwdInput.value = '';
    document.querySelectorAll('.admin-otp-input').forEach(i => i.value = '');

    if (formSection.style.display === 'none') {
        formSection.style.display = 'block';
        pwdSection.style.display = 'none';
        document.querySelector('.login-header h2').textContent = 'Admin Portal';
        document.querySelector('.login-header p').textContent = 'Enter your credentials to access the secure area.';
    } else {
        formSection.style.display = 'none';
        pwdSection.style.display = 'block';
        window._adminRecoveryStep = 0;
        window._selectedRecoveryMethod = null;
        updateRecoveryWizard();
    }
}

function updateRecoveryWizard() {
    const currentStep = window._adminRecoveryStep || 0;
    const track = document.getElementById('recoveryTrack');
    if (track) {
        track.style.setProperty('--current-recovery-step', currentStep);
    }

    const steps = document.querySelectorAll('.recovery-step');
    steps.forEach((step, idx) => {
        step.classList.toggle('active-step', idx === currentStep);
    });

    const headerTitle = document.querySelector('.login-header h2');
    const headerSub = document.querySelector('.login-header p');

    if (currentStep === 0) {
        if (headerTitle) headerTitle.textContent = 'Password Recovery';
        if (headerSub) headerSub.textContent = 'Choose your recovery method to receive a verification code.';
    } else if (currentStep === 1) {
        const contact = window._adminRecoveryContact || 'your contact';
        if (headerTitle) headerTitle.textContent = 'Verify OTP Code';
        if (headerSub) headerSub.textContent = `Enter the 4-digit code sent to ${contact}.`;
    } else if (currentStep === 2) {
        if (headerTitle) headerTitle.textContent = 'Set New Password';
        if (headerSub) headerSub.textContent = 'Choose a secure new password for your admin account.';
    }
}

async function fetchAdminDetails() {
    let users = [];
    try {
        // ALWAYS fetch fresh from server to ensure we have the latest email/phone
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

    // Prioritize the default system admin
    let admin = users.find(u => u.id && u.id.startsWith('nd_admin_'));
    if (!admin) admin = users.find(u => u.email === 'admin@nd-shop.sbs');
    if (!admin) admin = users.find(u => u.is_admin === true);
    return admin;
}

async function processAdminLogin() {
    const inputId = document.getElementById('adminLoginId').value.trim();
    const inputPwd = document.getElementById('adminLoginPassword').value;

    const btn = document.querySelector('#loginFormSection .admin-login-btn');
    const originalText = btn ? btn.textContent : 'Login';
    if (btn) { btn.textContent = 'Authenticating...'; btn.disabled = true; }

    try {
        const response = await fetch(`${window.API_BASE}/api/admin-login`, {
            method: 'POST',
            headers: {
                    'Authorization': 'Bearer ' + (localStorage.getItem('nd_token') || ''), 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: inputId, password: inputPwd })
        });
        
        const data = await response.json();

        if (data.success) {
            sessionStorage.setItem('nd_admin_logged_in', 'true');
            // Store basic non-sensitive admin info
            localStorage.setItem('nd_admin_id', data.admin.id);
            localStorage.setItem('nd_admin_email', data.admin.email);
            if (data.admin.phone) localStorage.setItem('nd_admin_phone', data.admin.phone);
            if (data.token) {
                localStorage.setItem('nd_token', data.token);
            }
            
            document.getElementById('adminLoginScreen').remove();
            if (typeof customAlert !== 'undefined') {
                customAlert("Welcome back, " + data.admin.name + "!");
            } else {
                alert("Welcome back!");
            }
        } else {
            if (typeof customAlert !== 'undefined') {
                customAlert(data.error || "Invalid credentials.");
            } else {
                alert("Invalid credentials.");
            }
        }
    } catch (err) {
        console.error('Admin Login Error:', err);
        if (typeof customAlert !== 'undefined') {
            customAlert("Network error. Please make sure the server is running.");
        } else {
            alert("Network error.");
        }
    } finally {
        if (btn) { btn.textContent = originalText; btn.disabled = false; }
    }
}

// ===== Admin Recovery: Step 1 — Choose Method & Send OTP =====
async function sendRecoveryCode(method) {
    if (!method) return;
    
    // UI Feedback on button
    const btnId = method === 'email' ? 'methodEmailBtn' : 'methodSmsBtn';
    const btn = document.getElementById(btnId);
    let originalHtml = '';
    if (btn) {
        originalHtml = btn.innerHTML;
        btn.innerHTML = `<div class="method-text" style="text-align:center; width:100%;"><span class="method-title">Sending...</span></div>`;
        btn.disabled = true;
    }

    try {
        const admin = await fetchAdminDetails();
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
            if (typeof customAlert !== 'undefined') customAlert(`No registered ${method} found for admin.`);
            else alert(`No registered ${method} found.`);
            return;
        }

        // Call the regular send-otp endpoint (same as admin-security)
        const response = await fetch(`${window.API_BASE}/api/send-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ method, contact, name: 'Admin' })
        });
        const data = await response.json();

        if (data.success) {
            window._adminRecoveryContact = contact;
            window._adminRecoveryMethod = method;
            window._selectedRecoveryMethod = method; // For resend logic

            window._adminRecoveryStep = 1;
            updateRecoveryWizard();
            
            setTimeout(() => {
                const first = document.querySelector('.admin-otp-input');
                if (first) first.focus();
            }, 300);
        } else {
            if (typeof customAlert !== 'undefined') customAlert(data.error || 'Failed to send recovery code.');
            else alert(data.error || 'Failed to send recovery code.');
        }
    } catch (err) {
        console.error(err);
        if (typeof customAlert !== 'undefined') customAlert('Network error. Is the server running?');
        else alert('Network error.');
    } finally {
        if (btn) { 
            btn.innerHTML = originalHtml; 
            btn.disabled = false; 
        }
    }
}

// ===== Admin Recovery: Resend Code for Step 2 =====
let adminResendCooldown = 0;
async function resendAdminRecoveryOtp() {
    if (adminResendCooldown > 0) return;
    const contact = window._adminRecoveryContact;
    const method = window._adminRecoveryMethod;
    if (!contact || !method) return;

    const resendBtn = document.getElementById('adminResendOtpBtn');
    if (resendBtn) {
        resendBtn.style.opacity = '0.5';
        resendBtn.style.cursor = 'not-allowed';
        resendBtn.textContent = 'Sending...';
    }

    try {
        const response = await fetch(`${window.API_BASE}/api/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ method, contact, name: 'Admin' })
        });
        const data = await response.json();
        if (data.success) {
            if (typeof customAlert !== 'undefined') customAlert(`A new verification code has been sent to ${contact}.`);
        } else {
            if (typeof customAlert !== 'undefined') customAlert('Failed to resend code: ' + (data.error || 'Unknown error'));
        }
    } catch (err) {
        console.error(err);
    }

    adminResendCooldown = 60;
    const timer = setInterval(() => {
        adminResendCooldown--;
        if (adminResendCooldown <= 0) {
            clearInterval(timer);
            if (resendBtn) {
                resendBtn.style.opacity = '1';
                resendBtn.style.cursor = 'pointer';
                resendBtn.textContent = 'Resend Code';
            }
        } else {
            if (resendBtn) resendBtn.textContent = `Resend Code (${adminResendCooldown}s)`;
        }
    }, 1000);
}

// ===== Admin Recovery: Step 2 — Verify OTP Code =====
async function verifyRecoveryOtp() {
    const otpInputs = document.querySelectorAll('.admin-otp-input');
    const code = Array.from(otpInputs).map(i => i.value).join('');
    const contact = window._adminRecoveryContact;

    if (code.length < 4) {
        if (typeof customAlert !== 'undefined') customAlert('Please enter the full 4-digit code.');
        else alert('Please enter the full code.');
        return;
    }

    const btn = document.querySelector('#recoveryOtpPhase .admin-login-btn.primary');
    const originalText = btn ? btn.textContent : 'Verify Code';
    if (btn) { btn.textContent = 'Verifying...'; btn.disabled = true; }

    try {
        const response = await fetch(`${window.API_BASE}/api/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contact, code })
        });
        const data = await response.json();

        if (data.success) {
            window._adminRecoveryCode = code; // Save code for reset step
            window._adminRecoveryStep = 2;
            updateRecoveryWizard();
            
            setTimeout(() => {
                const pwdInput = document.getElementById('adminNewPassword');
                if (pwdInput) pwdInput.focus();
            }, 300);
        } else {
            if (typeof customAlert !== 'undefined') customAlert(data.error || 'Invalid OTP. Please try again.');
            else alert('Invalid OTP.');
        }
    } catch (err) {
        console.error(err);
        if (typeof customAlert !== 'undefined') customAlert('Network error. Is the server running?');
        else alert('Network error.');
    } finally {
        if (btn) { btn.textContent = originalText; btn.disabled = false; }
    }
}

// ===== Admin Recovery: Step 3 — Submit New Password =====
async function resetAdminPassword() {
    const newPwd = document.getElementById('adminNewPassword').value;

    if (!newPwd) {
        if (typeof customAlert !== 'undefined') customAlert('Please enter a new password.');
        else alert('Please enter a new password.');
        return;
    }

    const btn = document.getElementById('btnVerifyRecovery');
    const originalText = btn ? btn.textContent : 'Reset Password';
    if (btn) { btn.textContent = 'Resetting...'; btn.disabled = true; }

    try {
        const contact = window._adminRecoveryContact;
        const code = window._adminRecoveryCode;
        
        const response = await fetch(`${window.API_BASE}/api/reset-admin-credentials`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contact, code, type: 'password', newValue: newPwd })
        });
        const data = await response.json();

        if (data.success) {
            localStorage.setItem('nd_admin_pwd', newPwd);
            if (typeof customAlert !== 'undefined') customAlert("Password reset successfully! Please log in with your new password.");
            else alert("Password reset successfully!");
            toggleForgotPassword(); // Resets back to login section
        } else {
            if (typeof customAlert !== 'undefined') customAlert(data.error || 'Reset failed. Please request a new OTP.');
            else alert('Reset failed.');
        }
    } catch (err) {
        console.error(err);
        if (typeof customAlert !== 'undefined') customAlert('Network error resetting password.');
        else alert('Network error.');
    } finally {
        if (btn) { btn.textContent = originalText; btn.disabled = false; }
    }
}

