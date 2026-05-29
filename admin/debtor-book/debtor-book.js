let currentEditingNoteId = null;
let currentDbSort = 'newest';
let dbNoteHistory = [];
let dbNoteHistoryIndex = -1;
let isDbHistoryAction = false;
let dbSaveTimeout = null;

function initDebtorBook() {
    // If it's already injected, don't do it again
    if (document.getElementById('debtorBookPage')) {
        openDebtorBookPage();
        return;
    }

    fetch(`debtor-book/debtor-book.html?v=${Date.now()}`)
        .then(res => res.text())
        .then(html => {
            const container = document.createElement('div');
            container.id = 'debtor-book-container';
            container.innerHTML = html;
            document.body.appendChild(container);
            
            // Add click outside listener for sort dropdown
            document.addEventListener('click', (e) => {
                const sortDd = document.getElementById('dbSortDropdown');
                if (sortDd && sortDd.style.display === 'block') {
                    sortDd.style.display = 'none';
                }
                closeAllDbMenus();
            });

            openDebtorBookPage();
        })
        .catch(err => console.error("Error loading debtor book:", err));
}

function openDebtorBook() {
    initDebtorBook();
}

function openDebtorBookPage() {
    const page = document.getElementById('debtorBookPage');
    if (page) {
        page.classList.add('show');
        document.body.classList.add('modal-open');
        renderDebtorNotes();
    }
}

function closeDebtorBook() {
    const page = document.getElementById('debtorBookPage');
    if (page) {
        page.style.animation = 'none';
        page.style.transform = 'translateX(100%)';
        page.style.transition = 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
        setTimeout(() => {
            page.classList.remove('show');
            page.style.transform = '';
            page.style.transition = '';
            page.style.animation = '';
            document.body.classList.remove('modal-open');
        }, 250);
    }
}

function setDbSort(sortType, optElement) {
    document.querySelectorAll('.db-sort-option').forEach(o => o.classList.remove('active'));
    optElement.classList.add('active');
    currentDbSort = sortType;
    document.getElementById('dbSortDropdown').style.display = 'none';
    renderDebtorNotes();
}

