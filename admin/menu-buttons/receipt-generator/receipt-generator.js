// Global scope state for the receipt generator
let rgSelectedItems = []; // Array of sales objects chosen for the receipt
let rgActiveDate = new Date(); // Date being viewed in the selector modal
let rgAllSales = []; // Cached sales history
let rgMode = 'customer'; // 'customer' or 'user'
let rgSelectedUser = null; // Selected registered user object

window.openReceiptGeneratorAdmin = function() {
    const container = document.getElementById('modal-container');
    if (!container) return;

    fetch('menu-buttons/receipt-generator/receipt-generator.html')
        .then(res => res.text())
        .then(html => {
            container.innerHTML = html;

            // Initialize Data
            rgAllSales = JSON.parse(localStorage.getItem('nd_sales_history') || '[]');
            rgSelectedItems = [];
            rgMode = 'user';
            rgSelectedUser = null;
            
            // Generate a random default receipt ID
            document.getElementById('rPreviewId').textContent = 'RCPT-' + Math.floor(Math.random() * 90000 + 10000);
            
            const now = new Date();
            const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            document.getElementById('rPreviewDate').textContent = dateStr;

            // Phone
            const phoneLabel = document.getElementById('rgPreviewStorePhone');
            const storedPhone = localStorage.getItem('nd_shop_owner_phone') || '';
            if (phoneLabel) phoneLabel.textContent = storedPhone ? 'Tel: ' + storedPhone : '';

            // Shop Name
            const shopName = localStorage.getItem('nd_shop_name') || '';
            const rgPreviewShopName = document.getElementById('rgPreviewShopName');
            if (rgPreviewShopName) rgPreviewShopName.textContent = shopName ? shopName.toUpperCase() + ' STORE' : '';

            updateRgPreview();

            const modal = document.getElementById('receiptGenOverlay');
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('show'), 10);
            document.body.classList.add('modal-open');
        });
}

window.closeReceiptGen = function() {
    const modal = document.getElementById('receiptGenOverlay');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
        document.body.classList.remove('modal-open');
    }
}

