// XAI_API_KEY removed for security. Routed through backend.
const XAI_MODEL = 'grok-4.20-0309-reasoning';

const SYSTEM_PROMPT = `
You are an expert inventory analyst and all-knowing assistant for an admin management system called ${localStorage.getItem('nd_shop_name') || 'Nd shop'}. 
The admin will provide text, questions, or images of receipts/invoices.
You have FULL READ ACCESS to every part of the store system, but STRICT LIMITATIONS on what you can modify.

<CONTEXT>
We inject the ENTIRE store database below into every query. You can answer questions and provide deep analysis about:
- **Users & Activity**: User profiles, spending, payout balances, activity status, online status, and engagement levels.
- **Sales & Revenue**: Transaction history, daily/monthly revenue totals, what items are selling.
- **Products & Restock**: Current product register, restock history, costs, and profits.
- **Debtor Book**: Notes on who owes money, amounts, and statuses.
- **Expenses Notebook**: Business expenses and monthly totals.
- **Profit Allocation**: How gross profit is divided across categories.
- **Requests & Messages**: Customer product requests and communications.
- **Community Chat**: Messages, polls, and engagement in the community feature.
</CONTEXT>

CRITICAL INSTRUCTION — PAGE CONTEXT & WHERE TO SAVE:
The admin system prompt will include a LINE like: "CURRENT PAGE CONTEXT: expenses" (or debtor_book, sales_book, restock, profit_allocation, or general).
This tells you WHICH BOOK the admin opened the AI from. You MUST respect this context:

- **expenses** → Extract expense entries from text or images. Output JSON with action=expense_entry.
- **debtor_book** → Extract debtor notes from text or images. Output JSON with action=debtor_note (or edit_debtor_note if updating).
- **sales_book / restock / product management** → READ-ONLY MODE. You CANNOT record sales, create purchase requests, add new products, or restock items. If asked to do any of these, politely advise the admin to use the manual input buttons in the respective UI tabs.
- **general / no context** → Default mode for answering questions. If extracting data, default to DEBTOR BOOK only.

STRICT LIMITATIONS:
1. **NO SALES**: DO NOT output any action to record a sale or purchase request. 
2. **NO INVENTORY CHANGES**: DO NOT output any action to add products or restock inventory.
3. If the admin asks you to perform an action you are forbidden from doing, kindly remind them of your read-only status for that specific task.

GENERAL QUESTION RULES:
4. If the admin asks a general question about the business, DO NOT OUTPUT JSON. Answer in plain text markdown.
5. If the admin asks you to research a real-world topic, output: {"action": "search", "query": "concept to search"}.
6. When asked about a specific user, provide FULL details: name, contact, join date, spending, activity level, pending requests, and debts.
7. When asked about financials, synthesize data from sales, expenses, restocks, and profit allocations.
8. When calculating total debt, systematically extract monetary amounts from the injected debtor notes and sum them up.
9. When asked about "total items", ALWAYS provide BOTH the Total S/N (transaction count) and Total Quantity (sum of all qty values).
10. ABSOLUTELY NO HALLUCINATION. Only extract or summarize values clearly present in the injected data.

JSON SCHEMA — Debtor Note (creating a new note):
{
  "action": "debtor_note",
  "title": "Debtor Name or Short Title",
  "content": "Full note content about the debt"
}

JSON SCHEMA — Edit Debtor Note (updating an existing note):
{
  "action": "edit_debtor_note",
  "id": "item_id_here",
  "title": "Updated Title",
  "content": "Updated Content"
}

JSON SCHEMA — Delete Debtor Note:
{
  "action": "delete_debtor_note",
  "id": "item_id_here"
}

JSON SCHEMA — Expense Entry (expenses context ONLY):
{
  "action": "expense_entry",
  "title": "Expense description",
  "amount": 5000
}
REMEMBER FOR EXPENSES: amount must be a number. If not clearly stated, ASK the admin before outputting JSON. Ensure JSON is properly formatted without markdown \`\`\` around it.
`;

let aiChatThreads = [];
let currentChatId = null;

window._sendAiSuggested = function(text) {
    const inputField = document.getElementById('aiChatInput');
    const sendBtn = document.getElementById('aiSendBtn');
    if (inputField && sendBtn) {
        inputField.value = text;
        sendBtn.click();
    }
};

async function openAiChat() {
    const container = document.getElementById('modal-container');
    if (!container) return;

    // Capture then clear context so it only applies to this session
    window._aiOpenedFromContext = window._aiPageContext || 'general';
    window._aiPageContext = null;

    fetch('menu-buttons/ai-chat/ai-chat.html?v=' + Date.now())
        .then(res => res.text())
        .then(html => {
            container.innerHTML = html;
            const overlay = document.getElementById('aiChatModalOverlay');
            overlay.style.display = 'flex';
            overlay.offsetHeight;
            setTimeout(() => overlay.classList.add('show'), 10);

            initAiChatLogic();
        })
        .catch(err => {
            console.error('Failed to load AI Chat', err);
        });
}

