// admin/menu-buttons/customer-insights/customer-insights.js

// =============================================
// Customer Insights Module
// Tracks: last seen, patronage frequency, activity %
// =============================================

window._ciCurrentSort = 'recent';
window._ciCurrentFilter = 'all';
window._ciRefreshTimer = null;

// --- OPEN / CLOSE ---
function openCustomerInsights() {
    fetch('menu-buttons/customer-insights/customer-insights.html')
        .then(res => res.text())
        .then(html => {
            const container = document.getElementById('modal-container');
            container.innerHTML = html;
            const modal = document.getElementById('customerInsightsModal');
            setTimeout(() => {
                modal.style.display = 'flex';
                modal.offsetHeight;
                modal.classList.add('show');
            }, 10);

            renderCustomerInsights();

            // Real-time refresh every 5 seconds
            window._ciRefreshTimer = setInterval(() => {
                renderCustomerInsights();
            }, 5000);



            // Search handler
            const searchInput = document.getElementById('ciSearchInput');
            if (searchInput) {
                searchInput.addEventListener('input', () => renderCustomerInsights());
            }



            // Close sort dropdown on outside click
            document.addEventListener('click', function closeCiSortDropdown(e) {
                const dd = document.getElementById('ciSortDropdown');
                if (dd && dd.style.display === 'block') {
                    dd.style.display = 'none';
                }
                if (!document.getElementById('customerInsightsModal')) {
                    document.removeEventListener('click', closeCiSortDropdown);
                }
            });
        });
}

function closeCustomerInsights() {
    if (window._ciRefreshTimer) {
        clearInterval(window._ciRefreshTimer);
        window._ciRefreshTimer = null;
    }
    const modal = document.getElementById('customerInsightsModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => document.getElementById('modal-container').innerHTML = '', 400);
    }
    if (typeof window.clearAdminModalPersistence === 'function') {
        window.clearAdminModalPersistence();
    }
}

// --- SORT & FILTER ---
function setCiSort(sortType, el) {
    document.querySelectorAll('.ci-sort-option').forEach(o => {
        o.classList.remove('active');
        o.style.fontWeight = 'normal';
        o.style.color = '#64748b';
    });
    el.classList.add('active');
    el.style.fontWeight = '700';
    el.style.color = '#1e293b';
    window._ciCurrentSort = sortType;
    document.getElementById('ciSortDropdown').style.display = 'none';
    renderCustomerInsights();
}

