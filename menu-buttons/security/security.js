document.addEventListener('DOMContentLoaded', () => {
    const container = document.createElement('div');
    container.id = 'security-modal-container';
    document.body.appendChild(container);

    fetch('menu-buttons/security/security.html')
        .then(res => {
            if (!res.ok) throw new Error('Network response not ok');
            return res.text();
        })
        .then(html => {
            container.innerHTML = html;
            initSecurityLogic();
        })
        .catch(err => console.warn('Could not load security.html', err));
});

function initSecurityLogic() {
    const modal = document.getElementById('securityModal');
    const closeBtn = document.getElementById('securityClose');
    const trigger = document.getElementById('securityBtn');

    if (!modal) return;

    // Open
    if (trigger) {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            modal.classList.add('show');
            document.body.classList.add('modal-open');
        });
    }

    // Close
    const closeModal = () => {
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);





    // ========================================
    // Tab Switching Logic (supports 3 tabs)
    // ========================================
    const tabs = modal.querySelectorAll('.sec-tab');
    const tabBar = modal.querySelector('.sec-tab-bar');
    const emailPanel = document.getElementById('secPanelEmail');
    const phonePanel = document.getElementById('secPanelPhone');
    const passwordPanel = document.getElementById('secPanelPassword');

    const allPanels = [emailPanel, phonePanel, passwordPanel].filter(Boolean);

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.getAttribute('data-sec-tab');

            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Move indicator
            tabBar.setAttribute('data-active', target);

            // Show correct panel
            allPanels.forEach(p => p.classList.add('hidden'));
            if (target === 'email' && emailPanel) emailPanel.classList.remove('hidden');
            if (target === 'phone' && phonePanel) phonePanel.classList.remove('hidden');
            if (target === 'password' && passwordPanel) passwordPanel.classList.remove('hidden');
        });
    });

    // ========================================
    // Save Logic — Email
    // ========================================
    const emailSaveBtn = document.getElementById('secEmailSave');
    if (emailSaveBtn) {
        emailSaveBtn.addEventListener('click', async () => {
            const email = document.getElementById('secNewEmail');
            const pass = document.getElementById('secEmailPass');

            if (!email.value || !pass.value) {
                emailSaveBtn.textContent = 'Please fill all fields';
                emailSaveBtn.style.backgroundColor = '#dc3545';
                emailSaveBtn.style.boxShadow = '0 4px 15px rgba(220,38,38,0.3)';
                setTimeout(() => {
                    emailSaveBtn.textContent = 'Update Email';
                    emailSaveBtn.style.backgroundColor = '';
                    emailSaveBtn.style.boxShadow = '';
                }, 1500);
                return;
            }

            const user = window.loggedInUser || {};
            if (user.password && user.password !== pass.value) {
                emailSaveBtn.textContent = 'Incorrect Password';
                emailSaveBtn.style.backgroundColor = '#dc3545';
                emailSaveBtn.style.boxShadow = '0 4px 15px rgba(220,38,38,0.3)';
                setTimeout(() => {
                    emailSaveBtn.textContent = 'Update Email';
                    emailSaveBtn.style.backgroundColor = '';
                    emailSaveBtn.style.boxShadow = '';
                }, 1500);
                return;
            }

            emailSaveBtn.classList.add('saving');
            emailSaveBtn.textContent = 'Sending code...';
            emailSaveBtn.disabled = true;

            try {
                const response = await fetch(`${window.API_BASE}/api/send-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ method: 'email', contact: email.value.trim(), name: user.firstName || user.name || 'User' })
                });
                const data = await response.json();

                if (data.success) {
                    window._secEmailOtpContact = email.value.trim();
                    emailSaveBtn.classList.remove('saving');
                    emailSaveBtn.classList.add('success');
                    emailSaveBtn.textContent = 'Code Sent!';

                    setTimeout(() => {
                        emailSaveBtn.classList.remove('success');
                        emailSaveBtn.textContent = 'Update Email';
                        closeModal();

                        const verifyModal = document.getElementById('emailVerifyModal');
                        if (verifyModal) {
                            verifyModal.classList.add('show');
                            document.body.classList.add('modal-open');
                            setTimeout(() => {
                                const firstInput = verifyModal.querySelector('.email-otp-input');
                                if (firstInput) firstInput.focus();
                            }, 300);
                        }
                    }, 1000);
                } else {
                    emailSaveBtn.classList.remove('saving');
                    emailSaveBtn.textContent = 'Failed to send code';
                    emailSaveBtn.style.backgroundColor = '#dc3545';
                    setTimeout(() => { emailSaveBtn.textContent = 'Update Email'; emailSaveBtn.style.backgroundColor = ''; }, 2000);
                }
            } catch (err) {
                emailSaveBtn.classList.remove('saving');
                emailSaveBtn.textContent = 'Network Error';
                emailSaveBtn.style.backgroundColor = '#dc3545';
                setTimeout(() => { emailSaveBtn.textContent = 'Update Email'; emailSaveBtn.style.backgroundColor = ''; }, 2000);
            } finally {
                emailSaveBtn.disabled = false;
            }
        });
    }

    // ========================================
    // Save Logic — Phone
    // ========================================
    const phoneSaveBtn = document.getElementById('secPhoneSave');
    if (phoneSaveBtn) {
        phoneSaveBtn.addEventListener('click', async () => {
            const phone = document.getElementById('secNewPhone');
            const pass = document.getElementById('secPhonePass');

            if (!phone.value || !pass.value) {
                phoneSaveBtn.textContent = 'Please fill all fields';
                phoneSaveBtn.style.backgroundColor = '#dc3545';
                phoneSaveBtn.style.boxShadow = '0 4px 15px rgba(220,38,38,0.3)';
                setTimeout(() => {
                    phoneSaveBtn.textContent = 'Update Phone';
                    phoneSaveBtn.style.backgroundColor = '';
                    phoneSaveBtn.style.boxShadow = '';
                }, 1500);
                return;
            }

            const user = window.loggedInUser || {};
            if (user.password && user.password !== pass.value) {
                phoneSaveBtn.textContent = 'Incorrect Password';
                phoneSaveBtn.style.backgroundColor = '#dc3545';
                phoneSaveBtn.style.boxShadow = '0 4px 15px rgba(220,38,38,0.3)';
                setTimeout(() => {
                    phoneSaveBtn.textContent = 'Update Phone';
                    phoneSaveBtn.style.backgroundColor = '';
                    phoneSaveBtn.style.boxShadow = '';
                }, 1500);
                return;
            }

            let normalizedPhone = phone.value.trim().replace(/[\s\-\(\)]/g, '');
            if (normalizedPhone.length === 11 && normalizedPhone.startsWith('0')) normalizedPhone = '+234' + normalizedPhone.substring(1);

            phoneSaveBtn.classList.add('saving');
            phoneSaveBtn.textContent = 'Sending code...';
            phoneSaveBtn.disabled = true;

            try {
                const response = await fetch(`${window.API_BASE}/api/send-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ method: 'sms', contact: normalizedPhone, name: user.firstName || user.name || 'User' })
                });
                const data = await response.json();

                if (data.success) {
                    window._secPhoneOtpContact = normalizedPhone;
                    phoneSaveBtn.classList.remove('saving');
                    phoneSaveBtn.classList.add('success');
                    phoneSaveBtn.textContent = 'Code Sent!';

                    setTimeout(() => {
                        phoneSaveBtn.classList.remove('success');
                        phoneSaveBtn.textContent = 'Update Phone';
                        closeModal();

                        const verifyModal = document.getElementById('phoneVerifyModal');
                        if (verifyModal) {
                            verifyModal.classList.add('show');
                            document.body.classList.add('modal-open');
                            setTimeout(() => {
                                const firstInput = verifyModal.querySelector('.phone-otp-input');
                                if (firstInput) firstInput.focus();
                            }, 300);
                        }
                    }, 1000);
                } else {
                    phoneSaveBtn.classList.remove('saving');
                    phoneSaveBtn.textContent = 'Failed to send code';
                    phoneSaveBtn.style.backgroundColor = '#dc3545';
                    setTimeout(() => { phoneSaveBtn.textContent = 'Update Phone'; phoneSaveBtn.style.backgroundColor = ''; }, 2000);
                }
            } catch (err) {
                phoneSaveBtn.classList.remove('saving');
                phoneSaveBtn.textContent = 'Network Error';
                phoneSaveBtn.style.backgroundColor = '#dc3545';
                setTimeout(() => { phoneSaveBtn.textContent = 'Update Phone'; phoneSaveBtn.style.backgroundColor = ''; }, 2000);
            } finally {
                phoneSaveBtn.disabled = false;
            }
        });
    }

    // ========================================
    // Save Logic — Password
    // ========================================
    const passSaveBtn = document.getElementById('secPassSave');
    if (passSaveBtn) {
        passSaveBtn.addEventListener('click', () => {
            const oldPass = document.getElementById('secOldPass');
            const newPass = document.getElementById('secNewPass');
            const confirmPass = document.getElementById('secConfirmPass');

            if (!oldPass.value || !newPass.value || !confirmPass.value) {
                passSaveBtn.textContent = 'Please fill all fields';
                passSaveBtn.style.backgroundColor = '#dc3545';
                passSaveBtn.style.boxShadow = '0 4px 15px rgba(220,38,38,0.3)';
                setTimeout(() => {
                    passSaveBtn.textContent = 'Update Password';
                    passSaveBtn.style.backgroundColor = '';
                    passSaveBtn.style.boxShadow = '';
                }, 1500);
                return;
            }

            if (newPass.value !== confirmPass.value) {
                passSaveBtn.textContent = 'Passwords do not match';
                passSaveBtn.style.backgroundColor = '#dc3545';
                passSaveBtn.style.boxShadow = '0 4px 15px rgba(220,38,38,0.3)';
                setTimeout(() => {
                    passSaveBtn.textContent = 'Update Password';
                    passSaveBtn.style.backgroundColor = '';
                    passSaveBtn.style.boxShadow = '';
                }, 1500);
                return;
            }

            // Verify old password
            const user = window.loggedInUser || {};
            if (user.password && user.password !== oldPass.value) {
                passSaveBtn.textContent = 'Incorrect Current Password';
                passSaveBtn.style.backgroundColor = '#dc3545';
                passSaveBtn.style.boxShadow = '0 4px 15px rgba(220,38,38,0.3)';
                setTimeout(() => {
                    passSaveBtn.textContent = 'Update Password';
                    passSaveBtn.style.backgroundColor = '';
                    passSaveBtn.style.boxShadow = '';
                }, 1500);
                return;
            }

            passSaveBtn.classList.add('saving');
            passSaveBtn.textContent = 'Updating...';

            setTimeout(() => {
                // Actually Update Local Storage
                if (window.loggedInUser) {
                    window.loggedInUser.password = newPass.value;
                    localStorage.setItem('nd_logged_in_user', JSON.stringify(window.loggedInUser));

                    const users = JSON.parse(localStorage.getItem('nd_users') || '[]');
                    const idx = users.findIndex(u => u.id === window.loggedInUser.id);
                    if (idx !== -1) {
                        users[idx].password = newPass.value;
                        localStorage.setItem('nd_users', JSON.stringify(users));
                    }
                }

                passSaveBtn.classList.remove('saving');
                passSaveBtn.classList.add('success');
                passSaveBtn.textContent = 'Password Updated!';

                setTimeout(() => {
                    passSaveBtn.classList.remove('success');
                    passSaveBtn.textContent = 'Update Password';
                    oldPass.value = '';
                    newPass.value = '';
                    confirmPass.value = '';
                    closeModal();
                }, 1200);
            }, 1000);
        });
    }
    
    // ========================================
    // Forgot Password Flow within Security
    // ========================================
    const forgotPassBtn = document.getElementById('secForgotPassBtn');
    const passVerifyModal = document.getElementById('passVerifyModal');
    const passVerifyCloseBtn = document.getElementById('passVerifyClose');
    const passVerifySubtitle = document.getElementById('passVerifySubtitle');

    // State
    window._secPassOtpContact = null;
    window._secPassOtpMethod = 'email';

    function _openPassMethodModal() {
        const user = window.loggedInUser || JSON.parse(localStorage.getItem('nd_logged_in_user') || '{}') || {};
        const hasEmail = !!user.email;
        const hasPhone = !!user.phone;

        let overlay = document.getElementById('secPassMethodModal');
        if (overlay) overlay.remove();

        overlay = document.createElement('div');
        overlay.id = 'secPassMethodModal';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:200010;display:flex;align-items:center;justify-content:center;';
        let optionsHtml = '';
        if (hasEmail) {
            optionsHtml += `
                <label class="sec-verify-method-label">
                    <input type="radio" name="secModalVerifyMethod" class="sec-verify-method-radio" value="email" checked>
                    <div class="sec-verify-method-square">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <div>
                        <strong style="display: block; color: #1e293b;">Email</strong>
                        <span style="font-size: 0.8rem; color: #64748b; font-weight: normal;">Send to ${user.email}</span>
                    </div>
                </label>`;
        }
        if (hasPhone) {
            optionsHtml += `
                <label class="sec-verify-method-label">
                    <input type="radio" name="secModalVerifyMethod" class="sec-verify-method-radio" value="sms" ${!hasEmail ? 'checked' : ''}>
                    <div class="sec-verify-method-square">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <div>
                        <strong style="display: block; color: #1e293b;">SMS</strong>
                        <span style="font-size: 0.8rem; color: #64748b; font-weight: normal;">Send to ${user.phone}</span>
                    </div>
                </label>`;
        }
        if (!hasEmail && !hasPhone) {
            optionsHtml += '<p style="color:#dc3545;text-align:center;">No email or phone saved in your account.</p>';
        }

        let buttonHtml = (hasEmail || hasPhone) ? `<button id="secPassMethodSendBtn" style="margin-top:25px;width:100%;padding:14px;border:none;border-radius:14px;font-size:1.05rem;font-weight:700;cursor:pointer;background-color:#8b5cf6;color:white;display:flex;justify-content:center;align-items:center;">Send Code</button>` : '';

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
                    <span onclick="document.getElementById('secPassMethodModal').remove()" style="position:absolute;right:24px;top:24px;font-size:1.8rem;color:#a0aec0;cursor:pointer;line-height:1;">&times;</span>
                </div>
                <div style="padding:20px 24px 24px;">
                    <p style="color:#64748b; margin-top:0; margin-bottom:20px; font-size:0.95rem;">Where would you like to receive your 4-digit verification code?</p>
                    <div style="display:flex; flex-direction:column; gap:15px; text-align:left;">
                        ${optionsHtml}
                    </div>
                    ${buttonHtml}
                </div>
            </div>`;
        document.body.appendChild(overlay);

        // Wire the buttons
        const btn = document.getElementById('secPassMethodSendBtn');
        if (btn) {
            btn.addEventListener('click', () => {
                const method = document.querySelector('input[name="secModalVerifyMethod"]:checked').value;
                if (method === 'email') _doSendSecPassOtp('email', user.email);
                else if (method === 'sms') _doSendSecPassOtp('sms', user.phone);
            });
        }
    }

    async function _doSendSecPassOtp(method, contact) {
        const overlay = document.getElementById('secPassMethodModal');
        if (overlay) overlay.remove();

        const user = window.loggedInUser || JSON.parse(localStorage.getItem('nd_logged_in_user') || '{}') || {};
        let normalizedContact = contact;
        if (method === 'sms') {
            normalizedContact = contact.replace(/[\s\-\(\)]/g, '');
            if (normalizedContact.length === 11 && normalizedContact.startsWith('0')) normalizedContact = '+234' + normalizedContact.substring(1);
        }

        window._secPassOtpContact = normalizedContact;
        window._secPassOtpMethod = method;

        if (passVerifySubtitle) {
            passVerifySubtitle.textContent = `A 4-digit code has been sent to ${normalizedContact}. Please enter it below.`;
        }

        closeModal();
        passVerifyModal.classList.add('show');
        document.body.classList.add('modal-open');

        setTimeout(() => {
            const firstInput = passVerifyModal.querySelector('.pass-otp-input');
            if (firstInput) firstInput.focus();
        }, 300);

        try {
            const response = await fetch(`${window.API_BASE}/api/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ method, contact: normalizedContact, name: user.firstName || user.name || 'User' })
            });
            const data = await response.json();
            if (data.success) {
                if (typeof customAlert === 'function') customAlert(`Verification code sent to ${normalizedContact}`);
            } else {
                if (typeof customAlert === 'function') customAlert('Failed to send OTP: ' + (data.error || 'Unknown error'));
            }
        } catch (err) {
            if (typeof customAlert === 'function') customAlert('Network error. Is the server running on port 5000?');
        }
    }

    if (forgotPassBtn && passVerifyModal) {
        forgotPassBtn.addEventListener('click', (e) => {
            e.preventDefault();
            _openPassMethodModal();
        });
    }

    const closePassVerifyModal = () => {
        if (passVerifyModal) {
            passVerifyModal.classList.remove('show');
            document.body.classList.remove('modal-open');
            // Reset to Step 1 for next open
            const s1 = document.getElementById('passResetStep1');
            const s2 = document.getElementById('passResetStep2');
            if (s1) s1.style.display = 'block';
            if (s2) s2.style.display = 'none';
        }
    };

    if (passVerifyCloseBtn) passVerifyCloseBtn.addEventListener('click', closePassVerifyModal);

    // Password OTP inputs
    const passOtpInputs = document.querySelectorAll('.pass-otp-input');
    passOtpInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            if (e.target.value.length > 1) e.target.value = e.target.value.slice(-1);
            if (e.target.value && index < passOtpInputs.length - 1) passOtpInputs[index + 1].focus();
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) passOtpInputs[index - 1].focus();
        });
    });

    // Resend — calls real Brevo API
    const resendPassBtn = document.getElementById('resendPassCode');
    let passResendCooldown = 0;
    if (resendPassBtn) {
        resendPassBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (passResendCooldown > 0) return;
            if (!window._secPassOtpContact) return;

            resendPassBtn.textContent = 'Sending...';
            resendPassBtn.style.opacity = '0.5';

            try {
                const response = await fetch(`${window.API_BASE}/api/send-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ method: window._secPassOtpMethod, contact: window._secPassOtpContact, name: 'User' })
                });
                const data = await response.json();
                if (typeof customAlert === 'function') {
                    customAlert(data.success ? `A new code has been sent to ${window._secPassOtpContact}.` : 'Error: ' + (data.error || 'Unknown'));
                }
            } catch (err) {
                if (typeof customAlert === 'function') customAlert('Network error. Is the server running?');
            }

            passResendCooldown = 60;
            resendPassBtn.style.cursor = 'not-allowed';
            resendPassBtn.textContent = `Resend Code (60s)`;

            const timer = setInterval(() => {
                passResendCooldown--;
                if (passResendCooldown <= 0) {
                    clearInterval(timer);
                    resendPassBtn.style.opacity = '1';
                    resendPassBtn.style.cursor = 'pointer';
                    resendPassBtn.textContent = 'Resend Code';
                } else {
                    resendPassBtn.textContent = `Resend Code (${passResendCooldown}s)`;
                }
            }, 1000);
        });
    }

    const btnGoToStep2 = document.getElementById('btnGoToStep2');
    const btnFinalReset = document.getElementById('btnFinalReset');
    const step1 = document.getElementById('passResetStep1');
    const step2 = document.getElementById('passResetStep2');

    if (btnGoToStep2) {
        btnGoToStep2.addEventListener('click', async () => {
            let code = Array.from(passOtpInputs).map(i => i.value).join('');
            if (code.length < 4) {
                btnGoToStep2.textContent = 'Enter 4 digits';
                btnGoToStep2.style.backgroundColor = '#dc3545';
                setTimeout(() => {
                    btnGoToStep2.textContent = 'Verify Code';
                    btnGoToStep2.style.backgroundColor = '';
                }, 1500);
                return;
            }

            btnGoToStep2.classList.add('saving');
            btnGoToStep2.textContent = 'Verifying...';
            btnGoToStep2.disabled = true;

            try {
                const contact = window._secPassOtpContact;
                if (!contact) throw new Error('No contact stored');
                const response = await fetch(`${window.API_BASE}/api/verify-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contact, code })
                });
                const data = await response.json();

                if (data.success) {
                    if (step1) step1.style.display = 'none';
                    if (step2) step2.style.display = 'block';
                    const firstPassInput = document.getElementById('resetNewPass');
                    if (firstPassInput) firstPassInput.focus();
                } else {
                    btnGoToStep2.textContent = data.error || 'Invalid OTP';
                    btnGoToStep2.style.backgroundColor = '#dc3545';
                    setTimeout(() => {
                        btnGoToStep2.textContent = 'Verify Code';
                        btnGoToStep2.style.backgroundColor = '';
                    }, 2000);
                }
            } catch (err) {
                if (typeof customAlert === 'function') customAlert('Network error. Is the server running on port 5000?');
            } finally {
                btnGoToStep2.classList.remove('saving');
                if (btnGoToStep2.textContent === 'Verifying...') btnGoToStep2.textContent = 'Verify Code';
                btnGoToStep2.disabled = false;
            }
        });
    }

    if (btnFinalReset) {
        btnFinalReset.addEventListener('click', () => {
            const newPassInput = document.getElementById('resetNewPass');
            const confirmPassInput = document.getElementById('resetConfirmPass');
            const newPass = newPassInput ? newPassInput.value : '';
            const confirmPass = confirmPassInput ? confirmPassInput.value : '';

            if (!newPass || newPass !== confirmPass) {
                btnFinalReset.textContent = 'Passwords do not match';
                btnFinalReset.style.backgroundColor = '#dc3545';
                setTimeout(() => {
                    btnFinalReset.textContent = 'Update Password';
                    btnFinalReset.style.backgroundColor = '';
                }, 2000);
                return;
            }

            btnFinalReset.classList.add('saving');
            btnFinalReset.textContent = 'Updating...';

            setTimeout(() => {
                // Update Local Storage
                const user = window.loggedInUser || JSON.parse(localStorage.getItem('nd_logged_in_user'));
                if (user) {
                    user.password = newPass;
                    localStorage.setItem('nd_logged_in_user', JSON.stringify(user));

                    const users = JSON.parse(localStorage.getItem('nd_users') || '[]');
                    const idx = users.findIndex(u => u.id === user.id);
                    if (idx !== -1) {
                        users[idx].password = newPass;
                        localStorage.setItem('nd_users', JSON.stringify(users));
                    }
                }

                btnFinalReset.classList.remove('saving');
                btnFinalReset.classList.add('success');
                btnFinalReset.textContent = 'Password Updated Successfully!';

                setTimeout(() => {
                    btnFinalReset.classList.remove('success');
                    btnFinalReset.textContent = 'Update Password';
                    
                    // Reset everything
                    passOtpInputs.forEach(i => i.value = '');
                    if (newPassInput) newPassInput.value = '';
                    if (confirmPassInput) confirmPassInput.value = '';
                    if (step1) step1.style.display = 'block';
                    if (step2) step2.style.display = 'none';
                    
                    closePassVerifyModal();
                }, 1500);
            }, 1000);
        });
    }

    // ========================================
    // Verify Email Logic
    // ========================================
    const verifyEmailModal = document.getElementById('emailVerifyModal');
    const emailVerifyCloseBtn = document.getElementById('emailVerifyClose');

    const closeEmailVerifyModal = () => {
        if (verifyEmailModal) {
            verifyEmailModal.classList.remove('show');
            document.body.classList.remove('modal-open');
        }
    };

    if (emailVerifyCloseBtn) emailVerifyCloseBtn.addEventListener('click', closeEmailVerifyModal);

    if (verifyEmailModal) {
        const resendEmailBtn = document.getElementById('resendEmailCode');
        let emailResendCooldown = 0;

        if (resendEmailBtn) {
            resendEmailBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                if (emailResendCooldown > 0) return;

                const emailInput = document.getElementById('secNewEmail');
                const email = (window._secEmailOtpContact) || (emailInput ? emailInput.value.trim() : '');
                const user = window.loggedInUser || {};

                resendEmailBtn.textContent = 'Sending...';
                resendEmailBtn.style.opacity = '0.5';

                try {
                    const response = await fetch(`${window.API_BASE}/api/send-otp`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ method: 'email', contact: email, name: user.firstName || user.name || 'User' })
                    });
                    const data = await response.json();
                    if (typeof customAlert === 'function') {
                        customAlert(data.success ? `A new code has been sent to ${email}.` : 'Error: ' + (data.error || 'Unknown'));
                    }
                } catch (err) {
                    if (typeof customAlert === 'function') customAlert('Network error. Is the server running?');
                }

                emailResendCooldown = 60;
                resendEmailBtn.style.cursor = 'not-allowed';
                resendEmailBtn.textContent = `Resend Code (60s)`;

                const timer = setInterval(() => {
                    emailResendCooldown--;
                    if (emailResendCooldown <= 0) {
                        clearInterval(timer);
                        resendEmailBtn.style.opacity = '1';
                        resendEmailBtn.style.cursor = 'pointer';
                        resendEmailBtn.textContent = 'Resend Code';
                    } else {
                        resendEmailBtn.textContent = `Resend Code (${emailResendCooldown}s)`;
                    }
                }, 1000);
            });
        }
    }

    // Email OTP inputs
    const emailOtpInputs = document.querySelectorAll('.email-otp-input');
    emailOtpInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            if (e.target.value.length > 1) {
                e.target.value = e.target.value.slice(-1);
            }
            if (e.target.value && index < emailOtpInputs.length - 1) {
                emailOtpInputs[index + 1].focus();
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                emailOtpInputs[index - 1].focus();
            }
        });
    });

    const verifyEmailBtn = document.getElementById('verifyEmailBtn');
    if (verifyEmailBtn) {
        verifyEmailBtn.addEventListener('click', async () => {
            let code = Array.from(emailOtpInputs).map(i => i.value).join('');
            if (code.length < 4) {
                verifyEmailBtn.textContent = 'Enter 4 digits';
                verifyEmailBtn.style.backgroundColor = '#dc3545';
                verifyEmailBtn.style.boxShadow = '0 4px 15px rgba(220,38,38,0.3)';
                setTimeout(() => {
                    verifyEmailBtn.textContent = 'Verify & Update';
                    verifyEmailBtn.style.backgroundColor = '';
                    verifyEmailBtn.style.boxShadow = '';
                }, 1500);
                return;
            }

            verifyEmailBtn.classList.add('saving');
            verifyEmailBtn.textContent = 'Verifying...';
            verifyEmailBtn.disabled = true;

            try {
                const contact = window._secEmailOtpContact;
                const response = await fetch(`${window.API_BASE}/api/verify-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contact, code })
                });
                const data = await response.json();

                if (!data.success) {
                    verifyEmailBtn.classList.remove('saving');
                    verifyEmailBtn.style.backgroundColor = '#dc3545';
                    verifyEmailBtn.style.boxShadow = '0 4px 15px rgba(220,38,38,0.3)';
                    verifyEmailBtn.textContent = data.error || 'Invalid OTP';
                    setTimeout(() => {
                        verifyEmailBtn.style.backgroundColor = '';
                        verifyEmailBtn.style.boxShadow = '';
                        verifyEmailBtn.textContent = 'Verify & Update';
                    }, 2500);
                    verifyEmailBtn.disabled = false;
                    return;
                }

                // OTP verified — now update email
                const emailInput = document.getElementById('secNewEmail');
                const passInput = document.getElementById('secEmailPass');
                const allUsers = JSON.parse(localStorage.getItem('nd_users') || '[]');
                const newEmail = emailInput ? emailInput.value.trim() : '';
                const emailTaken = allUsers.find(u => u.id !== (window.loggedInUser || {}).id && u.email && u.email.toLowerCase() === newEmail.toLowerCase());
                if (emailTaken) {
                    verifyEmailBtn.classList.remove('saving');
                    verifyEmailBtn.style.backgroundColor = '#dc3545';
                    verifyEmailBtn.style.boxShadow = '0 4px 15px rgba(220,38,38,0.3)';
                    verifyEmailBtn.textContent = 'Email already in use!';
                    setTimeout(() => {
                        verifyEmailBtn.style.backgroundColor = '';
                        verifyEmailBtn.style.boxShadow = '';
                        verifyEmailBtn.textContent = 'Verify & Update';
                    }, 2500);
                    verifyEmailBtn.disabled = false;
                    return;
                }

                if (window.loggedInUser && emailInput && newEmail) {
                    window.loggedInUser.email = newEmail;
                    localStorage.setItem('nd_logged_in_user', JSON.stringify(window.loggedInUser));
                    const idx = allUsers.findIndex(u => u.id === window.loggedInUser.id);
                    if (idx !== -1) { allUsers[idx].email = newEmail; localStorage.setItem('nd_users', JSON.stringify(allUsers)); }
                }

                verifyEmailBtn.classList.remove('saving');
                verifyEmailBtn.classList.add('success');
                verifyEmailBtn.textContent = 'Email Verified!';

                setTimeout(() => {
                    verifyEmailBtn.classList.remove('success');
                    verifyEmailBtn.textContent = 'Verify & Update';
                    emailOtpInputs.forEach(i => i.value = '');
                    if (emailInput) emailInput.value = '';
                    if (passInput) passInput.value = '';
                    closeEmailVerifyModal();
                }, 1200);
            } catch (err) {
                if (typeof customAlert === 'function') customAlert('Network error. Is the server running?');
                verifyEmailBtn.classList.remove('saving');
                verifyEmailBtn.textContent = 'Verify & Update';
            } finally {
                verifyEmailBtn.disabled = false;
            }
        });
    }


    // ========================================
    // Verify Phone Logic
    // ========================================
    const verifyPhoneModal = document.getElementById('phoneVerifyModal');
    const phoneVerifyCloseBtn = document.getElementById('phoneVerifyClose');

    const closePhoneVerifyModal = () => {
        if (verifyPhoneModal) {
            verifyPhoneModal.classList.remove('show');
            document.body.classList.remove('modal-open');
        }
    };

    if (phoneVerifyCloseBtn) phoneVerifyCloseBtn.addEventListener('click', closePhoneVerifyModal);

    if (verifyPhoneModal) {
        const resendPhoneBtn = document.getElementById('resendPhoneCode');
        let phoneResendCooldown = 0;

        if (resendPhoneBtn) {
            resendPhoneBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                if (phoneResendCooldown > 0) return;

                const contact = window._secPhoneOtpContact;
                const user = window.loggedInUser || {};

                resendPhoneBtn.textContent = 'Sending...';
                resendPhoneBtn.style.opacity = '0.5';

                try {
                    const response = await fetch(`${window.API_BASE}/api/send-otp`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ method: 'sms', contact, name: user.firstName || user.name || 'User' })
                    });
                    const data = await response.json();
                    if (typeof customAlert === 'function') {
                        customAlert(data.success ? `A new code has been sent to ${contact}.` : 'Error: ' + (data.error || 'Unknown'));
                    }
                } catch (err) {
                    if (typeof customAlert === 'function') customAlert('Network error. Is the server running?');
                }

                phoneResendCooldown = 60;
                resendPhoneBtn.style.cursor = 'not-allowed';
                resendPhoneBtn.textContent = `Resend Code (60s)`;

                const timer = setInterval(() => {
                    phoneResendCooldown--;
                    if (phoneResendCooldown <= 0) {
                        clearInterval(timer);
                        resendPhoneBtn.style.opacity = '1';
                        resendPhoneBtn.style.cursor = 'pointer';
                        resendPhoneBtn.textContent = 'Resend Code';
                    } else {
                        resendPhoneBtn.textContent = `Resend Code (${phoneResendCooldown}s)`;
                    }
                }, 1000);
            });
        }
    }

    // Phone OTP inputs
    const phoneOtpInputs = document.querySelectorAll('.phone-otp-input');
    phoneOtpInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            if (e.target.value.length > 1) {
                e.target.value = e.target.value.slice(-1);
            }
            if (e.target.value && index < phoneOtpInputs.length - 1) {
                phoneOtpInputs[index + 1].focus();
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                phoneOtpInputs[index - 1].focus();
            }
        });
    });

    const verifyPhoneBtn = document.getElementById('verifyPhoneBtn');
    if (verifyPhoneBtn) {
        verifyPhoneBtn.addEventListener('click', async () => {
            let code = Array.from(phoneOtpInputs).map(i => i.value).join('');
            if (code.length < 4) {
                verifyPhoneBtn.textContent = 'Enter 4 digits';
                verifyPhoneBtn.style.backgroundColor = '#dc3545';
                verifyPhoneBtn.style.boxShadow = '0 4px 15px rgba(220,38,38,0.3)';
                setTimeout(() => {
                    verifyPhoneBtn.textContent = 'Verify & Update';
                    verifyPhoneBtn.style.backgroundColor = '';
                    verifyPhoneBtn.style.boxShadow = '';
                }, 1500);
                return;
            }

            verifyPhoneBtn.classList.add('saving');
            verifyPhoneBtn.textContent = 'Verifying...';
            verifyPhoneBtn.disabled = true;

            try {
                const contact = window._secPhoneOtpContact;
                const response = await fetch(`${window.API_BASE}/api/verify-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contact, code })
                });
                const data = await response.json();

                if (!data.success) {
                    verifyPhoneBtn.classList.remove('saving');
                    verifyPhoneBtn.style.backgroundColor = '#dc3545';
                    verifyPhoneBtn.style.boxShadow = '0 4px 15px rgba(220,38,38,0.3)';
                    verifyPhoneBtn.textContent = data.error || 'Invalid OTP';
                    setTimeout(() => {
                        verifyPhoneBtn.style.backgroundColor = '';
                        verifyPhoneBtn.style.boxShadow = '';
                        verifyPhoneBtn.textContent = 'Verify & Update';
                    }, 2500);
                    verifyPhoneBtn.disabled = false;
                    return;
                }

                // OTP verified — now update phone
                const phoneInput = document.getElementById('secNewPhone');
                const passInput = document.getElementById('secPhonePass');
                const allUsersPhone = JSON.parse(localStorage.getItem('nd_users') || '[]');
                const newPhone = phoneInput ? phoneInput.value.trim() : '';
                const phoneTaken = allUsersPhone.find(u => u.id !== (window.loggedInUser || {}).id && u.phone && u.phone.replace(/[\s\-\(\)]/g, '') === newPhone.replace(/[\s\-\(\)]/g, ''));
                if (phoneTaken) {
                    verifyPhoneBtn.classList.remove('saving');
                    verifyPhoneBtn.style.backgroundColor = '#dc3545';
                    verifyPhoneBtn.style.boxShadow = '0 4px 15px rgba(220,38,38,0.3)';
                    verifyPhoneBtn.textContent = 'Phone already in use!';
                    setTimeout(() => {
                        verifyPhoneBtn.style.backgroundColor = '';
                        verifyPhoneBtn.style.boxShadow = '';
                        verifyPhoneBtn.textContent = 'Verify & Update';
                    }, 2500);
                    verifyPhoneBtn.disabled = false;
                    return;
                }

                if (window.loggedInUser && phoneInput && newPhone) {
                    window.loggedInUser.phone = newPhone;
                    localStorage.setItem('nd_logged_in_user', JSON.stringify(window.loggedInUser));
                    const idx = allUsersPhone.findIndex(u => u.id === window.loggedInUser.id);
                    if (idx !== -1) { allUsersPhone[idx].phone = newPhone; localStorage.setItem('nd_users', JSON.stringify(allUsersPhone)); }
                }

                verifyPhoneBtn.classList.remove('saving');
                verifyPhoneBtn.classList.add('success');
                verifyPhoneBtn.textContent = 'Phone Verified!';

                setTimeout(() => {
                    verifyPhoneBtn.classList.remove('success');
                    verifyPhoneBtn.textContent = 'Verify & Update';
                    phoneOtpInputs.forEach(i => i.value = '');
                    if (phoneInput) phoneInput.value = '';
                    if (passInput) passInput.value = '';
                    closePhoneVerifyModal();
                }, 1200);
            } catch (err) {
                if (typeof customAlert === 'function') customAlert('Network error. Is the server running?');
                verifyPhoneBtn.classList.remove('saving');
                verifyPhoneBtn.textContent = 'Verify & Update';
            } finally {
                verifyPhoneBtn.disabled = false;
            }
        });
    }



    // ========================================
    // Password Toggle Logic
    // ========================================
    const toggleIcons = document.querySelectorAll('.password-toggle-icon');
    toggleIcons.forEach(icon => {
        icon.addEventListener('click', () => {
            const input = icon.previousElementSibling;
            if (input && input.tagName === 'INPUT') {
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.add('show-pass');
                    icon.querySelector('.eye-icon').style.display = 'none';
                    icon.querySelector('.eye-slash-icon').style.display = 'block';
                } else {
                    input.type = 'password';
                    icon.classList.remove('show-pass');
                    icon.querySelector('.eye-icon').style.display = 'block';
                    icon.querySelector('.eye-slash-icon').style.display = 'none';
                }
            }
        });
    });
}
