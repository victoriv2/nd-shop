const SHORT_MONTHS_TR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_MONTHS_TR = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

window.currentTrMonthIdx = new Date().getMonth();
window.currentTrYear = new Date().getFullYear();

function initTaxRecords() {
    if (document.getElementById('TaxRecordsPage')) {
        openTaxRecordsPage();
        return;
    }

    try {
        const html = `
        <div class="en-page" id="TaxRecordsPage">
            <div class="en-header">
                 <button class="en-back-btn" onclick="closeTaxRecords()">
                     <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5"></path><path d="M12 19l-7-7 7-7"></path></svg>
                 </button>
                 <h2>Tax Records</h2>
                 <button class="use-ai-btn" onclick="window._aiPageContext='Taxs'; openAiChat()">Use AI</button>
            </div>
            
            <div class="en-content">
                 <div class="en-controls-section">
                     <div class="en-search-wrap">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <path d="m21 21-4.34-4.34" />
                              <circle cx="11" cy="11" r="8" />
                          </svg>
                          <input type="text" id="trSearchInput" placeholder="Search Taxs everywhere..." oninput="renderTaxs()">
                     </div>
                     
                     <div class="sort-container" id="trSortContainer">
                         <div class="sort-btn" id="trSortToggle" onclick="toggleTrSortDropdown(event)">
                             <span class="sort-text" id="trSortText">Newest to Oldest</span>
                             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 4px; pointer-events: none;">
                                 <path d="M6 9l6 6 6-6" />
                             </svg>
                         </div>
                         <div class="sort-dropdown" id="trSortDropdown">
                             <div class="sort-option active" onclick="selectTrSort('newest', this)">Newest to Oldest<span class="sort-check"></span></div>
                             <div class="sort-option" onclick="selectTrSort('oldest', this)">Oldest to Newest<span class="sort-check"></span></div>
                             <div class="sort-option" onclick="selectTrSort('highest', this)">Highest to Lowest<span class="sort-check"></span></div>
                             <div class="sort-option" onclick="selectTrSort('lowest', this)">Lowest to Highest<span class="sort-check"></span></div>
                         </div>
                     </div>
                 </div>

                 <div class="en-date-triggers-wrapper" style="padding: 15px 20px 0 20px;">
                     <div class="en-date-triggers" style="display:flex; gap:10px;">
                         <div class="en-trigger-btn" onclick="openTrDateModal('month')">
                             <span id="trSelMonth" style="color: #8b5cf6; font-weight:700;">March</span>
                             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                         </div>
                         <div class="en-trigger-btn" onclick="openTrDateModal('year')">
                             <span id="trSelYear" style="color: #8b5cf6; font-weight:700;">2026</span>
                             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                         </div>
                     </div>
                 </div>

                 <div class="en-summary-card" style="display:flex; gap:15px; margin-bottom: 20px;">
                      <div class="en-summary-item" style="flex:1; padding: 20px; background: linear-gradient(135deg, #dcfce7, #bbf7d0); border: 1px solid #86efac;">
                          <span style="color: #166534;">Tax from Profit (Auto) <span id="autoTaxPerc" style="font-size:0.75rem; font-weight:700; background:rgba(22,101,52,0.1); padding:2px 6px; border-radius:4px; margin-left:6px;">0%</span></span>
                          <strong id="trTotalAutoTax" style="color: #14532d;">₦0</strong>
                      </div>
                      <div class="en-summary-item" style="flex:1; padding: 20px;">
                          <span>Cost of Manual Tax</span>
                          <strong id="trTotalTaxs">₦0</strong>
                      </div>
                 </div>

                 <div id="tr-sales-table-wrapper" class="en-table-wrapper-clean">
                     <div class="en-table-header-container">
                          <table class="en-data-table en-header-table">
                              <thead>
                                  <tr>
                                      <th>S/N</th>
                                      <th style="width: 160px;">Date & Time</th>
                                      <th>Tax Title</th>
                                      <th>Description</th>
                                      <th>Amount (₦)</th>
                                      <th style="text-align:right;">Action</th>
                                  </tr>
                              </thead>
                          </table>
                     </div>
                     <div class="en-table-body-container" id="trTableBodyContainer">
                          <table class="en-data-table en-body-table">
                              <tbody id="trTableBody">
                              </tbody>
                          </table>
                     </div>
                 </div>
            </div>

            <button class="wide-add-btn" onclick="openAddTaxModal()" style="margin-top: auto; margin-bottom: 20px; align-self: center; flex-shrink: 0;">Add New Tax</button>
        </div>

        <!-- Inner Add Tax Modal -->
        <div class="admin-modal-overlay" id="trAddTaxModal">
            <div class="admin-modal-content">
                <div class="admin-modal-header">
                    <h3>Add New Tax</h3>
                    <button class="admin-modal-close" onclick="closeAddTaxModal()">✕</button>
                </div>
                <div class="admin-modal-body">
                    <div class="en-form-group" style="margin-bottom: 20px;">
                        <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #64748b; margin-bottom: 8px; text-transform: uppercase;">Tax Title</label>
                        <input type="text" id="trNewTitle" placeholder="e.g. VAT, Income Tax" style="width: 100%; padding: 14px 18px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 1rem; outline: none; background: #f8fafc; font-family: inherit;">
                    </div>
                    <div class="en-form-group" style="margin-bottom: 20px;">
                        <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #64748b; margin-bottom: 8px; text-transform: uppercase;">Tax Description</label>
                        <textarea id="trNewDesc" placeholder="Enter tax details..." style="width: 100%; padding: 14px 18px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 1rem; outline: none; background: #f8fafc; font-family: inherit; resize: vertical; min-height:80px;"></textarea>
                    </div>
                    <div class="en-form-group" style="margin-bottom: 24px;">
                        <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #64748b; margin-bottom: 8px; text-transform: uppercase;">Amount (₦)</label>
                        <input type="number" id="trNewAmount" placeholder="e.g. 15000" style="width: 100%; padding: 14px 18px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 1rem; outline: none; background: #f8fafc; font-family: inherit;">
                    </div>
                    <button class="admin-modern-btn primary" onclick="saveNewTax()">Save Tax</button>
                </div>
            </div>
        </div>

        <!-- Inner Date Selector Modal -->
        <div id="trDateModal" class="admin-modal-overlay">
            <div class="admin-modal-content">
                <div class="admin-modal-header">
                    <h3 id="trDateModalTitle">Select Month</h3>
                    <button class="admin-modal-close" onclick="closeTrDateModal()">✕</button>
                </div>
                <div class="admin-modal-body selections-container" style="padding: 0; display:flex; height: 350px; overflow:hidden;">
                    <div id="trMonthCol" class="selection-column" style="flex:1; width: 100%; overflow-y:auto; padding: 10px;"></div>
                    <div id="trYearCol" class="selection-column" style="flex:1; width: 100%; overflow-y:auto; display:none; padding: 10px;"></div>
                </div>
            </div>
        </div>
        `;

        const container = document.createElement('div');
        container.id = 'Tax-records-container';
        container.innerHTML = html;
        document.getElementById('modal-container').appendChild(container);
        
        // Set the month & year text dynamically
        document.getElementById('trSelMonth').textContent = FULL_MONTHS_TR[window.currentTrMonthIdx];
        document.getElementById('trSelYear').textContent = window.currentTrYear;
        
        openTaxRecordsPage();
    } catch(err) {
        console.error("Error creating Tax records HTML:", err);
        if(typeof customAlert === 'function') customAlert("Failed to load notebook UI: " + err.message);
    }
}

