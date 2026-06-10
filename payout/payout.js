window.loadPayoutTab = function() {
    const container = document.getElementById('payout-container');
    if (container) {
        fetch('payout/payout.html')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.text();
            })
            .then(html => {
                container.innerHTML = html;
                initDynamicPayoutLogic();
                
                // Minimize message button after refresh (mobile only)
                setTimeout(() => {
                    if (window.innerWidth < 1024) {
                        const msgBtn = document.getElementById('btnPayoutMessage');
                        if (msgBtn) {
                            msgBtn.classList.add('minimized');
                        }
                    }
                }, 3500); // 3.5 second delay to show full text first

                // Wire up the message button to open chat with admin
                const msgBtn = document.getElementById('btnPayoutMessage');
                if (msgBtn) {
                    msgBtn.addEventListener('click', () => {
                        if (typeof openMessagingChat === 'function') {
                            const shopName = localStorage.getItem('nd_shop_name') || 'nd shop';
                            openMessagingChat('ADMIN', shopName + ' Support');
                        }
                    });

                    // Add unread badge
                    function updatePayoutMsgBadge() {
                        const existing = msgBtn.querySelector('.payout-msg-badge');
                        if (existing) existing.remove();

                        const count = typeof getUserUnreadCount === 'function' ? getUserUnreadCount() : 0;
                        if (count > 0) {
                            const badge = document.createElement('span');
                            badge.className = 'payout-msg-badge';
                            badge.textContent = count > 9 ? '9+' : count;
                            badge.style.cssText = 'position:absolute; top:-6px; right:-6px; background:#ff4d4d; color:white; font-size:9px; font-weight:800; min-width:18px; height:18px; padding:0 4px; border-radius:12px; display:flex; align-items:center; justify-content:center; border:2px solid white; box-shadow:0 0 8px rgba(255,77,77,0.4); z-index:10;';
                            msgBtn.appendChild(badge);
                        }
                    }

                    updatePayoutMsgBadge();
                    setInterval(updatePayoutMsgBadge, 2000);
                }
            })
            .catch(error => {
                console.warn('Could not fetch payout.html, using fallback text.', error);
                container.innerHTML = '<div class="payout-text">Hi, Victor</div>';
            });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.loadPayoutTab();
});

function initDynamicPayoutLogic() {
    const listContainer = document.getElementById('dynamicPayoutList');
    const totalPayoutDisplay = document.getElementById('totalPayoutDisplay');
    const totalSpendingDisplay = document.getElementById('totalSpendingDisplay');

    const user = window.loggedInUser || { id: '00000ND', firstName: 'Victor' };

    // Update greeting
    const payoutText = document.querySelector('.payout-wrapper .payout-text');
    const userIdText = document.querySelector('.payout-wrapper .user-id-text');
    if (payoutText) payoutText.textContent = `Hi, ${user.firstName}`;
    if (userIdText) userIdText.textContent = `ID: ${user.id}`;

    // --- Filter State ---
    let selectedMonth = 'all'; // 'all' or 0–11
    let selectedYear = 'all';  // 'all' or a year number
    let currentSort = 'newest';

    // Preserve the last rendered totals and list HTML to avoid blinking when values haven't changed
    let lastTotalPayout = null;
    let lastTotalSpending = null;
    let lastPendingDeductions = null;
    let lastDisplayedSalesHtml = '';
    let payoutRenderCount = 0;

    // --- Elements ---
    const monthChip = document.getElementById('monthChip');
    const yearChip = document.getElementById('yearChip');
    const monthChipLabel = document.getElementById('monthChipLabel');
    const yearChipLabel = document.getElementById('yearChipLabel');
    const clearFilterBtn = document.getElementById('clearFilterBtn');
    const activeFilterBadge = document.getElementById('activeFilterBadge');
    const activeFilterText = document.getElementById('activeFilterText');

    // --- Modal Elements ---
    const filterModal = document.getElementById('payoutFilterModal');
    const filterModalTitle = document.getElementById('payoutFilterModalTitle');
    const filterModalList = document.getElementById('payoutFilterModalList');
    const closeFilterModalBtn = document.getElementById('closePayoutFilterModal');

    const monthsFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    let dynamicYears = [];

    // --- Pull dynamic years ---
    function fetchAvailableYears() {
        const sales = JSON.parse(localStorage.getItem('nd_sales_history') || '[]');
        const userSales = sales.filter(s => s.customerID === user.id);
        const yearsSet = new Set();
        const currentYear = new Date().getFullYear();
        yearsSet.add(currentYear);
        userSales.forEach(s => {
            const d = parseSaleDate(s.date);
            if (d && d.getFullYear() <= currentYear) yearsSet.add(d.getFullYear());
        });
        dynamicYears = Array.from(yearsSet).sort((a, b) => b - a);
    }

    // --- Parse sale date ---
    function parseSaleDate(dateStr) {
        if (!dateStr) return null;
        if (dateStr.includes('·')) {
            const parts = dateStr.split('·')[0].trim();
            const d = new Date(parts);
            return isNaN(d.getTime()) ? null : d;
        }
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? null : d;
    }

    // --- Modal Functionality ---
    function openModal(type) {
        if (!filterModal) return;
        filterModal.setAttribute('data-type', type);
        filterModalList.innerHTML = '';

        let itemsHTML = '';

        if (type === 'month') {
            filterModalTitle.textContent = 'Select Month';

            // "All Months" option
            itemsHTML += `<div class="modal-list-item ${selectedMonth === 'all' ? 'modal-active' : ''}" data-val="all">All Months</div>`;

            // 12 months
            monthsFull.forEach((month, idx) => {
                const isActive = selectedMonth === idx ? 'modal-active' : '';
                itemsHTML += `<div class="modal-list-item ${isActive}" data-val="${idx}">${month}</div>`;
            });

        } else if (type === 'year') {
            filterModalTitle.textContent = 'Select Year';

            // "All Years" option
            itemsHTML += `<div class="modal-list-item ${selectedYear === 'all' ? 'modal-active' : ''}" data-val="all">All Years</div>`;

            // Dynamic years
            dynamicYears.forEach(year => {
                const isActive = selectedYear === year ? 'modal-active' : '';
                itemsHTML += `<div class="modal-list-item ${isActive}" data-val="${year}">${year}</div>`;
            });
        }

        filterModalList.innerHTML = itemsHTML;
        filterModal.classList.add('show');
        document.body.classList.add('modal-open');
    }

    function closeModal() {
        if (!filterModal) return;
        filterModal.classList.remove('show');
        document.body.classList.remove('modal-open');
    }

    // Modal List Item Click Delegator
    if (filterModal) {
        filterModal.addEventListener('click', (e) => {
            if (e.target === closeFilterModalBtn || e.target.closest('#closePayoutFilterModal')) {
                closeModal();
            }

            const listItem = e.target.closest('.modal-list-item');
            if (listItem) {
                const val = listItem.getAttribute('data-val');
                const type = filterModal.getAttribute('data-type');

                if (type === 'month') {
                    selectedMonth = val === 'all' ? 'all' : parseInt(val);
                    updateChipLabel(monthChipLabel, val === 'all' ? 'All Months' : monthsFull[parseInt(val)]);
                    monthChip.classList.toggle('filter-active', val !== 'all');
                } else if (type === 'year') {
                    selectedYear = val === 'all' ? 'all' : parseInt(val);
                    updateChipLabel(yearChipLabel, val === 'all' ? 'All Years' : val);
                    yearChip.classList.toggle('filter-active', val !== 'all');
                }

                closeModal();
                updateFilterUI();
                renderPayouts();
            }
        });


    }

    // --- Chip Listeners ---
    if (monthChip) {
        monthChip.addEventListener('click', (e) => {
            e.stopPropagation();
            openModal('month');
        });
    }

    if (yearChip) {
        yearChip.addEventListener('click', (e) => {
            e.stopPropagation();
            openModal('year');
        });
    }

    // --- Clear Filter ---
    if (clearFilterBtn) {
        clearFilterBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            selectedMonth = 'all';
            selectedYear = 'all';

            updateChipLabel(monthChipLabel, 'All Months');
            updateChipLabel(yearChipLabel, 'All Years');
            if (monthChip) monthChip.classList.remove('filter-active');
            if (yearChip) yearChip.classList.remove('filter-active');

            clearFilterBtn.classList.add('clearing');
            setTimeout(() => {
                clearFilterBtn.classList.remove('clearing');
                updateFilterUI();
            }, 400);

            renderPayouts();
        });
    }

    // --- Update filter UI (badge, clear button visibility) ---
    function updateFilterUI() {
        const isFiltered = selectedMonth !== 'all' || selectedYear !== 'all';

        if (clearFilterBtn) {
            if (isFiltered) {
                clearFilterBtn.style.display = 'flex';
                clearFilterBtn.classList.add('filter-entering');
                setTimeout(() => clearFilterBtn.classList.remove('filter-entering'), 350);
            } else {
                clearFilterBtn.style.display = 'none';
            }
        }

        if (activeFilterBadge) {
            if (isFiltered) {
                let text = 'Showing: ';
                if (selectedMonth !== 'all') text += monthsFull[selectedMonth];
                if (selectedMonth !== 'all' && selectedYear !== 'all') text += ', ';
                if (selectedYear !== 'all') text += selectedYear;
                activeFilterText.textContent = text;
                activeFilterBadge.style.display = 'flex';
                activeFilterBadge.classList.add('badge-entering');
                setTimeout(() => activeFilterBadge.classList.remove('badge-entering'), 400);
            } else {
                activeFilterBadge.style.display = 'none';
            }
        }
    }

    function updateChipLabel(labelEl, text) {
        if (!labelEl) return;
        labelEl.style.transition = 'none';
        labelEl.style.opacity = '0';
        labelEl.style.transform = 'translateY(4px)';
        labelEl.textContent = text;
        requestAnimationFrame(() => {
            labelEl.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
            labelEl.style.opacity = '1';
            labelEl.style.transform = 'translateY(0)';
        });
    }

    function renderPayouts() {
        if (!listContainer) return;

        // Fetch shared sales data (master ledger)
        const sales = JSON.parse(localStorage.getItem('nd_sales_history') || '[]');

        // Filter for current user
        const allUserSales = sales.filter(s => s.customerID === user.id);

        // Calculate Totals based on ALL user sales (unaffected by filters)
        let totalPayout = 0;
        let totalSpending = 0;
        allUserSales.forEach(s => {
            totalPayout += s.payout || 0;
            totalSpending += (s.price || (s.qty * s.unitPrice)) || 0;
        });

        // Update Dashboard with glow effect
        if (totalPayoutDisplay) {
            const payoutChanged = totalPayout !== lastTotalPayout;
            if (payoutChanged) {
                totalPayoutDisplay.textContent = `Total reward: ₦${Math.round(totalPayout).toLocaleString()}`;
                animateValuePulse(totalPayoutDisplay);
                lastTotalPayout = totalPayout;
            }
        }
        if (totalSpendingDisplay) {
            const spendingChanged = totalSpending !== lastTotalSpending;
            if (spendingChanged) {
                totalSpendingDisplay.textContent = `Total spending: ₦${Math.round(totalSpending).toLocaleString()}`;
                animateValuePulse(totalSpendingDisplay);
                lastTotalSpending = totalSpending;
            }
        }

        // --- Apply Month/Year Filter for Display Only ---
        let displayedSales = allUserSales;
        if (selectedMonth !== 'all' || selectedYear !== 'all') {
            displayedSales = allUserSales.filter(s => {
                const d = parseSaleDate(s.date);
                if (!d) return false;
                if (selectedMonth !== 'all' && d.getMonth() !== selectedMonth) return false;
                if (selectedYear !== 'all' && d.getFullYear() !== selectedYear) return false;
                return true;
            });
        }

        // Apply sorting
        displayedSales.sort((a, b) => {
            if (currentSort === 'highest' || currentSort === 'lowest') {
                const payoutA = a.payout || 0;
                const payoutB = b.payout || 0;
                return currentSort === 'highest' ? payoutB - payoutA : payoutA - payoutB;
            } else {
                const dateA = parseSaleDate(a.date) || new Date(0);
                const dateB = parseSaleDate(b.date) || new Date(0);
                return currentSort === 'newest' ? dateB - dateA : dateA - dateB;
            }
        });

        // Render Cards
        const cardAnimationStyle = '';

        if (displayedSales.length === 0) {
            const isFiltered = selectedMonth !== 'all' || selectedYear !== 'all';
            const emptyHtml = `
                <div class="empty-payout-state" style="padding: 60px 20px; text-align: center;">
                    <div style="width: 80px; height: 80px; background: ${isFiltered ? '#f0f4f8' : '#f0f4f8'}; color: ${isFiltered ? '#6366f1' : '#6366f1'}; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto; box-shadow: 0 10px 20px ${isFiltered ? 'rgba(27, 38, 59,0.1)' : 'rgba(27, 38, 59,0.1)'};">
                        ${isFiltered ? `
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>` : `
                        <svg width="40" height="40" viewBox="0 0 496.262 496.262" fill="currentColor">
                            <path d="M477.832,274.28h-67.743v-65.106h67.743c10.179,0,18.43-8.243,18.43-18.424c0-10.182-8.251-18.43-18.43-18.43h-67.743 V81.982c0-13.187-2.606-22.866-7.743-28.762c-4.882-5.609-11.301-8.219-20.19-8.219c-8.482,0-14.659,2.592-19.447,8.166 c-5.077,5.902-7.654,15.599-7.654,28.821v90.343H227.627l-54.181-81.988c-4.637-7.317-8.997-14.171-13.231-20.75 c-3.812-5.925-7.53-10.749-11.042-14.351c-3.109-3.189-6.652-5.657-10.796-7.554c-3.91-1.785-8.881-2.681-14.762-2.681 c-7.501,0-14.31,2.055-20.83,6.277c-6.452,4.176-10.912,9.339-13.636,15.785c-2.391,6.126-3.656,15.513-3.656,27.63v77.626h-67.07 C8.246,172.326,0,180.574,0,190.755c0,10.181,8.246,18.424,18.424,18.424h67.07v65.113h-67.07C8.246,274.292,0,282.538,0,292.722 C0,302.9,8.246,311.14,18.424,311.14h67.07v103.143c0,12.797,2.689,22.378,8.015,28.466c5.065,5.805,11.487,8.5,20.208,8.5 c8.414,0,14.786-2.707,20.07-8.523c5.411-5.958,8.148-15.533,8.148-28.442V311.14h115.308l62.399,95.683 c4.339,6.325,8.819,12.709,13.287,18.969c4.031,5.621,8.429,10.574,13.069,14.711c4.179,3.742,8.659,6.484,13.316,8.157 c4.794,1.726,10.397,2.601,16.615,2.601c16.875,0,34.158-5.166,34.158-43.479V311.14h67.743c10.179,0,18.43-8.252,18.43-18.43 C496.262,282.532,488.011,274.28,477.832,274.28z M355.054,209.173v65.106h-60.041l-43.021-65.106H355.054z M141.936,134.364 l24.76,37.956h-24.76V134.364z M141.936,274.28v-65.106h48.802l42.466,65.106H141.936z M355.054,365.153l-35.683-54.013h35.683 V365.153z"/>
                        </svg>`}
                    </div>
                    <h3 style="color: #333; margin-bottom: 10px;">${isFiltered ? 'No Rewards Found' : 'Your Wallet is Waiting'}</h3>
                    <p style="color: #888; max-width: 250px; margin: 0 auto; line-height: 1.5;">${isFiltered ? 'No rewards match the selected filter. Try a different month or year, or clear the filter to see all rewards.' : 'Make a purchase request in the Shop. Once approved, your rewards will grow here!'}</p>
                </div>
            `;
            if (updateHtmlIfChanged(listContainer, emptyHtml)) {
                lastDisplayedSalesHtml = emptyHtml;
            }
            payoutRenderCount++;
            return;
        }

        const newHtml = displayedSales.map((sale, index) => {
            // Support both ISO and custom string format "26 Feb, 2026 · 3:45 pm"
            let displayDate = sale.date;
            if (sale.date && sale.date.includes('·')) {
                // Already formatted by recordSaleFromRequest
                displayDate = sale.date.split('·')[0].trim() + ' | ' + sale.date.split('·')[1].trim();
            } else {
                const dateObj = new Date(sale.date);
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                displayDate = `${months[dateObj.getMonth()]}. ${dateObj.getDate()} | ${dateObj.getHours() % 12 || 12}:${dateObj.getMinutes().toString().padStart(2, '0')} ${dateObj.getHours() >= 12 ? 'pm' : 'am'}`;
            }

            // Format Description: Item - unit price and per unit - x no. - total: no...
            let descriptionText = sale.item;
            if (sale.item !== "Welcome Bonus" && sale.item !== "First Product Sync") {
                if (sale.isFlexible) {
                    // Flexible: the stored unitPrice IS the absolute total — do NOT multiply by qty
                    const flexTotal = sale.unitPrice !== undefined ? sale.unitPrice : (sale.price || 0);
                    const utype = sale.unit || 'unit';
                    const quantity = sale.qty || 1;
                    descriptionText = `${sale.item} - Flexible (x${quantity} ${utype}) - Total: ₦${Math.round(flexTotal).toLocaleString()}`;
                } else {
                    const uprice = sale.unitPrice !== undefined ? sale.unitPrice : (sale.price || 0);
                    const utype = sale.unit || 'unit';
                    const quantity = sale.qty || 1;
                    const totalItemPrice = uprice * quantity;
                    descriptionText = `${sale.item} - ₦${uprice} per ${utype} - x${quantity} - Total: ₦${Math.round(totalItemPrice).toLocaleString()}`;
                }
            }

            return `
                <div class="regular-card" style="opacity: 1;">
                    <div class="card-main-amount">
                        <span class="green-plus">+</span>${Math.round(sale.payout || 0).toLocaleString()} <span class="card-payout-text">Reward</span>
                    </div>
                    <div class="card-details-row">
                        <span class="card-buying-text">${descriptionText}</span>
                        <span class="card-time-text">${displayDate}</span>
                    </div>
                </div>
            `;
        }).join('');

        if (updateHtmlIfChanged(listContainer, newHtml)) {
            lastDisplayedSalesHtml = newHtml;
        }
        payoutRenderCount++;
        return;
    }

    function animateValuePulse(el) {
        el.style.transition = 'none';
        el.style.textShadow = '0 0 15px rgba(27, 38, 59,0.5)';
        el.style.transform = 'scale(1.02)';
        setTimeout(() => {
            el.style.transition = 'all 0.5s ease';
            el.style.textShadow = 'none';
            el.style.transform = 'scale(1)';
        }, 300);
    }

    function updateHtmlIfChanged(container, html) {
        if (!container) return false;
        const normalized = html.trim();
        if (container.innerHTML.trim() === normalized) {
            return false;
        }
        
        const scrollEl = window.innerWidth < 1024 ? document.getElementById('payout-container') : window;
        const scrollPos = window.innerWidth < 1024 ? (scrollEl ? scrollEl.scrollTop : 0) : window.scrollY;

        if (scrollEl) container.style.minHeight = container.offsetHeight + 'px';
        container.innerHTML = html;
        
        if (scrollEl) {
            if (window.innerWidth < 1024) scrollEl.scrollTop = scrollPos;
            else scrollEl.scrollTo(0, scrollPos);

            setTimeout(() => {
                if (window.innerWidth < 1024) scrollEl.scrollTop = scrollPos;
                else scrollEl.scrollTo(0, scrollPos);
                container.style.minHeight = '';
            }, 10);
        }
        return true;
    }

    // Initial setup
    fetchAvailableYears();
    renderPayouts();
    updateFilterUI();



    window.refreshPayouts = function() {
        fetchAvailableYears();
        renderPayouts();
        updateFilterUI();
    };

    // Re-render when tab is shown to grab new approvals
    const containerPanel = document.getElementById('payout-container');
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'style' && containerPanel.style.display !== 'none') {
                fetchAvailableYears();
                renderPayouts();
            }
        });
    });
    observer.observe(containerPanel, { attributes: true });

    // Handle Sort Dropdown (Basics)
    const sortToggle = document.getElementById('sortToggle');
    const sortDropdown = document.getElementById('sortDropdown');
    const sortOptions = document.querySelectorAll('#sortDropdown .sort-option');

    if (sortToggle && sortDropdown) {
        sortToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sortDropdown.classList.toggle('show');
        });
        document.addEventListener('click', () => sortDropdown.classList.remove('show'));
    }

    if (sortOptions.length > 0) {
        sortOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();

                // Remove active class from all
                sortOptions.forEach(opt => opt.classList.remove('active'));

                // Add active to current
                option.classList.add('active');

                // Update sort state
                const newSort = option.getAttribute('data-sort');
                if (newSort) {
                    currentSort = newSort;
                    renderPayouts();
                }

                if (sortDropdown) sortDropdown.classList.remove('show');
            });
        });
    }
}

