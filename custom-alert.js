(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        .nd-shop-custom-alert-overlay {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px);
            display: flex; align-items: center; justify-content: center;
            z-index: 9999999; opacity: 0; visibility: hidden;
            transition: all 0.3s ease;
        }
        .nd-shop-custom-alert-overlay.show { opacity: 1; visibility: visible; }
        .nd-shop-custom-alert-box {
            background: #fff; width: 90%; max-width: 400px;
            border-radius: 24px; padding: 28px 24px; text-align: center;
            transform: scale(0.9); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        [data-theme="dark"] .nd-shop-custom-alert-box { background: #1e1e1e; color: #e4e4e4; }
        .nd-shop-custom-alert-overlay.show .nd-shop-custom-alert-box { transform: scale(1); }
        .nd-shop-custom-alert-icon {
            width: 64px; height: 64px; background: #edf1f7; color: #8b5cf6;
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
            margin: 0 auto 20px;
        }
        [data-theme="dark"] .nd-shop-custom-alert-icon { background: #1a2633; }
        .nd-shop-custom-alert-icon.warning { background: #fee2e2; color: #dc3545; }
        [data-theme="dark"] .nd-shop-custom-alert-icon.warning { background: #2d1215; }
        .nd-shop-custom-alert-message {
            font-size: 1.05rem; color: #333; line-height: 1.5; margin-bottom: 24px;
            white-space: pre-wrap; font-weight: 500;
        }
        [data-theme="dark"] .nd-shop-custom-alert-message { color: #c0c0c0; }
        .nd-shop-custom-alert-actions { display: flex; gap: 12px; }
        .nd-shop-custom-alert-btn {
            flex: 1; padding: 14px; border: none; border-radius: 14px;
            font-size: 1rem; font-weight: 700; cursor: pointer; transition: 0.2s; font-family: inherit;
        }
        .nd-shop-custom-alert-btn:active { transform: scale(0.96); }
        .nd-shop-custom-alert-btn.cancel { background: #f1f5f9; color: #64748b; }
        .nd-shop-custom-alert-btn.cancel:hover { background: #e2e8f0; }
        [data-theme="dark"] .nd-shop-custom-alert-btn.cancel { background: #2d2d2d; color: #a0aec0; }
        .nd-shop-custom-alert-btn.confirm { background: #8b5cf6; color: white; }
        .nd-shop-custom-alert-btn.confirm:hover { background: #2c3e50; }
        .nd-shop-custom-alert-btn.danger { background: #dc3545; color: white; }
        .nd-shop-custom-alert-btn.danger:hover { background: #b91c1c; }
    `;
    document.head.appendChild(style);

    window.customAlert = function(message, isWarning = false) {
        return new Promise((resolve) => {
            createModal(message, isWarning, false, resolve);
        });
    };

    window.customConfirm = function(message, isWarning = false) {
        return new Promise((resolve) => {
            createModal(message, isWarning, true, resolve);
        });
    };

    window.customPrompt = function(message, type = 'text') {
        return new Promise((resolve) => {
            createModal(message, false, false, resolve, true, type);
        });
    };

    // Override native
    window.alert = function(msg) {
        customAlert(msg);
    };

    function createModal(message, isWarning, isConfirm, resolvePromise, isPrompt = false, inputType = 'text') {
        const overlay = document.createElement('div');
        overlay.className = 'nd-shop-custom-alert-overlay';
        
        let iconSvg = '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
        if (isWarning || message.toLowerCase().includes('warning') || message.toLowerCase().includes('delete') || message.toLowerCase().includes('wipe')) {
            isWarning = true;
            iconSvg = '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
        }

        const iconClass = isWarning ? 'nd-shop-custom-alert-icon warning' : 'nd-shop-custom-alert-icon';
        const confirmClass = isWarning ? 'nd-shop-custom-alert-btn danger' : 'nd-shop-custom-alert-btn confirm';

        let inputHtml = '';
        if (isPrompt) {
            const isPinType = (inputType === 'password' || inputType === 'pin');
            const realType = isPinType ? 'tel' : inputType;
            const extraAttrs = isPinType 
                ? 'inputmode="numeric" maxlength="4" pattern="[0-9]*" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-form-type="other" data-lpignore="true" aria-autocomplete="none" name="nd-shop-pin-' + Date.now() + '"'
                : 'autocomplete="off"';
            const maskStyle = isPinType ? '-webkit-text-security: disc; text-security: disc;' : '';
            inputHtml = `
                <input type="${realType}" id="ndiAlertInput" ${extraAttrs} style="
                    width: 100%; padding: 14px; margin-bottom: 24px; border-radius: 12px;
                    border: 2px solid #e2e8f0; font-size: 1.1rem; text-align: center;
                    outline: none; font-weight: 700; color: #1e293b; transition: 0.2s; ${maskStyle}" 
                    placeholder="Enter 4-digit PIN...">
            `;
            // Add focus border dynamically since raw inline CSS lacks pseudo-classes
        }

        let buttonsHtml = '';
        if (isConfirm || isPrompt) {
            buttonsHtml = `
                <button class="nd-shop-custom-alert-btn cancel" id="ndiAlertCancel">Cancel</button>
                <button class="${confirmClass}" id="ndiAlertConfirm">Confirm</button>
            `;
        } else {
            buttonsHtml = `
                <button class="${confirmClass}" id="ndiAlertConfirm" style="width: 100%;">OK</button>
            `;
        }

        overlay.innerHTML = `
            <div class="nd-shop-custom-alert-box">
                <div class="${iconClass}">${iconSvg}</div>
                <div class="nd-shop-custom-alert-message">${message}</div>
                ${inputHtml}
                <div class="nd-shop-custom-alert-actions">
                    ${buttonsHtml}
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        
        const inputEl = overlay.querySelector('#ndiAlertInput');
        if(inputEl) {
            inputEl.addEventListener('focus', () => inputEl.style.borderColor = '#8b5cf6');
            inputEl.addEventListener('blur', () => inputEl.style.borderColor = '#e2e8f0');
            inputEl.focus();
        }

        // Animate in
        setTimeout(() => overlay.classList.add('show'), 10);

        const closeAndResolve = (val) => {
            overlay.classList.remove('show');
            setTimeout(() => {
                overlay.remove();
                resolvePromise(val);
            }, 300);
        };

        const confirmBtn = overlay.querySelector('#ndiAlertConfirm');
        if (confirmBtn) confirmBtn.addEventListener('click', () => {
            if (isPrompt) closeAndResolve(inputEl ? inputEl.value : null);
            else closeAndResolve(true);
        });

        const cancelBtn = overlay.querySelector('#ndiAlertCancel');
        if (cancelBtn) cancelBtn.addEventListener('click', () => closeAndResolve(isPrompt ? null : false));
        
        if (inputEl) {
            inputEl.addEventListener('keyup', (e) => {
                if (e.key === 'Enter' && inputEl.value.trim() !== '') confirmBtn.click();
            });
        }
    }
})();



