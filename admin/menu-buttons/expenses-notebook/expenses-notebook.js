const SHORT_MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

window.currentEnMonthIdx = new Date().getMonth();
window.currentEnYear = new Date().getFullYear();

function initExpensesNotebook() {
    if (document.getElementById('expensesNotebookPage')) {
        openExpensesNotebookPage();
        return;
    }

    try {
        const html = `
        <div class="en-page" id="expensesNotebookPage">
            <div class="en-header">
                 <button class="en-back-btn" onclick="closeExpensesNotebook()">
                     <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5"></path><path d="M12 19l-7-7 7-7"></path></svg>
                 </button>
                 <h2>Expenses Notebook</h2>
                 <button class="use-ai-btn" onclick="window._aiPageContext='expenses'; openAiChat()">Use AI</button>
            </div>
            
            <div class="en-content">
                 <div class="en-controls-section">
                     <div class="en-search-wrap">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <path d="m21 21-4.34-4.34" />
                              <circle cx="11" cy="11" r="8" />
                          </svg>
                          <input type="text" id="enSearchInput" placeholder="Search expenses everywhere..." oninput="renderExpenses()">
                     </div>
                     
                     <div class="sort-container" id="enSortContainer">
                         <div class="sort-btn" id="enSortToggle" onclick="toggleEnSortDropdown(event)">
                             <span class="sort-text" id="enSortText">Newest to Oldest</span>
                             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 4px; pointer-events: none;">
                                 <path d="M6 9l6 6 6-6" />
                             </svg>
                         </div>
                         <div class="sort-dropdown" id="enSortDropdown">
                             <div class="sort-option active" onclick="selectEnSort('newest', this)">Newest to Oldest<span class="sort-check"></span></div>
                             <div class="sort-option" onclick="selectEnSort('oldest', this)">Oldest to Newest<span class="sort-check"></span></div>
                             <div class="sort-option" onclick="selectEnSort('highest', this)">Highest to Lowest<span class="sort-check"></span></div>
                             <div class="sort-option" onclick="selectEnSort('lowest', this)">Lowest to Highest<span class="sort-check"></span></div>
                         </div>
                     </div>
                 </div>

                 <div class="en-date-triggers-wrapper" style="padding: 15px 20px 0 20px;">
                     <div class="en-date-triggers" style="display:flex; gap:10px;">
                         <div class="en-trigger-btn" onclick="openEnDateModal('month')">
                             <span id="enSelMonth" style="color: #8b5cf6; font-weight:700;">March</span>
                             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                         </div>
                         <div class="en-trigger-btn" onclick="openEnDateModal('year')">
                             <span id="enSelYear" style="color: #8b5cf6; font-weight:700;">2026</span>
                             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                         </div>
                     </div>
                 </div>

                 <div class="en-summary-card">
                      <div class="en-summary-item">
                          <span>Total Expenses</span>
                          <strong id="enTotalExpenses">₦0</strong>
                      </div>
                 </div>

                 <div id="en-sales-table-wrapper" class="en-table-wrapper-clean">
                     <div class="en-table-header-container">
                          <table class="en-data-table en-header-table">
                              <thead>
                                  <tr>
                                      <th>S/N</th>
                                      <th>Date & Time</th>
                                      <th>Expense Title</th>
                                      <th>Amount (₦)</th>
                                      <th>Action</th>
                                  </tr>
                              </thead>
                          </table>
                     </div>
                     <div class="en-table-body-container" id="enTableBodyContainer">
                          <table class="en-data-table en-body-table">
                              <tbody id="enTableBody">
                              </tbody>
                          </table>
                     </div>
                 </div>
            </div>

            <button class="wide-add-btn" onclick="openAddExpenseModal()" style="margin-top: auto; margin-bottom: 20px; align-self: center; flex-shrink: 0;">Add New Expense</button>
        </div>

        <!-- Inner Add Expense Modal -->
        <div class="admin-modal-overlay" id="enAddExpenseModal">
            <div class="admin-modal-content">
                <div class="admin-modal-header">
                    <h3>Add New Expense</h3>
                    <button class="admin-modal-close" onclick="closeAddExpenseModal()">✕</button>
                </div>
                <div class="admin-modal-body">
                    <div class="en-form-group" style="margin-bottom: 20px;">
                        <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #64748b; margin-bottom: 8px; text-transform: uppercase;">Expense Title / Description</label>
                        <input type="text" id="enNewTitle" placeholder="e.g. Fuel, Transport, Packaging" style="width: 100%; padding: 14px 18px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 1rem; outline: none; background: #f8fafc; font-family: inherit;">
                    </div>
                    <div class="en-form-group" style="margin-bottom: 24px;">
                        <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #64748b; margin-bottom: 8px; text-transform: uppercase;">Amount (₦)</label>
                        <input type="number" id="enNewAmount" placeholder="e.g. 15000" style="width: 100%; padding: 14px 18px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 1rem; outline: none; background: #f8fafc; font-family: inherit;">
                    </div>
                    <button class="admin-modern-btn primary" onclick="saveNewExpense()">Save Expense</button>
                </div>
            </div>
        </div>

        <!-- Inner Date Selector Modal -->
        <div id="enDateModal" class="admin-modal-overlay">
            <div class="admin-modal-content">
                <div class="admin-modal-header">
                    <h3 id="enDateModalTitle">Select Month</h3>
                    <button class="admin-modal-close" onclick="closeEnDateModal()">✕</button>
                </div>
                <div class="admin-modal-body selections-container" style="padding: 0; display:flex; height: 350px; overflow:hidden;">
                    <div id="enMonthCol" class="selection-column" style="flex:1; width: 100%; overflow-y:auto; padding: 10px;"></div>
                    <div id="enYearCol" class="selection-column" style="flex:1; width: 100%; overflow-y:auto; display:none; padding: 10px;"></div>
                </div>
            </div>
        </div>
        `;

        const container = document.createElement('div');
        container.id = 'expenses-notebook-container';
        container.innerHTML = html;
        document.getElementById('modal-container').appendChild(container);
        
        // Set the month & year text dynamically
        document.getElementById('enSelMonth').textContent = FULL_MONTHS_EN[window.currentEnMonthIdx];
        document.getElementById('enSelYear').textContent = window.currentEnYear;
        
        openExpensesNotebookPage();
    } catch(err) {
        console.error("Error creating expenses notebook HTML:", err);
        if(typeof customAlert === 'function') customAlert("Failed to load notebook UI: " + err.message);
    }
}

