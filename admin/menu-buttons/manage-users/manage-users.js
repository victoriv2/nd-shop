function openManageUsers() {
    fetch('menu-buttons/manage-users/manage-users.html')
        .then(res => res.text())
        .then(html => {
            const container = document.getElementById('modal-container');
            container.innerHTML = html;
            const modal = document.getElementById('manageUsersModal');
            setTimeout(() => {
                modal.style.display = 'flex';
                modal.offsetHeight;
                modal.classList.add('show');
            }, 10);
            renderManageUsersList();



            const searchInput = document.getElementById('muSearchInput');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => renderManageUsersList(e.target.value));
            }



            // Close main sort dropdown when clicking outside
            document.addEventListener('click', function closeMainSortDropdown(e) {
                const dd = document.getElementById('muMainSortDropdown');
                if (dd && dd.style.display === 'block') {
                    dd.style.display = 'none';
                }
                const modalEl = document.getElementById('manageUsersModal');
                if (!modalEl || !modalEl.classList.contains('show')) {
                    document.removeEventListener('click', closeMainSortDropdown);
                }
            });
        });
}

function closeManageUsers() {
    const modal = document.getElementById('manageUsersModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => document.getElementById('modal-container').innerHTML = '', 400);
    }
    if (typeof window.clearAdminModalPersistence === 'function') {
        window.clearAdminModalPersistence();
    }
}

window._currentMainUserSort = 'newest';

