// === Purchase with Payout Module ===
let ppCurrentUser = null;
let ppUserPayoutBalance = 0;
let ppBasketItems = [];
let ppCurrentCategory = 'all';

function openPayoutPurchaseModal() {
    let modal = document.getElementById('payoutPurchaseModal');
    if (!modal) {
        fetch('menu-buttons/payout-purchase/payout-purchase.html')
            .then(res => res.text())
            .then(html => {
                const temp = document.createElement('div');
                temp.innerHTML = html;
                modal = temp.querySelector('#payoutPurchaseModal');
                document.getElementById('modal-container').appendChild(modal);
                _initPayoutPurchaseLogic(modal);
                _showPayoutPurchaseModal(modal);
            })
            .catch(err => {
                console.error("Failed to load payout purchase modal", err);
                if (typeof customAlert === 'function') customAlert("Failed to load module.");
            });
    } else {
        _resetPayoutPurchaseForm(modal);
        _showPayoutPurchaseModal(modal);
    }
}

function _showPayoutPurchaseModal(modal) {
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('show');
        document.body.classList.add('modal-open');
    }, 10);
}

function closePayoutPurchaseModal() {
    const modal = document.getElementById('payoutPurchaseModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            if (!document.querySelector('.admin-modal-overlay.show')) {
                document.body.classList.remove('modal-open');
            }
        }, 300);
    }
    if (typeof window.clearAdminModalPersistence === 'function') {
        window.clearAdminModalPersistence();
    }
}

