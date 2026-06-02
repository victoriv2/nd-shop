(function() {
    // --- Automatic user ID migration from nd SHOP00001 to nd00001 ---
    (function() {
        const migratedKey = 'nd_user_id_prefix_migrated_to_nd';
        if (localStorage.getItem(migratedKey)) return;

        try {
            // 1. Migrate nd_users
            const usersRaw = localStorage.getItem('nd_users');
            if (usersRaw) {
                const users = JSON.parse(usersRaw);
                users.forEach(u => {
                    if (u.id && u.id.startsWith('nd SHOP')) {
                        u.id = u.id.replace('nd SHOP', 'nd');
                    }
                });
                localStorage.setItem('nd_users', JSON.stringify(users));
            }

            // 2. Migrate nd_logged_in_user
            const loggedInRaw = localStorage.getItem('nd_logged_in_user');
            if (loggedInRaw) {
                const loggedIn = JSON.parse(loggedInRaw);
                if (loggedIn.id && loggedIn.id.startsWith('nd SHOP')) {
                    loggedIn.id = loggedIn.id.replace('nd SHOP', 'nd');
                    localStorage.setItem('nd_logged_in_user', JSON.stringify(loggedIn));
                }
            }

            // 3. Migrate nd_sales_history
            const salesRaw = localStorage.getItem('nd_sales_history');
            if (salesRaw) {
                const sales = JSON.parse(salesRaw);
                sales.forEach(s => {
                    if (s.customerID && s.customerID.startsWith('nd SHOP')) {
                        s.customerID = s.customerID.replace('nd SHOP', 'nd');
                    }
                });
                localStorage.setItem('nd_sales_history', JSON.stringify(sales));
            }

            // 4. Migrate nd_requests_data
            const requestsRaw = localStorage.getItem('nd_requests_data');
            if (requestsRaw) {
                const requests = JSON.parse(requestsRaw);
                requests.forEach(r => {
                    if (r.userId && r.userId.startsWith('nd SHOP')) {
                        r.userId = r.userId.replace('nd SHOP', 'nd');
                    }
                    if (r.user && r.user.id && r.user.id.startsWith('nd SHOP')) {
                        r.user.id = r.user.id.replace('nd SHOP', 'nd');
                    }
                });
                localStorage.setItem('nd_requests_data', JSON.stringify(requests));
            }

            // 5. Migrate nd_debt_requests
            const debtRequestsRaw = localStorage.getItem('nd_debt_requests');
            if (debtRequestsRaw) {
                const debtRequests = JSON.parse(debtRequestsRaw);
                debtRequests.forEach(dr => {
                    if (dr.userId && dr.userId.startsWith('nd SHOP')) {
                        dr.userId = dr.userId.replace('nd SHOP', 'nd');
                    }
                    if (dr.user && dr.user.id && dr.user.id.startsWith('nd SHOP')) {
                        dr.user.id = dr.user.id.replace('nd SHOP', 'nd');
                    }
                });
                localStorage.setItem('nd_debt_requests', JSON.stringify(debtRequests));
            }

            // 6. Migrate nd_messages
            const messagesRaw = localStorage.getItem('nd_messages');
            if (messagesRaw) {
                const messages = JSON.parse(messagesRaw);
                messages.forEach(m => {
                    if (m.senderId && m.senderId.startsWith('nd SHOP')) {
                        m.senderId = m.senderId.replace('nd SHOP', 'nd');
                    }
                    if (m.receiverId && m.receiverId.startsWith('nd SHOP')) {
                        m.receiverId = m.receiverId.replace('nd SHOP', 'nd');
                    }
                });
                localStorage.setItem('nd_messages', JSON.stringify(messages));
            }

            // 7. Migrate nd_user_last_seen
            const lastSeenRaw = localStorage.getItem('nd_user_last_seen');
            if (lastSeenRaw) {
                const lastSeen = JSON.parse(lastSeenRaw);
                const migratedLastSeen = {};
                for (const key in lastSeen) {
                    const newKey = key.startsWith('nd SHOP') ? key.replace('nd SHOP', 'nd') : key;
                    migratedLastSeen[newKey] = lastSeen[key];
                }
                localStorage.setItem('nd_user_last_seen', JSON.stringify(migratedLastSeen));
            }

            // 8. Migrate nd_debtor_notes
            const debtorNotesRaw = localStorage.getItem('nd_debtor_notes');
            if (debtorNotesRaw) {
                const debtorNotes = JSON.parse(debtorNotesRaw);
                debtorNotes.forEach(n => {
                    if (n.title) {
                        n.title = n.title.replace(/nd SHOP(\d+)/gi, 'nd$1');
                    }
                    if (n.content) {
                        n.content = n.content.replace(/nd SHOP(\d+)/gi, 'nd$1');
                    }
                });
                localStorage.setItem('nd_debtor_notes', JSON.stringify(debtorNotes));
            }

            localStorage.setItem(migratedKey, 'true');
            console.log('Successfully migrated user ID prefixes in LocalStorage from "nd SHOP" to "nd"');
        } catch (e) {
            console.error('Failed to migrate user ID prefixes in LocalStorage:', e);
        }
    })();

    let isNavigatingBack = false;
    let overlayStack = []; // Keep track of open overlays in order
    let lastTab = null;

    /**
     * Global App Fixes
     */

    /**
     * Sync users with Supabase backend
     */
    async function syncUsersFromBackend() {
        try {
            const token = localStorage.getItem('nd_token') || '';
            const response = await fetch(window.API_BASE + '/api/users', {
                headers: token ? { 'Authorization': 'Bearer ' + token } : {}
            });
            const data = await response.json();
            if (data.success && data.users) {
                // Merge users to prevent wiping out local test users that aren't in the DB yet
                let localUsers = [];
                try {
                    localUsers = JSON.parse(localStorage.getItem('nd_users') || '[]');
                } catch(e) {}
                
                data.users.forEach(dbU => {
                    let idx = localUsers.findIndex(lu => lu.id === dbU.id);
                    if (idx >= 0) {
                        localUsers[idx] = dbU;
                    } else {
                        localUsers.push(dbU);
                    }
                });
                
                // Keep nd_users locally updated so that admin tools and security modules keep working
                localStorage.setItem('nd_users', JSON.stringify(localUsers));
                // If a user is logged in, update their local data silently
                const loggedInRaw = localStorage.getItem('nd_logged_in_user');
                if (loggedInRaw) {
                    const loggedIn = JSON.parse(loggedInRaw);
                    // Match by ID first, then fall back to email or phone in case the ID changed (e.g. after a bulk rename)
                    let freshUser = data.users.find(u => u.id === loggedIn.id);
                    if (!freshUser && loggedIn.email) {
                        freshUser = data.users.find(u => u.email && u.email.toLowerCase() === loggedIn.email.toLowerCase());
                    }
                    if (!freshUser && loggedIn.phone) {
                        freshUser = data.users.find(u => u.phone && u.phone === loggedIn.phone);
                    }
                    if (freshUser) {
                        localStorage.setItem('nd_logged_in_user', JSON.stringify(freshUser));
                        window.loggedInUser = freshUser;
                        // Refresh the menu so the new ID shows immediately
                        if (typeof window.refreshMenu === 'function') {
                            window.refreshMenu();
                        }
                    }
                }
            }
        } catch (err) {
            console.warn('Failed to sync users from backend:', err);
        }
    }

    // Call it right away
    syncUsersFromBackend();

    window.showGlobalRefreshLoader = function() {
        let loader = document.getElementById('globalRefreshLoader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'globalRefreshLoader';
            loader.innerHTML = `
                <div style="width:36px;height:36px;border:3px solid rgba(27,38,59,0.2);border-top:3px solid #8b5cf6;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
                <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
            `;
            let isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            loader.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:' + (isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)') + ';backdrop-filter:blur(2px);z-index:999999;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.2s;';
            document.body.appendChild(loader);
        }
        loader.style.display = 'flex';
        requestAnimationFrame(() => { loader.style.opacity = '1'; });
    };

    window.hideGlobalRefreshLoader = function() {
        const loader = document.getElementById('globalRefreshLoader');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => { loader.style.display = 'none'; }, 200);
        }
    };

    // --- ISSUE 1: Data not updating until refresh ---
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
        originalSetItem.apply(this, arguments);
        const event = new CustomEvent('local-storage-update', { detail: { key, value } });
        window.dispatchEvent(event);
    };

    window.addEventListener('local-storage-update', (e) => {
        const k = e.detail.key;
        try {
            if (k === 'nd_products_data' && typeof window.renderDynamicProducts === 'function') {
                const i = document.getElementById('productSearchInput');
                window.renderDynamicProducts(i ? i.value : '');
            }
            if (k === 'nd_debtor_notes' && typeof window.renderDebtorNotes === 'function') window.renderDebtorNotes();
            if ((k === 'nd_transactions' || k.includes('payout')) && typeof window.filterPayouts === 'function') window.filterPayouts('all');
            // Auto-refresh sales table when sales data changes
            if (k === 'nd_sales_history') {
                if (typeof window.refreshSalesTable === 'function') window.refreshSalesTable();
                // Also refresh Sales Book if it's currently visible
                if (typeof window.renderSalesBook === 'function') {
                    const sbPage = document.getElementById('salesBookPage');
                    if (sbPage && sbPage.style.display === 'flex') window.renderSalesBook();
                }
            }
        } catch(err) { console.warn(err); }

        try {
            // Ignore high-frequency polling keys that don't need a UI reflow
            if (k === 'nd_storage_poll_cache' || k === 'nd_user_last_seen' || k === 'nd_user_page_state' || k === 'nd_admin_page_state') return;

            const trackContainers = document.querySelectorAll('.slider-track > div');
            trackContainers.forEach(c => {
                if (c.style.display !== 'none') {
                    const originalStr = c.style.display;
                    const savedScroll = c.scrollTop;
                    c.style.display = 'none';
                    void c.offsetHeight; 
                    c.style.display = originalStr;
                    if (savedScroll > 0) c.scrollTop = savedScroll;
                }
            });
        } catch(err) {}
    });

    // --- Soft Refresh: Automatically re-render active views when data changes ---
    // This avoids the need for manual page refreshes after performing actions.
    let _lastSalesHash = localStorage.getItem('nd_sales_history') || '';
    let _lastProductsHash = localStorage.getItem('nd_products_data') || '';

    // Interval removed: it caused input focus and UI state loss when re-rendering active panels.
    // The previous implementation used setInterval to poll localStorage and call functions
    // like window.refreshSalesTable() and window.renderDynamicProducts().

    // --- ISSUE 2: Native Back-Button Management Across EVERY Screen/Menu/Modal/Action ---
    
    const observer = new MutationObserver((mutations) => {
        if (isNavigatingBack) return;
        let addedOverlay = false;

        for (const mutation of mutations) {
            const el = mutation.target;
            
            // Ignore script, style, meta tags
            if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'LINK') continue;

            if (mutation.type === 'attributes') {
                const isOverlayEl = el.classList.contains('show') || 
                                    el.classList.contains('open') || 
                                    (el.style.display === 'flex' && el.id && el.id.toLowerCase().includes('modal')) ||
                                    (el.style.display === 'block' && el.id && el.id.toLowerCase().includes('dropdown'));
                                    
                const wasOverlayEl = mutation.oldValue && (
                                     mutation.oldValue.includes('show') || 
                                     mutation.oldValue.includes('open') || 
                                     mutation.oldValue.includes('display: flex') ||
                                     mutation.oldValue.includes('display: block'));

                if (isOverlayEl && !wasOverlayEl) {
                    if (!overlayStack.includes(el)) {
                        overlayStack.push(el);
                        addedOverlay = true;
                    }
                } else if (!isOverlayEl && wasOverlayEl) {
                    const index = overlayStack.indexOf(el);
                    if (index > -1) {
                        overlayStack.splice(index, 1);
                    }
                }
            }
        }

        if (addedOverlay) {
            window.history.pushState({ overlayIndex: overlayStack.length }, '', location.pathname + location.search + '#view');
        }
    });

    document.addEventListener('DOMContentLoaded', () => {
        observer.observe(document.body, { 
            attributes: true, 
            attributeOldValue: true, 
            attributeFilter: ['class', 'style'],
            subtree: true 
        });
        
        // Base state
        if (!window.history.state) {
            window.history.replaceState({ root: true }, '');
        }

        // Catch Hardware/Browser Back Buttons (PopState)
        window.addEventListener('popstate', (e) => {
            isNavigatingBack = true;
            
            if (overlayStack.length > 0) {
                const el = overlayStack.pop();
                el.classList.remove('show');
                el.classList.remove('open');
                if (el.style.display === 'flex' || el.style.display === 'block') {
                    el.style.display = 'none';
                }
                
                const remainingModals = document.querySelectorAll('.modal-open .show, .modal-open .modal-overlay.show, body > .show, .modal-open [style*="display: flex"]');
                if (remainingModals.length === 0) {
                    document.body.classList.remove('modal-open');
                }

                // Clear modal persistence when back-button closes an overlay
                if (typeof window.clearAdminModalPersistence === 'function') {
                    setTimeout(window.clearAdminModalPersistence, 50);
                }
            } 
            else {
                const openItems = document.querySelectorAll('.show, .open, .dropdown[style*="block"], .modal-overlay[style*="flex"]');
                openItems.forEach(item => {
                    item.classList.remove('show');
                    item.classList.remove('open');
                    if (item.style.display === 'flex' || item.style.display === 'block') item.style.display = 'none';
                });
                document.body.classList.remove('modal-open');
            }

            // Tab switching restore mechanism
            if (e.state) {
                if (e.state.tab) {
                    if (typeof window.switchToTab === 'function') {
                        let tabName = e.state.tab;
                        if (tabName.startsWith('tab-')) tabName = tabName.replace('tab-', '');
                        window.switchToTab(tabName, false);
                    } else {
                        // Admin panel routing fallback
                        const targetTab = document.getElementById(e.state.tab);
                        if (targetTab) targetTab.click(); 
                    }
                } else if (e.state.root) {
                    if (typeof window.switchToTab === 'function') {
                        // Restore from saved tab instead of defaulting to 'payout'
                        const savedTab = localStorage.getItem('nd_active_tab') || 'payout';
                        window.switchToTab(savedTab, false);
                    } else {
                        // Admin panel: restore saved admin tab
                        const savedAdminTab = localStorage.getItem('nd_admin_active_tab') || 'tab-register';
                        const defaultTab = document.getElementById(savedAdminTab);
                        if (defaultTab) defaultTab.click();
                    }
                }
            }

            setTimeout(() => { isNavigatingBack = false; }, 50);
        });

        // Tab interception logic
        const barItems = document.querySelectorAll('.bar-item, .bottom-bar-item');
        barItems.forEach(item => {
            item.addEventListener('click', () => {
                if (isNavigatingBack) return;
                const tab = item.getAttribute('data-tab') || item.id;
                if (tab && tab !== lastTab) {
                    lastTab = tab;
                    window.history.pushState({ tab: tab }, '', location.pathname + location.search + '#' + tab);
                }
            });
        });

        // --- Custom Mobile Safari-Style Pull Down To Refresh ---
        if (window.matchMedia('(max-width: 1023px)').matches) {
            // Inject Global Visual Indicator
            let ptrIndicator = document.getElementById('ptr-global-indicator');
            if (!ptrIndicator) {
                ptrIndicator = document.createElement('div');
                ptrIndicator.id = 'ptr-global-indicator';
                ptrIndicator.className = 'ptr-indicator';
                ptrIndicator.innerHTML = `
                    <svg class="ptr-spinner-svg" viewBox="0 0 24 24">
                        <circle class="ptr-circle-bg" cx="12" cy="12" r="9" fill="none" stroke-width="3"></circle>
                        <circle class="ptr-circle-path" cx="12" cy="12" r="9" fill="none" stroke-width="3" stroke-dasharray="56.5" stroke-dashoffset="56.5" stroke-linecap="round"></circle>
                    </svg>
                `;
                document.body.appendChild(ptrIndicator);
            }
            const ptrCirclePath = ptrIndicator.querySelector('.ptr-circle-path');
            const ptrSpinnerSvg = ptrIndicator.querySelector('.ptr-spinner-svg');

            const isAdminLoggedOut = window.location.pathname.includes('/admin') && 
                                     sessionStorage.getItem('nd_admin_logged_in') !== 'true';
            const isAuthOrAdmin = document.body.classList.contains('auth-body') || isAdminLoggedOut;
            const isPageAdmin = window.location.pathname.includes('/admin');
                                  
            const scrollContainers = [document.body];

            function getAnimTarget(c) {
                if (c === document.body) {
                    const sliderViewport = document.querySelector('.slider-viewport');
                    if (sliderViewport) return sliderViewport;
                    const regContainer = document.getElementById('register-container');
                    if (regContainer) return regContainer;
                    const adminContent = document.querySelector('.admin-content');
                    if (adminContent) return adminContent;
                    const authCard = document.querySelector('.auth-card') || document.querySelector('.login-container');
                    if (authCard) return authCard;
                }
                return c;
            }

            function isModalActive() {
                if (document.body.classList.contains('modal-open')) return true;
                
                // Helper to check if element is visually hidden (opacity, pointer-events, or off-screen)
                function isElementHidden(el, style) {
                    const opacityVal = parseFloat(style.opacity);
                    if (style.opacity === '0' || opacityVal === 0 || style.pointerEvents === 'none') return true;
                    
                    // Check if it's pushed off-screen via transform (e.g. translateY(100%))
                    const rect = el.getBoundingClientRect();
                    // If it's completely below the viewport or has no size
                    if (rect.top >= window.innerHeight || rect.bottom <= 0 || (rect.width === 0 && rect.height === 0)) {
                        return true;
                    }
                    return false;
                }
                
                // Scan all elements containing "modal-overlay" class or specific overlay containers
                const overlays = document.querySelectorAll('.modal-overlay, .admin-modal-overlay, .menu-modal-overlay, [class*="modal-overlay"], #cartOverlay, #cartModalContainer');
                for (let i = 0; i < overlays.length; i++) {
                    const el = overlays[i];
                    const style = window.getComputedStyle(el);
                    if (style.display !== 'none' && style.visibility !== 'hidden') {
                        if (!isElementHidden(el, style)) {
                            return true;
                        }
                    }
                }
                
                // Scan modal contents that might be active
                const modalContents = document.querySelectorAll('.modal-content, [class*="modal-content"], .admin-modal-content');
                for (let i = 0; i < modalContents.length; i++) {
                    const el = modalContents[i];
                    const style = window.getComputedStyle(el);
                    if (style.display !== 'none' && style.visibility !== 'hidden') {
                        if (!isElementHidden(el, style)) {
                            const parent = el.parentElement;
                            if (parent) {
                                const parentStyle = window.getComputedStyle(parent);
                                if (parentStyle.display !== 'none' && parentStyle.visibility !== 'hidden') {
                                    if (!isElementHidden(parent, parentStyle)) {
                                        return true;
                                    }
                                }
                            } else {
                                return true;
                            }
                        }
                    }
                }

                // If overlays exist in the back button navigation stack
                if (window.overlayStack && window.overlayStack.length > 0) return true;

                return false;
            }

            function getScrollTop(containerEl, targetEl) {
                if (containerEl !== window && containerEl !== document.body) {
                    return containerEl.scrollTop;
                }

                // Traverse up from the touch target to find any active scrollable container
                let current = targetEl;
                while (current && current !== document.body && current !== document.documentElement) {
                    const style = window.getComputedStyle(current);
                    const isScrollable = (style.overflowY === 'auto' || style.overflowY === 'scroll');
                    
                    if (isScrollable && current.scrollHeight > current.clientHeight) {
                        return current.scrollTop;
                    }
                    current = current.parentElement;
                }

                return 0;
            }

            scrollContainers.forEach(container => {
                if (!container) return;

                let startY = 0;
                let startX = 0;
                let currentY = 0;
                let isPulling = false;

                const targetBinding = (container === document.body) ? window : container;
                const useCaptureOption = (container === document.body);

                targetBinding.addEventListener('touchstart', (e) => {
                    if (isModalActive()) return;

                    const scrollTop = getScrollTop(targetBinding, e.target);

                    if (scrollTop <= 5 && e.touches.length === 1 && !ptrIndicator.classList.contains('loading')) {
                        startY = e.touches[0].pageY;
                        startX = e.touches[0].pageX;
                        currentY = startY;
                        isPulling = true;
                        
                        const animTarget = getAnimTarget(container);
                        if (animTarget) animTarget.style.transition = '';
                        ptrIndicator.style.transition = '';
                    }
                }, { passive: true, capture: useCaptureOption });

                targetBinding.addEventListener('touchmove', (e) => {
                    if (!isPulling) return;
                    currentY = e.touches[0].pageY;
                    const diff = currentY - startY;
                    const diffX = Math.abs(e.touches[0].pageX - startX);

                    // Cancel pull-to-refresh if they are swiping horizontally (changing tabs or sliding tables)
                    if (diffX > Math.abs(diff) && diffX > 10) {
                        isPulling = false;
                        const animTarget = getAnimTarget(container);
                        if (animTarget) {
                            animTarget.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
                            animTarget.style.transform = '';
                        }
                        ptrIndicator.style.transform = 'translate(-50%, -50px) scale(0)';
                        ptrIndicator.style.opacity = '0';
                        return;
                    }

                    if (diff > 0) {
                        if (e.cancelable) e.preventDefault();
                        
                        const pullDistance = Math.min(diff * 0.4, 100); // Physics damping
                        const animTarget = getAnimTarget(container);
                        if (animTarget) {
                            animTarget.style.transform = `translateY(${pullDistance}px)`;
                        }

                        // Animate global indicator
                        ptrIndicator.style.opacity = Math.min(1, pullDistance / 40);
                        const indicatorY = Math.min(pullDistance * 0.8, 60);
                        ptrIndicator.style.transform = `translate(-50%, ${indicatorY}px) scale(${Math.min(1, pullDistance / 60)})`;
                        
                        const progress = Math.min(1, pullDistance / 70);
                        ptrCirclePath.style.strokeDashoffset = 56.5 * (1 - progress);
                        ptrSpinnerSvg.style.transform = `rotate(${progress * 360 - 90}deg)`;

                        if (pullDistance >= 70) {
                            ptrIndicator.classList.add('ready');
                        } else {
                            ptrIndicator.classList.remove('ready');
                        }
                    } else {
                        // Reset visual position if drag goes backwards
                        const animTarget = getAnimTarget(container);
                        if (animTarget) animTarget.style.transform = '';
                        ptrIndicator.style.transform = 'translate(-50%, -50px) scale(0)';
                        ptrIndicator.style.opacity = '0';
                    }
                }, { passive: false, capture: useCaptureOption });

                targetBinding.addEventListener('touchend', () => {
                    if (!isPulling) return;
                    isPulling = false;
                    const diff = currentY - startY;
                    const pullDistance = Math.min(diff * 0.4, 100);
                    const animTarget = getAnimTarget(container);

                    if (pullDistance >= 70) {
                        ptrIndicator.classList.add('loading');
                        ptrCirclePath.style.strokeDashoffset = '15'; // Loader dash gap
                        
                        if (animTarget) {
                            animTarget.style.transition = 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.15)';
                            animTarget.style.transform = 'translateY(55px)';
                        }
                        ptrIndicator.style.transition = 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.15), opacity 0.25s';
                        ptrIndicator.style.transform = 'translate(-50%, 55px) scale(1)';
                        ptrIndicator.style.opacity = '1';
                        
                        setTimeout(() => {
                            try {
                                if (window.parent && window.parent.location) {
                                    window.parent.location.reload(true);
                                } else {
                                    window.location.reload(true);
                                }
                            } catch (e) {
                                window.location.href = window.location.pathname + window.location.search + window.location.hash;
                            }
                            
                            // Failsafe: if the page doesn't unload/reload within 3 seconds, reset the spinner
                            setTimeout(() => {
                                ptrIndicator.classList.remove('loading');
                                ptrIndicator.style.transform = 'translate(-50%, -50px) scale(0)';
                                ptrIndicator.style.opacity = '0';
                                if (animTarget) {
                                    animTarget.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1)';
                                    animTarget.style.transform = '';
                                }
                            }, 3000);
                        }, 300); // Slight snap pause to wow the user
                    } else {
                        // Bounce back to default
                        if (animTarget) {
                            animTarget.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1)';
                            animTarget.style.transform = '';
                        }
                        ptrIndicator.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1), opacity 0.3s ease';
                        ptrIndicator.style.transform = 'translate(-50%, -50px) scale(0)';
                        ptrIndicator.style.opacity = '0';
                        
                        setTimeout(() => {
                            if (!ptrIndicator.classList.contains('loading')) {
                                ptrCirclePath.style.strokeDashoffset = '56.5';
                                ptrIndicator.classList.remove('ready');
                            }
                        }, 400);
                    }
                });

                targetBinding.addEventListener('touchcancel', () => {
                    if (!isPulling) return;
                    isPulling = false;
                    const animTarget = getAnimTarget(container);
                    if (animTarget) {
                        animTarget.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
                        animTarget.style.transform = '';
                    }
                    ptrIndicator.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
                    ptrIndicator.style.transform = 'translate(-50%, -50px) scale(0)';
                    ptrIndicator.style.opacity = '0';
                });
            });
        }
    });

})();

