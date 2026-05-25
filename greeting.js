document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('greeting-container');
    if (container) {
        fetch('greeting.html')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.text();
            })
            .then(html => {
                container.innerHTML = html;

                // Set default month and year to the current real date dynamically
                const monthSpan = document.getElementById('monthSelector');
                const yearSpan = document.getElementById('yearSelector');
                if (monthSpan && yearSpan) {
                    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                    const now = new Date();
                    const currentMonthName = months[now.getMonth()];
                    monthSpan.innerHTML = `${currentMonthName} <span class="triangle">&#9660;</span>`;
                    yearSpan.innerHTML = `${now.getFullYear()} <span class="triangle">&#9660;</span>`;

                    const timeSpan = document.querySelector('.card-time-text');
                    if (timeSpan) {
                        const mmm = currentMonthName.substring(0, 3);
                        const day = now.getDate(); // Adding the current day
                        let hours = now.getHours();
                        let minutes = now.getMinutes();
                        const ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12; // 0 becomes 12
                        const strHours = hours < 10 ? '0' + hours : hours;
                        const strMinutes = minutes < 10 ? '0' + minutes : minutes;
                        // Injecting day right beneath mmm
                        timeSpan.textContent = `${mmm}. ${day} | ${strHours}:${strMinutes} ${ampm}`;
                    }
                }

                // Sort Dropdown Logic
                const sortToggle = document.getElementById('sortToggle');
                const sortDropdown = document.getElementById('sortDropdown');

                if (sortToggle && sortDropdown) {
                    sortToggle.addEventListener('click', (e) => {
                        e.stopPropagation();
                        sortDropdown.classList.toggle('show');
                    });

                    document.addEventListener('click', (e) => {
                        if (!sortToggle.contains(e.target)) {
                            sortDropdown.classList.remove('show');
                        }
                    });

                    const options = sortDropdown.querySelectorAll('.sort-option');
                    options.forEach(option => {
                        option.addEventListener('click', () => {
                            const text = option.textContent;
                            sortToggle.querySelector('.sort-text').textContent = text;
                            sortDropdown.classList.remove('show');
                        });
                    });
                }
            })
            .catch(error => {
                // If fetch fails (like when opening directly via file:// in some browsers), 
                // load it directly to ensure it still shows up as requested.
                console.warn('Could not fetch greeting.html, using fallback text.', error);
                container.innerHTML = '<div class="greeting-text">Hi, Victor</div>';
            });
    }
});