// Ensure CSS animations exist
if (!document.getElementById('payoutAnimations')) {
    const style = document.createElement('style');
    style.id = 'payoutAnimations';
    style.textContent = `
        @keyframes slideInUp {
            from { opacity: 0; transform: translateY(15px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        
        .modal-active {
            color: #6366f1 !important;
            font-weight: 700 !important;
            background: linear-gradient(90deg, #f0f4f8, transparent);
        }
        .modal-active::after {
            content: '✓';
            color: #6366f1;
            float: right;
            font-weight: 700;
        }
        [data-theme="dark"] .modal-active {
            color: #6366f1 !important;
            background: linear-gradient(90deg, rgba(27, 38, 59, 0.1), transparent);
        }
    `;
    document.head.appendChild(style);
}

/* ==========================================================================
   User Purchase with Reward Modal & Core Functions
   ========================================================================== */
let urpBasketItems = [];

function openUserRewardPurchaseModal() {
    const user = window.loggedInUser || JSON.parse(localStorage.getItem('nd_logged_in_user')) || { id: '00000ND', firstName: 'Victor', lastName: '' };
    
    let modal = document.getElementById('userRewardPurchaseModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'userRewardPurchaseModal';
        modal.className = 'admin-modal-overlay';
        modal.style.zIndex = '100050';
        document.body.appendChild(modal);
    }
    
    const sales = JSON.parse(localStorage.getItem('nd_sales_history') || '[]');
    const allUserSales = sales.filter(s => s.customerID === user.id);
    let totalPayout = 0;
    allUserSales.forEach(s => {
        totalPayout += s.payout || 0;
    });

    let spendableRewardBalance = totalPayout;
    
    modal.innerHTML = `
        <div class="admin-modal-content" style="max-height: 90vh;">
            <div class="admin-modal-header">
                <h3>Purchase with Reward</h3>
                <button class="admin-modal-close" onclick="closeUserRewardPurchaseModal()">✕</button>
            </div>
            <div class="admin-modal-body" style="padding-bottom: 24px;">
                
                <!-- Account Info -->
                <div style="padding: 14px 18px; background: #f8fafc; border-radius: 12px; border-left: 4px solid #6366f1; margin-bottom: 16px;">
                    <div style="font-weight: 700; color: #1e293b; font-size: 1rem; margin-bottom: 6px;">${user.firstName} ${user.lastName || ''}</div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.95rem;">
                        <span style="color: #64748b; font-weight: 600;">Available Reward Balance:</span>
                        <strong style="color: #16a34a; font-size: 1rem;">₦${Math.round(spendableRewardBalance).toLocaleString()}</strong>
                    </div>
                </div>

                <!-- Tabs (Special, Default, Flexible, Custom) -->
                <div style="display: flex; gap: 8px; margin-bottom: 20px; background: #f1f5f9; padding: 6px; border-radius: 12px; font-size: 0.85rem; overflow-x: auto;">
                    <button type="button" class="pp-sale-tab-btn active" data-target="urpSpecialItemForm" style="flex: 1; padding: 8px; border-radius: 8px; border: none; font-weight: 700; background: white; color: #6366f1; box-shadow: 0 2px 4px rgba(0,0,0,0.05); cursor: pointer; transition: all 0.2s; min-width: max-content;">Analytical</button>
                    <button type="button" class="pp-sale-tab-btn" data-target="urpExistingItemForm" style="flex: 1; padding: 8px; border-radius: 8px; border: none; font-weight: 700; background: transparent; color: #64748b; cursor: pointer; transition: all 0.2s; min-width: max-content;">Default</button>
                    <button type="button" class="pp-sale-tab-btn" data-target="urpFlexibleItemForm" style="flex: 1; padding: 8px; border-radius: 8px; border: none; font-weight: 700; background: transparent; color: #64748b; cursor: pointer; transition: all 0.2s; min-width: max-content;">Flexible</button>
                    <button type="button" class="pp-sale-tab-btn" data-target="urpCustomItemForm" style="flex: 1; padding: 8px; border-radius: 8px; border: none; font-weight: 700; background: transparent; color: #64748b; cursor: pointer; transition: all 0.2s; min-width: max-content;">Custom</button>
                </div>

                <!-- Forms Container -->
                <div id="urpFormsContainer">
                    <!-- Analytical / Special form -->
                    <form id="urpSpecialItemForm" class="urp-add-sale-form active" style="display: block;">
                        <div class="form-group">
                            <label>Select Special Product</label>
                            <div class="custom-dropdown-wrapper" id="urpSpecDropdownWrapper">
                                <div class="custom-dropdown-trigger" id="urpSpecDropdownTrigger">
                                    <span class="trigger-text">Select an Analytical Product</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                </div>
                                <div class="custom-dropdown-menu" id="urpSpecDropdownMenu"></div>
                                <input type="hidden" id="urpSpecItemSelect" required>
                            </div>
                        </div>
                        
                        <div class="form-group" id="urpSpecVariantContainer" style="display: none; background: #f8fafc; padding: 12px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 16px;">
                            <label>Select Type</label>
                            <div style="display: flex; gap: 8px;">
                                <label style="flex: 1; border: 1px solid #bfdbfe; border-radius: 8px; padding: 8px; text-align: center; cursor: pointer; background: white;" class="urp-spec-variant-label">
                                    <input type="radio" name="urpSpecVariant" value="bag" style="display:none;" required>
                                    <div style="font-weight: 700; color: #0F172A; margin-bottom: 4px;" id="urpSpecVariantBagLabelTxt">Container 1</div>
                                    <div style="font-size: 0.8rem; color: #6366f1;" id="urpSpecVariantBagPrice">₦0</div>
                                </label>
                                <label style="flex: 1; border: 1px solid #bfdbfe; border-radius: 8px; padding: 8px; text-align: center; cursor: pointer; background: white;" class="urp-spec-variant-label">
                                    <input type="radio" name="urpSpecVariant" value="custard" style="display:none;" required>
                                    <div style="font-weight: 700; color: #0F172A; margin-bottom: 4px;" id="urpSpecVariantCustardLabelTxt">Container 2</div>
                                    <div style="font-size: 0.8rem; color: #6366f1;" id="urpSpecVariantCustardPrice">₦0</div>
                                </label>
                                <label style="flex: 1; border: 1px solid #bfdbfe; border-radius: 8px; padding: 8px; text-align: center; cursor: pointer; background: white;" class="urp-spec-variant-label">
                                    <input type="radio" name="urpSpecVariant" value="cup" style="display:none;" required>
                                    <div style="font-weight: 700; color: #0F172A; margin-bottom: 4px;" id="urpSpecVariantCupLabelTxt">Container 3</div>
                                    <div style="font-size: 0.8rem; color: #6366f1;" id="urpSpecVariantCupPrice">₦0</div>
                                </label>
                            </div>
                        </div>
                        
                    <div id="urpSpecFlexPriceToggleWrapper" style="display:none; justify-content:space-between; align-items:center; padding:12px 16px; margin: 0 0 12px 0; background:#fdf4ff; border:1px solid #f0abfc; border-radius:12px;">
                        <div>
                            <span style="display:block; margin-bottom:2px; color:#a21caf; font-weight:800; font-size:0.9rem; line-height:1.2;">Flexible Price Mode</span>
                            <span style="display:block; font-size:0.75rem; color:#d946ef; line-height:1.2;">Allows you to input a custom amount</span>
                        </div>
                        <div style="position:relative; display:inline-block; width:44px; height:24px; flex-shrink:0; cursor:pointer;" onclick="var cb=document.getElementById('urpSpecFlexToggle'); cb.checked=!cb.checked; cb.dispatchEvent(new Event('change'));">
                            <input type="checkbox" id="urpSpecFlexToggle" style="opacity:0; width:0; height:0; position:absolute;">
                            <span style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:#e2e8f0; transition:.4s; border-radius:24px;" id="urpSpecFlexToggleBg"></span>
                            <span id="urpSpecFlexToggleKnob" style="position:absolute; content:''; height:18px; width:18px; left:3px; bottom:3px; background-color:white; transition:.4s; border-radius:50%;"></span>
                        </div>
                    </div>

                        <div class="form-group" id="urpSpecFlexPriceContainer" style="display: none;">
                            <label id="lblUrpSpecFlexPrice">Flexible Unit Price (₦)</label>
                            <input type="number" id="urpSpecFlexPrice" class="form-input" min="0" step="0.01" placeholder="e.g. 500">
                        </div>
                        <div class="form-group">
                            <label>Quantity</label>
                            <input type="number" id="urpSpecItemQty" min="1" required class="form-input" placeholder="Qty" value="1" step="1">
                        </div>
                        <button type="submit" class="add-to-list-btn" id="urpAddBasketSpecial">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            Add to List
                        </button>
                    </form>

                    <!-- Default form -->
                    <form id="urpExistingItemForm" class="urp-add-sale-form" style="display: none;">
                        <div class="form-group">
                            <label>Select Native Product</label>
                            <div class="custom-dropdown-wrapper" id="urpItemDropdownWrapper">
                                <div class="custom-dropdown-trigger" id="urpItemDropdownTrigger">
                                    <span class="trigger-text">Select an Item</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                </div>
                                <div class="custom-dropdown-menu" id="urpItemDropdownMenu"></div>
                                <input type="hidden" id="urpExistingItemSelect" required>
                            </div>
                        </div>
                        <div class="form-group" id="urpDefaultVariantContainer" style="display: none; background: #f8fafc; padding: 12px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 16px;">
                            <label>Select Type</label>
                            <div style="display: flex; gap: 8px;">
                                <label style="flex: 1; border: 1px solid #bfdbfe; border-radius: 8px; padding: 8px; text-align: center; cursor: pointer; background: white;" class="urp-default-variant-label">
                                    <input type="radio" name="urpDefaultVariant" value="retail" style="display:none;" required>
                                    <div style="font-weight: 700; color: #0F172A; margin-bottom: 4px;" id="urpDefaultVariantRetailLabelTxt">Retail</div>
                                    <div style="font-size: 0.8rem; color: #6366f1;" id="urpDefaultVariantRetailPrice">₦0</div>
                                </label>
                                <label style="flex: 1; border: 1px solid #bfdbfe; border-radius: 8px; padding: 8px; text-align: center; cursor: pointer; background: white;" class="urp-default-variant-label">
                                    <input type="radio" name="urpDefaultVariant" value="wholesale" style="display:none;" required>
                                    <div style="font-weight: 700; color: #0F172A; margin-bottom: 4px;" id="urpDefaultVariantWholesaleLabelTxt">Wholesale</div>
                                    <div style="font-size: 0.8rem; color: #6366f1;" id="urpDefaultVariantWholesalePrice">₦0</div>
                                </label>
                            </div>
                        </div>
                        <div class="form-group" id="urpExistingPriceContainer">
                            <label id="lblUrpExistingPrice">Unit Price (₦)</label>
                            <input type="text" id="urpExistingItemPrice" disabled class="form-input disabled-input" placeholder="0.00">
                        </div>
                        
                    <div id="urpExistingFlexPriceToggleWrapper" style="display:none; justify-content:space-between; align-items:center; padding:12px 16px; margin: 0 0 12px 0; background:#fdf4ff; border:1px solid #f0abfc; border-radius:12px;">
                        <div>
                            <span style="display:block; margin-bottom:2px; color:#a21caf; font-weight:800; font-size:0.9rem; line-height:1.2;">Flexible Price Mode</span>
                            <span style="display:block; font-size:0.75rem; color:#d946ef; line-height:1.2;">Allows you to input a custom amount</span>
                        </div>
                        <div style="position:relative; display:inline-block; width:44px; height:24px; flex-shrink:0; cursor:pointer;" onclick="var cb=document.getElementById('urpExistingFlexToggle'); cb.checked=!cb.checked; cb.dispatchEvent(new Event('change'));">
                            <input type="checkbox" id="urpExistingFlexToggle" style="opacity:0; width:0; height:0; position:absolute;">
                            <span style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:#e2e8f0; transition:.4s; border-radius:24px;" id="urpExistingFlexToggleBg"></span>
                            <span id="urpExistingFlexToggleKnob" style="position:absolute; content:''; height:18px; width:18px; left:3px; bottom:3px; background-color:white; transition:.4s; border-radius:50%;"></span>
                        </div>
                    </div>

                        <div class="form-group" id="urpExistingFlexPriceContainer" style="display: none;">
                            <label id="lblUrpExistingFlexPrice">Flexible Unit Price (₦)</label>
                            <input type="number" id="urpExistingFlexPrice" class="form-input" min="0" step="0.01" placeholder="e.g. 500">
                        </div>
                        <div class="form-group">
                            <label id="lblUrpExistingQty">Quantity</label>
                            <input type="number" id="urpExistingItemQty" min="1" required class="form-input" placeholder="Qty" value="1" step="1">
                        </div>
                        <button type="submit" class="add-to-list-btn" id="urpAddBasketDefault">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            Add to List
                        </button>
                    </form>

                    <!-- Flexible form -->
                    <form id="urpFlexibleItemForm" class="urp-add-sale-form" style="display: none;">
                        <div class="form-group">
                            <label>Select Flexible Product</label>
                            <div class="custom-dropdown-wrapper" id="urpFlexDropdownWrapper">
                                <div class="custom-dropdown-trigger" id="urpFlexDropdownTrigger">
                                    <span class="trigger-text">Select a Product</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                </div>
                                <div class="custom-dropdown-menu" id="urpFlexDropdownMenu"></div>
                                <input type="hidden" id="urpFlexItemSelect" required>
                            </div>
                        </div>
                        
                        <div class="form-group" id="urpFlexVariantContainer" style="display: none; background: #f8fafc; padding: 12px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 16px;">
                            <label>Select Type</label>
                            <div style="display: flex; gap: 8px;">
                                <label style="flex: 1; border: 1px solid #bfdbfe; border-radius: 8px; padding: 8px; text-align: center; cursor: pointer; background: white;" class="urp-flex-variant-label">
                                    <input type="radio" name="urpFlexVariant" value="c1" style="display:none;" required>
                                    <div style="font-weight: 700; color: #0F172A; margin-bottom: 4px;" id="urpFlexVariantC1LabelTxt">Container 1</div>
                                    <div style="font-size: 0.8rem; color: #6366f1;" id="urpFlexVariantC1Price">₦0</div>
                                </label>
                                <label style="flex: 1; border: 1px solid #bfdbfe; border-radius: 8px; padding: 8px; text-align: center; cursor: pointer; background: white;" class="urp-flex-variant-label">
                                    <input type="radio" name="urpFlexVariant" value="c2" style="display:none;" required>
                                    <div style="font-weight: 700; color: #0F172A; margin-bottom: 4px;" id="urpFlexVariantC2LabelTxt">Container 2</div>
                                    <div style="font-size: 0.8rem; color: #6366f1;" id="urpFlexVariantC2Price">₦0</div>
                                </label>
                                <label style="flex: 1; border: 1px solid #bfdbfe; border-radius: 8px; padding: 8px; text-align: center; cursor: pointer; background: white;" class="urp-flex-variant-label">
                                    <input type="radio" name="urpFlexVariant" value="c3" style="display:none;" required>
                                    <div style="font-weight: 700; color: #0F172A; margin-bottom: 4px;" id="urpFlexVariantC3LabelTxt">Container 3</div>
                                    <div style="font-size: 0.8rem; color: #6366f1;">Flexible Price</div>
                                </label>
                            </div>
                        </div>

                        
                    <div id="urpFlexFlexPriceToggleWrapper" style="display:none; justify-content:space-between; align-items:center; padding:12px 16px; margin: 0 0 12px 0; background:#fdf4ff; border:1px solid #f0abfc; border-radius:12px;">
                        <div>
                            <span style="display:block; margin-bottom:2px; color:#a21caf; font-weight:800; font-size:0.9rem; line-height:1.2;">Flexible Price Mode</span>
                            <span style="display:block; font-size:0.75rem; color:#d946ef; line-height:1.2;">Allows you to input a custom amount</span>
                        </div>
                        <div style="position:relative; display:inline-block; width:44px; height:24px; flex-shrink:0; cursor:pointer;" onclick="var cb=document.getElementById('urpFlexFlexToggle'); cb.checked=!cb.checked; cb.dispatchEvent(new Event('change'));">
                            <input type="checkbox" id="urpFlexFlexToggle" style="opacity:0; width:0; height:0; position:absolute;">
                            <span style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:#e2e8f0; transition:.4s; border-radius:24px;" id="urpFlexFlexToggleBg"></span>
                            <span id="urpFlexFlexToggleKnob" style="position:absolute; content:''; height:18px; width:18px; left:3px; bottom:3px; background-color:white; transition:.4s; border-radius:50%;"></span>
                        </div>
                    </div>

                        <div class="form-group" id="urpFlexCustomPriceContainer" style="display: none;">
                            <label id="lblUrpFlexPrice">Flexible Unit Price (₦)</label>
                            <input type="number" id="urpFlexItemPrice" class="form-input" min="0" step="0.01" placeholder="e.g. 500">
                        </div>
                        <div class="form-group">
                            <label id="lblUrpFlexQty">Quantity</label>
                            <input type="number" id="urpFlexItemQty" min="1" required class="form-input" placeholder="Qty" value="1" step="1">
                        </div>
                        <button type="submit" class="add-to-list-btn" id="urpAddBasketFlex">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            Add to List
                        </button>
                    </form>

                    <!-- Custom form -->
                    <form id="urpCustomItemForm" class="urp-add-sale-form" style="display: none;">
                        <div class="form-group">
                            <label>Select Custom Product</label>
                            <div class="custom-dropdown-wrapper" id="urpCustomDropdownWrapper">
                                <div class="custom-dropdown-trigger" id="urpCustomDropdownTrigger">
                                    <span class="trigger-text">Select a Product</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                </div>
                                <div class="custom-dropdown-menu" id="urpCustomDropdownMenu"></div>
                                <input type="hidden" id="urpCustomItemSelect" required>
                            </div>
                        </div>
                        <div class="form-group" id="urpCustomPriceContainer">
                            <label id="lblUrpCustomPrice">Unit Price (₦)</label>
                            <input type="text" id="urpCustomItemPrice" disabled class="form-input disabled-input" placeholder="0.00">
                        </div>
                        
                    <div id="urpCustomFlexPriceToggleWrapper" style="display:none; justify-content:space-between; align-items:center; padding:12px 16px; margin: 0 0 12px 0; background:#fdf4ff; border:1px solid #f0abfc; border-radius:12px;">
                        <div>
                            <span style="display:block; margin-bottom:2px; color:#a21caf; font-weight:800; font-size:0.9rem; line-height:1.2;">Flexible Price Mode</span>
                            <span style="display:block; font-size:0.75rem; color:#d946ef; line-height:1.2;">Allows you to input a custom amount</span>
                        </div>
                        <div style="position:relative; display:inline-block; width:44px; height:24px; flex-shrink:0; cursor:pointer;" onclick="var cb=document.getElementById('urpCustomFlexToggle'); cb.checked=!cb.checked; cb.dispatchEvent(new Event('change'));">
                            <input type="checkbox" id="urpCustomFlexToggle" style="opacity:0; width:0; height:0; position:absolute;">
                            <span style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:#e2e8f0; transition:.4s; border-radius:24px;" id="urpCustomFlexToggleBg"></span>
                            <span id="urpCustomFlexToggleKnob" style="position:absolute; content:''; height:18px; width:18px; left:3px; bottom:3px; background-color:white; transition:.4s; border-radius:50%;"></span>
                        </div>
                    </div>

                        <div class="form-group" id="urpCustomFlexPriceContainer" style="display: none;">
                            <label id="lblUrpCustomFlexPrice">Flexible Unit Price (₦)</label>
                            <input type="number" id="urpCustomFlexPrice" class="form-input" min="0" step="0.01" placeholder="e.g. 500">
                        </div>
                        <div class="form-group">
                            <label id="lblUrpCustomQty">Quantity</label>
                            <input type="number" id="urpCustomItemQty" min="1" required class="form-input" placeholder="Qty" value="1" step="1">
                        </div>
                        <button type="submit" class="add-to-list-btn" id="urpAddBasketCustom">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            Add to List
                        </button>
                    </form>
                </div>

                <!-- Basket Section -->
                <div class="sale-basket-container" id="urpBasketContainer" style="display: none; margin-top: 20px;">
                    <div class="basket-header">Items in this Request</div>
                    <div class="basket-items-list" id="urpBasketItemsList"></div>
                    <div class="basket-summary">
                        <span>Request Total</span>
                        <span id="urpBasketSubtotal">₦0.00</span>
                    </div>
                    <div id="urpFundWarning" style="color: #dc2626; font-size: 0.85rem; font-weight: 700; text-align: center; margin-top: 8px; display: none; padding: 10px; background: #fef2f2; border-radius: 10px; border: 1px solid #fee2e2;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 6px;">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        Insufficient Spendable Reward Balance!
                    </div>
                    <button id="urpFinalizeBtn" class="wide-add-btn save-btn" style="margin-top: 12px; width: 100%; border: none; outline: none; border-radius: 10px; padding: 14px; background: #6366f1; color: white; font-weight: 700; cursor: pointer;" disabled>Submit Reward Purchase Request</button>
                </div>

            </div>
        </div>
    `;

    // Make modal visible
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('show');
        document.body.classList.add('modal-open');
    }, 10);

    // Initialize all components & logic inside this modal!
    urpBasketItems = [];
    _initUserRewardPurchaseLogic(modal, spendableRewardBalance, user);
}

