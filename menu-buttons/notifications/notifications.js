document.addEventListener('DOMContentLoaded', () => {
    const container = document.createElement('div');
    container.id = 'notifications-modal-container';
    document.body.appendChild(container);

    fetch('menu-buttons/notifications/notifications.html')
        .then(res => {
            if (!res.ok) throw new Error('Network response not ok');
            return res.text();
        })
        .then(html => {
            container.innerHTML = html;
            initNotificationsLogic();
        })
        .catch(err => console.warn('Could not load notifications.html', err));
});

function initNotificationsLogic() {
    const modal = document.getElementById('notificationsModal');
    const closeBtn = document.getElementById('notificationsClose');
    const trigger = document.getElementById('notificationsBtn');

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
