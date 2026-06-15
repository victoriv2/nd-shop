function openMaintenance() {
    fetch('menu-buttons/maintenance/maintenance.html')
        .then(res => res.text())
        .then(html => {
            const container = document.getElementById('modal-container');
            container.innerHTML = html;
            
            // Initialize maintenance mode button state
            const isMaint = localStorage.getItem('nd_maintenance_mode') === 'true';
            const btn = document.getElementById('btnToggleMaint');
            if (btn) {
                if (isMaint) {
                    btn.textContent = 'Disable Maintenance';
                    btn.style.background = '#dc3545'; // red for disable action
                } else {
                    btn.textContent = 'Enable Maintenance';
                    btn.style.background = '#8b5cf6'; // blue for enable action
                }
            }



            const modal = document.getElementById('maintenanceModal');
            setTimeout(() => {
                modal.style.display = 'flex';
                modal.offsetHeight;
                modal.classList.add('show');
            }, 10);
        });
}

function closeMaintenance() {
    const modal = document.getElementById('maintenanceModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => document.getElementById('modal-container').innerHTML = '', 400);
    }
    if (typeof window.clearAdminModalPersistence === 'function') {
        window.clearAdminModalPersistence();
    }
}

function toggleMaintenanceMode() {
    const isMaint = localStorage.getItem('nd_maintenance_mode') === 'true';
    const newState = !isMaint;
    localStorage.setItem('nd_maintenance_mode', newState.toString());

    const btn = document.getElementById('btnToggleMaint');
    if (btn) {
        if (newState) {
            btn.textContent = 'Disable Maintenance';
            btn.style.background = '#dc3545';
        } else {
            btn.textContent = 'Enable Maintenance';
            btn.style.background = '#8b5cf6';
        }
        
        // Add a slight click animation
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => btn.style.transform = 'scale(1)', 150);
    }
}


function clearProcessedRequests() {
    customConfirm('Are you sure you want to clear processed requests? This frees up space.').then(confirmed => {
        if (confirmed) {
            const requests = JSON.parse(localStorage.getItem('nd_requests_data') || '[]');
            const pendingOnly = requests.filter(r => r.status === 'Pending');
            localStorage.setItem('nd_requests_data', JSON.stringify(pendingOnly));

            const btn = document.querySelector('.maint-card.warning .maint-action-btn');
            if (btn) {
                const originalText = btn.textContent;
                btn.textContent = 'Storage Optimized ✓';
                btn.style.background = '#8b5cf6';
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = '';
                }, 2000);
            }

            if (typeof calculateStorageUsage === 'function') setTimeout(calculateStorageUsage, 500);
        }
    });
}

function factoryReset() {
    customConfirm('🚨 CRITICAL WARNING 🚨\n\nThis will permanently DELETE ALL SALES, USERS, and SETTINGS.\n\nAre you absolutely sure you want to proceed?', true).then(confirmed => {
        if (confirmed) {
            customPrompt("Admin Password Required:\nEnter 4-digit PIN to authorize factory reset:", 'password').then(pin => {
                const requiredPin = localStorage.getItem('nd_delete_pin') || '1234';
                
                if (pin === requiredPin) {
                    const token = localStorage.getItem('nd_token') || '';
                    fetch(`${window.API_BASE}/api/factory-reset`, {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer ' + token, 
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ wipeMessages: true, wipeUsers: true })
                    }).finally(() => {
                        localStorage.clear();
                        customAlert('System wiped from cloud and local. Reloading application...').then(() => {
                            window.location.reload();
                        });
                    });
                } else if (pin !== null) {
                    customAlert('Incorrect PIN. Factory reset cancelled.');
                }
            });
        }
    });
}

