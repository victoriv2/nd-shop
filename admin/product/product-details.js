// ============================================================
// Product Details Modal — Product Tab (admin)
// Called after product-details.html is injected into the DOM
// ============================================================

function initProductDetailsModal() {

    // ---- Close / Back helpers ----
    document.getElementById('adminProductDetailsClose')?.addEventListener('click', closeProductDetailsModal);
    document.getElementById('adminProductStockClose')?.addEventListener('click', _pdCloseStockView);
    document.getElementById('adminProductEditPriceClose')?.addEventListener('click', _pdCloseEditPriceView);
    document.getElementById('adminProductEditImageClose')?.addEventListener('click', _pdCloseEditImageView);
    document.getElementById('pdActionDoneBtn')?.addEventListener('click', closeProductDetailsModal);
    document.getElementById('pdSaveEditImageBtn')?.addEventListener('click', _pdSaveEditImage);

    // Register the global opener used by the product card onclick
    window.openProductDetailsModal = openProductDetailsModal;

    // ---- Edit Image Upload Listeners ----
    const uploadArea = document.getElementById('pdEditImageUploadContainer');
    const fileInput = document.getElementById('pdEditImageInput');
    const imgDataHidden = document.getElementById('pdEditImageData');
    const previewContainer = document.getElementById('pdEditImagePreviewContainer');
    const previewImg = document.getElementById('pdEditImagePreview');
    const placeholder = uploadArea ? uploadArea.querySelector('.upload-placeholder') : null;

    if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', (e) => {
            if (e.target.tagName.toLowerCase() !== 'button') fileInput.click();
        });

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#6366f1';
            uploadArea.style.background = '#f0f4f8';
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#cbd5e1';
            uploadArea.style.background = '#f8fafc';
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#cbd5e1';
            uploadArea.style.background = '#f8fafc';
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                _pdProcessImageFile(e.dataTransfer.files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                _pdProcessImageFile(e.target.files[0]);
            }
        });
    }

    const removeBtn = document.getElementById('pdEditImageRemoveBtn');
    if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (imgDataHidden) imgDataHidden.value = '';
            if (fileInput) fileInput.value = '';
            if (previewContainer) previewContainer.style.display = 'none';
            if (placeholder) placeholder.style.display = 'flex';
        });
    }

    const replaceBtn = document.getElementById('pdEditImageReplaceBtn');
    if (replaceBtn && fileInput) {
        replaceBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput.click();
        });
    }

    function _pdProcessImageFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file.');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 400;
                const MAX_HEIGHT = 400;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                if (imgDataHidden) imgDataHidden.value = dataUrl;
                if (previewImg) previewImg.src = dataUrl;
                if (previewContainer) previewContainer.style.display = 'block';
                if (placeholder) placeholder.style.display = 'none';
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    document.getElementById('pdSaveEditImageBtn')?.addEventListener('click', _pdSaveEditImage);
}

// ============================================================
// Open
// ============================================================
function openProductDetailsModal(productName, dateAdded, productId) {
    const products = JSON.parse(localStorage.getItem('nd_products_data') || '[]');
    let p;
    if (productId) {
        p = products.find(x => x.id === productId);
    }
    if (!p && dateAdded) {
        p = products.find(x => x.name === productName && x.dateAdded === dateAdded);
    }
    if (!p) {
        p = products.find(x => x.name === productName && !x.isDeleted && !x.isHidden && !x.cleared);
    }
    if (!p) return;

    window._pdCurrentProduct = p;

    // Reset to main detail view
    _pdShowView('productDetailsView');

    // Populate name header
    const nameEl = document.getElementById('pdName');
    if (nameEl) nameEl.textContent = p.name;

    // Render dynamic detail rows
    _pdRenderDetails(p);

    // Bind action buttons
    _pdBindButtons(p);

    // Allow Edit Price for all product types
    const editPriceBtn = document.getElementById('pdInitEditPriceBtn');
    if (editPriceBtn) {
        editPriceBtn.style.display = 'block';
    }

    // Show modal
    const modal = document.getElementById('adminProductDetailsModal');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    }
}

// ============================================================
// Close
// ============================================================
function closeProductDetailsModal() {
    const modal = document.getElementById('adminProductDetailsModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    }
    window._pdCurrentProduct = null;
    window._pdCurrentAction = null;
}

// ============================================================
// View switching helpers
// ============================================================
function _pdShowView(viewId) {
    const views = [
        'productDetailsView',
        'productStockView',
        'productActionConfirmView',
        'productEditPriceFormView',
        'productEditImageView',
        'productActionSuccessView'
    ];
    views.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = (id === viewId) ? 'flex' : 'none';
    });
}

function _pdCloseStockView() {
    _pdShowView('productDetailsView');
}

function _pdCloseEditPriceView() {
    _pdShowView('productDetailsView');
}

function _pdCloseEditImageView() {
    _pdShowView('productDetailsView');
}

