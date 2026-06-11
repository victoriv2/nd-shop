function loadProgress() {
    const container = document.getElementById('register-container'); // Reusing this for simplicity in admin panel
    if (!container) return Promise.resolve();

    return fetch('progress/progress.html')
        .then(res => res.text())
        .then(html => {
            if (window.adminExpectedTabId && window.adminExpectedTabId !== 'tab-progress') return;
            container.innerHTML = html;
            initProgressLogic();
        })
        .catch(err => {
            console.warn('Could not fetch progress.html', err);
        });
}

function initProgressLogic() {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    let selectedMonth = currentMonth;
    let selectedYear = currentYear;

    // Elements
    const monthTrigger = document.getElementById('monthTrigger');
    const yearTrigger = document.getElementById('yearTrigger');
    const modal = document.getElementById('progressDateModal');
    const closeBtn = document.getElementById('closeProgressModal');
    const monthList = document.getElementById('monthSelectionList');
    const yearList = document.getElementById('yearSelectionList');
    const monthCol = document.getElementById('monthCol');
    const yearCol = document.getElementById('yearCol');
    const modalTitle = modal ? modal.querySelector('.modal-header h3') : null;

    // Move modal to body
    if (modal) document.body.appendChild(modal);

    function updateHeaderDisplay() {
        document.getElementById('selectedMonthName').textContent = months[selectedMonth];
        document.getElementById('selectedYearDisplay').textContent = selectedYear;
    }

    function renderSelectors() {
        monthList.innerHTML = '';
        yearList.innerHTML = '';

        // Render Months
        months.forEach((m, index) => {
            const item = document.createElement('div');
            item.className = `selection-item ${index === selectedMonth ? 'selected' : ''}`;

            // Disable future months in current year
            if (selectedYear === currentYear && index > currentMonth) {
                item.classList.add('disabled');
            } else {
                item.onclick = () => {
                    selectedMonth = index;
                    // Auto-apply and close
                    updateHeaderDisplay();
                    updateDashboardData();
                    closeModal();
                };
            }

            item.textContent = m;
            monthList.appendChild(item);
        });

        // Render Years (2000 to Current)
        for (let y = currentYear; y >= 2000; y--) {
            const item = document.createElement('div');
            item.className = `selection-item ${y === selectedYear ? 'selected' : ''}`;
            item.onclick = () => {
                selectedYear = y;
                // If the newly selected year makes the current month future, adjust month
                if (selectedYear === currentYear && selectedMonth > currentMonth) {
                    selectedMonth = currentMonth;
                }
                // Auto-apply and close
                updateHeaderDisplay();
                updateDashboardData();
                closeModal();
            };
            item.textContent = y;
            yearList.appendChild(item);
        }
    }

    if (monthTrigger) {
        monthTrigger.onclick = () => {
            renderSelectors();
            if (monthCol) monthCol.style.display = 'flex';
            if (yearCol) yearCol.style.display = 'none';
            if (modalTitle) modalTitle.textContent = 'Select Month';
            modal.classList.add('show');
            document.body.classList.add('modal-open');
        };
    }

    if (yearTrigger) {
        yearTrigger.onclick = () => {
            renderSelectors();
            if (monthCol) monthCol.style.display = 'none';
            if (yearCol) yearCol.style.display = 'flex';
            if (modalTitle) modalTitle.textContent = 'Select Year';
            modal.classList.add('show');
            document.body.classList.add('modal-open');
        };
    }

    const closeModal = () => {
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');
    };

    // Close modal only via close button
    if (closeBtn) closeBtn.onclick = closeModal;

    // --- Real Data & Chart Logic ---
    let currentMonthDailySalesMap = {}; // Global map to hold daily sales totals for the selected month
    let currentMonthDailyPayoutMap = {}; // Map for daily payouts

    function updateDashboardData() {
        let entriesCount = 0;
        let totalItems = 0;
        let totalSales = 0;
        let totalPayout = 0;

        // Reset daily map
        currentMonthDailySalesMap = {};
        currentMonthDailyPayoutMap = {};

        const savedSales = localStorage.getItem('nd_sales_history');
        if (savedSales) {
            try {
                const allSales = JSON.parse(savedSales);
                const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const targetShortMonth = shortMonths[selectedMonth];
                const targetYearStr = String(selectedYear);

                allSales.forEach(sale => {
                    // Date format: "26 Feb, 2026 · 3:45 pm"
                    // Parts: ["26", "Feb,", "2026", "·", "3:45", "pm"]
                    const dParts = sale.date.split(' ');
                    if (dParts.length >= 3) {
                        const sDay = parseInt(dParts[0], 10);
                        const sMonth = dParts[1].replace(',', '');
                        const sYear = dParts[2];

                        if (sMonth === targetShortMonth && sYear === targetYearStr) {
                            const qty = (sale.qty !== undefined && sale.qty !== null && sale.qty !== '') ? Number(sale.qty) : 1;
                            const grossPrice = Number(sale.unitPrice || 0) * qty;
                            const price = (sale.price !== undefined && sale.price !== null && sale.price !== '') ? Number(sale.price) : grossPrice;

                            entriesCount++;
                            totalItems += qty;
                            totalSales += price;

                            // Add to daily chart plot
                            if (!currentMonthDailySalesMap[sDay]) {
                                currentMonthDailySalesMap[sDay] = 0;
                            }
                            currentMonthDailySalesMap[sDay] += price;

                            const isRequest = sale.type === 'Request';
                            const isPayoutPurchase = sale.type === 'Payout Purchase';
                            const payoutEnabled = localStorage.getItem('nd_payout_enabled') === 'true';
                            let payout = 0;
                            if (payoutEnabled && (isRequest || isPayoutPurchase)) {
                                // Respect recorded payout, even if 0. Only fallback to dynamic rate if field is missing.
                                const rate = parseFloat(localStorage.getItem('nd_payout_rate') || 2) / 100;
                                payout = (sale.payoutEarned !== undefined) ? Number(sale.payoutEarned) : ((sale.payout !== undefined && sale.payout !== null && sale.payout !== '') ? Number(sale.payout) : (grossPrice * rate));
                            }
                            
                            // For "payout out", sum the spent payouts (negative values) as positive numbers
                            if (payout < 0) {
                                const spentAmt = Math.abs(payout);
                                totalPayout += spentAmt;

                                if (!currentMonthDailyPayoutMap[sDay]) {
                                    currentMonthDailyPayoutMap[sDay] = 0;
                                }
                                currentMonthDailyPayoutMap[sDay] += spentAmt;
                            }
                        }
                    }
                });
            } catch (e) {
                console.error("Error parsing sales for dashboard", e);
            }
        }

        document.getElementById('kpiItemsSold').textContent = `${entriesCount.toLocaleString()} / ${totalItems.toLocaleString()}`;
        document.getElementById('kpiTotalSales').textContent = '₦' + Math.round(totalSales).toLocaleString();
        
        const payoutCard = document.querySelector('.kpi-card.payout');
        const payoutEnabled = localStorage.getItem('nd_payout_enabled') === 'true';
        if (payoutCard) {
            payoutCard.style.display = payoutEnabled ? 'flex' : 'none';
            // Also update the trend label to show current rate
            const rateLabel = payoutCard.querySelector('.kpi-trend');
            if (rateLabel) {
                const currentRate = localStorage.getItem('nd_payout_rate') || 2;
                rateLabel.textContent = `${currentRate}% Earnings`;
            }
        }
        
        let totalPayoutRemaining = 0;
        const usersList = JSON.parse(localStorage.getItem('nd_users') || '[]');
        usersList.forEach(u => {
            if (!u.is_admin) {
                totalPayoutRemaining += typeof calculateTrueSpendableBalance === 'function' ? calculateTrueSpendableBalance(u.id) : 0;
            }
        });
        document.getElementById('kpiTotalPayout').textContent = '₦' + Math.round(totalPayoutRemaining).toLocaleString();

        renderChart();
    }

    // Custom Detail Popup logic
    const detailPopup = document.getElementById('progressDetailPopup');
    const closeDetail = document.getElementById('closeDetailPopup');

    if (detailPopup) {
        document.body.appendChild(detailPopup);

        // Close only via close button
    }

    if (closeDetail) {
        closeDetail.onclick = () => {
            detailPopup.classList.remove('show');
            document.body.classList.remove('modal-open');
        };
    }

    function showDetailPopup(day, value) {
        if (!detailPopup) return;

        document.getElementById('popupDayBadge').textContent = day;
        document.getElementById('popupSalesValue').textContent = '₦' + Math.round(value).toLocaleString();
        document.getElementById('popupFullDate').textContent = `${months[selectedMonth]} ${day}, ${selectedYear}`;

        detailPopup.classList.add('show');
        document.body.classList.add('modal-open');
    }

    // ============================================================
    // CUSTOM ZOOM & PAN SYSTEM (replaces chartjs-plugin-zoom)
    // ============================================================
    let zoomLevel = 1;         // 1 = fully zoomed out (see all data)
    const maxZoom = 4;         // Max zoom multiplier
    const minVisibleDays = 5;  // Minimum days visible when zoomed in
    let panOffset = 0;         // 0..1 representing scroll position

    function getVisibleRange(totalDays) {
        const visibleDays = Math.max(minVisibleDays, Math.round(totalDays / zoomLevel));
        const maxOffset = totalDays - visibleDays;
        const startIndex = Math.round(panOffset * maxOffset);
        return {
            min: startIndex,
            max: startIndex + visibleDays - 1,
            visibleDays,
            totalDays
        };
    }

    function applyZoomToChart() {
        const chart = window.myProgressChart;
        if (!chart) return;

        const totalDays = chart.data.labels.length;
        const range = getVisibleRange(totalDays);

        chart.options.scales.x.min = range.min;
        chart.options.scales.x.max = range.max;
        chart.update('none');

        updateScrollbar(range);
        updateZoomButtons(totalDays);
    }

    function updateScrollbar(range) {
        const track = document.getElementById('chartSwipeTrack');
        const handle = document.getElementById('chartSwipeHandle');
        if (!track || !handle) return;

        if (range.visibleDays >= range.totalDays) {
            track.classList.remove('visible');
            return;
        }

        track.classList.add('visible');

        const widthPercent = (range.visibleDays / range.totalDays) * 100;
        const maxOffset = range.totalDays - range.visibleDays;
        const leftPercent = maxOffset > 0 ? (range.min / maxOffset) * (100 - widthPercent) : 0;

        handle.style.width = Math.max(widthPercent, 10) + '%';
        handle.style.left = leftPercent + '%';
    }

    function updateZoomButtons(totalDays) {
        const zoomInBtn = document.getElementById('chartZoomIn');
        const zoomOutBtn = document.getElementById('chartZoomOut');
        const resetBtn = document.getElementById('chartZoomReset');

        if (zoomInBtn) {
            const atMaxZoom = Math.round(totalDays / zoomLevel) <= minVisibleDays;
            zoomInBtn.classList.toggle('disabled', atMaxZoom);
        }
        if (zoomOutBtn) {
            zoomOutBtn.classList.toggle('disabled', zoomLevel <= 1);
        }
        if (resetBtn) {
            resetBtn.classList.toggle('disabled', zoomLevel <= 1);
        }
    }

    function setupZoomControls() {
        const zoomInBtn = document.getElementById('chartZoomIn');
        const zoomOutBtn = document.getElementById('chartZoomOut');
        const resetBtn = document.getElementById('chartZoomReset');

        if (zoomInBtn) {
            zoomInBtn.onclick = () => {
                const chart = window.myProgressChart;
                if (!chart) return;
                const totalDays = chart.data.labels.length;
                const newZoom = zoomLevel * 1.5;
                if (Math.round(totalDays / newZoom) < minVisibleDays) return;
                zoomLevel = newZoom;
                applyZoomToChart();
            };
        }

        if (zoomOutBtn) {
            zoomOutBtn.onclick = () => {
                zoomLevel = Math.max(1, zoomLevel / 1.5);
                if (zoomLevel < 1.05) {
                    zoomLevel = 1;
                    panOffset = 0;
                }
                applyZoomToChart();
            };
        }

        if (resetBtn) {
            resetBtn.onclick = () => {
                zoomLevel = 1;
                panOffset = 0;
                applyZoomToChart();

                // Also dismiss the detail popup on reset
                if (detailPopup) {
                    detailPopup.classList.remove('show');
                    document.body.classList.remove('modal-open');
                }
            };
        }
    }

    function setupScrollbarDrag() {
        const track = document.getElementById('chartSwipeTrack');
        const handle = document.getElementById('chartSwipeHandle');
        if (!track || !handle) return;

        let isDragging = false;
        let dragStartX = 0;
        let dragStartLeft = 0;

        function startDrag(clientX) {
            isDragging = true;
            dragStartX = clientX;
            dragStartLeft = parseFloat(handle.style.left) || 0;
            handle.style.transition = 'none';
            document.body.style.userSelect = 'none';
        }

        function moveDrag(clientX) {
            if (!isDragging) return;
            const trackRect = track.getBoundingClientRect();
            const trackWidth = trackRect.width;
            const handleWidthPx = handle.offsetWidth;
            const maxLeft = trackWidth - handleWidthPx;

            const deltaX = clientX - dragStartX;
            const deltaPercent = (deltaX / trackWidth) * 100;
            const newLeftPercent = Math.max(0, Math.min(dragStartLeft + deltaPercent, (maxLeft / trackWidth) * 100));

            handle.style.left = newLeftPercent + '%';

            // Convert handle position to panOffset (0..1)
            const handleWidthPercent = (handleWidthPx / trackWidth) * 100;
            const maxLeftPercent = 100 - handleWidthPercent;
            panOffset = maxLeftPercent > 0 ? newLeftPercent / maxLeftPercent : 0;

            const chart = window.myProgressChart;
            if (chart) {
                const totalDays = chart.data.labels.length;
                const range = getVisibleRange(totalDays);
                chart.options.scales.x.min = range.min;
                chart.options.scales.x.max = range.max;
                chart.update('none');
            }
        }

        function endDrag() {
            isDragging = false;
            handle.style.transition = '';
            document.body.style.userSelect = '';
        }

        // Mouse events
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            startDrag(e.clientX);
        });
        document.addEventListener('mousemove', (e) => moveDrag(e.clientX));
        document.addEventListener('mouseup', endDrag);

        // Touch events
        handle.addEventListener('touchstart', (e) => {
            startDrag(e.touches[0].clientX);
        }, { passive: true });
        document.addEventListener('touchmove', (e) => {
            if (isDragging) moveDrag(e.touches[0].clientX);
        }, { passive: true });
        document.addEventListener('touchend', () => {
            if (isDragging) endDrag();
        });

        // Click on track to jump
        track.addEventListener('click', (e) => {
            if (e.target === handle) return;
            const trackRect = track.getBoundingClientRect();
            const clickX = e.clientX - trackRect.left;
            const trackWidth = trackRect.width;
            const handleWidthPx = handle.offsetWidth;
            const maxLeftPx = trackWidth - handleWidthPx;

            // Center handle on click position
            const newLeftPx = Math.max(0, Math.min(clickX - handleWidthPx / 2, maxLeftPx));
            const newLeftPercent = (newLeftPx / trackWidth) * 100;
            const handleWidthPercent = (handleWidthPx / trackWidth) * 100;
            const maxLeftPercent = 100 - handleWidthPercent;

            handle.style.left = newLeftPercent + '%';
            panOffset = maxLeftPercent > 0 ? newLeftPercent / maxLeftPercent : 0;

            applyZoomToChart();
        });
    }

    function setupChartTouchPan() {
        const viewport = document.querySelector('.chart-viewport');
        if (!viewport) return;

        let startX = 0;
        let startPanOffset = 0;
        let isPanning = false;

        viewport.addEventListener('touchstart', (e) => {
            if (zoomLevel <= 1) return;
            startX = e.touches[0].clientX;
            startPanOffset = panOffset;
            isPanning = true;
        }, { passive: true });

        viewport.addEventListener('touchmove', (e) => {
            if (!isPanning || zoomLevel <= 1) return;

            const deltaX = startX - e.touches[0].clientX;
            const viewportWidth = viewport.offsetWidth;
            // Scale the drag: faster at higher zoom levels
            const sensitivity = 1.5 / zoomLevel;
            const deltaPan = (deltaX / viewportWidth) * sensitivity;

            panOffset = Math.max(0, Math.min(1, startPanOffset + deltaPan));
            applyZoomToChart();
        }, { passive: true });

        viewport.addEventListener('touchend', () => {
            isPanning = false;
        });

        // Mouse drag on chart for desktop
        let mouseStartX = 0;
        let mousePanStart = 0;
        let isMousePanning = false;

        viewport.addEventListener('mousedown', (e) => {
            if (zoomLevel <= 1) return;
            mouseStartX = e.clientX;
            mousePanStart = panOffset;
            isMousePanning = true;
            viewport.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isMousePanning) return;
            const deltaX = mouseStartX - e.clientX;
            const viewportWidth = viewport.offsetWidth;
            const sensitivity = 1.5 / zoomLevel;
            const deltaPan = (deltaX / viewportWidth) * sensitivity;

            panOffset = Math.max(0, Math.min(1, mousePanStart + deltaPan));
            applyZoomToChart();
        });

        document.addEventListener('mouseup', () => {
            if (isMousePanning) {
                isMousePanning = false;
                viewport.style.cursor = '';
            }
        });

        // Mouse wheel zoom on chart
        viewport.addEventListener('wheel', (e) => {
            e.preventDefault();
            const chart = window.myProgressChart;
            if (!chart) return;

            const totalDays = chart.data.labels.length;

            if (e.deltaY < 0) {
                // Scroll up = zoom in
                const newZoom = zoomLevel * 1.2;
                if (Math.round(totalDays / newZoom) >= minVisibleDays) {
                    zoomLevel = newZoom;
                }
            } else {
                // Scroll down = zoom out
                zoomLevel = Math.max(1, zoomLevel / 1.2);
                if (zoomLevel < 1.05) {
                    zoomLevel = 1;
                    panOffset = 0;
                }
            }
            applyZoomToChart();
        }, { passive: false });
    }

    function setupPinchZoom() {
        const viewport = document.querySelector('.chart-viewport');
        if (!viewport) return;

        let initialPinchDistance = 0;
        let pinchZoomStart = 1;

        viewport.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                initialPinchDistance = Math.sqrt(dx * dx + dy * dy);
                pinchZoomStart = zoomLevel;
            }
        }, { passive: true });

        viewport.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2 && initialPinchDistance > 0) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const currentDistance = Math.sqrt(dx * dx + dy * dy);
                const scale = currentDistance / initialPinchDistance;

                const chart = window.myProgressChart;
                if (!chart) return;
                const totalDays = chart.data.labels.length;

                let newZoom = pinchZoomStart * scale;
                // Clamp
                if (Math.round(totalDays / newZoom) < minVisibleDays) {
                    newZoom = totalDays / minVisibleDays;
                }
                newZoom = Math.max(1, newZoom);
                if (newZoom < 1.05) {
                    newZoom = 1;
                    panOffset = 0;
                }

                zoomLevel = newZoom;
                applyZoomToChart();
            }
        }, { passive: true });

        viewport.addEventListener('touchend', () => {
            initialPinchDistance = 0;
        });
    }

    function renderChart() {
        const ctx = document.getElementById('salesChart').getContext('2d');
        if (!ctx) return;

        // Reset zoom state on new chart render
        zoomLevel = 1;
        panOffset = 0;

        // Clean up previous chart if it exists
        if (window.myProgressChart) {
            window.myProgressChart.destroy();
        }

        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        const labels = Array.from({ length: daysInMonth }, (_, i) => i + 1);

        // Logical check: only show data up to today if viewing current month/year
        let limit = daysInMonth;
        const now = new Date();
        if (selectedYear === now.getFullYear() && selectedMonth === now.getMonth()) {
            limit = now.getDate();
        }

        const dataPoints = labels.map((day, idx) => {
            if (idx >= limit) return null; // Future days are null (blank)
            // Pull from our actual data map! Defaults to 0 if no sales that day.
            return currentMonthDailySalesMap[day] || 0;
        });

        if (typeof Chart !== 'undefined') {
            window.myProgressChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Sales',
                        data: dataPoints,
                        borderColor: '#8b5cf6',
                        backgroundColor: (context) => {
                            const chart = context.chart;
                            const { ctx, chartArea } = chart;
                            if (!chartArea) return null;
                            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                            gradient.addColorStop(0, 'rgba(27, 38, 59, 0.4)');
                            gradient.addColorStop(1, 'rgba(27, 38, 59, 0.02)');
                            return gradient;
                        },
                        borderWidth: 3,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        pointHitRadius: 10,
                        fill: true,
                        tension: 0.4,
                        spanGaps: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 600,
                        easing: 'easeOutQuart'
                    },
                    onClick: (e, elements) => {
                        if (elements.length > 0) {
                            const index = elements[0].index;
                            const day = labels[index];
                            const value = dataPoints[index];
                            if (value !== null) {
                                showDetailPopup(day, value);
                            }
                        } else {
                            // Clicked on chart but NOT on a data point → dismiss popup & tooltip
                            if (detailPopup) {
                                detailPopup.classList.remove('show');
                                document.body.classList.remove('modal-open');
                            }
                            const chart = window.myProgressChart;
                            if (chart) {
                                chart.tooltip.setActiveElements([], { x: 0, y: 0 });
                                chart.setActiveElements([]);
                                chart.update('none');
                            }
                        }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            enabled: true,
                            backgroundColor: 'rgba(27, 38, 59, 0.92)',
                            titleFont: { size: 14, weight: 'bold' },
                            bodyFont: { size: 13 },
                            padding: 14,
                            cornerRadius: 10,
                            displayColors: false,
                            animation: {
                                duration: 300
                            },
                            callbacks: {
                                label: (context) => `Sales: ₦${context.parsed.y.toLocaleString()}`
                            }
                        }
                    },
                    scales: {
                        y: {
                            display: false,
                            beginAtZero: true
                        },
                        x: {
                            type: 'category',
                            grid: { display: false },
                            ticks: {
                                font: { size: 9, weight: '700' },
                                autoSkip: true,
                                maxRotation: 0,
                                padding: 12,
                                color: '#777'
                            }
                        }
                    },
                    events: ['click', 'touchstart', 'mousemove'],
                    hover: {
                        animationDuration: 300
                    },
                    onHover: (event, chartElement) => {
                        event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    }
                }
            });

            // Make the X-axis labels (days) 'selectable'
            ctx.canvas.onclick = (e) => {
                const chart = window.myProgressChart;
                const xAxis = chart.scales.x;

                if (e.offsetY > xAxis.top) {
                    const value = xAxis.getValueForPixel(e.offsetX);
                    const index = Math.round(value);
                    const day = labels[index];
                    const salesValue = dataPoints[index];

                    if (day && salesValue !== null) {
                        showDetailPopup(day, salesValue);
                    }
                }
            };

            // Hide scrollbar initially
            const track = document.getElementById('chartSwipeTrack');
            if (track) track.classList.remove('visible');

            // Setup custom zoom controls
            setupZoomControls();
            setupScrollbarDrag();
            setupChartTouchPan();
            setupPinchZoom();
        }
    }

    // --- Dismiss tooltip on click outside chart ---
    document.addEventListener('click', (e) => {
        const canvas = document.getElementById('salesChart');
        if (canvas && !canvas.contains(e.target)) {
            const chart = window.myProgressChart;
            if (chart) {
                chart.tooltip.setActiveElements([], { x: 0, y: 0 });
                chart.setActiveElements([]);
                chart.update('none');
            }
        }
    });

    // --- Creative Progress PDF Download ---
    function generateProgressPDF() {
        const monthName = months[selectedMonth];
        const year = selectedYear;
        const itemsSold = document.getElementById('kpiItemsSold').textContent;
        const totalSales = document.getElementById('kpiTotalSales').textContent;
        const totalPayout = document.getElementById('kpiTotalPayout').textContent;
        const shopName = localStorage.getItem('nd_shop_name') || 'nd shop';

        const payoutEnabled = localStorage.getItem('nd_payout_enabled') === 'true';

        // Build daily breakdown rows from actual data
        let dailyRowsHtml = '';
        const daysInMonth = new Date(year, selectedMonth + 1, 0).getDate();
        let runningTotal = 0;
        for (let d = 1; d <= daysInMonth; d++) {
            const val = currentMonthDailySalesMap[d] || 0;
            const payoutVal = currentMonthDailyPayoutMap[d] || 0;
            runningTotal += val;
            if (val > 0 || payoutVal > 0) {
                dailyRowsHtml += `
                    <tr style="border-bottom: 1px solid #f0f0f0;">
                        <td style="padding: 12px 16px; font-weight: 700; color: #888;">${d}</td>
                        <td style="padding: 12px 16px; font-weight: 700; color: #333;">${monthName} ${d}, ${year}</td>
                        <td style="padding: 12px 16px; text-align: right; font-weight: 800; color: #8b5cf6;">₦${Math.round(val).toLocaleString()}</td>
                        ${payoutEnabled ? `<td style="padding: 12px 16px; text-align: right; font-weight: 600; color: #8b5cf6;">${payoutVal > 0 ? '₦' + Math.round(payoutVal).toLocaleString() : '-'}</td>` : ''}
                    </tr>
                `;
            }
        }

        if (!dailyRowsHtml) {
            dailyRowsHtml = `
                <tr>
                    <td colspan="4" style="padding: 40px; text-align: center; color: #bbb; font-weight: 600; font-size: 14px;">No sales recorded for this month.</td>
                </tr>
            `;
        }

        // Capture chart as image
        let chartImgSrc = '';
        const chartCanvas = document.getElementById('salesChart');
        if (chartCanvas) {
            try {
                chartImgSrc = chartCanvas.toDataURL('image/png', 1.0);
            } catch (e) {
                console.warn('Could not capture chart image', e);
            }
        }

        const chartSection = chartImgSrc ? `
            <!-- Performance Chart -->
            <div style="padding: 30px 50px;">
                <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 800; color: #333; text-transform: uppercase; letter-spacing: 0.5px;">📈 Daily Performance Chart</h3>
                <div style="background: #fafafa; border: 1px solid #eee; border-radius: 16px; padding: 20px; text-align: center;">
                    <img src="${chartImgSrc}" style="width: 100%; height: auto; border-radius: 8px;" />
                </div>
            </div>
        ` : '';

        const printArea = document.createElement('div');
        printArea.style.position = 'absolute';
        printArea.style.left = '0';
        printArea.style.top = '0';
        printArea.style.zIndex = '-9999';
        printArea.style.width = '816px';
        printArea.style.background = '#ffffff';
        printArea.style.color = '#333';
        printArea.style.fontFamily = "'Inter', -apple-system, sans-serif";
        printArea.style.boxSizing = 'border-box';

        printArea.innerHTML = `
            <!-- Header -->
            <div style="background: #8b5cf6; padding: 36px 48px 30px; color: white; position: relative; overflow: hidden;">
                <div style="position: absolute; top: -20px; right: -20px; width: 130px; height: 130px; border-radius: 50%; background: rgba(255,255,255,0.07);"></div>
                <div style="position: absolute; bottom: -30px; left: 40px; width: 90px; height: 90px; border-radius: 50%; background: rgba(255,255,255,0.04);"></div>
                <div style="display: flex; justify-content: space-between; align-items: flex-end; position: relative; z-index: 1;">
                    <div>
                        <div style="font-size: 28px; font-weight: 900; letter-spacing: -1px; margin-bottom: 5px; font-family:'Outfit',sans-serif;">${shopName}</div>
                        <div style="font-size: 13px; font-weight: 600; opacity: 0.8;">Monthly Progress Report</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 30px; font-weight: 900; letter-spacing: -1px;">${monthName}</div>
                        <div style="font-size: 18px; font-weight: 700; opacity: 0.9;">${year}</div>
                    </div>
                </div>
            </div>

            <!-- KPI Summary -->
            <div style="display: flex; gap: 16px; padding: 20px 48px; background: #f8fafc; border-bottom: 1px solid #e8edf3;">
                <div style="flex:1; background:white; padding:18px; border-radius:12px; border:1px solid #dce8f5; text-align:center; box-shadow:0 1px 4px rgba(0,0,0,0.05);">
                    <div style="font-size:10px; color:#999; text-transform:uppercase; font-weight:800; letter-spacing:1px; margin-bottom:8px;">Items Sold</div>
                    <div style="font-size:24px; font-weight:900; color:#8b5cf6;">${itemsSold}</div>
                </div>
                <div style="flex:1; background:white; padding:18px; border-radius:12px; border:1px solid #dce8f5; text-align:center; box-shadow:0 1px 4px rgba(0,0,0,0.05);">
                    <div style="font-size:10px; color:#999; text-transform:uppercase; font-weight:800; letter-spacing:1px; margin-bottom:8px;">Total Sales</div>
                    <div style="font-size:24px; font-weight:900; color:#8b5cf6;">${totalSales}</div>
                </div>
                ${payoutEnabled ? `
                <div style="flex:1; background:white; padding:18px; border-radius:12px; border:1px solid #ffd6d6; text-align:center; box-shadow:0 1px 4px rgba(0,0,0,0.05);">
                    <div style="font-size:10px; color:#999; text-transform:uppercase; font-weight:800; letter-spacing:1px; margin-bottom:8px;">Your Payout</div>
                    <div style="font-size:24px; font-weight:900; color:#8b5cf6;">${totalPayout}</div>
                </div>
                ` : ''}
            </div>

            ${chartSection}

            <!-- Daily Breakdown Table -->
            <div style="padding: 24px 48px 20px;">
                <h3 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 800; color: #333; text-transform: uppercase; letter-spacing: 0.5px;">📊 Daily Breakdown</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    <thead>
                        <tr style="background: #1a1a1a; color: white;">
                            <th style="padding: 11px 14px; text-align: left; border-radius: 8px 0 0 0; font-weight: 700;">Day</th>
                            <th style="padding: 11px 14px; text-align: left; font-weight: 700;">Date</th>
                            <th style="padding: 11px 14px; text-align: right; font-weight: 700; ${!payoutEnabled ? 'border-radius: 0 8px 0 0;' : ''}">Revenue</th>
                            ${payoutEnabled ? '<th style="padding: 11px 14px; text-align: right; border-radius: 0 8px 0 0; font-weight: 700;">Payout</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${dailyRowsHtml}
                    </tbody>
                </table>
            </div>

            <!-- Footer -->
            <div style="padding: 20px 48px; text-align: center; border-top: 1px solid #eee; margin-top: 10px;">
                <p style="color: #bbb; font-size: 10px; font-weight: 600; margin: 0;">${shopName} • Monthly Progress Report • Generated on ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-US')}</p>
            </div>
        `;

        document.body.appendChild(printArea);

        const opt = {
            margin: 0,
            filename: `nd_Progress_${monthName}_${year}.pdf`,
            image: { type: 'jpeg', quality: 1 },
            html2canvas: { scale: 2, useCORS: true, letterRendering: true, windowWidth: 816, scrollX: 0, scrollY: 0 },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        const btn = document.getElementById('headerPrintBtn');
        if (btn) {
            const originalText = btn.textContent;
            btn.textContent = 'Generating...';
            btn.style.opacity = '0.7';
            btn.style.pointerEvents = 'none';

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
        } else {
            html2pdf().set(opt).from(printArea).save().then(() => {
                printArea.remove();
            }).catch(() => {
                printArea.remove();
            });
        }
    }

    // Expose globally so the header button can find it
    window.generateProgressPDF = generateProgressPDF;

    // Initial Load
    updateDashboardData();
    updateHeaderDisplay();
}




