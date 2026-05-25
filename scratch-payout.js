function openUserRewardPurchaseModal() {
    const user = window.loggedInUser || JSON.parse(localStorage.getItem('nd_logged_in_user')) || { id: '00000ND', firstName: 'Victor', lastName: '' };
    
    let modal = document.getElementById('userRewardPurchaseModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'userRewardPurchaseModal';
        modal.className = 'admin-modal-overlay';
        modal.style.zIndex = '100050';
        document.body.appendChild(modal);
    }
    
    const sales = JSON.parse(localStorage.getItem('nd_sales_history') || '[]');
    const allUserSales = sales.filter(s => s.customerID === user.id);
    let totalPayout = 0;
    allUserSales.forEach(s => {
        totalPayout += s.payout || 0;
    });

    const requests = JSON.parse(localStorage.getItem('nd_requests_data') || '[]');
    const pendingRewardReqs = requests.filter(r => r.user && r.user.id === user.id && r.status === 'Pending' && r.isRewardPurchase === true);
    let pendingDeductions = 0;
    pendingRewardReqs.forEach(r => {
        pendingDeductions += r.orderTotal || 0;
    });
    let spendableRewardBalance = totalPayout - pendingDeductions;
    
    modal.innerHTML = `
        <div class="admin-modal-content" style="max-height: 90vh;">
            <div class="admin-modal-header">
                <h3>Purchase with Reward</h3>
                <button class="admin-modal-close" onclick="closeUserRewardPurchaseModal()">✕</button>
            </div>
            <div class="admin-modal-body" style="padding-bottom: 24px;">
                
                <!-- Account Info -->
                <div style="padding: 14px 18px; background: #f8fafc; border-radius: 12px; border-left: 4px solid #8b5cf6; margin-bottom: 16px;">
                    <div style="font-weight: 700; color: #1e293b; font-size: 1rem; margin-bottom: 6px;">${user.firstName} ${user.lastName || ''}</div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 4px;">
                        <span style="color: #64748b;">Reward Balance:</span>
                        <strong style="color: #8b5cf6;">₦${Math.round(totalPayout).toLocaleString()}</strong>
                    </div>
                    ${pendingDeductions > 0 ? `
                    <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 4px; color: #ef4444;">
                        <span>Pending Requests:</span>
                        <strong>-₦${Math.round(pendingDeductions).toLocaleString()}</strong>
                    </div>
                    ` : ''}
                    <div style="display: flex; justify-content: space-between; font-size: 0.95rem; border-top: 1px dashed #e2e8f0; padding-top: 6px; margin-top: 4px;">
                        <span style="color: #64748b; font-weight: 600;">Spendable Reward:</span>
                        <strong style="color: #16a34a; font-size: 1rem;">₦${Math.round(spendableRewardBalance).toLocaleString()}</strong>
                    </div>
                </div>

                <!-- Tabs (Special, Default, Flexible, Custom) -->
                <div style="display: flex; gap: 8px; margin-bottom: 20px; background: #f1f5f9; padding: 6px; border-radius: 12px; font-size: 0.85rem; overflow-x: auto;">
                    <button type="button" class="pp-sale-tab-btn active" data-target="urpSpecialItemForm" style="flex: 1; padding: 8px; border-radius: 8px; border: none; font-weight: 700; background: white; color: #8b5cf6; box-shadow: 0 2px 4px rgba(0,0,0,0.05); cursor: pointer; transition: all 0.2s; min-width: max-content;">Analytical</button>
                    <button type="button" class="pp-sale-tab-btn" data-target="urpExistingItemForm" style="flex: 1; padding: 8px; border-radius: 8px; border: none; font-weight: 700; background: transparent; color: #64748b; cursor: pointer; transition: all 0.2s; min-width: max-content;">Default</button>
                    <button type="button" class="pp-sale-tab-btn" data-target="urpFlexibleItemForm" style="flex: 1; padding: 8px; border-radius: 8px; border: none; font-weight: 700; background: transparent; color: #64748b; cursor: pointer; transition: all 0.2s; min-width: max-content;">Flexible</button>
                    <button type="button" class="pp-sale-tab-btn" data-target="urpCustomItemForm" style="flex: 1; padding: 8px; border-radius: 8px; border: none; font-weight: 700; background: transparent; color: #64748b; cursor: pointer; transition: all 0.2s; min-width: max-content;">Custom</button>
                </div>

                <!-- Forms Container -->
                <div id="urpFormsContainer">
                    <!-- Analytical / Special form -->
                    <form id="urpSpecialItemForm" class="urp-add-sale-form active" style="display: block;">
                        <div class="form-group">
                            <label>Select Special Product</label>
                            <div class="custom-dropdown-wrapper" id="urpSpecDropdownWrapper">
                                <div class="custom-dropdown-trigger" id="urpSpecDropdownTrigger">
                                    <span class="trigger-text">Select an Analytical Product</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                </div>
                                <div class="custom-dropdown-menu" id="urpSpecDropdownMenu"></div>
                                <input type="hidden" id="urpSpecItemSelect" required>
                            </div>
                        </div>
                        
                        <div class="form-group" id="urpSpecVariantContainer" style="display: none; background: #f8fafc; padding: 12px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 16px;">
                            <label>Select Type</label>
                            <div style="display: flex; gap: 8px;">
                                <label style="flex: 1; border: 1px solid #bfdbfe; border-radius: 8px; padding: 8px; text-align: center; cursor: pointer; background: white;" class="urp-spec-variant-label">
                                    <input type="radio" name="urpSpecVariant" value="bag" style="display:none;" required>
                                    <div style="font-weight: 700; color: #0F172A; margin-bottom: 4px;" id="urpSpecVariantBagLabelTxt">Container 1</div>
                                    <div style="font-size: 0.8rem; color: #8b5cf6;" id="urpSpecVariantBagPrice">₦0</div>
                                </label>
                                <label style="flex: 1; border: 1px solid #bfdbfe; border-radius: 8px; padding: 8px; text-align: center; cursor: pointer; background: white;" class="urp-spec-variant-label">
                                    <input type="radio" name="urpSpecVariant" value="custard" style="display:none;" required>
                                    <div style="font-weight: 700; color: #0F172A; margin-bottom: 4px;" id="urpSpecVariantCustardLabelTxt">Container 2</div>
                                    <div style="font-size: 0.8rem; color: #8b5cf6;" id="urpSpecVariantCustardPrice">₦0</div>
                                </label>
                                <label style="flex: 1; border: 1px solid #bfdbfe; border-radius: 8px; padding: 8px; text-align: center; cursor: pointer; background: white;" class="urp-spec-variant-label">
                                    <input type="radio" name="urpSpecVariant" value="cup" style="display:none;" required>
                                    <div style="font-weight: 700; color: #0F172A; margin-bottom: 4px;" id="urpSpecVariantCupLabelTxt">Container 3</div>
                                    <div style="font-size: 0.8rem; color: #8b5cf6;" id="urpSpecVariantCupPrice">₦0</div>
                                </label>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Quantity</label>
                            <input type="number" id="urpSpecItemQty" min="1" required class="form-input" placeholder="Qty" value="1" step="1">
                        </div>
                        <button type="submit" class="add-to-list-btn" id="urpAddBasketSpecial">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            Add to List
                        </button>
                    </form>

                    <!-- Default form -->
                    <form id="urpExistingItemForm" class="urp-add-sale-form" style="display: none;">
                        <div class="form-group">
                            <label>Select Native Product</label>
                            <div class="custom-dropdown-wrapper" id="urpItemDropdownWrapper">
                                <div class="custom-dropdown-trigger" id="urpItemDropdownTrigger">
                                    <span class="trigger-text">Select an Item</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                </div>
                                <div class="custom-dropdown-menu" id="urpItemDropdownMenu"></div>
                                <input type="hidden" id="urpExistingItemSelect" required>
                            </div>
                        </div>
                        <div class="form-group" id="urpDefaultVariantContainer" style="display: none; background: #f8fafc; padding: 12px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 16px;">
                            <label>Select Type</label>
                            <div style="display: flex; gap: 8px;">
                                <label style="flex: 1; border: 1px solid #bfdbfe; border-radius: 8px; padding: 8px; text-align: center; cursor: pointer; background: white;" class="urp-default-variant-label">
                                    <input type="radio" name="urpDefaultVariant" value="retail" style="display:none;" required>
                                    <div style="font-weight: 700; color: #0F172A; margin-bottom: 4px;" id="urpDefaultVariantRetailLabelTxt">Retail</div>
                                    <div style="font-size: 0.8rem; color: #8b5cf6;" id="urpDefaultVariantRetailPrice">₦0</div>
                                </label>
                                <label style="flex: 1; border: 1px solid #bfdbfe; border-radius: 8px; padding: 8px; text-align: center; cursor: pointer; background: white;" class="urp-default-variant-label">
                                    <input type="radio" name="urpDefaultVariant" value="wholesale" style="display:none;" required>
                                    <div style="font-weight: 700; color: #0F172A; margin-bottom: 4px;" id="urpDefaultVariantWholesaleLabelTxt">Wholesale</div>
                                    <div style="font-size: 0.8rem; color: #8b5cf6;" id="urpDefaultVariantWholesalePrice">₦0</div>
                                </label>
                            </div>
                        </div>
                        <div class="form-group">
                            <label id="lblUrpExistingPrice">Unit Price (₦)</label>
                            <input type="text" id="urpExistingItemPrice" disabled class="form-input disabled-input" placeholder="0.00">
                        </div>
                        <div class="form-group">
                            <label id="lblUrpExistingQty">Quantity</label>
                            <input type="number" id="urpExistingItemQty" min="1" required class="form-input" placeholder="Qty" value="1" step="1">
                        </div>
                        <button type="submit" class="add-to-list-btn" id="urpAddBasketDefault">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            Add to List
                        </button>
                    </form>

                    <!-- Flexible form -->
                    <form id="urpFlexibleItemForm" class="urp-add-sale-form" style="display: none;">
                        <div class="form-group">
                            <label>Select Flexible Product</label>
                            <div class="custom-dropdown-wrapper" id="urpFlexDropdownWrapper">
                                <div class="custom-dropdown-trigger" id="urpFlexDropdownTrigger">
                                    <span class="trigger-text">Select a Product</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                </div>
                                <div class="custom-dropdown-menu" id="urpFlexDropdownMenu"></div>
                                <input type="hidden" id="urpFlexItemSelect" required>
                            </div>
                        </div>
                        
                        <div class="form-group" id="urpFlexVariantContainer" style="display: none; background: #f8fafc; padding: 12px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 16px;">
                            <label>Select Type</label>
                            <div style="display: flex; gap: 8px;">
                                <label style="flex: 1; border: 1px solid #bfdbfe; border-radius: 8px; padding: 8px; text-align: center; cursor: pointer; background: white;" class="urp-flex-variant-label">
                                    <input type="radio" name="urpFlexVariant" value="c1" style="display:none;" required>
                                    <div style="font-weight: 700; color: #0F172A; margin-bottom: 4px;" id="urpFlexVariantC1LabelTxt">Container 1</div>
                                    <div style="font-size: 0.8rem; color: #8b5cf6;" id="urpFlexVariantC1Price">₦0</div>
                                </label>
                                <label style="flex: 1; border: 1px solid #bfdbfe; border-radius: 8px; padding: 8px; text-align: center; cursor: pointer; background: white;" class="urp-flex-variant-label">
                                    <input type="radio" name="urpFlexVariant" value="c2" style="display:none;" required>
                                    <div style="font-weight: 700; color: #0F172A; margin-bottom: 4px;" id="urpFlexVariantC2LabelTxt">Container 2</div>
                                    <div style="font-size: 0.8rem; color: #8b5cf6;" id="urpFlexVariantC2Price">₦0</div>
                                </label>
                                <label style="flex: 1; border: 1px solid #bfdbfe; border-radius: 8px; padding: 8px; text-align: center; cursor: pointer; background: white;" class="urp-flex-variant-label">
                                    <input type="radio" name="urpFlexVariant" value="c3" style="display:none;" required>
                                    <div style="font-weight: 700; color: #0F172A; margin-bottom: 4px;" id="urpFlexVariantC3LabelTxt">Container 3</div>
                                    <div style="font-size: 0.8rem; color: #8b5cf6;">Flexible Price</div>
                                </label>
                            </div>
                        </div>

                        <div class="form-group" id="urpFlexCustomPriceContainer" style="display: none;">
                            <label id="lblUrpFlexPrice">Retail Unit Price (₦)</label>
                            <input type="number" id="urpFlexItemPrice" class="form-input" min="0" step="0.01" placeholder="e.g. 500">
                        </div>
                        <div class="form-group">
                            <label id="lblUrpFlexQty">Quantity</label>
                            <input type="number" id="urpFlexItemQty" min="1" required class="form-input" placeholder="Qty" value="1" step="1">
                        </div>
                        <button type="submit" class="add-to-list-btn" id="urpAddBasketFlex">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            Add to List
                        </button>
                    </form>

                    <!-- Custom form -->
                    <form id="urpCustomItemForm" class="urp-add-sale-form" style="display: none;">
                        <div class="form-group">
                            <label>Select Custom Product</label>
                            <div class="custom-dropdown-wrapper" id="urpCustomDropdownWrapper">
                                <div class="custom-dropdown-trigger" id="urpCustomDropdownTrigger">
                                    <span class="trigger-text">Select a Product</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                </div>
                                <div class="custom-dropdown-menu" id="urpCustomDropdownMenu"></div>
                                <input type="hidden" id="urpCustomItemSelect" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label id="lblUrpCustomPrice">Unit Price (₦)</label>
                            <input type="text" id="urpCustomItemPrice" disabled class="form-input disabled-input" placeholder="0.00">
                        </div>
                        <div class="form-group">
                            <label id="lblUrpCustomQty">Quantity</label>
                            <input type="number" id="urpCustomItemQty" min="1" required class="form-input" placeholder="Qty" value="1" step="1">
                        </div>
                        <button type="submit" class="add-to-list-btn" id="urpAddBasketCustom">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            Add to List
                        </button>
                    </form>
                </div>

                <!-- Basket Section -->
                <div class="sale-basket-container" id="urpBasketContainer" style="display: none; margin-top: 20px;">
                    <div class="basket-header">Items in this Request</div>
                    <div class="basket-items-list" id="urpBasketItemsList"></div>
                    <div class="basket-summary">
                        <span>Request Total</span>
                        <span id="urpBasketSubtotal">₦0.00</span>
                    </div>
                    <div id="urpFundWarning" style="color: #dc2626; font-size: 0.85rem; font-weight: 700; text-align: center; margin-top: 8px; display: none; padding: 10px; background: #fef2f2; border-radius: 10px; border: 1px solid #fee2e2;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 6px;">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        Insufficient Spendable Reward Balance!
                    </div>
                    <button id="urpFinalizeBtn" class="wide-add-btn save-btn" style="margin-top: 12px; width: 100%; border: none; outline: none; border-radius: 10px; padding: 14px; background: #8b5cf6; color: white; font-weight: 700; cursor: pointer;" disabled>Submit Reward Purchase Request</button>
                </div>

            </div>
        </div>
    `;

    // Make modal visible
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('show');
        document.body.classList.add('modal-open');
    }, 10);

    // Initialize all components & logic inside this modal!
    urpBasketItems = [];
    _initUserRewardPurchaseLogic(modal, spendableRewardBalance, user);
}