window.openExpensesNotebook = function() {
    initExpensesNotebook();
}

function openExpensesNotebookPage() {
    const page = document.getElementById('expensesNotebookPage');
    if (page) {
        page.style.display = 'flex';
        document.body.classList.add('modal-open');
        renderExpenses();
    }
}

window.enCurrentSort = 'newest';

window.toggleEnSortDropdown = function(e) {
    if (e) e.stopPropagation();
    const dropdown = document.getElementById('enSortDropdown');
    dropdown.classList.toggle('show');
}

window.selectEnSort = function(sortType, element) {
    window.enCurrentSort = sortType;
    document.querySelectorAll('#enSortDropdown .sort-option').forEach(opt => opt.classList.remove('active'));
    element.classList.add('active');
    
    const textMap = {
        'newest': 'Newest to Oldest',
        'oldest': 'Oldest to Newest',
        'highest': 'Highest to Lowest',
        'lowest': 'Lowest to Highest'
    };
    document.getElementById('enSortText').textContent = textMap[sortType];
    
    document.getElementById('enSortDropdown').classList.remove('show');
    renderExpenses();
}

document.addEventListener('click', function(e) {
    const enSortContainer = document.getElementById('enSortContainer');
    if (enSortContainer && !enSortContainer.contains(e.target)) {
        document.getElementById('enSortDropdown')?.classList.remove('show');
    }
});