/**
 * Shared Inventory Management Logic
 * Used by both Admin and User sides to track stock levels accurately
 */
window.checkProductOutOfStock = function(productName) {
    const products = JSON.parse(localStorage.getItem('nd_products_data') || '[]');
    const sales = JSON.parse(localStorage.getItem('nd_sales_history') || '[]');
    const p = products.find(item => item.name === productName);
    if (!p) return false;

    if (p.isSpecial || p.packTypes) {
        const s = p.structure || {};
        const cpb = parseInt(s.custardsPerBag || s.c2sPerC1) || 1;
        const cpc = parseInt(s.cupsPerCustard || s.c3sPerC2) || 1;
        const maxCupsPerBag = cpb * cpc;
        
        let totalBoughtCups = 0;
        products.forEach(item => {
            if (item.name === productName && item.packTypes) {
                totalBoughtCups += (parseFloat(item.boughtQuantity) || 1) * maxCupsPerBag;
            }
        });

        const bTitle = p.packTypes.bag?.title || p.packTypes.c1?.title || 'Container 1';
        const cTitle = p.packTypes.custard?.title || p.packTypes.c2?.title || 'Container 2';
        const cpTitle = p.packTypes.cup?.title || p.packTypes.c3?.title || 'Container 3';

        let soldCups = 0, soldCustards = 0, soldBags = 0;
        sales.forEach(sale => {
            if (sale.item && sale.item.includes(productName)) {
                const q = parseFloat(sale.qty) || 0;
                if (sale.item.includes(`(${cpTitle})`)) soldCups += q;
                else if (sale.item.includes(`(${cTitle})`)) soldCustards += q;
                else if (sale.item.includes(`(${bTitle})`)) soldBags += q;
            }
        });

        const totalSoldCups = (soldBags * maxCupsPerBag) + (soldCustards * cpc) + soldCups;
        return (totalBoughtCups - totalSoldCups) <= 0;
    } else if (p.isFlexible) {
        // Flexible: stock tracked in C1 containers (boughtQuantity)
        const s = p.structure || {};
        const c2sPerC1 = parseInt(s.c2sPerC1) || 1;
        const c3sPerC2 = parseInt(s.c3sPerC2) || 1;

        let totalC1Bought = 0;
        products.forEach(item => {
            if (item.name === productName && item.isFlexible) {
                totalC1Bought += parseFloat(item.boughtQuantity) || 0;
            }
        });

        const pk = p.packTypes || {};
        const c1Title = (pk.c1 && pk.c1.title) || 'Container 1';
        const c2Title = (pk.c2 && pk.c2.title) || 'Container 2';
        const c3Title = (pk.c3 && pk.c3.title) || 'Container 3';

        // Convert all bought stock to C3 units for comparison
        const totalC3 = totalC1Bought * c2sPerC1 * c3sPerC2;

        let soldC1 = 0, soldC2 = 0, soldC3 = 0;
        sales.forEach(sale => {
            if (sale.item && sale.item.includes(productName)) {
                const q = parseFloat(sale.qty) || 0;
                if (sale.item.includes(`(${c3Title})`)) soldC3 += q;
                else if (sale.item.includes(`(${c2Title})`)) soldC2 += q;
                else if (sale.item.includes(`(${c1Title})`)) soldC1 += q;
            }
        });

        const totalSoldInC3 = (soldC1 * c2sPerC1 * c3sPerC2) + (soldC2 * c3sPerC2) + soldC3;
        return (totalC3 - totalSoldInC3) <= 0;

    } else if (p.isCustom) {
        // Custom: boughtQuantity is the number of pieces (units)
        let totalBought = 0;
        products.forEach(item => {
            if (item.name === productName && item.isCustom) {
                totalBought += (parseFloat(item.boughtQuantity) || 0) * (parseInt(item.pieces) || 1);
            }
        });

        let totalSold = 0;
        sales.forEach(sale => {
            if (sale.item === productName) {
                totalSold += parseFloat(sale.qty) || 0;
            }
        });

        return (totalBought - totalSold) <= 0;

    } else {
        // Default: boughtQuantity × pieces
        let totalBoughtPieces = 0;
        products.forEach(item => {
            if (item.name === productName && !item.isSpecial && !item.isFlexible && !item.isCustom) {
                totalBoughtPieces += (parseFloat(item.boughtQuantity) || 1) * (parseInt(item.pieces) || 1);
            }
        });
        
        let totalSoldPieces = 0;
        sales.forEach(sale => {
            if (sale.item === productName) {
                totalSoldPieces += parseFloat(sale.qty) || 0;
            } else if (sale.item === `${productName} (${p.bulkUnit || 'Carton'})`) {
                totalSoldPieces += (parseFloat(sale.qty) || 0) * (parseInt(p.pieces) || 1);
            }
        });
        
        return (totalBoughtPieces - totalSoldPieces) <= 0;
    }
};

