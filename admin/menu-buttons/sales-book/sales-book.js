// sales-book.js — Full-Page (Register-Style)

function openSalesBook() {
    // If the page element already exists, just show it
    if (document.getElementById('salesBookPage')) {
        openSalesBookPage();
        return;
    }

    // Create wrapper and inject
    try {
        const wrapper = document.createElement('div');
        wrapper.id = 'salesBookModalWrapper';
        document.getElementById('modal-container').appendChild(wrapper);

        // Add CSS if not present
        if (!document.getElementById('salesBookStyles')) {
            const style = document.createElement('link');
            style.id = 'salesBookStyles';
            style.rel = 'stylesheet';
            style.href = 'menu-buttons/sales-book/sales-book.css';
            document.head.appendChild(style);
        }

        // Fetch and inject the HTML
        fetch('menu-buttons/sales-book/sales-book.html')
            .then(response => {
                if (!response.ok) throw new Error('Failed to load sales book view');
                return response.text();
            })
            .then(html => {
                wrapper.innerHTML = html;
                initSalesBook();
                openSalesBookPage();
            })
            .catch(err => {
                console.error('Error opening Sales Book:', err);
                wrapper.remove();
                if (typeof customAlert === 'function') customAlert('Error opening Sales Book');
            });
    } catch(err) {
        console.error('Error creating Sales Book:', err);
        if (typeof customAlert === 'function') customAlert('Failed to load Sales Book: ' + err.message);
    }
}

function openSalesBookPage() {
    const page = document.getElementById('salesBookPage');
    if (page) {
        page.style.display = 'flex';
        document.body.classList.add('modal-open');

        // Refresh data on every open
        const savedData = localStorage.getItem('nd_sales_history');
        if (savedData) {
            try {
                sbSalesData = JSON.parse(savedData);
            } catch(e) { console.error('Error parsing sales history', e); }
        }
        renderSalesBook();
    }
}

function closeSalesBook() {
    const page = document.getElementById('salesBookPage');
    if (page) {
        page.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
    // Clear modal persistence so refresh doesn't reopen this
    if (typeof window.clearAdminModalPersistence === 'function') {
        window.clearAdminModalPersistence();
    }
}

// Global scope logic for Sales Book
let sbSearchTerm = '';
let sbSortDir = 'newest'; // 'newest', 'oldest', 'highest', 'lowest'
let sbSalesData = [];

// Custom Date State
const sbToday = new Date();
let sbSelectedYear = sbToday.getFullYear();
let sbSelectedMonth = sbToday.getMonth();
let sbSelectedDay = sbToday.getDate();

const sbMonthsArray = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const sbFullMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function initSalesBook() {
    // Load Data
    const savedData = localStorage.getItem('nd_sales_history');
    if (savedData) {
        try {
            sbSalesData = JSON.parse(savedData);
        } catch(e) { console.error('Error parsing sales history', e); }
    }

    // Search listener
    const searchInput = document.getElementById('sbSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            sbSearchTerm = e.target.value.toLowerCase();
            renderSalesBook();
        });
    }

    // Initial render
    updateSbDateDisplay();
    setupSbSortDropdown();
    
    // Sync table scroll
    const sbBody = document.getElementById('sbTableBodyContainer');
    const sbHeader = document.querySelector('.sb-table-header-container');
    if (sbBody && sbHeader) {
        sbBody.addEventListener('scroll', () => {
            sbHeader.scrollLeft = sbBody.scrollLeft;
        });
    }
}

function setupSbSortDropdown() {
    const toggle = document.getElementById('sbSortToggle');
    const dropdown = document.getElementById('sbSortDropdown');
    const sortText = document.getElementById('sbSortText');
    
    if (!toggle || !dropdown) return;

    const options = dropdown.querySelectorAll('.sort-option');

    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
        if (!toggle.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('show');
        }
    });

    options.forEach(opt => {
        opt.addEventListener('click', () => {
            options.forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            
            sbSortDir = opt.getAttribute('data-sort');
            // Clean text (remove checkmark character if it gets picked up)
            sortText.textContent = opt.textContent; 
            dropdown.classList.remove('show');
            
            renderSalesBook();
        });
    });
}

