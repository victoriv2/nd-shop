document.addEventListener('DOMContentLoaded', () => {
    // Dynamically insert the modal container into the page
    const container = document.createElement('div');
    container.id = 'product-modal-container';
    document.body.appendChild(container);

    // Fetch the product modal HTML template
    fetch('product/product-modal.html')
        .then(response => {
            if (!response.ok) throw new Error('Network response not ok');
            return response.text();
        })
        .then(html => {
            container.innerHTML = html;
            initProductModalLogic();
        })
        .catch(err => {
            console.warn('Could not load product-modal.html', err);
        });
});

function initProductModalLogic() {
    const productModal = document.getElementById('productModal');



    // State for local interaction
    let currentQuantity = 1;
    let basePriceValue = 0;
    let baseCostValue = 0;
    let isCustomMode = false;
    let currentImageData = '';
    let currentVariants = [];
    let originalVariants = [];
    let currentProduct = null;

    const pmStandardHero = document.getElementById('pmStandardHero');


    // Handle clicks opening and closing the Product Modal
    document.addEventListener('click', (e) => {
        const productCard = e.target.closest('.product-card');
        const pmCloseButton = e.target.closest('#pmClose');
        const buyNowBtn = e.target.closest('#pmShareBtn'); // This is our 'Add to Cart' btn
        const qtyPlus = e.target.closest('#pmQtyPlus');
        const qtyMinus = e.target.closest('#pmQtyMinus');

        // Handle Quantity Buttons
        if (qtyPlus) {
            let maxStock = Infinity;
            if (currentProduct && typeof window.getRemainingProductStock === 'function') {
                const selectedRadio = document.querySelector('input[name="pmVariant"]:checked');
                let variantType = null;
                if (selectedRadio) {
                    const idx = parseInt(selectedRadio.value);
                    const v = currentVariants[idx];
                    if (v) {
                        variantType = v.variantType;
                    }
                } else if (currentVariants.length === 1) {
                    const v = currentVariants[0];
                    if (v) {
                        variantType = v.variantType;
                    }
                }
                maxStock = window.getRemainingProductStock(currentProduct.name, variantType);
            }
            
            if (currentQuantity < maxStock) {
                currentQuantity++;
                updateModalEstimates();
            } else {
                if (typeof window.showCustomAlert === 'function') {
                    window.showCustomAlert(`Only ${maxStock} remaining in stock!`, 'warning');
                } else {
                    alert(`Only ${maxStock} remaining in stock!`);
                }
            }
            return;
        }
        if (qtyMinus) {
            if (currentQuantity > 1) {
                currentQuantity--;
                updateModalEstimates();
            }
            return;
        }

        // Handle Purchase Request
        if (buyNowBtn) {
            if (buyNowBtn.classList.contains('pending')) return;
            handleBuyNowRequest(buyNowBtn);
            return;
        }

        // Handle Report Issue (Open Message)
        const reportBtn = e.target.closest('#pmReportBtn');
        if (reportBtn) {
            if (typeof openMessagingChat === 'function') {
                openMessagingChat('ADMIN', 'Shop Owner');
                productModal.classList.remove('show');
                document.body.classList.remove('modal-open');
            }
            return;
        }

        if (productCard) {
            // Reset interaction state
            currentQuantity = 1;
            isCustomMode = false;

            if (pmStandardHero) pmStandardHero.style.display = 'block';

            // Find text from the product card
            const nameElem = productCard.querySelector('.product-name');
            const priceAmountElem = productCard.querySelector('.product-price-amount');
            const priceUnitElem = productCard.querySelector('.product-price-unit');

            // Find the destinations in the modal
            const destName = document.getElementById('pmProductNameValue');
            const destPrice = document.getElementById('pmProductPriceValue');
            const destUnit = document.getElementById('pmProductUnitValue');

            const pmVariantsSection = document.getElementById('pmVariantsSection');
            const pmVariantsContainer = document.getElementById('pmVariantsContainer');

            const rawDataStr = productCard.getAttribute('data-product');
            let product = {};
            if (rawDataStr) {
                try {
                    product = JSON.parse(decodeURIComponent(rawDataStr));
                } catch(e) {}
            }

            // Always override with freshest data from localStorage to reflect latest admin changes
            // (e.g. flexible pricing toggle) without needing a page refresh
            try {
                const dbProducts = JSON.parse(localStorage.getItem('nd_products_data') || '[]');
                const freshProduct = dbProducts.find(p => p.name === product.name && !p.isDeleted);
                if (freshProduct) {
                    product = freshProduct;
                }
            } catch(e) {}

            currentProduct = product;

            let variants = [];

            if (product.name) {
                if (product.isSpecial) {
                    const pts = product.packTypes || {};
                    const s = product.structure || {};
                    const perUnitCost = parseFloat(product.cost) || 0;
                    const cpb = s.custardsPerBag !== undefined ? Number(s.custardsPerBag) : (s.c2sPerC1 || 1);
                    const c2Cost = cpb > 0 ? perUnitCost / cpb : 0;
                    const cpc = s.cupsPerCustard !== undefined ? Number(s.cupsPerCustard) : (s.c3sPerC2 || 1);
                    const c3Cost = (cpc > 0 && cpb > 0) ? c2Cost / cpc : 0;

                    if (pts.bag && Number(pts.bag.price) > 0) variants.push({ title: pts.bag.title || 'Container 1', price: Number(pts.bag.price), flex: false, cost: perUnitCost, variantType: 'c1' });
                    if (pts.custard && Number(pts.custard.price) > 0) variants.push({ title: pts.custard.title || 'Container 2', price: Number(pts.custard.price), flex: false, cost: c2Cost, variantType: 'c2' });
                    if (pts.cup) {
                        let cupPrice = Number(pts.cup.price) || 0;
                        if (cupPrice <= 0) {
                            const cupProfit = s.cupProfit !== undefined ? s.cupProfit : (s.c3Profit !== undefined ? s.c3Profit : 0);
                            cupPrice = Math.round(c3Cost + cupProfit) || 0;
                        }
                        variants.push({ title: pts.cup.title || 'Container 3', price: cupPrice, flex: true, cost: c3Cost, variantType: 'c3' });
                    }
                } else if (product.isFlexible) {
                    const pts = product.packTypes || {};
                    const baseCost = parseFloat(product.cost) || 0;
                    if (pts.c1 && Number(pts.c1.price) > 0) variants.push({ title: pts.c1.title || 'Container 1', price: Number(pts.c1.price), flex: false, cost: baseCost, variantType: 'c1' });
                    if (pts.c2 && Number(pts.c2.price) > 0) variants.push({ title: pts.c2.title || 'Container 2', price: Number(pts.c2.price), flex: false, cost: baseCost, variantType: 'c2' });
                    if (pts.c3) variants.push({ title: pts.c3.title || 'Container 3', price: Number(pts.c3.price) || 0, flex: true, cost: baseCost, variantType: 'c3' });
                } else if (product.isCustom) {
                    isCustomMode = true;
                    variants.push({ title: 'Default', price: Number(product.price) || 0, flex: false, unit: product.unit || 'per unit', cost: parseFloat(product.cost) || 0, variantType: null });
                } else {
                    const baseCost = parseFloat(product.cost) || 0;
                    variants.push({ title: 'Default', price: Number(product.price) || 0, flex: false, unit: product.unit || 'per unit', cost: baseCost, variantType: null });
                    if (product.wholesalePrice && Number(product.wholesalePrice) > 0) {
                        const bulkUnitStr = product.bulkUnit || 'Carton';
                        const wholesaleRemaining = window.getRemainingProductStock ? window.getRemainingProductStock(product.name, 'wholesale') : Infinity;
                        if (wholesaleRemaining > 0) {
                            variants.push({ title: bulkUnitStr, price: Number(product.wholesalePrice), flex: false, unit: 'per ' + bulkUnitStr.toLowerCase(), cost: baseCost * (product.pieces || 1), variantType: 'wholesale' });
                        }
                    }
                }
            }

            currentVariants = variants;
            originalVariants = JSON.parse(JSON.stringify(variants));
            
            const flexToggleWrapper = document.getElementById('pmFlexPriceToggleWrapper');
            const flexToggleInput = document.getElementById('pmFlexPriceToggle');
            
            // Initial hide; updateModalForVariant will handle logic
            if (flexToggleWrapper) {
                flexToggleWrapper.style.display = 'none';
            }
            if (flexToggleInput) {
                flexToggleInput.checked = false;
                const slider = document.getElementById('pmFlexPriceSlider');
                const knob = document.getElementById('pmFlexPriceKnob');
                if (slider) slider.style.backgroundColor = '#cbd5e1';
                if (knob) knob.style.left = '4px';
                
                flexToggleInput.onchange = function(e) {
                    const isChecked = e.target.checked;
                    const slider = document.getElementById('pmFlexPriceSlider');
                    const knob = document.getElementById('pmFlexPriceKnob');
                    if (slider) slider.style.backgroundColor = isChecked ? '#c026d3' : '#cbd5e1';
                    if (knob) knob.style.left = isChecked ? '24px' : '4px';
                    
                    let selectedIdx = 0;
                    if (currentVariants.length > 1) {
                        const checkedRadio = document.querySelector('input[name="pmVariant"]:checked');
                        if (checkedRadio) selectedIdx = parseInt(checkedRadio.value);
                    }
                    
                    const flexVars = currentProduct.flexibleVariants || [];
                    currentVariants.forEach((v, i) => {
                        if (i === selectedIdx) {
                            let isAllowed = false;
                            if (currentProduct.allowUserFlexiblePricing) {
                                if (flexVars.length === 0) isAllowed = true;
                                else if (flexVars.includes(v.title) || (v.title === 'Default' && flexVars.some(fv => fv.startsWith('Default (')))) isAllowed = true;
                            }
                            if (isChecked && isAllowed) {
                                v.flex = true;
                            } else if (v.variantType === 'c3') {
                                v.flex = true;
                            } else {
                                v.flex = false;
                            }
                        } else {
                            v.flex = false;
                        }
                    });
                    
                    if (currentVariants.length > 1) {
                        renderVariantsList(selectedIdx);
                    }
                    
                    updateModalForVariant(currentVariants[selectedIdx]);
                };
            }

            function updateModalForVariant(v) {
                const isFlex = v.flex;
                basePriceValue = isFlex ? 0 : v.price;
                baseCostValue = v.cost || 0;
                const unitStr = v.unit || `per ${v.title.toLowerCase()}`;
                
                const flexToggleWrapper = document.getElementById('pmFlexPriceToggleWrapper');
                if (flexToggleWrapper && currentProduct.allowUserFlexiblePricing) {
                    flexToggleWrapper.style.display = 'flex';
                } else if (flexToggleWrapper) {
                    flexToggleWrapper.style.display = 'none';
                }
                
                let displayName = currentProduct.name || (productCard.querySelector('.product-name') ? productCard.querySelector('.product-name').textContent : '');
                if (v.title !== 'Default') {
                    displayName += ` (${v.title})`;
                }
                if (destName) destName.textContent = displayName;
                
                if (destPrice) {
                    if (isFlex) {
                        destPrice.textContent = 'Flexible Price';
                    } else {
                        destPrice.textContent = '₦' + Math.round(v.price).toLocaleString();
                    }
                }
                
                if (destUnit) destUnit.textContent = unitStr;

                const staticTotal = document.getElementById('pmTotalPriceDetail');
                const flexWrapper = document.getElementById('pmFlexPriceInputWrapper');
                const flexInput = document.getElementById('pmFlexPriceInput');
                
                if (isFlex) {
                    if (staticTotal) staticTotal.style.display = 'none';
                    if (flexWrapper) flexWrapper.style.display = 'inline-flex';
                    if (flexInput) {
                        flexInput.value = '';
                        flexInput.focus();
                    }
                } else {
                    if (staticTotal) staticTotal.style.display = '';
                    if (flexWrapper) flexWrapper.style.display = 'none';
                }

                // Update Availability
                const availabilityElem = document.querySelector('.pm-available-text');
                if (availabilityElem && currentProduct && typeof window.getRemainingProductStock === 'function') {
                    let parts = [];
                    let hasInfinity = false;
                    let allZero = true;

                    for (const altV of currentVariants) {
                        const maxStock = window.getRemainingProductStock(currentProduct.name, altV.variantType);
                        
                        if (maxStock === Infinity) {
                            hasInfinity = true;
                            parts.push(`<span style="white-space:nowrap;">${altV.title}: <strong>In Stock</strong></span>`);
                            allZero = false;
                        } else {
                            parts.push(`<span style="white-space:nowrap; color:${maxStock > 0 ? '#16a34a' : '#ef4444'}">${altV.title}: <strong>${maxStock}</strong></span>`);
                            if (maxStock > 0) allZero = false;
                        }
                    }
                    
                    if (hasInfinity && parts.length === 1) {
                        availabilityElem.textContent = 'In Stock';
                        availabilityElem.style.color = '#16a34a';
                    } else {
                        availabilityElem.innerHTML = parts.join('<br>');
                        availabilityElem.style.color = allZero ? '#ef4444' : '#16a34a'; 
                        availabilityElem.style.textAlign = 'right';
                        availabilityElem.style.fontSize = parts.length > 1 ? '0.8rem' : '0.9rem';
                        availabilityElem.style.lineHeight = '1.4';
                    }
                }

                updateModalEstimates();
            }

            function renderVariantsList(selectedIdx = 0) {
                if (pmVariantsContainer) {
                    pmVariantsContainer.innerHTML = currentVariants.map((v, i) => {
                        const stock = typeof window.getRemainingProductStock === 'function' ? window.getRemainingProductStock(currentProduct.name, v.variantType) : Infinity;
                        const isDisabled = stock <= 0;
                        const labelStyle = isDisabled 
                            ? 'display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer; background:#f1f5f9; transition:all 0.2s; opacity:0.5; pointer-events:none;'
                            : (i === selectedIdx
                                ? 'display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border:2px solid #8b5cf6; border-radius:8px; cursor:pointer; background:#f0f4f8; transition:all 0.2s;'
                                : 'display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border:1px solid #bfdbfe; border-radius:8px; cursor:pointer; background:white; transition:all 0.2s;');
                        return `
                            <label class="pm-variant-label" style="${labelStyle}">
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <input type="radio" name="pmVariant" value="${i}" ${i===selectedIdx?'checked':''} ${isDisabled?'disabled':''} style="accent-color:#8b5cf6; width:18px; height:18px; cursor:pointer;">
                                    <span style="font-weight:600; color:#8b5cf6; font-size:0.95rem;">${v.title}</span>
                                </div>
                                <span style="font-weight:700; color:#334155;">${v.flex ? 'Flexible' : '₦' + Math.round(v.price).toLocaleString()}</span>
                            </label>
                        `;
                    }).join('');
                    
                    const labels = pmVariantsContainer.querySelectorAll('.pm-variant-label');
                    labels.forEach((label, i) => {
                        label.addEventListener('click', function() {
                            const stock = typeof window.getRemainingProductStock === 'function' ? window.getRemainingProductStock(currentProduct.name, currentVariants[i].variantType) : Infinity;
                            if (stock <= 0) return; // locked out
                            
                            const radio = this.querySelector('input[type="radio"]');
                            if (radio) {
                                radio.checked = true;
                                const newSelectedIdx = parseInt(radio.value);
                                
                                // Recompute flex states based on new selection
                                const isChecked = flexToggleInput ? flexToggleInput.checked : false;
                                const flexVars = currentProduct.flexibleVariants || [];
                                currentVariants.forEach((v, idx) => {
                                    if (idx === newSelectedIdx) {
                                        let isAllowed = false;
                                        if (currentProduct.allowUserFlexiblePricing) {
                                            if (flexVars.length === 0) isAllowed = true;
                                            else if (flexVars.includes(v.title) || (v.title === 'Default' && flexVars.some(fv => fv.startsWith('Default (')))) isAllowed = true;
                                        }
                                        if (isChecked && isAllowed) {
                                            v.flex = true;
                                        } else if (v.variantType === 'c3') {
                                            v.flex = true;
                                        } else {
                                            v.flex = false;
                                        }
                                    } else {
                                        v.flex = false;
                                    }
                                });
                                
                                // Re-render the list so the pricing and styling update correctly
                                renderVariantsList(newSelectedIdx);
                                updateModalForVariant(currentVariants[newSelectedIdx]);
                            }
                        });
                    });
                    
                    if (labels.length > 0) {
                        labels.forEach((l, idx) => {
                            const lStock = typeof window.getRemainingProductStock === 'function' ? window.getRemainingProductStock(currentProduct.name, currentVariants[idx].variantType) : Infinity;
                            if (lStock <= 0) {
                                l.style.borderColor = '#e2e8f0';
                                l.style.borderWidth = '1px';
                                l.style.background = '#f1f5f9';
                                l.style.opacity = '0.5';
                                l.style.pointerEvents = 'none';
                            } else if (idx === selectedIdx) {
                                l.style.borderColor = '#8b5cf6';
                                l.style.borderWidth = '2px';
                                l.style.background = '#f0f4f8';
                                l.style.opacity = '1';
                                l.style.pointerEvents = 'auto';
                            } else {
                                l.style.borderColor = '#bfdbfe';
                                l.style.borderWidth = '1px';
                                l.style.background = 'white';
                                l.style.opacity = '1';
                                l.style.pointerEvents = 'auto';
                            }
                        });
                    }
                }
            }

            let defaultIdx = 0;
            if (typeof window.getRemainingProductStock === 'function') {
                for (let i = 0; i < variants.length; i++) {
                    const s = window.getRemainingProductStock(product.name, variants[i].variantType);
                    if (s > 0) {
                        defaultIdx = i;
                        break;
                    }
                }
            }

            if (variants.length > 1) {
                if (pmVariantsSection) pmVariantsSection.style.display = 'block';
                
                // Align initial flex states with defaultIdx selection (initial toggle is OFF)
                const flexVars = product.flexibleVariants || [];
                variants.forEach((v, idx) => {
                    if (idx === defaultIdx) {
                        let isAllowed = false;
                        if (product.allowUserFlexiblePricing) {
                            if (flexVars.length === 0) isAllowed = true;
                            else if (flexVars.includes(v.title) || (v.title === 'Default' && flexVars.some(fv => fv.startsWith('Default (')))) isAllowed = true;
                        }
                        if (v.variantType === 'c3') {
                            v.flex = true;
                        } else {
                            v.flex = false;
                        }
                    } else {
                        v.flex = false;
                    }
                });
                
                renderVariantsList(defaultIdx);
                updateModalForVariant(variants[defaultIdx]);
            } else {
                if (pmVariantsSection) pmVariantsSection.style.display = 'none';
                if (variants.length === 1) {
                    updateModalForVariant(variants[0]);
                } else {
                    const priceAmountElem = productCard.querySelector('.product-price-amount');
                    const isFlex = priceAmountElem && priceAmountElem.dataset.price === 'TBD';
                    const priceVal = isFlex ? 0 : parseFloat(priceAmountElem ? priceAmountElem.dataset.price || priceAmountElem.textContent.replace(/[^0-9\.]/g, '') : '0') || 0;
                    updateModalForVariant({ title: 'Default', price: priceVal, flex: isFlex });
                }
            }
            
            const imgElem = productCard.querySelector('img');
            currentImageData = imgElem ? imgElem.getAttribute('src') : '';

            updateModalEstimates();

            // Pop the modal!
            if (productModal) {
                productModal.classList.add('show');
                document.body.classList.add('modal-open');
            }
        }
        else if (pmCloseButton) {
            productModal.classList.remove('show');
            document.body.classList.remove('modal-open');
        }
    });

    // Listen for flex price input changes
    document.addEventListener('input', (e) => {
        if (e.target && e.target.id === 'pmFlexPriceInput') {
            basePriceValue = parseFloat(e.target.value) || 0;
            updateModalEstimates();
        }
    });

    // End of toggle removed

    function updateModalEstimates() {
        const qtyDisplay = document.getElementById('pmQtyValue');
        const totalDisplay = document.getElementById('pmTotalPriceDetail');
        const payoutDisplay = document.getElementById('pmPayoutDetail');

        if (qtyDisplay) qtyDisplay.textContent = currentQuantity;

        let totalCost = basePriceValue * currentQuantity;
        if (totalDisplay) totalDisplay.textContent = `₦${Math.round(totalCost).toLocaleString()}`;

        const payoutEnabled = localStorage.getItem('nd_payout_enabled') === 'true';
        let payoutRate = parseFloat(localStorage.getItem('nd_payout_rate') || 2);
        let isFlat = false;

        const payoutContainer = document.getElementById('pmPayoutDetailContainer');
        const isFlex = (document.getElementById('pmFlexPriceInputWrapper') && document.getElementById('pmFlexPriceInputWrapper').style.display !== 'none');
        
        if (payoutEnabled && !isFlex && !isCustomMode) {
            if (payoutContainer) {
                payoutContainer.style.display = '';
                payoutContainer.style.opacity = '1';
                payoutContainer.querySelector('.pm-label').style.color = '';
            }
            let payout = 0;
            if (isFlat) {
                payout = payoutRate * currentQuantity;
            } else {
                const totalItemCost = baseCostValue * currentQuantity;
                const profit = totalCost - totalItemCost;
                payout = Math.max(0, profit) * (payoutRate / 100);
            }
            const formattedPayout = Number.isInteger(payout) ? payout : payout.toFixed(2);
            if (payoutDisplay) {
                const rateText = isFlat ? `Fixed Reward` : `${payoutRate}% Reward`;
                payoutDisplay.textContent = `${rateText} (+₦${formattedPayout})`;
                payoutDisplay.classList.add('pm-green-text');
                payoutDisplay.style.color = '';
                payoutDisplay.style.background = '';
                payoutDisplay.style.padding = '';
                payoutDisplay.style.borderRadius = '';
            }
        } else {
            if (payoutContainer) {
                payoutContainer.style.display = 'none';
            }
        }
    }

    function handleBuyNowRequest(btn) {
        const selectedRadio = document.querySelector('input[name="pmVariant"]:checked');
        let isFlex = false;
        let activeVariant = null;
        if (selectedRadio) {
            const idx = parseInt(selectedRadio.value);
            activeVariant = currentVariants[idx];
            isFlex = activeVariant ? activeVariant.flex : false;
        } else if (currentVariants.length === 1) {
            activeVariant = currentVariants[0];
            isFlex = activeVariant.flex;
        }

        if (isFlex && basePriceValue <= 0) {
            alert("Please enter a valid price.");
            return;
        }

        const name = document.getElementById('pmProductNameValue').textContent;
        const unit = document.getElementById('pmProductUnitValue').textContent;

        // --- NEW PRE-CHECK LOGIC ---
        if (typeof window.getRemainingProductStock === 'function' && !isCustomMode && currentProduct && activeVariant) {
            const maxStock = window.getRemainingProductStock(currentProduct.name, activeVariant.variantType);
            
            const cart = JSON.parse(localStorage.getItem('nd_cart') || '[]');
            let currentQtyInCart = 0;
            cart.forEach(item => {
                if (item.name === name) {
                    currentQtyInCart += parseFloat(item.qty) || 0;
                }
            });
            
            if (currentQtyInCart + currentQuantity > maxStock) {
                // Determine alternatives
                let alternatives = [];
                currentVariants.forEach(v => {
                    if (v !== activeVariant) {
                        const s = window.getRemainingProductStock(currentProduct.name, v.variantType);
                        if (s > 0 && s !== Infinity) {
                            alternatives.push(`• <strong>${v.title}</strong> (${s} available)`);
                        } else if (s === Infinity) {
                            alternatives.push(`• <strong>${v.title}</strong> (In Stock)`);
                        }
                    }
                });
                
                // Show custom modal overlay
                const overlay = document.createElement('div');
                overlay.style.cssText = `
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
                    z-index: 999999; display: flex; align-items: center; justify-content: center;
                    opacity: 0; transition: opacity 0.25s;
                `;
                
                let altHtml = '';
                if (alternatives.length > 0) {
                    altHtml = `
                        <div style="background: #f8fafc; border-radius: 10px; padding: 14px; text-align: left; margin-top: 15px;">
                            <p style="margin: 0 0 8px 0; color: #475569; font-size: 0.9rem; font-weight: 600;">But the following are available:</p>
                            <div style="color: #16a34a; font-size: 0.95rem; line-height: 1.5;">
                                ${alternatives.join('<br>')}
                            </div>
                        </div>
                    `;
                } else {
                    altHtml = `
                        <div style="background: #fef2f2; border-radius: 10px; padding: 14px; margin-top: 15px;">
                            <p style="margin: 0; color: #ef4444; font-size: 0.9rem; font-weight: 600;">All options for this product are currently out of stock.</p>
                        </div>
                    `;
                }
                
                overlay.innerHTML = `
                    <div style="background: white; border-radius: 20px; padding: 24px; max-width: 360px; width: 90%; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.2); transform: scale(0.95); transition: transform 0.25s;" id="pmStockWarningBox">
                        <div style="width: 60px; height: 60px; border-radius: 50%; background: #fef2f2; color: #ef4444; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 16px;">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        </div>
                        <h3 style="margin: 0 0 8px 0; color: #1e293b; font-size: 1.25rem;">Not Enough Stock</h3>
                        <p style="margin: 0; color: #64748b; font-size: 0.95rem; line-height: 1.5;">
                            Sorry, <strong>${activeVariant.title}</strong> is not available for the requested quantity.
                        </p>
                        ${altHtml}
                        <button onclick="this.closest('div').parentElement.remove()" style="margin-top: 20px; width: 100%; padding: 12px; background: #8b5cf6; color: white; border: none; border-radius: 10px; font-weight: 700; font-size: 1rem; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#7c3aed'" onmouseout="this.style.background='#8b5cf6'">
                            Got It
                        </button>
                    </div>
                `;
                
                document.body.appendChild(overlay);
                requestAnimationFrame(() => {
                    overlay.style.opacity = '1';
                    document.getElementById('pmStockWarningBox').style.transform = 'scale(1)';
                });
                
                return;
            }
        }
        // --- END PRE-CHECK LOGIC ---

        const effectiveUnitPrice = basePriceValue;
        const totalCost = basePriceValue * currentQuantity;
        const payoutEnabled = localStorage.getItem('nd_payout_enabled') === 'true';
        let payout = 0;
        if (payoutEnabled && !isFlex && !isCustomMode) {
            const totalItemCost = baseCostValue * currentQuantity;
            const profit = totalCost - totalItemCost;
            payout = Math.max(0, profit) * ((parseFloat(localStorage.getItem('nd_payout_rate')) || 2) / 100);
        }

        // Visual Feedback
        const originalText = btn.textContent;
        btn.textContent = 'Processing...';
        btn.classList.add('pending');

        // Add to Cart instead of direct Request
        if (typeof window.addToCart === 'function') {
            const success = window.addToCart(name, currentQuantity, unit, effectiveUnitPrice, isCustomMode, undefined, undefined, currentImageData, isFlex, baseCostValue);
            if (success === false) {
                btn.textContent = originalText;
                btn.classList.remove('pending');
                return;
            }
        }

        // Simulated delay for premium feel
        setTimeout(() => {
            btn.textContent = 'Added to Cart';
            btn.style.backgroundColor = '#22c55e'; // green success

            setTimeout(() => {
                // Reset and close
                btn.textContent = originalText;
                btn.classList.remove('pending');
                btn.style.backgroundColor = '';
                productModal.classList.remove('show');
                document.body.classList.remove('modal-open');
            }, 1500);
        }, 800);
    }

    // Real-time synchronization check: if admin updates product mid-interaction
    const handleRealtimeSyncUpdate = () => {
        const productModal = document.getElementById('productModal');
        if (productModal && productModal.classList.contains('show') && currentProduct) {
            try {
                const dbProducts = JSON.parse(localStorage.getItem('nd_products_data') || '[]');
                const latest = dbProducts.find(p => p.name === currentProduct.name && !p.isDeleted);
                if (latest) {
                    const wasFlexibleAllowed = currentProduct.isFlexible || currentProduct.allowUserFlexiblePricing;
                    const isFlexibleAllowed = latest.isFlexible || latest.allowUserFlexiblePricing;
                    
                    if (wasFlexibleAllowed && !isFlexibleAllowed) {
                        productModal.classList.remove('show');
                        document.body.classList.remove('modal-open');
                        if (typeof window.showCustomAlert === 'function') {
                            window.showCustomAlert(`Product pricing has been updated by admin. Please select the product again.`, 'warning');
                        } else {
                            alert(`Product pricing has been updated by admin. Please select the product again.`);
                        }
                        return;
                    }

                    // Rebuild variants array using latest product data
                    let newVariants = [];
                    if (latest.name) {
                        if (latest.isSpecial) {
                            const pts = latest.packTypes || {};
                            const s = latest.structure || {};
                            const perUnitCost = parseFloat(latest.cost) || 0;
                            const cpb = s.custardsPerBag !== undefined ? Number(s.custardsPerBag) : (s.c2sPerC1 || 1);
                            const c2Cost = cpb > 0 ? perUnitCost / cpb : 0;
                            const cpc = s.cupsPerCustard !== undefined ? Number(s.cupsPerCustard) : (s.c3sPerC2 || 1);
                            const c3Cost = (cpc > 0 && cpb > 0) ? c2Cost / cpc : 0;

                            if (pts.bag && Number(pts.bag.price) > 0) newVariants.push({ title: pts.bag.title || 'Container 1', price: Number(pts.bag.price), flex: false, cost: perUnitCost, variantType: 'c1' });
                            if (pts.custard && Number(pts.custard.price) > 0) newVariants.push({ title: pts.custard.title || 'Container 2', price: Number(pts.custard.price), flex: false, cost: c2Cost, variantType: 'c2' });
                            if (pts.cup) {
                                let cupPrice = Number(pts.cup.price) || 0;
                                if (cupPrice <= 0) {
                                    const cupProfit = s.cupProfit !== undefined ? s.cupProfit : (s.c3Profit !== undefined ? s.c3Profit : 0);
                                    cupPrice = Math.round(c3Cost + cupProfit) || 0;
                                }
                                newVariants.push({ title: pts.cup.title || 'Container 3', price: cupPrice, flex: false, cost: c3Cost, variantType: 'c3' });
                            }
                        } else if (latest.isFlexible) {
                            const pts = latest.packTypes || {};
                            const baseCost = parseFloat(latest.cost) || 0;
                            if (pts.c1 && Number(pts.c1.price) > 0) newVariants.push({ title: pts.c1.title || 'Container 1', price: Number(pts.c1.price), flex: false, cost: baseCost, variantType: 'c1' });
                            if (pts.c2 && Number(pts.c2.price) > 0) newVariants.push({ title: pts.c2.title || 'Container 2', price: Number(pts.c2.price), flex: false, cost: baseCost, variantType: 'c2' });
                            if (pts.c3) newVariants.push({ title: pts.c3.title || 'Container 3', price: Number(pts.c3.price) || 0, flex: true, cost: baseCost, variantType: 'c3' });
                        } else if (latest.isCustom) {
                            newVariants.push({ title: 'Default', price: Number(latest.price) || 0, flex: false, unit: latest.unit || 'per unit', cost: parseFloat(latest.cost) || 0, variantType: null });
                        } else {
                            const baseCost = parseFloat(latest.cost) || 0;
                            newVariants.push({ title: 'Default', price: Number(latest.price) || 0, flex: false, unit: latest.unit || 'per unit', cost: baseCost, variantType: null });
                            if (latest.wholesalePrice && Number(latest.wholesalePrice) > 0) {
                                const bulkUnitStr = latest.bulkUnit || 'Carton';
                                const wholesaleRemaining = window.getRemainingProductStock ? window.getRemainingProductStock(latest.name, 'wholesale') : Infinity;
                                if (wholesaleRemaining > 0) {
                                    newVariants.push({ title: bulkUnitStr, price: Number(latest.wholesalePrice), flex: false, unit: 'per ' + bulkUnitStr.toLowerCase(), cost: baseCost * (latest.pieces || 1), variantType: 'wholesale' });
                                }
                            }
                        }
                    }

                    // Keep selected index or default to 0 if out of range
                    const checkedRadio = document.querySelector('input[name="pmVariant"]:checked');
                    let selectedIdx = 0;
                    if (checkedRadio) {
                        const oldIdx = parseInt(checkedRadio.value);
                        if (oldIdx >= 0 && oldIdx < newVariants.length) {
                            selectedIdx = oldIdx;
                        }
                    }

                    currentProduct = latest;
                    currentVariants = newVariants;
                    originalVariants = JSON.parse(JSON.stringify(newVariants));

                    // Re-render the flex pricing toggle and list of variants
                    const flexToggleWrapper = document.getElementById('pmFlexPriceToggleWrapper');
                    if (flexToggleWrapper) {
                        flexToggleWrapper.style.display = latest.allowUserFlexiblePricing ? 'flex' : 'none';
                    }

                    const flexVars = latest.flexibleVariants || [];
                    
                    // Force toggle ON automatically if admin just made the selected variant flexible!
                    let forceToggleOn = false;
                    if (latest.allowUserFlexiblePricing) {
                        const activeVariantTitle = currentVariants[selectedIdx].title;
                        if (flexVars.length === 0 || flexVars.includes(activeVariantTitle) || (activeVariantTitle === 'Default' && flexVars.some(fv => fv.startsWith('Default (')))) {
                            forceToggleOn = true;
                        }
                    }

                    const flexToggleInput = document.getElementById('pmFlexPriceToggle');
                    let isChecked = flexToggleInput ? flexToggleInput.checked : false;

                    if (forceToggleOn) {
                        isChecked = true;
                        if (flexToggleInput) {
                            flexToggleInput.checked = true;
                            const slider = document.getElementById('pmFlexPriceSlider');
                            const knob = document.getElementById('pmFlexPriceKnob');
                            if (slider) slider.style.backgroundColor = '#c026d3';
                            if (knob) knob.style.left = '24px';
                        }
                    }

                    currentVariants.forEach((v, i) => {
                        let isAllowed = false;
                        if (latest.allowUserFlexiblePricing) {
                            if (flexVars.length === 0) isAllowed = true;
                            else if (flexVars.includes(v.title) || (v.title === 'Default' && flexVars.some(fv => fv.startsWith('Default (')))) isAllowed = true;
                        }
                        v.flex = (isChecked && isAllowed) ? true : originalVariants[i].flex;
                    });

                    if (newVariants.length > 1) {
                        const pmVariantsSection = document.getElementById('pmVariantsSection');
                        if (pmVariantsSection) pmVariantsSection.style.display = 'block';
                        renderVariantsList(selectedIdx);
                    } else {
                        const pmVariantsSection = document.getElementById('pmVariantsSection');
                        if (pmVariantsSection) pmVariantsSection.style.display = 'none';
                    }

                    updateModalForVariant(currentVariants[selectedIdx]);
                    updateModalEstimates();
                }
            } catch (e) {
                console.error("Error checking real-time sync for product modal", e);
            }
        }
    };

    window.addEventListener('nd_sync_complete', handleRealtimeSyncUpdate);
    if (window.realtimeSync) {
        window.realtimeSync.on('nd_products_data', handleRealtimeSyncUpdate);
    }
}