window.checkProductRunningLow = function(productName) {
    const products = JSON.parse(localStorage.getItem('nd_products_data') || '[]');
    const sales = JSON.parse(localStorage.getItem('nd_sales_history') || '[]');
    const p = products.find(item => item.name === productName);
    if (!p) return false;

    if (p.isSpecial || p.packTypes) {
        const s = p.structure || {};
        const cpb = parseInt(s.custardsPerBag || s.c2sPerC1) || 1;
        const cpc = parseInt(s.cupsPerCustard || s.c3sPerC2) || 1;
        const maxCupsPerBag = cpb * cpc;
        
        let totalBoughtCups = 0;
        products.forEach(item => {
            if (item.name === productName && item.packTypes) {
                totalBoughtCups += (parseFloat(item.boughtQuantity) || 1) * maxCupsPerBag;
            }
        });

        const bTitle = p.packTypes.bag?.title || p.packTypes.c1?.title || 'Container 1';
        const cTitle = p.packTypes.custard?.title || p.packTypes.c2?.title || 'Container 2';
        const cpTitle = p.packTypes.cup?.title || p.packTypes.c3?.title || 'Container 3';

        let soldCups = 0, soldCustards = 0, soldBags = 0;
        sales.forEach(sale => {
            if (sale.item && sale.item.includes(productName)) {
                const q = parseFloat(sale.qty) || 0;
                if (sale.item.includes(`(${cpTitle})`)) soldCups += q;
                else if (sale.item.includes(`(${cTitle})`)) soldCustards += q;
                else if (sale.item.includes(`(${bTitle})`)) soldBags += q;
            }
        });

        const totalSoldCups = (soldBags * maxCupsPerBag) + (soldCustards * cpc) + soldCups;
        const remaining = totalBoughtCups - totalSoldCups;
        return remaining > 0 && remaining <= (totalBoughtCups / 2);
    } else if (p.isFlexible) {
        // Flexible: stock tracked in C1 containers (boughtQuantity)
        const s = p.structure || {};
        const c2sPerC1 = parseInt(s.c2sPerC1) || 1;
        const c3sPerC2 = parseInt(s.c3sPerC2) || 1;

        let totalC1Bought = 0;
        products.forEach(item => {
            if (item.name === productName && item.isFlexible) {
                totalC1Bought += parseFloat(item.boughtQuantity) || 0;
            }
        });

        const pk = p.packTypes || {};
        const c1Title = (pk.c1 && pk.c1.title) || 'Container 1';
        const c2Title = (pk.c2 && pk.c2.title) || 'Container 2';
        const c3Title = (pk.c3 && pk.c3.title) || 'Container 3';

        // Convert all bought stock to C3 units for comparison
        const totalC3 = totalC1Bought * c2sPerC1 * c3sPerC2;

        let soldC1 = 0, soldC2 = 0, soldC3 = 0;
        sales.forEach(sale => {
            if (sale.item && sale.item.includes(productName)) {
                const q = parseFloat(sale.qty) || 0;
                if (sale.item.includes(`(${c3Title})`)) soldC3 += q;
                else if (sale.item.includes(`(${c2Title})`)) soldC2 += q;
                else if (sale.item.includes(`(${c1Title})`)) soldC1 += q;
            }
        });

        const totalSoldInC3 = (soldC1 * c2sPerC1 * c3sPerC2) + (soldC2 * c3sPerC2) + soldC3;
        const remaining = totalC3 - totalSoldInC3;
        return remaining > 0 && remaining <= (totalC3 / 2);

    } else if (p.isCustom) {
        // Custom: boughtQuantity is the number of pieces (units)
        let totalBought = 0;
        products.forEach(item => {
            if (item.name === productName && item.isCustom) {
                totalBought += (parseFloat(item.boughtQuantity) || 0) * (parseInt(item.pieces) || 1);
            }
        });

        let totalSold = 0;
        sales.forEach(sale => {
            if (sale.item === productName) {
                totalSold += parseFloat(sale.qty) || 0;
            }
        });

        const remaining = totalBought - totalSold;
        return remaining > 0 && remaining <= (totalBought / 2);

    } else {
        // Default: boughtQuantity × pieces
        let totalBoughtPieces = 0;
        products.forEach(item => {
            if (item.name === productName && !item.isSpecial && !item.isFlexible && !item.isCustom) {
                totalBoughtPieces += (parseFloat(item.boughtQuantity) || 1) * (parseInt(item.pieces) || 1);
            }
        });
        
        let totalSoldPieces = 0;
        sales.forEach(sale => {
            if (sale.item === productName) {
                totalSoldPieces += parseFloat(sale.qty) || 0;
            } else if (sale.item === `${productName} (${p.bulkUnit || 'Carton'})`) {
                totalSoldPieces += (parseFloat(sale.qty) || 0) * (parseInt(p.pieces) || 1);
            }
        });
        
        const remaining = totalBoughtPieces - totalSoldPieces;
        return remaining > 0 && remaining <= (totalBoughtPieces / 2);
    }
};