function _initPayoutPurchaseLogic(modal) {
    if (typeof initPPToggles === 'function') initPPToggles();
    const verifyBtn = modal.querySelector('#ppVerifyBtn');
    const userIdInput = modal.querySelector('#ppUserId');
    const viewUserBtn = modal.querySelector('#ppViewUserInfoBtn');

    // Verify user
    if (verifyBtn && userIdInput) {
        verifyBtn.addEventListener('click', () => {
            _verifyPPUser(userIdInput.value.trim());
        });
        userIdInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') _verifyPPUser(userIdInput.value.trim());
        });
    }

    // View user profile
    if (viewUserBtn) {
        viewUserBtn.addEventListener('click', () => {
            if (ppCurrentUser && typeof openUserDetailsModal === 'function') {
                openUserDetailsModal(ppCurrentUser.id);
            }
        });
    }

    // === TABS & FORMS ===
    const ppExistingItemForm = modal.querySelector('#ppExistingItemForm');
    const ppSpecialItemForm = modal.querySelector('#ppSpecialItemForm');
    const ppCustomItemForm = modal.querySelector('#ppCustomItemForm');
    const ppFlexItemForm = modal.querySelector('#ppFlexItemForm');

    const ppItemDropdownWrapper = modal.querySelector('#ppItemDropdownWrapper');
    const ppItemDropdownTrigger = modal.querySelector('#ppItemDropdownTrigger');
    const ppItemDropdownMenu = modal.querySelector('#ppItemDropdownMenu');
    const ppHiddenItemInput = modal.querySelector('#ppExistingItemSelect');
    const ppExistingPrice = modal.querySelector('#ppExistingItemPrice');

    const ppSpecDropdownWrapper = modal.querySelector('#ppSpecDropdownWrapper');
    const ppSpecDropdownTrigger = modal.querySelector('#ppSpecDropdownTrigger');
    const ppSpecDropdownMenu = modal.querySelector('#ppSpecDropdownMenu');
    const ppSpecItemSelect = modal.querySelector('#ppSpecItemSelect');
    const ppSpecVariantContainer = modal.querySelector('#ppSpecVariantContainer');
    const ppSpecVariantBagPrice = modal.querySelector('#ppSpecVariantBagPrice');
    const ppSpecVariantCustardPrice = modal.querySelector('#ppSpecVariantCustardPrice');
    const ppSpecVariantCupPrice = modal.querySelector('#ppSpecVariantCupPrice');

    const ppCustomDropdownWrapper = modal.querySelector('#ppCustomDropdownWrapper');
    const ppCustomDropdownTrigger = modal.querySelector('#ppCustomDropdownTrigger');
    const ppCustomDropdownMenu = modal.querySelector('#ppCustomDropdownMenu');
    const ppCustomItemSelect = modal.querySelector('#ppCustomItemSelect');
    const ppCustomItemPrice = modal.querySelector('#ppCustomItemPrice');

    const ppFlexDropdownWrapper = modal.querySelector('#ppFlexDropdownWrapper');
    const ppFlexDropdownTrigger = modal.querySelector('#ppFlexDropdownTrigger');
    const ppFlexDropdownMenu = modal.querySelector('#ppFlexDropdownMenu');
    const ppFlexItemSelect = modal.querySelector('#ppFlexItemSelect');
    const ppFlexVariantContainer = modal.querySelector('#ppFlexVariantContainer');
    const ppFlexVariantC1Price = modal.querySelector('#ppFlexVariantC1Price');
    const ppFlexVariantC2Price = modal.querySelector('#ppFlexVariantC2Price');
    const ppFlexCustomPriceContainer = modal.querySelector('#ppFlexCustomPriceContainer');
    const ppFlexItemPrice = modal.querySelector('#ppFlexItemPrice');

    // Visual feedback for Special Variant selection
    modal.querySelectorAll('.pp-spec-variant-label').forEach(label => {
        label.addEventListener('click', function() {
            modal.querySelectorAll('.pp-spec-variant-label').forEach(l => {
                l.style.borderColor = '#bfdbfe';
                l.style.borderWidth = '1px';
                l.style.background = 'white';
            });
            this.style.borderColor = '#8b5cf6';
            this.style.borderWidth = '2px';
            this.style.background = '#f0f4f8';
            
            const radio = this.querySelector('input[type="radio"]');
            if(radio) radio.checked = true;
        });
    });

    // Visual feedback for Flex Variant selection
    modal.querySelectorAll('.pp-flex-variant-label').forEach(label => {
        label.addEventListener('click', function() {
            modal.querySelectorAll('.pp-flex-variant-label').forEach(l => {
                l.style.borderColor = '#bfdbfe';
                l.style.borderWidth = '1px';
                l.style.background = 'white';
            });
            this.style.borderColor = '#8b5cf6';
            this.style.borderWidth = '2px';
            this.style.background = '#f0f4f8';
            
            const radio = this.querySelector('input[type="radio"]');
            if(radio) {
                radio.checked = true;
                // Cut to all 3 containers: always show custom price container
                if (val === 'c3') {
                        if (ppFlexCustomPriceContainer) ppFlexCustomPriceContainer.style.display = 'block';
                        const toggleWrapper = modal.querySelector('#ppFlexFlexPriceToggleWrapper');
                        if (toggleWrapper) toggleWrapper.style.display = 'none';
                    } else {
                        const toggleWrapper = modal.querySelector('#ppFlexFlexPriceToggleWrapper');
                        if (selectedProduct && selectedProduct.allowUserFlexiblePricing) {
                            if (toggleWrapper) toggleWrapper.style.display = 'flex';
                        } else {
                            if (toggleWrapper) toggleWrapper.style.display = 'none';
                        }
                    }
    
                if (ppFlexItemPrice) {
                    ppFlexItemPrice.required = true;
                    // Pre-fill the price input with the variant's pre-set price if it exists
                    const val = radio.value;
                    const selectedProduct = flexInventory.find(p => p.name === ppFlexItemSelect.value);
                    if (selectedProduct) {
                        const pt = selectedProduct.packTypes || {};
                        const presetPrice = (pt[val] || {}).price || (val === 'c1' ? selectedProduct.price : 0);
                        ppFlexItemPrice.value = presetPrice || '';
                    } else {
                        ppFlexItemPrice.value = '';
                    }
                }
            }
        });
    });

    // Tab Logic
    const tabBtns = modal.querySelectorAll('.pp-sale-tab-btn');
    const forms = [ppExistingItemForm, ppSpecialItemForm, ppCustomItemForm, ppFlexItemForm];
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => {
                b.classList.remove('active');
                b.style.background = 'transparent';
                b.style.color = '#64748b';
                b.style.boxShadow = 'none';
            });
            btn.classList.add('active');
            btn.style.background = 'white';
            btn.style.color = '#8b5cf6';
            btn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
            
            forms.forEach(f => { if(f) f.style.display = 'none'; });
            const target = modal.querySelector('#' + btn.getAttribute('data-target'));
            if(target) target.style.display = 'block';
        });
    });

    // Load Inventory from localStorage
    let inventory = [];
    try {
        const stored = JSON.parse(localStorage.getItem('nd_products_data') || '[]');
        if (stored && stored.length > 0) inventory = stored;
        else if (typeof adminProducts !== 'undefined' && Array.isArray(adminProducts)) inventory = adminProducts;
    } catch(e) {}

    let defaultInventoryRaw = inventory.filter(p => !p.isSpecial && !p.isCustom && !p.isFlexible && !p.isDeleted && !(p.isHidden || p.cleared));
    if (defaultInventoryRaw.length === 0) defaultInventoryRaw = inventory.filter(p => !p.isDeleted && !(p.isHidden || p.cleared) && !p.isSpecial && !p.isCustom && !p.isFlexible);
    
    let defaultInventory = defaultInventoryRaw;
    let specialInventory = inventory.filter(p => p.isSpecial && !p.isDeleted && !(p.isHidden || p.cleared));
    let customInventory = inventory.filter(p => p.isCustom && !p.isDeleted && !(p.isHidden || p.cleared));
    let flexInventory = inventory.filter(p => p.isFlexible && !p.isSpecial && !p.isDeleted && !(p.isHidden || p.cleared));

    function formatCurrency(amount) {
        return Math.round(Number(amount)).toLocaleString();
    }

    // Visual feedback for Default Variant selection
    modal.querySelectorAll('.pp-default-variant-label').forEach(label => {
        label.addEventListener('click', function() {
            modal.querySelectorAll('.pp-default-variant-label').forEach(l => {
                l.style.borderColor = '#bfdbfe';
                l.style.borderWidth = '1px';
                l.style.background = 'white';
            });
            this.style.borderColor = '#8b5cf6';
            this.style.borderWidth = '2px';
            this.style.background = '#f0f4f8';
            
            const radio = this.querySelector('input[type="radio"]');
            if(radio) {
                radio.checked = true;
                const price = radio.parentNode.querySelector('[data-price]').dataset.price;
                const unitText = radio.parentNode.querySelector('div:nth-child(2)').textContent;
                if (ppExistingPrice) {
                    ppExistingPrice.value = '₦' + formatCurrency(Number(price)) + ' per ' + unitText.toLowerCase();
                    ppExistingPrice.dataset.price = price;
                }
            }
        });
    });

    // ============================================================
    // Build Default Items Dropdown
    // ============================================================
    function buildDefaultDropdown(filterText) {
        if (!ppItemDropdownMenu) return;

        let searchContainer = ppItemDropdownMenu.querySelector('.dropdown-search-container');
        let optionsContainer = ppItemDropdownMenu.querySelector('.dropdown-options-list');

        if (!searchContainer) {
            ppItemDropdownMenu.innerHTML = '';
            searchContainer = document.createElement('div');
            searchContainer.className = 'dropdown-search-container';
            searchContainer.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/></svg>
                <input type="text" class="dropdown-search-input" placeholder="Search items..." autocomplete="off" readonly onfocus="this.removeAttribute('readonly');">
            `;
            ppItemDropdownMenu.appendChild(searchContainer);
            searchContainer.querySelector('.dropdown-search-input').addEventListener('input', (e) => {
                e.stopPropagation();
                buildDefaultDropdown(e.target.value);
            });
            searchContainer.querySelector('.dropdown-search-input').addEventListener('click', e => e.stopPropagation());
            searchContainer.querySelector('.dropdown-search-input').addEventListener('keydown', e => e.stopPropagation());
        }

        if (!optionsContainer) {
            optionsContainer = document.createElement('div');
            optionsContainer.className = 'dropdown-options-list';
            ppItemDropdownMenu.appendChild(optionsContainer);
        }

        optionsContainer.innerHTML = '';
        const filter = (filterText || '').toLowerCase();
        const filtered = defaultInventory.filter(item => item.name.toLowerCase().includes(filter));

        if (filtered.length === 0) {
            optionsContainer.innerHTML = '<div class="dropdown-no-result">No items found</div>';
        } else {
            filtered.forEach(item => {
                const option = document.createElement('div');
                option.className = 'custom-dropdown-option';
                option.textContent = item.name;
                option.dataset.price = item.price;
                if (ppHiddenItemInput && ppHiddenItemInput.value === item.name) option.classList.add('active');
                option.addEventListener('click', (e) => {
                    e.stopPropagation();
                    optionsContainer.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('active'));
                    option.classList.add('active');
                    if (ppItemDropdownTrigger) ppItemDropdownTrigger.querySelector('.trigger-text').textContent = item.name;
                    if (ppHiddenItemInput) ppHiddenItemInput.value = item.name;

                    const ppDefaultVariantContainer = modal.querySelector('#ppDefaultVariantContainer');
                    const hasWholesale = item.wholesalePrice && Number(item.wholesalePrice) > 0;

                    if (hasWholesale) {
                        if (ppDefaultVariantContainer) ppDefaultVariantContainer.style.display = 'block';

                        // Set up variant prices and labels
                        const retailPriceText = modal.querySelector('#ppDefaultVariantRetailPrice');
                        const retailLabelText = modal.querySelector('#ppDefaultVariantRetailLabelTxt');
                        const wholesalePriceText = modal.querySelector('#ppDefaultVariantWholesalePrice');
                        const wholesaleLabelText = modal.querySelector('#ppDefaultVariantWholesaleLabelTxt');

                        if (retailPriceText) {
                            retailPriceText.textContent = '₦' + formatCurrency(Number(item.price));
                            retailPriceText.dataset.price = item.price;
                        }
                        if (retailLabelText) {
                            retailLabelText.textContent = item.unit || 'Piece';
                        }
                        if (wholesalePriceText) {
                            wholesalePriceText.textContent = '₦' + formatCurrency(Number(item.wholesalePrice));
                            wholesalePriceText.dataset.price = item.wholesalePrice;
                        }
                        if (wholesaleLabelText) {
                            wholesaleLabelText.textContent = item.bulkUnit || 'Carton';
                        }

                        // Reset selection
                        modal.querySelectorAll('.pp-default-variant-label').forEach(l => {
                            l.style.borderColor = '#bfdbfe';
                            l.style.borderWidth = '1px';
                            l.style.background = 'white';
                        });
                        const radioButtons = modal.querySelectorAll('input[name="ppDefaultVariant"]');
                        radioButtons.forEach(r => r.checked = false);

                        if (ppExistingPrice) {
                            ppExistingPrice.value = '';
                            ppExistingPrice.dataset.price = '';
                        }
                    } else {
                        if (ppDefaultVariantContainer) ppDefaultVariantContainer.style.display = 'none';
                        const unitStr = item.unit ? item.unit : '';
                        if (ppExistingPrice) {
                            ppExistingPrice.value = '₦' + formatCurrency(Number(item.price)) + (unitStr ? ' ' + unitStr : '');
                            ppExistingPrice.dataset.price = item.price;
                        }
                    }

                    const toggleWrapper = modal.querySelector('#ppExistingFlexPriceToggleWrapper');
                    if (item.allowUserFlexiblePricing) {
                        if (toggleWrapper) toggleWrapper.style.display = 'flex';
                    } else {
                        if (toggleWrapper) toggleWrapper.style.display = 'none';
                    }
                    const toggleCb = modal.querySelector('#ppExistingFlexToggle');
                    if (toggleCb) { toggleCb.checked = false; toggleCb.dispatchEvent(new Event('change')); }
    

                    const priceLabel = modal.querySelector('#lblPpExistingPrice');
                    if (priceLabel) {
                        priceLabel.textContent = 'Unit Price (₦)';
                    }
                    const qtyLabel = modal.querySelector('#lblPpExistingQty');
                    if (qtyLabel) {
                        qtyLabel.textContent = 'Quantity';
                    }
                    ppItemDropdownWrapper.classList.remove('open');
                });
                optionsContainer.appendChild(option);
            });
        }
    }

    // ============================================================
    // Build Special Items Dropdown
    // ============================================================
    function buildSpecialDropdown(filterText) {
        if (!ppSpecDropdownMenu) return;

        let searchContainer = ppSpecDropdownMenu.querySelector('.dropdown-search-container');
        let optionsContainer = ppSpecDropdownMenu.querySelector('.dropdown-options-list');

        if (!searchContainer) {
            ppSpecDropdownMenu.innerHTML = '';
            searchContainer = document.createElement('div');
            searchContainer.className = 'dropdown-search-container';
            searchContainer.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/></svg>
                <input type="text" class="dropdown-search-input" placeholder="Search special products..." autocomplete="off" readonly onfocus="this.removeAttribute('readonly');">
            `;
            ppSpecDropdownMenu.appendChild(searchContainer);
            searchContainer.querySelector('.dropdown-search-input').addEventListener('input', (e) => {
                e.stopPropagation();
                buildSpecialDropdown(e.target.value);
            });
            searchContainer.querySelector('.dropdown-search-input').addEventListener('click', e => e.stopPropagation());
            searchContainer.querySelector('.dropdown-search-input').addEventListener('keydown', e => e.stopPropagation());
        }

        if (!optionsContainer) {
            optionsContainer = document.createElement('div');
            optionsContainer.className = 'dropdown-options-list';
            ppSpecDropdownMenu.appendChild(optionsContainer);
        }

        optionsContainer.innerHTML = '';
        const filter = (filterText || '').toLowerCase();
        const filtered = specialInventory.filter(item => item.name.toLowerCase().includes(filter));

        if (filtered.length === 0) {
            optionsContainer.innerHTML = '<div class="dropdown-no-result">No special products found</div>';
        } else {
            filtered.forEach(item => {
                const option = document.createElement('div');
                option.className = 'custom-dropdown-option';
                option.textContent = item.name;
                if (ppSpecItemSelect && ppSpecItemSelect.value === item.name) option.classList.add('active');
                option.addEventListener('click', (e) => {
                    e.stopPropagation();
                    optionsContainer.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('active'));
                    option.classList.add('active');
                    if (ppSpecDropdownTrigger) ppSpecDropdownTrigger.querySelector('.trigger-text').textContent = item.name;
                    if (ppSpecItemSelect) ppSpecItemSelect.value = item.name;

                    // Show variant selector and fill prices and custom titles
                    if (ppSpecVariantContainer) ppSpecVariantContainer.style.display = 'block';
                    const pt = item.packTypes || {};
                    
                    if (ppSpecVariantBagPrice) { ppSpecVariantBagPrice.textContent = '₦' + formatCurrency(Number((pt.bag || {}).price || item.price || 0)); ppSpecVariantBagPrice.dataset.price = (pt.bag || {}).price || item.price || 0; }
                    if (ppSpecVariantCustardPrice) { ppSpecVariantCustardPrice.textContent = '₦' + formatCurrency(Number((pt.custard || {}).price || 0)); ppSpecVariantCustardPrice.dataset.price = (pt.custard || {}).price || 0; }
                    if (ppSpecVariantCupPrice) { ppSpecVariantCupPrice.textContent = '₦' + formatCurrency(Number((pt.cup || {}).price || 0)); ppSpecVariantCupPrice.dataset.price = (pt.cup || {}).price || 0; }
                    
                    const bagTxt = modal.querySelector('#ppSpecVariantBagLabelTxt');
                    if (bagTxt) bagTxt.textContent = (pt.bag || {}).title || (pt.c1 || {}).title || 'Container 1';
                    
                    const custardTxt = modal.querySelector('#ppSpecVariantCustardLabelTxt');
                    if (custardTxt) custardTxt.textContent = (pt.custard || {}).title || (pt.c2 || {}).title || 'Container 2';
                    
                    const cupTxt = modal.querySelector('#ppSpecVariantCupLabelTxt');
                    if (cupTxt) cupTxt.textContent = (pt.cup || {}).title || (pt.c3 || {}).title || 'Container 3';

                    const toggleWrapper = modal.querySelector('#ppSpecFlexPriceToggleWrapper');
                    if (item.allowUserFlexiblePricing) {
                        if (toggleWrapper) toggleWrapper.style.display = 'flex';
                    } else {
                        if (toggleWrapper) toggleWrapper.style.display = 'none';
                    }
                    const toggleCb = modal.querySelector('#ppSpecFlexToggle');
                    if (toggleCb) { toggleCb.checked = false; toggleCb.dispatchEvent(new Event('change')); }
    

                    ppSpecDropdownWrapper.classList.remove('open');
                });
                optionsContainer.appendChild(option);
            });
        }
    }

    // ============================================================
    // Build Custom Items Dropdown
    // ============================================================
    function buildCustomDropdown(filterText) {
        if (!ppCustomDropdownMenu) return;

        let searchContainer = ppCustomDropdownMenu.querySelector('.dropdown-search-container');
        let optionsContainer = ppCustomDropdownMenu.querySelector('.dropdown-options-list');

        if (!searchContainer) {
            ppCustomDropdownMenu.innerHTML = '';
            searchContainer = document.createElement('div');
            searchContainer.className = 'dropdown-search-container';
            searchContainer.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/></svg>
                <input type="text" class="dropdown-search-input" placeholder="Search products..." autocomplete="off" readonly onfocus="this.removeAttribute('readonly');">
            `;
            ppCustomDropdownMenu.appendChild(searchContainer);
            searchContainer.querySelector('.dropdown-search-input').addEventListener('input', (e) => {
                e.stopPropagation();
                buildCustomDropdown(e.target.value);
            });
            searchContainer.querySelector('.dropdown-search-input').addEventListener('click', e => e.stopPropagation());
            searchContainer.querySelector('.dropdown-search-input').addEventListener('keydown', e => e.stopPropagation());
        }

        if (!optionsContainer) {
            optionsContainer = document.createElement('div');
            optionsContainer.className = 'dropdown-options-list';
            ppCustomDropdownMenu.appendChild(optionsContainer);
        }

        optionsContainer.innerHTML = '';
        const filter = (filterText || '').toLowerCase();
        const filtered = customInventory.filter(item => item.name.toLowerCase().includes(filter));

        if (filtered.length === 0) {
            optionsContainer.innerHTML = '<div class="dropdown-no-result">No products found</div>';
        } else {
            filtered.forEach(item => {
                const option = document.createElement('div');
                option.className = 'custom-dropdown-option';
                option.textContent = item.name;
                if (ppCustomItemSelect && ppCustomItemSelect.value === item.name) option.classList.add('active');
                option.addEventListener('click', (e) => {
                    e.stopPropagation();
                    optionsContainer.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('active'));
                    option.classList.add('active');
                    if (ppCustomDropdownTrigger) ppCustomDropdownTrigger.querySelector('.trigger-text').textContent = item.name;
                    if (ppCustomItemSelect) ppCustomItemSelect.value = item.name;
                    
                    // Auto-fill price from the product's retail price
                    const unitStr = item.unit ? item.unit : '';
                    const priceVal = (typeof item.price === 'number') ? item.price : 0;
                    
                    // Always update the hidden field's data-price and the static display
                    if (ppCustomItemPrice) ppCustomItemPrice.dataset.price = priceVal;
                    const ppStaticDisplay = modal.querySelector('#ppCustomStaticPriceDisplay');
                    const ppFlexWrap = modal.querySelector('#ppCustomFlexPriceInputWrapper');
                    const ppFlexInp = modal.querySelector('#ppCustomFlexPriceInput');
                    if (ppStaticDisplay) {
                        ppStaticDisplay.textContent = '₦' + formatCurrency(Number(priceVal)) + (unitStr ? ' ' + unitStr : '');
                    }
                    
                    const flexContainer = modal.querySelector('#ppCustomFlexibleContainer');
                    const flexToggle = modal.querySelector('#ppCustomFlexiblePriceToggle');
                    if (item.allowUserFlexiblePricing) {
                        // Show toggle, reset it to OFF state
                        if (flexContainer) flexContainer.style.display = 'block';
                        if (flexToggle) { flexToggle.checked = false; flexToggle.dispatchEvent(new Event('change')); }
                    } else {
                        // Hide toggle, always show static price
                        if (flexContainer) flexContainer.style.display = 'none';
                        if (ppFlexWrap) ppFlexWrap.style.display = 'none';
                        if (ppStaticDisplay) ppStaticDisplay.style.display = 'flex';
                    }
    

                    ppCustomDropdownWrapper.classList.remove('open');
                });
                optionsContainer.appendChild(option);
            });
        }
    }

    // ============================================================
    // Build Flexible Items Dropdown
    // ============================================================
    function buildFlexDropdown(filterText) {
        if (!ppFlexDropdownMenu) return;

        let searchContainer = ppFlexDropdownMenu.querySelector('.dropdown-search-container');
        let optionsContainer = ppFlexDropdownMenu.querySelector('.dropdown-options-list');

        if (!searchContainer) {
            ppFlexDropdownMenu.innerHTML = '';
            searchContainer = document.createElement('div');
            searchContainer.className = 'dropdown-search-container';
            searchContainer.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/></svg>
                <input type="text" class="dropdown-search-input" placeholder="Search flexible products..." autocomplete="off" readonly onfocus="this.removeAttribute('readonly');">
            `;
            ppFlexDropdownMenu.appendChild(searchContainer);
            searchContainer.querySelector('.dropdown-search-input').addEventListener('input', (e) => {
                e.stopPropagation();
                buildFlexDropdown(e.target.value);
            });
            searchContainer.querySelector('.dropdown-search-input').addEventListener('click', e => e.stopPropagation());
            searchContainer.querySelector('.dropdown-search-input').addEventListener('keydown', e => e.stopPropagation());
        }

        if (!optionsContainer) {
            optionsContainer = document.createElement('div');
            optionsContainer.className = 'dropdown-options-list';
            ppFlexDropdownMenu.appendChild(optionsContainer);
        }

        optionsContainer.innerHTML = '';
        const filter = (filterText || '').toLowerCase();
        const filtered = flexInventory.filter(item => item.name.toLowerCase().includes(filter));

        if (filtered.length === 0) {
            optionsContainer.innerHTML = '<div class="dropdown-no-result">No products found</div>';
        } else {
            filtered.forEach(item => {
                const option = document.createElement('div');
                option.className = 'custom-dropdown-option';
                option.textContent = item.name;
                if (ppFlexItemSelect && ppFlexItemSelect.value === item.name) option.classList.add('active');
                option.addEventListener('click', (e) => {
                    e.stopPropagation();
                    optionsContainer.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('active'));
                    option.classList.add('active');
                    if (ppFlexDropdownTrigger) ppFlexDropdownTrigger.querySelector('.trigger-text').textContent = item.name;
                    if (ppFlexItemSelect) ppFlexItemSelect.value = item.name;
                    
                    if (ppFlexVariantContainer) ppFlexVariantContainer.style.display = 'block';
                    const pt = item.packTypes || {};
                    
                    if (ppFlexVariantC1Price) { ppFlexVariantC1Price.textContent = '₦' + formatCurrency(Number((pt.c1 || {}).price || item.price || 0)); ppFlexVariantC1Price.dataset.price = (pt.c1 || {}).price || item.price || 0; }
                    if (ppFlexVariantC2Price) { ppFlexVariantC2Price.textContent = '₦' + formatCurrency(Number((pt.c2 || {}).price || 0)); ppFlexVariantC2Price.dataset.price = (pt.c2 || {}).price || 0; }
                    
                    const c1Txt = modal.querySelector('#ppFlexVariantC1LabelTxt');
                    if (c1Txt) c1Txt.textContent = (pt.c1 || {}).title || (pt.bag || {}).title || 'Container 1';
                    
                    const c2Txt = modal.querySelector('#ppFlexVariantC2LabelTxt');
                    if (c2Txt) c2Txt.textContent = (pt.c2 || {}).title || (pt.custard || {}).title || 'Container 2';
                    
                    const c3Txt = modal.querySelector('#ppFlexVariantC3LabelTxt');
                    if (c3Txt) c3Txt.textContent = (pt.c3 || {}).title || (pt.cup || {}).title || 'Container 3';

                    const checkedRad = modal.querySelector('input[name="ppFlexVariant"]:checked');
                    if (checkedRad) checkedRad.checked = false;
                    modal.querySelectorAll('.pp-flex-variant-label').forEach(l => {
                        l.style.borderColor = '#bfdbfe';
                        l.style.borderWidth = '1px';
                        l.style.background = 'white';
                    });

                    if (ppFlexCustomPriceContainer) ppFlexCustomPriceContainer.style.display = 'none';
                      const toggleWrapper = modal.querySelector('#ppFlexFlexPriceToggleWrapper');
                      if (toggleWrapper) toggleWrapper.style.display = 'none';
                      const toggleCb = modal.querySelector('#ppFlexFlexToggle');
                      if (toggleCb) { toggleCb.checked = false; toggleCb.dispatchEvent(new Event('change')); }
    
                    if (ppFlexItemPrice) ppFlexItemPrice.value = '';
                    
                    ppFlexDropdownWrapper.classList.remove('open');
                });
                optionsContainer.appendChild(option);
            });
        }
    }

    // Initialize all dropdowns
    buildDefaultDropdown('');
    buildSpecialDropdown('');
    buildCustomDropdown('');
    buildFlexDropdown('');

    // Wire up Default dropdown trigger
    if (ppItemDropdownTrigger && ppItemDropdownWrapper) {
        ppItemDropdownTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const wasOpen = ppItemDropdownWrapper.classList.contains('open');
            [ppItemDropdownWrapper, ppSpecDropdownWrapper, ppCustomDropdownWrapper, ppFlexDropdownWrapper].forEach(w => w && w.classList.remove('open'));
            if (!wasOpen) {
                ppItemDropdownWrapper.classList.add('open');
                buildDefaultDropdown('');
            }
        });
        document.addEventListener('click', (e) => {
            if (ppItemDropdownWrapper.classList.contains('open') && !ppItemDropdownWrapper.contains(e.target)) {
                ppItemDropdownWrapper.classList.remove('open');
            }
        });
    }

    // Wire up Special dropdown trigger
    if (ppSpecDropdownTrigger && ppSpecDropdownWrapper) {
        ppSpecDropdownTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const wasOpen = ppSpecDropdownWrapper.classList.contains('open');
            [ppItemDropdownWrapper, ppSpecDropdownWrapper, ppCustomDropdownWrapper, ppFlexDropdownWrapper].forEach(w => w && w.classList.remove('open'));
            if (!wasOpen) {
                ppSpecDropdownWrapper.classList.add('open');
                buildSpecialDropdown('');
            }
        });
        document.addEventListener('click', (e) => {
            if (ppSpecDropdownWrapper.classList.contains('open') && !ppSpecDropdownWrapper.contains(e.target)) {
                ppSpecDropdownWrapper.classList.remove('open');
            }
        });
    }

    // Wire up Custom dropdown trigger
    if (ppCustomDropdownTrigger && ppCustomDropdownWrapper) {
        ppCustomDropdownTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const wasOpen = ppCustomDropdownWrapper.classList.contains('open');
            [ppItemDropdownWrapper, ppSpecDropdownWrapper, ppCustomDropdownWrapper, ppFlexDropdownWrapper].forEach(w => w && w.classList.remove('open'));
            if (!wasOpen) {
                ppCustomDropdownWrapper.classList.add('open');
                buildCustomDropdown('');
            }
        });
        document.addEventListener('click', (e) => {
            if (ppCustomDropdownWrapper.classList.contains('open') && !ppCustomDropdownWrapper.contains(e.target)) {
                ppCustomDropdownWrapper.classList.remove('open');
            }
        });
    }

    // Wire up Flex dropdown trigger
    if (ppFlexDropdownTrigger && ppFlexDropdownWrapper) {
        ppFlexDropdownTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const wasOpen = ppFlexDropdownWrapper.classList.contains('open');
            [ppItemDropdownWrapper, ppSpecDropdownWrapper, ppCustomDropdownWrapper, ppFlexDropdownWrapper].forEach(w => w && w.classList.remove('open'));
            if (!wasOpen) {
                ppFlexDropdownWrapper.classList.add('open');
                buildFlexDropdown('');
            }
        });
        document.addEventListener('click', (e) => {
            if (ppFlexDropdownWrapper.classList.contains('open') && !ppFlexDropdownWrapper.contains(e.target)) {
                ppFlexDropdownWrapper.classList.remove('open');
            }
        });
    }

    // Add Basket submission handlers for forms
    if (ppExistingItemForm) ppExistingItemForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const itemName = ppHiddenItemInput.value;
        const price = ppExistingPrice.dataset.price;
        const qty = modal.querySelector('#ppExistingItemQty').value;
        
        const prod = defaultInventory.find(p => p.name === itemName);
        const unit = prod ? prod.unit : '';

        if (itemName && price && qty) {
            const requiredQty = parseFloat(qty);
            
            const ppDefaultVariantContainer = modal.querySelector('#ppDefaultVariantContainer');
            const hasWholesale = prod && prod.wholesalePrice && Number(prod.wholesalePrice) > 0;
            
            let isWholesale = false;
            let finalName = itemName;
            let finalUnit = unit;
            let variantParam = null;
            
            if (hasWholesale && ppDefaultVariantContainer && ppDefaultVariantContainer.style.display !== 'none') {
                const checkedVariant = modal.querySelector('input[name="ppDefaultVariant"]:checked');
                if (!checkedVariant) {
                    alert("Please select a variant type.");
                    return;
                }
                if (checkedVariant.value === 'wholesale') {
                    isWholesale = true;
                    finalName = itemName + ` (${prod.bulkUnit || 'Carton'})`;
                    finalUnit = 'per ' + (prod.bulkUnit || 'carton').toLowerCase();
                    variantParam = 'wholesale';
                }
            }

            const remaining = window.getRemainingProductStock ? window.getRemainingProductStock(itemName, variantParam) : Infinity;
            if (requiredQty > remaining) {
                const unitLabel = isWholesale ? (prod.bulkUnit || 'Carton') : (unit ? unit.replace(/^per\s+/i, '') : 'items');
                if (typeof customAlert === 'function') {
                    customAlert(`Cannot add to basket. Only ${remaining} ${unitLabel}(s) remaining in stock.`);
                } else {
                    alert(`Cannot add to basket. Only ${remaining} ${unitLabel}(s) remaining in stock.`);
                }
                return;
            }
            const prodLookup = defaultInventory.find(p => p.name === itemName);
            let isFlexPrice = false;
            const existingToggle = modal.querySelector('#ppExistingFlexToggle');
            if (prodLookup && prodLookup.allowUserFlexiblePricing && existingToggle && existingToggle.checked) {
                const fPrice = modal.querySelector('#ppExistingFlexPrice').value;
                if (!fPrice) {
                    alert('Please enter a flexible unit price.');
                    return;
                }
                price = fPrice;
                isFlexPrice = true;
            }

            _addToPPBasket(finalName, qty, price, finalUnit, isFlexPrice);

            // Reset Form
            ppHiddenItemInput.value = '';
            ppExistingPrice.value = '';
            ppExistingPrice.dataset.price = '';
            ppItemDropdownTrigger.querySelector('.trigger-text').textContent = 'Select an Item';
            modal.querySelector('#ppExistingItemQty').value = '1';
            ppItemDropdownMenu.querySelectorAll('.custom-dropdown-option').forEach(opt => opt.classList.remove('active'));

            if(ppDefaultVariantContainer) ppDefaultVariantContainer.style.display = 'none';
            modal.querySelectorAll('.pp-default-variant-label').forEach(l => {
                l.style.borderColor = '#bfdbfe';
                l.style.borderWidth = '1px';
                l.style.background = 'white';
            });
            const radioButtons = modal.querySelectorAll('input[name="ppDefaultVariant"]');
            radioButtons.forEach(r => r.checked = false);
        }
    });

    if (ppSpecialItemForm) ppSpecialItemForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const itemName = ppSpecItemSelect.value;
        const qty = modal.querySelector('#ppSpecItemQty').value;
        const checkedVariant = modal.querySelector('input[name="ppSpecVariant"]:checked');
        
        if (itemName && qty && checkedVariant) {
            const variantKey = checkedVariant.value; // bag, custard, cup
            const requiredQty = parseFloat(qty);
            
            const variantKeyCapitalized = variantKey.charAt(0).toUpperCase() + variantKey.slice(1);
            const variantId = 'ppSpecVariant' + variantKeyCapitalized + 'Price';
            const labelTxtId = 'ppSpecVariant' + variantKeyCapitalized + 'LabelTxt';
            const titleStr = modal.querySelector('#' + labelTxtId) ? modal.querySelector('#' + labelTxtId).textContent.trim() : variantKeyCapitalized;
            
            const remaining = window.getRemainingProductStock ? window.getRemainingProductStock(itemName, variantKey) : Infinity;
            if (requiredQty > remaining) {
                if (typeof customAlert === 'function') {
                    customAlert(`Cannot add to basket. Only ${remaining} ${titleStr}(s) remaining in stock.`);
                } else {
                    alert(`Cannot add to basket. Only ${remaining} ${titleStr}(s) remaining in stock.`);
                }
                return;
            }
            
            const price = modal.querySelector('#' + variantId).dataset.price;
            const finalName = `${itemName} (${titleStr})`;
            let isFlexPrice = false;
            const prodLookup = specialInventory.find(p => p.name === itemName);
            const specToggle = modal.querySelector('#ppSpecFlexToggle');
            if (prodLookup && prodLookup.allowUserFlexiblePricing && specToggle && specToggle.checked) {
                const fPrice = modal.querySelector('#ppSpecFlexPrice').value;
                if (!fPrice) {
                    alert('Please enter a flexible unit price.');
                    return;
                }
                price = fPrice;
                isFlexPrice = true;
            }

            _addToPPBasket(finalName, qty, price, titleStr, isFlexPrice);

            // Reset Form
            ppSpecItemSelect.value = '';
            ppSpecDropdownTrigger.querySelector('.trigger-text').textContent = 'Select an Analytical Product';
            modal.querySelector('#ppSpecItemQty').value = '1';
            if (ppSpecVariantContainer) ppSpecVariantContainer.style.display = 'none';
            modal.querySelectorAll('.pp-spec-variant-label').forEach(l => {
                l.style.borderColor = '#bfdbfe';
                l.style.borderWidth = '1px';
                l.style.background = 'white';
            });
            const checkedRad = modal.querySelector('input[name="ppSpecVariant"]:checked');
            if (checkedRad) checkedRad.checked = false;
            ppSpecDropdownMenu.querySelectorAll('.custom-dropdown-option').forEach(opt => opt.classList.remove('active'));
        } else if (!checkedVariant) {
            alert("Please select a variant type.");
        }
    });

    if (ppCustomItemForm) ppCustomItemForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const itemName = ppCustomItemSelect.value;
        const ppFlexToggle = modal.querySelector('#ppCustomFlexiblePriceToggle');
        const ppCustomFlexInput = modal.querySelector('#ppCustomFlexPriceInput');
        let price;
        if (ppFlexToggle && ppFlexToggle.checked && ppCustomFlexInput) {
            price = parseFloat(ppCustomFlexInput.value) || 0;
        } else {
            price = Number(ppCustomItemPrice ? ppCustomItemPrice.dataset.price : 0);
        }
        const qty = modal.querySelector('#ppCustomItemQty').value;
        if (itemName && price && qty) {
            const requiredQty = parseFloat(qty);
            const prod = customInventory.find(p => p.name === itemName);
            const unit = prod ? prod.unit : '';
            const remaining = window.getRemainingProductStock ? window.getRemainingProductStock(itemName) : Infinity;
            
            if (requiredQty > remaining) {
                if (typeof customAlert === 'function') {
                    customAlert(`Cannot add to basket. Only ${remaining} ${unit ? unit.replace(/^per\s+/i, '') : 'items'} remaining in stock.`);
                } else {
                    alert(`Cannot add to basket. Only ${remaining} items remaining in stock.`);
                }
                return;
            }

            let isFlexPrice = false;
            if (prod && prod.allowUserFlexiblePricing) {
                const fPrice = modal.querySelector('#ppCustomFlexPrice').value;
                if (!fPrice) {
                    alert('Please enter a flexible unit price.');
                    return;
                }
                price = fPrice;
                isFlexPrice = true;
            }

            _addToPPBasket(`${itemName}`, requiredQty, Number(price), unit, isFlexPrice);

            // Reset Form
            ppCustomItemSelect.value = '';
            ppCustomItemPrice.value = '';
            ppCustomItemPrice.dataset.price = '';
            ppCustomDropdownTrigger.querySelector('.trigger-text').textContent = 'Select a Product';
            modal.querySelector('#ppCustomItemQty').value = '1';
            ppCustomDropdownMenu.querySelectorAll('.custom-dropdown-option').forEach(opt => opt.classList.remove('active'));
        }
    });

    if (ppFlexItemForm) ppFlexItemForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const itemName = ppFlexItemSelect.value;
        const checkedVariant = modal.querySelector('input[name="ppFlexVariant"]:checked');
        const qty = modal.querySelector('#ppFlexItemQty').value;
        
        if (itemName && qty && checkedVariant) {
            const variantKey = checkedVariant.value; // c1, c2, c3
            const requiredQty = parseFloat(qty);
            const prod = flexInventory.find(p => p.name === itemName);
            const pt = prod ? (prod.packTypes || {}) : {};
            
            const variantKeyCapitalized = variantKey.toUpperCase(); // C1, C2, C3
            const titleStr = (pt[variantKey] || {}).title || `Container ${variantKey.charAt(1)}`;
            
            const remaining = window.getRemainingProductStock ? window.getRemainingProductStock(itemName, variantKey) : Infinity;
            
            if (requiredQty > remaining) {
                if (typeof customAlert === 'function') {
                    customAlert(`Cannot add to basket. Only ${remaining} items remaining in stock.`);
                } else {
                    alert(`Cannot add to basket. Only ${remaining} items remaining in stock.`);
                }
                return;
            }
            
            let price = '';
            if (variantKey === 'c3') {
                price = ppFlexItemPrice ? ppFlexItemPrice.value : '';
            } else {
                const flexToggle = modal.querySelector('#ppFlexFlexToggle');
                if (prod && prod.allowUserFlexiblePricing && flexToggle && flexToggle.checked) {
                    price = ppFlexItemPrice ? ppFlexItemPrice.value : '';
                } else {
                    const presetPrice = (pt[variantKey] || {}).price || (variantKey === 'c1' ? prod.price : 0);
                    price = presetPrice;
                }
            }
            if (!price) {
                alert("Please enter a retail unit price.");
                return;
            }
            _addToPPBasket(`${itemName} (${titleStr})`, requiredQty, Number(price), titleStr, true);

            // Reset Form
            ppFlexItemSelect.value = '';
            ppFlexDropdownTrigger.querySelector('.trigger-text').textContent = 'Select a Product';
            modal.querySelector('#ppFlexItemQty').value = '1';
            if (ppFlexVariantContainer) ppFlexVariantContainer.style.display = 'none';
            if (ppFlexCustomPriceContainer) ppFlexCustomPriceContainer.style.display = 'none';
            modal.querySelectorAll('.pp-flex-variant-label').forEach(l => {
                l.style.borderColor = '#bfdbfe';
                l.style.borderWidth = '1px';
                l.style.background = 'white';
            });
            if (ppFlexItemPrice) ppFlexItemPrice.value = '';
            const checkedRad = modal.querySelector('input[name="ppFlexVariant"]:checked');
            if (checkedRad) checkedRad.checked = false;
            ppFlexDropdownMenu.querySelectorAll('.custom-dropdown-option').forEach(opt => opt.classList.remove('active'));
        } else if (!checkedVariant) {
            alert("Please select a variant type.");
        }
    });

    // Finalize purchase button
    const finalizeBtn = modal.querySelector('#ppFinalizeBtn');
    if (finalizeBtn) {
        finalizeBtn.addEventListener('click', _submitPayoutPurchase);
    }
}