window.closeExpensesNotebook = function() {
    const page = document.getElementById('expensesNotebookPage');
    if (page) {
        page.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
    if (typeof window.clearAdminModalPersistence === 'function') window.clearAdminModalPersistence();
}

window.openEnDateModal = function(type) {
    const modal = document.getElementById('enDateModal');
    const mCol = document.getElementById('enMonthCol');
    const yCol = document.getElementById('enYearCol');
    const title = document.getElementById('enDateModalTitle');
    
    mCol.innerHTML = '';
    yCol.innerHTML = '';
    
    if (type === 'month') {
        title.textContent = 'Select Month';
        mCol.style.display = 'block';
        yCol.style.display = 'none';
        
        const now = new Date();
        FULL_MONTHS_EN.forEach((m, i) => {
            const div = document.createElement('div');
            div.className = 'en-selection-item ' + (i === window.currentEnMonthIdx ? 'selected' : '');
            if (window.currentEnYear === now.getFullYear() && i > now.getMonth()) {
                div.classList.add('disabled');
            } else {
                div.onclick = () => {
                    window.currentEnMonthIdx = i;
                    document.getElementById('enSelMonth').textContent = FULL_MONTHS_EN[i];
                    closeEnDateModal();
                    renderExpenses();
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
            div.className = 'en-selection-item ' + (y === window.currentEnYear ? 'selected' : '');
            div.onclick = () => {
                window.currentEnYear = y;
                // Avoid future months if current year changes
                if (y === now.getFullYear() && window.currentEnMonthIdx > now.getMonth()) {
                    window.currentEnMonthIdx = now.getMonth();
                    document.getElementById('enSelMonth').textContent = FULL_MONTHS_EN[window.currentEnMonthIdx];
                }
                document.getElementById('enSelYear').textContent = y;
                closeEnDateModal();
                renderExpenses();
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

window.closeEnDateModal = function() {
    const modal = document.getElementById('enDateModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    }
}

window.openAddExpenseModal = function() {
    const titleEl = document.getElementById('enNewTitle');
    const amountEl = document.getElementById('enNewAmount');
    if(titleEl) titleEl.value = '';
    if(amountEl) amountEl.value = '';
    
    const modal = document.getElementById('enAddExpenseModal');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    }
}

window.closeAddExpenseModal = function() {
    const modal = document.getElementById('enAddExpenseModal');
    if(modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    }
}

window.saveNewExpense = function() {
    const title = document.getElementById('enNewTitle').value.trim();
    const amountVal = parseFloat(document.getElementById('enNewAmount').value);

    if (!title || isNaN(amountVal) || amountVal <= 0) {
        if(typeof customAlert === 'function') customAlert("Please enter a valid title and amount.");
        else alert("Please enter a valid title and amount.");
        return;
    }

    const now = new Date();
    const day = now.getDate();
    const month = SHORT_MONTHS_EN[now.getMonth()];
    const year = now.getFullYear();
    let hours = now.getHours();
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    const mins = String(now.getMinutes()).padStart(2, '0');
    
    const dateStr = `${day} ${month}, ${year} · ${hours}:${mins} ${ampm}`;

    const newExpense = {
        id: 'exp_' + Date.now(),
        title: title,
        amount: amountVal,
        dateStr: dateStr,
        timestamp: now.toISOString(),
        year: year,
        monthIdx: now.getMonth()
    };

    let expenses = JSON.parse(localStorage.getItem('nd_expenses_notebook') || '[]');
    expenses.push(newExpense);
    localStorage.setItem('nd_expenses_notebook', JSON.stringify(expenses));

    closeAddExpenseModal();
    renderExpenses();
}

window.deleteExpense = function(id) {
    if(typeof customConfirm === 'function') {
        customConfirm("Are you sure you want to delete this expense?").then(confirmed => {
            if(confirmed) {
                let expenses = JSON.parse(localStorage.getItem('nd_expenses_notebook') || '[]');
                expenses = expenses.filter(e => e.id !== id);
                localStorage.setItem('nd_expenses_notebook', JSON.stringify(expenses));
                renderExpenses();
            }
        });
    } else {
        if(confirm("Are you sure you want to delete this expense?")) {
            let expenses = JSON.parse(localStorage.getItem('nd_expenses_notebook') || '[]');
            expenses = expenses.filter(e => e.id !== id);
            localStorage.setItem('nd_expenses_notebook', JSON.stringify(expenses));
            renderExpenses();
        }
    }
}

window.renderExpenses = function() {
    const tbody = document.getElementById('enTableBody');
    if (!tbody) return;

    const searchEl = document.getElementById('enSearchInput');
    const searchInput = searchEl ? searchEl.value.toLowerCase() : '';
    
    let targetYear = window.currentEnYear;
    let targetMonthIdx = window.currentEnMonthIdx; 

    let expenses = JSON.parse(localStorage.getItem('nd_expenses_notebook') || '[]');
    let totalExpenses = 0;
    // Initial sort is not needed here as filteredList will be sorted later based on enCurrentSort
    // expenses.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));

    let filteredList = [];
    expenses.forEach(exp => {
        let matchesMonth = true;
        if(targetYear !== null && targetMonthIdx !== null) {
            if(exp.year !== targetYear || exp.monthIdx !== targetMonthIdx) {
                matchesMonth = false;
            }
        }

        if(matchesMonth) {
            totalExpenses += exp.amount;
            // Searching everything
            const searchStr = `${exp.title} ${exp.amount} ${exp.dateStr}`.toLowerCase();
            if(!searchInput || searchStr.includes(searchInput)) {
                filteredList.push(exp);
            }
        }
    });

    if (window.enCurrentSort === 'newest') {
        filteredList.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    } else if (window.enCurrentSort === 'oldest') {
        filteredList.sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
    } else if (window.enCurrentSort === 'highest') {
        filteredList.sort((a,b) => b.amount - a.amount);
    } else if (window.enCurrentSort === 'lowest') {
        filteredList.sort((a,b) => a.amount - b.amount);
    }

    if (filteredList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 30px; color: #94a3b8;">No expenses found.</td></tr>`;
    } else {
        tbody.innerHTML = filteredList.map((exp, idx) => `
            <tr>
                <td>${idx + 1}</td>
                <td>${exp.dateStr}</td>
                <td style="font-weight: 500;">${exp.title}</td>
                <td>₦${exp.amount.toLocaleString()}</td>
                <td>
                    <button class="en-delete-btn" onclick="deleteExpense('${exp.id}')">Delete</button>
                </td>
            </tr>
        `).join('');
    }

    const expTot = document.getElementById('enTotalExpenses');
    if(expTot) expTot.textContent = '₦' + totalExpenses.toLocaleString();
}




