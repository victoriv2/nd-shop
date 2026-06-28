// Connect the Product list directly to the browser's permanent memory (localStorage).
// If there is no saved data (first time use), it starts as a completely blank slate [].
let adminProducts = [];
const savedProducts = localStorage.getItem('nd_products_data');
if (savedProducts) {
    try {
        adminProducts = JSON.parse(savedProducts);
    } catch (e) {
        console.error('Failed to parse saved products', e);
        adminProducts = [];
    }
}

// Helper function to save current products to localStorage
function saveProductsToMemory() {
    localStorage.setItem('nd_products_data', JSON.stringify(adminProducts));
}

// Reload adminProducts from localStorage (callable from any module)
window.reloadAdminProducts = function() {
    try {
        const saved = localStorage.getItem('nd_products_data');
        adminProducts = saved ? JSON.parse(saved) : [];
    } catch(e) {
        console.error('Failed to reload admin products', e);
        adminProducts = [];
    }
};

// Current sort and filter state
let adminProductSortMode = 'newest';
let adminActiveTab = 'all';

function loadProduct() {
    const container = document.getElementById('register-container');
    if (!container) return;

    // Fetch both product HTML and the modular product details HTML
    Promise.all([
        fetch('product/product.html').then(res => res.text()),
        fetch('product/product-details.html').then(res => res.text())
    ])
        .then(([productHtml, detailsHtml]) => {
            if (window.adminExpectedTabId && window.adminExpectedTabId !== 'tab-product') return;
            // Clean up any stray modals in the body to prevent duplicate ID bugs on re-entry
            document.querySelectorAll('#adminAddProductModal, #adminProductDetailsModal').forEach(el => el.remove());

            container.innerHTML = productHtml;
            // Append details modal to the end of the container to keep it modular
            container.insertAdjacentHTML('beforeend', detailsHtml);

            initAdminProductLogic();

            // Initialize the separate product details logic
            if (typeof initProductDetailsModal === 'function') {
                initProductDetailsModal();
            }
        })
        .catch(err => {
            console.warn('Could not fetch products or details modules', err);
            container.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">Failed to load products.</div>';
        });
}

