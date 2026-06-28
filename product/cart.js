document.addEventListener('DOMContentLoaded', () => {
    initCartUI();
    updateCartBadge();
});

function initCartUI() {
    // Create Cart Overlay
    const overlay = document.createElement('div');
    overlay.id = 'cartOverlay';
    document.body.appendChild(overlay);

    // Create Cart Modal Container
    const cartContainer = document.createElement('div');
    cartContainer.id = 'cartModalContainer';
    cartContainer.innerHTML = `
        <div class="cart-header">
            <h2>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                Your Cart
            </h2>
            <button class="close-cart-btn" id="closeCartBtn">&times;</button>
        </div>
        <div class="cart-body" id="cartItemsList">
            <!-- Items injected here -->
        </div>
        <div class="cart-footer">
            <div class="cart-summary-line">
                <span>Items:</span>
                <span id="cartItemsCount">0</span>
            </div>
            <div class="cart-total-line">
                <span>Total:</span>
                <span id="cartTotalDisplay">₦0</span>
            </div>
            <button class="checkout-btn" id="checkoutBtn" onclick="handleCheckout()">Checkout</button>
        </div>
    `;
    document.body.appendChild(cartContainer);

    // Event Listeners
    const btnCart = document.getElementById('btnCart');
    const closeCartBtn = document.getElementById('closeCartBtn');

    if (btnCart) {
        btnCart.addEventListener('click', () => {
            renderCartItems();
            cartContainer.classList.add('show');
            overlay.classList.add('show');
            document.body.classList.add('modal-open');
        });
    }

    if (closeCartBtn) {
        closeCartBtn.addEventListener('click', closeCart);
    }

    overlay.addEventListener('click', closeCart);
}

function closeCart() {
    document.getElementById('cartModalContainer').classList.remove('show');
    document.getElementById('cartOverlay').classList.remove('show');
    document.body.classList.remove('modal-open');
}

function getCartData() {
    const allCarts = JSON.parse(localStorage.getItem('nd_user_cart_data') || '[]');
    const user = window.loggedInUser || JSON.parse(localStorage.getItem('nd_logged_in_user')) || { id: '00000ND' };
    return allCarts.filter(item => item.userId === user.id);
}

