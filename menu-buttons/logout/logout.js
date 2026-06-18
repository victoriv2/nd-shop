document.addEventListener('DOMContentLoaded', () => {
    const container = document.createElement('div');
    container.id = 'logout-modal-container';
    document.body.appendChild(container);

    fetch('menu-buttons/logout/logout.html')
        .then(res => {
            if (!res.ok) throw new Error('Network response not ok');
            return res.text();
        })
        .then(html => {
            container.innerHTML = html;
            initLogoutLogic();
        })
        .catch(err => console.warn('Could not load logout.html', err));
});

function initLogoutLogic() {
    const modal = document.getElementById('logoutModal');
    const closeBtn = document.getElementById('logoutClose');
    const cancelBtn = document.getElementById('logoutCancel');
    const saveBtn = document.getElementById('logoutSave');
    const trigger = document.getElementById('logoutBtn');

    if (!modal) return;

    // Trigger to open
    if (trigger) {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            modal.classList.add('show');
            document.body.classList.add('modal-open');
        });
    }

    // Close options
    const closeModal = () => {
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    // Save logic
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            saveBtn.textContent = 'Logging out...';
            saveBtn.style.opacity = '0.7';
            
            // Clear session from both storages (session may be in either depending on when user last logged in)
            sessionStorage.removeItem('nd_logged_in_user');
            sessionStorage.removeItem('nd_token');
            localStorage.removeItem('nd_logged_in_user');
            localStorage.removeItem('nd_token');

            // Redirect to the login page after a short visual delay
            setTimeout(() => {
                window.location.href = 'auth/login.html';
            }, 600);
        });
    }




}
