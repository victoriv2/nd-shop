// Load and inject the Download App modal once at startup
(function() {
    const container = document.createElement('div');
    container.id = 'downloadApp-modal-container';
    document.body.appendChild(container);

    fetch('menu-buttons/download-app/download-app.html')
        .then(res => {
            if (!res.ok) throw new Error('Network response not ok');
            return res.text();
        })
        .then(html => {
            container.innerHTML = html;
            initDownloadAppLogic();
        })
        .catch(err => console.warn('Could not load download-app.html', err));
})();


function initDownloadAppLogic() {
    const modal = document.getElementById('downloadAppModal');
    const closeBtn = document.getElementById('downloadAppClose');
    const trigger = document.getElementById('downloadAppBtn');

    if (!modal) return;

    // Open Modal — use event delegation since #downloadAppBtn lives inside dynamically-loaded menu HTML
    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('#downloadAppBtn');
        if (!btn) return;
        e.preventDefault();
        modal.classList.add('show');
        document.body.classList.add('modal-open');
        resetDownloadState(); // Always fresh on open
    });

    // Close Modal Logic
    const closeModal = () => {
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);






    // ==========================================
    // Interactive Download Progress Logic
    // ==========================================
    const btnAndroid = document.getElementById('btnAndroid');
    const progressContainer = document.getElementById('androidProgressContainer');
    const successContainer = document.getElementById('androidSuccessContainer');
    const fillEl = document.getElementById('androidFill');
    const percentEl = document.getElementById('androidPercent');
    const speedEl = document.getElementById('androidSpeed');
    const cancelBtn = document.getElementById('androidCancel');
    const mainIcon = document.getElementById('dAppMainIcon');
    const mainDesc = document.getElementById('dAppDesc');

    let downloadInterval = null;
    let isDownloading = false;

    // 1. User Clicks Download
    if (btnAndroid) {
        btnAndroid.addEventListener('click', (e) => {
            e.preventDefault();
            startDownload();
        });
    }

    // 2. Start Download Simulation
    function startDownload() {
        if (isDownloading) return;
        isDownloading = true;

        // Visual State Transitions
        btnAndroid.classList.add('hidden');
        progressContainer.classList.remove('hidden');
        mainIcon.classList.add('spin');
        mainDesc.innerHTML = 'Connecting to secure server...';

        let progress = 0;
        let speeds = ['3.2 MB/s', '4.1 MB/s', '2.8 MB/s', '5.5 MB/s', '3.8 MB/s'];
        let speedTick = 0;

        // Reset progress visually immediately
        fillEl.style.width = '0%';
        percentEl.textContent = '0%';

        downloadInterval = setInterval(() => {
            // Randomly jump between 1-6% per tick for realism
            const jump = Math.floor(Math.random() * 6) + 1;
            progress += jump;

            // Change speed text every few ticks
            speedTick++;
            if (speedTick % 3 === 0) {
                speedEl.textContent = speeds[Math.floor(Math.random() * speeds.length)] + ' - 18MB total';
            }

            // Update DOM 
            if (progress >= 30) mainDesc.innerHTML = 'Downloading core application files...';
            if (progress >= 70) mainDesc.innerHTML = 'Verifying local file integrity...';
            if (progress >= 90) mainDesc.innerHTML = 'Finalizing package...';

            if (progress >= 100) {
                // Done!
                progress = 100;
                finishDownload();
            }

            fillEl.style.width = progress + '%';
            percentEl.textContent = progress + '%';

        }, 120); // updates roughly 8x a second
    }

    // 3. User Clicks Cancel Mid-Download
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            clearInterval(downloadInterval);
            resetDownloadState();
        });
    }

    // 4. Complete Download
    function finishDownload() {
        clearInterval(downloadInterval);
        isDownloading = false;

        mainIcon.classList.remove('spin');
        mainDesc.innerHTML = 'Application successfully downloaded and verified.';

        // Slight delay before jumping to success screen
        setTimeout(() => {
            progressContainer.classList.add('hidden');
            successContainer.classList.remove('hidden');
        }, 300);
    }

    // 5. User clicks final success container 
    if (successContainer) {
        successContainer.addEventListener('click', () => {
            customAlert('This would trigger the native Android APK package installer prompt.');
            closeModal();
        });
    }

    // Helper: Reset everything to initial state
    function resetDownloadState() {
        clearInterval(downloadInterval);
        isDownloading = false;

        btnAndroid.classList.remove('hidden');
        progressContainer.classList.add('hidden');
        successContainer.classList.add('hidden');

        fillEl.style.width = '0%';
        percentEl.textContent = '0%';
        speedEl.textContent = 'Calculating...';

        mainIcon.classList.remove('spin');
        mainDesc.innerHTML = 'Experience faster browsing, instant notifications, and exclusive features by downloading our mobile app.';
    }
}