function saveCartData(cart) {
    const allCarts = JSON.parse(localStorage.getItem('nd_user_cart_data') || '[]');
    const user = window.loggedInUser || JSON.parse(localStorage.getItem('nd_logged_in_user')) || { id: '00000ND' };
    
    // Remove all items for this user from the master array
    const otherUsersCarts = allCarts.filter(item => item.userId !== user.id);
    
    // Ensure all new cart items have userId and id
    cart.forEach(item => {
        item.userId = user.id;
        if (!item.id) {
            item.id = 'cart_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
    });

    const mergedCarts = [...otherUsersCarts, ...cart];
    localStorage.setItem('nd_user_cart_data', JSON.stringify(mergedCarts));
    updateCartBadge();
    renderCartItems();
}

function updateCartBadge() {
    const badge = document.getElementById('cartBadge');
    const fabBadge = document.getElementById('fabCartBadge');
    const menuBadge = document.getElementById('menuCartBadge');
    
    const cart = getCartData();
    const count = cart.reduce((acc, item) => acc + item.qty, 0);
    
    if (count > 0) {
        if (badge) { badge.textContent = count > 99 ? '99+' : count; badge.style.opacity = '1'; }
        if (fabBadge) { fabBadge.textContent = count > 99 ? '99+' : count; fabBadge.style.opacity = '1'; }
        if (menuBadge) { menuBadge.textContent = count > 99 ? '99+' : count; menuBadge.style.opacity = '1'; }
    } else {
        if (badge) badge.style.opacity = '0';
        if (fabBadge) fabBadge.style.opacity = '0';
        if (menuBadge) menuBadge.style.opacity = '0';
    }
}

function renderCartItems() {
    const list = document.getElementById('cartItemsList');
    const countDisplay = document.getElementById('cartItemsCount');
    const totalDisplay = document.getElementById('cartTotalDisplay');
    const checkoutBtn = document.getElementById('checkoutBtn');
    
    if (!list) return;

    const cart = getCartData();
    
    if (cart.length === 0) {
        list.innerHTML = `
            <div class="empty-cart-message">
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                <h3>Your cart is empty</h3>
                <p>Add some items to get started!</p>
            </div>
        `;
        countDisplay.textContent = '0';
        totalDisplay.textContent = '₦0';
        checkoutBtn.disabled = true;
        return;
    }

    let html = '';
    let totalItems = 0;
    let orderTotal = 0;

    cart.forEach((item, index) => {
        totalItems += item.qty;
        orderTotal += item.total;

        let itemImgSrc = item.imageData;
        if (!itemImgSrc) {
            try {
                const dbProducts = JSON.parse(localStorage.getItem('nd_products_data') || '[]');
                const matched = dbProducts.find(p => (p.name === item.name || p.name === item.name.replace(/\s+\([^)]+\)$/, '')) && !p.isDeleted);
                if (matched && matched.imageData) itemImgSrc = matched.imageData;
            } catch(e) {}
        }

        const imgHtml = itemImgSrc 
            ? `<img src="${itemImgSrc}" alt="${item.name}" style="width: 44px; height: 44px; border-radius: 8px; object-fit: cover; cursor: zoom-in; flex-shrink: 0;" onclick="event.stopPropagation(); if(typeof window.openImageViewer === 'function') window.openImageViewer('${itemImgSrc}')">`
            : `<div style="width: 44px; height: 44px; border-radius: 8px; background: #f1f5f9; display: flex; align-items: center; justify-content: center; color: #cbd5e1; flex-shrink: 0;"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></div>`;

        html += `
            <div class="cart-item">
                <div class="cart-item-info" style="display:flex; align-items:center; gap: 12px; flex: 1; overflow: hidden;">
                    ${imgHtml}
                    <div>
                        <div class="cart-item-name">${item.name}</div>
                        <div class="cart-item-price">₦${Math.round(item.unitPrice).toLocaleString()} / ${item.unit}</div>
                    </div>
                </div>
                <div class="cart-item-controls">
                    <button class="cart-qty-btn" onclick="updateCartItemQty(${index}, -1)">-</button>
                    <span class="cart-qty-val">${item.qty}</span>
                    <button class="cart-qty-btn" onclick="updateCartItemQty(${index}, 1)">+</button>
                    <button class="remove-item-btn" onclick="removeCartItem(${index})">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                    </button>
                </div>
            </div>
        `;
    });

    list.innerHTML = html;
    countDisplay.textContent = totalItems;
    totalDisplay.textContent = '₦' + Math.round(orderTotal).toLocaleString();
    checkoutBtn.disabled = false;
}

function updateCartItemQty(index, delta) {
    const cart = getCartData();
    if (cart[index]) {
        if (delta > 0) {
            let maxStock = Infinity;
            if (typeof window.getRemainingProductStock === 'function') {
                let variantType = null;
                const unitStr = cart[index].unit || '';
                if (unitStr.toLowerCase().includes('carton') || unitStr.toLowerCase().includes('bag')) variantType = 'wholesale';
                else if (unitStr.toLowerCase().includes('container 1') || unitStr.toLowerCase().includes('c1')) variantType = 'c1';
                else if (unitStr.toLowerCase().includes('container 2') || unitStr.toLowerCase().includes('c2') || unitStr.toLowerCase().includes('custard')) variantType = 'c2';
                else if (unitStr.toLowerCase().includes('container 3') || unitStr.toLowerCase().includes('c3') || unitStr.toLowerCase().includes('cup')) variantType = 'c3';
                maxStock = window.getRemainingProductStock(cart[index].productId || cart[index].name, variantType);
            }
            if (cart[index].qty + delta > maxStock) {
                if (typeof window.showCustomAlert === 'function') {
                    window.showCustomAlert(`Only ${maxStock} remaining in stock!`, 'warning');
                } else {
                    alert(`Only ${maxStock} remaining in stock!`);
                }
                return;
            }
        }
        cart[index].qty += delta;
        if (cart[index].qty <= 0) {
            cart.splice(index, 1);
        } else {
            cart[index].total = cart[index].isFlexible ? cart[index].unitPrice : cart[index].qty * cart[index].unitPrice;
            
            // Recalculate payout if needed
            const payoutEnabled = localStorage.getItem('nd_payout_enabled') === 'true';
            if (payoutEnabled) {
                let payoutRate = parseFloat(localStorage.getItem('nd_payout_rate') || 2);
                let isFlat = false;
                
                if (cart[index].customPayoutRate !== undefined && cart[index].customPayoutRate !== null) {
                    payoutRate = parseFloat(cart[index].customPayoutRate);
                    isFlat = cart[index].customPayoutType === 'flat';
                }

                if (cart[index].isFlexible) {
                    cart[index].payout = 0;
                } else if (isFlat) {
                    cart[index].payout = cart[index].qty * payoutRate;
                } else {
                    const costVal = cart[index].unitCost !== undefined ? cart[index].unitCost : 0;
                    const totalCost = cart[index].qty * costVal;
                    const profit = cart[index].total - totalCost;
                    cart[index].payout = Math.max(0, profit) * (payoutRate / 100);
                }
            } else {
                cart[index].payout = 0;
            }
        }
        saveCartData(cart);
    }
}

