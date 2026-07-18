let currentRestockSort = 'newest';
let rsActiveTab = 'all';
let _restockDetailProductName = null;

// Month/Year state for restock
const RS_FULL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
window.currentRsMonthIdx = new Date().getMonth();
window.currentRsYear = new Date().getFullYear();

function openRestockModal() {
    fetch('menu-buttons/restock/restock.html')
        .then(res => res.text())
        .then(html => {
            const container = document.getElementById('modal-container');
            container.innerHTML = html;
            const page = document.getElementById('restockPage');
            setTimeout(() => {
                page.style.display = 'flex';
                page.offsetHeight;
                page.classList.add('show');
            }, 10);
            
            
            // Set month/year display
            const monthEl = document.getElementById('rsSelMonth');
            const yearEl = document.getElementById('rsSelYear');
            if (monthEl) monthEl.textContent = RS_FULL_MONTHS[window.currentRsMonthIdx];
            if (yearEl) yearEl.textContent = window.currentRsYear;

            function checkRsTitleOverflow() {
                const wrap = document.getElementById('rsTitleWrap');
                const content = document.getElementById('rsTitleContent');
                if (!wrap || !content) return;

                // Reset to measure natural width
                content.classList.remove('is-sliding');
                content.innerHTML = `Goods Registration/Cost of Good`;

                // If natural text is wider than container, activate marquee
                if (content.scrollWidth > wrap.clientWidth) {
                    content.classList.add('is-sliding');
                    wrap.classList.add('is-sliding-wrap');
                    content.innerHTML = `<span style="padding: 0 30px 0 20px;">Goods Registration/Cost of Good</span><span style="padding: 0 30px 0 20px;">Goods Registration/Cost of Good</span>`;
                } else {
                    wrap.classList.remove('is-sliding-wrap');
                }
            }

            // Initial check
            setTimeout(checkRsTitleOverflow, 50);

            // Responsive check on resize
            window.addEventListener('resize', checkRsTitleOverflow);
            
            // Clean up listener when modal closes
            const originalClose = window.closeRestockModal;
            window.closeRestockModal = function() {
                window.removeEventListener('resize', checkRsTitleOverflow);
                if (originalClose) originalClose();
            };
            
            renderRestockList();

            // Search listener
            const searchInput = document.getElementById('restockSearchInput');
            if (searchInput) {
                searchInput.addEventListener('input', () => renderRestockList());
            }

            // Category Tabs Listeners
            const tabBtns = document.querySelectorAll('.rs-tab-btn');
            tabBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    tabBtns.forEach(b => {
                        b.classList.remove('active');
                        b.style.background = 'transparent';
                        b.style.color = '#64748b';
                        b.style.boxShadow = 'none';
                        b.style.fontWeight = '600';
                    });
                    btn.classList.add('active');
                    btn.style.background = 'white';
                    btn.style.color = '#8b5cf6';
                    btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                    btn.style.fontWeight = '700';
                    rsActiveTab = btn.dataset.tab;
                    renderRestockList();
                });
            });

            // Close dropdowns when clicking outside
            document.addEventListener('click', function closeDropdowns(e) {
                const sortDd = document.getElementById('restockSortDropdown');
                if (sortDd && sortDd.style.display === 'block') sortDd.style.display = 'none';
                
                const pageEl = document.getElementById('restockPage');
                if (!pageEl || !pageEl.classList.contains('show')) {
                    document.removeEventListener('click', closeDropdowns);
                }
            });
        });
}

function closeRestockModal() {
    const page = document.getElementById('restockPage');
    if (page) {
        page.style.animation = 'none';
        page.style.transform = 'translateX(100%)';
        page.style.transition = 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
        setTimeout(() => {
            page.classList.remove('show');
            page.style.transform = '';
            page.style.transition = '';
            page.style.animation = '';
            document.getElementById('modal-container').innerHTML = '';
        }, 250);
    }
    if (typeof window.clearAdminModalPersistence === 'function') window.clearAdminModalPersistence();
}

function setRestockSort(sortType, optElement) {
    document.querySelectorAll('.restock-sort-option').forEach(o => o.classList.remove('active'));
    optElement.classList.add('active');
    currentRestockSort = sortType;
    document.getElementById('restockSortDropdown').style.display = 'none';
    renderRestockList();
}

// ============================================================
// Date modal for restock
// ============================================================
function openRestockDateModal(type) {
    const modal = document.getElementById('restockDateSelModal');
    const mCol = document.getElementById('rsMonthCol');
    const yCol = document.getElementById('rsYearCol');
    const title = document.getElementById('rsDateModalTitle');
    
    mCol.innerHTML = '';
    yCol.innerHTML = '';
    
    if (type === 'month') {
        title.textContent = 'Select Month';
        mCol.style.display = 'block';
        yCol.style.display = 'none';
        
        const now = new Date();
        RS_FULL_MONTHS.forEach((m, i) => {
            const div = document.createElement('div');
            div.className = 'en-selection-item ' + (i === window.currentRsMonthIdx ? 'selected' : '');
            if (window.currentRsYear === now.getFullYear() && i > now.getMonth()) {
                div.classList.add('disabled');
            } else {
                div.onclick = () => {
                    window.currentRsMonthIdx = i;
                    document.getElementById('rsSelMonth').textContent = RS_FULL_MONTHS[i];
                    closeRestockDateModal();
                    renderRestockList();
                }
            }
            div.textContent = m;
            mCol.appendChild(div);
        });
    } else {
        title.textContent = 'Select Year';
        mCol.style.display = 'none';
        yCol.style.display = 'block';
        
        const now = new Date();
        for (let y = now.getFullYear(); y >= 2020; y--) {
            const div = document.createElement('div');
            div.className = 'en-selection-item ' + (y === window.currentRsYear ? 'selected' : '');
            div.onclick = () => {
                window.currentRsYear = y;
                if (y === now.getFullYear() && window.currentRsMonthIdx > now.getMonth()) {
                    window.currentRsMonthIdx = now.getMonth();
                    document.getElementById('rsSelMonth').textContent = RS_FULL_MONTHS[window.currentRsMonthIdx];
                }
                document.getElementById('rsSelYear').textContent = y;
                closeRestockDateModal();
                renderRestockList();
            }
            div.textContent = y;
            yCol.appendChild(div);
        }
    }
    
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    }
}

