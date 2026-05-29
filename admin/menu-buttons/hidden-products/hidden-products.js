function initHiddenProducts() {
    const page = document.getElementById('hiddenProductsPage');
    if (!page || page._initDone) return;
    page._initDone = true;

    const closeBtn = document.getElementById('closeHiddenProductsBtn');
    const listContainer = document.getElementById('hpItemsList');
    
    function renderHiddenProducts() {
        let products = JSON.parse(localStorage.getItem('nd_products_data') || '[]');
        
        // Items currently modified as "hidden"
        const hiddenItems = products.filter(p => !p.isDeleted && (p.isHidden || p.cleared));

        listContainer.innerHTML = '';

        if (hiddenItems.length === 0) {
            listContainer.innerHTML = `
                <div class="rb-empty">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:12px;">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                    <h3 style="color: #333; font-size: 1.1rem; font-weight: 700; margin-bottom: 6px;">No Hidden Products</h3>
                    <p style="color: #666; font-size: 0.9rem;">You haven't hidden any products from the shop layout.</p>
                </div>
            `;
            return;
        }

        hiddenItems.forEach(p => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'rb-item';

            const pDate = new Date(p.dateAdded);
            itemDiv.innerHTML = `
                <div style="display:flex; align-items:center; gap: 12px; flex: 1;">
                    ${p.imageData ? `<img src="${p.imageData}" style="width: 44px; height: 44px; border-radius: 8px; object-fit: cover; cursor: zoom-in; flex-shrink: 0;" onclick="event.stopPropagation(); if(typeof window.openImageViewer === 'function') window.openImageViewer('${p.imageData}')">` : `<div style="width: 44px; height: 44px; border-radius: 8px; background: #f1f5f9; display: flex; align-items: center; justify-content: center; color: #cbd5e1; flex-shrink: 0;"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></div>`}
                    <div>
                        <div class="rb-header">${p.name} </div>
                        <div class="rb-sub">Added: ${pDate.toLocaleDateString()}</div>
                    </div>
                </div>
                <div class="rb-actions">
                    <button class="rb-btn restore" data-id="${p.dateAdded}">Unhide</button>
                </div>
            `;
            listContainer.appendChild(itemDiv);
        });

        // Attach listeners
        document.querySelectorAll('#hpItemsList .rb-btn.restore').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetId = e.currentTarget.getAttribute('data-id');
                restoreHiddenItem(targetId);
            });
        });
    }

    function restoreHiddenItem(dateAddedKey) {
        let products = JSON.parse(localStorage.getItem('nd_products_data') || '[]');
        const pIndex = products.findIndex(p => p.dateAdded === dateAddedKey);
        if (pIndex > -1) {
            delete products[pIndex].isHidden;
            delete products[pIndex].cleared;
            localStorage.setItem('nd_products_data', JSON.stringify(products));
            
            // Sync the let-scoped adminProducts from localStorage
            if (typeof window.reloadAdminProducts === 'function') window.reloadAdminProducts();
            if (typeof renderProductsGlobal === 'function') renderProductsGlobal();
            renderHiddenProducts();
        }
    }

    renderHiddenProducts();
    closeBtn.addEventListener('click', closeHiddenProducts);
}

function openHiddenProducts() {
    fetch('menu-buttons/hidden-products/hidden-products.html')
        .then(res => res.text())
        .then(html => {
            document.getElementById('modal-container').innerHTML = html;
            const page = document.getElementById('hiddenProductsPage');
            if (page) {
                initHiddenProducts();
                page.style.display = 'flex';
                // Force reflow
                void page.offsetWidth;
                page.classList.add('show');
            }
        });
}

function closeHiddenProducts() {
    const page = document.getElementById('hiddenProductsPage');
    if (page) {
        page.classList.remove('show');
        setTimeout(() => {
            page.style.display = 'none';
            document.getElementById('modal-container').innerHTML = '';
        }, 300);
    }
    if (typeof window.clearAdminModalPersistence === 'function') {
        window.clearAdminModalPersistence();
    }
}