function updateSbDateDisplay() {
    const dayDisp = document.getElementById('sbDayDisp');
    const monthDisp = document.getElementById('sbMonthDisp');
    const yearDisp = document.getElementById('sbYearDisp');
    const nextBtn = document.getElementById('sbDateNextBtn');

    if (dayDisp) dayDisp.textContent = sbSelectedDay < 10 ? '0' + sbSelectedDay : sbSelectedDay;
    if (monthDisp) {
        monthDisp.innerHTML = `
            <span class="month-full">${sbFullMonths[sbSelectedMonth]}</span>
            <span class="month-short">${sbMonthsArray[sbSelectedMonth]}</span>
        `;
    }
    if (yearDisp) yearDisp.textContent = sbSelectedYear;

    if (nextBtn) {
        const isToday = (sbSelectedYear === sbToday.getFullYear() && sbSelectedMonth === sbToday.getMonth() && sbSelectedDay === sbToday.getDate());
        if (isToday) {
            nextBtn.style.opacity = '0.3';
            nextBtn.disabled = true;
        } else {
            nextBtn.style.opacity = '1';
            nextBtn.disabled = false;
        }
    }

    renderSalesBook();
}

function sbChangeDate(change) {
    let d = new Date(sbSelectedYear, sbSelectedMonth, sbSelectedDay);
    d.setDate(d.getDate() + change);
    if (change > 0 && d > sbToday) return; // Guard future
    if (d.getFullYear() < 2000) return;

    sbSelectedYear = d.getFullYear();
    sbSelectedMonth = d.getMonth();
    sbSelectedDay = d.getDate();
    updateSbDateDisplay();
}

function openSbDateModal(type) {
    // Create a standalone date modal for the Sales Book (does NOT depend on Register's selectionModal)
    let modal = document.getElementById('sbDateSelModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'sbDateSelModal';
        modal.className = 'admin-modal-overlay';
        modal.style.zIndex = '100050';
        modal.innerHTML = `
            <div class="admin-modal-content">
                <div class="admin-modal-header">
                    <h3 id="sbDateSelTitle">Select</h3>
                    <button class="admin-modal-close" onclick="closeSbDateSelModal()">✕</button>
                </div>
                <div class="admin-modal-body selections-container" style="padding: 0; height: 350px; overflow:hidden;">
                    <div id="sbDateSelList" class="selection-column" style="flex:1; width: 100%; overflow-y:auto; padding: 10px;"></div>
                </div>
            </div>
        `;

        document.getElementById('modal-container').appendChild(modal);
    }

    const title = document.getElementById('sbDateSelTitle');
    const list = document.getElementById('sbDateSelList');
    list.innerHTML = '';

    if (type === 'year') {
        title.textContent = 'Select Year';
        for (let y = sbToday.getFullYear(); y >= 2000; y--) {
            const item = document.createElement('div');
            item.className = 'en-selection-item' + (y === sbSelectedYear ? ' selected' : '');
            item.textContent = y;
            item.onclick = () => { sbSelectedYear = y; validateSbDate(); closeSbDateSelModal(); updateSbDateDisplay(); };
            list.appendChild(item);
        }
    } else if (type === 'month') {
        title.textContent = 'Select Month';
        const maxM = (sbSelectedYear === sbToday.getFullYear()) ? sbToday.getMonth() : 11;
        for (let m = maxM; m >= 0; m--) {
            const item = document.createElement('div');
            item.className = 'en-selection-item' + (m === sbSelectedMonth ? ' selected' : '');
            item.textContent = sbFullMonths[m];
            item.onclick = () => { sbSelectedMonth = m; validateSbDate(); closeSbDateSelModal(); updateSbDateDisplay(); };
            list.appendChild(item);
        }
    } else if (type === 'day') {
        title.textContent = 'Select Day';
        const daysInMonth = new Date(sbSelectedYear, sbSelectedMonth + 1, 0).getDate();
        let maxD = (sbSelectedYear === sbToday.getFullYear() && sbSelectedMonth === sbToday.getMonth()) ? sbToday.getDate() : daysInMonth;
        for (let d = maxD; d >= 1; d--) {
            const item = document.createElement('div');
            item.className = 'en-selection-item' + (d === sbSelectedDay ? ' selected' : '');
            item.textContent = d < 10 ? '0' + d : d;
            item.onclick = () => { sbSelectedDay = d; closeSbDateSelModal(); updateSbDateDisplay(); };
            list.appendChild(item);
        }
    }

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
}