function setCiFilter(filterType, el) {
    document.querySelectorAll('.ci-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    window._ciCurrentFilter = filterType;
    renderCustomerInsights();
}

// --- CORE: Compute Activity % for a User ---
// Rules:
//   - To be 100% active: patronize (buy) in 6 distinct months within the trailing 12 months
//   - Each month of patronage = 100/6 = ~16.67%
//   - Last seen decay: if last seen > 6 months (180 days), bar drops to 0%
//   - Otherwise, bar = (distinctMonthsPatronized / 6) * 100
//     but also decay linearly by days since last visit (180 day window)
function computeUserActivity(userId, allSales) {
    const now = new Date();
    const sixMonthsMs = 180 * 24 * 60 * 60 * 1000;

    // Get user's sales in the trailing 12 months
    const twelveMonthsAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const userSales = allSales.filter(s => {
        if (s.customerID !== userId) return false;
        const saleDate = parseFlexibleDate(s.date);
        return saleDate && saleDate >= twelveMonthsAgo;
    });

    // Count distinct months of patronage (in past 12 months)
    const monthSet = new Set();
    userSales.forEach(s => {
        const d = parseFlexibleDate(s.date);
        if (d) monthSet.add(`${d.getFullYear()}-${d.getMonth()}`);
    });
    const distinctMonths = Math.min(monthSet.size, 6);

    // Base percentage from patronage: 0-100%
    const patronagePercent = Math.round((distinctMonths / 6) * 100);

    // Get last seen
    const lastSeenData = getLastSeen(userId);
    const lastSeenMs = lastSeenData ? (now.getTime() - new Date(lastSeenData).getTime()) : Infinity;

    // Recency decay factor: 1.0 at 0 days, 0.0 at 180 days
    let recencyFactor = 1.0;
    if (lastSeenMs >= sixMonthsMs) {
        recencyFactor = 0;
    } else if (lastSeenMs > 0) {
        recencyFactor = 1 - (lastSeenMs / sixMonthsMs);
    }

    // Final percentage: patronage-based, but penalized by recency if they haven't been seen
    // If the user has never been seen (no lastSeen data), use patronage only
    let finalPercent;
    if (!lastSeenData) {
        finalPercent = patronagePercent;
    } else {
        // Blend: primarily patronage, but if recency drops to 0, it pulls toward 0
        finalPercent = Math.round(patronagePercent * (0.4 + 0.6 * recencyFactor));
    }

    finalPercent = Math.max(0, Math.min(100, finalPercent));

    return {
        percent: finalPercent,
        distinctMonths,
        patronagePercent,
        lastSeenMs,
        lastSeenTimestamp: lastSeenData,
        isActive: finalPercent >= 50 // Active threshold: 50%+
    };
}

// --- LAST SEEN helpers ---
function getLastSeen(userId) {
    const data = JSON.parse(localStorage.getItem('nd_user_last_seen') || '{}');
    return data[userId] || null;
}

function recordLastSeen(userId) {
    const data = JSON.parse(localStorage.getItem('nd_user_last_seen') || '{}');
    data[userId] = new Date().toISOString();
    localStorage.setItem('nd_user_last_seen', JSON.stringify(data));
}

// --- Format relative time ---
function formatLastSeen(timestamp) {
    if (!timestamp) return { text: 'Never', cssClass: 'seen-gone', isNow: false };

    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);

    if (diffSec < 10) return { text: 'Active now', cssClass: 'seen-now', isNow: true };
    if (diffSec < 60) return { text: `${diffSec}s ago`, cssClass: 'seen-now', isNow: false };
    if (diffMin < 60) return { text: `${diffMin}m ago`, cssClass: 'seen-recent', isNow: false };
    if (diffHr < 24) return { text: `${diffHr}h ago`, cssClass: 'seen-recent', isNow: false };
    if (diffDays === 1) return { text: 'Yesterday', cssClass: 'seen-away', isNow: false };
    if (diffDays < 7) return { text: `${diffDays}d ago`, cssClass: 'seen-away', isNow: false };
    if (diffWeeks < 4) return { text: `${diffWeeks}w ago`, cssClass: 'seen-away', isNow: false };
    if (diffMonths < 12) return { text: `${diffMonths}mo ago`, cssClass: 'seen-gone', isNow: false };
    return { text: '1y+ ago', cssClass: 'seen-gone', isNow: false };
}

// --- Parse flexible dates used in sales data ---
function parseFlexibleDate(dateStr) {
    if (!dateStr) return null;
    // Try direct parse
    let d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
    // Try splitting on '·' (used in some nd shop date formats)
    if (dateStr.includes('·')) {
        d = new Date(dateStr.split('·')[0].trim());
        if (!isNaN(d.getTime())) return d;
    }
    return null;
}

// --- Get fill color class based on percentage ---
function getBarColorClass(pct) {
    if (pct >= 80) return 'ci-fill-green';
    if (pct >= 60) return 'ci-fill-lime';
    if (pct >= 40) return 'ci-fill-yellow';
    if (pct >= 20) return 'ci-fill-orange';
    return 'ci-fill-red';
}

// --- Get percent text color ---
function getPercentColor(pct) {
    if (pct >= 80) return '#059669';
    if (pct >= 60) return '#65a30d';
    if (pct >= 40) return '#d97706';
    if (pct >= 20) return '#ea580c';
    return '#dc2626';
}

// --- Get avatar class ---
function getAvatarClass(pct) {
    if (pct >= 60) return 'active-avatar';
    if (pct >= 30) return 'mid-avatar';
    return 'inactive-avatar';
}

