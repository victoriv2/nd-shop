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
    return JSON.parse(localStorage.getItem('nd_user_cart_data') || '[]');
}

function saveCartData(cart) {
    localStorage.setItem('nd_user_cart_data', JSON.stringify(cart));
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

        const imgHtml = item.imageData 
            ? `<img src="${item.imageData}" alt="${item.name}" style="width: 44px; height: 44px; border-radius: 8px; object-fit: cover; cursor: zoom-in; flex-shrink: 0;" onclick="event.stopPropagation(); if(typeof window.openImageViewer === 'function') window.openImageViewer('${item.imageData}')">`
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
        cart[index].qty += delta;
        if (cart[index].qty <= 0) {
            cart.splice(index, 1);
        } else {
            cart[index].total = (cart[index].isCustom || cart[index].isFlexible) ? cart[index].unitPrice : cart[index].qty * cart[index].unitPrice;
            
            // Recalculate payout if needed
            const payoutEnabled = localStorage.getItem('nd_payout_enabled') === 'true';
            if (payoutEnabled) {
                let payoutRate = parseFloat(localStorage.getItem('nd_payout_rate') || 2);
                let isFlat = false;
                
                if (cart[index].isCustom && cart[index].customPayoutRate !== undefined) {
                    payoutRate = cart[index].customPayoutRate;
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
window.addToCart = function(productName, qty, unit, unitPrice, isCustom, specificPayoutRate, specificPayoutType, imageData, isFlexible, unitCost) {
    const cart = getCartData();
    
    // Check if item exists (if not custom/flexible, we can just bump qty)
    const existingIndex = cart.findIndex(item => item.name === productName && !isCustom && !isFlexible);
    
    if (existingIndex > -1) {
        cart[existingIndex].qty += qty;
        cart[existingIndex].total = cart[existingIndex].qty * cart[existingIndex].unitPrice;
        
        const payoutEnabled = localStorage.getItem('nd_payout_enabled') === 'true';
        if (payoutEnabled) {
            const payoutRate = parseFloat(localStorage.getItem('nd_payout_rate') || 2);
            const costVal = cart[existingIndex].unitCost !== undefined ? cart[existingIndex].unitCost : 0;
            const totalCost = cart[existingIndex].qty * costVal;
            const profit = cart[existingIndex].total - totalCost;
            cart[existingIndex].payout = cart[existingIndex].isFlexible ? 0 : Math.max(0, profit) * (payoutRate / 100);
        }
    } else {
        // Flexible: total is the entered price directly (not per-unit × qty)
        const total = (isCustom || isFlexible) ? unitPrice : qty * unitPrice;
        let payout = 0;
        const payoutEnabled = localStorage.getItem('nd_payout_enabled') === 'true';
        if (payoutEnabled) {
            let payoutRate = parseFloat(localStorage.getItem('nd_payout_rate') || 2);
            let isFlat = false;
            
            if (isCustom && specificPayoutRate !== undefined) {
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
            imageData: imageData,
            unitCost: unitCost || 0
        });
    }
    
    saveCartData(cart);
};

function handleCheckout() {
    const cart = getCartData();
    if (cart.length === 0) return;

    const btn = document.getElementById('checkoutBtn');
    const originalText = btn.textContent;
    btn.textContent = 'Processing...';
    btn.disabled = true;

    // Create Grouped Request Payload
    const requestID = 'ORD-' + Date.now().toString().slice(-4) + Math.floor(Math.random() * 90 + 10);
    const user = window.loggedInUser || { id: '00000ND', firstName: 'Customer', lastName: '' };
    
    let orderTotal = 0;
    let orderPayout = 0;
    
    cart.forEach(item => {
        orderTotal += item.total;
        orderPayout += item.payout;
    });

    const newRequest = {
        id: requestID,
        timestamp: new Date().toISOString(),
        status: 'Pending',
        isGroupedOrder: true,
        user: {
            id: user.id,
            name: (user.firstName + ' ' + (user.lastName || '')).trim(),
            avatar: user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'
        },
        orderTotal: orderTotal,
        orderPayout: orderPayout,
        items: cart // Array of all items
    };

    // Save to Requests DB
    const existingReqs = JSON.parse(localStorage.getItem('nd_requests_data') || '[]');
    existingReqs.unshift(newRequest);
    localStorage.setItem('nd_requests_data', JSON.stringify(existingReqs));

    // Simulated delay for premium feel
    setTimeout(() => {
        btn.textContent = 'Order Placed!';
        btn.style.backgroundColor = '#22c55e'; // Green success
        
        setTimeout(() => {
            // Clear cart
            localStorage.setItem('nd_user_cart_data', '[]');
            updateCartBadge();
            closeCart();
            
            // Reset button
            btn.textContent = originalText;
            btn.style.backgroundColor = '';
            btn.disabled = false;
        }, 1500);
    }, 800);
}