window.getRemainingProductStock = function(productName, variantType = null) {
    const allProducts = JSON.parse(localStorage.getItem('nd_products_data') || '[]');
    // Filter out deleted and cleared products so we only look at active inventory
    const products = allProducts.filter(item => item && !item.isDeleted && !item.cleared);
    const sales = JSON.parse(localStorage.getItem('nd_sales_history') || '[]');
    
    let baseName = productName.trim();
    let extractedVariantTitle = null;
    let p = products.find(item => item.name && item.name.trim().toLowerCase() === baseName.toLowerCase());
    
    if (!p) {
        const match = productName.match(/^(.*?)\s+\(([^)]+)\)$/);
        if (match) {
            baseName = match[1].trim();
            extractedVariantTitle = match[2].trim();
            p = products.find(item => item.name && item.name.trim().toLowerCase() === baseName.toLowerCase());
        }
    }
    
    if (!p) return 0;

    if (p.isSpecial || p.packTypes) {
        const s = p.structure || {};
        const cpb = parseInt(s.custardsPerBag || s.c2sPerC1) || 1;
        const cpc = parseInt(s.cupsPerCustard || s.c3sPerC2) || 1;
        const maxCupsPerBag = cpb * cpc;
        
        let totalBoughtCups = 0;
        products.forEach(item => {
            if (item.name && item.name.trim().toLowerCase() === baseName.toLowerCase() && item.packTypes) {
                totalBoughtCups += (parseFloat(item.boughtQuantity) || 0) * maxCupsPerBag;
            }
        });

        const bTitle = p.packTypes?.bag?.title || p.packTypes?.c1?.title || 'Container 1';
        const cTitle = p.packTypes?.custard?.title || p.packTypes?.c2?.title || 'Container 2';
        const cpTitle = p.packTypes?.cup?.title || p.packTypes?.c3?.title || 'Container 3';

        let soldCups = 0, soldCustards = 0, soldBags = 0;
        sales.forEach(sale => {
            if (sale.item) {
                let saleBaseName = sale.item.trim();
                let saleVariant = '';
                const match = sale.item.match(/^(.*?)\s+\(([^)]+)\)$/);
                if (match) {
                    saleBaseName = match[1].trim();
                    saleVariant = match[2].trim();
                }

                if (saleBaseName.toLowerCase() === baseName.toLowerCase()) {
                    const q = parseFloat(sale.qty) || 0;
                    if (saleVariant === cpTitle || saleVariant === 'Container 3') soldCups += q;
                    else if (saleVariant === cTitle || saleVariant === 'Container 2') soldCustards += q;
                    else if (saleVariant === bTitle || saleVariant === 'Container 1') soldBags += q;
                }
            }
        });

        const totalSoldCups = (soldBags * maxCupsPerBag) + (soldCustards * cpc) + soldCups;
        const remainingCups = totalBoughtCups - totalSoldCups;

        let targetVariantType = variantType;
        if (!targetVariantType && extractedVariantTitle) {
            if (extractedVariantTitle === bTitle || extractedVariantTitle === 'Container 1') targetVariantType = 'bag';
            else if (extractedVariantTitle === cTitle || extractedVariantTitle === 'Container 2') targetVariantType = 'custard';
            else if (extractedVariantTitle === cpTitle || extractedVariantTitle === 'Container 3') targetVariantType = 'cup';
        }

        if (targetVariantType === 'bag' || targetVariantType === 'c1') {
            return Math.floor(remainingCups / maxCupsPerBag);
        } else if (targetVariantType === 'custard' || targetVariantType === 'c2') {
            return Math.floor(remainingCups / cpc);
        } else {
            return remainingCups;
        }
    } else if (p.isFlexible) {
        // Flexible: C1 containers in boughtQuantity
        const s = p.structure || {};
        const c2sPerC1 = parseInt(s.c2sPerC1) || 1;
        const c3sPerC2 = parseInt(s.c3sPerC2) || 1;

        let totalC1Bought = 0;
        products.forEach(item => {
            if (item.name && item.name.trim().toLowerCase() === baseName.toLowerCase() && item.isFlexible) {
                totalC1Bought += parseFloat(item.boughtQuantity) || 0;
            }
        });

        const pk = p.packTypes || {};
        const c1Title = (pk.c1 && pk.c1.title) || 'Container 1';
        const c2Title = (pk.c2 && pk.c2.title) || 'Container 2';
        const c3Title = (pk.c3 && pk.c3.title) || 'Container 3';

        const totalC3 = totalC1Bought * c2sPerC1 * c3sPerC2;

        let soldC1 = 0, soldC2 = 0, soldC3 = 0;
        sales.forEach(sale => {
            if (sale.item) {
                let saleBaseName = sale.item.trim();
                let saleVariant = '';
                const match = sale.item.match(/^(.*?)\s+\(([^)]+)\)$/);
                if (match) {
                    saleBaseName = match[1].trim();
                    saleVariant = match[2].trim();
                }

                if (saleBaseName.toLowerCase() === baseName.toLowerCase()) {
                    const q = parseFloat(sale.qty) || 0;
                    if (saleVariant === c3Title || saleVariant === 'Container 3') soldC3 += q;
                    else if (saleVariant === c2Title || saleVariant === 'Container 2') soldC2 += q;
                    else if (saleVariant === c1Title || saleVariant === 'Container 1') soldC1 += q;
                }
            }
        });

        const totalSoldInC3 = (soldC1 * c2sPerC1 * c3sPerC2) + (soldC2 * c3sPerC2) + soldC3;
        const remainingC3 = totalC3 - totalSoldInC3;

        let targetVariantType = variantType;
        if (!targetVariantType && extractedVariantTitle) {
            if (extractedVariantTitle === c1Title || extractedVariantTitle === 'Container 1') targetVariantType = 'c1';
            else if (extractedVariantTitle === c2Title || extractedVariantTitle === 'Container 2') targetVariantType = 'c2';
            else if (extractedVariantTitle === c3Title || extractedVariantTitle === 'Container 3') targetVariantType = 'c3';
        }

        if (targetVariantType === 'c1') return Math.floor(remainingC3 / (c2sPerC1 * c3sPerC2));
        if (targetVariantType === 'c2') return Math.floor(remainingC3 / c3sPerC2);
        return remainingC3; // c3 or unspecified

    } else if (p.isCustom) {
        // Custom: boughtQuantity × pieces = total units
        let totalBought = 0;
        products.forEach(item => {
            if (item.name && item.name.trim().toLowerCase() === baseName.toLowerCase() && item.isCustom) {
                totalBought += (parseFloat(item.boughtQuantity) || 0) * (parseInt(item.pieces) || 1);
            }
        });

        let totalSold = 0;
        sales.forEach(sale => {
            if (sale.item) {
                let saleBaseName = sale.item.trim();
                const match = sale.item.match(/^(.*?)\s+\(([^)]+)\)$/);
                if (match) {
                    saleBaseName = match[1].trim();
                }
                if (saleBaseName.toLowerCase() === baseName.toLowerCase()) {
                    totalSold += parseFloat(sale.qty) || 0;
                }
            }
        });

        return totalBought - totalSold;

    } else {
        // Default
        let totalBoughtPieces = 0;
        products.forEach(item => {
            if (item.name && item.name.trim().toLowerCase() === baseName.toLowerCase() && !item.isSpecial && !item.isFlexible && !item.isCustom) {
                totalBoughtPieces += (parseFloat(item.boughtQuantity) || 0) * (parseInt(item.pieces) || 1);
            }
        });
        
        let totalSoldPieces = 0;
        sales.forEach(sale => {
            if (sale.item) {
                let saleBaseName = sale.item.trim();
                let saleVariant = '';
                const match = sale.item.match(/^(.*?)\s+\(([^)]+)\)$/);
                if (match) {
                    saleBaseName = match[1].trim();
                    saleVariant = match[2].trim();
                }

                if (saleBaseName.toLowerCase() === baseName.toLowerCase()) {
                    const q = parseFloat(sale.qty) || 0;
                    if (saleVariant === (p.bulkUnit || 'Carton') || saleVariant === 'Carton') {
                        totalSoldPieces += q * (parseInt(p.pieces) || 1);
                    } else {
                        totalSoldPieces += q;
                    }
                }
            }
        });
        
        let rem = totalBoughtPieces - totalSoldPieces;
        let targetVariantType = variantType;
        if (!targetVariantType && extractedVariantTitle && (extractedVariantTitle === (p.bulkUnit || 'Carton') || extractedVariantTitle === 'Carton')) {
            targetVariantType = 'wholesale';
        }
        
        if (targetVariantType === 'wholesale') {
            return Math.floor(rem / (parseInt(p.pieces) || 1));
        }
        return rem;
    }
};

