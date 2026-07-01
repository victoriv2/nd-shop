// Yearly Financial Overview

function initYearlyOverview() {
    if (document.getElementById('YearlyOverviewPage')) {
        openYearlyOverviewPage();
        return;
    }

    try {
        const html = `
        <div class="en-page" id="YearlyOverviewPage">
            <div class="en-header" style="position: relative;">
                 <button class="en-back-btn" onclick="closeYearlyOverview()">
                     <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5"></path><path d="M12 19l-7-7 7-7"></path></svg>
                 </button>
                 <h2 id="yoPageTitle" style="position: absolute; left: 50%; transform: translateX(-50%); user-select: none; -webkit-user-select: none;">Yearly Financial Overview</h2>
                 <div style="width: 40px;"></div>
            </div>
            
            <div class="en-content" style="padding: 20px; overflow-y: auto;">

                <!-- Year trigger button -->
                <div id="yoYearSelector" class="en-date-triggers-wrapper" style="margin-bottom: 24px;">
                     <div class="en-date-triggers" style="display:flex; justify-content:center;">
                         <div class="en-trigger-btn" onclick="openYoDateModal()" style="width: 100%; justify-content: space-between; max-width: 300px; padding: 14px 20px; font-size: 1.1rem;">
                             <span id="yoSelYear" style="color: #8b5cf6; font-weight:800;">2026</span>
                             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                         </div>
                     </div>
                </div>

                <!-- Stats -->
                <div id="yoStatsView" style="display: flex; flex-direction: column; gap: 15px;">
                    <!-- Monthly Breakdown -->
                    <div id="yoMonthsBreakdown" style="display: flex; flex-direction: column; gap: 10px;">
                        <!-- JS injects monthly cards here -->
                    </div>

                    <!-- Grand Totals Section -->
                    <div onclick="handleYoGrandTotalsTap()" style="font-weight: 800; font-size: 1.1rem; color: #1e293b; margin-top: 10px; border-top: 2px dashed #cbd5e1; padding-top: 15px; text-align: center; cursor: pointer; user-select: none; -webkit-user-select: none;">
                        <span style="background: #f1f5f9; padding: 4px 12px; border-radius: 12px;">Yearly Grand Totals</span>
                    </div>

                    <div class="en-summary-card" style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 5px;">
                        <div class="en-summary-item" style="padding: 20px; background: linear-gradient(135deg, #f0f4f8, #e0e7ff); border: 1px solid #bfdbfe; display: flex; justify-content: space-between; align-items: center; border-radius: 12px;">
                            <span style="color: #0F172A; font-weight: 700; font-size: 1.1rem;">Yearly Revenue</span>
                            <strong id="yoTotalRevenue" style="color: #1e40af; font-size: 1.5rem;">₦0</strong>
                        </div>
                        <div class="en-summary-item" style="padding: 20px; background: linear-gradient(135deg, #fefce8, #fef08a); border: 1px solid #fde047; display: flex; justify-content: space-between; align-items: center; border-radius: 12px;">
                            <span style="color: #854d0e; font-weight: 700; font-size: 1.1rem;">Yearly Cost</span>
                            <strong id="yoTotalCost" style="color: #a16207; font-size: 1.5rem;">₦0</strong>
                        </div>
                        <div class="en-summary-item" style="padding: 20px; background: linear-gradient(135deg, #ecfdf5, #d1fae5); border: 1px solid #6ee7b7; display: flex; justify-content: space-between; align-items: center; border-radius: 12px;">
                            <span style="color: #047857; font-weight: 700; font-size: 1.1rem;">Yearly Net Profit</span>
                            <strong id="yoTotalNetProfit" style="color: #059669; font-size: 1.5rem;">₦0</strong>
                        </div>
                        <div class="en-summary-item" style="padding: 20px; background: linear-gradient(135deg, #fef2f2, #fecaca); border: 1px solid #fca5a5; display: flex; justify-content: space-between; align-items: center; border-radius: 12px;">
                            <span style="color: #991b1b; font-weight: 700; font-size: 1.1rem;">Yearly Tax</span>
                            <strong id="yoTotalTax" style="color: #b91c1c; font-size: 1.5rem;">₦0</strong>
                        </div>
                    </div>
                    
                    <div class="en-summary-item" style="padding: 20px; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center; border-left: 4px solid #8b5cf6;">
                        <span style="color: #475569; font-weight: 800; font-size: 1.2rem;">Yearly Gross Profit</span>
                        <strong id="yoNetBalance" style="color: #0f172a; font-size: 1.7rem;">₦0</strong>
                    </div>
                </div>
            </div>
        </div>

        <!-- Inner Date Selector Modal -->
        <div id="yoDateModal" class="admin-modal-overlay">
            <div class="admin-modal-content">
                <div class="admin-modal-header">
                    <h3>Select Year</h3>
                    <button class="admin-modal-close" onclick="closeYoDateModal()">✕</button>
                </div>
                <div class="admin-modal-body selections-container" style="padding: 0; display:flex; height: 350px; overflow:hidden;">
                    <div id="yoYearCol" class="selection-column" style="flex:1; width: 100%; overflow-y:auto; padding: 10px;"></div>
                </div>
            </div>
        </div>
        `;

        const container = document.createElement('div');
        container.id = 'yearly-overview-container';
        container.innerHTML = html;
        document.getElementById('modal-container').appendChild(container);

        // Pre-set global state
        window.currentYoYear = new Date().getFullYear();
        document.getElementById('yoSelYear').textContent = window.currentYoYear;
        
        openYearlyOverviewPage();
    } catch(err) {
        console.error("Error creating yearly overview HTML:", err);
    }
}

