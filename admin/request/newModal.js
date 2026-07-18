    window._openAdminItemEditModal = function(idx) {
        _requirePinAndExecute(() => {
            const item = workingItems[idx];
            const prod = window.nd_products ? window.nd_products.find(p => p.name === item.name || item.name.startsWith(p.name)) : null;

            let currentQty = parseFloat(item.qty) || 1;
            let isFlexible = item.price === 'TBD' || item.isFlexible || (!item.unitPrice && item.total > 0 && !item.price);
            let customPriceInput = isFlexible ? (parseFloat(item.total) / currentQty) : 0;
            if (isNaN(customPriceInput)) customPriceInput = 0;

            let activeVariant = null;
            let variants = [{ title: 'Default', price: item.unitPrice || (item.total / currentQty), cost: item.unitCost || 0, unit: item.unit, flex: isFlexible }];

            if (prod) {
                variants = [];
                if (prod.isCustom) {
                    variants.push({ title: 'Default', flex: true, cost: prod.cost || 0, unit: prod.unit || 'unit' });
                } else {
                    if (prod.price) variants.push({ title: 'Retail', price: parseFloat(prod.price), cost: parseFloat(prod.cost || 0), flex: false });
                    if (prod.wholesalePrice) variants.push({ title: 'Wholesale', price: parseFloat(prod.wholesalePrice), cost: parseFloat(prod.wholesaleCost || 0), flex: false });
                    if (prod.flexiblePrice) variants.push({ title: 'Flexible', flex: true, cost: parseFloat(prod.flexibleCost || 0) });
                }
            }

            // Try to match current item properties to a variant
            activeVariant = variants.find(v => {
                if (isFlexible) return v.flex;
                return v.price === (item.unitPrice || (item.total / currentQty));
            }) || variants[0];

            const overlay = document.createElement('div');
            overlay.className = 'product-modal-overlay show';
            overlay.style.zIndex = '100005';

            function renderModalBody() {
                let variantHtml = '';
                if (variants.length > 1) {
                    variantHtml = `
                        <div style="margin-bottom: 15px;">
                            <span class="pm-quantity-label" style="display:block; margin-bottom:8px;">Pricing Type</span>
                            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                                ${variants.map((v, i) => `
                                    <div class="pm-variant-card ${v === activeVariant ? 'active' : ''}" data-idx="${i}" style="flex:1; min-width:100px; padding:10px; border:2px solid ${v === activeVariant ? '#8b5cf6' : '#e2e8f0'}; border-radius:12px; cursor:pointer; text-align:center; transition:all 0.2s;">
                                        <div style="font-weight:700; color:#8b5cf6; margin-bottom:4px;">${v.title}</div>
                                        <div style="font-size:0.85rem; color:#64748b; font-weight:600;">
                                            ${v.flex ? 'Flexible' : '₦' + v.price.toLocaleString()}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }

                let priceDisplayHtml = '';
                if (activeVariant.flex) {
                    priceDisplayHtml = `
                        <div class="pm-detail-item" style="margin-bottom: 15px;">
                            <span class="pm-label">Unit Price</span>
                            <span class="pm-value" style="display:flex; align-items:center; gap:4px; justify-content:flex-end;">
                                <span style="font-weight:800; color:#334155;">₦</span>
                                <input type="number" id="admEditCustomPrice" value="${customPriceInput}" min="0" 
                                    style="width:100px; border:none; border-bottom:2px solid #8b5cf6; outline:none; font-size:1.1rem; font-weight:800; color:#334155; background:transparent; padding:2px 4px; text-align:right;">
                            </span>
                        </div>
                    `;
                }

                const effectivePrice = activeVariant.flex ? customPriceInput : activeVariant.price;
                const finalTotal = effectivePrice * currentQty;

                return `
                    <div class="pm-header">
                        <h3>Edit Requested Item</h3>
                        <span class="pm-close" onclick="this.closest('.product-modal-overlay').remove()">&times;</span>
                    </div>
                    <div class="pm-body">
                        <div class="pm-hero-section">
                            <div class="pm-product-name" style="font-size:1.5rem; margin-bottom:8px;">${item.name}</div>
                            <div class="pm-product-price-row">
                                <span class="pm-price">${activeVariant.flex ? 'Flexible Price' : '₦' + activeVariant.price.toLocaleString()}</span>
                                <span class="pm-unit">${activeVariant.unit || item.unit || 'per unit'}</span>
                            </div>
                        </div>

                        ${variantHtml}
                        ${priceDisplayHtml}

                        <div class="pm-quantity-section">
                            <span class="pm-quantity-label">Quantity</span>
                            <div class="pm-quantity-controls">
                                <button class="pm-qty-btn" id="admEditMinus">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                    </svg>
                                </button>
                                <span class="pm-qty-value" id="admEditQty">${currentQty}</span>
                                <button class="pm-qty-btn" id="admEditPlus">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div class="pm-details-list">
                            <div class="pm-detail-item">
                                <span class="pm-label">Total Estimate</span>
                                <span class="pm-value" id="admEditTotalVal">₦${Math.round(finalTotal).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                    <div class="pm-footer">
                        <button class="pm-action-btn pm-btn-primary" id="admEditSaveBtn" style="width:100%;">Save Changes</button>
                    </div>
                `;
            }

            function bindEvents() {
                overlay.querySelectorAll('.pm-variant-card').forEach(card => {
                    card.onclick = () => {
                        activeVariant = variants[parseInt(card.dataset.idx)];
                        updateModal();
                    };
                });

                const customPriceEl = overlay.querySelector('#admEditCustomPrice');
                if (customPriceEl) {
                    customPriceEl.oninput = (e) => {
                        customPriceInput = parseFloat(e.target.value) || 0;
                        updateTotalDisplay();
                    };
                }

                overlay.querySelector('#admEditMinus').onclick = () => {
                    if (currentQty > 1) {
                        currentQty--;
                        updateTotalDisplay();
                    }
                };

                overlay.querySelector('#admEditPlus').onclick = () => {
                    currentQty++;
                    updateTotalDisplay();
                };

                overlay.querySelector('#admEditSaveBtn').onclick = () => {
                    const effectivePrice = activeVariant.flex ? customPriceInput : activeVariant.price;
                    const total = effectivePrice * currentQty;

                    let displayName = prod ? prod.name : item.name;
                    if (variants.length > 1 && activeVariant.title !== 'Default') {
                        displayName += ` (${activeVariant.title})`;
                    }

                    item.name = displayName;
                    item.qty = currentQty;
                    item.unitPrice = effectivePrice;
                    item.total = total;
                    item.isFlexible = activeVariant.flex;
                    item.unitCost = activeVariant.cost;
                    item.unit = activeVariant.unit || item.unit || 'unit';
                    item.price = activeVariant.flex ? 'TBD' : effectivePrice;

                    // Calculate Payout
                    const payoutEnabled = localStorage.getItem('nd_payout_enabled') === 'true';
                    if (payoutEnabled) {
                        const globalRate = parseFloat(localStorage.getItem('nd_payout_rate') || 2);
                        let payoutRate = (prod && prod.payoutRate !== undefined) ? parseFloat(prod.payoutRate) : globalRate;

                        if (activeVariant.flex || (prod && prod.isCustom)) {
                            item.payout = 0;
                        } else {
                            item.payout = total * (payoutRate / 100);
                        }
                    } else {
                        item.payout = 0;
                    }

                    saveWorkingItems();
                    renderRows();
                    overlay.remove();
                };
            }

            function updateTotalDisplay() {
                const qtyDisp = overlay.querySelector('#admEditQty');
                const totDisp = overlay.querySelector('#admEditTotalVal');
                if (qtyDisp) qtyDisp.textContent = currentQty;
                if (totDisp) {
                    const effectivePrice = activeVariant.flex ? customPriceInput : activeVariant.price;
                    totDisp.textContent = '₦' + Math.round(effectivePrice * currentQty).toLocaleString();
                }
            }

            function updateModal() {
                overlay.innerHTML = `<div class="product-modal-content">${renderModalBody()}</div>`;
                bindEvents();
            }

            updateModal();
            document.body.appendChild(overlay);
        });
    };




