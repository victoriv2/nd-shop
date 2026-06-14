function loadSalesTable() {
    const wrapper = document.getElementById('sales-table-wrapper');
    if (!wrapper) return;

    fetch('register/sales-table/sales-table.html')
        .then(res => {
            if (!res.ok) throw new Error('Network response was not ok');
            return res.text();
        })
        .then(html => {
            wrapper.innerHTML = html;
            initSalesTable();
            syncTableScroll();
        })
        .catch(err => console.warn('Could not fetch sales-table.html', err));
}

function initSalesTable() {
    // Clean up any orphaned addSaleModal from previous tab navigations.
    // When loadRegister() re-fetches register.html, a new addSaleModal is created,
    // but the old one (moved to document.body) still exists, causing duplicate elements
    // that break tab switching ("New Item" / "Existing Item") and form submissions.
    const allModals = document.querySelectorAll('[id="addSaleModal"]');
    if (allModals.length > 1) {
        // Keep the first one (the fresh one inside register-container), remove the rest
        for (let i = 1; i < allModals.length; i++) {
            allModals[i].remove();
        }
    }

    const tableBody = document.getElementById('salesTableBody');
    const emptyState = document.getElementById('tableEmptyState');
    const tableFooter = document.getElementById('tableFooter');
    const footerTotalItems = document.getElementById('footerTotalItems');
    const footerTotalSales = document.getElementById('footerTotalSales');
    const footerTotalPayout = document.getElementById('footerTotalPayout');

    if (!tableBody) return;

    // Connect Sales Register to the browser's permanent memory (localStorage).
    // If no sales history exists, it starts as a completely blank slate [].
    let sampleData = [];
    const savedSales = localStorage.getItem('nd_sales_history');
    if (savedSales) {
        try {
            sampleData = JSON.parse(savedSales);
        } catch (e) {
            console.error('Failed to parse saved sales', e);
            sampleData = [];
        }
    }

    // Helper function to save sales to memory
    function saveSalesToMemory() {
        localStorage.setItem('nd_sales_history', JSON.stringify(sampleData));
    }
    renderTable(sampleData);

    function renderTable(data) {
        tableBody.innerHTML = '';

        let totalItems = 0;
        let totalSales = 0;
        let totalPayout = 0;

        if (!data || data.length === 0) {
            emptyState.classList.add('show');
            tableFooter.classList.add('hidden');

            // Critical fix: Reset footer values to 0 so they don't hold the previous day's stats for prints.
            if (footerTotalItems) footerTotalItems.textContent = '0 / 0';
            if (footerTotalSales) footerTotalSales.textContent = '₦0.00';
            if (footerTotalPayout) footerTotalPayout.textContent = '₦0.00';
            return;
        }

        emptyState.classList.remove('show');
        tableFooter.classList.remove('hidden');

        data.forEach((row, index) => {
            const isRequest = row.type === 'Request';
            const baseTotal = row.qty * row.unitPrice;
            // Payout calculation for new rows, but for existing rows it's already in the object
            let delta = row.payoutEarned !== undefined ? row.payoutEarned : (isRequest ? (row.payout != null ? row.payout : (baseTotal * ((parseFloat(localStorage.getItem('nd_payout_rate')) || 2) / 100))) : 0);
            
            // Use recorded price (which has payout deducted) if available, otherwise fallback to deduction
            const total = (row.price !== undefined && row.price !== null && row.price !== '') ? Number(row.price) : (baseTotal - delta);
            totalItems += Number(row.qty) || 1;
            totalSales += total;
            totalPayout += (row.isRewardPurchase || row.type === 'Payout Purchase') ? 0 : Math.abs(delta);

            const unitText = row.unit ? row.unit.replace(/^per\s+/i, '') : '';
            const qtyStr = row.qty + (unitText ? ' ' + unitText + (row.qty > 1 ? 's' : '') : '');

            const tr = document.createElement('tr');
            if (isRequest) tr.classList.add('row-request');

            const unitPriceToDisplay = row.unitPrice;

            const isSpent = row.isRewardPurchase || row.type === 'Payout Purchase';
            const deltaText = `₦${formatCurrency(Math.abs(delta))}`;
            const labelText = isSpent ? `<span style="font-size: 0.7rem; color: #dc2626; font-weight: 600;">(Spent)</span>` : `<span style="font-size: 0.7rem; color: #166534; font-weight: 600;">(Earned)</span>`;

            tr.innerHTML = `
                <td>${index + 1}</td>
                <td>${row.date}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px; width: 100%; min-width: 0;">
                        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0;" title="${row.item || ''}">${row.item || ''}</span>
                        ${isRequest ? '<span class="request-badge" style="flex-shrink: 0;">User</span>' : ''}
                    </div>
                </td>
                <td>${qtyStr}</td>
                <td>₦${formatCurrency(unitPriceToDisplay)}</td>
                <td>₦${formatCurrency(total)}</td>
                <td class="payout-cell">${(isRequest && !isSpent) ? `${deltaText} ${labelText}` : '-'}</td>
            `;
            tableBody.appendChild(tr);
        });

        // Update footer
        if (footerTotalItems) footerTotalItems.textContent = `${data.length} / ${totalItems}`;
        if (footerTotalSales) footerTotalSales.textContent = '₦' + formatCurrency(totalSales);
        if (footerTotalPayout) footerTotalPayout.textContent = '₦' + formatCurrency(Math.max(0, totalPayout));
    }

    function formatCurrency(amount) {
        return Math.round(Number(amount)).toLocaleString();
    }

    // --- Search & Sort State ---
    let currentSearchTerm = '';
    let currentSortType = 'newest'; // Default

    // --- Search functionality ---
    const searchInput = document.getElementById('registerSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearchTerm = e.target.value.toLowerCase();
            applyFiltersAndSort();
        });
    }

    // --- Sort functionality ---
    const sortDropdown = document.getElementById('registerSortDropdown');
    const sortToggle = document.getElementById('registerSortToggle');
    if (sortDropdown) {
        const options = sortDropdown.querySelectorAll('.sort-option');
        options.forEach(option => {
            option.addEventListener('click', () => {
                const text = option.childNodes[0].textContent.trim();

                // Map the text to a sort type
                if (text === 'Newest to Oldest') currentSortType = 'newest';
                else if (text === 'Oldest to Newest') currentSortType = 'oldest';
                else if (text === 'Highest to Lowest') currentSortType = 'high-to-low';
                else if (text === 'Lowest to Highest') currentSortType = 'low-to-high';

                applyFiltersAndSort();
            });
        });
    }

    function applyFiltersAndSort() {
        // --- Date Filtering Logic ---
        const dayDisp = document.getElementById('dayDisplay');
        const monthDispShort = document.querySelector('.month-short');
        const yearDisp = document.getElementById('yearDisplay');

        const targetDay = dayDisp ? dayDisp.textContent.trim() : '';
        const targetMonth = monthDispShort ? monthDispShort.textContent.trim() : '';
        const targetYear = yearDisp ? yearDisp.textContent.trim() : '';

        // 1. Filter based on Search AND Date
        let data = sampleData.filter(row => {
            // Parse sale date: "26 Feb, 2026 · 3:45 pm" -> parts: ["26", "Feb,", "2026", ...]
            const saleParts = row.date.split(' ');
            if (saleParts.length < 3) return false;

            // Normalize day to 2 digits for comparison with the '06' format in UI
            const saleDay = saleParts[0].padStart(2, '0');
            const saleMonth = saleParts[1].replace(',', '');
            const saleYear = saleParts[2];

            // Primary filter: MUST match selected date in UI
            const dateMatches = (saleDay === targetDay && saleMonth === targetMonth && saleYear === targetYear);
            if (!dateMatches) return false;

            // Secondary filter: Search term
            const searchLower = currentSearchTerm.toLowerCase();
            return row.item.toLowerCase().includes(searchLower) ||
                row.date.toLowerCase().includes(searchLower);
        });

        // 2. Sort the filtered data
        data.sort((a, b) => {
            if (currentSortType === 'high-to-low') {
                return (b.qty * b.unitPrice) - (a.qty * a.unitPrice);
            } else if (currentSortType === 'low-to-high') {
                return (a.qty * a.unitPrice) - (b.qty * b.unitPrice);
            } else if (currentSortType === 'newest') {
                return new Date(parseDate(b.date)) - new Date(parseDate(a.date));
            } else if (currentSortType === 'oldest') {
                return new Date(parseDate(a.date)) - new Date(parseDate(b.date));
            }
            return 0;
        });

        // 3. Render
        renderTable(data);
    }

    // Expose refresh to window so Date Selector can trigger updates
    window.refreshSalesTable = applyFiltersAndSort;

    // --- Add Sale Modal Logic ---
    const addBtn = document.getElementById('addBtn');
    const addSaleModal = document.getElementById('addSaleModal');
    const closeAddSaleModal = document.getElementById('closeAddSaleModal');

    // Move modal to body to bypass the z-index stacking context of register-container
    if (addSaleModal) {
        document.body.appendChild(addSaleModal);
    }

    // Existing Form Elements
    const existingForm = document.getElementById('existingItemForm');
    const itemDropdownWrapper = document.getElementById('itemDropdownWrapper');
    const itemDropdownTrigger = document.getElementById('itemDropdownTrigger');
    const itemDropdownMenu = document.getElementById('itemDropdownMenu');
    const hiddenItemInput = document.getElementById('existingItemSelect');
    const existingPrice = document.getElementById('existingItemPrice');

    // Visual feedback for Default Variant selection
    document.querySelectorAll('.default-variant-label').forEach(label => {
        label.addEventListener('click', function() {
            document.querySelectorAll('.default-variant-label').forEach(l => {
                l.style.borderColor = '#bfdbfe';
                l.style.borderWidth = '1px';
                l.style.background = 'white';
            });
            this.style.borderColor = '#8b5cf6';
            this.style.borderWidth = '2px';
            this.style.background = '#f0f4f8';
            
            const radio = this.querySelector('input[type="radio"]');
            if(radio) {
                radio.checked = true;
                const price = radio.parentNode.querySelector('[data-price]').dataset.price;
                const unitText = radio.parentNode.querySelector('div:nth-child(2)').textContent;
                if (existingPrice) {
                    existingPrice.value = '₦' + formatCurrency(Number(price)) + ' per ' + unitText.toLowerCase();
                    existingPrice.dataset.price = price;
                }
            }
        });
    });

    // Special Form Elements
    const specialForm = document.getElementById('specialItemForm');
    const specDropdownWrapper = document.getElementById('specDropdownWrapper');
    const specDropdownTrigger = document.getElementById('specDropdownTrigger');
    const specDropdownMenu = document.getElementById('specDropdownMenu');
    const specItemSelect = document.getElementById('specItemSelect');
    const specVariantContainer = document.getElementById('specVariantContainer');
    const specVariantBagPrice = document.getElementById('specVariantBagPrice');
    const specVariantCustardPrice = document.getElementById('specVariantCustardPrice');
    const specVariantCupPrice = document.getElementById('specVariantCupPrice');

    window.syncSpecFlexUI = function() {
        const specItemSelect = document.getElementById('specItemSelect');
        const selectedProductName = specItemSelect ? specItemSelect.value : '';
        const selectedProduct = specialInventory.find(p => p.name === selectedProductName);

        const toggleCb = document.getElementById('specFlexiblePriceToggle');
        const toggleWrapper = document.getElementById('specFlexToggleWrapper') || document.getElementById('specFlexiblePriceToggle')?.closest('.toggle-wrapper');
        const customPriceGroup = document.getElementById('specCustomPriceGroup');

        if (!selectedProduct) {
            if (toggleWrapper) toggleWrapper.style.display = 'none';
            if (customPriceGroup) customPriceGroup.style.display = 'none';
            return;
        }

        const productAllowsFlex = !!selectedProduct.allowUserFlexiblePricing;
        if (toggleWrapper) {
            toggleWrapper.style.display = productAllowsFlex ? 'flex' : 'none';
        }

        let isAllowed = false;
        if (productAllowsFlex) {
            const checkedRadio = document.querySelector('input[name="specVariant"]:checked');
            const val = checkedRadio ? checkedRadio.value : '';
            const flexVars = selectedProduct.flexibleVariants || [];
            const pt = selectedProduct.packTypes || {};
            let title = '';

            if (val === 'c1' || val === 'bag') title = (pt.c1 || {}).title || (pt.bag || {}).title || 'Container 1';
            else if (val === 'c2' || val === 'custard') title = (pt.c2 || {}).title || (pt.custard || {}).title || 'Container 2';
            else if (val === 'c3' || val === 'cup') title = (pt.c3 || {}).title || (pt.cup || {}).title || 'Container 3';

            if (title && (flexVars.includes(title) || (title === 'Default' && flexVars.some(fv => fv.startsWith('Default ('))))) {
                isAllowed = true;
            }
        }

        const toggleChecked = toggleCb && toggleCb.checked;
        const showFlexibleInput = productAllowsFlex && toggleChecked && isAllowed;

        if (customPriceGroup) {
            customPriceGroup.style.display = showFlexibleInput ? 'block' : 'none';
        }

        const containerEl = document.getElementById('specVariantContainer');
        if (containerEl) {
            if (typeof window.updateVariantPricesVisibility === 'function') {
                window.updateVariantPricesVisibility(containerEl, 'specVariant', showFlexibleInput);
            }
        }
    };

    // Visual feedback for Special Variant selection
    document.querySelectorAll('.spec-variant-label').forEach(label => {
        label.addEventListener('click', function() {
            document.querySelectorAll('.spec-variant-label').forEach(l => {
                l.style.borderColor = '#bfdbfe';
                l.style.borderWidth = '1px';
                l.style.background = 'white';
            });
            this.style.borderColor = '#8b5cf6';
            this.style.borderWidth = '2px';
            this.style.background = '#f0f4f8';
            
            const radio = this.querySelector('input[type="radio"]');
            if(radio) {
                radio.checked = true;
                window.syncSpecFlexUI();
            }
        });
    });

    // Custom Form Elements
    const customForm = document.getElementById('customItemForm');
    const customDropdownWrapper = document.getElementById('customDropdownWrapper');
    const customDropdownTrigger = document.getElementById('customDropdownTrigger');
    const customDropdownMenu = document.getElementById('customDropdownMenu');
    const customItemSelect = document.getElementById('customItemSelect');

    // Flexible Form Elements
    const flexForm = document.getElementById('flexItemForm');
    const flexDropdownWrapper = document.getElementById('flexDropdownWrapper');
    const flexDropdownTrigger = document.getElementById('flexDropdownTrigger');
    const flexDropdownMenu = document.getElementById('flexDropdownMenu');
    const flexItemSelect = document.getElementById('flexItemSelect');
    const flexVariantContainer = document.getElementById('flexVariantContainer');
    const flexVariantC1Price = document.getElementById('flexVariantC1Price');
    const flexVariantC2Price = document.getElementById('flexVariantC2Price');
    const flexCustomPriceContainer = document.getElementById('flexCustomPriceContainer');
    const flexItemPrice = document.getElementById('flexItemPrice');

    // Visual feedback for Flex Variant selection
    document.querySelectorAll('.flex-variant-label').forEach(label => {
        label.addEventListener('click', function() {
            document.querySelectorAll('.flex-variant-label').forEach(l => {
                l.style.borderColor = '#bfdbfe';
                l.style.borderWidth = '1px';
                l.style.background = 'white';
            });
            this.style.borderColor = '#8b5cf6';
            this.style.borderWidth = '2px';
            this.style.background = '#f0f4f8';
            
            const radio = this.querySelector('input[type="radio"]');
            if(radio) {
                radio.checked = true;
                const val = radio.value;
                const flexItemSelect = document.getElementById('flexItemSelect');
                const selectedProduct = flexInventory.find(p => p.name === (flexItemSelect ? flexItemSelect.value : ''));
                
                let isAllowed = false;
                if (selectedProduct && selectedProduct.allowUserFlexiblePricing) {
                    const flexVars = selectedProduct.flexibleVariants || [];
                    const pt = selectedProduct.packTypes || {};
                    let title = '';
                    if (val === 'c1') title = (pt.c1 || {}).title || (pt.bag || {}).title || 'Container 1';
                    else if (val === 'c2') title = (pt.c2 || {}).title || (pt.custard || {}).title || 'Container 2';
                    else if (val === 'c3') title = (pt.c3 || {}).title || (pt.cup || {}).title || 'Container 3';
                    
                    if (flexVars.includes(title) || (title === 'Default' && flexVars.some(fv => fv.startsWith('Default (')))) isAllowed = true;
                }

                if (flexCustomPriceContainer) {
                    flexCustomPriceContainer.style.display = isAllowed ? 'block' : 'none';
                }
                if (flexItemPrice) {
                    flexItemPrice.required = isAllowed;
                    // Pre-fill the price input with the variant's pre-set price if it exists
                    if (selectedProduct) {
                        const pt = selectedProduct.packTypes || {};
                        const presetPrice = (pt[val] || {}).price || (val === 'c1' ? selectedProduct.price : 0);
                        flexItemPrice.value = presetPrice || '';
                    } else {
                        flexItemPrice.value = '';
                    }
                }
            }
        });
    });

    // Tab Logic
    const tabBtns = document.querySelectorAll('.sale-tab-btn');
    const forms = [existingForm, specialForm, customForm, flexForm];
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => {
                b.classList.remove('active');
                b.style.background = 'transparent';
                b.style.color = '#64748b';
                b.style.boxShadow = 'none';
            });
            btn.classList.add('active');
            btn.style.background = 'white';
            btn.style.color = '#8b5cf6';
            btn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
            
            forms.forEach(f => { if(f) f.style.display = 'none'; });
            const target = document.getElementById(btn.getAttribute('data-target'));
            if(target) target.style.display = 'block';
        });
    });


    // ============================================================
    // Load Inventory from localStorage
    // ============================================================
    let inventory = [];
    try {
        const stored = JSON.parse(localStorage.getItem('nd_products_data') || '[]');
        if (stored && stored.length > 0) inventory = stored;
        else if (typeof adminProducts !== 'undefined' && Array.isArray(adminProducts)) inventory = adminProducts;
    } catch(e) {}

    let defaultInventoryRaw = inventory.filter(p => !p.isSpecial && !p.isCustom && !p.isFlexible && !p.isDeleted && !(p.isHidden || p.cleared));
    if (defaultInventoryRaw.length === 0) defaultInventoryRaw = inventory.filter(p => !p.isDeleted && !(p.isHidden || p.cleared) && !p.isSpecial && !p.isCustom && !p.isFlexible);
    
    let defaultInventory = defaultInventoryRaw;
    let specialInventory = inventory.filter(p => p.isSpecial && !p.isDeleted && !(p.isHidden || p.cleared));
    let customInventory = inventory.filter(p => p.isCustom && !p.isDeleted && !(p.isHidden || p.cleared));
    let flexInventory = inventory.filter(p => p.isFlexible && !p.isDeleted && !(p.isHidden || p.cleared));

    // ============================================================
    // Build Default Items Dropdown
    // ============================================================
    function buildDefaultDropdown(filterText) {
        if (!itemDropdownMenu) return;

        let searchContainer = itemDropdownMenu.querySelector('.dropdown-search-container');
        let optionsContainer = itemDropdownMenu.querySelector('.dropdown-options-list');

        if (!searchContainer) {
            itemDropdownMenu.innerHTML = '';
            searchContainer = document.createElement('div');
            searchContainer.className = 'dropdown-search-container';
            searchContainer.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/></svg>
                <input type="text" class="dropdown-search-input" placeholder="Search items..." autocomplete="off" readonly onfocus="this.removeAttribute('readonly');">
            `;
            itemDropdownMenu.appendChild(searchContainer);
            searchContainer.querySelector('.dropdown-search-input').addEventListener('input', (e) => {
                e.stopPropagation();
                buildDefaultDropdown(e.target.value);
            });
            searchContainer.querySelector('.dropdown-search-input').addEventListener('click', e => e.stopPropagation());
            searchContainer.querySelector('.dropdown-search-input').addEventListener('keydown', e => e.stopPropagation());
        }

        if (!optionsContainer) {
            optionsContainer = document.createElement('div');
            optionsContainer.className = 'dropdown-options-list';
            itemDropdownMenu.appendChild(optionsContainer);
        }

        optionsContainer.innerHTML = '';
        const filter = (filterText || '').toLowerCase();
        const filtered = defaultInventory.filter(item => item.name.toLowerCase().includes(filter));

        if (filtered.length === 0) {
            optionsContainer.innerHTML = '<div class="dropdown-no-result">No items found</div>';
        } else {
            filtered.forEach(item => {
                const option = document.createElement('div');
                option.className = 'custom-dropdown-option';
                option.textContent = item.name;
                option.dataset.price = item.price;
                if (hiddenItemInput && hiddenItemInput.value === item.name) option.classList.add('active');
                option.addEventListener('click', (e) => {
                    e.stopPropagation();
                    optionsContainer.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('active'));
                    option.classList.add('active');
                    if (itemDropdownTrigger) itemDropdownTrigger.querySelector('.trigger-text').textContent = item.name;
                    if (hiddenItemInput) hiddenItemInput.value = item.name;
                    
                    const defaultVariantContainer = document.getElementById('defaultVariantContainer');
                    const hasWholesale = item.wholesalePrice && Number(item.wholesalePrice) > 0;
                    
                    if (hasWholesale) {
                        if (defaultVariantContainer) defaultVariantContainer.style.display = 'block';
                        
                        // Set up variant prices and labels
                        const retailPriceText = document.getElementById('defaultVariantRetailPrice');
                        const retailLabelText = document.getElementById('defaultVariantRetailLabelTxt');
                        const wholesalePriceText = document.getElementById('defaultVariantWholesalePrice');
                        const wholesaleLabelText = document.getElementById('defaultVariantWholesaleLabelTxt');
                        
                        if (retailPriceText) {
                            retailPriceText.textContent = '₦' + formatCurrency(Number(item.price));
                            retailPriceText.dataset.price = item.price;
                        }
                        if (retailLabelText) {
                            retailLabelText.textContent = item.unit || 'Piece';
                        }
                        if (wholesalePriceText) {
                            wholesalePriceText.textContent = '₦' + formatCurrency(Number(item.wholesalePrice));
                            wholesalePriceText.dataset.price = item.wholesalePrice;
                        }
                        if (wholesaleLabelText) {
                            wholesaleLabelText.textContent = item.bulkUnit || 'Carton';
                        }
                        
                        // Stock-aware selection & disabling
                        const defaultVariants = [
                            { val: 'retail', labelId: 'defaultVariantRetailLabelTxt' },
                            { val: 'wholesale', labelId: 'defaultVariantWholesaleLabelTxt' }
                        ];
                        let firstDefaultInStockLabel = null;
                        defaultVariants.forEach(v => {
                            const radio = document.querySelector(`input[name="defaultVariant"][value="${v.val}"]`);
                            const label = radio ? radio.closest('label') : null;
                            if (radio && label) {
                                const stock = window.getRemainingProductStock ? window.getRemainingProductStock(item.id || item.name, v.val) : Infinity;
                                if (stock <= 0) {
                                    radio.disabled = true;
                                    label.style.opacity = '0.5';
                                    label.style.pointerEvents = 'none';
                                    label.style.background = '#f1f5f9';
                                } else {
                                    radio.disabled = false;
                                    label.style.opacity = '1';
                                    label.style.pointerEvents = 'auto';
                                    label.style.background = 'white';
                                    if (!firstDefaultInStockLabel) firstDefaultInStockLabel = label;
                                }
                            }
                        });
                        if (firstDefaultInStockLabel) {
                            firstDefaultInStockLabel.click();
                        } else {
                            const radioButtons = document.getElementsByName('defaultVariant');
                            radioButtons.forEach(r => r.checked = false);
                            document.querySelectorAll('.default-variant-label').forEach(l => {
                                l.style.borderColor = '#bfdbfe';
                                l.style.borderWidth = '1px';
                                l.style.background = 'white';
                            });
                        }
                        
                        if (existingPrice) {
                            existingPrice.value = '';
                            existingPrice.dataset.price = '';
                        }
                    } else {
                        if (defaultVariantContainer) defaultVariantContainer.style.display = 'none';
                        const unitStr = item.unit ? item.unit : '';
                        if (existingPrice) {
                            existingPrice.value = '₦' + formatCurrency(Number(item.price)) + (unitStr ? ' ' + unitStr : '');
                            existingPrice.dataset.price = item.price;
                        }
                    }
                    
                    const priceLabel = document.getElementById('lblExistingPrice');
                    if (priceLabel) {
                        priceLabel.textContent = 'Unit Price (₦)';
                    }
                    const qtyLabel = document.getElementById('lblExistingQty');
                    if (qtyLabel) {
                        qtyLabel.textContent = 'Quantity';
                    }
                    itemDropdownWrapper.classList.remove('open');
                });
                optionsContainer.appendChild(option);
            });
        }
    }

    // ============================================================
    // Build Special Items Dropdown
    // ============================================================
    function buildSpecialDropdown(filterText) {
        if (!specDropdownMenu) return;

        let searchContainer = specDropdownMenu.querySelector('.dropdown-search-container');
        let optionsContainer = specDropdownMenu.querySelector('.dropdown-options-list');

        if (!searchContainer) {
            specDropdownMenu.innerHTML = '';
            searchContainer = document.createElement('div');
            searchContainer.className = 'dropdown-search-container';
            searchContainer.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/></svg>
                <input type="text" class="dropdown-search-input" placeholder="Search special products..." autocomplete="off" readonly onfocus="this.removeAttribute('readonly');">
            `;
            specDropdownMenu.appendChild(searchContainer);
            searchContainer.querySelector('.dropdown-search-input').addEventListener('input', (e) => {
                e.stopPropagation();
                buildSpecialDropdown(e.target.value);
            });
            searchContainer.querySelector('.dropdown-search-input').addEventListener('click', e => e.stopPropagation());
            searchContainer.querySelector('.dropdown-search-input').addEventListener('keydown', e => e.stopPropagation());
        }

        if (!optionsContainer) {
            optionsContainer = document.createElement('div');
            optionsContainer.className = 'dropdown-options-list';
            specDropdownMenu.appendChild(optionsContainer);
        }

        optionsContainer.innerHTML = '';
        const filter = (filterText || '').toLowerCase();
        const filtered = specialInventory.filter(item => item.name.toLowerCase().includes(filter));

        if (filtered.length === 0) {
            optionsContainer.innerHTML = '<div class="dropdown-no-result">No special products found</div>';
        } else {
            filtered.forEach(item => {
                const option = document.createElement('div');
                option.className = 'custom-dropdown-option';
                option.textContent = item.name;
                if (specItemSelect && specItemSelect.value === item.name) option.classList.add('active');
                option.addEventListener('click', (e) => {
                    e.stopPropagation();
                    optionsContainer.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('active'));
                    option.classList.add('active');
                    if (specDropdownTrigger) specDropdownTrigger.querySelector('.trigger-text').textContent = item.name;
                    if (specItemSelect) specItemSelect.value = item.name;

                    // Show variant selector and fill prices and custom titles
                    if (specVariantContainer) specVariantContainer.style.display = 'block';
                    const specFlexibleContainer = document.getElementById('specFlexibleContainer');
                    if (specFlexibleContainer) specFlexibleContainer.style.display = 'block';

                    // Sync flexible price UI based on the current toggle state
                    window.syncSpecFlexUI();

                    const pt = item.packTypes || {};
                    
                    if (specVariantBagPrice) { specVariantBagPrice.textContent = '₦' + formatCurrency(Number((pt.bag || {}).price || item.price || 0)); specVariantBagPrice.dataset.price = (pt.bag || {}).price || item.price || 0; }
                    if (specVariantCustardPrice) { specVariantCustardPrice.textContent = '₦' + formatCurrency(Number((pt.custard || {}).price || 0)); specVariantCustardPrice.dataset.price = (pt.custard || {}).price || 0; }
                    if (specVariantCupPrice) { specVariantCupPrice.textContent = '₦' + formatCurrency(Number((pt.cup || {}).price || 0)); specVariantCupPrice.dataset.price = (pt.cup || {}).price || 0; }
                    
                    const bagTxt = document.getElementById('specVariantBagLabelTxt');
                    if (bagTxt) bagTxt.textContent = (pt.bag || {}).title || (pt.c1 || {}).title || 'Container 1';
                    
                    const custardTxt = document.getElementById('specVariantCustardLabelTxt');
                    if (custardTxt) custardTxt.textContent = (pt.custard || {}).title || (pt.c2 || {}).title || 'Container 2';
                    
                    const cupTxt = document.getElementById('specVariantCupLabelTxt');
                    if (cupTxt) cupTxt.textContent = (pt.cup || {}).title || (pt.c3 || {}).title || 'Container 3';

                    const variants = [
                        { val: 'bag', labelId: 'specVariantBagLabelTxt' },
                        { val: 'custard', labelId: 'specVariantCustardLabelTxt' },
                        { val: 'cup', labelId: 'specVariantCupLabelTxt' }
                    ];
                    let firstInStockLabel = null;
                    variants.forEach(v => {
                        const radio = document.querySelector(`input[name="specVariant"][value="${v.val}"]`);
                        const label = radio ? radio.closest('label') : null;
                        if (radio && label) {
                            const stock = window.getRemainingProductStock ? window.getRemainingProductStock(item.id || item.name, v.val) : Infinity;
                            if (stock <= 0) {
                                radio.disabled = true;
                                label.style.opacity = '0.5';
                                label.style.pointerEvents = 'none';
                                label.style.background = '#f1f5f9';
                            } else {
                                radio.disabled = false;
                                label.style.opacity = '1';
                                label.style.pointerEvents = 'auto';
                                label.style.background = 'white';
                                if (!firstInStockLabel) firstInStockLabel = label;
                            }
                        }
                    });
                    if (firstInStockLabel) {
                        firstInStockLabel.click();
                    } else {
                        document.querySelectorAll('input[name="specVariant"]').forEach(r => r.checked = false);
                        document.querySelectorAll('.spec-variant-label').forEach(l => {
                            l.style.borderColor = '#bfdbfe';
                            l.style.borderWidth = '1px';
                            l.style.background = 'white';
                        });
                    }

                    specDropdownWrapper.classList.remove('open');
                });
                optionsContainer.appendChild(option);
            });
        }
    }

    // ============================================================
    // Build Custom Items Dropdown
    // ============================================================
    function buildCustomDropdown(filterText) {
        if (!customDropdownMenu) return;

        let searchContainer = customDropdownMenu.querySelector('.dropdown-search-container');
        let optionsContainer = customDropdownMenu.querySelector('.dropdown-options-list');

        if (!searchContainer) {
            customDropdownMenu.innerHTML = '';
            searchContainer = document.createElement('div');
            searchContainer.className = 'dropdown-search-container';
            searchContainer.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/></svg>
                <input type="text" class="dropdown-search-input" placeholder="Search products..." autocomplete="off" readonly onfocus="this.removeAttribute('readonly');">
            `;
            customDropdownMenu.appendChild(searchContainer);
            searchContainer.querySelector('.dropdown-search-input').addEventListener('input', (e) => {
                e.stopPropagation();
                buildCustomDropdown(e.target.value);
            });
            searchContainer.querySelector('.dropdown-search-input').addEventListener('click', e => e.stopPropagation());
            searchContainer.querySelector('.dropdown-search-input').addEventListener('keydown', e => e.stopPropagation());
        }

        if (!optionsContainer) {
            optionsContainer = document.createElement('div');
            optionsContainer.className = 'dropdown-options-list';
            customDropdownMenu.appendChild(optionsContainer);
        }

        optionsContainer.innerHTML = '';
        const filter = (filterText || '').toLowerCase();
        const filtered = customInventory.filter(item => item.name.toLowerCase().includes(filter));

        if (filtered.length === 0) {
            optionsContainer.innerHTML = '<div class="dropdown-no-result">No products found</div>';
        } else {
            filtered.forEach(item => {
                const option = document.createElement('div');
                option.className = 'custom-dropdown-option';
                option.textContent = item.name;
                if (customItemSelect && customItemSelect.value === item.name) option.classList.add('active');
                option.addEventListener('click', (e) => {
                    e.stopPropagation();
                    optionsContainer.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('active'));
                    option.classList.add('active');
                    if (customDropdownTrigger) customDropdownTrigger.querySelector('.trigger-text').textContent = item.name;
                    if (customItemSelect) customItemSelect.value = item.name;
                    
                    // Auto-fill price from the product's retail price
                    const customPriceField = document.getElementById('customItemPrice');
                    const customStaticDisplay = document.getElementById('customStaticPriceDisplay');
                    const customFlexPriceInputWrapper = document.getElementById('customFlexPriceInputWrapper');
                    const customFlexPriceInput = document.getElementById('customFlexPriceInput');
                    const unitStr = item.unit ? item.unit : '';
                    const priceVal = (typeof item.price === 'number') ? item.price : 0;
                    
                    // Always update the hidden field's data-price and the static display
                    if (customPriceField) customPriceField.dataset.price = priceVal;
                    if (customStaticDisplay) {
                        customStaticDisplay.textContent = '₦' + formatCurrency(Number(priceVal)) + (unitStr ? ' ' + unitStr : '');
                    }
                    
                    const flexContainer = document.getElementById('customFlexibleContainer');
                    const flexToggle = document.getElementById('customFlexiblePriceToggle');
                    if (item.allowUserFlexiblePricing) {
                        // Show toggle
                        if (flexContainer) flexContainer.style.display = 'block';
                        if (flexToggle) { flexToggle.dispatchEvent(new Event('change')); }
                    } else {
                        // Hide toggle, always show static price
                        if (flexContainer) flexContainer.style.display = 'none';
                        if (customFlexPriceInputWrapper) customFlexPriceInputWrapper.style.display = 'none';
                        if (customStaticDisplay) customStaticDisplay.style.display = 'flex';
                    }
                    const priceLabel = document.getElementById('lblCustomPrice');
                    if (priceLabel) {
                        priceLabel.textContent = 'Unit Price (₦)';
                    }
                    const qtyLabel = document.getElementById('lblCustomQty');
                    if (qtyLabel) {
                        qtyLabel.textContent = 'Quantity';
                    }
                    customDropdownWrapper.classList.remove('open');
                });
                optionsContainer.appendChild(option);
            });
        }
    }

    // ============================================================
    // Build Flexible Items Dropdown
    // ============================================================
    function buildFlexDropdown(filterText) {
        if (!flexDropdownMenu) return;

        let searchContainer = flexDropdownMenu.querySelector('.dropdown-search-container');
        let optionsContainer = flexDropdownMenu.querySelector('.dropdown-options-list');

        if (!searchContainer) {
            flexDropdownMenu.innerHTML = '';
            searchContainer = document.createElement('div');
            searchContainer.className = 'dropdown-search-container';
            searchContainer.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/></svg>
                <input type="text" class="dropdown-search-input" placeholder="Search flexible products..." autocomplete="off" readonly onfocus="this.removeAttribute('readonly');">
            `;
            flexDropdownMenu.appendChild(searchContainer);
            searchContainer.querySelector('.dropdown-search-input').addEventListener('input', (e) => {
                e.stopPropagation();
                buildFlexDropdown(e.target.value);
            });
            searchContainer.querySelector('.dropdown-search-input').addEventListener('click', e => e.stopPropagation());
            searchContainer.querySelector('.dropdown-search-input').addEventListener('keydown', e => e.stopPropagation());
        }

        if (!optionsContainer) {
            optionsContainer = document.createElement('div');
            optionsContainer.className = 'dropdown-options-list';
            flexDropdownMenu.appendChild(optionsContainer);
        }

        optionsContainer.innerHTML = '';
        const filter = (filterText || '').toLowerCase();
        const filtered = flexInventory.filter(item => item.name.toLowerCase().includes(filter));

        if (filtered.length === 0) {
            optionsContainer.innerHTML = '<div class="dropdown-no-result">No products found</div>';
        } else {
            filtered.forEach(item => {
                const option = document.createElement('div');
                option.className = 'custom-dropdown-option';
                option.textContent = item.name;
                if (flexItemSelect && flexItemSelect.value === item.name) option.classList.add('active');
                option.addEventListener('click', (e) => {
                    e.stopPropagation();
                    optionsContainer.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('active'));
                    option.classList.add('active');
                    if (flexDropdownTrigger) flexDropdownTrigger.querySelector('.trigger-text').textContent = item.name;
                    if (flexItemSelect) flexItemSelect.value = item.name;
                    
                    if (flexVariantContainer) flexVariantContainer.style.display = 'block';
                    const pt = item.packTypes || {};
                    
                    if (flexVariantC1Price) { flexVariantC1Price.textContent = '₦' + formatCurrency(Number((pt.c1 || {}).price || item.price || 0)); flexVariantC1Price.dataset.price = (pt.c1 || {}).price || item.price || 0; }
                    if (flexVariantC2Price) { flexVariantC2Price.textContent = '₦' + formatCurrency(Number((pt.c2 || {}).price || 0)); flexVariantC2Price.dataset.price = (pt.c2 || {}).price || 0; }
                    
                    const c1Txt = document.getElementById('flexVariantC1LabelTxt');
                    if (c1Txt) c1Txt.textContent = (pt.c1 || {}).title || (pt.bag || {}).title || 'Container 1';
                    
                    const c2Txt = document.getElementById('flexVariantC2LabelTxt');
                    if (c2Txt) c2Txt.textContent = (pt.c2 || {}).title || (pt.custard || {}).title || 'Container 2';
                    
                    const c3Txt = document.getElementById('flexVariantC3LabelTxt');
                    if (c3Txt) c3Txt.textContent = (pt.c3 || {}).title || (pt.cup || {}).title || 'Container 3';

                    if (flexCustomPriceContainer) flexCustomPriceContainer.style.display = 'none';
                    if (flexItemPrice) flexItemPrice.value = '';

                    const flexVariants = [
                        { val: 'c1', labelId: 'flexVariantC1LabelTxt' },
                        { val: 'c2', labelId: 'flexVariantC2LabelTxt' },
                        { val: 'c3', labelId: 'flexVariantC3LabelTxt' }
                    ];
                    let firstFlexInStockLabel = null;
                    flexVariants.forEach(v => {
                        const radio = document.querySelector(`input[name="flexVariant"][value="${v.val}"]`);
                        const label = radio ? radio.closest('label') : null;
                        if (radio && label) {
                            const stock = window.getRemainingProductStock ? window.getRemainingProductStock(item.id || item.name, v.val) : Infinity;
                            if (stock <= 0) {
                                radio.disabled = true;
                                label.style.opacity = '0.5';
                                label.style.pointerEvents = 'none';
                                label.style.background = '#f1f5f9';
                            } else {
                                radio.disabled = false;
                                label.style.opacity = '1';
                                label.style.pointerEvents = 'auto';
                                label.style.background = 'white';
                                if (!firstFlexInStockLabel) firstFlexInStockLabel = label;
                            }
                        }
                    });
                    if (firstFlexInStockLabel) {
                        firstFlexInStockLabel.click();
                    } else {
                        document.querySelectorAll('input[name="flexVariant"]').forEach(r => r.checked = false);
                        document.querySelectorAll('.flex-variant-label').forEach(l => {
                            l.style.borderColor = '#bfdbfe';
                            l.style.borderWidth = '1px';
                            l.style.background = 'white';
                        });
                    }

                    flexDropdownWrapper.classList.remove('open');
                });
                optionsContainer.appendChild(option);
            });
        }
    }

    // Initialize all dropdowns
    buildDefaultDropdown('');
    buildSpecialDropdown('');
    buildCustomDropdown('');
    buildFlexDropdown('');

    // Wire up Default dropdown trigger
    if (itemDropdownTrigger && itemDropdownWrapper) {
        itemDropdownTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const wasOpen = itemDropdownWrapper.classList.contains('open');
            [itemDropdownWrapper, specDropdownWrapper, customDropdownWrapper, flexDropdownWrapper].forEach(w => w && w.classList.remove('open'));
            if (!wasOpen) {
                itemDropdownWrapper.classList.add('open');
                buildDefaultDropdown('');
            }
        });
        document.addEventListener('click', (e) => {
            if (itemDropdownWrapper.classList.contains('open') && !itemDropdownWrapper.contains(e.target)) {
                itemDropdownWrapper.classList.remove('open');
            }
        });
    }

    // Wire up Special dropdown trigger
    if (specDropdownTrigger && specDropdownWrapper) {
        specDropdownTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const wasOpen = specDropdownWrapper.classList.contains('open');
            [itemDropdownWrapper, specDropdownWrapper, customDropdownWrapper, flexDropdownWrapper].forEach(w => w && w.classList.remove('open'));
            if (!wasOpen) {
                specDropdownWrapper.classList.add('open');
                buildSpecialDropdown('');
            }
        });
        document.addEventListener('click', (e) => {
            if (specDropdownWrapper.classList.contains('open') && !specDropdownWrapper.contains(e.target)) {
                specDropdownWrapper.classList.remove('open');
            }
        });
    }

    // Wire up Custom dropdown trigger
    if (customDropdownTrigger && customDropdownWrapper) {
        customDropdownTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const wasOpen = customDropdownWrapper.classList.contains('open');
            [itemDropdownWrapper, specDropdownWrapper, customDropdownWrapper, flexDropdownWrapper].forEach(w => w && w.classList.remove('open'));
            if (!wasOpen) {
                customDropdownWrapper.classList.add('open');
                buildCustomDropdown('');
            }
        });
        document.addEventListener('click', (e) => {
            if (customDropdownWrapper.classList.contains('open') && !customDropdownWrapper.contains(e.target)) {
                customDropdownWrapper.classList.remove('open');
            }
        });
    }

    // Wire up Flex dropdown trigger
    if (flexDropdownTrigger && flexDropdownWrapper) {
        flexDropdownTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const wasOpen = flexDropdownWrapper.classList.contains('open');
            [itemDropdownWrapper, specDropdownWrapper, customDropdownWrapper, flexDropdownWrapper].forEach(w => w && w.classList.remove('open'));
            if (!wasOpen) {
                flexDropdownWrapper.classList.add('open');
                buildFlexDropdown('');
            }
        });
        document.addEventListener('click', (e) => {
            if (flexDropdownWrapper.classList.contains('open') && !flexDropdownWrapper.contains(e.target)) {
                flexDropdownWrapper.classList.remove('open');
            }
        });
    }

    // Expose for reset on modal close
    itemDropdownWrapper._renderOpts = buildDefaultDropdown;
    specDropdownWrapper._renderOpts = buildSpecialDropdown;
    if (customDropdownWrapper) customDropdownWrapper._renderOpts = buildCustomDropdown;
    if (flexDropdownWrapper) flexDropdownWrapper._renderOpts = buildFlexDropdown;



    if (addBtn && addSaleModal) {
        addBtn.addEventListener('click', () => {
            const locks = JSON.parse(localStorage.getItem('nd_admin_locks') || '{}');
            if (locks['addBtn'] && typeof _checkModuleAdminAuth === 'function') {
                _checkModuleAdminAuth('Record Sale', _openSaleModal);
            } else {
                _openSaleModal();
            }

            function _openSaleModal() {
                addSaleModal.classList.add('show');
                document.body.classList.add('modal-open');
            }
        });

        const closeModalArea = () => {
            addSaleModal.classList.remove('show');
            document.body.classList.remove('modal-open');
            
            // CLEAR BASKET
            basketItems = [];
            if (typeof updateBasketUI === 'function') updateBasketUI();
            
            // CLEAR FORMS
            if (existingForm) existingForm.reset();
            if (specialForm) specialForm.reset();
            if (customForm) customForm.reset();
            if (flexForm) flexForm.reset();
            
            // RESET TAB SELECTION TO DEFAULT
            const tabBtns = document.querySelectorAll('.sale-tab-btn');
            tabBtns.forEach(b => {
                b.classList.remove('active');
                b.style.background = 'transparent';
                b.style.color = '#64748b';
                b.style.boxShadow = 'none';
            });
            if (tabBtns.length > 0) {
                tabBtns[0].classList.add('active');
                tabBtns[0].style.background = 'white';
                tabBtns[0].style.color = '#8b5cf6';
                tabBtns[0].style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
            }
            [existingForm, specialForm, customForm, flexForm].forEach(f => { if(f) f.style.display = 'none'; });
            if (specialForm) specialForm.style.display = 'block';
            
            if (existingPrice) {
                existingPrice.value = '';
                existingPrice.dataset.price = '';
            }
            const customPriceReset = document.getElementById('customItemPrice');
            if (customPriceReset) {
                customPriceReset.value = '';
                customPriceReset.dataset.price = '';
            }
            if(specVariantContainer) specVariantContainer.style.display = 'none';
            document.querySelectorAll('.spec-variant-label').forEach(l => {
                l.style.borderColor = '#bfdbfe';
                l.style.borderWidth = '1px';
                l.style.background = 'white';
            });
            
            const defaultVariantContainer = document.getElementById('defaultVariantContainer');
            if(defaultVariantContainer) defaultVariantContainer.style.display = 'none';
            document.querySelectorAll('.default-variant-label').forEach(l => {
                l.style.borderColor = '#bfdbfe';
                l.style.borderWidth = '1px';
                l.style.background = 'white';
            });
            
            if (itemDropdownTrigger) itemDropdownTrigger.querySelector('.trigger-text').textContent = 'Select an Item';
            if (specDropdownTrigger) specDropdownTrigger.querySelector('.trigger-text').textContent = 'Select an Analytical Product';
            if (customDropdownTrigger) customDropdownTrigger.querySelector('.trigger-text').textContent = 'Select a Product';
            
            if (hiddenItemInput) hiddenItemInput.value = '';
            if (specItemSelect) specItemSelect.value = '';
            if (customItemSelect) customItemSelect.value = '';
            if (flexItemSelect) flexItemSelect.value = '';
            
            if(flexVariantContainer) flexVariantContainer.style.display = 'none';
            if(flexCustomPriceContainer) flexCustomPriceContainer.style.display = 'none';
            document.querySelectorAll('.flex-variant-label').forEach(l => {
                l.style.borderColor = '#bfdbfe';
                l.style.borderWidth = '1px';
                l.style.background = 'white';
            });
            if(flexItemPrice) flexItemPrice.value = '';
            
            // Clean up dropdowns
            [itemDropdownMenu, specDropdownMenu, customDropdownMenu, flexDropdownMenu].forEach(menu => {
                if (menu) {
                    menu.querySelectorAll('.custom-dropdown-option').forEach(opt => opt.classList.remove('active'));
                    const searchInput = menu.querySelector('.dropdown-search-input');
                    if (searchInput) searchInput.value = '';
                }
            });
            
            if (itemDropdownWrapper && itemDropdownWrapper._renderOpts) itemDropdownWrapper._renderOpts('');
            if (specDropdownWrapper && specDropdownWrapper._renderOpts) specDropdownWrapper._renderOpts('');
            if (customDropdownWrapper && customDropdownWrapper._renderOpts) customDropdownWrapper._renderOpts('');
            if (flexDropdownWrapper && flexDropdownWrapper._renderOpts) flexDropdownWrapper._renderOpts('');
        };

        if (closeAddSaleModal) {
            closeAddSaleModal.addEventListener('click', closeModalArea);
        }


        // Multi-item Basket Logic
        let basketItems = [];
        const basketContainer = document.getElementById('saleBasketContainer');
        const basketList = document.getElementById('basketItemsList');
        const basketSubtotal = document.getElementById('basketSubtotal');
        const finalizeBtn = document.getElementById('finalizeSaleBtn');

        function updateBasketUI() {
            if (basketItems.length === 0) {
                basketContainer.style.display = 'none';
                return;
            }

            basketContainer.style.display = 'block';
            basketList.innerHTML = '';
            let total = 0;

            basketItems.forEach((item, index) => {
                const itemTotal = item.qty * item.price;
                total += itemTotal;

                const itemDiv = document.createElement('div');
                itemDiv.className = 'basket-item';
                const flexLabel = item.isFlexible ? ' <span style="color:#c026d3;font-size:0.7rem;">(Flex)</span>' : '';
                itemDiv.innerHTML = `
                    <div class="basket-item-info">
                        <span class="basket-item-name">${item.name}</span>
                        <span class="basket-item-meta">${item.qty} × ₦${formatCurrency(item.price)}${flexLabel}</span>
                    </div>
                    <span class="basket-item-total">₦${formatCurrency(itemTotal)}</span>
                    <button class="remove-basket-item" data-index="${index}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                    </button>
                `;

                itemDiv.querySelector('.remove-basket-item').addEventListener('click', () => {
                    basketItems.splice(index, 1);
                    updateBasketUI();
                });

                basketList.appendChild(itemDiv);
            });

            basketSubtotal.textContent = '₦' + formatCurrency(total);
        }

        function addToBasket(name, qty, price, unit = '', isFlexible = false, productId = '') {
            basketItems.push({
                name: name,
                qty: Number(qty),
                price: Number(price),
                unit: unit,
                isFlexible: isFlexible,
                productId: productId
            });
            updateBasketUI();

            existingForm.reset();
            specialForm.reset();
            customForm.reset();
            if (flexForm) flexForm.reset();
            if (existingPrice) {
                existingPrice.value = '';
                existingPrice.dataset.price = '';
            }
            const customPriceReset = document.getElementById('customItemPrice');
            if (customPriceReset) {
                customPriceReset.value = '';
                customPriceReset.dataset.price = '';
            }
            const priceLabel = document.getElementById('lblExistingPrice');
            if (priceLabel) { priceLabel.textContent = 'Unit Price (₦)'; }
            const qtyLabel = document.getElementById('lblExistingQty');
            if (qtyLabel) { qtyLabel.textContent = 'Quantity'; }

            if(specVariantContainer) specVariantContainer.style.display = 'none';
            const specFlexibleContainer = document.getElementById('specFlexibleContainer');
            if (specFlexibleContainer) specFlexibleContainer.style.display = 'none';
            const specFlexiblePriceToggle = document.getElementById('specFlexiblePriceToggle');
            if (specFlexiblePriceToggle) {
                specFlexiblePriceToggle.checked = false;
                const slider = specFlexiblePriceToggle.nextElementSibling;
                if (slider) {
                    slider.style.backgroundColor = '#cbd5e1';
                    const knob = slider.querySelector('.knob');
                    if (knob) knob.style.transform = 'translateX(0)';
                }
            }
            const specCustomPriceGroup = document.getElementById('specCustomPriceGroup');
            if (specCustomPriceGroup) specCustomPriceGroup.style.display = 'none';
            const specItemPrice = document.getElementById('specItemPrice');
            if (specItemPrice) specItemPrice.value = '';

            const defaultVariantContainer = document.getElementById('defaultVariantContainer');
            if(defaultVariantContainer) defaultVariantContainer.style.display = 'none';
            document.querySelectorAll('.default-variant-label').forEach(l => {
                l.style.borderColor = '#bfdbfe';
                l.style.borderWidth = '1px';
                l.style.background = 'white';
            });

            document.querySelectorAll('.spec-variant-label').forEach(l => {
                l.style.borderColor = '#bfdbfe';
                l.style.borderWidth = '1px';
                l.style.background = 'white';
            });

            if (itemDropdownTrigger) itemDropdownTrigger.querySelector('.trigger-text').textContent = 'Select an Item';
            if (specDropdownTrigger) specDropdownTrigger.querySelector('.trigger-text').textContent = 'Select an Analytical Product';
            if (customDropdownTrigger) customDropdownTrigger.querySelector('.trigger-text').textContent = 'Select a Product';
            if (flexDropdownTrigger) flexDropdownTrigger.querySelector('.trigger-text').textContent = 'Select a Product';
            
            if (hiddenItemInput) hiddenItemInput.value = '';
            if (specItemSelect) specItemSelect.value = '';
            if (customItemSelect) customItemSelect.value = '';
            if (flexItemSelect) flexItemSelect.value = '';
            
            if(flexVariantContainer) flexVariantContainer.style.display = 'none';
            if(flexCustomPriceContainer) flexCustomPriceContainer.style.display = 'none';
            document.querySelectorAll('.flex-variant-label').forEach(l => {
                l.style.borderColor = '#bfdbfe';
                l.style.borderWidth = '1px';
                l.style.background = 'white';
            });
            if(flexItemPrice) flexItemPrice.value = '';
            
            [itemDropdownMenu, specDropdownMenu, customDropdownMenu, flexDropdownMenu].forEach(menu => {
                if(menu) menu.querySelectorAll('.custom-dropdown-option').forEach(opt => opt.classList.remove('active'));
            });
        }

        // Add Sale Handlers
        function getCurrentDateTimeStr() {
            const now = new Date();
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const day = now.getDate();
            const month = months[now.getMonth()];
            const year = now.getFullYear();
            let hours = now.getHours();
            const minutes = now.getMinutes().toString().padStart(2, '0');
            const ampm = hours >= 12 ? 'pm' : 'am';
            hours = hours % 12;
            hours = hours ? hours : 12;
            return `${day} ${month}, ${year} · ${hours}:${minutes} ${ampm}`;
        }

        if (existingForm) existingForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const itemName = hiddenItemInput.value;
            const price = existingPrice.dataset.price;
            const qty = document.getElementById('existingItemQty').value;
            
            const prod = defaultInventory.find(p => p.name === itemName);
            const unit = prod ? prod.unit : '';

            if (itemName && price && qty) {
                const requiredQty = parseFloat(qty);
                
                const defaultVariantContainer = document.getElementById('defaultVariantContainer');
                const hasWholesale = prod && prod.wholesalePrice && Number(prod.wholesalePrice) > 0;
                
                let isWholesale = false;
                let finalName = itemName;
                let finalUnit = unit;
                let variantParam = null;
                
                if (hasWholesale && defaultVariantContainer && defaultVariantContainer.style.display !== 'none') {
                    const checkedVariant = document.querySelector('input[name="defaultVariant"]:checked');
                    if (!checkedVariant) {
                        alert("Please select a variant type.");
                        return;
                    }
                    if (checkedVariant.value === 'wholesale') {
                        isWholesale = true;
                        finalName = itemName + ` (${prod.bulkUnit || 'Carton'})`;
                        finalUnit = 'per ' + (prod.bulkUnit || 'carton').toLowerCase();
                        variantParam = 'wholesale';
                    }
                }
                
                const remaining = window.getRemainingProductStock ? window.getRemainingProductStock((prod ? prod.id : '') || itemName, variantParam) : Infinity;
                if (requiredQty > remaining) {
                    const unitLabel = isWholesale ? (prod.bulkUnit || 'Carton') : (unit ? unit.replace(/^per\s+/i, '') : 'items');
                    customAlert(`Cannot add to basket. Only ${remaining} ${unitLabel}(s) remaining in stock.`);
                    return;
                }
                addToBasket(finalName, qty, price, finalUnit, false, prod ? prod.id : '');
            }
        });
        
        if (specialForm) specialForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const itemName = specItemSelect.value;
            const qty = document.getElementById('specItemQty').value;
            
            const isFlexibleToggleChecked = document.getElementById('specFlexiblePriceToggle')?.checked || false;
            let checkedVariant = document.querySelector('input[name="specVariant"]:checked');
            if (isFlexibleToggleChecked && !checkedVariant) {
                const specVariantContainer = document.getElementById('specVariantContainer');
                if (specVariantContainer) {
                    const firstRadio = specVariantContainer.querySelector('input[type="radio"]');
                    if (firstRadio) {
                        firstRadio.checked = true;
                        checkedVariant = firstRadio;
                    }
                }
            }
            
            if (itemName && qty && checkedVariant) {
                const variantKey = checkedVariant.value; // bag, custard, cup
                const requiredQty = parseFloat(qty);
                
                const variantKeyCapitalized = variantKey.charAt(0).toUpperCase() + variantKey.slice(1);
                const variantId = 'specVariant' + variantKeyCapitalized + 'Price';
                const labelTxtId = 'specVariant' + variantKeyCapitalized + 'LabelTxt';
                const titleStr = document.getElementById(labelTxtId) ? document.getElementById(labelTxtId).textContent.trim() : variantKeyCapitalized;
                
                const remaining = window.getRemainingProductStock ? window.getRemainingProductStock((selectedProduct ? selectedProduct.id : '') || itemName, variantKey) : Infinity;
                if (requiredQty > remaining) {
                    customAlert(`Cannot add to basket. Only ${remaining} ${titleStr}(s) remaining in stock.`);
                    return;
                }
                
                // Read from database to check allowed status
                const selectedProduct = specialInventory.find(p => p.name === itemName);
                let variantAllowsFlex = false;
                if (selectedProduct && selectedProduct.allowUserFlexiblePricing) {
                    const flexVars = selectedProduct.flexibleVariants || [];
                    const pt = selectedProduct.packTypes || {};
                    let title = '';
                    if (variantKey === 'c1' || variantKey === 'bag') title = (pt.c1 || {}).title || (pt.bag || {}).title || 'Container 1';
                    else if (variantKey === 'c2' || variantKey === 'custard') title = (pt.c2 || {}).title || (pt.custard || {}).title || 'Container 2';
                    else if (variantKey === 'c3' || variantKey === 'cup') title = (pt.c3 || {}).title || (pt.cup || {}).title || 'Container 3';

                    if (title && (flexVars.includes(title) || (title === 'Default' && flexVars.some(fv => fv.startsWith('Default ('))))) {
                        variantAllowsFlex = true;
                    }
                }
                const isFlexiblePrice = isFlexibleToggleChecked && variantAllowsFlex;
                let price;
                if (isFlexiblePrice) {
                    const customPriceVal = document.getElementById('specItemPrice')?.value;
                    if (customPriceVal === undefined || customPriceVal === '' || parseFloat(customPriceVal) < 0) {
                        alert("Please enter a valid selling price.");
                        return;
                    }
                    price = parseFloat(customPriceVal);
                } else {
                    price = document.getElementById(variantId).dataset.price;
                }
                
                const finalName = `${itemName} (${titleStr})`;
                // Pass isFlexiblePrice to treat the custom price correctly in calculations
                addToBasket(finalName, qty, price, titleStr, isFlexiblePrice, selectedProduct ? selectedProduct.id : '');
            } else if (!checkedVariant) {
                alert("Please select a variant type.");
            }
        });

        if (customForm) customForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const itemName = customItemSelect.value;
            const hiddenPriceField = document.getElementById('customItemPrice');
            const customFlexPriceInput = document.getElementById('customFlexPriceInput');
            const flexToggle = document.getElementById('customFlexiblePriceToggle');
            // If toggle is on, use the editable flex input; otherwise use the stored dataset.price
            let price;
            if (flexToggle && flexToggle.checked && customFlexPriceInput) {
                price = parseFloat(customFlexPriceInput.value) || 0;
            } else {
                price = Number(hiddenPriceField ? hiddenPriceField.dataset.price : 0);
            }
            const qty = Number(document.getElementById('customItemQty').value) || 1;
            if (itemName && price && qty) {
                const requiredQty = parseFloat(qty);
                const prod = customInventory.find(p => p.name === itemName);
                const unit = prod ? prod.unit : '';
                const remaining = window.getRemainingProductStock ? window.getRemainingProductStock((prod ? prod.id : '') || itemName) : Infinity;
                
                if (requiredQty > remaining) {
                    customAlert(`Cannot add to basket. Only ${remaining} ${unit ? unit.replace(/^per\s+/i, '') : 'items'} remaining in stock.`);
                    return;
                }

                addToBasket(`${itemName}`, requiredQty, Number(price), unit, false, prod ? prod.id : '');
            }
        });

        if (flexForm) flexForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const itemName = flexItemSelect.value;
            const checkedVariant = document.querySelector('input[name="flexVariant"]:checked');
            const qty = document.getElementById('flexItemQty').value;
            
            if (itemName && qty && checkedVariant) {
                const variantKey = checkedVariant.value; // c1, c2, c3
                const requiredQty = parseFloat(qty);
                const prod = flexInventory.find(p => p.name === itemName);
                const pt = prod ? (prod.packTypes || {}) : {};
                
                const variantKeyCapitalized = variantKey.toUpperCase(); // C1, C2, C3
                const titleStr = (pt[variantKey] || {}).title || `Container ${variantKey.charAt(1)}`;
                
                const remaining = window.getRemainingProductStock ? window.getRemainingProductStock((prod ? prod.id : '') || itemName, variantKey) : Infinity;
                
                if (requiredQty > remaining) {
                    customAlert(`Cannot add to basket. Only ${remaining} items remaining in stock.`);
                    return;
                }
                
                const price = flexItemPrice ? flexItemPrice.value : '';
                if (!price) {
                    alert("Please enter a retail unit price.");
                    return;
                }
                addToBasket(`${itemName} (${titleStr})`, requiredQty, Number(price), titleStr, true, prod ? prod.id : '');
            } else if (!checkedVariant) {
                alert("Please select a variant type.");
            }
        });



        finalizeBtn.addEventListener('click', () => {
            if (basketItems.length === 0) return;

            const timeStr = getCurrentDateTimeStr();

            basketItems.forEach(item => {
                const newSale = {
                    date: timeStr,
                    item: item.name,
                    qty: item.qty,
                    // For flexible items, price is the total entered — store as unitPrice for consistency
                    unitPrice: Number(item.price || 0),
                    price: (Number(item.qty || 1) * Number(item.price || 0)),
                    unit: item.unit,
                    isFlexible: item.isFlexible || false,
                    productId: item.productId || ''
                };
                sampleData.unshift(newSale);
            });

            // Immediately save the newly recorded sales!
            saveSalesToMemory();

            // Reset main sort to newest
            currentSortType = 'newest';
            const sortDropdown = document.getElementById('registerSortDropdown');
            if (sortDropdown) {
                const options = sortDropdown.querySelectorAll('.sort-option');
                options.forEach(o => o.classList.remove('active'));
                options[0].classList.add('active');
                const sortToggle = document.getElementById('registerSortToggle');
                if (sortToggle) sortToggle.querySelector('.sort-text').textContent = 'Newest to Oldest';
            }

            applyFiltersAndSort();

            // Clear all and close modal
            basketItems = [];
            updateBasketUI();
            closeModalArea();
        });
    }

    // Helper to parse the custom date format: "26 Feb, 2026 · 3:45 pm"
    function parseDate(dateStr) {
        // Remove the bullet and normalize
        return dateStr.replace('·', '').trim();
    }
}

function syncTableScroll() {
    const header = document.getElementById('tableHeaderContainer');
    const body = document.getElementById('tableBodyContainer');

    if (header && body) {
        body.addEventListener('scroll', () => {
            header.scrollLeft = body.scrollLeft;
        });
    }
}