function closeRestockDateModal() {
    const modal = document.getElementById('restockDateSelModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    }
}

// ============================================================
// Render — reads from nd_products_data, filters by dateAdded
// ============================================================
function renderRestockList(filter = '') {
    window.renderRestockListGlobal = () => renderRestockList(filter);

    const tableBody = document.getElementById('restockTableBody');
    const emptyState = document.getElementById('restockEmptyState');
    if (!tableBody) return;

    let products = JSON.parse(localStorage.getItem('nd_products_data') || '[]');

    // Filter by selected month/year using dateAdded (fall back to current month for legacy entries)
    products = products.filter(p => {
        if (p.isDeleted) return false; // Hide deleted products (but keep hidden/cleared ones)
        if (p.addedViaProductTab) return false; // Hide items added strictly via Product tab
        
        // Tab filtering logic
        if (rsActiveTab !== 'all') {
            if (rsActiveTab === 'special' && !p.isSpecial) return false;
            if (rsActiveTab === 'flexible' && (!p.isFlexible || p.isSpecial)) return false;
            if (rsActiveTab === 'custom' && !p.isCustom) return false;
            if (rsActiveTab === 'default' && (p.isSpecial || p.isFlexible || p.isCustom)) return false;
        }

        const d = p.dateAdded ? new Date(p.dateAdded) : null;
        if (!d) {
            // Legacy product with no dateAdded → treat as current month/year
            return window.currentRsMonthIdx === new Date().getMonth() && window.currentRsYear === new Date().getFullYear();
        }
        return d.getMonth() === window.currentRsMonthIdx && d.getFullYear() === window.currentRsYear;
    });

    // Search
    const searchInput = document.getElementById('restockSearchInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    if (searchTerm) {
        products = products.filter(p => p.name.toLowerCase().includes(searchTerm));
    }

    // Sort
    products.sort((a, b) => {
        // Pinned to Top if finished
        const aFinished = window.checkProductOutOfStock && window.checkProductOutOfStock(a.id) ? -1 : 1;
        const bFinished = window.checkProductOutOfStock && window.checkProductOutOfStock(b.id) ? -1 : 1;
        if (aFinished !== bFinished) return aFinished - bFinished;

        if (currentRestockSort === 'newest') {
            return new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0);
        } else if (currentRestockSort === 'oldest') {
            return new Date(a.dateAdded || 0) - new Date(b.dateAdded || 0);
        } else if (currentRestockSort === 'highest') {
            return (b.price || 0) - (a.price || 0);
        } else if (currentRestockSort === 'lowest') {
            return (a.price || 0) - (b.price || 0);
        }
    });

    const totalSn = products.length;
    const totalQuantityBought = products.reduce((sum, p) => sum + (parseFloat(p.boughtQuantity) || 1), 0);
    const totalQuantityBoughtStr = Number.isInteger(totalQuantityBought) ? totalQuantityBought : parseFloat(totalQuantityBought.toFixed(2));
    const totalValue = products.reduce((sum, p) => sum + (parseFloat(p.purchaseCost) || parseFloat(p.cost) || 0), 0);
    const snEl = document.getElementById('restockTotalSn');
    const priceEl = document.getElementById('restockTotalPrice');
    if (snEl) snEl.textContent = `${totalSn} / ${totalQuantityBoughtStr}`;
    if (priceEl) priceEl.textContent = '₦' + totalValue.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2});

    if (products.length === 0) {
        tableBody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    let salesData = [];
    try { salesData = JSON.parse(localStorage.getItem('nd_sales_history') || '[]'); } catch(e){}
    const actualYear = new Date().getFullYear();
    const actualMonth = new Date().getMonth();

    tableBody.innerHTML = products.map((p, index) => {
        const dateObj = p.dateAdded ? new Date(p.dateAdded) : null;
        const formattedDate = dateObj
            ? dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
            : 'Legacy entry';
        const safeName = p.name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        
        const isOutOfStock = window.checkProductOutOfStock && window.checkProductOutOfStock(p.id);
        const isRunningLow = !isOutOfStock && window.checkProductRunningLow && window.checkProductRunningLow(p.id);
        
        let rowBgStyle = '';
        let nameStyle = '';
        if (isOutOfStock) {
            rowBgStyle = 'background-color: #fef2f2;';
            nameStyle = 'color: #7f1d1d;';
        } else if (isRunningLow) {
            rowBgStyle = 'background-color: #fefce8;';
            nameStyle = 'color: #a16207;';
        }

        let hasOld = false;
        let hasNew = false;
        if (!isOutOfStock) {
            let totalSold = 0;
            salesData.forEach(sale => {
                if (sale.item === p.name || sale.item.startsWith(p.name + ' (')) {
                    totalSold += parseFloat(sale.qty) || 0;
                }
            });

            if (p.isSpecial || p.packTypes) {
                const s = p.structure || {};
                const cpb = parseInt(s.custardsPerBag) || 1;
                const cpc = parseInt(s.cupsPerCustard) || 1;
                const maxCPB = cpb * cpc;
                totalSold = totalSold / maxCPB;
            } else {
                totalSold = totalSold / (parseInt(p.pieces) || 1);
            }

            let batches = p.topUpHistory || [];
            if (batches.length === 0) batches = [{ qty: parseFloat(p.boughtQuantity) || 1, date: p.dateAdded || new Date().toISOString() }];
            batches.sort((a,b) => new Date(a.date) - new Date(b.date));

            let remSold = totalSold;
            let remBatches = [];
            for (let b of batches) {
                let bQty = parseFloat(b.qty) || 0;
                if (remSold >= bQty) {
                    remSold -= bQty;
                } else {
                    remBatches.push({ ...b, qty: bQty - remSold });
                    remSold = 0;
                }
            }

            hasOld = remBatches.some(b => {
                if (!b.isNewStock) return false;
                const d = new Date(b.date);
                return d.getFullYear() < actualYear || (d.getFullYear() === actualYear && d.getMonth() < actualMonth);
            });
            hasNew = remBatches.some(b => {
                if (!b.isNewStock) return false;
                const d = new Date(b.date);
                return d.getFullYear() === actualYear && d.getMonth() === actualMonth;
            });
        }
        
        const imgHtml = p.imageData 
            ? `<div class="admin-product-thumb"><img src="${p.imageData}" alt="${p.name}" onclick="event.stopPropagation(); if(typeof window.openImageViewer === 'function') window.openImageViewer('${p.imageData}')" style="cursor:zoom-in;"></div>`
            : `<div class="admin-product-thumb placeholder"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></div>`;

        return `
            <tr onclick="openRestockDetailModal('${safeName}'${p.dateAdded ? `, '${p.dateAdded}'` : ''})" style="cursor: pointer; ${rowBgStyle}">
                <td style="color: #64748b; vertical-align: middle;">${index + 1}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        ${imgHtml}
                        <div>
                            <div style="font-weight: 700; display:flex; align-items:center; gap:8px; ${nameStyle}">
                                ${p.name}
                                ${isOutOfStock ? '<span style="background: #ef4444; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; font-weight: 800; border: 1px solid #dc2626; animation: blink 1.5s infinite;">FINISHED</span>' : ''}
                                ${isRunningLow ? '<span style="background: #eab308; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; font-weight: 800; border: 1px solid #ca8a04;">RUNNING LOW</span>' : ''}

                                ${!isOutOfStock && hasNew ? '<span style="background: #006400; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; font-weight: 800; border: 1px solid #004d00;">NEW STOCK</span>' : ''}
                            </div>
                            <span class="restock-item-meta">${formattedDate} · ${p.unit || ''}</span>
                            ${isOutOfStock ? '<div style="margin-top: 8px;"><button style="background: #ef4444; color: white; padding: 6px 12px; font-weight: 900; font-size: 0.75rem; border: none; border-radius: 6px; cursor: pointer; box-shadow: 0 4px 6px rgba(239, 68, 68, 0.3); outline: none;">RESTOCK NOW</button></div>' : ''}
                        </div>
                    </div>
                </td>
                <td style="text-align: right; font-weight: 800; color: ${isOutOfStock ? '#ef4444' : '#8b5cf6'};">₦${(parseFloat(p.purchaseCost) || parseFloat(p.cost) || 0).toLocaleString()}</td>
                <td style="text-align: right;">
                    <button class="restock-delete-btn" onclick="event.stopPropagation(); openRestockDetailModal('${safeName}'${p.dateAdded ? `, '${p.dateAdded}'` : ''})" title="Details" style="${isOutOfStock ? 'color: #ef4444; background: #fee2e2;' : ''}">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle>
                        </svg>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// ============================================================
// Add New Product Modal (full form)
// ============================================================
function openAddRestockModal() {
    const modal = document.getElementById('addRestockModal');
    if (!modal) return;
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
    try { _initRestockProductForm(); } catch(e) { console.error('Restock form init error:', e); }
    if (typeof _initRestockImportDropdown === 'function') _initRestockImportDropdown();
    if (typeof _initRestockSpecImportDropdown === 'function') _initRestockSpecImportDropdown();
    if (typeof _initRestockCustomImportDropdown === 'function') _initRestockCustomImportDropdown();
    if (typeof _initRestockFlexImportDropdown === 'function') _initRestockFlexImportDropdown();
    if (typeof window._initRsCustomForm === 'function') window._initRsCustomForm();
    if (typeof window._initRsFlexForm === 'function') window._initRsFlexForm();

    
    // Reset the trigger text if opened previously
    const importText = document.querySelector('#rsImportDropdownTrigger .trigger-text');
    if (importText) importText.textContent = 'Select product to copy details...';

    // Set 'New Stock' toggles to ON by default
    ['rsDefNewStockSwitch', 'rsSpecNewStockSwitch', 'rsCustomNewStockSwitch'].forEach(id => {
        const sw = document.getElementById(id);
        if (sw) {
            sw.checked = true;
            const slider = sw.nextElementSibling;
            if (slider) {
                slider.style.backgroundColor = '#10b981';
                const knob = slider.querySelector('.knob');
                if (knob) knob.style.transform = 'translateX(20px)';
            }
        }
    });
    
    const specImportText = document.querySelector('#rsSpecImportDropdownTrigger .trigger-text');
    if (specImportText) specImportText.textContent = 'Select analytical product to copy...';

    const customImportText = document.querySelector('#rsCustomImportDropdownTrigger .trigger-text');
    if (customImportText) customImportText.textContent = 'Select custom product to copy...';

    const flexImportText = document.querySelector('#rsFlexImportDropdownTrigger .trigger-text');
    if (flexImportText) flexImportText.textContent = 'Select flexible product to copy...';

}

function closeAddRestockModal() {
    const modal = document.getElementById('addRestockModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);

        // Reset header title in case it was changed by Top-Up Flow
        const header = modal.querySelector('.admin-modal-header h3');
        if (header) header.textContent = 'Register New Goods';

        // Restore type switch toggle (hidden by Top-Up flow)
        const typeSwitchGroup = document.getElementById('rsTypeSpecialBtn')?.parentElement;
        if (typeSwitchGroup) typeSwitchGroup.style.display = '';

        // Restore 'Pre-fill from Existing' dropdowns (hidden by Top-Up flow)
        ['rsImportDropdownWrapper', 'rsSpecImportDropdownWrapper', 'rsCustomImportDropdownWrapper', 'rsFlexImportDropdownWrapper'].forEach(function(id) {
            var wrap = document.getElementById(id);
            if (wrap) {
                var fg = wrap.closest('.form-group');
                if (fg) fg.style.display = '';
            }
        });

        // Remove any injected Top-Up buttons
        ['rsProductSubmitBtn_TopUp', 'rsSpecProductSubmitBtn_TopUp', 'rsCustomProductSubmitBtn_TopUp', 'rsFlexProductSubmitBtn_TopUp'].forEach(function(id) {
            var btn = document.getElementById(id);
            if (btn) btn.remove();
        });

        // Show the original submit buttons again
        ['rsProductSubmitBtn', 'rsSpecProductSubmitBtn', 'rsCustomProductSubmitBtn', 'rsFlexProductSubmitBtn'].forEach(function(id) {
            var btn = document.getElementById(id);
            if (btn) btn.style.display = '';
        });

        // Clear top-up state
        window._currentTopUpProduct = null;

        // Reset form
        
        const rsImgDataHidden = document.getElementById('rsNewImageData');
        const rsFileInput = document.getElementById('rsNewImageInput');
        const rsPreviewContainer = document.getElementById('rsNewImagePreviewContainer');
        const rsPlaceholder = document.querySelector('#rsNewImageUploadContainer .upload-placeholder');
        if (rsImgDataHidden) rsImgDataHidden.value = '';
        if (rsFileInput) rsFileInput.value = '';
        if (rsPreviewContainer) rsPreviewContainer.style.display = 'none';
        if (rsPlaceholder) rsPlaceholder.style.display = 'flex';

        const nameInput = document.getElementById('rsNewProductName');
        const purchaseCostInput = document.getElementById('rsNewProductPurchaseCost');
        const quantityInput = document.getElementById('rsNewProductQuantity');
        const totalCostVal = document.getElementById('rsNewProductTotalCostVal');
        const piecesInput = document.getElementById('rsNewProductPieces');
        const retailCostVal = document.getElementById('rsNewProductRetailCostVal');
        const profitInput = document.getElementById('rsNewProductProfit');
        const profitPercentInput = document.getElementById('rsNewProductProfitPercent');
        const priceInput = document.getElementById('rsNewProductPrice');
        const payoutDisplay = document.getElementById('rsPayoutValue');
        const profitBadge = document.getElementById('rsProfitPercentBadge');
        const unitHidden = document.getElementById('rsNewProductUnit');
        const unitTrigger = document.getElementById('rsUnitDropdownTrigger');
        const unitMenu = document.getElementById('rsUnitDropdownMenu');

        if (nameInput) nameInput.value = '';
        if (purchaseCostInput) purchaseCostInput.value = '';
        if (typeof quantityInput !== 'undefined' && quantityInput) quantityInput.value = '1';
        if (typeof totalCostVal !== 'undefined' && totalCostVal) totalCostVal.textContent = '₦0';
        if (piecesInput) piecesInput.value = '';
        if (retailCostVal) retailCostVal.textContent = '₦0';
        if (profitInput) profitInput.value = '';
        if (profitPercentInput) profitPercentInput.value = '';
        if (priceInput) priceInput.value = '';
        if (profitBadge) profitBadge.style.display = 'none';
        
        if (document.getElementById('rsNewProductWholesaleProfit')) document.getElementById('rsNewProductWholesaleProfit').value = '';
        if (document.getElementById('rsNewProductWholesaleProfitPercent')) document.getElementById('rsNewProductWholesaleProfitPercent').value = '';
        if (document.getElementById('rsNewProductWholesalePrice')) document.getElementById('rsNewProductWholesalePrice').value = '';
        
        if (unitHidden) unitHidden.value = 'per piece';
        if (unitTrigger) {
            const t = unitTrigger.querySelector('.trigger-text');
            if (t) t.textContent = 'per piece';
        }
        if (unitMenu) {
            unitMenu.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('active'));
            const first = unitMenu.querySelector('[data-value="per piece"]');
            if (first) first.classList.add('active');
        }

        const rsBulkHidden = document.getElementById('rsBulkUnitSelect');
        const rsBulkTrigger = document.getElementById('rsBulkDropdownTrigger');
        const rsBulkMenu = document.getElementById('rsBulkDropdownMenu');

        if (rsBulkHidden) rsBulkHidden.value = 'Carton';
        if (rsBulkTrigger) {
            const t = rsBulkTrigger.querySelector('.trigger-text');
            if (t) t.textContent = 'Carton';
        }
        if (rsBulkMenu) {
            rsBulkMenu.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('active'));
            const first = rsBulkMenu.querySelector('[data-value="Carton"]');
            if (first) first.classList.add('active');
        }
        if(typeof updateRsProductUILabel === 'function') updateRsProductUILabel();

        // Reset Special Product form
        const specIds = [
            'rsSpecProductName', 'rsSpecBagCost', 'rsSpecBagProfit', 'rsSpecBagProfitPercent', 'rsSpecBagPrice',
            'rsSpecCustardsPerBag', 'rsSpecCustardProfit', 'rsSpecCustardProfitPercent', 'rsSpecCustardPrice',
            'rsSpecCupsPerCustard', 'rsSpecCupProfit', 'rsSpecCupProfitPercent', 'rsSpecCupPrice'
        ];
        specIds.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        
        document.getElementById('rsSpecCustardCostVal').textContent = '₦0';
        document.getElementById('rsSpecCupCostVal').textContent = '₦0';
        if (document.getElementById('rsSpecBagTotalCostVal')) document.getElementById('rsSpecBagTotalCostVal').textContent = '₦0';

        // Reset to Analytical view by default
        if (document.getElementById('rsProductType')) document.getElementById('rsProductType').value = 'special';
        if (document.getElementById('rsTypeSpecialBtn')) {
            document.getElementById('rsTypeSpecialBtn').style.background = 'white';
            document.getElementById('rsTypeSpecialBtn').style.color = '#8b5cf6';
            document.getElementById('rsTypeSpecialBtn').style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
        }
        if (document.getElementById('rsTypeDefaultBtn')) {
            document.getElementById('rsTypeDefaultBtn').style.background = 'transparent';
            document.getElementById('rsTypeDefaultBtn').style.color = '#64748b';
            document.getElementById('rsTypeDefaultBtn').style.boxShadow = 'none';
        }
        if (document.getElementById('rsTypeCustomBtn')) {
            document.getElementById('rsTypeCustomBtn').style.background = 'transparent';
            document.getElementById('rsTypeCustomBtn').style.color = '#64748b';
            document.getElementById('rsTypeCustomBtn').style.boxShadow = 'none';
        }
        if (document.getElementById('rsTypeFlexibleBtn')) {
            document.getElementById('rsTypeFlexibleBtn').style.background = 'transparent';
            document.getElementById('rsTypeFlexibleBtn').style.color = '#64748b';
            document.getElementById('rsTypeFlexibleBtn').style.boxShadow = 'none';
        }
        if (document.getElementById('rsSpecialProductForm')) document.getElementById('rsSpecialProductForm').style.display = 'block';
        if (document.getElementById('rsDefaultProductForm')) document.getElementById('rsDefaultProductForm').style.display = 'none';
        if (document.getElementById('rsCustomProductForm')) document.getElementById('rsCustomProductForm').style.display = 'none';
        if (document.getElementById('rsFlexibleProductForm')) document.getElementById('rsFlexibleProductForm').style.display = 'none';

        // Reset Custom Products
        const customIds = ['rsCustomProductName', 'rsCustomProductPurchaseCost', 'rsCustomProductQuantity', 'rsCustomProductPieces', 'rsCustomPayoutRate'];
        customIds.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        if(document.getElementById('rsCustomProductTotalCostVal')) document.getElementById('rsCustomProductTotalCostVal').textContent = '₦0';
        if(document.getElementById('rsCustomPayoutType')) document.getElementById('rsCustomPayoutType').value = '%';

        // Reset Flexible Products
        const flexIds = ['rsFlexProductName', 'rsFlexProductPurchaseCost', 'rsFlexProductQuantity', 'rsFlexProductPieces'];
        flexIds.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        if(document.getElementById('rsFlexProductTotalCostVal')) document.getElementById('rsFlexProductTotalCostVal').textContent = '₦0';

        // Reset import dropdown if unused
        const importText = document.querySelector('#rsImportDropdownTrigger .trigger-text');
        if (importText) importText.textContent = 'Select product to copy details...';

        const specImportText = document.querySelector('#rsSpecImportDropdownTrigger .trigger-text');
        if (specImportText) specImportText.textContent = 'Select analytical product to copy...';

        const flexImportText = document.querySelector('#rsFlexImportDropdownTrigger .trigger-text');
        if (flexImportText) flexImportText.textContent = 'Select flexible product to copy...';

    }
}

function _initRestockProductForm() {
    const purchaseCostInput = document.getElementById('rsNewProductPurchaseCost');
    const quantityInput = document.getElementById('rsNewProductQuantity');
    const totalCostVal = document.getElementById('rsNewProductTotalCostVal');
    const piecesInput = document.getElementById('rsNewProductPieces');
    const retailCostVal = document.getElementById('rsNewProductRetailCostVal');
    const profitInput = document.getElementById('rsNewProductProfit');
    const profitPercentInput = document.getElementById('rsNewProductProfitPercent');
    const priceInput = document.getElementById('rsNewProductPrice');
    const wProfitInput = document.getElementById('rsNewProductWholesaleProfit');
    const wProfitPercentInput = document.getElementById('rsNewProductWholesaleProfitPercent');
    const wPriceInput = document.getElementById('rsNewProductWholesalePrice');
    const payoutDisplay = document.getElementById('rsPayoutValue');
    const profitBadge = document.getElementById('rsProfitPercentBadge');
    const unitWrapper = document.getElementById('rsUnitDropdownWrapper');
    const unitTrigger = document.getElementById('rsUnitDropdownTrigger');
    const unitMenu = document.getElementById('rsUnitDropdownMenu');
    const unitHidden = document.getElementById('rsNewProductUnit');
    const customUnitRow = document.getElementById('rsCustomUnitRow');
    const customUnitInput = document.getElementById('rsCustomUnitInput');
    const customUnitConfirmBtn = document.getElementById('rsCustomUnitConfirmBtn');
    const nameInput = document.getElementById('rsNewProductName');
    const submitBtn = document.getElementById('rsProductSubmitBtn');
    // Avoid double-init
    const modal = document.getElementById('addRestockModal');
    if (modal && modal._rsFormInited) return;

    // ---- New Image Upload Listeners ----
    const rsUploadArea = document.getElementById('rsNewImageUploadContainer');
    const rsFileInput = document.getElementById('rsNewImageInput');
    const rsImgDataHidden = document.getElementById('rsNewImageData');
    const rsPreviewContainer = document.getElementById('rsNewImagePreviewContainer');
    const rsPreviewImg = document.getElementById('rsNewImagePreview');
    const rsPlaceholder = rsUploadArea ? rsUploadArea.querySelector('.upload-placeholder') : null;

    if (rsUploadArea && rsFileInput) {
        rsUploadArea.addEventListener('click', (e) => {
            if (e.target.tagName.toLowerCase() !== 'button') rsFileInput.click();
        });

        rsUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            rsUploadArea.style.borderColor = '#8b5cf6';
            rsUploadArea.style.background = '#f0f4f8';
        });

        rsUploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            rsUploadArea.style.borderColor = '#cbd5e1';
            rsUploadArea.style.background = '#f8fafc';
        });

        rsUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            rsUploadArea.style.borderColor = '#cbd5e1';
            rsUploadArea.style.background = '#f8fafc';
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                _rsProcessImageFile(e.dataTransfer.files[0]);
            }
        });

        rsFileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                _rsProcessImageFile(e.target.files[0]);
            }
        });
    }

    const rsRemoveBtn = document.getElementById('rsNewImageRemoveBtn');
    if (rsRemoveBtn) {
        rsRemoveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (rsImgDataHidden) rsImgDataHidden.value = '';
            if (rsFileInput) rsFileInput.value = '';
            if (rsPreviewContainer) rsPreviewContainer.style.display = 'none';
            if (rsPlaceholder) rsPlaceholder.style.display = 'flex';
        });
    }

    const rsReplaceBtn = document.getElementById('rsNewImageReplaceBtn');
    if (rsReplaceBtn && rsFileInput) {
        rsReplaceBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            rsFileInput.click();
        });
    }

    function _rsProcessImageFile(file) {
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
                if (rsImgDataHidden) rsImgDataHidden.value = dataUrl;
                if (rsPreviewImg) rsPreviewImg.src = dataUrl;
                if (rsPreviewContainer) rsPreviewContainer.style.display = 'block';
                if (rsPlaceholder) rsPlaceholder.style.display = 'none';
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    // --- Toggles ---
    const typeDefaultBtn = document.getElementById('rsTypeDefaultBtn');
    const typeSpecialBtn = document.getElementById('rsTypeSpecialBtn');
    const typeFlexibleBtn = document.getElementById('rsTypeFlexibleBtn');
    const typeCustomBtn = document.getElementById('rsTypeCustomBtn');
    const defaultForm = document.getElementById('rsDefaultProductForm');
    const specialForm = document.getElementById('rsSpecialProductForm');
    const flexibleForm = document.getElementById('rsFlexibleProductForm');
    const customForm = document.getElementById('rsCustomProductForm');
    const typeInput = document.getElementById('rsProductType');

    function _rsResetTabs() {
        if(typeDefaultBtn) { typeDefaultBtn.style.background = 'transparent'; typeDefaultBtn.style.color = '#64748b'; typeDefaultBtn.style.boxShadow = 'none'; }
        if(typeSpecialBtn) { typeSpecialBtn.style.background = 'transparent'; typeSpecialBtn.style.color = '#64748b'; typeSpecialBtn.style.boxShadow = 'none'; }
        if(typeFlexibleBtn) { typeFlexibleBtn.style.background = 'transparent'; typeFlexibleBtn.style.color = '#64748b'; typeFlexibleBtn.style.boxShadow = 'none'; }
        if(typeCustomBtn) { typeCustomBtn.style.background = 'transparent'; typeCustomBtn.style.color = '#64748b'; typeCustomBtn.style.boxShadow = 'none'; }
        if(defaultForm) defaultForm.style.display = 'none';
        if(specialForm) specialForm.style.display = 'none';
        if(flexibleForm) flexibleForm.style.display = 'none';
        if(customForm) customForm.style.display = 'none';
    }

    if (typeDefaultBtn) {
        typeDefaultBtn.addEventListener('click', () => {
            typeInput.value = 'default';
            _rsResetTabs();
            typeDefaultBtn.style.background = 'white';
            typeDefaultBtn.style.color = '#8b5cf6';
            typeDefaultBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
            if(defaultForm) defaultForm.style.display = 'block';
            updateFinalPriceAndPayout();
        });
    }
    if (typeSpecialBtn) {
        typeSpecialBtn.addEventListener('click', () => {
            typeInput.value = 'special';
            _rsResetTabs();
            typeSpecialBtn.style.background = 'white';
            typeSpecialBtn.style.color = '#8b5cf6';
            typeSpecialBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
            if(specialForm) specialForm.style.display = 'block';
            
            // Re-trigger spec calculation
            const specBagCost = document.getElementById('rsSpecBagCost');
            if(specBagCost) specBagCost.dispatchEvent(new Event('input', { bubbles: true }));
        });
    }
    if (typeFlexibleBtn) {
        typeFlexibleBtn.addEventListener('click', () => {
            typeInput.value = 'flexible';
            _rsResetTabs();
            typeFlexibleBtn.style.background = 'white';
            typeFlexibleBtn.style.color = '#8b5cf6';
            typeFlexibleBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
            if(flexibleForm) flexibleForm.style.display = 'block';
        });
    }
    if (typeCustomBtn) {
        typeCustomBtn.addEventListener('click', () => {
            typeInput.value = 'custom';
            _rsResetTabs();
            typeCustomBtn.style.background = 'white';
            typeCustomBtn.style.color = '#8b5cf6';
            typeCustomBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
            if(customForm) customForm.style.display = 'block';
            updateFinalPriceAndPayout();
        });
    }

    let lastProfitSource = 'amount';

    function getRetailCost() {
        if (!purchaseCostInput || !piecesInput) return 0;
        const pCost = parseFloat(purchaseCostInput.value) || 0;
        const pieces = parseInt(piecesInput.value) || 1; // Default to 1 if empty/0
        return pCost / pieces;
    }

    function updateTotalCostUI() {
        if (!purchaseCostInput || !quantityInput || !totalCostVal) return;
        const pCost = parseFloat(purchaseCostInput.value) || 0;
        const qty = parseInt(quantityInput.value) || 1;
        const total = pCost * qty;
        totalCostVal.textContent = '₦' + total.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2});
    }

    // Custom Product Total Cost Calculation
    const customCostInput = document.getElementById('rsCustomProductPurchaseCost');
    const customQtyInput = document.getElementById('rsCustomProductQuantity');
    const customTotalCostVal = document.getElementById('rsCustomProductTotalCostVal');

    function updateCustomTotalCostUI() {
        if (!customCostInput || !customTotalCostVal) return;
        const pCost = parseFloat(customCostInput.value) || 0;
        customTotalCostVal.textContent = '₦' + pCost.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2});
    }

    if (customCostInput) customCostInput.addEventListener('input', updateCustomTotalCostUI);
    if (customQtyInput) customQtyInput.addEventListener('input', updateCustomTotalCostUI);


    // Flexible Product Total Cost Calculation
    const flexCostInput = document.getElementById('rsFlexProductPurchaseCost');
    const flexQtyInput = document.getElementById('rsFlexProductQuantity');
    const flexTotalCostVal = document.getElementById('rsFlexProductTotalCostVal');

    function updateFlexTotalCostUI() {
        if (!flexCostInput || !flexTotalCostVal) return;
        const pCost = parseFloat(flexCostInput.value) || 0;
        const qty = parseInt(flexQtyInput ? flexQtyInput.value : 1) || 1;
        const total = pCost * qty;
        flexTotalCostVal.textContent = '₦' + total.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2});
    }

    if (flexCostInput) flexCostInput.addEventListener('input', updateFlexTotalCostUI);
    if (flexQtyInput) flexQtyInput.addEventListener('input', updateFlexTotalCostUI);


    function updateRetailCostUI() {
        const rc = getRetailCost();
        if (retailCostVal) {
            retailCostVal.textContent = '₦' + rc.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2});
        }
    }

    function updateFinalPriceAndPayout() {
        const cost = getRetailCost();
        const profit = parseFloat(profitInput.value) || 0;
        const finalPrice = cost + profit;
        if (priceInput) priceInput.value = finalPrice > 0 ? (finalPrice % 1 === 0 ? finalPrice.toFixed(0) : finalPrice.toFixed(2)) : '';
        
        const payoutEnabled = localStorage.getItem('nd_payout_enabled') === 'true';
        const payoutRate = parseFloat(localStorage.getItem('nd_payout_rate')) || 2;
        const payoutPreview = document.getElementById('rsDefaultPayoutPreviewParent');
        const customPayoutVal = document.getElementById('rsCustomPayoutValue');

        if (payoutEnabled) {
            const payout = finalPrice * (payoutRate / 100);
            if (payoutDisplay) {
                payoutDisplay.textContent = `₦${Number.isInteger(payout) ? payout : payout.toFixed(2)} (${payoutRate}%)`;
                payoutDisplay.style.color = '';
            }
            if (payoutPreview) {
                payoutPreview.style.opacity = '1';
                payoutPreview.style.filter = '';
            }
            if (customPayoutVal) {
                customPayoutVal.textContent = `Inheriting system default (${payoutRate}%)`;
            }
        } else {
            if (payoutDisplay) {
                payoutDisplay.textContent = 'Payout Disabled';
                payoutDisplay.style.color = '#94a3b8';
            }
            if (payoutPreview) {
                payoutPreview.style.opacity = '0.5';
                payoutPreview.style.filter = 'grayscale(1)';
            }
            if (customPayoutVal) {
                customPayoutVal.textContent = "Disabled";
            }
        }
    }

    function onProfitAmountInput() {
        lastProfitSource = 'amount';
        const cost = getRetailCost();
        const profit = parseFloat(profitInput.value) || 0;
        if (profitPercentInput) {
            if (cost > 0 && profit >= 0) {
                const pct = (profit / cost) * 100;
                profitPercentInput.value = pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(2);
            } else {
                profitPercentInput.value = '';
            }
        }
        if (profitBadge) {
            if (cost > 0 && profit > 0) {
                profitBadge.textContent = `₦${profit.toLocaleString()} on ₦${cost.toLocaleString()} retail cost`;
                profitBadge.style.display = 'inline';
            } else {
                profitBadge.style.display = 'none';
            }
        }
        updateFinalPriceAndPayout();
    }

    function onProfitPercentInput() {
        lastProfitSource = 'percent';
        const cost = getRetailCost();
        const pct = parseFloat(profitPercentInput.value) || 0;
        if (profitInput && cost > 0) {
            const profit = (pct / 100) * cost;
            profitInput.value = profit % 1 === 0 ? profit.toFixed(0) : profit.toFixed(2);
        }
        if (profitBadge) {
            if (cost > 0 && pct > 0) {
                const profitCalc = (pct / 100) * cost;
                profitBadge.textContent = `₦${profitCalc.toLocaleString()} on ₦${cost.toLocaleString()} retail cost`;
                profitBadge.style.display = 'inline';
            } else {
                profitBadge.style.display = 'none';
            }
        }
        updateFinalPriceAndPayout();
    }

    function onCostInput() {
        updateRetailCostUI();
        updateTotalCostUI();
        if (lastProfitSource === 'percent') onProfitPercentInput();
        else onProfitAmountInput();
        if (lastWholesaleSource === 'percent') onWholesaleProfitPercentInput();
        else onWholesaleProfitAmountInput();
    }

    let lastWholesaleSource = 'amount';

    function updateWholesaleFinalPrice() {
        const pCost = parseFloat(purchaseCostInput.value) || 0;
        const wProfit = parseFloat(wProfitInput ? wProfitInput.value : 0) || 0;
        if (wPriceInput) {
            wPriceInput.value = (pCost > 0 || wProfit > 0) ? Math.round(pCost + wProfit) : '';
        }
    }

    function onWholesaleProfitAmountInput() {
        lastWholesaleSource = 'amount';
        const pCost = parseFloat(purchaseCostInput.value) || 0;
        const wProfit = parseFloat(wProfitInput ? wProfitInput.value : 0) || 0;
        if (wProfitPercentInput) {
            if (pCost > 0 && wProfit >= 0) {
                const pct = (wProfit / pCost) * 100;
                wProfitPercentInput.value = pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(2);
            } else {
                wProfitPercentInput.value = '';
            }
        }
        updateWholesaleFinalPrice();
    }

    function onWholesaleProfitPercentInput() {
        lastWholesaleSource = 'percent';
        const pCost = parseFloat(purchaseCostInput.value) || 0;
        const pct = parseFloat(wProfitPercentInput ? wProfitPercentInput.value : 0) || 0;
        if (wProfitInput && pCost > 0) {
            const wProfit = (pct / 100) * pCost;
            wProfitInput.value = wProfit % 1 === 0 ? wProfit.toFixed(0) : wProfit.toFixed(2);
        }
        updateWholesaleFinalPrice();
    }

    if (purchaseCostInput) purchaseCostInput.addEventListener('input', onCostInput);
    if (quantityInput) quantityInput.addEventListener('input', onCostInput);
    if (piecesInput) piecesInput.addEventListener('input', onCostInput);
    if (profitInput) profitInput.addEventListener('input', onProfitAmountInput);
    if (profitPercentInput) profitPercentInput.addEventListener('input', onProfitPercentInput);
    if (wProfitInput) wProfitInput.addEventListener('input', onWholesaleProfitAmountInput);
    if (wProfitPercentInput) wProfitPercentInput.addEventListener('input', onWholesaleProfitPercentInput);

    // ========================================
    // Bulk Unit Dropdown (Restock)
    // ========================================
    const rsBulkWrapper = document.getElementById('rsBulkDropdownWrapper');
    const rsBulkTrigger = document.getElementById('rsBulkDropdownTrigger');
    const rsBulkMenu = document.getElementById('rsBulkDropdownMenu');
    const rsBulkHidden = document.getElementById('rsBulkUnitSelect');
    const rsCustomBulkRow = document.getElementById('rsCustomBulkRow');
    const rsCustomBulkInput = document.getElementById('rsCustomBulkInput');
    const rsCustomBulkConfirmBtn = document.getElementById('rsCustomBulkConfirmBtn');

    if (rsBulkTrigger && rsBulkMenu && rsBulkWrapper) {
        rsBulkTrigger.addEventListener('click', () => {
            rsBulkWrapper.classList.toggle('open');
            if (rsCustomBulkRow) rsCustomBulkRow.style.display = 'none';
        });

        document.addEventListener('click', (e) => {
            if (rsBulkWrapper.classList.contains('open') && !rsBulkWrapper.contains(e.target)) {
                rsBulkWrapper.classList.remove('open');
            }
        });

        rsBulkMenu.addEventListener('click', (e) => {
            const opt = e.target.closest('.custom-dropdown-option');
            if (!opt) return;

            const val = opt.getAttribute('data-value');

            if (val === '__custom_bulk__') {
                if (rsCustomBulkRow) rsCustomBulkRow.style.display = 'block';
                return;
            }

            rsBulkMenu.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            rsBulkTrigger.querySelector('.trigger-text').textContent = val;
            if (rsBulkHidden) {
                rsBulkHidden.value = val;
                if (typeof updateRsProductUILabel === 'function') updateRsProductUILabel();
            }
            rsBulkWrapper.classList.remove('open');
            if (rsCustomBulkRow) rsCustomBulkRow.style.display = 'none';
        });

        if (rsCustomBulkConfirmBtn && rsCustomBulkInput) {
            rsCustomBulkConfirmBtn.addEventListener('click', () => {
                let customVal = rsCustomBulkInput.value.trim();
                if (customVal) {
                    customVal = customVal.charAt(0).toUpperCase() + customVal.slice(1);
                } else {
                    rsCustomBulkInput.style.borderColor = '#ff4d4d';
                    setTimeout(() => rsCustomBulkInput.style.borderColor = '', 1500);
                    return;
                }

                const newOpt = document.createElement('div');
                newOpt.className = 'custom-dropdown-option custom-added-unit';
                newOpt.setAttribute('data-value', customVal);

                const textSpan = document.createElement('span');
                textSpan.textContent = customVal;
                newOpt.appendChild(textSpan);

                const removeBtn = document.createElement('div');
                removeBtn.className = 'custom-delete-btn';
                removeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
                removeBtn.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    const isActive = newOpt.classList.contains('active');
                    newOpt.remove();
                    if (isActive) {
                        const firstOpt = rsBulkMenu.querySelector('.custom-dropdown-option');
                        if (firstOpt) {
                            firstOpt.classList.add('active');
                            const v = firstOpt.getAttribute('data-value');
                            rsBulkTrigger.querySelector('.trigger-text').textContent = v;
                            if (rsBulkHidden) {
                                rsBulkHidden.value = v;
                                if (typeof updateRsProductUILabel === 'function') updateRsProductUILabel();
                            }
                        }
                    }
                });
                newOpt.appendChild(removeBtn);

                const createBtn = rsBulkMenu.querySelector('.custom-unit-create-option');
                rsBulkMenu.insertBefore(newOpt, createBtn);

                rsBulkMenu.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('active'));
                newOpt.classList.add('active');
                rsBulkTrigger.querySelector('.trigger-text').textContent = customVal;
                if (rsBulkHidden) {
                    rsBulkHidden.value = customVal;
                    if (typeof updateRsProductUILabel === 'function') updateRsProductUILabel();
                }

                rsCustomBulkInput.value = '';
                rsCustomBulkRow.style.display = 'none';
                rsBulkWrapper.classList.remove('open');
            });
        }
    }

    // Unit dropdown
    if (unitTrigger && unitMenu && unitWrapper) {
        unitTrigger.addEventListener('click', () => {
            unitWrapper.classList.toggle('open');
            if (customUnitRow) customUnitRow.style.display = 'none';
        });

        document.addEventListener('click', (e) => {
            if (unitWrapper.classList.contains('open') && !unitWrapper.contains(e.target)) {
                unitWrapper.classList.remove('open');
            }
        });

        unitMenu.addEventListener('click', (e) => {
            const opt = e.target.closest('.custom-dropdown-option');
            if (!opt) return;
            const val = opt.getAttribute('data-value');
            if (val === '__custom__') {
                if (customUnitRow) { customUnitRow.style.display = 'block'; }
                return;
            }
            unitMenu.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            unitTrigger.querySelector('.trigger-text').textContent = val;
            if (unitHidden) {
                unitHidden.value = val;
                if(typeof updateRsProductUILabel === 'function') updateRsProductUILabel();
            }
            unitWrapper.classList.remove('open');
            if (customUnitRow) customUnitRow.style.display = 'none';
        });

        if (customUnitConfirmBtn && customUnitInput) {
            customUnitConfirmBtn.addEventListener('click', () => {
                let customVal = customUnitInput.value.trim();
                if (!customVal) { customUnitInput.style.borderColor = '#ff4d4d'; setTimeout(() => customUnitInput.style.borderColor = '', 1500); return; }
                if (!customVal.toLowerCase().startsWith('per ')) customVal = 'per ' + customVal;
                const newOpt = document.createElement('div');
                newOpt.className = 'custom-dropdown-option custom-added-unit';
                newOpt.setAttribute('data-value', customVal);
                newOpt.textContent = customVal;
                const createBtn = unitMenu.querySelector('.custom-unit-create-option');
                unitMenu.insertBefore(newOpt, createBtn);
                unitMenu.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('active'));
                newOpt.classList.add('active');
                unitTrigger.querySelector('.trigger-text').textContent = customVal;
                if (unitHidden) unitHidden.value = customVal;
                customUnitInput.value = '';
                customUnitRow.style.display = 'none';
                unitWrapper.classList.remove('open');
                if(typeof updateRsProductUILabel === 'function') updateRsProductUILabel();
            });
        }
    }

    // ========================================
    // Dynamic Label Updater (Restock)
    // ========================================
    function updateRsProductUILabel() {
        const bulkSelect = document.getElementById('rsBulkUnitSelect');
        const bulkVal = bulkSelect ? bulkSelect.value : 'Carton';
        
        const retailHidden = document.getElementById('rsNewProductUnit');
        let retailVal = retailHidden ? retailHidden.value : 'piece';
        retailVal = retailVal.replace(/^per\s+/i, '');
        if(!retailVal) retailVal = 'piece';

        document.querySelectorAll('.rs-lbl-bulk-unit').forEach(el => el.textContent = bulkVal);
        document.querySelectorAll('.rs-lbl-retail-unit').forEach(el => el.textContent = retailVal);
    }
    
    const rsBulkSelElement = document.getElementById('rsBulkUnitSelect');
    if (rsBulkSelElement) {
        rsBulkSelElement.addEventListener('change', updateRsProductUILabel);
    }
    
    // Initial call
    updateRsProductUILabel();

    // Submit
    if (submitBtn) {
        submitBtn.addEventListener('click', () => {
            const name = nameInput ? nameInput.value.trim() : '';
            const price = priceInput ? parseFloat(priceInput.value) : 0;
            const purchaseCostVal = purchaseCostInput ? (parseFloat(purchaseCostInput.value) || 0) : 0;
            const quantity = typeof quantityInput !== 'undefined' && quantityInput ? (parseInt(quantityInput.value) || 1) : 1;
            const pieces = piecesInput ? (parseInt(piecesInput.value) || 1) : 1;
            
            const purchaseCost = purchaseCostVal * quantity; // Total bulk expenditure
            const cost = getRetailCost(); // Retail cost per unit
            
            const profit = parseFloat(profitInput ? profitInput.value : 0) || 0;
            const wholesaleProfit = wProfitInput && wProfitInput.value !== '' ? parseFloat(wProfitInput.value) : '';
            const wholesaleProfitPercent = wProfitPercentInput && wProfitPercentInput.value !== '' ? parseFloat(wProfitPercentInput.value) : '';
            const wholesalePrice = wPriceInput && wPriceInput.value !== '' ? parseFloat(wPriceInput.value) : '';
            const unit = unitHidden ? unitHidden.value : 'per piece';

            const bulkSel = document.getElementById('rsBulkUnitSelect');
            const bulkUnit = bulkSel ? bulkSel.value : 'Carton';

            if (!name) {
                if (nameInput) { nameInput.style.borderColor = '#ff4d4d'; setTimeout(() => nameInput.style.borderColor = '', 1500); }
                return;
            }
            if (isNaN(price) || price <= 0) {
                if (priceInput) { priceInput.style.borderColor = '#ff4d4d'; setTimeout(() => priceInput.style.borderColor = '', 1500); }
                return;
            }

            // Save to nd_products_data (same as Products tab)
            let products = JSON.parse(localStorage.getItem('nd_products_data') || '[]');
            const isNewStock = document.getElementById('rsDefNewStockSwitch') ? document.getElementById('rsDefNewStockSwitch').checked : false;
            const creationDate = new Date().toISOString();
            
            const rsImgDataHidden = document.getElementById('rsNewImageData');
            const imageData = rsImgDataHidden ? rsImgDataHidden.value : '';
            
            const newProductId = 'ndp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
            products.unshift({ id: newProductId, name, price, unit, cost, purchaseCost, pieces, boughtQuantity: quantity, bulkUnit, profit, wholesaleProfit, wholesaleProfitPercent, wholesalePrice, dateAdded: creationDate, isSpecial: false, isNewStock, imageData, topUpHistory: [{ cost: purchaseCost * quantity, qty: quantity, date: creationDate, isNewStock: isNewStock }] });
            localStorage.setItem('nd_products_data', JSON.stringify(products));
            // Sync to in-memory adminProducts if loaded
            if (typeof adminProducts !== 'undefined') {
                adminProducts.unshift({ id: newProductId, name, price, unit, cost, purchaseCost, pieces, boughtQuantity: quantity, bulkUnit, profit, wholesaleProfit, wholesaleProfitPercent, wholesalePrice, dateAdded: creationDate, isSpecial: false, isNewStock, imageData, topUpHistory: [{ cost: purchaseCost * quantity, qty: quantity, date: creationDate, isNewStock: isNewStock }] });
            }

            closeAddRestockModal();
            renderRestockList();

            // Also refresh product tab if it's open
            if (typeof window.renderProductsGlobal === 'function') window.renderProductsGlobal();
        });
    }


    // --- Special Product Calculations ---
    const specName = document.getElementById('rsSpecProductName');
    const specBagCost = document.getElementById('rsSpecBagCost');
    const specBagQuantity = document.getElementById('rsSpecBagQuantity');
    const specBagTotalCostVal = document.getElementById('rsSpecBagTotalCostVal');
    const specBagProfit = document.getElementById('rsSpecBagProfit');
    const specBagProfitPercent = document.getElementById('rsSpecBagProfitPercent');
    const specBagPrice = document.getElementById('rsSpecBagPrice');

    const specCustardsPerBag = document.getElementById('rsSpecCustardsPerBag');
    const specCustardCostVal = document.getElementById('rsSpecCustardCostVal');
    const specCustardProfit = document.getElementById('rsSpecCustardProfit');
    const specCustardProfitPercent = document.getElementById('rsSpecCustardProfitPercent');
    const specCustardPrice = document.getElementById('rsSpecCustardPrice');

    const specCupsPerCustard = document.getElementById('rsSpecCupsPerCustard');
    const specCupCostVal = document.getElementById('rsSpecCupCostVal');
    const specCupProfit = document.getElementById('rsSpecCupProfit');
    const specCupProfitPercent = document.getElementById('rsSpecCupProfitPercent');
    const specCupPrice = document.getElementById('rsSpecCupPrice');

    // Title Listeners for real-time label updates
    const titleBag = document.getElementById('rsSpecBagTitle');
    if(titleBag) titleBag.addEventListener('input', (e) => {
        const val = e.target.value.trim() || 'Container 1';
        document.getElementById('lblRsSpecBagCost').textContent = val;
        document.getElementById('lblRsSpecBagProfit').textContent = val;
        document.getElementById('lblRsSpecBagPrice').textContent = val;
    });

    const titleCustard = document.getElementById('rsSpecCustardTitle');
    if(titleCustard) titleCustard.addEventListener('input', (e) => {
        const val = e.target.value.trim() || 'Container 2';
        document.getElementById('lblRsSpecCustardProfit').textContent = val;
        document.getElementById('lblRsSpecCustardPrice').textContent = val;
    });

    const titleCup = document.getElementById('rsSpecCupTitle');
    if(titleCup) titleCup.addEventListener('input', (e) => {
        const val = e.target.value.trim() || 'Container 3';
        document.getElementById('lblRsSpecCupProfit').textContent = val;
        document.getElementById('lblRsSpecCupPrice').textContent = val;
    });

    function calcSpecial() {
        const bagCost = parseFloat(specBagCost.value) || 0;
        const bagQty = parseInt(specBagQuantity ? specBagQuantity.value : 1) || 1;
        
        if (specBagTotalCostVal) {
            const total = bagCost * bagQty;
            specBagTotalCostVal.textContent = '₦' + total.toLocaleString();
        }

        // Bag Price
        let bagProfit = parseFloat(specBagProfit.value) || 0;
        specBagPrice.value = Math.round(bagCost + bagProfit);

        // Custard Price
        const custards = parseInt(specCustardsPerBag.value) || 0;
        let custardCost = 0;
        if (custards > 0 && bagCost > 0) {
            custardCost = bagCost / custards;
            specCustardCostVal.textContent = '₦' + Math.round(custardCost).toLocaleString();
        } else {
            specCustardCostVal.textContent = '₦0';
        }
        let custardProfit = parseFloat(specCustardProfit.value) || 0;
        specCustardPrice.value = (custardCost > 0 || custardProfit > 0) ? Math.round(custardCost + custardProfit) : '';

        // Cup Price
        const cups = parseInt(specCupsPerCustard.value) || 0;
        let cupCost = 0;
        if (cups > 0 && custardCost > 0) {
            cupCost = custardCost / cups;
            specCupCostVal.textContent = '₦' + Math.round(cupCost).toLocaleString();
        } else {
            specCupCostVal.textContent = '₦0';
        }
        let cupProfit = parseFloat(specCupProfit.value) || 0;
        specCupPrice.value = (cupCost > 0 || cupProfit > 0) ? Math.round(cupCost + cupProfit) : '';

        const payoutEnabled = localStorage.getItem('nd_payout_enabled') === 'true';
        const payoutRateVal = parseFloat(localStorage.getItem('nd_payout_rate')) || 2;
        const rsSpecPayoutParent = document.getElementById('rsSpecPayoutPreviewParent');

        const rsBagPayEl = document.getElementById('rsSpecBagPayoutValue');
        const rsCustardPayEl = document.getElementById('rsSpecCustardPayoutValue');
        const rsCupPayEl = document.getElementById('rsSpecCupPayoutValue');

        if (payoutEnabled) {
            if (rsSpecPayoutParent) { rsSpecPayoutParent.style.opacity = '1'; rsSpecPayoutParent.style.filter = ''; }
            const bagFinal = parseFloat(specBagPrice.value) || 0;
            const custFinal = parseFloat(specCustardPrice.value) || 0;
            const cupFinal = parseFloat(specCupPrice.value) || 0;
            if (rsBagPayEl) rsBagPayEl.textContent = `₦${Number.isInteger(Math.max(0, bagProfit) * payoutRateVal / 100) ? Math.max(0, bagProfit) * payoutRateVal / 100 : (Math.max(0, bagProfit) * payoutRateVal / 100).toFixed(2)} (${payoutRateVal}%)`;
            if (rsCustardPayEl) rsCustardPayEl.textContent = custFinal > 0 ? `₦${Number.isInteger(Math.max(0, custardProfit) * payoutRateVal / 100) ? Math.max(0, custardProfit) * payoutRateVal / 100 : (Math.max(0, custardProfit) * payoutRateVal / 100).toFixed(2)} (${payoutRateVal}%)` : `₦${(0).toFixed(2)} (${payoutRateVal}%)`;
            if (rsCupPayEl) rsCupPayEl.textContent = cupFinal > 0 ? `₦${Number.isInteger(Math.max(0, cupProfit) * payoutRateVal / 100) ? Math.max(0, cupProfit) * payoutRateVal / 100 : (Math.max(0, cupProfit) * payoutRateVal / 100).toFixed(2)} (${payoutRateVal}%)` : `₦${(0).toFixed(2)} (${payoutRateVal}%)`;
        } else {
            if (rsSpecPayoutParent) { rsSpecPayoutParent.style.opacity = '0.5'; rsSpecPayoutParent.style.filter = 'grayscale(1)'; }
            if (rsBagPayEl) rsBagPayEl.textContent = 'Disabled';
            if (rsCustardPayEl) rsCustardPayEl.textContent = 'Disabled';
            if (rsCupPayEl) rsCupPayEl.textContent = 'Disabled';
        }
    }

    if(specBagCost) specBagCost.addEventListener('input', () => {
        // adjust percents
        const cost = parseFloat(specBagCost.value) || 0;
        const profit = parseFloat(specBagProfit.value) || 0;
        if(specBagProfitPercent) specBagProfitPercent.value = cost > 0 ? ((profit/cost)*100).toFixed(2).replace(/\.?0+$/,'') : '';
        calcSpecial();
    });
    if(specBagQuantity) specBagQuantity.addEventListener('input', calcSpecial);
    if(specBagProfit) specBagProfit.addEventListener('input', () => {
        const cost = parseFloat(specBagCost.value) || 0;
        const profit = parseFloat(specBagProfit.value) || 0;
        if(specBagProfitPercent) specBagProfitPercent.value = cost > 0 ? ((profit/cost)*100).toFixed(2).replace(/\.?0+$/,'') : '';
        calcSpecial();
    });
    if(specBagProfitPercent) specBagProfitPercent.addEventListener('input', () => {
        const cost = parseFloat(specBagCost.value) || 0;
        const pct = parseFloat(specBagProfitPercent.value) || 0;
        if(specBagProfit) specBagProfit.value = cost > 0 ? ((pct/100)*cost).toFixed(2).replace(/\.?0+$/,'') : '';
        calcSpecial();
    });

    if(specCustardsPerBag) specCustardsPerBag.addEventListener('input', calcSpecial);
    if(specCustardProfit) specCustardProfit.addEventListener('input', () => {
        const bagCost = parseFloat(specBagCost.value) || 0;
        const custards = parseInt(specCustardsPerBag.value) || 0;
        const cost = (custards > 0) ? bagCost / custards : 0;
        const profit = parseFloat(specCustardProfit.value) || 0;
        if(specCustardProfitPercent) specCustardProfitPercent.value = cost > 0 ? ((profit/cost)*100).toFixed(2).replace(/\.?0+$/,'') : '';
        calcSpecial();
    });
    if(specCustardProfitPercent) specCustardProfitPercent.addEventListener('input', () => {
        const bagCost = parseFloat(specBagCost.value) || 0;
        const custards = parseInt(specCustardsPerBag.value) || 0;
        const cost = (custards > 0) ? bagCost / custards : 0;
        const pct = parseFloat(specCustardProfitPercent.value) || 0;
        if(specCustardProfit) specCustardProfit.value = cost > 0 ? ((pct/100)*cost).toFixed(2).replace(/\.?0+$/,'') : '';
        calcSpecial();
    });

    if(specCupsPerCustard) specCupsPerCustard.addEventListener('input', calcSpecial);
    if(specCupProfit) specCupProfit.addEventListener('input', () => {
        const bagCost = parseFloat(specBagCost.value) || 0;
        const custards = parseInt(specCustardsPerBag.value) || 0;
        const cups = parseInt(specCupsPerCustard.value) || 0;
        const custCost = (custards > 0) ? bagCost / custards : 0;
        const cost = (cups > 0) ? custCost / cups : 0;
        const profit = parseFloat(specCupProfit.value) || 0;
        if(specCupProfitPercent) specCupProfitPercent.value = cost > 0 ? ((profit/cost)*100).toFixed(2).replace(/\.?0+$/,'') : '';
        calcSpecial();
    });
    if(specCupProfitPercent) specCupProfitPercent.addEventListener('input', () => {
        const bagCost = parseFloat(specBagCost.value) || 0;
        const custards = parseInt(specCustardsPerBag.value) || 0;
        const cups = parseInt(specCupsPerCustard.value) || 0;
        const custCost = (custards > 0) ? bagCost / custards : 0;
        const cost = (cups > 0) ? custCost / cups : 0;
        const pct = parseFloat(specCupProfitPercent.value) || 0;
        if(specCupProfit) specCupProfit.value = cost > 0 ? ((pct/100)*cost).toFixed(2).replace(/\.?0+$/,'') : '';
        calcSpecial();
    });

    // Special Submit
    const specSubmitBtn = document.getElementById('rsSpecProductSubmitBtn');
    if (specSubmitBtn) {
        specSubmitBtn.addEventListener('click', () => {
            const name = specName ? specName.value.trim() : '';
            if (!name) {
                if (specName) { specName.style.borderColor = '#ff4d4d'; setTimeout(() => specName.style.borderColor = '', 1500); }
                return;
            }

            const bagCost = parseFloat(specBagCost.value) || 0;
            const bagQty = parseInt(specBagQuantity ? specBagQuantity.value : 1) || 1;
            const bagPrice = parseFloat(specBagPrice.value) || bagCost;
            
            if (bagCost <= 0) {
                if (specBagCost) { specBagCost.style.borderColor = '#ff4d4d'; setTimeout(() => specBagCost.style.borderColor = '', 1500); }
                return;
            }

            const bagTitleEl = document.getElementById('rsSpecBagTitle');
            const custardTitleEl = document.getElementById('rsSpecCustardTitle');
            const cupTitleEl = document.getElementById('rsSpecCupTitle');
            
            const bagTitle = bagTitleEl && bagTitleEl.value.trim() ? bagTitleEl.value.trim() : 'Container 1';
            const custardTitle = custardTitleEl && custardTitleEl.value.trim() ? custardTitleEl.value.trim() : 'Container 2';
            const cupTitle = cupTitleEl && cupTitleEl.value.trim() ? cupTitleEl.value.trim() : 'Container 3';

            const custardsPerBag = parseInt(specCustardsPerBag.value) || 0;
            const cupsPerCustard = parseInt(specCupsPerCustard.value) || 0;

            const rsImgDataHidden = document.getElementById('rsNewImageData');
            const imageData = rsImgDataHidden ? rsImgDataHidden.value : '';

            let products = JSON.parse(localStorage.getItem('nd_products_data') || '[]');
            const specNewProductId = 'ndp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
            products.unshift({
                id: specNewProductId,
                name,
                price: bagPrice,
                unit: 'per ' + bagTitle.toLowerCase(),
                cost: bagCost,
                profit: parseFloat(specBagProfit.value) || 0,
                purchaseCost: bagCost * bagQty,
                boughtQuantity: bagQty,
                dateAdded: new Date().toISOString(),
                isSpecial: true,
                isNewStock: document.getElementById('rsSpecNewStockSwitch') ? document.getElementById('rsSpecNewStockSwitch').checked : false,
                imageData: imageData,
                topUpHistory: [{ cost: bagCost * bagQty, qty: bagQty, date: new Date().toISOString(), isNewStock: document.getElementById('rsSpecNewStockSwitch') ? document.getElementById('rsSpecNewStockSwitch').checked : false }],
                bulkUnit: bagTitle,
                structure: {
                    custardsPerBag: custardsPerBag,
                    cupsPerCustard: cupsPerCustard,
                    bagProfit: parseFloat(specBagProfit.value) || 0,
                    bagProfitPercent: parseFloat(specBagProfitPercent.value) || 0,
                    custardProfit: parseFloat(specCustardProfit.value) || 0,
                    custardProfitPercent: parseFloat(specCustardProfitPercent.value) || 0,
                    cupProfit: parseFloat(specCupProfit.value) || 0,
                    cupProfitPercent: parseFloat(specCupProfitPercent.value) || 0
                },
                packTypes: {
                    bag: { price: bagPrice, title: bagTitle },
                    custard: { price: parseFloat(specCustardPrice.value) || 0, title: custardTitle },
                    cup: { price: parseFloat(specCupPrice.value) || 0, title: cupTitle }
                }
            });
            localStorage.setItem('nd_products_data', JSON.stringify(products));

            if (typeof adminProducts !== 'undefined') {
                adminProducts.unshift({
                    id: specNewProductId,
                    name,
                    price: bagPrice,
                    unit: 'per ' + bagTitle.toLowerCase(),
                    cost: bagCost,
                    profit: parseFloat(specBagProfit.value) || 0,
                    purchaseCost: bagCost * bagQty,
                    boughtQuantity: bagQty,
                    dateAdded: new Date().toISOString(),
                    isSpecial: true,
                    isNewStock: document.getElementById('rsSpecNewStockSwitch') ? document.getElementById('rsSpecNewStockSwitch').checked : false,
                    imageData: imageData,
                    topUpHistory: [{ cost: bagCost * bagQty, qty: bagQty, date: new Date().toISOString(), isNewStock: document.getElementById('rsSpecNewStockSwitch') ? document.getElementById('rsSpecNewStockSwitch').checked : false }],
                    bulkUnit: bagTitle,
                    structure: {
                        custardsPerBag: custardsPerBag,
                        cupsPerCustard: cupsPerCustard,
                        bagProfit: parseFloat(specBagProfit.value) || 0,
                        bagProfitPercent: parseFloat(specBagProfitPercent.value) || 0,
                        custardProfit: parseFloat(specCustardProfit.value) || 0,
                        custardProfitPercent: parseFloat(specCustardProfitPercent.value) || 0,
                        cupProfit: parseFloat(specCupProfit.value) || 0,
                        cupProfitPercent: parseFloat(specCupProfitPercent.value) || 0
                    },
                    packTypes: {
                        bag: { price: bagPrice, title: bagTitle },
                        custard: { price: parseFloat(specCustardPrice.value) || 0, title: custardTitle },
                        cup: { price: parseFloat(specCupPrice.value) || 0, title: cupTitle }
                    }
                });
            }

            closeAddRestockModal();
            renderRestockList();
            if (typeof window.renderProductsGlobal === 'function') window.renderProductsGlobal();
        });
    }


    // Populate payout fields immediately from live global settings
    updateFinalPriceAndPayout();
    calcSpecial();

    // Mark as initialized only after everything completes successfully
    if (modal) modal._rsFormInited = true;
}

// ============================================================
// Import from Existing Product Dropdown (Restock)
// ============================================================
function setupRestockImportDropdown(type) {
    let wrapperId, triggerId, menuId, textPlaceholder, inputMapCb;
    
    if (type === 'default') {
        wrapperId = 'rsImportDropdownWrapper'; triggerId = 'rsImportDropdownTrigger'; menuId = 'rsImportDropdownMenu';
        textPlaceholder = 'Search to copy...';
        inputMapCb = function(p) {
            if(document.getElementById('rsNewProductName')) document.getElementById('rsNewProductName').value = p.name || '';
            if(document.getElementById('rsNewProductPurchaseCost')) {
                let loadedPurchaseCost = (p.cost && p.pieces) ? (parseFloat(p.cost) * parseInt(p.pieces || 1)) : (parseFloat(p.cost) || 0);
                document.getElementById('rsNewProductPurchaseCost').value = loadedPurchaseCost || '';
            }
            if(document.getElementById('rsNewProductPieces')) document.getElementById('rsNewProductPieces').value = p.pieces || 1;
            if(document.getElementById('rsNewProductQuantity')) document.getElementById('rsNewProductQuantity').value = 1;
            if(document.getElementById('rsBulkUnitSelect') && p.bulkUnit) {
                document.getElementById('rsBulkUnitSelect').value = p.bulkUnit;
                const rsBulkTrigText = document.querySelector('#rsBulkDropdownTrigger .trigger-text');
                if(rsBulkTrigText) rsBulkTrigText.textContent = p.bulkUnit;
                const rsBulkMenuUi = document.getElementById('rsBulkDropdownMenu');
                if(rsBulkMenuUi) {
                    rsBulkMenuUi.querySelectorAll('.custom-dropdown-option').forEach(o => {
                        if(o.getAttribute('data-value') === p.bulkUnit) o.classList.add('active');
                        else o.classList.remove('active');
                    });
                }
            }
            if(document.getElementById('rsNewProductProfit')) document.getElementById('rsNewProductProfit').value = p.profit || '';
            if(document.getElementById('rsNewProductPrice')) document.getElementById('rsNewProductPrice').value = p.price || '';
            if(document.getElementById('rsNewProductPurchaseCost')) document.getElementById('rsNewProductPurchaseCost').dispatchEvent(new Event('input'));
            if(document.getElementById('rsNewProductProfit')) document.getElementById('rsNewProductProfit').dispatchEvent(new Event('input'));
            if(p.unit) {
                const hiddenU = document.getElementById('rsNewProductUnit');
                const triggerTextU = document.querySelector('#rsUnitDropdownTrigger .trigger-text');
                if (hiddenU) hiddenU.value = p.unit;
                if (triggerTextU) triggerTextU.textContent = p.unit;
                const unitDropdown = document.getElementById('rsUnitDropdownMenu');
                if(unitDropdown) {
                    unitDropdown.querySelectorAll('.custom-dropdown-option').forEach(o => {
                        if(o.getAttribute('data-value') === p.unit) o.classList.add('active');
                        else o.classList.remove('active');
                    });
                }
                if(typeof updateRsProductUILabel === 'function') updateRsProductUILabel();
            }
        };
    } else if (type === 'special') {
        wrapperId = 'rsSpecImportDropdownWrapper'; triggerId = 'rsSpecImportDropdownTrigger'; menuId = 'rsSpecImportDropdownMenu';
        textPlaceholder = 'Search analytical to copy...';
        inputMapCb = function(p) {
            const s = p.structure || {};
            if(document.getElementById('rsSpecProductName')) document.getElementById('rsSpecProductName').value = p.name || '';
            if(document.getElementById('rsSpecBagCost')) document.getElementById('rsSpecBagCost').value = p.purchaseCost || p.cost || '';
            if(document.getElementById('rsSpecBagQuantity')) document.getElementById('rsSpecBagQuantity').value = 1;
            if(document.getElementById('rsSpecCustardsPerBag')) document.getElementById('rsSpecCustardsPerBag').value = s.custardsPerBag || '';
            if(document.getElementById('rsSpecCupsPerCustard')) document.getElementById('rsSpecCupsPerCustard').value = s.cupsPerCustard || '';
            
            const pTypes = ['bag', 'custard', 'cup'];
            pTypes.forEach(t => {
                const conf = p.packTypes && p.packTypes[t] ? p.packTypes[t] : {};
                const T = t.charAt(0).toUpperCase() + t.slice(1);
                if(document.getElementById('rsSpec'+T+'Title')) document.getElementById('rsSpec'+T+'Title').value = conf.title || '';
                if(document.getElementById('rsSpec'+T+'Profit')) document.getElementById('rsSpec'+T+'Profit').value = s[t+'Profit'] || '';
                if(document.getElementById('rsSpec'+T+'ProfitPercent')) document.getElementById('rsSpec'+T+'ProfitPercent').value = s[t+'ProfitPercent'] || '';
                if(document.getElementById('rsSpec'+T+'Price')) document.getElementById('rsSpec'+T+'Price').value = conf.price || '';
            });
            const triggers = ['rsSpecBagCost', 'rsSpecBagQuantity', 'rsSpecBagProfit', 'rsSpecCustardsPerBag', 'rsSpecCustardProfit', 'rsSpecCupsPerCustard', 'rsSpecCupProfit', 'rsSpecBagTitle', 'rsSpecCustardTitle', 'rsSpecCupTitle'];
            triggers.forEach(t => {
                const el = document.getElementById(t);
                if(el) el.dispatchEvent(new Event('input', { bubbles: true }));
            });
        };
    } else if (type === 'custom') {
        wrapperId = 'rsCustomImportDropdownWrapper'; triggerId = 'rsCustomImportDropdownTrigger'; menuId = 'rsCustomImportDropdownMenu';
        textPlaceholder = 'Search custom to copy...';
        inputMapCb = function(p) {
            if(document.getElementById('rsCustomNewProductName')) document.getElementById('rsCustomNewProductName').value = p.name || '';
            if(document.getElementById('rsCustomNewProductPurchaseCost')) document.getElementById('rsCustomNewProductPurchaseCost').value = p.cost || '';
            if(document.getElementById('rsCustomPurchaseQuantity')) document.getElementById('rsCustomPurchaseQuantity').value = 1;
            
            if(p.bulkUnit && document.getElementById('rsCustomBulkDropdownTrigger')) {
                document.getElementById('rsCustomBulkDropdownTrigger').querySelector('.trigger-text').textContent = p.bulkUnit;
                if(document.getElementById('rsCustomNewProductBulkUnit')) document.getElementById('rsCustomNewProductBulkUnit').value = p.bulkUnit;
            }
            if(p.unit && document.getElementById('rsCustomUnitDropdownTrigger')) {
                document.getElementById('rsCustomUnitDropdownTrigger').querySelector('.trigger-text').textContent = p.unit;
                if(document.getElementById('rsCustomNewProductUnit')) document.getElementById('rsCustomNewProductUnit').value = p.unit;
            }
            if(typeof updateCustomUILabel === 'function') updateCustomUILabel();
        };
    } else if (type === 'flexible') {
        wrapperId = 'rsFlexImportDropdownWrapper'; triggerId = 'rsFlexImportDropdownTrigger'; menuId = 'rsFlexImportDropdownMenu';
        textPlaceholder = 'Search flexible to copy...';
        inputMapCb = function(p) {
            if(document.getElementById('rsFlexProductName')) document.getElementById('rsFlexProductName').value = p.name || '';
            if(document.getElementById('rsFlexProductPurchaseCost')) document.getElementById('rsFlexProductPurchaseCost').value = p.cost || '';
            if(document.getElementById('rsFlexProductQuantity')) document.getElementById('rsFlexProductQuantity').value = 1;
            if(document.getElementById('rsFlexProductPieces')) document.getElementById('rsFlexProductPieces').value = p.pieces || 1;
            
            if(p.bulkUnit && document.getElementById('rsFlexBulkDropdownTrigger')) {
                document.getElementById('rsFlexBulkDropdownTrigger').querySelector('.trigger-text').textContent = p.bulkUnit;
                if(document.getElementById('rsFlexBulkUnitSelect')) document.getElementById('rsFlexBulkUnitSelect').value = p.bulkUnit;
            }
            if(p.unit && document.getElementById('rsFlexUnitDropdownTrigger')) {
                document.getElementById('rsFlexUnitDropdownTrigger').querySelector('.trigger-text').textContent = p.unit;
                if(document.getElementById('rsFlexNewProductUnit')) document.getElementById('rsFlexNewProductUnit').value = p.unit;
            }
            // Trigger recalculation if needed
            if(document.getElementById('rsFlexProductPurchaseCost')) document.getElementById('rsFlexProductPurchaseCost').dispatchEvent(new Event('input'));
        };
    }

    const wrapper = document.getElementById(wrapperId);
    const trigger = document.getElementById(triggerId);
    const menu = document.getElementById(menuId);

    if (!wrapper || !trigger || !menu) return;

    let searchContainer = menu.querySelector('.dropdown-search-container');
    let optionsContainer = menu.querySelector('.dropdown-options-list');

    if (!searchContainer) {
        menu.innerHTML = '';
        searchContainer = document.createElement('div');
        searchContainer.className = 'dropdown-search-container';
        searchContainer.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m21 21-4.34-4.34"></path>
                <circle cx="11" cy="11" r="8"></circle>
            </svg>
            <input type="text" class="dropdown-search-input" placeholder="${textPlaceholder}" autocomplete="off" readonly onfocus="this.removeAttribute('readonly');">
        `;
        menu.appendChild(searchContainer);

        const searchInput = searchContainer.querySelector('.dropdown-search-input');
        searchInput.addEventListener('input', (e) => {
            e.stopPropagation();
            renderOptions(e.target.value);
        });
        searchInput.addEventListener('click', e => e.stopPropagation());

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            wrapper.classList.toggle('open');
            if (wrapper.classList.contains('open')) {
                renderOptions('');
            }
        });

        document.addEventListener('click', (e) => {
            if (wrapper.classList.contains('open') && !wrapper.contains(e.target)) {
                wrapper.classList.remove('open');
            }
        });
    }

    if (!optionsContainer) {
        optionsContainer = document.createElement('div');
        optionsContainer.className = 'dropdown-options-list';
        menu.appendChild(optionsContainer);
    }

    function renderOptions(filter) {
        optionsContainer.innerHTML = '';
        const searchInput = searchContainer.querySelector('.dropdown-search-input');
        if (filter === '' && searchInput) searchInput.value = '';

        const term = filter.toLowerCase();
        let products = [];
        try { products = JSON.parse(localStorage.getItem('nd_products_data') || '[]'); } catch (e) {}

        let filtered = [];
        if (type === 'default') {
            filtered = products.filter(p => !p.isSpecial && !p.isCustom && !p.isHidden && !p.isDeleted && !p.cleared && (p.name || '').toLowerCase().includes(term));
        } else if (type === 'special') {
            filtered = products.filter(p => p.isSpecial && !p.isHidden && !p.isDeleted && !p.cleared && (p.name || '').toLowerCase().includes(term));
        } else if (type === 'custom') {
            filtered = products.filter(p => p.isCustom && !p.isHidden && !p.isDeleted && !p.cleared && (p.name || '').toLowerCase().includes(term));
        } else if (type === 'flexible') {
            filtered = products.filter(p => p.isFlexible && !p.isSpecial && !p.isHidden && !p.isDeleted && !p.cleared && (p.name || '').toLowerCase().includes(term));
        }

        if (filtered.length === 0) {
            optionsContainer.innerHTML = '<div class="dropdown-no-result">No products found</div>';
            return;
        }

        filtered.forEach(p => {
            const opt = document.createElement('div');
            opt.className = 'custom-dropdown-option';
            opt.textContent = p.name;
            opt.addEventListener('click', (e) => {
                e.stopPropagation();
                inputMapCb(p);
                trigger.querySelector('.trigger-text').textContent = 'Copied: ' + p.name;
                wrapper.classList.remove('open');
                
                let subBtnId = 'rsProductSubmitBtn';
                if(type === 'special') { subBtnId = 'rsSpecProductSubmitBtn'; }
                else if(type === 'custom') { subBtnId = 'rsCustomProductSubmitBtn'; }
                else if(type === 'flexible') { subBtnId = 'rsFlexProductSubmitBtn'; }
                
                if(document.getElementById(subBtnId)) document.getElementById(subBtnId).style.display = 'flex';
            });
            optionsContainer.appendChild(opt);
        });
    }
}

