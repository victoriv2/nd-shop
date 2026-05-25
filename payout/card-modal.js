document.addEventListener('DOMContentLoaded', () => {
    // Dynamically insert the modal container into the page
    const container = document.createElement('div');
    container.id = 'card-modal-container';
    document.body.appendChild(container);

    // Fetch the modal HTML template
    fetch('payout/card-modal.html')
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
            // Prevent opening card modal if the sort dropdown is currently open
            const sortDropdown = document.getElementById('sortDropdown');
            if (sortDropdown && sortDropdown.classList.contains('show')) {
                return;
            }

            // Find what text specifically needs to be copied out of the card
            const amountElem = regularCard.querySelector('.card-main-amount');
            const textElems = regularCard.querySelectorAll('.card-buying-text');
            const descElem = textElems.length > 1 ? textElems[1] : textElems[0];
            const timeElem = regularCard.querySelector('.card-time-text');

            // Getting the amount string alone WITHOUT getting the span text (the '+' sign or 'Payout' word)
            let amountVal = '0.00';
            if (amountElem) {
                // Cloning it so we can safely edit it
                const clone = amountElem.cloneNode(true);
                const plusSpan = clone.querySelector('.green-plus');
                const cbText = clone.querySelector('.card-payout-text');

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

            // Generate dynamic Transaction ID & Reference based on ID
            const userIdElem = document.querySelector('.user-id-text');
            const user = window.loggedInUser || { id: '00000ND' };
            let userId = user.id; // Fallback
            if (userIdElem) {
                // Text is "ID: 00000ND", cleanly extract just the ID part
                userId = userIdElem.textContent.replace('ID:', '').replace('ID', '').trim();
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
            if (transactionModal) {
                transactionModal.classList.add('show');
                document.body.classList.add('modal-open');
            }

        }
        // Handles closing the modal if they click the X button
        else if (tmCloseButton) {
            transactionModal.classList.remove('show');
            document.body.classList.remove('modal-open');
        }
        // Handle Report Issue (Open Message)
        else if (e.target.closest('#tmReportBtn')) {
            if (typeof openMessagingChat === 'function') {
                openMessagingChat('ADMIN', 'Shop Owner');
                transactionModal.classList.remove('show');
                document.body.classList.remove('modal-open');
            }
        }
    }, true); // Use capture phase so we check the sortDropdown .show state before it gets removed by bubbling listeners

    // Handle Download PDF button
    document.addEventListener('click', async (e) => {
        const downloadBtn = e.target.closest('#tmDownloadBtn');
        if (downloadBtn && transactionModal && transactionModal.classList.contains('show')) {
            const originalHtml = downloadBtn.innerHTML;

            // Add creative downloading class
            downloadBtn.classList.add('downloading');
            const dlText = downloadBtn.querySelector('.dl-text');
            if (dlText) dlText.textContent = 'Generating PDF...';

            try {
                // Load html2pdf dynamically if it doesn't exist
                if (typeof html2pdf === 'undefined') {
                    await new Promise((resolve, reject) => {
                        const script = document.createElement('script');
                        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
                        script.onload = resolve;
                        script.onerror = reject;
                        document.head.appendChild(script);
                    });
                }

                const amountVal = document.getElementById('tmAmountValue') ? document.getElementById('tmAmountValue').textContent : '0.00';
                const descVal = document.getElementById('tmDescription') ? document.getElementById('tmDescription').textContent : '';
                const dateVal = document.getElementById('tmDate') ? document.getElementById('tmDate').textContent : '';
                const txnId = document.getElementById('tmTransactionId') ? document.getElementById('tmTransactionId').textContent : '';
                const refId = document.getElementById('tmReference') ? document.getElementById('tmReference').textContent : '';
                const titleVal = document.querySelector('.tm-status') ? document.querySelector('.tm-status').textContent : 'Reward Paid';
                const shopName = localStorage.getItem('nd_shop_name') || 'Nd shop';

                const printArea = document.createElement('div');
                printArea.innerHTML = `
                    <div style="width: 210mm; min-height: 297mm; display: flex; align-items: center; justify-content: center; background-color: #ffffff; padding: 20px; box-sizing: border-box; overflow: hidden;">
                        <div style="width: 100%; max-width: 500px; padding: 30px; font-family: 'Inter', sans-serif; color: #333; box-sizing: border-box;">
                            <div style="text-align: center; margin-bottom: 40px;">
                                <div style="font-size: 32px; font-weight: 900; color: #8b5cf6; margin-bottom: 6px; letter-spacing: -0.5px; text-transform: uppercase; font-family: 'Outfit', sans-serif;">${shopName}</div>
                                <div style="color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700;">Transaction Receipt</div>
                            </div>
                            
                            <div style="background: #f8fafc; border-radius: 20px; padding: 40px 20px; text-align: center; margin-bottom: 40px; border: 1px solid #e2e8f0; box-shadow: 0 10px 30px rgba(0,0,0,0.02);">
                                <div style="display: inline-block; background-color: #e0f2fe; color: #8b5cf6; padding: 8px 18px; border-radius: 30px; font-size: 14px; font-weight: 800; margin-bottom: 25px; text-transform: uppercase; letter-spacing: 0.5px;">
                                    ${titleVal}
                                </div>
                                <div style="font-size: 50px; font-weight: 800; color: #0f172a; letter-spacing: -1.5px; margin-bottom: 5px;">
                                    <span style="color: #8b5cf6; font-weight: 900; font-size: 44px; vertical-align: middle; margin-right: 4px;">+</span>₦${amountVal}
                                </div>
                            </div>

                            <div style="border-top: 2px dashed #e2e8f0; border-bottom: 2px dashed #e2e8f0; padding: 30px 0; margin-bottom: 50px;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 24px; align-items: flex-start;">
                                    <span style="color: #64748b; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Description</span>
                                    <span style="color: #1e293b; font-weight: 800; font-size: 16px; text-align: right; max-width: 60%;">${descVal}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 24px; align-items: flex-start;">
                                    <span style="color: #64748b; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Transaction Date</span>
                                    <span style="color: #1e293b; font-weight: 800; font-size: 16px; text-align: right; max-width: 60%;">${dateVal}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 24px; align-items: flex-start;">
                                    <span style="color: #64748b; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Transaction ID</span>
                                    <span style="color: #1e293b; font-weight: 800; font-size: 16px; text-align: right; max-width: 60%; word-break: break-all;">${txnId}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                    <span style="color: #64748b; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Reference</span>
                                    <span style="color: #1e293b; font-weight: 800; font-size: 16px; text-align: right; max-width: 60%; word-break: break-all;">${refId}</span>
                                </div>
                            </div>
                            
                            <div style="text-align: center; color: #94a3b8; font-size: 12px; line-height: 1.8; font-weight: 600;">
                                <p style="margin: 0 0 6px 0;">This receipt is purely for digital record purposes.</p>
                                <p style="margin: 0;">${shopName} &bull; The seamless digital retail experience</p>
                            </div>
                        </div>
                    </div>
                `;

                // Feed raw HTML string directly to html2pdf to prevent mobile browsers from clipping off-screen appended nodes
                const opt = {
                    margin: 0,
                    filename: 'nd-shop-Receipt.pdf',
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true, scrollY: 0, windowWidth: 794 }, // 210mm ~ 794px
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                };

                // Generate and download directly from the string template without DOM manipulation
                await html2pdf().set(opt).from(printArea.innerHTML).save();

                // Success State!
                downloadBtn.classList.remove('downloading');
                downloadBtn.classList.add('success');
                if (dlText) dlText.textContent = 'Downloaded!';

                // Change icon to checkmark
                const iconContainer = downloadBtn.querySelector('.dl-icon');
                if (iconContainer) {
                    iconContainer.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                }

                setTimeout(() => {
                    downloadBtn.classList.remove('success');
                    downloadBtn.innerHTML = originalHtml;
                }, 3000);
            } catch (err) {
                console.error("PDF generation failed", err);
                downloadBtn.classList.remove('downloading');
                if (dlText) dlText.textContent = 'Failed';
                setTimeout(() => {
                    downloadBtn.innerHTML = originalHtml;
                }, 2000);
            }
        }
    });
}




