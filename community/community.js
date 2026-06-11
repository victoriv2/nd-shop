// community.js

let commSearchActive = false;
let commMediaRecorder = null;
let commAudioChunks = [];
let commRecordingSeconds = 0;
let commRecordingTimer = null;
let commPollingInterval = null;
let commLastKnownCount = 0;
let commReplyingTo = null;
let commPendingFile = null; // { file, dataUrl, type, name }

// --- SVG Icon Helpers (replace all emoji) ---
const _svgIcons = {
    pin: (s=12,c='currentColor') => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="${c}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z"></path></svg>`,
    megaphone: (s=14,c='currentColor') => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`,
    poll: (s=14,c='currentColor') => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="12" width="4" height="8" rx="1"></rect><rect x="10" y="8" width="4" height="12" rx="1"></rect><rect x="17" y="4" width="4" height="16" rx="1"></rect></svg>`,
    lock: (s=12,c='currentColor') => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`,
    unlock: (s=12,c='currentColor') => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>`,
    doc: (s=14,c='currentColor') => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`,
    check: (s=12,c='currentColor') => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
};

// Initialize Default Settings if none exist
if (!localStorage.getItem('nd_comm_settings')) {
    localStorage.setItem('nd_comm_settings', JSON.stringify({
        isLocked: false,
        allowedPinning: 'admin', // 'admin' or 'all'
        bannedUsers: []
    }));
}

function getCommSettings() {
    return JSON.parse(localStorage.getItem('nd_comm_settings'));
}

function saveCommSettings(settings) {
    localStorage.setItem('nd_comm_settings', JSON.stringify(settings));
}

function _getMyId() {
    const path = window.location.pathname;
    if (path.includes('/admin/') || path.includes('/admin\\')) {
        return 'ADMIN';
    }
    const currentUser = window.loggedInUser || JSON.parse(localStorage.getItem('nd_logged_in_user')) || { id: '00000ND', name: 'User' };
    return currentUser.id;
}

function _getMyName() {
    const path = window.location.pathname;
    if (path.includes('/admin/') || path.includes('/admin\\')) {
        return 'Admin';
    }
    const currentUser = window.loggedInUser || JSON.parse(localStorage.getItem('nd_logged_in_user')) || { id: '00000ND', name: 'User' };
    return currentUser.name;
}

// --- Bootstrap ---
(function initCommunitySystem() {
    const basePath = getCommunityBasePath();
    if (!document.querySelector('link[href*="community/community.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = basePath + 'community/community.css';
        document.head.appendChild(link);
    }

    if (!document.getElementById('community-page-container')) {
        const container = document.createElement('div');
        container.id = 'community-page-container';
        document.body.appendChild(container);

        fetch(basePath + 'community/community.html')
            .then(res => res.text())
            .then(html => {
                container.innerHTML = html;
                initCommunityLogic();
            })
            .catch(err => console.warn('Community module failed to load', err));
    }
})();

function getCommunityBasePath() {
    const path = window.location.pathname;
    if (path.includes('/admin/') || path.includes('/admin\\')) {
        return '../';
    }
    return '';
}

window.openCommunityChat = function() {
    const waitForReady = setInterval(() => {
        if (document.getElementById('communityPage')) {
            clearInterval(waitForReady);
            _realOpenCommunity();
        }
    }, 100);
};

function _realOpenCommunity() {
    const page = document.getElementById('communityPage');
    const myId = _getMyId();
    
    // Toggle Admin Options
    const adminMenuToggle = document.getElementById('commAdminMenuToggle');
    if (adminMenuToggle) {
        if (myId === 'ADMIN') {
            adminMenuToggle.style.display = 'block';
        } else {
            adminMenuToggle.style.display = 'none';
        }
    }

    // Update Input area visibility based on lock status and banned status
    _updateInputVisibility();

    if (page) {
        page.classList.add('show');
        document.body.classList.add('modal-open');
        
        // Update last viewed timestamp
        localStorage.setItem(`nd_comm_last_viewed_${myId}`, new Date().toISOString());

        renderCommMessages();
        scrollToCommBottom();
        _startCommPolling();
    }
}

function _closeCommunity() {
    const page = document.getElementById('communityPage');
    const myId = _getMyId();
    localStorage.setItem(`nd_comm_last_viewed_${myId}`, new Date().toISOString());

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

    if (commMediaRecorder && commMediaRecorder.state !== 'inactive') {
        commMediaRecorder.stop();
    }
    _stopCommPolling();
}

function _updateInputVisibility() {
    const footer = document.getElementById('commFooter');
    const banner = document.getElementById('commReadonlyBanner');
    const myId = _getMyId();
    const settings = getCommSettings();
    
    if (myId === 'ADMIN') {
        // Admin can always send
        if (footer) footer.style.display = 'flex';
        if (banner) banner.style.display = 'none';
        return;
    }

    if (settings.bannedUsers.includes(myId)) {
        if (footer) footer.style.display = 'none';
        if (banner) {
            banner.textContent = 'You have been muted by an admin.';
            banner.style.display = 'block';
        }
    } else if (settings.isLocked) {
        if (footer) footer.style.display = 'none';
        if (banner) {
            banner.textContent = 'Only admins can send messages.';
            banner.style.display = 'block';
        }
    } else {
        if (footer) footer.style.display = 'flex';
        if (banner) banner.style.display = 'none';
    }
}

window.openCommAdminMenu = function() {
    const overlay = document.getElementById('commAdminMenuOverlay');
    if (overlay) {
        // Sync toggles before showing
        const settings = getCommSettings();
        const lockInput = document.querySelector('#commLockToggle input');
        if (lockInput) lockInput.checked = settings.isLocked;
        
        const lockText = document.querySelector('#commAdminMenuOverlay .comm-admin-menu-item:first-child strong');
        if (lockText) {
            lockText.textContent = settings.isLocked ? 'Unlock Community' : 'Lock Community';
        }
        
        const pinInput = document.querySelector('#commPinningToggle input');
        if (pinInput) pinInput.checked = (settings.allowedPinning === 'admin');

        overlay.classList.add('show');
    }
};

function initCommunityLogic() {
    const backBtn = document.getElementById('commBackBtn');
    const sendBtn = document.getElementById('commSendBtn');
    const input = document.getElementById('commTextInput');
    const attachBtn = document.getElementById('commAttachBtn');
    const fileInput = document.getElementById('commFileInput');
    const searchToggle = document.getElementById('commSearchToggle');
    const searchClose = document.getElementById('commSearchClose');
    const searchInput = document.getElementById('commSearchInput');
    const micBtn = document.getElementById('commMicBtn');

    if (backBtn) backBtn.addEventListener('click', _closeCommunity);

    if (sendBtn && input) {
        sendBtn.addEventListener('click', () => _handleCommSend(input));
        
        input.addEventListener('input', (e) => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 120) + 'px';
            _handleMentions(e.target.value);
        });
    }

    // Attachments
    const attachMenu = document.getElementById('commAttachMenu');
    const cameraInput = document.getElementById('commCameraInput');

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
        
        document.querySelectorAll('.comm-attach-item').forEach(item => {
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
        
        if (fileInput) fileInput.addEventListener('change', _handleCommFileUpload);
        if (cameraInput) cameraInput.addEventListener('change', _handleCommFileUpload);
    }

    // Search
    if (searchToggle) {
        searchToggle.addEventListener('click', () => {
            const bar = document.getElementById('commSearchBar');
            commSearchActive = !commSearchActive;
            if (commSearchActive) {
                bar.classList.add('show');
                if (searchInput) searchInput.focus();
            } else {
                bar.classList.remove('show');
                if (searchInput) searchInput.value = '';
                renderCommMessages();
            }
        });
    }
    if (searchClose) {
        searchClose.addEventListener('click', () => {
            const bar = document.getElementById('commSearchBar');
            commSearchActive = false;
            bar.classList.remove('show');
            if (searchInput) searchInput.value = '';
            renderCommMessages();
        });
    }
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            renderCommMessages(searchInput.value.trim());
        });
    }

    // Mic
    if (micBtn) {
        micBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (commMediaRecorder && (commMediaRecorder.state === 'recording' || commMediaRecorder.state === 'paused')) {
                _stopCommRecordingAndSend();
            } else {
                _startCommRecording();
            }
        });
    }
    
    const pauseBtn = document.getElementById('commRecPause');
    if (pauseBtn) {
        pauseBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            _pauseCommRecording();
        });
    }
    const cancelBtn = document.getElementById('commRecCancel');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            _cancelCommRecording();
        });
    }
    const recSend = document.getElementById('commRecSend');
    if (recSend) {
        recSend.addEventListener('click', (e) => {
            e.preventDefault();
            _stopCommRecordingAndSend();
        });
    }

    // List click for context menu
    const list = document.getElementById('commList');
    if (list) {
        list.addEventListener('click', (e) => {
            const bubble = e.target.closest('.comm-bubble');
            if (bubble && !e.target.closest('img, video, audio, .comm-poll-opt, button, a')) {
                window._showCommContextMenu(e, bubble);
            }
        });
    }
}