function removeCartItem(index) {
    const cart = getCartData();
    if (cart[index]) {
        cart.splice(index, 1);
        saveCartData(cart);
    }
}

// Global hook for product-modal to call when adding to cart
window.addToCart = function(productName, qty, unit, unitPrice, isCustom, specificPayoutRate, specificPayoutType, imageData, isFlexible, unitCost, productId) {
    // --- NEW STRICT SECURITY VALIDATION FOR FLEXIBLE PRICING ---
    if (isFlexible) {
        try {
            const dbProducts = JSON.parse(localStorage.getItem('nd_products_data') || '[]');
            const latestProduct = dbProducts.find(p => (p.name === productName || p.name === productName.replace(/\s+\([^)]+\)$/, '')) && !p.isDeleted);
            if (latestProduct) {
                if (!latestProduct.allowUserFlexiblePricing) {
                    if (typeof window.showCustomAlert === 'function') {
                        window.showCustomAlert(`Flexible pricing is no longer available for this item.`, 'error');
                    } else {
                        alert(`Flexible pricing is no longer available for this item.`);
                    }
                    return false;
                }
            }
        } catch(e) {
            console.error('Validation error', e);
        }
    }
    // --- END SECURITY VALIDATION ---

    const cart = getCartData();
    
    // Check if item exists (if not custom/flexible, we can just bump qty)
    const existingIndex = cart.findIndex(item => item.name === productName && !isCustom && !isFlexible);

    let maxStock = Infinity;
    if (typeof window.getRemainingProductStock === 'function') {
        let variantType = null;
        if (unit) {
            if (unit.toLowerCase().includes('carton') || unit.toLowerCase().includes('bag')) variantType = 'wholesale';
            else if (unit.toLowerCase().includes('container 1') || unit.toLowerCase().includes('c1')) variantType = 'c1';
            else if (unit.toLowerCase().includes('container 2') || unit.toLowerCase().includes('c2') || unit.toLowerCase().includes('custard')) variantType = 'c2';
            else if (unit.toLowerCase().includes('container 3') || unit.toLowerCase().includes('c3') || unit.toLowerCase().includes('cup')) variantType = 'c3';
        }
        maxStock = window.getRemainingProductStock(productId || productName, variantType);
    }

    let currentQtyInCart = 0;
    cart.forEach(item => {
        let itemVarType = null;
        if (item.unit) {
            if (item.unit.toLowerCase().includes('carton') || item.unit.toLowerCase().includes('bag') || item.unit.toLowerCase().includes('wholesale')) itemVarType = 'wholesale';
            else if (item.unit.toLowerCase().includes('container 1') || item.unit.toLowerCase().includes('c1')) itemVarType = 'c1';
            else if (item.unit.toLowerCase().includes('container 2') || item.unit.toLowerCase().includes('c2') || item.unit.toLowerCase().includes('custard')) itemVarType = 'c2';
            else if (item.unit.toLowerCase().includes('container 3') || item.unit.toLowerCase().includes('c3') || item.unit.toLowerCase().includes('cup')) itemVarType = 'c3';
        }
        const cleanItemName = item.name.replace(/\s+\([^)]+\)$/, '');
        const cleanProdName = productName.replace(/\s+\([^)]+\)$/, '');
        if (cleanItemName === cleanProdName && itemVarType === variantType) {
            currentQtyInCart += Number(item.qty) || 0;
        }
    });
    if (currentQtyInCart + qty > maxStock) {
        if (typeof window.showCustomAlert === 'function') {
            window.showCustomAlert(`Only ${maxStock} remaining in stock!`, 'warning');
        } else {
            alert(`Only ${maxStock} remaining in stock!`);
        }
        return false;
    }

    
    if (existingIndex > -1) {
        cart[existingIndex].qty += qty;
        cart[existingIndex].total = cart[existingIndex].qty * cart[existingIndex].unitPrice;
        
        const payoutEnabled = localStorage.getItem('nd_payout_enabled') === 'true';
        if (payoutEnabled) {
            let payoutRate = parseFloat(localStorage.getItem('nd_payout_rate') || 2);
            let isFlat = false;
            if (cart[existingIndex].customPayoutRate !== undefined && cart[existingIndex].customPayoutRate !== null) {
                payoutRate = parseFloat(cart[existingIndex].customPayoutRate);
                isFlat = cart[existingIndex].customPayoutType === 'flat';
            }
            const costVal = cart[existingIndex].unitCost !== undefined ? cart[existingIndex].unitCost : 0;
            const totalCost = cart[existingIndex].qty * costVal;
            const profit = cart[existingIndex].total - totalCost;
            
            if (cart[existingIndex].isFlexible) {
                cart[existingIndex].payout = 0;
            } else if (isFlat) {
                cart[existingIndex].payout = cart[existingIndex].qty * payoutRate;
            } else {
                cart[existingIndex].payout = Math.max(0, profit) * (payoutRate / 100);
            }
        }
    } else {
        // Flexible: total is the entered price, do not multiply by qty
        const total = isFlexible ? unitPrice : qty * unitPrice;
        let payout = 0;
        const payoutEnabled = localStorage.getItem('nd_payout_enabled') === 'true';
        if (payoutEnabled) {
            let payoutRate = parseFloat(localStorage.getItem('nd_payout_rate') || 2);
            let isFlat = false;
            
            if (specificPayoutRate !== undefined && specificPayoutRate !== null) {
                payoutRate = specificPayoutRate;
                isFlat = specificPayoutType === 'flat';
            }

            if (isFlexible || isCustom) {
                payout = 0;
            } else if (isFlat) {
                payout = qty * payoutRate;
            } else {
                const costVal = unitCost !== undefined ? unitCost : 0;
                const totalCost = qty * costVal;
                const profit = total - totalCost;
                payout = Math.max(0, profit) * (payoutRate / 100);
            }
        }

        cart.push({
            name: productName,
            qty: qty,
            unit: unit,
            unitPrice: unitPrice,
            total: total,
            payout: payout,
            isCustom: isCustom,
            isFlexible: isFlexible || false,
            customPayoutRate: specificPayoutRate,
            customPayoutType: specificPayoutType,
            imageData: undefined,
            unitCost: unitCost || 0,
            productId: productId || ''
        });
    }
    
    saveCartData(cart);
    return true;
};