function closeUserRewardPurchaseModal() {
    const modal = document.getElementById('userRewardPurchaseModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
        }, 300);
    }
}


function initURPToggles() {
    const toggles = [
        { id: 'urpExistingFlexToggle', cFixed: 'urpExistingPriceContainer', cVar: 'urpDefaultVariantContainer', radioName: 'urpDefaultVariant', cFlex: 'urpExistingFlexPriceContainer' },
        { id: 'urpSpecFlexToggle', cFixed: null, cVar: 'urpSpecVariantContainer', radioName: 'urpSpecVariant', cFlex: 'urpSpecFlexPriceContainer' },
        { id: 'urpCustomFlexToggle', cFixed: 'urpCustomPriceContainer', cVar: null, radioName: null, cFlex: 'urpCustomFlexPriceContainer' },
        { id: 'urpFlexFlexToggle', cFixed: null, cVar: 'urpFlexVariantContainer', radioName: 'urpFlexVariant', cFlex: 'urpFlexCustomPriceContainer' }
    ];

    toggles.forEach(t => {
        const toggle = document.getElementById(t.id);
        if (toggle) {
            toggle.addEventListener('change', function() {
                const bg = document.getElementById(t.id + 'Bg');
                const knob = document.getElementById(t.id + 'Knob');
                const cFixed = t.cFixed ? document.getElementById(t.cFixed) : null;
                const cFlex = document.getElementById(t.cFlex);
                const cVar = t.cVar ? document.getElementById(t.cVar) : null;

                if (this.checked) {
                    if (bg) bg.style.backgroundColor = '#f0abfc';
                    if (knob) knob.style.transform = 'translateX(20px)';
                    if (cFixed) cFixed.style.display = 'none';
                    if (cFlex) cFlex.style.display = 'block';
                    if (cVar) {
                        cVar.style.display = 'block';
                        if (t.radioName && typeof window.updateVariantPricesVisibility === 'function') {
                            window.updateVariantPricesVisibility(cVar, t.radioName, true);
                        } else {
                            cVar.querySelectorAll('[id$="Price"]').forEach(p => p.style.display = 'none');
                        }
                        cVar.querySelectorAll('input[type="radio"]').forEach(r => r.setAttribute('required', 'required'));
                    }
                } else {
                    if (bg) bg.style.backgroundColor = '#e2e8f0';
                    if (knob) knob.style.transform = 'translateX(0)';
                    if (cFixed) cFixed.style.display = 'block';
                    if (cFlex) cFlex.style.display = 'none';
                    if (cVar) {
                        if (t.radioName && typeof window.updateVariantPricesVisibility === 'function') {
                            window.updateVariantPricesVisibility(cVar, t.radioName, false);
                        } else {
                            cVar.querySelectorAll('[id$="Price"]').forEach(p => p.style.display = '');
                        }
                        cVar.querySelectorAll('input[type="radio"]').forEach(r => r.setAttribute('required', 'required'));
                    }
                }
            });
        }
    });
}