window.openTaxRecords = function() {
    initTaxRecords();
}

function openTaxRecordsPage() {
    const page = document.getElementById('TaxRecordsPage');
    if (page) {
        page.style.display = 'flex';
        document.body.classList.add('modal-open');
        renderTaxs();
    }
}

window.trCurrentSort = 'newest';

window.toggleTrSortDropdown = function(e) {
    if (e) e.stopPropagation();
    const dropdown = document.getElementById('trSortDropdown');
    dropdown.classList.toggle('show');
}

window.selectTrSort = function(sortType, element) {
    window.trCurrentSort = sortType;
    document.querySelectorAll('#trSortDropdown .sort-option').forEach(opt => opt.classList.remove('active'));
    element.classList.add('active');
    
    const textMap = {
        'newest': 'Newest to Oldest',
        'oldest': 'Oldest to Newest',
        'highest': 'Highest to Lowest',
        'lowest': 'Lowest to Highest'
    };
    document.getElementById('trSortText').textContent = textMap[sortType];
    
    document.getElementById('trSortDropdown').classList.remove('show');
    renderTaxs();
}

document.addEventListener('click', function(e) {
    const trSortContainer = document.getElementById('trSortContainer');
    if (trSortContainer && !trSortContainer.contains(e.target)) {
        document.getElementById('trSortDropdown')?.classList.remove('show');
    }
});