function renderDebtorNotes() {
    const list = document.getElementById('dbNotesList');
    if (!list) return;

    let notes = JSON.parse(localStorage.getItem('nd_debtor_notes') || '[]');
    
    // Search
    const searchInput = document.getElementById('dbSearchInput');
    const query = searchInput ? searchInput.value.toLowerCase() : '';
    
    if (query) {
        notes = notes.filter(n => (n.title && n.title.toLowerCase().includes(query)) || (n.content && n.content.toLowerCase().includes(query)));
    }

    // Sort
    notes.sort((a, b) => {
        // Pinned always on top
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;

        if (currentDbSort === 'newest') {
            return new Date(b.updatedAt) - new Date(a.updatedAt);
        } else if (currentDbSort === 'oldest') {
            return new Date(a.updatedAt) - new Date(b.updatedAt);
        } else if (currentDbSort === 'az') {
            return (a.title || '').localeCompare(b.title || '');
        } else if (currentDbSort === 'za') {
            return (b.title || '').localeCompare(a.title || '');
        }
    });

    if (notes.length === 0) {
        list.innerHTML = `
            <div class="db-empty-state">
                <svg viewBox="0 0 24 24" width="60" height="60" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.5; margin-bottom:15px;"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                <h3 style="margin:0 0 5px 0; color:#475569; font-size:1.1rem;">No Notes Found</h3>
                <p style="margin:0; font-size:0.9rem;">Click the + button to add a new note.</p>
            </div>
        `;
        return;
    }

    list.innerHTML = notes.map(note => {
        const pinIcon = note.isPinned ? `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24v.26a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-.26a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>` : '';
        const previewText = note.content ? note.content : '<em>No content...</em>';
        const dateObj = new Date(note.updatedAt);
        const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

        return `
            <div class="db-note-card ${note.isPinned ? 'pinned' : ''}" onclick="openNoteEditor('${note.id}')">
                <div class="db-note-header">
                    <div class="db-note-title">${note.title || 'Untitled Note'}</div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        ${pinIcon}
                        <button class="db-dots-btn" onclick="event.preventDefault(); event.stopPropagation(); toggleDbMenu(event, '${note.id}')">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" stroke="none">
                                <circle cx="12" cy="5" r="2.5"></circle>
                                <circle cx="12" cy="12" r="2.5"></circle>
                                <circle cx="12" cy="19" r="2.5"></circle>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="db-note-preview">${previewText}</div>
                <div class="db-note-footer">
                    <div class="db-note-date">${dateStr}</div>
                </div>
                
                <div class="db-dots-menu" id="dbMenu-${note.id}">
                    <button class="db-dots-item" onclick="event.preventDefault(); event.stopPropagation(); openDbRenameModal('${note.id}', '${(note.title || '').replace(/'/g, "\\'")}')">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        Rename
                    </button>
                    <button class="db-dots-item" onclick="event.preventDefault(); event.stopPropagation(); togglePinNoteFromMenu('${note.id}')">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z"></path></svg>
                        ${note.isPinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button class="db-dots-item danger" onclick="event.preventDefault(); event.stopPropagation(); deleteNoteFromMenu('${note.id}')">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function toggleDbMenu(e, id) {
    e.preventDefault();
    e.stopPropagation();
    const menu = document.getElementById('dbMenu-' + id);
    const isShowing = menu.classList.contains('show');
    closeAllDbMenus();
    if (!isShowing) {
        menu.classList.add('show');
    }
}

function closeAllDbMenus() {
    document.querySelectorAll('.db-dots-menu').forEach(m => m.classList.remove('show'));
}

// 3-dot Menu Actions
function togglePinNoteFromMenu(id) {
    closeAllDbMenus();
    let notes = JSON.parse(localStorage.getItem('nd_debtor_notes') || '[]');
    const note = notes.find(n => n.id === id);
    if (note) {
        note.isPinned = !note.isPinned;
        localStorage.setItem('nd_debtor_notes', JSON.stringify(notes));
        renderDebtorNotes();
    }
}

let noteToDeleteId = null;

function deleteNoteFromMenu(id) {
    closeAllDbMenus();
    noteToDeleteId = id;
    let modal = document.getElementById('dbDeleteModal');
    
    // Fallback: If browser cached the old HTML, inject the modal dynamically
    if (!modal) {
        const modalHtml = `
        <div class="admin-modal-overlay" id="dbDeleteModal" style="z-index: 999999; display: none;">
            <div class="admin-modal-content" id="dbDeleteBox" style="max-width: 380px; text-align: center; padding: 25px; transform: scale(0.9); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
                <div style="width: 50px; height: 50px; background: #fee2e2; color: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px auto;">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                </div>
                <h3 style="margin-top: 0; color: #1e293b; font-size: 1.25rem;">Delete Note?</h3>
                <p style="font-size: 0.95rem; color: #64748b; margin: 15px 0 20px 0;">Are you sure you want to delete this note? This action cannot be undone.</p>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button onclick="closeDbDeleteModal()" class="admin-modern-btn" style="background:#f1f5f9; color:#475569; width: 45%; border: none;">Cancel</button>
                    <button onclick="confirmDbDelete()" class="admin-modern-btn danger" style="width: 55%; border: none;">Delete</button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        modal = document.getElementById('dbDeleteModal');
    }

    if (modal) {
        modal.style.display = 'flex';
        // Force reflow
        void modal.offsetWidth;
        setTimeout(() => {
            modal.classList.add('show');
            const box = document.getElementById('dbDeleteBox');
            if (box) box.style.transform = 'scale(1)';
        }, 10);
    }
}

function closeDbDeleteModal() {
    const modal = document.getElementById('dbDeleteModal');
    if (modal) {
        modal.classList.remove('show');
        const box = document.getElementById('dbDeleteBox');
        if (box) box.style.transform = 'scale(0.9)';
        setTimeout(() => {
            modal.style.display = 'none';
            noteToDeleteId = null;
        }, 300);
    }
}

function confirmDbDelete() {
    if (!noteToDeleteId) return;
    let notes = JSON.parse(localStorage.getItem('nd_debtor_notes') || '[]');
    notes = notes.filter(n => n.id !== noteToDeleteId);
    localStorage.setItem('nd_debtor_notes', JSON.stringify(notes));
    renderDebtorNotes();
    closeDbDeleteModal();
}

// Rename Modal
let noteToRenameId = null;

function openDbRenameModal(id, currentTitle) {
    closeAllDbMenus();
    noteToRenameId = id;
    const modal = document.getElementById('dbRenameModal');
    const input = document.getElementById('dbRenameInput');
    if (modal && input) {
        input.value = currentTitle;
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('show');
            const box = document.getElementById('dbRenameBox');
            if (box) box.style.transform = 'scale(1)';
        }, 10);
    }
}

