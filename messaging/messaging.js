// ============================================
// nd shop MESSAGING SYSTEM - Full Featured Engine
// ============================================

// --- State ---
let msgCurrentChatId = null;
let msgMediaRecorder = null;
let msgAudioChunks = [];
let msgEditingId = null;
let msgRecordingTimer = null;
let msgRecordingSeconds = 0;
let msgSearchActive = false;
let msgPinnedOpen = false;
let msgPendingFile = null; // { file, dataUrl, type, name }
let msgPollingInterval = null;
let msgLastKnownCount = 0;

// --- Bootstrap: Inject HTML/CSS when loaded from main or admin ---
(function initMessagingSystem() {
    // Load CSS if not already present
    const basePath = getMessagingBasePath();
    if (!document.querySelector('link[href*="messaging/messaging.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = basePath + 'messaging/messaging.css';
        document.head.appendChild(link);
    }

    // Create chat container
    if (!document.getElementById('messaging-page-container')) {
        const container = document.createElement('div');
        container.id = 'messaging-page-container';
        document.body.appendChild(container);

        fetch(basePath + 'messaging/messaging.html')
            .then(res => res.text())
            .then(html => {
                container.innerHTML = html;
                initMessagingLogic();
            })
            .catch(err => console.warn('Messaging module failed to load', err));
    }

    // Create admin inbox container
    if (!document.getElementById('admin-inbox-container')) {
        const inboxContainer = document.createElement('div');
        inboxContainer.id = 'admin-inbox-container';
        document.body.appendChild(inboxContainer);
    }
})();

function getMessagingBasePath() {
    // Detect if we're inside /admin/ 
    const path = window.location.pathname;
    if (path.includes('/admin/') || path.includes('/admin\\')) {
        return '../';
    }
    return '';
}

// --- Global API Functions ---
window.openMessagingChat = function(targetId, targetName, jumpMsgId = null) {
    const waitForReady = setInterval(() => {
        if (document.getElementById('messagingPage')) {
            clearInterval(waitForReady);
            _realOpenChat(targetId, targetName, jumpMsgId);
        }
    }, 100);
};

window.openAdminInbox = function() {
    _buildAdminInbox();
};

function _realOpenChat(targetId, targetName, jumpMsgId = null) {
    msgCurrentChatId = targetId;
    const page = document.getElementById('messagingPage');
    const nameEl = document.getElementById('msgHeaderName');
    const statusEl = document.getElementById('msgHeaderStatus');

    if (nameEl) nameEl.textContent = targetName || 'Chat';
    if (statusEl) {
        if (targetId === 'ADMIN') {
            statusEl.textContent = 'Support Team';
            statusEl.style.color = '#6366f1';
        } else {
            statusEl.textContent = 'Customer';
            statusEl.style.color = '#6366f1';
        }
    }

    const adminMenuWrapper = document.getElementById('msgAdminMenuWrapper');
    if (adminMenuWrapper) {
        if (_getMyId() === 'ADMIN' && targetId !== 'ADMIN') {
            adminMenuWrapper.style.display = 'block';
        } else {
            adminMenuWrapper.style.display = 'none';
        }
    }

    if (page) {
        page.classList.add('show');
        document.body.classList.add('modal-open');
        
        // Mark messages as read
        _markMessagesAsRead();
        
        renderMessages();

        if (jumpMsgId) {
            setTimeout(() => _scrollToMessage(jumpMsgId), 300);
        } else {
            scrollToBottom();
        }

        // Start real-time polling
        _startPolling();
    }
}

function _closeChat() {
    const page = document.getElementById('messagingPage');
    const input = document.getElementById('msgTextInput');
    const searchInput = document.getElementById('msgSearchInput');
    if (input) input.blur();
    if (searchInput) searchInput.blur();
    if (page) {
        page.style.animation = 'none';
        page.style.transform = 'translateX(100%)';
        page.style.transition = 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
        
        setTimeout(() => {
            page.classList.remove('show');
            page.style.animation = '';
            page.style.transform = '';
            page.style.transition = '';
            document.body.classList.remove('modal-open');
        }, 250);
    }

    // Close search and pinned panels
    _closeSearch();
    _closePinned();
    _cancelEditing();

    // Stop recording if active
    if (msgMediaRecorder && msgMediaRecorder.state !== 'inactive') {
        msgMediaRecorder.stop();
    }

    // Stop polling
    _stopPolling();
}

// --- Init all event listeners ---
function initMessagingLogic() {
    const page = document.getElementById('messagingPage');
    const backBtn = document.getElementById('msgBackBtn');
    const sendBtn = document.getElementById('msgSendBtn');
    const input = document.getElementById('msgTextInput');
    const attachBtn = document.getElementById('msgAttachBtn');
    const micBtn = document.getElementById('msgMicBtn');
    const fileInput = document.getElementById('msgFileInput');
    const searchToggle = document.getElementById('msgSearchToggle');
    const searchClose = document.getElementById('msgSearchClose');
    const searchInput = document.getElementById('msgSearchInput');
    const pinnedToggle = document.getElementById('msgPinnedToggle');
    const pinnedClose = document.getElementById('msgPinnedClose');
    const replyCancel = document.getElementById('msgReplyCancel');
    const scrollBottomBtn = document.getElementById('msgScrollBottom');
    const msgList = document.getElementById('msgList');

    // Back / Close
    if (backBtn) backBtn.addEventListener('click', _closeChat);

    // Send
    if (sendBtn && input) {
        sendBtn.addEventListener('click', () => _handleSend(input));
    }

    // Auto-resize textarea
    if (input) {
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 120) + 'px';
        });
    }

    // Attachments
    const attachMenu = document.getElementById('msgAttachMenu');
    const cameraInput = document.getElementById('msgCameraInput');
    
    if (attachBtn && attachMenu) {
        attachBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            attachMenu.classList.toggle('show');
        });
        
        // Hide when clicking outside
        document.addEventListener('click', (e) => {
            if (!attachMenu.contains(e.target) && e.target !== attachBtn && !attachBtn.contains(e.target)) {
                attachMenu.classList.remove('show');
            }
        });
        
        document.querySelectorAll('.msg-attach-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const type = item.getAttribute('data-type');
                attachMenu.classList.remove('show');
                
                if (type === 'camera') {
                    if (cameraInput) cameraInput.click();
                } else if (type === 'gallery') {
                    if (fileInput) {
                        fileInput.setAttribute('accept', 'image/*,video/*');
                        fileInput.click();
                    }
                } else if (type === 'audio') {
                    if (fileInput) {
                        fileInput.setAttribute('accept', '.mp3,.wav,.m4a,.aac,.ogg,.flac,audio/mpeg,audio/wav,audio/mp4,audio/ogg');
                        fileInput.click();
                    }
                } else if (type === 'files') {
                    if (fileInput) {
                        fileInput.setAttribute('accept', '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt');
                        fileInput.click();
                    }
                }
            });
        });
        
        if (fileInput) fileInput.addEventListener('change', _handleFileUpload);
        if (cameraInput) cameraInput.addEventListener('change', _handleFileUpload);
    }

    // Voice Recording
    if (micBtn) {
        micBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (msgMediaRecorder && (msgMediaRecorder.state === 'recording' || msgMediaRecorder.state === 'paused')) {
                _stopRecordingAndSend();
            } else {
                _startRecording();
            }
        });
    }

    // Pause recording button
    const pauseBtn = document.getElementById('msgRecPause');
    if (pauseBtn) {
        pauseBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            _pauseRecording();
        });
    }

    // Search
    if (searchToggle) {
        searchToggle.addEventListener('click', () => {
            if (msgSearchActive) {
                _closeSearch();
            } else {
                _openSearch();
            }
        });
    }
    if (searchClose) searchClose.addEventListener('click', _closeSearch);
    if (searchInput) {
        // Also fire search on enter
        searchInput.addEventListener('input', () => {
            renderMessages(searchInput.value.trim());
        });
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                _jumpToNextSearchMatch();
            }
        });
    }

    // Admin Chat Menu
    const adminMenuToggle = document.getElementById('msgAdminMenuToggle');
    if (adminMenuToggle) {
        adminMenuToggle.addEventListener('click', (ev) => {
            ev.stopPropagation();
            if (_getMyId() !== 'ADMIN') return;
            
            const threadKey = getConversationKey();
            const otherId = msgCurrentChatId;
            const nameEl = document.getElementById('msgHeaderName');
            const name = nameEl ? nameEl.textContent : 'User';
            const pinnedChats = JSON.parse(localStorage.getItem('nd_pinned_chats') || '[]');
            const isPinned = pinnedChats.includes(threadKey);

            if (typeof _showInboxMenu === 'function') {
                _showInboxMenu(adminMenuToggle, threadKey, otherId, name, isPinned);
            }
        });
    }

    // Pinned
    if (pinnedToggle) pinnedToggle.addEventListener('click', _togglePinned);
    if (pinnedClose) pinnedClose.addEventListener('click', _closePinned);

    // Reply/Edit cancel
    if (replyCancel) replyCancel.addEventListener('click', () => {
        _cancelEditing();
        _cancelReply();
    });

    // Scroll-to-bottom button
    if (scrollBottomBtn) {
        scrollBottomBtn.addEventListener('click', scrollToBottom);
    }

    // Show/hide scroll button based on scroll position
    if (msgList) {
        msgList.addEventListener('scroll', () => {
            const btn = document.getElementById('msgScrollBottom');
            if (!btn) return;
            const isNearBottom = msgList.scrollHeight - msgList.scrollTop - msgList.clientHeight < 120;
            btn.style.display = isNearBottom ? 'none' : 'flex';
        });

        // Simple click for context menu
        msgList.addEventListener('click', (e) => {
            const bubble = e.target.closest('.msg-bubble');
            // If they clicked a non-interactive part of the bubble, show context menu
            if (bubble && !e.target.closest('img, video, audio, .msg-file, button, a')) {
                _showContextMenu(e, bubble);
            }
        });
    }


    // Sync across tabs via storage event
    window.addEventListener('storage', (e) => {
        if ((e.key === 'nd_messages' || e.key === 'nd_blocked_messaging_users') && page && page.classList.contains('show')) {
            renderMessages();
        }
    });

    // Auto-refresh when cloud sync completes
    window.addEventListener('nd_sync_complete', () => {
        if (page && page.classList.contains('show')) {
            _markMessagesAsRead();
            renderMessages();
        }
    });
}