window.closeTaxRecords = function() {
    const page = document.getElementById('TaxRecordsPage');
    if (page) {
        page.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
    if (typeof window.clearAdminModalPersistence === 'function') window.clearAdminModalPersistence();
}

window.openTrDateModal = function(type) {
    const modal = document.getElementById('trDateModal');
    const mCol = document.getElementById('trMonthCol');
    const yCol = document.getElementById('trYearCol');
    const title = document.getElementById('trDateModalTitle');
    
    mCol.innerHTML = '';
    yCol.innerHTML = '';
    
    if (type === 'month') {
        title.textContent = 'Select Month';
        mCol.style.display = 'block';
        yCol.style.display = 'none';
        
        const now = new Date();
        FULL_MONTHS_TR.forEach((m, i) => {
            const div = document.createElement('div');
            div.className = 'en-selection-item ' + (i === window.currentTrMonthIdx ? 'selected' : '');
            if (window.currentTrYear === now.getFullYear() && i > now.getMonth()) {
                div.classList.add('disabled');
            } else {
                div.onclick = () => {
                    window.currentTrMonthIdx = i;
                    document.getElementById('trSelMonth').textContent = FULL_MONTHS_TR[i];
                    closeTrDateModal();
                    renderTaxs();
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
            div.className = 'en-selection-item ' + (y === window.currentTrYear ? 'selected' : '');
            div.onclick = () => {
                window.currentTrYear = y;
                // Avoid future months if current year changes
                if (y === now.getFullYear() && window.currentTrMonthIdx > now.getMonth()) {
                    window.currentTrMonthIdx = now.getMonth();
                    document.getElementById('trSelMonth').textContent = FULL_MONTHS_TR[window.currentTrMonthIdx];
                }
                document.getElementById('trSelYear').textContent = y;
                closeTrDateModal();
                renderTaxs();
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

window.closeTrDateModal = function() {
    const modal = document.getElementById('trDateModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    }
}

window.openAddTaxModal = function() {
    const titleEl = document.getElementById('trNewTitle');
    const descEl = document.getElementById('trNewDesc');
    const amountEl = document.getElementById('trNewAmount');
    if(titleEl) titleEl.value = '';
    if(descEl) descEl.value = '';
    if(amountEl) amountEl.value = '';
    
    const modal = document.getElementById('trAddTaxModal');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    }
}

window.closeAddTaxModal = function() {
    const modal = document.getElementById('trAddTaxModal');
    if(modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    }
}

window.saveNewTax = function() {
    const title = document.getElementById('trNewTitle').value.trim();
    const desc = document.getElementById('trNewDesc').value.trim();
    const amountVal = parseFloat(document.getElementById('trNewAmount').value);

    if (!title || isNaN(amountVal) || amountVal <= 0) {
        if(typeof customAlert === 'function') customAlert("Please enter a valid title and amount.");
        else alert("Please enter a valid title and amount.");
        return;
    }

    const now = new Date();
    const day = now.getDate();
    const month = SHORT_MONTHS_TR[now.getMonth()];
    const year = now.getFullYear();
    let hours = now.getHours();
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    const mins = String(now.getMinutes()).padStart(2, '0');
    
    const dateStr = `${day} ${month}, ${year} · ${hours}:${mins} ${ampm}`;

    const newTax = {
        id: 'exp_' + Date.now(),
        title: title,
        desc: desc,
        amount: amountVal,
        dateStr: dateStr,
        timestamp: now.toISOString(),
        year: year,
        monthIdx: now.getMonth()
    };

    let Taxs = JSON.parse(localStorage.getItem('nd_Tax_records') || '[]');
    Taxs.push(newTax);
    localStorage.setItem('nd_Tax_records', JSON.stringify(Taxs));

    closeAddTaxModal();
    renderTaxs();
}

window.deleteTax = function(id) {
    if(typeof customConfirm === 'function') {
        customConfirm("Are you sure you want to delete this Tax?").then(confirmed => {
            if(confirmed) {
                let Taxs = JSON.parse(localStorage.getItem('nd_Tax_records') || '[]');
                Taxs = Taxs.filter(e => e.id !== id);
                localStorage.setItem('nd_Tax_records', JSON.stringify(Taxs));
                renderTaxs();
            }
        });
    } else {
        if(confirm("Are you sure you want to delete this Tax?")) {
            let Taxs = JSON.parse(localStorage.getItem('nd_Tax_records') || '[]');
            Taxs = Taxs.filter(e => e.id !== id);
            localStorage.setItem('nd_Tax_records', JSON.stringify(Taxs));
            renderTaxs();
        }
    }
}

window.renderTaxs = function() {
    const tbody = document.getElementById('trTableBody');
    if (!tbody) return;

    const searchEl = document.getElementById('trSearchInput');
    const searchInput = searchEl ? searchEl.value.toLowerCase() : '';
    
    let targetYear = window.currentTrYear;
    let targetMonthIdx = window.currentTrMonthIdx; 

    let Taxs = JSON.parse(localStorage.getItem('nd_Tax_records') || '[]');
    let totalTaxs = 0;
    // Initial sort is not needed here as filteredList will be sorted later based on trCurrentSort
    // Taxs.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));

    let filteredList = [];
    Taxs.forEach(exp => {
        let matchesMonth = true;
        if(targetYear !== null && targetMonthIdx !== null) {
            if(exp.year !== targetYear || exp.monthIdx !== targetMonthIdx) {
                matchesMonth = false;
            }
        }

        if(matchesMonth) {
            totalTaxs += exp.amount;
            // Searching everything
            const searchStr = `${exp.title} ${exp.amount} ${exp.dateStr}`.toLowerCase();
            if(!searchInput || searchStr.includes(searchInput)) {
                filteredList.push(exp);
            }
        }
    });

    if (window.trCurrentSort === 'newest') {
        filteredList.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    } else if (window.trCurrentSort === 'oldest') {
        filteredList.sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
    } else if (window.trCurrentSort === 'highest') {
        filteredList.sort((a,b) => b.amount - a.amount);
    } else if (window.trCurrentSort === 'lowest') {
        filteredList.sort((a,b) => a.amount - b.amount);
    }

    if (filteredList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 30px; color: #94a3b8;">No Taxs found.</td></tr>`;
    } else {
        tbody.innerHTML = filteredList.map((exp, idx) => `
            <tr>
                <td>${idx + 1}</td>
                <td style="color: #64748b; font-size: 0.85rem;">${exp.dateStr}</td>
                <td style="font-weight: 700; color: #1e293b;">${exp.title}</td>
                <td style="color: #475569; font-size: 0.9rem; white-space: normal; line-height: 1.4;">${exp.desc || '-'}</td>
                <td style="font-weight: 700; color: #8b5cf6;">₦${exp.amount.toLocaleString()}</td>
                <td style="text-align:right;">
                    <button class="en-delete-btn" onclick="deleteTax('${exp.id}')">Delete</button>
                </td>
            </tr>
        `).join('');
    }

    const expTot = document.getElementById('trTotalTaxs');
    if(expTot) expTot.textContent = '₦' + totalTaxs.toLocaleString();
    
    // Auto Tax Calculation from Profit
    let targetShortMonth = SHORT_MONTHS_TR[targetMonthIdx];
    let products = JSON.parse(localStorage.getItem('nd_products_data') || '[]');
    let totalRestock = 0;
    products.forEach(p => {
        if (p.isDeleted || p.addedViaProductTab) return;
        
        if (p.topUpHistory && p.topUpHistory.length > 0) {
            p.topUpHistory.forEach(th => {
                if (!th.date || !th.cost) return;
                const d = new Date(th.date);
                if (d.getMonth() === targetMonthIdx && d.getFullYear() === targetYear) {
                    totalRestock += (parseFloat(th.cost) || 0);
                }
            });
        } else {
            // Fallback for older products without topUpHistory
            const d = p.dateAdded ? new Date(p.dateAdded) : null;
            let isMatch = false;
            if (!d) {
                if (targetMonthIdx === new Date().getMonth() && targetYear === new Date().getFullYear()) isMatch = true;
            } else if (d.getMonth() === targetMonthIdx && d.getFullYear() === targetYear) {
                isMatch = true;
            }
            if (isMatch) totalRestock += (parseFloat(p.purchaseCost) || parseFloat(p.cost) || 0);
        }
    });

    let totalRevenue = 0;
    try {
        let allSales = JSON.parse(localStorage.getItem('nd_sales_history') || '[]');
        allSales.forEach(s => {
            const dParts = s.date.split(' ');
            if (dParts.length >= 3 && dParts[1].replace(',','') === targetShortMonth && dParts[2] == targetYear) {
                totalRevenue += (parseFloat(s.price) || ((s.qty || 1) * (s.unitPrice || 0)));
            }
        });
    } catch(e) {}
    
    let netProfit = totalRevenue - totalRestock;
    let taxPercent = 0;
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
        if(taxAlloc && parseFloat(taxAlloc.percent) > 0) {
            taxPercent = parseFloat(taxAlloc.percent);
        }
    } catch(e) {}
    
    let autoTax = 0;
    if(netProfit > 0 && taxPercent > 0) {
        autoTax = (taxPercent / 100) * netProfit;
    }
    
    const autoTaxEl = document.getElementById('trTotalAutoTax');
    const autoTaxPercEl = document.getElementById('autoTaxPerc');
    if(autoTaxEl) autoTaxEl.textContent = '₦' + autoTax.toLocaleString(undefined, {maximumFractionDigits: 2});
    if(autoTaxPercEl) autoTaxPercEl.textContent = taxPercent + '%';
}