// --- File Upload (stage in input, don't send immediately) ---
function _handleCommFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        let type = 'document';
        if (file.type.startsWith('image/')) type = 'image';
        else if (file.type.startsWith('video/')) type = 'video';
        else if (file.type.startsWith('audio/')) type = 'audio';

        // Stage the file instead of sending immediately
        commPendingFile = { file, dataUrl: evt.target.result, type, name: file.name };
        _showCommPendingFilePreview(commPendingFile);

        // Focus the textarea so user can add an optional caption
        const input = document.getElementById('commTextInput');
        if (input) {
            input.placeholder = 'Add a caption (optional)...';
            input.focus();
        }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
    e.target.setAttribute('accept', 'image/*,video/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,audio/mpeg,audio/wav,audio/mp4,audio/ogg,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt');
}

// --- Show pending file preview bar ---
function _showCommPendingFilePreview(pf) {
    _clearCommPendingFileUI();

    const footer = document.getElementById('commFooter');
    if (!footer) return;

    const bar = document.createElement('div');
    bar.id = 'commPendingFileBar';
    bar.className = 'comm-pending-file-bar';

    let previewHtml = '';
    if (pf.type === 'image') {
        previewHtml = `<img src="${pf.dataUrl}" class="comm-pending-thumb" alt="preview" />`;
    } else if (pf.type === 'video') {
        previewHtml = `<div class="comm-pending-icon comm-pending-icon--video">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="white" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
        </div>`;
    } else if (pf.type === 'audio') {
        previewHtml = `<div class="comm-pending-icon comm-pending-icon--audio">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="white" stroke-width="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
        </div>`;
    } else {
        const ext = pf.name.split('.').pop().toUpperCase() || 'FILE';
        previewHtml = `<div class="comm-pending-icon comm-pending-icon--doc">
            <span style="font-size:0.62rem; font-weight:700; color:white;">${ext}</span>
        </div>`;
    }

    bar.innerHTML = `
        <div class="comm-pending-left">
            ${previewHtml}
            <div class="comm-pending-info">
                <span class="comm-pending-name">${escapeHtml(pf.name)}</span>
                <span class="comm-pending-hint">Tap send to share</span>
            </div>
        </div>
        <button class="comm-pending-remove" onclick="_clearCommPendingFile()" title="Remove">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
    `;

    footer.parentNode.insertBefore(bar, footer);
}

// --- Clear pending file state & preview UI ---
function _clearCommPendingFileUI() {
    const existing = document.getElementById('commPendingFileBar');
    if (existing) existing.remove();
}

window._clearCommPendingFile = function() {
    commPendingFile = null;
    _clearCommPendingFileUI();
    const input = document.getElementById('commTextInput');
    if (input) input.placeholder = 'Type a message... (@ to mention)';
};

// --- File preview handler for styled upload wrappers ---
window._handleFilePreview = function(input, wrapperId) {
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;
    
    const file = input.files[0];
    const labelEl = wrapper.querySelector('.primary');
    
    if (file) {
        wrapper.classList.add('has-file');
        if (labelEl) labelEl.textContent = file.name;
        
        // Add clear button if not present
        if (!wrapper.querySelector('.comm-file-upload-clear')) {
            const clearBtn = document.createElement('button');
            clearBtn.className = 'comm-file-upload-clear';
            clearBtn.innerHTML = '✕';
            clearBtn.onclick = function(e) {
                e.stopPropagation();
                input.value = '';
                wrapper.classList.remove('has-file');
                if (labelEl) {
                    if (wrapperId.includes('poll')) labelEl.textContent = 'Choose an image';
                    else labelEl.textContent = 'Choose a file';
                }
                clearBtn.remove();
            };
            wrapper.appendChild(clearBtn);
        }
    } else {
        wrapper.classList.remove('has-file');
        if (labelEl) {
            if (wrapperId.includes('poll')) labelEl.textContent = 'Choose an image';
            else labelEl.textContent = 'Choose a file';
        }
    }
};

// --- Sending ---
function _handleCommSend(input) {
    if (commPendingFile) {
        const caption = input.value.trim();
        const pf = commPendingFile;
        if (pf.type === 'audio') {
            sendCommMessage(pf.name, pf.type, pf.dataUrl, { duration: 'Audio File' });
        } else {
            sendCommMessage(pf.name, pf.type, pf.dataUrl);
        }
        if (caption) {
            sendCommMessage(caption, 'text');
        }
        _clearCommPendingFile();
        input.value = '';
        input.style.height = 'auto';
        document.getElementById('commMentionsMenu').classList.remove('show');
        return;
    }

    let content = input.value;
    if (!content || !content.trim()) return;
    sendCommMessage(content, 'text');
    input.value = '';
    input.style.height = 'auto';
    document.getElementById('commMentionsMenu').classList.remove('show');
}

