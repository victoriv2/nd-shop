let currentRhFilter = 'All';
let currentRhSort = 'newest';

function openRequestHistoryModal() {
    fetch('menu-buttons/request-history/request-history.html')
        .then(res => res.text())
        .then(html => {
            const container = document.getElementById('modal-container');
            // We need to append so we don't overwrite other things if necessary, or just innerHTML. 
            // Better to create a wrapper.
            const wrapper = document.createElement('div');
            wrapper.id = 'requestHistoryWrapper';
            wrapper.innerHTML = html;
            container.appendChild(wrapper);

            const modal = document.getElementById('requestHistoryModal');
            setTimeout(() => {
                modal.classList.add('show');
                document.body.classList.add('modal-open');
                renderRequestHistory();
            }, 10);



            // Close dropdowns when clicking outside
            document.addEventListener('click', function closeDropdowns(e) {
                const sortDd = document.getElementById('rhSortDropdown');
                if (sortDd && sortDd.style.display === 'block') sortDd.style.display = 'none';
                
                const modalEl = document.getElementById('requestHistoryModal');
                if (!modalEl || !modalEl.classList.contains('show')) {
                    document.removeEventListener('click', closeDropdowns);
                }
            });
            

        });
}

function closeRequestHistoryModal() {
    const modal = document.getElementById('requestHistoryModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            const wrapper = document.getElementById('requestHistoryWrapper');
            if (wrapper) wrapper.remove();
            
            // Only remove modal-open if there are no other modals open
            if (!document.querySelector('.modal-overlay.show') && !document.querySelector('.menu-modal-overlay.show')) {
                document.body.classList.remove('modal-open');
            }
        }, 300);
    }
}

window.setRhSort = function(sortType, optElement) {
    document.querySelectorAll('.rh-sort-option').forEach(o => o.classList.remove('active'));
    optElement.classList.add('active');
    currentRhSort = sortType;
    document.getElementById('rhSortDropdown').style.display = 'none';
    renderRequestHistory();
};

window.setRhFilter = function(filterType, btnElement) {
    document.querySelectorAll('.rh-tab').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');
    currentRhFilter = filterType;
    renderRequestHistory();
};

window.renderRequestHistory = function() {
    const list = document.getElementById('rhList');
    if (!list) return;

    const user = window.loggedInUser || JSON.parse(localStorage.getItem('nd_logged_in_user')) || { id: '00000ND' };
    let allRequests = JSON.parse(localStorage.getItem('nd_requests_data') || '[]');
    
    // Filter to only this user's requests
    let myRequests = allRequests.filter(r => r.user && r.user.id === user.id);

    // Apply Search
    const searchInput = document.getElementById('rhSearchInput');
    const query = searchInput ? searchInput.value.toLowerCase() : '';
    if (query) {
        myRequests = myRequests.filter(r => {
            if (r.isGroupedOrder && r.items) {
                return r.items.some(i => i.name.toLowerCase().includes(query));
            }
            return r.product && r.product.name && r.product.name.toLowerCase().includes(query);
        });
    }

    // Apply Tabs Filter
    if (currentRhFilter !== 'All') {
        myRequests = myRequests.filter(r => r.status === currentRhFilter);
    }

    // Sort
    myRequests.sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return currentRhSort === 'newest' ? timeB - timeA : timeA - timeB;
    });

    if (myRequests.length === 0) {
        list.innerHTML = `
            <div style="text-align:center; padding: 40px 20px; color: #94a3b8;">
                <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 12px; opacity: 0.5;">
                    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
                <h4 style="margin: 0; color: #475569;">No requests found</h4>
                <p style="font-size: 0.85rem; margin-top: 4px;">You haven't made any requests matching this filter.</p>
            </div>
        `;
        return;
    }

    list.innerHTML = myRequests.map(r => {
        const dateObj = new Date(r.timestamp);
        const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' at ' + dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        const statusClass = r.status.toLowerCase();

        let detailsHtml = '';
        let totalCost = 0;
        let mainTitle = '';

        if (r.isGroupedOrder && r.items) {
            totalCost = r.orderTotal || 0;
            const itemNames = r.items.map(i => `
                <div style="font-size:0.85rem; color:#475569; padding-left:5px; display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                    ${i.imageData ? `<img src="${i.imageData}" style="width:24px;height:24px;border-radius:4px;object-fit:cover;cursor:zoom-in;" onclick="event.stopPropagation(); if(typeof window.openImageViewer === 'function') window.openImageViewer('${i.imageData}')">` : `<div style="width:24px;height:24px;background:#f1f5f9;border-radius:4px;flex-shrink:0;"></div>`}
                    <span>• ${i.name} ${i.isFlexible ? '<span style="font-size:0.75rem;background:#f0f4f8;color:#8b5cf6;padding:1px 5px;border-radius:4px;font-weight:700;">Flexible</span>' : `(x${i.qty})`}</span>
                </div>
            `).join('');
            mainTitle = `Order containing ${r.items.length} item${r.items.length > 1 ? 's' : ''}`;
            detailsHtml = `
                <div style="margin-top: 8px;">
                    ${itemNames}
                </div>
                <div class="rh-details" style="margin-top: 10px; justify-content: flex-end;">
                    <span class="rh-total">Total: ₦${totalCost.toLocaleString()}</span>
                </div>
            `;
        } else if (r.product) {
            totalCost = r.product.total || 0;
            const isFlexible = r.product.isFlexible || false;
            const unitPrice = isFlexible ? totalCost : (totalCost / (r.product.qty || 1));
            const eachText = isFlexible ? 'Flexible Price' : `₦${unitPrice.toLocaleString()} each`;
            mainTitle = `
                <div style="display:flex; align-items:center; gap:8px;">
                    ${r.product.imageData ? `<img src="${r.product.imageData}" style="width:32px;height:32px;border-radius:4px;object-fit:cover;cursor:zoom-in;" onclick="event.stopPropagation(); if(typeof window.openImageViewer === 'function') window.openImageViewer('${r.product.imageData}')">` : ``}
                    <span>${r.product.name}</span>
                </div>
            `;
            detailsHtml = `
                <div class="rh-details">
                    <span>${r.product.qty} ${r.product.unit} (${eachText})</span>
                    <span class="rh-total">Total: ₦${totalCost.toLocaleString()}</span>
                </div>
            `;
        }

        const rewardBadge = r.isRewardPurchase 
            ? `<span style="font-size:0.75rem; background:#f5f3ff; color:#7c3aed; border: 1px solid #ddd6fe; padding:2px 8px; border-radius:6px; font-weight:700; display:inline-flex; align-items:center; gap:4px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                Payout Order
               </span>`
            : '';

        return `
            <div class="rh-card">
                <div class="rh-card-header">
                    <span class="rh-date">${dateStr}</span>
                    <div style="display:flex; align-items:center; gap:8px;">
                        ${rewardBadge}
                        <span class="rh-status ${statusClass}">${r.status}</span>
                    </div>
                </div>
                <div class="rh-product-name">${mainTitle}</div>
                <div style="font-size: 0.85rem; color: #64748b; margin-bottom: 4px;">ID: ${r.id}</div>
                ${detailsHtml}
            </div>
        `;
    }).join('');
};

if (window.realtimeSync) {
    window.realtimeSync.on('nd_requests_data', () => {
        const modal = document.getElementById('requestHistoryModal');
        if (modal && modal.classList.contains('show') && typeof window.renderRequestHistory === 'function') {
            window.renderRequestHistory();
        }
    });
}
