window.openTopUpModal = function(productName) {
    if (!document.getElementById('addRestockModal')) {
        if (window.showGlobalRefreshLoader) window.showGlobalRefreshLoader();
        fetch('menu-buttons/restock/restock.html')
            .then(res => res.text())
            .then(html => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const newModal = doc.getElementById('addRestockModal');
                if (newModal) {
                    document.getElementById('modal-container').appendChild(newModal);
                }
                if (window.hideGlobalRefreshLoader) window.hideGlobalRefreshLoader();
                setTimeout(() => {
                    _triggerTopUpFlow(productName);
                }, 100);
            });
    } else {
        setTimeout(() => {
            _triggerTopUpFlow(productName);
        }, 50);
    }
};

window._triggerTopUpFlow = function(productName) {
    const modal = document.getElementById('addRestockModal');
    if (!modal) return;

    // 1. Fetch product FIRST
    const products = JSON.parse(localStorage.getItem('nd_products_data') || '[]');
    const p = products.find(x => (x.id ? x.id === productName : x.name === productName) && !x.isDeleted);
    if (!p) {
        // Fallback: search by name if productName might be a name not an id
        const pByName = products.find(x => x.name === productName && !x.isDeleted);
        if (!pByName) {
            alert("Product not found.");
            return;
        }
        window._currentTopUpProduct = pByName;
    } else {
        window._currentTopUpProduct = p;
    }
    const pResolved = window._currentTopUpProduct;

    // 2. Set header to "Top Up Stock" BEFORE showing
    const header = modal.querySelector('.admin-modal-header h3');
    if (header) header.textContent = 'Top Up Stock';

    // 3. Hide type switch toggle
    const typeSwitchGroup = document.getElementById('rsTypeSpecialBtn')?.parentElement;
    if (typeSwitchGroup) typeSwitchGroup.style.display = 'none';

    // 4. Hide 'Pre-fill from Existing' dropdowns
    ['rsImportDropdownWrapper', 'rsSpecImportDropdownWrapper', 'rsCustomImportDropdownWrapper'].forEach(id => {
        const wrap = document.getElementById(id);
        if (wrap) {
            const fg = wrap.closest('.form-group');
            if (fg) fg.style.display = 'none';
        }
    });

    // 6. Directly show/hide the correct form (NO dependency on type button listeners)
    const specialForm = document.getElementById('rsSpecialProductForm');
    const defaultForm = document.getElementById('rsDefaultProductForm');
    const customForm = document.getElementById('rsCustomProductForm');
    const flexForm = document.getElementById('rsFlexibleProductForm');

    // Hide all forms first
    if (specialForm) specialForm.style.display = 'none';
    if (defaultForm) defaultForm.style.display = 'none';
    if (customForm) customForm.style.display = 'none';
    if (flexForm) flexForm.style.display = 'none';

    // Show the correct one and populate
    if (pResolved.isSpecial) {
        if (specialForm) specialForm.style.display = 'block';
        // IMPORTANT: Init listeners first so calculations work
        if (typeof _initRestockProductForm === 'function') _initRestockProductForm();
        _populateSpecialTopUp(pResolved);
    } else if (pResolved.isCustom) {
        if (customForm) customForm.style.display = 'block';
        // IMPORTANT: Init listeners first so calculations work
        if (typeof window._initRsCustomForm === 'function') window._initRsCustomForm();
        _populateCustomTopUp(pResolved);
    } else if (pResolved.isFlexible) {
        if (flexForm) flexForm.style.display = 'block';
        // IMPORTANT: Init listeners first so calculations work
        if (typeof window._initRsFlexForm === 'function') window._initRsFlexForm();
        _populateFlexTopUp(pResolved);
    } else {
        if (defaultForm) defaultForm.style.display = 'block';
        // IMPORTANT: Init listeners first so calculations work
        if (typeof _initRestockProductForm === 'function') _initRestockProductForm();
        _populateDefaultTopUp(pResolved);
    }

    // 7. NOW show the modal — everything is already customized
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
};

function _injectProcessTopUpBtn(formId, oldSubBtnId, handler) {
    const oldSubBtn = document.getElementById(oldSubBtnId);
    if (!oldSubBtn) return;
    // Hide standard buttons
    oldSubBtn.style.display = 'none';

    // Create or show custom top up button
    let topUpBtn = document.getElementById(oldSubBtnId + '_TopUp');
    if (!topUpBtn) {
        topUpBtn = document.createElement('button');
        topUpBtn.id = oldSubBtnId + '_TopUp';
        topUpBtn.className = 'admin-modern-btn';
        topUpBtn.style.flex = '1';
        topUpBtn.style.backgroundColor = '#10b981';
        topUpBtn.style.borderColor = '#10b981';
        topUpBtn.style.color = '#fff';
        topUpBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px;"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg> Process Top-Up';
        oldSubBtn.parentNode.insertBefore(topUpBtn, oldSubBtn.nextSibling);
    } else {
        topUpBtn.style.display = 'flex';
    }
    
    // Clone trick to remove all previous listeners
    const newBtn = topUpBtn.cloneNode(true);
    topUpBtn.parentNode.replaceChild(newBtn, topUpBtn);
    
    newBtn.addEventListener('click', handler);
}