// -------------------------------------------------------------------
// Preview and Rendering Logic
// -------------------------------------------------------------------
window.updateRgPreview = function() {
    let cName = '--';
    let cPhone = '';
    let cEmail = '';

    if (rgMode === 'user' && rgSelectedUser) {
        // Pull from selected registered user
        cName = rgSelectedUser.name || '--';
        cPhone = rgSelectedUser.phone || '';
        cEmail = rgSelectedUser.email || '';
    } else {
        // Pull from manual input fields
        const nameEl = document.getElementById('rgCustomerName');
        const phoneEl = document.getElementById('rgCustomerPhone');
        const emailEl = document.getElementById('rgCustomerEmail');
        cName = (nameEl ? nameEl.value.trim() : '') || '--';
        cPhone = phoneEl ? phoneEl.value.trim() : '';
        cEmail = emailEl ? emailEl.value.trim() : '';
    }

    // Map customer logic
    document.getElementById('rPreviewName').textContent = cName;
    document.getElementById('rPreviewPhone').textContent = cPhone ? 'Ph: ' + cPhone : '';
    document.getElementById('rPreviewEmail').textContent = cEmail ? 'Em: ' + cEmail : '';

    const fmt = val => Number(val).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    // Config Table
    const configTbody = document.getElementById('rgSelectedTbody');
    // Preview Table
    const previewTbody = document.getElementById('rPreviewItems');

    configTbody.innerHTML = '';
    previewTbody.innerHTML = '';

    if (rgSelectedItems.length === 0) {
        configTbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #94a3b8; padding: 20px;">No items selected. Click "Select Sales" to add.</td></tr>';
        document.getElementById('rgConfigTotal').textContent = '0.00';
        document.getElementById('rPreviewGrandTotal').textContent = '0.00';
        return;
    }

    let grandTotal = 0;

    rgSelectedItems.forEach((item, index) => {
        const itemQty = parseFloat(item.qty) || 1;
        const priceVal = item.price !== undefined ? parseFloat(String(item.price).replace(/[^\d.-]/g, '')) || 0 : 0;
        const payoutVal = item.payout !== undefined ? parseFloat(String(item.payout).replace(/[^\d.-]/g, '')) || 0 : 0;
        const unitPriceVal = item.unitPrice !== undefined ? parseFloat(String(item.unitPrice).replace(/[^\d.-]/g, '')) || 0 : 0;
        
        let grossTotal = 0;
        if (payoutVal > 0) {
            // For sales with payout (e.g. request sales), price is stored as (total - payout).
            // Adding payout back restores the full gross total amount.
            grossTotal = priceVal + payoutVal;
        } else {
            // For regular sales, price is already the gross total. Fall back to unitPrice * qty if price is missing.
            grossTotal = item.price !== undefined ? priceVal : (unitPriceVal * itemQty);
        }
        
        const itemTotal = grossTotal;
        grandTotal += itemTotal;

        // Config Table Row
        const trC = document.createElement('tr');
        trC.innerHTML = `
            <td>${item.item}</td>
            <td>${item.qty}</td>
            <td style="text-align:right;">${fmt(itemTotal)}</td>
            <td style="text-align:right;">
                <button class="rg-remove-btn" onclick="removeRgItem(${index})">Remove</button>
            </td>
        `;
        configTbody.appendChild(trC);

        // Preview Table Row
        const trP = document.createElement('tr');
        trP.innerHTML = `
            <td style="padding: 8px 0;">${item.item}</td>
            <td style="padding: 8px 0; text-align: center;">${item.qty}</td>
            <td style="padding: 8px 0; text-align: right;">${fmt(itemTotal)}</td>
        `;
        previewTbody.appendChild(trP);
    });

    document.getElementById('rgConfigTotal').textContent = fmt(grandTotal);
    document.getElementById('rPreviewGrandTotal').textContent = fmt(grandTotal);
}

window.removeRgItem = function(index) {
    rgSelectedItems.splice(index, 1);
    updateRgPreview();
}

// -------------------------------------------------------------------
// Selection Modal Logic
// -------------------------------------------------------------------

window.openRgSaleModal = function() {
    rgAllSales = JSON.parse(localStorage.getItem('nd_sales_history') || '[]');
    // Default: filter by user if one is selected
    if (rgMode === 'user' && rgSelectedUser) {
        window._rgFilterByUser = true;
    } else {
        window._rgFilterByUser = false;
    }
    const modal = document.getElementById('rgSelectSalesModal');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
        renderRgSaleList();
    }
}

window.closeRgSaleModal = function() {
    const modal = document.getElementById('rgSelectSalesModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    }
}

window.changeRgDate = function(change) {
    rgActiveDate.setDate(rgActiveDate.getDate() + change);
    // Guard future
    if (rgActiveDate > new Date()) rgActiveDate = new Date();
    renderRgSaleList();
}

window.resetRgDateToToday = function() {
    rgActiveDate = new Date();
    renderRgSaleList();
}

let rgTempYear, rgTempMonth, rgTempDay;

window.openRgCustomDatePicker = function() {
    rgTempYear = rgActiveDate.getFullYear();
    rgTempMonth = rgActiveDate.getMonth();
    rgTempDay = rgActiveDate.getDate();
    
    const modal = document.getElementById('rgCustomDatePickerModal');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
        renderRgCustomPickerColumns();
    }
}