function _initUserRewardPurchaseLogic(modal, spendableRewardBalance, user) {
    initURPToggles();
    const urpExistingItemForm = modal.querySelector('#urpExistingItemForm');
    const urpSpecialItemForm = modal.querySelector('#urpSpecialItemForm');
    const urpCustomItemForm = modal.querySelector('#urpCustomItemForm');
    const urpFlexibleItemForm = modal.querySelector('#urpFlexibleItemForm');

    const urpItemDropdownWrapper = modal.querySelector('#urpItemDropdownWrapper');
    const urpItemDropdownTrigger = modal.querySelector('#urpItemDropdownTrigger');
    const urpItemDropdownMenu = modal.querySelector('#urpItemDropdownMenu');
    const urpHiddenItemInput = modal.querySelector('#urpExistingItemSelect');
    const urpExistingPrice = modal.querySelector('#urpExistingItemPrice');

    const urpSpecDropdownWrapper = modal.querySelector('#urpSpecDropdownWrapper');
    const urpSpecDropdownTrigger = modal.querySelector('#urpSpecDropdownTrigger');
    const urpSpecDropdownMenu = modal.querySelector('#urpSpecDropdownMenu');
    const urpSpecItemSelect = modal.querySelector('#urpSpecItemSelect');
    const urpSpecVariantContainer = modal.querySelector('#urpSpecVariantContainer');
    const urpSpecVariantBagPrice = modal.querySelector('#urpSpecVariantBagPrice');
    const urpSpecVariantCustardPrice = modal.querySelector('#urpSpecVariantCustardPrice');
    const urpSpecVariantCupPrice = modal.querySelector('#urpSpecVariantCupPrice');

    const urpCustomDropdownWrapper = modal.querySelector('#urpCustomDropdownWrapper');
    const urpCustomDropdownTrigger = modal.querySelector('#urpCustomDropdownTrigger');
    const urpCustomDropdownMenu = modal.querySelector('#urpCustomDropdownMenu');
    const urpCustomItemSelect = modal.querySelector('#urpCustomItemSelect');
    const urpCustomItemPrice = modal.querySelector('#urpCustomItemPrice');

    const urpFlexDropdownWrapper = modal.querySelector('#urpFlexDropdownWrapper');
    const urpFlexDropdownTrigger = modal.querySelector('#urpFlexDropdownTrigger');
    const urpFlexDropdownMenu = modal.querySelector('#urpFlexDropdownMenu');
    const urpFlexItemSelect = modal.querySelector('#urpFlexItemSelect');
    const urpFlexVariantContainer = modal.querySelector('#urpFlexVariantContainer');
    const urpFlexVariantC1Price = modal.querySelector('#urpFlexVariantC1Price');
    const urpFlexVariantC2Price = modal.querySelector('#urpFlexVariantC2Price');
    const urpFlexCustomPriceContainer = modal.querySelector('#urpFlexCustomPriceContainer');
    const urpFlexItemPrice = modal.querySelector('#urpFlexItemPrice');

    function handleUrpVariantClick(label, isSpec) {
        label.parentNode.querySelectorAll(isSpec ? '.urp-spec-variant-label' : '.urp-flex-variant-label').forEach(l => {
            l.style.borderColor = '#bfdbfe';
            l.style.borderWidth = '1px';
            l.style.background = 'white';
        });
        label.style.borderColor = '#6366f1';
        label.style.borderWidth = '2px';
        label.style.background = '#f0f4f8';
        
        const radio = label.querySelector('input[type="radio"]');
        if(radio) {
            radio.checked = true;
            const val = radio.value;
            
            const urpSpecItemSelect = modal.querySelector('#urpSpecItemSelect');
            const urpFlexItemSelect = modal.querySelector('#urpFlexItemSelect');
            const selectedProduct = isSpec 
                ? specialInventory.find(p => p.name === (urpSpecItemSelect ? urpSpecItemSelect.value : '')) 
                : flexInventory.find(p => p.name === (urpFlexItemSelect ? urpFlexItemSelect.value : ''));

            const toggleCb = modal.querySelector(isSpec ? '#urpSpecFlexToggle' : '#urpFlexFlexToggle');
            const toggleWrapper = modal.querySelector(isSpec ? '#urpSpecFlexToggleWrapper' : '#urpFlexFlexPriceToggleWrapper');
            const customPriceContainer = modal.querySelector(isSpec ? '#urpSpecFlexPriceContainer' : '#urpFlexCustomPriceContainer');
            const itemPriceInput = modal.querySelector(isSpec ? '#urpSpecItemPrice' : '#urpFlexItemPrice');

            let isAllowed = false;
            if (selectedProduct && selectedProduct.allowUserFlexiblePricing) {
                const flexVars = selectedProduct.flexibleVariants || [];
                const pt = selectedProduct.packTypes || {};
                let title = '';
                if (val === 'c1') title = (pt.c1 || {}).title || (pt.bag || {}).title || 'Container 1';
                else if (val === 'c2') title = (pt.c2 || {}).title || (pt.custard || {}).title || 'Container 2';
                else if (val === 'c3') title = (pt.c3 || {}).title || (pt.cup || {}).title || 'Container 3';
                
                if (flexVars.length === 0) isAllowed = true;
                else if (flexVars.includes(title) || (title === 'Default' && flexVars.some(fv => fv.startsWith('Default (')))) isAllowed = true;
            } else if (val === 'c3') {
                isAllowed = true;
            }

            if (isAllowed) {
                if (toggleWrapper) toggleWrapper.style.display = 'flex';
            } else {
                if (toggleWrapper) toggleWrapper.style.display = 'none';
                if (toggleCb) toggleCb.checked = false;
            }
            if (customPriceContainer) {
                customPriceContainer.style.display = (toggleCb && toggleCb.checked) ? 'block' : 'none';
            }

            if (itemPriceInput) {
                itemPriceInput.required = true;
                if (selectedProduct) {
                    const pt = selectedProduct.packTypes || {};
                    const presetPrice = (pt[val] || {}).price || (val === 'c1' ? selectedProduct.price : 0);
                    itemPriceInput.value = presetPrice || '';
                } else {
                    itemPriceInput.value = '';
                }
            }

            const isFlexibleChecked = toggleCb?.checked || false;
            if (typeof window.updateVariantPricesVisibility === 'function') {
                window.updateVariantPricesVisibility(
                    modal.querySelector(isSpec ? '#urpSpecVariantContainer' : '#urpFlexVariantContainer'), 
                    isSpec ? 'urpSpecVariant' : 'urpFlexVariant', 
                    isFlexibleChecked
                );
            }
        }
    }

    // Visual feedback for Special Variant selection
    modal.querySelectorAll('.urp-spec-variant-label').forEach(label => {
        label.addEventListener('click', function() { handleUrpVariantClick(this, true); });
    });

    // Visual feedback for Flex Variant selection
    modal.querySelectorAll('.urp-flex-variant-label').forEach(label => {
        label.addEventListener('click', function() { handleUrpVariantClick(this, false); });
    });

    // Tab Logic
    const tabBtns = modal.querySelectorAll('.pp-sale-tab-btn');
    const forms = [urpExistingItemForm, urpSpecialItemForm, urpCustomItemForm, urpFlexibleItemForm];
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => {
                b.classList.remove('active');
                b.style.background = 'transparent';
                b.style.color = '#64748b';
                b.style.boxShadow = 'none';
            });
            btn.classList.add('active');
            btn.style.background = 'white';
            btn.style.color = '#6366f1';
            btn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
            
            forms.forEach(f => { if(f) f.style.display = 'none'; });
            const target = modal.querySelector('#' + btn.getAttribute('data-target'));
            if(target) target.style.display = 'block';
        });
    });

    // Load Inventory
    const inventory = JSON.parse(localStorage.getItem('nd_products_data') || '[]');

    let defaultInventoryRaw = inventory.filter(p => !p.isSpecial && !p.isCustom && !p.isFlexible && !p.isDeleted && !(p.isHidden || p.cleared));
    if (defaultInventoryRaw.length === 0) defaultInventoryRaw = inventory.filter(p => !p.isDeleted && !(p.isHidden || p.cleared) && !p.isSpecial && !p.isCustom && !p.isFlexible);
    
    let defaultInventory = defaultInventoryRaw;
    let specialInventory = inventory.filter(p => p.isSpecial && !p.isDeleted && !(p.isHidden || p.cleared));
    let customInventory = inventory.filter(p => p.isCustom && !p.isDeleted && !(p.isHidden || p.cleared));
    let flexInventory = inventory.filter(p => p.isFlexible && !p.isSpecial && !p.isDeleted && !(p.isHidden || p.cleared));

    function formatCurrency(amount) {
        return Math.round(Number(amount)).toLocaleString();
    }

    // Visual feedback for Default Variant selection
    modal.querySelectorAll('.urp-default-variant-label').forEach(label => {
        label.addEventListener('click', function() {
            modal.querySelectorAll('.urp-default-variant-label').forEach(l => {
                l.style.borderColor = '#bfdbfe';
                l.style.borderWidth = '1px';
                l.style.background = 'white';
            });
            this.style.borderColor = '#6366f1';
            this.style.borderWidth = '2px';
            this.style.background = '#f0f4f8';
            
            const radio = this.querySelector('input[type="radio"]');
            if(radio) {
                radio.checked = true;
                const price = radio.parentNode.querySelector('[data-price]').dataset.price;
                const unitText = radio.parentNode.querySelector('div:nth-child(2)').textContent;
                if (urpExistingPrice) {
                    urpExistingPrice.value = '₦' + formatCurrency(Number(price)) + ' per ' + unitText.toLowerCase();
                    urpExistingPrice.dataset.price = price;
                }
                const isFlexibleChecked = document.getElementById('urpExistingFlexToggle')?.checked || false;
                if (typeof window.updateVariantPricesVisibility === 'function') {
                    window.updateVariantPricesVisibility(document.getElementById('urpDefaultVariantContainer'), 'urpDefaultVariant', isFlexibleChecked);
                }
            }
        });
    });

    // Dropdowns Builders
    function buildDefaultDropdown(filterText) {
        if (!urpItemDropdownMenu) return;
        let searchContainer = urpItemDropdownMenu.querySelector('.dropdown-search-container');
        let optionsContainer = urpItemDropdownMenu.querySelector('.dropdown-options-list');

        if (!searchContainer) {
            urpItemDropdownMenu.innerHTML = '';
            searchContainer = document.createElement('div');
            searchContainer.className = 'dropdown-search-container';
            searchContainer.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/></svg>
                <input type="text" class="dropdown-search-input" placeholder="Search items..." autocomplete="off" readonly onfocus="this.removeAttribute('readonly');">
            `;
            urpItemDropdownMenu.appendChild(searchContainer);
            searchContainer.querySelector('.dropdown-search-input').addEventListener('input', (e) => {
                e.stopPropagation();
                buildDefaultDropdown(e.target.value);
            });
            searchContainer.querySelector('.dropdown-search-input').addEventListener('click', e => e.stopPropagation());
            searchContainer.querySelector('.dropdown-search-input').addEventListener('keydown', e => e.stopPropagation());
        }

        if (!optionsContainer) {
            optionsContainer = document.createElement('div');
            optionsContainer.className = 'dropdown-options-list';
            urpItemDropdownMenu.appendChild(optionsContainer);
        }

        optionsContainer.innerHTML = '';
        const filter = (filterText || '').toLowerCase();
        const filtered = defaultInventory.filter(item => item.name.toLowerCase().includes(filter));

        if (filtered.length === 0) {
            optionsContainer.innerHTML = '<div class="dropdown-no-result">No items found</div>';
        } else {
            filtered.forEach(item => {
                const option = document.createElement('div');
                option.className = 'custom-dropdown-option';
                option.textContent = item.name;
                option.dataset.price = item.price;
                if (urpHiddenItemInput && urpHiddenItemInput.value === item.name) option.classList.add('active');
                option.addEventListener('click', (e) => {
                    e.stopPropagation();
                    optionsContainer.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('active'));
                    option.classList.add('active');
                    if (urpItemDropdownTrigger) urpItemDropdownTrigger.querySelector('.trigger-text').textContent = item.name;
                    if (urpHiddenItemInput) urpHiddenItemInput.value = item.name;

                    const urpDefaultVariantContainer = modal.querySelector('#urpDefaultVariantContainer');
                    const hasWholesale = item.wholesalePrice && Number(item.wholesalePrice) > 0;

                    if (hasWholesale) {
                        if (urpDefaultVariantContainer) urpDefaultVariantContainer.style.display = 'block';

                        // Set up variant prices and labels
                        const retailPriceText = modal.querySelector('#urpDefaultVariantRetailPrice');
                        const retailLabelText = modal.querySelector('#urpDefaultVariantRetailLabelTxt');
                        const wholesalePriceText = modal.querySelector('#urpDefaultVariantWholesalePrice');
                        const wholesaleLabelText = modal.querySelector('#urpDefaultVariantWholesaleLabelTxt');

                        if (retailPriceText) {
                            retailPriceText.textContent = '₦' + formatCurrency(Number(item.price));
                            retailPriceText.dataset.price = item.price;
                        }
                        if (retailLabelText) {
                            retailLabelText.textContent = item.unit || 'Piece';
                        }
                        if (wholesalePriceText) {
                            wholesalePriceText.textContent = '₦' + formatCurrency(Number(item.wholesalePrice));
                            wholesalePriceText.dataset.price = item.wholesalePrice;
                        }
                        if (wholesaleLabelText) {
                            wholesaleLabelText.textContent = item.bulkUnit || 'Carton';
                        }

                        // Stock-aware selection & disabling
                        const defaultVariants = [
                            { val: 'retail', labelId: 'urpDefaultVariantRetailLabelTxt' },
                            { val: 'wholesale', labelId: 'urpDefaultVariantWholesaleLabelTxt' }
                        ];
                        let firstDefaultInStockLabel = null;
                        defaultVariants.forEach(v => {
                            const radio = modal.querySelector(`input[name="urpDefaultVariant"][value="${v.val}"]`);
                            const label = radio ? radio.closest('label') : null;
                            if (radio && label) {
                                const stock = window.getRemainingProductStock ? window.getRemainingProductStock(item.name, v.val) : Infinity;
                                if (stock <= 0) {
                                    radio.disabled = true;
                                    label.style.opacity = '0.5';
                                    label.style.pointerEvents = 'none';
                                    label.style.background = '#f1f5f9';
                                } else {
                                    radio.disabled = false;
                                    label.style.opacity = '1';
                                    label.style.pointerEvents = 'auto';
                                    label.style.background = 'white';
                                    if (!firstDefaultInStockLabel) firstDefaultInStockLabel = label;
                                }
                            }
                        });
                        if (firstDefaultInStockLabel) {
                            firstDefaultInStockLabel.click();
                        } else {
                            modal.querySelectorAll('input[name="urpDefaultVariant"]').forEach(r => r.checked = false);
                            modal.querySelectorAll('.urp-default-variant-label').forEach(l => {
                                l.style.borderColor = '#bfdbfe';
                                l.style.borderWidth = '1px';
                                l.style.background = 'white';
                            });
                        }

                        if (urpExistingPrice) {
                            urpExistingPrice.value = '';
                            urpExistingPrice.dataset.price = '';
                        }
                    } else {
                        if (urpDefaultVariantContainer) urpDefaultVariantContainer.style.display = 'none';
                        const unitStr = item.unit ? item.unit : '';
                        if (urpExistingPrice) {
                            urpExistingPrice.value = '₦' + formatCurrency(Number(item.price)) + (unitStr ? ' ' + unitStr : '');
                            urpExistingPrice.dataset.price = item.price;
                        }
                    }

                    urpItemDropdownWrapper.classList.remove('open');
                });
                optionsContainer.appendChild(option);
            });
        }
    }

    function buildSpecialDropdown(filterText) {
        if (!urpSpecDropdownMenu) return;
        let searchContainer = urpSpecDropdownMenu.querySelector('.dropdown-search-container');
        let optionsContainer = urpSpecDropdownMenu.querySelector('.dropdown-options-list');

        if (!searchContainer) {
            urpSpecDropdownMenu.innerHTML = '';
            searchContainer = document.createElement('div');
            searchContainer.className = 'dropdown-search-container';
            searchContainer.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/></svg>
                <input type="text" class="dropdown-search-input" placeholder="Search special products..." autocomplete="off" readonly onfocus="this.removeAttribute('readonly');">
            `;
            urpSpecDropdownMenu.appendChild(searchContainer);
            searchContainer.querySelector('.dropdown-search-input').addEventListener('input', (e) => {
                e.stopPropagation();
                buildSpecialDropdown(e.target.value);
            });
            searchContainer.querySelector('.dropdown-search-input').addEventListener('click', e => e.stopPropagation());
            searchContainer.querySelector('.dropdown-search-input').addEventListener('keydown', e => e.stopPropagation());
        }

        if (!optionsContainer) {
            optionsContainer = document.createElement('div');
            optionsContainer.className = 'dropdown-options-list';
            urpSpecDropdownMenu.appendChild(optionsContainer);
        }

        optionsContainer.innerHTML = '';
        const filter = (filterText || '').toLowerCase();
        const filtered = specialInventory.filter(item => item.name.toLowerCase().includes(filter));

        if (filtered.length === 0) {
            optionsContainer.innerHTML = '<div class="dropdown-no-result">No special products found</div>';
        } else {
            filtered.forEach(item => {
                const option = document.createElement('div');
                option.className = 'custom-dropdown-option';
                option.textContent = item.name;
                if (urpSpecItemSelect && urpSpecItemSelect.value === item.name) option.classList.add('active');
                option.addEventListener('click', (e) => {
                    e.stopPropagation();
                    optionsContainer.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('active'));
                    option.classList.add('active');
                    if (urpSpecDropdownTrigger) urpSpecDropdownTrigger.querySelector('.trigger-text').textContent = item.name;
                    if (urpSpecItemSelect) urpSpecItemSelect.value = item.name;

                    if (urpSpecVariantContainer) urpSpecVariantContainer.style.display = 'block';
                    const pt = item.packTypes || {};
                    
                    if (urpSpecVariantBagPrice) { urpSpecVariantBagPrice.textContent = '₦' + formatCurrency(Number((pt.bag || {}).price || item.price || 0)); urpSpecVariantBagPrice.dataset.price = (pt.bag || {}).price || item.price || 0; }
                    if (urpSpecVariantCustardPrice) { urpSpecVariantCustardPrice.textContent = '₦' + formatCurrency(Number((pt.custard || {}).price || 0)); urpSpecVariantCustardPrice.dataset.price = (pt.custard || {}).price || 0; }
                    if (urpSpecVariantCupPrice) { urpSpecVariantCupPrice.textContent = '₦' + formatCurrency(Number((pt.cup || {}).price || 0)); urpSpecVariantCupPrice.dataset.price = (pt.cup || {}).price || 0; }
                    
                    const bagTxt = modal.querySelector('#urpSpecVariantBagLabelTxt');
                    if (bagTxt) bagTxt.textContent = (pt.bag || {}).title || 'Container 1';
                    const custardTxt = modal.querySelector('#urpSpecVariantCustardLabelTxt');
                    if (custardTxt) custardTxt.textContent = (pt.custard || {}).title || 'Container 2';
                    const cupTxt = modal.querySelector('#urpSpecVariantCupLabelTxt');
                    if (cupTxt) cupTxt.textContent = (pt.cup || {}).title || 'Container 3';

                    const toggleWrapper = modal.querySelector('#urpSpecFlexPriceToggleWrapper');
                    if (item.allowUserFlexiblePricing) {
                        if (toggleWrapper) toggleWrapper.style.display = 'flex';
                    } else {
                        if (toggleWrapper) toggleWrapper.style.display = 'none';
                    }
                    const toggleCb = modal.querySelector('#urpSpecFlexToggle');
                    if (toggleCb) { toggleCb.checked = false; toggleCb.dispatchEvent(new Event('change')); }

                    const variants = [
                        { val: 'bag', labelId: 'urpSpecVariantBagLabelTxt' },
                        { val: 'custard', labelId: 'urpSpecVariantCustardLabelTxt' },
                        { val: 'cup', labelId: 'urpSpecVariantCupLabelTxt' }
                    ];
                    let firstInStockLabel = null;
                    variants.forEach(v => {
                        const radio = modal.querySelector(`input[name="urpSpecVariant"][value="${v.val}"]`);
                        const label = radio ? radio.closest('label') : null;
                        if (radio && label) {
                            const stock = window.getRemainingProductStock ? window.getRemainingProductStock(item.name, v.val) : Infinity;
                            if (stock <= 0) {
                                radio.disabled = true;
                                label.style.opacity = '0.5';
                                label.style.pointerEvents = 'none';
                                label.style.background = '#f1f5f9';
                            } else {
                                radio.disabled = false;
                                label.style.opacity = '1';
                                label.style.pointerEvents = 'auto';
                                label.style.background = 'white';
                                if (!firstInStockLabel) firstInStockLabel = label;
                            }
                        }
                    });
                    if (firstInStockLabel) {
                        firstInStockLabel.click();
                    } else {
                        modal.querySelectorAll('input[name="urpSpecVariant"]').forEach(r => r.checked = false);
                        modal.querySelectorAll('.urp-spec-variant-label').forEach(l => {
                            l.style.borderColor = '#bfdbfe';
                            l.style.borderWidth = '1px';
                            l.style.background = 'white';
                        });
                    }

                    urpSpecDropdownWrapper.classList.remove('open');
                });
                optionsContainer.appendChild(option);
            });
        }
    }

    function buildCustomDropdown(filterText) {
        if (!urpCustomDropdownMenu) return;
        let searchContainer = urpCustomDropdownMenu.querySelector('.dropdown-search-container');
        let optionsContainer = urpCustomDropdownMenu.querySelector('.dropdown-options-list');

        if (!searchContainer) {
            urpCustomDropdownMenu.innerHTML = '';
            searchContainer = document.createElement('div');
            searchContainer.className = 'dropdown-search-container';
            searchContainer.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/></svg>
                <input type="text" class="dropdown-search-input" placeholder="Search products..." autocomplete="off" readonly onfocus="this.removeAttribute('readonly');">
            `;
            urpCustomDropdownMenu.appendChild(searchContainer);
            searchContainer.querySelector('.dropdown-search-input').addEventListener('input', (e) => {
                e.stopPropagation();
                buildCustomDropdown(e.target.value);
            });
            searchContainer.querySelector('.dropdown-search-input').addEventListener('click', e => e.stopPropagation());
            searchContainer.querySelector('.dropdown-search-input').addEventListener('keydown', e => e.stopPropagation());
        }

        if (!optionsContainer) {
            optionsContainer = document.createElement('div');
            optionsContainer.className = 'dropdown-options-list';
            urpCustomDropdownMenu.appendChild(optionsContainer);
        }

        optionsContainer.innerHTML = '';
        const filter = (filterText || '').toLowerCase();
        const filtered = customInventory.filter(item => item.name.toLowerCase().includes(filter));

        if (filtered.length === 0) {
            optionsContainer.innerHTML = '<div class="dropdown-no-result">No products found</div>';
        } else {
            filtered.forEach(item => {
                const option = document.createElement('div');
                option.className = 'custom-dropdown-option';
                option.textContent = item.name;
                if (urpCustomItemSelect && urpCustomItemSelect.value === item.name) option.classList.add('active');
                option.addEventListener('click', (e) => {
                    e.stopPropagation();
                    optionsContainer.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('active'));
                    option.classList.add('active');
                    if (urpCustomDropdownTrigger) urpCustomDropdownTrigger.querySelector('.trigger-text').textContent = item.name;
                    if (urpCustomItemSelect) urpCustomItemSelect.value = item.name;
                    
                    const unitStr = item.unit ? item.unit : '';
                    if (urpCustomItemPrice) {
                        const priceVal = (typeof item.price === 'number') ? item.price : 0;
                        urpCustomItemPrice.value = '₦' + formatCurrency(Number(priceVal)) + (unitStr ? ' ' + unitStr : '');
                        urpCustomItemPrice.dataset.price = priceVal;
                    }
                    const toggleWrapper = modal.querySelector('#urpCustomFlexPriceToggleWrapper');
                    if (item.allowUserFlexiblePricing) {
                        if (toggleWrapper) toggleWrapper.style.display = 'flex';
                    } else {
                        if (toggleWrapper) toggleWrapper.style.display = 'none';
                    }
                    const toggleCb = modal.querySelector('#urpCustomFlexToggle');
                    if (toggleCb) { toggleCb.checked = false; toggleCb.dispatchEvent(new Event('change')); }
                    urpCustomDropdownWrapper.classList.remove('open');
                });
                optionsContainer.appendChild(option);
            });
        }
    }

    function buildFlexDropdown(filterText) {
        if (!urpFlexDropdownMenu) return;
        let searchContainer = urpFlexDropdownMenu.querySelector('.dropdown-search-container');
        let optionsContainer = urpFlexDropdownMenu.querySelector('.dropdown-options-list');

        if (!searchContainer) {
            urpFlexDropdownMenu.innerHTML = '';
            searchContainer = document.createElement('div');
            searchContainer.className = 'dropdown-search-container';
            searchContainer.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/></svg>
                <input type="text" class="dropdown-search-input" placeholder="Search flexible products..." autocomplete="off" readonly onfocus="this.removeAttribute('readonly');">
            `;
            urpFlexDropdownMenu.appendChild(searchContainer);
            searchContainer.querySelector('.dropdown-search-input').addEventListener('input', (e) => {
                e.stopPropagation();
                buildFlexDropdown(e.target.value);
            });
            searchContainer.querySelector('.dropdown-search-input').addEventListener('click', e => e.stopPropagation());
            searchContainer.querySelector('.dropdown-search-input').addEventListener('keydown', e => e.stopPropagation());
        }

        if (!optionsContainer) {
            optionsContainer = document.createElement('div');
            optionsContainer.className = 'dropdown-options-list';
            urpFlexDropdownMenu.appendChild(optionsContainer);
        }

        optionsContainer.innerHTML = '';
        const filter = (filterText || '').toLowerCase();
        const filtered = flexInventory.filter(item => item.name.toLowerCase().includes(filter));

        if (filtered.length === 0) {
            optionsContainer.innerHTML = '<div class="dropdown-no-result">No products found</div>';
        } else {
            filtered.forEach(item => {
                const option = document.createElement('div');
                option.className = 'custom-dropdown-option';
                option.textContent = item.name;
                if (urpFlexItemSelect && urpFlexItemSelect.value === item.name) option.classList.add('active');
                option.addEventListener('click', (e) => {
                    e.stopPropagation();
                    optionsContainer.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('active'));
                    option.classList.add('active');
                    if (urpFlexDropdownTrigger) urpFlexDropdownTrigger.querySelector('.trigger-text').textContent = item.name;
                    if (urpFlexItemSelect) urpFlexItemSelect.value = item.name;
                    
                    if (urpFlexVariantContainer) urpFlexVariantContainer.style.display = 'block';
                    const pt = item.packTypes || {};
                    
                    if (urpFlexVariantC1Price) { urpFlexVariantC1Price.textContent = '₦' + formatCurrency(Number((pt.c1 || {}).price || item.price || 0)); urpFlexVariantC1Price.dataset.price = (pt.c1 || {}).price || item.price || 0; }
                    if (urpFlexVariantC2Price) { urpFlexVariantC2Price.textContent = '₦' + formatCurrency(Number((pt.c2 || {}).price || 0)); urpFlexVariantC2Price.dataset.price = (pt.c2 || {}).price || 0; }
                    
                    const c1Txt = modal.querySelector('#urpFlexVariantC1LabelTxt');
                    if (c1Txt) c1Txt.textContent = (pt.c1 || {}).title || 'Container 1';
                    const c2Txt = modal.querySelector('#urpFlexVariantC2LabelTxt');
                    if (c2Txt) c2Txt.textContent = (pt.c2 || {}).title || 'Container 2';
                    const c3Txt = modal.querySelector('#urpFlexVariantC3LabelTxt');
                    if (c3Txt) c3Txt.textContent = (pt.c3 || {}).title || 'Container 3';

                    if (urpFlexCustomPriceContainer) urpFlexCustomPriceContainer.style.display = 'none';
                    const toggleWrapper = modal.querySelector('#urpFlexFlexPriceToggleWrapper');
                    if (toggleWrapper) toggleWrapper.style.display = 'none';
                    const toggleCb = modal.querySelector('#urpFlexFlexToggle');
                    if (toggleCb) { toggleCb.checked = false; toggleCb.dispatchEvent(new Event('change')); }
                    if (urpFlexItemPrice) urpFlexItemPrice.value = '';

                    const flexVariants = [
                        { val: 'c1', labelId: 'urpFlexVariantC1LabelTxt' },
                        { val: 'c2', labelId: 'urpFlexVariantC2LabelTxt' },
                        { val: 'c3', labelId: 'urpFlexVariantC3LabelTxt' }
                    ];
                    let firstFlexInStockLabel = null;
                    flexVariants.forEach(v => {
                        const radio = modal.querySelector(`input[name="urpFlexVariant"][value="${v.val}"]`);
                        const label = radio ? radio.closest('label') : null;
                        if (radio && label) {
                            const stock = window.getRemainingProductStock ? window.getRemainingProductStock(item.name, v.val) : Infinity;
                            if (stock <= 0) {
                                radio.disabled = true;
                                label.style.opacity = '0.5';
                                label.style.pointerEvents = 'none';
                                label.style.background = '#f1f5f9';
                            } else {
                                radio.disabled = false;
                                label.style.opacity = '1';
                                label.style.pointerEvents = 'auto';
                                label.style.background = 'white';
                                if (!firstFlexInStockLabel) firstFlexInStockLabel = label;
                            }
                        }
                    });
                    if (firstFlexInStockLabel) {
                        firstFlexInStockLabel.click();
                    } else {
                        modal.querySelectorAll('input[name="urpFlexVariant"]').forEach(r => r.checked = false);
                        modal.querySelectorAll('.urp-flex-variant-label').forEach(l => {
                            l.style.borderColor = '#bfdbfe';
                            l.style.borderWidth = '1px';
                            l.style.background = 'white';
                        });
                    }

                    urpFlexDropdownWrapper.classList.remove('open');
                });
                optionsContainer.appendChild(option);
            });
        }
    }

    // Initialize all dropdowns
    buildDefaultDropdown('');
    buildSpecialDropdown('');
    buildCustomDropdown('');
    buildFlexDropdown('');

    // Wire dropdown trigger click listeners
    if (urpItemDropdownTrigger && urpItemDropdownWrapper) {
        urpItemDropdownTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const wasOpen = urpItemDropdownWrapper.classList.contains('open');
            [urpItemDropdownWrapper, urpSpecDropdownWrapper, urpCustomDropdownWrapper, urpFlexDropdownWrapper].forEach(w => w && w.classList.remove('open'));
            if (!wasOpen) {
                urpItemDropdownWrapper.classList.add('open');
                buildDefaultDropdown('');
            }
        });
        document.addEventListener('click', (e) => {
            if (urpItemDropdownWrapper.classList.contains('open') && !urpItemDropdownWrapper.contains(e.target)) {
                urpItemDropdownWrapper.classList.remove('open');
            }
        });
    }

    if (urpSpecDropdownTrigger && urpSpecDropdownWrapper) {
        urpSpecDropdownTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const wasOpen = urpSpecDropdownWrapper.classList.contains('open');
            [urpItemDropdownWrapper, urpSpecDropdownWrapper, urpCustomDropdownWrapper, urpFlexDropdownWrapper].forEach(w => w && w.classList.remove('open'));
            if (!wasOpen) {
                urpSpecDropdownWrapper.classList.add('open');
                buildSpecialDropdown('');
            }
        });
        document.addEventListener('click', (e) => {
            if (urpSpecDropdownWrapper.classList.contains('open') && !urpSpecDropdownWrapper.contains(e.target)) {
                const toggleWrapper = modal.querySelector('#urpSpecFlexPriceToggleWrapper');
                    if (item.allowUserFlexiblePricing) {
                        if (toggleWrapper) toggleWrapper.style.display = 'flex';
                    } else {
                        if (toggleWrapper) toggleWrapper.style.display = 'none';
                    }
                    const toggleCb = modal.querySelector('#urpSpecFlexToggle');
                    if (toggleCb) { toggleCb.checked = false; toggleCb.dispatchEvent(new Event('change')); }
                    urpSpecDropdownWrapper.classList.remove('open');
            }
        });
    }

    if (urpCustomDropdownTrigger && urpCustomDropdownWrapper) {
        urpCustomDropdownTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const wasOpen = urpCustomDropdownWrapper.classList.contains('open');
            [urpItemDropdownWrapper, urpSpecDropdownWrapper, urpCustomDropdownWrapper, urpFlexDropdownWrapper].forEach(w => w && w.classList.remove('open'));
            if (!wasOpen) {
                urpCustomDropdownWrapper.classList.add('open');
                buildCustomDropdown('');
            }
        });
        document.addEventListener('click', (e) => {
            if (urpCustomDropdownWrapper.classList.contains('open') && !urpCustomDropdownWrapper.contains(e.target)) {
                const toggleWrapper = modal.querySelector('#urpCustomFlexPriceToggleWrapper');
                    if (item.allowUserFlexiblePricing) {
                        if (toggleWrapper) toggleWrapper.style.display = 'flex';
                    } else {
                        if (toggleWrapper) toggleWrapper.style.display = 'none';
                    }
                    const toggleCb = modal.querySelector('#urpCustomFlexToggle');
                    if (toggleCb) { toggleCb.checked = false; toggleCb.dispatchEvent(new Event('change')); }
                    urpCustomDropdownWrapper.classList.remove('open');
            }
        });
    }

    if (urpFlexDropdownTrigger && urpFlexDropdownWrapper) {
        urpFlexDropdownTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const wasOpen = urpFlexDropdownWrapper.classList.contains('open');
            [urpItemDropdownWrapper, urpSpecDropdownWrapper, urpCustomDropdownWrapper, urpFlexDropdownWrapper].forEach(w => w && w.classList.remove('open'));
            if (!wasOpen) {
                urpFlexDropdownWrapper.classList.add('open');
                buildFlexDropdown('');
            }
        });
        document.addEventListener('click', (e) => {
            if (urpFlexDropdownWrapper.classList.contains('open') && !urpFlexDropdownWrapper.contains(e.target)) {
                urpFlexDropdownWrapper.classList.remove('open');
            }
        });
    }

    function _addToURPBasket(name, qty, price, unit = '', isFlexible = false) {
        urpBasketItems.push({
            name: name,
            qty: Number(qty),
            price: Number(price),
            unit: unit,
            isFlexible: isFlexible
        });
        _updateURPBasketUI(spendableRewardBalance);
    }

    // Form submit handlers
    if (urpExistingItemForm) urpExistingItemForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const itemName = urpHiddenItemInput.value;
        let price = urpExistingPrice.dataset.price;
        const existingToggle = modal.querySelector('#urpExistingFlexToggle');
        const prodLookup = defaultInventory.find(p => p.name === itemName);
        let isFlexPrice = false;
        if (prodLookup && prodLookup.allowUserFlexiblePricing && existingToggle && existingToggle.checked) {
            const fPrice = modal.querySelector('#urpExistingFlexPrice').value;
            if(fPrice) { price = fPrice; isFlexPrice = true; }
        }
        const qty = modal.querySelector('#urpExistingItemQty').value;
        
        const prod = defaultInventory.find(p => p.name === itemName);
        const unit = prod ? prod.unit : '';

        if (itemName && price && qty) {
            const requiredQty = parseFloat(qty);
            
            const urpDefaultVariantContainer = modal.querySelector('#urpDefaultVariantContainer');
            const hasWholesale = prod && prod.wholesalePrice && Number(prod.wholesalePrice) > 0;
            
            let isWholesale = false;
            let finalName = itemName;
            let finalUnit = unit;
            let variantParam = null;
            
            if (hasWholesale && urpDefaultVariantContainer && urpDefaultVariantContainer.style.display !== 'none') {
                const checkedVariant = modal.querySelector('input[name="urpDefaultVariant"]:checked');
                if (!checkedVariant) {
                    alert("Please select a variant type.");
                    return;
                }
                if (checkedVariant.value === 'wholesale') {
                    isWholesale = true;
                    finalName = itemName + ` (${prod.bulkUnit || 'Carton'})`;
                    finalUnit = 'per ' + (prod.bulkUnit || 'carton').toLowerCase();
                    variantParam = 'wholesale';
                }
            }

            const remaining = window.getRemainingProductStock ? window.getRemainingProductStock(itemName, variantParam) : Infinity;
            if (requiredQty > remaining) {
                const unitLabel = isWholesale ? (prod.bulkUnit || 'Carton') : (unit ? unit.replace(/^per\s+/i, '') : 'items');
                if (typeof customAlert === 'function') {
                    customAlert(`Cannot add to list. Only ${remaining} ${unitLabel}(s) remaining in stock.`);
                } else {
                    alert(`Cannot add to list. Only ${remaining} ${unitLabel}(s) remaining in stock.`);
                }
                return;
            }
            _addToURPBasket(finalName, qty, price, finalUnit, isFlexPrice);

            // Reset
            urpHiddenItemInput.value = '';
            urpExistingPrice.value = '';
            urpExistingPrice.dataset.price = '';
            urpItemDropdownTrigger.querySelector('.trigger-text').textContent = 'Select an Item';
            modal.querySelector('#urpExistingItemQty').value = '1';
            urpItemDropdownMenu.querySelectorAll('.custom-dropdown-option').forEach(opt => opt.classList.remove('active'));

            if(urpDefaultVariantContainer) urpDefaultVariantContainer.style.display = 'none';
            modal.querySelectorAll('.urp-default-variant-label').forEach(l => {
                l.style.borderColor = '#bfdbfe';
                l.style.borderWidth = '1px';
                l.style.background = 'white';
            });
            const radioButtons = modal.querySelectorAll('input[name="urpDefaultVariant"]');
            radioButtons.forEach(r => r.checked = false);
        }
    });

    if (urpSpecialItemForm) urpSpecialItemForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const itemName = urpSpecItemSelect.value;
        const qty = modal.querySelector('#urpSpecItemQty').value;
        
        const specToggle = modal.querySelector('#urpSpecFlexToggle');
        const isFlexiblePrice = specToggle && specToggle.checked;
        let checkedVariant = modal.querySelector('input[name="urpSpecVariant"]:checked');
        if (isFlexiblePrice && !checkedVariant) {
            const specVarContainer = modal.querySelector('#urpSpecVariantContainer');
            if (specVarContainer) {
                const firstRadio = specVarContainer.querySelector('input[type="radio"]');
                if (firstRadio) {
                    firstRadio.checked = true;
                    checkedVariant = firstRadio;
                }
            }
        }
        
        if (itemName && qty && checkedVariant) {
            const variantKey = checkedVariant.value;
            const requiredQty = parseFloat(qty);
            const variantKeyCapitalized = variantKey.charAt(0).toUpperCase() + variantKey.slice(1);
            const variantId = 'urpSpecVariant' + variantKeyCapitalized + 'Price';
            const labelTxtId = 'urpSpecVariant' + variantKeyCapitalized + 'LabelTxt';
            const titleStr = modal.querySelector('#' + labelTxtId) ? modal.querySelector('#' + labelTxtId).textContent.trim() : variantKeyCapitalized;
            
            const remaining = window.getRemainingProductStock ? window.getRemainingProductStock(itemName, variantKey) : Infinity;
            if (requiredQty > remaining) {
                if (typeof customAlert === 'function') {
                    customAlert(`Cannot add to list. Only ${remaining} ${titleStr}(s) remaining in stock.`);
                } else {
                    alert(`Cannot add to list. Only ${remaining} ${titleStr}(s) remaining in stock.`);
                }
                return;
            }
            
            let price = modal.querySelector('#' + variantId).dataset.price;
            const finalName = `${itemName} (${titleStr})`;
            let isFlexPrice = false;
            
            const prodLookup = specialInventory.find(p => p.name === itemName);
            const specToggle = modal.querySelector('#urpSpecFlexToggle');
            if (prodLookup && prodLookup.allowUserFlexiblePricing && specToggle && specToggle.checked) {
                const fPrice = modal.querySelector('#urpSpecFlexPrice').value;
                if (!fPrice) {
                    alert('Please enter a flexible unit price.');
                    return;
                }
                price = fPrice;
                isFlexPrice = true;
            }
            
            _addToURPBasket(finalName, qty, price, titleStr, isFlexPrice);

            // Reset
            urpSpecItemSelect.value = '';
            urpSpecDropdownTrigger.querySelector('.trigger-text').textContent = 'Select an Analytical Product';
            const tW = modal.querySelector('#urpSpecFlexPriceToggleWrapper');
            if (tW) tW.style.display = 'none';
            const tC = modal.querySelector('#urpSpecFlexToggle');
            if (tC) { tC.checked = false; tC.dispatchEvent(new Event('change')); }
            modal.querySelector('#urpSpecItemQty').value = '1';
            if (urpSpecVariantContainer) urpSpecVariantContainer.style.display = 'none';
            modal.querySelectorAll('.urp-spec-variant-label').forEach(l => {
                l.style.borderColor = '#bfdbfe';
                l.style.borderWidth = '1px';
                l.style.background = 'white';
            });
            const checkedRad = modal.querySelector('input[name="urpSpecVariant"]:checked');
            if (checkedRad) checkedRad.checked = false;
            urpSpecDropdownMenu.querySelectorAll('.custom-dropdown-option').forEach(opt => opt.classList.remove('active'));
        } else if (!checkedVariant) {
            alert("Please select a variant type.");
        }
    });

    if (urpCustomItemForm) urpCustomItemForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const itemName = urpCustomItemSelect.value;
        let price = urpCustomItemPrice ? urpCustomItemPrice.dataset.price : '';
        const qty = modal.querySelector('#urpCustomItemQty').value;
        if (itemName && price && qty) {
            const requiredQty = parseFloat(qty);
            const prod = customInventory.find(p => p.name === itemName);
            const unit = prod ? prod.unit : '';
            const remaining = window.getRemainingProductStock ? window.getRemainingProductStock(itemName) : Infinity;
            
            if (requiredQty > remaining) {
                if (typeof customAlert === 'function') {
                    customAlert(`Cannot add to list. Only ${remaining} ${unit ? unit.replace(/^per\s+/i, '') : 'items'} remaining in stock.`);
                } else {
                    alert(`Cannot add to list. Only ${remaining} items remaining in stock.`);
                }
                return;
            }

            let isFlexPrice = false;
            const customToggle = modal.querySelector('#urpCustomFlexToggle');
            if (prod && prod.allowUserFlexiblePricing && customToggle && customToggle.checked) {
                const fPrice = modal.querySelector('#urpCustomFlexPrice').value;
                if (!fPrice) {
                    alert('Please enter a flexible unit price.');
                    return;
                }
                price = fPrice;
                isFlexPrice = true;
            }

            _addToURPBasket(itemName, requiredQty, Number(price), unit, isFlexPrice);

            // Reset
            urpCustomItemSelect.value = '';
            urpCustomItemPrice.value = '';
            urpCustomItemPrice.dataset.price = '';
            const tW = modal.querySelector('#urpCustomFlexPriceToggleWrapper');
            if (tW) tW.style.display = 'none';
            const tC = modal.querySelector('#urpCustomFlexToggle');
            if (tC) { tC.checked = false; tC.dispatchEvent(new Event('change')); }
            urpCustomDropdownTrigger.querySelector('.trigger-text').textContent = 'Select a Product';
            modal.querySelector('#urpCustomItemQty').value = '1';
            urpCustomDropdownMenu.querySelectorAll('.custom-dropdown-option').forEach(opt => opt.classList.remove('active'));
        }
    });

    if (urpFlexibleItemForm) urpFlexibleItemForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const itemName = urpFlexItemSelect.value;
        
        const flexToggle = modal.querySelector('#urpFlexFlexToggle');
        const isFlexiblePrice = flexToggle && flexToggle.checked;
        let checkedVariant = modal.querySelector('input[name="urpFlexVariant"]:checked');
        if (isFlexiblePrice && !checkedVariant) {
            const flexVarContainer = modal.querySelector('#urpFlexVariantContainer');
            if (flexVarContainer) {
                const firstRadio = flexVarContainer.querySelector('input[type="radio"]');
                if (firstRadio) {
                    firstRadio.checked = true;
                    checkedVariant = firstRadio;
                }
            }
        }
        const qty = modal.querySelector('#urpFlexItemQty').value;
        
        if (itemName && qty && checkedVariant) {
            const variantKey = checkedVariant.value;
            const requiredQty = parseFloat(qty);
            const prod = flexInventory.find(p => p.name === itemName);
            const pt = prod ? (prod.packTypes || {}) : {};
            const titleStr = (pt[variantKey] || {}).title || `Container ${variantKey.charAt(1)}`;
            
            const remaining = window.getRemainingProductStock ? window.getRemainingProductStock(itemName, variantKey) : Infinity;
            if (requiredQty > remaining) {
                if (typeof customAlert === 'function') {
                    customAlert(`Cannot add to list. Only ${remaining} items remaining in stock.`);
                } else {
                    alert(`Cannot add to list. Only ${remaining} items remaining in stock.`);
                }
                return;
            }
            
            let price = '';
            if (variantKey === 'c3') {
                price = urpFlexItemPrice ? urpFlexItemPrice.value : '';
            } else {
                const flexToggle = modal.querySelector('#urpFlexFlexToggle');
                if (prod && prod.allowUserFlexiblePricing && flexToggle && flexToggle.checked) {
                    price = urpFlexItemPrice ? urpFlexItemPrice.value : '';
                } else {
                    const presetPrice = (prod && prod.packTypes && prod.packTypes[variantKey]) ? prod.packTypes[variantKey].price : (variantKey === 'c1' && prod ? prod.price : 0);
                    price = presetPrice;
                }
            }
            if (!price) {
                alert("Please enter a retail unit price.");
                return;
            }
            _addToURPBasket(`${itemName} (${titleStr})`, requiredQty, Number(price), titleStr, true);

            // Reset
            urpFlexItemSelect.value = '';
            urpFlexDropdownTrigger.querySelector('.trigger-text').textContent = 'Select a Product';
            modal.querySelector('#urpFlexItemQty').value = '1';
            if (urpFlexVariantContainer) urpFlexVariantContainer.style.display = 'none';
            if (urpFlexCustomPriceContainer) urpFlexCustomPriceContainer.style.display = 'none';
            modal.querySelectorAll('.urp-flex-variant-label').forEach(l => {
                l.style.borderColor = '#bfdbfe';
                l.style.borderWidth = '1px';
                l.style.background = 'white';
            });
            if (urpFlexItemPrice) urpFlexItemPrice.value = '';
            const checkedRad = modal.querySelector('input[name="urpFlexVariant"]:checked');
            if (checkedRad) checkedRad.checked = false;
            urpFlexDropdownMenu.querySelectorAll('.custom-dropdown-option').forEach(opt => opt.classList.remove('active'));
        } else if (!checkedVariant) {
            alert("Please select a variant type.");
        }
    });

    // Finalize Submit click listener
    const finalizeBtn = modal.querySelector('#urpFinalizeBtn');
    if (finalizeBtn) {
        finalizeBtn.addEventListener('click', () => {
            _submitURPRequest(spendableRewardBalance, user);
        });
    }
}

