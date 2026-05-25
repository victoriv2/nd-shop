window.loadProductTab = function() {
    const container = document.getElementById('product-container');

    // Add CSS animations globally if they don't exist
    if (!document.getElementById('productAnimations')) {
        const style = document.createElement('style');
        style.id = 'productAnimations';
        style.textContent = `
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp { 
                from { opacity: 0; transform: translateY(20px); } 
                to { opacity: 1; transform: translateY(0); } 
            }
            .dynamic-product-list {
                padding-bottom: 80px; /* Space for the bottom bar */
            }
        `;
        document.head.appendChild(style);
    }

    if (container) {
        return fetch('product/product.html')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.text();
            })
            .then(html => {
                container.innerHTML = html;

                // Elements for dynamic rendering
                const dynamicListContainer = document.getElementById('dynamicProductList');
                const searchInput = document.getElementById('productSearchInput');
                const searchWrapper = document.getElementById('searchWrapper');
                const filterBtn = document.getElementById('filterBtn');

                // Function to get current products from memory or Supabase
                async function getProductsFromMemory() {
                    if (window.supabaseClient) {
                        const { data, error } = await window.supabaseClient.from('products').select('*');
                        if (error) {
                            console.error('Error fetching products:', error);
                            return [];
                        }
                        
                        // Map snake_case from DB back to camelCase used in frontend
                        return data.map(p => ({
                            ...p,
                            isCustom: p.is_custom,
                            isSpecial: p.is_special,
                            isFlexible: p.is_flexible,
                            isNewStock: p.is_new_stock,
                            isOldStock: p.is_old_stock,
                            isDeleted: p.is_deleted,
                            isHidden: p.is_hidden,
                            imageData: p.image_data,
                            payoutRate: p.payout_rate,
                            dateAdded: p.created_at
                        }));
                    }
                    
                    const saved = localStorage.getItem('nd_products_data');
                    if (saved) {
                        try {
                            return JSON.parse(saved);
                        } catch (e) {
                            console.error('Failed to parse products', e);
                            return [];
                        }
                    }
                    return [];
                }

                let activeTab = 'all'; // can be 'all', 'default', 'special', 'custom', 'flexible'
                let lastRenderedProductsHtml = '';

                // Creative Rendering Function
                async function renderDynamicProducts(filterText = '') {
                    if (!dynamicListContainer) return;

                    const products = await getProductsFromMemory();
                    let displayList = [];
                    let renderedHTML = '';

                    if (activeTab === 'all' || activeTab === 'custom') {
                        const filtered = products.filter(p => p.isCustom && !p.cleared && !p.isDeleted && !p.isHidden && !window.checkProductOutOfStock(p.name) && p.name.toLowerCase().includes(filterText.toLowerCase()));
                        displayList.push(...filtered.map(p => ({
                            rawProduct: p,
                            name: p.name,
                            price: Number(p.price) || 0,
                            unit: p.unit || 'per unit',
                            payoutRate: p.payoutRate,
                            imageData: p.imageData,
                            isNewStock: p.isNewStock,
                            isOldStock: p.isOldStock,
                            dateAdded: p.dateAdded
                        })));
                    }
                    if (activeTab === 'all' || activeTab === 'default') {
                        const filtered = products.filter(p => !p.isSpecial && !p.isCustom && !p.isFlexible && !p.cleared && !p.isDeleted && !p.isHidden && !window.checkProductOutOfStock(p.name) && p.name.toLowerCase().includes(filterText.toLowerCase()));
                        filtered.forEach(p => {
                            displayList.push({
                                rawProduct: p,
                                name: p.name,
                                price: Number(p.price) || 0,
                                unit: p.unit || 'per unit',
                                payoutRate: p.payoutRate,
                                imageData: p.imageData,
                                isNewStock: p.isNewStock,
                                isOldStock: p.isOldStock,
                                dateAdded: p.dateAdded
                            });
                        });
                    }
                    if (activeTab === 'all' || activeTab === 'flexible') {
                        const filtered = products.filter(p => p.isFlexible && !p.isSpecial && !p.cleared && !p.isDeleted && !p.isHidden && !window.checkProductOutOfStock(p.name) && p.name.toLowerCase().includes(filterText.toLowerCase()));
                        filtered.forEach(p => {
                            displayList.push({ 
                                rawProduct: p,
                                name: p.name, 
                                price: 'Flexible Price', 
                                unit: 'Multiple Options', 
                                payoutRate: p.payoutRate, 
                                imageData: p.imageData, 
                                isNewStock: p.isNewStock, 
                                isOldStock: p.isOldStock, 
                                dateAdded: p.dateAdded 
                            });
                        });
                    }
                    if (activeTab === 'all' || activeTab === 'special') {
                        const filtered = products.filter(p => p.isSpecial && !p.cleared && !p.isDeleted && !p.isHidden && !window.checkProductOutOfStock(p.name) && p.name.toLowerCase().includes(filterText.toLowerCase()));
                        filtered.forEach(p => {
                            displayList.push({ 
                                rawProduct: p,
                                name: p.name, 
                                price: 'Select Options', 
                                unit: 'Multiple Options', 
                                payoutRate: p.payoutRate, 
                                imageData: p.imageData, 
                                isNewStock: p.isNewStock, 
                                isOldStock: p.isOldStock, 
                                dateAdded: p.dateAdded 
                            });
                        });
                    }

                    // EMPTY STATE: If no products exist or none match search
                    if (displayList.length === 0) {
                        const isSearching = filterText.length > 0;
                        renderedHTML = `
                            <div class="empty-product-state" style="padding: 60px 20px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                                <div class="empty-icon-wrapper" style="width: 100px; height: 100px; background: #f0f4f8; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 24px; box-shadow: 0 10px 25px rgba(27, 38, 59,0.1);">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="m7.5 4.27 9 5.15"></path>
                                        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path>
                                        <path d="m3.3 7 8.7 5 8.7-5"></path>
                                        <path d="M12 22V12"></path>
                                    </svg>
                                </div>
                                <h3 style="color: #333; font-size: 1.4rem; font-weight: 800; margin-bottom: 12px;">${isSearching ? "No Matches Found" : "Restocking Soon!"}</h3>
                                <p style="color: #666; font-size: 1rem; line-height: 1.6; max-width: 280px; margin: 0 auto;">
                                    ${isSearching ? "We couldn't find any products matching your search. Try a different keyword!" : "Our shelves are currently being updated. Check back shortly for premium quality items!"}
                                </p>
                            </div>
                        `;
                    } else {
                        const payoutEnabled = localStorage.getItem('nd_payout_enabled') === 'true';
                        const globalPayoutRate = parseFloat(localStorage.getItem('nd_payout_rate') || '2');
                        const actualYear = new Date().getFullYear();
                        const actualMonth = new Date().getMonth();

                        renderedHTML = displayList.map((item, index) => {
                            const currentRate = item.payoutRate !== undefined ? parseFloat(item.payoutRate) : globalPayoutRate;
                            let payoutHTML = '';
                            if (item.rawProduct && item.rawProduct.isCustom) {
                                payoutHTML = '';
                            } else if (typeof item.price === 'number') {
                                const payout = item.price * (currentRate / 100);
                                const formattedPayout = Number.isInteger(payout) ? payout : payout.toFixed(2);
                                payoutHTML = payoutEnabled ? `
                                        <div class="product-info-right">
                                            <div class="product-payout-amount">+\u20a6${formattedPayout}</div>
                                            <div class="product-payout-desc">${currentRate}%</div>
                                        </div>
                                ` : '';
                            } else {
                                payoutHTML = '';
                            }


                            const imageHtml = item.imageData ? 
                                `<img src="${item.imageData}" alt="${item.name}" onclick="event.stopPropagation(); if(typeof window.openImageViewer === 'function') window.openImageViewer('${item.imageData}')" style="cursor:zoom-in;">` : 
                                `<div class="product-img-placeholder"><svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></div>`;
                            
                            let badges = '';
                            const pDate = item.dateAdded ? new Date(item.dateAdded) : null;
                            const isCurrentMonth = pDate && pDate.getFullYear() === actualYear && pDate.getMonth() === actualMonth;
                            const showNew = false; // item.isNewStock && isCurrentMonth;
                            const showOld = false; // item.isOldStock || (item.isNewStock && !isCurrentMonth);
                            
                            // Badges removed for user side as requested
                            // if (showNew) badges += '<span style="background: rgba(16, 185, 129, 0.9); color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; font-weight: 800; backdrop-filter: blur(2px);">NEW</span>';
                            // if (showOld) badges += '<span style="background: rgba(245, 158, 11, 0.9); color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; font-weight: 800; backdrop-filter: blur(2px);">OLD</span>';

                            const productDataStr = encodeURIComponent(JSON.stringify(item.rawProduct || {}));
                            const priceDisplay = typeof item.price === 'number' ? '\u20a6' + Math.round(item.price).toLocaleString() : item.price;

                            return `
                                <div class="product-card" data-product="${productDataStr}">
                                    <div class="product-img-wrapper" style="position: relative;">
                                        ${imageHtml}
                                        ${badges ? `<div class="product-badges-container">${badges}</div>` : ''}
                                    </div>
                                    <div class="product-info-wrapper">
                                        <div class="product-info-left">
                                            <div class="product-name">${item.name}</div>
                                            <div class="product-price-row">
                                                <span class="product-price-amount" data-price="${typeof item.price === 'number' ? item.price : ''}">${priceDisplay}</span> 
                                                <span class="product-price-unit">${item.unit}</span>
                                            </div>
                                        </div>
                                        ${payoutHTML}
                                    </div>
                                </div>
                            `;
                        }).join('');
                    }
                    
                    // Only update DOM when HTML actually changes to avoid blinking
                    if (renderedHTML !== lastRenderedProductsHtml) {
                        const scrollEl = window.innerWidth < 1024 ? document.getElementById('product-container') : window;
                        const scrollPos = window.innerWidth < 1024 ? (scrollEl ? scrollEl.scrollTop : 0) : window.scrollY;

                        if (scrollEl) dynamicListContainer.style.minHeight = dynamicListContainer.offsetHeight + 'px';
                        dynamicListContainer.innerHTML = renderedHTML;
                        lastRenderedProductsHtml = renderedHTML;

                        if (scrollEl) {
                            if (window.innerWidth < 1024) scrollEl.scrollTop = scrollPos;
                            else scrollEl.scrollTo(0, scrollPos);

                            setTimeout(() => {
                                if (window.innerWidth < 1024) scrollEl.scrollTop = scrollPos;
                                else scrollEl.scrollTo(0, scrollPos);
                                dynamicListContainer.style.minHeight = '';
                            }, 10);
                        }
                    }
                }

                // Initial Render
                renderDynamicProducts();

                // Tab Switch Logic
                const tabBtns = document.querySelectorAll('.up-tab-btn');
                const searchFilterContainer = document.querySelector('.search-filter-container');
                
                tabBtns.forEach(btn => {
                    btn.addEventListener('click', () => {
                        tabBtns.forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        activeTab = btn.dataset.tab;
                        
                        // Show search + filter on ALL tabs now
                        if (searchFilterContainer) searchFilterContainer.style.display = '';
                        if (searchInput) searchInput.value = '';
                        
                        renderDynamicProducts('');
                    });
                });

                // Prevent the main slider from swiping when interacting with category tabs
                const categoriesContainer = document.querySelector('.user-product-tabs');
                if (categoriesContainer) {
                    categoriesContainer.addEventListener('touchstart', (e) => {
                        e.stopPropagation();
                    }, { passive: true });

                    categoriesContainer.addEventListener('touchmove', (e) => {
                        e.stopPropagation();
                    }, { passive: true });
                }

                window.refreshProducts = function() {
                    renderDynamicProducts(searchInput ? searchInput.value : '');
                };

                // Search Listeners
                if (searchInput && searchWrapper && filterBtn) {
                    searchInput.addEventListener('focus', () => {
                        searchWrapper.classList.add('focused');
                        filterBtn.classList.add('hidden');
                    });

                    searchInput.addEventListener('blur', () => {
                        setTimeout(() => {
                            searchWrapper.classList.remove('focused');
                            filterBtn.classList.remove('hidden');
                        }, 100);
                    });

                    // Real-time search functionality hooked into dynamic rendering
                    searchInput.addEventListener('input', (e) => {
                        renderDynamicProducts(e.target.value);
                    });
                }

                // Re-render when tab is switched (to catch changes made in Admin)
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.attributeName === 'style' && container.style.display !== 'none') {
                            renderDynamicProducts(searchInput ? searchInput.value : '');
                        }
                    });
                });
                observer.observe(container, { attributes: true });

            })
            .catch(error => {
                console.warn('Could not fetch product.html', error);
                container.innerHTML = '<div class="product-page-wrapper"><h2 class="product-title">Available Product</h2></div>';
            });
    }
    return Promise.resolve();
};

document.addEventListener('DOMContentLoaded', () => {
    window.loadProductTab();
});





