let currentPayDebtBase64 = null;
let pdCropperInstance = null;
let isOpeningPayDebtModal = false;

window.refreshPayDebtBankDisplay = function () {
    const wrapper = document.getElementById('payDebtWrapper');
    if (!wrapper) return;
    const bankNumEl = wrapper.querySelector('.bank-account-num');
    const bankNameEl = wrapper.querySelector('.bank-account-name');
    const bankPlEl = wrapper.querySelector('.bank-name');
    if (bankNumEl) bankNumEl.textContent = localStorage.getItem('nd_bank_account_num') || '';
    if (bankNameEl) bankNameEl.textContent = localStorage.getItem('nd_bank_account_name') || '';
    if (bankPlEl) bankPlEl.textContent = localStorage.getItem('nd_bank_name') || '';
};

function openPayDebtModal() {
    if (isOpeningPayDebtModal) return;
    isOpeningPayDebtModal = true;
    
    const existingWrappers = document.querySelectorAll('#payDebtWrapper');
    existingWrappers.forEach(w => w.remove());

    fetch('menu-buttons/pay-debt/pay-debt.html')
        .then(res => res.text())
        .then(html => {
            // extra safeguard
            const duplicateCheck = document.querySelectorAll('#payDebtWrapper');
            duplicateCheck.forEach(w => w.remove());

            const container = document.getElementById('modal-container');
            const wrapper = document.createElement('div');
            wrapper.id = 'payDebtWrapper';
            wrapper.innerHTML = html;
            container.appendChild(wrapper);

            const modal = wrapper.querySelector('#payDebtModal');
            
            // Populate Bank Details Dynamically
            const bankNumEl = wrapper.querySelector('.bank-account-num');
            const bankNameEl = wrapper.querySelector('.bank-account-name');
            const bankPlEl = wrapper.querySelector('.bank-name');
            if (bankNumEl) bankNumEl.textContent = localStorage.getItem('nd_bank_account_num') || '';
            if (bankNameEl) bankNameEl.textContent = localStorage.getItem('nd_bank_account_name') || '';
            if (bankPlEl) bankPlEl.textContent = localStorage.getItem('nd_bank_name') || '';

            setTimeout(() => {
                modal.classList.add('show');
                document.body.classList.add('modal-open');
                initPayDebtListeners(wrapper);
                isOpeningPayDebtModal = false;
            }, 10);
        })
        .catch(err => {
            isOpeningPayDebtModal = false;
            console.error(err);
        });
}

function closePayDebtModal() {
    const wrappers = document.querySelectorAll('#payDebtWrapper');
    const modals = document.querySelectorAll('#payDebtModal');
    
    if (pdCropperInstance) {
        pdCropperInstance.destroy();
        pdCropperInstance = null;
    }
    
    modals.forEach(m => m.classList.remove('show'));
    
    setTimeout(() => {
        wrappers.forEach(w => w.remove());
        
        if (!document.querySelector('.modal-overlay.show') && !document.querySelector('.menu-modal-overlay.show')) {
            document.body.classList.remove('modal-open');
        }
    }, 300);
}

