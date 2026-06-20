let isOpeningDebtRecord = false;

// Track whether the debt record modal is currently open
let _debtRecordOpen = false;

// Called by global-fixes.js and realtimeSync when nd_debtor_notes changes
window.renderUserDebtNotes = function() {
    if (!_debtRecordOpen) return;
    actualRenderUserDebtNotes();
};

function openDebtRecordPage() {
    if (isOpeningDebtRecord) return;
    isOpeningDebtRecord = true;

    // Remove existing wrapper if any to avoid duplication
    const existing = document.getElementById('debtRecordWrapper');
    if (existing) existing.remove();

    fetch('menu-buttons/debt-record/debt-record.html?v=' + Date.now())
        .then(res => {
            if (!res.ok) throw new Error("Failed to load template");
            return res.text();
        })
        .then(html => {
            const container = document.getElementById('modal-container');
            if (!container) {
                isOpeningDebtRecord = false;
                return;
            }

            const wrapper = document.createElement('div');
            wrapper.id = 'debtRecordWrapper';
            wrapper.innerHTML = html;
            container.appendChild(wrapper);

            const modal = document.getElementById('debtRecordModal');
            if (modal) {
                // Step 1: force into render tree with display:flex
                modal.style.display = 'flex';
                // Step 2: trigger reflow so browser registers the element
                void modal.offsetHeight;
                // Step 3: now add .show to trigger CSS opacity/transform transition
                requestAnimationFrame(() => {
                    modal.classList.add('show');
                    document.body.classList.add('modal-open');
                    _debtRecordOpen = true;
                    try {
                        actualRenderUserDebtNotes();
                    } catch (e) {
                        console.error("Error rendering user debt notes:", e);
                    } finally {
                        isOpeningDebtRecord = false;
                    }
                });

                // Register real-time listener — debounced refresh whenever nd_debtor_notes changes
                if (window.realtimeSync) {
                    window.realtimeSync.on('nd_debtor_notes', () => {
                        if (_debtRecordOpen) {
                            try {
                                actualRenderUserDebtNotes();
                            } catch (e) {
                                console.error("Error in real-time sync renderUserDebtNotes:", e);
                            }
                        }
                    });
                }
            } else {
                isOpeningDebtRecord = false;
            }
        })
        .catch(err => {
            console.error("Error opening debt record page:", err);
            isOpeningDebtRecord = false;
        });
}

function closeDebtRecordPage() {
    _debtRecordOpen = false;
    const modal = document.getElementById('debtRecordModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            const wrapper = document.getElementById('debtRecordWrapper');
            if (wrapper) wrapper.remove();
            
            // Only remove modal-open if there are no other modals open
            if (!document.querySelector('.modal-overlay.show') && !document.querySelector('.menu-modal-overlay.show')) {
                document.body.classList.remove('modal-open');
            }
        }, 300);
    }
}

function actualRenderUserDebtNotes() {
    const list = document.getElementById('debtRecordList');
    if (!list) return;

    const currentUser = window.loggedInUser || JSON.parse(sessionStorage.getItem('nd_logged_in_user') || localStorage.getItem('nd_logged_in_user') || '{}');
    if (!currentUser || !currentUser.id) {
        list.innerHTML = `
            <div class="debt-record-empty">
                <h3 style="margin:0 0 5px 0; color:#475569; font-size:1.1rem;">Not Logged In</h3>
                <p style="margin:0; font-size:0.9rem;">Please log in to view your debt records.</p>
            </div>
        `;
        return;
    }

    let notes = [];
    try {
        notes = JSON.parse(localStorage.getItem('nd_debtor_notes') || '[]');
    } catch (e) {
        console.error("Error parsing debtor notes:", e);
    }

    // Filter notes linked to the current user (case-insensitive comparison)
    const userNotes = notes.filter(n => n.userId && currentUser.id && n.userId.toLowerCase() === currentUser.id.toLowerCase());

    // Sort: pinned first, then by updatedAt newest to oldest
    userNotes.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    if (userNotes.length === 0) {
        list.innerHTML = `
            <div class="debt-record-empty">
                <svg viewBox="0 0 24 24" width="60" height="60" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.5; margin-bottom:15px;"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                <h3 style="margin:0 0 5px 0; color:#475569; font-size:1.1rem;">No Record Found</h3>
                <p style="margin:0; font-size:0.9rem;">Your account currently has no associated debt records.</p>
            </div>
        `;
        return;
    }

    list.innerHTML = userNotes.map(note => {
        const pinIcon = note.isPinned ? `
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #8b5cf6; flex-shrink: 0;">
                <path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24v.26a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-.26a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>
            </svg>
        ` : '';
        
        const previewText = note.content ? note.content : '<em>No content...</em>';
        const dateObj = new Date(note.updatedAt);
        const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

        return `
            <div class="debt-record-card ${note.isPinned ? 'pinned' : ''}" onclick="viewDbUserNoteDetail('${note.id}')">
                <div class="debt-record-title">
                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">${note.title || 'Untitled Note'}</span>
                    ${pinIcon}
                </div>
                <div class="debt-record-preview">${previewText}</div>
                <div class="debt-record-footer">
                    <div class="debt-record-date">${dateStr}</div>
                </div>
            </div>
        `;
    }).join('');
}

function viewDbUserNoteDetail(noteId) {
    let notes = [];
    try {
        notes = JSON.parse(localStorage.getItem('nd_debtor_notes') || '[]');
    } catch (e) {}

    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const modal = document.getElementById('dbUserNoteDetailModal');
    const titleEl = document.getElementById('dbUserNoteDetailTitle');
    const dateEl = document.getElementById('dbUserNoteDetailDate');
    const contentEl = document.getElementById('dbUserNoteDetailContent');

    if (modal && titleEl && dateEl && contentEl) {
        titleEl.textContent = note.title || 'Untitled Note';
        
        const dateObj = new Date(note.updatedAt);
        const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        dateEl.textContent = "Last updated: " + dateStr;
        
        contentEl.innerHTML = note.content ? note.content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>") : '<em>No content...</em>';

        // Force display before triggering transition
        modal.style.display = 'flex';
        void modal.offsetHeight;
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });
    }
}

function closeDbUserNoteDetail() {
    const modal = document.getElementById('dbUserNoteDetailModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => { modal.style.display = 'none'; }, 300);
    }
}

// Also listen for nd_sync_complete (fires after full server pull) to refresh if modal is open
window.addEventListener('nd_sync_complete', () => {
    if (_debtRecordOpen) {
        try {
            actualRenderUserDebtNotes();
        } catch (e) {
            console.error("Error on sync complete rendering user debt notes:", e);
        }
    }
});

