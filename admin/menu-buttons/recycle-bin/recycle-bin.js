function initRecycleBin() {
    const page = document.getElementById('recycleBinPage');
    if (!page || page._initDone) return;
    page._initDone = true;

    const closeBtn = document.getElementById('closeRecycleBinBtn');
    const listContainer = document.getElementById('rbItemsList');
    
    const gateway = document.getElementById('rbPasscodeGateway');
    const passInputs = document.querySelectorAll('.rb-pass-char');
    const errorMsg = document.getElementById('rbPassError');
    const PASSCODE = localStorage.getItem('nd_delete_pin') || '1234';
    
    function checkPasscode() {
        const entered = Array.from(passInputs).map(inp => inp.value).join('');
        if (entered.length === 4) {
            if (entered === PASSCODE) {
                errorMsg.textContent = '';
                gateway.style.display = 'none';
                renderRecycleBin();
            } else {
                errorMsg.textContent = 'Incorrect passcode';
                passInputs.forEach(i => i.value = '');
                passInputs[0].focus();
            }
        }
    }

    passInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            const val = e.target.value;
            if (!/^[0-9]$/.test(val)) {
                e.target.value = '';
                return;
            }
            if (index < passInputs.length - 1) passInputs[index + 1].focus();
            checkPasscode();
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                passInputs[index - 1].focus();
            }
        });
    });

    // Countdown Timer logic
    setInterval(() => {
        const now = new Date();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        const diff = endOfMonth - now;
        if (diff <= 0) return;
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const mins = Math.floor((diff / 1000 / 60) % 60);
        const secs = Math.floor((diff / 1000) % 60);
        
        const timerStr = `${days}d ${hours}h ${mins}m ${secs}s`;
        document.querySelectorAll('.rb-timer').forEach(el => el.textContent = timerStr);
    }, 1000);

    function renderRecycleBin() {
        let products = JSON.parse(localStorage.getItem('nd_products_data') || '[]');
        
        const now = new Date();
        const currentMonthIdx = now.getMonth();
        const currentYear = now.getFullYear();

        // 1. Wipe out permanently items from PREVIOUS months that were deleted
        let productsChanged = false;
        let newProducts = products.filter(p => {
            const pDate = new Date(p.dateAdded);
            if (p.isDeleted && (pDate.getMonth() !== currentMonthIdx || pDate.getFullYear() !== currentYear)) {
                productsChanged = true;
                return false; // permanently remove
            }
            return true;
        });

        if (productsChanged) {
            localStorage.setItem('nd_products_data', JSON.stringify(newProducts));
            products = newProducts;
            // Sync the let-scoped adminProducts from localStorage
            if (typeof window.reloadAdminProducts === 'function') window.reloadAdminProducts();
        }

        // 2. Display items currently in recycle bin (isDeleted or cleared)
        const deletedItems = products.filter(p => p.isDeleted || p.cleared);

        listContainer.innerHTML = '';

        if (deletedItems.length === 0) {
            listContainer.innerHTML = `
                <div class="rb-empty">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:12px;">
                        <path d="M19 6V20a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    <h3 style="color: #333; font-size: 1.1rem; font-weight: 700; margin-bottom: 6px;">Recycle Bin is Empty</h3>
                    <p style="color: #666; font-size: 0.9rem;">No products have been deleted or cleared recently.</p>
                </div>
            `;
            return;
        }

        deletedItems.forEach(p => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'rb-item';

            const pDate = new Date(p.dateAdded);
            const isSameMonth = pDate.getMonth() === currentMonthIdx && pDate.getFullYear() === currentYear;
            const statusLabel = p.isDeleted ? '<span style="color:#ef4444; font-size:10px; border:1px solid #fee2e2; padding:2px 6px; border-radius:4px; font-weight:700;">DELETED</span>' : '<span style="color:#f59e0b; font-size:10px; border:1px solid #fef3c7; padding:2px 6px; border-radius:4px; font-weight:700;">CLEARED</span>';
            const restoreBtnHtml = isSameMonth ? `<button class="rb-btn restore" data-id="${p.dateAdded}">Restore</button>` : `<span style="font-size: 0.8rem; color: #94a3b8; font-style: italic;">Locked</span>`;

            itemDiv.innerHTML = `
                <div style="display:flex; align-items:center; gap: 12px; flex: 1;">
                    ${p.imageData ? `<img src="${p.imageData}" style="width: 44px; height: 44px; border-radius: 8px; object-fit: cover; cursor: zoom-in; flex-shrink: 0;" onclick="event.stopPropagation(); if(typeof window.openImageViewer === 'function') window.openImageViewer('${p.imageData}')">` : `<div style="width: 44px; height: 44px; border-radius: 8px; background: #f1f5f9; display: flex; align-items: center; justify-content: center; color: #cbd5e1; flex-shrink: 0;"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></div>`}
                    <div>
                        <div class="rb-header">${p.name} ${statusLabel}</div>
                        <div class="rb-sub">Added: ${pDate.toLocaleDateString()}</div>
                        ${isSameMonth ? `<div style="margin-top:4px; font-size:0.8rem; font-weight:600; color:#ef4444; display:flex; align-items:center; gap:4px;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg><span class="rb-timer">Calculating...</span></div>` : ''}
                    </div>
                </div>
                <div class="rb-actions">
                    ${restoreBtnHtml}
                </div>
            `;
            listContainer.appendChild(itemDiv);
        });

        // Attach listeners
        document.querySelectorAll('.rb-btn.restore').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetId = e.currentTarget.getAttribute('data-id');
                restoreItem(targetId);
            });
        });
    }

    function restoreItem(dateAddedKey) {
        let products = JSON.parse(localStorage.getItem('nd_products_data') || '[]');
        const pIndex = products.findIndex(p => p.dateAdded === dateAddedKey);
        if (pIndex > -1) {
            delete products[pIndex].isDeleted;
            delete products[pIndex].cleared;
            localStorage.setItem('nd_products_data', JSON.stringify(products));
            
            // Sync the let-scoped adminProducts from localStorage
            if (typeof window.reloadAdminProducts === 'function') window.reloadAdminProducts();
            if (typeof renderProductsGlobal === 'function') renderProductsGlobal();
            renderRecycleBin();
        }
    }

    renderRecycleBin();

    closeBtn.addEventListener('click', closeRecycleBin);
}

function openRecycleBin() {
    fetch('menu-buttons/recycle-bin/recycle-bin.html')
        .then(res => res.text())
        .then(html => {
            document.getElementById('modal-container').innerHTML = html;
            const page = document.getElementById('recycleBinPage');
            if (page) {
                initRecycleBin();
                page.style.display = 'flex';
                // Force reflow
                void page.offsetWidth;
                page.classList.add('show');
            }
        });
}

function closeRecycleBin() {
    const page = document.getElementById('recycleBinPage');
    if (page) {
        page.classList.remove('show');
        setTimeout(() => {
            page.style.display = 'none';
            document.getElementById('modal-container').innerHTML = '';
        }, 300);
    }
}