window.openImageViewer = function(src) {
    if (!src) return;
    let viewer = document.getElementById('globalImageViewer');
    if (!viewer) {
        viewer = document.createElement('div');
        viewer.id = 'globalImageViewer';
        viewer.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:9999999;display:none;align-items:center;justify-content:center;opacity:0;transition:opacity 0.2s;backdrop-filter:blur(4px);';
        
        const img = document.createElement('img');
        img.id = 'globalImageViewerImg';
        img.style.cssText = 'max-width:90%;max-height:90%;object-fit:contain;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,0.5);transform:scale(0.95);transition:transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);';
        
        const closeBtn = document.createElement('div');
        closeBtn.innerHTML = '✕';
        closeBtn.style.cssText = 'position:absolute;top:20px;right:20px;color:white;font-size:24px;cursor:pointer;width:40px;height:40px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.2);border-radius:50%;';
        
        viewer.appendChild(img);
        viewer.appendChild(closeBtn);
        document.body.appendChild(viewer);
        
        viewer.addEventListener('click', (e) => {
            if (e.target !== img) {
                viewer.style.opacity = '0';
                img.style.transform = 'scale(0.95)';
                setTimeout(() => viewer.style.display = 'none', 200);
            }
        });
    }
    
    const img = document.getElementById('globalImageViewerImg');
    img.src = src;
    viewer.style.display = 'flex';
    void viewer.offsetWidth; // trigger reflow
    viewer.style.opacity = '1';
    img.style.transform = 'scale(1)';
};