function sendCommMessage(content, type, mediaUrl = null, extraData = null) {
    const messages = JSON.parse(localStorage.getItem('nd_comm_messages') || '[]');
    const myId = _getMyId();
    const myName = _getMyName();

    const newMsg = {
        id: `cmsg-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        senderId: myId,
        senderName: myName,
        content: content,
        type: type, // 'text', 'image', 'video', 'audio', 'document', 'poll', 'announcement', 'system'
        mediaUrl: mediaUrl,
        extraData: extraData, // { duration, options, votes, fileType }
        timestamp: new Date().toISOString(),
        isPinned: false,
        deletedFor: [], // e.g. ['userId'] or 'all'
        replyTo: commReplyingTo // Link to replied message ID
    };

    messages.push(newMsg);
    localStorage.setItem('nd_comm_messages', JSON.stringify(messages));
    
    // Clear reply state
    _cancelCommReply();
    
    renderCommMessages();
    scrollToCommBottom();
}

// Send a system notification message (non-deletable, centered)
function _sendSystemNotification(text, iconType = 'pin') {
    const messages = JSON.parse(localStorage.getItem('nd_comm_messages') || '[]');
    const newMsg = {
        id: `cmsg-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        senderId: 'SYSTEM',
        senderName: 'System',
        content: text,
        type: 'system',
        mediaUrl: null,
        extraData: { iconType: iconType },
        timestamp: new Date().toISOString(),
        isPinned: false,
        deletedFor: [],
        replyTo: null
    };
    messages.push(newMsg);
    localStorage.setItem('nd_comm_messages', JSON.stringify(messages));
}

window._replyCommMsg = function(msgId) {
    const messages = JSON.parse(localStorage.getItem('nd_comm_messages') || '[]');
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;

    commReplyingTo = msg.id;
    const banner = document.getElementById('commReplyBanner');
    const nameEl = document.getElementById('commReplyName');
    const textEl = document.getElementById('commReplyText');
    const input = document.getElementById('commTextInput');

    if (banner && nameEl && textEl) {
        nameEl.textContent = msg.senderId === 'ADMIN' ? 'Admin' : msg.senderName;
        let preview = msg.type === 'text' ? msg.content : `[${msg.type}]`;
        if (msg.type === 'poll') preview = 'Poll: ' + msg.content;
        if (msg.type === 'announcement') preview = 'Announcement: ' + msg.content;
        textEl.textContent = preview;
        banner.style.display = 'block';
    }

    if (input) input.focus();
};

window._cancelCommReply = function() {
    commReplyingTo = null;
    const banner = document.getElementById('commReplyBanner');
    if (banner) banner.style.display = 'none';
};

// --- Voice Recording ---
function _startCommRecording() {
    const micBtn = document.getElementById('commMicBtn');
    const overlay = document.getElementById('commRecordingOverlay');
    const footer = document.getElementById('commFooter');
    
    if (footer) footer.style.display = 'none';
    if (overlay) overlay.style.display = 'flex';
    
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            commMediaRecorder = new MediaRecorder(stream);
            commAudioChunks = [];
            commRecordingSeconds = 0;

            const timerEl = document.getElementById('commRecTimer');
            if (timerEl) timerEl.textContent = '0:00';

            // Reset pause UI
            const pauseBtn = document.getElementById('commRecPause');
            if (pauseBtn) {
                pauseBtn.textContent = 'Pause';
                pauseBtn.style.color = '#6366f1';
            }
            const indicator = document.getElementById('commRecIndicator');
            if (indicator) {
                indicator.style.animation = '';
                indicator.style.opacity = '1';
                indicator.style.background = '#dc2626';
            }

            commMediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) commAudioChunks.push(e.data);
            };
            commMediaRecorder.start();

            commRecordingTimer = setInterval(() => {
                if (commMediaRecorder.state === 'recording') {
                    commRecordingSeconds++;
                    if (timerEl) {
                        const mins = Math.floor(commRecordingSeconds / 60);
                        const secs = commRecordingSeconds % 60;
                        timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
                    }
                }
            }, 1000);
        }).catch(err => {
            console.error('Mic access denied', err);
            _cancelCommRecording();
        });
    }
}