// ============================================================
// Render product detail rows
// ============================================================
function _pdRenderDetails(p) {
    const container = document.getElementById('pdDynamicDetails');
    if (!container) return;

    const payoutRate = parseFloat(localStorage.getItem('nd_payout_rate')) || 2;
    const payoutEnabled = localStorage.getItem('nd_payout_enabled') === 'true';
    const dateStr = p.dateAdded
        ? new Date(p.dateAdded).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'Unknown';

    const boughtQtyRaw = parseFloat(p.boughtQuantity) || 1;
    const boughtQty = Number.isInteger(boughtQtyRaw) ? boughtQtyRaw : parseFloat(boughtQtyRaw.toFixed(2));
    const totalCostStr = p.purchaseCost
        ? '₦' + Math.round(parseFloat(p.purchaseCost)).toLocaleString()
        : (p.cost ? '₦' + Math.round(parseFloat(p.cost) * boughtQtyRaw).toLocaleString() : '—');

    let html = '';

    if (!p.isSpecial && !p.packTypes) {
        // Default product
        const containerName = p.bulkUnit || 'Carton';
        const pieces = p.pieces || 1;
        const unitWord = p.unit || 'per piece';
        const qty = parseFloat(p.boughtQuantity) || 1;
        const totalPurchase = parseFloat(p.purchaseCost) || 0;
        const perBulkCost = qty > 0 ? totalPurchase / qty : totalPurchase;
        const retailCost = (pieces > 0 && perBulkCost > 0) ? perBulkCost / pieces : (parseFloat(p.cost) || 0);
        const retailCostRounded = Math.round(retailCost);
        const retailCostStr = retailCost > 0 ? '₦' + retailCostRounded.toLocaleString() : '—';
        const finalPrice = parseFloat(p.price) || 0;
        const profit = finalPrice > 0 && retailCostRounded > 0 ? (finalPrice - retailCostRounded) : (parseFloat(p.profit) || 0);
        const profitStr = profit > 0 ? '₦' + Math.round(profit).toLocaleString() : '—';
        const profitPct = (retailCost > 0 && profit > 0)
            ? ((profit / retailCost) * 100).toFixed(2).replace(/\.?0+$/, '')
            : (p.profitPercent || '—');

        const isPayoutDisabled = p.isCustom;
        const payout = isPayoutDisabled ? 0 : Math.max(0, profit) * (payoutRate / 100);
        const formatPayout = Number.isInteger(payout) ? payout : payout.toFixed(2);

        const row = (label, value, bg, border) =>
            `<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;background:${bg};border-radius:12px;border:1px solid ${border};">` +
            `<span style="font-size:0.8rem;font-weight:700;color:#64748b;text-transform:uppercase;">${label}</span>` +
            `<span style="font-weight:800;color:#334155;">${value}</span></div>`;

        html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;background:#eef2ff;border-radius:12px;border:1px solid #c7d2fe;">` +
            `<span style="font-size:0.8rem;font-weight:700;color:#4338ca;text-transform:uppercase;">Wholesale Purchase</span>` +
            `<span style="font-weight:900;color:#3730a3;font-size:1.1rem;">${boughtQty} ${containerName}(s)</span></div>`;
        html += row('Total Cost', totalCostStr, '#f8fafc', '#e2e8f0');
        html += row('Cost per ' + containerName, '₦' + Math.round(perBulkCost).toLocaleString(), '#f8fafc', '#e2e8f0');
        html += `<div style="height:1px;background:#e2e8f0;margin:4px 0;"></div>`;
        html += row('1 ' + containerName + ' Contains', pieces + ' ' + unitWord + '(s)', '#f8fafc', '#e2e8f0');
        if (!p.isCustom) {
            html += row('Cost Price (' + unitWord + ')', retailCostStr, '#f8fafc', '#e2e8f0');
        }
        
        const wholesaleProfit = parseFloat(p.wholesaleProfit) || 0;
        const wholesaleProfitStr = wholesaleProfit > 0 ? '₦' + Math.round(wholesaleProfit).toLocaleString() : '—';
        const wholesalePct = p.wholesaleProfitPercent ? p.wholesaleProfitPercent + '%' : '—';
        const wholesalePrice = parseFloat(p.wholesalePrice) || 0;
        const wholesalePriceStr = wholesalePrice > 0 ? '₦' + Math.round(wholesalePrice).toLocaleString() : '—';

        if (wholesalePrice > 0 && !p.isCustom) {
            html += `<div style="height:1px;background:#e2e8f0;margin:4px 0;"></div>`;
            html += row('Wholesale Profit (₦)', wholesaleProfitStr, '#fdf4ff', '#f5d0fe');
            html += row('Wholesale Margin', wholesalePct, '#fdf4ff', '#f5d0fe');
            html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:16px 18px;background:linear-gradient(135deg,#fae8ff 0%,#f3e8ff 100%);border-radius:12px;border:1px solid #e9d5ff;margin-bottom:8px;">` +
                `<span style="font-size:0.8rem;font-weight:700;color:#4c1d95;text-transform:uppercase;">Wholesale Price</span>` +
                `<span style="font-size:1.2rem;font-weight:900;color:#4c1d95;">${wholesalePriceStr}</span></div>`;
        }
        
        if (!p.isCustom) {
            html += row('Profit (₦)', profitStr, '#f8fafc', '#e2e8f0');
            html += row('Profit Margin', profitPct + '%', '#f8fafc', '#e2e8f0');
        }
        
        html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:16px 18px;background:linear-gradient(135deg,#f0f4f8 0%,#e0e7ff 100%);border-radius:12px;border:1px solid #bfdbfe;">` +
            `<span style="font-size:0.8rem;font-weight:700;color:#0F172A;text-transform:uppercase;">Final Unit Price</span>` +
            `<span style="font-size:1.2rem;font-weight:900;color:#6366f1;">₦${Math.round(parseFloat(p.price) || 0).toLocaleString()}</span></div>`;
        if (payoutEnabled && !isPayoutDisabled) {
            html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;background:#f0fdf4;border-radius:12px;border:1px solid #bbf7d0;">` +
                `<span style="font-size:0.8rem;font-weight:700;color:#166534;text-transform:uppercase;">App Payout</span>` +
                `<span style="font-weight:700;color:#16a34a;">+₦${formatPayout} (${payoutRate}%)</span></div>`;
        } else {
            html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;opacity:0.5;">` +
                `<span style="font-size:0.8rem;font-weight:700;color:#94a3b8;text-transform:uppercase;">App Payout</span>` +
                `<span style="font-weight:700;color:#94a3b8;">Disabled</span></div>`;
        }
        
        html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;background:#faf5ff;border-radius:12px;border:1px solid #d8b4fe;margin-top:6px;">` +
            `<div>` +
            `<span style="font-size:0.8rem;font-weight:800;color:#6b21a8;text-transform:uppercase;display:block;">User Flexible Price</span>` +
            `<span style="font-size:0.72rem;color:#7c3aed;font-weight:500;display:block;margin-top:2px;text-align:left;">Allow user to input custom price in shop</span>` +
            `</div>` +
            `<div style="display:flex;align-items:center;gap:12px;">` +
            (p.allowUserFlexiblePricing ? `<button onclick="window.openFlexibleVariantsModal('${p.name.replace(/'/g, "\\'")}', '${p.dateAdded}')" style="background:transparent;border:none;color:#6b21a8;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:4px;" title="Edit Containers"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg></button>` : '') +
            `<label class="switch" style="position: relative; display: inline-block; width: 44px; height: 24px; margin-bottom: 0;">` +
            `<input type="checkbox" id="pdDetailsIsFlexibleToggleDef" ${p.allowUserFlexiblePricing ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;" onchange="window.toggleProductFlexibleState('${p.name.replace(/'/g, "\\'")}', '${p.dateAdded}', this.checked)">` +
            `<span class="slider round" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: ${p.allowUserFlexiblePricing ? '#7c3aed' : '#cbd5e1'}; transition: .4s; border-radius: 34px;">` +
            `<span class="knob" style="position: absolute; height: 16px; width: 16px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; transform: ${p.allowUserFlexiblePricing ? 'translateX(20px)' : 'translateX(0)'};"></span>` +
            `</span>` +
            `</label></div></div>`;
        
        html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;margin-top:6px;">` +
            `<span style="font-size:0.8rem;font-weight:700;color:#64748b;text-transform:uppercase;">Date Added</span>` +
            `<span style="font-weight:600;color:#475569;font-size:0.9rem;">${dateStr}</span></div>`;

    } else {
        // Analytical product
        const bulkFallback = p.bulkUnit || (p.packTypes && (p.packTypes.bag ? p.packTypes.bag.title : (p.packTypes.c1 ? p.packTypes.c1.title : 'Carton')));
        const s = p.structure || {};
        const perUnitCost = parseFloat(p.cost) || 0;
        const bVal = parseFloat(p.purchaseCost) || 0;
        const cpb = s.custardsPerBag || s.c2sPerC1 || 0;
        const cCost = (cpb && perUnitCost) ? perUnitCost / cpb : 0;
        const cpc = s.cupsPerCustard || s.c3sPerC2 || 0;
        const cupCostVal = (cpc && cCost) ? cCost / cpc : 0;

        html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;background:#eef2ff;border-radius:12px;border:1px solid #c7d2fe;">` +
            `<span style="font-size:0.8rem;font-weight:700;color:#4338ca;text-transform:uppercase;">Wholesale Purchase</span>` +
            `<span style="font-weight:900;color:#3730a3;font-size:1.1rem;">${boughtQty} ${bulkFallback}(s)</span></div>`;
        html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;background:#fef2f2;border-radius:12px;border:1px solid #fecaca;">` +
            `<span style="font-size:0.8rem;font-weight:700;color:#b91c1c;text-transform:uppercase;">Bulk Cost</span>` +
            `<span style="font-weight:800;color:#ef4444;">₦${Math.round(parseFloat(bVal)).toLocaleString()}</span></div>`;
        html += `<div style="height:1px;background:#e2e8f0;margin:4px 0;"></div>`;

        const getPackTitle = (key1, key2, defaultTitle) => {
            if (!p.packTypes) return defaultTitle;
            if (p.isFlexible && p.packTypes[key1] && p.packTypes[key1].title) return p.packTypes[key1].title;
            if (p.isSpecial && p.packTypes[key2] && p.packTypes[key2].title) return p.packTypes[key2].title;
            if (p.packTypes[key1] && p.packTypes[key1].title) return p.packTypes[key1].title;
            if (p.packTypes[key2] && p.packTypes[key2].title) return p.packTypes[key2].title;
            return defaultTitle;
        };

        const getKey = (flexKey, specKey) => {
            if (p.isFlexible) return (p.packTypes && p.packTypes[flexKey]) ? flexKey : specKey;
            if (p.isSpecial) return (p.packTypes && p.packTypes[specKey]) ? specKey : flexKey;
            return (p.packTypes && p.packTypes[flexKey]) ? flexKey : specKey;
        };

        const t1Key = getKey('c1', 'bag');
        const t2Key = getKey('c2', 'custard');
        const t3Key = getKey('c3', 'cup');

        const tierConfigs = [
            { 
                key: t1Key, 
                color: '#1e40af', 
                bg: '#f0f4f8', 
                border: '#bfdbfe', 
                costVal: perUnitCost, 
                perParent: null, 
                parentLabel: null, 
                profitKey: t1Key === 'c1' ? 'c1Profit' : 'bagProfit', 
                profitPctKey: t1Key === 'c1' ? 'c1ProfitPercent' : 'bagProfitPercent' 
            },
            { 
                key: t2Key, 
                color: '#86198f', 
                bg: '#fdf4ff', 
                border: '#f5d0fe', 
                costVal: cCost, 
                perParent: cpb, 
                parentLabel: getPackTitle('c1', 'bag', 'Container 1'), 
                profitKey: t2Key === 'c2' ? 'c2Profit' : 'custardProfit', 
                profitPctKey: t2Key === 'c2' ? 'c2ProfitPercent' : 'custardProfitPercent' 
            },
            { 
                key: t3Key, 
                color: '#9f1239', 
                bg: '#fff1f2', 
                border: '#fecdd3', 
                costVal: cupCostVal, 
                perParent: cpc, 
                parentLabel: getPackTitle('c2', 'custard', 'Container 2'), 
                profitKey: t3Key === 'c3' ? 'c3Profit' : 'cupProfit', 
                profitPctKey: t3Key === 'c3' ? 'c3ProfitPercent' : 'cupProfitPercent' 
            }
        ];

        tierConfigs.forEach(t => {
            const data = p.packTypes && p.packTypes[t.key];
            if (!data) return;
            const title = data.title || t.key;
            const price = parseFloat(data.price) || 0;
            const costV = t.costVal || 0;
            const profitV = (price && costV) ? parseFloat((price - costV).toFixed(2)) : (s[t.profitKey] !== undefined ? parseFloat(s[t.profitKey]) : 0);
            const profitPctV = (s[t.profitPctKey] !== undefined && s[t.profitPctKey] !== '' && parseFloat(s[t.profitPctKey]) > 0)
                ? parseFloat(s[t.profitPctKey]).toFixed(2).replace(/\.?0+$/, '')
                : ((costV > 0 && profitV > 0) ? ((profitV / costV) * 100).toFixed(2).replace(/\.?0+$/, '') : '—');
            const payV = Math.max(0, profitV) * (payoutRate / 100);
            const formPayV = Number.isInteger(payV) ? payV : payV.toFixed(2);
 
            html += `<div style="background:${t.bg};border:1px solid ${t.border};border-radius:12px;padding:14px 18px;display:flex;flex-direction:column;gap:8px;">` +
                `<span style="font-size:0.8rem;font-weight:800;color:${t.color};text-transform:uppercase;border-bottom:1px solid ${t.border};padding-bottom:6px;">${title} Format</span>`;
            if (t.perParent) {
                html += `<div style="display:flex;justify-content:space-between;align-items:center;">` +
                    `<span style="font-size:0.8rem;font-weight:600;color:#475569;">Per ${t.parentLabel}</span>` +
                    `<span style="font-weight:700;color:#334155;">${t.perParent} ${title}(s)</span></div>`;
            }
            
            html += `<div style="display:flex;justify-content:space-between;align-items:center;">` +
                `<span style="font-size:0.8rem;font-weight:600;color:#475569;">Cost per ${title}</span>` +
                `<span style="font-weight:700;color:#334155;">₦${Math.round(costV).toLocaleString()}</span></div>` +
                `<div style="display:flex;justify-content:space-between;align-items:center;">` +
                `<span style="font-size:0.8rem;font-weight:600;color:#475569;">Profit</span>` +
                `<span style="font-weight:700;color:#334155;">${profitV > 0 ? '₦' + Math.round(profitV).toLocaleString() : '—'}</span></div>` +
                `<div style="display:flex;justify-content:space-between;align-items:center;">` +
                `<span style="font-size:0.8rem;font-weight:600;color:#475569;">Margin</span>` +
                `<span style="font-weight:700;color:#334155;">${profitPctV}%</span></div>` +
                `<div style="display:flex;justify-content:space-between;align-items:center;">` +
                `<span style="font-size:0.8rem;font-weight:600;color:#475569;">Retail Price</span>` +
                `<span style="font-size:1.1rem;font-weight:900;color:${t.color};">₦${price > 0 ? Math.round(price).toLocaleString() : '0'}</span></div>`;
            if (payoutEnabled) {
                html += `<div style="display:flex;justify-content:space-between;align-items:center;">` +
                    `<span style="font-size:0.75rem;font-weight:600;color:#64748b;text-transform:uppercase;">Payout</span>` +
                    `<span style="font-weight:700;color:#16a34a;font-size:0.85rem;">+₦${formPayV} (${payoutRate}%)</span></div>`;
            }
            html += `</div>`;
        });

        html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;background:#faf5ff;border-radius:12px;border:1px solid #d8b4fe;margin-top:6px;">` +
            `<div>` +
            `<span style="font-size:0.8rem;font-weight:800;color:#6b21a8;text-transform:uppercase;display:block;">User Flexible Price</span>` +
            `<span style="font-size:0.72rem;color:#7c3aed;font-weight:500;display:block;margin-top:2px;text-align:left;">Allow user to input custom price in shop</span>` +
            `</div>` +
            `<div style="display:flex;align-items:center;gap:12px;">` +
            (p.allowUserFlexiblePricing ? `<button onclick="window.openFlexibleVariantsModal('${p.name.replace(/'/g, "\\'")}', '${p.dateAdded}')" style="background:transparent;border:none;color:#6b21a8;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:4px;" title="Edit Containers"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg></button>` : '') +
            `<label class="switch" style="position: relative; display: inline-block; width: 44px; height: 24px; margin-bottom: 0;">` +
            `<input type="checkbox" id="pdDetailsIsFlexibleToggle" ${p.allowUserFlexiblePricing ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;" onchange="window.toggleProductFlexibleState('${p.name.replace(/'/g, "\\'")}', '${p.dateAdded}', this.checked)">` +
            `<span class="slider round" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: ${p.allowUserFlexiblePricing ? '#7c3aed' : '#cbd5e1'}; transition: .4s; border-radius: 34px;">` +
            `<span class="knob" style="position: absolute; height: 16px; width: 16px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; transform: ${p.allowUserFlexiblePricing ? 'translateX(20px)' : 'translateX(0)'};"></span>` +
            `</span>` +
            `</label></div></div>`;

        html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;margin-top:6px;">` +
            `<span style="font-size:0.8rem;font-weight:700;color:#64748b;text-transform:uppercase;">Date Added</span>` +
            `<span style="font-weight:600;color:#475569;font-size:0.9rem;">${dateStr}</span></div>`;
    }

    container.innerHTML = html;
}

// ============================================================
// Bind action buttons
// ============================================================
function _pdBindButtons(p) {
    // Clone to remove stale listeners
    ['pdInitStockBtn', 'pdInitTopUpBtn', 'pdUndoTopUpBtn', 'pdInitEditPriceBtn', 'pdInitClearBtn', 'pdInitDeleteBtn',
        'pdCancelActionBtn', 'pdConfirmActionBtn', 'pdSaveEditPriceBtn'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const clone = el.cloneNode(true);
        el.parentNode.replaceChild(clone, el);
    });

    const undoBtn = document.getElementById('pdUndoTopUpBtn');
    if (undoBtn) {
        if (p.topUpHistory && p.topUpHistory.length > 1) {
            undoBtn.style.display = 'block';
        } else {
            undoBtn.style.display = 'none';
        }
    }

    document.getElementById('pdInitStockBtn')?.addEventListener('click', () => _pdOpenStockView(p));
    document.getElementById('pdInitTopUpBtn')?.addEventListener('click', () => _pdOpenActionPin('top_up'));
    document.getElementById('pdUndoTopUpBtn')?.addEventListener('click', () => _pdOpenActionPin('undo_top_up'));
    document.getElementById('pdInitEditPriceBtn')?.addEventListener('click', () => _pdOpenActionPin('edit_price'));
    document.getElementById('pdInitEditImageBtn')?.addEventListener('click', () => _pdOpenActionPin('edit_image'));
    document.getElementById('pdInitClearBtn')?.addEventListener('click', () => _pdOpenActionPin('clear'));
    document.getElementById('pdInitDeleteBtn')?.addEventListener('click', () => _pdOpenActionPin('delete'));

    document.getElementById('pdCancelActionBtn')?.addEventListener('click', () => _pdShowView('productDetailsView'));

    document.getElementById('pdConfirmActionBtn')?.addEventListener('click', () => {
        const pwdInput = document.getElementById('pdActionPasswordInput');
        const requiredPin = localStorage.getItem('nd_delete_pin') || '1234';
        if (!pwdInput || pwdInput.value !== requiredPin) {
            if (pwdInput) {
                pwdInput.style.borderColor = '#ef4444';
                setTimeout(() => pwdInput.style.borderColor = '#fca5a5', 1000);
            }
            return;
        }
        if (window._pdCurrentAction === 'edit_price') {
            _pdOpenEditPriceForm();
        } else if (window._pdCurrentAction === 'edit_image') {
            _pdOpenEditImageForm();
        } else if (window._pdCurrentAction === 'clear') {
            _pdExecuteClear();
        } else if (window._pdCurrentAction === 'delete') {
            _pdExecuteDelete();
        } else if (window._pdCurrentAction === 'top_up') {
            closeProductDetailsModal();
            setTimeout(() => window.openTopUpModal(p.id || p.name), 50);
        } else if (window._pdCurrentAction === 'undo_top_up') {
            _pdExecuteUndoTopUp();
        }
    });

    document.getElementById('pdSaveEditPriceBtn')?.addEventListener('click', _pdSaveEditPrice);
}

// ============================================================
// PIN confirmation view
// ============================================================
function _pdOpenActionPin(actionType) {
    window._pdCurrentAction = actionType;
    _pdShowView('productActionConfirmView');

    const svgDel = document.getElementById('pdActionSvgDelete');
    const svgClear = document.getElementById('pdActionSvgClear');
    const svgEdit = document.getElementById('pdActionSvgEdit');
    const title = document.getElementById('pdActionTitle');
    const desc = document.getElementById('pdActionDesc');
    const iconWrapper = document.getElementById('pdActionIcon');
    const btn = document.getElementById('pdConfirmActionBtn');

    [svgDel, svgClear, svgEdit].forEach(s => { if (s) s.style.display = 'none'; });

    if (actionType === 'delete') {
        if (svgDel) svgDel.style.display = 'block';
        title.textContent = 'Delete Product?';
        desc.innerHTML = `Are you sure? This will <strong>completely erase</strong> the product and all its records.`;
        iconWrapper.style.cssText = 'width:64px;height:64px;background:#fef2f2;color:#ef4444;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 20px rgba(0,0,0,0.05);';
        btn.textContent = 'Delete';
        btn.className = 'admin-modern-btn danger';
    } else if (actionType === 'clear') {
        if (svgClear) svgClear.style.display = 'block';
        title.textContent = 'Hide Product?';
        desc.innerHTML = `This will hide the product from the list but <strong>keep its history</strong> in records.`;
        iconWrapper.style.cssText = 'width:64px;height:64px;background:#fffbeb;color:#f59e0b;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 20px rgba(0,0,0,0.05);';
        btn.textContent = 'Hide';
        btn.className = 'admin-modern-btn';
        btn.style.cssText = 'flex:1;background:#f59e0b;color:white;border-color:#d97706;';
    } else if (actionType === 'edit_price') {
        if (svgEdit) svgEdit.style.display = 'block';
        title.textContent = 'Edit Price?';
        desc.textContent = 'Enter your PIN to edit this product\'s retail pricing.';
        iconWrapper.style.cssText = 'width:64px;height:64px;background:#f0f4f8;color:#6366f1;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 20px rgba(0,0,0,0.05);';
        btn.textContent = 'Enter Edit Mode';
        btn.className = 'admin-modern-btn';
        btn.style.cssText = 'flex:1;background:#8b5cf6;color:white;border-color:#8b5cf6;';
    } else if (actionType === 'edit_image') {
        if (svgEdit) svgEdit.style.display = 'block';
        title.textContent = 'Edit Image?';
        desc.textContent = 'Enter your PIN to upload or remove this product\'s image.';
        iconWrapper.style.cssText = 'width:64px;height:64px;background:#f0f4f8;color:#6366f1;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 20px rgba(0,0,0,0.05);';
        btn.textContent = 'Enter Edit Mode';
        btn.className = 'admin-modern-btn';
        btn.style.cssText = 'flex:1;background:#6366f1;color:white;border-color:#6366f1;';
    } else if (actionType === 'undo_top_up') {
        if (svgClear) svgClear.style.display = 'block';
        title.textContent = 'Undo Last Top Up?';
        desc.innerHTML = `This will revert the most recent top up, deducting its cost and quantity.`;
        iconWrapper.style.cssText = 'width:64px;height:64px;background:#fffbeb;color:#f59e0b;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 20px rgba(0,0,0,0.05);';
        btn.textContent = 'Undo';
        btn.className = 'admin-modern-btn';
        btn.style.cssText = 'flex:1;background:#f59e0b;color:white;border-color:#d97706;';
    }

    const pinInp = document.getElementById('pdActionPasswordInput');
    if (pinInp) { pinInp.value = ''; pinInp.focus(); }
}

// ============================================================
// Stock view
// ============================================================
function _pdOpenStockView(p) {
    _pdShowView('productStockView');
    const dyn = document.getElementById('pdStockDynamicContent');
    if (dyn) dyn.innerHTML = '<div style="text-align:center;padding:20px;color:#64748b;">Calculating inventory...</div>';
    setTimeout(() => _pdCalculateStock(p), 50);
}

function _pdCalculateStock(p) {
    const dyn = document.getElementById('pdStockDynamicContent');
    if (!dyn) return;

    let sales = [], allProducts = [];
    try { sales = JSON.parse(localStorage.getItem('nd_sales_history') || '[]'); } catch (e) { }
    try { allProducts = JSON.parse(localStorage.getItem('nd_products_data') || '[]'); } catch (e) { }

    let oldestDateAdded = p.dateAdded ? new Date(p.dateAdded).getTime() : null;
    const filteredSales = oldestDateAdded ? sales.filter(sale => window.parseSaleDate(sale.date || sale.timestamp) >= oldestDateAdded) : sales;

    let html = '';

    if (p.isSpecial || p.packTypes) {
        const s = p.structure || {};
        const cpb = parseInt(s.custardsPerBag) || 1;
        const cpc = parseInt(s.cupsPerCustard) || 1;
        const maxCPB = cpb * cpc;
        const bagT = (p.isFlexible && p.packTypes && p.packTypes.c1 && p.packTypes.c1.title) ? p.packTypes.c1.title : ((p.packTypes && p.packTypes.bag && p.packTypes.bag.title) || (p.packTypes && p.packTypes.c1 && p.packTypes.c1.title) || p.bulkUnit || 'Container 1');
        const cusT = (p.isFlexible && p.packTypes && p.packTypes.c2 && p.packTypes.c2.title) ? p.packTypes.c2.title : ((p.packTypes && p.packTypes.custard && p.packTypes.custard.title) || (p.packTypes && p.packTypes.c2 && p.packTypes.c2.title) || 'Container 2');
        const cupT = (p.isFlexible && p.packTypes && p.packTypes.c3 && p.packTypes.c3.title) ? p.packTypes.c3.title : ((p.packTypes && p.packTypes.cup && p.packTypes.cup.title) || (p.packTypes && p.packTypes.c3 && p.packTypes.c3.title) || 'Container 3');

        let totalBags = 0;
        allProducts.forEach(item => { if (!item.isDeleted && item.id === p.id && (item.isSpecial || item.packTypes)) totalBags += (parseFloat(item.boughtQuantity) || 1); });

        let sBags = 0, sCus = 0, sCups = 0;
        filteredSales.forEach(sale => {
            if (sale.item) {
                const saleBaseName = sale.item.split(' (')[0].trim();
                const isMatch = sale.productId ? sale.productId === p.id : (saleBaseName.toLowerCase() === p.name.toLowerCase());
                if (isMatch) {
                    if (sale.item === p.name + ' (' + bagT + ')') sBags += parseFloat(sale.qty) || 0;
                    else if (sale.item === p.name + ' (' + cusT + ')') sCus += parseFloat(sale.qty) || 0;
                    else if (sale.item === p.name + ' (' + cupT + ')') sCups += parseFloat(sale.qty) || 0;
                }
            }
        });

        const bought = totalBags * maxCPB;
        const sold = (sBags * maxCPB) + (sCus * cpc) + sCups;
        const rem = Math.round(bought - sold);
        const isOut = rem <= 0;
        const isLow = !isOut && window.checkProductRunningLow && window.checkProductRunningLow(p.id);
        const rB = Math.floor(rem / maxCPB);
        const rC = Math.floor((rem % maxCPB) / cpc);
        const rU = rem % cpc;

        html = `<div style="background:${isOut ? '#fef2f2' : (isLow ? '#fefce8' : '#f0fdf4')};border:1px solid ${isOut ? '#fecdd3' : (isLow ? '#fde047' : '#bbf7d0')};border-radius:12px;padding:16px;text-align:center;margin-bottom:24px;">` +
            `<h4 style="margin:0 0 8px 0;color:${isOut ? '#e11d48' : (isLow ? '#a16207' : '#16a34a')};font-size:1.2rem;font-weight:800;">${isOut ? 'OUT OF STOCK' : (isLow ? 'RUNNING LOW' : 'IN STOCK')}</h4>` +
            `<p style="margin:0;color:${isOut ? '#be123c' : (isLow ? '#854d0e' : '#15803d')};font-size:0.9rem;font-weight:700;">Remaining: ` +
            (rB > 0 ? rB + ' ' + bagT + '(s) ' : '') + (rC > 0 ? rC + ' ' + cusT + '(s) ' : '') + (rU > 0 ? rU + ' ' + cupT + '(s)' : '') +
            (rB <= 0 && rC <= 0 && rU <= 0 ? '0 ' + cupT + '(s)' : '') + '</p>' +
            `<div style="font-size:0.8rem;font-weight:600;color:#64748b;margin-top:6px;">Total Base Units Remaining: ${rem}</div></div>` +
            `<div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:12px;padding:16px;">` +
            `<h4 style="margin:0 0 12px 0;font-size:0.95rem;color:#1e293b;">Breakdown</h4>` +
            `<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="color:#64748b;font-size:0.9rem;">Bought (${bagT}s)</span><span style="font-weight:700;color:#0f172a;">${Number.isInteger(totalBags) ? totalBags : parseFloat(totalBags.toFixed(2))}</span></div>` +
            `<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="color:#64748b;font-size:0.9rem;">Sold (${bagT})</span><span style="font-weight:700;color:#ef4444;">- ${sBags}</span></div>` +
            `<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="color:#64748b;font-size:0.9rem;">Sold (${cusT})</span><span style="font-weight:700;color:#ef4444;">- ${sCus}</span></div>` +
            `<div style="display:flex;justify-content:space-between;"><span style="color:#64748b;font-size:0.9rem;">Sold (${cupT})</span><span style="font-weight:700;color:#ef4444;">- ${sCups}</span></div></div>`;
    } else {
        let boughtPieces = 0;
        const bulk = p.bulkUnit || 'Carton';
        const ppb = parseInt(p.pieces) || 1;
        const unit = (p.unit || 'piece').replace('per ', '');

        allProducts.forEach(item => { 
            if (!item.isDeleted && item.id === p.id && !item.isSpecial) {
                boughtPieces += (parseFloat(item.boughtQuantity) || 1) * ppb;
            }
        });
        
        let soldRetailPieces = 0;
        let soldWholesaleBulk = 0;
        
        filteredSales.forEach(sale => { 
            if (sale.item) {
                const isMatch = sale.productId ? sale.productId === p.id : (sale.item.trim().toLowerCase() === p.name.trim().toLowerCase() || sale.item.trim().toLowerCase() === `${p.name} (${bulk})`.toLowerCase());
                if (isMatch) {
                    if (sale.item === p.name) {
                        soldRetailPieces += parseFloat(sale.qty) || 0;
                    } else if (sale.item === `${p.name} (${bulk})`) {
                        soldWholesaleBulk += parseFloat(sale.qty) || 0;
                    }
                }
            }
        });

        const totalSoldPieces = soldRetailPieces + (soldWholesaleBulk * ppb);
        const rem = boughtPieces - totalSoldPieces;
        const isOut = rem <= 0;
        const isLow = !isOut && window.checkProductRunningLow && window.checkProductRunningLow(p.id);
        
        const rB = Math.floor(rem / ppb);
        const rP = rem % ppb;

        html = `<div style="background:${isOut ? '#fef2f2' : (isLow ? '#fefce8' : '#f0fdf4')};border:1px solid ${isOut ? '#fecdd3' : (isLow ? '#fde047' : '#bbf7d0')};border-radius:12px;padding:16px;text-align:center;margin-bottom:24px;">` +
            `<h4 style="margin:0 0 8px 0;color:${isOut ? '#e11d48' : (isLow ? '#a16207' : '#16a34a')};font-size:1.2rem;font-weight:800;">${isOut ? 'OUT OF STOCK' : (isLow ? 'RUNNING LOW' : 'IN STOCK')}</h4>` +
            `<p style="margin:0;color:${isOut ? '#be123c' : (isLow ? '#854d0e' : '#15803d')};font-size:0.9rem;font-weight:700;">Remaining: ` +
            (rB > 0 ? rB + ' ' + bulk + '(s) ' : '') + (rP > 0 ? rP + ' ' + unit + '(s)' : '') +
            (rB <= 0 && rP <= 0 ? '0 ' + unit + '(s)' : '') + '</p>' +
            `<div style="font-size:0.8rem;font-weight:600;color:#64748b;margin-top:6px;">Total Base Units Remaining: ${Math.round(rem * 10) / 10}</div></div>` +
            `<div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:12px;padding:16px;">` +
            `<h4 style="margin:0 0 12px 0;font-size:0.95rem;color:#1e293b;">Breakdown</h4>` +
            `<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="color:#64748b;font-size:0.9rem;">Total Bought</span><span style="font-weight:700;color:#0f172a;">${boughtPieces} ${unit}(s)</span></div>` +
            `<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="color:#64748b;font-size:0.9rem;">Sold (${unit})</span><span style="font-weight:700;color:#ef4444;">- ${Math.round(soldRetailPieces * 10) / 10}</span></div>` +
            (p.wholesalePrice ? `<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="color:#64748b;font-size:0.9rem;">Sold (${bulk})</span><span style="font-weight:700;color:#ef4444;">- ${Math.round(soldWholesaleBulk * 10) / 10}</span></div>` : '') +
            `<div style="display:flex;justify-content:space-between;border-top:1px dashed #cbd5e1;padding-top:8px;"><span style="color:#64748b;font-size:0.9rem;font-weight:600;">Total Sold (In ${unit}s)</span><span style="font-weight:800;color:#ef4444;">- ${Math.round(totalSoldPieces * 10) / 10}</span></div></div>`;
    }

    dyn.innerHTML = html;
}

// ============================================================
// Edit Image form
// ============================================================
function _pdOpenEditImageForm() {
    _pdShowView('productEditImageView');
    const p = window._pdCurrentProduct;
    if (!p) return;

    // Image initialization
    const imgDataHidden = document.getElementById('pdEditImageData');
    const previewContainer = document.getElementById('pdEditImagePreviewContainer');
    const previewImg = document.getElementById('pdEditImagePreview');
    const placeholder = document.querySelector('#pdEditImageUploadContainer .upload-placeholder');
    
    if (imgDataHidden) imgDataHidden.value = p.imageData || '';
    if (p.imageData && previewContainer && previewImg && placeholder) {
        previewImg.src = p.imageData;
        previewContainer.style.display = 'block';
        placeholder.style.display = 'none';
    } else if (previewContainer && placeholder) {
        previewContainer.style.display = 'none';
        placeholder.style.display = 'flex';
        if (previewImg) previewImg.src = '';
    }
}

function _pdSaveEditImage() {
    const p = window._pdCurrentProduct;
    if (!p) return;

    const newImageData = document.getElementById('pdEditImageData')?.value || '';

    let products = JSON.parse(localStorage.getItem('nd_products_data') || '[]');
    let updated = false;

    // Update all entries of the same product name
    products.forEach(item => {
        if (item.name === p.name) {
            item.imageData = newImageData;
            updated = true;
        }
    });

    if (updated) {
        localStorage.setItem('nd_products_data', JSON.stringify(products));
        
        // Show success
        _pdShowView('productActionSuccessView');
        const desc = document.getElementById('pdSuccessDesc');
        if (desc) desc.textContent = 'Product image updated successfully.';

        // Re-render lists in background
        if (typeof window.renderAdminProductListGlobal === 'function') window.renderAdminProductListGlobal();
        if (typeof window.renderRestockListGlobal === 'function') window.renderRestockListGlobal();
    }
}

// ============================================================
// Edit Price form
// ============================================================
function _pdOpenEditPriceForm() {
    _pdShowView('productEditPriceFormView');
    const p = window._pdCurrentProduct;
    if (!p) return;

    const defContainer = document.getElementById('pdEditPriceDefaultContainer');
    const anaContainer = document.getElementById('pdEditPriceAnalyticalContainer');

    if (p.isSpecial || p.packTypes) {
        if (defContainer) defContainer.style.display = 'none';
        if (anaContainer) anaContainer.style.display = 'flex';

        const bagTitle = (p.isFlexible && p.packTypes && p.packTypes.c1 && p.packTypes.c1.title) ? p.packTypes.c1.title : ((p.packTypes && p.packTypes.bag && p.packTypes.bag.title) || (p.packTypes && p.packTypes.c1 && p.packTypes.c1.title) || p.bulkUnit || 'Container 1');
        const custardTitle = (p.isFlexible && p.packTypes && p.packTypes.c2 && p.packTypes.c2.title) ? p.packTypes.c2.title : ((p.packTypes && p.packTypes.custard && p.packTypes.custard.title) || (p.packTypes && p.packTypes.c2 && p.packTypes.c2.title) || 'Container 2');
        const cupTitle = (p.isFlexible && p.packTypes && p.packTypes.c3 && p.packTypes.c3.title) ? p.packTypes.c3.title : ((p.packTypes && p.packTypes.cup && p.packTypes.cup.title) || (p.packTypes && p.packTypes.c3 && p.packTypes.c3.title) || 'Container 3');
        const s = p.structure || {};

        _setVal('pdEditPriceAnaBagTitleText', bagTitle);
        _setVal('pdEditPriceAnaCustardTitleText', custardTitle);
        _setVal('pdEditPriceAnaCupTitleText', cupTitle);

        // REAL-TIME UPDATE LOGIC (Just like Top Up)
        const updateEditPriceTiers = () => {
            const t1 = document.getElementById('pdEditPriceAnaBagTitleText')?.value || 'Container 1';
            const t2 = document.getElementById('pdEditPriceAnaCustardTitleText')?.value || 'Container 2';
            const t3 = document.getElementById('pdEditPriceAnaCupTitleText')?.value || 'Container 3';

            // Update all labels with class indicators
            document.querySelectorAll('.pdEditPriceAnaBagLbl').forEach(el => el.textContent = t1);
            document.querySelectorAll('.pdEditPriceAnaCustardLbl').forEach(el => el.textContent = t2);
            document.querySelectorAll('.pdEditPriceAnaCupLbl').forEach(el => el.textContent = t3);

            // Update selector tab labels
            const t1Span = document.querySelector('#lblPdEditT1 span');
            if (t1Span) t1Span.textContent = t1;
            const t2Span = document.querySelector('#lblPdEditT2 span');
            if (t2Span) t2Span.textContent = t2;
            const t3Span = document.querySelector('#lblPdEditT3 span');
            if (t3Span) t3Span.textContent = t3;
        };

        // Attach listeners for real-time updates
        ['pdEditPriceAnaBagTitleText', 'pdEditPriceAnaCustardTitleText', 'pdEditPriceAnaCupTitleText'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', updateEditPriceTiers);
        });

        // Run initial update
        updateEditPriceTiers();

        // FIX: Populate analytical product name (was blank)
        _setVal('pdEditPriceAnaName', p.name || '');

        // Setup Strict Isolation Tier Tabs
        const radios = document.querySelectorAll('input[name="pdEditTier"]');
        const labels = [
            document.getElementById('lblPdEditT1'),
            document.getElementById('lblPdEditT2'),
            document.getElementById('lblPdEditT3')
        ];
        
        const bagBlock = document.getElementById('pdEditPriceAnaBagTitleText') ? document.getElementById('pdEditPriceAnaBagTitleText').closest('div[style*="border-radius: 12px"]') : null;
        const custardBlock = document.getElementById('pdEditPriceAnaCustardTitleText') ? document.getElementById('pdEditPriceAnaCustardTitleText').closest('div[style*="border-radius: 12px"]') : null;
        const cupBlock = document.getElementById('pdEditPriceAnaCupTitleText') ? document.getElementById('pdEditPriceAnaCupTitleText').closest('div[style*="border-radius: 12px"]') : null;

        const updateTabVisibility = (val) => {
            if (val === "1") {
                if (bagBlock) bagBlock.style.display = 'block';
                if (custardBlock) custardBlock.style.display = 'block';
                if (cupBlock) cupBlock.style.display = 'block';
            } else if (val === "2") {
                if (bagBlock) bagBlock.style.display = 'none';
                if (custardBlock) custardBlock.style.display = 'block';
                if (cupBlock) cupBlock.style.display = 'block';
            } else if (val === "3") {
                if (bagBlock) bagBlock.style.display = 'none';
                if (custardBlock) custardBlock.style.display = 'none';
                if (cupBlock) cupBlock.style.display = 'block';
            }
        };

        // FIX: Remember the last selected container instead of resetting to Container 1 every time
        const lastTier = window._pdLastSelectedTier || "1";
        const targetRadio = Array.from(radios).find(r => r.value === lastTier) || radios[0];
        if (targetRadio) {
            targetRadio.checked = true;
            targetRadio.dispatchEvent(new Event('change'));
            
            // Highlight the correct label
            labels.forEach(l => l.style.borderColor = '#cbd5e1');
            const targetLabel = document.getElementById('lblPdEditT' + targetRadio.value);
            if (targetLabel) targetLabel.style.borderColor = '#6366f1';
        }

        radios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                const val = e.target.value;
                window._pdLastSelectedTier = val; // Store selection
                labels.forEach(l => l.style.borderColor = '#cbd5e1');
                document.getElementById('lblPdEditT' + val).style.borderColor = '#6366f1';
                updateTabVisibility(val);
            });
        });

        const baseCost = (parseFloat(p.purchaseCost) > 0 && parseFloat(p.boughtQuantity) > 0) ? (parseFloat(p.purchaseCost) / parseFloat(p.boughtQuantity)) : (parseFloat(p.cost) || 0);
        const cpbInit = parseInt(s.custardsPerBag || s.c2sPerC1) || 1;
        const cpcInit = parseInt(s.cupsPerCustard || s.c3sPerC2) || 1;
        _setVal('pdEditPriceAnaBagCost', baseCost || '');
        _setVal('pdEditPriceAnaCustardCost', baseCost ? parseFloat((baseCost / cpbInit).toFixed(2)) : '');
        _setVal('pdEditPriceAnaCupCost', baseCost ? parseFloat((baseCost / (cpbInit * cpcInit)).toFixed(2)) : '');

        // Sync costs and calculate margins/prices dynamically
        const bCostInput = document.getElementById('pdEditPriceAnaBagCost');
        const cCostInput = document.getElementById('pdEditPriceAnaCustardCost');
        const cuCostInput = document.getElementById('pdEditPriceAnaCupCost');
        const cpbInput = document.getElementById('pdEditPriceAnaCustardsPerBag');
        const cpcInput = document.getElementById('pdEditPriceAnaCupsPerCustard');

        const syncCostsAndCalc = (source) => {
            const vCPB = parseInt(cpbInput?.value) || 1;
            const vCPC = parseInt(cpcInput?.value) || 1;
            
            // 1. Sync Costs
            if (source === 'bag') {
                const bc = parseFloat(bCostInput?.value) || 0;
                if(cCostInput) cCostInput.value = bc > 0 ? (bc / vCPB).toFixed(2).replace(/\.?0+$/, '') : '';
                if(cuCostInput) cuCostInput.value = bc > 0 ? (bc / (vCPB * vCPC)).toFixed(2).replace(/\.?0+$/, '') : '';
            } else if (source === 'custard') {
                const cc = parseFloat(cCostInput?.value) || 0;
                if(bCostInput) bCostInput.value = cc > 0 ? (cc * vCPB).toFixed(2).replace(/\.?0+$/, '') : '';
                if(cuCostInput) cuCostInput.value = cc > 0 ? (cc / vCPC).toFixed(2).replace(/\.?0+$/, '') : '';
            } else if (source === 'cup') {
                const cuc = parseFloat(cuCostInput?.value) || 0;
                if(bCostInput) bCostInput.value = cuc > 0 ? (cuc * vCPB * vCPC).toFixed(2).replace(/\.?0+$/, '') : '';
                if(cCostInput) cCostInput.value = cuc > 0 ? (cuc * vCPC).toFixed(2).replace(/\.?0+$/, '') : '';
            }

            // 2. Calculate Final Prices and Margins
            // Bag
            const bc = parseFloat(bCostInput?.value) || 0;
            if (source === 'bag_profit') {
                const prof = parseFloat(document.getElementById('pdEditPriceAnaBagProfit')?.value) || 0;
                if(document.getElementById('pdEditPriceAnaBagProfitPct')) document.getElementById('pdEditPriceAnaBagProfitPct').value = bc > 0 && prof > 0 ? ((prof / bc) * 100).toFixed(2).replace(/\.?0+$/, '') : '';
                if(document.getElementById('pdEditPriceAnaBagPrice')) document.getElementById('pdEditPriceAnaBagPrice').value = Math.round(bc + prof);
            } else if (source === 'bag_margin') {
                const pct = parseFloat(document.getElementById('pdEditPriceAnaBagProfitPct')?.value) || 0;
                const prof = bc * (pct / 100);
                if(document.getElementById('pdEditPriceAnaBagProfit')) document.getElementById('pdEditPriceAnaBagProfit').value = prof > 0 ? prof.toFixed(2).replace(/\.?0+$/, '') : '';
                if(document.getElementById('pdEditPriceAnaBagPrice')) document.getElementById('pdEditPriceAnaBagPrice').value = Math.round(bc + prof);
            } else {
                const prof = parseFloat(document.getElementById('pdEditPriceAnaBagProfit')?.value) || 0;
                if(document.getElementById('pdEditPriceAnaBagProfitPct')) document.getElementById('pdEditPriceAnaBagProfitPct').value = bc > 0 && prof > 0 ? ((prof / bc) * 100).toFixed(2).replace(/\.?0+$/, '') : '';
                if(document.getElementById('pdEditPriceAnaBagPrice')) document.getElementById('pdEditPriceAnaBagPrice').value = Math.round(bc + prof);
            }

            // Custard
            const cc = parseFloat(cCostInput?.value) || 0;
            if(document.getElementById('pdEditPriceAnaCustardCostVal')) document.getElementById('pdEditPriceAnaCustardCostVal').textContent = '₦' + Math.round(cc).toLocaleString();
            if (source === 'custard_profit') {
                const prof = parseFloat(document.getElementById('pdEditPriceAnaCustardProfit')?.value) || 0;
                if(document.getElementById('pdEditPriceAnaCustardProfitPct')) document.getElementById('pdEditPriceAnaCustardProfitPct').value = cc > 0 && prof > 0 ? ((prof / cc) * 100).toFixed(2).replace(/\.?0+$/, '') : '';
                if(document.getElementById('pdEditPriceAnaCustardPrice')) document.getElementById('pdEditPriceAnaCustardPrice').value = (cc > 0 || prof > 0) ? Math.round(cc + prof) : '';
            } else if (source === 'custard_margin') {
                const pct = parseFloat(document.getElementById('pdEditPriceAnaCustardProfitPct')?.value) || 0;
                const prof = cc * (pct / 100);
                if(document.getElementById('pdEditPriceAnaCustardProfit')) document.getElementById('pdEditPriceAnaCustardProfit').value = prof > 0 ? prof.toFixed(2).replace(/\.?0+$/, '') : '';
                if(document.getElementById('pdEditPriceAnaCustardPrice')) document.getElementById('pdEditPriceAnaCustardPrice').value = (cc > 0 || prof > 0) ? Math.round(cc + prof) : '';
            } else {
                const prof = parseFloat(document.getElementById('pdEditPriceAnaCustardProfit')?.value) || 0;
                if(document.getElementById('pdEditPriceAnaCustardProfitPct')) document.getElementById('pdEditPriceAnaCustardProfitPct').value = cc > 0 && prof > 0 ? ((prof / cc) * 100).toFixed(2).replace(/\.?0+$/, '') : '';
                if(document.getElementById('pdEditPriceAnaCustardPrice')) document.getElementById('pdEditPriceAnaCustardPrice').value = (cc > 0 || prof > 0) ? Math.round(cc + prof) : '';
            }

            // Cup
            const cuc = parseFloat(cuCostInput?.value) || 0;
            if(document.getElementById('pdEditPriceAnaCupCostVal')) document.getElementById('pdEditPriceAnaCupCostVal').textContent = '₦' + Math.round(cuc).toLocaleString();
            if (source === 'cup_profit') {
                const prof = parseFloat(document.getElementById('pdEditPriceAnaCupProfit')?.value) || 0;
                if(document.getElementById('pdEditPriceAnaCupProfitPct')) document.getElementById('pdEditPriceAnaCupProfitPct').value = cuc > 0 && prof > 0 ? ((prof / cuc) * 100).toFixed(2).replace(/\.?0+$/, '') : '';
                if(document.getElementById('pdEditPriceAnaCupPrice')) document.getElementById('pdEditPriceAnaCupPrice').value = (cuc > 0 || prof > 0) ? Math.round(cuc + prof) : '';
            } else if (source === 'cup_margin') {
                const pct = parseFloat(document.getElementById('pdEditPriceAnaCupProfitPct')?.value) || 0;
                const prof = cuc * (pct / 100);
                if(document.getElementById('pdEditPriceAnaCupProfit')) document.getElementById('pdEditPriceAnaCupProfit').value = prof > 0 ? prof.toFixed(2).replace(/\.?0+$/, '') : '';
                if(document.getElementById('pdEditPriceAnaCupPrice')) document.getElementById('pdEditPriceAnaCupPrice').value = (cuc > 0 || prof > 0) ? Math.round(cuc + prof) : '';
            } else {
                const prof = parseFloat(document.getElementById('pdEditPriceAnaCupProfit')?.value) || 0;
                if(document.getElementById('pdEditPriceAnaCupProfitPct')) document.getElementById('pdEditPriceAnaCupProfitPct').value = cuc > 0 && prof > 0 ? ((prof / cuc) * 100).toFixed(2).replace(/\.?0+$/, '') : '';
                if(document.getElementById('pdEditPriceAnaCupPrice')) document.getElementById('pdEditPriceAnaCupPrice').value = (cuc > 0 || prof > 0) ? Math.round(cuc + prof) : '';
            }
        };

        if(bCostInput) bCostInput.addEventListener('input', () => syncCostsAndCalc('bag'));
        if(cCostInput) cCostInput.addEventListener('input', () => syncCostsAndCalc('custard'));
        if(cuCostInput) cuCostInput.addEventListener('input', () => syncCostsAndCalc('cup'));
        if(cpbInput) cpbInput.addEventListener('input', () => syncCostsAndCalc('bag'));
        if(cpcInput) cpcInput.addEventListener('input', () => syncCostsAndCalc('bag'));
        
        document.getElementById('pdEditPriceAnaBagProfit')?.addEventListener('input', () => syncCostsAndCalc('bag_profit'));
        document.getElementById('pdEditPriceAnaBagProfitPct')?.addEventListener('input', () => syncCostsAndCalc('bag_margin'));
        document.getElementById('pdEditPriceAnaCustardProfit')?.addEventListener('input', () => syncCostsAndCalc('custard_profit'));
        document.getElementById('pdEditPriceAnaCustardProfitPct')?.addEventListener('input', () => syncCostsAndCalc('custard_margin'));
        document.getElementById('pdEditPriceAnaCupProfit')?.addEventListener('input', () => syncCostsAndCalc('cup_profit'));
        document.getElementById('pdEditPriceAnaCupProfitPct')?.addEventListener('input', () => syncCostsAndCalc('cup_margin'));
        _setVal('pdEditPriceAnaBagProfit', s.bagProfit !== undefined ? s.bagProfit : (s.c1Profit !== undefined ? s.c1Profit : ''));
        _setVal('pdEditPriceAnaBagProfitPct', s.bagProfitPercent !== undefined ? s.bagProfitPercent : (s.c1ProfitPercent !== undefined ? s.c1ProfitPercent : ''));
        const bagPrice = p.packTypes ? (p.packTypes.bag ? p.packTypes.bag.price : (p.packTypes.c1 ? p.packTypes.c1.price : p.price)) : p.price;
        _setVal('pdEditPriceAnaBagPrice', bagPrice !== undefined ? bagPrice : '');

        _setVal('pdEditPriceAnaCustardsPerBag', (s.custardsPerBag || s.c2sPerC1 || ''));
        _setVal('pdEditPriceAnaCustardProfit', s.custardProfit !== undefined ? s.custardProfit : (s.c2Profit !== undefined ? s.c2Profit : ''));
        _setVal('pdEditPriceAnaCustardProfitPct', s.custardProfitPercent !== undefined ? s.custardProfitPercent : (s.c2ProfitPercent !== undefined ? s.c2ProfitPercent : ''));
        const cusPrice = p.packTypes ? (p.packTypes.custard ? p.packTypes.custard.price : (p.packTypes.c2 ? p.packTypes.c2.price : '')) : '';
        _setVal('pdEditPriceAnaCustardPrice', cusPrice);

        _setVal('pdEditPriceAnaCupsPerCustard', (s.cupsPerCustard || s.c3sPerC2 || ''));
        _setVal('pdEditPriceAnaCupProfit', s.cupProfit !== undefined ? s.cupProfit : (s.c3Profit !== undefined ? s.c3Profit : ''));
        _setVal('pdEditPriceAnaCupProfitPct', s.cupProfitPercent !== undefined ? s.cupProfitPercent : (s.c3ProfitPercent !== undefined ? s.c3ProfitPercent : ''));
        const cupPriceRaw = p.packTypes ? (p.packTypes.cup ? p.packTypes.cup.price : (p.packTypes.c3 ? p.packTypes.c3.price : '')) : '';
        const cupPrice = cupPriceRaw === 'Flexible' ? '' : cupPriceRaw;
        _setVal('pdEditPriceAnaCupPrice', cupPrice);
        const isFlexibleVal = !!p.isFlexible;
        const updateFieldVisibility = (isFlex) => {
            const displayStyle = isFlex ? 'none' : 'block';
            const inlineStyle = isFlex ? 'none' : 'inline-block';
            const flexStyle = isFlex ? 'none' : 'flex';
            
            const c3Cost = document.getElementById('pdEditPriceAnaCupCost');
            if (c3Cost && c3Cost.closest('.form-group')) c3Cost.closest('.form-group').style.display = displayStyle;
            
            const c3CostVal = document.getElementById('pdEditPriceAnaCupCostVal');
            if (c3CostVal && c3CostVal.parentElement) c3CostVal.parentElement.style.display = inlineStyle;
            
            const c3Profit = document.getElementById('pdEditPriceAnaCupProfit');
            if (c3Profit && c3Profit.closest('div[style*="gap: 10px"]')) c3Profit.closest('div[style*="gap: 10px"]').style.display = flexStyle;
            
            const c3Price = document.getElementById('pdEditPriceAnaCupPrice');
            if (c3Price && c3Price.closest('.form-group')) c3Price.closest('.form-group').style.display = displayStyle;
        };
        updateFieldVisibility(isFlexibleVal);

        // Initial trigger
        syncCostsAndCalc('init');

        const flexPricingSwitch = document.getElementById('pdEditFlexiblePricingSwitch');
        if (flexPricingSwitch) {
            flexPricingSwitch.checked = !!p.allowUserFlexiblePricing;
            const slider = flexPricingSwitch.nextElementSibling;
            if (slider) {
                slider.style.backgroundColor = flexPricingSwitch.checked ? '#c026d3' : '#cbd5e1';
                const knob = slider.querySelector('.knob');
                if (knob) knob.style.transform = flexPricingSwitch.checked ? 'translateX(20px)' : 'translateX(0)';
            }
        }

        // Stock badge dropdown
        const badgeTrig = document.querySelector('#pdStockStatusDropdownTrigger .trigger-text');
        const badgeHidden = document.getElementById('pdEditPriceStockStatus');
        const currentBadge = p.isNewStock ? 'new' : (p.isOldStock ? 'old' : 'none');
        if (badgeHidden) badgeHidden.value = currentBadge;
        if (badgeTrig) {
            const label = { none: 'Normal (No Badge)', new: 'Mark as NEW STOCK', old: 'Mark as OLD STOCK' };
            badgeTrig.textContent = label[currentBadge] || 'Normal (No Badge)';
        }
        document.querySelectorAll('#pdStockStatusDropdownMenu .custom-dropdown-option').forEach(opt => {
            opt.classList.toggle('active', opt.getAttribute('data-value') === currentBadge);
            opt.onclick = (e) => {
                e.stopPropagation();
                const val = opt.getAttribute('data-value');
                if (badgeHidden) badgeHidden.value = val;
                if (badgeTrig) {
                    const label = { none: 'Normal (No Badge)', new: 'Mark as NEW STOCK', old: 'Mark as OLD STOCK' };
                    badgeTrig.textContent = label[val] || val;
                }
                document.querySelectorAll('#pdStockStatusDropdownMenu .custom-dropdown-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                document.getElementById('pdStockStatusDropdownWrapper')?.classList.remove('open');
            };
        });
        document.getElementById('pdStockStatusDropdownTrigger')?.addEventListener('click', () => {
            document.getElementById('pdStockStatusDropdownWrapper')?.classList.toggle('open');
        });

    } else {
        if (anaContainer) anaContainer.style.display = 'none';
        if (defContainer) defContainer.style.display = 'flex';

        const bulkName = p.bulkUnit || 'Carton';
        const unitVal  = p.unit || 'per piece';
        const unitWord = unitVal.replace('per ', '');
        const pieces   = parseInt(p.pieces) || 1;

        // FIX 1: Use same cost reconstruction as Top Up (p.cost × pieces for default, but custom already uses p.cost as bulk cost)
        const perBulkCost = p.isCustom
            ? parseFloat(p.cost) || 0
            : (parseFloat(p.cost) > 0 
                ? parseFloat(p.cost) * pieces 
                : (parseFloat(p.purchaseCost) / (parseFloat(p.boughtQuantity) || 1)) || 0);

        // Update all dynamic labels
        if (document.getElementById('pdEditPriceDefBulkLabel'))        document.getElementById('pdEditPriceDefBulkLabel').textContent = bulkName;
        if (document.getElementById('pdEditPriceDefBulkLabel2'))       document.getElementById('pdEditPriceDefBulkLabel2').textContent = bulkName;
        if (document.getElementById('pdEditPriceDefWholesaleBulkLabel'))  document.getElementById('pdEditPriceDefWholesaleBulkLabel').textContent = bulkName;
        if (document.getElementById('pdEditPriceDefWholesaleBulkLabel2')) document.getElementById('pdEditPriceDefWholesaleBulkLabel2').textContent = bulkName;
        if (document.getElementById('pdEditPriceDefRetailUnitLabel'))  document.getElementById('pdEditPriceDefRetailUnitLabel').textContent = unitWord.charAt(0).toUpperCase() + unitWord.slice(1) + 's';
        if (document.getElementById('pdEditPriceDefRetailUnitLabel2')) document.getElementById('pdEditPriceDefRetailUnitLabel2').textContent = unitWord;
        if (document.getElementById('pdEditPriceDefRetailUnitLabel3')) document.getElementById('pdEditPriceDefRetailUnitLabel3').textContent = unitWord;

        // FIX 2: Pre-fill product name (was never set before)
        _setVal('pdEditPriceDefName', p.name || '');
        _setVal('pdEditPriceDefBulkCost', perBulkCost > 0 ? perBulkCost : '');
        _setVal('pdEditPriceDefPieces', pieces);
        _setVal('pdEditPriceDefProfit', p.profit !== undefined && p.profit !== 0 ? p.profit : '');
        _setVal('pdEditPriceDefProfitPercent', p.profitPercent !== undefined && p.profitPercent !== 0 ? p.profitPercent : '');
        _setVal('pdEditPriceDefPrice', p.price || '');
        _setVal('pdEditPriceDefWholesaleProfit', p.wholesaleProfit !== undefined && p.wholesaleProfit !== 0 ? p.wholesaleProfit : '');
        _setVal('pdEditPriceDefWholesaleProfitPercent', p.wholesaleProfitPercent !== undefined && p.wholesaleProfitPercent !== 0 ? p.wholesaleProfitPercent : '');
        _setVal('pdEditPriceDefWholesalePrice', p.wholesalePrice || '');

        // FIX 3: Bulk dropdown — trigger text + hidden value + mark active option
        const bulkTrig = document.querySelector('#pdEditPriceBulkDropdownTrigger .trigger-text');
        if (bulkTrig) bulkTrig.textContent = bulkName;
        const bulkHidden = document.getElementById('pdEditPriceBulkUnitSelect');
        if (bulkHidden) bulkHidden.value = bulkName;
        document.querySelectorAll('#pdEditPriceBulkDropdownMenu .custom-dropdown-option').forEach(o => {
            o.classList.toggle('active', o.getAttribute('data-value') === bulkName);
        });

        // FIX 3: Unit dropdown — trigger text + hidden value + mark active option
        const unitTrig = document.querySelector('#pdEditPriceUnitDropdownTrigger .trigger-text');
        if (unitTrig) unitTrig.textContent = unitVal;
        const unitHidden = document.getElementById('pdEditPriceUnitSelect');
        if (unitHidden) unitHidden.value = unitVal;
        document.querySelectorAll('#pdEditPriceUnitDropdownMenu .custom-dropdown-option').forEach(o => {
            o.classList.toggle('active', o.getAttribute('data-value') === unitVal);
        });

        // Toggle Custom vs Default fields
        const retailProfitFlex = document.getElementById('pdEditPriceDefRetailProfitFlex');
        const wholesaleBlock = document.getElementById('pdEditPriceDefWholesaleBlock');
        const retailCostBlock = document.getElementById('pdEditPriceDefRetailCostBlock');
        const retailHeader = document.getElementById('pdEditPriceDefRetailPricingHeader');
        const priceInput = document.getElementById('pdEditPriceDefPrice');

        if (p.isCustom) {
            if (retailProfitFlex) retailProfitFlex.style.display = 'none';
            if (wholesaleBlock) wholesaleBlock.style.display = 'none';
            if (retailCostBlock) retailCostBlock.style.display = 'none';
            if (retailHeader) retailHeader.style.display = 'none';
            if (priceInput) {
                priceInput.readOnly = false;
                priceInput.style.background = '#ffffff';
                priceInput.style.cursor = 'text';
            }
        } else {
            if (retailProfitFlex) retailProfitFlex.style.display = 'flex';
            if (wholesaleBlock) wholesaleBlock.style.display = 'block';
            if (retailCostBlock) retailCostBlock.style.display = 'inline-block';
            if (retailHeader) retailHeader.style.display = 'block';
            if (priceInput) {
                priceInput.readOnly = true;
                priceInput.style.background = '#f8fafc';
                priceInput.style.cursor = 'not-allowed';
            }
        }

        // FIX 4: Set up dropdown click handlers (bulk & unit) using onclick to avoid stale listeners
        document.getElementById('pdEditPriceBulkDropdownTrigger').onclick = () =>
            document.getElementById('pdEditPriceBulkDropdownWrapper')?.classList.toggle('open');
        document.querySelectorAll('#pdEditPriceBulkDropdownMenu .custom-dropdown-option').forEach(opt => {
            opt.onclick = (e) => {
                e.stopPropagation();
                const val = opt.getAttribute('data-value');
                if (val === '__custom_bulk__') return;
                if (bulkHidden) bulkHidden.value = val;
                if (bulkTrig)   bulkTrig.textContent = val;
                document.querySelectorAll('#pdEditPriceBulkDropdownMenu .custom-dropdown-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                document.getElementById('pdEditPriceBulkDropdownWrapper')?.classList.remove('open');
                if (document.getElementById('pdEditPriceDefBulkLabel'))  document.getElementById('pdEditPriceDefBulkLabel').textContent  = val;
                if (document.getElementById('pdEditPriceDefBulkLabel2')) document.getElementById('pdEditPriceDefBulkLabel2').textContent = val;
                if (document.getElementById('pdEditPriceDefWholesaleBulkLabel'))  document.getElementById('pdEditPriceDefWholesaleBulkLabel').textContent = val;
                if (document.getElementById('pdEditPriceDefWholesaleBulkLabel2')) document.getElementById('pdEditPriceDefWholesaleBulkLabel2').textContent = val;
            };
        });

        document.getElementById('pdEditPriceUnitDropdownTrigger').onclick = () =>
            document.getElementById('pdEditPriceUnitDropdownWrapper')?.classList.toggle('open');
        document.querySelectorAll('#pdEditPriceUnitDropdownMenu .custom-dropdown-option').forEach(opt => {
            opt.onclick = (e) => {
                e.stopPropagation();
                const val = opt.getAttribute('data-value');
                if (val === '__custom__') return;
                if (unitHidden) unitHidden.value = val;
                if (unitTrig)   unitTrig.textContent = val;
                document.querySelectorAll('#pdEditPriceUnitDropdownMenu .custom-dropdown-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                document.getElementById('pdEditPriceUnitDropdownWrapper')?.classList.remove('open');
                const uWord = val.replace('per ', '');
                if (document.getElementById('pdEditPriceDefRetailUnitLabel'))  document.getElementById('pdEditPriceDefRetailUnitLabel').textContent  = uWord.charAt(0).toUpperCase() + uWord.slice(1) + 's';
                if (document.getElementById('pdEditPriceDefRetailUnitLabel2')) document.getElementById('pdEditPriceDefRetailUnitLabel2').textContent = uWord;
                if (document.getElementById('pdEditPriceDefRetailUnitLabel3')) document.getElementById('pdEditPriceDefRetailUnitLabel3').textContent = uWord;
            };
        });

        // FIX 5: Live recalculation — cost/pieces/profit/margin all drive each other
        const recalcDef = (source) => {
            const bc   = parseFloat(document.getElementById('pdEditPriceDefBulkCost')?.value) || 0;
            const pcs  = parseInt(document.getElementById('pdEditPriceDefPieces')?.value) || 1;
            const rCost = pcs > 0 ? bc / pcs : 0;
            const rcv = document.getElementById('pdEditPriceDefRetailCostVal');
            if (rcv) rcv.textContent = '₦' + Math.round(rCost).toLocaleString();

            if (source === 'profit') {
                const prof = parseFloat(document.getElementById('pdEditPriceDefProfit')?.value) || 0;
                if (rCost > 0 && prof > 0) _setVal('pdEditPriceDefProfitPercent', ((prof / rCost) * 100).toFixed(2).replace(/\.?0+$/, ''));
                _setVal('pdEditPriceDefPrice', (rCost + prof) > 0 ? (rCost + prof).toFixed(2).replace(/\.?0+$/, '') : '');
            } else if (source === 'margin') {
                const pct  = parseFloat(document.getElementById('pdEditPriceDefProfitPercent')?.value) || 0;
                const prof = rCost * (pct / 100);
                _setVal('pdEditPriceDefProfit', prof > 0 ? prof.toFixed(2).replace(/\.?0+$/, '') : '');
                _setVal('pdEditPriceDefPrice', (rCost + prof) > 0 ? (rCost + prof).toFixed(2).replace(/\.?0+$/, '') : '');
            } else if (source === 'wholesaleProfit') {
                const wProf = parseFloat(document.getElementById('pdEditPriceDefWholesaleProfit')?.value) || 0;
                if (bc > 0 && wProf > 0) _setVal('pdEditPriceDefWholesaleProfitPercent', ((wProf / bc) * 100).toFixed(2).replace(/\.?0+$/, ''));
                _setVal('pdEditPriceDefWholesalePrice', (bc + wProf) > 0 ? Math.round(bc + wProf) : '');
            } else if (source === 'wholesaleMargin') {
                const wPct  = parseFloat(document.getElementById('pdEditPriceDefWholesaleProfitPercent')?.value) || 0;
                const wProf = bc * (wPct / 100);
                _setVal('pdEditPriceDefWholesaleProfit', wProf > 0 ? wProf.toFixed(2).replace(/\.?0+$/, '') : '');
                _setVal('pdEditPriceDefWholesalePrice', (bc + wProf) > 0 ? Math.round(bc + wProf) : '');
            } else {
                // cost or pieces changed — keep existing profit, recalculate margin and final price
                if (!p.isCustom) {
                    const prof = parseFloat(document.getElementById('pdEditPriceDefProfit')?.value) || 0;
                    if (rCost > 0 && prof > 0) _setVal('pdEditPriceDefProfitPercent', ((prof / rCost) * 100).toFixed(2).replace(/\.?0+$/, ''));
                    _setVal('pdEditPriceDefPrice', (rCost + prof) > 0 ? Math.round(rCost + prof) : '');
                    
                    const wProf = parseFloat(document.getElementById('pdEditPriceDefWholesaleProfit')?.value) || 0;
                    if (bc > 0 && wProf > 0) _setVal('pdEditPriceDefWholesaleProfitPercent', ((wProf / bc) * 100).toFixed(2).replace(/\.?0+$/, ''));
                    _setVal('pdEditPriceDefWholesalePrice', (bc + wProf) > 0 ? Math.round(bc + wProf) : '');
                }
            }
        };

        // Use onclick so repeated opens don't stack listeners
        document.getElementById('pdEditPriceDefBulkCost').oninput       = () => recalcDef('cost');
        document.getElementById('pdEditPriceDefPieces').oninput          = () => recalcDef('pieces');
        document.getElementById('pdEditPriceDefProfit').oninput          = () => recalcDef('profit');
        document.getElementById('pdEditPriceDefProfitPercent').oninput   = () => recalcDef('margin');
        document.getElementById('pdEditPriceDefWholesaleProfit').oninput          = () => recalcDef('wholesaleProfit');
        document.getElementById('pdEditPriceDefWholesaleProfitPercent').oninput   = () => recalcDef('wholesaleMargin');

        // FIX 6: Fire initial recalc so the Retail Cost display and Final Price are correct on open
        recalcDef('cost');

        const flexPricingSwitchDef = document.getElementById('pdEditFlexiblePricingSwitch');
        if (flexPricingSwitchDef) {
            flexPricingSwitchDef.checked = !!p.allowUserFlexiblePricing;
            const slider = flexPricingSwitchDef.nextElementSibling;
            if (slider) {
                slider.style.backgroundColor = flexPricingSwitchDef.checked ? '#c026d3' : '#cbd5e1';
                const knob = slider.querySelector('.knob');
                if (knob) knob.style.transform = flexPricingSwitchDef.checked ? 'translateX(20px)' : 'translateX(0)';
            }
        }

        // Stock badge dropdown
        const badgeTrig = document.querySelector('#pdStockStatusDropdownTrigger .trigger-text');
        const badgeHidden = document.getElementById('pdEditPriceStockStatus');
        const currentBadge = p.isNewStock ? 'new' : (p.isOldStock ? 'old' : 'none');
        if (badgeHidden) badgeHidden.value = currentBadge;
        if (badgeTrig) {
            const label = { none: 'Normal (No Badge)', new: 'Mark as NEW STOCK', old: 'Mark as OLD STOCK' };
            badgeTrig.textContent = label[currentBadge] || 'Normal (No Badge)';
        }
        document.querySelectorAll('#pdStockStatusDropdownMenu .custom-dropdown-option').forEach(opt => {
            opt.classList.toggle('active', opt.getAttribute('data-value') === currentBadge);
            opt.onclick = (e) => {
                e.stopPropagation();
                const val = opt.getAttribute('data-value');
                if (badgeHidden) badgeHidden.value = val;
                if (badgeTrig) {
                    const label = { none: 'Normal (No Badge)', new: 'Mark as NEW STOCK', old: 'Mark as OLD STOCK' };
                    badgeTrig.textContent = label[val] || val;
                }
                document.querySelectorAll('#pdStockStatusDropdownMenu .custom-dropdown-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                document.getElementById('pdStockStatusDropdownWrapper')?.classList.remove('open');
            };
        });
        document.getElementById('pdStockStatusDropdownTrigger').onclick = () =>
            document.getElementById('pdStockStatusDropdownWrapper')?.classList.toggle('open');
    }
}
// ============================================================
// Save edit price
// ============================================================
function _pdSaveEditPrice() {
    let products = JSON.parse(localStorage.getItem('nd_products_data') || '[]');
    const p = window._pdCurrentProduct;
    const index = p.id ? products.findIndex(item => item.id === p.id) : products.findIndex(item => item.name === p.name && item.dateAdded === p.dateAdded);
    if (index === -1) { alert('Product reference not found!'); return; }

    const badgeVal = document.getElementById('pdEditPriceStockStatus')?.value || 'none';
    products[index].isNewStock = badgeVal === 'new';
    products[index].isOldStock = badgeVal === 'old';

    const flexPricingSwitch = document.getElementById('pdEditFlexiblePricingSwitch');
    if (flexPricingSwitch) {
        products[index].allowUserFlexiblePricing = flexPricingSwitch.checked;
    }

    if (p.isSpecial || p.packTypes) {
        const bagTitle = document.getElementById('pdEditPriceAnaBagTitleText')?.value.trim() || 'Container 1';
        const custardTitle = document.getElementById('pdEditPriceAnaCustardTitleText')?.value.trim() || 'Container 2';
        const cupTitle = document.getElementById('pdEditPriceAnaCupTitleText')?.value.trim() || 'Container 3';
        const cpb = parseInt(document.getElementById('pdEditPriceAnaCustardsPerBag')?.value) || 1;
        const cpc = parseInt(document.getElementById('pdEditPriceAnaCupsPerCustard')?.value) || 1;
        const isFlexible = !!products[index].isFlexible;

        products[index].isFlexible = isFlexible;
        products[index].structure = products[index].structure || {};
        
        // Save both sets of properties to support analytical inventory logic and standard flexible structure
        products[index].structure.custardsPerBag = cpb;
        products[index].structure.c2sPerC1 = cpb;
        products[index].structure.cupsPerCustard = cpc;
        products[index].structure.c3sPerC2 = cpc;
        
        products[index].structure.bagProfit = parseFloat(document.getElementById('pdEditPriceAnaBagProfit')?.value) || 0;
        products[index].structure.c1Profit = parseFloat(document.getElementById('pdEditPriceAnaBagProfit')?.value) || 0;
        products[index].structure.bagProfitPercent = parseFloat(document.getElementById('pdEditPriceAnaBagProfitPct')?.value) || 0;
        products[index].structure.c1ProfitPercent = parseFloat(document.getElementById('pdEditPriceAnaBagProfitPct')?.value) || 0;
        
        products[index].structure.custardProfit = parseFloat(document.getElementById('pdEditPriceAnaCustardProfit')?.value) || 0;
        products[index].structure.c2Profit = parseFloat(document.getElementById('pdEditPriceAnaCustardProfit')?.value) || 0;
        products[index].structure.custardProfitPercent = parseFloat(document.getElementById('pdEditPriceAnaCustardProfitPct')?.value) || 0;
        products[index].structure.c2ProfitPercent = parseFloat(document.getElementById('pdEditPriceAnaCustardProfitPct')?.value) || 0;

        products[index].structure.cupProfit = parseFloat(document.getElementById('pdEditPriceAnaCupProfit')?.value) || 0;
        products[index].structure.c3Profit = parseFloat(document.getElementById('pdEditPriceAnaCupProfit')?.value) || 0;
        products[index].structure.cupProfitPercent = parseFloat(document.getElementById('pdEditPriceAnaCupProfitPct')?.value) || 0;
        products[index].structure.c3ProfitPercent = parseFloat(document.getElementById('pdEditPriceAnaCupProfitPct')?.value) || 0;

        products[index].packTypes = products[index].packTypes || {};
        if (products[index].packTypes.bag) { products[index].packTypes.bag.title = bagTitle; products[index].packTypes.bag.price = parseFloat(document.getElementById('pdEditPriceAnaBagPrice')?.value) || 0; }
        if (products[index].packTypes.custard) { products[index].packTypes.custard.title = custardTitle; products[index].packTypes.custard.price = parseFloat(document.getElementById('pdEditPriceAnaCustardPrice')?.value) || 0; }
        if (products[index].packTypes.cup) { 
            products[index].packTypes.cup.title = cupTitle; 
            products[index].packTypes.cup.price = (parseFloat(document.getElementById('pdEditPriceAnaCupPrice')?.value) || 0); 
        }
        
        if (products[index].packTypes.c1) { products[index].packTypes.c1.title = bagTitle; products[index].packTypes.c1.price = parseFloat(document.getElementById('pdEditPriceAnaBagPrice')?.value) || 0; }
        if (products[index].packTypes.c2) { products[index].packTypes.c2.title = custardTitle; products[index].packTypes.c2.price = parseFloat(document.getElementById('pdEditPriceAnaCustardPrice')?.value) || 0; }
        if (products[index].packTypes.c3) { products[index].packTypes.c3.title = cupTitle; products[index].packTypes.c3.price = (parseFloat(document.getElementById('pdEditPriceAnaCupPrice')?.value) || 0); }
        
        // Ensure standard price field matches the top level container
        products[index].price = parseFloat(document.getElementById('pdEditPriceAnaBagPrice')?.value) || 0;
        
        products[index].bulkUnit = bagTitle;
        products[index].unit = 'per ' + bagTitle.toLowerCase();

        // FIX: Save Analytical Product Name if changed
        const newName = document.getElementById('pdEditPriceAnaName')?.value.trim();
        if (newName && newName !== p.name) {
            const dup = products.some((item, i) => i !== index && item.name === newName && !item.isDeleted && !item.cleared);
            if (dup) {
                (typeof customAlert !== 'undefined' ? customAlert : alert)('A product named "' + newName + '" already exists. Please use a different name.');
                return;
            }
        }
        if (newName) products[index].name = newName;
    } else {
        const pieces = parseInt(document.getElementById('pdEditPriceDefPieces')?.value) || 1;
        const inputBulkCost = parseFloat(document.getElementById('pdEditPriceDefBulkCost')?.value) || 0;
        products[index].pieces = pieces;
        products[index].cost = products[index].isCustom ? inputBulkCost : (pieces > 0 ? (inputBulkCost / pieces) : 0);
        products[index].price = parseFloat(document.getElementById('pdEditPriceDefPrice')?.value) || 0;
        
        if (!products[index].isCustom) {
            products[index].profit = parseFloat(document.getElementById('pdEditPriceDefProfit')?.value) || 0;
            products[index].profitPercent = parseFloat(document.getElementById('pdEditPriceDefProfitPercent')?.value) || 0;
            
            products[index].wholesaleProfit = parseFloat(document.getElementById('pdEditPriceDefWholesaleProfit')?.value) || 0;
            products[index].wholesaleProfitPercent = parseFloat(document.getElementById('pdEditPriceDefWholesaleProfitPercent')?.value) || 0;
            products[index].wholesalePrice = parseFloat(document.getElementById('pdEditPriceDefWholesalePrice')?.value) || 0;
        }

        const bulkUnit = document.getElementById('pdEditPriceBulkUnitSelect')?.value || products[index].bulkUnit;
        const unit = document.getElementById('pdEditPriceUnitSelect')?.value || products[index].unit;
        if (bulkUnit) products[index].bulkUnit = bulkUnit;
        if (unit) products[index].unit = unit;

        // FIX: Save Default Product Name if changed
        const newName = document.getElementById('pdEditPriceDefName')?.value.trim();
        if (newName && newName !== p.name) {
            const dup = products.some((item, i) => i !== index && item.name === newName && !item.isDeleted && !item.cleared);
            if (dup) {
                (typeof customAlert !== 'undefined' ? customAlert : alert)('A product named "' + newName + '" already exists. Please use a different name.');
                return;
            }
        }
        if (newName) products[index].name = newName;
    }

    localStorage.setItem('nd_products_data', JSON.stringify(products));
    if (typeof adminProducts !== 'undefined') {
        try { window.reloadAdminProducts(); } catch (e) { }
    }
    if (typeof window.renderProductsGlobal === 'function') window.renderProductsGlobal();
    if (typeof window.renderRestockListGlobal === 'function') window.renderRestockListGlobal();

    _pdShowSuccess('Price Updated', 'New retail pricing saved successfully.');
}

// ============================================================
// Clear / Delete
// ============================================================
function _pdExecuteClear() {
    let products = JSON.parse(localStorage.getItem('nd_products_data') || '[]');
    const p = window._pdCurrentProduct;
    if (!p) return;
    const index = p.id ? products.findIndex(item => item.id === p.id) : products.findIndex(item => item.name === p.name && item.dateAdded === p.dateAdded);
    if (index === -1) return;
    products[index].cleared = true;
    localStorage.setItem('nd_products_data', JSON.stringify(products));
    if (typeof window.reloadAdminProducts === 'function') window.reloadAdminProducts();
    if (typeof window.renderProductsGlobal === 'function') window.renderProductsGlobal();
    _pdShowSuccess('Product Hidden', 'Product hidden from view. History is kept intact.');
}

function _pdExecuteDelete() {
    let products = JSON.parse(localStorage.getItem('nd_products_data') || '[]');
    const p = window._pdCurrentProduct;
    if (!p) return;
    const index = p.id ? products.findIndex(item => item.id === p.id) : products.findIndex(item => item.name === p.name && item.dateAdded === p.dateAdded);
    if (index === -1) return;
    products[index].isDeleted = true;
    localStorage.setItem('nd_products_data', JSON.stringify(products));
    if (typeof window.reloadAdminProducts === 'function') window.reloadAdminProducts();
    if (typeof window.renderProductsGlobal === 'function') window.renderProductsGlobal();
    if (typeof window.renderRestockListGlobal === 'function') window.renderRestockListGlobal();
    _pdShowSuccess('Product Deleted', 'Moved to Recycle Bin.');
}

function _pdExecuteUndoTopUp() {
    let products = JSON.parse(localStorage.getItem('nd_products_data') || '[]');
    const p = window._pdCurrentProduct;
    if (!p) return;
    const index = p.id ? products.findIndex(item => item.id === p.id) : products.findIndex(item => item.name === p.name && item.dateAdded === p.dateAdded);
    
    if (index === -1) {
        if(typeof customAlert === 'function') customAlert("Product not found");
        return;
    }
    
    const prod = products[index];
    if (!prod.topUpHistory || prod.topUpHistory.length <= 1) {
        if(typeof customAlert === 'function') customAlert("No recent top up to undo.");
        return;
    }
    
    // Pop the last top up
    const lastTopUp = prod.topUpHistory.pop();
    const costToDeduct = lastTopUp.cost || 0;
    
    // Revert quantity and purchaseCost
    prod.purchaseCost = Math.max(0, (parseFloat(prod.purchaseCost) || 0) - costToDeduct);
    
    if (prod.isSpecial || prod.packTypes) {
        // Analytical
        const s = prod.structure || {};
        const custardsPerBag = parseInt(s.custardsPerBag) || 1;
        const cupsPerCustard = parseInt(s.cupsPerCustard) || 1;
        let qtyToDeduct = 0;
        
        if (lastTopUp.tier === "1") {
            qtyToDeduct = lastTopUp.qty;
        } else if (lastTopUp.tier === "2") {
            qtyToDeduct = lastTopUp.qty / custardsPerBag;
        } else if (lastTopUp.tier === "3") {
            qtyToDeduct = lastTopUp.qty / (custardsPerBag * cupsPerCustard);
        } else {
            qtyToDeduct = lastTopUp.qty || 1; 
        }
        prod.boughtQuantity = Math.max(0, (parseFloat(prod.boughtQuantity) || 0) - qtyToDeduct);
    } else {
        // Default / Custom
        prod.boughtQuantity = Math.max(0, (parseFloat(prod.boughtQuantity) || 0) - (lastTopUp.qty || 1));
    }
    
    localStorage.setItem('nd_products_data', JSON.stringify(products));
    
    setTimeout(() => {
        if (typeof window.reloadAdminProducts === 'function') window.reloadAdminProducts();
        if (typeof window.renderProductsGlobal === 'function') window.renderProductsGlobal();
        if (typeof window.renderRestockListGlobal === 'function') window.renderRestockListGlobal();
    }, 100);
    
    window._pdCurrentProduct = prod; 
    
    _pdShowSuccess("Undo Successful", "The last top up has been reverted and the cost was deducted.");
}

// ============================================================
// Success view
// ============================================================
function _pdShowSuccess(title, desc) {
    _pdShowView('productActionSuccessView');
    const t = document.getElementById('pdSuccessTitle');
    const d = document.getElementById('pdSuccessDesc');
    if (t) t.textContent = title;
    if (d) d.textContent = desc;
}

// ============================================================
// Utility
// ============================================================
function _setVal(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
}

// Global helper to toggle flexible pricing state directly from Product details card view
window.toggleProductFlexibleState = function(name, dateAdded, isChecked) {
    if (isChecked) {
        window.openFlexibleVariantsModal(name, dateAdded, true);
    } else {
        let products = JSON.parse(localStorage.getItem('nd_products_data') || '[]');
        const index = products.findIndex(item => item.name === name && item.dateAdded === dateAdded);
        if (index !== -1) {
            products[index].allowUserFlexiblePricing = false;
            products[index].flexibleVariants = [];
            localStorage.setItem('nd_products_data', JSON.stringify(products));
            
            if (window._pdCurrentProduct && window._pdCurrentProduct.name === name && window._pdCurrentProduct.dateAdded === dateAdded) {
                window._pdCurrentProduct.allowUserFlexiblePricing = false;
                window._pdCurrentProduct.flexibleVariants = [];
                _pdRenderDetails(window._pdCurrentProduct);
            }
            if (typeof window.reloadAdminProducts === 'function') window.reloadAdminProducts();
            if (typeof window.renderProductsGlobal === 'function') window.renderProductsGlobal();
        }
    }
};

window.openFlexibleVariantsModal = function(name, dateAdded, isTogglingOn = false) {
    let products = JSON.parse(localStorage.getItem('nd_products_data') || '[]');
    const p = products.find(item => item.name === name && item.dateAdded === dateAdded);
    if (!p) return;

    let containers = [];
    if (p.isSpecial || p.packTypes) {
        const bagTitle = (p.isFlexible && p.packTypes && p.packTypes.c1 && p.packTypes.c1.title) ? p.packTypes.c1.title : ((p.packTypes && p.packTypes.bag && p.packTypes.bag.title) || (p.packTypes && p.packTypes.c1 && p.packTypes.c1.title) || p.bulkUnit || 'Container 1');
        const custardTitle = (p.isFlexible && p.packTypes && p.packTypes.c2 && p.packTypes.c2.title) ? p.packTypes.c2.title : ((p.packTypes && p.packTypes.custard && p.packTypes.custard.title) || (p.packTypes && p.packTypes.c2 && p.packTypes.c2.title) || 'Container 2');
        const cupTitle = (p.isFlexible && p.packTypes && p.packTypes.c3 && p.packTypes.c3.title) ? p.packTypes.c3.title : ((p.packTypes && p.packTypes.cup && p.packTypes.cup.title) || (p.packTypes && p.packTypes.c3 && p.packTypes.c3.title) || 'Container 3');
        if (p.packTypes?.bag || p.packTypes?.c1) containers.push({ key: 'c1', title: bagTitle });
        if (p.packTypes?.custard || p.packTypes?.c2) containers.push({ key: 'c2', title: custardTitle });
        if (p.packTypes?.cup || p.packTypes?.c3) containers.push({ key: 'c3', title: cupTitle });
        if (containers.length === 0) containers = [{key: 'c1', title: bagTitle}, {key: 'c2', title: custardTitle}, {key: 'c3', title: cupTitle}];
    } else {
        const unitWord = p.unit || 'per piece';
        containers.push({ key: 'default', title: 'Default (' + unitWord + ')' });
        if (p.wholesalePrice && Number(p.wholesalePrice) > 0) {
            const bulkUnitStr = p.bulkUnit || 'Carton';
            containers.push({ key: 'wholesale', title: bulkUnitStr });
        }
    }

    const currentVars = p.flexibleVariants || [];

    let modalHtml = `
    <div id="flexVarModalOverlay" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.6);z-index:999999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">
        <div style="background:white;width:90%;max-width:400px;border-radius:16px;padding:24px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);">
            <h3 style="margin:0 0 8px 0;color:#1e293b;font-size:1.25rem;">Select Flexible Containers</h3>
            <p style="margin:0 0 20px 0;color:#64748b;font-size:0.85rem;">Choose which formats allow the user to input a custom price.</p>
            <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:24px;">
                ${containers.map(c => `
                    <label style="display:flex;align-items:center;gap:12px;padding:12px;border:1px solid #e2e8f0;border-radius:8px;cursor:pointer;background:#f8fafc;">
                        <input type="checkbox" class="flex-var-cb" value="${c.key}" ${currentVars.includes(c.title) ? 'checked' : ''} data-title="${c.title}" style="width:18px;height:18px;accent-color:#7c3aed;cursor:pointer;">
                        <span style="font-weight:600;color:#334155;">${c.title}</span>
                    </label>
                `).join('')}
            </div>
            <div style="display:flex;gap:12px;justify-content:flex-end;">
                <button id="flexVarCancelBtn" style="padding:10px 16px;background:white;border:1px solid #cbd5e1;border-radius:8px;color:#64748b;font-weight:600;cursor:pointer;">Cancel</button>
                <button id="flexVarSaveBtn" style="padding:10px 20px;background:#7c3aed;border:none;border-radius:8px;color:white;font-weight:600;cursor:pointer;box-shadow:0 4px 6px -1px rgba(124,58,237,0.2);">Save Configuration</button>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('flexVarCancelBtn').onclick = function() {
        document.getElementById('flexVarModalOverlay').remove();
        if (isTogglingOn && window._pdCurrentProduct) {
            _pdRenderDetails(window._pdCurrentProduct);
        }
    };

    document.getElementById('flexVarSaveBtn').onclick = function() {
        const selectedTitles = Array.from(document.querySelectorAll('.flex-var-cb:checked')).map(cb => cb.getAttribute('data-title'));
        const index = products.findIndex(item => item.name === name && item.dateAdded === dateAdded);
        if (index !== -1) {
            if (selectedTitles.length === 0) {
                products[index].allowUserFlexiblePricing = false;
                products[index].flexibleVariants = [];
            } else {
                products[index].allowUserFlexiblePricing = true;
                products[index].flexibleVariants = selectedTitles;
            }
            
            localStorage.setItem('nd_products_data', JSON.stringify(products));
            
            if (window._pdCurrentProduct && window._pdCurrentProduct.name === name && window._pdCurrentProduct.dateAdded === dateAdded) {
                window._pdCurrentProduct.allowUserFlexiblePricing = products[index].allowUserFlexiblePricing;
                window._pdCurrentProduct.flexibleVariants = products[index].flexibleVariants;
                _pdRenderDetails(window._pdCurrentProduct);
            }
            if (typeof window.reloadAdminProducts === 'function') window.reloadAdminProducts();
            if (typeof window.renderProductsGlobal === 'function') window.renderProductsGlobal();
        }
        document.getElementById('flexVarModalOverlay').remove();
    };
};