function _initRestockImportDropdown() {
    setupRestockImportDropdown('default');
}
function _initRestockSpecImportDropdown() {
    setupRestockImportDropdown('special');
}
function _initRestockCustomImportDropdown() {
    setupRestockImportDropdown('custom');
}
function _initRestockFlexImportDropdown() {
    setupRestockImportDropdown('flexible');
}


// ============================================================
// Product Detail Modal
// ============================================================
function openRestockDetailModal(productName, dateAdded) {
    _restockDetailProductName = productName;
    const products = JSON.parse(localStorage.getItem('nd_products_data') || '[]');
    let p;
    if (dateAdded) { p = products.find(x => x.name === productName && x.dateAdded === dateAdded); }
    else { p = products.find(x => x.name === productName); }
    if (!p) return;
    
    window._rsCurrentProduct = p;

    // Reset views
    const detailView = document.getElementById('rsDetailView');
    const confirmView = document.getElementById('rsActionConfirmView');
    const editView = document.getElementById('rsEditFormView');
    const successView = document.getElementById('rsActionSuccessView');
    if(detailView) detailView.style.display = 'flex';
    if(confirmView) confirmView.style.display = 'none';
    if(editView) editView.style.display = 'none';
    if(successView) successView.style.display = 'none';

    document.getElementById('rdName').textContent = p.name;
    
    const detailsContainer = document.getElementById('rsDynamicDetails');
    if(detailsContainer) {
        detailsContainer.innerHTML = '';
        
        const payoutRate = parseFloat(localStorage.getItem('nd_payout_rate')) || 2;
        const payoutEnabled = localStorage.getItem('nd_payout_enabled') === 'true';
        const dateStr = p.dateAdded 
            ? new Date(p.dateAdded).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
            : 'Unknown';

        // Calculate totals for Restock details
        const boughtQtyRaw = parseFloat(p.boughtQuantity) || 1;
        const boughtQty = Number.isInteger(boughtQtyRaw) ? boughtQtyRaw : parseFloat(boughtQtyRaw.toFixed(2));
        const totalCostStr = p.purchaseCost ? '₦' + parseFloat(p.purchaseCost).toLocaleString() : (p.cost ? '₦' + (parseFloat(p.cost) * boughtQtyRaw).toLocaleString() : '—');
        
        if (!p.isSpecial) {
            const containerName = p.bulkUnit || 'Carton';
            const pieces = p.pieces || 1;
            const unitWord = p.unit || 'per piece';
            const qty = parseFloat(p.boughtQuantity) || 1;
            const totalPurchase = p.purchaseCost || 0;
            const perBulkCost = qty > 0 ? totalPurchase / qty : totalPurchase;
            const retailCost = (pieces > 0 && perBulkCost > 0) ? perBulkCost / pieces : (parseFloat(p.cost) || 0);
            const retailCostStr = retailCost > 0 ? '\u20a6' + retailCost.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2}) : '\u2014';
            const profit = (p.profit !== undefined && p.profit !== '') ? parseFloat(p.profit) : (p.price && retailCost ? parseFloat((p.price - retailCost).toFixed(2)) : 0);
            const profitStr = profit > 0 ? '\u20a6' + profit.toLocaleString() : '\u2014';
            const profitPct = (retailCost > 0 && profit > 0) ? ((profit / retailCost) * 100).toFixed(2).replace(/\.?0+$/, '') : (p.profitPercent || '\u2014');
            
            const payout = p.isFlexible ? 0 : (p.price ? parseFloat(p.price) : 0) * (payoutRate / 100);
            const formatPayout = Number.isInteger(payout) ? payout : payout.toFixed(2);
            
            const wholesaleProfit = parseFloat(p.wholesaleProfit) || 0;
            const wholesaleProfitStr = wholesaleProfit > 0 ? '\u20a6' + wholesaleProfit.toLocaleString() : '\u2014';
            const wholesalePct = p.wholesaleProfitPercent ? p.wholesaleProfitPercent + '%' : '\u2014';
            const wholesalePrice = parseFloat(p.wholesalePrice) || 0;
            const wholesalePriceStr = wholesalePrice > 0 ? '\u20a6' + wholesalePrice.toLocaleString() : '\u2014';

            detailsContainer.innerHTML = '<div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: #eef2ff; border-radius: 12px; border: 1px solid #c7d2fe;">'
                + '<span style="font-size: 0.8rem; font-weight: 700; color: #4338ca; text-transform: uppercase;">Wholesale Purchase</span>'
                + '<span style="font-weight: 900; color: #3730a3; font-size: 1.1rem;">' + boughtQty + ' ' + containerName + '(s)</span>'
                + '</div>'
                + '<div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">'
                + '<span style="font-size: 0.8rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Total Cost</span>'
                + '<span style="font-weight: 800; color: #ef4444;">' + totalCostStr + '</span>'
                + '</div>'
                + '<div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">'
                + '<span style="font-size: 0.8rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Cost per ' + containerName + '</span>'
                + '<span style="font-weight: 800; color: #334155;">\u20a6' + perBulkCost.toLocaleString() + '</span>'
                + '</div>'
                + '<div style="height: 1px; background: #e2e8f0; margin: 4px 0;"></div>'
                + '<div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">'
                + '<span style="font-size: 0.8rem; font-weight: 700; color: #64748b; text-transform: uppercase;">1 ' + containerName + ' Contains</span>'
                + '<span style="font-weight: 800; color: #334155;">' + pieces + ' ' + unitWord + '(s)</span>'
                + '</div>'
                + '<div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">'
                + '<span style="font-size: 0.8rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Cost Price (' + unitWord + ')</span>'
                + '<span style="font-weight: 700; color: #1e293b;">' + retailCostStr + '</span>'
                + '</div>'
                + '<div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">'
                + '<span style="font-size: 0.8rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Profit (\u20a6)</span>'
                + '<span style="font-weight: 700; color: #1e293b;">' + profitStr + '</span>'
                + '</div>'
                + '<div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">'
                + '<span style="font-size: 0.8rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Profit Margin</span>'
                + '<span style="font-weight: 700; color: #1e293b;">' + profitPct + '%</span>'
                + '</div>'
                + '<div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 18px; background: linear-gradient(135deg, #f0f4f8 0%, #e0e7ff 100%); border-radius: 12px; border: 1px solid #bfdbfe;">'
                + '<span style="font-size: 0.8rem; font-weight: 700; color: #0F172A; text-transform: uppercase;">Final Unit Price</span>'
                + '<span style="font-size: 1.2rem; font-weight: 900; color: #8b5cf6;">\u20a6' + (parseFloat(p.price) || 0).toLocaleString() + '</span>'
                + '</div>'
                + (wholesalePrice > 0 ? 
                  '<div style="height: 1px; background: #e2e8f0; margin: 4px 0;"></div>'
                + '<div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: #fdf4ff; border-radius: 12px; border: 1px solid #f5d0fe;">'
                + '<span style="font-size: 0.8rem; font-weight: 700; color: #86198f; text-transform: uppercase;">Wholesale Profit (\u20a6)</span>'
                + '<span style="font-weight: 700; color: #701a75;">' + wholesaleProfitStr + '</span>'
                + '</div>'
                + '<div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: #fdf4ff; border-radius: 12px; border: 1px solid #f5d0fe;">'
                + '<span style="font-size: 0.8rem; font-weight: 700; color: #86198f; text-transform: uppercase;">Wholesale Margin</span>'
                + '<span style="font-weight: 700; color: #701a75;">' + wholesalePct + '</span>'
                + '</div>'
                + '<div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 18px; background: linear-gradient(135deg, #fae8ff 0%, #f3e8ff 100%); border-radius: 12px; border: 1px solid #e9d5ff; margin-bottom: 8px;">'
                + '<span style="font-size: 0.8rem; font-weight: 700; color: #4c1d95; text-transform: uppercase;">Wholesale Price</span>'
                + '<span style="font-size: 1.2rem; font-weight: 900; color: #4c1d95;">' + wholesalePriceStr + '</span>'
                + '</div>'
                : '')
                + (payoutEnabled
                    ? '<div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: #f0fdf4; border-radius: 12px; border: 1px solid #bbf7d0;">'
                    + '<span style="font-size: 0.8rem; font-weight: 700; color: #166534; text-transform: uppercase;">App Payout</span>'
                    + '<span style="font-weight: 700; color: #16a34a;">+\u20a6' + formatPayout + ' (' + payoutRate + '%)</span>'
                    + '</div>'
                    : '<div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; opacity:0.5;">'
                    + '<span style="font-size: 0.8rem; font-weight: 700; color: #94a3b8; text-transform: uppercase;">App Payout</span>'
                    + '<span style="font-weight: 700; color: #94a3b8;">Disabled</span>'
                    + '</div>')
                + '<div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">'
                + '<span style="font-size: 0.8rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Date Added</span>'
                + '<span style="font-weight: 600; color: #475569; font-size: 0.9rem;">' + dateStr + '</span>'
                + '</div>';
        } else {
            const bulkFallback = p.bulkUnit || (p.packTypes && (p.packTypes.bag ? p.packTypes.bag.title : (p.packTypes.c1 ? p.packTypes.c1.title : 'Carton')));
            const s = p.structure || {};
            const perUnitCost = parseFloat(p.cost) || 0;
            const bVal = parseFloat(p.purchaseCost) || 0;
            const cpb = s.custardsPerBag || s.c2sPerC1 || 0;
            const cCost = (cpb && perUnitCost) ? perUnitCost / cpb : 0;
            const cpc = s.cupsPerCustard || s.c3sPerC2 || 0;
            const cupCostVal = (cpc && cCost) ? cCost / cpc : 0;
            
            let html = '<div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: #eef2ff; border-radius: 12px; border: 1px solid #c7d2fe;">'
                + '<span style="font-size: 0.8rem; font-weight: 700; color: #4338ca; text-transform: uppercase;">Wholesale Purchase</span>'
                + '<span style="font-weight: 900; color: #3730a3; font-size: 1.1rem;">' + boughtQty + ' ' + bulkFallback + '(s)</span>'
                + '</div>'
                + '<div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: #fef2f2; border-radius: 12px; border: 1px solid #fecaca;">'
                + '<span style="font-size: 0.8rem; font-weight: 700; color: #b91c1c; text-transform: uppercase;">Bulk Cost</span>'
                + '<span style="font-weight: 800; color: #ef4444;">\u20a6' + parseFloat(bVal).toLocaleString() + '</span>'
                + '</div>'
                + '<div style="height: 1px; background: #e2e8f0; margin: 4px 0;"></div>';
            
            var tierConfigs = [
                { 
                    key: p.packTypes?.c1 ? 'c1' : 'bag', 
                    color: '#1e40af', 
                    bg: '#f0f4f8', 
                    border: '#bfdbfe', 
                    costVal: perUnitCost, 
                    perParent: null, 
                    parentLabel: null, 
                    profitKey: p.packTypes?.c1 ? 'c1Profit' : 'bagProfit', 
                    profitPctKey: p.packTypes?.c1 ? 'c1ProfitPercent' : 'bagProfitPercent' 
                },
                { 
                    key: p.packTypes?.c2 ? 'c2' : 'custard', 
                    color: '#86198f', 
                    bg: '#fdf4ff', 
                    border: '#f5d0fe', 
                    costVal: cCost, 
                    perParent: cpb, 
                    parentLabel: ((p.packTypes && (p.packTypes.bag || p.packTypes.c1) && (p.packTypes.bag || p.packTypes.c1).title) || 'Container 1'), 
                    profitKey: p.packTypes?.c2 ? 'c2Profit' : 'custardProfit', 
                    profitPctKey: p.packTypes?.c2 ? 'c2ProfitPercent' : 'custardProfitPercent' 
                },
                { 
                    key: p.packTypes?.c3 ? 'c3' : 'cup', 
                    color: '#9f1239', 
                    bg: '#fff1f2', 
                    border: '#fecdd3', 
                    costVal: cupCostVal, 
                    perParent: cpc, 
                    parentLabel: ((p.packTypes && (p.packTypes.custard || p.packTypes.c2) && (p.packTypes.custard || p.packTypes.c2).title) || 'Container 2'), 
                    profitKey: p.packTypes?.c3 ? 'c3Profit' : 'cupProfit', 
                    profitPctKey: p.packTypes?.c3 ? 'c3ProfitPercent' : 'cupProfitPercent' 
                }
            ];
            
            tierConfigs.forEach(function(t) {
                var data = p.packTypes && p.packTypes[t.key];
                if (!data) return;
                var title = data.title || t.key;
                var price = parseFloat(data.price) || 0;
                var costV = t.costVal || 0;
                var profitV = (s[t.profitKey] !== undefined && s[t.profitKey] !== '') ? parseFloat(s[t.profitKey]) : ((price && costV) ? parseFloat((price - costV).toFixed(2)) : 0);
                var profitPctV = (s[t.profitPctKey] !== undefined && s[t.profitPctKey] !== '' && parseFloat(s[t.profitPctKey]) > 0) ? parseFloat(s[t.profitPctKey]).toFixed(2).replace(/\.?0+$/, '') : ((costV > 0 && profitV > 0) ? ((profitV / costV) * 100).toFixed(2).replace(/\.?0+$/, '') : '\u2014');
                var isTierFlexible = p.isFlexible && (t.key === 'c3' || t.key === 'cup');
                var payV = isTierFlexible ? 0 : price * (payoutRate / 100);
                var formPayV = Number.isInteger(payV) ? payV : payV.toFixed(2);
                
                html += '<div style="background: ' + t.bg + '; border: 1px solid ' + t.border + '; border-radius: 12px; padding: 14px 18px; display: flex; flex-direction: column; gap: 8px;">'
                    + '<span style="font-size: 0.8rem; font-weight: 800; color: ' + t.color + '; text-transform: uppercase; border-bottom: 1px solid ' + t.border + '; padding-bottom: 6px;">' + title + ' Format</span>';
                    
                if (t.perParent) {
                    html += '<div style="display: flex; justify-content: space-between; align-items: center;">'
                        + '<span style="font-size: 0.8rem; font-weight: 600; color: #475569;">Per ' + t.parentLabel + '</span>'
                        + '<span style="font-weight: 700; color: #334155;">' + t.perParent + ' ' + title + '(s)</span>'
                        + '</div>';
                }
                
                html += '<div style="display: flex; justify-content: space-between; align-items: center;">'
                    + '<span style="font-size: 0.8rem; font-weight: 600; color: #475569;">Cost per ' + title + '</span>'
                    + '<span style="font-weight: 700; color: #334155;">\u20a6' + costV.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2}) + '</span>'
                    + '</div>'
                    + '<div style="display: flex; justify-content: space-between; align-items: center;">'
                    + '<span style="font-size: 0.8rem; font-weight: 600; color: #475569;">Profit</span>'
                    + '<span style="font-weight: 700; color: #334155;">' + (profitV > 0 ? '\u20a6' + profitV.toLocaleString() : '\u2014') + '</span>'
                    + '</div>'
                    + '<div style="display: flex; justify-content: space-between; align-items: center;">'
                    + '<span style="font-size: 0.8rem; font-weight: 600; color: #475569;">Margin</span>'
                    + '<span style="font-weight: 700; color: #334155;">' + profitPctV + '%</span>'
                    + '</div>'
                    + '<div style="display: flex; justify-content: space-between; align-items: center;">'
                    + '<span style="font-size: 0.8rem; font-weight: 600; color: #475569;">Retail Price</span>'
                    + '<span style="font-size: 1.1rem; font-weight: 900; color: ' + t.color + ';">\u20a6' + (price > 0 ? price.toLocaleString() : '0') + '</span>'
                    + '</div>'
                    + (payoutEnabled
                    ? (isTierFlexible
                      ? '<div style="display: flex; justify-content: space-between; align-items: center; opacity:0.5;">'
                      + '<span style="font-size: 0.75rem; font-weight: 600; color: #94a3b8; text-transform: uppercase;">Payout</span>'
                      + '<span style="font-weight: 700; color: #94a3b8; font-size: 0.85rem;">Disabled</span>'
                      + '</div>'
                      : '<div style="display: flex; justify-content: space-between; align-items: center;">'
                      + '<span style="font-size: 0.75rem; font-weight: 600; color: #64748b; text-transform: uppercase;">Payout</span>'
                      + '<span style="font-weight: 700; color: #16a34a; font-size: 0.85rem;">+\u20a6' + formPayV + ' (' + payoutRate + '%)</span>'
                      + '</div>')
                    : '<div style="display: flex; justify-content: space-between; align-items: center; opacity:0.5;">'
                    + '<span style="font-size: 0.75rem; font-weight: 600; color: #94a3b8; text-transform: uppercase;">Payout</span>'
                    + '<span style="font-weight: 700; color: #94a3b8; font-size: 0.85rem;">Disabled</span>'
                    + '</div>');
                html += '</div>';
            });

            html += '<div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; margin-top: 6px;">'
                + '<span style="font-size: 0.8rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Date Added</span>'
                + '<span style="font-weight: 600; color: #475569; font-size: 0.9rem;">' + dateStr + '</span>'
                + '</div>';
            detailsContainer.innerHTML = html;
        }
    }

    // Bind action buttons
    _bindRsActionButtons(p);

    const modal = document.getElementById('restockDetailModal');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    }
}

