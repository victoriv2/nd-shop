// --- Pin / Unpin ---
function _togglePin(msgId) {
    const messages = JSON.parse(localStorage.getItem('nd_messages') || '[]');
    const threadKey = getConversationKey();
    const idx = messages.findIndex(m => m.id === msgId);
    
    if (idx !== -1) {
        const currentlyPinned = messages[idx].isPinned;

        // Unpin ALL other messages in this thread
        messages.forEach(m => {
            if (m.threadKey === threadKey) m.isPinned = false;
        });

        // Toggle the target one
        messages[idx].isPinned = !currentlyPinned;
        
        localStorage.setItem('nd_messages', JSON.stringify(messages));
        renderMessages();
    }
}

// Re-purpose the 'Pinned panel' element as a sticky banner header
// since it naturally sits above the msgList in the DOM
function _renderPinnedMessage() {
    const panel = document.getElementById('msgPinnedPanel');
    if (!panel) return;

    const messages = JSON.parse(localStorage.getItem('nd_messages') || '[]');
    const threadKey = getConversationKey();
    const pinnedMsg = messages.find(m => m.threadKey === threadKey && m.isPinned);

    if (pinnedMsg) {
        let preview = pinnedMsg.content;
        if (pinnedMsg.type !== 'text') preview = '[' + pinnedMsg.type + ']';
        if (preview.length > 50) preview = preview.substring(0, 50) + '...';

        panel.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                <div style="display:flex; flex-direction:column; cursor:pointer;" onclick="const msg = document.querySelector('.msg-row[data-id=\\'${pinnedMsg.id}\\']'); if(msg) msg.scrollIntoView({behavior:'smooth', block:'center'});">
                    <span style="font-size:10px; font-weight:700; color:#8b5cf6; text-transform:uppercase; letter-spacing:0.5px;">Pinned Message</span>
                    <span style="font-size:13px; color:#334155;">${escapeHtml(preview)}</span>
                </div>
                <button onclick="_togglePin('${pinnedMsg.id}')" style="background:transparent; border:none; padding:8px; display:flex; align-items:center; justify-content:center; color:#94a3b8; cursor:pointer;">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
        `;
        panel.style.display = 'flex';
        panel.style.padding = '8px 15px';
        panel.style.background = '#f0f9ff';
        panel.style.borderBottom = '1px solid #e0f2fe';
        panel.style.position = 'sticky';
        panel.style.top = '0';
        panel.style.zIndex = '10';
        panel.style.height = 'auto'; // override CSS
        panel.classList.add('show');
    } else {
        panel.style.display = 'none';
        panel.classList.remove('show');
        panel.innerHTML = '';
    }
}

// --- Search ---
function _openSearch() {
    msgSearchActive = true;
    const bar = document.getElementById('msgSearchBar');
    const toggle = document.getElementById('msgSearchToggle');
    if (bar) {
        bar.classList.add('show');
        document.getElementById('msgSearchInput').focus();
    }
    if (toggle) toggle.classList.add('active');
}

function _closeSearch() {
    msgSearchActive = false;
    const bar = document.getElementById('msgSearchBar');
    const toggle = document.getElementById('msgSearchToggle');
    const input = document.getElementById('msgSearchInput');
    if (bar) bar.classList.remove('show');
    if (toggle) toggle.classList.remove('active');
    if (input) input.value = '';
    renderMessages();
}

function _jumpToNextSearchMatch() {
    const input = document.getElementById('msgSearchInput');
    if (input) input.blur(); // Just dismiss keyboard, since list is already filtered
}

// --- Pinned Panel ---
function _togglePinned() {
    if (msgPinnedOpen) {
        _closePinned();
    } else {
        _openPinned();
    }
}

function _openPinned() {
    msgPinnedOpen = true;
    const panel = document.getElementById('msgPinnedPanel');
    const toggle = document.getElementById('msgPinnedToggle');
    if (panel) panel.classList.add('show');
    if (toggle) toggle.classList.add('active');
    _renderPinnedList();
}

function _closePinned() {
    msgPinnedOpen = false;
    const panel = document.getElementById('msgPinnedPanel');
    const toggle = document.getElementById('msgPinnedToggle');
    if (panel) panel.classList.remove('show');
    if (toggle) toggle.classList.remove('active');
}

function _renderPinnedList() {
    const pinnedList = document.getElementById('msgPinnedList');
    if (!pinnedList) return;

    const messages = JSON.parse(localStorage.getItem('nd_messages') || '[]');
    const threadKey = getConversationKey();
    const myId = _getMyId();

    const pinned = messages.filter(m =>
        m.threadKey === threadKey && m.isPinned && !(m.deletedFor || []).includes(myId)
    );

    if (pinned.length === 0) {
        pinnedList.innerHTML = `<div style="text-align:center; padding:14px; color:#2c3e50; font-size:0.82rem; font-weight:500;">No pinned messages</div>`;
        return;
    }

    pinnedList.innerHTML = pinned.map(m => {
        const preview = m.type === 'text' ? escapeHtml(m.content) : `[${m.type}]`;
        return `<div class="msg-pinned-item" onclick="_scrollToMessage('${m.id}')">
            <svg class="msg-pinned-item-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z"></path></svg>
            <span class="msg-pinned-item-text">${preview}</span>
        </div>`;
    }).join('');
}

window._scrollToMessage = function(msgId) {
    const row = document.querySelector(`.msg-row[data-id="${msgId}"]`);
    if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const bubble = row.querySelector('.msg-bubble');
        
        let count = 0;
        bubble.style.transition = 'background 0.3s, transform 0.3s';
        
        const isMe = row.classList.contains('msg-me');
        const origBg = isMe ? '#8b5cf6' : '#ffffff';
        const origColor = isMe ? '#ffffff' : '#1e293b';

        const flashInterval = setInterval(() => {
            if (count % 2 === 0) {
                // Flash ON (Orange)
                bubble.style.background = '#8b5cf6';
                bubble.style.color = '#ffffff';
                bubble.style.transform = 'scale(1.02)';
            } else {
                // Flash OFF (Default)
                bubble.style.background = origBg;
                bubble.style.color = origColor;
                bubble.style.transform = 'scale(1)';
            }
            count++;
            
            if (count >= 6) { // 3 flashes = 6 toggles
                clearInterval(flashInterval);
                bubble.style.background = '';
                bubble.style.color = '';
                bubble.style.transform = '';
            }
        }, 350);
    }
};

// --- Real-time Polling ---
function _startPolling() {
    _stopPolling();
    msgPollingInterval = setInterval(() => {
        const messages = JSON.parse(localStorage.getItem('nd_messages') || '[]');
        const threadKey = getConversationKey();
        const count = messages.filter(m => m.threadKey === threadKey).length;
        if (count !== msgLastKnownCount) {
            msgLastKnownCount = count;
            _markMessagesAsRead();
            renderMessages();
        }
    }, 1000);
}

function _stopPolling() {
    if (msgPollingInterval) {
        clearInterval(msgPollingInterval);
        msgPollingInterval = null;
    }
}

// --- Mark As Read ---
function _markMessagesAsRead() {
    const messages = JSON.parse(localStorage.getItem('nd_messages') || '[]');
    const threadKey = getConversationKey();
    const myId = _getMyId();
    let changed = false;

    messages.forEach(m => {
        if (m.threadKey === threadKey && m.senderId !== myId) {
            if (!m.readBy) m.readBy = [];
            if (!m.readBy.includes(myId)) {
                m.readBy.push(myId);
                changed = true;
            }
        }
    });

    if (changed) {
        localStorage.setItem('nd_messages', JSON.stringify(messages));
    }
}

// --- Admin Inbox ---
function _buildAdminInbox() {
    const container = document.getElementById('admin-inbox-container');
    if (!container) return;

    container.innerHTML = `
        <div class="admin-inbox-page" id="adminInboxPage">
            <div class="inbox-header">
                <button class="inbox-back-btn" id="inboxBackBtn">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                </button>
                <div class="inbox-title-section">
                    <div class="inbox-title">Messages</div>
                    <div class="inbox-subtitle" id="inboxSubtitle">All conversations</div>
                </div>
            </div>
            <div class="inbox-search-wrapper" style="display:flex; gap:10px; align-items:center;">
                <input type="text" class="inbox-search-input" id="inboxSearchInput" placeholder="Search name or messages..." style="flex:1;" />
                <div class="sort-container" id="inboxFilterContainer">
                    <div class="sort-btn" id="inboxFilterToggle">
                        <span class="sort-text">Filter</span>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
                    </div>
                    <div class="sort-dropdown" id="inboxFilterDropdown">
                        <div class="sort-option active" data-filter="all">All Conversations<span class="sort-check"></span></div>
                        <div class="sort-option" data-filter="unread">Unread Only<span class="sort-check"></span></div>
                    </div>
                </div>
            </div>
            <div class="inbox-list" id="inboxList">
                <!-- Conversations rendered here -->
            </div>
        </div>
    `;

    const inboxPage = document.getElementById('adminInboxPage');
    inboxPage.classList.add('show');
    document.body.classList.add('modal-open');

    // Back
    document.getElementById('inboxBackBtn').addEventListener('click', () => {
        inboxPage.style.animation = 'none';
        inboxPage.style.transform = 'translateX(100%)';
        inboxPage.style.transition = 'transform 0.25s ease';
        setTimeout(() => {
            inboxPage.classList.remove('show');
            container.innerHTML = '';
            document.body.classList.remove('modal-open');
        }, 250);
    });

    // Search and Filter Events
    document.getElementById('inboxSearchInput').addEventListener('input', () => {
        _renderInboxList();
    });
    
    // Custom Filter Toggle
    const filterToggle = document.getElementById('inboxFilterToggle');
    const filterDropdown = document.getElementById('inboxFilterDropdown');
    const filterOptions = document.querySelectorAll('#inboxFilterDropdown .sort-option');

    if (filterToggle && filterDropdown) {
        filterToggle.addEventListener('click', (ev) => {
            ev.stopPropagation();
            filterDropdown.classList.toggle('show');
        });

        document.addEventListener('click', () => {
            filterDropdown.classList.remove('show');
        });

        filterOptions.forEach(opt => {
            opt.addEventListener('click', (ev) => {
                ev.stopPropagation();
                filterOptions.forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                filterDropdown.classList.remove('show');
                _renderInboxList();
            });
        });
    }

    _renderInboxList();

    // Poll inbox
    const inboxPoll = setInterval(() => {
        if (!document.getElementById('adminInboxPage')) {
            clearInterval(inboxPoll);
            return;
        }
        _renderInboxList();
    }, 2000);
}

function _renderInboxList() {
    const list = document.getElementById('inboxList');
    if (!list) return;

    const searchInput = document.getElementById('inboxSearchInput');
    const searchStr = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const filterActive = document.querySelector('#inboxFilterDropdown .sort-option.active');
    const filterVal = filterActive ? filterActive.getAttribute('data-filter') : 'all';

    const messages = JSON.parse(localStorage.getItem('nd_messages') || '[]');
    const users = JSON.parse(localStorage.getItem('nd_users') || '[]');
    const pinnedChats = JSON.parse(localStorage.getItem('nd_pinned_chats') || '[]');

    // Group conversations by thread
    const threads = {};
    messages.forEach(m => {
        if (!threads[m.threadKey]) threads[m.threadKey] = [];
        threads[m.threadKey].push(m);
    });

    // Build conversation list
    let conversations = [];
    Object.keys(threads).forEach(threadKey => {
        const threadMsgs = threads[threadKey].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        // Filter out messages deleted for admin
        const visibleMsgs = threadMsgs.filter(m => !(m.deletedFor || []).includes('ADMIN'));
        if (visibleMsgs.length === 0) return;
        const lastMsg = visibleMsgs[0];

        // Find the "other" user (non-admin)
        const otherIds = [...new Set(threadMsgs.map(m => m.senderId).concat(threadMsgs.map(m => m.receiverId)))].filter(id => id !== 'ADMIN');
        const otherId = otherIds[0] || 'Unknown';
        const user = users.find(u => u.id === otherId);
        const name = user ? user.name : otherId;

        // Unread count
        const unread = visibleMsgs.filter(m => m.senderId !== 'ADMIN' && !(m.readBy || []).includes('ADMIN')).length;

        // Check if thread contains search text
        let matchesSearch = true;
        let matchedMsgs = [];
        
        if (searchStr !== '') {
            const nameMatch = name.toLowerCase().includes(searchStr);
            matchedMsgs = visibleMsgs.filter(m => m.content && m.content.toLowerCase().includes(searchStr));
            matchesSearch = nameMatch || matchedMsgs.length > 0;
            
            if (matchesSearch) {
                if (matchedMsgs.length > 0) {
                    // Push a result for EACH individual matched message within this thread
                    matchedMsgs.forEach(m => {
                        let preview = m.content;
                        if (m.senderId === 'ADMIN') preview = 'You: ' + preview;
                        
                        conversations.push({
                            threadKey,
                            otherId,
                            name,
                            lastMsg: m,
                            preview,
                            unread: unread,
                            timestamp: new Date(m.timestamp),
                            isPinned: pinnedChats.includes(threadKey),
                            jumpId: m.id // Stores message ID to jump directly to it
                        });
                    });
                } else {
                    // It matched the user's name but no specific message matched
                    let preview = lastMsg.content || '';
                    if (lastMsg.type !== 'text') preview = `[${lastMsg.type}]`;
                    if (lastMsg.senderId === 'ADMIN') preview = 'You: ' + preview;

                    conversations.push({
                        threadKey,
                        otherId,
                        name,
                        lastMsg,
                        preview,
                        unread,
                        timestamp: new Date(lastMsg.timestamp),
                        isPinned: pinnedChats.includes(threadKey),
                        jumpId: null
                    });
                }
            }
        } else {
            let preview = lastMsg.content || '';
            if (lastMsg.type !== 'text') preview = `[${lastMsg.type}]`;
            if (lastMsg.senderId === 'ADMIN') preview = 'You: ' + preview;

            conversations.push({
                threadKey,
                otherId,
                name,
                lastMsg,
                preview,
                unread,
                timestamp: new Date(lastMsg.timestamp),
                isPinned: pinnedChats.includes(threadKey),
                jumpId: null
            });
        }
    });

    // Apply filter
    if (filterVal === 'unread') {
        conversations = conversations.filter(c => c.unread > 0);
    }

    // Sort: pinned first, then by latest message
    conversations.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.timestamp - a.timestamp;
    });

    // Update subtitle
    const subtitle = document.getElementById('inboxSubtitle');
    if (subtitle) {
        const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);
        subtitle.textContent = totalUnread > 0 ? `${totalUnread} unread message${totalUnread > 1 ? 's' : ''}` : 'All conversations';
    }

    if (conversations.length === 0) {
        list.innerHTML = `
            <div class="inbox-empty">
                <div class="inbox-empty-icon">
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke-width="1.5">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                    </svg>
                </div>
                <h3>No conversations</h3>
                <p>No messages match your search or filter.</p>
            </div>
        `;
        return;
    }

    list.innerHTML = conversations.map(c => {
        const timeStr = _formatInboxTime(c.timestamp);
        const initial = (c.name || '?').charAt(0).toUpperCase();
        const previewText = c.preview.length > 45 ? c.preview.substring(0, 45) + '...' : c.preview;
        const pinIcon = c.isPinned ? '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#8b5cf6" stroke-width="2.5" style="flex-shrink:0;"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z"></path></svg>' : '';

        const clickAction = c.jumpId 
            ? `openMessagingChat('${c.otherId}', '${escapeHtml(c.name).replace(/'/g, "\\'")}', '${c.jumpId}')` 
            : `openMessagingChat('${c.otherId}', '${escapeHtml(c.name).replace(/'/g, "\\'")}')`;

        return `
            <div class="inbox-conv-card ${c.unread > 0 ? 'has-unread' : ''} ${c.isPinned ? 'is-pinned' : ''}" data-threadkey="${c.threadKey}" data-otherid="${c.otherId}" data-name="${escapeHtml(c.name).replace(/"/g, '&quot;')}">
                <div class="inbox-conv-avatar" onclick="${clickAction}">${initial}</div>
                <div class="inbox-conv-info" onclick="${clickAction}" >
                    <div class="inbox-conv-name">
                        <span style="display:flex; align-items:center; gap:5px;">${pinIcon}${escapeHtml(c.name)}</span>
                    </div>
                    <div class="inbox-conv-preview">${escapeHtml(previewText)}</div>
                    <div class="inbox-conv-time-row">${timeStr}</div>
                </div>
                <div class="inbox-conv-right">
                    ${c.unread > 0 ? `<span class="inbox-conv-badge">${c.unread > 99 ? '99+' : c.unread}</span>` : ''}
                    <button class="inbox-conv-dots" onclick="event.stopPropagation(); _showInboxMenu(this, '${c.threadKey}', '${c.otherId}', '${escapeHtml(c.name).replace(/'/g, "\\'")}', ${c.isPinned})">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" stroke="none">
                            <circle cx="12" cy="5" r="2.5"></circle>
                            <circle cx="12" cy="12" r="2.5"></circle>
                            <circle cx="12" cy="19" r="2.5"></circle>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// --- Inbox 3-dot Menu ---
window._showInboxMenu = function(btn, threadKey, otherId, name, isPinned) {
    // Remove any existing menu
    const existing = document.querySelector('.inbox-dots-menu');
    if (existing) existing.remove();

    const pinnedChats = JSON.parse(localStorage.getItem('nd_pinned_chats') || '[]');
    const pinLabel = isPinned ? 'Unpin Chat' : 'Pin Chat';
    const pinDisabled = !isPinned && pinnedChats.length >= 5;

    const blockedUsers = JSON.parse(localStorage.getItem('nd_blocked_messaging_users') || '[]');
    const isBlockedUser = blockedUsers.includes(otherId);
    const blockLabel = isBlockedUser ? 'Unblock User' : 'Block Messaging';
    const blockColor = isBlockedUser ? '#059669' : '#ef4444';
    const blockIcon = isBlockedUser
        ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'
        : '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>';

    const menu = document.createElement('div');
    menu.className = 'inbox-dots-menu';
    menu.innerHTML = `
        <div class="inbox-dots-item" data-action="blockuser" style="color:${blockColor};">
            ${blockIcon}
            <span>${blockLabel}</span>
        </div>
        <div class="inbox-dots-item" data-action="pin" ${pinDisabled ? 'style="opacity:0.4; pointer-events:none;"' : ''}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z"></path></svg>
            <span>${pinLabel}${pinDisabled ? ' (max 5)' : ''}</span>
        </div>
        <div class="inbox-dots-item" data-action="clearme">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            <span>Clear for me</span>
        </div>
        <div class="inbox-dots-item" data-action="clearall" style="color:#ef4444;">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#ef4444" stroke-width="2"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            <span>Clear for everyone</span>
        </div>
        <div class="inbox-dots-separator"></div>
        <div class="inbox-dots-item" data-action="viewuser">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            <span>View User Info</span>
        </div>
    `;

    // Position near the button
    const rect = btn.getBoundingClientRect();
    const inboxPage = document.getElementById('adminInboxPage');
    const parentRect = inboxPage ? inboxPage.getBoundingClientRect() : { top: 0, left: 0 };
    menu.style.position = 'fixed';
    menu.style.top = Math.min(rect.bottom + 5, window.innerHeight - 220) + 'px';
    menu.style.right = (window.innerWidth - rect.right + 5) + 'px';
    document.body.appendChild(menu);

    setTimeout(() => menu.classList.add('show'), 10);

    // Actions
    menu.addEventListener('click', (ev) => {
        const item = ev.target.closest('.inbox-dots-item');
        if (!item) return;
        const action = item.getAttribute('data-action');
        menu.remove();

        if (action === 'blockuser') {
            let blockedList = JSON.parse(localStorage.getItem('nd_blocked_messaging_users') || '[]');
            const isUserBlocked = blockedList.includes(otherId);
            if (isUserBlocked) {
                blockedList = blockedList.filter(id => id !== otherId);
            } else {
                if (!blockedList.includes(otherId)) blockedList.push(otherId);
            }
            localStorage.setItem('nd_blocked_messaging_users', JSON.stringify(blockedList));
            _renderInboxList();
            if (typeof _showToast === 'function') {
                _showToast(isUserBlocked ? `${name} has been unblocked.` : `${name} has been blocked from sending messages.`);
            } else if (typeof showToast === 'function') {
                showToast(isUserBlocked ? `${name} has been unblocked.` : `${name} has been blocked from sending messages.`);
            }
        } else if (action === 'pin') {
            let pins = JSON.parse(localStorage.getItem('nd_pinned_chats') || '[]');
            if (isPinned) {
                pins = pins.filter(k => k !== threadKey);
            } else {
                if (pins.length < 5) pins.push(threadKey);
            }
            localStorage.setItem('nd_pinned_chats', JSON.stringify(pins));
            _renderInboxList();
        } else if (action === 'clearme') {
            _showInboxConfirm('Clear Chat', 'Clear this chat for yourself? Messages will still be visible to the user.', () => {
                const msgs = JSON.parse(localStorage.getItem('nd_messages') || '[]');
                msgs.forEach(m => {
                    if (m.threadKey === threadKey) {
                        if (!m.deletedFor) m.deletedFor = [];
                        if (!m.deletedFor.includes('ADMIN')) m.deletedFor.push('ADMIN');
                    }
                });
                localStorage.setItem('nd_messages', JSON.stringify(msgs));
                _renderInboxList();
                if (typeof msgCurrentChatId !== 'undefined' && typeof renderMessages === 'function') {
                    if (msgCurrentChatId === otherId || (msgCurrentChatId === 'ADMIN' && otherId === 'ADMIN')) {
                        renderMessages();
                    }
                }
            });
        } else if (action === 'clearall') {
            _showInboxConfirm('Clear for Everyone', 'Delete all messages in this chat for everyone? This cannot be undone.', () => {
                let msgs = JSON.parse(localStorage.getItem('nd_messages') || '[]');
                msgs = msgs.filter(m => m.threadKey !== threadKey);
                localStorage.setItem('nd_messages', JSON.stringify(msgs));
                _renderInboxList();
                if (typeof msgCurrentChatId !== 'undefined' && typeof renderMessages === 'function') {
                    if (msgCurrentChatId === otherId || (msgCurrentChatId === 'ADMIN' && otherId === 'ADMIN')) {
                        renderMessages();
                    }
                }
            });
        } else if (action === 'viewuser') {
            if (typeof openUserDetailsModal === 'function') {
                openUserDetailsModal(otherId);
            } else if (typeof openUserInfoModal === 'function') {
                openUserInfoModal(otherId);
            }
        }
    });

    // Dismiss
    setTimeout(() => {
        const dismiss = (ev) => {
            if (!menu.contains(ev.target)) {
                menu.remove();
                document.removeEventListener('click', dismiss);
                document.removeEventListener('touchstart', dismiss);
            }
        };
        document.addEventListener('click', dismiss);
        document.addEventListener('touchstart', dismiss);
    }, 10);
};

// --- Inbox Confirm Modal (for Clear Chat) ---
function _showInboxConfirm(title, text, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'msg-confirm-overlay';
    
    overlay.innerHTML = `
        <div class="msg-confirm-modal">
            <div class="msg-confirm-icon">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
            </div>
            <h3 class="msg-confirm-title">${title}</h3>
            <p class="msg-confirm-text">${text}</p>
            <div class="msg-confirm-actions">
                <button class="msg-confirm-btn msg-confirm-cancel" id="inboxConfirmCancel">Cancel</button>
                <button class="msg-confirm-btn msg-confirm-delete" id="inboxConfirmOk">Delete</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('show'), 10);

    const closeSelf = () => {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 250);
    };

    overlay.querySelector('#inboxConfirmCancel').onclick = closeSelf;
    overlay.querySelector('#inboxConfirmOk').onclick = () => {
        onConfirm();
        closeSelf();
    };
}

