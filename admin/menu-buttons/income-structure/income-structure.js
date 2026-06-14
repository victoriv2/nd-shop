// admin/menu-buttons/income-structure/income-structure.js
window.currentIsMonthIdx = new Date().getMonth();
window.currentIsYear = new Date().getFullYear();
window._isTitleTapCount = 0;
window._isTitleTapTimer = null;
window._isAllocationUnlocked = false;

function initIncomeStructure() {
    if (document.getElementById('incomeStructurePage')) {
        openIncomeStructurePage();
        return;
    }

    try {
        const html = `
        <div class="en-page" id="incomeStructurePage">
            <div class="is-header">
                 <button class="is-back-btn" onclick="closeIncomeStructure()">
                     <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5"></path><path d="M12 19l-7-7 7-7"></path></svg>
                 </button>
                 <h2 id="isPAFTitle" onclick="window._handleIsTitleTap()" style="cursor:default; user-select:none;">Profit Allocation Framework</h2>
                 <button class="use-ai-btn" onclick="window._aiPageContext='profit_allocation'; openAiChat()">Use AI</button>
            </div>
            
            <div class="is-content">
                 <div class="is-controls-section" style="align-items: center;">
                     <button class="is-trigger-btn" onclick="openIsEditModal()" style="font-weight: bold; background: #0f172a; color: white; border:none;">
                         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                         Edit Allocations
                     </button>
                     <div class="en-date-triggers" style="display:flex; gap:10px;">
                         <div class="is-trigger-btn" onclick="openIsDateModal('month')">
                             <span id="isSelMonth" style="color: #8b5cf6; font-weight:700;">March</span>
                             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                         </div>
                         <div class="is-trigger-btn" onclick="openIsDateModal('year')">
                             <span id="isSelYear" style="color: #8b5cf6; font-weight:700;">2026</span>
                             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                         </div>
                     </div>
                 </div>

                 <div class="is-summary-card">
                      <div class="is-summary-item" id="isTotalRevenueItem">
                          <span>Total Revenue</span>
                          <strong id="isTotalRevenue">₦0</strong>
                      </div>
                      <div class="is-summary-item" id="isTotalRestockItem">
                          <span>Total Cost of Goods</span>
                          <strong id="isTotalRestock">₦0</strong>
                      </div>
                      <div class="is-summary-item" id="isNetProfitItem">
                          <span>Gross Profit</span>
                          <strong id="isNetProfit">₦0</strong>
                      </div>
                 </div>

                 <div class="is-table-wrapper-clean" style="flex:1; display:flex; flex-direction:column; min-height:0; margin: 0 20px 20px 20px;">
                      <div class="is-table-header-container" style="overflow: hidden; border-radius: 14px 14px 0 0; background: #8b5cf6; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1); z-index: 10; flex-shrink: 0; padding-right: 6px;">
                          <table class="is-data-table is-header-table" style="width: 100%; border-collapse: collapse; min-width: 500px; font-size: 0.88rem; table-layout: fixed;">
                              <thead>
                                  <tr>
                                      <th style="width: 50px; color: #ffffff; font-weight: 700; font-size: 0.82rem; text-transform: uppercase; padding: 13px 12px; text-align: left; padding-left: 18px; border:none;">S/N</th>
                                      <th style="width: 250px; color: #ffffff; font-weight: 700; font-size: 0.82rem; text-transform: uppercase; padding: 13px 12px; text-align: left; border:none;">Allocation Name</th>
                                      <th style="width: 120px; color: #ffffff; font-weight: 700; font-size: 0.82rem; text-transform: uppercase; padding: 13px 12px; text-align: center; border:none;">Percentage</th>
                                      <th style="width: 150px; color: #ffffff; font-weight: 700; font-size: 0.82rem; text-transform: uppercase; padding: 13px 12px; text-align: right; padding-right: 18px; border:none;">Amount (₦)</th>
                                  </tr>
                              </thead>
                          </table>
                      </div>
                      <div class="is-table-body-container" id="isBodyScroll" style="flex: 1; overflow-x: auto; overflow-y: auto; border-radius: 0 0 14px 14px; background: #ffffff; box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05); scrollbar-width: thin;" onscroll="document.querySelector('.is-table-header-container').scrollLeft = this.scrollLeft;">
                          <table class="is-data-table is-body-table" style="width: 100%; border-collapse: collapse; min-width: 500px; font-size: 0.88rem; table-layout: fixed;">
                              <tbody id="isTableBody">
                              </tbody>
                          </table>
                      </div>
                      <div id="isTotalCard" style="margin-top: 15px; background: #ffffff; border-radius: 12px; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border-left: 4px solid #8b5cf6;">
                          <span style="font-weight: 800; color: #475569; text-transform: uppercase; font-size: 0.9rem;">Total Allocation (Gross Profit)</span>
                          <div style="display: flex; gap: 20px; align-items: center;">
                              <span style="color: #0f172a; font-weight: 700;">100%</span>
                              <strong id="isTotalAmtDisplay" style="color: #8b5cf6; font-size: 1.2rem; font-weight: 800;">₦0</strong>
                          </div>
                      </div>
                 </div>
            </div>
        </div>

        <!-- Inner Date Selector Modal for Income Structure -->
        <div id="isDateModal" class="admin-modal-overlay">
            <div class="admin-modal-content">
                <div class="admin-modal-header">
                    <h3 id="isDateModalTitle">Select Month</h3>
                    <button class="admin-modal-close" onclick="closeIsDateModal()">✕</button>
                </div>
                <div class="admin-modal-body selections-container" style="padding: 0; display:flex; height: 350px; overflow:hidden;">
                    <div id="isMonthCol" class="selection-column" style="flex:1; width: 100%; overflow-y:auto; padding: 10px;"></div>
                    <div id="isYearCol" class="selection-column" style="flex:1; width: 100%; overflow-y:auto; display:none; padding: 10px;"></div>
                </div>
            </div>
        </div>

        <!-- Custom Confirmation Modal for Deletion -->
        <div id="isConfirmModal" class="admin-modal-overlay" style="z-index: 100050;">
            <div class="admin-modal-content" style="max-width: 380px;">
                <div class="admin-modal-header" style="justify-content: center; border-bottom: none; padding-top: 30px;">
                    <div style="width: 64px; height: 64px; background: #fef2f2; color: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 20px rgba(239, 68, 68, 0.1);">
                        <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                    </div>
                </div>
                <div class="admin-modal-body" style="text-align: center; padding-top: 10px;">
                    <h3 style="margin: 0 0 10px 0; font-size: 1.4rem; color: #1e293b; font-weight: 800;">Remove Allocation?</h3>
                    <p style="margin: 0 0 24px 0; color: #64748b; font-size: 0.95rem; line-height: 1.5; font-weight: 500;">Are you sure you want to remove this allocation? This will adjust your distribution logic.</p>
                    <div style="display: flex; gap: 12px;">
                        <button onclick="closeIsConfirmModal()" class="admin-modern-btn" style="flex: 1; background: #f1f5f9; color: #64748b;">Cancel</button>
                        <button onclick="confirmRemoveIsAllocation()" class="admin-modern-btn danger" style="flex: 1;">Delete</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Edit Allocations Modal -->
        <div id="isEditModal" class="admin-modal-overlay">
            <div class="admin-modal-content">
                <div class="admin-modal-header">
                    <h3>Edit Allocations</h3>
                    <button class="admin-modal-close" onclick="closeIsEditModal()">✕</button>
                </div>
                <div class="admin-modal-body">
                    <div id="isEditTotalBanner" style="padding: 12px; margin-bottom: 20px; border-radius: 12px; font-weight: 800; text-align: center; font-size: 1.1rem; border: 1px solid #e2e8f0; background: #f8fafc;"></div>
                    <div id="isEditList" style="display: flex; flex-direction: column; gap: 16px;"></div>
                    <button onclick="addIsAllocation()" style="margin-top: 24px; width: 100%; padding: 16px; border: 2px dashed #cbd5e1; background: #fff; border-radius: 12px; cursor: pointer; color: #64748b; font-weight: 800; font-size: 0.9rem; text-transform: uppercase; transition: 0.2s;">+ Add New Allocation</button>
                </div>
                <div class="admin-modal-footer" style="padding: 24px 28px; border-top: 1px solid #eee; display: flex; justify-content: center; background: #fff; border-radius: 0 0 20px 20px;">
                    <button id="isEditSaveBtn" onclick="saveIsAllocations()" class="admin-modern-btn primary">Save Changes</button>
                </div>
            </div>
        </div>
        `;

        const container = document.createElement('div');
        container.id = 'income-structure-container';
        container.innerHTML = html;
        document.getElementById('modal-container').appendChild(container);
        
        // Ensure SHORT_MONTHS_EN and FULL_MONTHS_EN exist (from expenses-notebook.js)
        if (typeof FULL_MONTHS_EN !== 'undefined') {
            document.getElementById('isSelMonth').textContent = FULL_MONTHS_EN[window.currentIsMonthIdx];
        } else {
            const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            document.getElementById('isSelMonth').textContent = months[window.currentIsMonthIdx];
        }
        document.getElementById('isSelYear').textContent = window.currentIsYear;
        
        openIncomeStructurePage();
    } catch(err) {
        console.error("Error creating income structure HTML:", err);
        if(typeof customAlert === 'function') customAlert("Failed to load income structure UI: " + err.message);
    }
}