function _bindRsActionButtons(p) {
    const editBtn = document.getElementById('rsInitEditBtn');
    const editPriceBtn = document.getElementById('rsInitEditPriceBtn');
    const clearBtn = document.getElementById('rsInitClearBtn');
    const deleteBtn = document.getElementById('rsInitDeleteBtn');
    const cancelBtn = document.getElementById('rsCancelActionBtn');
    const confirmBtn = document.getElementById('rsConfirmActionBtn');
    const saveBtn = document.getElementById('rsSaveEditBtn');
    const savePriceBtn = document.getElementById('rsSaveEditPriceBtn');
    const topUpBtn = document.getElementById('rsInitTopUpBtn');
    const undoTopUpBtn = document.getElementById('rsUndoTopUpBtn');
    
    const stockBtn = document.getElementById('rsInitStockBtn');
    
    // Conditional logic for Undo Top Up button
    if (undoTopUpBtn) {
        if (p.topUpHistory && p.topUpHistory.length > 1) {
            undoTopUpBtn.style.display = 'block';
        } else {
            undoTopUpBtn.style.display = 'none';
        }
    }
    
    // Clone and replace to remove old listeners
    const editImageBtn = document.getElementById('rsInitEditImageBtn');
    [editBtn, editPriceBtn, clearBtn, deleteBtn, cancelBtn, confirmBtn, saveBtn, savePriceBtn, stockBtn, topUpBtn, undoTopUpBtn, editImageBtn].forEach(btn => {
        if(!btn) return;
        const clone = btn.cloneNode(true);
        btn.parentNode.replaceChild(clone, btn);
    });
    
    // Re-query after cloning
    document.getElementById('rsInitEditBtn')?.addEventListener('click', () => _rsOpenActionPin('edit'));
    document.getElementById('rsInitEditPriceBtn')?.addEventListener('click', () => _rsOpenActionPin('edit_price'));
    document.getElementById('rsInitTopUpBtn')?.addEventListener('click', () => _rsOpenActionPin('top_up'));
    document.getElementById('rsUndoTopUpBtn')?.addEventListener('click', () => _rsOpenActionPin('undo_top_up'));
    document.getElementById('rsInitClearBtn')?.addEventListener('click', () => _rsOpenActionPin('clear'));
    document.getElementById('rsInitDeleteBtn')?.addEventListener('click', () => _rsOpenActionPin('delete'));
    document.getElementById('rsInitStockBtn')?.addEventListener('click', () => _rsOpenStockView(p));
    document.getElementById('rsInitEditImageBtn')?.addEventListener('click', () => _rsOpenActionPin('edit_image'));
    
    document.getElementById('rsCancelActionBtn')?.addEventListener('click', () => {
        document.getElementById('rsActionConfirmView').style.display = 'none';
        document.getElementById('rsDetailView').style.display = 'flex';
    });
    
    document.getElementById('rsConfirmActionBtn')?.addEventListener('click', () => {
        const pwdInput = document.getElementById('rsActionPasswordInput');
        const requiredPin = localStorage.getItem('nd_delete_pin') || '1234';
        
        if (!pwdInput || pwdInput.value !== requiredPin) {
            if(pwdInput) { 
                pwdInput.style.borderColor = '#ef4444'; 
                setTimeout(() => pwdInput.style.borderColor = '#fca5a5', 1000); 
            }
            return;
        }
        
        document.getElementById('rsActionConfirmView').style.display = 'none';
        
        if (window._rsCurrentAction === 'edit') {
            _rsOpenEditForm();
        } else if (window._rsCurrentAction === 'edit_price') {
            _rsOpenEditPriceForm();
        } else if (window._rsCurrentAction === 'clear') {
            _rsExecuteClear();
        } else if (window._rsCurrentAction === 'delete') {
            _rsExecuteDelete();
        } else if (window._rsCurrentAction === 'edit_image') {
            _rsOpenEditImageView(p);
        } else if (window._rsCurrentAction === 'top_up') {
            // Close detail modal and open top-up
            const detailModal = document.getElementById('restockDetailModal');
            if (detailModal) { detailModal.classList.remove('show'); detailModal.style.display = 'none'; }
            _restockDetailProductName = null;
            window._rsCurrentAction = null;
            setTimeout(() => window.openTopUpModal(p.id || p.name), 50);
        } else if (window._rsCurrentAction === 'undo_top_up') {
            _rsExecuteUndoTopUp();
        }
    });
    
    // Wire up Save Detail Image button
    document.getElementById('rsSaveDetailImageBtn')?.addEventListener('click', () => _rsSaveDetailImage());
    document.getElementById('rsEditImageClose')?.addEventListener('click', () => {
        document.getElementById('rsEditImageView').style.display = 'none';
        document.getElementById('rsDetailView').style.display = 'flex';
    });
    
    document.getElementById('rsSaveEditBtn')?.addEventListener('click', () => {
        let products = JSON.parse(localStorage.getItem('nd_products_data') || '[]');
        const pp = window._rsCurrentProduct;
        const index = pp.id ? products.findIndex(item => item.id === pp.id) : products.findIndex(item => item.name === pp.name && item.dateAdded === pp.dateAdded);
        if(index === -1) return alert('Product reference not found!');
        
        if(pp.packTypes || pp.isSpecial) {
            // Analytical product full save
            const bagTitle = document.getElementById('rsEditAnaBagTitle').value.trim() || 'Container 1';
            const custardTitle = document.getElementById('rsEditAnaCustardTitle').value.trim() || 'Container 2';
            const cupTitle = document.getElementById('rsEditAnaCupTitle').value.trim() || 'Container 3';
            const newName = document.getElementById('rsEditAnaName').value.trim() || pp.name;
            // Block if new name already belongs to a different product
            if (newName !== pp.name) {
                const dup = products.some((item, i) => i !== index && item.name === newName && !item.isDeleted && !item.cleared);
                if (dup) {
                    (typeof customAlert !== 'undefined' ? customAlert : alert)('A product named "' + newName + '" already exists. Please use a different name.');
                    return;
                }
            }
            const bagCost = parseFloat(document.getElementById('rsEditAnaBagCost').value) || 0;
            const bagQty = parseInt(document.getElementById('rsEditAnaBagQty').value) || 1;
            const bagProfit = parseFloat(document.getElementById('rsEditAnaBagProfit').value) || 0;
            const bagProfitPct = parseFloat(document.getElementById('rsEditAnaBagProfitPct').value) || 0;
            const bagPrice = parseFloat(document.getElementById('rsEditAnaBagPrice').value) || 0;
            const custardsPerBag = parseInt(document.getElementById('rsEditAnaCustardsPerBag').value) || 0;
            const custardProfit = parseFloat(document.getElementById('rsEditAnaCustardProfit').value) || 0;
            const custardProfitPct = parseFloat(document.getElementById('rsEditAnaCustardProfitPct').value) || 0;
            const custardPrice = parseFloat(document.getElementById('rsEditAnaCustardPrice').value) || 0;
            const cupsPerCustard = parseInt(document.getElementById('rsEditAnaCupsPerCustard').value) || 0;
            const cupProfit = parseFloat(document.getElementById('rsEditAnaCupProfit').value) || 0;
            const cupProfitPct = parseFloat(document.getElementById('rsEditAnaCupProfitPct').value) || 0;
            const cupPrice = parseFloat(document.getElementById('rsEditAnaCupPrice').value) || 0;
            
            const isFlexible = !!products[index].isFlexible;
            const useCKeys = pp.packTypes && (pp.packTypes.c1 !== undefined || pp.packTypes.c2 !== undefined || pp.packTypes.c3 !== undefined);

            products[index].name = newName;
            products[index].purchaseCost = bagCost * bagQty;
            products[index].cost = bagCost;
            products[index].boughtQuantity = bagQty;
            products[index].profit = bagProfit;
            products[index].price = bagPrice;
            products[index].unit = 'per ' + bagTitle.toLowerCase();
            products[index].bulkUnit = bagTitle;
            
            products[index].structure = products[index].structure || {};
            products[index].structure.custardsPerBag = custardsPerBag;
            products[index].structure.c2sPerC1 = custardsPerBag;
            products[index].structure.cupsPerCustard = cupsPerCustard;
            products[index].structure.c3sPerC2 = cupsPerCustard;
            
            products[index].structure.bagProfit = bagProfit;
            products[index].structure.c1Profit = bagProfit;
            products[index].structure.bagProfitPercent = bagProfitPct;
            products[index].structure.c1ProfitPercent = bagProfitPct;

            products[index].structure.custardProfit = custardProfit;
            products[index].structure.c2Profit = custardProfit;
            products[index].structure.custardProfitPercent = custardProfitPct;
            products[index].structure.c2ProfitPercent = custardProfitPct;

            if (isFlexible) {
                products[index].structure.cupProfit = 0;
                products[index].structure.c3Profit = 0;
                products[index].structure.cupProfitPercent = 0;
                products[index].structure.c3ProfitPercent = 0;
            } else {
                products[index].structure.cupProfit = cupProfit;
                products[index].structure.c3Profit = cupProfit;
                products[index].structure.cupProfitPercent = cupProfitPct;
                products[index].structure.c3ProfitPercent = cupProfitPct;
            }

            products[index].packTypes = products[index].packTypes || {};
            if (useCKeys) {
                products[index].packTypes.c1 = { price: bagPrice, title: bagTitle };
                products[index].packTypes.c2 = { price: custardPrice, title: custardTitle };
                products[index].packTypes.c3 = { price: isFlexible ? "Flexible" : cupPrice, title: cupTitle };
                // Keep bag/custard/cup fields in sync just in case
                products[index].packTypes.bag = { price: bagPrice, title: bagTitle };
                products[index].packTypes.custard = { price: custardPrice, title: custardTitle };
                products[index].packTypes.cup = { price: isFlexible ? 0 : cupPrice, title: cupTitle };
            } else {
                products[index].packTypes.bag = { price: bagPrice, title: bagTitle };
                products[index].packTypes.custard = { price: custardPrice, title: custardTitle };
                products[index].packTypes.cup = { price: isFlexible ? 0 : cupPrice, title: cupTitle };
            }
        } else {
            // Default product full save
            const newName = document.getElementById('rsEditDefName').value.trim() || pp.name;
            // Block if new name already belongs to a different product
            if (newName !== pp.name) {
                const dup = products.some((item, i) => i !== index && item.name === newName && !item.isDeleted && !item.cleared);
                if (dup) {
                    (typeof customAlert !== 'undefined' ? customAlert : alert)('A product named "' + newName + '" already exists. Please use a different name.');
                    return;
                }
            }
            const bulkCost = parseFloat(document.getElementById('rsEditDefBulkCost').value) || 0;
            const qty = parseInt(document.getElementById('rsEditDefQuantity').value) || 1;
            const pieces = parseInt(document.getElementById('rsEditDefPieces').value) || 1;
            const profit = parseFloat(document.getElementById('rsEditDefProfit').value) || 0;
            const profitPct = parseFloat(document.getElementById('rsEditDefProfitPercent').value) || 0;
            const finalPrice = parseFloat(document.getElementById('rsEditDefPrice').value) || 0;
            const bulkUnit = document.getElementById('rsEditBulkUnitSelect')?.value || pp.bulkUnit || 'Carton';
            const unit = document.getElementById('rsEditNewProductUnit')?.value || pp.unit || 'per piece';
            
            products[index].name = newName;
            products[index].purchaseCost = bulkCost * qty;
            products[index].cost = pieces > 0 ? bulkCost / pieces : 0;
            products[index].boughtQuantity = qty;
            products[index].pieces = pieces;
            products[index].profit = profit;
            products[index].profitPercent = profitPct;
            products[index].price = finalPrice;
            products[index].bulkUnit = bulkUnit;
            products[index].unit = unit;
        }
        const oldCost = pp.purchaseCost || 0;
        const newCost = products[index].purchaseCost || 0;
        const diff = newCost - oldCost;
        
        if (Math.abs(diff) > 0.001) {
            let expenses = JSON.parse(localStorage.getItem('nd_expenses_notebook') || '[]');
            const now = new Date();
            const day = now.getDate();
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = months[now.getMonth()];
            const year = now.getFullYear();
            let hours = now.getHours();
            const ampm = hours >= 12 ? 'pm' : 'am';
            hours = hours % 12 || 12;
            const mins = String(now.getMinutes()).padStart(2, '0');
            const dateStr = `${day} ${month}, ${year} · ${hours}:${mins} ${ampm}`;
            
            expenses.push({
                id: 'exp_' + Date.now() + Math.floor(Math.random()*1000),
                title: `Cost Correction: ${products[index].name} (${diff > 0 ? 'Increase' : 'Decrease'})`,
                amount: diff,
                dateStr: dateStr,
                timestamp: now.toISOString(),
                year: year,
                monthIdx: now.getMonth()
            });
            localStorage.setItem('nd_expenses_notebook', JSON.stringify(expenses));
            if (typeof renderExpenses === 'function') renderExpenses();
        }

        localStorage.setItem('nd_products_data', JSON.stringify(products));
        if (typeof adminProducts !== 'undefined') adminProducts[index] = products[index];
        
        renderRestockList();
        if (typeof window.renderProductsGlobal === 'function') window.renderProductsGlobal();
        
        _rsShowSuccess("Product Updated", "All changes saved successfully.");
    });
    
    document.getElementById('rsSaveEditPriceBtn')?.addEventListener('click', () => {
        let products = JSON.parse(localStorage.getItem('nd_products_data') || '[]');
        const pp = window._rsCurrentProduct;
        const index = pp.id ? products.findIndex(item => item.id === pp.id) : products.findIndex(item => item.name === pp.name && item.dateAdded === pp.dateAdded);
        if(index === -1) return alert('Product reference not found!');
        
        if(pp.packTypes || pp.isSpecial) {
            // Analytical
            const _anaNewName = document.getElementById('rsEditPriceAnaName').value.trim() || products[index].name;
            if (_anaNewName !== pp.name) {
                const dup = products.some((item, i) => i !== index && item.name === _anaNewName && !item.isDeleted && !item.cleared);
                if (dup) {
                    (typeof customAlert !== 'undefined' ? customAlert : alert)('A product named "' + _anaNewName + '" already exists. Please use a different name.');
                    return;
                }
            }
            products[index].name = _anaNewName;
            
            const bagTitle = document.getElementById('rsEditPriceAnaBagTitleText').value.trim() || 'Container 1';
            const custardTitle = document.getElementById('rsEditPriceAnaCustardTitleText').value.trim() || 'Container 2';
            const cupTitle = document.getElementById('rsEditPriceAnaCupTitleText').value.trim() || 'Container 3';
            const cpb = parseInt(document.getElementById('rsEditPriceAnaCustardsPerBag').value) || 1;
            const cpc = parseInt(document.getElementById('rsEditPriceAnaCupsPerCustard').value) || 1;
            
            // Note: We DO NOT update products[index].purchaseCost here to preserve historical cost of goods.
            // We DO update the per-unit cost field.
            const bagCost = parseFloat(document.getElementById('rsEditPriceAnaBagCost').value) || 0;
            products[index].cost = bagCost;
            
            const isFlexible = !!products[index].isFlexible;
            const useCKeys = pp.packTypes && (pp.packTypes.c1 !== undefined || pp.packTypes.c2 !== undefined || pp.packTypes.c3 !== undefined);

            products[index].structure = products[index].structure || {};
            products[index].structure.custardsPerBag = cpb;
            products[index].structure.c2sPerC1 = cpb;
            products[index].structure.cupsPerCustard = cpc;
            products[index].structure.c3sPerC2 = cpc;
            
            const bagProfit = parseFloat(document.getElementById('rsEditPriceAnaBagProfit').value) || 0;
            const bagProfitPct = parseFloat(document.getElementById('rsEditPriceAnaBagProfitPct').value) || 0;
            const custardProfit = parseFloat(document.getElementById('rsEditPriceAnaCustardProfit').value) || 0;
            const custardProfitPct = parseFloat(document.getElementById('rsEditPriceAnaCustardProfitPct').value) || 0;
            const cupProfit = parseFloat(document.getElementById('rsEditPriceAnaCupProfit').value) || 0;
            const cupProfitPct = parseFloat(document.getElementById('rsEditPriceAnaCupProfitPct').value) || 0;

            products[index].structure.bagProfit = bagProfit;
            products[index].structure.c1Profit = bagProfit;
            products[index].structure.bagProfitPercent = bagProfitPct;
            products[index].structure.c1ProfitPercent = bagProfitPct;
            
            products[index].structure.custardProfit = custardProfit;
            products[index].structure.c2Profit = custardProfit;
            products[index].structure.custardProfitPercent = custardProfitPct;
            products[index].structure.c2ProfitPercent = custardProfitPct;
            
            if (isFlexible) {
                products[index].structure.cupProfit = 0;
                products[index].structure.c3Profit = 0;
                products[index].structure.cupProfitPercent = 0;
                products[index].structure.c3ProfitPercent = 0;
            } else {
                products[index].structure.cupProfit = cupProfit;
                products[index].structure.c3Profit = cupProfit;
                products[index].structure.cupProfitPercent = cupProfitPct;
                products[index].structure.c3ProfitPercent = cupProfitPct;
            }

            products[index].packTypes = products[index].packTypes || {};
            const bagPrice = parseFloat(document.getElementById('rsEditPriceAnaBagPrice').value) || 0;
            const custardPrice = parseFloat(document.getElementById('rsEditPriceAnaCustardPrice').value) || 0;
            const cupPrice = parseFloat(document.getElementById('rsEditPriceAnaCupPrice').value) || 0;

            if (useCKeys) {
                products[index].packTypes.c1 = { price: bagPrice, title: bagTitle, profit: bagProfit };
                products[index].packTypes.c2 = { price: custardPrice, title: custardTitle, profit: custardProfit };
                products[index].packTypes.c3 = { price: isFlexible ? "Flexible" : cupPrice, title: cupTitle, profit: isFlexible ? 0 : cupProfit };
                
                products[index].packTypes.bag = { price: bagPrice, title: bagTitle, profit: bagProfit };
                products[index].packTypes.custard = { price: custardPrice, title: custardTitle, profit: custardProfit };
                products[index].packTypes.cup = { price: isFlexible ? 0 : cupPrice, title: cupTitle, profit: isFlexible ? 0 : cupProfit };
            } else {
                products[index].packTypes.bag = { price: bagPrice, title: bagTitle, profit: bagProfit };
                products[index].packTypes.custard = { price: custardPrice, title: custardTitle, profit: custardProfit };
                products[index].packTypes.cup = { price: isFlexible ? 0 : cupPrice, title: cupTitle, profit: isFlexible ? 0 : cupProfit };
            }

            products[index].bulkUnit = bagTitle;
            products[index].unit = 'per ' + bagTitle.toLowerCase();
            products[index].price = bagPrice;
        } else {
            // Default
            const _defNewName = document.getElementById('rsEditPriceDefName').value.trim() || products[index].name;
            if (_defNewName !== pp.name) {
                const dup = products.some((item, i) => i !== index && item.name === _defNewName && !item.isDeleted && !item.cleared);
                if (dup) {
                    (typeof customAlert !== 'undefined' ? customAlert : alert)('A product named "' + _defNewName + '" already exists. Please use a different name.');
                    return;
                }
            }
            products[index].name = _defNewName;
            const bulkUnit = document.getElementById('rsEditPriceDefBulk')?.value || products[index].bulkUnit;
            const unit = document.getElementById('rsEditPriceDefUnit')?.value || products[index].unit;
            const pieces = parseInt(document.getElementById('rsEditPriceDefPieces').value) || 1;
            
            // Calculate new purely retail base cost (used for future profit math, doesn't touch batch purchaseCost)
            const inputBulkCost = parseFloat(document.getElementById('rsEditPriceDefBulkCost').value) || 0;
            const costPerPiece = pieces > 0 ? (inputBulkCost / pieces) : 0;
            
            products[index].bulkUnit = bulkUnit;
            products[index].unit = unit;
            products[index].pieces = pieces;
            
            // We DO NOT update products[index].purchaseCost or boughtQuantity
            // We DO update the `cost` field since that's the base piece cost for standard retail computations
            products[index].cost = costPerPiece;
            
            products[index].profit = parseFloat(document.getElementById('rsEditPriceDefProfit').value) || 0;
            products[index].profitPercent = parseFloat(document.getElementById('rsEditPriceDefProfitPercent').value) || 0;
            products[index].price = parseFloat(document.getElementById('rsEditPriceDefPrice').value) || 0;
        }
        
        localStorage.setItem('nd_products_data', JSON.stringify(products));
        if (typeof adminProducts !== 'undefined') adminProducts[index] = products[index];
        
        renderRestockList();
        if (typeof window.renderProductsGlobal === 'function') window.renderProductsGlobal();
        
        document.getElementById('rsEditPriceFormView').style.display = 'none';
        _rsShowSuccess("Price Updated", "New retail pricing saved successfully.");
    });
}

function _rsOpenActionPin(actionType) {
    window._rsCurrentAction = actionType;
    document.getElementById('rsDetailView').style.display = 'none';
    document.getElementById('rsActionConfirmView').style.display = 'flex';
    
    const svgDel = document.getElementById('rsActionSvgDelete');
    const svgClear = document.getElementById('rsActionSvgClear');
    const svgEdit = document.getElementById('rsActionSvgEdit');
    const title = document.getElementById('rsActionTitle');
    const desc = document.getElementById('rsActionDesc');
    const iconWrapper = document.getElementById('rsActionIcon');
    const btn = document.getElementById('rsConfirmActionBtn');
    
    if(svgDel) svgDel.style.display = 'none';
    if(svgClear) svgClear.style.display = 'none';
    if(svgEdit) svgEdit.style.display = 'none';

    if (actionType === 'delete') {
        if(svgDel) svgDel.style.display = 'block';
        title.textContent = 'Delete Product?';
        desc.innerHTML = `Are you sure? This will <strong>completely erase</strong> the product and all its records.`;
        iconWrapper.style.color = '#ef4444';
        iconWrapper.style.background = '#fef2f2';
        btn.textContent = 'Delete';
        btn.className = 'admin-modern-btn danger';
        btn.style.backgroundColor = '';
        btn.style.color = '';
        btn.style.borderColor = '';
    } 
    else if (actionType === 'clear') {
        if(svgClear) svgClear.style.display = 'block';
        title.textContent = 'Clear Product?';
        desc.innerHTML = `This will hide the product from view but <strong>keep its history</strong> in your records.`;
        iconWrapper.style.color = '#f59e0b';
        iconWrapper.style.background = '#fffbeb';
        btn.textContent = 'Clear';
        btn.className = 'admin-modern-btn warning';
        btn.style.backgroundColor = '#f59e0b';
        btn.style.color = 'white';
        btn.style.borderColor = '#d97706';
    }
    else if (actionType === 'edit') {
        if(svgEdit) svgEdit.style.display = 'block';
        title.textContent = 'Edit Product?';
        desc.textContent = 'Enter your PIN to edit this product\'s blueprint.';
        iconWrapper.style.color = '#8b5cf6';
        iconWrapper.style.background = '#f0f4f8';
        btn.textContent = 'Enter Edit Mode';
        btn.className = 'admin-modern-btn primary';
        btn.style.backgroundColor = '#8b5cf6';
        btn.style.color = 'white';
        btn.style.borderColor = '#8b5cf6';
    }
    else if (actionType === 'undo_top_up') {
        if(svgClear) svgClear.style.display = 'block';
        title.textContent = 'Undo Last Top Up?';
        desc.innerHTML = `This will revert the most recent top up, deducting its cost and quantity.`;
        iconWrapper.style.color = '#f59e0b';
        iconWrapper.style.background = '#fffbeb';
        btn.textContent = 'Undo';
        btn.className = 'admin-modern-btn warning';
        btn.style.backgroundColor = '#f59e0b';
        btn.style.color = 'white';
        btn.style.borderColor = '#d97706';
    }
    else if (actionType === 'edit_price') {
        if(svgEdit) svgEdit.style.display = 'block';
        title.textContent = 'Edit Price?';
        desc.textContent = 'Enter your PIN to edit this product\'s retail pricing.';
        iconWrapper.style.color = '#8b5cf6';
        iconWrapper.style.background = '#f5f3ff';
        btn.textContent = 'Enter Edit Mode';
        btn.className = 'admin-modern-btn primary';
        btn.style.backgroundColor = '#8b5cf6';
        btn.style.color = 'white';
        btn.style.borderColor = '#8b5cf6';
    }
    else if (actionType === 'edit_image') {
        if(svgEdit) svgEdit.style.display = 'block';
        title.textContent = 'Edit Image?';
        desc.textContent = 'Enter your PIN to upload or remove this product\'s image.';
        iconWrapper.style.color = '#8b5cf6';
        iconWrapper.style.background = '#f0f4f8';
        btn.textContent = 'Enter Edit Mode';
        btn.className = 'admin-modern-btn primary';
        btn.style.backgroundColor = '#8b5cf6';
        btn.style.color = 'white';
        btn.style.borderColor = '#8b5cf6';
    }
    else if (actionType === 'top_up') {
        if(svgEdit) svgEdit.style.display = 'block';
        title.textContent = 'Top Up Stock?';
        desc.textContent = 'Enter your PIN to add more stock to this product.';
        iconWrapper.style.color = '#10b981';
        iconWrapper.style.background = '#ecfdf5';
        btn.textContent = 'Proceed';
        btn.className = 'admin-modern-btn primary';
        btn.style.backgroundColor = '#10b981';
        btn.style.color = 'white';
        btn.style.borderColor = '#10b981';
    }

    const pinInp = document.getElementById('rsActionPasswordInput');
    if(pinInp) { pinInp.value = ''; pinInp.focus(); }
}

function _rsOpenEditForm() {
    const editView = document.getElementById('rsEditFormView');
    const defContainer = document.getElementById('rsEditDefaultContainer');
    const anaContainer = document.getElementById('rsEditAnalyticalContainer');
    const p = window._rsCurrentProduct;
    
    if(editView) editView.style.display = 'flex';
    
    if(p.packTypes || p.isSpecial) {
        // ===== ANALYTICAL PRODUCT EDIT =====
        if(defContainer) defContainer.style.display = 'none';
        if(anaContainer) anaContainer.style.display = 'flex';
        
        const bagTitle = (p.packTypes && (p.packTypes.bag ? p.packTypes.bag.title : (p.packTypes.c1 ? p.packTypes.c1.title : 'Container 1')));
        const custardTitle = (p.packTypes && (p.packTypes.custard ? p.packTypes.custard.title : (p.packTypes.c2 ? p.packTypes.c2.title : 'Container 2')));
        const cupTitle = (p.packTypes && (p.packTypes.cup ? p.packTypes.cup.title : (p.packTypes.c3 ? p.packTypes.c3.title : 'Container 3')));
        const s = p.structure || {};
        
        // Auto-fill legacy data
        let bVal = p.purchaseCost || 0;
        let bPrice = (p.packTypes && (p.packTypes.bag ? p.packTypes.bag.price : (p.packTypes.c1 ? p.packTypes.c1.price : 0))) || 0;
        let bagProfit = (s.bagProfit !== undefined && s.bagProfit !== '') ? s.bagProfit : ((s.c1Profit !== undefined && s.c1Profit !== '') ? s.c1Profit : (bPrice && bVal ? parseFloat((bPrice - bVal).toFixed(2)) : ''));
        let bagProfitPct = (s.bagProfitPercent !== undefined && s.bagProfitPercent !== '') ? s.bagProfitPercent : ((s.c1ProfitPercent !== undefined && s.c1ProfitPercent !== '') ? s.c1ProfitPercent : ((bagProfit !== '' && bVal > 0) ? parseFloat(((bagProfit / bVal) * 100).toFixed(2)) : ''));
        let cpb = s.custardsPerBag || s.c2sPerC1 || '';
        let cPrice = (p.packTypes && (p.packTypes.custard ? p.packTypes.custard.price : (p.packTypes.c2 ? p.packTypes.c2.price : 0))) || 0;
        let cCost = (cpb && bVal) ? bVal / cpb : 0;
        let custProfit = (s.custardProfit !== undefined && s.custardProfit !== '') ? s.custardProfit : ((s.c2Profit !== undefined && s.c2Profit !== '') ? s.c2Profit : (cPrice && cCost ? parseFloat((cPrice - cCost).toFixed(2)) : ''));
        let custProfitPct = (s.custardProfitPercent !== undefined && s.custardProfitPercent !== '') ? s.custardProfitPercent : ((s.c2ProfitPercent !== undefined && s.c2ProfitPercent !== '') ? s.c2ProfitPercent : ((custProfit !== '' && cCost > 0) ? parseFloat(((custProfit / cCost) * 100).toFixed(2)) : ''));
        let cpc = s.cupsPerCustard || s.c3sPerC2 || '';
        let cupPriceRaw = (p.packTypes && (p.packTypes.cup ? p.packTypes.cup.price : (p.packTypes.c3 ? p.packTypes.c3.price : 0))) || 0;
        let cupPrice = cupPriceRaw === 'Flexible' ? '' : cupPriceRaw;
        let cupCost = (cpc && cCost) ? cCost / cpc : 0;
        let cupProfit = (s.cupProfit !== undefined && s.cupProfit !== '') ? s.cupProfit : ((s.c3Profit !== undefined && s.c3Profit !== '') ? s.c3Profit : (cupPrice && cupCost ? parseFloat((cupPrice - cupCost).toFixed(2)) : ''));
        let cupProfitPct = (s.cupProfitPercent !== undefined && s.cupProfitPercent !== '') ? s.cupProfitPercent : ((s.c3ProfitPercent !== undefined && s.c3ProfitPercent !== '') ? s.c3ProfitPercent : ((cupProfit !== '' && cupCost > 0) ? parseFloat(((cupProfit / cupCost) * 100).toFixed(2)) : ''));

        document.getElementById('rsEditAnaName').value = p.name || '';
        
        // Tier 1: Bag
        document.getElementById('rsEditAnaBagTitle').value = bagTitle;
        document.getElementById('rsEditAnaBagCostLbl').textContent = bagTitle;
        document.getElementById('rsEditAnaBagProfitLbl').textContent = bagTitle;
        document.getElementById('rsEditAnaBagPriceLbl').textContent = bagTitle;
        document.getElementById('rsEditAnaBagCost').value = p.purchaseCost || '';
        document.getElementById('rsEditAnaBagQty').value = p.boughtQuantity || 1;
        document.getElementById('rsEditAnaBagProfit').value = bagProfit;
        document.getElementById('rsEditAnaBagProfitPct').value = bagProfitPct;
        document.getElementById('rsEditAnaBagPrice').value = bPrice || '';
        
        // Tier 2: Custard
        document.getElementById('rsEditAnaCustardTitle').value = custardTitle;
        document.getElementById('rsEditAnaCustardProfitLbl').textContent = custardTitle;
        document.getElementById('rsEditAnaCustardPriceLbl').textContent = custardTitle;
        document.getElementById('rsEditAnaCustardsPerBag').value = cpb;
        document.getElementById('rsEditAnaCustardProfit').value = custProfit;
        document.getElementById('rsEditAnaCustardProfitPct').value = custProfitPct;
        document.getElementById('rsEditAnaCustardPrice').value = cPrice || '';
        
        // Tier 3: Cup
        document.getElementById('rsEditAnaCupTitle').value = cupTitle;
        document.getElementById('rsEditAnaCupProfitLbl').textContent = cupTitle;
        document.getElementById('rsEditAnaCupPriceLbl').textContent = cupTitle;
        document.getElementById('rsEditAnaCupsPerCustard').value = cpc;
        document.getElementById('rsEditAnaCupProfit').value = cupProfit;
        document.getElementById('rsEditAnaCupProfitPct').value = cupProfitPct;
        document.getElementById('rsEditAnaCupPrice').value = cupPrice || '';
        
        _rsEditAnaCalc();
        
    } else {
        // ===== DEFAULT PRODUCT EDIT =====
        if(anaContainer) anaContainer.style.display = 'none';
        if(defContainer) defContainer.style.display = 'flex';
        
        const unitWord = (p.unit || 'per piece').replace('per ', '');
        const bulkName = p.bulkUnit || 'Carton';
        
        document.getElementById('rsEditDefName').value = p.name || '';
        document.getElementById('rsEditDefBulkLabel').textContent = bulkName;
        document.getElementById('rsEditDefBulkLabel2').textContent = bulkName;
        
        // Set dropdown trigger text and hidden values
        const bulkTrig = document.querySelector('#rsEditBulkDropdownTrigger .trigger-text');
        if (bulkTrig) bulkTrig.textContent = bulkName;
        document.getElementById('rsEditBulkUnitSelect').value = bulkName;
        
        const unitTrig = document.querySelector('#rsEditUnitDropdownTrigger .trigger-text');
        if (unitTrig) unitTrig.textContent = p.unit || 'per piece';
        document.getElementById('rsEditNewProductUnit').value = p.unit || 'per piece';
        
        const capUnit = unitWord.charAt(0).toUpperCase() + unitWord.slice(1) + 's';
        document.getElementById('rsEditDefRetailUnitLabel').textContent = capUnit;
        document.getElementById('rsEditDefRetailUnitLabel2').textContent = unitWord;
        document.getElementById('rsEditDefRetailUnitLabel3').textContent = unitWord;
        
        const qty = p.boughtQuantity || 1;
        const totalPurchase = p.purchaseCost || 0;
        const perBulkCost = qty > 0 ? totalPurchase / qty : totalPurchase;
        
        const pieces = p.pieces || '';
        const retailCost = (pieces > 0 && perBulkCost > 0) ? perBulkCost / pieces : 0;
        let pProfit = (p.profit !== undefined && p.profit !== '') ? p.profit : (p.price && retailCost ? parseFloat((p.price - retailCost).toFixed(2)) : '');
        let pProfitPct = (pProfit !== '' && retailCost > 0) ? parseFloat(((pProfit / retailCost) * 100).toFixed(2)) : ((p.profitPercent !== undefined && p.profitPercent !== '') ? p.profitPercent : '');
        
        document.getElementById('rsEditDefBulkCost').value = perBulkCost || '';
        document.getElementById('rsEditDefQuantity').value = qty;
        document.getElementById('rsEditDefPieces').value = pieces;
        document.getElementById('rsEditDefProfit').value = pProfit;
        document.getElementById('rsEditDefProfitPercent').value = pProfitPct;
        document.getElementById('rsEditDefPrice').value = p.price || '';
        
        _rsEditInitDropdowns(bulkName, p.unit || 'per piece');
        _rsEditDefCalc();
    }
}