function _logTopUpExpense(name, cost) {
    if (cost > 0) {
        let exps = JSON.parse(localStorage.getItem('nd_expenses_notebook') || '[]');
        const now = new Date();
        const mths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        let hrs = now.getHours(); const am = hrs >= 12 ? 'pm' : 'am'; hrs = hrs % 12 || 12;
        exps.push({
            id: 'exp_' + Date.now() + Math.random().toString(36).substr(2,9),
            title: `Restock Top-Up: ${name}`,
            amount: cost,
            dateStr: `${mths[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()} · ${hrs}:${now.getMinutes().toString().padStart(2,'0')} ${am}`,
            timestamp: now.toISOString(),
            year: now.getFullYear(),
            monthIdx: now.getMonth()
        });
        localStorage.setItem('nd_expenses_notebook', JSON.stringify(exps));
    }
}

// ----------------------------------------------------
// Special Product (Analytical)
// ----------------------------------------------------
// ----------------------------------------------------
// Special Product (Analytical)
// ----------------------------------------------------
function _populateSpecialTopUp(p) {
    const s = p.structure || {};
    
    const nameEl = document.getElementById('rsSpecProductName');
    if (nameEl) {
        nameEl.value = p.name || '';
        nameEl.readOnly = true;
        nameEl.style.backgroundColor = '#f1f5f9';
        nameEl.style.color = '#475569';
    }

    // 1. Inject Tier Selector for Top Up
    let formContainer = document.getElementById('rsSpecialProductForm');
    let tierSelector = document.getElementById('topUpTierSelector');
    if (!tierSelector) {
        tierSelector = document.createElement('div');
        tierSelector.id = 'topUpTierSelector';
        tierSelector.innerHTML = `
            <div class="form-group" style="margin-bottom: 24px; padding: 16px; background: #f0fdfa; border: 1px solid #14b8a6; border-radius: 12px;">
                <label style="color: #0f766e; font-weight: 800; margin-bottom: 12px;">Select Which Container You Are Restocking</label>
                <div style="display: flex; gap: 10px;">
                    <label style="flex: 1; text-align: center; background: white; padding: 10px; border-radius: 8px; border: 2px solid #8b5cf6; cursor: pointer; transition: all 0.2s;" id="lblTopUpT1">
                        <input type="radio" name="topUpTier" value="1" checked style="display: none;">
                        <span style="font-weight: 700; color: #1e293b;">Container 1</span>
                    </label>
                    <label style="flex: 1; text-align: center; background: white; padding: 10px; border-radius: 8px; border: 2px solid #cbd5e1; cursor: pointer; transition: all 0.2s;" id="lblTopUpT2">
                        <input type="radio" name="topUpTier" value="2" style="display: none;">
                        <span style="font-weight: 700; color: #1e293b;">Container 2</span>
                    </label>
                    <label style="flex: 1; text-align: center; background: white; padding: 10px; border-radius: 8px; border: 2px solid #cbd5e1; cursor: pointer; transition: all 0.2s;" id="lblTopUpT3">
                        <input type="radio" name="topUpTier" value="3" style="display: none;">
                        <span style="font-weight: 700; color: #1e293b;">Container 3</span>
                    </label>
                </div>
            </div>
        `;
        // Insert right after the Item Name
        const nameGroup = nameEl.closest('.form-group');
        nameGroup.parentNode.insertBefore(tierSelector, nameGroup.nextSibling);

        const radios = tierSelector.querySelectorAll('input[type="radio"]');
        const labels = [
            document.getElementById('lblTopUpT1'),
            document.getElementById('lblTopUpT2'),
            document.getElementById('lblTopUpT3')
        ];
        
        // 1.5 Inject dynamic inputs into Custard and Cup blocks
        const custardBlock = document.getElementById('rsSpecCustardTitle') ? document.getElementById('rsSpecCustardTitle').closest('div[style*="border-radius: 12px"]') : null;
        const cupBlock = document.getElementById('rsSpecCupTitle') ? document.getElementById('rsSpecCupTitle').closest('div[style*="border-radius: 12px"]') : null;
        
        if (custardBlock && !document.getElementById('rsSpecCustardTopUpInputs')) {
            const custardInputs = document.createElement('div');
            custardInputs.id = 'rsSpecCustardTopUpInputs';
            custardInputs.style.cssText = 'display:none; flex-direction: column; margin-bottom: 12px; background: #f0fdfa; padding: 12px; border-radius: 8px; border: 1px dashed #14b8a6;';
            custardInputs.innerHTML = `
                <div style="display: flex; gap: 10px; width: 100%;">
                    <div class="form-group" style="flex: 1; margin-bottom: 0;">
                        <label style="color: #0f766e;"><span id="lblDynCustardCost">Container 2</span> Purchased Cost (₦)</label>
                        <input type="number" id="rsSpecCustardTopUpCost" class="form-input" placeholder="e.g. 5000" min="0" step="0.01">
                    </div>
                    <div class="form-group" style="flex: 1; margin-bottom: 0;">
                        <label style="color: #0f766e;">Quantity Bought</label>
                        <input type="number" id="rsSpecCustardTopUpQty" class="form-input" placeholder="1" value="1" min="1" step="1">
                    </div>
                </div>
                <div style="font-size: 0.95rem; color: #1e293b; margin-top: 12px; font-weight: 700; background: #f0fdf4; padding: 6px 10px; border-radius: 6px; display: inline-block; border: 1px solid #bbf7d0; align-self: flex-start;">
                    Total Cost: <span id="rsSpecCustardTopUpTotalCostVal" style="color: #16a34a;">₦0</span>
                </div>
            `;
            const cGroup = document.getElementById('rsSpecCustardsPerBag').closest('.form-group');
            cGroup.parentNode.insertBefore(custardInputs, cGroup.nextSibling);

            const updateCustardTotal = () => {
                const cost = parseFloat(document.getElementById('rsSpecCustardTopUpCost').value) || 0;
                const qty = parseInt(document.getElementById('rsSpecCustardTopUpQty').value) || 1;
                const totalEl = document.getElementById('rsSpecCustardTopUpTotalCostVal');
                if (totalEl) totalEl.innerText = '₦' + (cost * qty).toLocaleString(undefined, {maximumFractionDigits:2});
            };

            document.getElementById('rsSpecCustardTopUpCost').addEventListener('input', (e) => {
                const cost = parseFloat(e.target.value) || 0;
                const cpb = parseInt(document.getElementById('rsSpecCustardsPerBag').value) || 1;
                const bagCostEl = document.getElementById('rsSpecBagCost');
                if (bagCostEl) {
                    bagCostEl.value = cost * cpb;
                    bagCostEl.dispatchEvent(new Event('input', { bubbles: true }));
                }
                updateCustardTotal();
            });
            document.getElementById('rsSpecCustardTopUpQty').addEventListener('input', updateCustardTotal);
        }

        if (cupBlock && !document.getElementById('rsSpecCupTopUpInputs')) {
            const cupInputs = document.createElement('div');
            cupInputs.id = 'rsSpecCupTopUpInputs';
            cupInputs.style.cssText = 'display:none; flex-direction: column; margin-bottom: 12px; background: #f0fdfa; padding: 12px; border-radius: 8px; border: 1px dashed #14b8a6;';
            cupInputs.innerHTML = `
                <div style="display: flex; gap: 10px; width: 100%;">
                    <div class="form-group" style="flex: 1; margin-bottom: 0;">
                        <label style="color: #0f766e;"><span id="lblDynCupCost">Container 3</span> Purchased Cost (₦)</label>
                        <input type="number" id="rsSpecCupTopUpCost" class="form-input" placeholder="e.g. 500" min="0" step="0.01">
                    </div>
                    <div class="form-group" style="flex: 1; margin-bottom: 0;">
                        <label style="color: #0f766e;">Quantity Bought</label>
                        <input type="number" id="rsSpecCupTopUpQty" class="form-input" placeholder="1" value="1" min="1" step="1">
                    </div>
                </div>
                <div style="font-size: 0.95rem; color: #1e293b; margin-top: 12px; font-weight: 700; background: #f0fdf4; padding: 6px 10px; border-radius: 6px; display: inline-block; border: 1px solid #bbf7d0; align-self: flex-start;">
                    Total Cost: <span id="rsSpecCupTopUpTotalCostVal" style="color: #16a34a;">₦0</span>
                </div>
            `;
            const cGroup = document.getElementById('rsSpecCupsPerCustard').closest('.form-group');
            cGroup.parentNode.insertBefore(cupInputs, cGroup.nextSibling);

            const updateCupTotal = () => {
                const cost = parseFloat(document.getElementById('rsSpecCupTopUpCost').value) || 0;
                const qty = parseInt(document.getElementById('rsSpecCupTopUpQty').value) || 1;
                const totalEl = document.getElementById('rsSpecCupTopUpTotalCostVal');
                if (totalEl) totalEl.innerText = '₦' + (cost * qty).toLocaleString(undefined, {maximumFractionDigits:2});
            };

            document.getElementById('rsSpecCupTopUpCost').addEventListener('input', (e) => {
                const cost = parseFloat(e.target.value) || 0;
                const cpb = parseInt(document.getElementById('rsSpecCustardsPerBag').value) || 1;
                const cpc = parseInt(document.getElementById('rsSpecCupsPerCustard').value) || 1;
                const bagCostEl = document.getElementById('rsSpecBagCost');
                if (bagCostEl) {
                    bagCostEl.value = cost * cpb * cpc;
                    bagCostEl.dispatchEvent(new Event('input', { bubbles: true }));
                }
                updateCupTotal();
            });
            document.getElementById('rsSpecCupTopUpQty').addEventListener('input', updateCupTotal);
        }

        radios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                const val = e.target.value;
                labels.forEach(l => l.style.borderColor = '#cbd5e1');
                document.getElementById('lblTopUpT' + val).style.borderColor = '#8b5cf6';

                // We change labels for Cost and Quantity based on selection
                const bagCostLbl = document.getElementById('lblRsSpecBagCost');
                const bagBlock = document.getElementById('rsSpecBagCost') ? document.getElementById('rsSpecBagCost').closest('div[style*="border-radius: 12px"]') : null;

                const custInputs = document.getElementById('rsSpecCustardTopUpInputs');
                const cupInputs = document.getElementById('rsSpecCupTopUpInputs');

                // Get structure groups to hide
                const custStructGroup = document.getElementById('rsSpecCustardsPerBag') ? document.getElementById('rsSpecCustardsPerBag').closest('.form-group') : null;
                const cupStructGroup = document.getElementById('rsSpecCupsPerCustard') ? document.getElementById('rsSpecCupsPerCustard').closest('.form-group') : null;

                const currentBagCost = parseFloat(document.getElementById('rsSpecBagCost')?.value) || 0;
                const cpb = parseInt(document.getElementById('rsSpecCustardsPerBag')?.value) || 1;
                const cpc = parseInt(document.getElementById('rsSpecCupsPerCustard')?.value) || 1;

                if (val === "1") {
                    if (bagCostLbl) bagCostLbl.innerText = document.getElementById('rsSpecBagTitle')?.value || "Container 1";
                    if (bagBlock) bagBlock.style.display = 'block';
                    if (custardBlock) custardBlock.style.display = 'block';
                    if (cupBlock) cupBlock.style.display = 'block';
                    if (custInputs) custInputs.style.display = 'none';
                    if (cupInputs) cupInputs.style.display = 'none';
                    if (custStructGroup) custStructGroup.style.display = 'block';
                    if (cupStructGroup) cupStructGroup.style.display = 'block';
                } else if (val === "2") {
                    if (bagBlock) bagBlock.style.display = 'none';
                    if (custardBlock) custardBlock.style.display = 'block';
                    if (cupBlock) cupBlock.style.display = 'block';
                    if (custInputs) custInputs.style.display = 'flex';
                    if (cupInputs) cupInputs.style.display = 'none';
                    
                    if (custStructGroup) custStructGroup.style.display = 'none';
                    if (cupStructGroup) cupStructGroup.style.display = 'block';
                    
                    const custTopUpCost = document.getElementById('rsSpecCustardTopUpCost');
                    if (custTopUpCost && !custTopUpCost.value) {
                        custTopUpCost.value = parseFloat((currentBagCost / cpb).toFixed(2));
                        custTopUpCost.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                    if (document.getElementById('rsSpecCustardTopUpQty')) {
                        document.getElementById('rsSpecCustardTopUpQty').dispatchEvent(new Event('input', { bubbles: true }));
                    }
                } else if (val === "3") {
                    if (bagBlock) bagBlock.style.display = 'none';
                    if (custardBlock) custardBlock.style.display = 'none';
                    if (cupBlock) cupBlock.style.display = 'block';
                    if (custInputs) custInputs.style.display = 'none';
                    if (cupInputs) cupInputs.style.display = 'flex';
                    
                    if (cupStructGroup) cupStructGroup.style.display = 'none';
                    
                    const cupTopUpCost = document.getElementById('rsSpecCupTopUpCost');
                    if (cupTopUpCost && !cupTopUpCost.value) {
                        cupTopUpCost.value = parseFloat((currentBagCost / (cpb * cpc)).toFixed(2));
                        cupTopUpCost.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                    if (document.getElementById('rsSpecCupTopUpQty')) {
                        document.getElementById('rsSpecCupTopUpQty').dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }
            });
        });
    }

    // Set initial values — pre-fill cost but reset quantity
    if(document.getElementById('rsSpecBagCost')) document.getElementById('rsSpecBagCost').value = p.cost || '';
    if(document.getElementById('rsSpecBagQuantity')) document.getElementById('rsSpecBagQuantity').value = 1;
    if(document.getElementById('rsSpecCustardsPerBag')) document.getElementById('rsSpecCustardsPerBag').value = s.custardsPerBag || '';
    if(document.getElementById('rsSpecCupsPerCustard')) document.getElementById('rsSpecCupsPerCustard').value = s.cupsPerCustard || '';
    
    const pTypes = ['bag', 'custard', 'cup'];
    pTypes.forEach(t => {
        const conf = p.packTypes && p.packTypes[t] ? p.packTypes[t] : {};
        const T = t.charAt(0).toUpperCase() + t.slice(1);
        if(document.getElementById('rsSpec'+T+'Title')) document.getElementById('rsSpec'+T+'Title').value = conf.title || '';
        if(document.getElementById('rsSpec'+T+'Profit')) document.getElementById('rsSpec'+T+'Profit').value = s[t+'Profit'] || '';
        if(document.getElementById('rsSpec'+T+'ProfitPercent')) document.getElementById('rsSpec'+T+'ProfitPercent').value = s[t+'ProfitPercent'] || '';
        if(document.getElementById('rsSpec'+T+'Price')) document.getElementById('rsSpec'+T+'Price').value = conf.price || '';
    });
    
    // Auto-update tier selector texts
    const updateTiers = () => {
        const t1 = document.getElementById('rsSpecBagTitle')?.value || 'Container 1';
        const t2 = document.getElementById('rsSpecCustardTitle')?.value || 'Container 2';
        const t3 = document.getElementById('rsSpecCupTitle')?.value || 'Container 3';

        if(document.getElementById('lblTopUpT1')) document.getElementById('lblTopUpT1').querySelector('span').innerText = t1;
        if(document.getElementById('lblTopUpT2')) document.getElementById('lblTopUpT2').querySelector('span').innerText = t2;
        if(document.getElementById('lblTopUpT3')) document.getElementById('lblTopUpT3').querySelector('span').innerText = t3;

        if(document.getElementById('lblDynCustardCost')) document.getElementById('lblDynCustardCost').innerText = t2;
        if(document.getElementById('lblDynCupCost')) document.getElementById('lblDynCupCost').innerText = t3;
    };
    updateTiers();

    const triggers = ['rsSpecBagCost', 'rsSpecBagQuantity', 'rsSpecBagProfit', 'rsSpecCustardsPerBag', 'rsSpecCustardProfit', 'rsSpecCupsPerCustard', 'rsSpecCupProfit', 'rsSpecBagTitle', 'rsSpecCustardTitle', 'rsSpecCupTitle'];
    triggers.forEach(t => {
        const el = document.getElementById(t);
        if(el) {
            el.addEventListener('input', updateTiers);
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }
    });

    _injectProcessTopUpBtn('rsSpecialProductForm', 'rsSpecProductSubmitBtn', () => {
        const tier = document.querySelector('input[name="topUpTier"]:checked')?.value || "1";
        
        let newTotalCost = 0;
        let fractionalBagsToAdd = 0;
        let inputQtyForHistory = 1;
        
        const custardsPerBag = parseInt(document.getElementById('rsSpecCustardsPerBag').value) || 1;
        const cupsPerCustard = parseInt(document.getElementById('rsSpecCupsPerCustard').value) || 1;

        if (tier === "1") {
            const inputCost = parseFloat(document.getElementById('rsSpecBagCost').value) || 0;
            const inputQty = parseInt(document.getElementById('rsSpecBagQuantity').value) || 1;
            newTotalCost = inputCost * inputQty;
            fractionalBagsToAdd = inputQty;
            inputQtyForHistory = inputQty;
        } else if (tier === "2") {
            const inputCost = parseFloat(document.getElementById('rsSpecCustardTopUpCost').value) || 0;
            const inputQty = parseInt(document.getElementById('rsSpecCustardTopUpQty').value) || 1;
            newTotalCost = inputCost * inputQty;
            fractionalBagsToAdd = inputQty / custardsPerBag;
            inputQtyForHistory = inputQty;
        } else if (tier === "3") {
            const inputCost = parseFloat(document.getElementById('rsSpecCupTopUpCost').value) || 0;
            const inputQty = parseInt(document.getElementById('rsSpecCupTopUpQty').value) || 1;
            newTotalCost = inputCost * inputQty;
            fractionalBagsToAdd = inputQty / (custardsPerBag * cupsPerCustard);
            inputQtyForHistory = inputQty;
        }
        
        let products = JSON.parse(localStorage.getItem('nd_products_data') || '[]');
        // Find by unique id first (for new products), fallback to name+dateAdded for legacy
        const existingIdx = p.id
            ? products.findIndex(x => x.id === p.id)
            : products.findIndex(x => x.name === p.name && x.dateAdded === p.dateAdded);
        if (existingIdx !== -1) {
            const old = products[existingIdx];
            old.purchaseCost = (parseFloat(old.purchaseCost) || 0) + newTotalCost;
            
            // Adjust base cost according to tier to reflect a 'Bag' Cost accurately
            const baseBagCost = parseFloat(document.getElementById('rsSpecBagCost').value) || 0;
            old.cost = baseBagCost;

            old.boughtQuantity = (parseFloat(old.boughtQuantity) || 0) + fractionalBagsToAdd;
            
            const bagPrice = parseFloat(document.getElementById('rsSpecBagPrice').value) || old.cost;
            old.price = bagPrice;
            old.profit = parseFloat(document.getElementById('rsSpecBagProfit').value) || 0;
            
            const bagTitle = document.getElementById('rsSpecBagTitle')?.value.trim() || 'Container 1';
            const custTitle = document.getElementById('rsSpecCustardTitle')?.value.trim() || 'Container 2';
            const cupTitle = document.getElementById('rsSpecCupTitle')?.value.trim() || 'Container 3';

            old.unit = 'per ' + bagTitle.toLowerCase();
            old.bulkUnit = bagTitle;
            
            old.structure = {
                custardsPerBag: custardsPerBag,
                cupsPerCustard: cupsPerCustard,
                bagProfit: parseFloat(document.getElementById('rsSpecBagProfit').value) || 0,
                bagProfitPercent: parseFloat(document.getElementById('rsSpecBagProfitPercent').value) || 0,
                custardProfit: parseFloat(document.getElementById('rsSpecCustardProfit').value) || 0,
                custardProfitPercent: parseFloat(document.getElementById('rsSpecCustardProfitPercent').value) || 0,
                cupProfit: parseFloat(document.getElementById('rsSpecCupProfit').value) || 0,
                cupProfitPercent: parseFloat(document.getElementById('rsSpecCupProfitPercent').value) || 0
            };
            old.packTypes = {
                bag: { price: bagPrice, title: bagTitle },
                custard: { price: parseFloat(document.getElementById('rsSpecCustardPrice').value) || 0, title: custTitle },
                cup: { price: parseFloat(document.getElementById('rsSpecCupPrice').value) || 0, title: cupTitle }
            };

            old.topUpHistory = old.topUpHistory || [];
            old.topUpHistory.push({ cost: newTotalCost, qty: inputQtyForHistory, tier: tier, date: new Date().toISOString() });

            localStorage.setItem('nd_products_data', JSON.stringify(products));
            
            closeAddRestockModal();
            setTimeout(() => {
                if (typeof renderRestockList === 'function') renderRestockList();
                if (typeof window.reloadAdminProducts === 'function') window.reloadAdminProducts();
                if (typeof window.renderProductsGlobal === 'function') window.renderProductsGlobal();
            }, 100);
        }
    });
}