function handleCheckout() {
    try {
        const cart = getCartData();
        if (!cart || cart.length === 0) return;

        const btn = document.getElementById('checkoutBtn');
        const originalText = btn.textContent;
        btn.textContent = 'Processing...';
        btn.disabled = true;

        // Safely determine user
        let user = window.loggedInUser;
        if (!user) {
            try {
                const stored = localStorage.getItem('nd_logged_in_user');
                if (stored && stored !== 'undefined') user = JSON.parse(stored);
            } catch(e) {}
        }
        user = user || { id: '00000ND', name: 'Customer' };

        const userName = user.name || ((user.firstName || '') + ' ' + (user.lastName || '')).trim() || 'Customer';
        const userAvatar = userName.charAt(0).toUpperCase();

        const requestID = 'ORD-' + Date.now().toString().slice(-4) + Math.floor(Math.random() * 90 + 10);
        let orderTotal = 0;
        let orderPayout = 0;
        
        cart.forEach(item => {
            orderTotal += (parseFloat(item.total) || 0);
            orderPayout += (parseFloat(item.payout) || 0);
        });

        const newRequest = {
            id: requestID,
            timestamp: new Date().toISOString(),
            status: 'Pending',
            isGroupedOrder: true,
            user: {
                id: user.id || '00000ND',
                name: userName,
                avatar: userAvatar
            },
            orderTotal: orderTotal,
            orderPayout: orderPayout,
            items: cart.map(item => {
                const { imageData, ...cleanItem } = item;
                return cleanItem;
            })
        };

        let existingReqs = [];
        try {
            const stored = localStorage.getItem('nd_requests_data');
            if (stored && stored !== 'undefined') {
                existingReqs = JSON.parse(stored);
            }
        } catch(e) {}
        if (!Array.isArray(existingReqs)) existingReqs = [];
        
        // Clean past requests to strip out any remaining base64 images
        existingReqs = existingReqs.map(req => {
            if (req.items) {
                req.items = req.items.map(item => {
                    const { imageData, ...cleanItem } = item;
                    return cleanItem;
                });
            }
            if (req.product) {
                const { imageData, ...cleanProduct } = req.product;
                req.product = cleanProduct;
            }
            return req;
        });

        existingReqs.unshift(newRequest);
        localStorage.setItem('nd_requests_data', JSON.stringify(existingReqs));

        // Ensure sync happens if possible
        if (typeof handleMutation === 'function') {
            handleMutation('nd_requests_data', JSON.stringify(existingReqs));
        }

        setTimeout(() => {
            btn.textContent = 'Order Placed!';
            btn.style.backgroundColor = '#22c55e';
            
            setTimeout(() => {
                saveCartData([]);
                updateCartBadge();
                closeCart();
                
                btn.textContent = originalText;
                btn.style.backgroundColor = '';
                btn.disabled = false;
            }, 1500);
        }, 800);
    } catch (error) {
        console.error("Checkout failed:", error);
        alert("Failed to process checkout. Please try again.");
        const btn = document.getElementById('checkoutBtn');
        if (btn) {
            btn.textContent = 'Checkout';
            btn.disabled = false;
            btn.style.backgroundColor = '';
        }
    }
}