/**
 * Shop Branding Management
 */
window.updateShopBranding = function() {
    const isPageAdmin = window.location.pathname.includes('/admin');
    let shopName;
    
    if (isPageAdmin) {
        shopName = 'F T L';
    } else {
        shopName = localStorage.getItem('nd_shop_name') || 'nd shop';
    }
    
    // Update logo text
    const logoTexts = document.querySelectorAll('#shopLogoText, .shop-logo-text, .dynamic-shop-name');
    logoTexts.forEach(el => {
        el.textContent = shopName;
    });

    // Update document title if it matches known patterns
    if (document.title.toLowerCase().includes('nd shop')) {
        document.title = document.title.replace(/nd shop/gi, shopName);
    }
    if (document.title.toLowerCase().includes('nd-shop')) {
        document.title = document.title.replace(/nd-shop/gi, shopName);
    }

    // Replace "Nd shop" / "nd shop" / "nd-shop" in specific common UI areas if found in text nodes
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while(node = walk.nextNode()) {
        if (node.parentElement && (node.parentElement.tagName === 'H1' || node.parentElement.tagName === 'H2' || node.parentElement.tagName === 'H3' || node.parentElement.classList.contains('auth-title') || node.parentElement.classList.contains('comm-name'))) {
            if (node.nodeValue.includes('Nd shop')) {
                node.nodeValue = node.nodeValue.replace(/Nd shop/g, shopName);
            }
            if (node.nodeValue.includes('nd shop')) {
                node.nodeValue = node.nodeValue.replace(/nd shop/g, shopName);
            }
            if (node.nodeValue.includes('nd-shop')) {
                node.nodeValue = node.nodeValue.replace(/nd-shop/g, shopName);
            }
            if (node.nodeValue.includes('Nd-shop')) {
                node.nodeValue = node.nodeValue.replace(/Nd-shop/g, shopName);
            }
        }
    }
};

