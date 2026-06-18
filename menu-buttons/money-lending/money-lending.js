let currentLendReceiptBase64 = null;
let lendCropperInstance = null;
let isOpeningMoneyLending = false;

window.openMoneyLendingModal = function() {
    if (isOpeningMoneyLending) return;
    isOpeningMoneyLending = true;

    // Remove any existing money lending modals
    const existing = document.querySelectorAll('#moneyLendingWrapper');
    existing.forEach(w => w.remove());

    fetch('menu-buttons/money-lending/money-lending.html')
        .then(res => {
            if (!res.ok) throw new Error("Could not load money-lending.html");
            return res.text();
        })
        .then(html => {
            const container = document.getElementById('modal-container');
            if (!container) {
                console.error('[MoneyLending] #modal-container not found in DOM');
                isOpeningMoneyLending = false;
                return;
            }
            const wrapper = document.createElement('div');
            wrapper.id = 'moneyLendingWrapper';
            wrapper.innerHTML = html;
            container.appendChild(wrapper);

            const modal = wrapper.querySelector('#moneyLendingModal');
            
            // Populate details dynamically
            const announcementText = localStorage.getItem('nd_lend_announcement') || '';
            const price = localStorage.getItem('nd_lend_price') || '';
            const accNum = localStorage.getItem('nd_lend_bank_num') || '';
            const bankName = localStorage.getItem('nd_lend_bank_name') || '';
            const accName = localStorage.getItem('nd_lend_bank_acc_name') || '';
            const phone = localStorage.getItem('nd_lend_phone') || '';

            // Announcement card
            const announcementCard = wrapper.querySelector('.lend-announcement-card');
            if (announcementCard) {
                if (!announcementText) {
                    announcementCard.style.display = 'none';
                } else {
                    announcementCard.style.display = 'flex';
                    wrapper.querySelector('#lendAnnouncementText').textContent = announcementText;
                }
            }

            // Price display
            const priceValEl = wrapper.querySelector('#lendPriceDisplay');
            if (priceValEl) {
                if (!price) {
                    wrapper.querySelector('.lend-price-section').style.display = 'none';
                } else {
                    wrapper.querySelector('.lend-price-section').style.display = 'block';
                    priceValEl.textContent = '₦' + Number(price).toLocaleString();
                }
            }

            // Bank details rows (hide if field is completely blank)
            const detailRows = {
                'lendAccNum': accNum,
                'lendBankName': bankName,
                'lendAccName': accName,
                'lendPhone': phone
            };

            for (const [id, value] of Object.entries(detailRows)) {
                const element = wrapper.querySelector('#' + id);
                if (element) {
                    const row = element.closest('.lend-detail-row');
                    if (row) {
                        if (!value) {
                            row.style.display = 'none';
                        } else {
                            row.style.display = 'flex';
                            element.textContent = value;
                        }
                    }
                }
            }

            setTimeout(() => {
                modal.classList.add('show');
                document.body.classList.add('modal-open');
                initMoneyLendingListeners(wrapper);
                isOpeningMoneyLending = false;
            }, 10);
        })
        .catch(err => {
            isOpeningMoneyLending = false;
            console.error(err);
        });
};

window.closeMoneyLendingModal = function() {
    const wrapper = document.getElementById('moneyLendingWrapper');
    const modal = document.getElementById('moneyLendingModal');
    
    if (lendCropperInstance) {
        lendCropperInstance.destroy();
        lendCropperInstance = null;
    }
    
    if (modal) modal.classList.remove('show');
    
    setTimeout(() => {
        if (wrapper) wrapper.remove();
        if (!document.querySelector('.modal-overlay.show') && !document.querySelector('.menu-modal-overlay.show') && !document.querySelector('.full-page-overlay.show')) {
            document.body.classList.remove('modal-open');
        }
    }, 300);
};