function _rsExecuteClear() {
    let products = JSON.parse(localStorage.getItem('nd_products_data') || '[]');
    const p = window._rsCurrentProduct;
    if (!p) return;
    const index = p.id ? products.findIndex(item => item.id === p.id) : products.findIndex(item => item.name === p.name && item.dateAdded === p.dateAdded);
    
    if(index === -1) {
        if(typeof customAlert === 'function') customAlert("Product not found");
        return;
    }
    
    if(index > -1) {
        products[index].cleared = true;
        localStorage.setItem('nd_products_data', JSON.stringify(products));
        
        setTimeout(() => {
            if (typeof window.reloadAdminProducts === 'function') window.reloadAdminProducts();
            renderRestockList();
            if (typeof window.renderProductsGlobal === 'function') window.renderProductsGlobal();
        }, 100);
    }
    _rsShowSuccess("Product Cleared", "Product hidden from view, historical records kept intact.");
}

function _rsExecuteDelete() {
    let products = JSON.parse(localStorage.getItem('nd_products_data') || '[]');
    const p = window._rsCurrentProduct;
    if (!p) return;
    const index = p.id ? products.findIndex(item => item.id === p.id) : products.findIndex(item => item.name === p.name && item.dateAdded === p.dateAdded);
    
    if(index === -1) {
        if(typeof customAlert === 'function') customAlert("Product not found");
        return;
    }
    
    if(index > -1) {
        products[index].isDeleted = true;
        localStorage.setItem('nd_products_data', JSON.stringify(products));
        
        setTimeout(() => {
            if (typeof window.reloadAdminProducts === 'function') window.reloadAdminProducts();
            renderRestockList();
            if (typeof window.renderProductsGlobal === 'function') window.renderProductsGlobal();
        }, 100);
    }
    _rsShowSuccess("Product Deleted", "Moved to Recycle Bin. It will be permanently erased at the end of the month.");
}

function _rsExecuteUndoTopUp() {
    let products = JSON.parse(localStorage.getItem('nd_products_data') || '[]');
    const p = window._rsCurrentProduct;
    if (!p) return;
    const index = p.id ? products.findIndex(item => item.id === p.id) : products.findIndex(item => item.name === p.name && item.dateAdded === p.dateAdded);
    
    if(index === -1) {
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
            // fallback if tier is missing
            qtyToDeduct = lastTopUp.qty || 1; 
        }
        prod.boughtQuantity = Math.max(0, (parseFloat(prod.boughtQuantity) || 0) - qtyToDeduct);
        
    } else {
        // Default / Custom
        prod.boughtQuantity = Math.max(0, (parseFloat(prod.boughtQuantity) || 0) - (lastTopUp.qty || 1));
    }
    
    // Remove the expense log via negative amount
    let expenses = JSON.parse(localStorage.getItem('nd_expenses_notebook') || '[]');
    if (costToDeduct > 0) {
        const now = new Date();
        const mths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        let hrs = now.getHours(); const am = hrs >= 12 ? 'pm' : 'am'; hrs = hrs % 12 || 12;
        expenses.push({
            id: 'exp_' + Date.now() + Math.random().toString(36).substr(2,9),
            title: `Undo Restock Top-Up: ${prod.name}`,
            amount: -costToDeduct,
            dateStr: `${mths[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()} · ${hrs}:${now.getMinutes().toString().padStart(2,'0')} ${am}`,
            timestamp: now.toISOString(),
            year: now.getFullYear(),
            monthIdx: now.getMonth()
        });
        localStorage.setItem('nd_expenses_notebook', JSON.stringify(expenses));
        if (typeof window.renderExpenses === 'function') window.renderExpenses();
    }
    
    localStorage.setItem('nd_products_data', JSON.stringify(products));
    
    setTimeout(() => {
        if (typeof window.reloadAdminProducts === 'function') window.reloadAdminProducts();
        renderRestockList();
        if (typeof window.renderProductsGlobal === 'function') window.renderProductsGlobal();
    }, 100);
    
    window._rsCurrentProduct = prod; 
    
    _rsShowSuccess("Undo Successful", "The last top up has been reverted and the cost was deducted.");
}



function _rsOpenEditPriceForm() {
    const editPriceView = document.getElementById('rsEditPriceFormView');
    const defContainer = document.getElementById('rsEditPriceDefaultContainer');
    const anaContainer = document.getElementById('rsEditPriceAnalyticalContainer');
    const p = window._rsCurrentProduct;
    
    if(editPriceView) editPriceView.style.display = 'flex';
    
    if(p.isSpecial || p.packTypes) {
        if(defContainer) defContainer.style.display = 'none';
        if(anaContainer) anaContainer.style.display = 'flex';
        
        const bagTitle = (p.packTypes && p.packTypes.bag && p.packTypes.bag.title) || (p.packTypes && p.packTypes.c1 && p.packTypes.c1.title) || p.bulkUnit || 'Container 1';
        const custardTitle = (p.packTypes && p.packTypes.custard && p.packTypes.custard.title) || (p.packTypes && p.packTypes.c2 && p.packTypes.c2.title) || 'Container 2';
        const cupTitle = (p.packTypes && p.packTypes.cup && p.packTypes.cup.title) || (p.packTypes && p.packTypes.c3 && p.packTypes.c3.title) || 'Container 3';
        const s = p.structure || {};
        
        document.getElementById('rsEditPriceAnaBagTitleText').value = bagTitle;
        document.querySelectorAll('.rsEditPriceAnaBagLbl').forEach(el => el.textContent = bagTitle);
        document.getElementById('rsEditPriceAnaCustardTitleText').value = custardTitle;
        document.querySelectorAll('.rsEditPriceAnaCustardLbl').forEach(el => el.textContent = custardTitle);
        document.getElementById('rsEditPriceAnaCupTitleText').value = cupTitle;
        document.querySelectorAll('.rsEditPriceAnaCupLbl').forEach(el => el.textContent = cupTitle);
        
        document.getElementById('rsEditPriceAnaBagProfit').value = s.bagProfit !== undefined ? s.bagProfit : '';
        document.getElementById('rsEditPriceAnaBagProfitPct').value = s.bagProfitPercent !== undefined ? s.bagProfitPercent : '';
        document.getElementById('rsEditPriceAnaBagPrice').value = (p.packTypes && p.packTypes.bag && p.packTypes.bag.price !== undefined) ? p.packTypes.bag.price : p.price || '';
        
        document.getElementById('rsEditPriceAnaCustardProfit').value = s.custardProfit !== undefined ? s.custardProfit : '';
        document.getElementById('rsEditPriceAnaCustardProfitPct').value = s.custardProfitPercent !== undefined ? s.custardProfitPercent : '';
        document.getElementById('rsEditPriceAnaCustardPrice').value = (p.packTypes && p.packTypes.custard && p.packTypes.custard.price) || '';
        
        document.getElementById('rsEditPriceAnaCupProfit').value = s.cupProfit !== undefined ? s.cupProfit : '';
        document.getElementById('rsEditPriceAnaCupProfitPct').value = s.cupProfitPercent !== undefined ? s.cupProfitPercent : '';
        document.getElementById('rsEditPriceAnaCupPrice').value = (p.packTypes && p.packTypes.cup && p.packTypes.cup.price) || '';
        
        _rsEditPriceAnaCalc();
    } else {
        if(anaContainer) anaContainer.style.display = 'none';
        if(defContainer) defContainer.style.display = 'flex';
        
        const unitWord = (p.unit || 'per piece').replace('per ', '');
        const bulkName = p.bulkUnit || 'Carton';
        
        document.getElementById('rsEditPriceDefBulk').value = bulkName;
        document.getElementById('rsEditPriceDefBulk').readOnly = false;
        document.getElementById('rsEditPriceDefBulk').style.cursor = 'text';
        document.getElementById('rsEditPriceDefBulk').style.background = 'white';
        
        document.getElementById('rsEditPriceDefUnit').value = 'per ' + unitWord;
        document.getElementById('rsEditPriceDefUnit').readOnly = false;
        document.getElementById('rsEditPriceDefUnit').style.cursor = 'text';
        document.getElementById('rsEditPriceDefUnit').style.background = 'white';
        
        document.getElementById('rsEditPriceDefBulkLabel').textContent = bulkName;
        document.getElementById('rsEditPriceDefPieces').value = p.pieces || 1;
        
        let cost = parseFloat(p.cost) || 0;
        document.getElementById('rsEditPriceDefRetailCost').value = '₦' + cost.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2});
        
        // Fix for missing profit percentage
        let pProfit = p.profit !== undefined ? p.profit : (p.price && cost ? parseFloat((p.price - cost).toFixed(2)) : 0);
        let pProfitPct = p.profitPercent !== undefined ? p.profitPercent : (cost > 0 && pProfit > 0 ? parseFloat(((pProfit / cost) * 100).toFixed(2)) : 0);
        
        document.getElementById('rsEditPriceDefProfit').value = pProfit !== 0 ? pProfit : '';
        document.getElementById('rsEditPriceDefProfitPercent').value = pProfitPct !== 0 ? pProfitPct : '';
        document.getElementById('rsEditPriceDefPrice').value = p.price || '';
        
        _rsEditPriceDefCalc();
    }
}

function _rsEditPriceDefCalc() {
    const p = window._rsCurrentProduct;
    if (!p) return;
    const cost = parseFloat(p.cost) || 0;
    const profit = parseFloat(document.getElementById('rsEditPriceDefProfit').value) || 0;
    const finalPrice = cost + profit;
    document.getElementById('rsEditPriceDefPrice').value = finalPrice > 0 ? parseFloat(finalPrice.toFixed(2)) : '';
    
    // Payout logic
    const prRate = parseFloat(localStorage.getItem('nd_payout_rate')) || 2;
    const pay = (parseFloat(document.getElementById('rsEditPriceDefPrice').value) || 0) * (prRate / 100);
    const fp = Number.isInteger(pay) ? pay : pay.toFixed(2);
    const payoutEl = document.getElementById('rsEditPricePayoutValue');
    if (payoutEl) {
        payoutEl.textContent = `₦${fp} (${prRate}%)`;
    }
}

function _rsEditPriceAnaCalc() {
    const p = window._rsCurrentProduct;
    if (!p) return;
    const s = p.structure || {};
    const bVal = parseFloat(p.purchaseCost) || 0;
    const cpb = parseInt(s.custardsPerBag) || 0;
    const cVal = (cpb && bVal) ? bVal / cpb : 0;
    const cpc = parseInt(s.cupsPerCustard) || 0;
    const cupVal = (cpc && cVal) ? cVal / cpc : 0;
    
    const bagProfit = parseFloat(document.getElementById('rsEditPriceAnaBagProfit').value) || 0;
    document.getElementById('rsEditPriceAnaBagPrice').value = parseFloat((bVal + bagProfit).toFixed(2)) || '';
    
    const custProfit = parseFloat(document.getElementById('rsEditPriceAnaCustardProfit').value) || 0;
    document.getElementById('rsEditPriceAnaCustardPrice').value = parseFloat((cVal + custProfit).toFixed(2)) || '';
    
    const cupProfit = parseFloat(document.getElementById('rsEditPriceAnaCupProfit').value) || 0;
    document.getElementById('rsEditPriceAnaCupPrice').value = parseFloat((cupVal + cupProfit).toFixed(2)) || '';
    
    const prRate = parseFloat(localStorage.getItem('nd_payout_rate')) || 2;
    
    const pay1 = Math.max(0, bagProfit) * (prRate / 100);
    const el1 = document.getElementById('rsEditPriceAnaBagPayout');
    if (el1) el1.textContent = `₦${Number.isInteger(pay1) ? pay1 : pay1.toFixed(2)} (${prRate}%)`;
    
    const pay2 = Math.max(0, custProfit) * (prRate / 100);
    const el2 = document.getElementById('rsEditPriceAnaCustardPayout');
    if (el2) el2.textContent = `₦${Number.isInteger(pay2) ? pay2 : pay2.toFixed(2)} (${prRate}%)`;
    
    const pay3 = Math.max(0, cupProfit) * (prRate / 100);
    const el3 = document.getElementById('rsEditPriceAnaCupPayout');
    if (el3) el3.textContent = `₦${Number.isInteger(pay3) ? pay3 : pay3.toFixed(2)} (${prRate}%)`;
}


function _rsOpenEditPriceForm() {
    const editPriceView = document.getElementById('rsEditPriceFormView');
    const defContainer = document.getElementById('rsEditPriceDefaultContainer');
    const anaContainer = document.getElementById('rsEditPriceAnalyticalContainer');
    const p = window._rsCurrentProduct;
    
    if(editPriceView) editPriceView.style.display = 'flex';
    
    if(p.isSpecial || p.packTypes) {
        if(defContainer) defContainer.style.display = 'none';
        if(anaContainer) anaContainer.style.display = 'flex';
        
        const bagTitle = (p.packTypes && p.packTypes.bag && p.packTypes.bag.title) || p.bulkUnit || 'Container 1';
        const custardTitle = (p.packTypes && p.packTypes.custard && p.packTypes.custard.title) || 'Container 2';
        const cupTitle = (p.packTypes && p.packTypes.cup && p.packTypes.cup.title) || 'Container 3';
        const s = p.structure || {};
        
        document.getElementById('rsEditPriceAnaBagTitleText').value = bagTitle;
        document.querySelectorAll('.rsEditPriceAnaBagLbl').forEach(el => el.textContent = bagTitle);
        document.getElementById('rsEditPriceAnaCustardTitleText').value = custardTitle;
        document.querySelectorAll('.rsEditPriceAnaCustardLbl').forEach(el => el.textContent = custardTitle);
        document.getElementById('rsEditPriceAnaCupTitleText').value = cupTitle;
        document.querySelectorAll('.rsEditPriceAnaCupLbl').forEach(el => el.textContent = cupTitle);
        
        document.getElementById('rsEditPriceAnaBagProfit').value = s.bagProfit !== undefined ? s.bagProfit : '';
        document.getElementById('rsEditPriceAnaBagProfitPct').value = s.bagProfitPercent !== undefined ? s.bagProfitPercent : '';
        document.getElementById('rsEditPriceAnaBagPrice').value = (p.packTypes && p.packTypes.bag && p.packTypes.bag.price !== undefined) ? p.packTypes.bag.price : p.price || '';
        
        document.getElementById('rsEditPriceAnaCustardProfit').value = s.custardProfit !== undefined ? s.custardProfit : '';
        document.getElementById('rsEditPriceAnaCustardProfitPct').value = s.custardProfitPercent !== undefined ? s.custardProfitPercent : '';
        document.getElementById('rsEditPriceAnaCustardPrice').value = (p.packTypes && p.packTypes.custard && p.packTypes.custard.price) || '';
        
        document.getElementById('rsEditPriceAnaCupProfit').value = s.cupProfit !== undefined ? s.cupProfit : '';
        document.getElementById('rsEditPriceAnaCupProfitPct').value = s.cupProfitPercent !== undefined ? s.cupProfitPercent : '';
        document.getElementById('rsEditPriceAnaCupPrice').value = (p.packTypes && p.packTypes.cup && p.packTypes.cup.price) || '';
        
        _rsEditPriceAnaCalc();
    } else {
        if(anaContainer) anaContainer.style.display = 'none';
        if(defContainer) defContainer.style.display = 'flex';
        
        const unitWord = (p.unit || 'per piece').replace('per ', '');
        const bulkName = p.bulkUnit || 'Carton';
        
        document.getElementById('rsEditPriceDefBulk').value = bulkName;
        document.getElementById('rsEditPriceDefBulk').readOnly = false;
        document.getElementById('rsEditPriceDefBulk').style.cursor = 'text';
        document.getElementById('rsEditPriceDefBulk').style.background = 'white';
        
        document.getElementById('rsEditPriceDefUnit').value = 'per ' + unitWord;
        document.getElementById('rsEditPriceDefUnit').readOnly = false;
        document.getElementById('rsEditPriceDefUnit').style.cursor = 'text';
        document.getElementById('rsEditPriceDefUnit').style.background = 'white';
        
        document.getElementById('rsEditPriceDefBulkLabel').textContent = bulkName;
        document.getElementById('rsEditPriceDefPieces').value = p.pieces || 1;
        
        let cost = parseFloat(p.cost) || 0;
        document.getElementById('rsEditPriceDefRetailCost').value = '₦' + cost.toLocaleString(undefined, {minimumFractionDigits: 2});
        
        // Fix for missing profit percentage
        let pProfit = p.profit !== undefined ? p.profit : (p.price && cost ? parseFloat((p.price - cost).toFixed(2)) : 0);
        let pProfitPct = p.profitPercent !== undefined ? p.profitPercent : (cost > 0 && pProfit > 0 ? parseFloat(((pProfit / cost) * 100).toFixed(2)) : 0);
        
        document.getElementById('rsEditPriceDefProfit').value = pProfit !== 0 ? pProfit : '';
        document.getElementById('rsEditPriceDefProfitPercent').value = pProfitPct !== 0 ? pProfitPct : '';
        document.getElementById('rsEditPriceDefPrice').value = p.price || '';
        
        _rsEditPriceDefCalc();
    }
}

function _rsEditPriceDefCalc() {
    const p = window._rsCurrentProduct;
    if (!p) return;
    const cost = parseFloat(p.cost) || 0;
    const profit = parseFloat(document.getElementById('rsEditPriceDefProfit').value) || 0;
    const finalPrice = cost + profit;
    document.getElementById('rsEditPriceDefPrice').value = finalPrice > 0 ? parseFloat(finalPrice.toFixed(2)) : '';
    
    // Payout logic
    const prRate = parseFloat(localStorage.getItem('nd_payout_rate')) || 2;
    const pay = (parseFloat(document.getElementById('rsEditPriceDefPrice').value) || 0) * (prRate / 100);
    const fp = Number.isInteger(pay) ? pay : pay.toFixed(2);
    const payoutEl = document.getElementById('rsEditPricePayoutValue');
    if (payoutEl) {
        payoutEl.textContent = `₦${fp} (${prRate}%)`;
    }
}

function _rsEditPriceAnaCalc() {
    const p = window._rsCurrentProduct;
    if (!p) return;
    const s = p.structure || {};
    const bVal = parseFloat(p.purchaseCost) || 0;
    const cpb = parseInt(s.custardsPerBag) || 0;
    const cVal = (cpb && bVal) ? bVal / cpb : 0;
    const cpc = parseInt(s.cupsPerCustard) || 0;
    const cupVal = (cpc && cVal) ? cVal / cpc : 0;
    
    const bagProfit = parseFloat(document.getElementById('rsEditPriceAnaBagProfit').value) || 0;
    document.getElementById('rsEditPriceAnaBagPrice').value = parseFloat((bVal + bagProfit).toFixed(2)) || '';
    
    const custProfit = parseFloat(document.getElementById('rsEditPriceAnaCustardProfit').value) || 0;
    document.getElementById('rsEditPriceAnaCustardPrice').value = parseFloat((cVal + custProfit).toFixed(2)) || '';
    
    const cupProfit = parseFloat(document.getElementById('rsEditPriceAnaCupProfit').value) || 0;
    document.getElementById('rsEditPriceAnaCupPrice').value = parseFloat((cupVal + cupProfit).toFixed(2)) || '';
    
    const prRate = parseFloat(localStorage.getItem('nd_payout_rate')) || 2;
    
    const pay1 = Math.max(0, bagProfit) * (prRate / 100);
    const el1 = document.getElementById('rsEditPriceAnaBagPayout');
    if (el1) el1.textContent = `₦${Number.isInteger(pay1) ? pay1 : pay1.toFixed(2)} (${prRate}%)`;
    
    const pay2 = Math.max(0, custProfit) * (prRate / 100);
    const el2 = document.getElementById('rsEditPriceAnaCustardPayout');
    if (el2) el2.textContent = `₦${Number.isInteger(pay2) ? pay2 : pay2.toFixed(2)} (${prRate}%)`;
    
    const pay3 = Math.max(0, cupProfit) * (prRate / 100);
    const el3 = document.getElementById('rsEditPriceAnaCupPayout');
    if (el3) el3.textContent = `₦${Number.isInteger(pay3) ? pay3 : pay3.toFixed(2)} (${prRate}%)`;
}


function _rsShowSuccess(title, desc) {
    document.getElementById('rsEditFormView').style.display = 'none';
    const epf = document.getElementById('rsEditPriceFormView');
    if(epf) epf.style.display = 'none';
    document.getElementById('rsActionSuccessView').style.display = 'flex';
    document.getElementById('rsSuccessTitle').textContent = title;
    document.getElementById('rsSuccessDesc').textContent = desc;
}

// ===== RESTOCK STOCK TRACKING =====

function _rsOpenStockView(p) {
    document.getElementById('rsDetailView').style.display = 'none';
    const sv = document.getElementById('rsStockView');
    if (sv) sv.style.display = 'flex';
    const dyn = document.getElementById('rsStockDynamicContent');
    if (dyn) dyn.innerHTML = '<div style="text-align:center;padding:20px;color:#64748b;">Calculating inventory...</div>';
    setTimeout(() => _rsCalculateRestockStock(p), 50);
}

function _rsCalculateRestockStock(p) {
    if (!p) return;
    const dyn = document.getElementById('rsStockDynamicContent');
    if (!dyn) return;

    let sales = [], allProducts = [];
    try { sales = JSON.parse(localStorage.getItem('nd_sales_history') || '[]'); } catch(e){}
    try { allProducts = JSON.parse(localStorage.getItem('nd_products_data') || '[]'); } catch(e){}

    let oldestDateAdded = p.dateAdded ? new Date(p.dateAdded).getTime() : null;
    const filteredSales = oldestDateAdded ? sales.filter(sale => window.parseSaleDate(sale.date || sale.timestamp) >= oldestDateAdded) : sales;

    let html = '';

    if (p.isSpecial || p.packTypes) {
        const s = p.structure || {};
        const cpb = parseInt(s.custardsPerBag) || 1;
        const cpc = parseInt(s.cupsPerCustard) || 1;
        const maxCPB = cpb * cpc;
        const bagT  = (p.packTypes && p.packTypes.bag && p.packTypes.bag.title) || (p.packTypes && p.packTypes.c1 && p.packTypes.c1.title) || p.bulkUnit || 'Container 1';
        const cusT  = (p.packTypes && p.packTypes.custard && p.packTypes.custard.title) || (p.packTypes && p.packTypes.c2 && p.packTypes.c2.title) || 'Container 2';
        const cupT  = (p.packTypes && p.packTypes.cup && p.packTypes.cup.title) || (p.packTypes && p.packTypes.c3 && p.packTypes.c3.title) || 'Container 3';

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
        const sold   = (sBags * maxCPB) + (sCus * cpc) + sCups;
        const rem    = Math.round(bought - sold);
        const isOut  = rem <= 0;
        const isLow  = !isOut && window.checkProductRunningLow && window.checkProductRunningLow(p.id);
        const rB = Math.floor(rem / maxCPB);
        const rC = Math.floor((rem % maxCPB) / cpc);
        const rU = rem % cpc;

        html = '<div style="background:' + (isOut?'#fef2f2':(isLow?'#fefce8':'#f0fdf4')) + ';border:1px solid ' + (isOut?'#fecdd3':(isLow?'#fde047':'#bbf7d0')) + ';border-radius:12px;padding:16px;text-align:center;margin-bottom:24px;">'
             + '<h4 style="margin:0 0 8px 0;color:' + (isOut?'#e11d48':(isLow?'#a16207':'#16a34a')) + ';font-size:1.2rem;font-weight:800;">' + (isOut?'OUT OF STOCK':(isLow?'RUNNING LOW':'IN STOCK')) + '</h4>'
             + '<p style="margin:0;color:' + (isOut?'#be123c':(isLow?'#854d0e':'#15803d')) + ';font-size:0.9rem;font-weight:700;">Remaining: '
             + (rB>0?rB+' '+bagT+'(s) ':'') + (rC>0?rC+' '+cusT+'(s) ':'') + (rU>0?rU+' '+cupT+'(s)':'')
             + (rB<=0&&rC<=0&&rU<=0?'0 '+cupT+'(s)':'') + '</p>'
             + '<div style="font-size:0.8rem;font-weight:600;color:#64748b;margin-top:6px;">Total Base Units Remaining: ' + rem + '</div></div>'
             + '<div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:12px;padding:16px;">'
             + '<h4 style="margin:0 0 12px 0;font-size:0.95rem;color:#1e293b;">Breakdown</h4>'
             + '<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="color:#64748b;font-size:0.9rem;">Bought (' + bagT + 's)</span><span style="font-weight:700;color:#0f172a;">' + (Number.isInteger(totalBags) ? totalBags : parseFloat(totalBags.toFixed(2))) + '</span></div>'
             + '<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="color:#64748b;font-size:0.9rem;">Sold (' + bagT + ')</span><span style="font-weight:700;color:#ef4444;">- ' + sBags + '</span></div>'
             + '<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="color:#64748b;font-size:0.9rem;">Sold (' + cusT + ')</span><span style="font-weight:700;color:#ef4444;">- ' + sCus + '</span></div>'
             + '<div style="display:flex;justify-content:space-between;"><span style="color:#64748b;font-size:0.9rem;">Sold (' + cupT + ')</span><span style="font-weight:700;color:#ef4444;">- ' + sCups + '</span></div></div>';
    } else {
        let bought = 0;
        allProducts.forEach(item => { if (!item.isDeleted && item.id === p.id && !item.isSpecial) bought += (parseFloat(item.boughtQuantity)||1) * (parseInt(item.pieces)||1); });
        let sold = 0;
        filteredSales.forEach(sale => {
            if (sale.item) {
                const isMatch = sale.productId ? sale.productId === p.id : (sale.item.trim().toLowerCase() === p.name.trim().toLowerCase());
                if (isMatch) sold += parseFloat(sale.qty)||0;
            }
        });

        const rem    = bought - sold;
        const isOut  = rem <= 0;
        const isLow  = !isOut && window.checkProductRunningLow && window.checkProductRunningLow(p.id);
        const bulk   = p.bulkUnit || 'Carton';
        const ppb    = parseInt(p.pieces) || 1;
        const unit   = (p.unit || 'piece').replace('per ', '');
        const rB     = Math.floor(rem / ppb);
        const rP     = rem % ppb;

        html = '<div style="background:' + (isOut?'#fef2f2':(isLow?'#fefce8':'#f0fdf4')) + ';border:1px solid ' + (isOut?'#fecdd3':(isLow?'#fde047':'#bbf7d0')) + ';border-radius:12px;padding:16px;text-align:center;margin-bottom:24px;">'
             + '<h4 style="margin:0 0 8px 0;color:' + (isOut?'#e11d48':(isLow?'#a16207':'#16a34a')) + ';font-size:1.2rem;font-weight:800;">' + (isOut?'OUT OF STOCK':(isLow?'RUNNING LOW':'IN STOCK')) + '</h4>'
             + '<p style="margin:0;color:' + (isOut?'#be123c':(isLow?'#854d0e':'#15803d')) + ';font-size:0.9rem;font-weight:700;">Remaining: '
             + (rB>0?rB+' '+bulk+'(s) ':'') + (rP>0?rP+' '+unit+'(s)':'') + (rB<=0&&rP<=0?'0 '+unit+'(s)':'') + '</p>'
             + '<div style="font-size:0.8rem;font-weight:600;color:#64748b;margin-top:6px;">Total Base Units Remaining: ' + (Math.round(rem*10)/10) + '</div></div>'
             + '<div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:12px;padding:16px;">'
             + '<h4 style="margin:0 0 12px 0;font-size:0.95rem;color:#1e293b;">Breakdown</h4>'
             + '<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="color:#64748b;font-size:0.9rem;">Total Bought</span><span style="font-weight:700;color:#0f172a;">' + bought + ' ' + unit + '(s)</span></div>'
             + '<div style="display:flex;justify-content:space-between;"><span style="color:#64748b;font-size:0.9rem;">Total Sold</span><span style="font-weight:700;color:#ef4444;">- ' + (Math.round(sold*10)/10) + '</span></div></div>';
    }

    dyn.innerHTML = html;
}

function _rsCloseStockView() {
    const sv = document.getElementById('rsStockView');
    if (sv) sv.style.display = 'none';
    const dv = document.getElementById('rsDetailView');
    if (dv) dv.style.display = 'flex';
}

// ============================================================
// Restock Detail Modal — Edit Image View
// ============================================================
function _rsOpenEditImageView(p) {
    // Hide all views, show Edit Image view
    ['rsDetailView', 'rsStockView', 'rsActionConfirmView', 'rsEditFormView', 'rsActionSuccessView'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    const imgView = document.getElementById('rsEditImageView');
    if (imgView) imgView.style.display = 'flex';

    // Pre-populate with existing image
    const imgDataHidden = document.getElementById('rsDetailImageData');
    const previewContainer = document.getElementById('rsDetailImagePreviewContainer');
    const previewImg = document.getElementById('rsDetailImagePreview');
    const placeholder = document.querySelector('#rsDetailImageUploadContainer .upload-placeholder');

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

    // Set up upload area listeners (once)
    const uploadArea = document.getElementById('rsDetailImageUploadContainer');
    const fileInput = document.getElementById('rsDetailImageInput');

    if (uploadArea && fileInput && !uploadArea._imgListenersAdded) {
        uploadArea._imgListenersAdded = true;

        uploadArea.addEventListener('click', (e) => {
            if (e.target.tagName.toLowerCase() !== 'button') fileInput.click();
        });
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#8b5cf6';
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
                _rsProcessDetailImageFile(e.dataTransfer.files[0]);
            }
        });
        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                _rsProcessDetailImageFile(e.target.files[0]);
            }
        });

        const removeBtn = document.getElementById('rsDetailImageRemoveBtn');
        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (imgDataHidden) imgDataHidden.value = '';
                if (fileInput) fileInput.value = '';
                if (previewContainer) previewContainer.style.display = 'none';
                if (placeholder) placeholder.style.display = 'flex';
            });
        }
        const replaceBtn = document.getElementById('rsDetailImageReplaceBtn');
        if (replaceBtn) {
            replaceBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                fileInput.click();
            });
        }
    }
}