window.openYearlyOverview = function() {
    initYearlyOverview();
}

function openYearlyOverviewPage() {
    const page = document.getElementById('YearlyOverviewPage');
    if (page) {
        page.style.display = 'flex';
        document.body.classList.add('modal-open');

        window.currentYoYear = new Date().getFullYear();
        document.getElementById('yoSelYear').textContent = window.currentYoYear;

        renderYearlyOverview();
    }
}

window.closeYearlyOverview = function() {
    const page = document.getElementById('YearlyOverviewPage');
    if (page) {
        page.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
    if (typeof window.clearAdminModalPersistence === 'function') {
        window.clearAdminModalPersistence();
    }
}

window.openYoDateModal = function() {
    const modal = document.getElementById('yoDateModal');
    const yCol = document.getElementById('yoYearCol');
    
    yCol.innerHTML = '';
    const now = new Date();
    // Show current year and all previous years
    for(let y = now.getFullYear(); y >= 2020; y--) {
        const div = document.createElement('div');
        div.className = 'en-selection-item ' + (y === window.currentYoYear ? 'selected' : '');
        div.onclick = () => {
            window.currentYoYear = y;
            document.getElementById('yoSelYear').textContent = y;
            closeYoDateModal();
            renderYearlyOverview();
        }
        div.textContent = y;
        yCol.appendChild(div);
    }
    
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    }
}

