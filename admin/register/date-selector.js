function loadDateSelector() {
    const wrapper = document.getElementById('date-selector-wrapper');
    const modalContainer = document.getElementById('modal-container');
    if (!wrapper || !modalContainer) return;

    // Load Date Selector Template
    fetch('register/date-selector.html')
        .then(res => res.text())
        .then(html => {
            wrapper.innerHTML = html;

            // Load Selection Modal Template (from root)
            return fetch('../modal.html');
        })
        .then(res => res.text())
        .then(html => {
            modalContainer.innerHTML = html;
            initDateModalLogic();
        })
        .catch(err => console.warn('Could not fetch modular templates', err));
}

function initDateModalLogic() {
    const dayDisp = document.getElementById('dayDisplay');
    const monthDisp = document.getElementById('monthDisplay');
    const yearDisp = document.getElementById('yearDisplay');

    // Selectors
    const daySelector = document.getElementById('daySelector');
    const monthSelector = document.getElementById('monthSelector');
    const yearSelector = document.getElementById('yearSelector');

    const prevBtn = document.getElementById('datePrevBtn');
    const nextBtn = document.getElementById('dateNextBtn');

    // Modal elements
    const modal = document.getElementById('selectionModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalList = document.getElementById('modalList');
    const closeModal = document.getElementById('closeModal');

    if (!dayDisp || !monthDisp || !yearDisp || !modal) return;

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();

    const monthsArray = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fullMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // State Variables
    let selectedYear = currentYear;
    let selectedMonth = currentMonth;
    let selectedDay = currentDay;

    function updateDisplay() {
        dayDisp.textContent = selectedDay < 10 ? '0' + selectedDay : selectedDay;

        // Update both full and short name for CSS toggle
        const fullMonth = fullMonths[selectedMonth];
        const shortMonth = monthsArray[selectedMonth];
        monthDisp.innerHTML = `
            <span class="month-full">${fullMonth}</span>
            <span class="month-short">${shortMonth}</span>
        `;

        yearDisp.textContent = selectedYear;

        // Check next button state (no future)
        const isToday = (selectedYear === currentYear && selectedMonth === currentMonth && selectedDay === currentDay);
        if (isToday) {
            nextBtn.style.opacity = '0.3';
            nextBtn.disabled = true;
        } else {
            nextBtn.style.opacity = '1';
            nextBtn.disabled = false;
        }

        // Table Refresh: Trigger the register table to filter by this new date
        if (typeof window.refreshSalesTable === 'function') {
            window.refreshSalesTable();
        }
    }

    function openSelectionModal(type) {
        modal.setAttribute('data-type', type);
        modalList.innerHTML = '';

        if (type === 'year') {
            modalTitle.textContent = 'Select Year';
            for (let y = currentYear; y >= 2000; y--) {
                const item = document.createElement('div');
                item.className = 'modal-list-item';
                item.textContent = y;
                if (y === selectedYear) item.style.color = '#8b5cf6';
                modalList.appendChild(item);
            }
        } else if (type === 'month') {
            modalTitle.textContent = 'Select Month';
            // Only show months up to current if selected year is current
            const maxM = (selectedYear === currentYear) ? currentMonth : 11;
            // Reverse order: current to Jan
            for (let m = maxM; m >= 0; m--) {
                const item = document.createElement('div');
                item.className = 'modal-list-item';
                item.textContent = fullMonths[m];
                item.setAttribute('data-value', m);
                if (m === selectedMonth) item.style.color = '#8b5cf6';
                modalList.appendChild(item);
            }
        } else if (type === 'day') {
            modalTitle.textContent = 'Select Day';
            const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
            let maxD = daysInMonth;
            if (selectedYear === currentYear && selectedMonth === currentMonth) {
                maxD = currentDay;
            }
            // Reverse order: Newest to Oldest
            for (let d = maxD; d >= 1; d--) {
                const item = document.createElement('div');
                item.className = 'modal-list-item';
                const dStr = d < 10 ? '0' + d : d;
                item.textContent = dStr;
                item.setAttribute('data-value', d);
                if (d === selectedDay) item.style.color = '#8b5cf6';
                modalList.appendChild(item);
            }
        }

        modal.classList.add('show');
        document.body.classList.add('modal-open');
    }

    // Modal Event Delegation
    modalList.addEventListener('click', (e) => {
        const item = e.target.closest('.modal-list-item');
        if (!item) return;

        const type = modal.getAttribute('data-type');
        if (type === 'year') {
            selectedYear = parseInt(item.textContent);
            // Re-validate month/day if they were future for the new year
            if (selectedYear === currentYear) {
                if (selectedMonth > currentMonth) selectedMonth = currentMonth;
                const maxD = new Date(selectedYear, selectedMonth + 1, 0).getDate();
                const limitD = (selectedMonth === currentMonth) ? currentDay : maxD;
                if (selectedDay > limitD) selectedDay = limitD;
            }
        } else if (type === 'month') {
            selectedMonth = parseInt(item.getAttribute('data-value'));
            // Re-validate day
            const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
            let maxD = daysInMonth;
            if (selectedYear === currentYear && selectedMonth === currentMonth) maxD = currentDay;
            if (selectedDay > maxD) selectedDay = maxD;
        } else if (type === 'day') {
            selectedDay = parseInt(item.getAttribute('data-value'));
        }

        updateDisplay();
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');
    });

    closeModal.onclick = () => {
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');
    };



    // Trigger open
    daySelector.onclick = () => openSelectionModal('day');
    monthSelector.onclick = () => openSelectionModal('month');
    yearSelector.onclick = () => openSelectionModal('year');

    // Prev/Next Logic
    prevBtn.addEventListener('click', () => {
        let d = new Date(selectedYear, selectedMonth, selectedDay);
        d.setDate(d.getDate() - 1);
        if (d.getFullYear() < 2000) return;
        selectedYear = d.getFullYear();
        selectedMonth = d.getMonth();
        selectedDay = d.getDate();
        updateDisplay();
    });

    nextBtn.addEventListener('click', () => {
        let d = new Date(selectedYear, selectedMonth, selectedDay);
        d.setDate(d.getDate() + 1);
        if (d > today) return; // Guard
        selectedYear = d.getFullYear();
        selectedMonth = d.getMonth();
        selectedDay = d.getDate();
        updateDisplay();
    });



    // Initial Display
    updateDisplay();
}