function openDebtHistory() {
    const overlay = document.getElementById('pdHistoryOverlay');
    const list = document.getElementById('pdHistoryList');
    if (!overlay || !list) return;

    const currentUser = window.loggedInUser || JSON.parse(sessionStorage.getItem('nd_logged_in_user') || localStorage.getItem('nd_logged_in_user') || '{}');
    if (!currentUser.id) {
        if (typeof showCustomAlert === 'function') showCustomAlert("You must be logged in to view history.");
        return;
    }

    let requests = JSON.parse(localStorage.getItem('nd_debt_requests') || '[]');
    let userRequests = requests.filter(r => r.userId === currentUser.id);

    userRequests.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (userRequests.length === 0) {
        list.innerHTML = `
            <div style="text-align:center; padding: 40px 20px; color: #888;">
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity: 0.5; margin-bottom: 15px;">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                    <path d="M14 3v5h5M16 13H8M16 17H8M10 9H8"/>
                </svg>
                <div style="font-size: 1.1rem; font-weight: 600; color: #555;">No History Yet</div>
                <div style="font-size: 0.9rem; margin-top: 5px;">You haven't uploaded any payment receipts.</div>
            </div>
        `;
    } else {
        list.innerHTML = userRequests.map(r => {
            const dateObj = new Date(r.timestamp);
            const formattedDate = dateObj.toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true });

            let statusColor = '#f59e0b';
            let statusBg = '#fffbeb';
            let statusIcon = '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>';
            
            if (r.status === 'Approved') {
                statusColor = '#10b981';
                statusBg = '#f0fdf4';
                statusIcon = '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>';
            } else if (r.status === 'Declined') {
                statusColor = '#ef4444';
                statusBg = '#fef2f2';
                statusIcon = '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>';
            }

            return `
                <div style="background: white; border-radius: 16px; padding: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); border: 1px solid #f1f5f9;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                        <span style="font-size: 0.8rem; font-weight: 700; color: #888; background: #f8fafc; padding: 4px 10px; border-radius: 8px;">${formattedDate}</span>
                        <div style="display: flex; align-items: center; gap: 5px; font-size: 0.8rem; font-weight: 700; color: ${statusColor}; background: ${statusBg}; padding: 4px 10px; border-radius: 8px;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12">${statusIcon}</svg>
                            ${r.status}
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 12px; margin-bottom: 12px;">
                        <img src="${r.imgBase64}" style="width: 70px; height: 70px; border-radius: 8px; object-fit: cover; border: 1px solid #e2e8f0; flex-shrink: 0;" onclick="viewPdHistoryReceipt('${encodeURIComponent(r.imgBase64)}')">
                        <div style="flex:1;">
                            ${r.amount ? `<div style="font-size: 1rem; font-weight: 800; color: #1e293b; margin-bottom: 4px;">₦${Number(r.amount).toLocaleString()}</div>` : '<div style="font-size: 0.9rem; font-weight: 600; color: #64748b; margin-bottom: 4px;">Amount Unknown</div>'}
                            ${r.note ? `<div style="font-size: 0.8rem; color: #64748b; font-style: italic; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">"${r.note}"</div>` : ''}
                        </div>
                    </div>
                    
                    <div style="font-size: 0.75rem; color: #94a3b8; font-weight: 500; border-top: 1px dashed #e2e8f0; padding-top: 10px; display: flex; align-items: flex-start; gap: 6px; line-height: 1.4;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12" style="flex-shrink:0;margin-top:2px;color:#8b5cf6;"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
                        <span>${r.aiAction || 'Processing...'}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    overlay.style.display = 'block';
    setTimeout(() => overlay.classList.add('show'), 10);
    document.body.style.overflow = 'hidden';
}

function closeDebtHistory() {
    const overlay = document.getElementById('pdHistoryOverlay');
    if (overlay) {
        overlay.classList.remove('show');
        setTimeout(() => overlay.style.display = 'none', 300);
    }
}

function viewPdHistoryReceipt(base64Str) {
    const imageUri = decodeURIComponent(base64Str);
    
    let viewerOverlay = document.getElementById('pdImageViewerModal');
    if (!viewerOverlay) {
        viewerOverlay = document.createElement('div');
        viewerOverlay.id = 'pdImageViewerModal';
        viewerOverlay.style.cssText = 'display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 999999; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s ease; padding: 20px; box-sizing: border-box; backdrop-filter: blur(4px);';
        
        viewerOverlay.innerHTML = `
            <div style="position: relative; max-width: 90vw; max-height: 90vh;">
                <span class="close-viewer" style="position: absolute; top: -40px; right: 0; color: white; font-size: 30px; font-weight: bold; cursor: pointer; text-shadow: 0 2px 5px rgba(0,0,0,0.5);">&times;</span>
                <img src="" style="max-width: 100%; max-height: 85vh; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); display: block;" />
            </div>
        `;
        document.body.appendChild(viewerOverlay);

        viewerOverlay.addEventListener('click', function(e) {
            if (e.target.tagName !== 'IMG') {
                viewerOverlay.style.opacity = '0';
                setTimeout(() => viewerOverlay.style.display = 'none', 300);
            }
        });
    }

    const imgEl = viewerOverlay.querySelector('img');
    if (imgEl) imgEl.src = imageUri;

    viewerOverlay.style.display = 'flex';
    setTimeout(() => viewerOverlay.style.opacity = '1', 10);
}

let pdUndoStack = [];
let pdRedoStack = [];
let pdIsRestoringState = false;
let pdZoomSaveTimer = null;

function updatePdUndoRedoButtons() {
    const undoBtn = document.getElementById('pdCropUndoBtn');
    const redoBtn = document.getElementById('pdCropRedoBtn');
    if (undoBtn) {
        undoBtn.disabled = pdUndoStack.length === 0;
        undoBtn.style.opacity = pdUndoStack.length === 0 ? '0.35' : '1';
        undoBtn.style.pointerEvents = pdUndoStack.length === 0 ? 'none' : 'auto';
    }
    if (redoBtn) {
        redoBtn.disabled = pdRedoStack.length === 0;
        redoBtn.style.opacity = pdRedoStack.length === 0 ? '0.35' : '1';
        redoBtn.style.pointerEvents = pdRedoStack.length === 0 ? 'none' : 'auto';
    }
}

function getPdCropperFullState() {
    if (!pdCropperInstance) return null;
    return {
        canvasData: pdCropperInstance.getCanvasData(),
        cropBoxData: pdCropperInstance.getCropBoxData(),
        data: pdCropperInstance.getData(),
        imageData: pdCropperInstance.getImageData()
    };
}

function restorePdCropperState(state) {
    if (!pdCropperInstance || !state) return;
    pdIsRestoringState = true;

    // Restore rotation first via setData (it carries the rotate property)
    pdCropperInstance.rotateTo(state.data.rotate || 0);

    // Wait for Cropper.js to settle after rotation change
    requestAnimationFrame(() => {
        // Set canvas data (this controls zoom & pan position)
        pdCropperInstance.setCanvasData(state.canvasData);

        requestAnimationFrame(() => {
            // Restore crop box position & size
            pdCropperInstance.setCropBoxData(state.cropBoxData);

            requestAnimationFrame(() => {
                // Finally apply precise crop coordinates
                pdCropperInstance.setData(state.data);
                pdIsRestoringState = false;
                updatePdUndoRedoButtons();
            });
        });
    });
}

function savePdCropperState() {
    if (!pdCropperInstance || pdIsRestoringState) return;
    pdUndoStack.push(getPdCropperFullState());
    pdRedoStack = [];
    updatePdUndoRedoButtons();
}

function initPayDebtListeners(wrapper) {
    const cameraInput = wrapper.querySelector('#payDebtCameraInput');
    const galleryInput = wrapper.querySelector('#payDebtGalleryInput');
    const preview = wrapper.querySelector('#payDebtImagePreview');
    const removeBtn = wrapper.querySelector('#payDebtRemoveImg');
    const uploadArea = wrapper.querySelector('#payDebtUploadArea');
    const submitBtn = wrapper.querySelector('#submitPayDebtBtn');

    const handleFile = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                openPdCropper(event.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    if (cameraInput) {
        // remove old listener just in case it persisted
        cameraInput.removeEventListener('change', handleFile);
        cameraInput.addEventListener('change', handleFile);
    }
    if (galleryInput) {
        galleryInput.removeEventListener('change', handleFile);
        galleryInput.addEventListener('change', handleFile);
    }

    removeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        currentPayDebtBase64 = null;
        if (cameraInput) cameraInput.value = '';
        if (galleryInput) galleryInput.value = '';
        preview.src = '';
        preview.style.display = 'none';
        removeBtn.style.display = 'none';
        uploadArea.classList.remove('has-image');
        
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.style.background = '';
            const btnText = submitBtn.querySelector('.btn-text');
            if (btnText) btnText.textContent = 'Submit Payment';
        }
    });

    submitBtn.addEventListener('click', handlePayDebtSubmit);

    // Cropper buttons
    const cancelBtn = wrapper.querySelector('#pdCropCancelBtn');
    const rotateLeftBtn = wrapper.querySelector('#pdCropRotateLeftBtn');
    const rotateRightBtn = wrapper.querySelector('#pdCropRotateRightBtn');
    const resetBtn = wrapper.querySelector('#pdCropResetBtn');
    const undoBtn = wrapper.querySelector('#pdCropUndoBtn');
    const redoBtn = wrapper.querySelector('#pdCropRedoBtn');
    const confirmBtn = wrapper.querySelector('#pdCropConfirmBtn');

    if (cancelBtn) cancelBtn.addEventListener('click', closePdCropper);
    
    if (rotateLeftBtn) rotateLeftBtn.addEventListener('click', () => { 
        if (pdCropperInstance) {
            savePdCropperState();
            pdCropperInstance.rotate(-90);
            setTimeout(() => {
                if (pdCropperInstance) {
                    const canvasData = pdCropperInstance.getCanvasData();
                    pdCropperInstance.setCropBoxData({
                        left: canvasData.left,
                        top: canvasData.top,
                        width: canvasData.width,
                        height: canvasData.height
                    });
                }
            }, 50);
        }
    });

    if (rotateRightBtn) rotateRightBtn.addEventListener('click', () => { 
        if (pdCropperInstance) {
            savePdCropperState();
            pdCropperInstance.rotate(90);
            setTimeout(() => {
                if (pdCropperInstance) {
                    const canvasData = pdCropperInstance.getCanvasData();
                    pdCropperInstance.setCropBoxData({
                        left: canvasData.left,
                        top: canvasData.top,
                        width: canvasData.width,
                        height: canvasData.height
                    });
                }
            }, 50);
        }
    });

    if (resetBtn) resetBtn.addEventListener('click', () => {
        if (pdCropperInstance) {
            savePdCropperState();
            pdCropperInstance.reset();
            pdCropperInstance.rotateTo(0);
            pdCropperInstance.scale(1, 1);
        }
    });
    
    if (undoBtn) undoBtn.addEventListener('click', () => {
        if (pdCropperInstance && pdUndoStack.length) {
            const currentState = getPdCropperFullState();
            if (currentState) pdRedoStack.push(currentState);
            const prev = pdUndoStack.pop();
            restorePdCropperState(prev);
        }
    });

    if (redoBtn) redoBtn.addEventListener('click', () => {
        if (pdCropperInstance && pdRedoStack.length) {
            const currentState = getPdCropperFullState();
            if (currentState) pdUndoStack.push(currentState);
            const next = pdRedoStack.pop();
            restorePdCropperState(next);
        }
    });
    
    if (confirmBtn) confirmBtn.addEventListener('click', confirmPdCrop);
}

function openPdCropper(imageSrc) {
    const overlay = document.getElementById('pdCropperOverlay');
    const cropperImg = document.getElementById('pdCropperImage');
    if (!overlay || !cropperImg) return;

    cropperImg.src = imageSrc;
    overlay.style.display = 'flex';
    
    pdUndoStack = [];
    pdRedoStack = [];
    pdIsRestoringState = false;
    updatePdUndoRedoButtons();

    // Destroy old instance
    if (pdCropperInstance) pdCropperInstance.destroy();

    setTimeout(() => {
        pdCropperInstance = new Cropper(cropperImg, {
            viewMode: 0, dragMode: 'move', autoCropArea: 1,
            restore: false, guides: true, center: true, highlight: false,
            cropBoxMovable: true, toggleDragModeOnDblclick: false,
            zoom: function (e) {
                if (pdIsRestoringState) return;
                if (!pdZoomSaveTimer) {
                    const preZoomState = getPdCropperFullState();
                    if (preZoomState) {
                        pdUndoStack.push(preZoomState);
                        pdRedoStack = [];
                        updatePdUndoRedoButtons();
                    }
                }
                clearTimeout(pdZoomSaveTimer);
                pdZoomSaveTimer = setTimeout(() => {
                    pdZoomSaveTimer = null;
                }, 300);
            }
        });
    }, 50);
}

function closePdCropper() {
    const overlay = document.getElementById('pdCropperOverlay');
    if (pdCropperInstance) {
        pdCropperInstance.destroy();
        pdCropperInstance = null;
    }
    if (overlay) overlay.style.display = 'none';
    
    // Reset file inputs
    const cameraInput = document.getElementById('payDebtCameraInput');
    const galleryInput = document.getElementById('payDebtGalleryInput');
    if (cameraInput) cameraInput.value = '';
    if (galleryInput) galleryInput.value = '';

    pdIsRestoringState = false;
    clearTimeout(pdZoomSaveTimer);
    pdZoomSaveTimer = null;
}

function confirmPdCrop() {
    if (!pdCropperInstance) return;

    const canvas = pdCropperInstance.getCroppedCanvas({ maxWidth: 1024, maxHeight: 1024 });
    currentPayDebtBase64 = canvas.toDataURL('image/jpeg', 0.8);

    const wrapper = document.getElementById('payDebtWrapper');
    if (!wrapper) return;

    const preview = wrapper.querySelector('#payDebtImagePreview');
    const removeBtn = wrapper.querySelector('#payDebtRemoveImg');
    const uploadArea = wrapper.querySelector('#payDebtUploadArea');

    if (preview) {
        preview.src = currentPayDebtBase64;
        preview.style.display = 'block';
    }
    if (removeBtn) removeBtn.style.display = 'block';
    if (uploadArea) {
        uploadArea.classList.add('has-image');
    }

    // Close cropper
    closePdCropper();
    
    // Reset submit button state in case it was previously declined
    const submitBtn = wrapper.querySelector('#submitPayDebtBtn');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.background = '';
        const btnText = submitBtn.querySelector('.btn-text');
        if (btnText) btnText.textContent = 'Submit Payment';
    }
}

async function handlePayDebtSubmit() {
    if (!currentPayDebtBase64) {
        if (typeof showCustomAlert === 'function') showCustomAlert("Please upload a picture of the transfer receipt.");
        return;
    }

    const submitBtn = document.getElementById('submitPayDebtBtn');
    const note = document.getElementById('payDebtNote').value.trim();
    const btnText = submitBtn.querySelector('.btn-text');
    const loader = submitBtn.querySelector('.loader');

    // UI Loading state
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    loader.style.display = 'inline-block';

    const currentUser = window.loggedInUser || JSON.parse(sessionStorage.getItem('nd_logged_in_user') || localStorage.getItem('nd_logged_in_user') || '{}');
    if (!currentUser || !currentUser.id) {
        if (typeof showCustomAlert === 'function') showCustomAlert("You must be logged in.");
        closePayDebtModal();
        return;
    }

    try {
        // 1. Call x.ai API to extract amount from receipt
        const XAI_MODEL = 'grok-4.20-0309-reasoning';
        
        const systemPrompt = `You are an AI assistant processing bank transfer receipts for a debt payment system.
Your job is to extract the exact total amount paid from the provided receipt image.
Rules:
- Look for the MAIN total/amount transferred. 
- If there are TWO or more different total amounts visible, flag it by setting "ambiguous" to true and list both amounts.
- If the receipt is completely illegible or not a valid transfer receipt, set "valid" to false.
- Return ONLY a JSON object. Do NOT wrap in markdown.

Format: {"valid": true/false, "amount": number_or_null, "ambiguous": false, "amounts": [], "note": "brief description of what you see"}
Examples:
- Clear receipt: {"valid": true, "amount": 5000, "ambiguous": false, "amounts": [5000], "note": "Transfer of 5000 to account"}
- Two totals: {"valid": true, "amount": null, "ambiguous": true, "amounts": [5000, 3000], "note": "Two amounts visible - 5000 and 3000"}
- Invalid: {"valid": false, "amount": null, "ambiguous": false, "amounts": [], "note": "Image is not a transfer receipt"}`;

        const messages = [
            { role: "system", content: systemPrompt },
            { 
                role: "user", 
                content: [
                    { type: "text", text: "Receipt Note: " + (note || "No note provided.") + "\nUser ID: " + currentUser.id + "\nUser Name: " + (currentUser.firstName || '') + " " + (currentUser.lastName || '') },
                    { type: "image_url", image_url: { url: currentPayDebtBase64 } }
                ] 
            }
        ];

        const res = await fetch(`${window.API_BASE}/api/ai-chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('nd_token') || ''}` },
            body: JSON.stringify({ model: XAI_MODEL, messages: messages, temperature: 0.1 })
        });

        const data = await res.json();
        let aiResult = null;

        if (data.success && data.data && data.data.choices && data.data.choices.length > 0) {
            const content = data.data.choices[0].message.content.trim();
            try {
                let cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
                aiResult = JSON.parse(cleanJson);
            } catch(e) {
                console.warn("AI failed to parse JSON properly", content);
            }
        }

        // 2. Process AI result - NEVER auto-update debtor notes
        let newDebtRequest = {
            id: 'DR-' + Date.now() + Math.floor(Math.random() * 1000),
            userId: currentUser.id,
            user: currentUser,
            amount: null,
            imgBase64: currentPayDebtBase64,
            note: note,
            timestamp: new Date().toISOString(),
            status: 'Pending',
            aiAction: ''
        };

        if (!aiResult || !aiResult.valid) {
            // AI rejected the receipt - tell user but DO NOT send to admin
            submitBtn.disabled = true;
            submitBtn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)'; // Red color
            btnText.textContent = 'Declined';
            btnText.style.display = 'block';
            loader.style.display = 'none';

            if (typeof showCustomAlert === 'function') showCustomAlert("Your receipt was declined. " + (aiResult ? aiResult.note : "The image could not be read. Please try again with a clearer photo."));
            return;
        }

        if (aiResult.ambiguous) {
            // Two totals found - send to admin with warning
            newDebtRequest.status = 'Pending';
            newDebtRequest.amount = null;
            newDebtRequest.aiAction = `⚠️ AMBIGUOUS: AI found multiple amounts (${aiResult.amounts.join(', ')}). Admin must verify the correct total. Note: ${aiResult.note}`;

            if (typeof showCustomAlert === 'function') showCustomAlert("Receipt uploaded. Multiple amounts were detected — your payment is pending Admin verification.");
        } else if (aiResult.amount && aiResult.amount > 0) {
            // Clean single amount found - send to admin for approval
            newDebtRequest.status = 'Pending';
            newDebtRequest.amount = aiResult.amount;
            newDebtRequest.aiAction = `AI Extracted ₦${aiResult.amount.toLocaleString()} from receipt (User ID: ${currentUser.id}). Awaiting Admin approval to deduct from debtor book. ${aiResult.note || ''}`;

            if (typeof showCustomAlert === 'function') showCustomAlert(`Receipt uploaded! ₦${aiResult.amount.toLocaleString()} detected. Pending Admin approval.`);
        } else {
            // No amount found
            newDebtRequest.status = 'Pending';
            newDebtRequest.aiAction = `AI could not extract a specific amount. ${aiResult.note || 'Pending Admin Review.'}`;

            if (typeof showCustomAlert === 'function') showCustomAlert("Receipt uploaded. Amount could not be determined automatically — pending Admin verification.");
        }

        // Store request - admin will handle everything
        let debtRequests = JSON.parse(localStorage.getItem('nd_debt_requests') || '[]');
        debtRequests.unshift(newDebtRequest);
        localStorage.setItem('nd_debt_requests', JSON.stringify(debtRequests));

        // Close and cleanup
        closePayDebtModal();

    } catch (e) {
        console.error(e);
        submitBtn.disabled = false;
        btnText.style.display = 'block';
        loader.style.display = 'none';
        if (typeof showCustomAlert === 'function') showCustomAlert("There was an error processing your receipt. Please try again.");
    }
}