window.closeYoDateModal = function() {
    const modal = document.getElementById('yoDateModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    }
}

window.renderYearlyOverview = function() {
    const targetYear = window.currentYoYear;
    if (!targetYear) return;

    const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const FULL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    let monthlyData = Array(12).fill(null).map(() => ({ revenue: 0, cost: 0, manualTax: 0, autoTax: 0, autoNetProfit: 0 }));

    // Calculate Revenue per month from nd_sales_history
    try {
        const sales = JSON.parse(localStorage.getItem('nd_sales_history') || '[]');
        sales.forEach(sale => {
            const dParts = sale.date ? sale.date.replace(/\s*,\s*/g, ', ').split(' ') : [];
            if (dParts.length >= 3 && parseInt(dParts[2].replace(',', '')) === targetYear) {
                const mIdx = SHORT_MONTHS.indexOf(dParts[1].replace(',',''));
                if (mIdx !== -1) {
                    const qty = (sale.qty || 1);
                    const price = (sale.price || (sale.isFlexible ? (sale.unitPrice || 0) : (qty * (sale.unitPrice || 0))));
                    monthlyData[mIdx].revenue += price;
                }
            }
        });
    } catch(e) { console.error('Revenue Calculation Error:', e); }

    // Calculate Cost of Goods per month from nd_products_data
    try {
        const products = JSON.parse(localStorage.getItem('nd_products_data') || '[]');
        products.forEach(p => {
            if (p.isDeleted || p.addedViaProductTab) return;
            
            let isMatch = false;
            const d = p.dateAdded ? new Date(p.dateAdded) : null;
            if (!d) {
                // If no date, match current month/year
                const now = new Date();
                if (targetYear === now.getFullYear()) {
                    monthlyData[now.getMonth()].cost += (parseFloat(p.purchaseCost) || parseFloat(p.cost) || 0);
                }
            } else if (d.getFullYear() === targetYear) {
                monthlyData[d.getMonth()].cost += (parseFloat(p.purchaseCost) || parseFloat(p.cost) || 0);
            }
        });
    } catch(e) { console.error('Cost Calculation Error:', e); }

    // Manual Tax Distribution
    try {
        const taxes = JSON.parse(localStorage.getItem('nd_Tax_records') || '[]');
        taxes.forEach(t => {
            const mIdx = (t.monthIdx !== undefined) ? t.monthIdx : t.month;
            if (t.year === targetYear && mIdx >= 0 && mIdx < 12) {
                monthlyData[mIdx].manualTax += (parseFloat(t.amount) || 0);
            } else if (t.year === targetYear) {
                // If it lacks month data but is in the year, dump it in December
                monthlyData[11].manualTax += (parseFloat(t.amount) || 0);
            }
        });
    } catch(e) { console.error('Manual Tax Error:', e); }

    // Auto Tax Calculation (if applicable based on income structure)
    try {
        let allocs = JSON.parse(localStorage.getItem('nd_income_allocations') || '[]');
        if (allocs.length === 0) {
            allocs = [
                { name: "Personal income", percent: 20 },
                { name: "Expenses", percent: 15 },
                { name: "Salaries", percent: 15 },
                { name: "Reinvestment", percent: 35 },
                { name: "Tax", percent: 5 },
                { name: "Net profit", percent: 10 }
            ];
        }
        let taxAlloc = allocs.find(a => a.name.toLowerCase() === 'tax');
        if (taxAlloc && parseFloat(taxAlloc.percent) > 0) {
            const taxPercent = parseFloat(taxAlloc.percent);
            for (let m = 0; m < 12; m++) {
                const netProfitBeforeAuto = monthlyData[m].revenue - monthlyData[m].cost;
                if (netProfitBeforeAuto > 0) {
                    monthlyData[m].autoTax = (taxPercent / 100) * netProfitBeforeAuto;
                }
            }
        }
    } catch(e) { console.error('Auto Tax Error:', e); }

    // Auto Net Profit Calculation (if applicable based on income structure)
    try {
        let allocs = JSON.parse(localStorage.getItem('nd_income_allocations') || '[]');
        if (allocs.length === 0) {
            allocs = [
                { name: "Personal income", percent: 20 },
                { name: "Expenses", percent: 15 },
                { name: "Salaries", percent: 15 },
                { name: "Reinvestment", percent: 35 },
                { name: "Tax", percent: 5 },
                { name: "Net profit", percent: 10 }
            ];
        }
        let npAlloc = allocs.find(a => a.name.toLowerCase() === 'net profit');
        if (npAlloc && parseFloat(npAlloc.percent) > 0) {
            const npPercent = parseFloat(npAlloc.percent);
            for (let m = 0; m < 12; m++) {
                const netProfitBeforeAuto = monthlyData[m].revenue - monthlyData[m].cost;
                if (netProfitBeforeAuto > 0) {
                    monthlyData[m].autoNetProfit = (npPercent / 100) * netProfitBeforeAuto;
                }
            }
        }
    } catch(e) { console.error('Auto Net Profit Error:', e); }

    // --- Build Monthly Breakdown HTML & Grand Totals ---
    const monthsBreakdownEl = document.getElementById('yoMonthsBreakdown');
    let cardsHtml = '';
    let grandRevenue = 0;
    let grandCost = 0;
    let grandTax = 0;
    let grandNetProfitAlloc = 0;
    const now = new Date();

    // Grand Totals secret tap counter
    if (!window.yoGrandTotalsTapCount) window.yoGrandTotalsTapCount = 0;
    if (!window.yoGrandTotalsTapTimer) window.yoGrandTotalsTapTimer = null;
    if (typeof window.yoGrandTotalsRevealed === 'undefined') window.yoGrandTotalsRevealed = false;

    window.handleYoGrandTotalsTap = function() {
        window.yoGrandTotalsTapCount++;
        if (window.yoGrandTotalsTapTimer) clearTimeout(window.yoGrandTotalsTapTimer);
        
        if (window.yoGrandTotalsTapCount >= 7) {
            window.yoGrandTotalsTapCount = 0;
            window.yoGrandTotalsRevealed = !window.yoGrandTotalsRevealed;
            renderYearlyOverview();
        } else {
            window.yoGrandTotalsTapTimer = setTimeout(() => {
                window.yoGrandTotalsTapCount = 0;
            }, 3000);
        }
    };

    // Per-month secret tap counters for current month
    if (!window.yoMonthTapCount) window.yoMonthTapCount = {};
    if (!window.yoMonthTapTimer) window.yoMonthTapTimer = {};
    if (!window.yoMonthRevealed) window.yoMonthRevealed = {};

    window.handleYoMonthTap = function(monthIdx) {
        const key = targetYear + '_' + monthIdx;
        window.yoMonthTapCount[key] = (window.yoMonthTapCount[key] || 0) + 1;

        if (window.yoMonthTapTimer[key]) clearTimeout(window.yoMonthTapTimer[key]);

        if (window.yoMonthTapCount[key] >= 7) {
            window.yoMonthTapCount[key] = 0;
            window.yoMonthRevealed[key] = !window.yoMonthRevealed[key];
            const overlay = document.getElementById('yoMonthOverlay_' + monthIdx);
            const data = document.getElementById('yoMonthData_' + monthIdx);
            if (overlay && data) {
                if (window.yoMonthRevealed[key]) {
                    overlay.style.display = 'none';
                    data.style.display = 'block';
                } else {
                    overlay.style.display = 'flex';
                    data.style.display = 'none';
                }
            }
        } else {
            window.yoMonthTapTimer[key] = setTimeout(() => {
                window.yoMonthTapCount[key] = 0;
            }, 3000);
        }
    };

    for (let m = 0; m < 12; m++) {
        const data = monthlyData[m];
        const monthTaxObj = data.manualTax + data.autoTax;
        const monthNet = data.revenue - data.cost - monthTaxObj;
        
        const isCurrentMonth = (targetYear === now.getFullYear()) && (m === now.getMonth());
        const isFuture = (targetYear === now.getFullYear()) && (m > now.getMonth());
        const opacity = isFuture ? '0.5' : '1';

        const lastDayOfMonth = new Date(targetYear, m + 1, 0).getDate();
        const isMonthEnd = isCurrentMonth && (now.getDate() === lastDayOfMonth);

        // Accumulate to yearly
        if (!isCurrentMonth || isMonthEnd || window.yoGrandTotalsRevealed) {
            grandRevenue += data.revenue;
            grandCost += data.cost;
            grandTax += monthTaxObj;
            grandNetProfitAlloc += data.autoNetProfit;
        }

        // Compute month-end date label for current month
        let monthEndLabel = '';
        if (isCurrentMonth) {
            monthEndLabel = FULL_MONTHS[m] + ' ' + lastDayOfMonth + ', ' + targetYear;
        }

        // Per-month secret reveal state
        const key = targetYear + '_' + m;
        const isRevealed = (window.yoMonthRevealed && window.yoMonthRevealed[key]) || isMonthEnd;

        const dataHtml = `
            <div id="yoMonthData_${m}" style="display: ${isCurrentMonth && !isRevealed ? 'none' : 'block'}">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="color: #64748b; font-size: 0.95rem;">Revenue</span>
                    <strong style="color: #1e40af; font-size: 1.05rem;">₦${data.revenue.toLocaleString(undefined, {maximumFractionDigits:2})}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="color: #64748b; font-size: 0.95rem;">Cost of Goods</span>
                    <strong style="color: #a16207; font-size: 1.05rem;">₦${data.cost.toLocaleString(undefined, {maximumFractionDigits:2})}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="color: #64748b; font-size: 0.95rem;">Net Profit</span>
                    <strong style="color: #059669; font-size: 1.05rem;">₦${(data.autoNetProfit || 0).toLocaleString(undefined, {maximumFractionDigits:2})}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <span style="color: #64748b; font-size: 0.95rem;">Allocated Tax</span>
                    <strong style="color: #b91c1c; font-size: 1.05rem;">₦${monthTaxObj.toLocaleString(undefined, {maximumFractionDigits:2})}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed #e2e8f0; padding-top: 10px;">
                    <span style="color: #475569; font-size: 0.95rem; font-weight: 800;">Gross Profit</span>
                    <strong style="color: ${monthNet < 0 ? '#b91c1c' : '#16a34a'}; font-size: 1.15rem;">₦${monthNet.toLocaleString(undefined, {maximumFractionDigits:2})}</strong>
                </div>
            </div>
        `;

        const overlayHtml = isCurrentMonth ? `
            <div id="yoMonthOverlay_${m}" style="display: ${isRevealed ? 'none' : 'flex'}; flex-direction: column; align-items: center; justify-content: center; padding: 18px 12px; gap: 8px; text-align: center; background: linear-gradient(135deg, #f0f4f8, #e0effe); border-radius: 10px; border: 1px dashed #bfdbfe;">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#8b5cf6" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <span style="color: #1e40af; font-weight: 700; font-size: 0.88rem;">Will be available</span>
                <span style="color: #8b5cf6; font-weight: 900; font-size: 0.95rem;">${monthEndLabel}</span>
            </div>
        ` : `<div id="yoMonthOverlay_${m}" style="display:none;"></div>`;

        const cardClickable = isCurrentMonth
            ? `onclick="handleYoMonthTap(${m})" style="cursor:pointer; user-select:none; -webkit-user-select:none; background: white; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px; box-shadow: 0 2px 5px rgba(0,0,0,0.03); opacity: ${opacity}; border-left: 3px solid #8b5cf6;"`
            : `style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; box-shadow: 0 2px 5px rgba(0,0,0,0.03); opacity: ${opacity};"`;

        cardsHtml += `
            <div ${cardClickable}>
                <div style="font-weight: 800; font-size: 1.1rem; color: #334155; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                    ${FULL_MONTHS[m]}
                    ${isCurrentMonth ? '<span style="font-size: 0.65rem; font-weight: 700; background: #e0e7ff; color: #1d4ed8; padding: 2px 7px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">Current</span>' : ''}
                </div>
                ${overlayHtml}
                ${dataHtml}
            </div>
        `;
    }

    if (monthsBreakdownEl) monthsBreakdownEl.innerHTML = cardsHtml;

    // Render Grand Totals
    const revEl = document.getElementById('yoTotalRevenue');
    const costEl = document.getElementById('yoTotalCost');
    const npEl = document.getElementById('yoTotalNetProfit');
    const taxEl = document.getElementById('yoTotalTax');
    const balEl = document.getElementById('yoNetBalance');

    if (revEl) revEl.textContent = '₦' + grandRevenue.toLocaleString(undefined, {maximumFractionDigits:2});
    if (costEl) costEl.textContent = '₦' + grandCost.toLocaleString(undefined, {maximumFractionDigits:2});
    if (npEl) npEl.textContent = '₦' + grandNetProfitAlloc.toLocaleString(undefined, {maximumFractionDigits:2});
    if (taxEl) taxEl.textContent = '₦' + grandTax.toLocaleString(undefined, {maximumFractionDigits:2});
    
    if (balEl) {
        const grandNet = grandRevenue - grandCost - grandTax;
        balEl.textContent = '₦' + grandNet.toLocaleString(undefined, {maximumFractionDigits:2});
        balEl.style.color = grandNet < 0 ? '#b91c1c' : '#0f172a';
        balEl.parentElement.style.borderLeftColor = grandNet < 0 ? '#ef4444' : '#8b5cf6';
    }
}