function _verifyPPUser(searchTerm) {
    const errorEl = document.getElementById('ppUserError');
    const infoEl = document.getElementById('ppUserInfo');
    const formEl = document.getElementById('ppPurchaseForm');

    if (!searchTerm) return;

    const users = JSON.parse(localStorage.getItem('nd_users') || '[]');
    const term = searchTerm.trim().toLowerCase();

    // Search by ID, email, or phone number
    const user = users.find(u =>
        (u.id && u.id.toLowerCase() === term) ||
        (u.email && u.email.toLowerCase() === term) ||
        (u.phone && u.phone.replace(/[\s\-\(\)]/g, '') === term.replace(/[\s\-\(\)]/g, ''))
    );

    if (user) {
        ppCurrentUser = user;
        document.getElementById('ppUserName').textContent = user.name;

        // Calculate user's total payout balance from sales history
        const sales = JSON.parse(localStorage.getItem('nd_sales_history') || '[]');
        const userSales = sales.filter(s => s.customerID === user.id);

        ppUserPayoutBalance = 0;
        userSales.forEach(s => {
            ppUserPayoutBalance += (s.payout || 0);
        });

        document.getElementById('ppUserBalance').textContent = `₦${ppUserPayoutBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        errorEl.style.display = 'none';
        infoEl.style.display = 'block';
        formEl.style.display = 'block';

        // Reset basket for new user
        ppBasketItems = [];
        _updatePPBasketUI();
    } else {
        ppCurrentUser = null;
        ppUserPayoutBalance = 0;
        errorEl.textContent = 'No user found with that ID, email, or phone number.';
        errorEl.style.display = 'block';
        infoEl.style.display = 'none';
        formEl.style.display = 'none';
    }
}

function _addToPPBasket(name, qty, price, unit = '', isFlexible = false) {
    ppBasketItems.push({
        name: name,
        qty: Number(qty),
        price: Number(price),
        unit: unit,
        isFlexible: isFlexible
    });
    _updatePPBasketUI();
}

function _formatPPCurrency(amount) {
    return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function _updatePPBasketUI() {
    const basketContainer = document.getElementById('ppBasketContainer');
    const basketList = document.getElementById('ppBasketItemsList');
    const basketSubtotal = document.getElementById('ppBasketSubtotal');
    const warnEl = document.getElementById('ppFundWarning');
    const finalizeBtn = document.getElementById('ppFinalizeBtn');

    if (!basketContainer) return;

    if (ppBasketItems.length === 0) {
        basketContainer.style.display = 'none';
        return;
    }

    basketContainer.style.display = 'block';
    basketList.innerHTML = '';
    let total = 0;

    ppBasketItems.forEach((item, index) => {
        const itemTotal = item.qty * item.price;
        total += itemTotal;

        const itemDiv = document.createElement('div');
        itemDiv.className = 'basket-item';
        const flexLabel = item.isFlexible ? ' <span style="color:#c026d3;font-size:0.7rem;">(Flex)</span>' : '';
        itemDiv.innerHTML = `
            <div class="basket-item-info">
                <span class="basket-item-name">${item.name}</span>
                <span class="basket-item-meta">${item.qty} × ₦${_formatPPCurrency(item.price)}${flexLabel}</span>
            </div>
            <span class="basket-item-total">₦${_formatPPCurrency(itemTotal)}</span>
            <button class="remove-basket-item" data-index="${index}">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
            </button>
        `;

        itemDiv.querySelector('.remove-basket-item').addEventListener('click', () => {
            ppBasketItems.splice(index, 1);
            _updatePPBasketUI();
        });

        basketList.appendChild(itemDiv);
    });

    basketSubtotal.textContent = '₦' + _formatPPCurrency(total);

    // Check funds
    if (total > 0 && total > ppUserPayoutBalance) {
        warnEl.style.display = 'block';
        finalizeBtn.disabled = true;
        finalizeBtn.style.opacity = '0.5';
        finalizeBtn.style.cursor = 'not-allowed';
    } else if (total > 0) {
        warnEl.style.display = 'none';
        finalizeBtn.disabled = false;
        finalizeBtn.style.opacity = '1';
        finalizeBtn.style.cursor = 'pointer';
    } else {
        warnEl.style.display = 'none';
        finalizeBtn.disabled = true;
        finalizeBtn.style.opacity = '0.5';
    }
}

function _submitPayoutPurchase() {
    if (!ppCurrentUser || ppBasketItems.length === 0) return;

    // Calculate total
    let total = 0;
    ppBasketItems.forEach(item => {
        total += item.qty * item.price;
    });

    if (total <= 0) {
        if (typeof customAlert === 'function') customAlert("Please add items to the basket.");
        return;
    }

    if (total > ppUserPayoutBalance) {
        if (typeof customAlert === 'function') customAlert("Insufficient payout funds. The customer does not have enough balance.");
        return;
    }

    // Generate date string matching register format
    const now = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = now.getDate();
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const timeStr = `${day} ${month}, ${year} · ${hours}:${minutes} ${ampm}`;

    // Add each basket item to sales ledger
    const sales = JSON.parse(localStorage.getItem('nd_sales_history') || '[]');

    // Calculate the payout deduction per item, proportionally
    ppBasketItems.forEach(item => {
        const itemTotal = item.qty * item.price;

        const newSale = {
            id: `PP-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            customerID: ppCurrentUser.id,
            customerName: ppCurrentUser.name,
            date: timeStr,
            item: item.name,
            qty: item.qty,
            unitPrice: item.price,
            price: itemTotal,
            payout: -Math.abs(itemTotal), // Deduct the cost from their payout balance
            type: 'Payout Purchase',
            unit: item.unit || '',
            isFlexible: item.isFlexible || false
        };

        sales.unshift(newSale);
    });

    localStorage.setItem('nd_sales_history', JSON.stringify(sales));

    if (typeof customAlert === 'function') {
        customAlert(`Successfully purchased ${ppBasketItems.length} item(s) for ₦${total.toLocaleString()} using ${ppCurrentUser.name}'s payout balance.`);
    }

    // Trigger register table update if visible
    if (typeof window.refreshSalesTable === 'function' && document.getElementById('sales-table-wrapper')) {
        window.refreshSalesTable();
    }

    closePayoutPurchaseModal();
}