function _pauseCommRecording() {
    if (!commMediaRecorder) return;
    const pauseBtn = document.getElementById('commRecPause');
    const indicator = document.getElementById('commRecIndicator');
    const timerEl = document.getElementById('commRecTimer');

    if (commMediaRecorder.state === 'recording') {
        commMediaRecorder.pause();
        clearInterval(commRecordingTimer);
        if (pauseBtn) {
            pauseBtn.textContent = 'Resume';
            pauseBtn.style.color = '#6366f1';
        }
        if (indicator) {
            indicator.style.animation = 'none';
            indicator.style.opacity = '0.5';
            indicator.style.background = '#9ca3af';
        }
    } else if (commMediaRecorder.state === 'paused') {
        commMediaRecorder.resume();
        if (pauseBtn) {
            pauseBtn.textContent = 'Pause';
            pauseBtn.style.color = '#6366f1';
        }
        if (indicator) {
            indicator.style.animation = '';
            indicator.style.opacity = '1';
            indicator.style.background = '#dc2626';
        }
        // Restart timer
        commRecordingTimer = setInterval(() => {
            commRecordingSeconds++;
            if (timerEl) {
                const mins = Math.floor(commRecordingSeconds / 60);
                const secs = commRecordingSeconds % 60;
                timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }
}

function _cancelCommRecording() {
    _resetCommRecordingUI();
    if (commMediaRecorder && commMediaRecorder.state !== 'inactive') {
        try { commMediaRecorder.stop(); } catch(e){}
        if (commMediaRecorder.stream) commMediaRecorder.stream.getTracks().forEach(t => t.stop());
    }
}

function _stopCommRecordingAndSend() {
    if (!commMediaRecorder || commMediaRecorder.state === 'inactive') {
        _resetCommRecordingUI();
        return;
    }
    
    clearInterval(commRecordingTimer);
    
    commMediaRecorder.onstop = () => {
        if (commAudioChunks.length > 0) {
            const audioBlob = new Blob(commAudioChunks, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = () => {
                const mins = Math.floor(commRecordingSeconds / 60);
                const secs = commRecordingSeconds % 60;
                const duration = `${mins}:${secs.toString().padStart(2, '0')}`;
                sendCommMessage('Voice Note', 'audio', reader.result, { duration: duration });
            };
        }
        if (commMediaRecorder.stream) commMediaRecorder.stream.getTracks().forEach(t => t.stop());
        _resetCommRecordingUI();
    };
    
    // Hide overlay immediately for responsiveness
    const overlay = document.getElementById('commRecordingOverlay');
    const footer = document.getElementById('commFooter');
    if (overlay) overlay.style.display = 'none';
    if (footer) footer.style.display = 'flex';

    try {
        if (commMediaRecorder.state === 'paused') commMediaRecorder.resume();
        setTimeout(() => {
            if (commMediaRecorder.state !== 'inactive') {
                try { commMediaRecorder.requestData(); } catch(e){}
                commMediaRecorder.stop();
            }
        }, 50);
    } catch(err) {
        commMediaRecorder.stop();
    }
}

function _resetCommRecordingUI() {
    const overlay = document.getElementById('commRecordingOverlay');
    const footer = document.getElementById('commFooter');
    if (overlay) overlay.style.display = 'none';
    if (footer) footer.style.display = 'flex';
    clearInterval(commRecordingTimer);
}

// --- Audio Playback for Community ---
window._commToggleAudioPlay = function(btn) {
    const player = btn.closest('.comm-audio-player');
    if (!player) return;

    let audio = player.querySelector('audio');
    if (!audio) {
        audio = document.createElement('audio');
        audio.src = player.getAttribute('data-src');
        player.appendChild(audio);
    }

    if (audio.paused) {
        // Pause all other community audio
        document.querySelectorAll('.comm-audio-player audio').forEach(a => {
            if (a !== audio) a.pause();
        });
        document.querySelectorAll('.comm-audio-play').forEach(b => {
            b.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
        });
        
        audio.play();
        btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
        
        audio.onended = () => {
            btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
        };
    } else {
        audio.pause();
        btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
    }
};

// --- Render ---
function renderCommMessages(searchQuery = '') {
    const list = document.getElementById('commList');
    if (!list) return;

    let messages = JSON.parse(localStorage.getItem('nd_comm_messages') || '[]');
    const myId = _getMyId();

    // Filter out deleted
    messages = messages.filter(m => m.deletedFor !== 'all' && !(m.deletedFor || []).includes(myId));

    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        messages = messages.filter(m => 
            (m.content && m.content.toLowerCase().includes(q)) || 
            (m.senderName && m.senderName.toLowerCase().includes(q))
        );
    }

    if (messages.length === 0) {
        list.innerHTML = `<div style="text-align:center; color:#94a3b8; padding:30px;">No messages in community yet.</div>`;
        _renderCommPinned([]);
        return;
    }

    let html = '';
    messages.forEach(msg => {
        // --- System notification (centered) ---
        if (msg.type === 'system') {
            const iconType = msg.extraData?.iconType || 'pin';
            const iconSvg = _svgIcons[iconType] ? _svgIcons[iconType](13, '#6366f1') : _svgIcons.pin(13, '#6366f1');
            html += `
                <div class="comm-system-notification" data-id="${msg.id}">
                    <div class="comm-system-bubble">
                        <span class="notif-icon">${iconSvg}</span>
                        <span>${escapeHtml(msg.content)}</span>
                    </div>
                </div>
            `;
            return;
        }

        const isMe = msg.senderId === myId;
        const msgDate = new Date(msg.timestamp);
        const time = msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        let contentHtml = '';
        let mediaHtml = '';

        if (msg.mediaUrl) {
            if (msg.type === 'image' || (msg.type === 'poll' && msg.mediaUrl)) {
                mediaHtml = `<img src="${msg.mediaUrl}" class="msg-image" style="max-width:100%; border-radius:8px; margin-bottom: 8px;" onclick="event.stopPropagation(); typeof _openImagePreview === 'function' && _openImagePreview('${msg.mediaUrl}')" />`;
            } else if (msg.type === 'video') {
                mediaHtml = `<div class="comm-video-container" onclick="event.stopPropagation(); window._openCommVideoPlayer('${msg.mediaUrl.replace(/'/g, "\\'")}')">
                    <video src="${msg.mediaUrl}" preload="metadata"></video>
                    <div class="comm-video-play-overlay">
                        <svg viewBox="0 0 24 24" width="36" height="36" fill="white" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    </div>
                </div>`;
            }
        }

        // --- Announcement (inside normal bubble, reply-able) ---
        if (msg.type === 'announcement') {
            let annMedia = '';
            if (msg.mediaUrl) {
                if (msg.extraData?.fileType === 'image') {
                    annMedia = `<div class="comm-announcement-media"><img src="${msg.mediaUrl}" onclick="event.stopPropagation(); typeof _openImagePreview === 'function' && _openImagePreview('${msg.mediaUrl}')" /></div>`;
                } else if (msg.extraData?.fileType === 'video') {
                    annMedia = `<div class="comm-announcement-media"><div class="comm-video-container" onclick="event.stopPropagation(); window._openCommVideoPlayer('${msg.mediaUrl.replace(/'/g, "\\'")}')">
                        <video src="${msg.mediaUrl}" preload="metadata"></video>
                        <div class="comm-video-play-overlay"><svg viewBox="0 0 24 24" width="36" height="36" fill="white" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg></div>
                    </div></div>`;
                } else if (msg.extraData?.fileType === 'audio') {
                    annMedia = `<div class="comm-announcement-media"><audio src="${msg.mediaUrl}" controls style="width:100%;"></audio></div>`;
                } else {
                    annMedia = `<div class="comm-announcement-media"><a href="${msg.mediaUrl}" download="Announcement_File" class="comm-doc-link"><span class="comm-doc-icon">${_svgIcons.doc(16,'#64748b')}</span> Download Attached File</a></div>`;
                }
            }
            contentHtml = `<div class="comm-announcement-bubble">
                <div class="comm-announcement-header">
                    <div class="comm-announcement-icon">${_svgIcons.megaphone(14,'white')}</div>
                    <span>Announcement</span>
                </div>
                ${annMedia}
                <div class="comm-announcement-body">${escapeHtml(msg.content)}</div>
            </div>`;
        } else

        if (msg.type === 'poll') {
            let totalVotes = 0;
            const optionsHtml = msg.extraData.options.map((opt, i) => {
                const votes = opt.voters ? opt.voters.length : 0;
                totalVotes += votes;
                return { text: opt.text, votes: votes, index: i, voters: opt.voters || [] };
            });

            const renderOpts = optionsHtml.map(o => {
                const pct = totalVotes > 0 ? Math.round((o.votes / totalVotes) * 100) : 0;
                const iVoted = o.voters.includes(myId);
                return `
                    <div class="comm-poll-opt ${iVoted ? 'voted' : ''}" onclick="event.stopPropagation(); _votePoll('${msg.id}', ${o.index})">
                        <div class="comm-poll-fill" style="width:${pct}%; background:${iVoted ? 'rgba(27,38,59,0.35)' : 'rgba(27,38,59,0.12)'};"></div>
                        <span class="comm-poll-opt-text">${iVoted ? '<span class="check-icon">' + _svgIcons.check(12,'#6366f1') + '</span> ' : ''}${escapeHtml(o.text)}</span>
                        <span class="comm-poll-opt-votes">${pct}% (${o.votes})</span>
                    </div>
                `;
            }).join('');

            contentHtml = `
                <div class="comm-poll">
                    ${mediaHtml}
                    <div class="comm-poll-q"><span class="poll-icon">${_svgIcons.poll(15)}</span> ${escapeHtml(msg.content)}</div>
                    ${renderOpts}
                    <div class="comm-poll-total">${totalVotes} vote${totalVotes !== 1 ? 's' : ''}</div>
                </div>
            `;
        } else if (msg.type !== 'announcement') {
            // Standard types
            let textContent = escapeHtml(msg.content);
            
            // Highlight Mentions
            textContent = textContent.replace(/@([a-zA-Z0-9_]+)/g, '<span class="comm-mention">@$1</span>');

            if (searchQuery) textContent = _highlightSearch(textContent, searchQuery);

            if (msg.type === 'text') {
                contentHtml = `<div class="comm-text">${textContent}</div>`;
            } else if (msg.type === 'image') {
                contentHtml = `${mediaHtml}`;
            } else if (msg.type === 'video') {
                contentHtml = `${mediaHtml}`;
            } else if (msg.type === 'audio') {
                if (msg.content === 'Voice Note') {
                    // Voice note waveform display (like messaging)
                    const bars = Array.from({length: 22}, () => Math.floor(Math.random() * 20) + 6)
                        .map(h => `<div class="comm-audio-bar" style="height:${h}px;"></div>`).join('');
                    contentHtml = `
                        <div class="comm-audio-player" data-src="${msg.mediaUrl}">
                            <button class="comm-audio-play" onclick="event.stopPropagation(); window._commToggleAudioPlay(this)">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                            </button>
                            <div class="comm-audio-waveform">${bars}</div>
                            <span class="comm-audio-duration">${msg.extraData?.duration || '0:00'}</span>
                        </div>`;
                } else {
                    // Uploaded audio file card
                    contentHtml = `
                        <div class="comm-audio-file-card" onclick="event.stopPropagation(); window._openAudioPlayer && window._openAudioPlayer('${msg.mediaUrl.replace(/'/g, "\\'")}', '${escapeHtml(msg.content).replace(/'/g, "\\'")}')">
                            <div class="comm-audio-file-icon">
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="white" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                            </div>
                            <div class="comm-audio-file-info">
                                <span class="comm-audio-file-name">${escapeHtml(msg.content)}</span>
                                <span class="comm-audio-file-label">Audio File • Tap to play</span>
                            </div>
                        </div>`;
                }
            } else if (msg.type === 'document' || msg.type === 'pdf') {
                contentHtml = `<a href="${msg.mediaUrl}" download="${msg.content}" class="comm-doc-link"><span class="comm-doc-icon">${_svgIcons.doc(16,'#64748b')}</span> <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; display: block;">${textContent}</span></a>`;
            }
        }

        let replyHtml = '';
        if (msg.replyTo) {
            const repliedMsg = messages.find(m => m.id === msg.replyTo);
            if (repliedMsg) {
                const replyText = repliedMsg.type === 'text' ? repliedMsg.content : `[${repliedMsg.type}]`;
                const replySender = repliedMsg.senderId === 'ADMIN' ? 'Admin' : repliedMsg.senderName;
                replyHtml = `
                    <div class="comm-reply-preview" onclick="const el = document.querySelector('.comm-row[data-id=\\'${repliedMsg.id}\\']'); if(el) el.scrollIntoView({behavior:'smooth'});" style="background:${isMe ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)'}; border-left:3px solid ${isMe ? 'rgba(255,255,255,0.5)' : '#6366f1'}; padding:6px 10px; margin-bottom:6px; border-radius:4px; font-size:0.8rem; cursor:pointer;">
                        <strong style="color:${isMe ? '#ffffff' : '#6366f1'};">${escapeHtml(replySender)}</strong><br>
                        <span style="color:${isMe ? 'rgba(255,255,255,0.8)' : '#64748b'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block; max-width:100%;">${escapeHtml(replyText)}</span>
                    </div>
                `;
            }
        }

        const senderName = msg.senderId === 'ADMIN' ? 'Admin' : escapeHtml(msg.senderName);
        const optionsBtnHtml = `<button class="comm-msg-opts" onclick="event.stopPropagation(); window._showCommContextMenu(event, this)">⋮</button>`;

        let bubbleMaxWidth = '85%';
        if (msg.type === 'poll' || msg.type === 'announcement') {
            bubbleMaxWidth = '95%';
        }

        html += `
            <div class="comm-row ${isMe ? 'msg-me' : 'msg-other'}" data-id="${msg.id}" data-sender="${msg.senderId}" style="max-width: 100%; min-width: 0;">
                <div class="comm-sender-name">${senderName}</div>
                <div class="comm-bubble-wrapper" style="position:relative; display:flex; align-items:center; gap:4px; flex-direction:${isMe ? 'row-reverse' : 'row'}; cursor:pointer; max-width: 100%; min-width: 0; box-sizing: border-box;" onclick="window._showCommContextMenu(event, this)">
                    <div class="comm-bubble" style="min-width: 0; max-width: ${bubbleMaxWidth}; overflow: hidden; word-wrap: break-word; overflow-wrap: break-word; box-sizing: border-box;">
                        ${msg.isPinned ? `<div class="comm-pin-badge">${_svgIcons.pin(11,'#6366f1')} Pinned</div>` : ''}
                        ${replyHtml}
                        ${contentHtml}
                        <div class="comm-meta">${msg.isEdited ? '<span style="font-style:italic; opacity:0.7; margin-right:4px;">edited</span>' : ''}<span>${time}</span></div>
                    </div>
                    ${optionsBtnHtml}
                </div>
            </div>
        `;
    });

    list.innerHTML = html;
    _renderCommPinned(messages);
}

function _renderCommPinned(messages) {
    const panel = document.getElementById('commPinnedPanel');
    if (!panel) return;
    
    const pinned = messages.filter(m => m.isPinned);
    if (pinned.length > 0) {
        const lastPinned = pinned[pinned.length - 1];
        let preview = lastPinned.type === 'text' ? lastPinned.content : `[${lastPinned.type}]`;
        if (lastPinned.type === 'announcement') preview = 'Announcement: ' + lastPinned.content;
        if (lastPinned.type === 'poll') preview = 'Poll: ' + lastPinned.content;

        panel.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; width:100%;" onclick="const el = document.querySelector('.comm-row[data-id=\\'${lastPinned.id}\\']'); if(el) el.scrollIntoView({behavior:'smooth'});">
                <div style="display:flex; flex-direction:column;">
                    <span class="comm-pinned-label">${_svgIcons.pin(10,'#6366f1')} Pinned Message</span>
                    <span class="comm-pinned-preview">${escapeHtml(preview)}</span>
                </div>
            </div>
        `;
        panel.style.display = 'flex';
    } else {
        panel.style.display = 'none';
        panel.innerHTML = '';
    }
}

// --- Context Menu (Delete, Pin, Reply) ---
window._showCommContextMenu = function(e, bubble) {
    document.querySelectorAll('.comm-ctx-menu').forEach(el => el.remove());

    // The bubble argument could be the bubble itself or the opts button.
    const row = bubble.closest('.comm-row');
    if (!row) return;

    const msgId = row.getAttribute('data-id');
    const msgSenderId = row.getAttribute('data-sender');
    const myId = _getMyId();

    const messages = JSON.parse(localStorage.getItem('nd_comm_messages') || '[]');
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;

    const settings = getCommSettings();
    const canPin = myId === 'ADMIN' || settings.allowedPinning === 'all';
    const canDeleteAll = myId === 'ADMIN' || msgSenderId === myId;

    const menu = document.createElement('div');
    menu.className = 'comm-ctx-menu';

    let html = '';
    
    // Everyone can reply
    html += `<div class="comm-ctx-item" onclick="window._replyCommMsg('${msgId}'); this.parentElement.remove();">Reply</div>`;

    if (msg.type === 'text' && msgSenderId === myId) {
        html += `<div class="comm-ctx-item" onclick="window._editCommMsg('${msgId}'); this.parentElement.remove();">Edit</div>`;
    }

    if (msg.type === 'text') {
        html += `<div class="comm-ctx-item" onclick="navigator.clipboard.writeText('${escapeHtml(msg.content).replace(/'/g,"\\'")}'); this.parentElement.remove();">Copy</div>`;
    }

    if (canPin) {
        html += `<div class="comm-ctx-item" onclick="window._toggleCommPin('${msgId}'); this.parentElement.remove();">${msg.isPinned ? 'Unpin' : 'Pin'}</div>`;
    }

    html += `<div class="comm-ctx-item" onclick="window._deleteCommMsg('${msgId}', 'me'); this.parentElement.remove();">Delete for me</div>`;
    
    if (canDeleteAll) {
        html += `<div class="comm-ctx-item danger" onclick="window._deleteCommMsg('${msgId}', 'all'); this.parentElement.remove();">Delete for everyone</div>`;
    }

    menu.innerHTML = html;
    
    const x = Math.min(e.clientX, window.innerWidth - 180);
    const y = Math.min(e.clientY, window.innerHeight - 200);
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    document.body.appendChild(menu);

    setTimeout(() => {
        const dismiss = (ev) => {
            if (!menu.contains(ev.target)) {
                menu.remove();
                document.removeEventListener('click', dismiss);
            }
        };
        document.addEventListener('click', dismiss);
    }, 10);
}

window._toggleCommPin = function(msgId) {
    let messages = JSON.parse(localStorage.getItem('nd_comm_messages') || '[]');
    const msg = messages.find(m => m.id === msgId);
    if (msg) {
        msg.isPinned = !msg.isPinned;
        localStorage.setItem('nd_comm_messages', JSON.stringify(messages));
        
        // Send system notification for pinning
        const myName = _getMyName();
        const preview = msg.type === 'text' ? msg.content.substring(0, 40) : `[${msg.type}]`;
        if (msg.isPinned) {
            _sendSystemNotification(`${myName} pinned a message: "${preview}"`, 'pin');
        } else {
            _sendSystemNotification(`${myName} unpinned a message`, 'pin');
        }
        
        renderCommMessages();
    }
};

window._deleteCommMsg = function(msgId, scope) {
    let messages = JSON.parse(localStorage.getItem('nd_comm_messages') || '[]');
    const myId = _getMyId();
    
    const idx = messages.findIndex(m => m.id === msgId);
    if (idx > -1) {
        if (scope === 'all') {
            messages[idx].deletedFor = 'all';
        } else {
            if (!messages[idx].deletedFor) messages[idx].deletedFor = [];
            if (Array.isArray(messages[idx].deletedFor)) messages[idx].deletedFor.push(myId);
        }
        localStorage.setItem('nd_comm_messages', JSON.stringify(messages));
        renderCommMessages();
    }
};
// --- Edit Message ---
let _commEditingMsgId = null;

window._editCommMsg = function(msgId) {
    let messages = JSON.parse(localStorage.getItem('nd_comm_messages') || '[]');
    const msg = messages.find(m => m.id === msgId);
    if (!msg || msg.type !== 'text') return;

    _commEditingMsgId = msgId;
    const modal = document.getElementById('commEditMsgModal');
    const input = document.getElementById('commEditMsgInput');
    if (modal && input) {
        input.value = msg.content;
        modal.classList.add('show');
        setTimeout(() => input.focus(), 200);
    }
};

window._closeCommEditModal = function() {
    const modal = document.getElementById('commEditMsgModal');
    if (modal) modal.classList.remove('show');
    _commEditingMsgId = null;
};

window._confirmCommEdit = function() {
    if (!_commEditingMsgId) return;
    const input = document.getElementById('commEditMsgInput');
    const newContent = input ? input.value.trim() : '';

    if (newContent) {
        let messages = JSON.parse(localStorage.getItem('nd_comm_messages') || '[]');
        const msg = messages.find(m => m.id === _commEditingMsgId);
        if (msg) {
            msg.content = newContent;
            msg.isEdited = true;
            localStorage.setItem('nd_comm_messages', JSON.stringify(messages));
            renderCommMessages();
        }
    }
    window._closeCommEditModal();
};

// --- Polls ---
window._votePoll = function(msgId, optIndex) {
    let messages = JSON.parse(localStorage.getItem('nd_comm_messages') || '[]');
    const msg = messages.find(m => m.id === msgId);
    const myId = _getMyId();

    if (msg && msg.type === 'poll') {
        const currentOption = msg.extraData.options[optIndex];
        const currentVoters = currentOption.voters || [];
        const alreadyVotedThisOption = currentVoters.includes(myId);

        // Remove my vote from ALL options first
        msg.extraData.options.forEach(o => {
            o.voters = (o.voters || []).filter(v => v !== myId);
        });

        // If I was NOT voting for this option, add my vote (toggle behavior)
        // If I WAS already voting for this option, don't add it back (unchoose)
        if (!alreadyVotedThisOption) {
            if (!msg.extraData.options[optIndex].voters) msg.extraData.options[optIndex].voters = [];
            msg.extraData.options[optIndex].voters.push(myId);
        }
        
        localStorage.setItem('nd_comm_messages', JSON.stringify(messages));
        renderCommMessages();
    }
};

// --- Mentions ---
function _handleMentions(text) {
    const menu = document.getElementById('commMentionsMenu');
    const myId = _getMyId();
    
    // Simple check if last word starts with @
    const words = text.split(' ');
    const lastWord = words[words.length - 1];
    
    if (lastWord.startsWith('@')) {
        const query = lastWord.substring(1).toLowerCase();
        let users = JSON.parse(localStorage.getItem('nd_users') || '[]');
        if (myId !== 'ADMIN') users.unshift({id: 'ADMIN', name: 'Admin'}); // Allow tagging admin
        
        // Filter out myself
        users = users.filter(u => u.id !== myId);
        
        const matches = users.filter(u => u.name.toLowerCase().includes(query));
        
        if (matches.length > 0) {
            menu.innerHTML = matches.map(u => `<div class="comm-mention-item" onclick="insertMention('${u.name}')">${escapeHtml(u.name)}</div>`).join('');
            menu.classList.add('show');
        } else {
            menu.classList.remove('show');
        }
    } else {
        menu.classList.remove('show');
    }
}

window.insertMention = function(name) {
    const input = document.getElementById('commTextInput');
    let text = input.value;
    const words = text.split(' ');
    words.pop(); // remove the partial @ word
    words.push('@' + name.replace(/\s+/g, '_') + ' ');
    input.value = words.join(' ');
    document.getElementById('commMentionsMenu').classList.remove('show');
    input.focus();
};

// --- Admin Controls ---
window.toggleCommLock = function() {
    let settings = getCommSettings();
    settings.isLocked = !settings.isLocked;
    
    const input = document.querySelector('#commLockToggle input');
    if (input) input.checked = settings.isLocked;
    
    saveCommSettings(settings);
    
    // Send system notification instead of announcement for lock/unlock
    if (settings.isLocked) {
        _sendSystemNotification('Admin has locked the community. Only admins can send messages.', 'lock');
    } else {
        _sendSystemNotification('Admin has unlocked the community. Everyone can send messages.', 'unlock');
    }
    
    _updateInputVisibility();
    renderCommMessages();
    scrollToCommBottom();
};

window.toggleCommPinning = function() {
    let settings = getCommSettings();
    settings.allowedPinning = settings.allowedPinning === 'admin' ? 'all' : 'admin';
    
    const input = document.querySelector('#commPinningToggle input');
    if (input) input.checked = (settings.allowedPinning === 'admin');
    
    saveCommSettings(settings);

    // Send system notification
    if (settings.allowedPinning === 'all') {
        _sendSystemNotification('Admin has allowed everyone to pin messages.', 'pin');
    } else {
        _sendSystemNotification('Admin has restricted pinning to admins only.', 'pin');
    }
    
    renderCommMessages();
    scrollToCommBottom();
};

window.openCommPollModal = function() {
    document.getElementById('commAdminMenuOverlay').classList.remove('show');
    document.getElementById('commPollModal').classList.add('show');
};

window.addPollOption = function() {
    const container = document.getElementById('pollOptionsContainer');
    const count = container.children.length + 1;
    const div = document.createElement('div');
    div.className = 'poll-option-row';
    div.innerHTML = `
        <input type="text" class="form-input poll-option-input" placeholder="Option ${count}">
        <button class="poll-option-remove" onclick="this.parentElement.remove()" type="button">×</button>
    `;
    container.appendChild(div);
};

window.submitCommPoll = function() {
    const q = document.getElementById('pollQuestion').value;
    const inputs = document.querySelectorAll('.poll-option-input');
    const options = Array.from(inputs).map(i => i.value.trim()).filter(v => v !== '');
    const fileInput = document.getElementById('pollImageInput');
    const file = fileInput ? fileInput.files[0] : null;
    
    if (q && options.length >= 2) {
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                sendCommMessage(q, 'poll', e.target.result, { 
                    options: options.map(o => ({text: o, voters: []}))
                });
                _sendSystemNotification('Admin has created a new poll', 'poll');
                _resetPollModal();
            };
            reader.readAsDataURL(file);
        } else {
            sendCommMessage(q, 'poll', null, { 
                options: options.map(o => ({text: o, voters: []}))
            });
            _sendSystemNotification('Admin has created a new poll', 'poll');
            _resetPollModal();
        }
    } else {
        alert("Please enter a question and at least 2 options.");
    }
};