function initMoneyLendingListeners(wrapper) {
    const closeBtn = wrapper.querySelector('#closeMoneyLendingBtn');
    const openChatBtn = wrapper.querySelector('#lendOpenChatBtn');
    const cameraInput = wrapper.querySelector('#lendCameraInput');
    const galleryInput = wrapper.querySelector('#lendGalleryInput');
    const removeImgBtn = wrapper.querySelector('#lendRemoveImgBtn');
    const submitBtn = wrapper.querySelector('#submitLendRequestBtn');

    if (closeBtn) closeBtn.addEventListener('click', closeMoneyLendingModal);
    
    if (openChatBtn) {
        openChatBtn.addEventListener('click', () => {
            closeMoneyLendingModal();
            if (typeof window.openMessagingChat === 'function') {
                window.openMessagingChat('ADMIN', 'Shop Owner');
            }
        });
    }

    // Camera and gallery input change
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            openLendCropper(event.target.result);
        };
        reader.readAsDataURL(file);
    };

    if (cameraInput) cameraInput.addEventListener('change', handleFileChange);
    if (galleryInput) galleryInput.addEventListener('change', handleFileChange);

    // Remove image preview
    if (removeImgBtn) {
        removeImgBtn.addEventListener('click', () => {
            currentLendReceiptBase64 = null;
            const previewContainer = wrapper.querySelector('#lendImagePreviewContainer');
            const previewImg = wrapper.querySelector('#lendImagePreview');
            const uploadIcon = wrapper.querySelector('.upload-area-icon');
            const uploadText = wrapper.querySelector('.upload-area-text');
            const uploadActions = wrapper.querySelector('.upload-area-actions');

            if (previewContainer) previewContainer.style.display = 'none';
            if (previewImg) previewImg.src = '';
            if (uploadIcon) uploadIcon.style.display = 'inline-block';
            if (uploadText) uploadText.style.display = 'block';
            if (uploadActions) uploadActions.style.display = 'flex';
            
            if (cameraInput) cameraInput.value = '';
            if (galleryInput) galleryInput.value = '';
        });
    }

    // Crop Actions
    const cropCancelBtn = wrapper.querySelector('#lendCropCancelBtn');
    const cropRotateLeftBtn = wrapper.querySelector('#lendCropRotateLeftBtn');
    const cropRotateRightBtn = wrapper.querySelector('#lendCropRotateRightBtn');
    const cropConfirmBtn = wrapper.querySelector('#lendCropConfirmBtn');

    if (cropCancelBtn) cropCancelBtn.addEventListener('click', closeLendCropper);
    
    if (cropRotateLeftBtn) {
        cropRotateLeftBtn.addEventListener('click', () => {
            if (lendCropperInstance) lendCropperInstance.rotate(-90);
        });
    }

    if (cropRotateRightBtn) {
        cropRotateRightBtn.addEventListener('click', () => {
            if (lendCropperInstance) lendCropperInstance.rotate(90);
        });
    }

    if (cropConfirmBtn) {
        cropConfirmBtn.addEventListener('click', () => {
            if (!lendCropperInstance) return;
            const canvas = lendCropperInstance.getCroppedCanvas({ maxWidth: 1024, maxHeight: 1024 });
            currentLendReceiptBase64 = canvas.toDataURL('image/jpeg', 0.85);

            const previewContainer = wrapper.querySelector('#lendImagePreviewContainer');
            const previewImg = wrapper.querySelector('#lendImagePreview');
            const uploadIcon = wrapper.querySelector('.upload-area-icon');
            const uploadText = wrapper.querySelector('.upload-area-text');
            const uploadActions = wrapper.querySelector('.upload-area-actions');

            if (previewImg) previewImg.src = currentLendReceiptBase64;
            if (previewContainer) previewContainer.style.display = 'block';
            if (uploadIcon) uploadIcon.style.display = 'none';
            if (uploadText) uploadText.style.display = 'none';
            if (uploadActions) uploadActions.style.display = 'none';

            closeLendCropper();
        });
    }

    // Submit Action
    if (submitBtn) {
        submitBtn.addEventListener('click', () => handleLendRequestSubmit(wrapper));
    }
}

