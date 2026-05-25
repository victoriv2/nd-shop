window.loadMenuTab = function() {
    const container = document.getElementById('menu-container');
    if (container) {
        fetch('menu/menu.html')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.text();
            })
            .then(html => {
                container.innerHTML = html;
                initMenuLogic();
            })
            .catch(error => {
                console.warn('Could not fetch menu.html', error);
                container.innerHTML = '<div class="profile-name" style="padding: 20px;">Menu Failed to Load</div>';
            });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.loadMenuTab();
});
function initMenuLogic() {
    const editProfileBtn = document.getElementById('editProfileBtn');
    const requestHistoryBtn = document.getElementById('requestHistoryBtn');
    const contactOwnerBtn = document.getElementById('contactOwnerBtn');
    const userAiModeBtn = document.getElementById('userAiModeBtn');
    const securityBtn = document.getElementById('securityBtn');

    const aboutBtn = document.getElementById('aboutBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    const user = window.loggedInUser || { id: '00000ND', firstName: 'Victor', lastName: 'Iv' };
    const profileName = document.querySelector('.profile-name');
    const profileId = document.querySelector('.profile-id');
    const profileAvatar = document.querySelector('.profile-avatar');

    if (profileName) profileName.textContent = `${user.firstName} ${user.lastName || ''}`;
    if (profileId) profileId.textContent = `ID: ${user.id}`;
    if (profileAvatar) profileAvatar.textContent = user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U';

    window.refreshMenu = initMenuLogic;

    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            const modal = document.getElementById('editProfileModal');
            if (modal) { modal.classList.add('show'); document.body.classList.add('modal-open'); }
        });
    }

    if (requestHistoryBtn) {
        requestHistoryBtn.addEventListener('click', () => {
            if (typeof openRequestHistoryModal === 'function') openRequestHistoryModal();
        });
    }

    const payDebtBtn = document.getElementById('payDebtBtn');
    if (payDebtBtn) {
        payDebtBtn.addEventListener('click', () => {
            if (typeof openPayDebtModal === 'function') openPayDebtModal();
        });
    }

    if (contactOwnerBtn) {
        contactOwnerBtn.addEventListener('click', () => {
            const modal = document.getElementById('contactOwnerModal');
            if (modal) { modal.classList.add('show'); document.body.classList.add('modal-open'); }
        });
    }

    if (userAiModeBtn) {
        userAiModeBtn.addEventListener('click', () => {
            if (typeof window.openUserAiModal === 'function') window.openUserAiModal();
        });
    }

    const menuPurchaseWithRewardBtn = document.getElementById('menuPurchaseWithRewardBtn');
    if (menuPurchaseWithRewardBtn) {
        const isUrpEnabled = localStorage.getItem('nd_reward_purchase_enabled') === 'true';
        menuPurchaseWithRewardBtn.style.display = isUrpEnabled ? 'flex' : 'none';

        menuPurchaseWithRewardBtn.addEventListener('click', () => {
            if (typeof openUserRewardPurchaseModal === 'function') {
                openUserRewardPurchaseModal();
            }
        });
    }

    // Real-time listener for admin toggles
    if (!window.hasRewardPurchaseToggleListener) {
        window.addEventListener('local-storage-update', (e) => {
            if (e.detail && e.detail.key === 'nd_reward_purchase_enabled') {
                const btn = document.getElementById('menuPurchaseWithRewardBtn');
                if (btn) {
                    btn.style.display = e.detail.value === 'false' ? 'none' : 'flex';
                }
            }
        });
        window.hasRewardPurchaseToggleListener = true;
    }

    if (securityBtn) {
        securityBtn.addEventListener('click', () => {
            const modal = document.getElementById('securityModal');
            if (modal) { modal.classList.add('show'); document.body.classList.add('modal-open'); }
        });
    }



    if (aboutBtn) {
        aboutBtn.addEventListener('click', () => {
            const modal = document.getElementById('aboutModal');
            if (modal) { modal.classList.add('show'); document.body.classList.add('modal-open'); }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            const modal = document.getElementById('logoutModal');
            if (modal) { 
                modal.classList.add('show'); 
                document.body.classList.add('modal-open'); 
            }
        });
    }
}