function _resetPollModal() {
    document.getElementById('commPollModal').classList.remove('show');
    document.getElementById('pollQuestion').value = '';
    const fileInput = document.getElementById('pollImageInput');
    if (fileInput) fileInput.value = '';
    // Reset the file wrapper
    const wrapper = document.getElementById('pollImageWrapper');
    if (wrapper) {
        wrapper.classList.remove('has-file');
        const label = wrapper.querySelector('.primary');
        if (label) label.textContent = 'Choose an image';
        const clearBtn = wrapper.querySelector('.comm-file-upload-clear');
        if (clearBtn) clearBtn.remove();
    }
    document.getElementById('pollOptionsContainer').innerHTML = `
        <div class="poll-option-row">
            <input type="text" class="form-input poll-option-input" placeholder="Option 1">
        </div>
        <div class="poll-option-row">
            <input type="text" class="form-input poll-option-input" placeholder="Option 2">
        </div>
    `;
}

window.openCommAnnouncementModal = function() {
    document.getElementById('commAdminMenuOverlay').classList.remove('show');
    document.getElementById('commAnnouncementModal').classList.add('show');
};

window.submitCommAnnouncement = function() {
    const msg = document.getElementById('announcementMessage').value;
    const fileInput = document.getElementById('announcementMediaInput');
    const file = fileInput.files[0];

    if (!msg && !file) {
        alert("Please enter a message or select a file.");
        return;
    }

    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            let type = 'document';
            if (file.type.startsWith('image/')) type = 'image';
            else if (file.type.startsWith('video/')) type = 'video';
            else if (file.type.startsWith('audio/')) type = 'audio';

            sendCommMessage(msg || file.name, 'announcement', e.target.result, { fileType: type });
            
            _resetAnnouncementModal();
        };
        reader.readAsDataURL(file);
    } else {
        sendCommMessage(msg, 'announcement');
        _resetAnnouncementModal();
    }
};

