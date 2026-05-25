/* admin/menu-buttons/financial-settings/financial-settings.js */

/**
 * Loads and displays the Financial Settings modal.
 * UI logic only: Handling direct inputs and policy selection.
 */
async function openFinancialSettings() {
    // 1. Fetch template if not already in DOM
    let modal = document.getElementById('financialSettingsModal');
    if (!modal) {
        try {
            const response = await fetch('menu-buttons/financial-settings/financial-settings.html');
            if (!response.ok) throw new Error('Could not load financial settings');
            const html = await response.text();

            const container = document.getElementById('modal-container');
            if (container) {
                const temp = document.createElement('div');
                temp.innerHTML = html;
                modal = temp.querySelector('#financialSettingsModal');
                container.appendChild(modal);

                // Add event listener to the save button
                const saveBtn = modal.querySelector('#saveFinancialSettings');
                if (saveBtn) {
                    saveBtn.addEventListener('click', () => {
                        const input = document.getElementById('payoutRateInput');
                        if (input) {
                            const newRateStr = input.value;
                            const newRate = parseFloat(newRateStr) || 2;
                            
                            const policyNewer = document.getElementById('policyNewer');
                            const isNewerOnly = policyNewer && policyNewer.classList.contains('selected');
                            
                            let products = JSON.parse(localStorage.getItem('nd_products_data') || '[]');
                            const oldRate = parseFloat(localStorage.getItem('nd_payout_rate')) || 2;

                            if (isNewerOnly) {
                                // Freeze the current global rate into all existing products that don't have one
                                products.forEach(p => {
                                    if (p.payoutRate === undefined) {
                                        p.payoutRate = oldRate;
                                    }
                                    if (p.isSpecial && p.packTypes) {
                                        if (p.packTypes.bag && p.packTypes.bag.payoutRate === undefined) p.packTypes.bag.payoutRate = oldRate;
                                        if (p.packTypes.custard && p.packTypes.custard.payoutRate === undefined) p.packTypes.custard.payoutRate = oldRate;
                                        if (p.packTypes.cup && p.packTypes.cup.payoutRate === undefined) p.packTypes.cup.payoutRate = oldRate;
                                    }
                                });
                            } else {
                                // Apply Retroactively: clear frozen rates so everything uses the new global rate
                                products.forEach(p => {
                                    delete p.payoutRate;
                                    if (p.isSpecial && p.packTypes) {
                                        if (p.packTypes.bag) delete p.packTypes.bag.payoutRate;
                                        if (p.packTypes.custard) delete p.packTypes.custard.payoutRate;
                                        if (p.packTypes.cup) delete p.packTypes.cup.payoutRate;
                                    }
                                });
                            }
                            localStorage.setItem('nd_products_data', JSON.stringify(products));
                            localStorage.setItem('nd_payout_rate', newRate);

                            const toggle = document.getElementById('payoutEnableSwitch');
                            if (toggle) {
                                localStorage.setItem('nd_payout_enabled', toggle.checked ? 'true' : 'false');
                            }

                            const urpToggle = document.getElementById('rewardPurchaseEnableSwitch');
                            if (urpToggle) {
                                const newState = urpToggle.checked ? 'true' : 'false';
                                localStorage.setItem('nd_reward_purchase_enabled', newState);
                                
                                // Dispatch local storage update event to notify user menu immediately
                                const event = new CustomEvent('local-storage-update', { detail: { key: 'nd_reward_purchase_enabled', value: newState } });
                                window.dispatchEvent(event);
                            }

                            customAlert('Financial Settings saved successfully!');

                            // Re-render both admin and user product lists so change applies immediately
                            if (typeof window.renderProductsGlobal === 'function') window.renderProductsGlobal();
                            if (typeof window.refreshProducts === 'function') window.refreshProducts();
                        }
                        closeFinancialSettings();
                    });
                }
            }
        } catch (err) {
            customAlert('System error: Failed to initialize financial module.', true);
            console.error(err);
            return;
        }
    }

    // 2. Display modal with standard transition
    if (modal) {
        // Set input value to current setting
        const input = modal.querySelector('#payoutRateInput');
        if (input) {
            input.value = localStorage.getItem('nd_payout_rate') || 2;
        }

        const toggle = modal.querySelector('#payoutEnableSwitch');
        if (toggle) {
            const enabledStr = localStorage.getItem('nd_payout_enabled');
            // Default to false if not set
            toggle.checked = (enabledStr === 'true') ? true : false;
            // Sync visual state
            const slider = toggle.nextElementSibling;
            if (slider) {
                slider.style.backgroundColor = toggle.checked ? '#8b5cf6' : '#cbd5e1';
                const knob = slider.querySelector('.knob');
                if (knob) knob.style.transform = toggle.checked ? 'translateX(22px)' : 'translateX(0)';
            }
        }

        const urpToggle = modal.querySelector('#rewardPurchaseEnableSwitch');
        if (urpToggle) {
            const urpEnabled = localStorage.getItem('nd_reward_purchase_enabled') === 'true';
            urpToggle.checked = urpEnabled;
            // Sync visual state
            const slider = urpToggle.nextElementSibling;
            if (slider) {
                slider.style.backgroundColor = urpEnabled ? '#8b5cf6' : '#cbd5e1';
                const knob = slider.querySelector('.knob');
                if (knob) knob.style.transform = urpEnabled ? 'translateX(22px)' : 'translateX(0)';
            }
        }

        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);




    }
}

/**
 * Closes the modal with a smooth opacity reversal.
 */
function closeFinancialSettings() {
    const modal = document.getElementById('financialSettingsModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    }
}

/**
 * UI Toggle: Select strategy without business logic.
 */
function selectStrategy(strategy) {
    const policyNewer = document.getElementById('policyNewer');
    const policyAll = document.getElementById('policyAll');

    if (policyNewer && policyAll) {
        if (strategy === 'newer') {
            policyNewer.classList.add('selected');
            policyAll.classList.remove('selected');
        } else if (strategy === 'all') {
            policyAll.classList.add('selected');
            policyNewer.classList.remove('selected');
        }
    }
}




