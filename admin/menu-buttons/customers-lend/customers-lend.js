function openCustomersLend() {
    // Remove existing wrapper if any
    const existing = document.getElementById('customersLendWrapper');
    if (existing) existing.remove();

    fetch('menu-buttons/customers-lend/customers-lend.html')
        .then(res => {
            if (!res.ok) throw new Error("Could not load customers-lend.html");
            return res.text();
        })
        .then(html => {
            const container = document.getElementById('modal-container');
            const wrapper = document.createElement('div');
            wrapper.id = 'customersLendWrapper';
            wrapper.innerHTML = html;
            container.appendChild(wrapper);

            const modal = document.getElementById('customersLendModal');

            // Populate form values
            const enabled = localStorage.getItem('nd_lend_service_enabled') === 'true';
            const price = localStorage.getItem('nd_lend_price') || '';
            const announcement = localStorage.getItem('nd_lend_announcement') || '';
            const bankNum = localStorage.getItem('nd_lend_bank_num') || '';
            const bankName = localStorage.getItem('nd_lend_bank_name') || '';
            const bankAccName = localStorage.getItem('nd_lend_bank_acc_name') || '';
            const phone = localStorage.getItem('nd_lend_phone') || '';

            const toggle = document.getElementById('lendEnabledToggle');
            if (toggle) {
                toggle.checked = enabled;
                
                // Real-time visibility change listener
                toggle.addEventListener('change', () => {
                    localStorage.setItem('nd_lend_service_enabled', toggle.checked ? 'true' : 'false');
                    if (window.realtimeSync) {
                        window.realtimeSync.syncNow('nd_lend_service_enabled');
                    }
                });
            }

            document.getElementById('lendPriceInput').value = price;
            document.getElementById('lendAnnouncementInput').value = announcement;
            document.getElementById('lendAccNumInput').value = bankNum;
            document.getElementById('lendBankNameInput').value = bankName;
            document.getElementById('lendAccNameInput').value = bankAccName;
            document.getElementById('lendPhoneInput').value = phone;

            setTimeout(() => {
                modal.style.display = 'flex';
                modal.offsetHeight;
                modal.classList.add('show');
                if (typeof updateLendServiceBadge === 'function') {
                    updateLendServiceBadge();
                }
            }, 10);
        })
        .catch(err => console.error(err));
}

function closeCustomersLend() {
    const wrapper = document.getElementById('customersLendWrapper');
    const modal = document.getElementById('customersLendModal');
    if (modal) {
        modal.classList.remove('show');
    }
    setTimeout(() => {
        if (wrapper) wrapper.remove();
        if (typeof window.clearAdminModalPersistence === 'function') {
            window.clearAdminModalPersistence();
        }
    }, 400);
}

function saveCustomersLend() {
    const price = document.getElementById('lendPriceInput').value.trim();
    const announcement = document.getElementById('lendAnnouncementInput').value.trim();
    const bankNum = document.getElementById('lendAccNumInput').value.trim();
    const bankName = document.getElementById('lendBankNameInput').value.trim();
    const bankAccName = document.getElementById('lendAccNameInput').value.trim();
    const phone = document.getElementById('lendPhoneInput').value.trim();

    // Verify Master PIN
    const requiredPin = localStorage.getItem('nd_delete_pin') || '1234';

    if (typeof customPrompt === 'function') {
        customPrompt("Please enter the Admin Authorization PIN to save lending settings:", 'password').then(pin => {
            if (pin === null) return; // Cancelled
            if (pin !== requiredPin) {
                if (typeof customAlert === 'function') customAlert("Incorrect PIN. Changes not saved.");
                else alert("Incorrect PIN. Changes not saved.");
                return;
            }
            _finishSavingLendSettings(price, announcement, bankNum, bankName, bankAccName, phone);
        });
    } else {
        const pin = prompt("Please enter the Admin Authorization PIN to save lending settings:");
        if (pin === null) return;
        if (pin !== requiredPin) {
            alert("Incorrect PIN. Changes not saved.");
            return;
        }
        _finishSavingLendSettings(price, announcement, bankNum, bankName, bankAccName, phone);
    }
}

function _finishSavingLendSettings(price, announcement, bankNum, bankName, bankAccName, phone) {
    localStorage.setItem('nd_lend_price', price);
    localStorage.setItem('nd_lend_announcement', announcement);
    localStorage.setItem('nd_lend_bank_num', bankNum);
    localStorage.setItem('nd_lend_bank_name', bankName);
    localStorage.setItem('nd_lend_bank_acc_name', bankAccName);
    localStorage.setItem('nd_lend_phone', phone);

    if (window.realtimeSync) {
        window.realtimeSync.syncNow('nd_lend_price');
        window.realtimeSync.syncNow('nd_lend_announcement');
        window.realtimeSync.syncNow('nd_lend_bank_num');
        window.realtimeSync.syncNow('nd_lend_bank_name');
        window.realtimeSync.syncNow('nd_lend_bank_acc_name');
        window.realtimeSync.syncNow('nd_lend_phone');
    }

    if (typeof customAlert === 'function') {
        customAlert("Customers lending settings updated successfully!");
    } else {
        alert("Customers lending settings updated successfully!");
    }

    closeCustomersLend();
}

function lendAdminOpenChat() {
    closeCustomersLend();
    setTimeout(() => {
        if (typeof openAdminInbox === 'function') {
            openAdminInbox();
        }
    }, 450);
}
