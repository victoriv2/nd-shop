document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('modal-container');
    if (container) {
        // Fetch the modal HTML
        fetch('modal.html')
            .then(response => {
                if (!response.ok) throw new Error('Network response not ok');
                return response.text();
            })
            .then(html => {
                container.innerHTML = html;
                initModalLogic();
            })
            .catch(err => {
                console.warn('Could not load modal.html', err);
                container.innerHTML = `
                <div id="selectionModal" class="modal-overlay">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3 id="modalTitle">Select</h3>
                            <span class="close-modal" id="closeModal">&times;</span>
                        </div>
                        <div class="modal-body" id="modalList"></div>
                    </div>
                </div>`;
                initModalLogic();
            });
    }
});

function initModalLogic() {
    const modal = document.getElementById('selectionModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalList = document.getElementById('modalList');

    // Use event delegation to handle clicks, as elements might be dynamically added
    document.addEventListener('click', (e) => {
        const monthSelector = e.target.closest('#monthSelector');
        const yearSelector = e.target.closest('#yearSelector');
        const closeModalClick = e.target.closest('#closeModal');
        const modalListItem = e.target.closest('.modal-list-item');

        // Open Month Modal
        if (monthSelector) {
            openModal('month');
        }
        // Open Year Modal
        else if (yearSelector) {
            openModal('year');
        }
        // Close Modal
        else if (closeModalClick) {
            modal.classList.remove('show');
            document.body.classList.remove('modal-open');
        }
        // Select an item from the modal list
        else if (modalListItem) {
            const type = modal.getAttribute('data-type');
            const value = modalListItem.textContent;

            if (type === 'month') {
                const ms = document.getElementById('monthSelector');
                if (ms) ms.innerHTML = `${value} <span class="triangle"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle;"><path d="M7 10l5 5 5-5z"/></svg></span>`;

                const timeSpans = document.querySelectorAll('.card-time-text');
                timeSpans.forEach(timeSpan => {
                    const currentTimeText = timeSpan.textContent;
                    // Split the text to extract the time part ("hh:mm am") separating it from the month ("mmm")
                    // Assuming format is always "mmm hh:mm am"
                    const parts = currentTimeText.split(' ');
                    if (parts.length >= 3) {
                        const timePart = parts.slice(1).join(' '); // rebuilds "hh:mm am"
                        const mmm = value.substring(0, 3);
                        timeSpan.textContent = `${mmm}. ${timePart}`;
                    }
                });
            } else if (type === 'year') {
                const ys = document.getElementById('yearSelector');
                if (ys) ys.innerHTML = `${value} <span class="triangle"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle;"><path d="M7 10l5 5 5-5z"/></svg></span>`;
            }
            modal.classList.remove('show');
            document.body.classList.remove('modal-open');
        }
    });



    function openModal(type) {
        modal.setAttribute('data-type', type);
        modalList.innerHTML = ''; // Clear previous items

        if (type === 'month') {
            modalTitle.textContent = 'Select Month';
            const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            months.forEach(m => {
                const div = document.createElement('div');
                div.className = 'modal-list-item';
                div.textContent = m;
                modalList.appendChild(div);
            });
        } else if (type === 'year') {
            modalTitle.textContent = 'Select Year';
            const currentYear = new Date().getFullYear();
            // From current year down to 2000
            for (let y = currentYear; y >= 2000; y--) {
                const div = document.createElement('div');
                div.className = 'modal-list-item';
                div.textContent = y;
                modalList.appendChild(div);
            }
        }

        modal.classList.add('show');
        document.body.classList.add('modal-open');
    }
}