// ----------------------------------------------------
// Custom Product
// ----------------------------------------------------
function _populateCustomTopUp(p) {
    const nameEl = document.getElementById('rsCustomProductName');
    if (nameEl) {
        nameEl.value = p.name || '';
        nameEl.readOnly = true;
        nameEl.style.backgroundColor = '#f1f5f9';
        nameEl.style.color = '#475569';
    }

    const bulkTrig = document.querySelector('#rsCustomBulkDropdownTrigger .trigger-text');
    if (bulkTrig) bulkTrig.textContent = p.bulkUnit || 'Carton';
    const bulkHidden = document.getElementById('rsCustomBulkUnitSelect');
    if (bulkHidden) bulkHidden.value = p.bulkUnit || 'Carton';
    if(document.getElementById('rsCustomBulkDropdownMenu')) {
        document.getElementById('rsCustomBulkDropdownMenu').querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('active'));
        const opt = document.getElementById('rsCustomBulkDropdownMenu').querySelector(`[data-value="${p.bulkUnit || 'Carton'}"]`);
        if(opt) opt.classList.add('active');
    }

    const unitTrig = document.querySelector('#rsCustomUnitDropdownTrigger .trigger-text');
    if (unitTrig) unitTrig.textContent = p.unit || 'per piece';
    const unitHidden = document.getElementById('rsCustomNewProductUnit');
    if (unitHidden) unitHidden.value = p.unit || 'per piece';
    if(document.getElementById('rsCustomUnitDropdownMenu')) {
        document.getElementById('rsCustomUnitDropdownMenu').querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('active'));
        const opt = document.getElementById('rsCustomUnitDropdownMenu').querySelector(`[data-value="${p.unit || 'per piece'}"]`);
        if(opt) opt.classList.add('active');
    }

    if(document.getElementById('rsCustomProductPurchaseCost')) {
        document.getElementById('rsCustomProductPurchaseCost').value = p.cost || '';
    }
    if(document.getElementById('rsCustomProductPieces')) document.getElementById('rsCustomProductPieces').value = p.pieces || 1;
    if(document.getElementById('rsCustomProductQuantity')) document.getElementById('rsCustomProductQuantity').value = 1;

    if(document.getElementById('rsCustomProductPrice')) {
        document.getElementById('rsCustomProductPrice').value = p.price || '';
    }

    // Triggers
    const triggers = ['rsCustomProductPurchaseCost', 'rsCustomProductPieces', 'rsCustomProductQuantity'];
    triggers.forEach(t => {
        const el = document.getElementById(t);
        if(el) el.dispatchEvent(new Event('input', { bubbles: true }));
    });

    _injectProcessTopUpBtn('rsCustomProductForm', 'rsCustomProductSubmitBtn', () => {
        const pCost = parseFloat(document.getElementById('rsCustomProductPurchaseCost').value) || 0;
        const qty = parseInt(document.getElementById('rsCustomProductQuantity').value) || 1;
        const newTotalCost = pCost * qty;
        const pcs = parseInt(document.getElementById('rsCustomProductPieces').value) || 1;
        
        let products = JSON.parse(localStorage.getItem('nd_products_data') || '[]');
        // Find by unique id first (for new products), fallback to name+dateAdded for legacy
        const existingIdx = p.id
            ? products.findIndex(x => x.id === p.id)
            : products.findIndex(x => x.name === p.name && x.dateAdded === p.dateAdded);
        if (existingIdx !== -1) {
            const old = products[existingIdx];
            old.purchaseCost = (parseFloat(old.purchaseCost) || 0) + newTotalCost;
            old.cost = pCost;
            old.bulkCost = pCost;
            old.pieces = pcs;
            old.boughtQuantity = (parseFloat(old.boughtQuantity) || 0) + qty;
            
            old.bulkUnit = document.getElementById('rsCustomBulkUnitSelect')?.value || old.bulkUnit;
            old.unit = document.getElementById('rsCustomNewProductUnit')?.value || old.unit;
            old.price = parseFloat(document.getElementById('rsCustomProductPrice')?.value) || old.price;
            
            old.topUpHistory = old.topUpHistory || [];
            old.topUpHistory.push({ cost: newTotalCost, qty: qty, date: new Date().toISOString() });

            localStorage.setItem('nd_products_data', JSON.stringify(products));

            closeAddRestockModal();
            setTimeout(() => {
                if (typeof renderRestockList === 'function') renderRestockList();
                if (typeof window.reloadAdminProducts === 'function') window.reloadAdminProducts();
                if (typeof window.renderProductsGlobal === 'function') window.renderProductsGlobal();
            }, 100);
        }
    });
}