function closeUserRewardPurchaseModal() {
    const modal = document.getElementById('userRewardPurchaseModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
        }, 300);
    }
}

function _initUserRewardPurchaseLogic(modal, spendableRewardBalance, user) {
    const urpExistingItemForm = modal.querySelector('#urpExistingItemForm');
    const urpSpecialItemForm = modal.querySelector('#urpSpecialItemForm');
    const urpCustomItemForm = modal.querySelector('#urpCustomItemForm');
    const urpFlexibleItemForm = modal.querySelector('#urpFlexibleItemForm');

    const urpItemDropdownWrapper = modal.querySelector('#urpItemDropdownWrapper');
    const urpItemDropdownTrigger = modal.querySelector('#urpItemDropdownTrigger');
    const urpItemDropdownMenu = modal.querySelector('#urpItemDropdownMenu');
    const urpHiddenItemInput = modal.querySelector('#urpExistingItemSelect');
    const urpExistingPrice = modal.querySelector('#urpExistingItemPrice');

    const urpSpecDropdownWrapper = modal.querySelector('#urpSpecDropdownWrapper');
    const urpSpecDropdownTrigger = modal.querySelector('#urpSpecDropdownTrigger');
    const urpSpecDropdownMenu = modal.querySelector('#urpSpecDropdownMenu');
    const urpSpecItemSelect = modal.querySelector('#urpSpecItemSelect');
    const urpSpecVariantContainer = modal.querySelector('#urpSpecVariantContainer');
    const urpSpecVariantBagPrice = modal.querySelector('#urpSpecVariantBagPrice');
    const urpSpecVariantCustardPrice = modal.querySelector('#urpSpecVariantCustardPrice');
    const urpSpecVariantCupPrice = modal.querySelector('#urpSpecVariantCupPrice');

    const urpCustomDropdownWrapper = modal.querySelector('#urpCustomDropdownWrapper');
    const urpCustomDropdownTrigger = modal.querySelector('#urpCustomDropdownTrigger');
    const urpCustomDropdownMenu = modal.querySelector('#urpCustomDropdownMenu');
    const urpCustomItemSelect = modal.querySelector('#urpCustomItemSelect');
    const urpCustomItemPrice = modal.querySelector('#urpCustomItemPrice');

    const urpFlexDropdownWrapper = modal.querySelector('#urpFlexDropdownWrapper');
    const urpFlexDropdownTrigger = modal.querySelector('#urpFlexDropdownTrigger');
    const urpFlexDropdownMenu = modal.querySelector('#urpFlexDropdownMenu');
    const urpFlexItemSelect = modal.querySelector('#urpFlexItemSelect');
    const urpFlexVariantContainer = modal.querySelector('#urpFlexVariantContainer');
    const urpFlexVariantC1Price = modal.querySelector('#urpFlexVariantC1Price');
    const urpFlexVariantC2Price = modal.querySelector('#urpFlexVariantC2Price');
    const urpFlexCustomPriceContainer = modal.querySelector('#urpFlexCustomPriceContainer');
    const urpFlexItemPrice = modal.querySelector('#urpFlexItemPrice');

    // Visual feedback for Special Variant selection
    modal.querySelectorAll('.urp-spec-variant-label').forEach(label => {
        label.addEventListener('click', function() {
            modal.querySelectorAll('.urp-spec-variant-label').forEach(l => {
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
    modal.querySelectorAll('.urp-flex-variant-label').forEach(label => {
        label.addEventListener('click', function() {
            modal.querySelectorAll('.urp-flex-variant-label').forEach(l => {
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
                if (urpFlexCustomPriceContainer) urpFlexCustomPriceContainer.style.display = 'block';
                if (urpFlexItemPrice) {
                    urpFlexItemPrice.required = true;
                    // Pre-fill the price input with the variant's pre-set price if it exists
                    const val = radio.value;
                    const selectedProduct = flexInventory.find(p => p.name === urpFlexItemSelect.value);
                    if (selectedProduct) {
                        const pt = selectedProduct.packTypes || {};
                        const presetPrice = (pt[val] || {}).price || (val === 'c1' ? selectedProduct.price : 0);
                        urpFlexItemPrice.value = presetPrice || '';
                    } else {
                        urpFlexItemPrice.value = '';
                    }
                }
            }
        });
    });

    // Tab Logic
    const tabBtns = modal.querySelectorAll('.pp-sale-tab-btn');
    const forms = [urpExistingItemForm, urpSpecialItemForm, urpCustomItemForm, urpFlexibleItemForm];
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

    // Load Inventory
    const inventory = JSON.parse(localStorage.getItem('nd_products_data') || '[]');

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
    modal.querySelectorAll('.urp-default-variant-label').forEach(label => {
        label.addEventListener('click', function() {
            modal.querySelectorAll('.urp-default-variant-label').forEach(l => {
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
                const unitText = radio.



