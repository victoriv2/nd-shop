document.addEventListener('DOMContentLoaded', () => {
    // 1. Inject the CSS for this modal into head
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'product/add-product-modal.css';
    document.head.appendChild(link);

    // 2. Dynamically insert the modal container into the page
    const container = document.createElement('div');
    container.id = 'add-product-modal-container';
    document.body.appendChild(container);

    // 3. Fetch the add product modal HTML template
    fetch('product/add-product-modal.html')
        .then(response => {
            if (!response.ok) throw new Error('Network response not ok');
            return response.text();
        })
        .then(html => {
            container.innerHTML = html;
            initAddProductModalLogic();
        })
        .catch(err => {
            console.warn('Could not load add-product-modal.html', err);
        });
});

function initAddProductModalLogic() {
    const addProductModal = document.getElementById('addProductModal');
    const apmCloseButton = document.getElementById('apmClose');
    const apmUnitWrapper = document.getElementById('apmUnitWrapper');
    const apmUnitToggle = document.getElementById('apmUnitToggle');
    const apmUnitText = document.getElementById('apmUnitText');
    const apmUnitOptions = document.querySelectorAll('#apmUnitMenu .apm-dropdown-option');
    const newProductPrice = document.getElementById('newProductPrice');
    const newProductName = document.getElementById('newProductName');
    const apmPayoutValue = document.getElementById('apmPayoutValue');
    const apmSubmitBtn = document.getElementById('apmSubmitBtn');

    // Handle Open Add Product Modal (event delegation because button might be re-rendered)
    document.addEventListener('click', (e) => {
        const addBtn = e.target.closest('#addProductBtn');
        if (addBtn && addProductModal) {
            addProductModal.classList.add('show');
            document.body.classList.add('modal-open');
        }
    });

    // Handle Close
    if (apmCloseButton && addProductModal) {
        apmCloseButton.addEventListener('click', () => {
            addProductModal.classList.remove('show');
            document.body.classList.remove('modal-open');
        });

        // Close on outside click
        addProductModal.addEventListener('click', (e) => {
            if (e.target === addProductModal) {
                addProductModal.classList.remove('show');
                document.body.classList.remove('modal-open');
            }
        });
    }

    // Toggle Dropdown
    if (apmUnitToggle && apmUnitWrapper) {
        apmUnitToggle.addEventListener('click', () => {
            apmUnitWrapper.classList.toggle('open');
        });
    }

    // Dropdown Option Select
    if (apmUnitOptions.length > 0) {
        apmUnitOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Remove active from all
                apmUnitOptions.forEach(o => o.classList.remove('active'));
                // Add active to current
                option.classList.add('active');
                // Set text
                if (apmUnitText) {
                    apmUnitText.textContent = option.getAttribute('data-value');
                }
                // Close dropdown
                if (apmUnitWrapper) {
                    apmUnitWrapper.classList.remove('open');
                }
            });
        });
    }

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
        if (apmUnitWrapper && !apmUnitWrapper.contains(e.target)) {
            apmUnitWrapper.classList.remove('open');
        }
    });

    // Real-time payout calculation (Payout)
    if (newProductPrice && apmPayoutValue) {
        newProductPrice.addEventListener('input', () => {
            const price = parseFloat(newProductPrice.value) || 0;
            const payout = Math.round(price * ((parseFloat(localStorage.getItem('nd_payout_rate')) || 2) / 100)); // 2%
            const formattedPayout = payout;
            apmPayoutValue.textContent = `₦${formattedPayout} (Payout)`;
        });
    }

    // Submit new product
    if (apmSubmitBtn) {
        apmSubmitBtn.addEventListener('click', () => {
            // Validate
            const name = newProductName ? newProductName.value.trim() : '';
            const price = newProductPrice ? parseFloat(newProductPrice.value) : 0;
            const unit = apmUnitText ? apmUnitText.textContent.trim() : 'per cup';

            if (!name || isNaN(price) || price <= 0) {
                // simple validation return
                if (!name && newProductName) newProductName.focus();
                else if (newProductPrice) newProductPrice.focus();
                return;
            }

            const payout = Math.round(price * ((parseFloat(localStorage.getItem('nd_payout_rate')) || 2) / 100));
            const formattedPayout = payout;

            // Create new DOM element for product card
            const newCard = document.createElement('div');
            newCard.className = 'product-card';
            newCard.innerHTML = `
                <div class="product-info-left">
                    <div class="product-name">${name}</div>
                    <div class="product-price-row">
                        <span class="product-price-amount">₦${price}</span> <span class="product-price-unit">${unit}</span>
                    </div>
                </div>
                <div class="product-info-right">
                    <div class="product-payout-amount">+₦${formattedPayout}</div>
                    <div class="product-payout-desc">Reward</div>
                </div>
            `;

            // Insert into product container
            const productContainer = document.getElementById('product-container');
            const productWrapper = document.querySelector('.product-page-wrapper');
            if (productWrapper) {
                productWrapper.insertAdjacentElement('afterend', newCard);
            } else if (productContainer) {
                productContainer.appendChild(newCard);
            }

            // SIMULATION: Automatically log the reward in the MAIN Payout tab for demo purposes
            const payoutContainer = document.getElementById('payout-container');
            if (payoutContainer) {
                const dashboardPayout = payoutContainer.querySelector('.payout-item');
                const stickyFilter = payoutContainer.querySelector('.sticky-filter-wrapper');

                if (dashboardPayout && stickyFilter) {
                    const payoutCard = document.createElement('div');
                    payoutCard.className = 'regular-card';

                    const d = new Date();
                    const mmm = d.toLocaleString('default', { month: 'short' });
                    let hh = d.getHours();
                    const ampm = hh >= 12 ? 'pm' : 'am';
                    hh = hh % 12 || 12;
                    const min = d.getMinutes().toString().padStart(2, '0');

                    payoutCard.innerHTML = `
                        <div class="card-main-amount">
                            <span class="green-plus">+</span>${formattedPayout} <span class="card-payout-text">Reward</span>
                        </div>
                        <div class="card-details-row">
                            <span class="card-buying-text">${name} - ₦${price} - ${unit} - x1</span>
                            <span class="card-time-text">${mmm}. ${d.getDate()} | ${hh}:${min} ${ampm}</span>
                        </div>
                    `;

                    // Insert right after the filter in the Payout Tab
                    stickyFilter.insertAdjacentElement('afterend', payoutCard);
                    payoutCard.style.animation = 'apmFadeIn 0.4s ease';

                    // Update the "Total Payout" tracker amount
                    const currentMatch = dashboardPayout.textContent.match(/[\d,.]+/);
                    let currentTotal = 0;
                    if (currentMatch) {
                        currentTotal = parseFloat(currentMatch[0].replace(/,/g, ''));
                    }
                    const newTotal = currentTotal + parseFloat(formattedPayout);
                    dashboardPayout.textContent = `Total reward: ₦${newTotal.toFixed(2)}`;
                }
            }

            // Reset form
            if (newProductName) newProductName.value = '';
            if (newProductPrice) newProductPrice.value = '';
            if (apmPayoutValue) apmPayoutValue.textContent = '₦0 (Payout)';
            if (apmUnitOptions.length > 0) {
                apmUnitOptions.forEach(o => o.classList.remove('active'));
                apmUnitOptions[0].classList.add('active');
                if (apmUnitText) apmUnitText.textContent = apmUnitOptions[0].getAttribute('data-value');
            }

            // Close modal
            if (addProductModal) {
                addProductModal.classList.remove('show');
                document.body.classList.remove('modal-open');
            }

            // basic animation hint on new card
            newCard.style.animation = 'apmFadeIn 0.3s ease';
        });
    }
}


