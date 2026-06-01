const XAI_MODEL = 'grok-4.20-0309-reasoning';

const SYSTEM_PROMPT = `
You are a friendly, helpful, and intelligent AI Shopping Assistant for a store named ${localStorage.getItem('nd_shop_name') || 'nd shop'}.
Your primary goal is to provide excellent customer support. You help users understand the store's offerings, explain how to use the app, recommend balanced meals, and assist with image analysis.

<CONTEXT>
We inject product data and the user's basic profile details below. Use this data to provide highly personalized answers.
- **Available Products**: Current stock, prices, categories.
- **User Profile**: The current user's past requests, payout rate, lifetime spending, and location (State/LGA).
- **Store Features**: You have knowledge of how the ${localStorage.getItem('nd_shop_name') || 'nd shop'} app works.
</CONTEXT>

CRITICAL RULES:
1. **NO PURCHASING OR ORDERING**: You CANNOT create orders, buy items, or process purchase requests. If a user asks to buy or order something, politely inform them that you do not have ordering capabilities, and direct them to use the "Product" menu to make their purchase request manually.
2. **Product Details**: When mentioning a product available in the store, break down its details clearly (e.g., Name, Price per unit). Do NOT format products as HTML links or buttons. Provide the information as plain text or markdown lists.
3. **Professional Tone**: Be polite, concise, and helpful. Never output raw JSON. Use markdown for formatting, and always use numbered lists (1., 2., 3.) instead of bullet points.
4. **Data Privacy**: If asked about store revenue, other users, or admin-level data, state that you do not have access to that information.
5. **Image Analysis**: If the user uploads an image, analyze it to identify products and check if similar items are available in the store context.

NUTRITION & FOOD RECOMMENDATION GUIDE:
If a user asks "What should I eat?", "Suggest a meal", or asks for food advice:
- **Step 1**: Ask them what they ate most recently and how long ago. Do not immediately suggest a meal.
- **Step 2**: Once they reply, analyze the food they ate based on the 6 classes of food (Carbohydrates, Proteins, Fats & Oils, Vitamins, Minerals, Water). Identify what nutritional gaps need to be filled.
- **Step 3**: Suggest 3 to 5 balanced meal ideas that fill those gaps.
- **Step 4**: Whenever possible, include local dishes native to their recorded State/LGA.
- **Step 5**: Mention any ingredients for these meals that are available in the store, providing their prices.

APP FEATURES GUIDE:
If a user asks how the app works or what features are available:
- Briefly list the core user features: Product Browsing, Ordering, Payout System, Debt Payment (receipt upload), Debtor Book, Messaging, AI Assistant, Community, and Profile Management.
- Ask them which specific feature they want a step-by-step guide on, and then provide detailed instructions when they reply.
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

window.openUserAiModal = async function() {
    // Capture then clear context so it only applies to this session
    window._aiOpenedFromContext = window._aiPageContext || 'general';
    window._aiPageContext = null;

    // Remove any existing AI wrapper to avoid duplicates
    const existing = document.getElementById('ai-modal-wrapper');
    if (existing) existing.remove();

    // Inject directly into body to escape stacking context (fixes Edge browser)
    const wrapper = document.createElement('div');
    wrapper.id = 'ai-modal-wrapper';
    wrapper.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:9999999;pointer-events:none;';
    document.body.appendChild(wrapper);

    fetch('menu-buttons/user-ai/user-ai.html?v=' + Date.now())
        .then(res => res.text())
        .then(html => {
            wrapper.innerHTML = html;
            const overlay = document.getElementById('aiChatModalOverlay');
            overlay.style.display = 'flex';
            overlay.style.pointerEvents = 'all';
            wrapper.style.pointerEvents = 'all';
            overlay.offsetHeight;
            setTimeout(() => overlay.classList.add('show'), 10);

            initAiChatLogic();
        })
        .catch(err => {
            console.error('Failed to load AI Chat', err);
        });
}

function initAiChatLogic() {
    const closeBtn = document.getElementById('closeUserAiModal');
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
            setTimeout(() => {
                try {
                    const wrapper = document.getElementById('ai-modal-wrapper');
                    if (wrapper) wrapper.remove();
                } catch (e) { /* ignore */ }
            }, 300);
        } catch (e) {
            console.error('[AI Chat] close error', e);
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
            else switchThread(aiChatThreads[0].id);
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
            // === Gather STORE DATA for the User AI ===
            const dbProducts = JSON.parse(localStorage.getItem('nd_products_data') || '[]');
            const dbPayoutRate = localStorage.getItem('nd_payout_rate') || '2';
            const currentUser = JSON.parse(localStorage.getItem('nd_logged_in_user') || '{}');
            const userName = ((currentUser.firstName || '') + ' ' + (currentUser.lastName || '')).trim() || currentUser.name || 'Guest';
            const allRequests = JSON.parse(localStorage.getItem('nd_requests_data') || '[]');
            const userRequests = allRequests.filter(r => r.userId === currentUser.id || (r.user && r.user.id === currentUser.id));

            // Get user's own purchase history for spending/payout answers
            const allSales = JSON.parse(localStorage.getItem('nd_sales_history') || '[]');
            const userSales = allSales.filter(s => s.customerID === currentUser.id);
            let totalSpending = 0, totalPayout = 0;
            userSales.forEach(s => {
                totalSpending += parseFloat(s.price || (s.qty * s.unitPrice)) || 0;
                totalPayout += parseFloat(s.payout) || 0;
            });

            // Clean requests data (strip heavy base64 imageData)
            const cleanUserRequests = userRequests.map(r => ({
                id: r.id,
                timestamp: r.timestamp,
                status: r.status,
                orderTotal: r.orderTotal,
                items: r.items ? r.items.map(item => ({
                    name: item.name,
                    qty: item.qty,
                    unitPrice: item.unitPrice,
                    unit: item.unit,
                    total: item.total
                })) : []
            }));

            const injectedPrompt = SYSTEM_PROMPT + `\n\n--- INJECTED STORE CONTEXT ---\n