function _rsProcessDetailImageFile(file) {
    if (!file.type.startsWith('image/')) { alert('Please select a valid image file.'); return; }
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            let w = img.width, h = img.height;
            const MAX = 400;
            if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
            else { if (h > MAX) { w *= MAX / h; h = MAX; } }
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            const imgDataHidden = document.getElementById('rsDetailImageData');
            const previewContainer = document.getElementById('rsDetailImagePreviewContainer');
            const previewImg = document.getElementById('rsDetailImagePreview');
            const placeholder = document.querySelector('#rsDetailImageUploadContainer .upload-placeholder');
            if (imgDataHidden) imgDataHidden.value = dataUrl;
            if (previewImg) previewImg.src = dataUrl;
            if (previewContainer) previewContainer.style.display = 'block';
            if (placeholder) placeholder.style.display = 'none';
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function _rsSaveDetailImage() {
    const p = window._rsCurrentProduct;
    if (!p) return;
    const newImageData = document.getElementById('rsDetailImageData')?.value || '';
    let products = JSON.parse(localStorage.getItem('nd_products_data') || '[]');
    products.forEach(item => {
        if (item.name === p.name) item.imageData = newImageData;
    });
    localStorage.setItem('nd_products_data', JSON.stringify(products));
    if (typeof window.renderRestockList === 'function') window.renderRestockList();
    if (typeof window.renderAdminProductListGlobal === 'function') window.renderAdminProductListGlobal();

    // Show success
    ['rsDetailView', 'rsEditImageView'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    const sv = document.getElementById('rsActionSuccessView');
    if (sv) sv.style.display = 'flex';
    const t = document.getElementById('rsSuccessTitle');
    const d = document.getElementById('rsSuccessDesc');
    if (t) t.textContent = 'Image Updated';
    if (d) d.textContent = 'Product image has been saved successfully.';
}


function closeRestockDetailModal() {
    const modal = document.getElementById('restockDetailModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    }
    _restockDetailProductName = null;
    window._rsCurrentAction = null;
}

// ===== DROPDOWN INITIALIZATION FOR RESTOCK EDIT =====

function _rsEditInitDropdowns(currentBulk, currentUnit) {
    const bulkTrigger = document.getElementById('rsEditBulkDropdownTrigger');
    const bulkMenu = document.getElementById('rsEditBulkDropdownMenu');
    const bulkHidden = document.getElementById('rsEditBulkUnitSelect');
    
    if (bulkTrigger && bulkMenu) {
        // Ensure custom value exists in options
        if (currentBulk && currentBulk !== 'Carton' && currentBulk !== 'Pack' && currentBulk !== 'Crate' && currentBulk !== 'Container 1' && currentBulk !== 'Sack' && currentBulk !== 'Box' && currentBulk !== 'Roll' && currentBulk !== 'Bundle') {
            const existing = Array.from(bulkMenu.querySelectorAll('.custom-dropdown-option')).find(o => o.dataset.value === currentBulk);
            if (!existing) {
                const opt = document.createElement('div');
                opt.className = 'custom-dropdown-option active';
                opt.dataset.value = currentBulk;
                opt.textContent = currentBulk;
                bulkMenu.insertBefore(opt, bulkMenu.querySelector('.custom-unit-create-option'));
            }
        }

        bulkTrigger.onclick = (e) => {
            e.stopPropagation();
            bulkMenu.style.display = bulkMenu.style.display === 'block' ? 'none' : 'block';
            const unitMenu = document.getElementById('rsEditUnitDropdownMenu');
            if (unitMenu) unitMenu.style.display = 'none';
        };
        
        bulkMenu.querySelectorAll('.custom-dropdown-option').forEach(opt => {
            let val = opt.dataset.value;
            opt.classList.toggle('active', val === currentBulk);
            
            if (val === '__custom_bulk__') {
                opt.onclick = (e) => { e.stopPropagation(); document.getElementById('rsEditCustomBulkRow').style.display = 'block'; };
                return;
            }
            opt.onclick = (e) => {
                e.stopPropagation();
                bulkHidden.value = val;
                bulkTrigger.querySelector('.trigger-text').textContent = val;
                bulkMenu.style.display = 'none';
                document.getElementById('rsEditDefBulkLabel').textContent = val;
                document.getElementById('rsEditDefBulkLabel2').textContent = val;
                bulkMenu.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
            };
        });
        
        document.getElementById('rsEditCustomBulkConfirmBtn')?.addEventListener('click', () => {
            const val = document.getElementById('rsEditCustomBulkInput')?.value.trim();
            if (!val) return;
            bulkHidden.value = val;
            bulkTrigger.querySelector('.trigger-text').textContent = val;
            document.getElementById('rsEditDefBulkLabel').textContent = val;
            document.getElementById('rsEditDefBulkLabel2').textContent = val;
            document.getElementById('rsEditCustomBulkRow').style.display = 'none';
            bulkMenu.style.display = 'none';
        });
    }
    
    const unitTrigger = document.getElementById('rsEditUnitDropdownTrigger');
    const unitMenu = document.getElementById('rsEditUnitDropdownMenu');
    const unitHidden = document.getElementById('rsEditNewProductUnit');
    
    if (unitTrigger && unitMenu) {
        // Ensure custom value exists in options
        if (currentUnit && currentUnit !== 'per cup' && currentUnit !== 'per kg' && currentUnit !== 'per bag' && currentUnit !== 'per carton' && currentUnit !== 'per piece' && currentUnit !== 'per bottle' && currentUnit !== 'per pack') {
            const existing = Array.from(unitMenu.querySelectorAll('.custom-dropdown-option')).find(o => o.dataset.value === currentUnit);
            if (!existing) {
                const opt = document.createElement('div');
                opt.className = 'custom-dropdown-option active';
                opt.dataset.value = currentUnit;
                opt.textContent = currentUnit;
                unitMenu.insertBefore(opt, unitMenu.querySelector('.custom-unit-create-option'));
            }
        }

        unitTrigger.onclick = (e) => {
            e.stopPropagation();
            unitMenu.style.display = unitMenu.style.display === 'block' ? 'none' : 'block';
            if (bulkMenu) bulkMenu.style.display = 'none';
        };
        
        unitMenu.querySelectorAll('.custom-dropdown-option').forEach(opt => {
            let val = opt.dataset.value;
            opt.classList.toggle('active', val === currentUnit);
            
            if (val === '__custom__') {
                opt.onclick = (e) => { e.stopPropagation(); document.getElementById('rsEditCustomUnitRow').style.display = 'block'; };
                return;
            }
            opt.onclick = (e) => {
                e.stopPropagation();
                unitHidden.value = val;
                unitTrigger.querySelector('.trigger-text').textContent = val;
                unitMenu.style.display = 'none';
                const word = val.replace('per ', '');
                const capWord = word.charAt(0).toUpperCase() + word.slice(1) + 's';
                document.getElementById('rsEditDefRetailUnitLabel').textContent = capWord;
                document.getElementById('rsEditDefRetailUnitLabel2').textContent = word;
                document.getElementById('rsEditDefRetailUnitLabel3').textContent = word;
                unitMenu.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
            };
        });
        
        document.getElementById('rsEditCustomUnitConfirmBtn')?.addEventListener('click', () => {
            let val = document.getElementById('rsEditCustomUnitInput')?.value.trim();
            if (!val) return;
            if (!val.startsWith('per ')) val = 'per ' + val;
            unitHidden.value = val;
            unitTrigger.querySelector('.trigger-text').textContent = val;
            const word = val.replace('per ', '');
            const capWord = word.charAt(0).toUpperCase() + word.slice(1) + 's';
            document.getElementById('rsEditDefRetailUnitLabel').textContent = capWord;
            document.getElementById('rsEditDefRetailUnitLabel2').textContent = word;
            document.getElementById('rsEditDefRetailUnitLabel3').textContent = word;
            document.getElementById('rsEditCustomUnitRow').style.display = 'none';
            unitMenu.style.display = 'none';
        });
    }
    
    if (!window._rsEditOutsideClickListenerAttached) {
        window._rsEditOutsideClickListenerAttached = true;
        document.addEventListener('click', (e) => {
            const bt = document.getElementById('rsEditBulkDropdownTrigger');
            const bm = document.getElementById('rsEditBulkDropdownMenu');
            if (bt && !bt.contains(e.target) && bm && !bm.contains(e.target)) {
                bm.style.display = 'none';
                document.getElementById('rsEditCustomBulkRow').style.display = 'none';
            }
            const ut = document.getElementById('rsEditUnitDropdownTrigger');
            const um = document.getElementById('rsEditUnitDropdownMenu');
            if (ut && !ut.contains(e.target) && um && !um.contains(e.target)) {
                um.style.display = 'none';
                document.getElementById('rsEditCustomUnitRow').style.display = 'none';
            }
        });
    }
}

// ===== LIVE CALCULATORS FOR RESTOCK EDIT =====

function _rsEditDefCalc() {
    const bulkCost = parseFloat(document.getElementById('rsEditDefBulkCost')?.value) || 0;
    const qty = parseInt(document.getElementById('rsEditDefQuantity')?.value) || 1;
    const pieces = parseInt(document.getElementById('rsEditDefPieces')?.value) || 0;
    const profit = parseFloat(document.getElementById('rsEditDefProfit')?.value) || 0;
    
    document.getElementById('rsEditDefTotalCostVal').textContent = '₦' + (bulkCost * qty).toLocaleString();
    
    let retailCost = 0;
    if (pieces > 0 && bulkCost > 0) {
        retailCost = bulkCost / pieces;
        document.getElementById('rsEditDefRetailCostVal').textContent = '₦' + retailCost.toFixed(2).replace(/\.?0+$/, '');
    } else {
        document.getElementById('rsEditDefRetailCostVal').textContent = '₦0';
    }
    
    const finalPrice = retailCost + profit;
    document.getElementById('rsEditDefPrice').value = finalPrice > 0 ? finalPrice : '';
}

function _rsEditAnaCalc() {
    const bagCost = parseFloat(document.getElementById('rsEditAnaBagCost')?.value) || 0;
    const bagQty = parseInt(document.getElementById('rsEditAnaBagQty')?.value) || 1;
    const bagProfit = parseFloat(document.getElementById('rsEditAnaBagProfit')?.value) || 0;
    
    document.getElementById('rsEditAnaBagTotalCostVal').textContent = '₦' + (bagCost * bagQty).toLocaleString();
    document.getElementById('rsEditAnaBagPrice').value = bagCost + bagProfit;
    
    const custardsPerBag = parseInt(document.getElementById('rsEditAnaCustardsPerBag')?.value) || 0;
    let custardCost = 0;
    if (custardsPerBag > 0 && bagCost > 0) {
        custardCost = bagCost / custardsPerBag;
        document.getElementById('rsEditAnaCustardCostVal').textContent = '₦' + custardCost.toFixed(2).replace(/\.?0+$/, '');
    } else {
        document.getElementById('rsEditAnaCustardCostVal').textContent = '₦0';
    }
    const custardProfit = parseFloat(document.getElementById('rsEditAnaCustardProfit')?.value) || 0;
    document.getElementById('rsEditAnaCustardPrice').value = (custardCost > 0 || custardProfit > 0) ? (custardCost + custardProfit) : '';
    
    const cupsPerCustard = parseInt(document.getElementById('rsEditAnaCupsPerCustard')?.value) || 0;
    let cupCost = 0;
    if (cupsPerCustard > 0 && custardCost > 0) {
        cupCost = custardCost / cupsPerCustard;
        document.getElementById('rsEditAnaCupCostVal').textContent = '₦' + cupCost.toFixed(2).replace(/\.?0+$/, '');
    } else {
        document.getElementById('rsEditAnaCupCostVal').textContent = '₦0';
    }
    const cupProfit = parseFloat(document.getElementById('rsEditAnaCupProfit')?.value) || 0;
    document.getElementById('rsEditAnaCupPrice').value = (cupCost > 0 || cupProfit > 0) ? (cupCost + cupProfit) : '';
}

// Event delegation for restock edit form inputs
if (!window._rsEditCalcListenerAttached) {
    window._rsEditCalcListenerAttached = true;
    document.addEventListener('input', (e) => {
        const id = e.target?.id;
        if (!id) return;
        
        // --- DEFAULT PRODUCT TRIGGERS ---
        const defTriggers = ['rsEditDefBulkCost','rsEditDefQuantity','rsEditDefPieces'];
        if (defTriggers.includes(id)) { _rsEditDefCalc(); return; }
        
        // Default: Profit ₦ -> Profit %
        if (id === 'rsEditDefProfit') {
            const cost = parseFloat(document.getElementById('rsEditDefBulkCost')?.value) || 0;
            const pieces = parseInt(document.getElementById('rsEditDefPieces')?.value) || 0;
            const retailCost = (pieces > 0) ? cost / pieces : 0;
            const profit = parseFloat(e.target.value) || 0;
            document.getElementById('rsEditDefProfitPercent').value = retailCost > 0 ? ((profit / retailCost) * 100).toFixed(2).replace(/\.?0+$/, '') : '';
            _rsEditDefCalc(); return;
        }
        
        // Default: Profit % -> Profit ₦
        if (id === 'rsEditDefProfitPercent') {
            const cost = parseFloat(document.getElementById('rsEditDefBulkCost')?.value) || 0;
            const pieces = parseInt(document.getElementById('rsEditDefPieces')?.value) || 0;
            const retailCost = (pieces > 0) ? cost / pieces : 0;
            const pct = parseFloat(e.target.value) || 0;
            document.getElementById('rsEditDefProfit').value = retailCost > 0 ? ((pct / 100) * retailCost).toFixed(2).replace(/\.?0+$/, '') : '';
            _rsEditDefCalc(); return;
        }
        
        // Analytical triggers
        const anaTriggers = ['rsEditAnaBagCost','rsEditAnaBagQty','rsEditAnaCustardsPerBag','rsEditAnaCupsPerCustard'];
        if (anaTriggers.includes(id)) { _rsEditAnaCalc(); return; }
        
        // Bag profit sync
        if (id === 'rsEditAnaBagProfit') {
            const cost = parseFloat(document.getElementById('rsEditAnaBagCost')?.value) || 0;
            const profit = parseFloat(e.target.value) || 0;
            document.getElementById('rsEditAnaBagProfitPct').value = cost > 0 ? ((profit / cost) * 100).toFixed(2).replace(/\.?0+$/, '') : '';
            _rsEditAnaCalc(); return;
        }
        if (id === 'rsEditAnaBagProfitPct') {
            const cost = parseFloat(document.getElementById('rsEditAnaBagCost')?.value) || 0;
            const pct = parseFloat(e.target.value) || 0;
            document.getElementById('rsEditAnaBagProfit').value = cost > 0 ? ((pct / 100) * cost).toFixed(2).replace(/\.?0+$/, '') : '';
            _rsEditAnaCalc(); return;
        }
        
        // Custard profit sync
        if (id === 'rsEditAnaCustardProfit') {
            const bagCost = parseFloat(document.getElementById('rsEditAnaBagCost')?.value) || 0;
            const cpb = parseInt(document.getElementById('rsEditAnaCustardsPerBag')?.value) || 0;
            const cost = cpb > 0 ? bagCost / cpb : 0;
            const profit = parseFloat(e.target.value) || 0;
            document.getElementById('rsEditAnaCustardProfitPct').value = cost > 0 ? ((profit / cost) * 100).toFixed(2).replace(/\.?0+$/, '') : '';
            _rsEditAnaCalc(); return;
        }
        if (id === 'rsEditAnaCustardProfitPct') {
            const bagCost = parseFloat(document.getElementById('rsEditAnaBagCost')?.value) || 0;
            const cpb = parseInt(document.getElementById('rsEditAnaCustardsPerBag')?.value) || 0;
            const cost = cpb > 0 ? bagCost / cpb : 0;
            const pct = parseFloat(e.target.value) || 0;
            document.getElementById('rsEditAnaCustardProfit').value = cost > 0 ? ((pct / 100) * cost).toFixed(2).replace(/\.?0+$/, '') : '';
            _rsEditAnaCalc(); return;
        }
        
        // Cup profit sync
        if (id === 'rsEditAnaCupProfit') {
            const bagCost = parseFloat(document.getElementById('rsEditAnaBagCost')?.value) || 0;
            const cpb = parseInt(document.getElementById('rsEditAnaCustardsPerBag')?.value) || 0;
            const cpc = parseInt(document.getElementById('rsEditAnaCupsPerCustard')?.value) || 0;
            const custCost = cpb > 0 ? bagCost / cpb : 0;
            const cost = cpc > 0 ? custCost / cpc : 0;
            const profit = parseFloat(e.target.value) || 0;
            document.getElementById('rsEditAnaCupProfitPct').value = cost > 0 ? ((profit / cost) * 100).toFixed(2).replace(/\.?0+$/, '') : '';
            _rsEditAnaCalc(); return;
        }
        if (id === 'rsEditAnaCupProfitPct') {
            const bagCost = parseFloat(document.getElementById('rsEditAnaBagCost')?.value) || 0;
            const cpb = parseInt(document.getElementById('rsEditAnaCustardsPerBag')?.value) || 0;
            const cpc = parseInt(document.getElementById('rsEditAnaCupsPerCustard')?.value) || 0;
            const custCost = cpb > 0 ? bagCost / cpb : 0;
            const cost = cpc > 0 ? custCost / cpc : 0;
            const pct = parseFloat(e.target.value) || 0;
            document.getElementById('rsEditAnaCupProfit').value = cost > 0 ? ((pct / 100) * cost).toFixed(2).replace(/\.?0+$/, '') : '';
            _rsEditAnaCalc(); return;
        }
        
        // Edit Price Form logic
        const defPriceTrigs = ['rsEditPriceDefBulkCost','rsEditPriceDefPieces','rsEditPriceDefProfit','rsEditPriceDefProfitPercent'];
        if (defPriceTrigs.includes(id)) {
            _rsEditPriceDefCalc(id);
            return;
        }
        
        const anaPriceTrigs = [
            'rsEditPriceAnaBagCost', 'rsEditPriceAnaCustardsPerBag', 'rsEditPriceAnaCupsPerCustard',
            'rsEditPriceAnaBagProfit', 'rsEditPriceAnaBagProfitPct',
            'rsEditPriceAnaCustardProfit', 'rsEditPriceAnaCustardProfitPct',
            'rsEditPriceAnaCupProfit', 'rsEditPriceAnaCupProfitPct'
        ];
        if (anaPriceTrigs.includes(id)) {
            _rsEditPriceAnaCalc(id);
            return;
        }
        
        // Title label updates
        if (id === 'rsEditAnaBagTitle') {
            const v = e.target.value.trim() || 'Container 1';
            document.getElementById('rsEditAnaBagCostLbl').textContent = v;
            document.getElementById('rsEditAnaBagProfitLbl').textContent = v;
            document.getElementById('rsEditAnaBagPriceLbl').textContent = v;
        }
        if (id === 'rsEditAnaCustardTitle') {
            const v = e.target.value.trim() || 'Container 2';
            document.getElementById('rsEditAnaCustardProfitLbl').textContent = v;
            document.getElementById('rsEditAnaCustardPriceLbl').textContent = v;
        }
        if (id === 'rsEditAnaCupTitle') {
            const v = e.target.value.trim() || 'Container 3';
            document.getElementById('rsEditAnaCupPriceLbl').textContent = v;
        }
        
        // Edit Price Title/Label updates
        if (id === 'rsEditPriceDefBulk') {
            const v = e.target.value.trim() || 'Carton';
            document.getElementById('rsEditPriceDefBulkLabel').textContent = v;
        }
        if (id === 'rsEditPriceAnaBagTitleText') {
            const v = e.target.value.trim() || 'Container 1';
            document.querySelectorAll('.rsEditPriceAnaBagLbl').forEach(el => el.textContent = v);
        }
        if (id === 'rsEditPriceAnaCustardTitleText') {
            const v = e.target.value.trim() || 'Container 2';
            document.querySelectorAll('.rsEditPriceAnaCustardLbl').forEach(el => el.textContent = v);
        }
        if (id === 'rsEditPriceAnaCupTitleText') {
            const v = e.target.value.trim() || 'Container 3';
            document.querySelectorAll('.rsEditPriceAnaCupLbl').forEach(el => el.textContent = v);
        }
    });

}

// RS Edit Price Core Logic functions
window._rsCloseEditPriceForm = function() {
    document.getElementById('rsEditPriceFormView').style.display = 'none';
    document.getElementById('rsDetailView').style.display = 'flex';
}

function _rsEditPriceDefCalc(triggerId = null) {
    const pp = window._rsCurrentProduct;
    if (!pp) return;
    const bCost = parseFloat(document.getElementById('rsEditPriceDefBulkCost').value) || 0;
    const pieces = parseInt(document.getElementById('rsEditPriceDefPieces').value) || 1;
    const cost = pieces > 0 ? bCost / pieces : 0;
    
    const retailCostEl = document.getElementById('rsEditPriceDefRetailCostVal');
    if (retailCostEl) retailCostEl.textContent = '₦' + cost.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2});
    
    const profitEl = document.getElementById('rsEditPriceDefProfit');
    const profitPctEl = document.getElementById('rsEditPriceDefProfitPercent');
    
    if (triggerId === 'rsEditPriceDefProfitPct' || triggerId === 'rsEditPriceDefProfitPercent') {
        const pct = parseFloat(profitPctEl.value) || 0;
        const calcProfit = cost * (pct / 100);
        profitEl.value = calcProfit > 0 ? calcProfit.toFixed(2) : '';
    } else if (triggerId === 'rsEditPriceDefProfit' || triggerId === 'rsEditPriceDefBulkCost' || triggerId === 'rsEditPriceDefPieces') {
        const prof = parseFloat(profitEl.value) || 0;
        const calcPct = cost > 0 ? (prof / cost) * 100 : 0;
        profitPctEl.value = calcPct > 0 ? calcPct.toFixed(2) : '';
    }
    
    const profit = parseFloat(profitEl.value) || 0;
    const finalPrice = cost + profit;
    document.getElementById('rsEditPriceDefPrice').value = finalPrice > 0 ? parseFloat(finalPrice.toFixed(2)) : '';
    
    // Payout logic
    const prRate = parseFloat(localStorage.getItem('nd_payout_rate')) || 2;
    const pay = finalPrice * (prRate / 100);
    const fp = Number.isInteger(pay) ? pay : pay.toFixed(2);
    const payoutEl = document.getElementById('rsEditPricePayoutValue');
    if (payoutEl) {
        payoutEl.textContent = `₦${fp} (${prRate}%)`;
    }
}

function _rsEditPriceAnaCalc(triggerId = null) {
    const pp = window._rsCurrentProduct;
    if (!pp) return;
    const bVal = parseFloat(document.getElementById('rsEditPriceAnaBagCost').value) || 0;
    const cpb = parseInt(document.getElementById('rsEditPriceAnaCustardsPerBag').value) || 0;
    const cVal = (cpb && bVal) ? bVal / cpb : 0;
    const cpc = parseInt(document.getElementById('rsEditPriceAnaCupsPerCustard').value) || 0;
    const cupVal = (cpc && cVal) ? cVal / cpc : 0;
    
    const custSpan = document.getElementById('rsEditPriceAnaCustardCostVal');
    if (custSpan) custSpan.textContent = '₦' + cVal.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2});
    const cupSpan = document.getElementById('rsEditPriceAnaCupCostVal');
    if (cupSpan) cupSpan.textContent = '₦' + cupVal.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2});
    
    // Sync logic for Bag
    const bagP = document.getElementById('rsEditPriceAnaBagProfit');
    const bagPct = document.getElementById('rsEditPriceAnaBagProfitPct');
    if (triggerId === 'rsEditPriceAnaBagProfitPct') {
        const pct = parseFloat(bagPct.value) || 0;
        bagP.value = bVal > 0 ? (bVal * (pct / 100)).toFixed(2) : '';
    } else {
        const prof = parseFloat(bagP.value) || 0;
        bagPct.value = bVal > 0 ? ((prof / bVal) * 100).toFixed(2) : '';
    }
    
    // Sync logic for Custard
    const custP = document.getElementById('rsEditPriceAnaCustardProfit');
    const custPct = document.getElementById('rsEditPriceAnaCustardProfitPct');
    if (triggerId === 'rsEditPriceAnaCustardProfitPct') {
        const pct = parseFloat(custPct.value) || 0;
        custP.value = cVal > 0 ? (cVal * (pct / 100)).toFixed(2) : '';
    } else {
        const prof = parseFloat(custP.value) || 0;
        custPct.value = cVal > 0 ? ((prof / cVal) * 100).toFixed(2) : '';
    }
    
    // Sync logic for Cup
    const cupP = document.getElementById('rsEditPriceAnaCupProfit');
    const cupPct = document.getElementById('rsEditPriceAnaCupProfitPct');
    if (triggerId === 'rsEditPriceAnaCupProfitPct') {
        const pct = parseFloat(cupPct.value) || 0;
        cupP.value = cupVal > 0 ? (cupVal * (pct / 100)).toFixed(2) : '';
    } else {
        const prof = parseFloat(cupP.value) || 0;
        cupPct.value = cupVal > 0 ? ((prof / cupVal) * 100).toFixed(2) : '';
    }
    
    const bagProfit = parseFloat(bagP.value) || 0;
    document.getElementById('rsEditPriceAnaBagPrice').value = parseFloat((bVal + bagProfit).toFixed(2)) || '';
    
    const custProfit = parseFloat(custP.value) || 0;
    document.getElementById('rsEditPriceAnaCustardPrice').value = parseFloat((cVal + custProfit).toFixed(2)) || '';
    
    const cupProfit = parseFloat(cupP.value) || 0;
    document.getElementById('rsEditPriceAnaCupPrice').value = parseFloat((cupVal + cupProfit).toFixed(2)) || '';
    
    const prRate = parseFloat(localStorage.getItem('nd_payout_rate')) || 2;
    
    const pay1 = Math.max(0, bagProfit) * (prRate / 100);
    const el1 = document.getElementById('rsEditPriceAnaBagPayout');
    if (el1) el1.textContent = `₦${Number.isInteger(pay1) ? pay1 : pay1.toFixed(2)} (${prRate}%)`;
    
    const pay2 = Math.max(0, custProfit) * (prRate / 100);
    const el2 = document.getElementById('rsEditPriceAnaCustardPayout');
    if (el2) el2.textContent = `₦${Number.isInteger(pay2) ? pay2 : pay2.toFixed(2)} (${prRate}%)`;
    
    const pay3 = Math.max(0, cupProfit) * (prRate / 100);
    const el3 = document.getElementById('rsEditPriceAnaCupPayout');
    if (el3) el3.textContent = `₦${Number.isInteger(pay3) ? pay3 : pay3.toFixed(2)} (${prRate}%)`;
}

window._rsOpenEditPriceForm = function() {
    document.getElementById('rsDetailView').style.display = 'none';
    document.getElementById('rsEditPriceFormView').style.display = 'flex';
    
    const p = window._rsCurrentProduct;
    if (!p) return;
    
    if (p.isSpecial || p.packTypes) {
        document.getElementById('rsEditPriceDefaultContainer').style.display = 'none';
        document.getElementById('rsEditPriceAnalyticalContainer').style.display = 'flex';
        
        const bagTitle = (p.packTypes && (p.packTypes.bag ? p.packTypes.bag.title : (p.packTypes.c1 ? p.packTypes.c1.title : 'Container 1')));
        const custardTitle = (p.packTypes && (p.packTypes.custard ? p.packTypes.custard.title : (p.packTypes.c2 ? p.packTypes.c2.title : 'Container 2')));
        const cupTitle = (p.packTypes && (p.packTypes.cup ? p.packTypes.cup.title : (p.packTypes.c3 ? p.packTypes.c3.title : 'Container 3')));
        const s = p.structure || {};
        
        // Auto-fill legacy data (same logic as _rsOpenEditForm)
        let bVal = (typeof p.cost === 'number') ? p.cost : 0;
        let bPrice = (p.packTypes && (p.packTypes.bag ? p.packTypes.bag.price : (p.packTypes.c1 ? p.packTypes.c1.price : 0))) || 0;
        let bagProfit = (s.bagProfit !== undefined && s.bagProfit !== '') ? s.bagProfit : ((s.c1Profit !== undefined && s.c1Profit !== '') ? s.c1Profit : (bPrice && bVal ? parseFloat((bPrice - bVal).toFixed(2)) : ''));
        let bagProfitPct = (s.bagProfitPercent !== undefined && s.bagProfitPercent !== '') ? s.bagProfitPercent : ((s.c1ProfitPercent !== undefined && s.c1ProfitPercent !== '') ? s.c1ProfitPercent : ((bagProfit !== '' && bVal > 0) ? parseFloat(((bagProfit / bVal) * 100).toFixed(2)) : ''));
        let cpb = s.custardsPerBag || s.c2sPerC1 || '';
        let cPrice = (p.packTypes && (p.packTypes.custard ? p.packTypes.custard.price : (p.packTypes.c2 ? p.packTypes.c2.price : 0))) || 0;
        let cCost = (cpb && bVal) ? bVal / cpb : 0;
        let custProfit = (s.custardProfit !== undefined && s.custardProfit !== '') ? s.custardProfit : ((s.c2Profit !== undefined && s.c2Profit !== '') ? s.c2Profit : (cPrice && cCost ? parseFloat((cPrice - cCost).toFixed(2)) : ''));
        let custProfitPct = (s.custardProfitPercent !== undefined && s.custardProfitPercent !== '') ? s.custardProfitPercent : ((s.c2ProfitPercent !== undefined && s.c2ProfitPercent !== '') ? s.c2ProfitPercent : ((custProfit !== '' && cCost > 0) ? parseFloat(((custProfit / cCost) * 100).toFixed(2)) : ''));
        let cpc = s.cupsPerCustard || s.c3sPerC2 || '';
        let cupPriceRaw = (p.packTypes && (p.packTypes.cup ? p.packTypes.cup.price : (p.packTypes.c3 ? p.packTypes.c3.price : 0))) || 0;
        let cupPrice = cupPriceRaw === 'Flexible' ? '' : cupPriceRaw;
        let cupCost = (cpc && cCost) ? cCost / cpc : 0;
        let cupProfit = (s.cupProfit !== undefined && s.cupProfit !== '') ? s.cupProfit : ((s.c3Profit !== undefined && s.c3Profit !== '') ? s.c3Profit : (cupPrice && cupCost ? parseFloat((cupPrice - cupCost).toFixed(2)) : ''));
        let cupProfitPct = (s.cupProfitPercent !== undefined && s.cupProfitPercent !== '') ? s.cupProfitPercent : ((s.c3ProfitPercent !== undefined && s.c3ProfitPercent !== '') ? s.c3ProfitPercent : ((cupProfit !== '' && cupCost > 0) ? parseFloat(((cupProfit / cupCost) * 100).toFixed(2)) : ''));
        
        document.getElementById('rsEditPriceAnaName').value = p.name || '';
        
        document.getElementById('rsEditPriceAnaBagTitleText').value = bagTitle;
        document.querySelectorAll('.rsEditPriceAnaBagLbl').forEach(el => el.textContent = bagTitle);
        document.getElementById('rsEditPriceAnaCustardTitleText').value = custardTitle;
        document.querySelectorAll('.rsEditPriceAnaCustardLbl').forEach(el => el.textContent = custardTitle);
        document.getElementById('rsEditPriceAnaCupTitleText').value = cupTitle;
        document.querySelectorAll('.rsEditPriceAnaCupLbl').forEach(el => el.textContent = cupTitle);
        
        document.getElementById('rsEditPriceAnaBagCost').value = (typeof p.cost === 'number') ? p.cost : '';
        document.getElementById('rsEditPriceAnaCustardsPerBag').value = cpb;
        document.getElementById('rsEditPriceAnaCupsPerCustard').value = cpc;
        
        document.getElementById('rsEditPriceAnaBagProfit').value = bagProfit;
        document.getElementById('rsEditPriceAnaBagProfitPct').value = bagProfitPct;
        document.getElementById('rsEditPriceAnaBagPrice').value = bPrice || '';
        
        document.getElementById('rsEditPriceAnaCustardProfit').value = custProfit;
        document.getElementById('rsEditPriceAnaCustardProfitPct').value = custProfitPct;
        document.getElementById('rsEditPriceAnaCustardPrice').value = cPrice || '';
        
        document.getElementById('rsEditPriceAnaCupProfit').value = cupProfit;
        document.getElementById('rsEditPriceAnaCupProfitPct').value = cupProfitPct;
        document.getElementById('rsEditPriceAnaCupPrice').value = cupPrice || '';
        
        // Hide/show cup fields if flexible
        const updateFieldVisibility = (isFlex) => {
            const displayStyle = isFlex ? 'none' : 'block';
            const inlineStyle = isFlex ? 'none' : 'inline-block';
            const flexStyle = isFlex ? 'none' : 'flex';
            
            const c3CostVal = document.getElementById('rsEditPriceAnaCupCostVal');
            if (c3CostVal && c3CostVal.parentElement) c3CostVal.parentElement.style.display = inlineStyle;
            
            const c3Profit = document.getElementById('rsEditPriceAnaCupProfit');
            if (c3Profit && c3Profit.closest('div[style*="gap: 10px"]')) c3Profit.closest('div[style*="gap: 10px"]').style.display = flexStyle;
            
            const c3Price = document.getElementById('rsEditPriceAnaCupPrice');
            if (c3Price && c3Price.closest('.form-group')) c3Price.closest('.form-group').style.display = displayStyle;
        };
        updateFieldVisibility(!!p.isFlexible);

        _rsEditPriceAnaCalc();
        
    } else {
        document.getElementById('rsEditPriceAnalyticalContainer').style.display = 'none';
        document.getElementById('rsEditPriceDefaultContainer').style.display = 'flex';
        
        const unitWord = (p.unit || 'per piece').replace('per ', '');
        const bulkName = p.bulkUnit || 'Carton';
        const unitVal = p.unit || 'per piece';
        
        document.getElementById('rsEditPriceDefName').value = p.name || '';
        
        document.getElementById('rsEditPriceBulkUnitSelect').value = bulkName;
        document.querySelector('#rsEditPriceBulkDropdownTrigger .trigger-text').textContent = bulkName;
        document.getElementById('rsEditPriceDefBulkLabel').textContent = bulkName;
        
        document.getElementById('rsEditPriceUnitSelect').value = unitVal;
        document.querySelector('#rsEditPriceUnitDropdownTrigger .trigger-text').textContent = unitVal;
        
        // Same calculation as _rsOpenEditForm
        const qty = p.boughtQuantity || 1;
        const totalPurchase = p.purchaseCost || 0;
        const perBulkCost = qty > 0 ? totalPurchase / qty : totalPurchase;
        
        const pieces = p.pieces || '';
        const retailCost = (pieces > 0 && perBulkCost > 0) ? perBulkCost / pieces : 0;
        let pProfit = (p.profit !== undefined && p.profit !== '') ? p.profit : (p.price && retailCost ? parseFloat((p.price - retailCost).toFixed(2)) : '');
        let pProfitPct = (pProfit !== '' && retailCost > 0) ? parseFloat(((pProfit / retailCost) * 100).toFixed(2)) : ((p.profitPercent !== undefined && p.profitPercent !== '') ? p.profitPercent : '');
        
        document.getElementById('rsEditPriceDefPieces').value = pieces;
        document.getElementById('rsEditPriceDefBulkCost').value = perBulkCost || '';
        document.getElementById('rsEditPriceDefProfit').value = pProfit;
        document.getElementById('rsEditPriceDefProfitPercent').value = pProfitPct;
        document.getElementById('rsEditPriceDefPrice').value = p.price || '';
        
        _rsEditPriceInitDropdowns(bulkName, unitVal);
        _rsEditPriceDefCalc();
    }
}

