function initDeleteSales() {
    const page = document.getElementById('deleteSalesPage');
    if (!page || page._initDone) return;
    page._initDone = true;

    const closeBtn = document.getElementById('closeDeleteSalesBtn');
    const gateway = document.getElementById('dsPasscodeGateway');
    const passInputs = document.querySelectorAll('.ds-pass-char');
    const errorMsg = document.getElementById('dsPassError');
    const cancelBtn = document.getElementById('dsPassCancel');
    
    // UI Elements
    const listContainer = document.getElementById('dsItemsList');
    const prevDayBtn = document.getElementById('dsPrevDayBtn');
    const nextDayBtn = document.getElementById('dsNextDayBtn');
    const dateDisplay = document.getElementById('dsDateDisplay');
    const totalBalanceEl = document.getElementById('dsTotalBalance');
    const totalPayoutEl = document.getElementById('dsTotalPayout');
    const searchInput = document.getElementById('dsSearchInput');
    const sortToggle = document.getElementById('dsSortToggle');
    const sortMenu = document.getElementById('dsSortMenu');
    const sortText = document.getElementById('dsSortText');
    const sortOptions = document.querySelectorAll('.ds-sort-option');
    
    // Month Summary UI Elements
    const monthTotalBalanceEl = document.getElementById('dsMonthTotalBalance');
    const monthTotalPayoutEl = document.getElementById('dsMonthTotalPayout');
    
    // Day Picker UI Elements
    const dayPickerModal = document.getElementById('dsDayPickerModal');
    const dayPickerGrid = document.getElementById('dsDayPickerGrid');
    const closeDayPickerBtn = document.getElementById('dsCloseDayPickerBtn');
    
    // State
    const PASSCODE = localStorage.getItem('nd_delete_pin') || '1234';
    let currentDate = new Date(); // Start at today
    let currentSearch = '';
    let currentSort = 'newest';
    
    // Delete target
    let deleteTargetIndex = -1; 
    const confirmModal = document.getElementById('dsConfirmModal');

    // -- Authentication --
    function checkPasscode() {
        const entered = Array.from(passInputs).map(inp => inp.value).join('');
        if (entered.length === 4) {
            if (entered === PASSCODE) {
                errorMsg.textContent = '';
                gateway.style.display = 'none';
                renderSalesList();
            } else {
                errorMsg.textContent = 'Incorrect passcode';
                passInputs.forEach(i => i.value = '');
                passInputs[0].focus();
            }
        }
    }

    passInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            const val = e.target.value;
            if (!/^[0-9]$/.test(val)) {
                e.target.value = '';
                return;
            }
            if (index < passInputs.length - 1) {
                passInputs[index + 1].focus();
            }
            checkPasscode();
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                passInputs[index - 1].focus();
            }
        });
    });

    cancelBtn.addEventListener('click', closeDeleteSales);

    // -- Date Helpers --
    function normalizeDate(date) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }
    
    function parseSaleDate(dateStr) {
        // e.g. "26 Feb, 2026 · 3:45 pm" -> "26 Feb 2026"
        const cleanStr = dateStr.replace('·', '').trim();
        const d = new Date(cleanStr);
        if (isNaN(d.getTime())) return new Date(); // Fallback
        return normalizeDate(d);
    }

    function formatDisplayDate(date) {
        const today = normalizeDate(new Date());
        const selected = normalizeDate(date);
        
        if (today.getTime() === selected.getTime()) {
            return `Today`;
        }
        
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return `${date.getDate()}, ${days[date.getDay()]}`;
    }

    function isSameDay(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }

    // -- Day Navigation --
    function updateDateBounds() {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        dateDisplay.innerHTML = `
            ${formatDisplayDate(currentDate)}
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:4px;"><path d="m6 9 6 6 6-6"/></svg>
        `;
        
        // Prevent going backward before the 1st of current month
        if (normalizeDate(currentDate) <= normalizeDate(firstDayOfMonth)) {
            prevDayBtn.disabled = true;
        } else {
            prevDayBtn.disabled = false;
        }
        
        // Prevent going forward beyond today
        if (normalizeDate(currentDate) >= normalizeDate(now)) {
            nextDayBtn.disabled = true;
        } else {
            nextDayBtn.disabled = false;
        }
    }

    prevDayBtn.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() - 1);
        updateDateBounds();
        renderSalesList();
    });

    nextDayBtn.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() + 1);
        updateDateBounds();
        renderSalesList();
    });

    // -- Day Picker Modal Logic --
    dateDisplay.addEventListener('click', () => {
        populateDayPicker();
        dayPickerModal.style.display = 'flex';
    });

    closeDayPickerBtn.addEventListener('click', () => {
        dayPickerModal.style.display = 'none';
    });

    function populateDayPicker() {
        dayPickerGrid.innerHTML = '';
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const currentMonthFirstDay = new Date(now.getFullYear(), now.getMonth(), 1);

        for (let i = 1; i <= daysInMonth; i++) {
            const btn = document.createElement('button');
            btn.className = 'ds-day-btn';
            btn.textContent = i;
            
            const iterDate = new Date(now.getFullYear(), now.getMonth(), i);
            
            // Highlight selected day
            if (isSameDay(iterDate, currentDate)) {
                btn.classList.add('active');
            }
            
            // Disable future days past today
            if (normalizeDate(iterDate) > normalizeDate(now)) {
                btn.style.opacity = '0.3';
                btn.style.cursor = 'not-allowed';
            } else {
                btn.addEventListener('click', () => {
                    currentDate = iterDate;
                    updateDateBounds();
                    renderSalesList();
                    dayPickerModal.style.display = 'none';
                });
            }
            
            dayPickerGrid.appendChild(btn);
        }
    }

    // -- Search & Sort --
    searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value.toLowerCase().trim();
        renderSalesList();
    });
    
    // Custom Sort Dropdown Logic
    sortToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        sortMenu.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
        if (!sortToggle.contains(e.target) && !sortMenu.contains(e.target)) {
            sortMenu.classList.remove('show');
        }
    });

    sortOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            // Update active state
            sortOptions.forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            
            // Update text and value
            currentSort = opt.getAttribute('data-val');
            sortText.textContent = opt.textContent.split('to')[0].trim();
            
            sortMenu.classList.remove('show');
            renderSalesList();
        });
    });

    // -- Render System --
    function formatCurrency(num) {
        return Math.round(Number(num)).toLocaleString('en-NG');
    }

    function renderSalesList() {
        let allSales = [];
        try {
            allSales = JSON.parse(localStorage.getItem('nd_sales_history') || '[]');
        } catch(e) {}
        
        if (allSales.length === 0 && typeof sampleData !== 'undefined' && sampleData.length > 0) {
            allSales = sampleData; 
        }

        // Map sales to index so deletion removes correct global item even after sorting
        const mappedSales = allSales.map((sale, originalIndex) => ({
            ...sale,
            originalIndex,
            parsedDateObj: parseSaleDate(sale.date), // for day comparison
            realDateObj: new Date(sale.date.replace('·', '').trim() || new Date()), // for sorting newest/oldest
            totalCalc: sale.isFlexible ? (parseFloat(sale.unitPrice) || 0) : (parseFloat(sale.qty) || 1) * (parseFloat(sale.unitPrice) || 0)
        }));

        // Determine current month bounds
        const now = new Date();
        const currentMonthSales = mappedSales.filter(s => 
            s.parsedDateObj.getMonth() === now.getMonth() && 
            s.parsedDateObj.getFullYear() === now.getFullYear()
        );

        // 1. Calculate Monthly Summary
        const monthTotalSales = currentMonthSales.reduce((acc, curr) => acc + curr.totalCalc, 0);
        const monthTotalPayout = currentMonthSales.reduce((acc, curr) => acc + (curr.payout || 0), 0);
        
        if (monthTotalBalanceEl) monthTotalBalanceEl.textContent = '₦' + formatCurrency(monthTotalSales);
        if (monthTotalPayoutEl) monthTotalPayoutEl.textContent = '₦' + formatCurrency(monthTotalPayout);

        // 2. Filter by Current Selected Day
        let daySales = mappedSales.filter(s => isSameDay(s.parsedDateObj, currentDate));

        // Update real-time balance metrics for the specific day BEFORE search filter is applied
        const dayTotalSales = daySales.reduce((acc, curr) => acc + curr.totalCalc, 0);
        const dayTotalPayout = daySales.reduce((acc, curr) => acc + (curr.payout || 0), 0);
        
        totalBalanceEl.textContent = '₦' + formatCurrency(dayTotalSales);
        totalPayoutEl.textContent = '₦' + formatCurrency(dayTotalPayout);

        // 2. Filter by Search
        if (currentSearch) {
            daySales = daySales.filter(s => 
                (s.item && s.item.toLowerCase().includes(currentSearch)) || 
                (s.customerName && s.customerName.toLowerCase().includes(currentSearch))
            );
        }

        // 3. Sort
        if (currentSort === 'newest') {
            daySales.sort((a, b) => b.realDateObj - a.realDateObj);
        } else if (currentSort === 'oldest') {
            daySales.sort((a, b) => a.realDateObj - b.realDateObj);
        } else if (currentSort === 'high') {
            daySales.sort((a, b) => b.totalCalc - a.totalCalc);
        } else if (currentSort === 'low') {
            daySales.sort((a, b) => a.totalCalc - b.totalCalc);
        }

        listContainer.innerHTML = '';

        if (daySales.length === 0) {
            listContainer.innerHTML = `
                <div class="ds-empty-state">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="m9 16 2 2 4-4"/></svg>
                    <h3>No Records</h3>
                    <div style="font-size:0.8rem; margin-top:8px;">No sales found for this day matching filters.</div>
                </div>
            `;
            return;
        }

        // Render Cards
        daySales.forEach(sale => {
            const isUserSource = sale.type === 'Request';
            const userBadge = isUserSource ? '<span class="ds-badge-user">USER</span>' : '';
            
            const itemDiv = document.createElement('div');
            itemDiv.className = 'ds-item';
            
            itemDiv.innerHTML = `
                <div class="ds-item-info">
                    <div class="ds-item-title">
                        ${sale.item}
                        ${userBadge}
                    </div>
                    <div class="ds-item-meta">${sale.date.split('·')[1] || sale.date}</div>
                    <div class="ds-item-meta" style="margin-top: 4px;">${sale.qty} × ₦${formatCurrency(Number(sale.unitPrice))}</div>
                </div>
                <div class="ds-item-action-area">
                    <div class="ds-item-price">₦${formatCurrency(sale.totalCalc)}</div>
                    <button class="ds-delete-btn" data-index="${sale.originalIndex}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                        Delete
                    </button>
                </div>
            `;
            
            listContainer.appendChild(itemDiv);
        });

        // Delete Confirm Triggers
        document.querySelectorAll('.ds-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                deleteTargetIndex = parseInt(e.currentTarget.getAttribute('data-index'));
                
                // Set modal text
                const saleData = allSales[deleteTargetIndex];
                document.getElementById('dsConfirmMsgText').innerHTML = `
                    Are you sure you want to delete this sale?<br><br>
                    <strong>Item:</strong> ${saleData.item}<br>
                    <strong>Price:</strong> ₦${formatCurrency(saleData.isFlexible ? (parseFloat(saleData.unitPrice) || 0) : (parseFloat(saleData.qty) || 1) * (parseFloat(saleData.unitPrice) || 0))}
                `;
                
                // Show modal
                confirmModal.style.display = 'flex';
            });
        });
    }

    // Modal Actions
    document.getElementById('dsCancelDeleteBtn').addEventListener('click', () => {
        confirmModal.style.display = 'none';
        deleteTargetIndex = -1;
    });

    document.getElementById('dsExecuteDeleteBtn').addEventListener('click', () => {
        if (deleteTargetIndex > -1) {
            executeDeletion(deleteTargetIndex);
            confirmModal.style.display = 'none';
            deleteTargetIndex = -1;
        }
    });

    function executeDeletion(index) {
        let salesData = [];
        try {
            salesData = JSON.parse(localStorage.getItem('nd_sales_history') || '[]');
        } catch(e) {}
        
        if (salesData.length === 0 && typeof sampleData !== 'undefined') {
            salesData = sampleData; // sync if needed
        }

        salesData.splice(index, 1);
        
        // Save back
        localStorage.setItem('nd_sales_history', JSON.stringify(salesData));
        
        // Sync global mem if exists
        if (typeof sampleData !== 'undefined') {
            sampleData.length = 0;
            salesData.forEach(s => sampleData.push(s));
        }
        
        // Refresh UI
        renderSalesList();
        
        // Push notification/Refresh main Salesbook if open
        if (typeof renderSalesTable === 'function') {
            applyFiltersAndSort(); // Triggers global sales table refresh
        }
    }

    closeBtn.addEventListener('click', closeDeleteSales);
}

function openDeleteSales() {
    fetch('menu-buttons/delete-sales/delete-sales.html')
        .then(res => res.text())
        .then(html => {
            const container = document.getElementById('modal-container');
            container.innerHTML = html;
            
            const page = document.getElementById('deleteSalesPage');
            if(page) {
                initDeleteSales();
                
                // Reset Passcode Gateway
                const gateway = document.getElementById('dsPasscodeGateway');
                if(gateway) gateway.style.display = 'flex';
                const err = document.getElementById('dsPassError');
                if(err) err.textContent = '';
                const inputs = document.querySelectorAll('.ds-pass-char');
                inputs.forEach(i => i.value = '');
                
                page.style.display = 'flex';
                // Force reflow
                void page.offsetWidth;
                page.classList.add('show');
                
                setTimeout(() => {
                    if(inputs.length > 0) inputs[0].focus();
                }, 350);
            }
        });
}

function closeDeleteSales() {
    const page = document.getElementById('deleteSalesPage');
    if (page) {
        page.classList.remove('show');
        setTimeout(() => {
            page.style.display = 'none';
        }, 300);
    }
}