USER PROFILE:
- Name: ${userName}
- User ID: ${currentUser.id || 'Unknown'}
- State: ${currentUser.state || 'Unknown'}
- Local Government Area (LGA): ${currentUser.lga || currentUser.localGovernment || 'Unknown'}
- Email: ${currentUser.email || 'Unknown'}
- Phone: ${currentUser.phone || 'Unknown'}
- Current Store Payout Rate: ${dbPayoutRate}%
- Total Spending (lifetime): ₦${totalSpending.toLocaleString()}
- Total Payout Earned (lifetime): ₦${totalPayout.toLocaleString()}
- Total Items Purchased: ${userSales.length} transactions
- Product Requests: ${userRequests.length} pending/recent requests.

YOUR PURCHASE HISTORY (last 50):
(Format: 'item' = product name, 'qty' = quantity bought, 'price' = total amount spent, 'payout' = payout earned, 'date' = transaction time)
${JSON.stringify(userSales.slice(0, 50).map(s => ({ item: s.item, qty: s.qty, price: s.price || (s.qty * s.unitPrice), payout: s.payout, date: s.date, type: s.type })))}

AVAILABLE PRODUCTS IN STORE:
(Format: 'name' = exact product name, 'price' = selling price per unit in Naira, 'unit' = measurement/size, 'category' = product type)
${JSON.stringify(dbProducts.map(p => ({ name: p.name, price: p.price, unit: p.unit, category: p.category })))}

