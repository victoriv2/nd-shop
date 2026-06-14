let currentRequestFilter = 'All';
let currentRequestSearch = '';

function loadRequest() {
    const container = document.getElementById('register-container');
    if (!container) return;

    currentRequestFilter = 'All';
    currentRequestSearch = '';

    container.innerHTML = `
        <div class="admin-request-page">
            <h2 class="admin-request-title">Customer Requests</h2>
            
            <div class="request-controls">
                <div class="request-search-wrapper">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input type="text" id="requestSearchInput" placeholder="Search customer, item or ID..." oninput="handleRequestSearch(this.value)">
                </div>
                
                <div class="request-filter-capsules" style="padding-top: 10px; margin-top: -10px;">
                    <button class="request-filter-btn active" onclick="handleRequestFilter('All', this)">All</button>
                    <button class="request-filter-btn" id="pendingFilterBtn" onclick="handleRequestFilter('Pending', this)">Pending</button>
                    <button class="request-filter-btn" id="approvedFilterBtn" onclick="handleRequestFilter('Approved', this)">Approved</button>
                    <button class="request-filter-btn" id="declinedFilterBtn" onclick="handleRequestFilter('Declined', this)">Declined</button>
                    <button class="request-filter-btn" id="aiFilterBtn" onclick="handleRequestFilter('AI', this)">AI</button>
                </div>
            </div>

            <div id="adminRequestList" class="request-list"></div>
            
        </div>
    `;

    renderAdminRequests();
}

function handleRequestSearch(query) {
    currentRequestSearch = query.toLowerCase().trim();
    renderAdminRequests();
}

function handleRequestFilter(filter, btnElement) {
    currentRequestFilter = filter;

    const buttons = document.querySelectorAll('.request-filter-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');

    renderAdminRequests();
}