// --- Utility Functions ---

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function scrollToBottom() {
    const list = document.getElementById('msgList');
    if (list) {
        setTimeout(() => { list.scrollTop = list.scrollHeight; }, 50);
    }
}

function _formatDateKey(date) {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function _formatDateLabel(date) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (_formatDateKey(date) === _formatDateKey(today)) return 'Today';
    if (_formatDateKey(date) === _formatDateKey(yesterday)) return 'Yesterday';

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function _formatInboxTime(date) {
    const now = new Date();
    const diff = now - date;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Now';
    if (mins < 60) return mins + 'm';
    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours + 'h';
    const days = Math.floor(hours / 24);
    if (days < 7) return days + 'd';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function _highlightSearch(text, query) {
    if (!query) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    return text.replace(regex, '<span class="msg-highlight">$1</span>');
}

function _getFileExt(filename) {
    if (!filename) return 'FILE';
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop().toUpperCase() : 'FILE';
}

window.getUnreadMessageCount = function() {
    const messages = JSON.parse(localStorage.getItem('nd_messages') || '[]');
    const page = document.getElementById('messagingPage');
    const chatOpen = page && page.classList.contains('show');
    const activeThreadKey = chatOpen ? getConversationKey() : null;

    return messages.filter(m => {
        if (m.receiverId !== 'ADMIN') return false;
        if ((m.readBy || []).includes('ADMIN')) return false;
        if ((m.deletedFor || []).includes('ADMIN')) return false;
        if (chatOpen && m.threadKey === activeThreadKey) return false;
        return true;
    }).length;
};

// --- Badge Count (for user) ---
window.getUserUnreadCount = function() {
    const myId = _getMyId();
    const messages = JSON.parse(localStorage.getItem('nd_messages') || '[]');
    const page = document.getElementById('messagingPage');
    const chatOpen = page && page.classList.contains('show');
    const activeThreadKey = chatOpen ? getConversationKey() : null;

    return messages.filter(m => {
        if (m.receiverId !== myId) return false;
        if ((m.readBy || []).includes(myId)) return false;
        if ((m.deletedFor || []).includes(myId)) return false;
        if (chatOpen && m.threadKey === activeThreadKey) return false;
        return true;
    }).length;
};
















