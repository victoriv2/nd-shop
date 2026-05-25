async function checkAdminAuth() {
    const isLoggedIn = sessionStorage.getItem('nd_admin_logged_in');
    
    // Listen for password recovery events
    if (window.supabaseClient) {
        window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                const newPassword = prompt("Welcome back! Please enter your new password:");
                if (!newPassword || newPassword.trim() === '') {
                    alert("Password update cancelled. You will need to request another recovery link to change it.");
                    return;
                }
                const { data, error } = await window.supabaseClient.auth.updateUser({ password: newPassword });
                if (error) {
                    alert("Error updating password: " + error.message);
                } else {
                    alert("Password updated successfully! You can now log in.");
                    sessionStorage.removeItem('nd_admin_logged_in');
                    window.location.reload();
                }
            }
        });
    }

    if (!isLoggedIn) {
        showAdminLoginScreen();
    } else {
        if (window.supabaseClient) {
            const { data } = await window.supabaseClient.auth.getSession();
            if (!data.session) {
                sessionStorage.removeItem('nd_admin_logged_in');
                showAdminLoginScreen();
            }
        }
    }
}

function showAdminLoginScreen() {
    fetch('login/login.html')
        .then(res => res.text())
        .then(html => {
            const loginWrapper = document.createElement('div');
            loginWrapper.innerHTML = html;
            document.body.appendChild(loginWrapper);
            
            // Apply login CSS if not already there
            if (!document.querySelector('link[href="login/login.css"]')) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'login/login.css';
                document.head.appendChild(link);
            }
        });
}

function toggleForgotPassword() {
    const formSection = document.getElementById('loginFormSection');
    const pwdSection = document.getElementById('forgotPwdSection');
    
    if (formSection.style.display === 'none') {
        formSection.style.display = 'block';
        pwdSection.style.display = 'none';
        document.querySelector('.login-header h2').textContent = 'Admin Portal';
        document.querySelector('.login-header p').textContent = 'Enter your credentials to access the secure area.';
        
        // Reset recovery phases
        const emailPhase = document.getElementById('recoveryEmailPhase');
        const otpPhase = document.getElementById('recoveryOtpPhase');
        if (emailPhase) emailPhase.style.display = 'block';
        if (otpPhase) otpPhase.style.display = 'none';
    } else {
        formSection.style.display = 'none';
        pwdSection.style.display = 'block';
        document.querySelector('.login-header h2').textContent = 'Recovery';
        document.querySelector('.login-header p').textContent = 'Reset your access credentials securely.';
    }
}

function cancelRecoveryOtp() {
    toggleForgotPassword();
}

async function processAdminLogin() {
    const inputId = document.getElementById('adminLoginId').value.trim();
    const inputPwd = document.getElementById('adminLoginPassword').value;

    const btn = document.querySelector('.admin-login-btn.primary');
    const oldText = btn.innerHTML;
    btn.innerHTML = 'Verifying...';
    btn.disabled = true;

    try {
        let authParams = { password: inputPwd };
        if (inputId.includes('@')) {
            authParams.email = inputId;
        } else {
            // Assume Nigerian phone number
            let phone = inputId;
            if (phone.startsWith('0')) {
                phone = '+234' + phone.substring(1);
            } else if (!phone.startsWith('+')) {
                phone = '+234' + phone;
            }
            authParams.phone = phone;
        }

        const { data, error } = await window.supabaseClient.auth.signInWithPassword(authParams);

        if (error) throw error;

        // Verify Admin status from profiles
        const { data: profile, error: profileError } = await window.supabaseClient
            .from('profiles')
            .select('is_admin')
            .eq('id', data.user.id)
            .single();

        if (profileError || !profile || !profile.is_admin) {
            await window.supabaseClient.auth.signOut();
            throw new Error('Access denied. Administrator privileges required.');
        }

        sessionStorage.setItem('nd_admin_logged_in', 'true');
        document.getElementById('adminLoginScreen').remove();
        if (typeof customAlert !== 'undefined') {
            customAlert("Welcome back, Administrator!");
        } else {
            alert("Welcome back!");
        }
    } catch (err) {
        console.error(err);
        if (typeof customAlert !== 'undefined') {
            customAlert(err.message || "Invalid credentials.");
        } else {
            alert(err.message || "Invalid credentials.");
        }
    } finally {
        if (btn) {
            btn.innerHTML = oldText;
            btn.disabled = false;
        }
    }
}

async function sendRecoveryCode() {
    const inputId = document.getElementById('adminRecoveryId').value.trim();
    
    if (!inputId) {
        if (typeof customAlert !== 'undefined') customAlert('Please enter your email or phone number.');
        else alert('Please enter your email or phone number.');
        return;
    }

    // Instead of sending immediately, show the modal
    const modal = document.getElementById('adminAuthMethodModal');
    if (modal) modal.classList.add('active');
}

window.closeAdminAuthMethodModal = function() {
    const modal = document.getElementById('adminAuthMethodModal');
    if (modal) modal.classList.remove('active');
};