window.openIncomeStructure = function() {
    initIncomeStructure();
}

function openIncomeStructurePage() {
    const page = document.getElementById('incomeStructurePage');
    if (page) {
        page.style.display = 'flex';
        document.body.classList.add('modal-open');
        renderIncomeStructure();
    }
}

window.closeIncomeStructure = function() {
    const page = document.getElementById('incomeStructurePage');
    if (page) {
        page.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
    // Reset unlock so current month is hidden again on next open
    window._isAllocationUnlocked = false;
    window._isTitleTapCount = 0;
    if (window._isTitleTapTimer) clearTimeout(window._isTitleTapTimer);
    if (typeof window.clearAdminModalPersistence === 'function') window.clearAdminModalPersistence();
}

window.openIsDateModal = function(type) {
    const modal = document.getElementById('isDateModal');
    const mCol = document.getElementById('isMonthCol');
    const yCol = document.getElementById('isYearCol');
    const title = document.getElementById('isDateModalTitle');
    
    // Fallbacks just in case expenses-notebook.js hasn't loaded (though it should be based on index.html script order)
    const fMonths = typeof FULL_MONTHS_EN !== 'undefined' ? FULL_MONTHS_EN : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    mCol.innerHTML = '';
    yCol.innerHTML = '';
    
    if (type === 'month') {
        title.textContent = 'Select Month';
        mCol.style.display = 'block';
        yCol.style.display = 'none';
        
        const now = new Date();
        fMonths.forEach((m, i) => {
            const div = document.createElement('div');
            div.className = 'en-selection-item ' + (i === window.currentIsMonthIdx ? 'selected' : '');
            
            // Allow clicking past months for allocations too, same rules as expenses
            if (window.currentIsYear === now.getFullYear() && i > now.getMonth()) {
                div.classList.add('disabled');
            } else {
                div.onclick = () => {
                    window.currentIsMonthIdx = i;
                    document.getElementById('isSelMonth').textContent = fMonths[i];
                    closeIsDateModal();
                    renderIncomeStructure();
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
        for(let y = now.getFullYear(); y >= 2020; y--) {
            const div = document.createElement('div');
            div.className = 'en-selection-item ' + (y === window.currentIsYear ? 'selected' : '');
            div.onclick = () => {
                window.currentIsYear = y;
                if (y === now.getFullYear() && window.currentIsMonthIdx > now.getMonth()) {
                    window.currentIsMonthIdx = now.getMonth();
                    document.getElementById('isSelMonth').textContent = fMonths[window.currentIsMonthIdx];
                }
                document.getElementById('isSelYear').textContent = y;
                closeIsDateModal();
                renderIncomeStructure();
            }
            div.textContent = y;
            yCol.appendChild(div);
        }
    }
    
    if (modal) {
        modal.style.display = 'flex';
        void modal.offsetWidth; // force reflow
        modal.classList.add('show');
    }
}

window.closeIsDateModal = function() {
    const modal = document.getElementById('isDateModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => { modal.style.display = 'none'; }, 300);
    }
}

// --- Secret 7-tap unlock on the title ---
window._handleIsTitleTap = function() {
    window._isTitleTapCount = (window._isTitleTapCount || 0) + 1;

    if (window._isTitleTapTimer) clearTimeout(window._isTitleTapTimer);
    window._isTitleTapTimer = setTimeout(() => {
        window._isTitleTapCount = 0;
    }, 2000);

    if (window._isTitleTapCount >= 7) {
        window._isTitleTapCount = 0;
        clearTimeout(window._isTitleTapTimer);
        window._isAllocationUnlocked = !window._isAllocationUnlocked;

        // Flash feedback on title
        const titleEl = document.getElementById('isPAFTitle');
        if (titleEl) {
            titleEl.style.transition = 'color 0.3s';
            titleEl.style.color = window._isAllocationUnlocked ? '#22c55e' : '#e11d48';
            setTimeout(() => { titleEl.style.color = ''; }, 1000);
        }

        window.renderIncomeStructure();
    }
};

window.renderIncomeStructure = function() {
    let targetYear = window.currentIsYear;
    let targetMonthIdx = window.currentIsMonthIdx;
    
    // Need short months for parsing old string dates
    const sMonths = typeof SHORT_MONTHS_EN !== 'undefined' ? SHORT_MONTHS_EN : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Calculate total restock for this month
    let products = JSON.parse(localStorage.getItem('nd_products_data') || '[]');
    let totalRestock = 0;
    products.forEach(p => {
        // EXACT match with Restock list logic
        if (p.isDeleted || p.addedViaProductTab) return;
        
        let isMatch = false;
        const d = p.dateAdded ? new Date(p.dateAdded) : null;
        if (!d) {
            if (targetMonthIdx === new Date().getMonth() && targetYear === new Date().getFullYear()) {
                isMatch = true;
            }
        } else if (d.getMonth() === targetMonthIdx && d.getFullYear() === targetYear) {
            isMatch = true;
        }

        if (isMatch) {
            totalRestock += (parseFloat(p.purchaseCost) || parseFloat(p.cost) || 0);
        }
    });

    // Calculate total revenue for this month
    let totalRevenue = 0;
    if(targetYear !== null && targetMonthIdx !== null) {
        const targetShortMonth = sMonths[targetMonthIdx];
        const targetYearStr = String(targetYear);
        const savedSales = localStorage.getItem('nd_sales_history');
        if (savedSales) {
            try {
                const allSales = JSON.parse(savedSales);
                allSales.forEach(sale => {
                    const dParts = sale.date.split(' ');
                    if (dParts.length >= 3) {
                        const sMonth = dParts[1].replace(',', '');
                        const sYear = dParts[2];
                        if (sMonth === targetShortMonth && sYear === targetYearStr) {
                            const qty = (sale.qty || 1);
                            const price = (sale.price || (sale.isFlexible ? (sale.unitPrice || 0) : (qty * (sale.unitPrice || 0))));
                            totalRevenue += price;
                        }
                    }
                });
            } catch(e) {}
        }
    }

    const netProfitRaw = totalRevenue - totalRestock;
    const revEl = document.getElementById('isTotalRevenue');
    const restockEl = document.getElementById('isTotalRestock');
    if(revEl) revEl.textContent = '₦' + totalRevenue.toLocaleString();
    if(restockEl) restockEl.textContent = '₦' + totalRestock.toLocaleString();

    const profitEl = document.getElementById('isNetProfit');
    const profitContainer = document.getElementById('isNetProfitItem');
    
    if(profitEl) profitEl.textContent = '₦' + netProfitRaw.toLocaleString();
    if(profitContainer) {
        if(netProfitRaw < 0) {
            profitContainer.classList.add('negative');
            profitContainer.style.borderColor = '#e11d48';
            profitContainer.querySelector('span').style.color = '#e11d48';
            profitEl.style.color = '#e11d48';
        } else {
            profitContainer.classList.remove('negative');
            profitContainer.style.borderColor = '#8b5cf6';
            profitContainer.querySelector('span').style.color = '#8b5cf6';
            profitEl.style.color = '';
        }
    }
    
    const tbody = document.getElementById('isTableBody');
    const tableHeaderContainer = document.querySelector('.is-table-header-container');
    const tableBodyContainer = document.getElementById('isBodyScroll');
    const totalCard = document.getElementById('isTotalCard');
    const summaryCard = document.querySelector('.is-summary-card');
    if (!tbody) return;

    // --- Determine if we are viewing the current month ---
    const now = new Date();
    const isCurrentMonth = (targetMonthIdx === now.getMonth() && targetYear === now.getFullYear());

    // --- Check if today is the last day of the current month ---
    const lastDayOfMonth = new Date(targetYear, targetMonthIdx + 1, 0).getDate();
    const isMonthEnd = isCurrentMonth && (now.getDate() === lastDayOfMonth);

    // --- Show allocations? ---
    // Show if: past month OR month-end OR admin manually unlocked via 7 taps
    const showAllocations = !isCurrentMonth || isMonthEnd || window._isAllocationUnlocked;

    const FULL_MONTHS_FALLBACK = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const fMonths = typeof FULL_MONTHS_EN !== 'undefined' ? FULL_MONTHS_EN : FULL_MONTHS_FALLBACK;

    if (!showAllocations) {
        // Hide summary card, blue header table and total card
        if (summaryCard) summaryCard.style.display = 'none';
        if (tableHeaderContainer) tableHeaderContainer.style.display = 'none';
        if (totalCard) totalCard.style.display = 'none';

        // Keep body container visible so the message inside tbody shows
        if (tableBodyContainer) {
            tableBodyContainer.style.display = '';
            tableBodyContainer.style.borderRadius = '14px'; // full radius since header is gone
        }

        tbody.innerHTML = `
            <tr><td colspan="4" style="border:none;">
                <div style="
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    padding: 50px 30px; gap: 18px; text-align: center;
                ">
                    <div style="
                        width: 76px; height: 76px; border-radius: 50%;
                        background: linear-gradient(135deg, #e0f0ff, #e0e7ff);
                        display: flex; align-items: center; justify-content: center;
                        box-shadow: 0 8px 24px rgba(27,38,59,0.18);
                    ">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                    </div>
                    <div>
                        <p style="margin:0 0 8px 0; font-size: 1.15rem; font-weight: 800; color: #1e293b;">Allocations Pending</p>
                        <p style="margin:0; font-size: 0.9rem; color: #64748b; line-height: 1.7; max-width: 320px;">
                            Profit allocations for <strong style="color:#1e293b;">${fMonths[targetMonthIdx]} ${targetYear}</strong>
                            are locked until the end of the month. They will automatically unlock on
                            <strong style="color:#8b5cf6;">${lastDayOfMonth} ${fMonths[targetMonthIdx]}</strong>.
                        </p>
                    </div>
                </div>
            </td></tr>
        `;
        return;
    }

    // Restore visibility when showing allocations
    if (summaryCard) summaryCard.style.display = '';

    // Restore table + total card visibility (if previously hidden)
    if (tableHeaderContainer) tableHeaderContainer.style.display = '';
    if (tableBodyContainer) {
        tableBodyContainer.style.display = '';
        tableBodyContainer.style.borderRadius = '0 0 14px 14px'; // restore flat-top (header is back)
    }
    if (totalCard) totalCard.style.display = '';

    let allocations = window.loadIsAllocations();

    if (netProfitRaw <= 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px; color: #64748b;">No positive gross profit to allocate.</td></tr>`;
        return;
    }

    let actualProfit = netProfitRaw;
    
    let html = '';
    let totalAllocated = 0;

    allocations.forEach((item, index) => {
        let amt = (item.percent / 100) * actualProfit;
        totalAllocated += amt;
        
        html += `
            <tr style="border-bottom: 1px solid #f5f5f5; background: #fff; transition: 0.2s;" onmouseover="this.style.backgroundColor='#f0f4f8'" onmouseout="this.style.backgroundColor='#fff'">
                <td style="width: 50px; padding: 12px; color: #aaa; font-weight: 600; padding-left: 18px;">${index + 1}</td>
                <td style="width: 250px; padding: 12px; color: #444; font-weight: 500;">${item.name}</td>
                <td style="width: 120px; padding: 12px; color: #1e293b; font-weight: 600; text-align: center;">${item.percent}%</td>
                <td style="width: 150px; padding: 12px; color: #8b5cf6; font-weight: 700; text-align: right; padding-right: 18px;">₦${amt.toLocaleString()}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    
    const totalDisp = document.getElementById('isTotalAmtDisplay');
    if(totalDisp) totalDisp.textContent = '₦' + totalAllocated.toLocaleString();
}

window.loadIsAllocations = function() {
    const defaultVals = [
        { name: "Personal income", percent: 20 },
        { name: "Expenses", percent: 15 },
        { name: "Savings", percent: 15 },
        { name: "Emergency funds", percent: 10 },
        { name: "Reinvestment fund", percent: 30 },
        { name: "Net profit", percent: 10 },
        { name: "Tax", percent: 0 }
    ];
    try {
        let saved = localStorage.getItem('nd_income_allocations');
        if (saved) {
            let parsed = JSON.parse(saved);
            // Auto inject Tax if this is old data
            if (!parsed.some(a => a.name.toLowerCase() === 'tax')) {
                parsed.push({ name: "Tax", percent: 0 });
            }
            return parsed;
        }
    } catch(e) {}
    return defaultVals;
}

window.openIsEditModal = function() {
    window.editingAllocations = JSON.parse(JSON.stringify(window.loadIsAllocations())); // Deep copy
    const modal = document.getElementById('isEditModal');
    if(modal) {
        modal.style.display = 'flex';
        // force reflow
        void modal.offsetWidth;
        modal.classList.add('show');
        window.renderIsEditList();
    }
}

window.closeIsEditModal = function() {
    const modal = document.getElementById('isEditModal');
    if(modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            window.editingAllocations = [];
        }, 300);
    }
}

window.addIsAllocation = function() {
    window.editingAllocations.push({ name: "New Allocation", percent: 0 });
    window.renderIsEditList();
}

window.removeIsAllocation = function(idx) {
    window.isAllocationToRemove = idx;
    const modal = document.getElementById('isConfirmModal');
    if (modal) {
        modal.style.display = 'flex';
        void modal.offsetWidth; // force reflow
        modal.classList.add('show');
    }
}

window.closeIsConfirmModal = function() {
    const modal = document.getElementById('isConfirmModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => { modal.style.display = 'none'; }, 300);
    }
}

window.confirmRemoveIsAllocation = function() {
    if (window.isAllocationToRemove !== undefined) {
        window.editingAllocations.splice(window.isAllocationToRemove, 1);
        window.renderIsEditList();
        window.isAllocationToRemove = undefined;
    }
    window.closeIsConfirmModal();
}

window.updateIsAllocName = function(idx, val) {
    window.editingAllocations[idx].name = val;
}

window.updateIsAllocPercent = function(idx, val) {
    let num = parseFloat(val);
    if(isNaN(num)) num = 0;
    window.editingAllocations[idx].percent = num;
    window.renderIsEditListBanner(); // only update banner to avoid losing focus
}

window.renderIsEditListBanner = function() {
    let total = 0;
    window.editingAllocations.forEach(a => total += (parseFloat(a.percent) || 0));
    const banner = document.getElementById('isEditTotalBanner');
    const saveBtn = document.getElementById('isEditSaveBtn');
    
    // Format to 2 decimal places to prevent float rounding issues, then back to float
    total = parseFloat(total.toFixed(2));
    
    if (total === 100) {
        banner.style.backgroundColor = '#dcfce7';
        banner.style.color = '#15803d';
        banner.textContent = "Perfect! 100% Allocated.";
        saveBtn.disabled = false;
        saveBtn.style.opacity = '1';
        saveBtn.style.cursor = 'pointer';
        saveBtn.textContent = 'Save Changes';
    } else if (total > 100) {
        let diff = parseFloat((total - 100).toFixed(2));
        banner.style.backgroundColor = '#fee2e2';
        banner.style.color = '#b91c1c';
        banner.textContent = `Overallocated by ${diff}%. Please reduce percentages.`;
        saveBtn.disabled = true;
        saveBtn.style.opacity = '0.5';
        saveBtn.style.cursor = 'not-allowed';
        saveBtn.textContent = 'Must equal 100%';
    } else {
        let diff = parseFloat((100 - total).toFixed(2));
        banner.style.backgroundColor = '#fef9c3';
        banner.style.color = '#a16207';
        banner.textContent = `${diff}% Unallocated. Please assign remaining.`;
        saveBtn.disabled = true;
        saveBtn.style.opacity = '0.5';
        saveBtn.style.cursor = 'not-allowed';
        saveBtn.textContent = 'Must equal 100%';
    }
}

window.renderIsEditList = function() {
    const listEl = document.getElementById('isEditList');
    if(!listEl) return;
    listEl.innerHTML = '';
    
    window.editingAllocations.forEach((item, idx) => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.gap = '10px';
        row.style.alignItems = 'center';
        
        const nameInp = document.createElement('input');
        nameInp.type = 'text';
        nameInp.value = item.name;
        nameInp.placeholder = 'Allocation Name';
        nameInp.style.flex = '1';
        nameInp.style.minWidth = '50px';
        nameInp.style.padding = '10px';
        nameInp.style.border = '1px solid #cbd5e1';
        nameInp.style.borderRadius = '6px';
        nameInp.style.fontSize = '0.95rem';
        nameInp.oninput = (e) => window.updateIsAllocName(idx, e.target.value);
        
        const percWrapper = document.createElement('div');
        percWrapper.style.position = 'relative';
        percWrapper.style.width = '80px';
        percWrapper.style.flexShrink = '0';
        
        const percInp = document.createElement('input');
        percInp.type = 'number';
        percInp.value = item.percent;
        percInp.style.width = '100%';
        percInp.style.padding = '10px 18px 10px 10px';
        percInp.style.border = '1px solid #cbd5e1';
        percInp.style.borderRadius = '6px';
        percInp.style.fontSize = '0.95rem';
        percInp.style.boxSizing = 'border-box';
        percInp.step = '0.1';
        percInp.oninput = (e) => window.updateIsAllocPercent(idx, e.target.value);
        
        const percSign = document.createElement('span');
        percSign.textContent = '%';
        percSign.style.position = 'absolute';
        percSign.style.right = '4px';
        percSign.style.top = '10px';
        percSign.style.color = '#64748b';
        percSign.style.fontWeight = 'bold';
        
        percWrapper.appendChild(percInp);
        percWrapper.appendChild(percSign);
        
        const delBtn = document.createElement('button');
        delBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
        delBtn.style.background = '#fef2f2';
        delBtn.style.color = '#ef4444';
        delBtn.style.border = '1px solid #fee2e2';
        delBtn.style.padding = '10px';
        delBtn.style.borderRadius = '6px';
        delBtn.style.cursor = 'pointer';
        delBtn.style.display = 'flex';
        delBtn.style.alignItems = 'center';
        delBtn.style.justifyContent = 'center';
        delBtn.onclick = () => window.removeIsAllocation(idx);
        
        row.appendChild(nameInp);
        row.appendChild(percWrapper);
        row.appendChild(delBtn);
        
        listEl.appendChild(row);
    });
    
    window.renderIsEditListBanner();
}

window.saveIsAllocations = function() {
    let total = 0;
    // Strip trailing empty names or handle validation
    if(window.editingAllocations.some(a => !a.name.trim())) {
        if(typeof customAlert === 'function') customAlert("All allocations must have a valid name.");
        else alert("All allocations must have a valid name.");
        return;
    }

    window.editingAllocations.forEach(a => total += (parseFloat(a.percent) || 0));
    total = parseFloat(total.toFixed(2));
    
    if (total !== 100) {
        const banner = document.getElementById('isEditTotalBanner');
        if(banner) {
             banner.style.transition = '0.1s transform';
             banner.style.transform = 'translateY(-5px) scale(1.02)';
             setTimeout(() => banner.style.transform = '', 150);
        }
        return;
    }
    
    // Validation passed, save it
    localStorage.setItem('nd_income_allocations', JSON.stringify(window.editingAllocations));
    window.closeIsEditModal();
    window.renderIncomeStructure();
    
    if(typeof customTopAlert === 'function') {
        customTopAlert("Income structure successfully updated.");
    } else {
        console.log("Income structure saved.");
    }
}