// Auto-update cart badge and UI when sync engine loads from Supabase
window.addEventListener('nd_sync_complete', () => {
    updateCartBadge();
    if (document.getElementById('cartModalContainer') && document.getElementById('cartModalContainer').classList.contains('show')) {
        renderCartItems();
    }
});

// Clean up bloated base64 imageData from localStorage to prevent QuotaExceededError
(function() {
    try {
        const cartKey = 'nd_user_cart_data';
        const cartStored = localStorage.getItem(cartKey);
        if (cartStored) {
            const cartList = JSON.parse(cartStored);
            if (Array.isArray(cartList)) {
                let cleaned = false;
                const cleanCart = cartList.map(item => {
                    if (item.imageData) {
                        cleaned = true;
                        const { imageData, ...rest } = item;
                        return rest;
                    }
                    return item;
                });
                if (cleaned) {
                    localStorage.setItem(cartKey, JSON.stringify(cleanCart));
                    console.log("[cleanup] Cleaned base64 imageData from nd_user_cart_data");
                }
            }
        }

        const requestsKey = 'nd_requests_data';
        const reqStored = localStorage.getItem(requestsKey);
        if (reqStored) {
            const reqList = JSON.parse(reqStored);
            if (Array.isArray(reqList)) {
                let cleaned = false;
                const cleanReqs = reqList.map(req => {
                    let reqCleaned = false;
                    if (req.items) {
                        req.items = req.items.map(item => {
                            if (item.imageData) {
                                reqCleaned = true;
                                const { imageData, ...rest } = item;
                                return rest;
                            }
                            return item;
                        });
                    }
                    if (req.product && req.product.imageData) {
                        reqCleaned = true;
                        const { imageData, ...rest } = req.product;
                        req.product = rest;
                    }
                    if (reqCleaned) cleaned = true;
                    return req;
                });
                if (cleaned) {
                    localStorage.setItem(requestsKey, JSON.stringify(cleanReqs));
                    console.log("[cleanup] Cleaned base64 imageData from nd_requests_data");
                }
            }
        }
    } catch (e) {
        console.warn("[cleanup] LocalStorage image cleanup failed:", e);
    }
})();