// Initial call on load
document.addEventListener('DOMContentLoaded', () => {
    window.updateShopBranding();
    window.updateShopContactPhone?.();
    
    // Listen for real-time changes
    if (window.realtimeSync) {
        window.realtimeSync.on('nd_shop_name', () => window.updateShopBranding());
        window.realtimeSync.on('nd_shop_owner_phone', () => window.updateShopContactPhone?.());
    }

    // Observe modal container for any dynamic content loads
    const modalObserver = new MutationObserver(() => {
        window.updateShopBranding();
    });
    const modalContainer = document.getElementById('modal-container');
    if (modalContainer) {
        modalObserver.observe(modalContainer, { childList: true, subtree: true });
    }
});

window.updateShopContactPhone = function() {
    const phone = localStorage.getItem('nd_shop_owner_phone') || '08109316532';
    const phoneEls = document.querySelectorAll('#shopPhoneNumber, .shop-phone-number');
    phoneEls.forEach(el => {
        el.textContent = phone;
    });
};

// Listen for storage updates — broadcast to cloud sync handlers via realtimeSync
window.addEventListener('local-storage-update', (e) => {
    const k = e.detail.key;
    if (k === 'nd_shop_name') window.updateShopBranding?.();
    if (k === 'nd_shop_owner_phone') window.updateShopContactPhone?.();
    if (window.realtimeSync && window.NdCloudSync && window.NdCloudSync.shouldSyncKey(k)) {
        window.realtimeSync.syncNow(k);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.realtimeSync) {
            window.realtimeSync.on('nd_shop_name', () => window.updateShopBranding?.());
            window.realtimeSync.on('nd_shop_owner_phone', () => window.updateShopContactPhone?.());
        }
    }, 600);
});

// ============================================================
// Global Camera Capture Utility
// ============================================================
window.openCameraCapture = function(onCapture) {

    // ── Fallback: no getUserMedia (HTTP context or old browser) ──────────────
    // Use <input capture="environment"> which opens the native camera app directly.
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = 'image/*';
        inp.setAttribute('capture', 'environment');
        inp.style.display = 'none';
        document.body.appendChild(inp);
        inp.addEventListener('change', () => {
            const file = inp.files && inp.files[0];
            if (!file) { inp.remove(); return; }
            const reader = new FileReader();
            reader.onload = (ev) => {
                inp.remove();
                if (typeof onCapture === 'function') onCapture(ev.target.result);
            };
            reader.readAsDataURL(file);
        });
        inp.click();
        // Safety cleanup after 60 s
        setTimeout(() => { try { inp.remove(); } catch(e){} }, 60000);
        return;
    }

    // ── Full in-app camera overlay (HTTPS / localhost) ────────────────────────
    const existing = document.getElementById('_ndCameraOverlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = '_ndCameraOverlay';
    overlay.style.cssText = [
        'position:fixed','top:0','left:0','width:100%','height:100%',
        'background:rgba(0,0,0,0.96)','z-index:999999',
        'display:flex','flex-direction:column','align-items:center',
        'justify-content:center','gap:18px','padding:20px','box-sizing:border-box'
    ].join(';');

    // Header
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;width:100%;max-width:520px;';
    header.innerHTML = '<span style="color:white;font-size:1rem;font-weight:700;display:flex;align-items:center;gap:8px;"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>Snap Product Photo</span>';
    const closeX = document.createElement('button');
    closeX.textContent = '✕';
    closeX.style.cssText = 'background:rgba(255,255,255,0.12);color:white;border:none;border-radius:50%;width:36px;height:36px;font-size:1.1rem;cursor:pointer;font-weight:700;';
    header.appendChild(closeX);

    // Video
    const video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.style.cssText = 'width:100%;max-width:520px;max-height:52vh;border-radius:14px;object-fit:cover;background:#111;';

    // Status label
    const label = document.createElement('p');
    label.style.cssText = 'color:#94a3b8;font-size:0.85rem;margin:0;text-align:center;';
    label.textContent = 'Initialising camera…';

    // Buttons row
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:14px;width:100%;max-width:520px;';

    const snapBtn = document.createElement('button');
    snapBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> Snap Photo';
    snapBtn.style.cssText = 'flex:1;padding:15px;background:#8b5cf6;color:white;border:none;border-radius:12px;font-size:1rem;font-weight:800;cursor:pointer;transition:opacity .2s;';
    snapBtn.disabled = true;
    snapBtn.style.opacity = '0.5';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'flex:0 0 100px;padding:15px;background:rgba(255,255,255,0.1);color:white;border:1px solid rgba(255,255,255,0.2);border-radius:12px;font-size:1rem;font-weight:700;cursor:pointer;';

    btnRow.appendChild(snapBtn);
    btnRow.appendChild(cancelBtn);

    overlay.appendChild(header);
    overlay.appendChild(video);
    overlay.appendChild(label);
    overlay.appendChild(btnRow);
    document.body.appendChild(overlay);

    let stream = null;

    function cleanup() {
        if (stream) stream.getTracks().forEach(t => t.stop());
        overlay.remove();
    }

    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } })
        .then(s => {
            stream = s;
            video.srcObject = s;
            video.onloadedmetadata = () => {
                label.textContent = 'Point camera at the product, then tap Snap Photo.';
                snapBtn.disabled = false;
                snapBtn.style.opacity = '1';
            };
        })
        .catch(err => {
            label.textContent = '⚠ Camera unavailable: ' + (err.message || err);
            label.style.color = '#f87171';
        });

    snapBtn.addEventListener('click', () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        const b64 = canvas.toDataURL('image/jpeg', 0.88);
        cleanup();
        if (typeof onCapture === 'function') onCapture(b64);
    });

    closeX.addEventListener('click', cleanup);
    cancelBtn.addEventListener('click', cleanup);

    // Close on overlay background tap
    overlay.addEventListener('click', e => { if (e.target === overlay) cleanup(); });
};