function initAdminProductLogic() {
    const productList = document.getElementById('adminProductList');
    const searchInput = document.getElementById('adminProductSearchInput');
    const searchWrapper = document.getElementById('adminProductSearchWrapper');
    const sortContainer = document.getElementById('adminProductSortContainer');
    const addBtn = document.getElementById('adminAddProductBtn');
    const modal = document.getElementById('adminAddProductModal');
    const closeBtn = document.getElementById('adminAddProductClose');
    const priceInput = document.getElementById('adminNewProductPrice');
    const nameInput = document.getElementById('adminNewProductName');
    const unitHidden = document.getElementById('adminNewProductUnit');
    const payoutDisplay = document.getElementById('adminApmPayoutValue');
    const submitBtn = document.getElementById('adminApmSubmitBtn');

    // Move modal to body so it overlays properly
    if (modal) document.body.appendChild(modal);
    
    const detailsModal = document.getElementById('adminProductDetailsModal');
    if (detailsModal) document.body.appendChild(detailsModal);

    // ========================================
    // Search Focus/Blur (same as Register)
    // ========================================
    if (searchInput && searchWrapper && sortContainer) {
        searchInput.addEventListener('focus', () => {
            searchWrapper.classList.add('focused');
            sortContainer.classList.add('hidden');
        });

        searchInput.addEventListener('blur', () => {
            setTimeout(() => {
                searchWrapper.classList.remove('focused');
                sortContainer.classList.remove('hidden');
            }, 150);
        });
    }

    // ========================================
    // Sort Dropdown (same pattern as Register)
    // ========================================
    const sortToggle = document.getElementById('adminProductSortToggle');
    const sortDropdown = document.getElementById('adminProductSortDropdown');

    if (sortToggle && sortDropdown) {
        sortToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sortDropdown.classList.toggle('show');
        });

        document.addEventListener('click', (e) => {
            if (sortDropdown.classList.contains('show') && !sortToggle.contains(e.target) && !sortDropdown.contains(e.target)) {
                e.preventDefault();
                e.stopPropagation();
                sortDropdown.classList.remove('show');
            }
        }, true);

        const sortOptions = sortDropdown.querySelectorAll('.sort-option');
        const sortModes = ['newest', 'oldest', 'az', 'za', 'high', 'low'];

        sortOptions.forEach((option, index) => {
            option.addEventListener('click', () => {
                sortOptions.forEach(o => o.classList.remove('active'));
                option.classList.add('active');

                const text = option.childNodes[0].textContent.trim();
                sortToggle.querySelector('.sort-text').textContent = text;
                sortDropdown.classList.remove('show');

                adminProductSortMode = sortModes[index] || 'az';
                renderProducts(searchInput ? searchInput.value.trim() : '');
            });
        });
    }

    // ========================================
    // Flexible Pricing Toggles
    // ========================================
    const pricingSwitches = [
        { switchId: 'adminDefFlexiblePricingSwitch', containerId: 'adminDefFixedPriceFields', isClass: false },
        { switchId: 'adminSpecFlexiblePricingSwitch', containerId: 'admin-spec-price-fields', isClass: true },
        { switchId: 'adminCustomFlexiblePricingSwitch', containerId: 'adminCustomFixedPriceFields', isClass: false },
        { switchId: 'adminFlexFlexiblePricingSwitch', containerId: 'admin-flex-price-fields', isClass: true }
    ];

    pricingSwitches.forEach(ps => {
        const sw = document.getElementById(ps.switchId);
        if (sw) {
            sw.addEventListener('change', () => {
                const display = sw.checked ? 'none' : 'block';
                if (ps.isClass) {
                    document.querySelectorAll('.' + ps.containerId).forEach(el => el.style.display = display);
                } else {
                    const el = document.getElementById(ps.containerId);
                    if (el) el.style.display = display;
                }
            });
        }
    });

    // ========================================
    // Category Tabs Logic
    // ========================================
    const tabBtns = document.querySelectorAll('.ap-tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            adminActiveTab = btn.dataset.tab;
            renderProducts(searchInput ? searchInput.value.trim() : '');
        });
    });

    // ========================================
    // Bulk Unit Dropdown
    // ========================================
    const bulkWrapper = document.getElementById('adminBulkDropdownWrapper');
    const bulkTrigger = document.getElementById('adminBulkDropdownTrigger');
    const bulkMenu = document.getElementById('adminBulkDropdownMenu');
    const bulkHidden = document.getElementById('adminBulkUnitSelect');
    const customBulkRow = document.getElementById('adminCustomBulkRow');
    const customBulkInput = document.getElementById('adminCustomBulkInput');
    const customBulkConfirmBtn = document.getElementById('adminCustomBulkConfirmBtn');

    if (bulkTrigger && bulkMenu && bulkWrapper) {
        bulkTrigger.addEventListener('click', () => {
            bulkWrapper.classList.toggle('open');
            if (customBulkRow) customBulkRow.style.display = 'none';
        });

        document.addEventListener('click', (e) => {
            if (bulkWrapper.classList.contains('open') && !bulkWrapper.contains(e.target)) {
                bulkWrapper.classList.remove('open');
            }
        });

        bulkMenu.addEventListener('click', (e) => {
            const opt = e.target.closest('.custom-dropdown-option');
            if (!opt) return;

            const val = opt.getAttribute('data-value');

            if (val === '__custom_bulk__') {
                if (customBulkRow) customBulkRow.style.display = 'block';
                return;
            }

            bulkMenu.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            const trigText = bulkTrigger.querySelector('.trigger-text');
            trigText.textContent = val;
            trigText.style.color = '';
            trigText.style.fontWeight = '600';
            if (bulkHidden) {
                bulkHidden.value = val;
                if (typeof updateProductUILabel === 'function') updateProductUILabel();
            }
            bulkWrapper.classList.remove('open');
            if (customBulkRow) customBulkRow.style.display = 'none';
        });

        if (customBulkConfirmBtn && customBulkInput) {
            customBulkConfirmBtn.addEventListener('click', () => {
                let customVal = customBulkInput.value.trim();
                // capitalize first letter
                if (customVal) {
                    customVal = customVal.charAt(0).toUpperCase() + customVal.slice(1);
                } else {
                    customBulkInput.style.borderColor = '#ff4d4d';
                    setTimeout(() => customBulkInput.style.borderColor = '', 1500);
                    return;
                }

                const newOpt = document.createElement('div');
                newOpt.className = 'custom-dropdown-option custom-added-unit';
                newOpt.setAttribute('data-value', customVal);

                const textSpan = document.createElement('span');
                textSpan.textContent = customVal;
                newOpt.appendChild(textSpan);

                const removeBtn = document.createElement('div');
                removeBtn.className = 'custom-delete-btn';
                removeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
                removeBtn.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    const isActive = newOpt.classList.contains('active');
                    newOpt.remove();
                    if (isActive) {
                        const firstOpt = bulkMenu.querySelector('.custom-dropdown-option');
                        if (firstOpt) {
                            firstOpt.classList.add('active');
                            const v = firstOpt.getAttribute('data-value');
                            bulkTrigger.querySelector('.trigger-text').textContent = v;
                            if (bulkHidden) {
                                bulkHidden.value = v;
                                if (typeof updateProductUILabel === 'function') updateProductUILabel();
                            }
                        }
                    }
                });
                newOpt.appendChild(removeBtn);

                const createBtn = bulkMenu.querySelector('.custom-unit-create-option');
                bulkMenu.insertBefore(newOpt, createBtn);

                bulkMenu.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('active'));
                newOpt.classList.add('active');
                bulkTrigger.querySelector('.trigger-text').textContent = customVal;
                if (bulkHidden) {
                    bulkHidden.value = customVal;
                    if (typeof updateProductUILabel === 'function') updateProductUILabel();
                }

                customBulkInput.value = '';
                customBulkRow.style.display = 'none';
                bulkWrapper.classList.remove('open');
            });
        }
    }

    // ========================================
    // Unit Dropdown in Modal (with custom unit creation)
    // ========================================
    const unitWrapper = document.getElementById('adminUnitDropdownWrapper');
    const unitTrigger = document.getElementById('adminUnitDropdownTrigger');
    const unitMenu = document.getElementById('adminUnitDropdownMenu');
    const customUnitRow = document.getElementById('adminCustomUnitRow');
    const customUnitInput = document.getElementById('adminCustomUnitInput');
    const customUnitConfirmBtn = document.getElementById('adminCustomUnitConfirmBtn');

    if (unitTrigger && unitMenu && unitWrapper) {
        unitTrigger.addEventListener('click', () => {
            unitWrapper.classList.toggle('open');
            if (customUnitRow) customUnitRow.style.display = 'none'; // Reset each time
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (unitWrapper.classList.contains('open') && !unitWrapper.contains(e.target)) {
                unitWrapper.classList.remove('open');
            }
        });

        // Delegate clicks on unit options
        unitMenu.addEventListener('click', (e) => {
            const opt = e.target.closest('.custom-dropdown-option');
            if (!opt) return;

            const val = opt.getAttribute('data-value');

            // Handle "Create Custom Unit" option
            if (val === '__custom__') {
                if (customUnitRow) {
                    customUnitRow.style.display = 'block';
                }
                return; // Don't close dropdown
            }

            // Normal option selection
            unitMenu.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            const uTrigText = unitTrigger.querySelector('.trigger-text');
            uTrigText.textContent = val;
            uTrigText.style.color = '';
            if (unitHidden) {
                unitHidden.value = val;
                if(typeof updateProductUILabel === 'function') updateProductUILabel();
            }
            unitWrapper.classList.remove('open');
            if (customUnitRow) customUnitRow.style.display = 'none';
        });

        // Custom unit confirm
        if (customUnitConfirmBtn && customUnitInput) {
            customUnitConfirmBtn.addEventListener('click', () => {
                let customVal = customUnitInput.value.trim();
                if (!customVal) {
                    customUnitInput.style.borderColor = '#ff4d4d';
                    setTimeout(() => customUnitInput.style.borderColor = '', 1500);
                    return;
                }
                if (!customVal.toLowerCase().startsWith('per ')) {
                    customVal = 'per ' + customVal;
                }

                // Create the new option and insert before the "Create Custom" option
                const newOpt = document.createElement('div');
                newOpt.className = 'custom-dropdown-option custom-added-unit';
                newOpt.setAttribute('data-value', customVal);

                const textSpan = document.createElement('span');
                textSpan.textContent = customVal;
                newOpt.appendChild(textSpan);

                const removeBtn = document.createElement('div');
                removeBtn.className = 'remove-unit-btn';
                removeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isActive = newOpt.classList.contains('active');
                    newOpt.remove();

                    // If we removed the active unit, go back to default "per cup"
                    if (isActive) {
                        const firstOpt = unitMenu.querySelector('.custom-dropdown-option');
                        if (firstOpt) {
                            firstOpt.classList.add('active');
                            const val = firstOpt.getAttribute('data-value');
                            unitTrigger.querySelector('.trigger-text').textContent = val;
                            if (unitHidden) unitHidden.value = val;
                        }
                    }
                });

                newOpt.appendChild(removeBtn);

                const createBtn = unitMenu.querySelector('.custom-unit-create-option');
                unitMenu.insertBefore(newOpt, createBtn);

                // Select it
                unitMenu.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('active'));
                newOpt.classList.add('active');
                unitTrigger.querySelector('.trigger-text').textContent = customVal;
                if (unitHidden) {
                    unitHidden.value = customVal;
                    if(typeof updateProductUILabel === 'function') updateProductUILabel();
                }

                // Clean up
                customUnitInput.value = '';
                customUnitRow.style.display = 'none';
                unitWrapper.classList.remove('open');
            });
        }
    }

    // ========================================
    // Render Product List
    // ========================================
    
    function sortProducts(list) {
        const sorted = [...list];
        switch (adminProductSortMode) {
            case 'newest':
                sorted.sort((a, b) => new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0));
                break;
            case 'oldest':
                sorted.sort((a, b) => new Date(a.dateAdded || 0) - new Date(b.dateAdded || 0));
                break;
            case 'az':
                sorted.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'za':
                sorted.sort((a, b) => b.name.localeCompare(a.name));
                break;
            case 'high':
                sorted.sort((a, b) => b.price - a.price);
                break;
            case 'low':
                sorted.sort((a, b) => a.price - b.price);
                break;
        }
        return sorted;
    }

    function renderProducts(filter = '') {
        if (!productList) return;

        let filtered = adminProducts.filter(p => {
            if (p.isDeleted) return false;
            const isHidden = p.isHidden || p.cleared;
            if (isHidden) return false;
            
            // Tab filtering logic
            if (adminActiveTab === 'all') return true;
            if (adminActiveTab === 'special') return p.isSpecial;
            if (adminActiveTab === 'flexible') return p.isFlexible && !p.isSpecial;
            if (adminActiveTab === 'custom') return p.isCustom;
            if (adminActiveTab === 'default') return !p.isSpecial && !p.isFlexible && !p.isCustom;
            
            return true;
        }).filter(p => p.name.toLowerCase().includes(filter.toLowerCase()));
        
        filtered = sortProducts(filtered);

        if (filtered.length === 0) {
            productList.innerHTML = `
                <div class="admin-product-empty" style="text-align: center; padding: 40px 20px; background: #fffcf8; border: 2px dashed #edf1f7; border-radius: 16px; margin-top: 20px;">
                    <div style="width: 80px; height: 80px; background: #f0f4f8; color: #6366f1; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto; box-shadow: 0 4px 15px rgba(27, 38, 59,0.1);">
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="m7.5 4.27 9 5.15"></path>
                            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path>
                            <path d="m3.3 7 8.7 5 8.7-5"></path>
                            <path d="M12 22V12"></path>
                        </svg>
                    </div>
                    <h3 style="color: #333; font-size: 1.3rem; font-weight: 800; margin-bottom: 10px;">Your Shop is Empty!</h3>
                    <p style="color: #666; font-size: 0.95rem; max-width: 250px; margin: 0 auto; line-height: 1.5;">You haven't added any products yet. Click 'Add to Product' below to build your inventory.</p>
                </div>
            `;
            return;
        }

        const actualYear = new Date().getFullYear();
        const actualMonth = new Date().getMonth();
        const payoutEnabled = localStorage.getItem('nd_payout_enabled') === 'true';
        const globalPayoutRate = parseFloat(localStorage.getItem('nd_payout_rate') || '2');
        productList.innerHTML = filtered.map(p => {
            const currentRate = globalPayoutRate;
            
            let priceVal = 0;
            let costVal = parseFloat(p.cost) || 0;
            let profitVal = 0;
            if (p.isSpecial) {
                priceVal = (p.packTypes && p.packTypes.bag && p.packTypes.bag.price) ? parseFloat(p.packTypes.bag.price) : 0;
                profitVal = priceVal > 0 ? (priceVal - costVal) : 0;
                displayPrice = '<span style="font-size: 0.85em; color: #64748b; margin-right: 4px;">From</span><strong>₦' + Math.round(priceVal).toLocaleString() + '</strong> ' + ((p.packTypes && p.packTypes.bag && p.packTypes.bag.title) ? p.packTypes.bag.title : 'Container 1');
            } else if (p.isCustom) {
                displayPrice = '<span style="color:#64748b;font-weight:600;font-size:0.85rem;">Custom Pricing</span>';
            } else if (p.isFlexible) {
                displayPrice = '<span style="color:#64748b;font-weight:600;font-size:0.85rem;">Flexible Pricing</span>';
            } else {
                priceVal = parseFloat(p.price) || 0;
                profitVal = priceVal > 0 ? (priceVal - costVal) : 0;
                displayPrice = '<strong>₦' + Math.round(priceVal).toLocaleString() + '</strong> ' + (p.unit || '');
            }

            const payout = (p.isFlexible || p.isCustom) ? 0 : Math.max(0, profitVal) * (currentRate / 100);
            const formattedPayout = Number.isInteger(payout) ? payout : payout.toFixed(2);
            const safeName = p.name.replace(/'/g, "\\'");
            
            const payoutHTML = payoutEnabled ? `
                    <div class="admin-product-card-right">
                        <div class="admin-product-card-payout">+₦${formattedPayout}</div>
                        <div class="admin-product-card-badge">${currentRate}% Payout</div>
                    </div>` : `
                    <div class="admin-product-card-right" style="opacity:0.45;">
                        <div class="admin-product-card-payout" style="font-size:0.7rem;color:#94a3b8;letter-spacing:0.5px;">PAYOUT</div>
                        <div class="admin-product-card-badge" style="background:#f1f5f9;color:#94a3b8;">Disabled</div>
                    </div>`;
                    
            const isOutOfStock = window.checkProductOutOfStock && window.checkProductOutOfStock(p.id);
            const isRunningLow = !isOutOfStock && window.checkProductRunningLow && window.checkProductRunningLow(p.id);
            
            let cardBgStyle = '';
            if (isOutOfStock) {
                cardBgStyle = 'background-color: #fef2f2; border: 1px solid #fecaca;';
            } else if (isRunningLow) {
                cardBgStyle = 'background-color: #fefce8; border: 1px solid #fef08a;';
            }
            
            const imageHtml = p.imageData ? `<img src="${p.imageData}" class="admin-product-card-img" alt="Product Image" onclick="event.stopPropagation(); if(typeof window.openImageViewer === 'function') window.openImageViewer('${p.imageData}')" style="cursor:zoom-in;">` : `<div class="admin-product-card-img-placeholder"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></div>`;
            return `
                <div class="admin-product-card" onclick="if(window.openProductDetailsModal) window.openProductDetailsModal('${safeName}', '${p.dateAdded || ''}', '${p.id || ''}')" style="cursor: pointer; ${cardBgStyle}">
                    <div class="admin-product-card-left">
                        ${imageHtml}
                        <div class="admin-product-card-text">
                            <div class="admin-product-card-name" style="display:flex; align-items:center; gap:8px;">
                                ${p.name}
                                ${isOutOfStock ? '<span style="background: #ef4444; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.70rem; font-weight: 800; display: inline-block;">OUT OF STOCK</span>' : ''}
                                ${isRunningLow ? '<span style="background: #eab308; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.70rem; font-weight: 800; display: inline-block;">RUNNING LOW</span>' : ''}
                                ${(() => {
                                    const pDate = p.dateAdded ? new Date(p.dateAdded) : null;
                                    const isCurrentMonth = pDate && pDate.getFullYear() === actualYear && pDate.getMonth() === actualMonth;
                                    const showNew = !isOutOfStock && p.isNewStock && isCurrentMonth;
                                    const showOld = !isOutOfStock && (p.isOldStock || (p.isNewStock && !isCurrentMonth));
                                    
                                    let badges = '';
                                    if (showNew) badges += '<span style="background: #006400; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-size: 0.70rem; font-weight: 800; border: 1px solid #004d00;">NEW STOCK</span>';
                                    if (showOld) badges += '<span style="background: #fef3c7; color: #b45309; padding: 2px 6px; border-radius: 4px; font-size: 0.70rem; font-weight: 800; border: 1px solid #fde68a;">OLD STOCK</span>';
                                    return badges;
                                })()}
                            </div>
                            <div class="admin-product-card-price">${displayPrice}</div>
                        </div>
                    </div>
                    ${payoutHTML}
                </div>
            `;
        }).join('');
    }

    // Expose render function for the delete modal logic
    window.renderProductsGlobal = () => {
        if (typeof window.reloadAdminProducts === 'function') {
            window.reloadAdminProducts();
        }
        renderProducts(searchInput ? searchInput.value.trim() : '');
    };

    // Initial render
    if (typeof window.reloadAdminProducts === 'function') {
        window.reloadAdminProducts();
    }
    renderProducts();

    // ========================================
    // Search (real-time)
    // ========================================
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            renderProducts(searchInput.value.trim());
        });
    }

    // ========================================
    // Open Modal
    // ========================================
    if (addBtn && modal) {
        addBtn.addEventListener('click', () => {
            const locks = JSON.parse(localStorage.getItem('nd_admin_locks') || '{}');
            if (locks['adminAddProductBtn'] && typeof _checkModuleAdminAuth === 'function') {
                _checkModuleAdminAuth('Add Old Goods', _openAddProductModal);
            } else {
                _openAddProductModal();
            }

            function _openAddProductModal() {
                modal.classList.add('show');
                document.body.classList.add('modal-open');
                
                // Reset Default Product Type selection to Wholesale
                const wholesaleRadio = document.querySelector('input[name="adminDefTopUpType"][value="wholesale"]');
                if (wholesaleRadio) {
                    wholesaleRadio.checked = true;
                    if (typeof updateAdminDefaultTypeUI === 'function') updateAdminDefaultTypeUI('wholesale');
                }
                
                // Reset Image Uploader
                const imgDataHidden = document.getElementById('adminProductImageData');
                const imgPlaceholder = document.getElementById('adminProductImagePlaceholder');
                const imgPreviewCont = document.getElementById('adminProductImagePreviewContainer');
                const imgPreview = document.getElementById('adminProductImagePreview');
                const imgInput = document.getElementById('adminProductImageInput');
                if (imgDataHidden) imgDataHidden.value = '';
                if (imgInput) imgInput.value = '';
                if (imgPlaceholder) imgPlaceholder.style.display = 'flex';
                if (imgPreviewCont) imgPreviewCont.style.display = 'none';
                if (imgPreview) imgPreview.src = '';

                // Reset import dropdown if it was used
                const importText = document.querySelector('#adminImportDropdownTrigger .trigger-text');
                if (importText) importText.textContent = 'Select product to copy details...';
                
                const specImportText = document.querySelector('#adminSpecImportDropdownTrigger .trigger-text');
                if (specImportText) specImportText.textContent = 'Select analytical product to copy...';

                // Set 'Old Stock' toggles to ON by default
                ['adminDefOldStockSwitch', 'adminSpecOldStockSwitch', 'adminCustomOldStockSwitch'].forEach(id => {
                    const sw = document.getElementById(id);
                    if (sw) {
                        sw.checked = true;
                        const slider = sw.nextElementSibling;
                        if (slider) {
                            slider.style.backgroundColor = '#f59e0b';
                            const knob = slider.querySelector('.knob');
                            if (knob) knob.style.transform = 'translateX(20px)';
                        }
                    }
                });

                // Reset Flexible Pricing Toggles to OFF by default
                ['adminDefFlexiblePricingSwitch', 'adminSpecFlexiblePricingSwitch', 'adminCustomFlexiblePricingSwitch', 'adminFlexFlexiblePricingSwitch'].forEach(id => {
                    const sw = document.getElementById(id);
                    if (sw) {
                        sw.checked = false;
                        const slider = sw.nextElementSibling;
                        if (slider) {
                            slider.style.backgroundColor = '#cbd5e1';
                            const knob = slider.querySelector('.knob');
                            if (knob) knob.style.transform = 'translateX(0)';
                        }
                        // Trigger change listener to show pricing fields
                        sw.dispatchEvent(new Event('change'));
                    }
                });


                // Refresh payout calculations to reflect global state immediately
                if (typeof updateFinalPriceAndPayout === 'function') updateFinalPriceAndPayout();
                if (typeof calcSpecial === 'function') calcSpecial();
            }
        });
    }

    // ========================================
    // Import from Existing Product Dropdown
    // ========================================
    function _initAdminImportDropdown() {
        const wrapper = document.getElementById('adminImportDropdownWrapper');
        const trigger = document.getElementById('adminImportDropdownTrigger');
        const menu = document.getElementById('adminImportDropdownMenu');

        if (!wrapper || !trigger || !menu) return;

        let searchContainer = menu.querySelector('.dropdown-search-container');
        let optionsContainer = menu.querySelector('.dropdown-options-list');

        if (!searchContainer) {
            menu.innerHTML = '';
            searchContainer = document.createElement('div');
            searchContainer.className = 'dropdown-search-container';
            searchContainer.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m21 21-4.34-4.34"></path>
                    <circle cx="11" cy="11" r="8"></circle>
                </svg>
                <input type="text" class="dropdown-search-input" placeholder="Search to copy..." autocomplete="off" readonly onfocus="this.removeAttribute('readonly');">
            `;
            menu.appendChild(searchContainer);

            const searchInput = searchContainer.querySelector('.dropdown-search-input');
            searchInput.addEventListener('input', (e) => {
                e.stopPropagation();
                _populateAdminImportOptions(e.target.value);
            });
            searchInput.addEventListener('click', e => e.stopPropagation());

            // Toggle dropdown
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                wrapper.classList.toggle('open');
                if (wrapper.classList.contains('open')) {
                    _populateAdminImportOptions('');
                }
            });

            // Close on outside click
            document.addEventListener('click', (e) => {
                if (wrapper.classList.contains('open') && !wrapper.contains(e.target)) {
                    wrapper.classList.remove('open');
                }
            });
        }

        if (!optionsContainer) {
            optionsContainer = document.createElement('div');
            optionsContainer.className = 'dropdown-options-list';
            menu.appendChild(optionsContainer);
        }

        function _populateAdminImportOptions(filter) {
            optionsContainer.innerHTML = '';
            const searchInput = searchContainer.querySelector('.dropdown-search-input');
            if (filter === '' && searchInput) searchInput.value = '';

            const term = filter.toLowerCase();
            const filtered = adminProducts.filter(p => !p.isSpecial && !p.isCustom && !p.isDeleted && !p.isHidden && !p.cleared && p.name.toLowerCase().includes(term));

            if (filtered.length === 0) {
                optionsContainer.innerHTML = '<div class="dropdown-no-result">No products found</div>';
                return;
            }

            filtered.forEach(p => {
                const opt = document.createElement('div');
                opt.className = 'custom-dropdown-option';
                opt.textContent = p.name;
                opt.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // Import values into the form fields (name intentionally skipped — prevents duplicate products)
                    if(document.getElementById('adminNewProductPurchaseCost')) {
                        const bulkCost = (typeof p.cost === 'number') ? p.cost * (p.pieces || 1) : '';
                        document.getElementById('adminNewProductPurchaseCost').value = bulkCost;
                    }
                    if(document.getElementById('adminNewProductPieces')) document.getElementById('adminNewProductPieces').value = p.pieces || 1;

                    if(document.getElementById('adminBulkUnitSelect') && p.bulkUnit) {
                        document.getElementById('adminBulkUnitSelect').value = p.bulkUnit;
                        const bulkTrigText = document.querySelector('#adminBulkDropdownTrigger .trigger-text');
                        if(bulkTrigText) bulkTrigText.textContent = p.bulkUnit;
                        const bulkMenuUi = document.getElementById('adminBulkDropdownMenu');
                        if(bulkMenuUi) {
                            bulkMenuUi.querySelectorAll('.custom-dropdown-option').forEach(o => {
                                if(o.getAttribute('data-value') === p.bulkUnit) o.classList.add('active');
                                else o.classList.remove('active');
                            });
                        }
                    }
                    
                    if(document.getElementById('adminNewProductProfit')) document.getElementById('adminNewProductProfit').value = p.profit || '';
                    if(document.getElementById('adminNewProductProfitPercent')) document.getElementById('adminNewProductProfitPercent').value = p.profitPercent || '';
                    if(document.getElementById('adminNewProductPrice')) document.getElementById('adminNewProductPrice').value = p.price || '';
                    
                    // Trigger input event to update badges/calc
                    if(document.getElementById('adminNewProductPurchaseCost')) {
                        document.getElementById('adminNewProductPurchaseCost').dispatchEvent(new Event('input'));
                    }
                    if(document.getElementById('adminNewProductProfit')) {
                        document.getElementById('adminNewProductProfit').dispatchEvent(new Event('input'));
                    }

                    // Set Unit
                    if(p.unit) {
                        const hiddenU = document.getElementById('adminNewProductUnit');
                        const triggerTextU = document.querySelector('#adminUnitDropdownTrigger .trigger-text');
                        if (hiddenU) hiddenU.value = p.unit;
                        if (triggerTextU) triggerTextU.textContent = p.unit;
                        
                        const unitDropdown = document.getElementById('adminUnitDropdownMenu');
                        if(unitDropdown) {
                            unitDropdown.querySelectorAll('.custom-dropdown-option').forEach(o => {
                                if(o.getAttribute('data-value') === p.unit) o.classList.add('active');
                                else o.classList.remove('active');
                            });
                        }
                        if (typeof updateProductUILabel === 'function') updateProductUILabel();
                    }

                    // Pre-fill dropdown text
                    trigger.querySelector('.trigger-text').textContent = 'Copied: ' + p.name;
                    wrapper.classList.remove('open');
                    if(document.getElementById('adminApmSubmitBtn')) document.getElementById('adminApmSubmitBtn').style.display = 'flex';
                });
                optionsContainer.appendChild(opt);
            });
        }
    }
    _initAdminImportDropdown();

    // ========================================
    // Import from Existing Special Product Dropdown
    // ========================================
    function _initAdminSpecImportDropdown() {
        const wrapper = document.getElementById('adminSpecImportDropdownWrapper');
        const trigger = document.getElementById('adminSpecImportDropdownTrigger');
        const menu = document.getElementById('adminSpecImportDropdownMenu');

        if (!wrapper || !trigger || !menu) return;

        let searchContainer = menu.querySelector('.dropdown-search-container');
        let optionsContainer = menu.querySelector('.dropdown-options-list');

        if (!searchContainer) {
            menu.innerHTML = '';
            searchContainer = document.createElement('div');
            searchContainer.className = 'dropdown-search-container';
            searchContainer.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m21 21-4.34-4.34"></path>
                    <circle cx="11" cy="11" r="8"></circle>
                </svg>
                <input type="text" class="dropdown-search-input" placeholder="Search analytical to copy..." autocomplete="off" readonly onfocus="this.removeAttribute('readonly');">
            `;
            menu.appendChild(searchContainer);

            const searchInput = searchContainer.querySelector('.dropdown-search-input');
            searchInput.addEventListener('input', (e) => {
                e.stopPropagation();
                _populateAdminSpecImportOptions(e.target.value);
            });
            searchInput.addEventListener('click', e => e.stopPropagation());

            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                wrapper.classList.toggle('open');
                if (wrapper.classList.contains('open')) {
                    _populateAdminSpecImportOptions('');
                }
            });

            document.addEventListener('click', (e) => {
                if (wrapper.classList.contains('open') && !wrapper.contains(e.target)) {
                    wrapper.classList.remove('open');
                }
            });
        }

        if (!optionsContainer) {
            optionsContainer = document.createElement('div');
            optionsContainer.className = 'dropdown-options-list';
            menu.appendChild(optionsContainer);
        }

        function _populateAdminSpecImportOptions(filter) {
            optionsContainer.innerHTML = '';
            const searchInput = searchContainer.querySelector('.dropdown-search-input');
            if (filter === '' && searchInput) searchInput.value = '';

            const term = filter.toLowerCase();
            const filtered = adminProducts.filter(p => p.isSpecial && !p.isDeleted && !p.isHidden && !p.cleared && p.name.toLowerCase().includes(term));

            if (filtered.length === 0) {
                optionsContainer.innerHTML = '<div class="dropdown-no-result">No products found</div>';
                return;
            }

            filtered.forEach(p => {
                const opt = document.createElement('div');
                opt.className = 'custom-dropdown-option';
                opt.textContent = p.name;
                opt.addEventListener('click', (e) => {
                    e.stopPropagation();

                    // name intentionally skipped — prevents duplicate products
                    if(document.getElementById('adminSpecBagCost')) document.getElementById('adminSpecBagCost').value = (typeof p.cost === 'number') ? p.cost : '';

                    if(p.packTypes) {
                        if(p.packTypes.bag && document.getElementById('adminSpecBagTitle')) document.getElementById('adminSpecBagTitle').value = p.packTypes.bag.title || 'Container 1';
                        if(p.packTypes.custard && document.getElementById('adminSpecCustardTitle')) document.getElementById('adminSpecCustardTitle').value = p.packTypes.custard.title || 'Container 2';
                        if(p.packTypes.cup && document.getElementById('adminSpecCupTitle')) document.getElementById('adminSpecCupTitle').value = p.packTypes.cup.title || 'Container 3';
                    }
                    
                    if(p.structure) {
                        if(document.getElementById('adminSpecBagProfit')) document.getElementById('adminSpecBagProfit').value = p.structure.bagProfit || '';
                        if(document.getElementById('adminSpecBagProfitPercent')) document.getElementById('adminSpecBagProfitPercent').value = p.structure.bagProfitPercent || '';
                        
                        if(document.getElementById('adminSpecCustardsPerBag')) document.getElementById('adminSpecCustardsPerBag').value = p.structure.custardsPerBag || '';
                        if(document.getElementById('adminSpecCustardProfit')) document.getElementById('adminSpecCustardProfit').value = p.structure.custardProfit || '';
                        if(document.getElementById('adminSpecCustardProfitPercent')) document.getElementById('adminSpecCustardProfitPercent').value = p.structure.custardProfitPercent || '';

                        if(document.getElementById('adminSpecCupsPerCustard')) document.getElementById('adminSpecCupsPerCustard').value = p.structure.cupsPerCustard || '';
                        if(document.getElementById('adminSpecCupProfit')) document.getElementById('adminSpecCupProfit').value = p.structure.cupProfit || '';
                        if(document.getElementById('adminSpecCupProfitPercent')) document.getElementById('adminSpecCupProfitPercent').value = p.structure.cupProfitPercent || '';
                    }

                    // Dispatch inputs to trigger UI recalculations dynamically
                    const triggers = ['adminSpecBagCost', 'adminSpecBagProfit', 'adminSpecCustardsPerBag', 'adminSpecCustardProfit', 'adminSpecCupsPerCustard', 'adminSpecCupProfit', 'adminSpecBagTitle', 'adminSpecCustardTitle', 'adminSpecCupTitle'];
                    triggers.forEach(t => {
                        const el = document.getElementById(t);
                        if(el) el.dispatchEvent(new Event('input', { bubbles: true }));
                    });

                    trigger.querySelector('.trigger-text').textContent = 'Copied: ' + p.name;
                    wrapper.classList.remove('open');
                    if(document.getElementById('adminSpecProductSubmitBtn')) document.getElementById('adminSpecProductSubmitBtn').style.display = 'flex';
                });
                optionsContainer.appendChild(opt);
            });
        }
    }
    _initAdminSpecImportDropdown();

    // ========================================
    // Import from Existing Custom Product Dropdown
    // ========================================
    function _initAdminCustomImportDropdown() {
        const wrapper = document.getElementById('adminCustomImportDropdownWrapper');
        const trigger = document.getElementById('adminCustomImportDropdownTrigger');
        const menu = document.getElementById('adminCustomImportDropdownMenu');

        if (!wrapper || !trigger || !menu) return;

        let searchContainer = menu.querySelector('.dropdown-search-container');
        let optionsContainer = menu.querySelector('.dropdown-options-list');

        if (!searchContainer) {
            menu.innerHTML = '';
            searchContainer = document.createElement('div');
            searchContainer.className = 'dropdown-search-container';
            searchContainer.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m21 21-4.34-4.34"></path>
                    <circle cx="11" cy="11" r="8"></circle>
                </svg>
                <input type="text" class="dropdown-search-input" placeholder="Search custom to copy..." autocomplete="off" readonly onfocus="this.removeAttribute('readonly');">
            `;
            menu.appendChild(searchContainer);

            const searchInput = searchContainer.querySelector('.dropdown-search-input');
            searchInput.addEventListener('input', (e) => {
                e.stopPropagation();
                _populateAdminCustomImportOptions(e.target.value);
            });
            searchInput.addEventListener('click', e => e.stopPropagation());

            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                wrapper.classList.toggle('open');
                if (wrapper.classList.contains('open')) {
                    _populateAdminCustomImportOptions('');
                }
            });

            document.addEventListener('click', (e) => {
                if (wrapper.classList.contains('open') && !wrapper.contains(e.target)) {
                    wrapper.classList.remove('open');
                }
            });
        }

        if (!optionsContainer) {
            optionsContainer = document.createElement('div');
            optionsContainer.className = 'dropdown-options-list';
            menu.appendChild(optionsContainer);
        }

        function _populateAdminCustomImportOptions(filter) {
            optionsContainer.innerHTML = '';
            const searchInput = searchContainer.querySelector('.dropdown-search-input');
            if (filter === '' && searchInput) searchInput.value = '';

            const term = filter.toLowerCase();
            const filtered = adminProducts.filter(p => !p.isSpecial && p.isCustom && !p.isDeleted && !p.isHidden && !p.cleared && p.name.toLowerCase().includes(term));

            if (filtered.length === 0) {
                optionsContainer.innerHTML = '<div class="dropdown-no-result">No custom products found</div>';
                return;
            }

            filtered.forEach(p => {
                const opt = document.createElement('div');
                opt.className = 'custom-dropdown-option';
                opt.textContent = p.name;
                opt.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // name intentionally skipped — prevents duplicate products
                    if(document.getElementById('adminCustomProductPurchaseCost')) {
                        const bulkCost = (typeof p.bulkCost === 'number') ? p.bulkCost : ((typeof p.cost === 'number') ? p.cost : '');
                        document.getElementById('adminCustomProductPurchaseCost').value = bulkCost;
                    }
                    if(document.getElementById('adminCustomProductPieces')) document.getElementById('adminCustomProductPieces').value = p.pieces || 1;

                    if(document.getElementById('adminCustomBulkUnitSelect') && p.bulkUnit) {
                        document.getElementById('adminCustomBulkUnitSelect').value = p.bulkUnit;
                        const bulkTrigText = document.querySelector('#adminCustomBulkDropdownTrigger .trigger-text');
                        if(bulkTrigText) bulkTrigText.textContent = p.bulkUnit;
                        const bulkMenuUi = document.getElementById('adminCustomBulkDropdownMenu');
                        if(bulkMenuUi) {
                            bulkMenuUi.querySelectorAll('.custom-dropdown-option').forEach(o => {
                                if(o.getAttribute('data-value') === p.bulkUnit) o.classList.add('active');
                                else o.classList.remove('active');
                            });
                        }
                    }

                    if(p.unit) {
                        const hiddenU = document.getElementById('adminCustomNewProductUnit');
                        const triggerTextU = document.querySelector('#adminCustomUnitDropdownTrigger .trigger-text');
                        if (hiddenU) hiddenU.value = p.unit;
                        if (triggerTextU) triggerTextU.textContent = p.unit;
                        
                        const unitDropdown = document.getElementById('adminCustomUnitDropdownMenu');
                        if(unitDropdown) {
                            unitDropdown.querySelectorAll('.custom-dropdown-option').forEach(o => {
                                if(o.getAttribute('data-value') === p.unit) o.classList.add('active');
                                else o.classList.remove('active');
                            });
                        }
                        if (typeof updateProductUILabel === 'function') updateProductUILabel();
                    }

                    // Dispatch inputs to trigger UI recalculations dynamically
                    const triggers = ['adminCustomProductPurchaseCost', 'adminCustomProductPieces', 'adminCustomProductName'];
                    triggers.forEach(t => {
                        const el = document.getElementById(t);
                        if(el) el.dispatchEvent(new Event('input', { bubbles: true }));
                    });

                    trigger.querySelector('.trigger-text').textContent = 'Copied: ' + p.name;
                    wrapper.classList.remove('open');
                    if(document.getElementById('adminCustomProductSubmitBtn')) document.getElementById('adminCustomProductSubmitBtn').style.display = 'flex';
                });
                optionsContainer.appendChild(opt);
            });
        }
    }
    _initAdminCustomImportDropdown();

    // ========================================
    // Import from Existing Flexible Product Dropdown
    // ========================================
    function _initAdminFlexImportDropdown() {
        const wrapper = document.getElementById('adminFlexImportDropdownWrapper');
        const trigger = document.getElementById('adminFlexImportDropdownTrigger');
        const menu = document.getElementById('adminFlexImportDropdownMenu');

        if (!wrapper || !trigger || !menu) return;

        let searchContainer = menu.querySelector('.dropdown-search-container');
        let optionsContainer = menu.querySelector('.dropdown-options-list');

        if (!searchContainer) {
            menu.innerHTML = '';
            searchContainer = document.createElement('div');
            searchContainer.className = 'dropdown-search-container';
            searchContainer.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m21 21-4.34-4.34"></path>
                    <circle cx="11" cy="11" r="8"></circle>
                </svg>
                <input type="text" class="dropdown-search-input" placeholder="Search flexible to copy..." autocomplete="off" readonly onfocus="this.removeAttribute('readonly');">
            `;
            menu.appendChild(searchContainer);

            const searchInput = searchContainer.querySelector('.dropdown-search-input');
            searchInput.addEventListener('input', (e) => {
                e.stopPropagation();
                _populateAdminFlexImportOptions(e.target.value);
            });
            searchInput.addEventListener('click', e => e.stopPropagation());

            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                wrapper.classList.toggle('open');
                if (wrapper.classList.contains('open')) {
                    _populateAdminFlexImportOptions('');
                }
            });

            document.addEventListener('click', (e) => {
                if (wrapper.classList.contains('open') && !wrapper.contains(e.target)) {
                    wrapper.classList.remove('open');
                }
            });
        }

        if (!optionsContainer) {
            optionsContainer = document.createElement('div');
            optionsContainer.className = 'dropdown-options-list';
            menu.appendChild(optionsContainer);
        }

        function _populateAdminFlexImportOptions(filter) {
            optionsContainer.innerHTML = '';
            const searchInput = searchContainer.querySelector('.dropdown-search-input');
            if (filter === '' && searchInput) searchInput.value = '';

            const term = filter.toLowerCase();
            const filtered = adminProducts.filter(p => !p.isSpecial && !p.isCustom && p.isFlexible && !p.isDeleted && !p.isHidden && !p.cleared && p.name.toLowerCase().includes(term));

            if (filtered.length === 0) {
                optionsContainer.innerHTML = '<div class="dropdown-no-result">No flexible products found</div>';
                return;
            }

            filtered.forEach(p => {
                const opt = document.createElement('div');
                opt.className = 'custom-dropdown-option';
                opt.textContent = p.name;
                opt.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // name intentionally skipped — prevents duplicate products
                    if(document.getElementById('adminFlexProductPurchaseCost')) {
                        const bulkCost = (typeof p.bulkCost === 'number') ? p.bulkCost : ((typeof p.cost === 'number') ? p.cost : '');
                        document.getElementById('adminFlexProductPurchaseCost').value = bulkCost;
                    }
                    if(document.getElementById('adminFlexProductPieces')) document.getElementById('adminFlexProductPieces').value = p.pieces || 1;

                    if(document.getElementById('adminFlexBulkUnitSelect') && p.bulkUnit) {
                        document.getElementById('adminFlexBulkUnitSelect').value = p.bulkUnit;
                        const bulkTrigText = document.querySelector('#adminFlexBulkDropdownTrigger .trigger-text');
                        if(bulkTrigText) bulkTrigText.textContent = p.bulkUnit;
                        const bulkMenuUi = document.getElementById('adminFlexBulkDropdownMenu');
                        if(bulkMenuUi) {
                            bulkMenuUi.querySelectorAll('.custom-dropdown-option').forEach(o => {
                                if(o.getAttribute('data-value') === p.bulkUnit) o.classList.add('active');
                                else o.classList.remove('active');
                            });
                        }
                    }

                    if(p.unit) {
                        const hiddenU = document.getElementById('adminFlexNewProductUnit');
                        const triggerTextU = document.querySelector('#adminFlexUnitDropdownTrigger .trigger-text');
                        if (hiddenU) hiddenU.value = p.unit;
                        if (triggerTextU) triggerTextU.textContent = p.unit;
                        
                        const unitDropdown = document.getElementById('adminFlexUnitDropdownMenu');
                        if(unitDropdown) {
                            unitDropdown.querySelectorAll('.custom-dropdown-option').forEach(o => {
                                if(o.getAttribute('data-value') === p.unit) o.classList.add('active');
                                else o.classList.remove('active');
                            });
                        }
                        if (typeof updateFlexUILabel === 'function') updateFlexUILabel();
                    }

                    // Dispatch inputs to trigger UI recalculations dynamically
                    const triggers = ['adminFlexProductPurchaseCost', 'adminFlexProductPieces', 'adminFlexProductName'];
                    triggers.forEach(t => {
                        const el = document.getElementById(t);
                        if(el) el.dispatchEvent(new Event('input', { bubbles: true }));
                    });

                    trigger.querySelector('.trigger-text').textContent = 'Copied: ' + p.name;
                    wrapper.classList.remove('open');
                    if(document.getElementById('adminFlexProductSubmitBtn')) document.getElementById('adminFlexProductSubmitBtn').style.display = 'flex';
                });
                optionsContainer.appendChild(opt);
            });
        }
    }
    _initAdminFlexImportDropdown();

    // ========================================
    // Image Upload Logic
    // ========================================
    const imgUploadArea = document.getElementById('adminProductImageUploadArea');
    const imgInput = document.getElementById('adminProductImageInput');
    const imgPlaceholder = document.getElementById('adminProductImagePlaceholder');
    const imgPreviewCont = document.getElementById('adminProductImagePreviewContainer');
    const imgPreview = document.getElementById('adminProductImagePreview');
    const imgReplaceBtn = document.getElementById('adminProductImageReplaceBtn');
    const imgRemoveBtn = document.getElementById('adminProductImageRemoveBtn');
    const imgDataHidden = document.getElementById('adminProductImageData');

    // Create a loading overlay that sits on top without destroying placeholder content
    function _showImgLoading() {
        let overlay = document.getElementById('_adminImgLoadingOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = '_adminImgLoadingOverlay';
            overlay.style.cssText = 'position:absolute;inset:0;background:rgba(255,255,255,0.88);display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:12px;z-index:10;gap:10px;';
            overlay.innerHTML = '<div style="width:28px;height:28px;border:3px solid #e2e8f0;border-top-color:#6366f1;border-radius:50%;animation:spin 0.8s linear infinite;"></div><div style="color:#64748b;font-size:0.85rem;font-weight:500;">Uploading...</div>';
            if (imgUploadArea) {
                imgUploadArea.style.position = 'relative';
                imgUploadArea.appendChild(overlay);
            }
        }
        overlay.style.display = 'flex';
    }

    function _hideImgLoading() {
        const overlay = document.getElementById('_adminImgLoadingOverlay');
        if (overlay) overlay.style.display = 'none';
    }

    function _showImgPlaceholder() {
        if (imgPlaceholder) imgPlaceholder.style.display = 'flex';
        if (imgPreviewCont) imgPreviewCont.style.display = 'none';
        _hideImgLoading();
    }

    function _showImgPreview(url) {
        if (imgPreview) imgPreview.src = url;
        if (imgPlaceholder) imgPlaceholder.style.display = 'none';
        if (imgPreviewCont) imgPreviewCont.style.display = 'block';
        _hideImgLoading();
    }

    if (imgUploadArea && imgInput) {
        imgUploadArea.addEventListener('click', (e) => {
            if (e.target.closest('.admin-image-preview-actions')) return;
            if (e.target.closest('#adminProductSnapBtn')) return;
            imgInput.click();
        });

        imgInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            _showImgLoading();

            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch(`${window.API_BASE}/api/upload`, {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();

                if (data.success) {
                    if (imgDataHidden) imgDataHidden.value = data.url;
                    _showImgPreview(data.url);
                } else {
                    _showImgPlaceholder();
                    if (typeof customAlert !== 'undefined') customAlert(data.error || 'Upload failed');
                    else alert('Upload failed');
                }
            } catch (err) {
                console.error('Upload Error:', err);
                _showImgPlaceholder();
                if (typeof customAlert !== 'undefined') customAlert('Network error during upload');
                else alert('Network error during upload');
            }

            if (imgInput) imgInput.value = '';
        });

        if (imgReplaceBtn) {
            imgReplaceBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                imgInput.click();
            });
        }

        if (imgRemoveBtn) {
            imgRemoveBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (imgDataHidden) imgDataHidden.value = '';
                _showImgPlaceholder();
            });
        }
    }

    // ========================================
    // Dynamic Label Updater
    // ========================================
    function updateProductUILabel() {
        const bulkSelect = document.getElementById('adminBulkUnitSelect');
        const bulkVal = bulkSelect ? bulkSelect.value : 'Carton';
        
        const retailHidden = document.getElementById('adminNewProductUnit');
        let retailVal = retailHidden ? retailHidden.value : 'piece';
        retailVal = retailVal.replace(/^per\s+/i, '');
        if(!retailVal) retailVal = 'piece';

        document.querySelectorAll('.lbl-bulk-unit').forEach(el => el.textContent = bulkVal);
        document.querySelectorAll('.lbl-retail-unit').forEach(el => el.textContent = retailVal);
    }
    
    const bulkSelElement = document.getElementById('adminBulkUnitSelect');
    if (bulkSelElement) {
        bulkSelElement.addEventListener('change', updateProductUILabel);
    }
    
    // Initial call to set labels
    updateProductUILabel();

    // ========================================
    // Close Modal
    // ========================================
    function closeModal() {
        if (modal) modal.classList.remove('show');
        document.body.classList.remove('modal-open');

        // Reset form
        if (nameInput) nameInput.value = '';
        if (typeof purchaseCostInput !== 'undefined' && purchaseCostInput) purchaseCostInput.value = '';
        if (typeof quantityInput !== 'undefined' && quantityInput) quantityInput.value = '1';
        if (typeof totalCostVal !== 'undefined' && totalCostVal) totalCostVal.textContent = '₦0';
        if (typeof piecesInput !== 'undefined' && piecesInput) piecesInput.value = '';
        if (typeof retailCostVal !== 'undefined' && retailCostVal) retailCostVal.textContent = '₦0';
        if (profitInput) profitInput.value = '';
        if (profitPercentInput) profitPercentInput.value = '';
        if (profitPercentBadge) profitPercentBadge.style.display = 'none';
        if (priceInput) priceInput.value = '';
        if (unitHidden) unitHidden.value = '';
        // Reset unit dropdown trigger text
        if (unitTrigger) {
            const triggerText = unitTrigger.querySelector('.trigger-text');
            if (triggerText) { triggerText.textContent = '— Select —'; triggerText.style.color = '#94a3b8'; }
        }
        // Reset unit dropdown active state
        if (unitMenu) {
            const opts = unitMenu.querySelectorAll('.custom-dropdown-option');
            opts.forEach(o => o.classList.remove('active'));
        }

        const adminBulkHidden = document.getElementById('adminBulkUnitSelect');
        const adminBulkTrigger = document.getElementById('adminBulkDropdownTrigger');
        const adminBulkMenu = document.getElementById('adminBulkDropdownMenu');

        if (adminBulkHidden) adminBulkHidden.value = '';
        if (adminBulkTrigger) {
            const t = adminBulkTrigger.querySelector('.trigger-text');
            if (t) { t.textContent = '— Select —'; t.style.color = '#94a3b8'; t.style.fontWeight = ''; }
        }
        if (adminBulkMenu) {
            adminBulkMenu.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('active'));
        }
        if(typeof updateProductUILabel === 'function') updateProductUILabel();
        // Reset import dropdown if it was used
        const importText = document.querySelector('#adminImportDropdownTrigger .trigger-text');
        if (importText) importText.textContent = 'Select product to copy details...';
        
        const specImportText = document.querySelector('#adminSpecImportDropdownTrigger .trigger-text');
        if (specImportText) specImportText.textContent = 'Select analytical product to copy...';

        // Reset Custom form dropdowns
        const cBulkH = document.getElementById('adminCustomBulkUnitSelect');
        const cBulkT = document.getElementById('adminCustomBulkDropdownTrigger');
        const cBulkM = document.getElementById('adminCustomBulkDropdownMenu');
        if (cBulkH) cBulkH.value = '';
        if (cBulkT) { const t = cBulkT.querySelector('.trigger-text'); if(t) { t.textContent = '— Select —'; t.style.color = '#94a3b8'; t.style.fontWeight = ''; } }
        if (cBulkM) cBulkM.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('active'));

        const cUnitH = document.getElementById('adminCustomNewProductUnit');
        const cUnitT = document.getElementById('adminCustomUnitDropdownTrigger');
        const cUnitM = document.getElementById('adminCustomUnitDropdownMenu');
        if (cUnitH) cUnitH.value = '';
        if (cUnitT) { const t = cUnitT.querySelector('.trigger-text'); if(t) { t.textContent = '— Select —'; t.style.color = '#94a3b8'; } }
        if (cUnitM) { cUnitM.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('active')); cUnitM.querySelectorAll('.custom-added-unit').forEach(o => o.remove()); }

        // Reset Flex form dropdowns
        const fBulkH = document.getElementById('adminFlexBulkUnitSelect');
        const fBulkT = document.getElementById('adminFlexBulkDropdownTrigger');
        const fBulkM = document.getElementById('adminFlexBulkDropdownMenu');
        if (fBulkH) fBulkH.value = '';
        if (fBulkT) { const t = fBulkT.querySelector('.trigger-text'); if(t) { t.textContent = '— Select —'; t.style.color = '#94a3b8'; t.style.fontWeight = ''; } }
        if (fBulkM) fBulkM.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('active'));

        const fUnitH = document.getElementById('adminFlexNewProductUnit');
        const fUnitT = document.getElementById('adminFlexUnitDropdownTrigger');
        const fUnitM = document.getElementById('adminFlexUnitDropdownMenu');
        if (fUnitH) fUnitH.value = '';
        if (fUnitT) { const t = fUnitT.querySelector('.trigger-text'); if(t) { t.textContent = '— Select —'; t.style.color = '#94a3b8'; } }
        if (fUnitM) { fUnitM.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('active')); fUnitM.querySelectorAll('.custom-added-unit').forEach(o => o.remove()); }


        
        // --- Reset Special Product Form ---
        const specInputs = [
            'adminSpecProductName', 'adminSpecBagCost', 'adminSpecBagQuantity', 'adminSpecBagProfit',
            'adminSpecBagProfitPercent', 'adminSpecBagPrice', 'adminSpecCustardsPerBag',
            'adminSpecCustardProfit', 'adminSpecCustardProfitPercent', 'adminSpecCustardPrice',
            'adminSpecCupsPerCustard', 'adminSpecCupProfit', 'adminSpecCupProfitPercent', 'adminSpecCupPrice'
        ];
        specInputs.forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                if (id === 'adminSpecBagQuantity') el.value = '1';
                else el.value = '';
            }
        });
        const specTotCost = document.getElementById('adminSpecBagTotalCostVal');
        if (specTotCost) specTotCost.textContent = '₦0';
        
        // Reset Titles to Default
        const titleInputs = [
            { id: 'adminSpecBagTitle', default: 'Container 1' },
            { id: 'adminSpecCustardTitle', default: 'Container 2' },
            { id: 'adminSpecCupTitle', default: 'Container 3' }
        ];
        titleInputs.forEach(t => {
            const el = document.getElementById(t.id);
            if(el) el.value = t.default;
        });

        const specCostVals = ['adminSpecCustardCostVal', 'adminSpecCupCostVal'];
        specCostVals.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.textContent = '₦0';
        });

        // --- Reset Tabs back to Default ---
        const typeDefaultBtn = document.getElementById('adminTypeDefaultBtn');
        const typeSpecialBtn = document.getElementById('adminTypeSpecialBtn');
        const typeCustomBtn = document.getElementById('adminTypeCustomBtn');
        const defaultForm = document.getElementById('adminDefaultProductForm');
        const specialForm = document.getElementById('adminSpecialProductForm');
        const customForm = document.getElementById('adminCustomProductForm');
        const typeInput = document.getElementById('adminProductType');

        if (typeDefaultBtn && typeSpecialBtn && typeCustomBtn) {
            typeDefaultBtn.style.background = 'white';
            typeDefaultBtn.style.color = '#6366f1';
            typeDefaultBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
            
            typeSpecialBtn.style.background = 'transparent';
            typeSpecialBtn.style.color = '#64748b';
            typeSpecialBtn.style.boxShadow = 'none';
            
            typeCustomBtn.style.background = 'transparent';
            typeCustomBtn.style.color = '#64748b';
            typeCustomBtn.style.boxShadow = 'none';

            if (typeInput) typeInput.value = 'default';
            if (defaultForm) defaultForm.style.display = 'block';
            if (specialForm) specialForm.style.display = 'none';
            if (customForm) customForm.style.display = 'none';
        }
    }

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (modal) {



    }

    // ========================================
    // Two-Way Profit % ↔ ₦ + Final Price Calc
    // ========================================
    const purchaseCostInput = document.getElementById('adminNewProductPurchaseCost');
    const quantityInput = document.getElementById('adminNewProductQuantity');
    const totalCostVal = document.getElementById('adminNewProductTotalCostVal');
    const piecesInput = document.getElementById('adminNewProductPieces');
    const retailCostVal = document.getElementById('adminNewProductRetailCostVal');
    const profitInput = document.getElementById('adminNewProductProfit');
    const profitPercentInput = document.getElementById('adminNewProductProfitPercent');
    const profitPercentBadge = document.getElementById('adminProfitPercentBadge');

    // Tracks which profit field was last edited: 'amount' or 'percent'
    let lastProfitSource = 'amount';
    let lastWholesaleProfitSource = 'amount';
    
    const wholesaleProfitInput = document.getElementById('adminNewProductWholesaleProfit');
    const wholesaleProfitPercentInput = document.getElementById('adminNewProductWholesaleProfitPercent');
    const wholesalePriceInput = document.getElementById('adminNewProductWholesalePrice');

    function getRetailCost() {
        if (!purchaseCostInput || !piecesInput) return 0;
        const pCost = parseFloat(purchaseCostInput.value) || 0;
        const pieces = parseInt(piecesInput.value) || 1; // Default to 1 if empty/0
        return pCost / pieces;
    }

    function getWholesaleCost() {
        if (!purchaseCostInput) return 0;
        return parseFloat(purchaseCostInput.value) || 0;
    }

    function updateTotalCostUI() {
        if (!purchaseCostInput || !quantityInput || !totalCostVal) return;
        const pCost = parseFloat(purchaseCostInput.value) || 0;
        const qty = parseInt(quantityInput.value) || 1;
        const total = pCost * qty;
        totalCostVal.textContent = '₦' + Math.round(total).toLocaleString();
    }

    function updateRetailCostUI() {
        const rc = getRetailCost();
        if (retailCostVal) {
            retailCostVal.textContent = '₦' + Math.round(rc).toLocaleString();
        }
    }

    function updateFinalPriceAndPayout() {
        if (!profitInput || !priceInput) return;
        const cost = getRetailCost();
        const profit = parseFloat(profitInput.value) || 0;
        const finalPrice = cost + profit;
        priceInput.value = finalPrice > 0 ? Math.round(finalPrice) : '';

        updateApmPayout();
    }

    function updateApmPayout() {
        const enabled = localStorage.getItem('nd_payout_enabled') === 'true';
        const apmVal = document.getElementById('adminApmPayoutValue');
        const specParent = document.getElementById('adminSpecPayoutPreviewParent');
        const dfltParent = document.getElementById('adminDefaultPayoutPreviewParent');
        const customVal = document.getElementById('adminCustomPayoutValue');
        const customParent = document.getElementById('adminCustomPayoutPreviewParent');

        if (!enabled) {
            if (apmVal) apmVal.textContent = "Disabled";
            if (specParent) specParent.innerHTML = `<span class="admin-apm-payout-value" style="color:#fda4af;">Payout System is Disabled</span>`;
            if (customVal) customVal.textContent = "Disabled";
            return;
        }

        const rateStr = localStorage.getItem('nd_payout_rate') || '2';
        const rateNum = parseFloat(rateStr);

        // Regular Default Product Update
        if (dfltParent && dfltParent.style.display !== 'none') {
            const profitValStr = document.getElementById('adminNewProductProfit')?.value || '';
            const profit = parseFloat(profitValStr) || 0;
            if (profit > 0) {
                const payoutReturn = profit * (rateNum / 100);
                if (apmVal) apmVal.textContent = `₦${payoutReturn.toFixed(1)}/unit (${rateStr}%)`;
            } else {
                if (apmVal) apmVal.textContent = `Calculating... (${rateStr}%)`;
            }
        }

        // Custom Product Update
        if (customParent && document.getElementById('adminCustomProductForm').style.display !== 'none') {
            if (customVal) customVal.textContent = `Inheriting system default (${rateStr}%)`;
        }

        // Analytical Product Update
        if (specParent && dfltParent && dfltParent.style.display === 'none') {
            // ... existing analytical payout calculation
            const bagHTML = _calcSpecPayoutHTML('adminSpecBagProfit', rateNum, rateStr);
            const custardHTML = _calcSpecPayoutHTML('adminSpecCustardProfit', rateNum, rateStr);
            const cupHTML = _calcSpecPayoutHTML('adminSpecCupProfit', rateNum, rateStr);

            const bagLbl = document.getElementById('adminSpecBagTitle') ? document.getElementById('adminSpecBagTitle').value || 'Container 1' : 'Container 1';
            const custardLbl = document.getElementById('adminSpecCustardTitle') ? document.getElementById('adminSpecCustardTitle').value || 'Container 2' : 'Container 2';
            const cupLbl = document.getElementById('adminSpecCupTitle') ? document.getElementById('adminSpecCupTitle').value || 'Container 3' : 'Container 3';

            specParent.innerHTML = `
                <span class="admin-apm-payout-value" style="font-size: 0.95rem;">${bagLbl}: <span>${bagHTML}</span></span>
                <span class="admin-apm-payout-value" style="font-size: 0.95rem;">${custardLbl}: <span>${custardHTML}</span></span>
                <span class="admin-apm-payout-value" style="font-size: 0.95rem;">${cupLbl}: <span>${cupHTML}</span></span>
            `;
        }
    }

    function _calcSpecPayoutHTML(id, rateNum, rateStr) {
        const val = parseFloat(document.getElementById(id)?.value) || 0;
        if (val <= 0) return '...';
        const payout = val * (rateNum / 100);
        return `₦${Number.isInteger(payout) ? payout : payout.toFixed(2)} (${rateStr}%)`;
    }

    function updateProfitBadge() {
        if (!profitPercentBadge) return;
        const cost = getRetailCost();
        const profit = parseFloat(profitInput.value) || 0;
        if (cost > 0 && profit > 0) {
            const pct = ((profit / cost) * 100);
            const pctDisplay = pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(1);
            profitPercentBadge.textContent = `₦${Math.round(profit).toLocaleString()} on ₦${Math.round(cost).toLocaleString()} retail cost`;
            profitPercentBadge.style.display = 'inline';
        } else {
            profitPercentBadge.style.display = 'none';
        }
    }

    // When PROFIT (₦) changes → update Profit (%)
    function onProfitAmountInput() {
        lastProfitSource = 'amount';
        const cost = getRetailCost();
        const profit = parseFloat(profitInput.value) || 0;
        if (profitPercentInput) {
            if (cost > 0 && profit >= 0) {
                const pct = (profit / cost) * 100;
                profitPercentInput.value = pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(2);
            } else {
                profitPercentInput.value = '';
            }
        }
        updateProfitBadge();
        updateFinalPriceAndPayout();
    }

    // When PROFIT (%) changes → update Profit (₦)
    function onProfitPercentInput() {
        lastProfitSource = 'percent';
        const cost = getRetailCost();
        const pct = parseFloat(profitPercentInput.value) || 0;
        if (profitInput) {
            if (cost > 0 && pct >= 0) {
                const profit = (pct / 100) * cost;
                profitInput.value = profit % 1 === 0 ? profit.toFixed(0) : profit.toFixed(2);
            } else {
                profitInput.value = '';
            }
        }
        updateProfitBadge();
        updateFinalPriceAndPayout();
    }

    function updateWholesaleFinalPrice() {
        if (!wholesaleProfitInput || !wholesalePriceInput) return;
        const cost = getWholesaleCost();
        const profit = parseFloat(wholesaleProfitInput.value) || 0;
        const finalPrice = cost + profit;
        wholesalePriceInput.value = finalPrice > 0 ? Math.round(finalPrice) : '';
    }

    function onWholesaleProfitAmountInput() {
        lastWholesaleProfitSource = 'amount';
        const cost = getWholesaleCost();
        const profit = parseFloat(wholesaleProfitInput.value) || 0;
        if (wholesaleProfitPercentInput) {
            if (cost > 0 && profit >= 0) {
                const pct = (profit / cost) * 100;
                wholesaleProfitPercentInput.value = pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(2);
            } else {
                wholesaleProfitPercentInput.value = '';
            }
        }
        updateWholesaleFinalPrice();
    }

    function onWholesaleProfitPercentInput() {
        lastWholesaleProfitSource = 'percent';
        const cost = getWholesaleCost();
        const pct = parseFloat(wholesaleProfitPercentInput.value) || 0;
        if (wholesaleProfitInput) {
            if (cost > 0 && pct >= 0) {
                const profit = (pct / 100) * cost;
                wholesaleProfitInput.value = profit % 1 === 0 ? profit.toFixed(0) : profit.toFixed(2);
            } else {
                wholesaleProfitInput.value = '';
            }
        }
        updateWholesaleFinalPrice();
    }

    // When COST changes → recalculate based on which was last edited
    function onCostInput() {
        updateProductUILabel();
        updateRetailCostUI();
        updateTotalCostUI();
        updateApmPayout();
        
        if (lastProfitSource === 'percent') {
            onProfitPercentInput();
        } else {
            onProfitAmountInput();
        }

        if (lastWholesaleProfitSource === 'percent') {
            onWholesaleProfitPercentInput();
        } else {
            onWholesaleProfitAmountInput();
        }
        
        // Auto-update wholesale cost val label
        const wsCostVal = document.getElementById('adminNewProductWholesaleCostVal');
        if (wsCostVal) wsCostVal.textContent = '₦' + Math.round(getWholesaleCost()).toLocaleString();
    }

    if (purchaseCostInput) purchaseCostInput.addEventListener('input', onCostInput);
    if (quantityInput) quantityInput.addEventListener('input', onCostInput);
    if (piecesInput) piecesInput.addEventListener('input', onCostInput);
    if (profitInput) profitInput.addEventListener('input', onProfitAmountInput);
    if (profitPercentInput) profitPercentInput.addEventListener('input', onProfitPercentInput);

    // ========================================
    // Default Product Wholesale / Retail Only Toggle
    // ========================================
    function updateAdminDefaultTypeUI(type) {
        const lblAdminDefWholesale = document.getElementById('lblAdminDefWholesale');
        const lblAdminDefRetail = document.getElementById('lblAdminDefRetail');

        const adminDefaultUnitRow = document.getElementById('adminDefaultUnitRow');
        const adminDefaultWholesaleCostRow = document.getElementById('adminDefaultWholesaleCostRow');
        const adminDefaultWholesaleTotalCostBlock = document.getElementById('adminDefaultWholesaleTotalCostBlock');
        const adminDefaultWholesalePricingHeader = document.getElementById('adminDefaultWholesalePricingHeader');
        const adminDefaultWholesaleProfitRow = document.getElementById('adminDefaultWholesaleProfitRow');
        const adminDefaultWholesalePriceGroup = document.getElementById('adminDefaultWholesalePriceGroup');
        const adminDefaultPiecesRow = document.getElementById('adminDefaultPiecesRow');
        const adminDefaultRetailInputs = document.getElementById('adminDefaultRetailInputs');

        if (type === 'wholesale') {
            if (lblAdminDefWholesale) lblAdminDefWholesale.style.borderColor = '#8b5cf6';
            if (lblAdminDefRetail) lblAdminDefRetail.style.borderColor = '#cbd5e1';

            if (adminDefaultUnitRow) adminDefaultUnitRow.style.display = 'flex';
            if (adminDefaultWholesaleCostRow) adminDefaultWholesaleCostRow.style.display = 'flex';
            if (adminDefaultWholesaleTotalCostBlock) adminDefaultWholesaleTotalCostBlock.style.display = 'inline-block';
            if (adminDefaultWholesalePricingHeader) adminDefaultWholesalePricingHeader.style.display = 'block';
            if (adminDefaultWholesaleProfitRow) adminDefaultWholesaleProfitRow.style.display = 'flex';
            if (adminDefaultWholesalePriceGroup) adminDefaultWholesalePriceGroup.style.display = 'block';
            if (adminDefaultPiecesRow) adminDefaultPiecesRow.style.display = 'flex';
            
            if (adminDefaultRetailInputs) adminDefaultRetailInputs.style.display = 'none';

            // Reset underlying cost/qty to wholesale defaults
            if (document.getElementById('adminNewProductPurchaseCost')) {
                document.getElementById('adminNewProductPurchaseCost').value = '';
                document.getElementById('adminNewProductPurchaseCost').dispatchEvent(new Event('input', { bubbles: true }));
            }
            if (document.getElementById('adminNewProductQuantity')) {
                document.getElementById('adminNewProductQuantity').value = 1;
                document.getElementById('adminNewProductQuantity').dispatchEvent(new Event('input', { bubbles: true }));
            }
        } else {
            if (lblAdminDefWholesale) lblAdminDefWholesale.style.borderColor = '#cbd5e1';
            if (lblAdminDefRetail) lblAdminDefRetail.style.borderColor = '#8b5cf6';

            if (adminDefaultUnitRow) adminDefaultUnitRow.style.display = 'none';
            if (adminDefaultWholesaleCostRow) adminDefaultWholesaleCostRow.style.display = 'none';
            if (adminDefaultWholesaleTotalCostBlock) adminDefaultWholesaleTotalCostBlock.style.display = 'none';
            if (adminDefaultWholesalePricingHeader) adminDefaultWholesalePricingHeader.style.display = 'none';
            if (adminDefaultWholesaleProfitRow) adminDefaultWholesaleProfitRow.style.display = 'none';
            if (adminDefaultWholesalePriceGroup) adminDefaultWholesalePriceGroup.style.display = 'none';
            if (adminDefaultPiecesRow) adminDefaultPiecesRow.style.display = 'none';
            
            if (adminDefaultRetailInputs) adminDefaultRetailInputs.style.display = 'flex';

            // Initialize retail inputs
            const adminDefaultRetailCost = document.getElementById('adminDefaultRetailCost');
            if (adminDefaultRetailCost) {
                adminDefaultRetailCost.value = '';
                adminDefaultRetailCost.dispatchEvent(new Event('input', { bubbles: true }));
            }
            const adminDefaultRetailQty = document.getElementById('adminDefaultRetailQty');
            if (adminDefaultRetailQty) {
                adminDefaultRetailQty.value = 1;
                adminDefaultRetailQty.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
    }

    const defRadios = document.querySelectorAll('input[name="adminDefTopUpType"]');
    defRadios.forEach(r => {
        r.addEventListener('change', (e) => {
            updateAdminDefaultTypeUI(e.target.value);
        });
    });

    const adminDefaultRetailCost = document.getElementById('adminDefaultRetailCost');
    const adminDefaultRetailQty = document.getElementById('adminDefaultRetailQty');
    
    function updateAdminRetailTotal() {
        const cost = parseFloat(adminDefaultRetailCost ? adminDefaultRetailCost.value : 0) || 0;
        const qty = parseInt(adminDefaultRetailQty ? adminDefaultRetailQty.value : 1) || 1;
        const totalCostVal = document.getElementById('adminDefaultRetailTotalCostVal');
        if (totalCostVal) {
            totalCostVal.textContent = '₦' + Math.round(cost * qty).toLocaleString();
        }
        
        // Sync with underlying purchase cost to trigger final price/margins updates
        const pcs = parseInt(document.getElementById('adminNewProductPieces')?.value || 1) || 1;
        const purchaseCostInput = document.getElementById('adminNewProductPurchaseCost');
        if (purchaseCostInput) {
            purchaseCostInput.value = (cost * pcs).toFixed(2);
            purchaseCostInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    if (adminDefaultRetailCost) adminDefaultRetailCost.addEventListener('input', updateAdminRetailTotal);
    if (adminDefaultRetailQty) adminDefaultRetailQty.addEventListener('input', updateAdminRetailTotal);
    if (wholesaleProfitInput) wholesaleProfitInput.addEventListener('input', onWholesaleProfitAmountInput);
    if (wholesaleProfitPercentInput) wholesaleProfitPercentInput.addEventListener('input', onWholesaleProfitPercentInput);

    // ========================================
    // Custom Product Calculations & Dropdowns
    // ========================================
    const customCostInput = document.getElementById('adminCustomProductPurchaseCost');
    const customQtyInput = document.getElementById('adminCustomProductQuantity');
    const customTotalCostVal = document.getElementById('adminCustomProductTotalCostVal');
    const customPiecesInput = document.getElementById('adminCustomProductPieces');
    const customPriceInput = document.getElementById('adminCustomProductPrice');

    function updateCustomTotalCostUI() {
        if (!customCostInput || !customTotalCostVal) return;
        const pCost = parseFloat(customCostInput.value) || 0;
        const qty = parseInt(customQtyInput ? customQtyInput.value : 1) || 1;
        const total = pCost * qty;
        customTotalCostVal.textContent = '₦' + Math.round(total).toLocaleString();
    }

    function onCustomCostInput() {
        updateCustomTotalCostUI();
    }

    if (customCostInput) customCostInput.addEventListener('input', onCustomCostInput);
    if (customQtyInput) customQtyInput.addEventListener('input', onCustomCostInput);

    // Dynamic Labels for Custom Form
    function updateCustomUILabel() {
        const cBulkSel = document.getElementById('adminCustomBulkUnitSelect');
        const cBulkVal = cBulkSel ? cBulkSel.value : 'Carton';
        const cRetailHidden = document.getElementById('adminCustomNewProductUnit');
        let cRetailVal = cRetailHidden ? cRetailHidden.value : 'piece';
        cRetailVal = cRetailVal.replace(/^per\s+/i, '');
        if(!cRetailVal) cRetailVal = 'piece';
        document.querySelectorAll('.lbl-custom-bulk').forEach(el => el.textContent = cBulkVal);
        document.querySelectorAll('.lbl-custom-retail').forEach(el => el.textContent = cRetailVal);
    }
    const cBulkSelElement = document.getElementById('adminCustomBulkUnitSelect');
    if(cBulkSelElement) cBulkSelElement.addEventListener('change', updateCustomUILabel);
    updateCustomUILabel();

    // Custom Bulk Dropdown Logic
    const cBulkWrp = document.getElementById('adminCustomBulkDropdownWrapper');
    const cBulkTrg = document.getElementById('adminCustomBulkDropdownTrigger');
    const cBulkMnu = document.getElementById('adminCustomBulkDropdownMenu');
    const cBulkHid = document.getElementById('adminCustomBulkUnitSelect');
    if (cBulkTrg && cBulkMnu && cBulkWrp) {
        cBulkTrg.addEventListener('click', () => { cBulkWrp.classList.toggle('open'); });
        cBulkMnu.addEventListener('click', (e) => {
            const opt = e.target.closest('.custom-dropdown-option');
            if(!opt) return;
            const val = opt.getAttribute('data-value');
            if(val === '__custom_bulk__') {
                const row = document.getElementById('adminCustomFormBulkRow');
                if(row) row.style.display = 'block';
                return;
            }
            cBulkMnu.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            const cBulkTrigText = cBulkTrg.querySelector('.trigger-text');
            cBulkTrigText.textContent = val;
            cBulkTrigText.style.color = '';
            cBulkTrigText.style.fontWeight = '600';
            if(cBulkHid) { cBulkHid.value = val; updateCustomUILabel(); }
            cBulkWrp.classList.remove('open');
            const row = document.getElementById('adminCustomFormBulkRow');
            if(row) row.style.display = 'none';
        });
        const customFormBulkBtn = document.getElementById('adminCustomFormBulkConfirmBtn');
        if (customFormBulkBtn) {
            customFormBulkBtn.addEventListener('click', () => {
                const inp = document.getElementById('adminCustomFormBulkInput');
                if (!inp || !inp.value.trim()) return;
                const v = inp.value.trim();
                const newOpt = document.createElement('div');
                newOpt.className = 'custom-dropdown-option';
                newOpt.setAttribute('data-value', v);
                newOpt.innerHTML = '<span>'+v+'</span>';
                cBulkMnu.insertBefore(newOpt, cBulkMnu.querySelector('.custom-unit-create-option'));
                inp.value = '';
                document.getElementById('adminCustomFormBulkRow').style.display = 'none';
            });
        }
    }

    // Custom Retail Dropdown Logic
    const cUnitWrp = document.getElementById('adminCustomUnitDropdownWrapper');
    const cUnitTrg = document.getElementById('adminCustomUnitDropdownTrigger');
    const cUnitMnu = document.getElementById('adminCustomUnitDropdownMenu');
    const cUnitHid = document.getElementById('adminCustomNewProductUnit');
    if (cUnitTrg && cUnitMnu && cUnitWrp) {
        cUnitTrg.addEventListener('click', () => { cUnitWrp.classList.toggle('open'); });
        cUnitMnu.addEventListener('click', (e) => {
            const opt = e.target.closest('.custom-dropdown-option');
            if(!opt) return;
            const val = opt.getAttribute('data-value');
            if(val === '__custom__') {
                const row = document.getElementById('adminCustomFormUnitRow');
                if(row) row.style.display = 'block';
                return;
            }
            cUnitMnu.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            const cUnitTrigText = cUnitTrg.querySelector('.trigger-text');
            cUnitTrigText.textContent = val;
            cUnitTrigText.style.color = '';
            if(cUnitHid) { cUnitHid.value = val; updateCustomUILabel(); }
            cUnitWrp.classList.remove('open');
            const row = document.getElementById('adminCustomFormUnitRow');
            if(row) row.style.display = 'none';
        });
        const customFormUnitBtn = document.getElementById('adminCustomFormUnitConfirmBtn');
        if (customFormUnitBtn) {
            customFormUnitBtn.addEventListener('click', () => {
                const inp = document.getElementById('adminCustomFormUnitInput');
                if (!inp || !inp.value.trim()) return;
                let v = inp.value.trim();
                if(!v.toLowerCase().startsWith('per ')) v = 'per ' + v;
                const newOpt = document.createElement('div');
                newOpt.className = 'custom-dropdown-option custom-added-unit';
                newOpt.setAttribute('data-value', v);
                const textSpan = document.createElement('span');
                textSpan.textContent = v;
                newOpt.appendChild(textSpan);
                const removeBtn = document.createElement('div');
                removeBtn.className = 'remove-unit-btn';
                removeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isActive = newOpt.classList.contains('active');
                    newOpt.remove();
                    if (isActive) {
                        const firstOpt = cUnitMnu.querySelector('.custom-dropdown-option');
                        if (firstOpt) {
                            firstOpt.classList.add('active');
                            const fv = firstOpt.getAttribute('data-value');
                            cUnitTrg.querySelector('.trigger-text').textContent = fv;
                            if (cUnitHid) { cUnitHid.value = fv; updateCustomUILabel(); }
                        }
                    }
                });
                newOpt.appendChild(removeBtn);
                cUnitMnu.insertBefore(newOpt, cUnitMnu.querySelector('.custom-unit-create-option'));
                cUnitMnu.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('active'));
                newOpt.classList.add('active');
                cUnitTrg.querySelector('.trigger-text').textContent = v;
                if (cUnitHid) { cUnitHid.value = v; updateCustomUILabel(); }
                inp.value = '';
                document.getElementById('adminCustomFormUnitRow').style.display = 'none';
                cUnitWrp.classList.remove('open');
            });
        }
    }

    // ========================================
    // Flexible Product Calculations & Dropdowns
    // ========================================
    // Flexible Product Form UI Logic
    // ========================================
    const fC1TitleInp = document.getElementById('adminFlexC1Title');
    const fC2TitleInp = document.getElementById('adminFlexC2Title');
    const fC3TitleInp = document.getElementById('adminFlexC3Title');
    
    function updateFlexTitles() {
        const t1 = fC1TitleInp ? fC1TitleInp.value.trim() || 'Container 1' : 'Container 1';
        const t2 = fC2TitleInp ? fC2TitleInp.value.trim() || 'Container 2' : 'Container 2';
        const t3 = fC3TitleInp ? fC3TitleInp.value.trim() || 'Container 3' : 'Container 3';

        const lblC1C = document.getElementById('lblAdminFlexC1Cost');
        const lblC1P = document.getElementById('lblAdminFlexC1Profit');
        const lblC1Pr = document.getElementById('lblAdminFlexC1Price');
        if(lblC1C) lblC1C.textContent = t1;
        if(lblC1P) lblC1P.textContent = t1;
        if(lblC1Pr) lblC1Pr.textContent = t1;

        const lblC2P = document.getElementById('lblAdminFlexC2Profit');
        const lblC2Pr = document.getElementById('lblAdminFlexC2Price');
        if(lblC2P) lblC2P.textContent = t2;
        if(lblC2Pr) lblC2Pr.textContent = t2;
    }

    if(fC1TitleInp) fC1TitleInp.addEventListener('input', updateFlexTitles);
    if(fC2TitleInp) fC2TitleInp.addEventListener('input', updateFlexTitles);
    if(fC3TitleInp) fC3TitleInp.addEventListener('input', updateFlexTitles);

    const fC1CostInp = document.getElementById('adminFlexC1Cost');
    const fC1QtyInp = document.getElementById('adminFlexC1Quantity');
    const fC1TotalVal = document.getElementById('adminFlexC1TotalCostVal');
    const fC1ProfitInp = document.getElementById('adminFlexC1Profit');
    const fC1ProfitPctInp = document.getElementById('adminFlexC1ProfitPercent');
    const fC1PriceInp = document.getElementById('adminFlexC1Price');

    const fC2QtyInp = document.getElementById('adminFlexC2Qty');
    const fC2CostVal = document.getElementById('adminFlexC2CostVal');
    const fC2ProfitInp = document.getElementById('adminFlexC2Profit');
    const fC2ProfitPctInp = document.getElementById('adminFlexC2ProfitPercent');
    const fC2PriceInp = document.getElementById('adminFlexC2Price');

    const fC3QtyInp = document.getElementById('adminFlexC3Qty');
    const fC3CostVal = document.getElementById('adminFlexC3CostVal');
    function calcFlex() {
        const c1Cost = parseFloat(fC1CostInp ? fC1CostInp.value : 0) || 0;
        const c1Qty = parseInt(fC1QtyInp ? fC1QtyInp.value : 1) || 1;
        if(fC1TotalVal) fC1TotalVal.textContent = '₦' + Math.round(c1Cost * c1Qty).toLocaleString();

        let c1Prof = parseFloat(fC1ProfitInp ? fC1ProfitInp.value : 0) || 0;
        let c1Pct = parseFloat(fC1ProfitPctInp ? fC1ProfitPctInp.value : 0) || 0;
        
        if (this === fC1ProfitInp && c1Cost > 0) {
            c1Pct = (c1Prof / c1Cost) * 100;
            if(fC1ProfitPctInp) fC1ProfitPctInp.value = c1Pct.toFixed(2).replace(/\.?0+$/, '');
        } else if (this === fC1ProfitPctInp && c1Cost > 0) {
            c1Prof = c1Cost * (c1Pct / 100);
            if(fC1ProfitInp) fC1ProfitInp.value = c1Prof.toFixed(2).replace(/\.?0+$/, '');
        } else if (this === fC1CostInp && c1Cost > 0) {
            c1Pct = (c1Prof / c1Cost) * 100;
            if(fC1ProfitPctInp) fC1ProfitPctInp.value = c1Pct.toFixed(2).replace(/\.?0+$/, '');
        }
        if(fC1PriceInp) fC1PriceInp.value = Math.round(c1Cost + c1Prof);

        const c2sPerC1 = parseInt(fC2QtyInp ? fC2QtyInp.value : 1) || 1;
        const c2Cost = c2sPerC1 > 0 ? c1Cost / c2sPerC1 : 0;
        if(fC2CostVal) fC2CostVal.textContent = '₦' + Math.round(c2Cost).toLocaleString();

        let c2Prof = parseFloat(fC2ProfitInp ? fC2ProfitInp.value : 0) || 0;
        let c2Pct = parseFloat(fC2ProfitPctInp ? fC2ProfitPctInp.value : 0) || 0;
        
        if (this === fC2ProfitInp && c2Cost > 0) {
            c2Pct = (c2Prof / c2Cost) * 100;
            if(fC2ProfitPctInp) fC2ProfitPctInp.value = c2Pct.toFixed(2).replace(/\.?0+$/, '');
        } else if (this === fC2ProfitPctInp && c2Cost > 0) {
            c2Prof = c2Cost * (c2Pct / 100);
            if(fC2ProfitInp) fC2ProfitInp.value = c2Prof.toFixed(2).replace(/\.?0+$/, '');
        } else if ((this === fC2QtyInp || this === fC1CostInp) && c2Cost > 0) {
            c2Pct = (c2Prof / c2Cost) * 100;
            if(fC2ProfitPctInp) fC2ProfitPctInp.value = c2Pct.toFixed(2).replace(/\.?0+$/, '');
        }
        if(fC2PriceInp) fC2PriceInp.value = Math.round(c2Cost + c2Prof);

        const c3sPerC2 = parseInt(fC3QtyInp ? fC3QtyInp.value : 1) || 1;
        const c3Cost = c3sPerC2 > 0 ? c2Cost / c3sPerC2 : 0;
        if(fC3CostVal) fC3CostVal.textContent = '₦' + Math.round(c3Cost).toLocaleString();

        // For Container 3 in Flexible products, there is no fixed price or profit since it's flexible by definition.
    }

    [fC1CostInp, fC1QtyInp, fC1ProfitInp, fC1ProfitPctInp, fC2QtyInp, fC2ProfitInp, fC2ProfitPctInp, fC3QtyInp].forEach(el => {
        if(el) el.addEventListener('input', calcFlex);
    });

    // ========================================
    // Special Form Additions
    // ========================================
    const rsTypeDefaultBtn = document.getElementById('adminTypeDefaultBtn');
    const rsTypeSpecialBtn = document.getElementById('adminTypeSpecialBtn');
    const rsTypeFlexibleBtn = document.getElementById('adminTypeFlexibleBtn');
    const rsTypeCustomBtn = document.getElementById('adminTypeCustomBtn');
    const rsProductType = document.getElementById('adminProductType');
    const rsDefaultProductForm = document.getElementById('adminDefaultProductForm');
    const rsSpecialProductForm = document.getElementById('adminSpecialProductForm');
    const rsFlexibleProductForm = document.getElementById('adminFlexibleProductForm');
    const rsCustomProductForm = document.getElementById('adminCustomProductForm');

    function resetAdminTypeButtons() {
        [rsTypeDefaultBtn, rsTypeSpecialBtn, rsTypeFlexibleBtn, rsTypeCustomBtn].forEach(btn => {
            if (btn) {
                btn.style.background = 'transparent';
                btn.style.color = '#64748b';
                btn.style.boxShadow = 'none';
            }
        });
        if (rsDefaultProductForm) rsDefaultProductForm.style.display = 'none';
        if (rsSpecialProductForm) rsSpecialProductForm.style.display = 'none';
        if (rsFlexibleProductForm) rsFlexibleProductForm.style.display = 'none';
        if (rsCustomProductForm) rsCustomProductForm.style.display = 'none';
    }

    function setAdminActiveTypeBtn(btn, formId, typeValue) {
        resetAdminTypeButtons();
        if (btn) {
            btn.style.background = 'white';
            btn.style.color = '#6366f1';
            btn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
        }
        const form = document.getElementById(formId);
        if (form) form.style.display = 'block';
        if (rsProductType) rsProductType.value = typeValue;
        updateApmPayout();
    }

    if (rsTypeDefaultBtn) rsTypeDefaultBtn.addEventListener('click', () => setAdminActiveTypeBtn(rsTypeDefaultBtn, 'adminDefaultProductForm', 'default'));
    if (rsTypeSpecialBtn) rsTypeSpecialBtn.addEventListener('click', () => setAdminActiveTypeBtn(rsTypeSpecialBtn, 'adminSpecialProductForm', 'special'));
    if (rsTypeFlexibleBtn) rsTypeFlexibleBtn.addEventListener('click', () => setAdminActiveTypeBtn(rsTypeFlexibleBtn, 'adminFlexibleProductForm', 'flexible'));
    if (rsTypeCustomBtn) rsTypeCustomBtn.addEventListener('click', () => setAdminActiveTypeBtn(rsTypeCustomBtn, 'adminCustomProductForm', 'custom'));

    const specName = document.getElementById('adminSpecProductName');
    const specBagCost = document.getElementById('adminSpecBagCost');
    const specBagQuantity = document.getElementById('adminSpecBagQuantity');
    const specBagTotalCostVal = document.getElementById('adminSpecBagTotalCostVal');
    const specBagProfit = document.getElementById('adminSpecBagProfit');
    const specBagProfitPercent = document.getElementById('adminSpecBagProfitPercent');
    const specBagPrice = document.getElementById('adminSpecBagPrice');

    const specCustardsPerBag = document.getElementById('adminSpecCustardsPerBag');
    const specCustardCostVal = document.getElementById('adminSpecCustardCostVal');
    const specCustardProfit = document.getElementById('adminSpecCustardProfit');
    const specCustardProfitPercent = document.getElementById('adminSpecCustardProfitPercent');
    const specCustardPrice = document.getElementById('adminSpecCustardPrice');

    const specCupsPerCustard = document.getElementById('adminSpecCupsPerCustard');
    const specCupCostVal = document.getElementById('adminSpecCupCostVal');
    const specCupProfit = document.getElementById('adminSpecCupProfit');
    const specCupProfitPercent = document.getElementById('adminSpecCupProfitPercent');
    const specCupPrice = document.getElementById('adminSpecCupPrice');

    // Title Listeners for real-time label updates
    const titleBag = document.getElementById('adminSpecBagTitle');
    if(titleBag) titleBag.addEventListener('input', (e) => {
        const val = e.target.value.trim() || 'Container 1';
        document.getElementById('lblAdminSpecBagCost').textContent = val;
        document.getElementById('lblAdminSpecBagProfit').textContent = val;
        document.getElementById('lblAdminSpecBagPrice').textContent = val;
    });

    const titleCustard = document.getElementById('adminSpecCustardTitle');
    if(titleCustard) titleCustard.addEventListener('input', (e) => {
        const val = e.target.value.trim() || 'Container 2';
        document.getElementById('lblAdminSpecCustardProfit').textContent = val;
        document.getElementById('lblAdminSpecCustardPrice').textContent = val;
    });

    const titleCup = document.getElementById('adminSpecCupTitle');
    if(titleCup) titleCup.addEventListener('input', (e) => {
        const val = e.target.value.trim() || 'Container 3';
        document.getElementById('lblAdminSpecCupProfit').textContent = val;
        document.getElementById('lblAdminSpecCupPrice').textContent = val;
    });

    function calcSpecial() {
        const bagCost = parseFloat(specBagCost.value) || 0;
        const qB = parseFloat(specBagQuantity ? specBagQuantity.value : 1) || 1;
        
        if (specBagTotalCostVal) {
            const tot = bagCost * qB;
            specBagTotalCostVal.textContent = tot > 0 ? '₦' + Math.round(tot).toLocaleString() : '₦0';
        }

        let bagProfit = parseFloat(specBagProfit.value) || 0;
        specBagPrice.value = Math.round(bagCost + bagProfit);

        const custards = parseInt(specCustardsPerBag.value) || 0;
        let custardCost = (custards > 0 && bagCost > 0) ? bagCost / custards : 0;
        specCustardCostVal.textContent = custardCost > 0 ? '₦' + Math.round(custardCost).toLocaleString() : '₦0';
        let custardProfit = parseFloat(specCustardProfit.value) || 0;
        specCustardPrice.value = (custardCost > 0 || custardProfit > 0) ? Math.round(custardCost + custardProfit) : '';

        const cups = parseInt(specCupsPerCustard.value) || 0;
        let cupCost = (cups > 0 && custardCost > 0) ? custardCost / cups : 0;
        specCupCostVal.textContent = cupCost > 0 ? '₦' + Math.round(cupCost).toLocaleString() : '₦0';
        let cupProfit = parseFloat(specCupProfit.value) || 0;
        specCupPrice.value = (cupCost > 0 || cupProfit > 0) ? Math.round(cupCost + cupProfit) : '';

        updateApmPayout();
    }

    if(specBagCost) specBagCost.addEventListener('input', () => {
        const cost = parseFloat(specBagCost.value) || 0;
        const profit = parseFloat(specBagProfit.value) || 0;
        if(specBagProfitPercent) specBagProfitPercent.value = cost > 0 ? ((profit/cost)*100).toFixed(2).replace(/\.?0+$/,'') : '';
        calcSpecial();
    });
    if(specBagQuantity) specBagQuantity.addEventListener('input', calcSpecial);
    if(specBagProfit) specBagProfit.addEventListener('input', () => {
        const cost = parseFloat(specBagCost.value) || 0;
        const profit = parseFloat(specBagProfit.value) || 0;
        if(specBagProfitPercent) specBagProfitPercent.value = cost > 0 ? ((profit/cost)*100).toFixed(2).replace(/\.?0+$/,'') : '';
        calcSpecial();
    });
    if(specBagProfitPercent) specBagProfitPercent.addEventListener('input', () => {
        const cost = parseFloat(specBagCost.value) || 0;
        const pct = parseFloat(specBagProfitPercent.value) || 0;
        if(specBagProfit) specBagProfit.value = cost > 0 ? ((pct/100)*cost).toFixed(2).replace(/\.?0+$/,'') : '';
        calcSpecial();
    });

    if(specCustardsPerBag) specCustardsPerBag.addEventListener('input', calcSpecial);
    if(specCustardProfit) specCustardProfit.addEventListener('input', () => {
        const bagCost = parseFloat(specBagCost.value) || 0;
        const custards = parseInt(specCustardsPerBag.value) || 0;
        const cost = (custards > 0) ? bagCost / custards : 0;
        const profit = parseFloat(specCustardProfit.value) || 0;
        if(specCustardProfitPercent) specCustardProfitPercent.value = cost > 0 ? ((profit/cost)*100).toFixed(2).replace(/\.?0+$/,'') : '';
        calcSpecial();
    });
    if(specCustardProfitPercent) specCustardProfitPercent.addEventListener('input', () => {
        const bagCost = parseFloat(specBagCost.value) || 0;
        const custards = parseInt(specCustardsPerBag.value) || 0;
        const cost = (custards > 0) ? bagCost / custards : 0;
        const pct = parseFloat(specCustardProfitPercent.value) || 0;
        if(specCustardProfit) specCustardProfit.value = cost > 0 ? ((pct/100)*cost).toFixed(2).replace(/\.?0+$/,'') : '';
        calcSpecial();
    });

    if(specCupsPerCustard) specCupsPerCustard.addEventListener('input', calcSpecial);
    if(specCupProfit) specCupProfit.addEventListener('input', () => {
        const bagCost = parseFloat(specBagCost.value) || 0;
        const custards = parseInt(specCustardsPerBag.value) || 0;
        const cups = parseInt(specCupsPerCustard.value) || 0;
        const cost = (cups > 0 && custards > 0) ? (bagCost / custards) / cups : 0;
        const profit = parseFloat(specCupProfit.value) || 0;
        if(specCupProfitPercent) specCupProfitPercent.value = cost > 0 ? ((profit/cost)*100).toFixed(2).replace(/\.?0+$/,'') : '';
        calcSpecial();
    });
    if(specCupProfitPercent) specCupProfitPercent.addEventListener('input', () => {
        const bagCost = parseFloat(specBagCost.value) || 0;
        const custards = parseInt(specCustardsPerBag.value) || 0;
        const cups = parseInt(specCupsPerCustard.value) || 0;
        const cost = (cups > 0 && custards > 0) ? (bagCost / custards) / cups : 0;
        const pct = parseFloat(specCupProfitPercent.value) || 0;
        if(specCupProfit) specCupProfit.value = cost > 0 ? ((pct/100)*cost).toFixed(2).replace(/\.?0+$/,'') : '';
        calcSpecial();
    });

    const specSubmitBtn = document.getElementById('adminSpecProductSubmitBtn');
    if (specSubmitBtn) {
        specSubmitBtn.addEventListener('click', () => {
            const name = specName ? specName.value.trim() : '';
            if (!name) {
                if (specName) { specName.style.borderColor = '#ff4d4d'; setTimeout(() => specName.style.borderColor = '', 1500); }
                return;
            }

            const bagCost = parseFloat(specBagCost.value) || 0;
            const bagPrice = parseFloat(specBagPrice.value) || bagCost;
            
            if (bagCost <= 0) {
                if (specBagCost) { specBagCost.style.borderColor = '#ff4d4d'; setTimeout(() => specBagCost.style.borderColor = '', 1500); }
                return;
            }

            const bagTitleEl = document.getElementById('adminSpecBagTitle');
            const custardTitleEl = document.getElementById('adminSpecCustardTitle');
            const cupTitleEl = document.getElementById('adminSpecCupTitle');
            
            const bagTitle = bagTitleEl && bagTitleEl.value.trim() ? bagTitleEl.value.trim() : 'Container 1';
            const custardTitle = custardTitleEl && custardTitleEl.value.trim() ? custardTitleEl.value.trim() : 'Container 2';
            const cupTitle = cupTitleEl && cupTitleEl.value.trim() ? cupTitleEl.value.trim() : 'Container 3';

            const specBagQuantity = document.getElementById('adminSpecBagQuantity');
            const boughtQuantity = specBagQuantity ? (parseFloat(specBagQuantity.value) || 1) : 1;

            const custardsPerBag = parseInt(specCustardsPerBag.value) || 0;
            const cupsPerCustard = parseInt(specCupsPerCustard.value) || 0;

            const newProductId = 'ndp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
            adminProducts.unshift({
                id: newProductId,
                name,
                price: bagPrice,
                unit: 'per ' + bagTitle.toLowerCase(),
                cost: bagCost,
                purchaseCost: bagCost * boughtQuantity,
                boughtQuantity: boughtQuantity,
                addedViaProductTab: true,
                profit: parseFloat(specBagProfit.value) || 0,
                dateAdded: new Date().toISOString(),
                isSpecial: true,
                isOldStock: document.getElementById('adminSpecOldStockSwitch') ? document.getElementById('adminSpecOldStockSwitch').checked : false,
                allowUserFlexiblePricing: document.getElementById('adminSpecFlexiblePricingSwitch') ? document.getElementById('adminSpecFlexiblePricingSwitch').checked : false,
                bulkUnit: bagTitle,
                imageData: document.getElementById('adminProductImageData') ? document.getElementById('adminProductImageData').value : '',
                structure: {
                    custardsPerBag: custardsPerBag,
                    cupsPerCustard: cupsPerCustard,
                    bagProfit: parseFloat(specBagProfit.value) || 0,
                    bagProfitPercent: parseFloat(specBagProfitPercent.value) || 0,
                    custardProfit: parseFloat(specCustardProfit.value) || 0,
                    custardProfitPercent: parseFloat(specCustardProfitPercent.value) || 0,
                    cupProfit: parseFloat(specCupProfit.value) || 0,
                    cupProfitPercent: parseFloat(specCupProfitPercent.value) || 0
                },
                packTypes: {
                    bag: { price: bagPrice, title: bagTitle },
                    custard: { price: parseFloat(specCustardPrice.value) || 0, title: custardTitle },
                    cup: { price: parseFloat(specCupPrice.value) || 0, title: cupTitle }
                }
            });

            saveProductsToMemory();
            renderProducts(searchInput ? searchInput.value.trim() : '');
            closeModal();
            
            if (typeof window.renderRestockListGlobal === 'function') {
                window.renderRestockListGlobal();
            }
        });
    }



    // ========================================
    // Submit New Default Product
    // ========================================
    if (submitBtn) {
        submitBtn.addEventListener('click', () => {
            const name = nameInput ? nameInput.value.trim() : '';
            const price = priceInput ? parseFloat(priceInput.value) : 0;
            const unit = unitHidden ? unitHidden.value : 'per cup';

            if (!name) {
                if (nameInput) {
                    nameInput.style.borderColor = '#ff4d4d';
                    setTimeout(() => nameInput.style.borderColor = '', 1500);
                }
                return;
            }
            if (isNaN(price) || price <= 0) {
                if (priceInput) {
                    priceInput.style.borderColor = '#ff4d4d';
                    setTimeout(() => priceInput.style.borderColor = '', 1500);
                }
                return;
            }

            // Add to data and save to permanent memory
            const defTopUpType = document.querySelector('input[name="adminDefTopUpType"]:checked')?.value || 'wholesale';
            
            let purchaseCostVal = 0;
            let quantity = 1;
            let purchaseCost = 0;
            let cost = 0;
            const pieces = piecesInput ? (parseInt(piecesInput.value) || 1) : 1;
            const bulkSel = document.getElementById('adminBulkUnitSelect');
            const bulkUnit = bulkSel ? bulkSel.value : 'Carton';
            
            if (defTopUpType === 'wholesale') {
                purchaseCostVal = purchaseCostInput ? (parseFloat(purchaseCostInput.value) || 0) : 0;
                quantity = typeof quantityInput !== 'undefined' && quantityInput ? (parseInt(quantityInput.value) || 1) : 1;
                purchaseCost = purchaseCostVal * quantity;
                cost = pieces > 0 ? (purchaseCostVal / pieces) : 0;
            } else {
                const retailCost = parseFloat(document.getElementById('adminDefaultRetailCost').value) || 0;
                const retailQty = parseInt(document.getElementById('adminDefaultRetailQty').value) || 1;
                purchaseCost = retailCost * retailQty;
                cost = retailCost;
                purchaseCostVal = retailCost * pieces;
                quantity = retailQty / pieces;
            }
            
            const profit = profitInput ? (parseFloat(profitInput.value) || 0) : 0;
            const profitPct = profitPercentInput ? (parseFloat(profitPercentInput.value) || 0) : 0;
            
            const wholesaleProfit = wholesaleProfitInput ? (parseFloat(wholesaleProfitInput.value) || 0) : 0;
            const wholesaleProfitPercent = wholesaleProfitPercentInput ? (parseFloat(wholesaleProfitPercentInput.value) || 0) : 0;
            const wholesalePrice = wholesalePriceInput ? (parseFloat(wholesalePriceInput.value) || 0) : 0;

            const newProductId = 'ndp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
            adminProducts.unshift({ 
                id: newProductId,
                name, price, unit, 
                cost, purchaseCost: purchaseCost, pieces, boughtQuantity: quantity, bulkUnit,
                addedViaProductTab: true,
                profit, profitPercent: profitPct, dateAdded: new Date().toISOString(),
                wholesaleProfit, wholesaleProfitPercent, wholesalePrice,
                isSpecial: false,
                isOldStock: document.getElementById('adminDefOldStockSwitch') ? document.getElementById('adminDefOldStockSwitch').checked : false,
                allowUserFlexiblePricing: document.getElementById('adminDefFlexiblePricingSwitch') ? document.getElementById('adminDefFlexiblePricingSwitch').checked : false,
                imageData: document.getElementById('adminProductImageData') ? document.getElementById('adminProductImageData').value : ''
            });
            saveProductsToMemory();

            // Re-render list
            renderProducts(searchInput ? searchInput.value.trim() : '');

            // Close modal
            closeModal();
        });
    }


    // ========================================
    // Submit Flexible Product
    // ========================================
    const flexSubmitBtn = document.getElementById('adminFlexProductSubmitBtn');
    if (flexSubmitBtn) {
        flexSubmitBtn.addEventListener('click', () => {
            const nameInput = document.getElementById('adminFlexProductName');
            const name = nameInput ? nameInput.value.trim() : '';

            if (!name) {
                if (nameInput) {
                    nameInput.style.borderColor = '#ff4d4d';
                    setTimeout(() => nameInput.style.borderColor = '', 1500);
                }
                return;
            }

            const c1Cost = parseFloat(fC1CostInp ? fC1CostInp.value : 0) || 0;
            if (c1Cost <= 0) {
                if (fC1CostInp) {
                    fC1CostInp.style.borderColor = '#ff4d4d';
                    setTimeout(() => fC1CostInp.style.borderColor = '', 1500);
                }
                return;
            }

            const c1Title = fC1TitleInp && fC1TitleInp.value.trim() ? fC1TitleInp.value.trim() : 'Container 1';
            const c2Title = fC2TitleInp && fC2TitleInp.value.trim() ? fC2TitleInp.value.trim() : 'Container 2';
            const c3Title = fC3TitleInp && fC3TitleInp.value.trim() ? fC3TitleInp.value.trim() : 'Container 3';

            const boughtQuantity = parseInt(fC1QtyInp ? fC1QtyInp.value : 1) || 1;
            const c1Price = parseFloat(fC1PriceInp ? fC1PriceInp.value : 0) || c1Cost;
            
            const c2sPerC1 = parseInt(fC2QtyInp ? fC2QtyInp.value : 1) || 1;
            const c3sPerC2 = parseInt(fC3QtyInp ? fC3QtyInp.value : 1) || 1;

            const c2Cost = c2sPerC1 > 0 ? c1Cost / c2sPerC1 : 0;
            const c2Price = parseFloat(fC2PriceInp ? fC2PriceInp.value : 0) || c2Cost;
            
            const c3Cost = c3sPerC2 > 0 ? c2Cost / c3sPerC2 : 0;
            const c3Price = c3Cost; // Container 3 is purely flexible, no fixed price input
            
            const oldStockToggle = document.getElementById('adminFlexOldStockSwitch');

            const newProductId = 'ndp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
            adminProducts.unshift({
                id: newProductId,
                name: name,
                price: c1Price,
                unit: 'per ' + c1Title.toLowerCase(),
                cost: c1Cost,
                purchaseCost: c1Cost * boughtQuantity,
                boughtQuantity: boughtQuantity,
                addedViaProductTab: true,
                profit: parseFloat(fC1ProfitInp ? fC1ProfitInp.value : 0) || 0,
                dateAdded: new Date().toISOString(),
                isSpecial: false,
                isCustom: false,
                isFlexible: true,
                isOldStock: oldStockToggle ? oldStockToggle.checked : false,
                allowUserFlexiblePricing: document.getElementById('adminFlexFlexiblePricingSwitch') ? document.getElementById('adminFlexFlexiblePricingSwitch').checked : false,
                bulkUnit: c1Title,
                imageData: document.getElementById('adminProductImageData') ? document.getElementById('adminProductImageData').value : '',
                structure: {
                    c2sPerC1: c2sPerC1,
                    c3sPerC2: c3sPerC2,
                    c1Profit: parseFloat(fC1ProfitInp ? fC1ProfitInp.value : 0) || 0,
                    c1ProfitPercent: parseFloat(fC1ProfitPctInp ? fC1ProfitPctInp.value : 0) || 0,
                    c2Profit: parseFloat(fC2ProfitInp ? fC2ProfitInp.value : 0) || 0,
                    c2ProfitPercent: parseFloat(fC2ProfitPctInp ? fC2ProfitPctInp.value : 0) || 0,
                    c3Profit: 0,
                    c3ProfitPercent: 0
                },
                packTypes: {
                    c1: { price: c1Price, title: c1Title },
                    c2: { price: c2Price, title: c2Title },
                    c3: { price: c3Price, title: c3Title }
                }
            });
            saveProductsToMemory();

            renderProducts();
            closeModal();
            if (typeof window.renderRestockListGlobal === 'function') {
                window.renderRestockListGlobal();
            }
        });
    }


    // ========================================
    // Submit Custom Product
    // ========================================
    const customSubmitBtn = document.getElementById('adminCustomProductSubmitBtn');
    if (customSubmitBtn) {
        customSubmitBtn.addEventListener('click', () => {
            const nameInput = document.getElementById('adminCustomProductName');
            const name = nameInput ? nameInput.value.trim() : '';

            if (!name) {
                if (nameInput) {
                    nameInput.style.borderColor = '#ff4d4d';
                    setTimeout(() => nameInput.style.borderColor = '', 1500);
                }
                return;
            }

            const cCostInp = document.getElementById('adminCustomProductPurchaseCost');
            const customCost = parseFloat(cCostInp ? cCostInp.value : 0) || 0;
            if (customCost <= 0) {
                if (cCostInp) {
                    cCostInp.style.borderColor = '#ff4d4d';
                    setTimeout(() => cCostInp.style.borderColor = '', 1500);
                }
                return;
            }

            const cQtyInp = document.getElementById('adminCustomProductQuantity');
            const customQty = cQtyInp ? (parseInt(cQtyInp.value) || 1) : 1;
            const piecesInput = document.getElementById('adminCustomProductPieces');
            const pieces = piecesInput ? (parseInt(piecesInput.value) || 1) : 1;
            
            const bulkSelect = document.getElementById('adminCustomBulkUnitSelect');
            const bulkUnitVal = bulkSelect ? bulkSelect.value : 'Carton';

            const unitHidden = document.getElementById('adminCustomNewProductUnit');
            const unitVal = unitHidden ? unitHidden.value : 'per piece';

            const oldStockToggle = document.getElementById('adminCustomOldStockSwitch');
            const payoutRateInput = document.getElementById('adminCustomPayoutRate');
            const payoutTypeSelect = document.getElementById('adminCustomPayoutType');

            const payoutRate = payoutRateInput ? (parseFloat(payoutRateInput.value) || 0) : 0;
            const payoutType = payoutTypeSelect ? payoutTypeSelect.value : '%';

            const customPriceInput = document.getElementById('adminCustomProductPrice');
            const finalPrice = customPriceInput && customPriceInput.value ? parseFloat(customPriceInput.value) : "Open";

            const totalPurchaseCost = customCost * customQty;

            const newProductId = 'ndp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
            adminProducts.unshift({
                id: newProductId,
                name: name,
                price: finalPrice,
                unit: unitVal,
                cost: customCost,
                bulkCost: customCost,
                purchaseCost: totalPurchaseCost,
                boughtQuantity: customQty,
                pieces: pieces,
                bulkUnit: bulkUnitVal,
                dateAdded: new Date().toISOString(),
                isSpecial: false,
                isCustom: true,
                isOldStock: oldStockToggle ? oldStockToggle.checked : false,
                allowUserFlexiblePricing: document.getElementById('adminCustomFlexiblePricingSwitch') ? document.getElementById('adminCustomFlexiblePricingSwitch').checked : false,
                addedViaProductTab: true,
                profit: 0,
                profitPercent: 0,
                payoutSetting: { rate: payoutRate, type: payoutType },
                imageData: document.getElementById('adminProductImageData') ? document.getElementById('adminProductImageData').value : ''
            });
            saveProductsToMemory();

            renderProducts();
            closeModal();
            if (typeof window.renderRestockListGlobal === 'function') {
                window.renderRestockListGlobal();
            }
        });
    }


    // Populate payout fields immediately from live global settings
    updateFinalPriceAndPayout();
    calcSpecial();
}