function initAiChatLogic() {
    const closeBtn = document.getElementById('closeAiChatModal');
    const overlay = document.getElementById('aiChatModalOverlay');
    const sendBtn = document.getElementById('aiSendBtn');
    const micBtn = document.getElementById('aiMicBtn');
    const inputField = document.getElementById('aiChatInput');
    const imageUploadCamera = document.getElementById('aiImageUploadCamera');
    const imageUploadGallery = document.getElementById('aiImageUploadGallery');
    const attachMenuBtn = document.getElementById('aiAttachMenuBtn');
    const attachMenu = document.getElementById('aiAttachMenu');
    const imagePreviewContainer = document.getElementById('aiImagePreviewContainer');
    const imagePreview = document.getElementById('aiImagePreview');
    const removeImageBtn = document.getElementById('aiRemoveImageBtn');
    const historyContainer = document.getElementById('aiChatHistoryContainer');
    const jumpToBottomBtn = document.getElementById('aiJumpToBottomBtn');

    if (historyContainer && jumpToBottomBtn) {
        historyContainer.addEventListener('scroll', () => {
            const isNearBottom = historyContainer.scrollHeight - historyContainer.scrollTop - historyContainer.clientHeight < 100;
            jumpToBottomBtn.style.display = isNearBottom ? 'none' : 'flex';
        });

        jumpToBottomBtn.addEventListener('click', () => {
            scrollToBottom();
        });
    }

    // Adapt to mobile keyboard dynamically
    if (window.visualViewport) {
        const resizeAiChatContainer = () => {
            if (overlay.classList.contains('show')) {
                const modalParams = overlay.querySelector('.ai-chat-modal');
                if (modalParams) {
                    modalParams.style.height = window.visualViewport.height + 'px';
                }
                setTimeout(scrollToBottom, 50);
            }
        };
        window.visualViewport.addEventListener('resize', resizeAiChatContainer);
        window.visualViewport.addEventListener('scroll', resizeAiChatContainer);
        resizeAiChatContainer();
    }

    if (attachMenuBtn && attachMenu) {
        attachMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            attachMenu.style.display = attachMenu.style.display === 'flex' ? 'none' : 'flex';
        });
        document.addEventListener('click', (e) => {
            if (!attachMenu.contains(e.target) && e.target !== attachMenuBtn) {
                attachMenu.style.display = 'none';
            }
        });
    }

    // History Modal
    const toggleHistoryBtn = document.getElementById('aiToggleHistoryBtn');
    const historyModalOverlay = document.getElementById('aiHistoryModalOverlay');
    const historyCloseBtn = document.getElementById('aiHistoryCloseBtn');
    const newChatBtn = document.getElementById('aiNewChatSidebarBtn');
    const searchInput = document.getElementById('aiSidebarSearch');

    const activeChatSearch = document.getElementById('aiActiveChatSearch');
    const activeChatSearchClear = document.getElementById('aiActiveChatSearchClear');
    let activeChatSearchDebounce = null;
    if (activeChatSearch) {
        activeChatSearch.addEventListener('input', () => {
            if (activeChatSearchClear) {
                activeChatSearchClear.style.display = activeChatSearch.value.trim() ? 'flex' : 'none';
            }
            clearTimeout(activeChatSearchDebounce);
            activeChatSearchDebounce = setTimeout(() => {
                const query = activeChatSearch.value.trim();
                if (query) {
                    renderActiveThread(false, true); // scroll to first match
                } else {
                    renderActiveThread(false, false);
                }
            }, 250);
        });
    }
    if (activeChatSearchClear) {
        activeChatSearchClear.addEventListener('click', () => {
            let anchorMsgId = null;
            if (historyContainer) {
                const messages = historyContainer.querySelectorAll('.ai-message');
                const containerRect = historyContainer.getBoundingClientRect();
                for (const msg of messages) {
                    const rect = msg.getBoundingClientRect();
                    if (msg.id && rect.bottom >= containerRect.top && rect.top <= containerRect.bottom) {
                        anchorMsgId = msg.id;
                        break;
                    }
                }
            }

            if (activeChatSearch) activeChatSearch.value = '';
            activeChatSearchClear.style.display = 'none';
            renderActiveThread(false, false, anchorMsgId);
        });
    }

    let currentImageBase64 = null;

    closeBtn.addEventListener('click', () => {
        try {
            if (inputField) inputField.blur();
            currentChatId = null; // Clear so reopening starts a new chat and empty thread is discarded
            saveActiveHistory();
            overlay.classList.remove('show');
            if (typeof window.clearAdminModalPersistence === 'function') {
                window.clearAdminModalPersistence();
            }
            setTimeout(() => {
                try { overlay.remove(); } catch (e) { /* ignore */ }
            }, 300);
        } catch (e) {
            console.error('[AI Chat] close error', e);
            if (overlay) {
                try { overlay.classList.remove('show'); } catch (e2) { /* ignore */ }
                setTimeout(() => { try { overlay.remove(); } catch (e3) { /* ignore */ } }, 300);
            }
        }
    });

    toggleHistoryBtn.addEventListener('click', () => {
        historyModalOverlay.style.display = 'flex';
        renderSidebar(searchInput ? searchInput.value : '');
    });
    historyCloseBtn.addEventListener('click', () => {
        historyModalOverlay.style.display = 'none';
    });
    historyModalOverlay.addEventListener('click', (e) => {
        // Only allow close via button
    });

    newChatBtn.addEventListener('click', () => {
        createNewThread();
        historyModalOverlay.style.display = 'none';
    });

    // Fallback: delegated click handler in case the button is re-rendered or event lost
    document.addEventListener('click', (e) => {
        try {
            const btn = e.target.closest ? e.target.closest('#aiNewChatSidebarBtn') : null;
            if (btn) {
                e.stopPropagation();
                createNewThread();
                if (historyModalOverlay) historyModalOverlay.style.display = 'none';
            }
        } catch (err) { /* ignore */ }
    });

    // Expose a global helper to create a new chat programmatically
    window.createNewAiThread = function () {
        try {
            createNewThread();
            if (historyModalOverlay) historyModalOverlay.style.display = 'none';
        } catch (e) { console.error('createNewAiThread error', e); }
    };

    let sidebarSearchDebounce = null;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(sidebarSearchDebounce);
        sidebarSearchDebounce = setTimeout(() => {
            renderSidebar(e.target.value);
        }, 200);
    });

    // Image Cropper
    const cropperOverlay = document.getElementById('aiCropperOverlay');
    const cropperImage = document.getElementById('aiCropperImage');
    const cropCancelBtn = document.getElementById('aiCropCancelBtn');
    const cropRotateLeftBtn = document.getElementById('aiCropRotateLeftBtn');
    const cropRotateRightBtn = document.getElementById('aiCropRotateRightBtn');
    const cropResetBtn = document.getElementById('aiCropResetBtn');
    const cropUndoBtn = document.getElementById('aiCropUndoBtn');
    const cropRedoBtn = document.getElementById('aiCropRedoBtn');
    const cropConfirmBtn = document.getElementById('aiCropConfirmBtn');

    let cropperInstance = null;
    let originalImageSrc = null;
    let cropperRotation = 0;
    let undoStack = [];
    let redoStack = [];
    let isRestoringState = false;
    let zoomSaveTimer = null;

    function updateUndoRedoButtons() {
        if (cropUndoBtn) {
            cropUndoBtn.disabled = undoStack.length === 0;
            cropUndoBtn.style.opacity = undoStack.length === 0 ? '0.35' : '1';
            cropUndoBtn.style.pointerEvents = undoStack.length === 0 ? 'none' : 'auto';
        }
        if (cropRedoBtn) {
            cropRedoBtn.disabled = redoStack.length === 0;
            cropRedoBtn.style.opacity = redoStack.length === 0 ? '0.35' : '1';
            cropRedoBtn.style.pointerEvents = redoStack.length === 0 ? 'none' : 'auto';
        }
    }

    function getCropperFullState() {
        if (!cropperInstance) return null;
        return {
            canvasData: cropperInstance.getCanvasData(),
            cropBoxData: cropperInstance.getCropBoxData(),
            data: cropperInstance.getData(),
            imageData: cropperInstance.getImageData()
        };
    }

    function restoreCropperState(state) {
        if (!cropperInstance || !state) return;
        isRestoringState = true;

        // Restore rotation first via setData (it carries the rotate property)
        cropperInstance.rotateTo(state.data.rotate || 0);

        // Wait for Cropper.js to settle after rotation change
        requestAnimationFrame(() => {
            // Set canvas data (this controls zoom & pan position)
            cropperInstance.setCanvasData(state.canvasData);

            requestAnimationFrame(() => {
                // Restore crop box position & size
                cropperInstance.setCropBoxData(state.cropBoxData);

                requestAnimationFrame(() => {
                    // Finally apply precise crop coordinates
                    cropperInstance.setData(state.data);
                    isRestoringState = false;
                    updateUndoRedoButtons();
                });
            });
        });
    }

    function saveCropperState() {
        if (!cropperInstance || isRestoringState) return;
        undoStack.push(getCropperFullState());
        redoStack = [];
        updateUndoRedoButtons();
    }

    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (attachMenu) attachMenu.style.display = 'none';

        const reader = new FileReader();
        reader.onload = (event) => {
            originalImageSrc = event.target.result;
            cropperImage.src = event.target.result;
            cropperOverlay.style.display = 'flex';
            cropperRotation = 0;
            undoStack = [];
            redoStack = [];
            isRestoringState = false;
            updateUndoRedoButtons();

            if (cropperInstance) cropperInstance.destroy();

            setTimeout(() => {
                cropperInstance = new Cropper(cropperImage, {
                    viewMode: 0, dragMode: 'move', autoCropArea: 1,
                    restore: false, guides: true, center: true, highlight: false,
                    cropBoxMovable: true, toggleDragModeOnDblclick: false,
                    zoom: function (e) {
                        // Track scroll-wheel / pinch zoom in undo stack
                        if (isRestoringState) return;
                        // Debounce: save state only once per zoom gesture
                        if (!zoomSaveTimer) {
                            // Save the state BEFORE this zoom applies
                            const preZoomState = getCropperFullState();
                            if (preZoomState) {
                                undoStack.push(preZoomState);
                                redoStack = [];
                                updateUndoRedoButtons();
                            }
                        }
                        clearTimeout(zoomSaveTimer);
                        zoomSaveTimer = setTimeout(() => {
                            zoomSaveTimer = null;
                        }, 300);
                    }
                });
            }, 50);
        };
        reader.readAsDataURL(file);
    }

    if (imageUploadCamera) imageUploadCamera.addEventListener('change', handleImageUpload);
    if (imageUploadGallery) imageUploadGallery.addEventListener('change', handleImageUpload);

    cropCancelBtn.addEventListener('click', () => {
        if (cropperInstance) cropperInstance.destroy();
        cropperOverlay.style.display = 'none';
        if (imageUploadCamera) imageUploadCamera.value = '';
        if (imageUploadGallery) imageUploadGallery.value = '';
        isRestoringState = false;
        clearTimeout(zoomSaveTimer);
        zoomSaveTimer = null;
    });

    cropRotateLeftBtn.addEventListener('click', () => {
        if (cropperInstance) {
            saveCropperState();
            cropperInstance.rotate(-90);
            // After rotation, wait for Cropper.js to settle then auto-fit the crop box
            setTimeout(() => {
                if (cropperInstance) {
                    const canvasData = cropperInstance.getCanvasData();
                    cropperInstance.setCropBoxData({
                        left: canvasData.left,
                        top: canvasData.top,
                        width: canvasData.width,
                        height: canvasData.height
                    });
                }
            }, 50);
        }
    });

    cropRotateRightBtn.addEventListener('click', () => {
        if (cropperInstance) {
            saveCropperState();
            cropperInstance.rotate(90);
            // After rotation, wait for Cropper.js to settle then auto-fit the crop box
            setTimeout(() => {
                if (cropperInstance) {
                    const canvasData = cropperInstance.getCanvasData();
                    cropperInstance.setCropBoxData({
                        left: canvasData.left,
                        top: canvasData.top,
                        width: canvasData.width,
                        height: canvasData.height
                    });
                }
            }, 50);
        }
    });

    cropResetBtn.addEventListener('click', () => {
        if (cropperInstance) {
            saveCropperState();
            cropperInstance.reset();
            cropperInstance.rotateTo(0);
            cropperInstance.scale(1, 1);
        }
    });

    cropUndoBtn.addEventListener('click', () => {
        if (cropperInstance && undoStack.length) {
            // Save current state to redo stack
            const currentState = getCropperFullState();
            if (currentState) redoStack.push(currentState);

            const prev = undoStack.pop();
            restoreCropperState(prev);
        }
    });

    cropRedoBtn.addEventListener('click', () => {
        if (cropperInstance && redoStack.length) {
            // Save current state to undo stack
            const currentState = getCropperFullState();
            if (currentState) undoStack.push(currentState);

            const next = redoStack.pop();
            restoreCropperState(next);
        }
    });

    cropConfirmBtn.addEventListener('click', () => {
        if (!cropperInstance) return;
        const canvas = cropperInstance.getCroppedCanvas({ maxWidth: 1024, maxHeight: 1024 });
        currentImageBase64 = canvas.toDataURL('image/jpeg', 0.8);
        imagePreview.src = currentImageBase64;
        imagePreviewContainer.style.display = 'block';
        cropperInstance.destroy();
        cropperOverlay.style.display = 'none';
        if (imageUploadCamera) imageUploadCamera.value = '';
        if (imageUploadGallery) imageUploadGallery.value = '';
    });

    removeImageBtn.addEventListener('click', () => {
        currentImageBase64 = null;
        imagePreview.src = '';
        imagePreviewContainer.style.display = 'none';
        if (imageUploadCamera) imageUploadCamera.value = '';
        if (imageUploadGallery) imageUploadGallery.value = '';
    });

    // Send Logic
    sendBtn.addEventListener('click', () => handleSend());

    // Speech-to-Text Logic
    if (micBtn) {
        let recognition = null;
        let isListening = false;
        let wantToListen = false;      // true while user wants mic on (toggled by button)
        let collectedTranscript = '';  // all finalized text accumulated across restarts
        let prefixText = '';           // text already in input before mic started
        let silenceTimer = null;       // 5-second silence auto-stop timer
        const SILENCE_TIMEOUT = 5000;  // ms of silence before auto-stop

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognition = new SpeechRecognition();
            recognition.continuous = false;   // single-utterance mode — prevents duplication
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            function resetSilenceTimer() {
                clearTimeout(silenceTimer);
                silenceTimer = setTimeout(() => {
                    // 5 seconds of silence — auto-stop
                    if (wantToListen) {
                        wantToListen = false;
                        try { recognition.stop(); } catch(e) {}
                    }
                }, SILENCE_TIMEOUT);
            }

            function startListening() {
                wantToListen = true;
                prefixText = inputField.value;
                collectedTranscript = '';
                try { recognition.start(); } catch(e) {}
                resetSilenceTimer();
            }

            function stopListening() {
                wantToListen = false;
                clearTimeout(silenceTimer);
                try { recognition.stop(); } catch(e) {}
            }

            recognition.onstart = () => {
                isListening = true;
                micBtn.classList.add('listening');
            };

            recognition.onresult = (event) => {
                let interimTranscript = '';
                let sessionFinal = '';

                for (let i = 0; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        sessionFinal += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }

                // Reset silence timer — user is still speaking
                resetSilenceTimer();

                // Build the display text
                const base = (prefixText + ' ' + collectedTranscript).trim();
                if (sessionFinal) {
                    // Preview: base + this session's final + interim
                    inputField.value = (base + ' ' + sessionFinal + ' ' + interimTranscript).trim();
                } else {
                    // Only interim so far in this session
                    inputField.value = (base + ' ' + interimTranscript).trim();
                }

                // Adjust height dynamically
                inputField.style.height = '50px';
                inputField.style.height = (inputField.scrollHeight < 250 ? inputField.scrollHeight : 250) + 'px';
            };

            recognition.onerror = (event) => {
                console.error('Speech recognition error', event.error);
                // 'no-speech' is normal — just means silence, let auto-restart handle it
                if (event.error === 'no-speech') return;
                // For other errors, stop fully
                wantToListen = false;
                clearTimeout(silenceTimer);
                isListening = false;
                micBtn.classList.remove('listening');
            };

            recognition.onend = () => {
                isListening = false;

                // Collect whatever was finalized in this session
                // (inputField already has it, so extract what was added)
                const currentText = inputField.value.trim();
                const base = (prefixText + ' ' + collectedTranscript).trim();
                if (currentText.length > base.length) {
                    // The extra portion is what this session produced (final text)
                    const newPart = currentText.substring(base.length).trim();
                    if (newPart) {
                        collectedTranscript = (collectedTranscript + ' ' + newPart).trim();
                    }
                }

                if (wantToListen) {
                    // Auto-restart for next utterance (simulates continuous mode)
                    try { recognition.start(); } catch(e) {
                        // Small delay if start fails (browser may need a moment)
                        setTimeout(() => {
                            if (wantToListen) {
                                try { recognition.start(); } catch(e2) {}
                            }
                        }, 100);
                    }
                } else {
                    micBtn.classList.remove('listening');
                    clearTimeout(silenceTimer);
                }
            };

            micBtn.addEventListener('click', () => {
                if (isListening || wantToListen) {
                    stopListening();
                } else {
                    startListening();
                }
            });
        } else {
            micBtn.addEventListener('click', () => {
                alert('Speech Recognition API is not supported in this browser.');
            });
        }
    }

    inputField.addEventListener('input', function () {
        this.style.height = '50px'; // Reset to base to calculate true scrollHeight
        const maxHeight = window.innerHeight * 0.4 || 250; 
        this.style.height = (this.scrollHeight < maxHeight ? this.scrollHeight : maxHeight) + 'px';
        if (this.value === '') this.style.height = '50px';
    });

    async function handleSend(isEdit = false, spliceIndex = null) {
        let text = inputField.value.trim();
        if (!text && !currentImageBase64 && !isEdit) return;

        inputField.style.height = '50px';

        let activeThread = aiChatThreads.find(t => t.id === currentChatId);
        if (!activeThread) {
            if (aiChatThreads.length === 0) createNewThread();
            else {
                const bestId = pickBestThreadId();
                if (bestId) switchThread(bestId);
            }
            activeThread = aiChatThreads.find(t => t.id === currentChatId);
        }
        if (!activeThread) return;

        if (isEdit && spliceIndex !== null) {
            // Wiping messages from edit point onwards
            activeThread.messages.splice(spliceIndex);
            renderActiveThread();
        }

        // Auto title
        if (activeThread.title === 'New Chat' && text) {
            activeThread.title = text.substring(0, 25) + (text.length > 25 ? '...' : '');
        }

        const msgImgBase64 = currentImageBase64;

        // Clear the default welcome message if this is the first message in the thread
        if (activeThread.messages.length === 0 && historyContainer) {
            historyContainer.innerHTML = '';
        }

        // Push user message directly so it renders
        addUserMessageToUI(text, msgImgBase64, activeThread.messages.length);

        activeThread.messages.push({
            role: "user",
            content: text || "Please extract details from this image.",
            imageBase64: msgImgBase64,
            isPinned: false
        });
        activeThread.updatedAt = Date.now();
        saveActiveHistory();

        const typingId = showTypingIndicator();

        // Clear inputs immediately
        inputField.value = '';
        currentImageBase64 = null;
        imagePreviewContainer.style.display = 'none';
        sendBtn.disabled = true;

        let contentArray = [];
        if (text) contentArray.push({ type: "text", text: text });
        else contentArray.push({ type: "text", text: "Please extract the product details from this image." });

        if (msgImgBase64) {
            contentArray.push({ type: "image_url", image_url: { url: msgImgBase64 } });
        }

        try {
            // === Gather ALL store data for the AI ===
            const dbSales = JSON.parse(localStorage.getItem('nd_sales_history') || '[]').slice(0, 100);
            const dbUsers = JSON.parse(localStorage.getItem('nd_users') || '[]').filter(u => !u.is_admin);
            const dbProducts = typeof adminProducts !== 'undefined' ? adminProducts : JSON.parse(localStorage.getItem('nd_products_data') || '[]');
            const dbProgress = JSON.parse(localStorage.getItem('nd_progress_data') || '[]').slice(0, 30);
            const dbDebtorNotes = JSON.parse(localStorage.getItem('nd_debtor_notes') || '[]');
            const dbRestockHistory = JSON.parse(localStorage.getItem('nd_restock_history') || '[]').slice(0, 100);
            const dbPayoutRate = localStorage.getItem('nd_payout_rate') || '2';
            const dbRequests = JSON.parse(localStorage.getItem('nd_requests_data') || '[]').slice(0, 100);
            const dbMessages = JSON.parse(localStorage.getItem('nd_messages') || '[]').slice(0, 50);
            const dbExpensesNotebook = JSON.parse(localStorage.getItem('nd_expenses_notebook') || '[]');
            const dbMaintenanceMode = localStorage.getItem('nd_maintenance_mode') === 'true';
            const dbLastBackupDate = localStorage.getItem('nd_last_backup_date') || 'Never';

            // Customer Insights / Last Seen Data
            const dbLastSeenData = JSON.parse(localStorage.getItem('nd_user_last_seen') || '{}');

            // Compute total amount in debtor notes using a simple regex since they are free-form text
            let totalDebtorsAmount = 0;
            dbDebtorNotes.forEach(note => {
                const matches = (note.content || '').match(/(?:₦|N|NGN|naira)\s*([\d,]+\.?\d*)/gi);
                if (matches) {
                    matches.forEach(m => {
                        const num = parseFloat(m.replace(/[^\d.]/g, ''));
                        if (!isNaN(num)) totalDebtorsAmount += num;
                    });
                }
            });

            // Community Chat Data
            const dbCommMessages = JSON.parse(localStorage.getItem('nd_comm_messages') || '[]').filter(m => m.deletedFor !== 'all').slice(-100);
            const dbCommSettings = JSON.parse(localStorage.getItem('nd_comm_settings') || '{"isLocked":false,"allowedPinning":"admin","bannedUsers":[]}');

            // Load ACTUAL saved income allocations (admin may have customized them)
            const defaultAllocations = [
                { name: "Personal income", percent: 20 },
                { name: "Expenses", percent: 15 },
                { name: "Savings", percent: 15 },
                { name: "Emergency funds", percent: 10 },
                { name: "Reinvestment fund", percent: 30 },
                { name: "Net profit", percent: 10 }
            ];
            let dbIncomeAllocations = defaultAllocations;
            try {
                const savedAllocations = localStorage.getItem('nd_income_allocations');
                if (savedAllocations) dbIncomeAllocations = JSON.parse(savedAllocations);
            } catch (e) { }

            // Build enriched user profiles with computed spending, payout, and activity data
            const enrichedUsers = dbUsers.map(u => {
                const userSales = dbSales.filter(s => s.customerID === u.id);
                let totalSpending = 0, totalPayout = 0, itemsBought = 0;
                let payoutPurchaseCount = 0, payoutPurchaseTotal = 0;
                userSales.forEach(s => {
                    totalSpending += parseFloat(s.price || (s.qty * s.unitPrice)) || 0;
                    totalPayout += parseFloat(s.payout) || 0;
                    itemsBought += parseInt(s.qty) || 1;
                    if (s.type === 'Payout Purchase') {
                        payoutPurchaseCount++;
                        payoutPurchaseTotal += parseFloat(s.price || (s.qty * s.unitPrice)) || 0;
                    }
                });
                const userRequests = dbRequests.filter(r => r.userId === u.id || (r.user && r.user.id === u.id));
                const pendingRequests = userRequests.filter(r => r.status === 'Pending').length;

                // Customer Insights: last seen & activity level
                const userLastSeen = dbLastSeenData[u.id] || null;
                let activityPercent = 0;
                let isActive = false;
                let lastSeenText = 'Never';
                if (typeof computeUserActivity === 'function') {
                    const activity = computeUserActivity(u.id, dbSales);
                    activityPercent = activity.percent;
                    isActive = activity.isActive;
                }
                if (userLastSeen) {
                    const seenDiff = Date.now() - new Date(userLastSeen).getTime();
                    const seenSec = Math.floor(seenDiff / 1000);
                    const seenMin = Math.floor(seenSec / 60);
                    const seenHr = Math.floor(seenMin / 60);
                    const seenDays = Math.floor(seenHr / 24);
                    if (seenSec < 10) lastSeenText = 'Active now';
                    else if (seenSec < 60) lastSeenText = seenSec + 's ago';
                    else if (seenMin < 60) lastSeenText = seenMin + 'm ago';
                    else if (seenHr < 24) lastSeenText = seenHr + 'h ago';
                    else if (seenDays === 1) lastSeenText = 'Yesterday';
                    else if (seenDays < 7) lastSeenText = seenDays + 'd ago';
                    else if (seenDays < 30) lastSeenText = Math.floor(seenDays / 7) + 'w ago';
                    else if (seenDays < 365) lastSeenText = Math.floor(seenDays / 30) + 'mo ago';
                    else lastSeenText = '1y+ ago';
                }

                return {
                    ...u,
                    totalSpending,
                    totalPayout,
                    itemsBought,
                    totalRequests: userRequests.length,
                    pendingRequests,
                    payoutPurchaseCount,
                    payoutPurchaseTotal,
                    lastSeen: lastSeenText,
                    lastSeenTimestamp: userLastSeen,
                    activityPercent,
                    isActive
                };
            });

            // Compute financial summary
            const totalRevenue = dbSales.reduce((sum, s) => sum + (parseFloat(s.price || (s.qty * s.unitPrice)) || 0), 0);
            const totalPayoutsGiven = dbSales.reduce((sum, s) => sum + (parseFloat(s.payout) || 0), 0);
            const totalRestockExpenses = dbProducts.filter(p => !p.cleared && !p.isDeleted).reduce((sum, p) => sum + (parseFloat(p.purchaseCost) || 0), 0);
            const totalNotebookExpenses = dbExpensesNotebook.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
            const pendingRequestsCount = dbRequests.filter(r => r.status === 'Pending').length;

            // Compute the two types of total items
            const totalSN = dbSales.length; // Total S/N = number of individual sale entries
            const totalQuantity = dbSales.reduce((sum, s) => sum + (parseInt(s.qty) || 1), 0); // Total Quantity = sum of all qty

            // Also compute today's totals for quick reference
            const today = new Date();
            const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const todayDay = String(today.getDate()).padStart(2, '0');
            const todayMonth = shortMonths[today.getMonth()];
            const todayYear = String(today.getFullYear());

            // Compute monthly restock & Profit Allocation Framework. for current month
            const curMonth = today.getMonth();
            const curYear = today.getFullYear();
            const curMonthRestocks = dbRestockHistory.filter(r => {
                const d = new Date(r.date);
                return d.getMonth() === curMonth && d.getFullYear() === curYear;
            });
            const curMonthRestockTotal = curMonthRestocks.reduce((sum, r) => sum + (parseFloat(r.cost) || 0), 0);

            // Compute current month revenue for Profit Allocation Framework.
            const curMonthSales = dbSales.filter(s => {
                const parts = s.date.split(' ');
                if (parts.length < 3) return false;
                const sMonth = parts[1].replace(',', '');
                const sYear = parts[2];
                return sMonth === shortMonths[curMonth] && sYear === String(curYear);
            });
            const curMonthRevenue = curMonthSales.reduce((sum, s) => sum + (parseFloat(s.price || (s.qty * s.unitPrice)) || 0), 0);
            const curMonthNetProfit = curMonthRevenue - curMonthRestockTotal;

            // Profit Allocation Framework. Allocations — use ACTUAL saved allocations
            const incomeStructure = dbIncomeAllocations.map(a => ({
                name: a.name,
                percent: a.percent + '%',
                amount: curMonthNetProfit > 0 ? Math.round((a.percent / 100) * curMonthNetProfit) : 0
            }));

            const todaySales = dbSales.filter(s => {
                const parts = s.date.split(' ');
                if (parts.length < 3) return false;
                const sDay = parts[0].padStart(2, '0');
                const sMonth = parts[1].replace(',', '');
                const sYear = parts[2];
                return sDay === todayDay && sMonth === todayMonth && sYear === todayYear;
            });
            const todaySN = todaySales.length;
            const todayQty = todaySales.reduce((sum, s) => sum + (parseInt(s.qty) || 1), 0);
            const todayRevenue = todaySales.reduce((sum, s) => sum + (parseFloat(s.price || (s.qty * s.unitPrice)) || 0), 0);

            // Build context prefix based on where AI was opened from
            const _pageCtx = window._aiOpenedFromContext || 'general';
            const _contextNames = {
                'debtor_book': 'Debtor Book',
                'expenses': 'Expenses Notebook',
                'sales_book': 'Sales Book',
                'restock': 'Restock Manager (Cost of Goods)',
                'profit_allocation': 'Profit Allocation Framework',
                'general': 'General (Admin Panel)'
            };
            const _contextLabel = _contextNames[_pageCtx] || 'General (Admin Panel)';
            const _contextDirective = _pageCtx !== 'general'
                ? `\nCURRENT PAGE CONTEXT: ${_pageCtx}\nThe admin opened AI from the ${_contextLabel} page. Route all save actions to that book only.\n`
                : `\nCURRENT PAGE CONTEXT: general\nDefault mode — only extract to Register or Debtor Book.\n`;

            // Clean/strip heavy base64 data to avoid payload/token limit failures (400 Bad Request)
            const cleanEnrichedUsers = enrichedUsers.map(u => ({
                id: u.id,
                firstName: u.firstName,
                lastName: u.lastName,
                phone: u.phone,
                email: u.email,
                state: u.state,
                localGovernment: u.localGovernment || u.lga,
                isActive: u.isActive,
                lastSeen: u.lastSeen,
                activityPercent: u.activityPercent,
                payoutBalance: u.payoutBalance
            }));

            const cleanSales = dbSales.map(s => ({
                item: s.item,
                qty: s.qty,
                price: s.price,
                unitPrice: s.unitPrice,
                date: s.date,
                customerID: s.customerID,
                customerName: s.customerName
            }));

            const cleanProducts = dbProducts.map(p => ({
                name: p.name,
                price: p.price,
                cost: p.cost,
                profit: p.profit,
                unit: p.unit,
                category: p.category
            }));

            const cleanProgress = dbProgress.map(p => {
                const { receipt, image, imageData, imageBase64, ...rest } = p;
                return rest;
            });

            const cleanRestock = dbRestockHistory.map(r => ({
                id: r.id,
                item: r.item,
                qty: r.qty,
                cost: r.cost,
                date: r.date
            }));

            const cleanRequests = dbRequests.map(r => ({
                id: r.id,
                status: r.status,
                productName: r.productName,
                qty: r.qty,
                unitPrice: r.unitPrice,
                total: r.total,
                userName: r.user ? r.user.name : (r.customerName || '')
            }));

            const cleanMessages = dbMessages.map(m => ({
                id: m.id,
                sender: m.sender,
                recipient: m.recipient,
                text: m.text,
                timestamp: m.timestamp,
                read: m.read
            }));

            const injectedPrompt = SYSTEM_PROMPT + _contextDirective + `\n\n--- INJECTED STORE CONTEXT ---\n
FINANCIAL SUMMARY:
- Total Revenue (All Time): ₦${totalRevenue.toLocaleString()}
- Total Payouts Given: ₦${totalPayoutsGiven.toLocaleString()}
- Total Cost of Goods: ₦${totalRestockExpenses.toLocaleString()}
- Current Payout Rate: ${dbPayoutRate}%
- Pending Requests: ${pendingRequestsCount}
- Total Users: ${dbUsers.length}
- Active Users (≥50% activity): ${enrichedUsers.filter(u => u.isActive).length}
- Inactive Users (<50% activity): ${enrichedUsers.filter(u => !u.isActive).length}
- Users Online Now: ${enrichedUsers.filter(u => u.lastSeen === 'Active now').length}
- Total Products in Register: ${dbProducts.length}
- Total Debtor Notes: ${dbDebtorNotes.length} (Estimated Total Vault: ₦${totalDebtorsAmount.toLocaleString()})
- Total Notebook Expenses (All Time): ₦${totalNotebookExpenses.toLocaleString()}
- Expense Entries Count: ${dbExpensesNotebook.length}
- Total Payout Purchases: ${dbSales.filter(s => s.type === 'Payout Purchase').length} transactions
- Total Payout Purchase Value: ₦${dbSales.filter(s => s.type === 'Payout Purchase').reduce((sum, s) => sum + (parseFloat(s.price || (s.qty * s.unitPrice)) || 0), 0).toLocaleString()}
- Maintenance Mode: ${dbMaintenanceMode ? 'ON (store is in maintenance)' : 'OFF (store is live)'}
- Last System Backup: ${dbLastBackupDate}
- Community Messages: ${dbCommMessages.length}
- Community Locked: ${dbCommSettings.isLocked ? 'Yes' : 'No'}
- Muted Users: ${dbCommSettings.bannedUsers.length}

TOTAL ITEMS (ALL TIME):
- Total S/N (Transaction Count): ${totalSN}
- Total Quantity (Sum of all qty): ${totalQuantity}
- Displayed as: ${totalSN} / ${totalQuantity}

TODAY'S SUMMARY (${todayDay} ${todayMonth}, ${todayYear}):
- Today's S/N (Transactions): ${todaySN}
- Today's Quantity (Items Sold): ${todayQty}
- Today's Revenue: ₦${todayRevenue.toLocaleString()}
- Today's Total Items: ${todaySN} / ${todayQty}

USERS (Full Profiles + Computed Data):
(Format: id, firstName, lastName, phone, email, state, localGovernment, isActive, lastSeen, activityPercent, payoutBalance. Represents registered customers.)
${JSON.stringify(cleanEnrichedUsers)}

SALES HISTORY (Last 100):
(Format: item = product sold, qty = quantity, price = total price for this qty, unitPrice = price per item, date, customerID = who bought it.)
${JSON.stringify(cleanSales)}

PRODUCTS/REGISTER:
(Format: name = exact product name, price = selling price per unit, cost = wholesale cost per unit, profit = gross profit per unit, unit = measurement scale, category = product group)
${JSON.stringify(cleanProducts)}

PROGRESS DATA:
${JSON.stringify(cleanProgress)}

DEBTOR BOOK NOTES:
(Format: id, title = debtor name/identifier, content = details of the debt, isPinned)
${JSON.stringify(dbDebtorNotes)}

RESTOCK HISTORY (Last 100):
(Format: id, item = product restocked, qty = quantity added, cost = total cost paid for this restock, date)
${JSON.stringify(cleanRestock)}

FINANCIAL SETTINGS:
- Payout Rate: ${dbPayoutRate}%

REQUESTS (Last 100):
(Format: id, status, productName, qty, unitPrice, total, user.name = requester)
${JSON.stringify(cleanRequests)}

MESSAGES (Last 50):
${JSON.stringify(cleanMessages)}

EXPENSES NOTEBOOK (All Expenses):
${JSON.stringify(dbExpensesNotebook)}
Note: Each expense has: id, title, amount, dateStr, timestamp, year, monthIdx

PROFIT ALLOCATION FRAMEWORK. (Current Month: ${todayMonth} ${todayYear}):
- Total Revenue This Month: ₦${curMonthRevenue.toLocaleString()}
- Total Cost of Goods This Month: ₦${curMonthRestockTotal.toLocaleString()}
- Gross Profit This Month: ₦${curMonthNetProfit.toLocaleString()}
- Allocation Breakdown (only applies when gross profit > 0):
${JSON.stringify(incomeStructure)}
- Raw Allocation Categories (admin-customized): ${JSON.stringify(dbIncomeAllocations)}
- Note: These categories are set by the admin and may differ from defaults. Always use these ACTUAL values.

SYSTEM STATUS:
- Maintenance Mode: ${dbMaintenanceMode ? 'ENABLED — Store is currently in maintenance mode, no new orders accepted' : 'DISABLED — Store is live and operational'}
- Last System Backup: ${dbLastBackupDate}

SALES BOOK INFO:
- The Sales Book presents daily breakdowns of sales (same data as SALES HISTORY but organized by day).
- When asked about a specific day's sales, filter SALES HISTORY by that date.
- Monthly totals can be computed by summing all sales entries for a given month.

COMMUNITY CHAT (Last 100 messages):
${JSON.stringify(dbCommMessages.map(m => ({ id: m.id, sender: m.senderName, senderId: m.senderId, type: m.type, content: m.content, timestamp: m.timestamp, isPinned: m.isPinned, replyTo: m.replyTo, pollOptions: m.type === 'poll' && m.extraData ? m.extraData.options.map(o => ({ text: o.text, votes: (o.voters || []).length })) : undefined })))}
Note: Message types include 'text', 'image', 'video', 'audio', 'document', 'poll', 'announcement', 'system'.

COMMUNITY SETTINGS:
- Locked: ${dbCommSettings.isLocked ? 'Yes (only admin can send)' : 'No (everyone can send)'}
- Pinning: ${dbCommSettings.allowedPinning === 'admin' ? 'Admin only' : 'Everyone'}
- Muted/Banned Users: ${dbCommSettings.bannedUsers.length > 0 ? JSON.stringify(dbCommSettings.bannedUsers) : 'None'}

CUSTOMER INSIGHTS (Activity & Last Seen):
- Each user above includes: lastSeen (relative text), lastSeenTimestamp (ISO), activityPercent (0-100), isActive (true if ≥50%), payoutPurchaseCount, payoutPurchaseTotal.
- Activity % is based on patronage frequency (buying in distinct months over 12 months) and recency of last visit.
- Active threshold: 50%+. Users with 80%+ are highly engaged, 20%- are at risk.
- "Active now" means user's browser is currently open on the store.

PAYOUT PURCHASES:
- Identified by type: 'Payout Purchase' in SALES HISTORY.
- Payout purchases have negative payout values (balance deductions).
- You can tell the admin who used their payout, how much was spent, and what items were bought.

-----------------------------\n`;

            const apiMessages = [
                { role: "system", content: injectedPrompt }
            ];

            // Push purely the structural format needed for xAI (strip imageBase64 internal tracking logic)
            activeThread.messages.forEach((m, i) => {
                if (i === activeThread.messages.length - 1) return; // Skip last, added manually
                apiMessages.push({ role: m.role, content: m.content });
            });
            apiMessages.push({ role: "user", content: contentArray });

            async function fetchXAI(messages) {
                const res = await fetch(`${window.API_BASE}/api/ai-chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('nd_token') || ''}` },
                    body: JSON.stringify({ model: XAI_MODEL, messages: messages, temperature: 0.1 })
                });
                const responseData = await res.json();
                if (responseData.success && responseData.data && responseData.data.choices && responseData.data.choices.length > 0) {
                    return responseData.data.choices[0].message.content.trim();
                }
                if (responseData.error) {
                    throw new Error(responseData.error.message || 'API error: ' + JSON.stringify(responseData.error));
                }
                throw new Error("Invalid API response: " + JSON.stringify(responseData));
            }

            let rawContent = await fetchXAI(apiMessages);

            // Strip out <think> blocks from reasoning models
            rawContent = rawContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

            // Research intercepts
            const searchStart = rawContent.indexOf('{');
            const searchEnd = rawContent.lastIndexOf('}');
            if (searchStart !== -1 && searchEnd !== -1) {
                try {
                    const jsonText = rawContent.substring(searchStart, searchEnd + 1);
                    const extracted = JSON.parse(jsonText);
                    if (extracted.action === 'search' && extracted.query) {
                        const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(extracted.query)}&utf8=&format=json&origin=*`;
                        const wikiRes = await fetch(wikiUrl);
                        const wikiData = await wikiRes.json();
                        const snippets = wikiData.query.search.slice(0, 3).map(s => s.snippet.replace(/<\/?[^>]+(>|$)/g, "")).join('\\n---\\n');

                        apiMessages.push({ role: "assistant", content: rawContent });
                        apiMessages.push({ role: "system", content: "WEB SEARCH RESULTS:\\n" + snippets + "\\n\\nPlease use these facts to write an excellent natural language response immediately. Answer the user's original request directly based on these facts. Do not output json." });

                        rawContent = await fetchXAI(apiMessages);
                    }
                } catch (e) { }
            }

            removeTypingIndicator(typingId);
            sendBtn.disabled = false;

            activeThread.messages.push({ role: "assistant", content: rawContent, isPinned: false });
            activeThread.updatedAt = Date.now();
            saveActiveHistory();

            renderActiveThread(); // Re-render to show the JSON properly

        } catch (error) {
            console.error('AI Chat Error:', error);
            removeTypingIndicator(typingId);
            sendBtn.disabled = false;
            addSystemMessageToUI("Sorry, I encountered an error: " + (error.message || "Unknown error. Please try again."));
        }
    }

    function addUserMessageToUI(displayContent, imageBase64, msgIndex, renderOnly = false, isPinned = false, originalContent = null) {
        const div = document.createElement('div');
        div.className = 'ai-message user-msg';
        if (msgIndex !== null && msgIndex !== undefined) {
            div.id = 'ai-msg-' + msgIndex;
        }

        let contentHtml = '';
        if (imageBase64) {
            contentHtml += `<img src="${imageBase64}" alt="Uploaded image" onclick="event.stopPropagation(); window._openAiImagePreview(this.src)" />`;
        }
        if (displayContent) {
            contentHtml += `<span>${displayContent}</span>`;
        }

        const pinIconColor = isPinned ? '#f59e0b' : 'currentColor';
        const pinClass = isPinned ? 'pinned' : '';
        const contentToCopy = originalContent !== null ? originalContent : displayContent;

        // Add Edit feature inline
        div.innerHTML = `
            <div class="user-msg-container">
                <div class="bubble">${contentHtml}</div>
                <div class="user-msg-actions">
                    <button class="user-action-btn edit-msg-btn" title="Edit message">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                        </svg>
                        Edit
                    </button>
                    <button class="user-action-btn copy-msg-btn" title="Copy">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        Copy
                    </button>
                    <button class="user-action-btn retry-msg-btn" title="Retry">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                            <path d="M3 3v5h5"></path>
                        </svg>
                        Retry
                    </button>
                    <button class="user-action-btn pin-msg-btn ${pinClass}" title="${isPinned ? 'Unpin' : 'Pin'}">
                        <svg viewBox="0 0 24 24" fill="${isPinned ? '#f59e0b' : 'none'}" stroke="${pinIconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                            <line x1="12" y1="17" x2="12" y2="22"></line>
                            <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z"></path>
                        </svg>
                        ${isPinned ? 'Pinned' : 'Pin'}
                    </button>
                </div>
            </div>
        `;

        const container = div.querySelector('.user-msg-container');

        div.querySelector('.edit-msg-btn').addEventListener('click', () => {
            let editImgHtml = '';
            if (imageBase64) {
                editImgHtml = `<div style="margin-bottom: 10px;"><img src="${imageBase64}" style="max-height: 100px; border-radius: 8px; border: 1px solid #e2e8f0;"></div>`;
            }
            container.innerHTML = `
                <div class="inline-edit-area">
                    ${editImgHtml}
                    <textarea>${contentToCopy || ''}</textarea>
                    <div class="inline-edit-actions">
                        <button class="inline-edit-cancel">Cancel</button>
                        <button class="inline-edit-save">Save & Resend</button>
                    </div>
                </div>
             `;
            const ta = container.querySelector('textarea');
            container.querySelector('.inline-edit-cancel').addEventListener('click', () => {
                if (ta) ta.blur();
                renderActiveThread(true);
            });
            container.querySelector('.inline-edit-save').addEventListener('click', () => {
                inputField.value = ta.value;
                currentImageBase64 = imageBase64; // preserve original image if any
                handleSend(true, msgIndex);
            });
        });

        div.querySelector('.retry-msg-btn').addEventListener('click', () => {
            inputField.value = contentToCopy || '';
            currentImageBase64 = imageBase64;
            handleSend(true, msgIndex);
        });

        div.querySelector('.pin-msg-btn').addEventListener('click', () => {
            if (window._toggleAiMsgPin) window._toggleAiMsgPin(msgIndex);
        });

        div.querySelector('.copy-msg-btn').addEventListener('click', () => {
            navigator.clipboard.writeText(contentToCopy).catch(() => { });
            const btn = div.querySelector('.copy-msg-btn');
            const originalHtml = btn.innerHTML;
            btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!`;
            setTimeout(() => btn.innerHTML = originalHtml, 1500);
        });

        historyContainer.appendChild(div);
        if (!renderOnly) scrollToBottom();
    }

    function addSystemMessageToUI(displayContent, msgIndex = null, isPinned = false, originalContent = null, renderOnly = false) {
        const div = document.createElement('div');
        div.className = 'ai-message system-msg';
        if (msgIndex !== null && msgIndex !== undefined) {
            div.id = 'ai-msg-' + msgIndex;
        }
        const parsedText = typeof marked !== 'undefined' ? marked.parse(displayContent) : displayContent;

        const pinIconColor = isPinned ? '#f59e0b' : 'currentColor';
        const pinClass = isPinned ? 'pinned' : '';
        const contentToCopy = originalContent !== null ? originalContent : displayContent;

        const actionsHtml = msgIndex !== null ? `
            <div class="sys-msg-actions">
                <button class="sys-action-btn pin-msg-btn ${pinClass}" title="${isPinned ? 'Unpin' : 'Pin'}">
                    <svg viewBox="0 0 24 24" fill="${isPinned ? '#f59e0b' : 'none'}" stroke="${pinIconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                        <line x1="12" y1="17" x2="12" y2="22"></line>
                        <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z"></path>
                    </svg>
                    ${isPinned ? 'Pinned' : 'Pin'}
                </button>
                <button class="sys-action-btn copy-msg-btn" title="Copy">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    Copy
                </button>
            </div>
        ` : '';

        div.innerHTML = `
            <div class="sys-msg-container">
                <div class="bubble">${parsedText}</div>
                ${actionsHtml}
            </div>
        `;

        if (msgIndex !== null) {
            div.querySelector('.pin-msg-btn').addEventListener('click', () => {
                if (window._toggleAiMsgPin) window._toggleAiMsgPin(msgIndex);
            });
            div.querySelector('.copy-msg-btn').addEventListener('click', () => {
                navigator.clipboard.writeText(contentToCopy).catch(() => { });
                const btn = div.querySelector('.copy-msg-btn');
                const originalHtml = btn.innerHTML;
                btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!`;
                setTimeout(() => btn.innerHTML = originalHtml, 1500);
            });
        }

        historyContainer.appendChild(div);
        if (!renderOnly) scrollToBottom();
    }

    function showTypingIndicator() {
        const id = 'typing-' + Date.now();
        const div = document.createElement('div');
        div.className = 'ai-message system-msg';
        div.id = id;
        div.innerHTML = `
            <div class="ai-typing-indicator">
                <div class="ai-typing-dot"></div>
                <div class="ai-typing-dot"></div>
                <div class="ai-typing-dot"></div>
            </div>
        `;
        historyContainer.appendChild(div);
        scrollToBottom();
        return id;
    }

    function removeTypingIndicator(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }



    function addDebtorReviewCardToUI(data) {
        const cardId = 'card-debtor-' + Date.now();
        const div = document.createElement('div');
        div.className = 'ai-message system-msg';
        div.innerHTML = `
            <div class="ai-review-card" id="${cardId}">
                <div class="ai-review-card-header" style="background: #fff8f1; color: #ea580c; border-bottom: 1px solid #ffedd5;">
                    <span>Generated Debtor Note</span>
                </div>
                <div class="ai-review-card-body">
                    <div class="ai-review-row"><span class="ai-review-label">Title/Name</span><span class="ai-review-value" id="val-dtitle-${cardId}">${typeof escapeHtml === 'function' ? escapeHtml(data.title || '-') : (data.title || '-')}</span></div>
                    <div class="ai-review-row" style="margin-top: 4px; border-top: 1px dashed #e2e8f0; padding-top: 8px;">
                        <span class="ai-review-label">Note Details</span>
                        <span class="ai-review-value" id="val-dcontent-${cardId}" style="white-space: pre-wrap; font-size: 13px;">${typeof escapeHtml === 'function' ? escapeHtml(data.content || '-') : (data.content || '-')}</span>
                    </div>
                </div>
                <div class="ai-review-card-actions">
                    <button class="ai-btn-confirm" id="btn-conf-debtor-${cardId}" style="background: #f97316;">Confirm & Add to Debtor Book</button>
                    <button class="ai-btn-edit" id="btn-edit-debtor-${cardId}">Edit Manually</button>
                </div>
            </div>
        `;
        historyContainer.appendChild(div);
        scrollToBottom();

        document.getElementById(`btn-conf-debtor-${cardId}`).addEventListener('click', () => {
            document.getElementById(`btn-conf-debtor-${cardId}`).textContent = 'Added ✔';
            document.getElementById(`btn-conf-debtor-${cardId}`).disabled = true;
            document.getElementById(`btn-edit-debtor-${cardId}`).style.display = 'none';
            pushToDebtorBook(data);
            if (typeof showCustomAlert === 'function') showCustomAlert("Note successfully added to Debtor Book!");
        });

        document.getElementById(`btn-edit-debtor-${cardId}`).addEventListener('click', () => {
            enableDebtorManualEdit(cardId, data);
        });
    }

    function enableDebtorManualEdit(cardId, data) {
        const titleEl = document.getElementById(`val-dtitle-${cardId}`);
        const contentEl = document.getElementById(`val-dcontent-${cardId}`);
        
        const safeTitle = (data.title || '').replace(/"/g, '&quot;');
        titleEl.innerHTML = `<input type="text" id="edit-dtitle-${cardId}" value="${safeTitle}" style="width: 100%; text-align: left;">`;
        contentEl.innerHTML = `<textarea id="edit-dcontent-${cardId}" style="width: 100%; min-height: 80px; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px; font-family: inherit;">${data.content || ''}</textarea>`;
        
        const editBtn = document.getElementById(`btn-edit-debtor-${cardId}`);
        editBtn.textContent = 'Save Changes';
        const newEditBtn = editBtn.cloneNode(true);
        editBtn.parentNode.replaceChild(newEditBtn, editBtn);
        
        newEditBtn.addEventListener('click', () => {
            const newTitle = document.getElementById(`edit-dtitle-${cardId}`).value;
            const newContent = document.getElementById(`edit-dcontent-${cardId}`).value;
            
            titleEl.innerHTML = typeof escapeHtml === 'function' ? escapeHtml(newTitle) : newTitle;
            contentEl.innerHTML = typeof escapeHtml === 'function' ? escapeHtml(newContent).replace(/\n/g, '<br>') : newContent;
            
            data.title = newTitle;
            data.content = newContent;
            
            newEditBtn.textContent = 'Edit Manually';
            const restoreBtn = newEditBtn.cloneNode(true);
            newEditBtn.parentNode.replaceChild(restoreBtn, newEditBtn);
            restoreBtn.addEventListener('click', () => enableDebtorManualEdit(cardId, data));
        });
    }

    function pushToDebtorBook(data) {
        let notes = JSON.parse(localStorage.getItem('nd_debtor_notes') || '[]');
        notes.push({
            id: 'note-' + Date.now(),
            title: data.title || 'Unknown Note',
            content: data.content || '',
            isPinned: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        localStorage.setItem('nd_debtor_notes', JSON.stringify(notes));
    }

    function pushToExpenseNotebook(data) {
        const now = new Date();
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
        const dateStr = `${now.getDate()} ${months[now.getMonth()].substring(0,3)}, ${now.getFullYear()}`;
        let expenses = JSON.parse(localStorage.getItem('nd_expenses_notebook') || '[]');
        expenses.unshift({
            id: 'exp-' + Date.now(),
            title: data.title || 'AI Added Expense',
            amount: Number(data.amount) || 0,
            dateStr,
            timestamp: now.getTime(),
            year: now.getFullYear(),
            monthIdx: now.getMonth()
        });
        localStorage.setItem('nd_expenses_notebook', JSON.stringify(expenses));
    }

    function pushToSalesBook(data) {
        const now = new Date();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        let hours = now.getHours();
        const ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12; hours = hours ? hours : 12;
        const timeStr = `${now.getDate()} ${months[now.getMonth()]}, ${now.getFullYear()} · ${hours}:${now.getMinutes().toString().padStart(2, '0')} ${ampm}`;
        const newSale = {
            date: timeStr,
            item: data.item || 'AI Added Sale',
            qty: Number(data.qty) || 1,
            unitPrice: Number(data.price) || 0,
            price: (Number(data.qty) || 1) * (Number(data.price) || 0),
            unit: 'per piece',
            source: 'AI Assistant'
        };
        let sales = JSON.parse(localStorage.getItem('nd_sales_history') || '[]');
        sales.unshift(newSale);
        localStorage.setItem('nd_sales_history', JSON.stringify(sales));
    }

    function addExpenseReviewCardToUI(data) {
        const cardId = 'card-expense-' + Date.now();
        const div = document.createElement('div');
        div.className = 'ai-message system-msg';
        div.innerHTML = `
            <div class="ai-review-card" id="${cardId}">
                <div class="ai-review-card-header" style="background: #f0fdf4; color: #16a34a; border-bottom: 1px solid #bbf7d0;">
                    <span>Generated Expense Entry</span>
                </div>
                <div class="ai-review-card-body">
                    <div class="ai-review-row"><span class="ai-review-label">Description</span><span class="ai-review-value" id="val-etitle-${cardId}">${typeof escapeHtml === 'function' ? escapeHtml(data.title || '-') : (data.title || '-')}</span></div>
                    <div class="ai-review-row" style="margin-top: 4px; border-top: 1px dashed #e2e8f0; padding-top: 8px;">
                        <span class="ai-review-label">Amount</span>
                        <span class="ai-review-value" id="val-eamt-${cardId}" style="font-weight: 800; color: #16a34a;">&#8358;${Number(data.amount || 0).toLocaleString()}</span>
                    </div>
                </div>
                <div class="ai-review-card-actions">
                    <button class="ai-btn-confirm" id="btn-conf-expense-${cardId}" style="background: #16a34a;">Confirm &amp; Add to Expenses</button>
                    <button class="ai-btn-edit" id="btn-edit-expense-${cardId}">Edit Manually</button>
                </div>
            </div>
        `;
        historyContainer.appendChild(div);
        scrollToBottom();

        document.getElementById(`btn-conf-expense-${cardId}`).addEventListener('click', () => {
            document.getElementById(`btn-conf-expense-${cardId}`).textContent = 'Added ✔';
            document.getElementById(`btn-conf-expense-${cardId}`).disabled = true;
            document.getElementById(`btn-edit-expense-${cardId}`).style.display = 'none';
            pushToExpenseNotebook(data);
            if (typeof showCustomAlert === 'function') showCustomAlert('Expense successfully added to Expenses Notebook!');
        });

        document.getElementById(`btn-edit-expense-${cardId}`).addEventListener('click', () => {
            const titleEl = document.getElementById(`val-etitle-${cardId}`);
            const amtEl = document.getElementById(`val-eamt-${cardId}`);
            const safeTitle = (data.title || '').replace(/"/g, '&quot;');
            titleEl.innerHTML = `<input type="text" id="edit-etitle-${cardId}" value="${safeTitle}" style="width:100%; text-align:left;">`;
            amtEl.innerHTML = `<input type="number" id="edit-eamt-${cardId}" value="${data.amount || 0}" style="width:100%; text-align:right;">`;
            const editBtn = document.getElementById(`btn-edit-expense-${cardId}`);
            editBtn.textContent = 'Save Changes';
            const newEditBtn = editBtn.cloneNode(true);
            editBtn.parentNode.replaceChild(newEditBtn, editBtn);
            newEditBtn.addEventListener('click', () => {
                data.title = document.getElementById(`edit-etitle-${cardId}`).value;
                data.amount = Number(document.getElementById(`edit-eamt-${cardId}`).value) || 0;
                titleEl.innerHTML = typeof escapeHtml === 'function' ? escapeHtml(data.title) : data.title;
                amtEl.innerHTML = `&#8358;${data.amount.toLocaleString()}`;
                newEditBtn.textContent = 'Edit Manually';
                const restoredBtn = newEditBtn.cloneNode(true);
                newEditBtn.parentNode.replaceChild(restoredBtn, newEditBtn);
                restoredBtn.addEventListener('click', () => restoredBtn.click());
            });
        });
    }

    function addSalesEntryReviewCardToUI(data) {
        const cardId = 'card-sale-' + Date.now();
        const total = (Number(data.qty) || 1) * (Number(data.price) || 0);
        const div = document.createElement('div');
        div.className = 'ai-message system-msg';
        div.innerHTML = `
            <div class="ai-review-card" id="${cardId}">
                <div class="ai-review-card-header" style="background: #f0f4f8; color: #8b5cf6; border-bottom: 1px solid #bfdbfe;">
                    <span>Generated Sales Entry</span>
                </div>
                <div class="ai-review-card-body">
                    <div class="ai-review-row"><span class="ai-review-label">Item</span><span class="ai-review-value" id="val-sitem-${cardId}">${typeof escapeHtml === 'function' ? escapeHtml(data.item || '-') : (data.item || '-')}</span></div>
                    <div class="ai-review-row" style="margin-top:4px;"><span class="ai-review-label">Qty</span><span class="ai-review-value" id="val-sqty-${cardId}">${data.qty || 1}</span></div>
                    <div class="ai-review-row" style="margin-top:4px;"><span class="ai-review-label">Unit Price (&#8358;)</span><span class="ai-review-value" id="val-sprice-${cardId}">&#8358;${Number(data.price||0).toLocaleString()}</span></div>
                    <div class="ai-review-row" style="margin-top:4px; border-top:1px dashed #e2e8f0; padding-top:8px;"><span class="ai-review-label">Total</span><span class="ai-review-value" style="font-weight:800; color:#8b5cf6;">&#8358;${total.toLocaleString()}</span></div>
                </div>
                <div class="ai-review-card-actions">
                    <button class="ai-btn-confirm" id="btn-conf-sale-${cardId}" style="background: #8b5cf6;">Confirm &amp; Add to Sales Book</button>
                    <button class="ai-btn-edit" id="btn-edit-sale-${cardId}">Edit Manually</button>
                </div>
            </div>
        `;
        historyContainer.appendChild(div);
        scrollToBottom();

        document.getElementById(`btn-conf-sale-${cardId}`).addEventListener('click', () => {
            document.getElementById(`btn-conf-sale-${cardId}`).textContent = 'Added ✔';
            document.getElementById(`btn-conf-sale-${cardId}`).disabled = true;
            document.getElementById(`btn-edit-sale-${cardId}`).style.display = 'none';
            pushToSalesBook(data);
            if (typeof showCustomAlert === 'function') showCustomAlert('Sale successfully added to Sales Book!');
        });

        document.getElementById(`btn-edit-sale-${cardId}`).addEventListener('click', () => {
            const itemEl = document.getElementById(`val-sitem-${cardId}`);
            const qtyEl = document.getElementById(`val-sqty-${cardId}`);
            const priceEl = document.getElementById(`val-sprice-${cardId}`);
            const safeItem = (data.item || '').replace(/"/g, '&quot;');
            itemEl.innerHTML = `<input type="text" id="edit-sitem-${cardId}" value="${safeItem}" style="width:100%; text-align:left;">`;
            qtyEl.innerHTML = `<input type="number" id="edit-sqty-${cardId}" value="${data.qty || 1}" min="1" style="width:80px;">`;
            priceEl.innerHTML = `<input type="number" id="edit-sprice-${cardId}" value="${data.price || 0}" min="0" style="width:100px;">`;
            const editBtn = document.getElementById(`btn-edit-sale-${cardId}`);
            editBtn.textContent = 'Save Changes';
            const newEditBtn = editBtn.cloneNode(true);
            editBtn.parentNode.replaceChild(newEditBtn, editBtn);
            newEditBtn.addEventListener('click', () => {
                data.item = document.getElementById(`edit-sitem-${cardId}`).value;
                data.qty = Number(document.getElementById(`edit-sqty-${cardId}`).value) || 1;
                data.price = Number(document.getElementById(`edit-sprice-${cardId}`).value) || 0;
                itemEl.innerHTML = typeof escapeHtml === 'function' ? escapeHtml(data.item) : data.item;
                qtyEl.innerHTML = data.qty;
                priceEl.innerHTML = `&#8358;${data.price.toLocaleString()}`;
                newEditBtn.textContent = 'Edit Manually';
            });
        });
    }

    function handleDebtorEditDelete(data) {
        const cardId = 'card-debtor-mod-' + Date.now();
        const div = document.createElement('div');
        div.className = 'ai-message system-msg';
        
        let notes = JSON.parse(localStorage.getItem('nd_debtor_notes') || '[]');
        const existingNote = notes.find(n => n.id === data.id);
        
        if (!existingNote) {
            div.innerHTML = `
                <div class="ai-review-card" style="border-left: 4px solid #ef4444;">
                    <div style="padding: 12px; color: #ef4444; font-size: 13px;">Error: Debtor note with ID "${data.id}" not found.</div>
                </div>`;
            historyContainer.appendChild(div);
            scrollToBottom();
            return;
        }

        if (data.action === 'delete_debtor_note') {
            div.innerHTML = `
                <div class="ai-review-card" id="${cardId}" style="border-left: 4px solid #ef4444;">
                    <div class="ai-review-card-header" style="background: #fef2f2; color: #ef4444; border-bottom: 1px solid #fee2e2;">
                        <span>Delete Debtor Note</span>
                    </div>
                    <div class="ai-review-card-body">
                        <div class="ai-review-row"><span class="ai-review-label">Title/Name</span><span class="ai-review-value" style="font-weight:600;">${existingNote.title}</span></div>
                        <div class="ai-review-row" style="margin-top: 4px;"><span class="ai-review-label">Content</span><span class="ai-review-value" style="font-size: 13px;">${existingNote.content.substring(0, 50)}${existingNote.content.length > 50 ? '...' : ''}</span></div>
                    </div>
                    <div class="ai-review-card-actions">
                        <button class="ai-btn-confirm" id="btn-conf-ddel-${cardId}" style="background: #ef4444;">Confirm Deletion</button>
                    </div>
                </div>`;
            historyContainer.appendChild(div);
            scrollToBottom();

            document.getElementById(`btn-conf-ddel-${cardId}`).addEventListener('click', () => {
                let currentNotes = JSON.parse(localStorage.getItem('nd_debtor_notes') || '[]');
                currentNotes = currentNotes.filter(n => n.id !== data.id);
                localStorage.setItem('nd_debtor_notes', JSON.stringify(currentNotes));
                
                document.getElementById(`btn-conf-ddel-${cardId}`).textContent = 'Deleted ✔';
                document.getElementById(`btn-conf-ddel-${cardId}`).disabled = true;
                if (typeof showCustomAlert === 'function') showCustomAlert("Debtor Note Deleted!");
                if (typeof renderDebtorNotes === 'function') renderDebtorNotes();
            });
        } else if (data.action === 'edit_debtor_note') {
            div.innerHTML = `
                <div class="ai-review-card" id="${cardId}" style="border-left: 4px solid #8b5cf6;">
                    <div class="ai-review-card-header" style="background: #f0f4f8; color: #8b5cf6; border-bottom: 1px solid #e0e7ff;">
                        <span>Update Debtor Note</span>
                    </div>
                    <div class="ai-review-card-body">
                        <div class="ai-review-row"><span class="ai-review-label">Old Title</span><span class="ai-review-value" style="color: #64748b; text-decoration: line-through;">${existingNote.title}</span></div>
                        <div class="ai-review-row" style="margin-top: 2px;"><span class="ai-review-label">New Title</span><span class="ai-review-value" style="font-weight:600; color: #8b5cf6;">${data.title}</span></div>
                        
                        <div class="ai-review-row" style="margin-top: 8px; border-top: 1px dashed #e2e8f0; padding-top: 8px;"><span class="ai-review-label">New Content</span><span class="ai-review-value" style="font-size: 13px; white-space: pre-wrap;">${data.content}</span></div>
                    </div>
                    <div class="ai-review-card-actions">
                        <button class="ai-btn-confirm" id="btn-conf-dedit-${cardId}" style="background: #8b5cf6;">Confirm Update</button>
                    </div>
                </div>`;
            historyContainer.appendChild(div);
            scrollToBottom();

            document.getElementById(`btn-conf-dedit-${cardId}`).addEventListener('click', () => {
                let currentNotes = JSON.parse(localStorage.getItem('nd_debtor_notes') || '[]');
                let index = currentNotes.findIndex(n => n.id === data.id);
                if (index !== -1) {
                    currentNotes[index].title = data.title;
                    currentNotes[index].content = data.content;
                    currentNotes[index].updatedAt = new Date().toISOString();
                    localStorage.setItem('nd_debtor_notes', JSON.stringify(currentNotes));
                }
                
                document.getElementById(`btn-conf-dedit-${cardId}`).textContent = 'Updated ✔';
                document.getElementById(`btn-conf-dedit-${cardId}`).disabled = true;
                if (typeof showCustomAlert === 'function') showCustomAlert("Debtor Note Updated!");
                if (typeof renderDebtorNotes === 'function') renderDebtorNotes();
            });
        }
    }

    function addPurchaseRequestCardToUI(data) {
        const cardId = 'card-req-' + Date.now();
        const div = document.createElement('div');
        div.className = 'ai-message system-msg';
        const total = Number(data.total) || (Number(data.qty || 1) * Number(data.unitPrice || 0));
        const unitPrice = Number(data.unitPrice) || (data.qty ? Math.round(total / data.qty) : total);
        const payoutRate = parseFloat(localStorage.getItem('nd_payout_rate') || '2');
        const payoutAmt = total * (payoutRate / 100);
        const formattedPayout = Number.isInteger(payoutAmt) ? payoutAmt : payoutAmt.toFixed(2);

        div.innerHTML = `
            <div class="ai-review-card" id="${cardId}" style="border-left: 4px solid #8b5cf6;">
                <div class="ai-review-card-header" style="background: #f0f4f8; color: #8b5cf6; border-bottom: 1px solid #e0e7ff;">
                    <span style="display:flex;align-items:center;gap:6px;">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
                        Purchase Request
                    </span>
                    <span style="background: #e0e7ff; color: #8b5cf6; padding: 2px 8px; border-radius: 10px; font-size: 11px;">Pending</span>
                </div>
                <div class="ai-review-card-body">
                    <div class="ai-review-row"><span class="ai-review-label">Customer</span><span class="ai-review-value" id="val-rcust-${cardId}" style="font-weight:700;">${typeof escapeHtml === 'function' ? escapeHtml(data.customerName || 'Unknown') : (data.customerName || 'Unknown')}</span></div>
                    <div class="ai-review-row" style="margin-top:2px;"><span class="ai-review-label">Customer ID</span><span class="ai-review-value" id="val-rcustid-${cardId}">${typeof escapeHtml === 'function' ? escapeHtml(data.customerId || '-') : (data.customerId || '-')}</span></div>
                    <div class="ai-review-row" style="margin-top:4px; border-top:1px dashed #e2e8f0; padding-top:6px;"><span class="ai-review-label">Product</span><span class="ai-review-value" id="val-rprod-${cardId}" style="font-weight:700;">${typeof escapeHtml === 'function' ? escapeHtml(data.productName || '-') : (data.productName || '-')}</span></div>
                    <div class="ai-review-row" style="margin-top:2px;"><span class="ai-review-label">Quantity</span><span class="ai-review-value" id="val-rqty-${cardId}">${data.qty || 1}</span></div>
                    <div class="ai-review-row" style="margin-top:2px;"><span class="ai-review-label">Unit</span><span class="ai-review-value" id="val-runit-${cardId}">${typeof escapeHtml === 'function' ? escapeHtml(data.unit || 'per unit') : (data.unit || 'per unit')}</span></div>
                    <div class="ai-review-row" style="margin-top:2px;"><span class="ai-review-label">Unit Price</span><span class="ai-review-value">&#8358;${unitPrice.toLocaleString()}</span></div>
                    <div class="ai-review-row" style="margin-top:4px; border-top:1px dashed #e2e8f0; padding-top:6px;"><span class="ai-review-label">Total</span><span class="ai-review-value" id="val-rtotal-${cardId}" style="font-weight:800; color:#8b5cf6; font-size:15px;">&#8358;${total.toLocaleString()}</span></div>
                    <div class="ai-review-row" style="margin-top:2px; background:#f0fdf4; padding:4px 8px; border-radius:6px;"><span class="ai-review-label" style="color:#16a34a;">Payout</span><span class="ai-review-value" style="color:#16a34a; font-weight:600;">+&#8358;${formattedPayout}</span></div>
                </div>
                <div class="ai-review-card-actions">
                    <button class="ai-btn-confirm" id="btn-conf-req-${cardId}" style="background:#8b5cf6;">Confirm & Create Request</button>
                    <button class="ai-btn-edit" id="btn-edit-req-${cardId}">Edit Manually</button>
                </div>
            </div>
        `;
        historyContainer.appendChild(div);
        scrollToBottom();

        document.getElementById(`btn-conf-req-${cardId}`).addEventListener('click', () => {
            document.getElementById(`btn-conf-req-${cardId}`).textContent = 'Request Created \u2714';
            document.getElementById(`btn-conf-req-${cardId}`).disabled = true;
            document.getElementById(`btn-edit-req-${cardId}`).style.display = 'none';
            pushToPurchaseRequests(data);
            if (typeof showCustomAlert === 'function') showCustomAlert('Purchase request created successfully!');
        });

        document.getElementById(`btn-edit-req-${cardId}`).addEventListener('click', () => {
            const custEl = document.getElementById(`val-rcust-${cardId}`);
            const custIdEl = document.getElementById(`val-rcustid-${cardId}`);
            const prodEl = document.getElementById(`val-rprod-${cardId}`);
            const qtyEl = document.getElementById(`val-rqty-${cardId}`);
            const unitEl = document.getElementById(`val-runit-${cardId}`);
            const totalEl = document.getElementById(`val-rtotal-${cardId}`);

            custEl.innerHTML = `<input type="text" id="edit-rcust-${cardId}" value="${(data.customerName || '').replace(/"/g, '&quot;')}" style="width:100%;text-align:left;">`;
            custIdEl.innerHTML = `<input type="text" id="edit-rcustid-${cardId}" value="${data.customerId || ''}" style="width:100%;text-align:left;">`;
            prodEl.innerHTML = `<input type="text" id="edit-rprod-${cardId}" value="${(data.productName || '').replace(/"/g, '&quot;')}" style="width:100%;text-align:left;">`;
            qtyEl.innerHTML = `<input type="number" id="edit-rqty-${cardId}" value="${data.qty || 1}" min="1" style="width:80px;">`;
            unitEl.innerHTML = `<input type="text" id="edit-runit-${cardId}" value="${data.unit || 'per unit'}" style="width:100%;text-align:left;">`;
            totalEl.innerHTML = `<input type="number" id="edit-rtotal-${cardId}" value="${total}" min="0" style="width:100px;">`;

            const editBtn = document.getElementById(`btn-edit-req-${cardId}`);
            editBtn.textContent = 'Save Changes';
            const newEditBtn = editBtn.cloneNode(true);
            editBtn.parentNode.replaceChild(newEditBtn, editBtn);
            newEditBtn.addEventListener('click', () => {
                data.customerName = document.getElementById(`edit-rcust-${cardId}`).value;
                data.customerId = document.getElementById(`edit-rcustid-${cardId}`).value;
                data.productName = document.getElementById(`edit-rprod-${cardId}`).value;
                data.qty = Number(document.getElementById(`edit-rqty-${cardId}`).value) || 1;
                data.unit = document.getElementById(`edit-runit-${cardId}`).value;
                data.total = Number(document.getElementById(`edit-rtotal-${cardId}`).value) || 0;
                data.unitPrice = data.qty ? Math.round(data.total / data.qty) : data.total;

                custEl.innerHTML = typeof escapeHtml === 'function' ? escapeHtml(data.customerName) : data.customerName;
                custIdEl.innerHTML = data.customerId;
                prodEl.innerHTML = typeof escapeHtml === 'function' ? escapeHtml(data.productName) : data.productName;
                qtyEl.innerHTML = data.qty;
                unitEl.innerHTML = data.unit;
                totalEl.innerHTML = `&#8358;${data.total.toLocaleString()}`;
                newEditBtn.textContent = 'Edit Manually';
            });
        });
    }

    function pushToPurchaseRequests(data) {
        const requestID = 'REQ-' + Date.now().toString().slice(-4) + Math.floor(Math.random() * 90 + 10);
        const total = Number(data.total) || (Number(data.qty || 1) * Number(data.unitPrice || 0));
        const payoutRate = parseFloat(localStorage.getItem('nd_payout_rate') || '2');
        const payoutAmt = total * (payoutRate / 100);

        const newRequest = {
            id: requestID,
            timestamp: new Date().toISOString(),
            status: 'Pending',
            source: 'AI',
            user: {
                id: data.customerId || '00000ND',
                name: data.customerName || 'Unknown',
                avatar: data.customerName ? data.customerName.charAt(0).toUpperCase() : 'U'
            },
            isGroupedOrder: true,
            orderTotal: total,
            totalPayout: payoutAmt,
            items: [
                {
                    name: data.productName || 'Unknown Product',
                    qty: Number(data.qty) || 1,
                    unitPrice: Number(data.unitPrice) || Math.round(total / (Number(data.qty) || 1)),
                    unit: data.unit || 'per unit',
                    price: total,
                    payout: payoutAmt
                }
            ]
        };

        const existing = JSON.parse(localStorage.getItem('nd_requests_data') || '[]');
        existing.unshift(newRequest);
        localStorage.setItem('nd_requests_data', JSON.stringify(existing));
    }


    function pickBestThreadId() {
        if (!aiChatThreads.length) return null;
        const sorted = [...aiChatThreads].sort((a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0));
        const withMessages = sorted.find(t => (t.messages || []).length > 0);
        return (withMessages || sorted[0]).id;
    }

    function loadChatThreads() {
        aiChatThreads = [];

        const saved = localStorage.getItem('nd_ai_chat_threads');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) aiChatThreads = parsed;
            } catch (e) {
                console.error('[AI Chat] Corrupt thread data', e);
            }
        }

        if (!aiChatThreads.length) {
            const legacy = localStorage.getItem('nd_ai_chat_history');
            if (legacy) {
                try {
                    const parsed = JSON.parse(legacy);
                    if (Array.isArray(parsed) && parsed.length) {
                        aiChatThreads.push({
                            id: 'thread-' + Date.now(),
                            title: 'Legacy Chat',
                            isPinned: false,
                            updatedAt: Date.now(),
                            messages: parsed
                        });
                    }
                } catch (e) { /* ignore */ }
            }
        }

        aiChatThreads = aiChatThreads.filter(t => {
            if (t.id === currentChatId) return true;
            return !(t.title === 'New Chat' && (t.messages || []).length === 0);
        });

        const currentStillExists = currentChatId && aiChatThreads.find(t => t.id === currentChatId);

        if (!currentStillExists) {
            const t = { id: 'thread-' + Date.now(), title: 'New Chat', isPinned: false, updatedAt: Date.now(), messages: [] };
            aiChatThreads.unshift(t);
            currentChatId = t.id;
            persistAiThreads(false);
        }

        renderSidebar(document.getElementById('aiSidebarSearch') ? document.getElementById('aiSidebarSearch').value : '');
        renderActiveThread(false);
    }

    function createNewThread() {
        const t = {
            id: 'thread-' + Date.now(),
            title: 'New Chat',
            isPinned: false,
            updatedAt: Date.now(),
            messages: []
        };
        aiChatThreads.unshift(t);
        currentChatId = t.id;
        persistAiThreads(true);
        switchThread(t.id);
    }

    function persistAiThreads(pushCloud) {
        if (!Array.isArray(aiChatThreads)) aiChatThreads = [];

        // Remove empty threads unless it's the currently active thread
        aiChatThreads = aiChatThreads.filter(t => t.id === currentChatId || (t.messages && t.messages.length > 0));

        const payload = JSON.stringify(aiChatThreads);
        window.__adminAiThreadsSnapshot = payload;

        try {
            localStorage.setItem('nd_ai_chat_threads', payload);
            const flatHistory = aiChatThreads.flatMap(t => (t.messages || []));
            localStorage.setItem('nd_ai_chat_history', JSON.stringify(flatHistory));
        } catch (e) {
            console.error('[AI Chat] localStorage save failed', e);
            if (typeof customAlert === 'function') {
                customAlert('Could not save chat history. Storage may be full.');
            }
            return;
        }

        const hasContent = aiChatThreads.some(t => (t.messages || []).length > 0);
        if (pushCloud && hasContent && window.NdCloudSync && typeof window.NdCloudSync.pushKeyToCloud === 'function') {
            window.NdCloudSync.pushKeyToCloud('nd_ai_chat_threads').catch(err =>
                console.error('[AI Chat] Cloud push failed', err)
            );
        }
    }

    function switchThread(id) {
        if (id === currentChatId) {
            const sidebarSearchInput = document.getElementById('aiSidebarSearch');
            renderSidebar(sidebarSearchInput ? sidebarSearchInput.value : '');
            renderActiveThread(true);
            return;
        }

        currentChatId = id;
        const sidebarSearchInput = document.getElementById('aiSidebarSearch');
        const activeSearchInput = document.getElementById('aiActiveChatSearch');
        const activeSearchClear = document.getElementById('aiActiveChatSearchClear');

        // Clear the local chat search when switching to a new thread
        if (activeSearchInput) {
            activeSearchInput.value = '';
        }
        if (activeSearchClear) {
            activeSearchClear.style.display = 'none';
        }

        renderSidebar(sidebarSearchInput ? sidebarSearchInput.value : '');
        renderActiveThread(false, false);
    }

    function saveActiveHistory() {
        window.__adminAiLocalSaveUntil = Date.now() + 2500;
        persistAiThreads(true);
        renderSidebar(document.getElementById('aiSidebarSearch') ? document.getElementById('aiSidebarSearch').value : '');
    }

    function renderActiveThread(preserveScroll = false, scrollToSearch = false, anchorMsgId = null) {
        let savedScrollTop = 0;
        if (preserveScroll && historyContainer) {
            savedScrollTop = historyContainer.scrollTop;
        }

        const activeSearchInput = document.getElementById('aiActiveChatSearch');
        const searchQuery = activeSearchInput ? activeSearchInput.value.trim().toLowerCase() : '';

        const active = aiChatThreads.find(x => x.id === currentChatId);
        if (!active || active.messages.length === 0) {
            let defaultContent = `
                <p style="margin: 0 0 12px 0; color: #475569; line-height: 1.5;">Hello! I'm your store assistant. Ask about sales, stock, debtors, requests, or send a photo of a receipt.</p>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <div style="font-weight: 600; color: #1e293b; margin-bottom: 4px;">Suggested questions:</div>
                    <button class="ai-suggested-btn" onclick="window._sendAiSuggested('How many people are owing me?')" style="background: #f1f5f9; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 8px; text-align: left; cursor: pointer; color: #334155; font-size: 0.9rem; transition: 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">1. How many people are owing me?</button>
                    <button class="ai-suggested-btn" onclick="window._sendAiSuggested('Do I have any pending requests?')" style="background: #f1f5f9; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 8px; text-align: left; cursor: pointer; color: #334155; font-size: 0.9rem; transition: 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">2. Do I have any pending requests?</button>
                    <button class="ai-suggested-btn" onclick="window._sendAiSuggested('How many things have I sold today?')" style="background: #f1f5f9; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 8px; text-align: left; cursor: pointer; color: #334155; font-size: 0.9rem; transition: 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">3. How many things have I sold today?</button>
                    <button class="ai-suggested-btn" onclick="window._sendAiSuggested('Who is online?')" style="background: #f1f5f9; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 8px; text-align: left; cursor: pointer; color: #334155; font-size: 0.9rem; transition: 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">4. Who is online?</button>
                    <button class="ai-suggested-btn" onclick="window._sendAiSuggested('How many products do I have?')" style="background: #f1f5f9; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 8px; text-align: left; cursor: pointer; color: #334155; font-size: 0.9rem; transition: 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">5. How many products do I have?</button>
                </div>
            `;

            if (searchQuery) {
                const stripped = defaultContent.replace(/<[^>]*>?/gm, '');
                if (stripped.toLowerCase().includes(searchQuery)) {
                    const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(`(${escaped})(?![^<]*>)`, 'gi');
                    defaultContent = defaultContent.replace(regex, '<span class="ai-search-highlight" title="Click to clear search" onclick="window._clearAiChatSearchAndScroll(this)">$1</span>');
                } else {
                    historyContainer.innerHTML = `
                        <div class="ai-chat-no-results">
                            <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" width="48" height="48">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                <line x1="8" y1="8" x2="14" y2="14" stroke="#ef4444" stroke-width="2"></line>
                                <line x1="14" y1="8" x2="8" y2="14" stroke="#ef4444" stroke-width="2"></line>
                            </svg>
                            <div style="font-size: 15px; font-weight: 600; color: #475569; margin-bottom: 4px;">No results found</div>
                            <div style="font-size: 13px; color: #94a3b8;">Nothing matches "<strong style="color:#64748b;">${typeof escapeHtml === 'function' ? escapeHtml(searchQuery) : searchQuery.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</strong>" in this chat</div>
                        </div>`;
                    return;
                }
            }

            historyContainer.innerHTML = `
                <div class="ai-message system-msg">
                    <div class="bubble">${defaultContent}</div>
                </div>`;
            return;
        }

        historyContainer.innerHTML = '';
        let matchCount = 0;

        active.messages.forEach((msg, idx) => {
            // Apply search filter if query exists
            let displayContent = msg.content || '';
            if (searchQuery) {
                if (displayContent.toLowerCase().includes(searchQuery)) {
                    matchCount++;
                    const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(`(${escaped})`, 'gi');
                    displayContent = displayContent.replace(regex, '<span class="ai-search-highlight" title="Click to clear search" onclick="window._clearAiChatSearchAndScroll(this)">$1</span>');
                }
            } else {
                matchCount++;
            }

            if (msg.role === 'user') {
                addUserMessageToUI(displayContent, msg.imageBase64, idx, true, msg.isPinned, msg.content);
            } else if (msg.role === 'assistant') {
                let isJson = false;
                let fStart = msg.content.indexOf('{');
                let fEnd = msg.content.lastIndexOf('}');
                if (fStart !== -1 && fEnd !== -1) {
                    try {
                        let jText = msg.content.substring(fStart, fEnd + 1);
                        const ext = JSON.parse(jText);
                        // Show any text before the JSON as a normal message
                        const textBefore = msg.content.substring(0, fStart).trim();
                        const textAfter = msg.content.substring(fEnd + 1).trim();
                        if (textBefore) {
                            addSystemMessageToUI(textBefore, idx, msg.isPinned, textBefore, true);
                        }
                        if (ext.action === 'debtor_note') {
                            addDebtorReviewCardToUI(ext);
                            isJson = true;
                        } else if (ext.action === 'expense_entry') {
                            addExpenseReviewCardToUI(ext);
                            isJson = true;
                        } else if (ext.action === 'sales_entry') {
                            addSalesEntryReviewCardToUI(ext);
                            isJson = true;
                        } else if (ext.action === 'purchase_request') {
                            addPurchaseRequestCardToUI(ext);
                            isJson = true;
                        } else if (ext.action === 'edit_debtor_note' || ext.action === 'delete_debtor_note') {
                            handleDebtorEditDelete(ext);
                            isJson = true;
                        }
                        // Show any text after the JSON as a normal message
                        if (isJson && textAfter) {
                            addSystemMessageToUI(textAfter, null, false, textAfter, true);
                        }
                    } catch (e) { }
                }
                if (!isJson) {
                    addSystemMessageToUI(displayContent, idx, msg.isPinned, msg.content, true);
                }
            }
        });

        if (matchCount === 0 && searchQuery) {
            historyContainer.innerHTML = `
                <div class="ai-chat-no-results">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" width="48" height="48">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        <line x1="8" y1="8" x2="14" y2="14" stroke="#ef4444" stroke-width="2"></line>
                        <line x1="14" y1="8" x2="8" y2="14" stroke="#ef4444" stroke-width="2"></line>
                    </svg>
                    <div style="font-size: 15px; font-weight: 600; color: #475569; margin-bottom: 4px;">No results found</div>
                    <div style="font-size: 13px; color: #94a3b8;">Nothing matches "<strong style="color:#64748b;">${escapeHtml(searchQuery)}</strong>" in this chat</div>
                </div>`;
            return;
        }

        _renderAiPinnedMessage();

        if (anchorMsgId) {
            requestAnimationFrame(() => {
                const anchor = document.getElementById(anchorMsgId);
                if (anchor) {
                    anchor.scrollIntoView({ behavior: 'auto', block: 'center' });
                } else {
                    scrollToBottom();
                }
            });
        } else if (preserveScroll) {
            requestAnimationFrame(() => {
                historyContainer.scrollTop = savedScrollTop;
            });
        } else if (scrollToSearch && searchQuery) {
            requestAnimationFrame(() => {
                const highlight = historyContainer.querySelector('.ai-search-highlight');
                if (highlight) {
                    highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    scrollToBottom();
                }
            });
        } else {
            scrollToBottom();
        }
    }

    function _renderAiPinnedMessage() {
        const panel = document.getElementById('aiPinnedPanel');
        if (!panel) return;

        const activeThread = aiChatThreads.find(x => x.id === currentChatId);
        if (!activeThread) return;

        // Find the last pinned message in the current thread
        const pinnedMsgs = activeThread.messages.filter(m => m.isPinned);
        if (pinnedMsgs.length > 0) {
            const pinnedMsg = pinnedMsgs[pinnedMsgs.length - 1];
            const msgIndex = activeThread.messages.indexOf(pinnedMsg);
            let preview = pinnedMsg.content || '';

            // Truncate safely, but parse markdown first
            if (preview.length > 100) {
                preview = preview.substring(0, 100) + '...';
            }
            const parsedPreview = typeof marked !== 'undefined' ? marked.parse(preview) : escapeHtml(preview);

            panel.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%; padding: 8px 16px; box-sizing: border-box; cursor:pointer;" onclick="const msg = document.getElementById('ai-msg-${msgIndex}'); if(msg) msg.scrollIntoView({behavior:'smooth', block:'center'});">
                    <div style="display:flex; flex-direction:column; overflow:hidden; padding-right:12px;">
                        <span style="font-size:10px; font-weight:700; color:#8b5cf6; text-transform:uppercase; letter-spacing:0.5px; display:flex; align-items:center; gap:4px; flex-shrink:0;">
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z"></path></svg>
                            Pinned Message
                        </span>
                        <div class="pinned-msg-markdown" style="font-size:13px; color:#334155; margin-top:2px; max-height:40px; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">
                            ${parsedPreview}
                        </div>
                    </div>
                    <button onclick="event.stopPropagation(); window._toggleAiMsgPin(${msgIndex})" style="background:transparent; border:none; padding:8px; display:flex; align-items:center; justify-content:center; color:#94a3b8; cursor:pointer; flex-shrink:0;">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
            `;
            panel.style.display = 'block';
        } else {
            panel.style.display = 'none';
            panel.innerHTML = '';
        }
    }

    function renderSidebar(searchQuery = '') {
        const listEl = document.getElementById('aiSidebarThreadList');
        if (!listEl) return;
        listEl.innerHTML = '';

        let sorted = [...aiChatThreads].sort((a, b) => b.updatedAt - a.updatedAt);
        const query = searchQuery ? searchQuery.trim().toLowerCase() : '';

        // For search results, we store match info per thread
        let searchResults = [];

        if (query) {
            sorted.forEach(t => {
                let matchType = null; // 'title', 'message'
                let matchPreview = '';
                let matchMsgIndex = -1;

                // Check title match first
                if (t.title.toLowerCase().includes(query)) {
                    matchType = 'title';
                    matchPreview = t.title;
                }
                // Check message content match
                if (t.messages && t.messages.length) {
                    for (let i = 0; i < t.messages.length; i++) {
                        const msg = t.messages[i];
                        if (msg.content && msg.content.toLowerCase().includes(query)) {
                            if (!matchType) matchType = 'message';
                            matchMsgIndex = i;
                            // Build a snippet around the match
                            const content = msg.content;
                            const idx = content.toLowerCase().indexOf(query);
                            const start = Math.max(0, idx - 30);
                            const end = Math.min(content.length, idx + query.length + 50);
                            matchPreview = (start > 0 ? '...' : '') + content.substring(start, end) + (end < content.length ? '...' : '');
                            break; // take first message match
                        }
                    }
                }

                if (matchType) {
                    searchResults.push({ thread: t, matchType, matchPreview, matchMsgIndex });
                }
            });
        } else {
            sorted.forEach(t => searchResults.push({ thread: t, matchType: null, matchPreview: '', matchMsgIndex: -1 }));
        }

        // Sort: pinned first
        searchResults.sort((a, b) => (b.thread.isPinned ? 1 : 0) - (a.thread.isPinned ? 1 : 0));

        // Show "No results found" for search
        if (query && searchResults.length === 0) {
            listEl.innerHTML = `
                <div class="ai-sidebar-no-results">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" width="40" height="40" style="margin-bottom: 10px;">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        <line x1="8" y1="8" x2="14" y2="14" stroke="#ef4444" stroke-width="2"></line>
                        <line x1="14" y1="8" x2="8" y2="14" stroke="#ef4444" stroke-width="2"></line>
                    </svg>
                    <div style="font-size: 14px; font-weight: 600; color: #475569; margin-bottom: 4px;">No results found</div>
                    <div style="font-size: 12px; color: #94a3b8;">No chats match "<strong>${escapeHtml(searchQuery.trim())}</strong>"</div>
                </div>
            `;
            return;
        }

        searchResults.forEach(({ thread, matchType, matchPreview, matchMsgIndex }) => {
            const div = document.createElement('div');
            div.className = `thread-item ${thread.id === currentChatId ? 'active' : ''} ${thread.isPinned ? 'pinned' : ''}`;

            // Build title with highlighted query
            let titleHtml = escapeHtml(thread.title);
            if (query && thread.title.toLowerCase().includes(query)) {
                const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`(${escapedQuery})`, 'gi');
                titleHtml = escapeHtml(thread.title).replace(regex, '<span style="background:#cce4ff; border-radius:2px; padding:0 2px;">$1</span>');
            }

            // Build match preview snippet (only shown during search)
            let snippetHtml = '';
            if (query && matchType === 'message' && matchPreview) {
                let previewText = escapeHtml(matchPreview);
                const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`(${escapedQuery})`, 'gi');
                previewText = previewText.replace(regex, '<span style="background:#cce4ff; border-radius:2px; padding:0 2px;">$1</span>');
                snippetHtml = `<div class="thread-item-snippet">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" width="12" height="12" style="flex-shrink:0; margin-top:1px;">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <span>${previewText}</span>
                </div>`;
            }

            div.innerHTML = `
                <div class="thread-item-title">${titleHtml}</div>
                ${snippetHtml}
                <div class="thread-item-date">${new Date(thread.updatedAt).toLocaleDateString()}</div>
                <div class="thread-actions">
                    <button class="thread-action-btn pin-btn" title="${thread.isPinned ? 'Unpin' : 'Pin'}">
                        <svg viewBox="0 0 24 24" fill="${thread.isPinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
                            <line x1="12" y1="17" x2="12" y2="22"></line>
                            <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z"></path>
                        </svg>
                    </button>
                    <button class="thread-action-btn edit-title-btn" title="Rename">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                        </svg>
                    </button>
                    <button class="thread-action-btn del-btn" title="Delete">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                    </button>
                </div>
            `;

            div.addEventListener('click', (e) => {
                if (e.target.closest('.thread-action-btn')) return;

                // Switch to thread
                switchThread(thread.id);

                // If a message match was found, scroll to that message after rendering
                if (query && matchMsgIndex >= 0) {
                    setTimeout(() => {
                        const msgEl = document.getElementById('ai-msg-' + matchMsgIndex);
                        if (msgEl) {
                            msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            // Flash highlight the message
                            msgEl.style.transition = 'background 0.3s ease';
                            msgEl.style.background = 'rgba(27, 38, 59, 0.08)';
                            msgEl.style.borderRadius = '12px';
                            setTimeout(() => {
                                msgEl.style.background = 'transparent';
                            }, 2000);
                        }
                    }, 150);
                }

                // Clear the sidebar search and close the history modal
                const sidebarSearchInput = document.getElementById('aiSidebarSearch');
                if (sidebarSearchInput) sidebarSearchInput.value = '';
                historyModalOverlay.style.display = 'none';
            });

            div.querySelector('.pin-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                thread.isPinned = !thread.isPinned;
                saveActiveHistory();
            });

            div.querySelector('.del-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                openAiDeleteModal(thread.id);
            });

            div.querySelector('.edit-title-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                openAiRenameModal(thread.id, thread.title);
            });

            listEl.appendChild(div);
        });
    }

    // --- Custom Modal Logic for Rename/Delete ---
    let threadToEditId = null;
    let threadToDeleteId = null;

    window.openAiRenameModal = function (id, currentTitle) {
        threadToEditId = id;
        const modal = document.getElementById('aiRenameModal');
        const input = document.getElementById('aiRenameInput');
        if (modal && input) {
            input.value = currentTitle;
            modal.style.display = 'flex';
            setTimeout(() => {
                modal.classList.add('show');
                const box = document.getElementById('aiRenameBox');
                if (box) box.style.transform = 'scale(1)';
            }, 10);
        }
    };

    window.closeAiRenameModal = function () {
        const modal = document.getElementById('aiRenameModal');
        if (modal) {
            modal.classList.remove('show');
            const box = document.getElementById('aiRenameBox');
            if (box) box.style.transform = 'scale(0.9)';
            setTimeout(() => {
                modal.style.display = 'none';
                threadToEditId = null;
            }, 300);
        }
    };

    window.confirmAiRename = function () {
        if (!threadToEditId) return;
        const input = document.getElementById('aiRenameInput');
        const newTitle = input ? input.value.trim() : '';

        if (newTitle) {
            const thread = aiChatThreads.find(t => t.id === threadToEditId);
            if (thread) {
                thread.title = newTitle.substring(0, 40);
                saveActiveHistory();
            }
        }
        closeAiRenameModal();
    };

    window.openAiDeleteModal = function (id) {
        threadToDeleteId = id;
        const modal = document.getElementById('aiDeleteModal');
        if (modal) {
            modal.style.display = 'flex';
            setTimeout(() => {
                modal.classList.add('show');
                const box = document.getElementById('aiDeleteBox');
                if (box) box.style.transform = 'scale(1)';
            }, 10);
        }
    };

    window.closeAiDeleteModal = function () {
        const modal = document.getElementById('aiDeleteModal');
        if (modal) {
            modal.classList.remove('show');
            const box = document.getElementById('aiDeleteBox');
            if (box) box.style.transform = 'scale(0.9)';
            setTimeout(() => {
                modal.style.display = 'none';
                threadToDeleteId = null;
            }, 300);
        }
    };

    window.confirmAiDelete = function () {
        if (threadToDeleteId) {
            aiChatThreads = aiChatThreads.filter(t => t.id !== threadToDeleteId);
            if (currentChatId === threadToDeleteId) {
                currentChatId = pickBestThreadId();
                if (!currentChatId) createNewThread();
                else switchThread(currentChatId);
            } else {
                saveActiveHistory();
            }
        }
        closeAiDeleteModal();
    };

    // Attach listeners for modal buttons
    const renameCloseBtn = document.getElementById('aiRenameCloseBtn');
    if (renameCloseBtn) renameCloseBtn.addEventListener('click', closeAiRenameModal);

    const renameSaveBtn = document.getElementById('aiRenameSaveBtn');
    if (renameSaveBtn) renameSaveBtn.addEventListener('click', confirmAiRename);

    const deleteCancelBtn = document.getElementById('aiDeleteCancelBtn');
    if (deleteCancelBtn) deleteCancelBtn.addEventListener('click', closeAiDeleteModal);

    const deleteConfirmBtn = document.getElementById('aiDeleteConfirmBtn');
    if (deleteConfirmBtn) deleteConfirmBtn.addEventListener('click', confirmAiDelete);

    function escapeHtml(unsafe) {
        return (unsafe || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    window._toggleAiMsgPin = function (msgIndex) {
        const activeThread = aiChatThreads.find(x => x.id === currentChatId);
        if (activeThread && activeThread.messages[msgIndex]) {
            activeThread.messages[msgIndex].isPinned = !activeThread.messages[msgIndex].isPinned;
            saveActiveHistory();
            renderActiveThread(true);
        }
    };

    window._clearAiChatSearchAndScroll = function (element) {
        const msgEl = element.closest('.ai-message');
        const anchorMsgId = msgEl ? msgEl.id : null;
        const activeSearchInput = document.getElementById('aiActiveChatSearch');
        const activeSearchClear = document.getElementById('aiActiveChatSearchClear');
        if (activeSearchInput) activeSearchInput.value = '';
        if (activeSearchClear) activeSearchClear.style.display = 'none';
        renderActiveThread(false, false, anchorMsgId);
    };

    function scrollToBottom() {
        requestAnimationFrame(() => {
            historyContainer.scrollTo({
                top: historyContainer.scrollHeight,
                behavior: 'smooth'
            });
        });
    }


    loadChatThreads();
    // Always start with a new blank chat when opening AI mode
    createNewThread();
    if (window.NdCloudSync && typeof window.NdCloudSync.pullKeyFromCloud === 'function') {
        window.NdCloudSync.pullKeyFromCloud('nd_ai_chat_threads').then(applied => {
            if (applied) loadChatThreads();
        });
    }

    window.refreshAdminAiChatFromCloud = function () {
        if (!document.getElementById('aiChatModalOverlay')) return;
        if (window.__adminAiLocalSaveUntil && Date.now() < window.__adminAiLocalSaveUntil) return;
        loadChatThreads();
    };
}

window._openAiImagePreview = function (src) {
    const existing = document.querySelector('.ai-image-fullscreen-preview');
    if (existing) existing.remove();

    const preview = document.createElement('div');
    preview.className = 'ai-image-fullscreen-preview';
    preview.innerHTML = `
        <div style="position:absolute; top:20px; width:100%; display:flex; justify-content:space-between; align-items:flex-start; padding:0 20px; z-index:10; pointer-events:none;">
            <div style="pointer-events:auto;">
                <a href="${src}" download="image.jpg" style="background:rgba(255,255,255,0.15); border:none; color:white; width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center; text-decoration:none; backdrop-filter:blur(8px); transition:0.2s;">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                </a>
            </div>
            <div style="pointer-events:auto;">
                <button class="ai-image-fullscreen-close" onclick="this.closest('.ai-image-fullscreen-preview').remove()" style="background:rgba(255,255,255,0.15); border:none; color:white; width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; backdrop-filter:blur(8px); transition:0.2s;">
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

// Safe force-close helper (call from console if modal becomes unresponsive)
window.forceCloseAiChat = function () {
    try {
        const overlay = document.getElementById('aiChatModalOverlay');
        if (overlay) {
            try { overlay.classList.remove('show'); } catch (e) {}
            setTimeout(() => { try { overlay.remove(); } catch (e) {} }, 200);
        }
        const rename = document.getElementById('aiRenameModal'); if (rename) try { rename.remove(); } catch (e) {}
        const del = document.getElementById('aiDeleteModal'); if (del) try { del.remove(); } catch (e) {}
        const crop = document.getElementById('aiCropperOverlay'); if (crop) try { crop.style.display = 'none'; } catch (e) {}
        console.info('forceCloseAiChat executed');
    } catch (e) {
        console.error('forceCloseAiChat failed', e);
    }
};