function renderAdminRequests() {
    const listContainer = document.getElementById('adminRequestList');
    if (!listContainer) return;

    const allRequests = JSON.parse(localStorage.getItem('nd_requests_data') || '[]');
    let requests = allRequests;

    // Badges update
    const pendingCount = allRequests.filter(r => r.status === 'Pending').length;
    const pendingBtn = document.getElementById('pendingFilterBtn');
    if (pendingBtn) {
        pendingBtn.innerHTML = pendingCount > 0 
            ? `Pending<span class="pending-badge-creative">${pendingCount > 9 ? '9+' : pendingCount}</span>`
            : `Pending`;
    }

    const aiPendingCount = allRequests.filter(r => r.status === 'Pending' && r.source === 'AI').length;
    const aiBtn = document.getElementById('aiFilterBtn');
    if (aiBtn) {
        aiBtn.innerHTML = aiPendingCount > 0 
            ? `AI<span class="pending-badge-creative">${aiPendingCount > 9 ? '9+' : aiPendingCount}</span>`
            : `AI`;
    }

    if (currentRequestFilter === 'AI') {
        requests = requests.filter(req => req.source === 'AI');
    } else if (currentRequestFilter !== 'All') {
        requests = requests.filter(req => req.status === currentRequestFilter);
    }

    if (currentRequestSearch) {
        requests = requests.filter(req => {
            const searchTerms = currentRequestSearch.split(' ');
            let reqString = `${req.user.name} ${req.id} ${req.status}`;
            
            if (req.isGroupedOrder && req.items) {
                req.items.forEach(i => {
                    reqString += ` ${i.name} ${i.qty} ${i.unit}`;
                });
            } else if (req.product) {
                reqString += ` ${req.product.name} ${req.product.qty} ${req.product.unit}`;
            }

            return searchTerms.every(term => reqString.toLowerCase().includes(term));
        });
    }

    // Ensure requests are sorted from newest to oldest
    requests.sort((a, b) => {
        let timeA = new Date(a.timestamp).getTime();
        let timeB = new Date(b.timestamp).getTime();
        if (isNaN(timeA)) timeA = 0;
        if (isNaN(timeB)) timeB = 0;
        return timeB - timeA;
    });

    if (requests.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-requests">
                <div style="margin-bottom: 20px; opacity: 0.5;">
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                    </svg>
                </div>
                <h3>No ${currentRequestFilter !== 'All' ? currentRequestFilter : ''} Requests</h3>
                <p>All clear! Relax or check your inventory.</p>
            </div>
        `;
        return;
    }

    listContainer.innerHTML = requests.map(req => {
        const isPending = req.status === 'Pending';
        const reqDate = req.timestamp ? new Date(req.timestamp) : new Date();
        const formattedDate = reqDate.toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true });

        // Grouped Order Logic vs Legacy
        let orderTitle = '';
        let totalCost = 0;
        let itemCount = 0;

        if (req.isGroupedOrder && req.items) {
            totalCost = req.orderTotal || 0;
            itemCount = req.items.length;
            orderTitle = `Order containing ${itemCount} item${itemCount > 1 ? 's' : ''}`;
        } else if (req.product) {
            totalCost = req.product.total || 0;
            itemCount = 1;
            orderTitle = req.product.name;
        }

        return `
            <div class="request-card" id="card-${req.id}" style="${isPending ? 'cursor: pointer; transition: transform 0.2s; border: 2px solid transparent;' : ''}"
                 ${isPending ? `onmouseover="this.style.borderColor='#8b5cf6'; this.style.transform='scale(1.02)'" onmouseout="this.style.borderColor='transparent'; this.style.transform='scale(1)'"` : ''}
                 onclick="${isPending ? `openOrderDetails('${req.id}')` : ''}">
                 
                <div class="request-header">
                    <span class="request-date" style="font-size: 0.8rem; font-weight: 700; color: #888; background: #f5f5f5; padding: 4px 10px; border-radius: 8px;">${formattedDate}</span>
                    <div style="display:flex; align-items:center; gap:8px;">
                        ${req.isRewardPurchase ? `<span style="font-size: 0.7rem; font-weight: 800; color: #166534; background: #dcfce7; padding: 3px 8px; border-radius: 6px; border: 1px solid #bbf7d0;">Paid with Payout</span>` : ''}
                        <span class="request-status status-${req.status.toLowerCase()}">${req.status}</span>
                    </div>
                </div>
                
                <div class="user-profile-row">
                    <div class="user-avatar" onclick="event.stopPropagation(); openUserDetailsModal('${req.user.id}')" style="cursor: pointer;">${req.user.avatar}</div>
                    <div class="user-text-info">
                        <span class="user-name">${req.user.name}</span>
                        <span class="user-id" style="color:#aaa; font-size:0.75rem;">${req.id}</span>
                    </div>
                </div>

                <div class="product-order-box">
                    <div class="order-name">${orderTitle}</div>
                    
                    <div class="order-total" style="margin-top: 15px; text-align: right; border-top: 1px dashed #e0e0e0; padding-top: 10px;">
                        <span style="font-size: 0.8rem; color: #888; margin-right: 10px;">Total Value</span>
                        <span style="font-weight: 800; color: #8b5cf6; font-size: 1.1rem;">₦${totalCost.toLocaleString()}</span>
                    </div>
                </div>

                ${!isPending ? `
                    <div style="text-align: center; color: #888; font-size: 0.9rem; font-weight: 600; padding: 10px; background: #f9f9f9; border-radius: 12px; margin-top: 10px;">
                        Processed on ${new Date(req.processedAt || req.timestamp).toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true })}
                        <br>
                        <button onclick="openOrderDetails('${req.id}')" style="margin-top:8px; padding:6px 12px; background:white; border:1px solid #ddd; border-radius:6px; cursor:pointer; color:#8b5cf6; font-weight:600; font-size:0.8rem;">View Order Details</button>
                    </div>
                ` : `
                    <div style="text-align: center; font-size: 0.8rem; color: #94a3b8; margin-top: 10px; font-weight: 600;">
                        Click card to view details & act
                    </div>
                `}
            </div>
        `;
    }).join('');
}

function openOrderDetails(id) {
    const requests = JSON.parse(localStorage.getItem('nd_requests_data') || '[]');
    const req = requests.find(r => r.id === id);
    if (!req) return;

    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    const isPending = req.status === 'Pending';

    // For pending grouped orders, use the editable builder
    if (isPending && req.isGroupedOrder && req.items) {
        _renderOrderModal(req, id, true);
        _buildEditableOrderTable(req, id);
        return;
    }

    // Non-editable view (approved/declined or legacy single-product)
    let itemsHtml = '';
    let totalCost = 0;

    if (req.isGroupedOrder && req.items) {
        totalCost = req.orderTotal || 0;
        itemsHtml = req.items.map(item => {
            let imgSrc = item.imageData;
            if (!imgSrc) {
                try {
                    const dbProducts = typeof adminProducts !== 'undefined' ? adminProducts : JSON.parse(localStorage.getItem('nd_products_data') || '[]');
                    const matched = dbProducts.find(p => p.name === item.name || p.name === item.name.replace(/\s+\([^)]+\)$/, ''));
                    if (matched && matched.imageData) imgSrc = matched.imageData;
                } catch(e) {}
            }
            const imgTag = imgSrc 
                ? `<img src="${imgSrc}" style="width:32px;height:32px;border-radius:4px;object-fit:cover;cursor:zoom-in;" onclick="event.stopPropagation();if(typeof window.openImageViewer==='function')window.openImageViewer('${imgSrc}')">`
                : `<div style="width:32px;height:32px;background:#f1f5f9;border-radius:4px;flex-shrink:0;"></div>`;
            return `
                <tr>
                    <td style="display:flex;align-items:center;gap:8px;">
                        ${imgTag}
                        <span>${item.name}</span>
                    </td>
                    <td style="text-align:center;">${item.qty} ${item.unit}</td>
                    <td style="text-align:right;">₦${item.total.toLocaleString()}</td>
                </tr>
            `;
        }).join('');
    } else if (req.product) {
        totalCost = req.product.total || 0;
        let pImgSrc = req.product.imageData;
        if (!pImgSrc) {
            try {
                const dbProducts = typeof adminProducts !== 'undefined' ? adminProducts : JSON.parse(localStorage.getItem('nd_products_data') || '[]');
                const matched = dbProducts.find(p => p.name === req.product.name || p.name === req.product.name.replace(/\s+\([^)]+\)$/, ''));
                if (matched && matched.imageData) pImgSrc = matched.imageData;
            } catch(e) {}
        }
        const pImgTag = pImgSrc 
            ? `<img src="${pImgSrc}" style="width:32px;height:32px;border-radius:4px;object-fit:cover;cursor:zoom-in;" onclick="event.stopPropagation();if(typeof window.openImageViewer==='function')window.openImageViewer('${pImgSrc}')">`
            : `<div style="width:32px;height:32px;background:#f1f5f9;border-radius:4px;flex-shrink:0;"></div>`;
        itemsHtml = `
            <tr>
                <td style="display:flex;align-items:center;gap:8px;">
                    ${pImgTag}
                    <span>${req.product.name}</span>
                </td>
                <td style="text-align:center;">${req.product.qty} ${req.product.unit}</td>
                <td style="text-align:right;">₦${req.product.total.toLocaleString()}</td>
            </tr>
        `;
    }

    _renderOrderModal(req, id, false, itemsHtml, totalCost);
}

function _renderOrderModal(req, id, isPending, itemsHtml, totalCost) {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;
    totalCost = totalCost || req.orderTotal || 0;

    modalContainer.innerHTML = `
        <div class="order-modal-overlay show" id="orderModalOverlay" onclick="closeOrderDetails(event)">
            <div class="order-modal-content" onclick="event.stopPropagation()">
                <div class="order-modal-header">
                    <h3>${req.id}</h3>
                    <button class="close-order-modal" onclick="closeOrderDetails()">&times;</button>
                </div>
                <div class="order-modal-body">
                    <div class="order-user-info">
                        <div class="order-user-avatar">${req.user.avatar}</div>
                        <div class="order-user-details">
                            <h4>${req.user.name}</h4>
                            <p>Requested: ${new Date(req.timestamp).toLocaleString()}</p>
                        </div>
                    </div>
                    
                    ${req.isRewardPurchase ? `
                    <div style="background:#dcfce7; border:1px solid #bbf7d0; border-radius:10px; padding:10px 14px; margin-bottom:14px; font-size:0.85rem; color:#166534; font-weight:700; display:flex; align-items:center; gap:6px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="12" y1="10" x2="12" y2="10"/><line x1="8" y1="10" x2="8" y2="10"/><line x1="16" y1="10" x2="16" y2="10"/><line x1="6" y1="14" x2="18" y2="14"/></svg>
                        PAID WITH PAYOUT REWARD (No Payment Required)
                    </div>
                    ` : ''}
                    
                    ${isPending ? `<div style="background:#f0f4f8;border:1px solid #bfdbfe;border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:0.82rem;color:#1e40af;font-weight:600;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        You can remove items or adjust quantities before approving.
                    </div>` : ''}

                    <h5 style="margin:0 0 10px 0;color:#475569;">Items Ordered</h5>
                    <table class="order-items-table" id="editableOrderTable">
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th style="text-align:center;">Qty</th>
                                <th style="text-align:right;">Total</th>
                                ${isPending ? '<th style="text-align:center;width:90px;">Admin</th>' : ''}
                            </tr>
                        </thead>
                        <tbody id="editableOrderTbody">
                            ${itemsHtml || ''}
                        </tbody>
                    </table>
                    
                    <div class="order-summary" id="orderSummaryRow">
                        <span>Total Value</span>
                        <span style="color:#8b5cf6;" id="orderTotalDisplay">₦${totalCost.toLocaleString()}</span>
                    </div>
                </div>
                
                ${isPending ? `
                    <div class="order-modal-footer">
                        <button class="btn-order-action btn-order-decline" onclick="processRequest('${req.id}', 'Declined')">Decline Order</button>
                        <button class="btn-order-action btn-order-approve" onclick="processRequest('${req.id}', 'Approved')">Approve Order</button>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Builds the live-editable order table for pending grouped orders
function _buildEditableOrderTable(req, id) {
    const tbody = document.getElementById('editableOrderTbody');
    if (!tbody) return;

    // Working copy of items in memory (not saved yet)
    let workingItems = req.items.map(i => ({ ...i }));

    function recalcTotal() {
        const total = workingItems.reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0);
        const disp = document.getElementById('orderTotalDisplay');
        if (disp) disp.textContent = '₦' + total.toLocaleString();
        return total;
    }

    function saveWorkingItems() {
        const allRequests = JSON.parse(localStorage.getItem('nd_requests_data') || '[]');
        const idx = allRequests.findIndex(r => r.id === id);
        if (idx !== -1) {
            allRequests[idx].items = workingItems;
            allRequests[idx].orderTotal = recalcTotal();
            localStorage.setItem('nd_requests_data', JSON.stringify(allRequests));
        }
    }

    function renderRows() {
        tbody.innerHTML = '';

        if (workingItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:16px;font-style:italic;">All items removed</td></tr>`;
            recalcTotal();
            return;
        }

        workingItems.forEach((item, idx) => {
            const tr = document.createElement('tr');
            tr.style.transition = 'background 0.2s';

            let imgSrc = item.imageData;
            if (!imgSrc) {
                try {
                    const dbProducts = typeof adminProducts !== 'undefined' ? adminProducts : JSON.parse(localStorage.getItem('nd_products_data') || '[]');
                    const matched = dbProducts.find(p => p.name === item.name || p.name === item.name.replace(/\s+\([^)]+\)$/, ''));
                    if (matched && matched.imageData) imgSrc = matched.imageData;
                } catch(e) {}
            }
            const imgHtml = imgSrc
                ? `<img src="${imgSrc}" style="width:32px;height:32px;border-radius:4px;object-fit:cover;cursor:zoom-in;" onclick="event.stopPropagation();if(typeof window.openImageViewer==='function')window.openImageViewer('${imgSrc}')">`
                : `<div style="width:32px;height:32px;background:#f1f5f9;border-radius:4px;flex-shrink:0;"></div>`;
            tr.innerHTML = `
                <td style="display:flex;align-items:center;gap:8px;">
                    ${imgHtml}
                    <span>${item.name}</span>
                </td>
                <td style="text-align:center;" id="qty_cell_${idx}">
                    <div style="display:flex;flex-direction:column;align-items:center;">
                        <span class="order-qty-display" id="qty_display_${idx}">${item.qty} ${item.unit}</span>
                        <span style="font-size:0.75rem;color:#94a3b8;font-style:italic;">(Editable)</span>
                    </div>
                </td>
                <td style="text-align:right;" id="total_cell_${idx}">₦${parseFloat(item.total).toLocaleString()}</td>
                <td style="text-align:center;">
                    <div style="display:flex;gap:4px;justify-content:center;">
                        <button title="Edit item"
                            onclick="_openAdminItemEditModal(${idx})"
                            style="padding:5px 8px;background:#f0f4f8;color:#8b5cf6;border:1.5px solid #bfdbfe;border-radius:7px;cursor:pointer;font-size:0.75rem;font-weight:700;transition:all 0.15s;"
                            onmouseover="this.style.background='#e0e7ff'" onmouseout="this.style.background='#f0f4f8'">
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button title="Remove item"
                            onclick="_removeOrderItem(${idx},'${id}')"
                            style="padding:5px 8px;background:#fff1f2;color:#e11d48;border:1.5px solid #fecdd3;border-radius:7px;cursor:pointer;font-size:0.75rem;font-weight:700;transition:all 0.15s;"
                            onmouseover="this.style.background='#ffe4e6'" onmouseout="this.style.background='#fff1f2'">
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        recalcTotal();
    }

    window._requirePinAndExecute = function(callback) {
        if (typeof customPrompt === 'function') {
            customPrompt("Enter 4-digit Admin PIN to confirm:", "password").then(pin => {
                if (pin === null) return;
                const correctPin = localStorage.getItem('nd_delete_pin') || '1234';
                if (pin === correctPin) {
                    callback();
                } else {
                    if (typeof customAlert === 'function') customAlert("Incorrect Admin PIN! Action denied.");
                    else alert("Incorrect Admin PIN! Action denied.");
                }
            });
        } else {
            const pin = prompt("Enter 4-digit Admin PIN to confirm:");
            if (pin === null) return; // User cancelled
            const correctPin = localStorage.getItem('nd_delete_pin') || '1234';
            if (pin === correctPin) {
                callback();
            } else {
                alert("Incorrect Admin PIN! Action denied.");
            }
        }
    };

    window._removeOrderItem = function(idx, reqId) {
        if (workingItems.length <= 1) {
            const tr = tbody.querySelectorAll('tr')[idx];
            if (tr) {
                tr.style.background = '#fff1f2';
                setTimeout(() => { tr.style.background = ''; }, 600);
            }
            // Show small toast
            const toast = document.createElement('div');
            toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1e293b;color:white;padding:10px 20px;border-radius:10px;font-size:0.85rem;font-weight:600;z-index:999999;opacity:0;transition:opacity 0.2s;';
            toast.textContent = 'Cannot remove the only item — decline the order instead.';
            document.body.appendChild(toast);
            requestAnimationFrame(() => { toast.style.opacity = '1'; });
            setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 2500);
            return;
        }
        
        _requirePinAndExecute(() => {
            workingItems.splice(idx, 1);
            saveWorkingItems();
            renderRows();
        });
    };

    window._openAdminItemEditModal = function(idx) {
        _requirePinAndExecute(() => {
            const item = workingItems[idx];
            const prod = window.nd_products ? window.nd_products.find(p => p.name === item.name || item.name.startsWith(p.name)) : null;

            let currentQty = parseFloat(item.qty) || 1;
            let isFlexible = item.price === 'TBD' || item.isFlexible || (!item.unitPrice && item.total > 0 && !item.price);
            let customPriceInput = isFlexible ? (parseFloat(item.total) / currentQty) : 0;
            if (isNaN(customPriceInput)) customPriceInput = 0;

            let activeVariant = null;
            let variants = [{ title: 'Default', price: item.unitPrice || (item.total / currentQty), cost: item.unitCost || 0, unit: item.unit, flex: isFlexible }];

            if (prod) {
                variants = [];
                if (prod.isSpecial) {
                    const pts = prod.packTypes || {};
                    const s = prod.structure || {};
                    const perUnitCost = parseFloat(prod.cost) || 0;
                    const cpb = s.custardsPerBag !== undefined ? Number(s.custardsPerBag) : (s.c2sPerC1 || 1);
                    const c2Cost = cpb > 0 ? perUnitCost / cpb : 0;
                    const cpc = s.cupsPerCustard !== undefined ? Number(s.cupsPerCustard) : (s.c3sPerC2 || 1);
                    const c3Cost = (cpc > 0 && cpb > 0) ? c2Cost / cpc : 0;

                    if (pts.bag && Number(pts.bag.price) > 0) variants.push({ title: (pts.bag || {}).title || (pts.c1 || {}).title || 'Container 1', price: Number(pts.bag.price), flex: false, cost: perUnitCost });
                    if (pts.custard && Number(pts.custard.price) > 0) variants.push({ title: (pts.custard || {}).title || (pts.c2 || {}).title || 'Container 2', price: Number(pts.custard.price), flex: false, cost: c2Cost });
                    if (pts.cup) {
                        let cupPrice = Number(pts.cup.price) || 0;
                        if (cupPrice <= 0) {
                            const cupProfit = s.cupProfit !== undefined ? s.cupProfit : (s.c3Profit !== undefined ? s.c3Profit : 0);
                            cupPrice = Math.round(c3Cost + cupProfit) || 0;
                        }
                        variants.push({ title: (pts.cup || {}).title || (pts.c3 || {}).title || 'Container 3', price: cupPrice, flex: false, cost: c3Cost });
                    }
                } else if (prod.isFlexible) {
                    const pts = prod.packTypes || {};
                    const baseCost = parseFloat(prod.cost) || 0;
                    if (pts.c1 && Number(pts.c1.price) > 0) variants.push({ title: (pts.c1 || {}).title || (pts.bag || {}).title || 'Container 1', price: Number(pts.c1.price), flex: false, cost: baseCost });
                    if (pts.c2 && Number(pts.c2.price) > 0) variants.push({ title: (pts.c2 || {}).title || (pts.custard || {}).title || 'Container 2', price: Number(pts.c2.price), flex: false, cost: baseCost });
                    if (pts.c3) variants.push({ title: (pts.c3 || {}).title || (pts.cup || {}).title || 'Container 3', price: Number(pts.c3.price) || 0, flex: true, cost: baseCost });
                } else if (prod.isCustom) {
                    variants.push({ title: 'Default', price: Number(prod.price) || 0, flex: false, unit: prod.unit || 'per unit', cost: parseFloat(prod.cost) || 0 });
                } else {
                    const baseCost = parseFloat(prod.cost) || 0;
                    variants.push({ title: 'Default', price: Number(prod.price) || 0, flex: false, unit: prod.unit || 'per unit', cost: baseCost });
                    if (prod.wholesalePrice && Number(prod.wholesalePrice) > 0) {
                        const bulkUnitStr = prod.bulkUnit || 'Carton';
                        variants.push({ title: bulkUnitStr, price: Number(prod.wholesalePrice), flex: false, unit: 'per ' + bulkUnitStr.toLowerCase(), cost: baseCost * (prod.pieces || 1) });
                    }
                }
                
                // Always add a master override option for the admin
                variants.push({ title: 'Flexible Override', flex: true, cost: parseFloat(prod.cost || 0), unit: prod.unit || 'unit' });
            }

            // Try to match current item properties to a variant
            activeVariant = variants.find(v => {
                if (isFlexible) return v.flex;
                return v.price === (item.unitPrice || (item.total / currentQty));
            }) || variants[0];

            const overlay = document.createElement('div');
            overlay.className = 'product-modal-overlay show';
            overlay.style.zIndex = '100005';

            function renderModalBody() {
                let variantHtml = '';
                if (variants.length > 1) {
                    variantHtml = `
                        <div id="pmVariantsSection" style="padding: 0 16px 12px 16px;">
                            <span class="pm-label" style="display:block; margin-bottom: 8px; font-weight: 700; color: #64748b; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px;">Select Option</span>
                            <div id="pmVariantsContainer" style="display: flex; flex-direction: column; gap: 8px;">
                                ${variants.map((v, i) => `
                                    <label class="pm-variant-label" style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border:1px solid #bfdbfe; border-radius:8px; cursor:pointer; background:white; transition:all 0.2s;">
                                        <div style="display:flex; align-items:center; gap:8px;">
                                            <input type="radio" name="admVariant" class="adm-variant-radio" value="${i}" ${v === activeVariant ? 'checked' : ''} style="accent-color:#8b5cf6; width:18px; height:18px; cursor:pointer;">
                                            <span style="font-weight:600; color:#8b5cf6; font-size:0.95rem;">${v.title}</span>
                                        </div>
                                        <span style="font-weight:700; color:#334155;">${v.flex ? 'Flexible' : '₦' + Math.round(v.price).toLocaleString()}</span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }

                const effectivePrice = activeVariant.flex ? customPriceInput : activeVariant.price;
                const finalTotal = effectivePrice * currentQty;

                return `
                    <div class="product-modal-content">
                        <div class="pm-header">
                            <h3>Edit Requested Item</h3>
                            <span class="pm-close" onclick="this.closest('.product-modal-overlay').remove()">&times;</span>
                        </div>
                        <div class="pm-body">
                            <div class="pm-hero-section">
                                <div class="pm-product-name" style="font-size:1.5rem; margin-bottom:8px;">${item.name}</div>
                                <div class="pm-product-price-row">
                                    <span class="pm-price">${activeVariant.flex ? 'Flexible Price' : '₦' + activeVariant.price.toLocaleString()}</span>
                                    <span class="pm-unit">${activeVariant.unit || item.unit || 'per unit'}</span>
                                </div>
                            </div>

                            ${variantHtml}

                            <div class="pm-quantity-section">
                                <span class="pm-quantity-label">Quantity</span>
                                <div class="pm-quantity-controls">
                                    <button class="pm-qty-btn" id="admEditMinus">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                        </svg>
                                    </button>
                                    <span class="pm-qty-value" id="admEditQty">${currentQty}</span>
                                    <button class="pm-qty-btn" id="admEditPlus">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                            <line x1="12" y1="5" x2="12" y2="19"></line>
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div class="pm-details-list">
                                <div class="pm-detail-item">
                                    <span class="pm-label">Total Estimate</span>
                                    <span class="pm-value" id="admEditTotalVal" style="${activeVariant.flex ? 'display:none;' : ''}">₦${Math.round(finalTotal).toLocaleString()}</span>
                                    <span class="pm-value" id="admEditCustomPriceWrapper" style="${activeVariant.flex ? 'display:inline-flex;' : 'display:none;'} align-items:center; gap:4px;">
                                        <span style="font-weight:800; color:#334155;">₦</span>
                                        <input type="number" id="admEditCustomPrice" value="${customPriceInput}" min="0" placeholder="0"
                                            style="width:90px; border:none; border-bottom:2px solid #8b5cf6; outline:none; font-size:1rem; font-weight:800; color:#334155; background:transparent; padding:2px 4px; text-align:right;">
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div class="pm-footer">
                            <button class="pm-action-btn pm-btn-primary" id="admEditSaveBtn" style="width:100%;">Save Changes</button>
                        </div>
                    </div>
                `;
            }

            function bindEvents() {
                overlay.querySelectorAll('.adm-variant-radio').forEach(radio => {
                    radio.onchange = (e) => {
                        activeVariant = variants[parseInt(e.target.value)];
                        updateModal();
                    };
                });

                const customPriceEl = overlay.querySelector('#admEditCustomPrice');
                if (customPriceEl) {
                    customPriceEl.oninput = (e) => {
                        customPriceInput = parseFloat(e.target.value) || 0;
                        updateTotalDisplay();
                    };
                }

                overlay.querySelector('#admEditMinus').onclick = () => {
                    if (currentQty > 1) {
                        currentQty--;
                        updateTotalDisplay();
                    }
                };

                overlay.querySelector('#admEditPlus').onclick = () => {
                    currentQty++;
                    updateTotalDisplay();
                };

                overlay.querySelector('#admEditSaveBtn').onclick = () => {
                    const effectivePrice = activeVariant.flex ? customPriceInput : activeVariant.price;
                    const total = effectivePrice * currentQty;

                    let displayName = prod ? prod.name : item.name;
                    if (variants.length > 1 && activeVariant.title !== 'Default') {
                        displayName += ` (${activeVariant.title})`;
                    }

                    item.name = displayName;
                    item.qty = currentQty;
                    item.unitPrice = effectivePrice;
                    item.total = total;
                    item.isFlexible = activeVariant.flex;
                    item.unitCost = activeVariant.cost;
                    item.unit = activeVariant.unit || item.unit || 'unit';
                    item.price = activeVariant.flex ? 'TBD' : effectivePrice;

                    // Calculate Payout
                    const payoutEnabled = localStorage.getItem('nd_payout_enabled') === 'true';
                    if (payoutEnabled) {
                        const globalRate = parseFloat(localStorage.getItem('nd_payout_rate') || 2);
                        let payoutRate = (prod && prod.payoutRate !== undefined) ? parseFloat(prod.payoutRate) : globalRate;

                        if (activeVariant.flex || (prod && prod.isCustom)) {
                            item.payout = 0;
                        } else {
                            const totalCost = currentQty * (activeVariant.cost || 0);
                            const profit = total - totalCost;
                            item.payout = Math.max(0, profit) * (payoutRate / 100);
                        }
                    } else {
                        item.payout = 0;
                    }

                    saveWorkingItems();
                    renderRows();
                    overlay.remove();
                };
            }

            function updateTotalDisplay() {
                const qtyDisp = overlay.querySelector('#admEditQty');
                const totDisp = overlay.querySelector('#admEditTotalVal');
                const flexPriceInput = overlay.querySelector('#admEditCustomPrice');
                
                if (qtyDisp) qtyDisp.textContent = currentQty;
                
                if (activeVariant.flex) {
                    if (flexPriceInput) {
                        const effectivePrice = parseFloat(flexPriceInput.value) || 0;
                        if (totDisp) {
                            totDisp.textContent = '₦' + Math.round(effectivePrice * currentQty).toLocaleString();
                        }
                    }
                } else {
                    if (totDisp) {
                        totDisp.textContent = '₦' + Math.round(activeVariant.price * currentQty).toLocaleString();
                    }
                }
            }

            function updateModal() {
                overlay.innerHTML = renderModalBody();
                bindEvents();
            }

            updateModal();
            document.body.appendChild(overlay);
        });
    };


    renderRows();
}
function closeOrderDetails(e) {
    if (e && e.target.id !== 'orderModalOverlay') return;
    const overlay = document.getElementById('orderModalOverlay');
    if (overlay) {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 300);
    }
}

function checkOrderStockIssues(request) {
    const issues = [];

    if (request.isGroupedOrder && request.items) {
        request.items.forEach(item => {
            const variantType = (typeof window.getVariantTypeFromUnit === 'function')
                ? window.getVariantTypeFromUnit(item.unit)
                : null;
            const remaining = (typeof window.getRemainingProductStock === 'function')
                ? window.getRemainingProductStock(item.productId || item.name, variantType, request.id)
                : null;
            if (remaining !== null && remaining < parseFloat(item.qty)) {
                issues.push({ name: item.name, ordered: item.qty, remaining: remaining, unit: item.unit || '' });
            }
        });
    } else if (request.product) {
        const variantType = (typeof window.getVariantTypeFromUnit === 'function')
            ? window.getVariantTypeFromUnit(request.product.unit)
            : null;
        const remaining = (typeof window.getRemainingProductStock === 'function')
            ? window.getRemainingProductStock(request.product.productId || request.product.name, variantType, request.id)
            : null;
        if (remaining !== null && remaining < parseFloat(request.product.qty)) {
            issues.push({ name: request.product.name, ordered: request.product.qty, remaining: remaining, unit: request.product.unit || '' });
        }
    }

    return issues;
}

function showStockWarningAlert(issues) {
    // Remove any existing warning overlay
    const existing = document.getElementById('stockWarningOverlay');
    if (existing) existing.remove();

    const itemLines = issues.map(i => `
        <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 10px; padding: 12px 16px; margin-bottom: 10px; text-align: left;">
            <div style="font-weight: 700; color: #92400e; font-size: 0.95rem; margin-bottom: 4px;">${i.name}</div>
            <div style="font-size: 0.85rem; color: #78350f;">
                Ordered: <strong>${i.ordered} ${i.unit}</strong> &nbsp;•&nbsp; 
                In Stock: <strong style="color: ${i.remaining <= 0 ? '#dc2626' : '#d97706'};">${i.remaining <= 0 ? 'Out of Stock' : i.remaining + ' ' + i.unit}</strong>
            </div>
        </div>
    `).join('');

    const overlay = document.createElement('div');
    overlay.id = 'stockWarningOverlay';
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.55); backdrop-filter: blur(4px);
        z-index: 999999; display: flex; align-items: center; justify-content: center;
        opacity: 0; transition: opacity 0.25s;
    `;

    overlay.innerHTML = `
        <div style="
            background: white; border-radius: 20px; padding: 28px 24px; max-width: 400px; width: 90%;
            box-shadow: 0 25px 60px rgba(0,0,0,0.25); text-align: center;
            transform: scale(0.92); transition: transform 0.25s;
        " id="stockWarningBox">
            <div style="width: 56px; height: 56px; background: #fff7ed; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 1.8rem; color: #f97316; font-weight: bold;">!</div>
            <h3 style="margin: 0 0 6px; font-size: 1.1rem; font-weight: 800; color: #1e293b;">Stock Insufficient</h3>
            <p style="margin: 0 0 18px; font-size: 0.88rem; color: #64748b; line-height: 1.5;">
                The following item(s) in this order exceed what is currently available in stock:
            </p>
            <div style="margin-bottom: 20px;">
                ${itemLines}
            </div>
            <p style="font-size: 0.82rem; color: #94a3b8; margin-bottom: 20px;">
                The order remains <strong>Pending</strong>. Restock the product or contact the customer before approving.
            </p>
            <div style="display: flex; justify-content: center;">
                <button onclick="document.getElementById('stockWarningOverlay').remove();"
                    style="padding: 10px 28px; border-radius: 10px; border: 1.5px solid #e2e8f0; background: white; color: #475569; font-weight: 700; font-size: 0.9rem; cursor: pointer;">
                    Got It
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        document.getElementById('stockWarningBox').style.transform = 'scale(1)';
    });
}

function processRequest(id, newStatus) {
    const requests = JSON.parse(localStorage.getItem('nd_requests_data') || '[]');
    const reqIndex = requests.findIndex(r => r.id === id);

    if (reqIndex === -1) return;

    const request = requests[reqIndex];

    // --- Stock Validation (only on Approve) ---
    if (newStatus === 'Approved') {
        const issues = checkOrderStockIssues(request);
        if (issues.length > 0) {
            // Show warning and keep order as Pending — do NOT change status
            showStockWarningAlert(issues);
            return; // Stop — order remains Pending
        }
    }

    request.status = newStatus;
    request.processedAt = new Date().toISOString();

    if (newStatus === 'Approved') {
        recordSaleFromRequest(request);
    }

    localStorage.setItem('nd_requests_data', JSON.stringify(requests));
    closeOrderDetails();
    renderAdminRequests();
}

function recordSaleFromRequest(req) {
    const sales = JSON.parse(localStorage.getItem('nd_sales_history') || '[]');
    
    const now = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let hours = now.getHours();
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12 || 12;
    const timeStr = `${now.getDate()} ${months[now.getMonth()]}, ${now.getFullYear()} · ${hours}:${now.getMinutes().toString().padStart(2, '0')} ${ampm}`;

    let currentSales = JSON.parse(localStorage.getItem('nd_sales_history') || '[]');
    let userBal = typeof calculateTrueSpendableBalance === 'function' ? calculateTrueSpendableBalance(req.user.id) : 0;

    if (req.isGroupedOrder && req.items) {
        // Reverse array initially so after unshifting them all out they remain in logical order
        const itemsToProcess = [...req.items].reverse();
        if (itemsToProcess && itemsToProcess.length > 0) {
            itemsToProcess.forEach(item => {
                let delta = req.isRewardPurchase ? -Math.abs(item.total) : (item.payout || 0);
                userBal += delta;
                sales.unshift({
                    date: timeStr,
                    item: item.name,
                    qty: item.qty,
                    unitPrice: item.unitPrice,
                    price: item.total,
                    payoutEarned: delta,
                    payout: userBal,
                    isRewardPurchase: req.isRewardPurchase || false,
                    isFlexible: item.isFlexible || false,
                    customerID: req.user.id,
                    customerName: req.user.name,
                    type: 'Request',
                    productId: item.productId || ''
                });
            });
        }
    } else if (req.product) {
        let delta = req.isRewardPurchase ? -Math.abs(req.product.total) : (req.product.payout || 0);
        userBal += delta;
        sales.unshift({
            date: timeStr,
            item: req.product.name,
            qty: req.product.qty,
            unitPrice: req.product.total / req.product.qty,
            price: req.product.total,
            payoutEarned: delta,
            payout: userBal,
            isRewardPurchase: req.isRewardPurchase || false,
            customerID: req.user.id,
            customerName: req.user.name,
            type: 'Request',
            productId: req.product.productId || ''
        });
    }

    localStorage.setItem('nd_sales_history', JSON.stringify(sales));
}