// ========================================
// Creative PDF Download for Product Page (Handles centrally in index.html)
// ========================================
window.generateProductPDF = function (btn) {
    if (!btn) btn = document.getElementById('headerPrintBtn');
    if (!btn) return;

    const shopName = localStorage.getItem('nd_shop_name') || '';
    let cardsHtml = '';

    // Build beautiful catalog cards
    adminProducts.forEach(p => {
        let displayPrice = '';
        let priceVal = 0;
        if (p.isSpecial) {
            priceVal = (p.packTypes && p.packTypes.bag && p.packTypes.bag.price) ? parseFloat(p.packTypes.bag.price) : 0;
            displayPrice = '<span style="font-size: 13px; color: #888; font-weight: 500; margin-right: 4px;">From</span><span style="font-size: 18px; font-weight: 900; color: #6366f1;">₦' + Math.round(priceVal).toLocaleString() + '</span> <span style="font-size: 13px; color: #888; font-weight: 500; margin-left: 4px;">' + ((p.packTypes && p.packTypes.bag && p.packTypes.bag.title) ? p.packTypes.bag.title : ((p.packTypes && p.packTypes.c1 && p.packTypes.c1.title) ? p.packTypes.c1.title : 'Container 1')) + '</span>';
        } else if (p.isCustom) {
            displayPrice = '<span style="font-size: 15px; font-weight: 800; color: #64748b;">Custom Pricing</span>';
        } else if (p.isFlexible) {
            displayPrice = '<span style="font-size: 15px; font-weight: 800; color: #64748b;">Flexible Pricing</span>';
        } else {
            priceVal = parseFloat(p.price) || 0;
            displayPrice = '<span style="font-size: 18px; font-weight: 900; color: #6366f1;">₦' + Math.round(priceVal).toLocaleString() + '</span> <span style="font-size: 13px; color: #888; font-weight: 500; margin-left: 4px;">' + (p.unit || '') + '</span>';
        }

        const payout = priceVal * 0.02;
        const formattedPayout = Number.isInteger(payout) ? payout : payout.toFixed(2);
        cardsHtml += `
            <div style="break-inside: avoid; border: 1px solid #edf1f7; border-radius: 12px; padding: 16px; background: #fffcf8; box-shadow: 0 4px 6px rgba(27, 38, 59,0.04); margin-bottom: 20px;">
                <div style="font-weight: 800; font-size: 16px; color: #333; margin-bottom: 8px;">${p.name}</div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        ${displayPrice}
                    </div>
                    <div style="background: #6366f1; color: #ffffff; padding: 6px 12px; border-radius: 8px; font-size: 13px; font-weight: 700; box-shadow: 0 2px 4px rgba(27, 38, 59,0.2);">
                        +₦${formattedPayout} Reward
                    </div>
                </div>
            </div>
        `;
    });

    const printArea = document.createElement('div');

    printArea.style.width = '816px'; // Exact width for Letter size at 96 DPI
    printArea.style.background = '#ffffff';
    printArea.style.fontFamily = "'Inter', -apple-system, sans-serif";
    printArea.style.boxSizing = 'border-box';
    printArea.style.padding = '50px';

    // Using CSS columns for a cool magazine-style layout
    printArea.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; border-bottom: 3px solid #6366f1; padding-bottom: 25px;">
            <div style="color: #6366f1; font-weight: 900; font-size: 34px; letter-spacing: -1.5px; text-transform: uppercase; font-family: 'Outfit', sans-serif;">${shopName}</div>
            <div style="text-align: right;">
                <h2 style="margin: 0; color: #111; font-size: 28px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Product Catalog</h2>
                <p style="margin: 6px 0 0 0; color: #666; font-size: 15px; font-weight: 600;">Active Inventory: <strong style="color:#6366f1;">${adminProducts.length} Items</strong></p>
            </div>
        </div>
        
        <div style="column-count: 2; column-gap: 30px;">
            ${cardsHtml}
        </div>

        <div style="margin-top: 50px; text-align: center; color: #999; font-size: 13px; font-weight: 600; border-top: 1px solid #eaeaea; padding-top: 30px;">
            ${shopName} • Official Inventory Catalog • Generated on ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-US')}
        </div>
    `;


    const opt = {
        margin: 0,
        filename: 'nd_Product_Catalog.pdf',
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, windowWidth: 816, scrollX: 0, scrollY: 0 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    const originalText = btn.textContent;
    btn.textContent = 'Generating...';
    btn.style.opacity = '0.7';
    btn.style.pointerEvents = 'none';

    html2pdf().set(opt).from(printArea.outerHTML).save().then(() => {
        btn.textContent = originalText;
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
    }).catch(err => {
        console.error("PDF Error: ", err);
        btn.textContent = originalText;
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
    });
}



