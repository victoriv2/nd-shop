document.addEventListener('DOMContentLoaded', () => {
    // Check Authentication — prefer sessionStorage (tab-isolated) over localStorage (shared)
    const loggedInUserStr = sessionStorage.getItem('nd_logged_in_user') || localStorage.getItem('nd_logged_in_user');
    if (!loggedInUserStr) {
        window.location.href = 'auth/login.html';
        return; // Stop execution if not logged in
    }

    window.loggedInUser = JSON.parse(loggedInUserStr); // Expose globally for modules

    // Payout Reset Warning Modal
    initPayoutResetWarning(window.loggedInUser.id);

    function initPayoutResetWarning(userId) {
        const storageKey = 'nd_payout_reset_warning_dismissed_' + userId;
        if (localStorage.getItem(storageKey) === 'true') {
            return;
        }

        const style = document.createElement('style');
        style.innerHTML = `
            .nd-payout-warning-overlay {
                position: fixed;
                top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(15, 23, 42, 0.4);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000000;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            .nd-payout-warning-overlay.show {
                opacity: 1;
            }
            .nd-payout-warning-card {
                background: #ffffff;
                width: 90%;
                max-width: 400px;
                border-radius: 28px;
                padding: 32px 24px;
                text-align: center;
                box-shadow: 0 20px 50px rgba(15, 23, 42, 0.15);
                border: 1px solid rgba(99, 102, 241, 0.1);
                transform: scale(0.9) translateY(20px);
                transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            .nd-payout-warning-overlay.show .nd-payout-warning-card {
                transform: scale(1) translateY(0);
            }
            .nd-payout-warning-icon-wrapper {
                width: 72px;
                height: 72px;
                background: linear-gradient(135deg, #eef2ff, #e0e7ff);
                color: #6366f1;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 24px;
                box-shadow: 0 8px 16px rgba(99, 102, 241, 0.15);
                position: relative;
            }
            .nd-payout-warning-icon-badge {
                position: absolute;
                top: -2px;
                right: -2px;
                width: 20px;
                height: 20px;
                background: #ef4444;
                color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 11px;
                font-weight: bold;
                border: 2px solid white;
                box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4);
            }
            .nd-payout-warning-title {
                font-size: 1.35rem;
                font-weight: 800;
                color: #1e293b;
                margin-bottom: 12px;
                font-family: 'Outfit', sans-serif;
                letter-spacing: -0.3px;
            }
            .nd-payout-warning-text {
                font-size: 0.95rem;
                color: #64748b;
                line-height: 1.6;
                margin-bottom: 20px;
                font-family: 'Outfit', sans-serif;
            }
            .nd-payout-warning-highlight {
                background: #fef3c7;
                color: #92400e;
                padding: 12px 16px;
                border-radius: 16px;
                font-size: 0.88rem;
                font-weight: 600;
                line-height: 1.5;
                margin-bottom: 28px;
                border: 1px dashed #fcd34d;
                font-family: 'Outfit', sans-serif;
                display: flex;
                align-items: center;
                gap: 8px;
                text-align: left;
            }
            .nd-payout-warning-highlight svg {
                flex-shrink: 0;
                color: #d97706;
            }
            .nd-payout-warning-btn {
                width: 100%;
                padding: 16px;
                border: none;
                border-radius: 18px;
                font-size: 1.05rem;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.2s ease;
                font-family: 'Outfit', sans-serif;
                background: linear-gradient(135deg, #6366f1, #4f46e5);
                color: #ffffff;
                box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
            }
            .nd-payout-warning-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
                background: linear-gradient(135deg, #4f46e5, #4338ca);
            }
            .nd-payout-warning-btn:active {
                transform: translateY(0);
                box-shadow: 0 3px 8px rgba(99, 102, 241, 0.2);
            }
        `;
        document.head.appendChild(style);

        const overlay = document.createElement('div');
        overlay.className = 'nd-payout-warning-overlay';
        overlay.innerHTML = `
            <div class="nd-payout-warning-card">
                <div class="nd-payout-warning-icon-wrapper">
                    <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <div class="nd-payout-warning-icon-badge">!</div>
                </div>
                <h3 class="nd-payout-warning-title">Annual Payout Reset</h3>
                <p class="nd-payout-warning-text">
                    Please be informed that at the end of each calendar year (December 31st at midnight), all accumulated reward payouts will be reset to <strong>₦0</strong> to start the next annual cycle.
                </p>
                <div class="nd-payout-warning-highlight">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <span>Please ensure you claim or redeem your payouts before the December 31st deadline!</span>
                </div>
                <button class="nd-payout-warning-btn">Ok, I Understand</button>
            </div>
        `;

        document.body.appendChild(overlay);

        // Trigger animation in
        setTimeout(() => {
            overlay.classList.add('show');
        }, 50);

        const btn = overlay.querySelector('.nd-payout-warning-btn');
        btn.addEventListener('click', () => {
            localStorage.setItem(storageKey, 'true');
            overlay.classList.remove('show');
            setTimeout(() => {
                overlay.remove();
                style.remove();
            }, 300);
        });
    }

    // Core app initialization

    // --- MIGRATION v2: Switch payout to running balance and preserve delta in payoutEarned ---
    try {
        let salesHistory = JSON.parse(localStorage.getItem('nd_sales_history') || '[]');
        let migrated = false;
        
        // Ensure every sale has payoutEarned recorded
        salesHistory.forEach(sale => {
            if (sale.payoutEarned === undefined) {
                let delta = sale.payout || 0;
                let isDeduct = sale.isRewardPurchase || sale.type === 'Payout Purchase' || delta < 0;
                sale.payoutEarned = isDeduct ? -Math.abs(delta) : Math.abs(delta);
                migrated = true;
            }
        });

        if (migrated) {
            // Sort chronologically to recalculate running balances
            function parseSaleDate(dateStr) {
                if (!dateStr) return 0;
                try {
                    if (dateStr.includes('·')) {
                        const parts = dateStr.split('·');
                        const d = new Date(parts[0].trim());
                        const timeParts = parts[1].trim().match(/(\d+):(\d+)\s*(am|pm)/i);
                        if (timeParts) {
                            let h = parseInt(timeParts[1]);
                            if (timeParts[3].toLowerCase() === 'pm' && h < 12) h += 12;
                            if (timeParts[3].toLowerCase() === 'am' && h === 12) h = 0;
                            d.setHours(h, parseInt(timeParts[2]), 0, 0);
                        }
                        return d.getTime();
                    }
                    return new Date(dateStr).getTime();
                } catch(e) { return 0; }
            }

            salesHistory.sort((a,b) => parseSaleDate(a.date) - parseSaleDate(b.date));
            
            let userBalances = {};
            salesHistory.forEach(sale => {
                let cid = sale.customerID;
                if (!cid) return;
                let bal = userBalances[cid] || 0;
                bal += sale.payoutEarned;
                userBalances[cid] = bal;
                sale.payout = bal; // The actual requested change!
            });

            localStorage.setItem('nd_sales_history', JSON.stringify(salesHistory));
            if (window.realtimeSync && typeof window.realtimeSync.syncNow === 'function') {
                window.realtimeSync.syncNow('nd_sales_history');
            }
        }
    } catch (e) {
        console.error("Migration error:", e);
    }

    // Carousel state (declared early so all listeners can reference them)
    let touchStartX = 0;
    let touchStartY = 0;
    let isHorizontalDrag = null;
    let isDragging = false;
    let isIndicatorDrag = false;

    // Wait for the app to initialize

    // Handle orange bar items (active state + tab switching)
    const barItems = document.querySelectorAll('.bar-item');
    const tabOrder = ['payout', 'product', 'menu'];
    const tabContainers = {
        payout: document.getElementById('payout-container'),
        product: document.getElementById('product-container'),
        menu: document.getElementById('menu-container')
    };
    const sliderTrack = document.getElementById('sliderTrack');
    const tabIndicator = document.getElementById('tabIndicator');

    const scrollPositions = {
        payout: 0,
        product: 0,
        menu: 0
    };

    function isMobile() {
        return window.innerWidth < 1024;
    }

    function getActiveTab() {
        const active = document.querySelector('.bar-item.active');
        return active ? active.getAttribute('data-tab') : 'payout';
    }

    // Move the sliding pill indicator to a fractional position (0 = first tab, 2 = last tab)
    function moveIndicator(position, animate) {
        if (!tabIndicator || !isMobile()) return;
        const bar = tabIndicator.parentElement;
        const padding = 4;
        const innerWidth = bar.clientWidth - padding * 2;
        const tabWidth = innerWidth / tabOrder.length;
        const clamped = Math.max(0, Math.min(tabOrder.length - 1, position));
        const offset = padding + clamped * tabWidth;

        if (animate) {
            tabIndicator.classList.add('animating');
            setTimeout(() => tabIndicator.classList.remove('animating'), 350);
        } else {
            tabIndicator.classList.remove('animating');
        }
        tabIndicator.style.left = offset + 'px';

        // Update text colors based on indicator position
        updateBarTextColors(clamped);
    }

    // Smoothly interpolate text color between blue and white based on indicator overlap
    function updateBarTextColors(position) {
        if (!isMobile()) return;
        barItems.forEach(item => {
            const tab = item.getAttribute('data-tab');
            const tabIndex = tabOrder.indexOf(tab);
            if (tabIndex === -1) return;

            // overlap: 1.0 = fully under indicator, 0.0 = fully exposed
            const overlap = Math.max(0, 1 - Math.abs(position - tabIndex));

            // Interpolate from blue (#6366f1) to white (#ffffff)
            const r = Math.round(57 + (255 - 57) * overlap);
            const g = Math.round(157 + (255 - 157) * overlap);
            const b = Math.round(250 + (255 - 250) * overlap);
            item.style.color = `rgb(${r}, ${g}, ${b})`;
        });
    }

    window.switchToTab = function switchToTab(tabName, animate) {
        if (window.showGlobalRefreshLoader) window.showGlobalRefreshLoader();
        const currentTab = getActiveTab();

        // Save scroll position of current tab before switching
        if (currentTab && currentTab !== tabName) {
            if (isMobile()) {
                const currentPanel = tabContainers[currentTab];
                if (currentPanel) {
                    scrollPositions[currentTab] = currentPanel.scrollTop;
                }
            } else {
                scrollPositions[currentTab] = window.scrollY || document.documentElement.scrollTop;
            }
        }

        if (isMobile() && sliderTrack) {
            // Mobile: Slide to the correct panel
            const index = tabOrder.indexOf(tabName);
            if (animate !== false) {
                sliderTrack.classList.add('animating');
                setTimeout(() => sliderTrack.classList.remove('animating'), 350);
            }
            sliderTrack.style.transform = `translateX(-${index * 100}%)`;
            moveIndicator(index, animate !== false);
        } else {
            // Desktop: hide/show containers
            Object.values(tabContainers).forEach(container => {
                if (container) container.style.display = 'none';
            });
            if (tabContainers[tabName]) {
                tabContainers[tabName].style.display = '';
            }
        }

        // Update active class on bar items
        barItems.forEach(i => {
            i.classList.remove('active');
            if (i.getAttribute('data-tab') === tabName) {
                i.classList.add('active');
            }
        });

        // Clear inline colors so CSS .active class takes over cleanly
        barItems.forEach(i => i.style.color = '');

        // Restore scroll position of the target tab
        if (isMobile()) {
            const panel = tabContainers[tabName];
            if (panel) {
                panel.scrollTop = scrollPositions[tabName] || 0;
            }
        } else {
            window.scrollTo(0, scrollPositions[tabName] || 0);
        }

        // Save page state for restoration after refresh (Real-time Sync Feature)
        if (window.realtimeSync) {
            window.realtimeSync.savePageState({ tab: tabName });
        }
        try {
            localStorage.setItem('nd_active_tab', tabName);
        } catch (e) {}
        if (tabName && tabName !== (location.hash || '').replace(/^#/, '')) {
            history.replaceState({ tab: tabName }, '', location.pathname + location.search + '#' + tabName);
        }

        if (tabName === 'payout' && window.refreshPayouts) window.refreshPayouts();
        if (tabName === 'product' && window.refreshProducts) window.refreshProducts();
        if (tabName === 'menu' && window.refreshMenu) window.refreshMenu();

        // Control FAB visibility across tabs to prevent overlapping fixed elements
        const fabCart = document.getElementById('fabCartBtn');
        if (fabCart) {
            if (tabName === 'product') {
                fabCart.style.display = 'flex';
                // Trigger minimize animation after 3.5s on first visit
                if (!fabCart.dataset.minimizeTriggered) {
                    fabCart.dataset.minimizeTriggered = '1';
                    setTimeout(() => {
                        if (window.innerWidth < 1024) fabCart.classList.add('minimized');
                    }, 3500);
                }
            } else {
                fabCart.style.display = 'none';
            }
        }
        const payoutMsg = document.getElementById('btnPayoutMessage');
        if (payoutMsg) {
            payoutMsg.style.display = tabName === 'payout' ? 'flex' : 'none';
        }

        if (window.hideGlobalRefreshLoader) setTimeout(window.hideGlobalRefreshLoader, 300);
    }

    barItems.forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.getAttribute('data-tab');
            if (tab) switchToTab(tab);
        });
    });

    // Restore user tab immediately on refresh (avoid waiting on realtime-sync delay)
    if (!window.__pageStateRestored) {
        let restoredTab = null;
        try {
            const saved = localStorage.getItem('nd_user_page_state');
            if (saved) {
                const state = JSON.parse(saved);
                if (state.tab && (!state.timestamp || Date.now() - state.timestamp < 86400000)) {
                    restoredTab = state.tab;
                }
            }
        } catch (e) {}

        if (!restoredTab) {
            const hash = (location.hash || '').replace(/^#/, '');
            if (tabOrder.includes(hash)) restoredTab = hash;
            else {
                const legacy = localStorage.getItem('nd_active_tab');
                if (legacy && tabOrder.includes(legacy)) restoredTab = legacy;
            }
        }

        if (restoredTab) {
            switchToTab(restoredTab, false);
            window.__pageStateRestored = true;
        }
    }

    // Community Button Click
    const btnCommunity = document.getElementById('btnCommunity');
    if (btnCommunity) {
        btnCommunity.addEventListener('click', () => {
            if (typeof openCommunityChat === 'function') {
                openCommunityChat();
            } else {
                customAlert('Community chat is loading, please try again.');
            }
        });

        // Add Unread Badge to Community Button
        function updateCommunityBadge() {
            const existingBadge = btnCommunity.querySelector('.comm-badge');
            if (existingBadge) existingBadge.remove();

            const count = typeof getCommUnreadCount === 'function' ? getCommUnreadCount() : 0;
            if (count > 0) {
                const badge = document.createElement('span');
                badge.className = 'comm-badge';
                badge.textContent = count > 9 ? '9+' : count;
                badge.style.cssText = 'position:absolute; top:0; right:0; background:#ff4d4d; color:white; font-size:9px; font-weight:800; min-width:16px; height:16px; padding:0 3px; border-radius:10px; display:flex; align-items:center; justify-content:center; border:2px solid white; box-shadow:0 0 8px rgba(255,77,77,0.4); z-index:10; pointer-events:none; transform: translate(50%, -50%);';
                btnCommunity.style.position = 'relative';
                btnCommunity.style.overflow = 'visible';
                btnCommunity.appendChild(badge);
            }
        }
        
        updateCommunityBadge();
        setInterval(updateCommunityBadge, 2000);
    }

    // ========================================
    // Mobile Carousel Touch Handling
    // ========================================

    document.addEventListener('touchstart', (e) => {
        if (!isMobile()) return;
        if (document.body.classList.contains('modal-open')) return;
        if (isIndicatorDrag) return;

        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isDragging = true;
        isHorizontalDrag = null;
        if (sliderTrack) sliderTrack.classList.remove('animating');
        if (tabIndicator) tabIndicator.classList.remove('animating');
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (isIndicatorDrag) return;
        if (!isDragging || !isMobile()) return;
        if (document.body.classList.contains('modal-open')) return;
        if (!sliderTrack) return;

        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;
        const diffX = touchX - touchStartX;
        const diffY = touchY - touchStartY;

        // Decide direction on first significant move
        if (isHorizontalDrag === null) {
            if (Math.abs(diffX) > 8 || Math.abs(diffY) > 8) {
                isHorizontalDrag = Math.abs(diffX) > Math.abs(diffY);
            }
            return;
        }

        if (!isHorizontalDrag) return;

        // Prevent vertical scrolling while dragging horizontally
        e.preventDefault();

        const currentIndex = tabOrder.indexOf(getActiveTab());
        const basePercent = -currentIndex * 100;
        const dragPercent = (diffX / window.innerWidth) * 100;
        let totalPercent = basePercent + dragPercent;

        // Strict clamping at edges (No overflow / rubber-banding)
        const minPercent = -(tabOrder.length - 1) * 100;
        if (totalPercent > 0) {
            totalPercent = 0; // Can't swipe further than Payout
        } else if (totalPercent < minPercent) {
            totalPercent = minPercent; // Can't swipe further than Menu
        }

        sliderTrack.style.transform = `translateX(${totalPercent}%)`;

        // Move indicator in real-time with the drag
        const dragFraction = -diffX / window.innerWidth;
        moveIndicator(currentIndex + dragFraction, false);
    }, { passive: false });

    document.addEventListener('touchend', (e) => {
        if (isIndicatorDrag) return;
        if (!isDragging || !isMobile()) return;
        isDragging = false;

        if (isHorizontalDrag !== true) return;

        const touchEndX = e.changedTouches[0].clientX;
        const diffX = touchEndX - touchStartX;
        const currentIndex = tabOrder.indexOf(getActiveTab());
        let newIndex = currentIndex;

        // Standard: Swiping Left (diffX < 0) goes to Next tab
        if (Math.abs(diffX) > window.innerWidth * 0.25) {
            if (diffX < 0 && currentIndex < tabOrder.length - 1) {
                newIndex = currentIndex + 1;
            } else if (diffX > 0 && currentIndex > 0) {
                newIndex = currentIndex - 1;
            }
        }

        switchToTab(tabOrder[newIndex]);
    }, { passive: true });

    // ========================================
    // Indicator Drag (drag the pill on the bar)
    // ========================================
    const orangeBar = document.querySelector('.orange-bar');

    if (orangeBar && tabIndicator) {
        let barDragStartX = 0;
        let barDragDecided = false;

        orangeBar.addEventListener('touchstart', (e) => {
            if (!isMobile()) return;
            if (document.body.classList.contains('modal-open')) return;

            barDragStartX = e.touches[0].clientX;
            barDragDecided = false;

            if (sliderTrack) sliderTrack.classList.remove('animating');
            tabIndicator.classList.remove('animating');

            // Stop this from triggering the page-level carousel
            e.stopPropagation();
        }, { passive: true });

        orangeBar.addEventListener('touchmove', (e) => {
            if (!isMobile()) return;

            const diffX = e.touches[0].clientX - barDragStartX;

            // Wait until we confirm horizontal drag (not a tap)
            if (!barDragDecided) {
                if (Math.abs(diffX) > 8) {
                    barDragDecided = true;
                    isIndicatorDrag = true;
                } else {
                    return;
                }
            }

            e.preventDefault();

            const barRect = orangeBar.getBoundingClientRect();
            const padding = 4;
            const innerWidth = barRect.width - padding * 2;
            const tabWidth = innerWidth / tabOrder.length;

            // Position so the indicator centers on the finger
            const fingerX = e.touches[0].clientX - barRect.left - padding;
            const position = (fingerX - tabWidth / 2) / tabWidth;
            const clamped = Math.max(0, Math.min(tabOrder.length - 1, position));

            // Move indicator
            moveIndicator(clamped, false);

            // Move page in sync
            if (sliderTrack) {
                sliderTrack.style.transform = `translateX(-${clamped * 100}%)`;
            }
        }, { passive: false });

        orangeBar.addEventListener('touchend', (e) => {
            if (!isIndicatorDrag) return;
            isIndicatorDrag = false;

            // Snap to nearest tab
            const barRect = orangeBar.getBoundingClientRect();
            const padding = 4;
            const innerWidth = barRect.width - padding * 2;
            const tabWidth = innerWidth / tabOrder.length;

            const fingerX = e.changedTouches[0].clientX - barRect.left - padding;
            const position = (fingerX - tabWidth / 2) / tabWidth;
            const nearestIndex = Math.max(0, Math.min(tabOrder.length - 1, Math.round(position)));

            switchToTab(tabOrder[nearestIndex]);
        }, { passive: true });
    }
});



