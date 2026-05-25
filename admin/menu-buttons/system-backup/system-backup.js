function openSystemBackup() {
    fetch('menu-buttons/system-backup/system-backup.html')
        .then(res => res.text())
        .then(html => {
            const container = document.getElementById('modal-container');
            container.innerHTML = html;
            const modal = document.getElementById('systemBackupModal');
            setTimeout(() => {
                modal.style.display = 'flex';
                modal.offsetHeight;
                modal.classList.add('show');
            }, 10);

            const lastDate = localStorage.getItem('nd_last_backup_date');
            if (lastDate) document.getElementById('sbLastDate').textContent = lastDate;
        });
}

function closeSystemBackup() {
    const modal = document.getElementById('systemBackupModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => document.getElementById('modal-container').innerHTML = '', 400);
    }
}

function executeBackup() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('nd_')) {
            data[key] = localStorage.getItem(key);
        }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    a.download = `nd_Backup_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Auto-update UI
    const fancyDate = new Date().toLocaleString('en-US', { day: 'numeric', month: 'short', hour: 'numeric', minute: 'numeric', hour12: true });
    localStorage.setItem('nd_last_backup_date', fancyDate);
    document.getElementById('sbLastDate').textContent = fancyDate;
}