// ----------------------------------------------------
// Default Product
// ----------------------------------------------------
function _populateDefaultTopUp(p) {
    const nameEl = document.getElementById('rsNewProductName');
    if (nameEl) {
        nameEl.value = p.name || '';
        nameEl.readOnly = true;
        nameEl.style.backgroundColor = '#f1f5f9';
        nameEl.style.color = '#475569';
    }

    const bulkTrig = document.querySelector('#rsBulkDropdownTrigger .trigger-text');
    if (bulkTrig) bulkTrig.textContent = p.bulkUnit || 'Carton';
    const bulkHidden = document.getElementById('rsBulkUnitSelect');
    if (bulkHidden) bulkHidden.value = p.bulkUnit || 'Carton';
    if(document.getElementById('rsBulkDropdownMenu')) {
        document.getElementById('rsBulkDropdownMenu').querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('active'));
        const opt = document.getElementById('rsBulkDropdownMenu').querySelector(`[data-value="${p.bulkUnit || 'Carton'}"]`);
        if(opt) opt.classList.add('active');
    }

    const unitTrig = document.querySelector('#rsUnitDropdownTrigger .trigger-text');
    if (unitTrig) unitTrig.textContent = p.unit || 'per piece';
    const unitHidden = document.getElementById('rsNewProductUnit');
    if (unitHidden) unitHidden.value = p.unit || 'per piece';
    if(document.getElementById('rsUnitDropdownMenu')) {
        document.getElementById('rsUnitDropdownMenu').querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('active'));
        const opt = document.getElementById('rsUnitDropdownMenu').querySelector(`[data-value="${p.unit || 'per piece'}"]`);
        if(opt) opt.classList.add('active');
    }

    if(document.getElementById('rsNewProductPurchaseCost')) {
        document.getElementById('rsNewProductPurchaseCost').value = (p.cost * (p.pieces || 1)) || '';
    }
    if(document.getElementById('rsNewProductPieces')) document.getElementById('rsNewProductPieces').value = p.pieces || 1;
    if(document.getElementById('rsNewProductQuantity')) document.getElementById('rsNewProductQuantity').value = 1;
    if(document.getElementById('rsNewProductProfit')) document.getElementById('rsNewProductProfit').value = p.profit || '';
    if(document.getElementById('rsNewProductProfitPercent')) document.getElementById('rsNewProductProfitPercent').value = p.profitPercent || '';
    if(document.getElementById('rsNewProductPrice')) document.getElementById('rsNewProductPrice').value = p.price || '';
    
    if(document.getElementById('rsNewProductWholesaleProfit')) document.getElementById('rsNewProductWholesaleProfit').value = p.wholesaleProfit || '';
    if(document.getElementById('rsNewProductWholesaleProfitPercent')) document.getElementById('rsNewProductWholesaleProfitPercent').value = p.wholesaleProfitPercent || '';
    if(document.getElementById('rsNewProductWholesalePrice')) document.getElementById('rsNewProductWholesalePrice').value = p.wholesalePrice || '';

    const triggers = ['rsNewProductPurchaseCost', 'rsNewProductPieces', 'rsNewProductQuantity', 'rsNewProductProfit', 'rsNewProductWholesaleProfit'];
    triggers.forEach(t => {
        const el = document.getElementById(t);
        if(el) el.dispatchEvent(new Event('input', { bubbles: true }));
    });

    _injectProcessTopUpBtn('rsDefaultProductForm', 'rsProductSubmitBtn', () => {
        const pCost = parseFloat(document.getElementById('rsNewProductPurchaseCost').value) || 0;
        const qty = parseInt(document.getElementById('rsNewProductQuantity').value) || 1;
        const newTotalCost = pCost * qty;
        const pcs = parseInt(document.getElementById('rsNewProductPieces').value) || 1;
        const price = parseFloat(document.getElementById('rsNewProductPrice').value) || 0;
        const profit = parseFloat(document.getElementById('rsNewProductProfit').value) || 0;
        const profitPct = parseFloat(document.getElementById('rsNewProductProfitPercent').value) || 0;

        let products = JSON.parse(localStorage.getItem('nd_products_data') || '[]');
        // Find by unique id first (for new products), fallback to name+dateAdded for legacy
        const existingIdx = p.id
            ? products.findIndex(x => x.id === p.id)
            : products.findIndex(x => x.name === p.name && x.dateAdded === p.dateAdded);
        if (existingIdx !== -1) {
            const old = products[existingIdx];
            old.purchaseCost = (parseFloat(old.purchaseCost) || 0) + newTotalCost;
            old.cost = pcs > 0 ? (pCost / pcs) : 0;
            old.pieces = pcs;
            old.boughtQuantity = (parseFloat(old.boughtQuantity) || 0) + qty;
            old.price = price;
            old.profit = profit;
            old.profitPercent = profitPct;
            
            old.wholesaleProfit = document.getElementById('rsNewProductWholesaleProfit') && document.getElementById('rsNewProductWholesaleProfit').value !== '' ? parseFloat(document.getElementById('rsNewProductWholesaleProfit').value) : old.wholesaleProfit;
            old.wholesaleProfitPercent = document.getElementById('rsNewProductWholesaleProfitPercent') && document.getElementById('rsNewProductWholesaleProfitPercent').value !== '' ? parseFloat(document.getElementById('rsNewProductWholesaleProfitPercent').value) : old.wholesaleProfitPercent;
            old.wholesalePrice = document.getElementById('rsNewProductWholesalePrice') && document.getElementById('rsNewProductWholesalePrice').value !== '' ? parseFloat(document.getElementById('rsNewProductWholesalePrice').value) : old.wholesalePrice;
            
            old.bulkUnit = document.getElementById('rsBulkUnitSelect')?.value || old.bulkUnit;
            old.unit = document.getElementById('rsNewProductUnit')?.value || old.unit;
            
            old.topUpHistory = old.topUpHistory || [];
            old.topUpHistory.push({ cost: newTotalCost, qty: qty, date: new Date().toISOString() });

            localStorage.setItem('nd_products_data', JSON.stringify(products));

            closeAddRestockModal();
            setTimeout(() => {
                if (typeof renderRestockList === 'function') renderRestockList();
                if (typeof window.reloadAdminProducts === 'function') window.reloadAdminProducts();
                if (typeof window.renderProductsGlobal === 'function') window.renderProductsGlobal();
            }, 100);
        }
    });
}