// --- RENDER ---
function renderCustomerInsights() {
    const list = document.getElementById('ciCustomerList');
    if (!list) return;

    const users = JSON.parse(localStorage.getItem('nd_users') || '[]');
    const allSales = JSON.parse(localStorage.getItem('nd_sales_history') || '[]');

    // Search filter
    const searchInput = document.getElementById('ciSearchInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

    // Build activity data for all users
    let userData = users.map(u => {
        const activity = computeUserActivity(u.id, allSales);
        return { user: u, ...activity };
    });

    // Search filter (name, ID, email, phone)
    if (searchTerm) {
        userData = userData.filter(d => {
            const u = d.user;
            return (u.name || '').toLowerCase().includes(searchTerm) ||
                   (u.id || '').toLowerCase().includes(searchTerm) ||
                   (u.email || '').toLowerCase().includes(searchTerm) ||
                   (u.phone || '').includes(searchTerm);
        });
    }

    // Counts (pre-filter for summary cards)
    const allUserData = users.map(u => {
        const activity = computeUserActivity(u.id, allSales);
        return { user: u, ...activity };
    });
    const activeCount = allUserData.filter(d => d.isActive).length;
    const inactiveCount = allUserData.filter(d => !d.isActive).length;

    const activeCountEl = document.getElementById('ciActiveCount');
    const inactiveCountEl = document.getElementById('ciInactiveCount');
    const totalCountEl = document.getElementById('ciTotalCount');
    if (activeCountEl) activeCountEl.textContent = activeCount;
    if (inactiveCountEl) inactiveCountEl.textContent = inactiveCount;
    if (totalCountEl) totalCountEl.textContent = users.length;

    // Active/Inactive filter
    if (window._ciCurrentFilter === 'active') {
        userData = userData.filter(d => d.isActive);
    } else if (window._ciCurrentFilter === 'inactive') {
        userData = userData.filter(d => !d.isActive);
    }

    // Sorting
    userData.sort((a, b) => {
        if (window._ciCurrentSort === 'recent') {
            const tsA = a.lastSeenTimestamp ? new Date(a.lastSeenTimestamp).getTime() : 0;
            const tsB = b.lastSeenTimestamp ? new Date(b.lastSeenTimestamp).getTime() : 0;
            return tsB - tsA; // Most recently active first
        } else if (window._ciCurrentSort === 'most-active') {
            return b.percent - a.percent;
        } else if (window._ciCurrentSort === 'least-active') {
            return a.percent - b.percent;
        } else if (window._ciCurrentSort === 'az') {
            return (a.user.name || '').localeCompare(b.user.name || '');
        } else if (window._ciCurrentSort === 'za') {
            return (b.user.name || '').localeCompare(a.user.name || '');
        }
        return 0;
    });

    // Empty state
    if (userData.length === 0) {
        list.innerHTML = `
            <div class="ci-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <h3>No customers found</h3>
                <p>Try a different search or filter</p>
            </div>`;
        return;
    }

    // Render cards
    list.innerHTML = userData.map((d, idx) => {
        const u = d.user;
        const lastSeen = formatLastSeen(d.lastSeenTimestamp);
        const initial = (u.name || '?').charAt(0).toUpperCase();
        const barClass = getBarColorClass(d.percent);
        const avatarClass = getAvatarClass(d.percent);
        const percentColor = getPercentColor(d.percent);
        const pulseDot = lastSeen.isNow ? '<span class="ci-pulse-dot"></span>' : '';

        return `
            <div class="ci-customer-card" style="cursor: pointer;" onclick="ciOpenUserInfo('${u.id}')">
                <div class="ci-card-top">
                    <div class="ci-avatar ${avatarClass}">${initial}</div>
                    <div class="ci-card-info">
                        <p class="ci-card-name">${u.name || 'Unknown User'}</p>
                        <p class="ci-card-id">${u.id || '—'}</p>
                    </div>
                    <span class="ci-last-seen ${lastSeen.cssClass}">${pulseDot}${lastSeen.text}</span>
                </div>
                <div class="ci-activity-bar-wrapper">
                    <div class="ci-activity-bar">
                        <div class="ci-activity-fill ${barClass}" style="width: ${Math.max(d.percent, 2)}%"></div>
                    </div>
                    <span class="ci-activity-percent" style="color: ${percentColor}">${d.percent}%</span>
                </div>
            </div>
        `;
    }).join('');
}

// --- Open User Info Modal from Customer Insights ---
function ciOpenUserInfo(userId) {
    const users = JSON.parse(localStorage.getItem('nd_users') || '[]');
    const user = users.find(u => u.id === userId);
    if (!user) return;

    fetch('menu-buttons/manage-users/user-info-modal.html')
        .then(res => res.text())
        .then(html => {
            document.getElementById('nested-modal-container').innerHTML = html;

            const name = user.name || 'N/A';
            const email = user.email || 'N/A';
            const idVal = user.id || 'N/A';
            const phone = user.phone || 'N/A';
            const state = user.state || 'N/A';
            const lga = user.lga || 'N/A';
            const address = user.address || 'N/A';

            // Join date format
            const d = user.joinDate ? new Date(user.joinDate) : new Date();
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            let hh = d.getHours();
            const min = String(d.getMinutes()).padStart(2, '0');
            const ampm = hh >= 12 ? 'pm' : 'am';
            hh = hh % 12 || 12;
            const joinDateStr = `${yyyy}-${mm}-${dd} by ${hh}:${min}${ampm}`;

            // Calculate spending & payout
            const sales = JSON.parse(localStorage.getItem('nd_sales_history') || '[]');
            const userSales = sales.filter(s => s.customerID === userId);
            const requests = JSON.parse(localStorage.getItem('nd_requests_data') || '[]');
            const userRequests = requests.filter(r => r.userId === userId || (r.user && r.user.id === userId));
            const pendingRequests = userRequests.filter(r => r.status === 'Pending').length;

            let calculatedSpending = 0;
            let calculatedPayout = 0;
            let totalItemsPurchased = 0;

            userSales.forEach(s => {
                calculatedPayout += parseFloat(s.payout) || 0;
                calculatedSpending += parseFloat(s.price || (s.qty * s.unitPrice)) || 0;
                totalItemsPurchased += parseInt(s.qty) || 1;
            });

            // Activity data for the insight bar inside the modal
            const allSales = JSON.parse(localStorage.getItem('nd_sales_history') || '[]');
            const activity = computeUserActivity(userId, allSales);
            const barClass = getBarColorClass(activity.percent);
            const percentColor = getPercentColor(activity.percent);
            const lastSeen = formatLastSeen(activity.lastSeenTimestamp);

            document.getElementById('muUserInfoBody').innerHTML = `
                <div class="user-detail-header">
                    <div class="user-detail-avatar">${name.charAt(0).toUpperCase()}</div>
                    <h2 style="margin:0; font-weight:800;">${name}</h2>
                    <div style="font-size: 0.8rem; color: #888; margin-top: 6px; font-weight: 500;">
                        Joined on: ${joinDateStr}
                    </div>
                    <div style="margin-top: 12px;">
                        <button onclick="event.stopPropagation(); if(typeof openMessagingChat==='function') openMessagingChat('${user.id}', '${(user.name || 'User').replace(/'/g, "\\'")}');" style="padding:10px 24px; border-radius:12px; font-weight:700; font-size:0.9rem; cursor:pointer; border:none; background:#e0f2fe; color:#8b5cf6; transition:0.2s; display:inline-flex; align-items:center; gap:8px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> Message</button>
                    </div>
                </div>

                <!-- Activity Insight Bar -->
                <div style="background: #f8fafc; border-radius: 16px; padding: 16px; margin-bottom: 20px; border: 1px solid #f1f5f9;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-size: 0.8rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Activity Level</span>
                        <span class="ci-last-seen ${lastSeen.cssClass}" style="font-size: 0.75rem; font-weight: 600; padding: 4px 10px; border-radius: 10px;">${lastSeen.isNow ? '<span class="ci-pulse-dot"></span>' : ''}${lastSeen.text}</span>
                    </div>
                    <div class="ci-activity-bar-wrapper">
                        <div class="ci-activity-bar">
                            <div class="ci-activity-fill ${barClass}" style="width: ${Math.max(activity.percent, 2)}%"></div>
                        </div>
                        <span class="ci-activity-percent" style="color: ${percentColor}">${activity.percent}%</span>
                    </div>
                </div>
                
                <div class="mu-stats-grid">
                    <div class="mu-stat-box">
                        <span class="mu-stat-label">Total Spending</span>
                        <span class="mu-stat-value">₦${calculatedSpending.toLocaleString()}</span>
                    </div>
                    <div class="mu-stat-box highlight">
                        <span class="mu-stat-label">Total Payout</span>
                        <span class="mu-stat-value">₦${calculatedPayout.toLocaleString()}</span>
                    </div>
                </div>

                <div class="user-detail-row"><span class="user-detail-label">User ID</span><span class="user-detail-value">${idVal}</span></div>
                <div class="user-detail-row"><span class="user-detail-label">Email</span><span class="user-detail-value">${email}</span></div>
                <div class="user-detail-row"><span class="user-detail-label">Phone</span><span class="user-detail-value">${phone}</span></div>
                <div class="user-detail-row"><span class="user-detail-label">Address</span><span class="user-detail-value" style="font-size: 0.9rem; max-width: 60%;">${address}</span></div>
                <div class="user-detail-row"><span class="user-detail-label">State</span><span class="user-detail-value">${state}</span></div>
                <div class="user-detail-row"><span class="user-detail-label">LGA</span><span class="user-detail-value">${lga}</span></div>
                <div class="user-detail-row" style="border:none;"><span class="user-detail-label">Account Status</span><span class="user-detail-value" style="color:${user.status === 'blocked' ? '#ef4444' : (lastSeen.isNow ? '#059669' : '#d97706')}">${user.status === 'blocked' ? 'Blocked' : lastSeen.text}</span></div>
                
                <hr style="border:none; border-top: 1px dashed #e2e8f0; margin: 24px 0;">
                
                <div class="mu-history-summary">
                    <div style="flex-grow:1;">
                        <h4 style="margin:0 0 4px 0; color:#1e293b; font-size:1.05rem;">Transaction History</h4>
                        <p style="margin:0; color:#64748b; font-size:0.85rem; font-weight:500;">
                            ${userSales.length} / ${totalItemsPurchased} Items Bought • ${userRequests.length} Requests${pendingRequests > 0 ? ' <span style="display:inline-flex; align-items:center; justify-content:center; min-width:18px; height:18px; padding:0 5px; border-radius:50%; background:#ff4d4d; color:white; font-size:10px; font-weight:800; margin-left:4px; border:2px solid white; box-shadow:0 0 8px rgba(255,77,77,0.4);">' + pendingRequests + '</span>' : ''}
                        </p>
                    </div>
                    <button class="mu-history-btn" onclick="toggleUserHistory('${userId}')">View All Activity</button>
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

function ciCloseUserInfo() {
    const modal = document.getElementById('muUserInfoModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => document.getElementById('nested-modal-container').innerHTML = '', 400);
    }
}

// =============================================
// AUTO-TRACK: Record "last seen" for the currently logged-in user
// This runs on the USER-FACING side ONLY (not admin) on every page load
// and refreshes every 30 seconds while the app is open.
// On the admin page, this tracker is DISABLED to prevent the admin's
// browser from continuously refreshing a user's last-seen timestamp
// (which would make them appear perpetually "Active now").
// =============================================
(function initLastSeenTracker() {
    // Detect if we are on the admin page — if so, do NOT track
    const isAdminPage = window.location.pathname.includes('/admin/') ||
                        window.location.pathname.endsWith('/admin') ||
                        document.querySelector('.admin-bottom-bar') !== null ||
                        document.querySelector('.admin-header') !== null;

    if (isAdminPage) return; // Skip tracking on admin pages

    function trackCurrentUser() {
        const loggedIn = window.loggedInUser || JSON.parse(localStorage.getItem('nd_logged_in_user') || 'null');
        if (loggedIn && loggedIn.id) {
            recordLastSeen(loggedIn.id);
        }
    }

    // Record immediately on load
    trackCurrentUser();

    // And every 30 seconds while app is open
    setInterval(trackCurrentUser, 30000);
})();