// Copy clipboard function helper
window.copyLendDetail = function(elementId, btn) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const text = el.textContent.trim();
    if (!text) return;
    
    navigator.clipboard.writeText(text).then(() => {
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        
        // Custom toast notice if function is available
        if (typeof showCustomAlert === 'function') {
            // Safe inline toast or alert
        }
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.classList.remove('copied');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
};

// Cropper Helpers
function openLendCropper(imageSrc) {
    const overlay = document.getElementById('lendCropperOverlay');
    const cropperImg = document.getElementById('lendCropperImage');
    if (!overlay || !cropperImg) return;

    cropperImg.src = imageSrc;
    overlay.style.display = 'flex';

    if (lendCropperInstance) lendCropperInstance.destroy();

    setTimeout(() => {
        lendCropperInstance = new Cropper(cropperImg, {
            viewMode: 1,
            dragMode: 'move',
            autoCropArea: 1,
            restore: false,
            guides: true,
            center: true,
            highlight: false,
            cropBoxMovable: true,
            toggleDragModeOnDblclick: false
        });
    }, 50);
}

function closeLendCropper() {
    const overlay = document.getElementById('lendCropperOverlay');
    if (lendCropperInstance) {
        lendCropperInstance.destroy();
        lendCropperInstance = null;
    }
    if (overlay) overlay.style.display = 'none';

    const cameraInput = document.getElementById('lendCameraInput');
    const galleryInput = document.getElementById('lendGalleryInput');
    if (cameraInput) cameraInput.value = '';
    if (galleryInput) galleryInput.value = '';
}

async function handleLendRequestSubmit(wrapper) {
    const note = wrapper.querySelector('#lendSupportText').value.trim();
    
    // Validate that either note OR receipt image is provided
    if (!currentLendReceiptBase64 && !note) {
        if (typeof showCustomAlert === 'function') {
            showCustomAlert("Please upload a receipt image or enter a supporting text request.");
        } else {
            alert("Please upload a receipt image or enter a supporting text request.");
        }
        return;
    }

    const submitBtn = wrapper.querySelector('#submitLendRequestBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const loader = submitBtn.querySelector('.loader');

    // Show loading state
    submitBtn.disabled = true;
    if (btnText) btnText.style.display = 'none';
    if (loader) loader.style.display = 'inline-block';

    const currentUser = window.loggedInUser || JSON.parse(localStorage.getItem('nd_logged_in_user')) || { id: '00000ND', firstName: 'Victor', lastName: 'Iv' };

    try {
        const messages = JSON.parse(localStorage.getItem('nd_messages') || '[]');
        const myId = currentUser.id || '00000ND';
        const threadKey = `thread_${[myId, 'ADMIN'].sort().join('_')}`;

        // Construct message payload
        const type = currentLendReceiptBase64 ? 'image' : 'text';
        const content = note ? note : 'Receipt uploaded for money lending service.';
        const mediaUrl = currentLendReceiptBase64 ? currentLendReceiptBase64 : null;

        const newMsg = {
            id: `msg-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            threadKey: threadKey,
            senderId: myId,
            receiverId: 'ADMIN',
            content: content,
            type: type,
            mediaUrl: mediaUrl,
            duration: null,
            timestamp: new Date().toISOString(),
            status: 'sent',
            isEdited: false,
            isPinned: false,
            readBy: [myId],
            deletedFor: [],
            replyTo: null,
            isLendingRequest: true // Unique identifier badge
        };

        messages.push(newMsg);
        
        // Save to localStorage which dispatches SET and syncs it to Supabase
        localStorage.setItem('nd_messages', JSON.stringify(messages));

        // Toast success message
        if (typeof showCustomAlert === 'function') {
            showCustomAlert("Lending request submitted successfully!");
        } else {
            alert("Lending request submitted successfully!");
        }

        // Close the lending screen
        closeMoneyLendingModal();

        // Redirect directly to the support chat thread
        setTimeout(() => {
            if (typeof window.openMessagingChat === 'function') {
                window.openMessagingChat('ADMIN', 'Shop Owner');
            }
        }, 300);

    } catch (err) {
        console.error(err);
        if (typeof showCustomAlert === 'function') {
            showCustomAlert("Error submitting lending request. Please try again.");
        } else {
            alert("Error submitting lending request.");
        }
        
        // Reset button state
        submitBtn.disabled = false;
        if (btnText) btnText.style.display = 'block';
        if (loader) loader.style.display = 'none';
    }
}