function _updateURPBasketUI(spendableRewardBalance) {
    const basketContainer = document.getElementById('urpBasketContainer');
    const basketList = document.getElementById('urpBasketItemsList');
    const basketSubtotal = document.getElementById('urpBasketSubtotal');
    const warnEl = document.getElementById('urpFundWarning');
    const finalizeBtn = document.getElementById('urpFinalizeBtn');

    if (!basketContainer) return;

    if (urpBasketItems.length === 0) {
        basketContainer.style.display = 'none';
        return;
    }

    basketContainer.style.display = 'block';
    basketList.innerHTML = '';
    let total = 0;

    function formatCurrency(amount) {
        return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    urpBasketItems.forEach((item, index) => {
        const itemTotal = item.qty * item.price;
        total += itemTotal;

        const itemDiv = document.createElement('div');
        itemDiv.className = 'basket-item';
        itemDiv.innerHTML = `
            <div class="basket-item-info">
                <span class="basket-item-name">${item.name}</span>
                <span class="basket-item-meta">${item.isFlexible ? 'Flexible: ' : ''}${item.qty} × ₦${formatCurrency(item.price)}</span>
            </div>
            <span class="basket-item-total">₦${formatCurrency(itemTotal)}</span>
            <button class="remove-basket-item" data-index="${index}">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
            </button>
        `;

        itemDiv.querySelector('.remove-basket-item').addEventListener('click', () => {
            urpBasketItems.splice(index, 1);
            _updateURPBasketUI(spendableRewardBalance);
        });

        basketList.appendChild(itemDiv);
    });

    basketSubtotal.textContent = '₦' + formatCurrency(total);

    // Validate spendable balance
    if (total > 0 && total > spendableRewardBalance) {
        warnEl.style.display = 'block';
        finalizeBtn.disabled = true;
        finalizeBtn.style.opacity = '0.5';
        finalizeBtn.style.cursor = 'not-allowed';
    } else if (total > 0) {
        warnEl.style.display = 'none';
        finalizeBtn.disabled = false;
        finalizeBtn.style.opacity = '1';
        finalizeBtn.style.cursor = 'pointer';
    } else {
        warnEl.style.display = 'none';
        finalizeBtn.disabled = true;
        finalizeBtn.style.opacity = '0.5';
    }
}

function _submitURPRequest(spendableRewardBalance, user) {
    if (urpBasketItems.length === 0) return;

    let total = 0;
    urpBasketItems.forEach(item => {
        total += item.qty * item.price;
    });

    if (total <= 0) {
        alert("Please add items to your basket.");
        return;
    }

    if (total > spendableRewardBalance) {
        alert("Insufficient spendable reward balance!");
        return;
    }

    const requests = JSON.parse(localStorage.getItem('nd_requests_data') || '[]');
    const newReqId = "REQ-R-" + Date.now().toString().slice(-4) + Math.floor(Math.random() * 90 + 10);

    const newRequest = {
        id: newReqId,
        timestamp: new Date().toISOString(),
        status: 'Pending',
        isGroupedOrder: true,
        isRewardPurchase: true,
        user: {
            id: user.id,
            name: (user.firstName + ' ' + (user.lastName || '')).trim(),
            avatar: user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'
        },
        orderTotal: total,
        items: urpBasketItems.map(item => ({
            name: item.name,
            qty: item.qty,
            unit: item.unit || '',
            unitPrice: item.price,
            total: item.qty * item.price,
            isFlexible: item.isFlexible || false
        }))
    };

    requests.unshift(newRequest);
    localStorage.setItem('nd_requests_data', JSON.stringify(requests));

    if (typeof customAlert === 'function') {
        customAlert(`Successfully submitted Purchase with Reward request for ₦${Math.round(total).toLocaleString()}! Status: Pending Admin Approval.`);
    } else {
        alert(`Successfully submitted Purchase with Reward request for ₦${Math.round(total).toLocaleString()}! Status: Pending Admin Approval.`);
    }

    closeUserRewardPurchaseModal();

    // Trigger update of payout dashboard tab so that spendable balance reflects the new pending request deduction!
    if (typeof window.refreshPayouts === 'function') {
        window.refreshPayouts();
    }
}

if (window.realtimeSync) {
    window.realtimeSync.on('nd_sales_history', () => {
        if (typeof window.refreshPayouts === 'function') {
            window.refreshPayouts();
        }
    });
}

window.addEventListener('nd_sync_complete', () => {
    if (typeof window.refreshPayouts === 'function') {
        const container = document.getElementById('payout-container');
        if (container && container.style.display !== 'none') {
            window.refreshPayouts();
        }
    }
});
