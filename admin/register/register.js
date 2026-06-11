window.loadRegister = function () {
    // Clean up any old modals left in body from previous tab visits
    const oldModals = document.querySelectorAll('body > #addSaleModal');
    oldModals.forEach(m => m.remove());

    const container = document.getElementById('register-container');
    if (container) {
        return fetch('register/register.html')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.text();
            })
            .then(html => {
                if (window.adminExpectedTabId && window.adminExpectedTabId !== 'tab-register') return;
                container.innerHTML = html;
                const searchInput = document.getElementById('registerSearchInput');
                const searchWrapper = document.getElementById('registerSearchWrapper');
                const sortContainer = document.getElementById('registerSortContainer');
    

                if (searchInput && searchWrapper && sortContainer) {
                    searchInput.addEventListener('focus', () => {
                        searchWrapper.classList.add('focused');
                        sortContainer.classList.add('hidden');
                    });

                    searchInput.addEventListener('blur', () => {
                        // Small delay so clicks on sort button register before it changes
                        setTimeout(() => {
                            searchWrapper.classList.remove('focused');
                            sortContainer.classList.remove('hidden');
                        }, 150);
                    });
                }

                // Sort Dropdown UI logic (Taken from payout pattern)
                const sortToggle = document.getElementById('registerSortToggle');
                const sortDropdown = document.getElementById('registerSortDropdown');

                if (sortToggle && sortDropdown) {
                    sortToggle.addEventListener('click', (e) => {
                        e.stopPropagation();
                        sortDropdown.classList.toggle('show');
                    });

                    // Close sort dropdown if clicked outside and prevent other actions
                    document.addEventListener('click', (e) => {
                        if (sortDropdown.classList.contains('show') && !sortToggle.contains(e.target) && !sortDropdown.contains(e.target)) {
                            e.preventDefault();
                            e.stopPropagation();
                            sortDropdown.classList.remove('show');
                        }
                    }, true); // Use capture phase to intercept the click first

                    const options = sortDropdown.querySelectorAll('.sort-option');
                    options.forEach(option => {
                        option.addEventListener('click', () => {
                            options.forEach(o => o.classList.remove('active'));
                            option.classList.add('active');

                            const text = option.childNodes[0].textContent.trim();
                            sortToggle.querySelector('.sort-text').textContent = text;
                            sortDropdown.classList.remove('show');
                        });
                    });
                }

                // Load modular Date Selector script logic
                if (typeof loadDateSelector === 'function') {
                    loadDateSelector();
                }

                // Load modular Sales Table
                if (typeof loadSalesTable === 'function') {
                    loadSalesTable();
                }

                // Add to Register button
                const addBtn = document.getElementById('addBtn');
                if (addBtn) {
                    // Logic handled in sales-table.js
                }

                // --- Print to PDF functionality handles centrally in index.html ---

                window.generateRegisterPDF = function () {
                    const btn = document.getElementById('headerPrintBtn');
                    if (!btn) return;
                    const shopName = localStorage.getItem('nd_shop_name') || 'nd shop';
                    const dayEl = document.getElementById('dayDisplay');
                    const monthFullEl = document.querySelector('.month-full');
                    const monthShortEl = document.querySelector('.month-short');
                    const yearEl = document.getElementById('yearDisplay');

                    const day = dayEl ? dayEl.textContent.trim() : '';
                    const monthFull = monthFullEl ? monthFullEl.textContent.trim() : '';
                    const monthShort = monthShortEl ? monthShortEl.textContent.trim() : '';
                    const year = yearEl ? yearEl.textContent.trim() : '';

                    // Read data directly from localStorage (not the filtered DOM)
                    let allSales = [];
                    try { allSales = JSON.parse(localStorage.getItem('nd_sales_history') || '[]'); } catch(e) {}

                    // Filter for selected date
                    const filteredSales = allSales.filter(row => {
                        if (!row.date) return false;
                        const parts = row.date.split(' ');
                        if (parts.length < 3) return false;
                        const saleDay = parts[0].padStart(2, '0');
                        const saleMonth = parts[1].replace(',', '');
                        const saleYear = parts[2];
                        return saleDay === day && saleMonth === monthShort && saleYear === year;
                    });

                    // Compute totals from data
                    let totalSalesAmt = 0, totalPayoutAmt = 0, totalQty = 0;
                    filteredSales.forEach(r => {
                        const tot = parseFloat(r.price) || (r.isFlexible ? parseFloat(r.unitPrice || 0) : ((parseFloat(r.qty) || 1) * (parseFloat(r.unitPrice) || 0)));
                        totalSalesAmt += tot;
                        totalQty += parseInt(r.qty) || 1;
                        
                        const isReq = r.type === 'Request';
                        const baseTot = (parseInt(r.qty) || 1) * (parseFloat(r.unitPrice) || 0);
                        const delta = r.payoutEarned !== undefined ? r.payoutEarned : (isReq ? (r.payout != null ? r.payout : (baseTot * ((parseFloat(localStorage.getItem('nd_payout_rate')) || 2) / 100))) : 0);
                        
                        if (isReq && !r.isRewardPurchase && r.type !== 'Payout Purchase') {
                            totalPayoutAmt += Math.abs(delta);
                        }
                    });

                    function fmtCurr(v) { return '₦' + Number(v).toLocaleString(undefined, {minimumFractionDigits:2,maximumFractionDigits:2}); }

                    const rowsHTML = filteredSales.length === 0
                        ? `<tr><td colspan="6" style="text-align:center;padding:20px;color:#aaa;">No sales recorded for ${day} ${monthFull} ${year}</td></tr>`
                        : filteredSales.map((r, i) => {
                            const tot = parseFloat(r.price) || (r.isFlexible ? parseFloat(r.unitPrice || 0) : ((parseFloat(r.qty) || 1) * (parseFloat(r.unitPrice) || 0)));
                            const unitPriceVal = r.unitPrice !== undefined ? r.unitPrice : (parseFloat(r.price || 0) / (parseFloat(r.qty) || 1));
                            const unitText = r.unit ? r.unit.replace(/^per\s+/i, '') : '';
                            const qtyStr = r.qty + (unitText ? ' ' + unitText + (r.qty > 1 ? 's' : '') : '');
                            
                            const isReq = r.type === 'Request';
                            const isSpent = r.isRewardPurchase || r.type === 'Payout Purchase';
                            const baseTot = (parseInt(r.qty) || 1) * (parseFloat(r.unitPrice) || 0);
                            const delta = r.payoutEarned !== undefined ? r.payoutEarned : (isReq ? (r.payout != null ? r.payout : (baseTot * ((parseFloat(localStorage.getItem('nd_payout_rate')) || 2) / 100))) : 0);
                            
                            let payoutText = '-';
                            if (isReq && !isSpent) {
                                payoutText = `+₦${Math.round(Math.abs(delta)).toLocaleString()}`;
                            }

                            return `<tr style="border-bottom:1px solid #f0f0f0;">
                                <td style="padding:12px;color:#999;font-weight:600;">${i+1}</td>
                                <td style="padding:12px;font-weight:600;">${r.item || ''}</td>
                                <td style="padding:12px;text-align:center;color:#8b5cf6;font-weight:700;">${qtyStr}</td>
                                <td style="padding:12px;text-align:right;">₦${(unitPriceVal||0).toLocaleString()}</td>
                                <td style="padding:12px;text-align:right;font-weight:700;color:#8b5cf6;">${fmtCurr(tot)}</td>
                                <td style="padding:12px;text-align:right;font-weight:700;color:#166534;">${payoutText}</td>
                            </tr>`;
                        }).join('');

                    const printArea = document.createElement('div');
                    printArea.style.position = 'absolute';
                    printArea.style.left = '-9999px';
                    printArea.style.top = '0';
                    printArea.style.width = '794px';
                    printArea.style.height = 'auto';
                    printArea.style.overflow = 'visible';
                    printArea.style.background = '#ffffff';

                    printArea.innerHTML = `
                        <div style="width:794px; font-family: 'Inter', -apple-system, sans-serif; color: #333; background:#fff; height:auto; overflow:visible; position:relative;">
                            <!-- Header -->
                            <div style="background: #8b5cf6; padding: 32px 40px; color: white; display:flex; justify-content:space-between; align-items:flex-end;">
                                <div>
                                    <div style="font-size:26px; font-weight:900; letter-spacing:-1px; font-family:'Outfit',sans-serif;">${shopName}</div>
                                    <div style="font-size:13px; font-weight:600; opacity:0.8; margin-top:4px;">Daily Sales Book</div>
                                </div>
                                <div style="text-align:right;">
                                    <div style="font-size:22px; font-weight:800;">${day} ${monthFull}</div>
                                    <div style="font-size:16px; font-weight:600; opacity:0.85;">${year}</div>
                                </div>
                            </div>
                            <!-- KPI Summary -->
                            <div style="display:flex; gap:16px; padding:20px 40px; background:#f8fafc; border-bottom:1px solid #e8edf3;">
                                <div style="flex:1; background:white; padding:16px; border-radius:10px; border:1px solid #dce8f5; text-align:center; box-shadow:0 1px 4px rgba(0,0,0,0.05);">
                                    <div style="font-size:10px; color:#999; text-transform:uppercase; font-weight:800; letter-spacing:1px; margin-bottom:6px;">Total Entries / Qty</div>
                                    <div style="font-size:22px; font-weight:900; color:#8b5cf6;">${filteredSales.length} / ${totalQty}</div>
                                </div>
                                <div style="flex:1; background:white; padding:16px; border-radius:10px; border:1px solid #dce8f5; text-align:center; box-shadow:0 1px 4px rgba(0,0,0,0.05);">
                                    <div style="font-size:10px; color:#999; text-transform:uppercase; font-weight:800; letter-spacing:1px; margin-bottom:6px;">Total Sales</div>
                                    <div style="font-size:22px; font-weight:900; color:#8b5cf6;">${fmtCurr(totalSalesAmt)}</div>
                                </div>
                                <div style="flex:1; background:white; padding:16px; border-radius:10px; border:1px solid #ffd6d6; text-align:center; box-shadow:0 1px 4px rgba(0,0,0,0.05);">
                                    <div style="font-size:10px; color:#999; text-transform:uppercase; font-weight:800; letter-spacing:1px; margin-bottom:6px;">Total Payout</div>
                                    <div style="font-size:22px; font-weight:900; color:#8b5cf6;">${fmtCurr(totalPayoutAmt)}</div>
                                </div>
                            </div>
                            <!-- Table -->
                            <div style="padding:20px 40px;">
                                <table style="width:100%; border-collapse:collapse; font-size:12px;">
                                    <thead>
                                        <tr style="background:#8b5cf6; color:white;">
                                            <th style="padding:11px 10px; text-align:left; border-radius:8px 0 0 0; font-weight:700; width:40px;">S/N</th>
                                            <th style="padding:11px 10px; text-align:left; font-weight:700;">Description</th>
                                            <th style="padding:11px 10px; text-align:center; font-weight:700; width:80px;">Qty</th>
                                            <th style="padding:11px 10px; text-align:right; font-weight:700; width:90px;">Unit Price</th>
                                            <th style="padding:11px 10px; text-align:right; font-weight:700; width:100px;">Total</th>
                                            <th style="padding:11px 10px; text-align:right; border-radius:0 8px 0 0; font-weight:700; width:110px;">Payout</th>
                                        </tr>
                                    </thead>
                                    <tbody>${rowsHTML}</tbody>
                                </table>
                            </div>
                            <!-- Footer -->
                            <div style="padding:20px 40px; text-align:center; border-top:1px solid #eee; margin-top:8px;">
                                <p style="color:#bbb; font-size:10px; margin:0; font-weight:600;">${shopName} | Salesbook Report | Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
                            </div>
                        </div>
                    `;

                    const opt = {
                        margin: 0,
                        filename: `Salesbook_${day}_${monthFull}_${year}.pdf`,
                        image: { type: 'jpeg', quality: 1 },
                        html2canvas: { scale: 2, useCORS: true, letterRendering: true, logging: false, windowWidth: 794 },
                        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                    };

                    const originalText = btn.textContent;
                    btn.textContent = 'Generating...';
                    btn.style.opacity = '0.7';
                    btn.style.pointerEvents = 'none';

                    document.body.appendChild(printArea);

                    html2pdf().set(opt).from(printArea).save().then(() => {
                        printArea.remove();
                        btn.textContent = originalText;
                        btn.style.opacity = '1';
                        btn.style.pointerEvents = 'auto';
                    }).catch(() => {
                        printArea.remove();
                        btn.textContent = originalText;
                        btn.style.opacity = '1';
                        btn.style.pointerEvents = 'auto';
                    });
                };
            })
            .catch(error => {
                console.warn('Could not fetch register.html', error);
                container.innerHTML = '<div class="register-page-wrapper"><h2 class="register-title">Salesbook</h2><p style="text-align:center;color:#666;">Failed to load.</p></div>';
            });
    }
}






