document.addEventListener('DOMContentLoaded', () => {
    // Inject filter modal container safely
    const container = document.createElement('div');
    container.id = 'filter-modal-container';
    document.body.appendChild(container);

    fetch('product/filter-modal.html')
        .then(response => {
            if (!response.ok) throw new Error('Failed to fetch');
            return response.text();
        })
        .then(html => {
            container.innerHTML = html;
            initFilterLogic();
        })
        .catch(err => console.warn('Filter modal load error:', err));
});

function initFilterLogic() {
    const filterBtn = document.getElementById('filterBtn');
    const filterModal = document.getElementById('filterModal');

    if (filterBtn) {
        filterBtn.addEventListener('click', () => {
            if (filterModal) {
                filterModal.classList.add('show');
                document.body.classList.add('modal-open');
                updateSliderFill();
            }
        });
    }

    // Modal Close Logic
    const fmClose = document.getElementById('fmClose');
    const fmApplyBtn = document.getElementById('fmApplyBtn');



    // Handle Closing via Apply/Close
    document.addEventListener('click', (e) => {
        if (e.target === fmClose || e.target === fmApplyBtn) {

            if (e.target === fmApplyBtn) {
                applyFilters();
            }

            if (filterModal && filterModal.classList.contains('show')) {
                filterModal.classList.remove('show');
                document.body.classList.remove('modal-open');
            }
        }
    });

    // To preserve the original "Recommended" order, we assign a data attribute once
    let originalOrderAssigned = false;

    function applyFilters() {
        const container = document.getElementById('product-container');
        if (!container) return;

        const cards = Array.from(container.querySelectorAll('.product-card'));
        if (cards.length === 0) return;

        if (!originalOrderAssigned) {
            cards.forEach((card, idx) => {
                card.setAttribute('data-original-order', idx);
            });
            originalOrderAssigned = true;
        }

        const minVal = parseInt(document.getElementById('minPriceInput').value) || 0;
        const maxVal = parseInt(document.getElementById('maxPriceInput').value) || 50000;

        const activeSortBtn = document.querySelector('.fm-sort-btn.active');
        const sortType = activeSortBtn ? activeSortBtn.getAttribute('data-sort') : 'recommended';

        const extractPrice = (card) => {
            const priceElem = card.querySelector('.product-price-amount');
            if (priceElem) {
                return parseFloat(priceElem.textContent.replace(/[^\d.]/g, '')) || 0;
            }
            return 0;
        };

        // Filter cards and sort them
        cards.forEach(card => {
            const price = extractPrice(card);
            if (price >= minVal && price <= maxVal) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });

        if (sortType === 'asc') {
            cards.sort((a, b) => extractPrice(a) - extractPrice(b));
        } else if (sortType === 'desc') {
            cards.sort((a, b) => extractPrice(b) - extractPrice(a));
        } else {
            // Restore recommended order
            cards.sort((a, b) => parseInt(a.getAttribute('data-original-order')) - parseInt(b.getAttribute('data-original-order')));
        }

        // Reattach to DOM in correct order without removing the header wrapping element
        cards.forEach(card => {
            container.appendChild(card);
        });
    }

    // Handle Sort Buttons
    const sortBtns = document.querySelectorAll('.fm-sort-btn');
    sortBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            sortBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Handle Range Sliders and Inputs
    const minRange = document.getElementById('minRange');
    const maxRange = document.getElementById('maxRange');
    const minInput = document.getElementById('minPriceInput');
    const maxInput = document.getElementById('maxPriceInput');
    const sliderFill = document.getElementById('sliderFill');
    const priceGap = 500; // Minimum distance between sliders

    function updateSliderFill() {
        const total = maxRange.max;
        const percentMin = (minRange.value / total) * 100;
        const percentMax = (maxRange.value / total) * 100;

        sliderFill.style.left = percentMin + "%";
        sliderFill.style.right = (100 - percentMax) + "%";
    }

    if (minRange && maxRange && minInput && maxInput) {
        minRange.addEventListener('input', (e) => {
            if (parseInt(maxRange.value) - parseInt(minRange.value) < priceGap) {
                minRange.value = parseInt(maxRange.value) - priceGap;
            }
            minInput.value = minRange.value;
            updateSliderFill();
        });

        maxRange.addEventListener('input', (e) => {
            if (parseInt(maxRange.value) - parseInt(minRange.value) < priceGap) {
                maxRange.value = parseInt(minRange.value) + priceGap;
            }
            maxInput.value = maxRange.value;
            updateSliderFill();
        });

        minInput.addEventListener('input', () => {
            let val = parseInt(minInput.value) || 0;
            if (val < 0) val = 0;
            if (val > parseInt(maxRange.value) - priceGap) {
                val = parseInt(maxRange.value) - priceGap;
            }
            minRange.value = val;
            updateSliderFill();
        });

        maxInput.addEventListener('input', () => {
            let val = parseInt(maxInput.value) || 0;
            let maximal = parseInt(maxRange.max);
            if (val > maximal) val = maximal;
            if (val < parseInt(minRange.value) + priceGap) {
                val = parseInt(minRange.value) + priceGap;
            }
            maxRange.value = val;
            updateSliderFill();
        });

        // Initialize fill color on load
        updateSliderFill();
    }

    // Handle Reset Button
    const fmResetBtn = document.getElementById('fmResetBtn');
    if (fmResetBtn) {
        fmResetBtn.addEventListener('click', () => {
            sortBtns.forEach(b => b.classList.remove('active'));
            document.querySelector('.fm-sort-btn[data-sort="recommended"]').classList.add('active');

            if (minRange && maxRange && minInput && maxInput) {
                minRange.value = minRange.min;
                maxRange.value = maxRange.max;
                minInput.value = minRange.min;
                maxInput.value = maxRange.max;
                updateSliderFill();
            }
            // Trigger apply filters dynamically to instantly show reset logic!
            applyFilters();
        });
    }
}