function _resetPayoutPurchaseForm(modal) {
    ppCurrentUser = null;
    ppUserPayoutBalance = 0;
    ppBasketItems = [];
    ppCurrentCategory = 'all';

    const userId = modal.querySelector('#ppUserId');
    if (userId) userId.value = '';

    const userInfo = modal.querySelector('#ppUserInfo');
    if (userInfo) userInfo.style.display = 'none';

    const userError = modal.querySelector('#ppUserError');
    if (userError) userError.style.display = 'none';

    const purchaseForm = modal.querySelector('#ppPurchaseForm');
    if (purchaseForm) purchaseForm.style.display = 'none';

    // Reset forms
    const ppExistingItemForm = modal.querySelector('#ppExistingItemForm');
    const ppSpecialItemForm = modal.querySelector('#ppSpecialItemForm');
    const ppCustomItemForm = modal.querySelector('#ppCustomItemForm');
    const ppFlexItemForm = modal.querySelector('#ppFlexItemForm');

    if (ppExistingItemForm) ppExistingItemForm.reset();
    if (ppSpecialItemForm) ppSpecialItemForm.reset();
    if (ppCustomItemForm) ppCustomItemForm.reset();
    if (ppFlexItemForm) ppFlexItemForm.reset();

    // Reset Tabs
    const tabBtns = modal.querySelectorAll('.pp-sale-tab-btn');
    tabBtns.forEach(b => {
        b.classList.remove('active');
        b.style.background = 'transparent';
        b.style.color = '#64748b';
        b.style.boxShadow = 'none';
    });
    if (tabBtns.length > 0) {
        tabBtns[0].classList.add('active');
        tabBtns[0].style.background = 'white';
        tabBtns[0].style.color = '#8b5cf6';
        tabBtns[0].style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
    }
    [ppExistingItemForm, ppSpecialItemForm, ppCustomItemForm, ppFlexItemForm].forEach(f => { if(f) f.style.display = 'none'; });
    if (ppSpecialItemForm) ppSpecialItemForm.style.display = 'block';

    // Reset dropdown triggers
    const ppItemDropdownTrigger = modal.querySelector('#ppItemDropdownTrigger .trigger-text');
    if (ppItemDropdownTrigger) ppItemDropdownTrigger.textContent = 'Select an Item';
    const ppSpecDropdownTrigger = modal.querySelector('#ppSpecDropdownTrigger .trigger-text');
    if (ppSpecDropdownTrigger) ppSpecDropdownTrigger.textContent = 'Select an Analytical Product';
    const ppCustomDropdownTrigger = modal.querySelector('#ppCustomDropdownTrigger .trigger-text');
    if (ppCustomDropdownTrigger) ppCustomDropdownTrigger.textContent = 'Select a Product';
    const ppFlexDropdownTrigger = modal.querySelector('#ppFlexDropdownTrigger .trigger-text');
    if (ppFlexDropdownTrigger) ppFlexDropdownTrigger.textContent = 'Select a Product';

    // Reset hidden inputs
    const ppHiddenItemInput = modal.querySelector('#ppExistingItemSelect');
    if (ppHiddenItemInput) ppHiddenItemInput.value = '';
    const ppSpecItemSelect = modal.querySelector('#ppSpecItemSelect');
    if (ppSpecItemSelect) ppSpecItemSelect.value = '';
    const ppCustomItemSelect = modal.querySelector('#ppCustomItemSelect');
    if (ppCustomItemSelect) ppCustomItemSelect.value = '';
    const ppFlexItemSelect = modal.querySelector('#ppFlexItemSelect');
    if (ppFlexItemSelect) ppFlexItemSelect.value = '';

    // Reset prices
    const ppExistingPrice = modal.querySelector('#ppExistingItemPrice');
    if (ppExistingPrice) { ppExistingPrice.value = ''; ppExistingPrice.dataset.price = ''; }
    const ppCustomItemPriceReset = modal.querySelector('#ppCustomItemPrice');
    if (ppCustomItemPriceReset) { ppCustomItemPriceReset.value = ''; ppCustomItemPriceReset.dataset.price = ''; }
    const ppFlexItemPrice = modal.querySelector('#ppFlexItemPrice');
    if (ppFlexItemPrice) ppFlexItemPrice.value = '';

    // Reset quantities
    const ppExistingItemQty = modal.querySelector('#ppExistingItemQty');
    if (ppExistingItemQty) ppExistingItemQty.value = '1';
    const ppSpecItemQty = modal.querySelector('#ppSpecItemQty');
    if (ppSpecItemQty) ppSpecItemQty.value = '1';
    const ppCustomItemQty = modal.querySelector('#ppCustomItemQty');
    if (ppCustomItemQty) ppCustomItemQty.value = '1';
    const ppFlexItemQty = modal.querySelector('#ppFlexItemQty');
    if (ppFlexItemQty) ppFlexItemQty.value = '1';

    // Reset variant containers
    const ppDefaultVariantContainer = modal.querySelector('#ppDefaultVariantContainer');
    if (ppDefaultVariantContainer) ppDefaultVariantContainer.style.display = 'none';
    modal.querySelectorAll('.pp-default-variant-label').forEach(l => {
        l.style.borderColor = '#bfdbfe';
        l.style.borderWidth = '1px';
        l.style.background = 'white';
    });
    const ppDefaultRadioButtons = modal.querySelectorAll('input[name="ppDefaultVariant"]');
    ppDefaultRadioButtons.forEach(r => r.checked = false);

    const ppSpecVariantContainer = modal.querySelector('#ppSpecVariantContainer');
    if (ppSpecVariantContainer) ppSpecVariantContainer.style.display = 'none';
    modal.querySelectorAll('.pp-spec-variant-label').forEach(l => {
        l.style.borderColor = '#bfdbfe';
        l.style.borderWidth = '1px';
        l.style.background = 'white';
    });

    const ppFlexVariantContainer = modal.querySelector('#ppFlexVariantContainer');
    if (ppFlexVariantContainer) ppFlexVariantContainer.style.display = 'none';
    const ppFlexCustomPriceContainer = modal.querySelector('#ppFlexCustomPriceContainer');
    if (ppFlexCustomPriceContainer) ppFlexCustomPriceContainer.style.display = 'none';
    modal.querySelectorAll('.pp-flex-variant-label').forEach(l => {
        l.style.borderColor = '#bfdbfe';
        l.style.borderWidth = '1px';
        l.style.background = 'white';
    });

    // Reset basket UI
    const basketContainer = modal.querySelector('#ppBasketContainer');
    if (basketContainer) basketContainer.style.display = 'none';
    const basketList = modal.querySelector('#ppBasketItemsList');
    if (basketList) basketList.innerHTML = '';

    const warnEl = modal.querySelector('#ppFundWarning');
    if (warnEl) warnEl.style.display = 'none';

    const finalizeBtn = modal.querySelector('#ppFinalizeBtn');
    if (finalizeBtn) {
        finalizeBtn.disabled = true;
        finalizeBtn.style.opacity = '0.5';
    }
}