function _rsEditPriceInitDropdowns(currentBulk, currentUnit) {
    const bulkTrigger = document.getElementById('rsEditPriceBulkDropdownTrigger');
    const bulkMenu = document.getElementById('rsEditPriceBulkDropdownMenu');
    const bulkHidden = document.getElementById('rsEditPriceBulkUnitSelect');
    
    if (bulkTrigger && bulkMenu) {
        if (currentBulk && !['Carton','Pack','Crate','Container 1','Sack','Box','Roll','Bundle'].includes(currentBulk)) {
            const existing = Array.from(bulkMenu.querySelectorAll('.custom-dropdown-option')).find(o => o.dataset.value === currentBulk);
            if (!existing) {
                const opt = document.createElement('div');
                opt.className = 'custom-dropdown-option active';
                opt.dataset.value = currentBulk;
                opt.textContent = currentBulk;
                bulkMenu.insertBefore(opt, bulkMenu.querySelector('.custom-unit-create-option'));
            }
        }

        bulkTrigger.onclick = (e) => {
            e.stopPropagation();
            bulkMenu.style.display = bulkMenu.style.display === 'block' ? 'none' : 'block';
            const unitMenu = document.getElementById('rsEditPriceUnitDropdownMenu');
            if (unitMenu) unitMenu.style.display = 'none';
        };
        
        bulkMenu.querySelectorAll('.custom-dropdown-option').forEach(opt => {
            let val = opt.dataset.value;
            opt.classList.toggle('active', val === currentBulk);
            
            if (val === '__custom_bulk__') {
                opt.onclick = (e) => { e.stopPropagation(); document.getElementById('rsEditPriceCustomBulkRow').style.display = 'block'; };
                return;
            }
            opt.onclick = (e) => {
                e.stopPropagation();
                bulkHidden.value = val;
                bulkTrigger.querySelector('.trigger-text').textContent = val;
                bulkMenu.style.display = 'none';
                document.getElementById('rsEditPriceDefBulkLabel').textContent = val;
                bulkMenu.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
            };
        });
        
        document.getElementById('rsEditPriceCustomBulkConfirmBtn')?.addEventListener('click', () => {
            const val = document.getElementById('rsEditPriceCustomBulkInput')?.value.trim();
            if (!val) return;
            bulkHidden.value = val;
            bulkTrigger.querySelector('.trigger-text').textContent = val;
            document.getElementById('rsEditPriceDefBulkLabel').textContent = val;
            document.getElementById('rsEditPriceCustomBulkRow').style.display = 'none';
            bulkMenu.style.display = 'none';
        });
    }
    
    const unitTrigger = document.getElementById('rsEditPriceUnitDropdownTrigger');
    const unitMenu = document.getElementById('rsEditPriceUnitDropdownMenu');
    const unitHidden = document.getElementById('rsEditPriceUnitSelect');
    
    if (unitTrigger && unitMenu) {
        if (currentUnit && !['per cup','per kg','per bag','per carton','per piece','per bottle','per pack'].includes(currentUnit)) {
            const existing = Array.from(unitMenu.querySelectorAll('.custom-dropdown-option')).find(o => o.dataset.value === currentUnit);
            if (!existing) {
                const opt = document.createElement('div');
                opt.className = 'custom-dropdown-option active';
                opt.dataset.value = currentUnit;
                opt.textContent = currentUnit;
                unitMenu.insertBefore(opt, unitMenu.querySelector('.custom-unit-create-option'));
            }
        }

        unitTrigger.onclick = (e) => {
            e.stopPropagation();
            unitMenu.style.display = unitMenu.style.display === 'block' ? 'none' : 'block';
            if (bulkMenu) bulkMenu.style.display = 'none';
        };
        
        unitMenu.querySelectorAll('.custom-dropdown-option').forEach(opt => {
            let val = opt.dataset.value;
            opt.classList.toggle('active', val === currentUnit);
            
            if (val === '__custom__') {
                opt.onclick = (e) => { e.stopPropagation(); document.getElementById('rsEditPriceCustomUnitRow').style.display = 'block'; };
                return;
            }
            opt.onclick = (e) => {
                e.stopPropagation();
                unitHidden.value = val;
                unitTrigger.querySelector('.trigger-text').textContent = val;
                unitMenu.style.display = 'none';
                unitMenu.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                
                const unitWord = val.replace(/^per\s+/i, '');
                const capUnit = unitWord.charAt(0).toUpperCase() + unitWord.slice(1) + 's';
                document.getElementById('rsEditPriceDefRetailUnitLabel').textContent = capUnit;
                document.getElementById('rsEditPriceDefRetailUnitLabel2').textContent = unitWord;
                document.getElementById('rsEditPriceDefRetailUnitLabel3').textContent = unitWord;
            };
        });
        
        document.getElementById('rsEditPriceCustomUnitConfirmBtn')?.addEventListener('click', () => {
            let val = document.getElementById('rsEditPriceCustomUnitInput')?.value.trim();
            if (!val) return;
            if (!val.startsWith('per ')) val = 'per ' + val;
            unitHidden.value = val;
            unitTrigger.querySelector('.trigger-text').textContent = val;
            document.getElementById('rsEditPriceCustomUnitRow').style.display = 'none';
            unitMenu.style.display = 'none';
            
            const unitWord = val.replace(/^per\s+/i, '');
            const capUnit = unitWord.charAt(0).toUpperCase() + unitWord.slice(1) + 's';
            document.getElementById('rsEditPriceDefRetailUnitLabel').textContent = capUnit;
            document.getElementById('rsEditPriceDefRetailUnitLabel2').textContent = unitWord;
            document.getElementById('rsEditPriceDefRetailUnitLabel3').textContent = unitWord;
        });
    }
    
    // Click outside listener
    if (!window._rsEditPriceOutsideClickAttached) {
        window._rsEditPriceOutsideClickAttached = true;
        document.addEventListener('click', (e) => {
            const bt = document.getElementById('rsEditPriceBulkDropdownTrigger');
            const bm = document.getElementById('rsEditPriceBulkDropdownMenu');
            if (bt && !bt.contains(e.target) && bm && !bm.contains(e.target)) {
                bm.style.display = 'none';
                const cbr = document.getElementById('rsEditPriceCustomBulkRow');
                if (cbr) cbr.style.display = 'none';
            }
            const ut = document.getElementById('rsEditPriceUnitDropdownTrigger');
            const um = document.getElementById('rsEditPriceUnitDropdownMenu');
            if (ut && !ut.contains(e.target) && um && !um.contains(e.target)) {
                um.style.display = 'none';
                const cur = document.getElementById('rsEditPriceCustomUnitRow');
                if (cur) cur.style.display = 'none';
            }
        });
    }
}

/* Scratch file to test syntax */
function _rsOpenTopUpForm(p) {
    _pdShowView('productTopUpFormView');
    const defContainer = document.getElementById('rsTopUpDefaultContainer');
    const anaContainer = document.getElementById('rsTopUpAnalyticalContainer');

    const stockStatus = document.getElementById('rsTopUpStockStatus');
    const stockStatusTrigger = document.querySelector('#rsTopUpStockStatusTrigger .trigger-text');
    if (stockStatus) stockStatus.value = p.isNewStock ? 'new' : 'none';
    if (stockStatusTrigger) stockStatusTrigger.textContent = p.isNewStock ? 'Mark as NEW STOCK' : 'Normal (No Badge)';

    if (p.isSpecial || p.packTypes) {
        if (defContainer) defContainer.style.display = 'none';
        if (anaContainer) anaContainer.style.display = 'flex';

        const struct = p.structure || {};
        const costConfig = p.packTypes || {};
        
        const bagTitle = (costConfig.bag && costConfig.bag.title) || (costConfig.c1 && costConfig.c1.title) || p.bulkUnit || 'Container 1';
        const custardTitle = (costConfig.custard && costConfig.custard.title) || (costConfig.c2 && costConfig.c2.title) || 'Container 2';
        const cupTitle = (costConfig.cup && costConfig.cup.title) || (costConfig.c3 && costConfig.c3.title) || 'Container 3';

        document.querySelectorAll('.rsTopUpAnaBagLbl').forEach(el => el.textContent = bagTitle);
        document.querySelectorAll('.rsTopUpAnaCustardLbl').forEach(el => el.textContent = custardTitle);
        document.querySelectorAll('.rsTopUpAnaCupLbl').forEach(el => el.textContent = cupTitle);
        
        const optBag = document.getElementById('rsTopUpOptBag');
        const optCustard = document.getElementById('rsTopUpOptCustard');
        const optCup = document.getElementById('rsTopUpOptCup');
        if (optBag) optBag.textContent = bagTitle;
        if (optCustard) optCustard.textContent = custardTitle;
        if (optCup) optCup.textContent = cupTitle;

        _setVal('rsTopUpAnaSizeSelect', 'bag');
        const trig = document.querySelector('#rsTopUpAnaSizeDropdownTrigger .trigger-text');
        if (trig) trig.textContent = bagTitle;
        const activeLabel = document.getElementById('rsTopUpAnaActiveUnitLabel');
        if (activeLabel) activeLabel.textContent = bagTitle;

        _setVal('rsTopUpAnaQuantity', '');
        _setVal('rsTopUpAnaTotalCost', '');

        // Pre-fill existing tier pricing
        _setVal('rsTopUpAnaCustardsPerBag', struct.custardsPerBag || 1);
        _setVal('rsTopUpAnaCupsPerCustard', struct.cupsPerCustard || 1);

        _setVal('rsTopUpAnaBagProfit', costConfig.bag?.profit || 0);
        _setVal('rsTopUpAnaCustardProfit', costConfig.custard?.profit || 0);
        _setVal('rsTopUpAnaCupProfit', costConfig.cup?.profit || 0);

        _setVal('rsTopUpAnaBagProfitPct', '');
        _setVal('rsTopUpAnaCustardProfitPct', '');
        _setVal('rsTopUpAnaCupProfitPct', '');

        const sizeWrapper = document.getElementById('rsTopUpAnaSizeDropdownWrapper');
        const sizeMenu = document.getElementById('rsTopUpAnaSizeDropdownMenu');
        if (sizeMenu) {
            const clonedMenu = sizeMenu.cloneNode(true);
            sizeMenu.parentNode.replaceChild(clonedMenu, sizeMenu);
            clonedMenu.addEventListener('click', (e) => {
                const opt = e.target.closest('.custom-dropdown-option');
                if (!opt) return;
                const val = opt.getAttribute('data-value');
                const labelMap = { bag: bagTitle, custard: custardTitle, cup: cupTitle };
                const displayLabel = labelMap[val] || val;
                clonedMenu.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                if (trig) trig.textContent = displayLabel;
                _setVal('rsTopUpAnaSizeSelect', val);
                if (activeLabel) activeLabel.textContent = displayLabel;
                sizeWrapper.classList.remove('open');
                runAnaTopUpMath();
            });
        }
        
        let lastBagProfitSrc = 'amount';
        let lastCustardProfitSrc = 'amount';
        let lastCupProfitSrc = 'amount';
        
        function runAnaTopUpMath() {
            const oldTotalBags = parseFloat(p.boughtQuantity) || 0;
            const oldTotalCost = parseFloat(p.purchaseCost) || 0;
            
            const selSize = document.getElementById('rsTopUpAnaSizeSelect')?.value || 'bag';
            const qtyInput = parseFloat(document.getElementById('rsTopUpAnaQuantity')?.value) || 0;
            const costInput = parseFloat(document.getElementById('rsTopUpAnaTotalCost')?.value) || 0;
            
            const cpb = parseInt(document.getElementById('rsTopUpAnaCustardsPerBag')?.value) || 1;
            const cpc = parseInt(document.getElementById('rsTopUpAnaCupsPerCustard')?.value) || 1;
            
            let fractionalBagsAdded = 0;
            if (selSize === 'bag') {
                fractionalBagsAdded = qtyInput;
            } else if (selSize === 'custard') {
                fractionalBagsAdded = qtyInput / cpb;
            } else if (selSize === 'cup') {
                fractionalBagsAdded = qtyInput / (cpb * cpc);
            }
            
            const newTotalBags = oldTotalBags + fractionalBagsAdded;
            const newTotalCost = oldTotalCost + costInput;
            
            let newAvgBagCost = 0;
            if (newTotalBags > 0) {
                newAvgBagCost = newTotalCost / newTotalBags;
            }
            
            const elAvgBagCostVal = document.getElementById('rsTopUpAnaAvgBagCostVal');
            if (elAvgBagCostVal) elAvgBagCostVal.textContent = '₦' + newAvgBagCost.toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:2});
            
            const newCustCost = newAvgBagCost / cpb;
            const newCupCost = newAvgBagCost / (cpb * cpc);
            
            const elCustCost = document.getElementById('rsTopUpAnaCustardCostVal');
            const elCupCost = document.getElementById('rsTopUpAnaCupCostVal');
            if (elCustCost) elCustCost.textContent = '₦' + newCustCost.toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:2});
            if (elCupCost) elCupCost.textContent = '₦' + newCupCost.toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:2});
            
            // Recalculate tier profits
            const bagProfitInp = document.getElementById('rsTopUpAnaBagProfit');
            const bagProfitPctInp = document.getElementById('rsTopUpAnaBagProfitPct');
            const bagPriceInp = document.getElementById('rsTopUpAnaBagPrice');
            if (lastBagProfitSrc === 'amount') {
                const amt = parseFloat(bagProfitInp.value) || 0;
                if (bagProfitPctInp && newAvgBagCost > 0) bagProfitPctInp.value = ((amt / newAvgBagCost) * 100).toFixed(0);
                if (bagPriceInp) bagPriceInp.value = (newAvgBagCost + amt).toFixed(0);
            } else {
                const pct = parseFloat(bagProfitPctInp.value) || 0;
                const amt = newAvgBagCost * (pct / 100);
                if (bagProfitInp) bagProfitInp.value = amt.toFixed(0);
                if (bagPriceInp) bagPriceInp.value = (newAvgBagCost + amt).toFixed(0);
            }
            
            // Custard
            const custProfitInp = document.getElementById('rsTopUpAnaCustardProfit');
            const custProfitPctInp = document.getElementById('rsTopUpAnaCustardProfitPct');
            const custPriceInp = document.getElementById('rsTopUpAnaCustardPrice');
            if (lastCustardProfitSrc === 'amount') {
                const amt = parseFloat(custProfitInp.value) || 0;
                if (custProfitPctInp && newCustCost > 0) custProfitPctInp.value = ((amt / newCustCost) * 100).toFixed(0);
                if (custPriceInp) custPriceInp.value = (newCustCost + amt).toFixed(0);
            } else {
                const pct = parseFloat(custProfitPctInp.value) || 0;
                const amt = newCustCost * (pct / 100);
                if (custProfitInp) custProfitInp.value = amt.toFixed(0);
                if (custPriceInp) custPriceInp.value = (newCustCost + amt).toFixed(0);
            }
            
            // Cup
            const cupProfitInp = document.getElementById('rsTopUpAnaCupProfit');
            const cupProfitPctInp = document.getElementById('rsTopUpAnaCupProfitPct');
            const cupPriceInp = document.getElementById('rsTopUpAnaCupPrice');
            if (lastCupProfitSrc === 'amount') {
                const amt = parseFloat(cupProfitInp.value) || 0;
                if (cupProfitPctInp && newCupCost > 0) cupProfitPctInp.value = ((amt / newCupCost) * 100).toFixed(0);
                if (cupPriceInp) cupPriceInp.value = (newCupCost + amt).toFixed(0);
            } else {
                const pct = parseFloat(cupProfitPctInp.value) || 0;
                const amt = newCupCost * (pct / 100);
                if (cupProfitInp) cupProfitInp.value = amt.toFixed(0);
                if (cupPriceInp) cupPriceInp.value = (newCupCost + amt).toFixed(0);
            }
        }
        
        ['rsTopUpAnaQuantity', 'rsTopUpAnaTotalCost', 'rsTopUpAnaCustardsPerBag', 'rsTopUpAnaCupsPerCustard'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', runAnaTopUpMath);
        });
        
        document.getElementById('rsTopUpAnaBagProfit')?.addEventListener('input', () => { lastBagProfitSrc = 'amount'; runAnaTopUpMath(); });
        document.getElementById('rsTopUpAnaBagProfitPct')?.addEventListener('input', () => { lastBagProfitSrc = 'percent'; runAnaTopUpMath(); });
        document.getElementById('rsTopUpAnaCustardProfit')?.addEventListener('input', () => { lastCustardProfitSrc = 'amount'; runAnaTopUpMath(); });
        document.getElementById('rsTopUpAnaCustardProfitPct')?.addEventListener('input', () => { lastCustardProfitSrc = 'percent'; runAnaTopUpMath(); });
        document.getElementById('rsTopUpAnaCupProfit')?.addEventListener('input', () => { lastCupProfitSrc = 'amount'; runAnaTopUpMath(); });
        document.getElementById('rsTopUpAnaCupProfitPct')?.addEventListener('input', () => { lastCupProfitSrc = 'percent'; runAnaTopUpMath(); });

        runAnaTopUpMath();

    } else {
        if (anaContainer) anaContainer.style.display = 'none';
        if (defContainer) defContainer.style.display = 'flex';
        
        const bLabel = p.bulkUnit || 'Carton';
        const rLabel = (p.unit && p.unit !== 'per piece') ? p.unit.replace(/^per\s+/i, '') : 'piece';
        
        document.getElementById('rsTopUpDefBulkLabel').textContent = bLabel;
        document.getElementById('rsTopUpDefBulkLabel2').textContent = bLabel;
        document.getElementById('rsTopUpDefBulkLabel3').textContent = bLabel;
        document.getElementById('rsTopUpDefRetailUnitLabel').textContent = rLabel + 's';
        document.getElementById('rsTopUpDefRetailUnitLabel2').textContent = rLabel;
        document.getElementById('rsTopUpDefRetailUnitLabel3').textContent = rLabel;

        _setVal('rsTopUpDefQuantity', '');
        _setVal('rsTopUpDefTotalCost', '');
        _setVal('rsTopUpDefPieces', p.pieces || 1);
        _setVal('rsTopUpDefProfit', p.profit || 0);
        _setVal('rsTopUpDefProfitPercent', '');

        let lastDefProfitSrc = 'amount';

        function runDefTopUpMath() {
            const oldTotalQty = parseFloat(p.boughtQuantity) || 0;
            const oldTotalCost = parseFloat(p.purchaseCost) || 0;
            
            const newQty = parseInt(document.getElementById('rsTopUpDefQuantity')?.value) || 0;
            const newCost = parseFloat(document.getElementById('rsTopUpDefTotalCost')?.value) || 0;
            
            const totalQty = oldTotalQty + newQty;
            const totalCost = oldTotalCost + newCost;
            
            let avgBulkCost = 0;
            if (totalQty > 0) avgBulkCost = totalCost / totalQty;
            
            const elAvgVal = document.getElementById('rsTopUpDefAvgBulkCostVal');
            if (elAvgVal) elAvgVal.textContent = '₦' + avgBulkCost.toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:2});
            
            const pieces = parseInt(document.getElementById('rsTopUpDefPieces')?.value) || 1;
            const avgRetailCost = avgBulkCost / pieces;
            
            const elRetVal = document.getElementById('rsTopUpDefRetailCostVal');
            if (elRetVal) elRetVal.textContent = '₦' + avgRetailCost.toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:2});
            
            const profInp = document.getElementById('rsTopUpDefProfit');
            const pctInp = document.getElementById('rsTopUpDefProfitPercent');
            const priceInp = document.getElementById('rsTopUpDefPrice');
            
            if (lastDefProfitSrc === 'amount') {
                const amt = parseFloat(profInp.value) || 0;
                if (pctInp && avgRetailCost > 0) pctInp.value = ((amt / avgRetailCost) * 100).toFixed(0);
                if (priceInp) priceInp.value = (avgRetailCost + amt).toFixed(0);
            } else {
                const pct = parseFloat(pctInp.value) || 0;
                const amt = avgRetailCost * (pct / 100);
                if (profInp) profInp.value = amt.toFixed(0);
                if (priceInp) priceInp.value = (avgRetailCost + amt).toFixed(0);
            }
        }

        ['rsTopUpDefQuantity', 'rsTopUpDefTotalCost', 'rsTopUpDefPieces'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', runDefTopUpMath);
        });

        document.getElementById('rsTopUpDefProfit')?.addEventListener('input', () => { lastDefProfitSrc = 'amount'; runDefTopUpMath(); });
        document.getElementById('rsTopUpDefProfitPercent')?.addEventListener('input', () => { lastDefProfitSrc = 'percent'; runDefTopUpMath(); });

        runDefTopUpMath();
    }
}


/* pdSaveTopUp logic */
function _rsSaveTopUp() {
    let products = JSON.parse(localStorage.getItem('nd_products_data') || '[]');
    const p = window._rsCurrentProduct;
    if (!p) return;
    const index = p.id ? products.findIndex(item => item.id === p.id) : products.findIndex(item => item.name === p.name && item.dateAdded === p.dateAdded);
    if (index === -1) { alert('Product reference not found!'); return; }

    const stockStatus = document.getElementById('rsTopUpStockStatus')?.value || 'none';
    products[index].isNewStock = (stockStatus === 'new');
    products[index].isOldStock = (stockStatus === 'old');

    if (p.isSpecial || p.packTypes) {
        // --- ANALYTICAL TOP UP ---
        const sizeVal = document.getElementById('rsTopUpAnaSizeSelect')?.value || 'bag';
        const qty = parseFloat(document.getElementById('rsTopUpAnaQuantity')?.value) || 0;
        const costInput = parseFloat(document.getElementById('rsTopUpAnaTotalCost')?.value) || 0;

        const cpb = parseInt(document.getElementById('rsTopUpAnaCustardsPerBag')?.value) || 1;
        const cpc = parseInt(document.getElementById('rsTopUpAnaCupsPerCustard')?.value) || 1;

        if (qty <= 0) {
            const qtyEl = document.getElementById('rsTopUpAnaQuantity');
            if (qtyEl) { qtyEl.style.borderColor = '#ef4444'; setTimeout(() => qtyEl.style.borderColor = '', 1500); }
            return;
        }

        // Add to total
        let fractionalBagsAdded = 0;
        if (sizeVal === 'bag') fractionalBagsAdded = qty;
        else if (sizeVal === 'custard') fractionalBagsAdded = qty / cpb;
        else if (sizeVal === 'cup') fractionalBagsAdded = qty / (cpb * cpc);

        products[index].boughtQuantity = (parseFloat(products[index].boughtQuantity) || 0) + fractionalBagsAdded;
        products[index].purchaseCost = (parseFloat(products[index].purchaseCost) || 0) + costInput;

        // Update structure & tiers
        products[index].structure = { custardsPerBag: cpb, cupsPerCustard: cpc };

        const newAvgBagCost = products[index].purchaseCost / products[index].boughtQuantity;
        const newCustCost = newAvgBagCost / cpb;
        const newCupCost = newAvgBagCost / (cpb * cpc);

        products[index].packTypes = products[index].packTypes || {};
        
        products[index].packTypes.bag = products[index].packTypes.bag || {};
        products[index].packTypes.bag.profit = parseFloat(document.getElementById('rsTopUpAnaBagProfit')?.value) || 0;
        products[index].packTypes.bag.price = parseFloat(document.getElementById('rsTopUpAnaBagPrice')?.value) || (newAvgBagCost + products[index].packTypes.bag.profit);

        products[index].packTypes.custard = products[index].packTypes.custard || {};
        products[index].packTypes.custard.profit = parseFloat(document.getElementById('rsTopUpAnaCustardProfit')?.value) || 0;
        products[index].packTypes.custard.price = parseFloat(document.getElementById('rsTopUpAnaCustardPrice')?.value) || (newCustCost + products[index].packTypes.custard.profit);

        products[index].packTypes.cup = products[index].packTypes.cup || {};
        products[index].packTypes.cup.profit = parseFloat(document.getElementById('rsTopUpAnaCupProfit')?.value) || 0;
        products[index].packTypes.cup.price = parseFloat(document.getElementById('rsTopUpAnaCupPrice')?.value) || (newCupCost + products[index].packTypes.cup.profit);

    } else {
        // --- DEFAULT TOP UP ---
        const newQty = parseInt(document.getElementById('rsTopUpDefQuantity')?.value) || 0;
        const newCost = parseFloat(document.getElementById('rsTopUpDefTotalCost')?.value) || 0;
        const pieces = parseInt(document.getElementById('rsTopUpDefPieces')?.value) || 1;
        const profit = parseFloat(document.getElementById('rsTopUpDefProfit')?.value) || 0;
        const price = parseFloat(document.getElementById('rsTopUpDefPrice')?.value) || 0;

        if (newQty <= 0) {
            const qtyEl = document.getElementById('rsTopUpDefQuantity');
            if (qtyEl) { qtyEl.style.borderColor = '#ef4444'; setTimeout(() => qtyEl.style.borderColor = '', 1500); }
            return;
        }

        products[index].boughtQuantity = (parseInt(products[index].boughtQuantity) || 0) + newQty;
        products[index].purchaseCost = (parseFloat(products[index].purchaseCost) || 0) + newCost;
        products[index].pieces = pieces;
        products[index].profit = profit;
        products[index].price = price;
        
        const avgBulkCost = products[index].purchaseCost / products[index].boughtQuantity;
        products[index].cost = avgBulkCost / pieces;
    }

    products[index].isOutOfStock = false;

    localStorage.setItem('nd_products_data', JSON.stringify(products));
    if (typeof window.reloadAdminProducts === 'function') window.reloadAdminProducts();
    if (typeof window.renderProductsGlobal === 'function') window.renderProductsGlobal();
    if (typeof window.renderRestockListGlobal === 'function') window.renderRestockListGlobal();

    _rsShowSuccess('Stock & Pricing Updated', 'New stock merged and average costs updated.');
}