function _resetAnnouncementModal() {
    document.getElementById('commAnnouncementModal').classList.remove('show');
    document.getElementById('announcementMessage').value = '';
    const fileInput = document.getElementById('announcementMediaInput');
    if (fileInput) fileInput.value = '';
    // Reset the file wrapper
    const wrapper = document.getElementById('announcementMediaWrapper');
    if (wrapper) {
        wrapper.classList.remove('has-file');
        const label = wrapper.querySelector('.primary');
        if (label) label.textContent = 'Choose a file';
        const clearBtn = wrapper.querySelector('.comm-file-upload-clear');
        if (clearBtn) clearBtn.remove();
    }
}

window.openCommUserManage = function() {
    document.getElementById('commAdminMenuOverlay').classList.remove('show');
    document.getElementById('commUsersModal').classList.add('show');
    window.renderCommUserManage();
};

window.renderCommUserManage = function() {
    const list = document.getElementById('commUserManageList');
    const search = document.getElementById('commUserSearch').value.toLowerCase();
    const users = JSON.parse(localStorage.getItem('nd_users') || '[]');
    const settings = getCommSettings();
    
    let filtered = users;
    if (search) {
        filtered = users.filter(u => u.name.toLowerCase().includes(search));
    }
    
    list.innerHTML = filtered.map(u => {
        const isBanned = settings.bannedUsers.includes(u.id);
        return `
            <div class="comm-user-item">
                <span style="font-weight:600; color:#333;">${escapeHtml(u.name)} <small style="color:#888; font-weight:normal;">(ID: ${u.id})</small></span>
                <button onclick="window.toggleUserMute('${u.id}')" style="padding:6px 12px; border-radius:8px; border:none; font-weight:700; cursor:pointer; background:${isBanned ? '#edf1f7' : '#fee2e2'}; color:${isBanned ? '#6366f1' : '#ef4444'};">
                    ${isBanned ? 'Unmute' : 'Mute'}
                </button>
            </div>
        `;
    }).join('');
};

