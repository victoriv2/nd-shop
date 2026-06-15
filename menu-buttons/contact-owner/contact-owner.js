document.addEventListener('DOMContentLoaded', () => {
    const container = document.createElement('div');
    container.id = 'contactOwner-modal-container';
    document.body.appendChild(container);

    fetch('menu-buttons/contact-owner/contact-owner.html')
        .then(res => {
            if (!res.ok) throw new Error('Network response not ok');
            return res.text();
        })
        .then(html => {
            container.innerHTML = html;
            initContactOwnerLogic();
        })
        .catch(err => console.warn('Could not load contact-owner.html', err));
});

function initContactOwnerLogic() {
    const modal = document.getElementById('contactOwnerModal');
    const closeBtn = document.getElementById('contactOwnerClose');
    const trigger = document.getElementById('contactOwnerBtn');

    if (!modal) return;

    if (trigger) {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            const phoneText = document.getElementById('shopPhoneNumber');
            if (phoneText) phoneText.textContent = localStorage.getItem('nd_shop_owner_phone') || '';
            modal.classList.add('show');
            document.body.classList.add('modal-open');
        });
    }

    const closeModal = () => {
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);





    // ===================================
    // Contact Actions Logic (Simplified)
    // ===================================
    const btnCopy = document.getElementById('btnCopyPhone');
    const btnCall = document.getElementById('btnCallOwner');
    const phoneText = document.getElementById('shopPhoneNumber');

    const toast = document.getElementById('contactToast');
    const toastText = document.getElementById('contactToastText');

    let toastTimer;

    function showToast(message, actionUrl) {
        clearTimeout(toastTimer);
        toast.style.bottom = '40px';
        toastText.textContent = message;
        toast.classList.add('show');

        // Execute intent
        toastTimer = setTimeout(() => {
            if (actionUrl) {
                window.location.href = actionUrl;
            }
            toast.classList.remove('show');
            // Close modal after phone execution
            if (actionUrl) {
                setTimeout(() => closeModal(), 500);
            }
        }, 1500);
    }

    // 1. Copy Logic
    if (btnCopy && phoneText) {
        btnCopy.addEventListener('click', () => {
            const phoneNumber = phoneText.textContent.replace(/\s+/g, '');
            navigator.clipboard.writeText(phoneNumber).then(() => {
                const originalHtml = btnCopy.innerHTML;
                btnCopy.innerHTML = 'Copied!';
                btnCopy.classList.add('copied');

                showToast("Number copied to clipboard!");

                setTimeout(() => {
                    btnCopy.innerHTML = originalHtml;
                    btnCopy.classList.remove('copied');
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        });
    }

    // 2. Direct Call Logic
    if (btnCall) {
        btnCall.addEventListener('click', (e) => {
            e.preventDefault();
            btnCall.style.transform = "scale(0.96)";
            setTimeout(() => btnCall.style.transform = "", 150);
            const dynamicPhone = localStorage.getItem('nd_shop_owner_phone') || '';
            showToast("Opening Phone Dialer...", "tel:" + dynamicPhone);
        });
    }

    if (window.realtimeSync) {
        window.realtimeSync.on('nd_shop_owner_phone', () => {
            const latest = localStorage.getItem('nd_shop_owner_phone') || '';
            if (phoneText) phoneText.textContent = latest;
        });
    }
}
