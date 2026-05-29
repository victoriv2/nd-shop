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
                document.querySelectorAll('.admin-otp-input').forEach((input, index) => {
                    const inputs = document.querySelectorAll('.admin-otp-input');
                    input.addEventListener('input', () => {
                        if (input.value.length > 1) input.value = input.value.slice(-1);
                        if (input.value && index < inputs.length - 1) inputs[index + 1].focus();
                    });
                    input.addEventListener('keydown', (e) => {
                        if (e.key === 'Backspace' && !input.value && index > 0) inputs[index - 1].focus();
                    });
                });
            }, 300);
        });
}

function toggleForgotPassword() {
    const formSection = document.getElementById('loginFormSection');
    const pwdSection = document.getElementById('forgotPwdSection');
    const emailPhase = document.getElementById('recoveryEmailPhase');
    const otpPhase = document.getElementById('recoveryOtpPhase');

    if (formSection.style.display === 'none') {
        formSection.style.display = 'block';
        pwdSection.style.display = 'none';
        document.querySelector('.login-header h2').textContent = 'Admin Portal';
        document.querySelector('.login-header p').textContent = 'Enter your credentials to access the secure area.';
    } else {
        formSection.style.display = 'none';
        pwdSection.style.display = 'block';
        if (emailPhase) emailPhase.style.display = 'block';
        if (otpPhase) otpPhase.style.display = 'none';
        document.querySelector('.login-header h2').textContent = 'Recovery';
        document.querySelector('.login-header p').textContent = 'Reset your access credentials securely.';
    }
}

