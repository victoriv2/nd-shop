// user-details.js
function openUserDetailsModal(userId) {
    // Attempt to fetch user data
    const users = JSON.parse(localStorage.getItem('nd_users') || '[]');
    let user = users.find(u => u.id === userId);

    // Calculate real spending and payout from sales history
    const sales = JSON.parse(localStorage.getItem('nd_sales_history') || '[]');
    let calculatedPayout = typeof calculateTrueSpendableBalance === 'function' ? calculateTrueSpendableBalance(userId) : 0;
    let calculatedSpending = 0;
    const userSales = sales.filter(s => s.customerID === userId);

    userSales.forEach(s => {
        calculatedSpending += parseFloat(s.price || (s.qty * s.unitPrice)) || 0;
    });

    // If not found, create dummy creative data specifically for this user
    if (!user) {
        const generatedName = "customer" + userId + "nd";
        user = {
            id: userId,
            name: generatedName,
            email: generatedName.toLowerCase() + "@example.com",
            phone: "+234 " + Math.floor(1000000000 + Math.random() * 9000000000),
            address: "123 Main Street, Block B",
            state: "Lagos",
            lga: "Ikeja",
            totalPayout: calculatedPayout,
            totalSpending: calculatedSpending,
            joinDate: new Date().toLocaleDateString()
        };
    } else {
        // Fallbacks for missing fields
        user.address = user.address || "Not provided";
        user.state = user.state || "Not provided";
        user.lga = user.lga || "Not provided";
        user.totalPayout = calculatedPayout;
        user.totalSpending = calculatedSpending;
        user.joinDate = user.joinDate || new Date().toLocaleDateString();
    }

    let modalContainer = document.getElementById('ud-dedicated-modal-container');
    if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'ud-dedicated-modal-container';
        document.body.appendChild(modalContainer);
    }

    // Compute activity data (customer-insights.js is loaded on the same page)
    let activityHtml = '';
    if (typeof computeUserActivity === 'function' && typeof formatLastSeen === 'function') {
        const allSales = JSON.parse(localStorage.getItem('nd_sales_history') || '[]');
        const activity = computeUserActivity(userId, allSales);
        const lastSeen = formatLastSeen(activity.lastSeenTimestamp);
        const barClass = typeof getBarColorClass === 'function' ? getBarColorClass(activity.percent) : '';
        const percentColor = typeof getPercentColor === 'function' ? getPercentColor(activity.percent) : '#64748b';
        const pulseDot = lastSeen.isNow ? '<span class="ci-pulse-dot"></span>' : '';

        activityHtml = `
                <div style="background: #f8fafc; border-radius: 16px; padding: 16px; margin-bottom: 20px; border: 1px solid #f1f5f9;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-size: 0.8rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Activity Level</span>
                        <span class="ci-last-seen ${lastSeen.cssClass}" style="font-size: 0.75rem; font-weight: 600; padding: 4px 10px; border-radius: 10px;">${pulseDot}${lastSeen.text}</span>
                    </div>
                    <div class="ci-activity-bar-wrapper">
                        <div class="ci-activity-bar">
                            <div class="ci-activity-fill ${barClass}" style="width: ${Math.max(activity.percent, 2)}%"></div>
                        </div>
                        <span class="ci-activity-percent" style="color: ${percentColor}">${activity.percent}%</span>
                    </div>
                </div>`;
    }

    modalContainer.innerHTML = `
        <div class="user-details-overlay" id="userDetailsOverlay">
            <div class="user-details-modal">
                <button class="user-details-close-btn" onclick="closeUserDetailsModal()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
                
                <div class="ud-header">
                    <div class="ud-avatar">
                        ${user.name.charAt(0).toUpperCase()}
                    </div>
                    <h2 class="ud-name">${user.name}</h2>
                    <span class="ud-role">Verified Customer</span>
                    <span class="ud-id" style="font-size: 0.8rem; color: #888; margin-top: 8px; font-weight: 600;">ID: ${user.id}</span>
                </div>
                
                <div class="ud-body">
                    <div class="ud-stats-container">
                    <div class="ud-stat-box">
                        <span class="ud-stat-label">Total Spending</span>
                        <span class="ud-stat-value">₦${user.totalSpending.toLocaleString()}</span>
                    </div>
                    <div class="ud-stat-box highlight-stat">
                        <span class="ud-stat-label">Total Payout</span>
                        <span class="ud-stat-value">₦${user.totalPayout.toLocaleString()}</span>
                    </div>
                </div>

                ${activityHtml}

                <div style="position:relative; width:100%; margin-bottom:16px;">
                    <button onclick="event.stopPropagation(); if(typeof openMessagingChat==='function') openMessagingChat('${user.id}', '${(user.name || 'User').replace(/'/g, "\\'")}');" style="width:100%; padding:14px; border:none; border-radius:14px; font-weight:700; font-size:0.9rem; cursor:pointer; background:#e0f2fe; color:#6366f1; transition:0.2s; display:flex; align-items:center; justify-content:center; gap:8px;">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                        Message User
                    </button>
                    ${(() => {
                        const msgs = JSON.parse(localStorage.getItem('nd_messages') || '[]');
                        const unread = msgs.filter(m => m.senderId === user.id && m.receiverId === 'ADMIN' && !(m.readBy || []).includes('ADMIN') && !(m.deletedFor || []).includes('ADMIN')).length;
                        return unread > 0 ? `<span style="position:absolute; top:-6px; right:-6px; background:#ff4d4d; color:white; font-size:9px; font-weight:800; min-width:18px; height:18px; padding:0 4px; border-radius:12px; display:flex; align-items:center; justify-content:center; border:2px solid white; box-shadow:0 0 8px rgba(255,77,77,0.4); z-index:10;">${unread > 9 ? '9+' : unread}</span>` : '';
                    })()}
                </div>

                <div class="ud-info-grid">
                    <div class="ud-info-item">
                        <span class="ud-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                        </span>
                        <div class="ud-info-content">
                            <span class="ud-info-label">Email Address</span>
                            <span class="ud-info-text">${user.email}</span>
                        </div>
                    </div>
                    <div class="ud-info-item">
                        <span class="ud-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                        </span>
                        <div class="ud-info-content">
                            <span class="ud-info-label">Phone Number</span>
                            <span class="ud-info-text">${user.phone}</span>
                        </div>
                    </div>
                    <div class="ud-info-item full-width">
                        <span class="ud-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        </span>
                        <div class="ud-info-content">
                            <span class="ud-info-label">Delivery Address</span>
                            <span class="ud-info-text">${user.address}</span>
                        </div>
                    </div>
                    <div class="ud-info-item">
                        <span class="ud-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        </span>
                        <div class="ud-info-content">
                            <span class="ud-info-label">State</span>
                            <span class="ud-info-text">${user.state}</span>
                        </div>
                    </div>
                    <div class="ud-info-item">
                        <span class="ud-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                        </span>
                        <div class="ud-info-content">
                            <span class="ud-info-label">LGA</span>
                            <span class="ud-info-text">${user.lga}</span>
                        </div>
                    </div>
                </div>
                </div> <!-- End ud-body -->
            </div>
        </div>
    `;

    // Add animation classes and event listeners
    setTimeout(() => {
        const overlay = document.getElementById('userDetailsOverlay');
        if (overlay) {
            overlay.classList.add('show');




        }
    }, 10);
}

function closeUserDetailsModal() {
    const overlay = document.getElementById('userDetailsOverlay');
    if (overlay) {
        overlay.classList.remove('show');
        setTimeout(() => {
            const modalContainer = document.getElementById('ud-dedicated-modal-container');
            if (modalContainer) {
                modalContainer.innerHTML = '';
            }
        }, 300);
    }
}