window.toggleUserMute = function(userId) {
    let settings = getCommSettings();
    if (settings.bannedUsers.includes(userId)) {
        settings.bannedUsers = settings.bannedUsers.filter(id => id !== userId);
    } else {
        settings.bannedUsers.push(userId);
    }
    saveCommSettings(settings);
    window.renderCommUserManage();
};

function scrollToCommBottom() {
    const list = document.getElementById('commList');
    if (list) {
        setTimeout(() => { list.scrollTop = list.scrollHeight; }, 50);
    }
}

let commLastKnownState = '';

function _startCommPolling() {
    _stopCommPolling();
    commPollingInterval = setInterval(() => {
        const messagesStr = localStorage.getItem('nd_comm_messages') || '[]';
        if (messagesStr !== commLastKnownState) {
            commLastKnownState = messagesStr;
            const messages = JSON.parse(messagesStr);
            commLastKnownCount = messages.length; // Keep backward compatibility for other places if needed
            renderCommMessages();
            
            const myId = _getMyId();
            localStorage.setItem(`nd_comm_last_viewed_${myId}`, new Date().toISOString());

            // Check if settings changed (lock status, mute status)
            _updateInputVisibility();
        }
    }, 1500);
}

function _stopCommPolling() {
    if (commPollingInterval) {
        clearInterval(commPollingInterval);
        commPollingInterval = null;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function _highlightSearch(text, query) {
    if (!query) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    return text.replace(regex, '<span style="background:#cce4ff; border-radius:2px;">$1</span>');
}

// Global hook for unread badge on community button
window.getCommUnreadCount = function() {
    const page = document.getElementById('communityPage');
    if (page && page.classList.contains('show')) {
        return 0;
    }
    const messages = JSON.parse(localStorage.getItem('nd_comm_messages') || '[]');
    const myId = _getMyId();
    
    const valid = messages.filter(m => m.deletedFor !== 'all' && !(m.deletedFor || []).includes(myId));
    
    const lastViewedStr = localStorage.getItem(`nd_comm_last_viewed_${myId}`);
    if (!lastViewedStr) {
        // If they have never viewed, all valid messages not sent by them are unread
        return valid.filter(m => m.senderId !== myId).length;
    }

    const lastViewed = new Date(lastViewedStr);
    return valid.filter(m => m.senderId !== myId && new Date(m.timestamp) > lastViewed).length;
};

// --- Custom Fullscreen Video Player (Community) ---
window._openCommVideoPlayer = function(src) {
    const existing = document.querySelector('.comm-fullscreen-video');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'comm-fullscreen-video';
    overlay.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:#000; z-index:99999; display:flex; flex-direction:column; align-items:center; justify-content:center;';

    overlay.innerHTML = `
        <button class="cfv-close" style="position:absolute; top:16px; right:16px; z-index:10; background:rgba(255,255,255,0.15); border:none; color:white; width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer;">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <div class="cfv-video-wrap" style="flex:1; display:flex; align-items:center; justify-content:center; width:100%; position:relative;">
            <video src="${src}" class="cfv-video" style="max-width:100%; max-height:80vh; border-radius:0;" preload="auto"></video>
            <div class="cfv-tap-left" style="position:absolute; left:0; top:0; width:40%; height:100%; z-index:5;"></div>
            <div class="cfv-tap-right" style="position:absolute; right:0; top:0; width:40%; height:100%; z-index:5;"></div>
            <div class="cfv-skip-indicator" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:white; font-size:1.2rem; font-weight:700; display:none; pointer-events:none; background:rgba(0,0,0,0.5); padding:8px 18px; border-radius:10px;"></div>
        </div>
        <div class="cfv-controls" style="width:100%; padding:12px 16px; background:rgba(0,0,0,0.7); display:flex; flex-direction:column; gap:8px;">
            <input type="range" class="cfv-slider" min="0" max="100" value="0" step="0.1" style="width:100%; accent-color:#6366f1; height:4px; cursor:pointer;">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
                <div style="display:flex; align-items:center; gap:12px;">
                    <button class="cfv-play-btn" style="background:none; border:none; color:white; cursor:pointer; display:flex; align-items:center;">
                        <svg viewBox="0 0 24 24" width="28" height="28" fill="white" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    </button>
                    <span class="cfv-time" style="color:#ccc; font-size:0.8rem; font-weight:500; min-width:80px;">0:00 / 0:00</span>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <button class="cfv-speed-btn" style="background:rgba(255,255,255,0.15); border:none; color:white; padding:4px 10px; border-radius:8px; font-size:0.78rem; font-weight:700; cursor:pointer;">1x</button>
                    <a class="cfv-download" href="${src}" download style="background:rgba(255,255,255,0.15); border:none; color:white; width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; text-decoration:none;">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    </a>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const video = overlay.querySelector('.cfv-video');
    const playBtn = overlay.querySelector('.cfv-play-btn');
    const slider = overlay.querySelector('.cfv-slider');
    const timeDisplay = overlay.querySelector('.cfv-time');
    const speedBtn = overlay.querySelector('.cfv-speed-btn');
    const closeBtn = overlay.querySelector('.cfv-close');
    const tapLeft = overlay.querySelector('.cfv-tap-left');
    const tapRight = overlay.querySelector('.cfv-tap-right');
    const skipIndicator = overlay.querySelector('.cfv-skip-indicator');

    const speeds = [0.5, 1, 1.5, 2];
    let speedIdx = 1;

    const playIcon = '<svg viewBox="0 0 24 24" width="28" height="28" fill="white" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
    const pauseIcon = '<svg viewBox="0 0 24 24" width="28" height="28" fill="white" stroke="none"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';

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
            playBtn.innerHTML = pauseIcon;
        } else {
            video.pause();
            playBtn.innerHTML = playIcon;
        }
    });

    video.addEventListener('click', () => playBtn.click());
    video.addEventListener('ended', () => { playBtn.innerHTML = playIcon; });
    slider.addEventListener('input', () => { video.currentTime = parseFloat(slider.value); });

    speedBtn.addEventListener('click', () => {
        speedIdx = (speedIdx + 1) % speeds.length;
        video.playbackRate = speeds[speedIdx];
        speedBtn.textContent = speeds[speedIdx] + 'x';
    });

    // Double tap to skip
    [tapLeft, tapRight].forEach((el, i) => {
        let lastTap = 0;
        el.addEventListener('click', () => {
            const now = Date.now();
            if (now - lastTap < 350) {
                if (i === 0) {
                    video.currentTime = Math.max(0, video.currentTime - 5);
                    skipIndicator.textContent = '-5s';
                } else {
                    video.currentTime = Math.min(video.duration || 0, video.currentTime + 5);
                    skipIndicator.textContent = '+5s';
                }
                skipIndicator.style.display = 'block';
                setTimeout(() => { skipIndicator.style.display = 'none'; }, 600);
            }
            lastTap = now;
        });
    });

    closeBtn.addEventListener('click', () => { video.pause(); overlay.remove(); });
    overlay.addEventListener('click', (e) => {
        // Only allow close via button
    });

    video.play().then(() => { playBtn.innerHTML = pauseIcon; }).catch(() => {});
};