function cancelRecoveryOtp() {
    const emailPhase = document.getElementById('recoveryEmailPhase');
    const otpPhase = document.getElementById('recoveryOtpPhase');
    if (emailPhase) emailPhase.style.display = 'block';
    if (otpPhase) otpPhase.style.display = 'none';
    document.querySelectorAll('.admin-otp-input').forEach(i => i.value = '');
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: inputId, password: inputPwd })
        });
        
        const data = await response.json();

        if (data.success) {
            sessionStorage.setItem('nd_admin_logged_in', 'true');
            // Store basic non-sensitive admin info
            localStorage.setItem('nd_admin_id', data.admin.id);
            localStorage.setItem('nd_admin_email', data.admin.email);
            
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

// ===== Admin Recovery: Step 1 — Validate ID, show method modal =====
function sendRecoveryCode() {
    const inputId = document.getElementById('adminRecoveryId').value.trim();
    if (!inputId) {
        if (typeof customAlert !== 'undefined') customAlert("Please enter your registered email or phone.");
        return;
    }

    const savedId = localStorage.getItem('nd_admin_id');
    const isIdValid = inputId === savedId || (!savedId && (inputId === 'admin@nd-shop.sbs' || inputId === '08109316532' || inputId === 'mkayud@gmail.com'));

    if (!isIdValid) {
        if (typeof customAlert !== 'undefined') customAlert("Identifier not recognized in our system.");
        else alert("Identifier not recognized.");
        return;
    }

    window._adminRecoveryId = inputId;

    // Show the method selection modal
    const modal = document.getElementById('adminAuthMethodModal');
    if (modal) {
        modal.classList.add('show');
        // Pre-select email by default
        selectAdminAuthMethodHighlight('email');
    }
}

function closeAdminAuthMethodModal() {
    const modal = document.getElementById('adminAuthMethodModal');
    if (modal) modal.classList.remove('show');
}

// Visual highlight of selected method button
function selectAdminAuthMethodHighlight(method) {
    const emailBtn = document.getElementById('adminBtnMethodEmail');
    const smsBtn = document.getElementById('adminBtnMethodSms');
    if (emailBtn) emailBtn.classList.toggle('selected', method === 'email');
    if (smsBtn) smsBtn.classList.toggle('selected', method === 'sms');
}

function sendAdminAuthMethod() {
    const methodInput = document.querySelector('input[name="adminModalVerifyMethod"]:checked');
    if (methodInput) {
        selectAdminAuthMethod(methodInput.value);
    }
}

// Called when user clicks an option button in the modal
function selectAdminAuthMethod(method) {
    selectAdminAuthMethodHighlight(method);
    window._adminRecoveryMethod = method;
    closeAdminAuthMethodModal();

    const inputId = window._adminRecoveryId || '';
    const isPhoneId = /^\+?\d{7,}$/.test(inputId.replace(/[\s\-\(\)]/g, ''));

    let contact = inputId;
    // Normalize phone
    if (isPhoneId) {
        let cleaned = inputId.replace(/[\s\-\(\)]/g, '');
        if (cleaned.length === 11 && cleaned.startsWith('0')) cleaned = '+234' + cleaned.substring(1);
        contact = cleaned;
    }
    // If email chosen but phone entered, use saved email; if SMS chosen but email entered, use saved phone
    if (method === 'email' && isPhoneId) {
        contact = localStorage.getItem('nd_admin_email') || 'admin@nd-shop.sbs';
    } else if (method === 'sms' && !isPhoneId) {
        contact = localStorage.getItem('nd_admin_phone') || inputId;
    }

    window._adminRecoveryContact = contact;
    _doSendAdminOtp(contact, method);
}

async function _doSendAdminOtp(contact, method) {
    const btn = document.querySelector('#recoveryEmailPhase .admin-login-btn.primary');
    const originalText = btn ? btn.textContent : 'Send Recovery Code';
    if (btn) { btn.textContent = 'Sending...'; btn.disabled = true; }

    try {
        const response = await fetch(`${window.API_BASE}/api/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ method, contact, name: 'Admin' })
        });
        const data = await response.json();

        if (data.success) {
            const emailPhase = document.getElementById('recoveryEmailPhase');
            const otpPhase = document.getElementById('recoveryOtpPhase');
            if (emailPhase) emailPhase.style.display = 'none';
            if (otpPhase) {
                otpPhase.style.display = 'block';
                const desc = otpPhase.querySelector('p');
                if (desc) desc.textContent = `Enter the 4-digit code sent to ${contact}, along with your new password.`;
            }
            setTimeout(() => {
                const first = document.querySelector('.admin-otp-input');
                if (first) first.focus();
            }, 200);
        } else {
            if (typeof customAlert !== 'undefined') customAlert('Failed to send code: ' + (data.error || 'Unknown error'));
            else alert('Failed to send code.');
        }
    } catch (err) {
        console.error(err);
        if (typeof customAlert !== 'undefined') customAlert('Network error. Is the server running on port 5000?');
        else alert('Network error.');
    } finally {
        if (btn) { btn.textContent = originalText; btn.disabled = false; }
    }
}

// ===== Admin Recovery: Step 2 — Verify OTP + Set New Password =====
async function verifyAdminRecovery() {
    const otpInputs = document.querySelectorAll('.admin-otp-input');
    const code = Array.from(otpInputs).map(i => i.value).join('');
    const newPwd = document.getElementById('adminNewPassword').value;

    if (code.length < 4) {
        if (typeof customAlert !== 'undefined') customAlert('Please enter the full 4-digit code.');
        else alert('Please enter the full code.');
        return;
    }
    if (!newPwd) {
        if (typeof customAlert !== 'undefined') customAlert('Please enter a new password.');
        else alert('Please enter a new password.');
        return;
    }

    const btn = document.getElementById('btnVerifyRecovery');
    const originalText = btn ? btn.textContent : 'Reset Password';
    if (btn) { btn.textContent = 'Verifying...'; btn.disabled = true; }

    try {
        const contact = window._adminRecoveryContact || window._adminRecoveryId || '';
        const response = await fetch(`${window.API_BASE}/api/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contact, code })
        });
        const data = await response.json();

        if (data.success) {
            localStorage.setItem('nd_admin_pwd', newPwd);
            if (typeof customAlert !== 'undefined') customAlert("Password reset successfully! Please log in with your new password.");
            else alert("Password reset successfully!");
            toggleForgotPassword();
            otpInputs.forEach(i => i.value = '');
            document.getElementById('adminNewPassword').value = '';
        } else {
            if (typeof customAlert !== 'undefined') customAlert(data.error || 'Invalid OTP. Please try again.');
            else alert('Invalid OTP.');
        }
    } catch (err) {
        console.error(err);
        if (typeof customAlert !== 'undefined') customAlert('Network error. Is the server running on port 5000?');
        else alert('Network error.');
    } finally {
        if (btn) { btn.textContent = originalText; btn.disabled = false; }
    }
}