window.closeRgCustomDatePicker = function() {
    const modal = document.getElementById('rgCustomDatePickerModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    }
}

function renderRgCustomPickerColumns() {
    const dayCol = document.getElementById('rgPickerDayCol');
    const monthCol = document.getElementById('rgPickerMonthCol');
    const yearCol = document.getElementById('rgPickerYearCol');
    
    dayCol.innerHTML = '';
    monthCol.innerHTML = '';
    yearCol.innerHTML = '';

    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    
    // Year Column
    for (let y = 2000; y <= new Date().getFullYear(); y++) {
        const item = document.createElement('div');
        item.className = 'rg-picker-item' + (y === rgTempYear ? ' selected' : '');
        item.textContent = y;
        item.onclick = () => { rgTempYear = y; renderRgCustomPickerColumns(); };
        yearCol.appendChild(item);
    }

    // Month Column
    const maxM = (rgTempYear === new Date().getFullYear()) ? new Date().getMonth() : 11;
    if (rgTempMonth > maxM) rgTempMonth = maxM;
    for (let m = 0; m <= maxM; m++) {
        const item = document.createElement('div');
        item.className = 'rg-picker-item' + (m === rgTempMonth ? ' selected' : '');
        item.textContent = months[m];
        item.onclick = () => { rgTempMonth = m; renderRgCustomPickerColumns(); };
        monthCol.appendChild(item);
    }

    // Day Column
    const daysInMonth = new Date(rgTempYear, rgTempMonth + 1, 0).getDate();
    let maxD = (rgTempYear === new Date().getFullYear() && rgTempMonth === new Date().getMonth()) ? new Date().getDate() : daysInMonth;
    if (rgTempDay > maxD) rgTempDay = maxD;
    for (let d = 1; d <= maxD; d++) {
        const item = document.createElement('div');
        item.className = 'rg-picker-item' + (d === rgTempDay ? ' selected' : '');
        item.textContent = d < 10 ? '0' + d : d;
        item.onclick = () => { rgTempDay = d; renderRgCustomPickerColumns(); };
        dayCol.appendChild(item);
    }

    // Auto-scroll logic (scroll to selected)
    [dayCol, monthCol, yearCol].forEach(col => {
        const selected = col.querySelector('.selected');
        if (selected) {
            col.scrollTop = selected.offsetTop - (col.clientHeight / 2) + (selected.clientHeight / 2);
        }
    });
}

window.applyRgCustomPicker = function() {
    rgActiveDate = new Date(rgTempYear, rgTempMonth, rgTempDay);
    closeRgCustomDatePicker();
    renderRgSaleList();
}

function renderRgSaleList() {
    const display = document.getElementById('rgDateDisplay');
    const nextBtn = document.getElementById('rgNextDateBtn');
    const container = document.getElementById('rgSaleListContainer');

    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    
    // Update display
    const dStr = rgActiveDate.getDate() < 10 ? '0' + rgActiveDate.getDate() : rgActiveDate.getDate();
    const mStr = months[rgActiveDate.getMonth()];
    const yStr = rgActiveDate.getFullYear();
    display.textContent = `${dStr} ${mStr}, ${yStr}`;

    // Disable Next if today
    const today = new Date();
    if (rgActiveDate.getDate() === today.getDate() && rgActiveDate.getMonth() === today.getMonth() && rgActiveDate.getFullYear() === today.getFullYear()) {
        nextBtn.disabled = true;
        nextBtn.style.opacity = '0.3';
    } else {
        nextBtn.disabled = false;
        nextBtn.style.opacity = '1';
    }

    // Filter sales by active date
    let dayFiltered = rgAllSales.filter(sale => {
        const parts = sale.date.replace(/\s*,\s*/g, ', ').split(' ');
        if(parts.length < 3) return false;
        
        const rowDay = parseInt(parts[0], 10);
        const rowMonthStr = parts[1].replace(',', '');
        const rowYear = parseInt(parts[2], 10);

        return (rowDay === rgActiveDate.getDate() && 
                rowMonthStr === mStr && 
                rowYear === rgActiveDate.getFullYear());
    });

    // If user mode with a selected user, optionally filter by user's sales
    if (rgMode === 'user' && rgSelectedUser && window._rgFilterByUser) {
        dayFiltered = dayFiltered.filter(sale => sale.customerID === rgSelectedUser.id);
    }

    container.innerHTML = '';

    // Add user filter toggle if user is selected
    if (rgMode === 'user' && rgSelectedUser) {
        const filterToggle = document.createElement('div');
        filterToggle.style.cssText = 'padding: 10px 14px; background: #f0f4f8; border-bottom: 1px solid #e0e7ff; display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #1e293b;';
        const isChecked = window._rgFilterByUser ? 'checked' : '';
        filterToggle.innerHTML = `
            <input type="checkbox" id="rgFilterUserSales" ${isChecked} style="width: 16px; height: 16px; accent-color: #8b5cf6; cursor: pointer;" onchange="window._rgFilterByUser = this.checked; renderRgSaleList();">
            <label for="rgFilterUserSales" style="cursor: pointer; font-weight: 600;">Show only ${rgSelectedUser.name}'s purchases</label>
        `;
        container.appendChild(filterToggle);
    }

    if (dayFiltered.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.style.cssText = 'padding:40px; text-align:center; color:#94a3b8;';
        emptyMsg.textContent = window._rgFilterByUser && rgSelectedUser ? 'No purchases by this user on this date.' : 'No sales recorded on this date.';
        container.appendChild(emptyMsg);
        return;
    }

    dayFiltered.forEach((sale, i) => {
        // Only include if not already in rgSelectedItems to prevent duplicates? We won't block it, but we can uncheck
        const itemEl = document.createElement('label');
        itemEl.className = 'rg-sale-item';
        
        const itemQty = parseFloat(sale.qty) || 1;
        const priceVal = sale.price !== undefined ? parseFloat(String(sale.price).replace(/[^\d.-]/g, '')) || 0 : 0;
        const payoutVal = sale.payout !== undefined ? parseFloat(String(sale.payout).replace(/[^\d.-]/g, '')) || 0 : 0;
        const unitPriceVal = sale.unitPrice !== undefined ? parseFloat(String(sale.unitPrice).replace(/[^\d.-]/g, '')) || 0 : 0;
        
        let grossTotal = 0;
        if (payoutVal > 0) {
            // For sales with payout (e.g. request sales), price is stored as (total - payout).
            // Adding payout back restores the full gross total amount.
            grossTotal = priceVal + payoutVal;
        } else {
            // For regular sales, price is already the gross total. Fall back to unitPrice * qty if price is missing.
            grossTotal = sale.price !== undefined ? priceVal : (unitPriceVal * itemQty);
        }
        
        const itemTotal = grossTotal;
        const amtStr = itemTotal.toLocaleString();
        
        itemEl.innerHTML = `
            <input type="checkbox" class="rg-sale-checkbox" value='${escape(JSON.stringify(sale))}'>
            <div style="flex:1;">
                <div style="font-weight:600; color:#1e293b;">${sale.item}</div>
                <div style="font-size:0.85rem; color:#64748b;">Qty: ${sale.qty} • Time: ${sale.date.split('·')[1] || ''}</div>
            </div>
            <div style="font-weight:bold; color:#10b981;">₦${amtStr}</div>
        `;
        container.appendChild(itemEl);
    });
}

window.addSelectedSalesToReceipt = function() {
    const checkboxes = document.querySelectorAll('.rg-sale-checkbox:checked');
    let added = 0;
    checkboxes.forEach(cb => {
        try {
            const saleObj = JSON.parse(unescape(cb.value));
            // Add a unique ID to the object so we can remove it cleanly from arrays later
            saleObj._uid = 'sq_' + Math.random().toString(36).substr(2, 9);
            rgSelectedItems.push(saleObj);
            added++;
        } catch(e) { console.error('Error adding sale', e); }
    });

    if (added > 0) {
        updateRgPreview();
        closeRgSaleModal();
    } else {
        if(typeof customAlert === 'function') customAlert("Please check at least one sale item.");
        else alert("Please check at least one sale item.");
    }
}

window.printReceiptGen = function() {
    if (rgSelectedItems.length === 0) {
        if(typeof customAlert === 'function') customAlert("Please select items to print.");
        else alert("Please select items to print.");
        return;
    }
    
    const previewDoc = document.getElementById('rgPreviewDoc');
    if (!previewDoc) return;
    const receiptNum = document.getElementById('rPreviewId').textContent.trim() || 'RCPT';

    // Build temporary print container styled as A4 (794px)
    const printArea = document.createElement('div');

    printArea.style.width = '794px';
    printArea.style.background = '#ffffff';
    printArea.style.color = '#000';
    printArea.style.fontFamily = "'Courier New', Courier, monospace";
    printArea.style.boxSizing = 'border-box';
    printArea.style.padding = '60px 80px';
    
    printArea.innerHTML = previewDoc.innerHTML;
    
    // Adjust layout sizes in temp print to look premium on A4
    const headerTitle = printArea.querySelector('#rgPreviewShopName');
    if (headerTitle) {
        headerTitle.style.fontSize = '2.2rem';
        headerTitle.style.marginBottom = '8px';
    }
    const phoneLabel = printArea.querySelector('#rgPreviewStorePhone');
    if (phoneLabel) {
        phoneLabel.style.fontSize = '1.05rem';
    }

    
    const opt = {
        margin: 0,
        filename: `Receipt_${receiptNum}.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, logging: false, windowWidth: 794, scrollX: 0, scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    const btn = document.querySelector('.use-ai-btn');
    const originalText = btn ? btn.textContent : 'Print Layout';
    if (btn) {
        btn.textContent = 'Downloading...';
        btn.style.opacity = '0.7';
        btn.style.pointerEvents = 'none';
    }

    html2pdf().set(opt).from(printArea.outerHTML).save().then(() => {
        if (btn) {
            btn.textContent = originalText;
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
        }
    }).catch(err => {
        console.error("PDF generation failed:", err);
        if (btn) {
            btn.textContent = originalText;
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
        }
    });
}

// -------------------------------------------------------------------
// Mode Toggle: Customer vs User
// -------------------------------------------------------------------
window.setRgMode = function(mode) {
    rgMode = mode;
    const custBtn = document.getElementById('rgModeCustomer');
    const userBtn = document.getElementById('rgModeUser');
    const custFields = document.getElementById('rgCustomerFields');
    const userFields = document.getElementById('rgUserFields');

    if (mode === 'customer') {
        custBtn.classList.add('active');
        userBtn.classList.remove('active');
        custFields.style.display = 'block';
        userFields.style.display = 'none';
        // Clear user selection
        rgSelectedUser = null;
        const badge = document.getElementById('rgSelectedUserBadge');
        if (badge) { badge.style.display = 'none'; badge.innerHTML = ''; }
    } else {
        userBtn.classList.add('active');
        custBtn.classList.remove('active');
        custFields.style.display = 'none';
        userFields.style.display = 'block';
        // Clear manual fields
        const nameEl = document.getElementById('rgCustomerName');
        const phoneEl = document.getElementById('rgCustomerPhone');
        const emailEl = document.getElementById('rgCustomerEmail');
        if (nameEl) nameEl.value = '';
        if (phoneEl) phoneEl.value = '';
        if (emailEl) emailEl.value = '';
    }
    updateRgPreview();
}

// -------------------------------------------------------------------
// User Search
// -------------------------------------------------------------------
window.searchRgUsers = function() {
    const input = document.getElementById('rgUserSearch');
    const container = document.getElementById('rgUserSearchResults');
    if (!input || !container) return;

    const query = input.value.trim().toLowerCase();
    if (!query || query.length < 2) {
        container.innerHTML = '';
        return;
    }

    const users = JSON.parse(localStorage.getItem('nd_users') || '[]');
    const matches = users.filter(u =>
        !u.is_admin &&
        u.id !== 'nd_admin_001' &&
        !(u.id && u.id.toLowerCase().startsWith('nd_admin_')) &&
        (
            (u.id && u.id.toLowerCase().includes(query)) ||
            (u.name && u.name.toLowerCase().includes(query)) ||
            (u.email && u.email.toLowerCase().includes(query)) ||
            (u.phone && u.phone.includes(query))
        )
    ).slice(0, 8); // Max 8 results

    if (matches.length === 0) {
        container.innerHTML = '<div style="padding: 16px; text-align: center; color: #94a3b8; font-size: 0.9rem;">No users found matching your search.</div>';
        return;
    }

    container.innerHTML = matches.map(u => `
        <div class="rg-user-result-item" onclick="openRgUserConfirm('${u.id}')">
            <div class="rg-user-result-avatar">${(u.name || '?').charAt(0).toUpperCase()}</div>
            <div class="rg-user-result-info">
                <h4>${u.name || 'Unknown'}</h4>
                <p>${u.id} • ${u.phone || u.email || 'No contact'}</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
    `).join('');
}

// -------------------------------------------------------------------
// User Confirmation Modal
// -------------------------------------------------------------------
window.openRgUserConfirm = function(userId) {
    const users = JSON.parse(localStorage.getItem('nd_users') || '[]');
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const body = document.getElementById('rgUserConfirmBody');
    if (!body) return;

    body.innerHTML = `
        <div class="rg-confirm-avatar">${(user.name || '?').charAt(0).toUpperCase()}</div>
        <div class="rg-confirm-name">${user.name || 'Unknown User'}</div>
        <div class="rg-confirm-id">ID: ${user.id}</div>
        <div class="rg-confirm-grid">
            <div>
                <div class="rg-cg-label">Email</div>
                <div class="rg-cg-value">${user.email || 'N/A'}</div>
            </div>
            <div>
                <div class="rg-cg-label">Phone</div>
                <div class="rg-cg-value">${user.phone || 'N/A'}</div>
            </div>
            <div>
                <div class="rg-cg-label">Address</div>
                <div class="rg-cg-value">${user.address || 'N/A'}</div>
            </div>
            <div>
                <div class="rg-cg-label">Joined</div>
                <div class="rg-cg-value">${user.joinDate ? new Date(user.joinDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</div>
            </div>
        </div>
        <div class="rg-confirm-actions">
            <button onclick="closeRgUserConfirm()" style="background: #f1f5f9; color: #64748b;">Cancel</button>
            <button onclick="confirmRgUser('${user.id}')" style="background: #8b5cf6; color: white;">Confirm</button>
        </div>
    `;

    const modal = document.getElementById('rgUserConfirmModal');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    }
}

window.closeRgUserConfirm = function() {
    const modal = document.getElementById('rgUserConfirmModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    }
}

window.confirmRgUser = function(userId) {
    const users = JSON.parse(localStorage.getItem('nd_users') || '[]');
    const user = users.find(u => u.id === userId);
    if (!user) return;

    rgSelectedUser = user;

    // Clear search and results
    const searchInput = document.getElementById('rgUserSearch');
    const resultsContainer = document.getElementById('rgUserSearchResults');
    if (searchInput) searchInput.value = '';
    if (resultsContainer) resultsContainer.innerHTML = '';

    // Show selected user badge
    const badge = document.getElementById('rgSelectedUserBadge');
    if (badge) {
        badge.style.display = 'block';
        badge.innerHTML = `
            <div class="rg-selected-badge">
                <div class="rg-user-result-avatar">${(user.name || '?').charAt(0).toUpperCase()}</div>
                <div class="rg-badge-info">
                    <h4>${user.name || 'Unknown'}</h4>
                    <p>${user.id} • ${user.phone || user.email || ''}</p>
                </div>
                <button class="rg-badge-remove" onclick="removeRgSelectedUser()" title="Remove user">✕</button>
            </div>
        `;
    }

    closeRgUserConfirm();
    updateRgPreview();
}

window.removeRgSelectedUser = function() {
    rgSelectedUser = null;
    const badge = document.getElementById('rgSelectedUserBadge');
    if (badge) { badge.style.display = 'none'; badge.innerHTML = ''; }
    updateRgPreview();
}