// ============================================================
// Reset (preserves user accounts & admin credentials)
// ============================================================
function factoryResetSafe() {
    // Sync toggle visual before opening modal
    const cb = document.getElementById('maintResetWipeMessages');
    const slider = document.getElementById('maintResetSlider');
    const knob = document.getElementById('maintResetKnob');
    if (cb && slider && knob) {
        cb.addEventListener('change', () => {
            slider.style.background = cb.checked ? '#ea580c' : '#cbd5e1';
            knob.style.transform = cb.checked ? 'translateX(20px)' : 'translateX(0)';
        });
    }

    // Reset modal state
    const step1 = document.getElementById('maintResetStep1');
    const step2 = document.getElementById('maintResetStep2');
    if (step1) step1.style.display = 'block';
    if (step2) step2.style.display = 'none';
    ['mrPin1','mrPin2','mrPin3','mrPin4'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    const ci = document.getElementById('mrConfirmInput'); if (ci) ci.value = '';
    const pe = document.getElementById('mrPinError'); if (pe) pe.style.display = 'none';
    const ce = document.getElementById('mrConfirmError'); if (ce) ce.style.display = 'none';

    const modal = document.getElementById('maintResetModal');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('show');
            const first = document.getElementById('mrPin1');
            if (first) first.focus();
        }, 10);
    }
}

function closeMaintResetModal() {
    const modal = document.getElementById('maintResetModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    }
}

function moveMrPin(input, index) {
    if (input.value.length > 1) input.value = input.value.slice(-1);
    input.value = input.value.replace(/\D/g, '');
    if (input.value) {
        const ids = ['mrPin1','mrPin2','mrPin3','mrPin4'];
        if (index < ids.length - 1) {
            const next = document.getElementById(ids[index + 1]);
            if (next) next.focus();
        }
    }
}

function verifyMrPin() {
    const ids = ['mrPin1','mrPin2','mrPin3','mrPin4'];
    const entered = ids.map(id => { const el = document.getElementById(id); return el ? el.value : ''; }).join('');
    const correct = localStorage.getItem('nd_delete_pin') || '1234';
    const err = document.getElementById('mrPinError');

    if (entered.length < 4) {
        if (err) { err.textContent = 'Please enter all 4 digits.'; err.style.display = 'block'; }
        return;
    }
    if (entered !== correct) {
        if (err) { err.textContent = 'Incorrect PIN. Try again.'; err.style.display = 'block'; }
        ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        const first = document.getElementById('mrPin1'); if (first) first.focus();
        return;
    }
    if (err) err.style.display = 'none';
    document.getElementById('maintResetStep1').style.display = 'none';
    document.getElementById('maintResetStep2').style.display = 'block';
    const ci = document.getElementById('mrConfirmInput'); if (ci) { ci.value = ''; ci.focus(); }
}

function executeMaintReset() {
    const ci = document.getElementById('mrConfirmInput');
    const ce = document.getElementById('mrConfirmError');
    const typed = ci ? ci.value.trim() : '';

    if (typed !== 'RESET') { if (ce) ce.style.display = 'block'; return; }
    if (ce) ce.style.display = 'none';

    const wipeMsgs = document.getElementById('maintResetWipeMessages');
    const doWipeMsgs = wipeMsgs && wipeMsgs.checked;

    const PRESERVE = [
        'nd_users', 'nd_admin_id', 'nd_admin_name',
        'nd_admin_pwd', 'nd_delete_pin', 'nd_admin_locks', 'nd_xai_api_key'
    ];
    const MESSAGE_KEYS = [
        'nd_messages', 'nd_comm_messages', 'nd_comm_settings',
        'nd_blocked_messaging_users', 'nd_pinned_chats',
        'nd_ai_chat_history', 'nd_ai_chat_threads', 'nd_user_ai_chat_threads'
    ];

    const token = localStorage.getItem('nd_token') || '';

    // Call the server to wipe Supabase database
    fetch(`${window.API_BASE}/api/factory-reset`, {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token, 
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ wipeMessages: doWipeMsgs })
    }).then(() => {
        // Wipe all nd_ keys except preserved (and optionally messages)
        Object.keys(localStorage).forEach(key => {
            if (!key.startsWith('nd_')) return;
            if (PRESERVE.includes(key)) return;
            if (!doWipeMsgs && MESSAGE_KEYS.includes(key)) return;
            localStorage.removeItem(key);
        });

        closeMaintResetModal();
        const msg = doWipeMsgs
            ? 'Reset complete. All data (including messages) wiped from Cloud and Local. User accounts preserved.'
            : 'Reset complete. All business data wiped from Cloud and Local. Messages and user accounts preserved.';

        if (typeof customAlert !== 'undefined') {
            customAlert(msg).then(() => window.location.reload());
        } else {
            alert(msg);
            window.location.reload();
        }
    }).catch(err => {
        console.error('Failed to wipe cloud data', err);
        alert('Error communicating with server for factory reset.');
        window.location.reload();
    });
}