function closeDbRenameModal() {
    const modal = document.getElementById('dbRenameModal');
    const input = document.getElementById('dbRenameInput');
    if (input) input.blur();
    if (modal) {
        modal.classList.remove('show');
        const box = document.getElementById('dbRenameBox');
        if (box) box.style.transform = 'scale(0.9)';
        setTimeout(() => {
            modal.style.display = 'none';
            noteToRenameId = null;
        }, 300);
    }
}

function confirmDbRename() {
    if (!noteToRenameId) return;
    const input = document.getElementById('dbRenameInput');
    const newTitle = input ? input.value : '';

    let notes = JSON.parse(localStorage.getItem('nd_debtor_notes') || '[]');
    const note = notes.find(n => n.id === noteToRenameId);
    if (note) {
        note.title = newTitle;
        note.updatedAt = new Date().toISOString();
        localStorage.setItem('nd_debtor_notes', JSON.stringify(notes));
        renderDebtorNotes();
    }
    closeDbRenameModal();
}

// Editor
function openNoteEditor(noteId = null) {
    const editorPage = document.getElementById('dbEditorPage');
    const titleInput = document.getElementById('dbNoteTitle');
    const contentInput = document.getElementById('dbNoteContent');

    let notes = JSON.parse(localStorage.getItem('nd_debtor_notes') || '[]');

    if (noteId) {
        // Edit existing
        currentEditingNoteId = noteId;
        const note = notes.find(n => n.id === noteId);
        if (note) {
            titleInput.value = note.title || '';
            contentInput.value = note.content || '';
        }
    } else {
        // Create new
        currentEditingNoteId = 'note-' + Date.now();
        titleInput.value = '';
        contentInput.value = '';
    }

    // Init history
    dbNoteHistory = [contentInput.value];
    dbNoteHistoryIndex = 0;
    isDbHistoryAction = false;

    if (editorPage) {
        editorPage.classList.add('show');
    }
}