window.selectAdminAuthMethod = async function(method) {
    const inputId = document.getElementById('adminRecoveryId').value.trim();

    // Disable buttons
    const emailBtn = document.getElementById('adminBtnMethodEmail');
    const smsBtn = document.getElementById('adminBtnMethodSms');
    if (emailBtn) emailBtn.disabled = true;
    if (smsBtn) smsBtn.disabled = true;
    
    const selectedBtn = method === 'email' ? emailBtn : smsBtn;
    const oldText = selectedBtn ? selectedBtn.innerHTML : '';
    
    if (selectedBtn) {
        selectedBtn.innerHTML = `
            <div style="display:flex; justify-content:center; align-items:center; width:100%;">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite;">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                <span style="margin-left: 10px; font-weight:bold;">Sending...</span>
            </div>
        `;
    }

    try {
        let error;
        const { data: usersData } = await window.supabaseClient.from('profiles').select('*');
        const users = usersData || [];
        let resolvedEmail = inputId.toLowerCase();
        let resolvedPhone = inputId;

        if (method === 'sms') {
            if (inputId.includes('@')) {
                const matchedUser = users.find(u => u.email && u.email.toLowerCase() === inputId.toLowerCase());
                if (matchedUser && matchedUser.phone) resolvedPhone = matchedUser.phone;
            }
            let phone = resolvedPhone;
            if (phone.startsWith('0')) phone = '+234' + phone.substring(1);
            else if (!phone.startsWith('+')) phone = '+234' + phone;

            window.adminResolvedPhone = phone; // Save for verification
            const { error: smsError } = await window.supabaseClient.auth.signInWithOtp({ phone });
            error = smsError;
        } else {
            if (!inputId.includes('@')) {
                let searchPhone = inputId;
                if (searchPhone.startsWith('0')) searchPhone = '+234' + searchPhone.substring(1);
                else if (!searchPhone.startsWith('+')) searchPhone = '+234' + searchPhone;
                const matchedUser = users.find(u => u.phone === searchPhone);
                if (matchedUser && matchedUser.email) resolvedEmail = matchedUser.email;
            }

            window.adminResolvedEmail = resolvedEmail; // Save for verification
            const { error: emailError } = await window.supabaseClient.auth.resetPasswordForEmail(resolvedEmail);
            error = emailError;
        }

        if (error) throw error;

        // Close modal
        closeAdminAuthMethodModal();
        
        // Save method globally for verification phase
        window.adminRecoveryMethod = method;

        // Transition to OTP phase
        document.getElementById('recoveryEmailPhase').style.display = 'none';
        document.getElementById('recoveryOtpPhase').style.display = 'block';
        
        // Setup OTP input listeners if not already done
        const otpInputs = document.querySelectorAll('.admin-otp-input');
        if (otpInputs.length > 0 && !otpInputs[0].hasAttribute('data-bound')) {
            otpInputs.forEach((input, index) => {
                input.setAttribute('data-bound', 'true');
                input.addEventListener('input', (e) => {
                    if (e.target.value.length > 1) e.target.value = e.target.value.slice(-1);
                    if (e.target.value && index < otpInputs.length - 1) otpInputs[index + 1].focus();
                });
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Backspace' && !e.target.value && index > 0) otpInputs[index - 1].focus();
                });
            });
        }
        
    } catch (err) {
        console.error(err);
        if (typeof customAlert !== 'undefined') {
            customAlert(err.message || "Error sending recovery code.", true);
        } else {
            alert(err.message || "Error sending recovery.");
        }
    } finally {
        if (selectedBtn) {
            selectedBtn.innerHTML = oldText;
        }
        if (emailBtn) emailBtn.disabled = false;
        if (smsBtn) smsBtn.disabled = false;
    }
}

async function verifyAdminRecovery() {
    const inputId = document.getElementById('adminRecoveryId').value.trim();
    const newPwd = document.getElementById('adminNewPassword').value;
    
    const otpInputs = document.querySelectorAll('.admin-otp-input');
    const code = Array.from(otpInputs).map(i => i.value).join('');

    if (code.length < 6) {
        if (typeof customAlert !== 'undefined') customAlert('Please enter the 6-digit code.', true);
        else alert('Please enter the 6-digit code.');
        return;
    }
    
    if (!newPwd || newPwd.length < 6) {
        if (typeof customAlert !== 'undefined') customAlert('Please enter a new password (min 6 characters).', true);
        else alert('Please enter a new password (min 6 characters).');
        return;
    }

    const btn = document.getElementById('btnVerifyRecovery');
    const oldText = btn.innerHTML;
    btn.innerHTML = 'Verifying...';
    btn.disabled = true;

    try {
        const method = window.adminRecoveryMethod || 'email';
        
        let verifyPayload = {};
        if (method === 'sms') {
            verifyPayload = { phone: window.adminResolvedPhone || inputId, token: code, type: 'sms' };
        } else {
            verifyPayload = { email: window.adminResolvedEmail || inputId, token: code, type: 'recovery' };
        }

        // 1. Verify the OTP code
        const { data, error } = await window.supabaseClient.auth.verifyOtp(verifyPayload);
        
        if (error) throw error;

        // 2. We now have a session! Update the password securely.
        const { error: updateError } = await window.supabaseClient.auth.updateUser({ password: newPwd });
        if (updateError) throw updateError;
        
        if (typeof customAlert !== 'undefined') customAlert("Password updated successfully! You can now log in.");
        else alert("Password updated successfully! You can now log in.");
        
        // Log them out so they can log back in with the new credentials
        await window.supabaseClient.auth.signOut();
        sessionStorage.removeItem('nd_admin_logged_in');
        window.location.reload();

    } catch (err) {
        console.error(err);
        if (typeof customAlert !== 'undefined') customAlert(err.message || "Invalid or expired code.", true);
        else alert(err.message || "Invalid or expired code.");
    } finally {
        if (btn) {
            btn.innerHTML = oldText;
            btn.disabled = false;
        }
    }
}
