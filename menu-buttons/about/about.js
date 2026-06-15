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
    
    if (!modal) return;

    const yearEl = document.getElementById('currentYear');
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }

    const headerTitle = modal.querySelector('.menu-modal-header h3');
    const logoText = modal.querySelector('.shop-logo-text');
    const copyrightName = modal.querySelector('.dynamic-shop-name');
    const descEl = modal.querySelector('.about-desc');

    function refreshAboutBranding() {
        const shopName = localStorage.getItem('nd_shop_name') || '';
        const aboutText = localStorage.getItem('nd_about_text');

        if (headerTitle) headerTitle.textContent = 'About ' + shopName;
        if (logoText) logoText.textContent = shopName;
        if (copyrightName) copyrightName.textContent = shopName;

        if (descEl) {
            if (aboutText && aboutText.trim() !== '') {
                descEl.innerHTML = aboutText.replace(/\n/g, '<br>');
            } else {
                descEl.innerHTML = `Welcome to ${shopName}. We are committed to providing you with the best products and services. Thank you for your patronage!`;
            }
        }
    }

    // Initial load
    refreshAboutBranding();

    // Listen for realtime settings sync updates
    if (window.realtimeSync) {
        window.realtimeSync.on('nd_shop_name', refreshAboutBranding);
        window.realtimeSync.on('nd_about_text', refreshAboutBranding);
    }

    if (trigger) {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            refreshAboutBranding(); // Ensure the latest data is rendered
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