function autoSaveCurrentNote() {
    if (!currentEditingNoteId) return;

    const title = document.getElementById('dbNoteTitle').value;
    const content = document.getElementById('dbNoteContent').value;

    // Don't save completely empty new notes
    if (!title.trim() && !content.trim()) {
        return;
    }

    let notes = JSON.parse(localStorage.getItem('nd_debtor_notes') || '[]');
    const existingIndex = notes.findIndex(n => n.id === currentEditingNoteId);

    if (existingIndex > -1) {
        notes[existingIndex].title = title;
        notes[existingIndex].content = content;
        notes[existingIndex].updatedAt = new Date().toISOString();
    } else {
        notes.push({
            id: currentEditingNoteId,
            title: title,
            content: content,
            isPinned: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    }

    localStorage.setItem('nd_debtor_notes', JSON.stringify(notes));
}

function closeNoteEditor() {
    const editorPage = document.getElementById('dbEditorPage');
    const titleInput = document.getElementById('dbNoteTitle');
    const contentInput = document.getElementById('dbNoteContent');
    if (titleInput) titleInput.blur();
    if (contentInput) contentInput.blur();
    
    // Auto-save before closing
    autoSaveCurrentNote();
    
    if (editorPage) {
        editorPage.style.animation = 'none';
        editorPage.style.transform = 'translateX(100%)';
        editorPage.style.transition = 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
        setTimeout(() => {
            editorPage.classList.remove('show');
            editorPage.style.transform = '';
            editorPage.style.transition = '';
            editorPage.style.animation = '';
            currentEditingNoteId = null;
            renderDebtorNotes();
        }, 250);
    }
}

function saveNoteAndClose() {
    autoSaveCurrentNote();
    closeNoteEditor();
}

// Undo / Redo
function handleDbNoteInput() {
    clearTimeout(dbSaveTimeout);
    dbSaveTimeout = setTimeout(() => {
        if (isDbHistoryAction) return;
        const text = document.getElementById('dbNoteContent').value;
        if (dbNoteHistory[dbNoteHistoryIndex] === text) return;
        
        dbNoteHistory = dbNoteHistory.slice(0, dbNoteHistoryIndex + 1);
        dbNoteHistory.push(text);
        dbNoteHistoryIndex++;
    }, 400); // 400ms debounce
}

function undoDbNote() {
    if (dbNoteHistoryIndex > 0) {
        dbNoteHistoryIndex--;
        isDbHistoryAction = true;
        document.getElementById('dbNoteContent').value = dbNoteHistory[dbNoteHistoryIndex];
        setTimeout(() => isDbHistoryAction = false, 50);
    }
}

function redoDbNote() {
    if (dbNoteHistoryIndex < dbNoteHistory.length - 1) {
        dbNoteHistoryIndex++;
        isDbHistoryAction = true;
        document.getElementById('dbNoteContent').value = dbNoteHistory[dbNoteHistoryIndex];
        setTimeout(() => isDbHistoryAction = false, 50);
    }
}

// AI Summarization
async function generateTotalFromAI() {
    const text = document.getElementById('dbNoteContent').value;
    if (!text.trim()) {
        showDbAiModal("Please write some notes first.", false);
        return;
    }

    if (window.showGlobalRefreshLoader) window.showGlobalRefreshLoader();

    // Use the existing AI key & model shared across the admin
    const apiKey = (typeof XAI_API_KEY !== 'undefined') ? XAI_API_KEY : localStorage.getItem('nd_xai_api_key');
    const model  = (typeof XAI_MODEL  !== 'undefined') ? XAI_MODEL  : 'grok-4-1-fast-reasoning';

    if (!apiKey) {
        // Fallback or warning if we want to enforce backend auth
    }

    try {
        const response = await fetch(`${window.API_BASE}/api/ai-chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('nd_token') || ''}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: "system",
                        content: `You are an AI assistant. Read the user's debtor note. Extract all owed money amounts and sum them up strictly correctly. Return ONLY a valid JSON object: {"total": number}. If no debt is found, return {"total": 0}.`
                    },
                    {
                        role: "user",
                        content: text
                    }
                ],
                response_format: { type: "json_object" },
                temperature: 0.1
            })
        });

        if (!response.ok) throw new Error("API failed");
        const data = await response.json();
        let result = JSON.parse(data.data.choices[0].message.content);

        if (window.hideGlobalRefreshLoader) window.hideGlobalRefreshLoader();

        if (result && result.total > 0) {
            document.getElementById('dbAiTotalText').innerText = "Total Calculated!";
            document.getElementById('dbAiInputArea').style.display = 'block';
            document.getElementById('dbAiEditInput').value = result.total;
            document.getElementById('dbAiActionButtons').style.display = 'flex';
            document.getElementById('dbAiCloseBtnArea').style.display = 'none';
            document.getElementById('dbAiTotalModal').classList.add('show');
        } else {
            showDbAiModal("No total amount found in the note.", false);
        }

    } catch(err) {
        if (window.hideGlobalRefreshLoader) window.hideGlobalRefreshLoader();
        console.error(err);
        showDbAiModal("Failed to connect to AI. Please check your internet or key.", false);
    }
}