// ----------------------------------------------------
// Flexible Product
// ----------------------------------------------------
function _populateFlexTopUp(p) {
    const nameEl = document.getElementById('rsFlexProductName');
    if (nameEl) {
        nameEl.value = p.name || '';
        nameEl.readOnly = true;
        nameEl.style.backgroundColor = '#f1f5f9';
        nameEl.style.color = '#475569';
    }

    const s = p.structure || {};
    const pk = p.packTypes || {};
    
    if(document.getElementById('rsFlexC1Title')) document.getElementById('rsFlexC1Title').value = (pk.c1 && pk.c1.title) ? pk.c1.title : 'Container 1';
    if(document.getElementById('rsFlexC2Title')) document.getElementById('rsFlexC2Title').value = (pk.c2 && pk.c2.title) ? pk.c2.title : 'Container 2';
    if(document.getElementById('rsFlexC3Title')) document.getElementById('rsFlexC3Title').value = (pk.c3 && pk.c3.title) ? pk.c3.title : 'Container 3';

    if(document.getElementById('rsFlexC1Cost')) document.getElementById('rsFlexC1Cost').value = p.cost || '';
    if(document.getElementById('rsFlexC1Quantity')) document.getElementById('rsFlexC1Quantity').value = 1;
    if(document.getElementById('rsFlexC1Profit')) document.getElementById('rsFlexC1Profit').value = s.c1Profit || '';
    if(document.getElementById('rsFlexC1ProfitPercent')) document.getElementById('rsFlexC1ProfitPercent').value = s.c1ProfitPercent || '';

    if(document.getElementById('rsFlexC2Qty')) document.getElementById('rsFlexC2Qty').value = s.c2sPerC1 || 1;
    if(document.getElementById('rsFlexC2Profit')) document.getElementById('rsFlexC2Profit').value = s.c2Profit || '';
    if(document.getElementById('rsFlexC2ProfitPercent')) document.getElementById('rsFlexC2ProfitPercent').value = s.c2ProfitPercent || '';

    if(document.getElementById('rsFlexC3Qty')) document.getElementById('rsFlexC3Qty').value = s.c3sPerC2 || 1;

    // Triggers
    const triggers = ['rsFlexC1Title', 'rsFlexC2Title', 'rsFlexC3Title', 'rsFlexC1Cost', 'rsFlexC1Quantity', 'rsFlexC1Profit', 'rsFlexC2Qty', 'rsFlexC2Profit', 'rsFlexC3Qty'];
    triggers.forEach(t => {
        const el = document.getElementById(t);
        if(el) el.dispatchEvent(new Event('input', { bubbles: true }));
    });

    _injectProcessTopUpBtn('rsFlexibleProductForm', 'rsFlexProductSubmitBtn', () => {
        const c1Cost = parseFloat(document.getElementById('rsFlexC1Cost').value) || 0;
        const qty = parseInt(document.getElementById('rsFlexC1Quantity').value) || 1;
        const newTotalCost = c1Cost * qty;
        
        let products = JSON.parse(localStorage.getItem('nd_products_data') || '[]');
        // Find by unique id first (for new products), fallback to name+dateAdded for legacy
        const existingIdx = p.id
            ? products.findIndex(x => x.id === p.id)
            : products.findIndex(x => x.name === p.name && x.dateAdded === p.dateAdded);
        if (existingIdx !== -1) {
            const old = products[existingIdx];
            old.purchaseCost = (parseFloat(old.purchaseCost) || 0) + newTotalCost;
            old.cost = c1Cost;
            old.boughtQuantity = (parseFloat(old.boughtQuantity) || 0) + qty;
            
            const c1Title = document.getElementById('rsFlexC1Title')?.value.trim() || 'Container 1';
            const c2Title = document.getElementById('rsFlexC2Title')?.value.trim() || 'Container 2';
            const c3Title = document.getElementById('rsFlexC3Title')?.value.trim() || 'Container 3';

            old.bulkUnit = c1Title;
            old.unit = 'per ' + c1Title.toLowerCase();
            
            const c2sPerC1 = parseInt(document.getElementById('rsFlexC2Qty').value) || 1;
            const c3sPerC2 = parseInt(document.getElementById('rsFlexC3Qty').value) || 1;
            
            const c1Price = parseFloat(document.getElementById('rsFlexC1Price').value) || c1Cost;
            const c2Cost = c2sPerC1 > 0 ? c1Cost / c2sPerC1 : 0;
            const c2Price = parseFloat(document.getElementById('rsFlexC2Price').value) || c2Cost;

            old.price = c1Price;
            old.profit = parseFloat(document.getElementById('rsFlexC1Profit').value) || 0;
            old.profitPercent = parseFloat(document.getElementById('rsFlexC1ProfitPercent').value) || 0;

            old.structure = {
                c2sPerC1: c2sPerC1,
                c3sPerC2: c3sPerC2,
                c1Profit: parseFloat(document.getElementById('rsFlexC1Profit').value) || 0,
                c1ProfitPercent: parseFloat(document.getElementById('rsFlexC1ProfitPercent').value) || 0,
                c2Profit: parseFloat(document.getElementById('rsFlexC2Profit').value) || 0,
                c2ProfitPercent: parseFloat(document.getElementById('rsFlexC2ProfitPercent').value) || 0
            };

            old.packTypes = {
                c1: { price: c1Price, title: c1Title },
                c2: { price: c2Price, title: c2Title },
                c3: { price: "Flexible", title: c3Title }
            };

            old.topUpHistory = old.topUpHistory || [];
            old.topUpHistory.push({ cost: newTotalCost, qty: qty, date: new Date().toISOString() });

            localStorage.setItem('nd_products_data', JSON.stringify(products));

            closeAddRestockModal();
            setTimeout(() => {
                if (typeof renderRestockList === 'function') renderRestockList();
                if (typeof window.reloadAdminProducts === 'function') window.reloadAdminProducts();
                if (typeof window.renderProductsGlobal === 'function') window.renderProductsGlobal();
            }, 100);
        }
    });
}




