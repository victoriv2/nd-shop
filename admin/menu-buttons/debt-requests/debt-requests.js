let currentDrFilter = 'All';

// ─── Styled Dialog Helpers ──────────────────────────────────────────────────

function drShowAlert({ title, message, type = 'info' }, callback) {
    const dialog = document.getElementById('drAlertDialog');
    const icon = document.getElementById('drAlertIcon');
    const titleEl = document.getElementById('drAlertTitle');
    const msgEl = document.getElementById('drAlertMessage');
    const okBtn = document.getElementById('drAlertOkBtn');

    const types = {
        success: { bg: 'linear-gradient(135deg,#10b981,#059669)', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" width="26" height="26"><polyline points="20 6 9 17 4 12"></polyline></svg>' },
        error:   { bg: 'linear-gradient(135deg,#ef4444,#dc2626)', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" width="26" height="26"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' },
        warning: { bg: 'linear-gradient(135deg,#f59e0b,#d97706)', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" width="26" height="26"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>' },
        info:    { bg: '#8b5cf6', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" width="26" height="26"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>' },
    };

    const cfg = types[type] || types.info;
    icon.style.background = cfg.bg;
    icon.innerHTML = cfg.svg;
    titleEl.textContent = title;
    msgEl.textContent = message;
    okBtn.style.background = cfg.bg;

    dialog.style.display = 'flex';
    const close = () => { dialog.style.display = 'none'; if (callback) callback(); };
    okBtn.onclick = close;
}

function drShowConfirm({ title, message, type = 'warning', okLabel = 'Confirm', cancelLabel = 'Cancel' }, callback) {
    const dialog = document.getElementById('drConfirmDialog');
    const icon = document.getElementById('drConfirmIcon');
    const titleEl = document.getElementById('drConfirmTitle');
    const msgEl = document.getElementById('drConfirmMessage');
    const okBtn = document.getElementById('drConfirmOkBtn');
    const cancelBtn = document.getElementById('drConfirmCancelBtn');

    const types = {
        danger:  { bg: 'linear-gradient(135deg,#ef4444,#dc2626)', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" width="26" height="26"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>' },
        warning: { bg: 'linear-gradient(135deg,#f59e0b,#d97706)', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" width="26" height="26"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>' },
    };

    const cfg = types[type] || types.warning;
    icon.style.background = cfg.bg;
    icon.innerHTML = cfg.svg;
    titleEl.textContent = title;
    msgEl.textContent = message;
    okBtn.textContent = okLabel;
    okBtn.style.background = cfg.bg;
    cancelBtn.textContent = cancelLabel;

    dialog.style.display = 'flex';
    okBtn.onclick = () => { dialog.style.display = 'none'; callback(true); };
    cancelBtn.onclick = () => { dialog.style.display = 'none'; callback(false); };
}

function drShowPrompt({ title, subtitle, aiHint, defaultValue = '' }, callback) {
    const dialog = document.getElementById('drPromptDialog');
    const titleEl = document.getElementById('drPromptTitle');
    const subtitleEl = document.getElementById('drPromptSubtitle');
    const hintEl = document.getElementById('drPromptAiHint');
    const input = document.getElementById('drPromptInput');
    const okBtn = document.getElementById('drPromptOkBtn');
    const cancelBtn = document.getElementById('drPromptCancelBtn');

    titleEl.textContent = title;
    subtitleEl.textContent = subtitle || '';
    hintEl.textContent = aiHint || '';
    hintEl.style.display = aiHint ? 'block' : 'none';
    input.value = defaultValue || '';

    dialog.style.display = 'flex';
    setTimeout(() => input.focus(), 100);

    okBtn.onclick = () => { dialog.style.display = 'none'; callback(input.value); };
    cancelBtn.onclick = () => { dialog.style.display = 'none'; callback(null); };
    input.onkeydown = (e) => { if (e.key === 'Enter') okBtn.click(); };
}

// ─── Modal Open/Close ───────────────────────────────────────────────────────

window.openDebtRequests = function() {
    if (window.showGlobalRefreshLoader) window.showGlobalRefreshLoader();

    fetch('menu-buttons/debt-requests/debt-requests.html')
        .then(res => {
            if(!res.ok) throw new Error("HTTP error " + res.status);
            return res.text();
        })
        .then(html => {
            const container = document.getElementById('modal-container');
            const existing = document.getElementById('debtRequestsWrapper');
            if (existing) existing.remove();

            const wrapper = document.createElement('div');
            wrapper.id = 'debtRequestsWrapper';
            wrapper.innerHTML = html;
            container.appendChild(wrapper);

            const overlay = document.getElementById('debtRequestsMainOverlay');
            if (overlay) {
                overlay.style.display = 'none';
                setTimeout(() => {
                    overlay.style.display = 'block';
                    overlay.classList.add('show');
                }, 10);
            }

            renderDebtRequests();
            document.body.classList.add('modal-open');
            if (window.hideGlobalRefreshLoader) setTimeout(window.hideGlobalRefreshLoader, 300);
        })
        .catch(err => {
            console.error("Error loading debt requests page: ", err);
            if (window.hideGlobalRefreshLoader) window.hideGlobalRefreshLoader();
        });
}

window.closeDebtRequests = function() {
    const overlay = document.getElementById('debtRequestsMainOverlay');
    if (overlay) {
        overlay.classList.remove('show');
        overlay.style.display = 'none';
    }
    const wrapper = document.getElementById('debtRequestsWrapper');
    setTimeout(() => {
        if (wrapper) wrapper.remove();
        if (!document.querySelector('.show, .open, .modal-open .modal-overlay.show')) {
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
        }
        
        // Let the global fixes interceptor know it can pop this safely if we closed manually
        // We'll simulate a pop if it was on top of the stack
        if (typeof history.state === 'object' && history.state && history.state.overlayIndex !== undefined) {
            history.back();
        }
    }, 100);
    if (typeof window.clearAdminModalPersistence === 'function') {
        window.clearAdminModalPersistence();
    }
}

window.setDrFilter = function(filterType, btnElement) {
    document.querySelectorAll('.request-filter-btn').forEach(btn => btn.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
    currentDrFilter = filterType;
    renderDebtRequests();
};

window.viewDrReceipt = function(base64Str) {
    const rm = document.getElementById('drReceiptModal');
    const rmImg = document.getElementById('drReceiptImgFull');
    if (rm && rmImg) {
        try { rmImg.src = decodeURIComponent(base64Str); } catch(e) { rmImg.src = base64Str; }
        rm.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
};

// ─── Render ─────────────────────────────────────────────────────────────────

window.renderDebtRequests = function() {
    const list = document.getElementById('drList');
    if (!list) return;

    let requests = JSON.parse(localStorage.getItem('nd_debt_requests') || '[]');
    
    // Update Badge
    const pendingCount = requests.filter(r => r.status === 'Pending').length;
    const pendingBtn = document.getElementById('drPendingFilterBtn');
    if (pendingBtn) {
        pendingBtn.innerHTML = pendingCount > 0
            ? `Pending<span class="pending-badge-creative">${pendingCount > 9 ? '9+' : pendingCount}</span>`
            : `Pending`;
    }

    requests.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (currentDrFilter !== 'All') {
        requests = requests.filter(r => r.status === currentDrFilter);
    }

    if (requests.length === 0) {
        list.innerHTML = `
            <div class="empty-requests">
                <div style="margin-bottom: 20px; opacity: 0.5;">
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                    </svg>
                </div>
                <h3>No Payments Found</h3>
            </div>
        `;
        return;
    }

    list.innerHTML = requests.map(r => {
        const dateObj = new Date(r.timestamp);
        const formattedDate = dateObj.toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true });
        
        const firstName = r.user && r.user.firstName ? r.user.firstName : '?';
        const fullName = r.user ? (r.user.name || `${firstName} ${r.user.middleName || ''} ${r.user.lastName || ''}`.replace(/\s+/g, ' ').trim()) : 'Unknown User';
        const avatarLetter = firstName.charAt(0).toUpperCase();
        const userId = r.userId || (r.user && r.user.id) || '';

        let actionButtons = '';
        if (r.status === 'Pending' || r.status === 'Declined') {
            actionButtons = `
                <div class="request-actions">
                    ${r.status === 'Pending' ? `<button class="action-btn btn-decline" onclick="declineDebtRequest('${r.id}')">Decline</button>` : ''}
                    <button class="action-btn btn-approve" onclick="approveDebtRequest('${r.id}')">Approve</button>
                </div>
            `;
        } else {
            if (r.aiAction && r.aiAction.includes('no debtor record found')) {
                actionButtons = `
                    <div style="text-align: center; color: #d97706; font-size: 0.9rem; font-weight: 600; padding: 10px 14px; background: #fffbeb; border-radius: 12px; margin-top: 15px; border: 1.5px solid #fde68a; display:flex; align-items:center; justify-content:center; gap:6px;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="15" height="15"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                        Record Not Found
                    </div>
                `;
            } else {
                actionButtons = `
                    <div style="text-align: center; color: #10b981; font-size: 0.9rem; font-weight: 600; padding: 10px 14px; background: #f0fdf4; border-radius: 12px; margin-top: 15px; border: 1.5px solid #bbf7d0; display:flex; align-items:center; justify-content:center; gap:6px;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="15" height="15"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Approved
                    </div>
                `;
            }
        }

        const aiStateClass = (r.aiAction && r.aiAction.includes('⚠️')) ? '#f59e0b' : (r.aiAction && r.aiAction.includes('Rejected') ? '#ef4444' : '#8b5cf6');

        return `
            <div class="request-card">
                <div class="request-header">
                    <span class="request-date" style="font-size: 0.8rem; font-weight: 700; color: #888; background: #f5f5f5; padding: 4px 10px; border-radius: 8px;">${formattedDate}</span>
                    <span class="request-status status-${r.status.toLowerCase()}">${r.status}</span>
                </div>
                
                <div class="user-profile-row">
                    <div class="user-avatar" 
                        onclick="if(typeof openUserDetailsModal==='function') openUserDetailsModal('${userId}')"
                        style="cursor:pointer; transition: transform 0.2s, box-shadow 0.2s;"
                        onmouseover="this.style.transform='scale(1.1)'; this.style.boxShadow='0 4px 14px rgba(27,38,59,0.35)'"
                        onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'"
                        title="View user profile"
                    >${avatarLetter}</div>
                    <div class="user-text-info">
                        <span class="user-name">${fullName}</span>
                        <span class="user-id" style="font-size: 0.78rem; color: #8b5cf6; font-weight:600; display:flex; align-items:center; gap:4px; cursor:pointer;" onclick="if(typeof openUserDetailsModal==='function') openUserDetailsModal('${userId}')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                            View Profile
                        </span>
                    </div>
                </div>

                <div class="product-order-box" style="padding: 15px; margin-bottom: 20px;">
                    <div class="order-name" style="margin-bottom: 10px;">Payment Receipt Details</div>
                    <img src="${r.imgBase64}" onclick="viewDrReceipt('${encodeURIComponent(r.imgBase64)}')" style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 10px; border: 1px solid #eee; cursor: pointer;">
                    ${r.note ? `<div style="font-size: 0.85rem; color: #555; font-style: italic; background: #f9f9f9; padding: 8px; border-radius: 6px; margin-bottom: 10px;">"${r.note}"</div>` : ''}
                    ${r.amount ? `<div style="font-size:1rem; font-weight:800; color:#10b981; margin-bottom:8px;">₦${Number(r.amount).toLocaleString()} detected by AI</div>` : ''}
                    <div style="font-size: 0.82rem; font-weight: 600; color: ${aiStateClass}; display: flex; align-items: flex-start; gap: 6px; padding-top: 10px; border-top: 1px dashed #e0e0e0; line-height:1.5;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="flex-shrink:0;margin-top:2px;"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
                        ${r.aiAction || 'No AI data'}
                    </div>
                </div>

                ${actionButtons}
            </div>
        `;
    }).join('');
};

// ─── Approve ────────────────────────────────────────────────────────────────

window.approveDebtRequest = function(requestId) {
    let requests = JSON.parse(localStorage.getItem('nd_debt_requests') || '[]');
    let reqIndex = requests.findIndex(r => r.id === requestId);
    if (reqIndex === -1) return;
    let req = requests[reqIndex];

    const aiHint = req.amount
        ? `AI extracted ₦${Number(req.amount).toLocaleString()} from this receipt. Enter this amount or type CLEAR to erase the full debt.`
        : `AI could not determine a specific amount. Enter the amount manually, or type CLEAR to erase the full debt.`;

    drShowPrompt({
        title: `Approve Payment`,
        subtitle: `For ${req.user ? req.user.firstName : 'User'}`,
        aiHint: aiHint,
        defaultValue: req.amount || ''
    }, (amountStr) => {
        if (amountStr === null) return; // Cancelled

        let isClear = amountStr.trim().toUpperCase() === 'CLEAR';
        let amountNum = parseFloat(amountStr);

        if (!isClear && (isNaN(amountNum) || amountNum <= 0)) {
            drShowAlert({ title: 'Invalid Amount', message: 'Please enter a valid number, or type CLEAR to erase the full debt.', type: 'error' });
            return;
        }

        let debtorNotes = JSON.parse(localStorage.getItem('nd_debtor_notes') || '[]');
        let dbUserNotesIdxs = [];
        let hasMixedIdsConflict = false;

        debtorNotes.forEach((n, idx) => {
            const reqIdLower = req.userId.toLowerCase();
            if (n.content.toLowerCase().includes(reqIdLower) || n.title.toLowerCase().includes(reqIdLower)) {
                // Check if this particular note contains multiple DIFFERENT user IDs
                const combinedText = n.title + " " + n.content;
                // Matches ND0001 or nd0001 or whatever the ID format is flexibly
                const idMatches = combinedText.match(/nd(?: SHOP)?\d+/gi) || [];
                // Normalize all found IDs to uppercase to distinct them accurately
                const uniqueIdsInNote = [...new Set(idMatches.map(id => id.toUpperCase()))];
                
                if (uniqueIdsInNote.length > 1) {
                    hasMixedIdsConflict = true;
                }
                dbUserNotesIdxs.push(idx);
            }
        });

        if (hasMixedIdsConflict) {
            drShowAlert({ 
                title: 'Mixed IDs Detected', 
                message: 'A debtor note related to this user contains multiple DIFFERENT user IDs. To prevent cross-deduction, you must manually resolve this note in the Debtor Book before approving.', 
                type: 'error' 
            });
            return;
        }

        if (isClear) {
            debtorNotes = debtorNotes.filter((_, idx) => !dbUserNotesIdxs.includes(idx));
            req.status = 'Approved';
            req.aiAction = 'Admin Manually Cleared total debt.';
            localStorage.setItem('nd_debtor_notes', JSON.stringify(debtorNotes));
            requests[reqIndex] = req;
            localStorage.setItem('nd_debt_requests', JSON.stringify(requests));
            if (typeof updateDebtRequestsBadge === 'function') updateDebtRequestsBadge();
            renderDebtRequests();
            drShowAlert({ title: 'Debt Cleared!', message: `The full debt for ${req.user ? req.user.firstName : 'this user'} has been deleted from the Debtor Book.`, type: 'success' });
        } else {
            if (dbUserNotesIdxs.length === 0) {
                drShowAlert({ title: 'Payment Declined', message: 'No matching entry was found in the Debtor Book for this user. The payment has been marked as DECLINED since no deduction could be made.', type: 'warning' });
                req.status = 'Declined';
                req.aiAction = `Payment Declined — No matching debtor record found to deduct from. Admin attempted ₦${amountNum}.`;
                requests[reqIndex] = req;
                localStorage.setItem('nd_debt_requests', JSON.stringify(requests));
                if (typeof updateDebtRequestsBadge === 'function') updateDebtRequestsBadge();
                renderDebtRequests();
                return;
            }

            let mainNoteIdx = dbUserNotesIdxs[0];
            let nContent = debtorNotes[mainNoteIdx].content;
            
            const totalMatch = nContent.match(/total[^\d]*([0-9,]+)/i);
            
            let parsedTotal = 0;
            let remaining = 0;
            let wasDeleted = false;
            
            if (totalMatch) {
                const originalTotalText = totalMatch[0]; 
                parsedTotal = parseFloat(totalMatch[1].replace(/,/g, ''));
                remaining = parsedTotal - amountNum;
                
                if (remaining <= 0) {
                    debtorNotes.splice(mainNoteIdx, 1);
                    wasDeleted = true;
                } else {
                    debtorNotes[mainNoteIdx].content = nContent.replace(originalTotalText, `total ${remaining.toLocaleString()} (Paid ₦${amountNum.toLocaleString()} out of ${parsedTotal.toLocaleString()})`);
                }
            } else {
                debtorNotes[mainNoteIdx].content = nContent + `\n\n[Payment Approved: ₦${amountNum.toLocaleString()} deducted by Admin]`;
            }

            req.status = 'Approved';
            req.aiAction = `Admin Approved ₦${amountNum.toLocaleString()} against Debt Record.`;
            localStorage.setItem('nd_debtor_notes', JSON.stringify(debtorNotes));
            requests[reqIndex] = req;
            localStorage.setItem('nd_debt_requests', JSON.stringify(requests));
            if (typeof updateDebtRequestsBadge === 'function') updateDebtRequestsBadge();
            renderDebtRequests();
            if (wasDeleted) {
                drShowAlert({ title: 'Payment Approved', message: `₦${amountNum.toLocaleString()} was successfully recorded and the Debtor Note was deleted because the debt is fully cleared.`, type: 'success' });
            } else {
                drShowAlert({ title: 'Payment Approved', message: `₦${amountNum.toLocaleString()} was successfully recorded and the Debtor Note was updated.`, type: 'success' });
            }
        }
    });
};

// ─── Decline ────────────────────────────────────────────────────────────────

window.declineDebtRequest = function(requestId) {
    drShowConfirm({
        title: 'Decline Payment?',
        message: 'Are you sure you want to decline this debt payment receipt? The user will need to resubmit.',
        type: 'danger',
        okLabel: 'Yes, Decline',
        cancelLabel: 'Cancel'
    }, (confirmed) => {
        if (!confirmed) return;

        let requests = JSON.parse(localStorage.getItem('nd_debt_requests') || '[]');
        let reqIndex = requests.findIndex(r => r.id === requestId);
        if (reqIndex === -1) return;

        requests[reqIndex].status = 'Declined';
        requests[reqIndex].aiAction += ' -> Admin Declined.';

        localStorage.setItem('nd_debt_requests', JSON.stringify(requests));
        if (typeof updateDebtRequestsBadge === 'function') updateDebtRequestsBadge();
        renderDebtRequests();
    });
};




