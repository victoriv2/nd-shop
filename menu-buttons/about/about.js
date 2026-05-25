document.addEventListener('DOMContentLoaded', () => {
    const container = document.createElement('div');
    container.id = 'about-modal-container';
    document.body.appendChild(container);

    fetch('menu-buttons/about/about.html')
        .then(res => {
            if (!res.ok) throw new Error('Network response not ok');
            return res.text();
        })
        .then(html => {
            container.innerHTML = html;
            initAboutLogic();
        })
        .catch(err => console.warn('Could not load about.html', err));
});

function initAboutLogic() {
    const modal = document.getElementById('aboutModal');
    const closeBtn = document.getElementById('aboutClose');
    const trigger = document.getElementById('aboutBtn');
    
    const yearEl = document.getElementById('currentYear');
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }

    if (!modal) return;
    if (trigger) {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            modal.classList.add('show');
            document.body.classList.add('modal-open');
        });
    }

    const closeModal = () => {
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);




}