function closeSbDateSelModal() {
    const modal = document.getElementById('sbDateSelModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    }
}

function validateSbDate() {
    if (sbSelectedYear === sbToday.getFullYear()) {
        if (sbSelectedMonth > sbToday.getMonth()) sbSelectedMonth = sbToday.getMonth();
    }
    const maxD = new Date(sbSelectedYear, sbSelectedMonth + 1, 0).getDate();
    let limitD = (sbSelectedYear === sbToday.getFullYear() && sbSelectedMonth === sbToday.getMonth()) ? sbToday.getDate() : maxD;
    if (sbSelectedDay > limitD) sbSelectedDay = limitD;
}

    // Note: toggleSbSortDirection removed since we use dropdown now

window.renderSalesBook = function renderSalesBook() {
    const titleEl = document.getElementById('sbMonthYearTitle');
    if (titleEl) titleEl.textContent = `${sbFullMonths[sbSelectedMonth]} ${sbSelectedYear}`;

    const dailyLabel = document.getElementById('sbDailyTotalLabel');
    const dStr = sbSelectedDay < 10 ? '0' + sbSelectedDay : sbSelectedDay;
    if (dailyLabel) dailyLabel.textContent = `Total for ${dStr} ${sbMonthsArray[sbSelectedMonth]}, ${sbSelectedYear}`;

    // Filter Logic
    let filtered = sbSalesData.filter(row => {
        // row.date format: "26 Feb, 2026 · 3:45 pm"
        const parts = row.date.split(' ');
        if(parts.length < 3) return false;
        
        const rowDay = parseInt(parts[0], 10);
        const rowMonthStr = parts[1].replace(',', ''); // "Feb"
        const rowYear = parseInt(parts[2], 10);

        if (rowDay !== sbSelectedDay) return false;
        if (sbMonthsArray[sbSelectedMonth] !== rowMonthStr) return false;
        if (sbSelectedYear !== rowYear) return false;

        // Search text
        if (sbSearchTerm) {
            const totalAmount = (row.price !== undefined && row.price !== null && row.price !== '') ? Number(row.price) : (Number(row.unitPrice || 0) * Number(row.qty || 1));
            const formattedAmount = formatSbCurrency(totalAmount);
            
            return row.item.toLowerCase().includes(sbSearchTerm) || 
                   row.date.toLowerCase().includes(sbSearchTerm) ||
                   row.qty.toString().includes(sbSearchTerm) ||
                   totalAmount.toString().includes(sbSearchTerm) ||
                   formattedAmount.includes(sbSearchTerm);
        }

        return true;
    });

    // Sort Logic
    filtered.sort((a, b) => {
        if (sbSortDir === 'highest' || sbSortDir === 'lowest') {
            const valA = (a.price !== undefined && a.price !== null && a.price !== '') ? Number(a.price) : (Number(a.unitPrice || 0) * Number(a.qty || 1));
            const valB = (b.price !== undefined && b.price !== null && b.price !== '') ? Number(b.price) : (Number(b.unitPrice || 0) * Number(b.qty || 1));
            return sbSortDir === 'highest' ? valB - valA : valA - valB;
        } else {
            const da = new Date(a.date.replace('·', '').trim());
            const db = new Date(b.date.replace('·', '').trim());
            return (sbSortDir === 'newest' || sbSortDir === 'desc') ? db - da : da - db;
        }
    });

    // Top Cards (Month Total)
    let monthTotalSales = 0;
    let monthTotalPayout = 0;
    sbSalesData.forEach(row => {
        const parts = row.date.split(' ');
        if(parts.length < 3) return;
        const rm = parts[1].replace(',', '');
        const ry = parseInt(parts[2], 10);
        
        if (rm === sbMonthsArray[sbSelectedMonth] && ry === sbSelectedYear) {
            const grossTotal = Number(row.unitPrice || 0) * Number(row.qty || 1);
            const tot = (row.price !== undefined && row.price !== null && row.price !== '') ? Number(row.price) : grossTotal;
            
            monthTotalSales += tot;
            if (row.type === 'Request') {
                const payoutEnabled = localStorage.getItem('nd_payout_enabled') === 'true';
                if (payoutEnabled) {
                    const rate = parseFloat(localStorage.getItem('nd_payout_rate') || 2) / 100;
                    const po = (row.payoutEarned !== undefined) ? Number(row.payoutEarned) : ((row.payout !== undefined && row.payout !== null && row.payout !== '') ? Number(row.payout) : (grossTotal * rate));
                    if (po < 0) {
                        monthTotalPayout += Math.abs(po);
                    }
                }
            }
        }
    });

    const totSalesCard = document.getElementById('sbTotalSales');
    const totPayoutCard = document.getElementById('sbTotalPayout');
    if (totSalesCard) totSalesCard.textContent = '₦' + formatSbCurrency(monthTotalSales);
    if (totPayoutCard) totPayoutCard.textContent = '₦' + formatSbCurrency(Math.max(0, monthTotalPayout));

    // Table rendering and bottom Daily total
    const tbody = document.getElementById('sbTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    let currentFilteredSales = 0;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 40px 20px; color: #94a3b8; font-size: 0.9rem;">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5" style="margin-bottom: 10px; display: block; margin-left: auto; margin-right: auto;">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            No sales found for this date.
        </td></tr>`;
    } else {
        filtered.forEach((row, i) => {
            const tot = (row.price !== undefined && row.price !== null && row.price !== '') ? Number(row.price) : (Number(row.unitPrice || 0) * Number(row.qty || 1));
            
            currentFilteredSales += tot;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${i + 1}</td>
                <td>${row.date}</td>
                <td>${row.item}</td>
                <td>${row.qty}</td>
                <td>₦${formatSbCurrency(tot)}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    const valUI = document.getElementById('sbDailyTotalValue');
    if (valUI) valUI.textContent = '₦' + formatSbCurrency(currentFilteredSales);
}

function formatSbCurrency(val) {
    return Math.round(Number(val)).toLocaleString();
}

// "Add to Sales Book" seamlessly leverages the existing active Register Logic Modal
function openSbAddModal() {
    const realRegisterModal = document.getElementById('addSaleModal');
    
    if (realRegisterModal) {
        // Force it above the Sales Book wrapper (which is z-index 9999)
        realRegisterModal.style.zIndex = '100050';
        
        // It exists! Pop it open
        realRegisterModal.classList.add('show');
        document.body.classList.add('modal-open');
        
        // Listen meticulously for when it closes, so we can freshly reload the sales book data
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class' && !realRegisterModal.classList.contains('show')) {
                    // Closed! It likely submitted its sale. Let's pull the refresh.
                    const freshData = localStorage.getItem('nd_sales_history');
                    if (freshData) {
                        try {
                            sbSalesData = JSON.parse(freshData);
                        } catch(e) {}
                    }
                    renderSalesBook();
                    
                    // Kill observer to save memory
                    observer.disconnect();
                }
            });
        });
        
        observer.observe(realRegisterModal, { attributes: true });
    } else {
        // Fallback in case Register hasn't organically loaded yet
        if (typeof customAlert === 'function') customAlert("System registering components, please try again in a moment.");
    }
}