function showDbAiModal(msg, isSuccess) {
    document.getElementById('dbAiTotalText').innerText = msg;
    document.getElementById('dbAiInputArea').style.display = 'none';
    document.getElementById('dbAiActionButtons').style.display = 'none';
    document.getElementById('dbAiCloseBtnArea').style.display = 'block';
    document.getElementById('dbAiTotalModal').classList.add('show');
}

function closeDbAiModal() {
    document.getElementById('dbAiTotalModal').classList.remove('show');
}

function acceptAiTotal() {
    const finalVal = document.getElementById('dbAiEditInput').value;
    if (!finalVal) return;
    
    const txtArea = document.getElementById('dbNoteContent');
    const noteText = txtArea.value.trim();
    const newText = noteText + `\n\nTotal Amount: ₦` + finalVal;
    txtArea.value = newText;
    
    // Save to history immediately
    isDbHistoryAction = false;
    dbNoteHistory = dbNoteHistory.slice(0, dbNoteHistoryIndex + 1);
    dbNoteHistory.push(newText);
    dbNoteHistoryIndex++;
    
    closeDbAiModal();
}

// Bank Account Settings Modal Logic
function openDbAccountSettings() {
    closeAllDbMenus();
    const modal = document.getElementById('dbAccountSettingsModal');
    if (modal) {
        document.getElementById('dbAccNumInput').value = localStorage.getItem('nd_bank_account_num') || '5470972344';
        document.getElementById('dbAccNameInput').value = localStorage.getItem('nd_bank_account_name') || 'Udeh Patience';
        document.getElementById('dbBankNameInput').value = localStorage.getItem('nd_bank_name') || 'Moniepoint Microfinance Bank';
        
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    }
}

function closeDbAccountSettings() {
    const modal = document.getElementById('dbAccountSettingsModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    }
}

function saveDbAccountSettings() {
    const num = document.getElementById('dbAccNumInput').value.trim();
    const name = document.getElementById('dbAccNameInput').value.trim();
    const bank = document.getElementById('dbBankNameInput').value.trim();
    
    if(!num || !name || !bank) {
        if(typeof customAlert === 'function') customAlert("Please fill in all bank details.");
        else alert("Please fill in all bank details.");
        return;
    }
    
    // Admin PIN authorization check using customPrompt
    if (typeof customPrompt === 'function') {
        customPrompt("Please enter the Admin Authorization PIN to save these changes:", 'password').then(pin => {
            if (pin === null) return; // Cancelled
            const requiredPin = localStorage.getItem('nd_delete_pin') || '1234';
            if (pin !== requiredPin) {
                customAlert("Incorrect PIN. Changes not saved.");
                return;
            }
            _finishSavingDbSettings(num, name, bank);
        });
    } else {
        const pin = prompt("Please enter the Admin Authorization PIN to save these changes:");
        if (pin === null) return;
        const requiredPin = localStorage.getItem('nd_delete_pin') || '1234';
        if (pin !== requiredPin) {
            alert("Incorrect PIN. Changes not saved.");
            return;
        }
        _finishSavingDbSettings(num, name, bank);
    }
}

function _finishSavingDbSettings(num, name, bank) {
    localStorage.setItem('nd_bank_account_num', num);
    localStorage.setItem('nd_bank_account_name', name);
    localStorage.setItem('nd_bank_name', bank);
    
    if(typeof customAlert === 'function') customAlert("Bank details saved successfully!");
    else alert("Bank details saved successfully!");
    
    closeDbAccountSettings();
}