function renderManageUsersList(search = '') {
    const list = document.getElementById('muUserList');
    if (!list) return;
    const users = JSON.parse(localStorage.getItem('nd_users') || '[]');
    let filtered = users.filter(u => !u.is_admin);
    // Get pending requests for badge counting
    const allRequests = JSON.parse(localStorage.getItem('nd_requests_data') || '[]');
    const userPendingMap = {};
    let totalPendingUsers = 0;

    allRequests.forEach(r => {
        if (r.status === 'Pending') {
            const uid = r.userId || (r.user && r.user.id);
            if (uid) {
                if (!userPendingMap[uid]) {
                    userPendingMap[uid] = 0;
                    totalPendingUsers++; // count unique users
                }
                userPendingMap[uid]++;
            }
        }
    });

    // Update filter dropdown badge dynamically
    const filterBadge = document.getElementById('muFilterPendingBadge');
    if (filterBadge) {
        if (totalPendingUsers > 0) {
            filterBadge.textContent = totalPendingUsers;
            filterBadge.style.display = 'inline-block';
        } else {
            filterBadge.style.display = 'none';
        }
    }

    if (search) {
        filtered = filtered.filter(u =>
            (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
            (u.phone && u.phone.includes(search)) ||
            (u.email && u.email.toLowerCase().includes(search.toLowerCase()))
        );
    }

    // Get sales for high/low spending sort
    const allSales = JSON.parse(localStorage.getItem('nd_sales_history') || '[]');
    const userSpendingMap = {};
    allSales.forEach(s => {
        if (s.customerID) {
            if (!userSpendingMap[s.customerID]) userSpendingMap[s.customerID] = 0;
            userSpendingMap[s.customerID] += parseFloat(s.price || (s.qty * s.unitPrice)) || 0;
        }
    });

    // Apply specific "filters" which we mapped to sortType
    if (window._currentMainUserSort === 'pending') {
        filtered = filtered.filter(u => userPendingMap[u.id] && userPendingMap[u.id] > 0);
    }

    // Apply Sorting logic
    filtered.sort((a, b) => {
        if (window._currentMainUserSort === 'az') {
            return (a.name || '').localeCompare(b.name || '');
        } else if (window._currentMainUserSort === 'za') {
            return (b.name || '').localeCompare(a.name || '');
        } else if (window._currentMainUserSort === 'oldest') {
            const dateA = new Date(a.joinDate || 0).getTime();
            const dateB = new Date(b.joinDate || 0).getTime();
            return dateA - dateB;
        } else if (window._currentMainUserSort === 'highlow') {
            const spendA = userSpendingMap[a.id] || 0;
            const spendB = userSpendingMap[b.id] || 0;
            return spendB - spendA;
        } else if (window._currentMainUserSort === 'lowhigh') {
            const spendA = userSpendingMap[a.id] || 0;
            const spendB = userSpendingMap[b.id] || 0;
            return spendA - spendB;
        } else {
            // Default to newest
            const dateA = new Date(a.joinDate || 0).getTime();
            const dateB = new Date(b.joinDate || 0).getTime();
            return dateB - dateA;
        }
    });

    if (filtered.length === 0) {
        list.innerHTML = `
            <div style="text-align:center; padding: 60px 20px; color: #94a3b8; display:flex; flex-direction:column; align-items:center;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 12px; opacity: 0.5;">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <h3 style="margin: 0; font-size: 1.1rem; color: #475569;">No users match filter</h3>
                <p style="font-size: 0.85rem; margin-top: 4px;">Try a different filter or search term</p>
            </div>`;
        return;
    }

    const messages = JSON.parse(localStorage.getItem('nd_messages') || '[]');

    list.innerHTML = filtered.map(u => {
        const isBlocked = u.status === 'blocked';
        const userPending = allRequests.filter(r => (r.userId === u.id || (r.user && r.user.id === u.id)) && r.status === 'Pending').length;
        const badgeHtml = userPending > 0 ? `<span style="position:absolute; top:-4px; right:-4px; background:#ff4d4d; color:white; font-size:10px; font-weight:800; width:18px; height:18px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid white; box-shadow:0 0 8px rgba(255,77,77,0.4);">${userPending > 9 ? '9+' : userPending}</span>` : '';
        
        // Calculate unread messages from this specific user
        const unreadMsgs = messages.filter(m => m.senderId === u.id && m.receiverId === 'ADMIN' && !(m.readBy || []).includes('ADMIN') && !(m.deletedFor || []).includes('ADMIN')).length;
        const msgBadgeHtml = unreadMsgs > 0 ? `<span style="position:absolute; top:-6px; right:-6px; background:#ff4d4d; color:white; font-size:9px; font-weight:800; min-width:18px; height:18px; padding:0 4px; border-radius:12px; display:flex; align-items:center; justify-content:center; border:2px solid white; box-shadow:0 0 8px rgba(255,77,77,0.4);">${unreadMsgs > 9 ? '9+' : unreadMsgs}</span>` : '';

        return `
            <div class="mu-user-card ${isBlocked ? 'blocked' : ''}" onclick="openUserInfoModal('${u.id}')">
                <div class="mu-avatar" style="position:relative;">${(u.name || '?').charAt(0).toUpperCase()}${badgeHtml}</div>
                <div class="mu-info">
                    <h4>${u.name || 'Unknown User'}</h4>
                    <p>${u.phone || u.email || 'No contact info'}</p>
                </div>
                <div style="position:relative; display:inline-block;">
                    <button class="mu-msg-btn" onclick="event.stopPropagation(); if(typeof openMessagingChat==='function') openMessagingChat('${u.id}', '${(u.name || 'User').replace(/'/g, "\\'")}');" style="padding:10px 18px; border-radius:12px; font-weight:700; font-size:0.85rem; cursor:pointer; border:none; background:#e0f2fe; color:#8b5cf6; transition:0.2s;">Message</button>
                    ${msgBadgeHtml}
                </div>
            </div>
        `;
    }).join('');
}

function setMuMainSort(sortType, optElement) {
    document.querySelectorAll('.mu-main-sort-option').forEach(o => {
        o.classList.remove('active');
        o.style.fontWeight = 'normal';
        o.style.color = '#64748b';
    });
    optElement.classList.add('active');
    optElement.style.fontWeight = '700';
    optElement.style.color = '#1e293b';

    window._currentMainUserSort = sortType;
    document.getElementById('muMainSortDropdown').style.display = 'none';
    const searchInput = document.getElementById('muSearchInput');
    renderManageUsersList(searchInput ? searchInput.value : '');
}

function openUserInfoModal(id) {
    const users = JSON.parse(localStorage.getItem('nd_users') || '[]');
    const user = users.find(u => u.id === id);
    if (!user) return;

    fetch('menu-buttons/manage-users/user-info-modal.html')
        .then(res => res.text())
        .then(html => {
            let container = document.getElementById('nested-modal-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'nested-modal-container';
                document.body.appendChild(container);
            }
            container.innerHTML = html;

            // Format basic info
            const name = user.name || 'N/A';
            const email = user.email || 'N/A';
            const idVal = user.id || 'N/A';
            const phone = user.phone || 'N/A';
            const state = user.state || 'N/A';
            const lga = user.lga || 'N/A';
            const address = user.address || 'N/A';

            // Generate a join date format yyyy-mm-dd by hh:mmam/pm
            const d = user.joinDate ? new Date(user.joinDate) : new Date();
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            let hh = d.getHours();
            const min = String(d.getMinutes()).padStart(2, '0');
            const ampm = hh >= 12 ? 'pm' : 'am';
            hh = hh % 12 || 12;
            const joinDateStr = `${yyyy}-${mm}-${dd} by ${hh}:${min}${ampm}`;

            // Calculate real spending, payout, and grab requests
            const sales = JSON.parse(localStorage.getItem('nd_sales_history') || '[]');
            const userSales = sales.filter(s => s.customerID === id);

            const requests = JSON.parse(localStorage.getItem('nd_requests_data') || '[]');
            const userRequests = requests.filter(r => r.userId === id || (r.user && r.user.id === id));
            const pendingRequests = userRequests.filter(r => r.status === 'Pending').length;

            let calculatedSpending = 0;
            let calculatedPayout = typeof calculateTrueSpendableBalance === 'function' ? calculateTrueSpendableBalance(id) : 0;
            let totalItemsPurchased = 0;

            userSales.forEach(s => {
                calculatedSpending += parseFloat(s.price || (s.qty * s.unitPrice)) || 0;
                totalItemsPurchased += parseInt(s.qty) || 1;
            });

            let statusText = user.status === 'blocked' ? 'Blocked' : 'Active';
            let statusColor = user.status === 'blocked' ? '#ef4444' : '#059669';
            if (user.status !== 'blocked' && typeof computeUserActivity === 'function' && typeof formatLastSeen === 'function') {
                const activity = computeUserActivity(id, sales);
                const ls = formatLastSeen(activity.lastSeenTimestamp);
                statusText = ls.text;
                statusColor = ls.isNow ? '#059669' : '#d97706';
            }

            document.getElementById('muUserInfoBody').innerHTML = `
                <div class="user-detail-header">
                    <div class="user-detail-avatar">${name.charAt(0).toUpperCase()}</div>
                    <h2 style="margin:0; font-weight:800;">${name}</h2>
                    <div style="font-size: 0.8rem; color: #888; margin-top: 6px; font-weight: 500;">
                        Joined on: ${joinDateStr}
                    </div>
                </div>
                
                <div class="mu-stats-grid">
                    <div class="mu-stat-box">
                        <span class="mu-stat-label">Total Spending</span>
                        <span class="mu-stat-value">₦${calculatedSpending.toLocaleString()}</span>
                    </div>
                    <div class="mu-stat-box highlight">
                        <span class="mu-stat-label">Payout Balance</span>
                        <span class="mu-stat-value">₦${calculatedPayout.toLocaleString()}</span>
                    </div>
                </div>

                <div class="user-detail-row"><span class="user-detail-label">User ID</span><span class="user-detail-value">${idVal}</span></div>
                <div class="user-detail-row"><span class="user-detail-label">Email</span><span class="user-detail-value">${email}</span></div>
                <div class="user-detail-row"><span class="user-detail-label">Phone</span><span class="user-detail-value">${phone}</span></div>
                <div class="user-detail-row"><span class="user-detail-label">Address</span><span class="user-detail-value" style="font-size: 0.9rem; max-width: 60%;">${address}</span></div>
                <div class="user-detail-row"><span class="user-detail-label">State</span><span class="user-detail-value">${state}</span></div>
                <div class="user-detail-row"><span class="user-detail-label">LGA</span><span class="user-detail-value">${lga}</span></div>
                <div class="user-detail-row" style="border:none;"><span class="user-detail-label">Account Status</span><span class="user-detail-value" style="color:${statusColor}">${statusText}</span></div>
                
                <hr style="border:none; border-top: 1px dashed #e2e8f0; margin: 24px 0;">
                
                <div class="mu-history-summary">
                    <div style="flex-grow:1;">
                        <h4 style="margin:0 0 4px 0; color:#1e293b; font-size:1.05rem;">Transaction History</h4>
                        <p style="margin:0; color:#64748b; font-size:0.85rem; font-weight:500;">
                            ${userSales.length} / ${totalItemsPurchased} Items Bought • ${userRequests.length} Requests${pendingRequests > 0 ? ' <span style="display:inline-flex; align-items:center; justify-content:center; min-width:18px; height:18px; padding:0 5px; border-radius:50%; background:#ff4d4d; color:white; font-size:10px; font-weight:800; margin-left:4px; border:2px solid white; box-shadow:0 0 8px rgba(255,77,77,0.4);">' + pendingRequests + '</span>' : ''}
                        </p>
                    </div>
                    <button class="mu-history-btn" onclick="toggleUserHistory('${id}')">View All Activity</button>
                </div>
                
                <div id="muHistoryPanel" class="mu-history-panel">
                    <!-- History injected here -->
                </div>
            `;

            const modal = document.getElementById('muUserInfoModal');
            setTimeout(() => {
                modal.style.display = 'flex';
                modal.offsetHeight;
                modal.classList.add('show');



            }, 10);
        });
}

// Global variable to hold user history temporarily for filtering
window._currentUserHistory = [];

function toggleUserHistory(userId) {
    const panel = document.getElementById('muHistoryPanel');
    if (panel.style.display === 'block') {
        panel.style.display = 'none';
        return;
    }

    panel.style.display = 'block';
    panel.innerHTML = '<div style="text-align:center; padding: 20px;">Loading history...</div>';

    setTimeout(() => {
        const sales = JSON.parse(localStorage.getItem('nd_sales_history') || '[]');
        const userSalesOuter = sales.filter(s => s.customerID === userId);

        const requests = JSON.parse(localStorage.getItem('nd_requests_data') || '[]');
        const userRequestsOuter = requests.filter(r => r.userId === userId || (r.user && r.user.id === userId));

        window._currentUserHistory = [];
        window._currentHistoryFilterStatus = 'All';
        window._currentHistorySort = 'newest';

        // Count pending for badge
        const pendingCount = userRequestsOuter.filter(r => r.status === 'Pending').length;
        const pendingBadge = pendingCount > 0 ? `<span style="display:inline-flex; align-items:center; justify-content:center; min-width:18px; height:18px; padding:0 5px; border-radius:50%; background:#ff4d4d; color:white; font-size:10px; font-weight:800; margin-left:6px; border:2px solid white; box-shadow:0 0 8px rgba(255,77,77,0.4); animation: pulse-glow 1.5s infinite;">${pendingCount > 9 ? '9+' : pendingCount}</span>` : '';

        let historyHTML = `
            <div style="display: flex; gap: 10px; margin-top: 4px; margin-bottom: 4px; position: relative;">
                <input type="text" id="muActivitySearch" placeholder="Search activity..." style="flex: 1; min-width: 0; padding: 10px 14px; border-radius: 12px; border: 1px solid #e2e8f0; font-size: 0.9rem; outline: none;" oninput="filterHistoryAndSort()">
                <div style="position: relative;">
                    <button onclick="const dd = document.getElementById('muSortDropdown'); dd.style.display = (dd.style.display === 'none' ? 'block' : 'none'); event.stopPropagation();" style="padding: 10px 14px; border-radius: 12px; border: 1px solid #e2e8f0; background: white; font-weight: 600; font-size: 0.9rem; color: #444; cursor: pointer; white-space: nowrap;">Sort</button>
                    <div id="muSortDropdown" style="display: none; position: absolute; right: 0; top: 110%; background: white; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); width: 160px; z-index: 100; overflow: hidden; border: 1px solid #eee;">
                        <div class="mu-sort-option active" data-sort="newest" onclick="setMuHistorySort('newest', this)" style="padding: 10px 14px; font-size: 0.85rem; cursor: pointer; border-bottom: 1px solid #f1f5f9; font-weight: 700;">Newest</div>
                        <div class="mu-sort-option" data-sort="oldest" onclick="setMuHistorySort('oldest', this)" style="padding: 10px 14px; font-size: 0.85rem; cursor: pointer; border-bottom: 1px solid #f1f5f9;">Oldest</div>
                        <div class="mu-sort-option" data-sort="highest" onclick="setMuHistorySort('highest', this)" style="padding: 10px 14px; font-size: 0.85rem; cursor: pointer; border-bottom: 1px solid #f1f5f9;">Highest Amount</div>
                        <div class="mu-sort-option" data-sort="lowest" onclick="setMuHistorySort('lowest', this)" style="padding: 10px 14px; font-size: 0.85rem; cursor: pointer;">Lowest Amount</div>
                    </div>
                </div>
            </div>
            <div class="mu-history-tabs" style="margin-top: 12px;">
                <button class="active" onclick="filterHistory('All', this)">All</button>
                <button id="muPendingTabBtn" onclick="filterHistory('Pending', this)">Pending${pendingBadge}</button>
                <button onclick="filterHistory('Approved', this)">Approved</button>
                <button onclick="filterHistory('Declined', this)">Declined</button>
                <button onclick="filterHistory('AI', this)">AI</button>
            </div>
            <div id="muHistoryListWrapper">
        `;

        if (userSalesOuter.length === 0 && userRequestsOuter.length === 0) {
            historyHTML += `<div style="text-align:center; padding: 30px; color:#94a3b8; font-weight:600;">No transactions found for this user.</div>`;
        } else {
            const combined = [];
            window._currentHistoryUserId = userId; // Store userId for modal reference formatting

            userSalesOuter.forEach((s, idx) => {
                // Ensure item total and unit price are safely parsed
                const unitPrice = parseFloat(s.unitPrice || s.price || 0);
                const qty = parseInt(s.qty || 1);
                const itemTotal = parseFloat(s.price || (qty * unitPrice)) || 0;

                // Payout is specifically s.payoutEarned, falling back to s.payout only if payoutEarned is missing.
                const payoutAmount = s.payoutEarned !== undefined ? parseFloat(s.payoutEarned) : (s.payout !== undefined && s.payout !== null && s.payout !== '' ? parseFloat(s.payout) : (itemTotal * ((parseFloat(localStorage.getItem('nd_payout_rate')) || 2) / 100)) || 0);

                const itemName = s.item || s.productName || 'Item';

                const descText = `${itemName} - ₦${unitPrice.toLocaleString()} per unit - x${qty} - Total: ₦${itemTotal.toLocaleString()}`;
                combined.push({ id: 's' + idx, refUserId: userId, original: s, type: 'Sale', text: descText, price: payoutAmount, remaining: parseFloat(s.payout) || 0, date: s.date, status: 'Approved' });
            });
            userRequestsOuter.forEach((r, idx) => {
                let itemPrice = 0;
                let descText = '';
                let payoutAmount = 0;

                if (r.isGroupedOrder && r.items) {
                    itemPrice = parseFloat(r.orderTotal || 0);
                    const itemNames = r.items.map(i => `${i.name} (x${i.qty})`).join(', ');
                    descText = `Grouped Order: ${itemNames} - Total: ₦${itemPrice.toLocaleString()}`;
                    payoutAmount = parseFloat(r.totalPayout) || (itemPrice * ((parseFloat(localStorage.getItem('nd_payout_rate')) || 2) / 100)) || 0;
                } else if (r.product) {
                    itemPrice = parseFloat(r.product.total);
                    const unitPrice = parseFloat(r.product.price || 0);
                    const qty = r.product.quantity || r.product.qty || 1;
                    descText = `${r.product.name} - ₦${unitPrice.toLocaleString()} per unit - x${qty} - Total: ₦${itemPrice.toLocaleString()}`;
                    payoutAmount = parseFloat(r.product.payout) || (itemPrice * ((parseFloat(localStorage.getItem('nd_payout_rate')) || 2) / 100)) || 0;
                }

                combined.push({ id: 'r' + idx, refUserId: userId, original: r, type: 'Request', text: descText, price: (r.status === 'Pending' ? itemPrice : payoutAmount), remaining: 0, date: r.date || r.timestamp, status: r.status });
            });

            window._currentUserHistory = combined;
            window._currentHistoryFilterStatus = 'All';
            window._currentHistorySort = 'newest';

            // Make sure the initial render goes through the sort funnel
            filterHistoryAndSort(false);
        }

        // render logic returns empty, handled natively by filter logic after dom insertion
        panel.innerHTML = historyHTML;

        // After inserting into DOM, we run the filter immediately
        if (window._currentUserHistory.length > 0) {
            filterHistoryAndSort();
        }

        // scroll to the top of the history panel / summary
        const modalBody = document.getElementById('muUserInfoBody');
        const summaryEl = document.querySelector('.mu-history-summary');
        const panelEl = document.getElementById('muHistoryPanel');
        const scrollTarget = summaryEl ? summaryEl.offsetTop - 10 : panelEl.offsetTop - 20;
        modalBody.scrollTo({ top: scrollTarget, behavior: 'smooth' });

        // Close dropdown when clicking anywhere else
        document.addEventListener('click', function closeSortDropdown(e) {
            const dd = document.getElementById('muSortDropdown');
            if (dd && dd.style.display === 'block') {
                dd.style.display = 'none';
            }
            // If the modal itself is gone, remove listener
            if (!document.getElementById('muHistoryPanel')) {
                document.removeEventListener('click', closeSortDropdown);
            }
        });
    }, 300);
}

function renderHistoryItems(items) {
    if (items.length === 0) {
        return `<div style="text-align:center; padding: 30px; color:#94a3b8; font-weight:600;">No transactions match this filter.</div>`;
    }
    return items.map(item => {
        const isApprovedPayout = item.status === 'Approved' && item.type === 'Sale';
        const isPending = item.status === 'Pending';
        
        let priceVal = parseFloat(item.price) || 0;
        let formattedPrice = Math.abs(priceVal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        let signSpan = '';
        let statusColor = '';
        
        if (isApprovedPayout) {
            if (priceVal > 0) {
                signSpan = '<span class="green-plus" style="color:#10b981; font-weight:700; margin-right:2px;">+</span>';
                statusColor = 'color:#10b981;';
            } else if (priceVal < 0) {
                signSpan = '<span class="red-minus" style="color:#ef4444; font-weight:700; margin-right:2px;">-</span>';
                statusColor = 'color:#ef4444;';
            } else {
                signSpan = '';
                statusColor = 'color:#6b7280;';
            }
        } else {
            statusColor = isPending ? 'color:#8b5cf6;' : (item.status === 'Declined' ? 'color:#ef4444;' : '');
        }
        
        const statusText = isApprovedPayout ? (priceVal < 0 ? 'Reward Spent' : 'Payout') : item.status;

        // Build inline action buttons for pending requests
        let inlineActions = '';
        if (isPending && item.type === 'Request' && item.original && item.original.id) {
            inlineActions = `
                <div style="display:flex; gap:10px; margin-top:12px;">
                    <button onclick="event.stopPropagation(); processRequestFromUserModal('${item.original.id}', 'Declined')" style="flex:1; padding:10px; border:none; border-radius:10px; font-weight:700; font-size:0.85rem; background:#fee2e2; color:#ef4444; cursor:pointer;">Decline</button>
                    <button onclick="event.stopPropagation(); processRequestFromUserModal('${item.original.id}', 'Approved')" style="flex:1; padding:10px; border:none; border-radius:10px; font-weight:700; font-size:0.85rem; background:#edf1f7; color:#8b5cf6; cursor:pointer;">Approve</button>
                </div>
            `;
        }

        // Pending indicator dot
        const pendingDot = isPending ? '<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#8b5cf6; margin-right:6px; animation: pulse-glow 1.5s infinite; box-shadow: 0 0 6px rgba(27, 38, 59,0.5);"></span>' : '';

        return `
            <div class="regular-card" style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px dashed #cbd5e1; cursor:pointer; ${isPending ? 'border-left: 3px solid #8b5cf6; padding-left: 12px;' : ''}" onclick="openActivityDetails('${item.id}')">
                <div class="card-main-amount">
                    ${signSpan}${formattedPrice} <span class="card-payout-text" style="${statusColor}">${pendingDot}${statusText}</span>
                </div>
                <div class="card-details-row">
                    <span class="card-buying-text">${item.text}</span>
                    <span class="card-time-text">|| ${item.date}</span>
                </div>
                ${inlineActions}
            </div>
        `;
    }).join('');
}

function filterHistoryAndSort() {
    const wrapper = document.getElementById('muHistoryListWrapper');
    if (!wrapper) return;

    let filtered = [...window._currentUserHistory];

    // 1. Filter by Status
    if (window._currentHistoryFilterStatus !== 'All') {
        if (window._currentHistoryFilterStatus === 'AI') {
            filtered = filtered.filter(i => i.original && i.original.source === 'AI');
        } else {
            filtered = filtered.filter(i => i.status === window._currentHistoryFilterStatus);
        }
    }

    // 2. Filter by Search Text
    const searchInput = document.getElementById('muActivitySearch');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    if (searchTerm) {
        filtered = filtered.filter(i =>
            i.text.toLowerCase().includes(searchTerm) ||
            i.type.toLowerCase().includes(searchTerm) ||
            i.status.toLowerCase().includes(searchTerm) ||
            (i.original && i.original.source && i.original.source.toLowerCase().includes(searchTerm))
        );
    }

    // 3. Apply Sorting
    filtered.sort((a, b) => {
        if (window._currentHistorySort === 'highest' || window._currentHistorySort === 'lowest') {
            const priceA = a.price || 0;
            const priceB = b.price || 0;
            return window._currentHistorySort === 'highest' ? priceB - priceA : priceA - priceB;
        } else {
            // Sort by Date logic pulling from parsed strings
            const parseDt = (dateStr) => {
                if (!dateStr) return 0;
                if (dateStr.includes('·')) return new Date(dateStr.split('·')[0]).getTime();
                return new Date(dateStr).getTime() || 0;
            };
            const dateA = parseDt(a.date);
            const dateB = parseDt(b.date);
            return window._currentHistorySort === 'newest' ? dateB - dateA : dateA - dateB;
        }
    });

    wrapper.innerHTML = renderHistoryItems(filtered);
}

function filterHistory(status, btnElement) {
    if (btnElement) {
        document.querySelectorAll('.mu-history-tabs button').forEach(b => b.classList.remove('active'));
        btnElement.classList.add('active');
    }
    window._currentHistoryFilterStatus = status;
    filterHistoryAndSort();
}

function setMuHistorySort(sortType, optElement) {
    document.querySelectorAll('.mu-sort-option').forEach(o => {
        o.classList.remove('active');
        o.style.fontWeight = 'normal';
    });
    optElement.classList.add('active');
    optElement.style.fontWeight = '700';

    window._currentHistorySort = sortType;
    document.getElementById('muSortDropdown').style.display = 'none';
    filterHistoryAndSort();
}

function openActivityDetails(itemId) {
    const item = window._currentUserHistory.find(i => i.id === itemId);
    if (!item) return;

    // Build a quick nested overlay
    const isApprovedPayout = item.status === 'Approved' && item.type === 'Sale';

    // Transaction ID formatting logic specific to user
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const dd = now.getDate().toString().padStart(2, '0');
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12 || 12;
    const strHours = hours.toString().padStart(2, '0');

    let txnUserId = item.refUserId || '00000ND';
    if (txnUserId.endsWith('nd')) {
        txnUserId = 'nd' + txnUserId.slice(0, -2);
    } else if (txnUserId.endsWith('nd SHOP')) {
        txnUserId = 'nd SHOP' + txnUserId.slice(0, -2);
    }
    const txnId = `TXN-${txnUserId}${yyyy}${mm}${dd}${strHours}${minutes}${ampm}`;
    const refId = item.refUserId || '00000ND';

    let priceVal = parseFloat(item.price) || 0;
    let formattedPrice = Math.abs(priceVal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    let plusSign = '';
    let statusBg = '';
    let statusColor = '';
    let statusText = item.status;
    const titleText = item.type === 'Sale' ? 'Payout Details' : 'Request Details';

    if (isApprovedPayout) {
        if (priceVal > 0) {
            plusSign = '<span class="mu-payout-plus tm-plus" style="color:#10b981; font-size:2.5rem; font-weight:700; margin-right:2px;">+</span>';
            statusBg = '#d1fae5';
            statusColor = '#10b981';
            statusText = 'Payout';
        } else if (priceVal < 0) {
            plusSign = '<span class="mu-payout-plus tm-plus" style="color:#ef4444; font-size:2.5rem; font-weight:700; margin-right:2px;">-</span>';
            statusBg = '#fee2e2';
            statusColor = '#ef4444';
            statusText = 'Reward Spent';
        } else {
            plusSign = '';
            statusBg = '#edf1f7';
            statusColor = '#6b7280';
            statusText = 'Payout';
        }
    } else if (item.status === 'Pending') {
        statusBg = '#f0f4f8';
        statusColor = '#2c3e50';
    } else {
        statusBg = '#fee2e2';
        statusColor = '#dc2626';
    }

    // Build action buttons for pending requests
    let actionButtonsHtml = '';
    if (item.status === 'Pending' && item.type === 'Request' && item.original && item.original.id) {
        actionButtonsHtml = `
            <div style="display:flex; gap:12px; padding:20px 24px; border-top:1px solid #eee;">
                <button onclick="processRequestFromUserModal('${item.original.id}', 'Declined')" style="flex:1; padding:14px; border:none; border-radius:12px; font-weight:700; font-size:0.95rem; background:#fee2e2; color:#ef4444; cursor:pointer;">Decline</button>
                <button onclick="processRequestFromUserModal('${item.original.id}', 'Approved')" style="flex:1; padding:14px; border:none; border-radius:12px; font-weight:700; font-size:0.95rem; background:#edf1f7; color:#8b5cf6; cursor:pointer;">Approve</button>
            </div>
        `;
    }

    let remainingRowHtml = '';
    if (item.type === 'Sale' && item.remaining !== undefined) {
        remainingRowHtml = `
            <div class="mu-payout-detail-item tm-detail-item" style="border-bottom:1px dashed #e0e0e0; padding:10px 0;">
                <span class="mu-payout-label tm-label" style="display:block; color:#888; font-size:0.9rem;">Remaining Balance</span>
                <span class="mu-payout-value tm-value" style="display:block; font-weight:600; color:#333;">₦${Math.round(item.remaining).toLocaleString()}</span>
            </div>
        `;
    }

    const detailHtml = `
        <div class="admin-modal-overlay mu-payout-modal-overlay nested-modal" id="muActivityDetailModal" style="z-index: 100060 !important; display:none; align-items:flex-end;">
            <div class="mu-payout-modal-content transaction-modal-content">
                <div class="mu-payout-header tm-header">
                    <h3>${titleText}</h3>
                    <span class="mu-payout-close tm-close" style="right:24px; position:absolute;" onclick="closeActivityDetails()">&times;</span>
                </div>
                <div class="mu-payout-body tm-body" style="padding:24px; overflow-y:auto;">
                    <div class="mu-payout-amount-section tm-amount-section" style="text-align:center; margin-bottom:30px; display:flex; flex-direction:column; align-items:center;">
                        <div class="mu-payout-amount-wrapper tm-amount-wrapper" style="display:flex; align-items:center; justify-content:center;">
                            ${plusSign}
                            <span class="mu-payout-amount tm-amount" id="tmAmountValue" style="color:#333; font-size:2.5rem; font-weight:700;">${formattedPrice}</span>
                        </div>
                        <div class="mu-payout-status tm-status" style="display:inline-block; padding:6px 14px; border-radius:20px; font-size:0.9rem; font-weight:600; background:${statusBg}; color:${statusColor};">
                            ${statusText}
                        </div>
                    </div>

                    <div class="mu-payout-details-list tm-details-list" style="background:#f9f9f9; padding:16px; border-radius:16px;">
                        <div class="mu-payout-detail-item tm-detail-item" style="border-bottom:1px dashed #e0e0e0; padding:10px 0;">
                            <span class="mu-payout-label tm-label" style="display:block; color:#888; font-size:0.9rem;">Type</span>
                            <span class="mu-payout-value tm-value" style="display:block; font-weight:600; color:#333;">${isApprovedPayout ? (priceVal < 0 ? 'Reward Spent' : 'Payout') : item.type}</span>
                        </div>
                        ${remainingRowHtml}
                        <div class="mu-payout-detail-item tm-detail-item" style="border-bottom:1px dashed #e0e0e0; padding:10px 0;">
                            <span class="mu-payout-label tm-label" style="display:block; color:#888; font-size:0.9rem;">Description</span>
                            <span class="mu-payout-value tm-value" id="tmDescription" style="display:block; font-weight:600; color:#333;">${item.text}</span>
                        </div>
                        <div class="mu-payout-detail-item tm-detail-item" style="border-bottom:1px dashed #e0e0e0; padding:10px 0;">
                            <span class="mu-payout-label tm-label" style="display:block; color:#888; font-size:0.9rem;">Date & Time</span>
                            <span class="mu-payout-value tm-value" id="tmDate" style="display:block; font-weight:600; color:#333;">${item.date}</span>
                        </div>
                        <div class="mu-payout-detail-item tm-detail-item" style="border-bottom:1px dashed #e0e0e0; padding:10px 0;">
                            <span class="mu-payout-label tm-label" style="display:block; color:#888; font-size:0.9rem;">Transaction ID</span>
                            <span class="mu-payout-value tm-value" id="tmTransactionId" style="display:block; font-weight:600; color:#333;">${txnId}</span>
                        </div>
                        <div class="mu-payout-detail-item tm-detail-item" style="padding:10px 0;">
                            <span class="mu-payout-label tm-label" style="display:block; color:#888; font-size:0.9rem;">Reference</span>
                            <span class="mu-payout-value tm-value" id="tmReference" style="display:block; font-weight:600; color:#333;">${refId}</span>
                        </div>
                    </div>
                </div>
                ${actionButtonsHtml}
            </div>
        </div>
    `;

    // Append to container
    let container = document.getElementById('nested-modal-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'nested-modal-container';
        document.body.appendChild(container);
    }
    const existing = document.getElementById('muActivityDetailModalWrapper');
    if (existing) existing.remove();

    const wrapper = document.createElement('div');
    wrapper.id = 'muActivityDetailModalWrapper';
    wrapper.innerHTML = detailHtml;
    container.appendChild(wrapper);

    const modal = document.getElementById('muActivityDetailModal');
    setTimeout(() => {
        modal.style.display = 'flex';
        modal.offsetHeight;
        modal.classList.add('show');




    }, 10);
}

function closeActivityDetails() {
    const modal = document.getElementById('muActivityDetailModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            const wrapper = document.getElementById('muActivityDetailModalWrapper');
            if (wrapper) wrapper.remove();
        }, 300);
    }
}

function closeUserInfoModal() {
    const modal = document.getElementById('muUserInfoModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => document.getElementById('nested-modal-container').innerHTML = '', 400);
    }
}

function processRequestFromUserModal(requestId, newStatus) {
    const requests = JSON.parse(localStorage.getItem('nd_requests_data') || '[]');
    const reqIndex = requests.findIndex(r => r.id === requestId);
    if (reqIndex === -1) return;

    const request = requests[reqIndex];
    request.status = newStatus;
    request.processedAt = new Date().toISOString();

    // If approved, record the sale (reuse the same logic from request.js)
    if (newStatus === 'Approved' && typeof recordSaleFromRequest === 'function') {
        recordSaleFromRequest(request);
    }

    localStorage.setItem('nd_requests_data', JSON.stringify(requests));

    // Close the detail modal and refresh the history
    closeActivityDetails();

    // Re-toggle the history panel to refresh with updated data
    const userId = window._currentHistoryUserId;
    if (userId) {
        const panel = document.getElementById('muHistoryPanel');
        if (panel) panel.style.display = 'none';
        setTimeout(() => toggleUserHistory(userId), 400);
    }
}