window._initRsCustomForm = function() {
    const costInput = document.getElementById('rsCustomProductPurchaseCost');
    const qtyInput = document.getElementById('rsCustomProductQuantity');
    const totalCostVal = document.getElementById('rsCustomProductTotalCostVal');
    const piecesInput = document.getElementById('rsCustomProductPieces');
    const submitBtn = document.getElementById('rsCustomProductSubmitBtn');
    const nameInput = document.getElementById('rsCustomProductName');
    
    const priceInput = document.getElementById('rsCustomProductPrice');

    function updateCustomTotalCostUI() {
        if (!costInput || !totalCostVal) return;
        const pCost = parseFloat(costInput.value) || 0;
        const qty = parseInt(qtyInput ? qtyInput.value : 1) || 1;
        const total = pCost * qty;
        totalCostVal.textContent = '₦' + total.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2});
    }

    function onCustomCostInput() {
        updateCustomTotalCostUI();
    }

    if (costInput) costInput.addEventListener('input', onCustomCostInput);
    if (qtyInput) qtyInput.addEventListener('input', onCustomCostInput);
    
    // Bulk Dropdown Logic
    const bulkWrapper = document.getElementById('rsCustomBulkDropdownWrapper');
    const bulkTrigger = document.getElementById('rsCustomBulkDropdownTrigger');
    const bulkMenu = document.getElementById('rsCustomBulkDropdownMenu');
    const bulkHidden = document.getElementById('rsCustomBulkUnitSelect');
    const customBulkRow = document.getElementById('rsCustomFormBulkRow');
    const customBulkInput = document.getElementById('rsCustomFormBulkInput');
    const customBulkConfirmBtn = document.getElementById('rsCustomFormBulkConfirmBtn');

    if (bulkTrigger && bulkMenu && bulkWrapper) {
        bulkTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            bulkWrapper.classList.toggle('open');
            if (customBulkRow) customBulkRow.style.display = 'none';
        });

        document.addEventListener('click', (e) => {
            if (bulkWrapper.classList.contains('open') && !bulkWrapper.contains(e.target)) {
                bulkWrapper.classList.remove('open');
            }
        });

        bulkMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            const opt = e.target.closest('.custom-dropdown-option');
            if (!opt) return;

            const val = opt.getAttribute('data-value');

            if (val === '__custom_bulk__') {
                if (customBulkRow) customBulkRow.style.display = 'block';
                return;
            }

            bulkMenu.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            bulkTrigger.querySelector('.trigger-text').textContent = val;
            if (bulkHidden) {
                bulkHidden.value = val;
                updateCustomUILabel();
            }
            bulkWrapper.classList.remove('open');
            if (customBulkRow) customBulkRow.style.display = 'none';
        });

        if (customBulkConfirmBtn && customBulkInput) {
            customBulkConfirmBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                let customVal = customBulkInput.value.trim();
                if (customVal) {
                    customVal = customVal.charAt(0).toUpperCase() + customVal.slice(1);
                } else {
                    customBulkInput.style.borderColor = '#ff4d4d';
                    setTimeout(() => customBulkInput.style.borderColor = '', 1500);
                    return;
                }

                const newOpt = document.createElement('div');
                newOpt.className = 'custom-dropdown-option custom-added-unit active';
                newOpt.setAttribute('data-value', customVal);

                const textSpan = document.createElement('span');
                textSpan.textContent = customVal;
                newOpt.appendChild(textSpan);

                const createBtn = bulkMenu.querySelector('.custom-unit-create-option');
                bulkMenu.insertBefore(newOpt, createBtn);

                bulkMenu.querySelectorAll('.custom-dropdown-option').forEach(o => {
                    if (o !== newOpt) o.classList.remove('active');
                });
                
                bulkTrigger.querySelector('.trigger-text').textContent = customVal;
                if (bulkHidden) {
                    bulkHidden.value = customVal;
                    updateCustomUILabel();
                }

                customBulkInput.value = '';
                customBulkRow.style.display = 'none';
                bulkWrapper.classList.remove('open');
            });
        }
    }

    // Unit Dropdown Logic
    const unitWrapper = document.getElementById('rsCustomUnitDropdownWrapper');
    const unitTrigger = document.getElementById('rsCustomUnitDropdownTrigger');
    const unitMenu = document.getElementById('rsCustomUnitDropdownMenu');
    const unitHidden = document.getElementById('rsCustomNewProductUnit');
    const customUnitRow = document.getElementById('rsCustomFormUnitRow');
    const customUnitInput = document.getElementById('rsCustomFormUnitInput');
    const customUnitConfirmBtn = document.getElementById('rsCustomFormUnitConfirmBtn');

    if (unitTrigger && unitMenu && unitWrapper) {
        unitTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            unitWrapper.classList.toggle('open');
            if (customUnitRow) customUnitRow.style.display = 'none';
        });

        document.addEventListener('click', (e) => {
            if (unitWrapper.classList.contains('open') && !unitWrapper.contains(e.target)) {
                unitWrapper.classList.remove('open');
            }
        });

        unitMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            const opt = e.target.closest('.custom-dropdown-option');
            if (!opt) return;

            const val = opt.getAttribute('data-value');

            if (val === '__custom__') {
                if (customUnitRow) customUnitRow.style.display = 'block';
                return;
            }

            unitMenu.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            unitTrigger.querySelector('.trigger-text').textContent = val;
            if (unitHidden) {
                unitHidden.value = val;
                updateCustomUILabel();
            }
            unitWrapper.classList.remove('open');
            if (customUnitRow) customUnitRow.style.display = 'none';
        });

        if (customUnitConfirmBtn && customUnitInput) {
            customUnitConfirmBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                let customVal = customUnitInput.value.trim();
                if (!customVal) {
                    customUnitInput.style.borderColor = '#ff4d4d';
                    setTimeout(() => customUnitInput.style.borderColor = '', 1500);
                    return;
                }
                if (!customVal.toLowerCase().startsWith('per ')) customVal = 'per ' + customVal;

                const newOpt = document.createElement('div');
                newOpt.className = 'custom-dropdown-option custom-added-unit active';
                newOpt.setAttribute('data-value', customVal);
                newOpt.textContent = customVal;

                const createBtn = unitMenu.querySelector('.custom-unit-create-option');
                unitMenu.insertBefore(newOpt, createBtn);

                unitMenu.querySelectorAll('.custom-dropdown-option').forEach(o => {
                    if (o !== newOpt) o.classList.remove('active');
                });

                unitTrigger.querySelector('.trigger-text').textContent = customVal;
                if (unitHidden) {
                    unitHidden.value = customVal;
                    updateCustomUILabel();
                }

                customUnitInput.value = '';
                customUnitRow.style.display = 'none';
                unitWrapper.classList.remove('open');
            });
        }
    }

    function updateCustomUILabel() {
        const bulkSel = document.getElementById('rsCustomBulkUnitSelect');
        const bulkVal = bulkSel ? bulkSel.value : 'Carton';
        
        const retailSel = document.getElementById('rsCustomNewProductUnit');
        let retailVal = retailSel ? retailSel.value : 'piece';
        retailVal = retailVal.replace(/^per\s+/i, '');
        if(!retailVal) retailVal = 'piece';

        document.querySelectorAll('.lbl-rs-custom-bulk').forEach(el => el.textContent = bulkVal);
        document.querySelectorAll('.lbl-rs-custom-retail').forEach(el => el.textContent = retailVal);
    }
    
    updateCustomUILabel();

    // Submit Custom Product
    if (submitBtn) {
        submitBtn.addEventListener('click', () => {
            const name = nameInput ? nameInput.value.trim() : '';
            const purchaseCostVal = costInput ? (parseFloat(costInput.value) || 0) : 0;
            const quantity = qtyInput ? (parseInt(qtyInput.value) || 1) : 1;
            const pieces = piecesInput ? (parseInt(piecesInput.value) || 1) : 1;
            
            const purchaseCost = purchaseCostVal * quantity;
            const unit = unitHidden ? unitHidden.value : 'per piece';
            const bulkUnit = bulkHidden ? bulkHidden.value : 'Carton';

            if (!name) {
                if (nameInput) { nameInput.style.borderColor = '#ff4d4d'; setTimeout(() => nameInput.style.borderColor = '', 1500); }
                return;
            }

            const isNewStock = document.getElementById('rsCustomNewStockSwitch') ? document.getElementById('rsCustomNewStockSwitch').checked : false;
            let products = JSON.parse(localStorage.getItem('nd_products_data') || '[]');
            
            const customPriceInput = document.getElementById('rsCustomProductPrice');
            const finalPrice = customPriceInput && customPriceInput.value ? parseFloat(customPriceInput.value) : "Open";

            const rsImgDataHidden = document.getElementById('rsNewImageData');
            const imageData = rsImgDataHidden ? rsImgDataHidden.value : '';

            const customNewProductId = 'ndp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
            const productData = {
                id: customNewProductId,
                name,
                unit,
                cost: purchaseCostVal,
                purchaseCost: purchaseCost,
                pieces,
                boughtQuantity: quantity,
                bulkUnit,
                dateAdded: new Date().toISOString(),
                isSpecial: false,
                isCustom: true,
                isNewStock,
                profit: 0,
                profitPercent: 0,
                price: finalPrice,
                imageData: imageData,
                topUpHistory: [{ cost: purchaseCost, qty: quantity, date: new Date().toISOString(), isNewStock: isNewStock }]
            };
            
            products.unshift(productData);
            localStorage.setItem('nd_products_data', JSON.stringify(products));
            
            if (typeof adminProducts !== 'undefined') {
                adminProducts.unshift(productData);
            }

            if (typeof window.closeAddRestockModal === 'function') window.closeAddRestockModal();
            if (typeof window.renderRestockList === 'function') window.renderRestockList();
            if (typeof window.renderProductsGlobal === 'function') window.renderProductsGlobal();
        });
    }
    

};

window._initRsFlexForm = function() {
    const fC1TitleInp = document.getElementById('rsFlexC1Title');
    const fC2TitleInp = document.getElementById('rsFlexC2Title');
    const fC3TitleInp = document.getElementById('rsFlexC3Title');

    function updateFlexTitles() {
        const t1 = fC1TitleInp && fC1TitleInp.value.trim() ? fC1TitleInp.value.trim() : 'Container 1';
        const t2 = fC2TitleInp && fC2TitleInp.value.trim() ? fC2TitleInp.value.trim() : 'Container 2';
        const t3 = fC3TitleInp && fC3TitleInp.value.trim() ? fC3TitleInp.value.trim() : 'Container 3';

        const lblC1C = document.getElementById('lblRsFlexC1Cost');
        const lblC1P = document.getElementById('lblRsFlexC1Profit');
        const lblC1Pr = document.getElementById('lblRsFlexC1Price');
        if(lblC1C) lblC1C.textContent = t1;
        if(lblC1P) lblC1P.textContent = t1;
        if(lblC1Pr) lblC1Pr.textContent = t1;

        const lblC2P = document.getElementById('lblRsFlexC2Profit');
        const lblC2Pr = document.getElementById('lblRsFlexC2Price');
        if(lblC2P) lblC2P.textContent = t2;
        if(lblC2Pr) lblC2Pr.textContent = t2;
    }

    if(fC1TitleInp) fC1TitleInp.addEventListener('input', updateFlexTitles);
    if(fC2TitleInp) fC2TitleInp.addEventListener('input', updateFlexTitles);
    if(fC3TitleInp) fC3TitleInp.addEventListener('input', updateFlexTitles);

    const fC1CostInp = document.getElementById('rsFlexC1Cost');
    const fC1QtyInp = document.getElementById('rsFlexC1Quantity');
    const fC1TotalVal = document.getElementById('rsFlexC1TotalCostVal');
    const fC1ProfitInp = document.getElementById('rsFlexC1Profit');
    const fC1ProfitPctInp = document.getElementById('rsFlexC1ProfitPercent');
    const fC1PriceInp = document.getElementById('rsFlexC1Price');

    const fC2QtyInp = document.getElementById('rsFlexC2Qty');
    const fC2CostVal = document.getElementById('rsFlexC2CostVal');
    const fC2ProfitInp = document.getElementById('rsFlexC2Profit');
    const fC2ProfitPctInp = document.getElementById('rsFlexC2ProfitPercent');
    const fC2PriceInp = document.getElementById('rsFlexC2Price');

    const fC3QtyInp = document.getElementById('rsFlexC3Qty');

    function calcFlex() {
        const c1Cost = parseFloat(fC1CostInp ? fC1CostInp.value : 0) || 0;
        const c1Qty = parseInt(fC1QtyInp ? fC1QtyInp.value : 1) || 1;
        if(fC1TotalVal) fC1TotalVal.textContent = '₦' + (c1Cost * c1Qty).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2});

        let c1Prof = parseFloat(fC1ProfitInp ? fC1ProfitInp.value : 0) || 0;
        let c1Pct = parseFloat(fC1ProfitPctInp ? fC1ProfitPctInp.value : 0) || 0;
        
        if (this === fC1ProfitInp && c1Cost > 0) {
            c1Pct = (c1Prof / c1Cost) * 100;
            if(fC1ProfitPctInp) fC1ProfitPctInp.value = c1Pct.toFixed(2).replace(/\.?0+$/, '');
        } else if (this === fC1ProfitPctInp && c1Cost > 0) {
            c1Prof = c1Cost * (c1Pct / 100);
            if(fC1ProfitInp) fC1ProfitInp.value = c1Prof.toFixed(2).replace(/\.?0+$/, '');
        } else if (this === fC1CostInp && c1Cost > 0) {
            c1Pct = (c1Prof / c1Cost) * 100;
            if(fC1ProfitPctInp) fC1ProfitPctInp.value = c1Pct.toFixed(2).replace(/\.?0+$/, '');
        }
        if(fC1PriceInp) fC1PriceInp.value = Math.round(c1Cost + c1Prof);

        const c2sPerC1 = parseInt(fC2QtyInp ? fC2QtyInp.value : 1) || 1;
        const c2Cost = c2sPerC1 > 0 ? c1Cost / c2sPerC1 : 0;
        if(fC2CostVal) fC2CostVal.textContent = '₦' + Math.round(c2Cost).toLocaleString();

        let c2Prof = parseFloat(fC2ProfitInp ? fC2ProfitInp.value : 0) || 0;
        let c2Pct = parseFloat(fC2ProfitPctInp ? fC2ProfitPctInp.value : 0) || 0;
        
        if (this === fC2ProfitInp && c2Cost > 0) {
            c2Pct = (c2Prof / c2Cost) * 100;
            if(fC2ProfitPctInp) fC2ProfitPctInp.value = c2Pct.toFixed(2).replace(/\.?0+$/, '');
        } else if (this === fC2ProfitPctInp && c2Cost > 0) {
            c2Prof = c2Cost * (c2Pct / 100);
            if(fC2ProfitInp) fC2ProfitInp.value = c2Prof.toFixed(2).replace(/\.?0+$/, '');
        } else if ((this === fC2QtyInp || this === fC1CostInp) && c2Cost > 0) {
            c2Pct = (c2Prof / c2Cost) * 100;
            if(fC2ProfitPctInp) fC2ProfitPctInp.value = c2Pct.toFixed(2).replace(/\.?0+$/, '');
        }
        if(fC2PriceInp) fC2PriceInp.value = Math.round(c2Cost + c2Prof);
    }

    [fC1CostInp, fC1QtyInp, fC1ProfitInp, fC1ProfitPctInp, fC2QtyInp, fC2ProfitInp, fC2ProfitPctInp, fC3QtyInp].forEach(el => {
        if(el) el.addEventListener('input', calcFlex);
    });

    const submitBtn = document.getElementById('rsFlexProductSubmitBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', () => {
            const nameInput = document.getElementById('rsFlexProductName');
            const name = nameInput ? nameInput.value.trim() : '';

            if (!name) {
                if (nameInput) { nameInput.style.borderColor = '#ff4d4d'; setTimeout(() => nameInput.style.borderColor = '', 1500); }
                return;
            }

            const c1Cost = parseFloat(fC1CostInp ? fC1CostInp.value : 0) || 0;
            if (c1Cost <= 0) {
                if (fC1CostInp) { fC1CostInp.style.borderColor = '#ff4d4d'; setTimeout(() => fC1CostInp.style.borderColor = '', 1500); }
                return;
            }

            const c1Title = fC1TitleInp && fC1TitleInp.value.trim() ? fC1TitleInp.value.trim() : 'Container 1';
            const c2Title = fC2TitleInp && fC2TitleInp.value.trim() ? fC2TitleInp.value.trim() : 'Container 2';
            const c3Title = fC3TitleInp && fC3TitleInp.value.trim() ? fC3TitleInp.value.trim() : 'Container 3';

            const boughtQuantity = parseInt(fC1QtyInp ? fC1QtyInp.value : 1) || 1;
            const c1Price = parseFloat(fC1PriceInp ? fC1PriceInp.value : 0) || c1Cost;
            
            const c2sPerC1 = parseInt(fC2QtyInp ? fC2QtyInp.value : 1) || 1;
            const c3sPerC2 = parseInt(fC3QtyInp ? fC3QtyInp.value : 1) || 1;

            const c2Cost = c2sPerC1 > 0 ? c1Cost / c2sPerC1 : 0;
            const c2Price = parseFloat(fC2PriceInp ? fC2PriceInp.value : 0) || c2Cost;
            
            const isNewStock = document.getElementById('rsFlexNewStockSwitch') ? document.getElementById('rsFlexNewStockSwitch').checked : false;
            let products = JSON.parse(localStorage.getItem('nd_products_data') || '[]');
            
            const rsImgDataHidden = document.getElementById('rsNewImageData');
            const imageData = rsImgDataHidden ? rsImgDataHidden.value : '';

            const flexNewProductId = 'ndp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
            const productData = {
                id: flexNewProductId,
                name,
                unit: 'per ' + c1Title.toLowerCase(),
                cost: c1Cost,
                purchaseCost: c1Cost * boughtQuantity,
                boughtQuantity: boughtQuantity,
                bulkUnit: c1Title,
                dateAdded: new Date().toISOString(),
                isSpecial: false,
                isCustom: false,
                isFlexible: true,
                isNewStock,
                profit: parseFloat(fC1ProfitInp ? fC1ProfitInp.value : 0) || 0,
                profitPercent: parseFloat(fC1ProfitPctInp ? fC1ProfitPctInp.value : 0) || 0,
                price: c1Price,
                imageData: imageData,
                topUpHistory: [{ cost: c1Cost * boughtQuantity, qty: boughtQuantity, date: new Date().toISOString(), isNewStock: isNewStock }],
                structure: {
                    c2sPerC1: c2sPerC1,
                    c3sPerC2: c3sPerC2,
                    c1Profit: parseFloat(fC1ProfitInp ? fC1ProfitInp.value : 0) || 0,
                    c1ProfitPercent: parseFloat(fC1ProfitPctInp ? fC1ProfitPctInp.value : 0) || 0,
                    c2Profit: parseFloat(fC2ProfitInp ? fC2ProfitInp.value : 0) || 0,
                    c2ProfitPercent: parseFloat(fC2ProfitPctInp ? fC2ProfitPctInp.value : 0) || 0
                },
                packTypes: {
                    c1: { price: c1Price, title: c1Title },
                    c2: { price: c2Price, title: c2Title },
                    c3: { price: "Flexible", title: c3Title }
                }
            };
            
            products.unshift(productData);
            localStorage.setItem('nd_products_data', JSON.stringify(products));
            
            if (typeof adminProducts !== 'undefined') {
                adminProducts.unshift(productData);
            }

            if (typeof window.closeAddRestockModal === 'function') window.closeAddRestockModal();
            if (typeof window.renderRestockList === 'function') window.renderRestockList();
            if (typeof window.renderProductsGlobal === 'function') window.renderProductsGlobal();
        });
    }
    

};

// Added dropdown logic
function _initRestockImportDropdown() {
        const wrapper = document.getElementById('rsImportDropdownWrapper');
        const trigger = document.getElementById('rsImportDropdownTrigger');
        const menu = document.getElementById('rsImportDropdownMenu');

        if (!wrapper || !trigger || !menu) return;

        let searchContainer = menu.querySelector('.dropdown-search-container');
        let optionsContainer = menu.querySelector('.dropdown-options-list');

        if (!searchContainer) {
            menu.innerHTML = '';
            searchContainer = document.createElement('div');
            searchContainer.className = 'dropdown-search-container';
            searchContainer.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m21 21-4.34-4.34"></path>
                    <circle cx="11" cy="11" r="8"></circle>
                </svg>
                <input type="text" class="dropdown-search-input" placeholder="Search to copy..." autocomplete="off" readonly onfocus="this.removeAttribute('readonly');">
            `;
            menu.appendChild(searchContainer);

            const searchInput = searchContainer.querySelector('.dropdown-search-input');
            searchInput.addEventListener('input', (e) => {
                e.stopPropagation();
                _populateAdminImportOptions(e.target.value);
            });
            searchInput.addEventListener('click', e => e.stopPropagation());

            // Toggle dropdown
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                wrapper.classList.toggle('open');
                if (wrapper.classList.contains('open')) {
                    _populateAdminImportOptions('');
                }
            });

            // Close on outside click
            document.addEventListener('click', (e) => {
                if (wrapper.classList.contains('open') && !wrapper.contains(e.target)) {
                    wrapper.classList.remove('open');
                }
            });
        }

        if (!optionsContainer) {
            optionsContainer = document.createElement('div');
            optionsContainer.className = 'dropdown-options-list';
            menu.appendChild(optionsContainer);
        }

        function _populateAdminImportOptions(filter) {
            optionsContainer.innerHTML = '';
            const searchInput = searchContainer.querySelector('.dropdown-search-input');
            if (filter === '' && searchInput) searchInput.value = '';

            const term = filter.toLowerCase();
            const filtered = JSON.parse(localStorage.getItem('nd_products_data') || '[]').filter(p => !p.isSpecial && !p.isCustom && !p.isDeleted && !p.isHidden && !p.cleared && (p.name || '').toLowerCase().includes(term));

            if (filtered.length === 0) {
                optionsContainer.innerHTML = '<div class="dropdown-no-result">No products found</div>';
                return;
            }

            filtered.forEach(p => {
                const opt = document.createElement('div');
                opt.className = 'custom-dropdown-option';
                opt.textContent = p.name;
                opt.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // Import values into the form fields (name intentionally skipped — prevents duplicate products)
                    if(document.getElementById('rsNewProductPurchaseCost')) {
                        const bulkCost = (typeof p.cost === 'number') ? p.cost * (p.pieces || 1) : '';
                        document.getElementById('rsNewProductPurchaseCost').value = bulkCost;
                    }
                    if(document.getElementById('rsNewProductPieces')) document.getElementById('rsNewProductPieces').value = p.pieces || 1;

                    if(document.getElementById('rsBulkUnitSelect') && p.bulkUnit) {
                        document.getElementById('rsBulkUnitSelect').value = p.bulkUnit;
                        const bulkTrigText = document.querySelector('#rsBulkDropdownTrigger .trigger-text');
                        if(bulkTrigText) bulkTrigText.textContent = p.bulkUnit;
                        const bulkMenuUi = document.getElementById('rsBulkDropdownMenu');
                        if(bulkMenuUi) {
                            bulkMenuUi.querySelectorAll('.custom-dropdown-option').forEach(o => {
                                if(o.getAttribute('data-value') === p.bulkUnit) o.classList.add('active');
                                else o.classList.remove('active');
                            });
                        }
                    }
                    
                    if(document.getElementById('rsNewProductProfit')) document.getElementById('rsNewProductProfit').value = p.profit || '';
                    if(document.getElementById('rsNewProductProfitPercent')) document.getElementById('rsNewProductProfitPercent').value = p.profitPercent || '';
                    if(document.getElementById('rsNewProductPrice')) document.getElementById('rsNewProductPrice').value = p.price || '';
                    
                    // Trigger input event to update badges/calc
                    if(document.getElementById('rsNewProductPurchaseCost')) {
                        document.getElementById('rsNewProductPurchaseCost').dispatchEvent(new Event('input'));
                    }
                    if(document.getElementById('rsNewProductProfit')) {
                        document.getElementById('rsNewProductProfit').dispatchEvent(new Event('input'));
                    }

                    // Set Unit
                    if(p.unit) {
                        const hiddenU = document.getElementById('rsNewProductUnit');
                        const triggerTextU = document.querySelector('#rsUnitDropdownTrigger .trigger-text');
                        if (hiddenU) hiddenU.value = p.unit;
                        if (triggerTextU) triggerTextU.textContent = p.unit;
                        
                        const unitDropdown = document.getElementById('rsUnitDropdownMenu');
                        if(unitDropdown) {
                            unitDropdown.querySelectorAll('.custom-dropdown-option').forEach(o => {
                                if(o.getAttribute('data-value') === p.unit) o.classList.add('active');
                                else o.classList.remove('active');
                            });
                        }
                        if (typeof updateRsProductUILabel === 'function') updateRsProductUILabel();
                    }

                    // Pre-fill dropdown text
                    trigger.querySelector('.trigger-text').textContent = 'Copied: ' + p.name;
                    wrapper.classList.remove('open');
                    if(document.getElementById('rsProductSubmitBtn')) document.getElementById('rsProductSubmitBtn').style.display = 'flex';
                });
                optionsContainer.appendChild(opt);
            });
        }
    }
    _initRestockImportDropdown();

    // ========================================
    // Import from Existing Special Product Dropdown
    // ========================================
    function _initRestockSpecImportDropdown() {
        const wrapper = document.getElementById('rsSpecImportDropdownWrapper');
        const trigger = document.getElementById('rsSpecImportDropdownTrigger');
        const menu = document.getElementById('rsSpecImportDropdownMenu');

        if (!wrapper || !trigger || !menu) return;

        let searchContainer = menu.querySelector('.dropdown-search-container');
        let optionsContainer = menu.querySelector('.dropdown-options-list');

        if (!searchContainer) {
            menu.innerHTML = '';
            searchContainer = document.createElement('div');
            searchContainer.className = 'dropdown-search-container';
            searchContainer.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m21 21-4.34-4.34"></path>
                    <circle cx="11" cy="11" r="8"></circle>
                </svg>
                <input type="text" class="dropdown-search-input" placeholder="Search analytical to copy..." autocomplete="off" readonly onfocus="this.removeAttribute('readonly');">
            `;
            menu.appendChild(searchContainer);

            const searchInput = searchContainer.querySelector('.dropdown-search-input');
            searchInput.addEventListener('input', (e) => {
                e.stopPropagation();
                _populateAdminSpecImportOptions(e.target.value);
            });
            searchInput.addEventListener('click', e => e.stopPropagation());

            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                wrapper.classList.toggle('open');
                if (wrapper.classList.contains('open')) {
                    _populateAdminSpecImportOptions('');
                }
            });

            document.addEventListener('click', (e) => {
                if (wrapper.classList.contains('open') && !wrapper.contains(e.target)) {
                    wrapper.classList.remove('open');
                }
            });
        }

        if (!optionsContainer) {
            optionsContainer = document.createElement('div');
            optionsContainer.className = 'dropdown-options-list';
            menu.appendChild(optionsContainer);
        }

        function _populateAdminSpecImportOptions(filter) {
            optionsContainer.innerHTML = '';
            const searchInput = searchContainer.querySelector('.dropdown-search-input');
            if (filter === '' && searchInput) searchInput.value = '';

            const term = filter.toLowerCase();
            const filtered = JSON.parse(localStorage.getItem('nd_products_data') || '[]').filter(p => p.isSpecial && !p.isDeleted && !p.isHidden && !p.cleared && (p.name || '').toLowerCase().includes(term));

            if (filtered.length === 0) {
                optionsContainer.innerHTML = '<div class="dropdown-no-result">No products found</div>';
                return;
            }

            filtered.forEach(p => {
                const opt = document.createElement('div');
                opt.className = 'custom-dropdown-option';
                opt.textContent = p.name;
                opt.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // name intentionally skipped — prevents duplicate products
                    if(document.getElementById('rsSpecBagCost')) document.getElementById('rsSpecBagCost').value = (typeof p.cost === 'number') ? p.cost : '';

                    if(p.packTypes) {
                        if(p.packTypes.bag && document.getElementById('rsSpecBagTitle')) document.getElementById('rsSpecBagTitle').value = p.packTypes.bag.title || 'Container 1';
                        if(p.packTypes.custard && document.getElementById('rsSpecCustardTitle')) document.getElementById('rsSpecCustardTitle').value = p.packTypes.custard.title || 'Container 2';
                        if(p.packTypes.cup && document.getElementById('rsSpecCupTitle')) document.getElementById('rsSpecCupTitle').value = p.packTypes.cup.title || 'Container 3';
                    }
                    
                    if(p.structure) {
                        if(document.getElementById('rsSpecBagProfit')) document.getElementById('rsSpecBagProfit').value = p.structure.bagProfit || '';
                        if(document.getElementById('rsSpecBagProfitPercent')) document.getElementById('rsSpecBagProfitPercent').value = p.structure.bagProfitPercent || '';
                        
                        if(document.getElementById('rsSpecCustardsPerBag')) document.getElementById('rsSpecCustardsPerBag').value = p.structure.custardsPerBag || '';
                        if(document.getElementById('rsSpecCustardProfit')) document.getElementById('rsSpecCustardProfit').value = p.structure.custardProfit || '';
                        if(document.getElementById('rsSpecCustardProfitPercent')) document.getElementById('rsSpecCustardProfitPercent').value = p.structure.custardProfitPercent || '';

                        if(document.getElementById('rsSpecCupsPerCustard')) document.getElementById('rsSpecCupsPerCustard').value = p.structure.cupsPerCustard || '';
                        if(document.getElementById('rsSpecCupProfit')) document.getElementById('rsSpecCupProfit').value = p.structure.cupProfit || '';
                        if(document.getElementById('rsSpecCupProfitPercent')) document.getElementById('rsSpecCupProfitPercent').value = p.structure.cupProfitPercent || '';
                    }

                    // Dispatch inputs to trigger UI recalculations dynamically
                    const triggers = ['rsSpecBagCost', 'rsSpecBagProfit', 'rsSpecCustardsPerBag', 'rsSpecCustardProfit', 'rsSpecCupsPerCustard', 'rsSpecCupProfit', 'rsSpecBagTitle', 'rsSpecCustardTitle', 'rsSpecCupTitle'];
                    triggers.forEach(t => {
                        const el = document.getElementById(t);
                        if(el) el.dispatchEvent(new Event('input', { bubbles: true }));
                    });

                    trigger.querySelector('.trigger-text').textContent = 'Copied: ' + p.name;
                    wrapper.classList.remove('open');
                    
                    if(document.getElementById('rsSpecProductSubmitBtn')) document.getElementById('rsSpecProductSubmitBtn').style.display = 'flex';
                });
                optionsContainer.appendChild(opt);
            });
        }
    }
    _initRestockSpecImportDropdown();

    // ========================================
    // Import from Existing Custom Product Dropdown
    // ========================================
    function _initRestockCustomImportDropdown() {
        const wrapper = document.getElementById('rsCustomImportDropdownWrapper');
        const trigger = document.getElementById('rsCustomImportDropdownTrigger');
        const menu = document.getElementById('rsCustomImportDropdownMenu');

        if (!wrapper || !trigger || !menu) return;

        let searchContainer = menu.querySelector('.dropdown-search-container');
        let optionsContainer = menu.querySelector('.dropdown-options-list');

        if (!searchContainer) {
            menu.innerHTML = '';
            searchContainer = document.createElement('div');
            searchContainer.className = 'dropdown-search-container';
            searchContainer.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m21 21-4.34-4.34"></path>
                    <circle cx="11" cy="11" r="8"></circle>
                </svg>
                <input type="text" class="dropdown-search-input" placeholder="Search custom to copy..." autocomplete="off" readonly onfocus="this.removeAttribute('readonly');">
            `;
            menu.appendChild(searchContainer);

            const searchInput = searchContainer.querySelector('.dropdown-search-input');
            searchInput.addEventListener('input', (e) => {
                e.stopPropagation();
                _populateAdminCustomImportOptions(e.target.value);
            });
            searchInput.addEventListener('click', e => e.stopPropagation());

            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                wrapper.classList.toggle('open');
                if (wrapper.classList.contains('open')) {
                    _populateAdminCustomImportOptions('');
                }
            });

            document.addEventListener('click', (e) => {
                if (wrapper.classList.contains('open') && !wrapper.contains(e.target)) {
                    wrapper.classList.remove('open');
                }
            });
        }

        if (!optionsContainer) {
            optionsContainer = document.createElement('div');
            optionsContainer.className = 'dropdown-options-list';
            menu.appendChild(optionsContainer);
        }

        function _populateAdminCustomImportOptions(filter) {
            optionsContainer.innerHTML = '';
            const searchInput = searchContainer.querySelector('.dropdown-search-input');
            if (filter === '' && searchInput) searchInput.value = '';

            const term = filter.toLowerCase();
            const filtered = JSON.parse(localStorage.getItem('nd_products_data') || '[]').filter(p => !p.isSpecial && p.isCustom && !p.isDeleted && !p.isHidden && !p.cleared && (p.name || '').toLowerCase().includes(term));

            if (filtered.length === 0) {
                optionsContainer.innerHTML = '<div class="dropdown-no-result">No custom products found</div>';
                return;
            }

            filtered.forEach(p => {
                const opt = document.createElement('div');
                opt.className = 'custom-dropdown-option';
                opt.textContent = p.name;
                opt.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // name intentionally skipped — prevents duplicate products
                    if(document.getElementById('rsCustomProductPurchaseCost')) {
                        const bulkCost = (typeof p.bulkCost === 'number') ? p.bulkCost : ((typeof p.cost === 'number') ? p.cost : '');
                        document.getElementById('rsCustomProductPurchaseCost').value = bulkCost;
                    }
                    if(document.getElementById('rsCustomProductPieces')) document.getElementById('rsCustomProductPieces').value = p.pieces || 1;

                    if(document.getElementById('rsCustomBulkUnitSelect') && p.bulkUnit) {
                        document.getElementById('rsCustomBulkUnitSelect').value = p.bulkUnit;
                        const bulkTrigText = document.querySelector('#rsCustomBulkDropdownTrigger .trigger-text');
                        if(bulkTrigText) bulkTrigText.textContent = p.bulkUnit;
                        const bulkMenuUi = document.getElementById('rsCustomBulkDropdownMenu');
                        if(bulkMenuUi) {
                            bulkMenuUi.querySelectorAll('.custom-dropdown-option').forEach(o => {
                                if(o.getAttribute('data-value') === p.bulkUnit) o.classList.add('active');
                                else o.classList.remove('active');
                            });
                        }
                    }

                    if(p.unit) {
                        const hiddenU = document.getElementById('rsCustomNewProductUnit');
                        const triggerTextU = document.querySelector('#rsCustomUnitDropdownTrigger .trigger-text');
                        if (hiddenU) hiddenU.value = p.unit;
                        if (triggerTextU) triggerTextU.textContent = p.unit;
                        
                        const unitDropdown = document.getElementById('rsCustomUnitDropdownMenu');
                        if(unitDropdown) {
                            unitDropdown.querySelectorAll('.custom-dropdown-option').forEach(o => {
                                if(o.getAttribute('data-value') === p.unit) o.classList.add('active');
                                else o.classList.remove('active');
                            });
                        }
                        if (typeof updateRsProductUILabel === 'function') updateRsProductUILabel();
                    }

                    // Dispatch inputs to trigger UI recalculations dynamically
                    const triggers = ['rsCustomProductPurchaseCost', 'rsCustomProductPieces', 'rsCustomProductName'];
                    triggers.forEach(t => {
                        const el = document.getElementById(t);
                        if(el) el.dispatchEvent(new Event('input', { bubbles: true }));
                    });

                    trigger.querySelector('.trigger-text').textContent = 'Copied: ' + p.name;
                    wrapper.classList.remove('open');
                    
                    if(document.getElementById('rsCustomProductSubmitBtn')) document.getElementById('rsCustomProductSubmitBtn').style.display = 'flex';
                });
                optionsContainer.appendChild(opt);
            });
        }
    }
    _initRestockCustomImportDropdown();


    // ========================================
    // Dynamic Label Updater
    // ========================================
    



