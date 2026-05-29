document.addEventListener('DOMContentLoaded', () => {
    // Handle password visibility toggling across auth pages
    const toggleButtons = document.querySelectorAll('.password-toggle');

    toggleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const passwordInput = document.getElementById(targetId);
            const eyeOpen = btn.querySelector('.eye-open');
            const eyeClosed = btn.querySelector('.eye-closed');

            if (passwordInput && passwordInput.type === 'password') {
                passwordInput.type = 'text';
                eyeOpen.classList.add('hidden');
                eyeClosed.classList.remove('hidden');
            } else if (passwordInput) {
                passwordInput.type = 'password';
                eyeClosed.classList.add('hidden');
                eyeOpen.classList.remove('hidden');
            }
        });
    });

    // Registration & Login Handlers
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        // ======== Auto-detect Email vs Phone ========
        const identifierInput = document.getElementById('loginIdentifier');
        const identifierIcon = document.getElementById('loginIdentifierIcon');

        const emailSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>';
        const phoneSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';

        function isPhone(val) {
            // It's a phone number if it's only digits, spaces, dashes, plus sign and starts like a phone
            const cleaned = val.replace(/[\s\-\(\)]/g, '');
            return /^\+?\d{7,}$/.test(cleaned);
        }

        // Dynamically swap icon as user types
        if (identifierInput && identifierIcon) {
            identifierInput.addEventListener('input', () => {
                const val = identifierInput.value.trim();
                if (val && isPhone(val)) {
                    identifierIcon.innerHTML = phoneSvg;
                } else {
                    identifierIcon.innerHTML = emailSvg;
                }
            });
        }

        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = loginForm.querySelector('.auth-submit-btn');
            const password = document.getElementById('loginPassword').value;
            const identifier = identifierInput.value.trim();

            if (!identifier) {
                customAlert('Please enter your email or phone number', true);
                return;
            }

            // Show a spinner
            const originalText = btn.innerHTML;
            btn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin-icon" style="animation: spin 1s linear infinite;">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                <span>Authenticating...</span>
            `;

            setTimeout(async () => {
                try {
                    let searchIdentifier = identifier;
                    // Check if it's a phone number and normalize it
                    if (/^[\d\s\-\(\)\+]+$/.test(identifier)) {
                        let cleaned = identifier.replace(/[\s\-\(\)]/g, '');
                        if (cleaned.length === 11 && cleaned.startsWith('0')) {
                            searchIdentifier = '+234' + cleaned.substring(1);
                        } else if (cleaned.startsWith('+234')) {
                            searchIdentifier = cleaned;
                        }
                    }

                    const response = await fetch(`${window.API_BASE}/api/login`, {
                        method: 'POST',
                        headers: {
                    'Authorization': 'Bearer ' + (localStorage.getItem('nd_token') || ''), 'Content-Type': 'application/json' },
                        body: JSON.stringify({ identifier: searchIdentifier, password })
                    });
                    const data = await response.json();

                    if (data.success) {
                        localStorage.setItem('nd_logged_in_user', JSON.stringify(data.user));
                        // Record last seen for Customer Insights
                        const lsData = JSON.parse(localStorage.getItem('nd_user_last_seen') || '{}');
                        lsData[data.user.id] = new Date().toISOString();
                        localStorage.setItem('nd_user_last_seen', JSON.stringify(lsData));
                        
                        btn.style.backgroundColor = '#6366f1';
                        btn.style.boxShadow = '0 8px 20px rgba(27, 38, 59, 0.25)';
                        btn.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="20 6 9 17 4 12"/>
                            </svg>
                            <span>Welcome Back!</span>
                        `;
                        setTimeout(() => window.location.href = '../index.html', 1000);
                    } else {
                        btn.style.backgroundColor = '#dc3545';
                        btn.style.boxShadow = '0 8px 20px rgba(220, 53, 69, 0.25)';
                        btn.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                            <span>${data.error || 'Invalid Credentials'}</span>
                        `;
                        setTimeout(() => {
                            btn.style.backgroundColor = '';
                            btn.style.boxShadow = '';
                            btn.innerHTML = originalText;
                        }, 2000);
                    }
                } catch (err) {
                    console.error('Login error:', err);
                    btn.style.backgroundColor = '#dc3545';
                    btn.style.boxShadow = '0 8px 20px rgba(220, 53, 69, 0.25)';
                    btn.innerHTML = `<span>Network Error</span>`;
                    setTimeout(() => {
                        btn.style.backgroundColor = '';
                        btn.style.boxShadow = '';
                        btn.innerHTML = originalText;
                    }, 2000);
                }
            }, 1000);
        });
    }

    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = signupForm.querySelector('#btnNext');
            const originalText = btn.innerHTML;

            // Simple validation simulation
            const pass = document.getElementById('signupPassword').value;
            const confirmPass = document.getElementById('signupConfirmPass').value;
            if (pass !== confirmPass) {
                customAlert("Passwords do not match!", true);
                return;
            }

            // Show a spinner
            btn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin-icon" style="animation: spin 1s linear infinite;">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                <span>Processing...</span>
            `;

            setTimeout(() => {
                btn.style.backgroundColor = '#6366f1';
                btn.style.boxShadow = '0 8px 20px rgba(27, 38, 59, 0.25)';
                btn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span>Success</span>
                `;

                // Show OTP Method Selection Modal
                setTimeout(() => {
                    const otpModal = document.getElementById('otpMethodModal');
                    if (otpModal) {
                        const btnSend = document.getElementById('btnSendOtp');
                        if (btnSend) {
                            btnSend.innerHTML = `<span>Send Code</span>`;
                        }
                        otpModal.classList.add('show');
                    }
                }, 1000);
            }, 1500);
        });
    }

    // Optional subtle form submission effect - removed general to use specific above
    // const forms = document.querySelectorAll('.auth-form');
    // Handled in specific form listeners natively now

    // ==========================================
    // Signup Wizard Logic
    // ==========================================
    const signupTrack = document.getElementById('signupTrack');
    if (signupTrack) {
        let currentStep = 0;
        const totalSteps = 4;

        const steps = document.querySelectorAll('.signup-step');
        const dots = document.querySelectorAll('.progress-step');
        const btnNext = document.getElementById('btnNext');
        const btnBack = document.getElementById('btnBack');
        const nextText = btnNext.querySelector('span');

        // Initially show first step
        steps[0].classList.add('active-step');

        function updateWizard() {
            // Update CSS variable to slide the track
            signupTrack.style.setProperty('--current-step', currentStep);

            // Update active step classes (for opacity/pointer-events)
            steps.forEach((step, index) => {
                if (index === currentStep) {
                    step.classList.add('active-step');
                } else {
                    step.classList.remove('active-step');
                }
            });

            // Update progress dots
            dots.forEach((dot, index) => {
                if (index <= currentStep) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });

            // Update Back button visibility
            if (currentStep > 0) {
                btnBack.classList.remove('hidden');
            } else {
                btnBack.classList.add('hidden');
            }

            // Update Next button text based on step
            if (currentStep === totalSteps - 1) {
                nextText.textContent = 'Sign Up';
                // Remove arrow, maybe change to check or leave text only
            } else {
                nextText.textContent = 'Next';
            }
        }

        btnNext.addEventListener('click', (e) => {
            if (currentStep < totalSteps - 1) {
                // Not the last step -> acting as a "Next" button
                e.preventDefault(); // Don't submit the form yet

                // Simple form validation for step 2 (Contact)
                if (currentStep === 1) {
                    const emailInput = document.getElementById('email');
                    const phoneInput = document.getElementById('phone');
                    
                    if (emailInput && phoneInput) {
                        const emailVal = emailInput.value.trim();
                        let phoneVal = phoneInput.value.trim();

                        if (!emailVal.includes('@') || !emailVal.includes('.')) {
                            if (typeof customAlert === 'function') customAlert('Please enter a valid email address containing "@" and "."', true);
                            else alert('Please enter a valid email address containing "@" and "."');
                            return;
                        }
                        
                        phoneVal = phoneVal.replace(/[\s\-\(\)]/g, '');
                        if (!/^\d{11}$/.test(phoneVal) || !phoneVal.startsWith('0')) {
                            if (typeof customAlert === 'function') customAlert('Phone number must be exactly 11 digits and start with 0 (e.g. 08123456789).', true);
                            else alert('Phone number must be exactly 11 digits and start with 0 (e.g. 08123456789).');
                            return;
                        }
                    }
                }

                currentStep++;
                updateWizard();
            } else {
                // It is the last step -> manually trigger form submission
                e.preventDefault();
                const form = btnNext.closest('.auth-form');
                if (form) {
                    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                }
            }
        });

        btnBack.addEventListener('click', () => {
            if (currentStep > 0) {
                currentStep--;
                updateWizard();
            }
        });

        // ==========================================
        // Auth State & LGA Modal Setup 
        // ==========================================
        const stateWrapper = document.getElementById('suStateWrapper');
        const stateToggle = document.getElementById('suStateToggle');
        const stateText = document.getElementById('suStateText');

        const lgaWrapper = document.getElementById('suLgaWrapper');
        const lgaToggle = document.getElementById('suLgaToggle');
        const lgaText = document.getElementById('suLgaText');

        const selectionModal = document.getElementById('selectionModal');
        const selectionModalTitle = document.getElementById('selectionModalTitle');
        const selectionModalBody = document.getElementById('selectionModalBody');
        const selectionModalClose = document.getElementById('selectionModalClose');

        let selectedState = '';
        let selectedLGA = '';

        if (stateWrapper && lgaWrapper && selectionModal && typeof naijaData !== 'undefined') {

            function buildStateOptions() {
                let frag = document.createDocumentFragment();
                const states = Object.keys(naijaData).sort();
                states.forEach(state => {
                    const opt = document.createElement('div');
                    opt.className = 'auth-dropdown-option' + (state === selectedState ? ' active' : '');
                    opt.innerHTML = state + '<span class="auth-dropdown-check"></span>';
                    opt.addEventListener('click', (e) => {
                        e.stopPropagation();
                        selectedState = state;
                        stateText.textContent = state;
                        selectionModal.classList.remove('show');

                        // Reset and Enable LGA dropdown
                        lgaWrapper.classList.remove('disabled');
                        selectedLGA = '';
                        lgaText.textContent = 'Select LGA';
                    });
                    frag.appendChild(opt);
                });
                return frag;
            }

            function buildLGAOptions(state) {
                let frag = document.createDocumentFragment();
                if (!naijaData[state]) return frag;

                [...naijaData[state]].sort().forEach(lga => {
                    const opt = document.createElement('div');
                    opt.className = 'auth-dropdown-option' + (lga === selectedLGA ? ' active' : '');
                    opt.innerHTML = lga + '<span class="auth-dropdown-check"></span>';
                    opt.addEventListener('click', (e) => {
                        e.stopPropagation();
                        selectedLGA = lga;
                        lgaText.textContent = lga;
                        selectionModal.classList.remove('show');
                    });
                    frag.appendChild(opt);
                });
                return frag;
            }

            stateToggle.addEventListener('click', (e) => {
                e.preventDefault();
                selectionModalTitle.textContent = 'Select State';
                selectionModalBody.innerHTML = '';
                selectionModalBody.appendChild(buildStateOptions());
                selectionModal.classList.add('show');
            });

            lgaToggle.addEventListener('click', (e) => {
                e.preventDefault();
                selectionModalTitle.textContent = 'Select LGA';
                selectionModalBody.innerHTML = '';

                if (lgaWrapper.classList.contains('disabled') || !selectedState) {
                    selectionModalBody.innerHTML = '<div style="padding: 20px; text-align: center; color: #a0aec0; font-size: 0.95rem;">Please Select a State first.</div>';
                } else {
                    selectionModalBody.appendChild(buildLGAOptions(selectedState));
                }

                selectionModal.classList.add('show');
            });

            if (selectionModalClose) {
                selectionModalClose.addEventListener('click', () => {
                    selectionModal.classList.remove('show');
                });
            }




        }
    }

    // ==========================================
    // OTP Verification Logic
    // ==========================================

    const otpModal = document.getElementById('otpMethodModal');
    const btnSendOtp = document.getElementById('btnSendOtp');
    if (otpModal && btnSendOtp) {
        btnSendOtp.addEventListener('click', async () => {
            const selectedMethod = document.querySelector('input[name="modalVerifyMethod"]:checked').value;
            
            btnSendOtp.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin-icon" style="animation: spin 1s linear infinite;">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                <span>Sending...</span>
            `;

            const email = document.getElementById('email').value.trim();
            let phone = document.getElementById('phone').value.trim();
            let cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
            if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
                phone = '+234' + cleanPhone.substring(1);
            }
            const contact = selectedMethod === 'sms' ? phone : email;
            const name = document.getElementById('firstName').value.trim();

            try {
                const response = await fetch(`${window.API_BASE}/api/send-otp`, {
                    method: 'POST',
                    headers: {
                    'Authorization': 'Bearer ' + (localStorage.getItem('nd_token') || ''), 'Content-Type': 'application/json' },
                    body: JSON.stringify({ method: selectedMethod, contact, name })
                });

                const data = await response.json();

                if (data.success) {
                    otpModal.classList.remove('show');
                    
                    const verifyRadios = document.querySelectorAll('.verify-method-radio');
                    verifyRadios.forEach(r => {
                        if (r.value === selectedMethod) r.checked = true;
                    });
                    
                    if (typeof window.toggleVerifyMethod === 'function') {
                        window.toggleVerifyMethod(selectedMethod);
                    }

                    const signupContainer = document.querySelector('.signup-container');
                    const verifyContainer = document.getElementById('verifyContainer');
                    if (signupContainer && verifyContainer) {
                        signupContainer.classList.add('hidden');
                        verifyContainer.classList.remove('hidden');
                        setTimeout(() => {
                            const firstOtp = document.querySelector('.auth-otp-input');
                            if (firstOtp) firstOtp.focus();
                        }, 300);
                    }
                } else {
                    alert('Error sending OTP: ' + data.error);
                    btnSendOtp.innerHTML = `<span>Send Code</span>`;
                }
            } catch (err) {
                console.error(err);
                alert('Network error while sending OTP.');
                btnSendOtp.innerHTML = `<span>Send Code</span>`;
            }
        });

        // Close button
        const closeOtpModal = document.getElementById('otpMethodModalClose');
        if (closeOtpModal) {
            closeOtpModal.addEventListener('click', () => {
                otpModal.classList.remove('show');
                // restore submit button in signup wizard if user cancelled
                const btn = document.querySelector('#signupForm #btnNext');
                if (btn) {
                    btn.innerHTML = `
                        <span>Sign Up</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <polyline points="12 5 19 12 12 19" />
                        </svg>
                    `;
                    btn.style.backgroundColor = '';
                    btn.style.boxShadow = '';
                }
            });
        }
    }

    window.toggleVerifyMethod = function(method) {
        const subtitle = document.getElementById('verifySubtitle');
        const iconSvg = document.getElementById('verifyIconSvg');
        
        if (method === 'sms') {
            if (subtitle) subtitle.textContent = 'A 4-digit code has been sent to your phone. Please enter it below.';
            if (iconSvg) {
                iconSvg.innerHTML = '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>';
            }
        } else {
            if (subtitle) subtitle.textContent = 'A 4-digit code has been sent to your email. Please enter it below.';
            if (iconSvg) {
                iconSvg.innerHTML = '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline>';
            }
        }
    };

    const otpInputs = document.querySelectorAll('.auth-otp-input');
    otpInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            // Keep only the last typed character
            if (e.target.value.length > 1) {
                e.target.value = e.target.value.slice(-1);
            }
            // Move to next input
            if (e.target.value && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
        });

        // Allow backspace to move to previous
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                otpInputs[index - 1].focus();
            }
        });
    });

    const verifyBtn = document.getElementById('btnVerifySignup');
    const resendSignupBtn = document.getElementById('btnResendSignup');

    let signupResendCooldown = 0;
    if (resendSignupBtn) {
        resendSignupBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (signupResendCooldown > 0) return;

            const method = document.querySelector('input[name="verifyMethod"]:checked').value;
            const email = document.getElementById('email').value.trim();
            let phone = document.getElementById('phone').value.trim();
            let cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
            if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
                phone = '+234' + cleanPhone.substring(1);
            }
            const contact = method === 'sms' ? phone : email;
            const name = document.getElementById('firstName').value.trim();

            resendSignupBtn.textContent = `Sending...`;
            resendSignupBtn.style.opacity = '0.5';
            resendSignupBtn.style.cursor = 'wait';

            try {
                const response = await fetch(`${window.API_BASE}/api/send-otp`, {
                    method: 'POST',
                    headers: {
                    'Authorization': 'Bearer ' + (localStorage.getItem('nd_token') || ''), 'Content-Type': 'application/json' },
                    body: JSON.stringify({ method, contact, name })
                });

                const data = await response.json();

                if (data.success) {
                    const msg = method === 'sms' 
                        ? `A new code has been sent to your phone (${contact}).` 
                        : `A new code has been sent to your email (${contact}).`;
                    
                    if (typeof customAlert === 'function') {
                        customAlert(msg);
                    } else {
                        alert(msg);
                    }

                    // Start 60s Cooldown
                    signupResendCooldown = 60;
                    resendSignupBtn.style.cursor = 'not-allowed';

                    const timer = setInterval(() => {
                        signupResendCooldown--;
                        if (signupResendCooldown <= 0) {
                            clearInterval(timer);
                            resendSignupBtn.style.opacity = '1';
                            resendSignupBtn.style.cursor = 'pointer';
                            resendSignupBtn.textContent = 'Resend Code';
                        } else {
                            resendSignupBtn.textContent = `Resend Code (${signupResendCooldown}s)`;
                        }
                    }, 1000);
                } else {
                    alert('Error resending OTP: ' + data.error);
                    resendSignupBtn.textContent = 'Resend Code';
                    resendSignupBtn.style.opacity = '1';
                    resendSignupBtn.style.cursor = 'pointer';
                }
            } catch (err) {
                console.error(err);
                alert('Network error while resending OTP.');
                resendSignupBtn.textContent = 'Resend Code';
                resendSignupBtn.style.opacity = '1';
                resendSignupBtn.style.cursor = 'pointer';
            }
        });
    }

    if (verifyBtn) {
        verifyBtn.addEventListener('click', async () => {
            let code = Array.from(otpInputs).map(i => i.value).join('');
            if (code.length < 4) {
                const originalText = verifyBtn.innerHTML;
                verifyBtn.innerHTML = `<span>Enter 4 digits</span>`;
                verifyBtn.style.backgroundColor = '#dc3545';
                verifyBtn.style.boxShadow = '0 8px 20px rgba(220, 53, 69, 0.25)';
                setTimeout(() => {
                    verifyBtn.innerHTML = originalText;
                    verifyBtn.style.backgroundColor = '';
                    verifyBtn.style.boxShadow = '';
                }, 1500);
                return;
            }

            verifyBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin-icon" style="animation: spin 1s linear infinite;">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                <span>Verifying...</span>
            `;

            const method = document.querySelector('input[name="verifyMethod"]:checked').value;
            const email = document.getElementById('email').value.trim();
            let phone = document.getElementById('phone').value.trim();
            let cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
            if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
                phone = '+234' + cleanPhone.substring(1);
            }
            const contact = method === 'sms' ? phone : email;

            try {
                const response = await fetch(`${window.API_BASE}/api/verify-otp`, {
                    method: 'POST',
                    headers: {
                    'Authorization': 'Bearer ' + (localStorage.getItem('nd_token') || ''), 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contact, code })
                });

                const data = await response.json();

                if (data.success) {
                    // Save User to Database via /api/register
                    const newIdPrefix = "nd";
                    const newIdNum = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
                    const newUserId = newIdPrefix + newIdNum;

                    const formatName = (str) => {
                        if (!str) return '';
                        return str.split(' ')
                            .map(word => word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : '')
                            .join(' ');
                    };

                    const firstName = formatName(document.getElementById('firstName').value.trim());
                    const middleNameInput = document.getElementById('middleName');
                    const middleName = middleNameInput ? formatName(middleNameInput.value.trim()) : '';
                    const lastName = formatName(document.getElementById('lastName').value.trim());
                    const pass = document.getElementById('signupPassword').value;

                    const addressInput = document.getElementById('address');
                    const address = addressInput ? addressInput.value.trim() : '';
                    const stateEl = document.getElementById('suStateText');
                    const state = stateEl && stateEl.textContent !== 'Select State' ? stateEl.textContent.trim() : '';
                    const lgaEl = document.getElementById('suLgaText');
                    const lga = lgaEl && lgaEl.textContent !== 'Select LGA' ? lgaEl.textContent.trim() : '';

                    let fullNameParts = [firstName];
                    if (middleName) fullNameParts.push(middleName);
                    fullNameParts.push(lastName);
                    const fullName = fullNameParts.join(' ');

                    const newUser = {
                        id: newUserId,
                        name: fullName,
                        firstName: firstName,
                        middleName: middleName,
                        lastName: lastName,
                        email: email,
                        phone: phone,
                        password: pass,
                        address: address,
                        state: state,
                        lga: lga
                    };

                    try {
                        const regResponse = await fetch(`${window.API_BASE}/api/register`, {
                            method: 'POST',
                            headers: {
                    'Authorization': 'Bearer ' + (localStorage.getItem('nd_token') || ''), 'Content-Type': 'application/json' },
                            body: JSON.stringify(newUser)
                        });
                        const regData = await regResponse.json();
                        
                        if (regData.success) {
                            verifyBtn.style.backgroundColor = '#6366f1';
                            verifyBtn.style.boxShadow = '0 8px 20px rgba(27, 38, 59, 0.25)';
                            verifyBtn.innerHTML = `
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="20 6 9 17 4 12"/>
                                </svg>
                                <span>Account Verified!</span>
                            `;

                            // Auto-login
                            const { password: _, ...safeUser } = newUser;
                            safeUser.joinDate = new Date().toISOString();
                            localStorage.setItem('nd_logged_in_user', JSON.stringify(safeUser));
                            
                            const lsData = JSON.parse(localStorage.getItem('nd_user_last_seen') || '{}');
                            lsData[safeUser.id] = new Date().toISOString();
                            localStorage.setItem('nd_user_last_seen', JSON.stringify(lsData));

                            setTimeout(() => {
                                window.location.href = '../index.html';
                            }, 1200);
                        } else {
                            verifyBtn.innerHTML = `<span>${regData.error || 'Failed to register'}</span>`;
                            verifyBtn.style.backgroundColor = '#dc3545';
                            verifyBtn.style.boxShadow = '0 8px 20px rgba(220, 53, 69, 0.25)';
                            setTimeout(() => {
                                verifyBtn.innerHTML = `<span>Verify Account</span>`;
                                verifyBtn.style.backgroundColor = '';
                                verifyBtn.style.boxShadow = '';
                            }, 2500);
                        }
                    } catch (err) {
                        console.error('Registration error:', err);
                        verifyBtn.innerHTML = `<span>Network Error</span>`;
                        verifyBtn.style.backgroundColor = '#dc3545';
                        verifyBtn.style.boxShadow = '0 8px 20px rgba(220, 53, 69, 0.25)';
                        setTimeout(() => {
                            verifyBtn.innerHTML = `<span>Verify Account</span>`;
                            verifyBtn.style.backgroundColor = '';
                            verifyBtn.style.boxShadow = '';
                        }, 2500);
                    }
                } else {
                    verifyBtn.innerHTML = `<span>${data.error || 'Invalid OTP'}</span>`;
                    verifyBtn.style.backgroundColor = '#dc3545';
                    verifyBtn.style.boxShadow = '0 8px 20px rgba(220, 53, 69, 0.25)';
                    setTimeout(() => {
                        verifyBtn.innerHTML = `<span>Verify Account</span>`;
                        verifyBtn.style.backgroundColor = '';
                        verifyBtn.style.boxShadow = '';
                    }, 2500);
                }
            } catch (err) {
                console.error(err);
                verifyBtn.innerHTML = `<span>Network Error</span>`;
                verifyBtn.style.backgroundColor = '#dc3545';
                verifyBtn.style.boxShadow = '0 8px 20px rgba(220, 53, 69, 0.25)';
                setTimeout(() => {
                    verifyBtn.innerHTML = `<span>Verify Account</span>`;
                    verifyBtn.style.backgroundColor = '';
                    verifyBtn.style.boxShadow = '';
                }, 2500);
            }
        });
    }
});



