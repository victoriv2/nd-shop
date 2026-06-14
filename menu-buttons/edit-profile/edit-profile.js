document.addEventListener('DOMContentLoaded', () => {
    const container = document.createElement('div');
    container.id = 'editProfile-modal-container';
    document.body.appendChild(container);

    fetch('menu-buttons/edit-profile/edit-profile.html')
        .then(res => {
            if (!res.ok) throw new Error('Network response not ok');
            return res.text();
        })
        .then(html => {
            container.innerHTML = html;
            initEditProfileLogic();
        })
        .catch(err => console.warn('Could not load edit-profile.html', err));
});

function initEditProfileLogic() {
    const modal = document.getElementById('editProfileModal');
    const closeBtn = document.getElementById('editProfileClose');
    const cancelBtn = document.getElementById('editProfileCancel');
    const saveBtn = document.getElementById('editProfileSave');
    const trigger = document.getElementById('editProfileBtn');

    if (!modal) return;

    // Trigger to open handled down below where population occurs

    // Close options
    const closeModal = () => {
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    // Setup States and LGAs (Custom Dropdown - Sort Menu Style)
    const stateWrapper = document.getElementById('stateDropdownWrapper');
    const stateToggle = document.getElementById('stateToggle');
    const stateText = document.getElementById('stateText');
    const stateDropdown = document.getElementById('stateDropdown');

    const lgaWrapper = document.getElementById('lgaDropdownWrapper');
    const lgaToggle = document.getElementById('lgaToggle');
    const lgaText = document.getElementById('lgaText');
    const lgaDropdown = document.getElementById('lgaDropdown');

    let selectedState = 'Lagos';
    let selectedLGA = 'Ikeja';

    if (stateWrapper && lgaWrapper && typeof naijaData !== 'undefined') {

        // Build state options
        function buildStateOptions() {
            stateDropdown.innerHTML = '';
            const states = Object.keys(naijaData).sort();
            states.forEach(state => {
                const opt = document.createElement('div');
                opt.className = 'ep-dropdown-option' + (state === selectedState ? ' active' : '');
                opt.innerHTML = state + '<span class="ep-dropdown-check"></span>';
                opt.addEventListener('click', (e) => {
                    e.stopPropagation();
                    selectedState = state;
                    stateText.textContent = state;
                    stateWrapper.classList.remove('open');
                    // Enable LGA and populate
                    lgaWrapper.classList.remove('disabled');
                    selectedLGA = '';
                    lgaText.textContent = 'Select LGA';
                    buildLGAOptions(state);
                    // Update active states
                    buildStateOptions();
                });
                stateDropdown.appendChild(opt);
            });
        }

        // Build LGA options for a given state
        function buildLGAOptions(state) {
            lgaDropdown.innerHTML = '';
            if (!naijaData[state]) return;
            naijaData[state].sort().forEach(lga => {
                const opt = document.createElement('div');
                opt.className = 'ep-dropdown-option' + (lga === selectedLGA ? ' active' : '');
                opt.innerHTML = lga + '<span class="ep-dropdown-check"></span>';
                opt.addEventListener('click', (e) => {
                    e.stopPropagation();
                    selectedLGA = lga;
                    lgaText.textContent = lga;
                    lgaWrapper.classList.remove('open');
                    buildLGAOptions(state);
                });
                lgaDropdown.appendChild(opt);
            });
        }

        // Toggle State dropdown
        stateToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            lgaWrapper.classList.remove('open');
            stateWrapper.classList.toggle('open');
        });

        // Toggle LGA dropdown
        lgaToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            if (lgaWrapper.classList.contains('disabled')) return;
            stateWrapper.classList.remove('open');
            lgaWrapper.classList.toggle('open');
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', () => {
            stateWrapper.classList.remove('open');
            lgaWrapper.classList.remove('open');
        });

        // Initialize defaults based on user
        const user = window.loggedInUser || {};
        const stateToSelect = user.state || 'Lagos';
        const lgaToSelect = user.lga || 'Ikeja';

        buildStateOptions();
        lgaWrapper.classList.remove('disabled');
        buildLGAOptions(stateToSelect);
        selectedState = stateToSelect;
        stateText.textContent = stateToSelect;
        selectedLGA = lgaToSelect;
        lgaText.textContent = lgaToSelect;
        buildStateOptions(); // Rebuild to mark active
        buildLGAOptions(stateToSelect); // Rebuild to mark active
    }

    function populateEditProfileData() {
        const user = window.loggedInUser || {};
        const epFirstName = document.getElementById('epFirstName');
        const epLastName = document.getElementById('epLastName');
        const epAddress = document.getElementById('epAddress');

        const epTitle = modal.querySelector('.edit-profile-title');
        const epAvatar = modal.querySelector('.edit-profile-avatar');

        if (epFirstName) epFirstName.value = user.firstName || '';
        if (epLastName) epLastName.value = user.lastName || '';
        if (epAddress) epAddress.value = user.address || '';

        if (epTitle) epTitle.textContent = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        if (epAvatar) epAvatar.textContent = user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U';
    }

    // Pre-fill immediately on load
    populateEditProfileData();

    if (trigger) {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            populateEditProfileData(); // Refresh just in case
            modal.classList.add('show');
            document.body.classList.add('modal-open');
        });
    }

    // Since the button might be loaded after this script, we can also use event delegation
    document.addEventListener('click', (e) => {
        const trg = e.target.closest('#editProfileBtn');
        if (trg && modal) {
            e.preventDefault();
            populateEditProfileData();
            modal.classList.add('show');
            document.body.classList.add('modal-open');
        }
    });

    // Save logic
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const epFirstName = document.getElementById('epFirstName');
            const epLastName = document.getElementById('epLastName');
            const epAddress = document.getElementById('epAddress');

            const formatName = (str) => {
                if (!str) return '';
                return str.split(' ')
                    .map(word => word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : '')
                    .join(' ');
            };

            const newFirst = epFirstName ? formatName(epFirstName.value.trim()) : '';
            const newLast = epLastName ? formatName(epLastName.value.trim()) : '';
            const newAddress = epAddress ? epAddress.value.trim() : '';
            const newState = document.getElementById('stateText') ? document.getElementById('stateText').textContent.trim() : '';
            const newLGA = document.getElementById('lgaText') ? document.getElementById('lgaText').textContent.trim() : '';

            if (!newFirst || !newLast) {
                saveBtn.textContent = 'Name required';
                saveBtn.style.backgroundColor = '#dc3545';
                setTimeout(() => {
                    saveBtn.textContent = 'Update Information';
                    saveBtn.style.backgroundColor = '';
                }, 1500);
                return;
            }

            // Creative logic
            saveBtn.textContent = 'Saving...';
            saveBtn.style.opacity = '0.7';

            setTimeout(async () => {
                if (window.loggedInUser) {
                    try {
                        const payload = {
                            id: window.loggedInUser.id,
                            firstName: newFirst,
                            lastName: newLast,
                            address: newAddress,
                            state: newState,
                            lga: newLGA,
                            name: `${newFirst} ${newLast}`.trim()
                        };

                        const response = await fetch(`${window.API_BASE}/api/update-user`, {
                            method: 'POST',
                            headers: {
                    'Authorization': 'Bearer ' + (localStorage.getItem('nd_token') || ''), 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });

                        const data = await response.json();

                        if (response.status === 401 || response.status === 403) {
                            // Token is invalid or expired — clear it and show helpful message
                            localStorage.removeItem('nd_token');
                            throw new Error('Session expired. Please log out and log back in to make changes.');
                        }

                        if (data.success) {
                            window.loggedInUser.firstName = newFirst;
                            window.loggedInUser.lastName = newLast;
                            window.loggedInUser.address = newAddress;
                            window.loggedInUser.state = newState;
                            window.loggedInUser.lga = newLGA;
                            window.loggedInUser.name = payload.name;

                            // Update localStorage
                            localStorage.setItem('nd_logged_in_user', JSON.stringify(window.loggedInUser));

                            // Update global users array locally
                            const users = JSON.parse(localStorage.getItem('nd_users') || '[]');
                            const idx = users.findIndex(u => u.id === window.loggedInUser.id);
                            if (idx !== -1) {
                                users[idx] = { ...users[idx], ...window.loggedInUser };
                                localStorage.setItem('nd_users', JSON.stringify(users));
                            }

                            // Dynamically refresh main UI text
                            const menuName = document.querySelector('.menu-profile-header .profile-name');
                            const menuAvatar = document.querySelector('.menu-profile-header .profile-avatar');
                            const payoutGreeting = document.querySelector('.payout-wrapper .payout-text');

                            if (menuName) menuName.textContent = window.loggedInUser.name;
                            if (menuAvatar) menuAvatar.textContent = newFirst.charAt(0).toUpperCase();
                            if (payoutGreeting) payoutGreeting.textContent = `Hi, ${newFirst}`;

                            saveBtn.textContent = 'Saved Successfully!';
                            saveBtn.style.backgroundColor = '#8b5cf6';
                            saveBtn.style.color = '#fff';
                            saveBtn.style.opacity = '1';
                            setTimeout(() => {
                                saveBtn.textContent = 'Update Information';
                                saveBtn.style.backgroundColor = '';
                                saveBtn.style.color = '';
                                closeModal();
                            }, 1000);
                        } else {
                            throw new Error(data.error || 'Failed to update profile');
                        }
                    } catch (err) {
                        console.error('Profile update error:', err);
                        if (typeof customAlert === 'function') {
                            customAlert(err.message || 'Error updating profile.');
                        } else {
                            alert(err.message || 'Error updating profile.');
                        }
                        saveBtn.textContent = 'Error updating';
                        saveBtn.style.backgroundColor = '#dc3545';
                        setTimeout(() => {
                            saveBtn.textContent = 'Update Information';
                            saveBtn.style.backgroundColor = '';
                            saveBtn.style.opacity = '1';
                        }, 1500);
                    }
                }
            }, 800);
        });
    }




}




