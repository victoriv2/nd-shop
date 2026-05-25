document.addEventListener('DOMContentLoaded', () => {
    const container = document.createElement('div');
    container.id = 'appearance-modal-container';
    document.body.appendChild(container);

    fetch('menu-buttons/appearance/appearance.html')
        .then(res => {
            if (!res.ok) throw new Error('Network response not ok');
            return res.text();
        })
        .then(html => {
            container.innerHTML = html;
            initAppearanceLogic();
        })
        .catch(err => console.warn('Could not load appearance.html', err));
});

function initAppearanceLogic() {
    const modal = document.getElementById('appearanceModal');
    const closeBtn = document.getElementById('appearanceClose');
    const trigger = document.getElementById('appearanceBtn');

    // ── Sync radio with saved theme on load ──
    const themeRadios = document.querySelectorAll('input[name="theme-choice"]');
    const savedTheme = (window.NDITheme && window.NDITheme.get()) || 'system';

    themeRadios.forEach(radio => {
        if (radio.value === savedTheme) {
            radio.checked = true;
        } else {
            radio.checked = false;
        }
    });

    // ── Listen for theme radio changes ──
    themeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const choice = e.target.value; // 'system', 'light', or 'dark'

            if (window.NDITheme) {
                // Use the global theme manager
                window.NDITheme.set(choice);
            } else {
                // Fallback: toggle a class directly (shouldn't happen normally)
                if (choice === 'dark') {
                    document.documentElement.setAttribute('data-theme', 'dark');
                } else if (choice === 'light') {
                    document.documentElement.setAttribute('data-theme', 'light');
                } else {
                    // System default
                    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
                }
            }
        });
    });

    if (!modal) return;
    if (trigger) {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();

            // Re-sync radio buttons each time the modal opens (in case theme changed externally)
            const currentTheme = (window.NDITheme && window.NDITheme.get()) || 'system';
            themeRadios.forEach(radio => {
                radio.checked = (radio.value === currentTheme);
            });

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