YOUR REQUESTS DATA:
(Format: 'id' = request ID, 'timestamp' = time, 'status' = status, 'orderTotal' = total value, 'items' = list of items)
${JSON.stringify(cleanUserRequests)}

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

        // Attach listeners to AI generated product links!
        const productLinks = div.querySelectorAll('.ai-product-link');
        productLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const productName = link.getAttribute('data-product-name') || link.textContent;
                if (window._handleAiProductSelection && productName) {
                    window._handleAiProductSelection(productName.trim());
                }
            });
        });

        historyContainer.appendChild(div);
        if (!renderOnly) scrollToBottom();
    }

    // Global AI Product Selector Handler
    window._handleAiProductSelection = function(productName, initialQty = 1, existingRequestID = null, msgIndex = null) {
        if (!productName) return;
        const productsData = JSON.parse(localStorage.getItem('nd_products_data') || '[]');
        const cleanName = productName.trim().toLowerCase();
        
        let prod = productsData.find(p => p.name.trim().toLowerCase() === cleanName);
        if (!prod) {
            prod = productsData.find(p => p.name.trim().toLowerCase().includes(cleanName) || cleanName.includes(p.name.trim().toLowerCase()));
        }
        
        if (prod) {
            // Render an inline product card inside the AI chat
            const cardId = 'ai-prod-' + Date.now();
            const price = Number(prod.price) || 0;
            const payoutRate = parseFloat(localStorage.getItem('nd_payout_rate') || '2');
            const payout = price * (payoutRate / 100);
            const formattedPayout = Number.isInteger(payout) ? payout : payout.toFixed(2);

            const div = document.createElement('div');
            div.className = 'ai-message system-msg';
            div.innerHTML = `
                <div class="ai-review-card" id="${cardId}" style="border-left: 4px solid #8b5cf6;">
                    <div class="ai-review-card-header" style="background: #f0f4f8; color: #8b5cf6; border-bottom: 1px solid #e0e7ff;">
                        <span style="display:flex;align-items:center;gap:6px;">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
                            Product Details
                        </span>
                        <span style="background: #e0e7ff; color: #8b5cf6; padding: 2px 8px; border-radius: 10px; font-size: 11px;">In Stock</span>
                    </div>
                    <div class="ai-review-card-body">
                        <div class="ai-review-row"><span class="ai-review-label">Product</span><span class="ai-review-value" style="font-weight:700; color:#0f172a;">${prod.name}</span></div>
                        <div class="ai-review-row" style="margin-top:4px;"><span class="ai-review-label">Price</span><span class="ai-review-value" style="color:#8b5cf6; font-size:16px; font-weight:700;">₦${price.toLocaleString()}</span></div>
                        <div class="ai-review-row" style="margin-top:4px;"><span class="ai-review-label">Unit</span><span class="ai-review-value">${prod.unit || 'per unit'}</span></div>
                        <div class="ai-review-row" style="margin-top:8px; border-top:1px dashed #e2e8f0; padding-top:8px;">
                            <span class="ai-review-label">Quantity</span>
                            <span class="ai-review-value" style="display:flex; align-items:center; gap:10px;">
                                <button id="qtyMinus-${cardId}" style="width:30px;height:30px;border-radius:50%;border:1.5px solid #cbd5e1;background:#fff;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#64748b;">−</button>
                                <span id="qtyVal-${cardId}" style="font-weight:700; font-size:16px; min-width:24px; text-align:center;">${initialQty}</span>
                                <button id="qtyPlus-${cardId}" style="width:30px;height:30px;border-radius:50%;border:1.5px solid #8b5cf6;background:#f0f4f8;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#8b5cf6;">+</button>
                            </span>
                        </div>
                        <div class="ai-review-row" style="margin-top:4px;">
                            <span class="ai-review-label">Total Estimate</span>
                            <span class="ai-review-value" id="totalEst-${cardId}" style="font-weight:800; color:#0f172a; font-size:16px;">₦${(price * initialQty).toLocaleString()}</span>
                        </div>
                        <div class="ai-review-row" style="margin-top:4px; background:#f0fdf4; padding:6px 8px; border-radius:8px;">
                            <span class="ai-review-label" style="color:#16a34a;">Expected Payout</span>
                            <span class="ai-review-value" id="payoutEst-${cardId}" style="color:#16a34a; font-weight:600;">${payoutRate}% Payout (+₦${Number.isInteger(price * initialQty * (payoutRate / 100)) ? (price * initialQty * (payoutRate / 100)) : (price * initialQty * (payoutRate / 100)).toFixed(2)})</span>
                        </div>
                    </div>
                    <div class="ai-review-card-actions">
                        <button class="ai-btn-confirm" id="buyBtn-${cardId}" style="background:#8b5cf6;">Buy Now</button>
                    </div>
                </div>
            `;
            historyContainer.appendChild(div);
            scrollToBottom();

            // Quantity state
            let qty = initialQty;
            const qtyValEl = document.getElementById('qtyVal-' + cardId);
            const totalEstEl = document.getElementById('totalEst-' + cardId);
            const payoutEstEl = document.getElementById('payoutEst-' + cardId);

            function updateCardTotals() {
                const total = price * qty;
                const p = total * (payoutRate / 100);
                const fp = Number.isInteger(p) ? p : p.toFixed(2);
                qtyValEl.textContent = qty;
                totalEstEl.textContent = '₦' + total.toLocaleString();
                payoutEstEl.textContent = payoutRate + '% Payout (+₦' + fp + ')';
            }

            document.getElementById('qtyMinus-' + cardId).addEventListener('click', () => {
                if (qty > 1) { qty--; updateCardTotals(); }
            });
            document.getElementById('qtyPlus-' + cardId).addEventListener('click', () => {
                qty++; updateCardTotals();
            });

            // Buy Now handler
            const buyBtn = document.getElementById('buyBtn-' + cardId);
            const minusBtn = document.getElementById('qtyMinus-' + cardId);
            const plusBtn = document.getElementById('qtyPlus-' + cardId);

            // Pre-check existing request status
            if (existingRequestID) {
                const existingReqs = JSON.parse(localStorage.getItem('nd_requests_data') || '[]');
                const foundReq = existingReqs.find(r => r.id === existingRequestID);
                
                // ALWAYS disable the button if we already generated a request ID for this card!
                buyBtn.disabled = true;
                buyBtn.classList.add('pending');
                if (minusBtn) { minusBtn.disabled = true; minusBtn.style.opacity = '0.4'; }
                if (plusBtn) { plusBtn.disabled = true; plusBtn.style.opacity = '0.4'; }

                if (foundReq) {
                    if (foundReq.status === 'Pending') {
                        buyBtn.textContent = 'Request Sent ✔';
                        buyBtn.style.background = '#10b981'; // green
                    } else if (foundReq.status === 'Approved') {
                        buyBtn.textContent = 'Approved ✔';
                        buyBtn.style.background = '#10b981'; // green
                    } else if (foundReq.status === 'Declined') {
                        buyBtn.textContent = 'Declined ✖';
                        buyBtn.style.background = '#ef4444'; // red
                    } else {
                        buyBtn.textContent = foundReq.status;
                        buyBtn.style.background = '#64748b'; // gray
                    }
                } else {
                    // Request was deleted by admin or cleared out, but this card already fired!
                    buyBtn.textContent = 'Processed ✔';
                    buyBtn.style.background = '#64748b'; // gray indicating it's done
                }
            }

            buyBtn.addEventListener('click', function() {
                const btn = this;
                if (btn.classList.contains('pending')) return;
                btn.textContent = 'Processing...';
                btn.classList.add('pending');

                const totalCost = price * qty;
                const payoutAmt = totalCost * (payoutRate / 100);
                const requestID = 'REQ-' + Date.now().toString().slice(-4) + Math.floor(Math.random() * 90 + 10);
                const user = window.loggedInUser || JSON.parse(localStorage.getItem('nd_logged_in_user') || '{}');

                const newRequest = {
                    id: requestID,
                    timestamp: new Date().toISOString(),
                    status: 'Pending',
                    source: 'AI',
                    user: {
                        id: user.id || '00000ND',
                        name: ((user.firstName || '') + ' ' + (user.lastName || '')).trim() || 'Guest',
                        avatar: user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'
                    },
                    isGroupedOrder: true,
                    orderTotal: totalCost,
                    totalPayout: payoutAmt,
                    items: [
                        {
                            name: prod.name,
                            qty: qty,
                            unitPrice: price,
                            unit: prod.unit || 'per unit',
                            price: totalCost,
                            payout: payoutAmt
                        }
                    ]
                };

                const existing = JSON.parse(localStorage.getItem('nd_requests_data') || '[]');
                existing.unshift(newRequest);
                localStorage.setItem('nd_requests_data', JSON.stringify(existing));

                // Save to chat history depending on origin
                if (msgIndex !== null) {
                    const thread = aiChatThreads.find(t => t.id === currentChatId);
                    if (thread && thread.messages[msgIndex]) {
                        try {
                            const parsed = JSON.parse(thread.messages[msgIndex].content);
                            parsed.requestID = requestID;
                            parsed.qty = qty; // sync manual quantity bumps
                            thread.messages[msgIndex].content = JSON.stringify(parsed);
                            saveActiveHistory();
                        } catch(e) { console.error("Error saving requestID to AI JSON", e); }
                    }
                } else {
                    // Ephemeral link click => Turn it into a persistent chat element
                    const thread = aiChatThreads.find(t => t.id === currentChatId);
                    if (thread) {
                        try {
                            thread.messages.push({
                                role: 'assistant',
                                content: JSON.stringify({ action: 'purchase_request', productName: prod.name, qty: qty, requestID: requestID })
                            });
                            saveActiveHistory();
                        } catch(e) { console.error("Error creating AI JSON", e); }
                    }
                }

                setTimeout(() => {
                    btn.textContent = 'Request Sent ✔';
                    btn.style.background = '#10b981';
                    btn.disabled = true;
                    if (minusBtn) { minusBtn.disabled = true; minusBtn.style.opacity = '0.4'; }
                    if (plusBtn) { plusBtn.disabled = true; plusBtn.style.opacity = '0.4'; }
                }, 800);
            });
        } else {
            if (typeof showCustomAlert === 'function') {
                showCustomAlert('Product "' + productName + '" was not found in the store.');
            } else {
                alert('Product not found.');
            }
        }
    };


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

    function addReviewCardToUI(data) {
        const cardId = 'card-' + Date.now();
        const div = document.createElement('div');
        div.className = 'ai-message system-msg';
        div.innerHTML = `
            <div class="ai-review-card" id="${cardId}">
                <div class="ai-review-card-header">
                    <span>Generated Item Details</span>
                    <span style="background: #e0e7ff; color: #4338ca; padding: 2px 8px; border-radius: 10px; font-size: 11px;">${data.category || 'General'}</span>
                </div>
                <div class="ai-review-card-body">
                    <div class="ai-review-row"><span class="ai-review-label">Item Name</span><span class="ai-review-value" id="val-item-${cardId}">${data.item || '-'}</span></div>
                    <div class="ai-review-row"><span class="ai-review-label">Quantity (Qty)</span><span class="ai-review-value" id="val-qty-${cardId}">${data.qty || 1}</span></div>
                    <div class="ai-review-row"><span class="ai-review-label">Cost</span><span class="ai-review-value" id="val-cost-${cardId}">₦${formatVal(data.cost)}</span></div>
                    <div class="ai-review-row"><span class="ai-review-label">Profit</span><span class="ai-review-value" id="val-profit-${cardId}"><span style="font-size:11px;color:#64748b;font-weight:600;">(${(Number(data.cost) > 0 ? ((Number(data.profit) / Number(data.cost)) * 100) : 0).toFixed(1)}%)</span> ₦${formatVal(data.profit)}</span></div>
                    <div class="ai-review-row"><span class="ai-review-label">Unit Type</span><span class="ai-review-value" id="val-unit-${cardId}">${data.unit || 'per piece'}</span></div>
                    <div class="ai-review-row" style="margin-top: 4px; border-top: 1px dashed #e2e8f0; padding-top: 8px;">
                        <span class="ai-review-label" style="font-weight: 600; color: #0f172a;">Final Unit Price</span>
                        <span class="ai-review-value" id="val-price-${cardId}" style="color: #8b5cf6; font-size: 16px;">₦${formatVal(data.price)}</span>
                    </div>
                    <div class="ai-review-row" style="margin-top: 4px; border-top: 1px dashed #e2e8f0; padding-top: 8px;">
                        <span class="ai-review-label" style="font-weight: 800; color: #0f172a;">Total</span>
                        <span class="ai-review-value" id="val-total-${cardId}" style="color: #10b981; font-size: 17px;">₦${formatVal((data.price || 0) * (data.qty || 1))}</span>
                    </div>
                </div>
                <div class="ai-review-card-actions">
                    <button class="ai-btn-confirm" id="btn-confirm-${cardId}">Confirm & Add to Register</button>
                    <button class="ai-btn-edit" id="btn-edit-${cardId}">Edit Manually</button>
                </div>
            </div>
        `;
        historyContainer.appendChild(div);
        scrollToBottom();

        document.getElementById(`btn-confirm-${cardId}`).addEventListener('click', () => {
            document.getElementById(`btn-confirm-${cardId}`).textContent = 'Added ✔';
            document.getElementById(`btn-confirm-${cardId}`).disabled = true;
            document.getElementById(`btn-edit-${cardId}`).style.display = 'none';
            pushToRegister(data);
            if (typeof showCustomAlert === 'function') showCustomAlert("Item successfully added to register via AI!");
        });

        document.getElementById(`btn-edit-${cardId}`).addEventListener('click', () => {
            enableManualEdit(cardId, data);
        });
    }

    function formatVal(val) {
        if (!val || isNaN(val)) return '0';
        return Math.round(Number(val)).toLocaleString();
    }

    function enableManualEdit(cardId, data) {
        const itemEl = document.getElementById(`val-item-${cardId}`);
        const qtyEl = document.getElementById(`val-qty-${cardId}`);
        const costEl = document.getElementById(`val-cost-${cardId}`);
        const profitEl = document.getElementById(`val-profit-${cardId}`);
        const priceEl = document.getElementById(`val-price-${cardId}`);
        const unitEl = document.getElementById(`val-unit-${cardId}`);
        const totalEl = document.getElementById(`val-total-${cardId}`);

        // Calculate initial profit percentage
        const initCost = Number(data.cost) || 0;
        const initProfit = Number(data.profit) || 0;
        const initPct = initCost > 0 ? ((initProfit / initCost) * 100) : 0;
        const initPctDisplay = initPct % 1 === 0 ? initPct.toFixed(0) : initPct.toFixed(2);

        itemEl.innerHTML = `<input type="text" id="edit-item-${cardId}" value="${data.item || ''}" style="width: 120px; text-align: left;">`;
        qtyEl.innerHTML = `<input type="number" id="edit-qty-${cardId}" value="${data.qty || 1}" style="width: 60px;">`;
        costEl.innerHTML = `<input type="number" id="edit-cost-${cardId}" value="${data.cost || 0}">`;
        profitEl.innerHTML = `<span style="font-size:11px;color:#64748b;font-weight:600;" id="edit-profitpct-hint-${cardId}">(${initPctDisplay}%)</span> <input type="number" id="edit-profit-${cardId}" value="${data.profit || 0}">`;
        priceEl.innerHTML = `<input type="number" id="edit-price-${cardId}" value="${data.price || 0}">`;
        unitEl.innerHTML = `<input type="text" id="edit-unit-${cardId}" value="${data.unit || 'per piece'}">`;

        // Add profit percentage row after profit row
        const profitRow = profitEl.closest('.ai-review-row');
        if (profitRow) {
            const pctRow = document.createElement('div');
            pctRow.className = 'ai-review-row';
            pctRow.style.cssText = 'margin-top: 2px;';
            pctRow.innerHTML = `<span class="ai-review-label">Profit %</span><span class="ai-review-value"><input type="number" id="edit-profitpct-${cardId}" value="${initPctDisplay}" step="0.01" min="0" style="width: 80px;"></span>`;
            profitRow.parentNode.insertBefore(pctRow, profitRow.nextSibling);
        }

        const qtyInput = document.getElementById(`edit-qty-${cardId}`);
        const costInput = document.getElementById(`edit-cost-${cardId}`);
        const profitInput = document.getElementById(`edit-profit-${cardId}`);
        const priceInput = document.getElementById(`edit-price-${cardId}`);
        const profitPctInput = document.getElementById(`edit-profitpct-${cardId}`);
        const profitPctHint = document.getElementById(`edit-profitpct-hint-${cardId}`);

        let aiLastProfitSource = 'amount';

        function autoCalcPrice() {
            const cost = Number(costInput.value) || 0;
            const profit = Number(profitInput.value) || 0;
            const quantity = Number(qtyInput.value) || 1;
            const finalPrice = cost + profit;
            priceInput.value = finalPrice;
            totalEl.innerHTML = `₦${formatVal(finalPrice * quantity)}`;
        }

        function onAiProfitAmountInput() {
            aiLastProfitSource = 'amount';
            const cost = Number(costInput.value) || 0;
            const profit = Number(profitInput.value) || 0;
            if (profitPctInput && cost > 0) {
                const pct = (profit / cost) * 100;
                profitPctInput.value = pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(2);
            }
            if (profitPctHint && cost > 0) {
                const pct = (profit / cost) * 100;
                profitPctHint.textContent = `(${pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(1)}%)`;
            }
            autoCalcPrice();
        }

        function onAiProfitPctInput() {
            aiLastProfitSource = 'percent';
            const cost = Number(costInput.value) || 0;
            const pct = Number(profitPctInput.value) || 0;
            if (profitInput && cost > 0) {
                const profit = (pct / 100) * cost;
                profitInput.value = profit % 1 === 0 ? profit.toFixed(0) : profit.toFixed(2);
            }
            if (profitPctHint) {
                profitPctHint.textContent = `(${pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(1)}%)`;
            }
            autoCalcPrice();
        }

        function onAiCostInput() {
            if (aiLastProfitSource === 'percent') {
                onAiProfitPctInput();
            } else {
                onAiProfitAmountInput();
            }
        }

        qtyInput.addEventListener('input', autoCalcPrice);
        costInput.addEventListener('input', onAiCostInput);
        profitInput.addEventListener('input', onAiProfitAmountInput);
        if (profitPctInput) profitPctInput.addEventListener('input', onAiProfitPctInput);
        priceInput.addEventListener('input', () => {
            const quantity = Number(qtyInput.value) || 1;
            const price = Number(priceInput.value) || 0;
            totalEl.innerHTML = `₦${formatVal(price * quantity)}`;
        });

        const editBtn = document.getElementById(`btn-edit-${cardId}`);
        editBtn.textContent = 'Save Changes';
        const newEditBtn = editBtn.cloneNode(true);
        editBtn.parentNode.replaceChild(newEditBtn, editBtn);

        newEditBtn.addEventListener('click', () => {
            const newItemInfo = {
                item: document.getElementById(`edit-item-${cardId}`).value,
                qty: Number(document.getElementById(`edit-qty-${cardId}`).value) || 1,
                cost: Number(document.getElementById(`edit-cost-${cardId}`).value) || 0,
                profit: Number(document.getElementById(`edit-profit-${cardId}`).value) || 0,
                price: Number(document.getElementById(`edit-price-${cardId}`).value) || 0,
                unit: document.getElementById(`edit-unit-${cardId}`).value,
                category: data.category
            };

            // Remove the profit % row on save
            const pctRowEl = document.getElementById(`edit-profitpct-${cardId}`);
            if (pctRowEl) {
                const pctRowParent = pctRowEl.closest('.ai-review-row');
                if (pctRowParent) pctRowParent.remove();
            }

            itemEl.innerHTML = newItemInfo.item;
            qtyEl.innerHTML = newItemInfo.qty;
            costEl.innerHTML = `₦${formatVal(newItemInfo.cost)}`;
            profitEl.innerHTML = `<span style="font-size:11px;color:#64748b;font-weight:600;">(${(newItemInfo.cost > 0 ? ((newItemInfo.profit / newItemInfo.cost) * 100) : 0).toFixed(1)}%)</span> ₦${formatVal(newItemInfo.profit)}`;
            priceEl.innerHTML = `₦${formatVal(newItemInfo.price)}`;
            unitEl.innerHTML = newItemInfo.unit;
            totalEl.innerHTML = `₦${formatVal(newItemInfo.price * newItemInfo.qty)}`;
            newEditBtn.textContent = 'Edit Manually';
            data = newItemInfo;
        });
    }

    function pushToRegister(data) {
        const now = new Date();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        let hours = now.getHours();
        const ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12; hours = hours ? hours : 12;
        const timeStr = `${now.getDate()} ${months[now.getMonth()]}, ${now.getFullYear()} · ${hours}:${now.getMinutes().toString().padStart(2, '0')} ${ampm}`;

        const newSale = {
            date: timeStr, item: data.item, qty: data.qty || 1,
            unitPrice: Number(data.price), unit: data.unit, source: 'AI Assistant'
        };

        const savedSales = localStorage.getItem('nd_sales_history');
        let salesHistory = savedSales ? JSON.parse(savedSales) : [];
        salesHistory.unshift(newSale);
        localStorage.setItem('nd_sales_history', JSON.stringify(salesHistory));

        if (typeof adminProducts !== 'undefined' && Array.isArray(adminProducts)) {
            const exists = adminProducts.find(p => p.name.toLowerCase() === data.item.toLowerCase());
            if (!exists) {
                adminProducts.unshift({ name: data.item, price: data.price, unit: data.unit });
                if (typeof saveProductsToMemory === 'function') saveProductsToMemory();
            }
        }
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

    function loadChatThreads() {
        const saved = localStorage.getItem('nd_user_ai_chat_threads');
        if (saved) {
            try {
                aiChatThreads = JSON.parse(saved);
                if (!Array.isArray(aiChatThreads)) aiChatThreads = [];
            } catch (e) {
                console.error('[User AI] Corrupt thread data', e);
                aiChatThreads = [];
            }
        } else {
            // Migrate legacy flat chat history if exists
            const legacy = localStorage.getItem('nd_ai_chat_history');
            if (legacy) {
                const parsed = JSON.parse(legacy);
                if (parsed.length) {
                    aiChatThreads.push({
                        id: 'thread-' + Date.now(),
                        title: 'Legacy Chat',
                        isPinned: false,
                        updatedAt: Date.now(),
                        messages: parsed
                    });
                }
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
        renderActiveThread(true);
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
        saveActiveHistory();
        switchThread(t.id);
    }

    function switchThread(id) {
        
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
        window.__userAiLocalSaveUntil = Date.now() + 3000;
        persistAiThreads(true);
        renderSidebar(document.getElementById('aiSidebarSearch') ? document.getElementById('aiSidebarSearch').value : '');
    }

    function persistAiThreads(pushCloud) {
        if (!Array.isArray(aiChatThreads)) aiChatThreads = [];

        // Remove empty threads unless it's the currently active thread
        aiChatThreads = aiChatThreads.filter(t => t.id === currentChatId || (t.messages && t.messages.length > 0));

        const payload = JSON.stringify(aiChatThreads);
        window.__userAiThreadsSnapshot = payload;

        try {
            localStorage.setItem('nd_user_ai_chat_threads', payload);
            const flatHistory = aiChatThreads.flatMap(t => (t.messages || []));
            localStorage.setItem('nd_ai_chat_history', JSON.stringify(flatHistory));
        } catch (e) {
            console.error('[User AI] localStorage save failed', e);
            return;
        }

        if (window.NdCloudSync && typeof window.NdCloudSync.pushKeyToCloud === 'function') {
            window.NdCloudSync.pushKeyToCloud('nd_user_ai_chat_threads');
        }
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
                <div class="ai-suggested-container">
                    <div class="ai-suggested-title">Suggested Questions:</div>
                    <button class="ai-suggested-btn" onclick="window._sendAiSuggested('what are the available products?')">1. what are the available products?</button>
                    <button class="ai-suggested-btn" onclick="window._sendAiSuggested('do i have any pending request?')">2. do i have any pending request?</button>
                    <button class="ai-suggested-btn" onclick="window._sendAiSuggested('What should I eat next?')">3. What should I eat next?</button>
                    <button class="ai-suggested-btn" onclick="window._sendAiSuggested('What are all the available features in this app?')">4. What are all the available features in this app?</button>
                    <button class="ai-suggested-btn" onclick="window._sendAiSuggested('what are the latest products?')">5. what are the latest products?</button>
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
                        if (!ext.action) {
                            addReviewCardToUI(ext);
                            isJson = true;
                        } else if (ext.action === 'debtor_note') {
                            addDebtorReviewCardToUI(ext);
                            isJson = true;
                        } else if (ext.action === 'expense_entry') {
                            addExpenseReviewCardToUI(ext);
                            isJson = true;
                        } else if (ext.action === 'sales_entry') {
                            addSalesEntryReviewCardToUI(ext);
                            isJson = true;
                        } else if (ext.action === 'purchase_request') {
                            if (window._handleAiProductSelection) {
                                window._handleAiProductSelection(ext.productName, ext.qty, ext.requestID, idx);
                            }
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
                currentChatId = aiChatThreads.length ? aiChatThreads[0].id : null;
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

    if (window.NdCloudSync && typeof window.NdCloudSync.pullKeyFromCloud === 'function') {
        window.NdCloudSync.pullKeyFromCloud('nd_user_ai_chat_threads').then(() => loadChatThreads());
    } else {
        loadChatThreads();
    }

    window.refreshUserAiChatFromCloud = function () {
        if (!document.getElementById('aiChatModalOverlay')) return;
        if (window.__userAiLocalSaveUntil && Date.now() < window.__userAiLocalSaveUntil) return;

        const input = document.getElementById('aiChatInput');
        if (input && document.activeElement === input) return;

        const saved = localStorage.getItem('nd_user_ai_chat_threads');
        if (!saved) return;
        if (window.__userAiLocalSaveUntil && Date.now() < window.__userAiLocalSaveUntil && saved === window.__userAiThreadsSnapshot) return;

        try {
            const incoming = JSON.parse(saved);
            if (JSON.stringify(incoming) === JSON.stringify(aiChatThreads)) return;

            aiChatThreads = incoming;
            aiChatThreads = aiChatThreads.filter(t => !(t.title === 'New Chat' && t.messages.length === 0));
            window.__userAiThreadsSnapshot = saved;

            if (!aiChatThreads.find(t => t.id === currentChatId) && aiChatThreads.length) {
                currentChatId = aiChatThreads[0].id;
            }
            const sidebarSearch = document.getElementById('aiSidebarSearch');
            renderSidebar(sidebarSearch ? sidebarSearch.value : '');
            renderActiveThread(true);
        } catch (e) {
            console.warn('[User AI] Cloud refresh failed', e);
        }
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