// --- Handle Send ---
let msgReplyToId = null;

function _handleSend(input) {
    // If there is a pending file attachment, send it (with optional caption)
    if (msgPendingFile) {
        const caption = input.value.trim();
        const pf = msgPendingFile;
        if (pf.type === 'audio') {
            sendMessage(pf.name, pf.type, pf.dataUrl, 'New Audio', msgReplyToId);
        } else {
            sendMessage(pf.name, pf.type, pf.dataUrl, null, msgReplyToId);
        }
        // If there's also a text caption, send it as a separate text message
        if (caption) {
            sendMessage(caption, 'text', null, null, msgReplyToId);
        }
        _clearPendingFile();
        input.value = '';
        input.style.height = 'auto';
        _cancelReply();
        return;
    }

    const trimmedVal = input.value.trim();
    if (!trimmedVal) return;

    if (msgEditingId) {
        _finishEditing(trimmedVal);
    } else {
        sendMessage(trimmedVal, 'text', null, null, msgReplyToId);
    }
    input.value = '';
    input.style.height = 'auto';
    _cancelReply();
}

function getConversationKey() {
    const myId = _getMyId();
    const otherId = msgCurrentChatId;
    const ids = [myId, otherId].sort();
    return `thread_${ids[0]}_${ids[1]}`;
}

function _getMyId() {
    const path = window.location.pathname;
    if (path.includes('/admin/') || path.includes('/admin\\')) {
        return 'ADMIN';
    }
    const currentUser = window.loggedInUser || JSON.parse(localStorage.getItem('nd_logged_in_user')) || { id: '00000ND' };
    return currentUser.id;
}