// Migration: Deduct payout from existing recorded sales prices if not a Reward Purchase
(function() {
    try {
        let historyFixed = localStorage.getItem('nd_sales_history_fixed_payout_v2');
        if (!historyFixed) {
            let sales = JSON.parse(localStorage.getItem('nd_sales_history') || '[]');
            let modified = false;
            sales.forEach(sale => {
                if (sale.type !== 'Payout Purchase' && Number(sale.payout) > 0) {
                    const parsedQty = parseFloat(sale.qty) || 1;
                    const parsedUnitPrice = Number(sale.unitPrice) || 0;
                    const expectedGross = parsedUnitPrice * parsedQty;
                    if (Number(sale.price) === expectedGross) {
                        sale.price = expectedGross - Number(sale.payout);
                        modified = true;
                    }
                }
            });
            if (modified) {
                localStorage.setItem('nd_sales_history', JSON.stringify(sales));
            }
            localStorage.setItem('nd_sales_history_fixed_payout_v2', 'true');
            console.log('Fixed existing sales payout prices.');
        }
    } catch(e) {
        console.error('Error fixing sales payouts', e);
    }
})();

// Migration: Ensure all sales have an explicit price property for consistency (fixes total calculation for flexible items)
(function() {
    try {
        let priceFixed = localStorage.getItem('nd_sales_history_fixed_price_v3');
        if (!priceFixed) {
            let sales = JSON.parse(localStorage.getItem('nd_sales_history') || '[]');
            let modified = false;
            sales.forEach(s => {
                if (s.price === undefined || s.price === null || s.price === '') {
                    s.price = s.isFlexible ? Number(s.unitPrice || 0) : (Number(s.unitPrice || 0) * Number(s.qty || 1));
                    modified = true;
                }
            });
            if (modified) {
                localStorage.setItem('nd_sales_history', JSON.stringify(sales));
            }
            localStorage.setItem('nd_sales_history_fixed_price_v3', 'true');
            console.log('Migrated sales history to include explicit total price.');
        }
    } catch (e) {
        console.error('Error fixing sales prices', e);
    }
})();

// --- Custom Units Persistence Fix ---
(function() {
    // 1. Detect when a new custom unit is created and save it to localStorage
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1 && node.classList.contains('custom-added-unit')) {
                    const unitName = node.getAttribute('data-value');
                    if (unitName) {
                        let savedUnits = JSON.parse(localStorage.getItem('nd_custom_units') || '[]');
                        if (!savedUnits.includes(unitName)) {
                            savedUnits.push(unitName);
                            localStorage.setItem('nd_custom_units', JSON.stringify(savedUnits));
                        }
                    }
                }
            });
            
            // Detect if a unit was removed
            mutation.removedNodes.forEach(node => {
                if (node.nodeType === 1 && node.classList.contains('custom-added-unit')) {
                    const unitName = node.getAttribute('data-value');
                    if (unitName) {
                        let savedUnits = JSON.parse(localStorage.getItem('nd_custom_units') || '[]');
                        savedUnits = savedUnits.filter(u => u !== unitName);
                        localStorage.setItem('nd_custom_units', JSON.stringify(savedUnits));
                    }
                }
            });
        });
    });

    // We observe the whole body since modals are injected dynamically
    document.addEventListener('DOMContentLoaded', () => {
        observer.observe(document.body, { childList: true, subtree: true });
    });
    // In case DOM is already loaded:
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // 2. Inject saved custom units when any dropdown menu is opened
    document.addEventListener('click', (e) => {
        const trigger = e.target.closest('.dropdown-trigger, .custom-dropdown-trigger, [id*="DropdownTrigger"]');
        if (!trigger) return;
        
        const wrapper = trigger.parentElement;
        const menu = wrapper.querySelector('.dropdown-menu, .custom-dropdown-menu, [id*="DropdownMenu"]');
        
        if (!menu) return;
        
        // Wait a tick for the menu to process its internal logic, then populate
        setTimeout(() => {
            const createBtn = menu.querySelector('.custom-unit-create-option');
            if (!createBtn) return; // Not a custom unit dropdown

            let savedUnits = JSON.parse(localStorage.getItem('nd_custom_units') || '[]');
            if (savedUnits.length === 0) return;

            // Get existing options to prevent duplicates
            const existingOptions = Array.from(menu.querySelectorAll('.custom-added-unit')).map(el => el.getAttribute('data-value'));

            savedUnits.forEach(unitName => {
                if (!existingOptions.includes(unitName)) {
                    // Create and inject the missing custom unit option
                    const newOpt = document.createElement('div');
                    newOpt.className = 'custom-dropdown-option custom-added-unit';
                    newOpt.setAttribute('data-value', unitName);
                    
                    const textSpan = document.createElement('span');
                    textSpan.textContent = unitName;
                    newOpt.appendChild(textSpan);
                    
                    const removeBtn = document.createElement('div');
                    removeBtn.className = 'remove-unit-btn custom-delete-btn';
                    removeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
                    
                    removeBtn.addEventListener('click', (ev) => {
                        ev.stopPropagation();
                        const isActive = newOpt.classList.contains('active');
                        newOpt.remove(); // MutationObserver handles removing from localStorage
                        
                        if (isActive) {
                            const firstOpt = menu.querySelector('.custom-dropdown-option');
                            if (firstOpt) {
                                firstOpt.classList.add('active');
                                const val = firstOpt.getAttribute('data-value');
                                const trigText = trigger.querySelector('.trigger-text');
                                if(trigText) trigText.textContent = val;
                                
                                // Best effort hidden input update
                                const hidden = wrapper.querySelector('input[type="hidden"]');
                                if (hidden) hidden.value = val;
                            }
                        }
                    });
                    
                    newOpt.appendChild(removeBtn);
                    menu.insertBefore(newOpt, createBtn);
                }
            });
        }, 10);
    });
})();
