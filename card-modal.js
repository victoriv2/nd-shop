document.addEventListener('DOMContentLoaded', () => {
    // Dynamically insert the modal container into the page
    const container = document.createElement('div');
    container.id = 'card-modal-container';
    document.body.appendChild(container);

    // Fetch the modal HTML template
    fetch('card-modal.html')
        .then(response => {
            if (!response.ok) throw new Error('Network response not ok');
            return response.text();
        })
        .then(html => {
            container.innerHTML = html;
            initCardModalLogic();
        })
        .catch(err => {
            console.warn('Could not load card-modal.html', err);
        });
});

function initCardModalLogic() {
    const transactionModal = document.getElementById('transactionModal');



    // Handle clicks opening and closing the new Modal
    document.addEventListener('click', (e) => {
        // Did we click on the regular transaction card?
        const regularCard = e.target.closest('.regular-card');
        const tmCloseButton = e.target.closest('#tmClose');

        if (regularCard) {
            // Find what text specifically needs to be copied out of the card
            const amountElem = regularCard.querySelector('.card-main-amount');
            const descElem = regularCard.querySelector('.card-buying-text');
            const timeElem = regularCard.querySelector('.card-time-text');

            // Getting the amount string alone WITHOUT getting the span text (the '+' sign or 'Cashback' word)
            let amountVal = '0.00';
            if (amountElem) {
                // Cloning it so we can safely edit it
                const clone = amountElem.cloneNode(true);
                const plusSpan = clone.querySelector('.green-plus');
                const cbText = clone.querySelector('.card-cashback-text');

                if (plusSpan) clone.removeChild(plusSpan);
                if (cbText) clone.removeChild(cbText);

                amountVal = clone.textContent.trim();
            }

            // Getting the destination fields in the Modal to populate them
            const destAmount = document.getElementById('tmAmountValue');
            const destDesc = document.getElementById('tmDescription');
            const destDate = document.getElementById('tmDate');

            if (destAmount) destAmount.textContent = amountVal;
            if (destDesc && descElem) destDesc.textContent = descElem.textContent;
            if (destDate && timeElem) destDate.textContent = timeElem.textContent;

            // Generate dynamic Transaction ID & Reference based on User ID
            const userIdElem = document.querySelector('.user-id-text');
            let userId = '00000ND'; // Fallback
            if (userIdElem) {
                // Text is "User ID: 00000ND", cleanly extract just the ID part
                userId = userIdElem.textContent.replace('User ID:', '').replace('User ID', '').trim();
            }

            const destTxn = document.getElementById('tmTransactionId');
            const destRef = document.getElementById('tmReference');

            if (destTxn || destRef) {
                const now = new Date();
                const yyyy = now.getFullYear();
                const mm = (now.getMonth() + 1).toString().padStart(2, '0');
                const dd = now.getDate().toString().padStart(2, '0');
                let hours = now.getHours();
                const minutes = now.getMinutes().toString().padStart(2, '0');
                const ampm = hours >= 12 ? 'pm' : 'am';
                hours = hours % 12;
                hours = hours ? hours : 12; // 0 becomes 12
                const strHours = hours.toString().padStart(2, '0');

                if (destTxn) {
                    let txnUserId = userId;
                    if (txnUserId.endsWith('nd')) {
                        txnUserId = 'nd' + txnUserId.slice(0, -2);
                    } else if (txnUserId.endsWith('nd SHOP')) {
                        txnUserId = 'nd SHOP' + txnUserId.slice(0, -2);
                    }
                    destTxn.textContent = `TXN-${txnUserId}${yyyy}${mm}${dd}${strHours}${minutes}${ampm}`;
                }
                if (destRef) {
                    destRef.textContent = userId;
                }
            }

            // Pop the modal!
            if (transactionModal) transactionModal.classList.add('show');

        }
        // Handles closing the modal if they click the X button
        else if (tmCloseButton) {
            transactionModal.classList.remove('show');
        }
        // Handle Report Issue (Open Message)
        else if (e.target.closest('#tmReportBtn')) {
            if (typeof openMessagingChat === 'function') {
                openMessagingChat('ADMIN', 'Shop Owner');
                transactionModal.classList.remove('show');
            }
        }
    });
}