// --- Send Message ---
function sendMessage(content, type, mediaUrl, duration, replyToId) {
    if ((!content || !content.trim()) && type === 'text') return;

    const messages = JSON.parse(localStorage.getItem('nd_messages') || '[]');
    const senderId = _getMyId();

    const newMsg = {
        id: `msg-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        threadKey: getConversationKey(),
        senderId: senderId,
        receiverId: msgCurrentChatId,
        content: content,
        type: type,
        mediaUrl: mediaUrl || null,
        duration: duration || null,
        timestamp: new Date().toISOString(),
        status: 'sent',
        isEdited: false,
        isPinned: false,
        readBy: [senderId],
        deletedFor: [],
        replyTo: replyToId || null
    };

    messages.push(newMsg);
    localStorage.setItem('nd_messages', JSON.stringify(messages));
    renderMessages();
    scrollToBottom();
}

// --- Render Messages ---
function renderMessages(searchQuery) {
    const list = document.getElementById('msgList');
    if (!list) return;

    const myId = _getMyId();
    const banner = document.getElementById('msgReadonlyBanner');
    const footer = document.getElementById('msgFooter');
    
    if (banner && footer) {
        const blockedUsers = JSON.parse(localStorage.getItem('nd_blocked_messaging_users') || '[]');
        if (myId !== 'ADMIN' && blockedUsers.includes(myId)) {
            footer.style.display = 'none';
            banner.style.display = 'block';
        } else {
            footer.style.display = '';
            banner.style.display = 'none';
        }
    }

    const messages = JSON.parse(localStorage.getItem('nd_messages') || '[]');
    const threadKey = getConversationKey();

    let threadMsgs = messages.filter(m =>
        m.threadKey === threadKey && !(m.deletedFor || []).includes(myId)
    );

    threadMsgs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Search filter
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        threadMsgs = threadMsgs.filter(m =>
            (m.content && m.content.toLowerCase().includes(q)) ||
            (m.type !== 'text' && m.type.toLowerCase().includes(q))
        );
    }

    if (threadMsgs.length === 0) {
        list.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#94a3b8; text-align:center; padding:30px;">
                <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#cbd5e1" stroke-width="1.5" style="margin-bottom:14px;">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
                <div style="font-weight:700; color:#475569; margin-bottom:4px;">No messages yet</div>
                <div style="font-size:0.82rem;">Send a message to start the conversation</div>
            </div>
        `;
        return;
    }

    // Group by date for separators
    let html = '';
    let lastDate = '';

    threadMsgs.forEach(msg => {
        const msgDate = new Date(msg.timestamp);
        const dateKey = _formatDateKey(msgDate);

        // Date separator
        if (dateKey !== lastDate) {
            html += `<div class="msg-date-separator"><span>${_formatDateLabel(msgDate)}</span></div>`;
            lastDate = dateKey;
        }

        const isMe = msg.senderId === myId;
        const time = msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Reply banner
        let replyHtml = '';
        if (msg.replyTo) {
            const allMsgs = JSON.parse(localStorage.getItem('nd_messages') || '[]');
            const repliedMsg = allMsgs.find(m => m.id === msg.replyTo);
            if (repliedMsg) {
                const replySender = repliedMsg.senderId === myId ? 'You' : (repliedMsg.senderId === 'ADMIN' ? 'Admin' : repliedMsg.senderId);
                const replyPreview = repliedMsg.type === 'text' ? escapeHtml(repliedMsg.content).substring(0, 60) : `[${repliedMsg.type}]`;
                replyHtml = `<div class="msg-reply-quote" onclick="event.stopPropagation(); _scrollToMessage('${repliedMsg.id}')" style="background:${isMe ? 'rgba(255,255,255,0.15)' : '#f1f5f9'}; border-left:3px solid #6366f1; padding:6px 10px; border-radius:8px; margin-bottom:6px; cursor:pointer; font-size:0.78rem;">
                    <div style="font-weight:700; color:${isMe ? '#ffffff' : '#6366f1'}; font-size:0.72rem;">${replySender}</div>
                    <div style="color:${isMe ? 'rgba(255,255,255,0.8)' : '#64748b'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${replyPreview}</div>
                </div>`;
            }
        }

        let contentHtml = '';
        if (msg.type === 'text') {
            let text = escapeHtml(msg.content);
            if (searchQuery) {
                text = _highlightSearch(text, searchQuery);
            }
            contentHtml = `<div class="msg-text">${text}</div>`;
        } else if (msg.type === 'image') {
            contentHtml = `<img src="${msg.mediaUrl}" class="msg-image" alt="Image" onclick="event.stopPropagation(); _openImagePreview('${msg.mediaUrl.replace(/'/g, "\\'")}')" />`;
            if (msg.content && msg.content !== 'image.jpg' && msg.content !== 'receipt.jpg' && !msg.content.match(/^image\-\d+/) && !msg.content.match(/^msg\-\d+/)) {
                let captionText = escapeHtml(msg.content);
                if (searchQuery) {
                    captionText = _highlightSearch(captionText, searchQuery);
                }
                contentHtml += `<div class="msg-text" style="margin-top: 8px;">${captionText}</div>`;
            }
        } else if (msg.type === 'video') {
            contentHtml = `<div class="msg-video-container" data-src="${msg.mediaUrl}" onclick="event.stopPropagation(); _openVideoPlayer('${msg.mediaUrl.replace(/'/g, "\\'")}')">
                <video src="${msg.mediaUrl}" class="msg-video" preload="metadata"></video>
                <div class="msg-video-play-overlay">
                    <svg viewBox="0 0 24 24" width="36" height="36" fill="white" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                </div>
            </div>`;
        } else if (msg.type === 'audio') {
            if (msg.content === 'Voice Note') {
                contentHtml = `
                    <div class="msg-audio-player" data-src="${msg.mediaUrl}" data-duration="${msg.duration || '0:00'}">
                        <button class="msg-audio-play" onclick="event.stopPropagation(); _toggleAudioPlay(this)">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                        </button>
                        <div class="msg-audio-waveform-wrap" ontouchstart="event.stopPropagation()" onclick="event.stopPropagation(); _seekAudioByWaveform(event, this)">
                            <div class="msg-audio-waveform">
                                ${Array.from({length: 20}, () => Math.floor(Math.random() * 20) + 6)
                                    .map(h => `<div class="msg-audio-bar" style="height:${h}px;"></div>`).join('')}
                            </div>
                        </div>
                        <span class="msg-audio-duration">${msg.duration || '0:00'}</span>
                    </div>`;
            } else {
                contentHtml = `
                    <div class="msg-audio-upload-container" onclick="event.stopPropagation(); window._openAudioPlayer('${msg.mediaUrl.replace(/'/g, "\\'")}', '${escapeHtml(msg.content).replace(/'/g, "\\'")}')" style="display:flex; align-items:center; gap:10px; width:100%; cursor:pointer; background:rgba(0,0,0,0.05); padding:10px; border-radius:10px;">
                        <div style="width:40px; height:40px; border-radius:50%; background:#6366f1; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="white" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                        </div>
                        <div style="display:flex; flex-direction:column; overflow:hidden;">
                            <span style="font-size:0.85rem; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:inherit;">${escapeHtml(msg.content)}</span>
                            <span style="font-size:0.7rem; opacity:0.7; color:inherit;">Audio File • Tap to play</span>
                        </div>
                    </div>`;
            }
        } else if (msg.type === 'document' || msg.type === 'pdf') {
            const ext = _getFileExt(msg.content);
            contentHtml = `
                <a href="${msg.mediaUrl}" download="${msg.content}" class="msg-file">
                    <span class="msg-file-icon">${ext}</span>
                    <div class="msg-file-info">
                        <span class="msg-file-name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; display: block;">${escapeHtml(msg.content)}</span>
                        <span class="msg-file-size">Tap to download</span>
                    </div>
                </a>`;
        }

        // Pin indicator
        let pinHtml = '';
        if (msg.isPinned) {
            pinHtml = `<div class="msg-pin-indicator">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z"></path></svg>
                Pinned
            </div>`;
        }

        // Status icon for sent messages
        let statusIcon = '';
        if (isMe) {
            const readByOther = (msg.readBy || []).some(id => id !== myId);
            if (readByOther) {
                statusIcon = `<span class="msg-status-text" style="color:#ffffff; font-weight:600; font-size:10px; margin-left:4px; letter-spacing:0.5px;">seen</span>`;
            } else {
                statusIcon = `<span class="msg-status-text" style="color:#ffffff; font-weight:600; font-size:10px; margin-left:4px; letter-spacing:0.5px;">delivered</span>`;
            }
        }

        let lendBadgeHtml = '';
        if (msg.isLendingRequest) {
            lendBadgeHtml = `
                <div class="msg-lending-badge" style="display: inline-flex; align-items: center; gap: 4px; background: rgba(139, 92, 246, 0.15); color: #8b5cf6; font-size: 0.72rem; font-weight: 700; padding: 4px 8px; border-radius: 6px; margin-bottom: 6px; border: 1px solid rgba(139, 92, 246, 0.3); align-self: flex-start; max-width: fit-content; text-transform: uppercase;">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink: 0;"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                    Money Lending Request
                </div>
            `;
        }

        html += `
            <div class="msg-row ${isMe ? 'msg-me' : 'msg-other'}" data-id="${msg.id}" data-type="${msg.type}">
                <div class="msg-bubble" style="${msg.isLendingRequest ? 'border: 1px solid rgba(139, 92, 246, 0.4); display: flex; flex-direction: column;' : ''}">
                    ${lendBadgeHtml}
                    ${pinHtml}
                    ${replyHtml}
                    ${contentHtml}
                    <div class="msg-meta" style="display:flex; align-items:center; gap:2px;">
                        ${msg.isEdited ? '<span class="msg-edited-tag">edited</span>' : ''}
                        <span>${time}</span> ${statusIcon}
                        <button class="msg-bubble-dots" onclick="event.stopPropagation(); _showBubbleMenu(event, this.closest('.msg-bubble'))" style="background:none; border:none; color:inherit; opacity:0.85; padding:0 0 0 3px; display:inline-flex; align-items:center; cursor:pointer; flex-shrink:0;" title="Options">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" stroke="none"><circle cx="12" cy="5" r="2"></circle><circle cx="12" cy="12" r="2"></circle><circle cx="12" cy="19" r="2"></circle></svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    list.innerHTML = html;
    _renderPinnedMessage();
}

// --- File Upload (stage in input, don't send immediately) ---
function _handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        let type = 'document';
        if (file.type.startsWith('image/')) type = 'image';
        else if (file.type.startsWith('video/')) type = 'video';
        else if (file.type.startsWith('audio/')) type = 'audio';
        else if (file.type === 'application/pdf') type = 'document';

        // Stage the file instead of sending immediately
        msgPendingFile = { file, dataUrl: evt.target.result, type, name: file.name };
        _showPendingFilePreview(msgPendingFile);

        // Focus the textarea so user can add an optional caption
        const input = document.getElementById('msgTextInput');
        if (input) {
            input.placeholder = 'Add a caption (optional)...';
            input.focus();
        }
    };
    reader.readAsDataURL(file);
    // Reset to allow re-selecting the same file
    e.target.value = '';
    // Reset accept to default
    e.target.setAttribute('accept', 'image/*,video/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,audio/mpeg,audio/wav,audio/mp4,audio/ogg,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt');
}

// --- Show pending file preview bar ---
function _showPendingFilePreview(pf) {
    // Remove any existing preview
    _clearPendingFileUI();

    const footer = document.getElementById('msgFooter');
    if (!footer) return;

    const bar = document.createElement('div');
    bar.id = 'msgPendingFileBar';
    bar.className = 'msg-pending-file-bar';

    let previewHtml = '';
    if (pf.type === 'image') {
        previewHtml = `<img src="${pf.dataUrl}" class="msg-pending-thumb" alt="preview" />`;
    } else if (pf.type === 'video') {
        previewHtml = `<div class="msg-pending-icon msg-pending-icon--video">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="white" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
        </div>`;
    } else if (pf.type === 'audio') {
        previewHtml = `<div class="msg-pending-icon msg-pending-icon--audio">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="white" stroke-width="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
        </div>`;
    } else {
        const ext = _getFileExt ? _getFileExt(pf.name) : (pf.name.split('.').pop().toUpperCase() || 'FILE');
        previewHtml = `<div class="msg-pending-icon msg-pending-icon--doc">
            <span style="font-size:0.62rem; font-weight:700; color:white;">${ext}</span>
        </div>`;
    }

    bar.innerHTML = `
        <div class="msg-pending-left">
            ${previewHtml}
            <div class="msg-pending-info">
                <span class="msg-pending-name">${escapeHtml(pf.name)}</span>
                <span class="msg-pending-hint">Tap send to share</span>
            </div>
        </div>
        <button class="msg-pending-remove" onclick="_clearPendingFile()" title="Remove">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
    `;

    // Insert ABOVE footer
    footer.parentNode.insertBefore(bar, footer);
}

// --- Clear pending file state & preview UI ---
function _clearPendingFileUI() {
    const existing = document.getElementById('msgPendingFileBar');
    if (existing) existing.remove();
}

window._clearPendingFile = function() {
    msgPendingFile = null;
    _clearPendingFileUI();
    const input = document.getElementById('msgTextInput');
    if (input) input.placeholder = 'Type a message...';
};

// --- Voice Recording ---
function _startRecording() {
    const micBtn = document.getElementById('msgMicBtn');
    const overlay = document.getElementById('msgRecordingOverlay');
    const footer = document.getElementById('msgFooter');
    
    // Hide footer, show overlay
    if (footer) footer.style.display = 'none';
    if (overlay) {
        overlay.style.display = 'flex';
        // Setup cancel and send buttons for overlay
        const cancelBtn = document.getElementById('msgRecCancel');
        const sendBtn = document.getElementById('msgRecSend');
        if (cancelBtn) cancelBtn.onclick = (e) => { e.preventDefault(); _cancelRecording(); };
        if (sendBtn) sendBtn.onclick = (e) => { e.preventDefault(); _stopRecordingAndSend(); };
    }
    
    if (micBtn) micBtn.classList.add('recording');

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                channelCount: 1,
                sampleRate: 44100
            }
        }).then(stream => {
            let options = { audioBitsPerSecond: 128000 };
            const types = [
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/ogg;codecs=opus',
                'audio/mp4',
                'audio/aac'
            ];
            for (const type of types) {
                if (MediaRecorder.isTypeSupported(type)) {
                    options.mimeType = type;
                    break;
                }
            }
            msgMediaRecorder = new MediaRecorder(stream, options);
            msgAudioChunks = [];
            msgRecordingSeconds = 0;

            const timerEl = document.getElementById('msgRecTimer');
            if (timerEl) timerEl.textContent = '0:00';

            // Reset pause UI if it was paused before
            const pauseBtn = document.getElementById('msgRecPause');
            if (pauseBtn) {
                pauseBtn.textContent = 'Pause';
                pauseBtn.style.color = '#6366f1';
            }
            const indicator = document.getElementById('msgRecIndicator');
            if (indicator) {
                indicator.style.animation = '';
                indicator.style.opacity = '1';
                indicator.style.background = '#ef4444';
            }

            msgMediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) msgAudioChunks.push(e.data);
            };
            msgMediaRecorder.start(); // Using default start (no timeslice) to ensure full chunks form on all mobile devices!

            // Timer
            msgRecordingTimer = setInterval(() => {
                msgRecordingSeconds++;
                if (timerEl) {
                    const mins = Math.floor(msgRecordingSeconds / 60);
                    const secs = msgRecordingSeconds % 60;
                    timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
                }
            }, 1000);
        }).catch(err => {
            console.error('Microphone access denied', err);
            _cancelRecording();
        });
    }
}

window._pauseRecording = function() {
    if (!msgMediaRecorder) return;
    
    const pauseBtn = document.getElementById('msgRecPause');
    const indicator = document.getElementById('msgRecIndicator');
    const timerEl = document.getElementById('msgRecTimer');
    
    if (msgMediaRecorder.state === 'recording') {
        msgMediaRecorder.pause();
        clearInterval(msgRecordingTimer);
        
        if (pauseBtn) {
            pauseBtn.textContent = 'Resume';
            pauseBtn.style.color = '#6366f1';
        }
        if (indicator) {
            indicator.style.animation = 'none';
            indicator.style.opacity = '0.5';
            indicator.style.background = '#9ca3af';
        }
    } else if (msgMediaRecorder.state === 'paused') {
        msgMediaRecorder.resume();
        
        if (pauseBtn) {
            pauseBtn.textContent = 'Pause';
            pauseBtn.style.color = '#6366f1';
        }
        if (indicator) {
            indicator.style.animation = '';
            indicator.style.opacity = '1';
            indicator.style.background = '#ef4444';
        }
        
        // Restart timer
        msgRecordingTimer = setInterval(() => {
            msgRecordingSeconds++;
            if (timerEl) {
                const mins = Math.floor(msgRecordingSeconds / 60);
                const secs = msgRecordingSeconds % 60;
                timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }
};

function _cancelRecording() {
    _resetRecordingUI();

    if (msgMediaRecorder && msgMediaRecorder.state !== 'inactive') {
        try {
            if (msgMediaRecorder.state === 'paused') msgMediaRecorder.resume();
            msgMediaRecorder.stop();
        } catch(e) { console.warn(e); }
        
        if (msgMediaRecorder.stream) {
            msgMediaRecorder.stream.getTracks().forEach(t => t.stop());
        }
    }
}

function _resetRecordingUI() {
    const micBtn = document.getElementById('msgMicBtn');
    const overlay = document.getElementById('msgRecordingOverlay');
    const footer = document.getElementById('msgFooter');

    if (micBtn) micBtn.classList.remove('recording');
    if (overlay) overlay.style.display = 'none';
    if (footer) footer.style.display = 'flex';

    clearInterval(msgRecordingTimer);
}

function _stopRecordingAndSend() {
    if (!msgMediaRecorder || msgMediaRecorder.state === 'inactive') {
        _resetRecordingUI();
        return;
    }
    
    // Clear timer first
    clearInterval(msgRecordingTimer);
    
    msgMediaRecorder.onstop = () => {
        if (msgAudioChunks.length === 0) {
            _resetRecordingUI();
            return;
        }
        const mimeType = msgMediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(msgAudioChunks, { type: mimeType });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
            const mins = Math.floor(msgRecordingSeconds / 60);
            const secs = msgRecordingSeconds % 60;
            const duration = `${mins}:${secs.toString().padStart(2, '0')}`;
            sendMessage('Voice Note', 'audio', reader.result, duration);
        };

        // Stop all tracks
        if (msgMediaRecorder.stream) {
            msgMediaRecorder.stream.getTracks().forEach(t => t.stop());
        }
        
        _resetRecordingUI();
    };
    
    // Hide the overlay immediately for responsiveness
    const overlay = document.getElementById('msgRecordingOverlay');
    const footer = document.getElementById('msgFooter');
    if (overlay) overlay.style.display = 'none';
    if (footer) footer.style.display = 'flex';
    
    try {
        if (msgMediaRecorder.state === 'paused') msgMediaRecorder.resume();
        // Give resume a tiny cycle to grab standard bytes before closing the final blob gap
        setTimeout(() => {
            if (msgMediaRecorder.state !== 'inactive') {
                try { msgMediaRecorder.requestData(); } catch(e){}
                msgMediaRecorder.stop();
            }
        }, 50);
    } catch(err) {
        msgMediaRecorder.stop();
    }
}

// --- Audio Playback ---
function _formatAudioTime(sec) {
    if (!isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
}

// Seek by tapping/dragging on the waveform (WhatsApp style)
window._seekAudioByWaveform = function(e, waveformWrap) {
    const player = waveformWrap.closest('.msg-audio-player');
    if (!player) return;
    const audio = player.querySelector('audio');
    if (!audio || !isFinite(audio.duration)) return;

    const rect = waveformWrap.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    audio.currentTime = pct * audio.duration;
    _updateWaveformProgress(player, pct);
};

// Highlight bars up to the current progress position
function _updateWaveformProgress(player, pct) {
    const bars = player.querySelectorAll('.msg-audio-bar');
    const durationEl = player.querySelector('.msg-audio-duration');
    const audio = player.querySelector('audio');
    const totalBars = bars.length;
    const activeBars = Math.floor(pct * totalBars);

    bars.forEach((bar, i) => {
        if (i < activeBars) {
            bar.style.opacity = '1';
        } else {
            bar.style.opacity = '0.4';
        }
    });

    // Update duration display to show elapsed time
    if (durationEl && audio && isFinite(audio.currentTime)) {
        durationEl.textContent = _formatAudioTime(audio.currentTime);
    }
}

window._toggleAudioPlay = function(btn) {
    const player = btn.closest('.msg-audio-player');
    if (!player) return;

    let audio = player.querySelector('audio');
    if (!audio) {
        audio = document.createElement('audio');
        audio.preload = 'auto';
        audio.playsInline = true;
        audio.src = player.getAttribute('data-src');
        player.appendChild(audio);

        // Drive waveform bar highlight on timeupdate
        audio.addEventListener('timeupdate', () => {
            if (!audio.duration) return;
            const pct = audio.currentTime / audio.duration;
            _updateWaveformProgress(player, pct);
        });

        audio.addEventListener('ended', () => {
            btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
            // Reset all bars to normal opacity and restore original duration text
            const bars = player.querySelectorAll('.msg-audio-bar');
            bars.forEach(bar => bar.style.opacity = '0.4');
            const durationEl = player.querySelector('.msg-audio-duration');
            if (durationEl) durationEl.textContent = btn.closest('.msg-audio-player').getAttribute('data-duration') || '0:00';
        });

        // Allow dragging on the waveform while playing (touchmove seek)
        const waveWrap = player.querySelector('.msg-audio-waveform-wrap');
        if (waveWrap) {
            waveWrap.addEventListener('touchmove', (e) => {
                e.stopPropagation();
                window._seekAudioByWaveform(e, waveWrap);
            }, { passive: true });
        }
    }

    if (audio.paused) {
        // Pause all other audio
        document.querySelectorAll('.msg-audio-player audio').forEach(a => {
            if (a !== audio) a.pause();
        });
        document.querySelectorAll('.msg-audio-play').forEach(b => {
            b.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
        });
        
        audio.play();
        btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
    } else {
        audio.pause();
        btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
    }
};

// --- Image Preview ---
window._openImagePreview = function(src) {
    const existing = document.querySelector('.msg-image-preview');
    if (existing) existing.remove();

    const preview = document.createElement('div');
    preview.className = 'msg-image-preview';
    preview.innerHTML = `
        <div style="position:absolute; top:20px; width:100%; display:flex; justify-content:space-between; align-items:flex-start; padding:0 20px; z-index:10; pointer-events:none;">
            <div style="pointer-events:auto;">
                <a href="${src}" download="image.jpg" style="background:rgba(255,255,255,0.15); border:none; color:white; width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center; text-decoration:none; backdrop-filter:blur(8px); transition:0.2s;">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                </a>
            </div>
            <div style="pointer-events:auto;">
                <button class="msg-image-preview-close" onclick="this.closest('.msg-image-preview').remove()" style="background:rgba(255,255,255,0.15); border:none; color:white; width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; backdrop-filter:blur(8px); transition:0.2s;">
                    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
        </div>
        <img src="${src}" alt="Preview" />
    `;
    preview.addEventListener('click', (e) => {
        // Only allow close via button
    });
    document.body.appendChild(preview);
};

// --- Bubble 3-dot Menu (wraps context menu) ---
window._showBubbleMenu = function(e, bubble) {
    _showContextMenu(e, bubble);
};

// --- Context Menu ---
function _showContextMenu(e, bubble) {
    // Remove any existing context menus
    document.querySelectorAll('.msg-context-menu').forEach(el => el.remove());

    const row = bubble.closest('.msg-row');
    const msgId = row.getAttribute('data-id');
    const msgType = row.getAttribute('data-type');
    const isMe = row.classList.contains('msg-me');

    // Lookup message data
    const messages = JSON.parse(localStorage.getItem('nd_messages') || '[]');
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;

    const menu = document.createElement('div');
    menu.className = 'msg-context-menu';

    let menuItems = '';

    // Copy (only text messages)
    if (msgType === 'text') {
        menuItems += `<div class="msg-ctx-item" data-action="copy">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            Copy
        </div>`;
    }
    
    // Download Media (Image/Video/Audio/Document)
    if (msgType === 'image' || msgType === 'video' || msgType === 'audio' || msgType === 'document' || msgType === 'pdf') {
        let dlText = 'Download';
        if (msgType === 'image') dlText = 'Download Image';
        else if (msgType === 'video') dlText = 'Download Video';
        else if (msgType === 'audio') dlText = 'Download Audio';
        else if (msgType === 'document' || msgType === 'pdf') dlText = 'Download Document';

        const dlExt = msgType === 'image' ? 'jpg' : (msgType === 'video' ? 'mp4' : (msgType === 'audio' ? 'weba' : 'file'));

        menuItems += `<div class="msg-ctx-item" data-action="download-media" data-url="${msg.mediaUrl || ''}" data-ext="${dlExt}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            ${dlText}
        </div>`;
    }

    // Edit (only own text messages)
    if (isMe && msgType === 'text') {
        menuItems += `<div class="msg-ctx-item" data-action="edit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            Edit
        </div>`;
    }

    // Reply
    menuItems += `<div class="msg-ctx-item" data-action="reply">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 14 4 9 9 4"></polyline><path d="M20 20v-7a4 4 0 0 0-4-4H4"></path></svg>
        Reply
    </div>`;

    // Pin / Unpin
    menuItems += `<div class="msg-ctx-item" data-action="pin">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z"></path></svg>
        ${msg.isPinned ? 'Unpin' : 'Pin'}
    </div>`;

    menuItems += `<div class="msg-ctx-divider"></div>`;

    // Delete for me
    menuItems += `<div class="msg-ctx-item" data-action="deleteMe">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        Delete for me
    </div>`;

    // Delete for everyone (only own messages)
    if (isMe) {
        menuItems += `<div class="msg-ctx-item text-danger" data-action="deleteAll">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            Delete for everyone
        </div>`;
    }

    menu.innerHTML = menuItems;

    // Position
    const x = Math.min(e.clientX, window.innerWidth - 200);
    const y = Math.min(e.clientY, window.innerHeight - 280);
    menu.style.top = y + 'px';
    menu.style.left = x + 'px';
    document.body.appendChild(menu);

    // Action handlers
    menu.addEventListener('click', (ev) => {
        const actionEl = ev.target.closest('.msg-ctx-item');
        if (!actionEl) return;
        const action = actionEl.getAttribute('data-action');

        switch (action) {
            case 'copy':
                navigator.clipboard.writeText(msg.content).catch(() => {});
                break;
            case 'download-media':
                let url = actionEl.getAttribute('data-url');
                const ext = actionEl.getAttribute('data-ext');
                
                // If the message has raw content instead of mediaUrl for simple documents
                if (!url && typeof msg !== 'undefined' && msg.content && (msg.type === 'document' || msg.type === 'pdf')) {
                    url = msg.mediaUrl;
                }

                if (url) {
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = msg.type === 'document' || msg.type === 'pdf' ? msg.content : `download_${Date.now()}.${ext}`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                }
                break;
            case 'edit':
                _startEditing(msgId, msg.content);
                break;
            case 'reply':
                _startReply(msgId, msg);
                break;
            case 'pin':
                _togglePin(msgId);
                break;
            case 'deleteMe':
                _deleteMessage(msgId, 'me');
                break;
            case 'deleteAll':
                _deleteMessage(msgId, 'all');
                break;
        }
        menu.remove();
    });

    // Dismiss
    setTimeout(() => {
        const handler = (ev) => {
            if (!menu.contains(ev.target)) {
                menu.remove();
                document.removeEventListener('click', handler);
                document.removeEventListener('touchstart', handler);
            }
        };
        document.addEventListener('click', handler);
        document.addEventListener('touchstart', handler);
    }, 10);
}

// --- Delete ---
function _deleteMessage(msgId, scope) {
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
            <h3 class="msg-confirm-title">Delete Message?</h3>
            <p class="msg-confirm-text">Are you sure you want to delete this message? This action cannot be undone.</p>
            <div class="msg-confirm-actions">
                <button class="msg-confirm-btn msg-confirm-cancel" id="msgConfirmCancel">Cancel</button>
                <button class="msg-confirm-btn msg-confirm-delete" id="msgConfirmDelete">Delete</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    
    // Trigger animation
    setTimeout(() => overlay.classList.add('show'), 10);

    const closeSelf = () => {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 250);
    };

    overlay.querySelector('#msgConfirmCancel').onclick = closeSelf;
    overlay.querySelector('#msgConfirmDelete').onclick = () => {
        const messages = JSON.parse(localStorage.getItem('nd_messages') || '[]');
        const myId = _getMyId();

        const idx = messages.findIndex(m => m.id === msgId);
        if (idx !== -1) {
            if (scope === 'me') {
                if (!messages[idx].deletedFor) messages[idx].deletedFor = [];
                messages[idx].deletedFor.push(myId);
            } else {
                messages.splice(idx, 1);
            }
            localStorage.setItem('nd_messages', JSON.stringify(messages));
            renderMessages();
        }
        closeSelf();
    };
}

function _startEditing(msgId, content) {
    _cancelEditing(); // Close any existing edits
    msgEditingId = msgId;

    const row = document.querySelector(`.msg-row[data-id="${msgId}"]`);
    if (!row) return;

    const bubble = row.querySelector('.msg-bubble');
    const textEl = row.querySelector('.msg-text');
    if (!bubble || !textEl) return;

    // Hide original text and context menu indicators
    textEl.style.display = 'none';

    // Create inline editor
    const editor = document.createElement('div');
    editor.className = 'msg-inline-editor';

    const textarea = document.createElement('textarea');
    textarea.className = 'msg-inline-textarea';
    textarea.value = content;

    const actions = document.createElement('div');
    actions.className = 'msg-inline-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'msg-inline-cancel';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = (e) => {
        e.stopPropagation();
        _cancelEditing();
    };

    const saveBtn = document.createElement('button');
    saveBtn.className = 'msg-inline-save';
    saveBtn.textContent = 'Save';
    saveBtn.onclick = (e) => {
        e.stopPropagation();
        _finishEditing(textarea.value);
    };

    actions.appendChild(cancelBtn);
    actions.appendChild(saveBtn);
    editor.appendChild(textarea);
    editor.appendChild(actions);

    bubble.insertBefore(editor, textEl);
    textarea.focus();

    // Auto resize
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    textarea.addEventListener('input', () => {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    });
}

function _finishEditing(newText) {
    if (!newText || !newText.trim()) return;

    const messages = JSON.parse(localStorage.getItem('nd_messages') || '[]');
    const idx = messages.findIndex(m => m.id === msgEditingId);
    if (idx !== -1) {
        messages[idx].content = newText;
        messages[idx].isEdited = true;
        localStorage.setItem('nd_messages', JSON.stringify(messages));
        renderMessages();
    }
    _cancelEditing();
}

function _cancelEditing() {
    msgEditingId = null;

    // Clean up all inline editors
    document.querySelectorAll('.msg-inline-textarea').forEach(el => el.blur());
    document.querySelectorAll('.msg-inline-editor').forEach(el => el.remove());
    document.querySelectorAll('.msg-text').forEach(el => {
        el.style.display = '';
    });
}

// --- Reply ---
function _startReply(msgId, msg) {
    msgReplyToId = msgId;
    
    const replyBar = document.getElementById('msgReplyBar');
    const replyLabel = document.getElementById('msgReplyLabel');
    const replyText = document.getElementById('msgReplyText');
    
    if (replyBar) replyBar.style.display = 'flex';
    if (replyLabel) replyLabel.textContent = 'Replying';
    if (replyText) {
        const preview = msg.type === 'text' ? msg.content.substring(0, 50) : `[${msg.type}]`;
        replyText.textContent = preview;
    }
    
    const input = document.getElementById('msgTextInput');
    if (input) input.focus();
}

function _cancelReply() {
    msgReplyToId = null;
    const replyBar = document.getElementById('msgReplyBar');
    if (replyBar) replyBar.style.display = 'none';
    const input = document.getElementById('msgTextInput');
    if (input) input.blur();
}

// --- Fullscreen Video Player ---
window._openVideoPlayer = function(src) {
    const existing = document.querySelector('.msg-fullscreen-video');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'msg-fullscreen-video';
    overlay.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:#000; z-index:99999; display:flex; flex-direction:column; align-items:center; justify-content:center;';

    overlay.innerHTML = `
        <button class="msg-fv-close" style="position:absolute; top:16px; right:16px; z-index:10; background:rgba(255,255,255,0.15); border:none; color:white; width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer;">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <div class="msg-fv-video-wrap" style="flex:1; display:flex; align-items:center; justify-content:center; width:100%; position:relative;">
            <video src="${src}" class="msg-fv-video" style="max-width:100%; max-height:80vh; border-radius:0;" preload="auto"></video>
            <div class="msg-fv-tap-left" style="position:absolute; left:0; top:0; width:40%; height:100%; z-index:5;"></div>
            <div class="msg-fv-tap-right" style="position:absolute; right:0; top:0; width:40%; height:100%; z-index:5;"></div>
            <div class="msg-fv-skip-indicator" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:white; font-size:1.2rem; font-weight:700; display:none; pointer-events:none; background:rgba(0,0,0,0.5); padding:8px 18px; border-radius:10px;"></div>
        </div>
        <div class="msg-fv-controls" style="width:100%; padding:12px 16px; background:rgba(0,0,0,0.7); display:flex; flex-direction:column; gap:8px;">
            <input type="range" class="msg-fv-slider" min="0" max="100" value="0" step="0.1" style="width:100%; accent-color:#6366f1; height:4px; cursor:pointer;">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
                <div style="display:flex; align-items:center; gap:12px;">
                    <button class="msg-fv-play-btn" style="background:none; border:none; color:white; cursor:pointer; display:flex; align-items:center;">
                        <svg viewBox="0 0 24 24" width="28" height="28" fill="white" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    </button>
                    <span class="msg-fv-time" style="color:#ccc; font-size:0.8rem; font-weight:500; min-width:80px;">0:00 / 0:00</span>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <button class="msg-fv-speed-btn" style="background:rgba(255,255,255,0.15); border:none; color:white; padding:4px 10px; border-radius:8px; font-size:0.78rem; font-weight:700; cursor:pointer;">1x</button>
                    <a class="msg-fv-download" href="${src}" download style="background:rgba(255,255,255,0.15); border:none; color:white; width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; text-decoration:none;">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    </a>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const video = overlay.querySelector('.msg-fv-video');
    const playBtn = overlay.querySelector('.msg-fv-play-btn');
    const slider = overlay.querySelector('.msg-fv-slider');
    const timeDisplay = overlay.querySelector('.msg-fv-time');
    const speedBtn = overlay.querySelector('.msg-fv-speed-btn');
    const closeBtn = overlay.querySelector('.msg-fv-close');
    const tapLeft = overlay.querySelector('.msg-fv-tap-left');
    const tapRight = overlay.querySelector('.msg-fv-tap-right');
    const skipIndicator = overlay.querySelector('.msg-fv-skip-indicator');

    const speeds = [0.5, 1, 1.5, 2];
    let speedIdx = 1;

    function formatTime(s) {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    }

    function updateUI() {
        if (video.duration) {
            slider.max = video.duration;
            slider.value = video.currentTime;
            timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
        }
    }

    video.addEventListener('timeupdate', updateUI);
    video.addEventListener('loadedmetadata', updateUI);

    playBtn.addEventListener('click', () => {
        if (video.paused) {
            video.play();
            playBtn.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28" fill="white" stroke="none"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
        } else {
            video.pause();
            playBtn.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28" fill="white" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
        }
    });

    video.addEventListener('click', () => {
        playBtn.click();
    });

    video.addEventListener('ended', () => {
        playBtn.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28" fill="white" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
    });

    slider.addEventListener('input', () => {
        video.currentTime = parseFloat(slider.value);
    });

    speedBtn.addEventListener('click', () => {
        speedIdx = (speedIdx + 1) % speeds.length;
        video.playbackRate = speeds[speedIdx];
        speedBtn.textContent = speeds[speedIdx] + 'x';
    });

    // Double tap to skip
    let tapTimer = null;
    function handleDoubleTap(direction) {
        if (direction === 'left') {
            video.currentTime = Math.max(0, video.currentTime - 5);
            skipIndicator.textContent = '-5s';
        } else {
            video.currentTime = Math.min(video.duration || 0, video.currentTime + 5);
            skipIndicator.textContent = '+5s';
        }
        skipIndicator.style.display = 'block';
        setTimeout(() => { skipIndicator.style.display = 'none'; }, 600);
    }

    [tapLeft, tapRight].forEach((el, i) => {
        let lastTap = 0;
        el.addEventListener('click', (e) => {
            const now = Date.now();
            if (now - lastTap < 350) {
                handleDoubleTap(i === 0 ? 'left' : 'right');
            }
            lastTap = now;
        });
    });

    closeBtn.addEventListener('click', () => {
        video.pause();
        overlay.remove();
    });

    overlay.addEventListener('click', (e) => {
        // Only allow close via button
    });

    // Auto play
    video.play().then(() => {
        playBtn.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28" fill="white" stroke="none"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
    }).catch(() => {});
};

// --- Fullscreen Audio Player ---
window._openAudioPlayer = function(src, title) {
    const existing = document.querySelector('.msg-fullscreen-audio');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'msg-fullscreen-audio';
    overlay.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.95); z-index:99999; display:flex; flex-direction:column; align-items:center; justify-content:center; backdrop-filter:blur(10px);';

    overlay.innerHTML = `
        <button class="msg-fa-close" style="position:absolute; top:16px; right:16px; z-index:10; background:rgba(255,255,255,0.15); border:none; color:white; width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer;">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <div class="msg-fa-audio-wrap" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; width:100%; position:relative; padding: 20px;">
            <div style="width:120px; height:120px; border-radius:50%; background:linear-gradient(135deg, #2c3e50, #6366f1); display:flex; align-items:center; justify-content:center; margin-bottom: 30px; box-shadow: 0 10px 25px rgba(27, 38, 59, 0.4);">
                <svg viewBox="0 0 24 24" width="60" height="60" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </div>
            <h3 style="color:white; margin:0 0 30px 0; font-weight:600; text-align:center; max-width:80%; word-break:break-all;">${title || 'Audio'}</h3>
            <audio src="${src}" class="msg-fa-audio" preload="auto"></audio>
        </div>
        <div class="msg-fa-controls" style="width:100%; padding:20px 40px; background:transparent; display:flex; flex-direction:column; gap:15px; margin-bottom: 40px; max-width:600px;">
            <input type="range" class="msg-fa-slider" min="0" max="100" value="0" step="0.1" style="width:100%; accent-color:#6366f1; height:6px; cursor:pointer;">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
                <div style="display:flex; align-items:center; gap:20px;">
                    <button class="msg-fa-play-btn" style="background:none; border:none; color:white; cursor:pointer; display:flex; align-items:center;">
                        <svg viewBox="0 0 24 24" width="36" height="36" fill="white" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    </button>
                    <span class="msg-fa-time" style="color:#e2e8f0; font-size:1rem; font-weight:500; min-width:90px;">0:00 / 0:00</span>
                </div>
                <div style="display:flex; align-items:center; gap:15px;">
                    <button class="msg-fa-speed-btn" style="background:rgba(255,255,255,0.15); border:none; color:white; padding:6px 14px; border-radius:12px; font-size:0.9rem; font-weight:700; cursor:pointer;">1x</button>
                    <a class="msg-fa-download" href="${src}" download="${title || 'audio'}" style="background:rgba(255,255,255,0.15); border:none; color:white; width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center; text-decoration:none;">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    </a>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const audio = overlay.querySelector('.msg-fa-audio');
    const playBtn = overlay.querySelector('.msg-fa-play-btn');
    const slider = overlay.querySelector('.msg-fa-slider');
    const timeDisplay = overlay.querySelector('.msg-fa-time');
    const speedBtn = overlay.querySelector('.msg-fa-speed-btn');
    const closeBtn = overlay.querySelector('.msg-fa-close');

    const speeds = [0.5, 1, 1.5, 2];
    let speedIdx = 1;

    function formatTime(s) {
        if (isNaN(s)) return '0:00';
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    }

    function updateUI() {
        if (audio.duration) {
            slider.max = audio.duration;
            slider.value = audio.currentTime;
            timeDisplay.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
        }
    }

    audio.addEventListener('timeupdate', updateUI);
    audio.addEventListener('loadedmetadata', updateUI);

    playBtn.addEventListener('click', () => {
        if (audio.paused) {
            audio.play();
            playBtn.innerHTML = '<svg viewBox="0 0 24 24" width="36" height="36" fill="white" stroke="none"><rect x="6" y="4" width="6" height="16"></rect><rect x="14" y="4" width="6" height="16"></rect></svg>';
        } else {
            audio.pause();
            playBtn.innerHTML = '<svg viewBox="0 0 24 24" width="36" height="36" fill="white" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
        }
    });

    audio.addEventListener('ended', () => {
        playBtn.innerHTML = '<svg viewBox="0 0 24 24" width="36" height="36" fill="white" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
    });

    slider.addEventListener('input', () => {
        audio.currentTime = parseFloat(slider.value);
    });

    speedBtn.addEventListener('click', () => {
        speedIdx = (speedIdx + 1) % speeds.length;
        audio.playbackRate = speeds[speedIdx];
        speedBtn.textContent = speeds[speedIdx] + 'x';
    });

    closeBtn.addEventListener('click', () => {
        audio.pause();
        overlay.remove();
    });

    overlay.addEventListener('click', (e) => {
        // Only allow close via button
    });

    // Auto play
    audio.play().then(() => {
        playBtn.innerHTML = '<svg viewBox="0 0 24 24" width="36" height="36" fill="white" stroke="none"><rect x="6" y="4" width="6" height="16"></rect><rect x="14" y="4" width="6" height="16"></rect></svg>';
    }).catch(() => {});
};

// --- Pause Recording ---
function _pauseRecording() {
    if (!msgMediaRecorder) return;
    
    const pauseBtn = document.getElementById('msgRecPause');
    const indicator = document.getElementById('msgRecIndicator');
    const timerEl = document.getElementById('msgRecTimer');
    
    if (msgMediaRecorder.state === 'recording') {
        msgMediaRecorder.pause();
        clearInterval(msgRecordingTimer);
        
        if (pauseBtn) {
            pauseBtn.textContent = 'Resume';
            pauseBtn.style.color = '#6366f1';
        }
        if (indicator) {
            indicator.style.animation = 'none';
            indicator.style.opacity = '0.5';
            indicator.style.background = '#9ca3af';
        }
    } else if (msgMediaRecorder.state === 'paused') {
        msgMediaRecorder.resume();
        
        if (pauseBtn) {
            pauseBtn.textContent = 'Pause';
            pauseBtn.style.color = '#6366f1';
        }
        if (indicator) {
            indicator.style.animation = '';
            indicator.style.opacity = '1';
            indicator.style.background = '#ef4444';
        }
        
        // Restart timer
        msgRecordingTimer = setInterval(() => {
            msgRecordingSeconds++;
            if (timerEl) {
                const mins = Math.floor(msgRecordingSeconds / 60);
                const secs = msgRecordingSeconds % 60;
                timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }
}

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
                    <span style="font-size:10px; font-weight:700; color:#6366f1; text-transform:uppercase; letter-spacing:0.5px;">Pinned Message</span>
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
        const origBg = isMe ? '#2c3e50' : '#ffffff';
        const origColor = isMe ? '#ffffff' : '#1e293b';

        const flashInterval = setInterval(() => {
            if (count % 2 === 0) {
                // Flash ON (Orange)
                bubble.style.background = '#6366f1';
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
                    if (lastMsg.isLendingRequest) preview = 'Money Lending Request';
                    else if (lastMsg.type !== 'text') preview = `[${lastMsg.type}]`;
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
            if (lastMsg.isLendingRequest) preview = 'Money Lending Request';
            else if (lastMsg.type !== 'text') preview = `[${lastMsg.type}]`;
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
        const pinIcon = c.isPinned ? '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#6366f1" stroke-width="2.5" style="flex-shrink:0;"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z"></path></svg>' : '';

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
            
            const page = document.getElementById('messagingPage');
            if (page && page.classList.contains('show') && msgCurrentChatId === otherId) {
                renderMessages();
            }
            
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

// --- Badge Count (for admin menu) ---
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