// Initialize Flexible Pricing Toggles for Payout Purchase
function initPPToggles() {
    const toggles = [
        { id: 'ppExistingFlexToggle', cFixed: 'ppExistingPriceContainer', cFlex: 'ppExistingFlexPriceContainer' },
        { id: 'ppSpecFlexToggle', cFixed: null, cFlex: 'ppSpecFlexPriceContainer' },
        { id: 'ppCustomFlexToggle', cFixed: 'ppCustomPriceContainer', cFlex: 'ppCustomFlexPriceContainer' },
        { id: 'ppFlexFlexToggle', cFixed: null, cFlex: 'ppFlexCustomPriceContainer' }
    ];

    toggles.forEach(t => {
        const toggle = document.getElementById(t.id);
        if (toggle) {
            toggle.addEventListener('change', function() {
                const bg = document.getElementById(t.id + 'Bg');
                const knob = document.getElementById(t.id + 'Knob');
                const cFixed = t.cFixed ? document.getElementById(t.cFixed) : null;
                const cFlex = document.getElementById(t.cFlex);

                if (this.checked) {
                    if (bg) bg.style.backgroundColor = '#f0abfc';
                    if (knob) knob.style.transform = 'translateX(20px)';
                    if (cFixed) cFixed.style.display = 'none';
                    if (cFlex) cFlex.style.display = 'block';
                } else {
                    if (bg) bg.style.backgroundColor = '#e2e8f0';
                    if (knob) knob.style.transform = 'translateX(0)';
                    if (cFixed) cFixed.style.display = 'block';
                    if (cFlex) cFlex.style.display = 'none';
                }
            });
        }
    });
}




