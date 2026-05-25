// Last-seen tracker for user-facing pages
// Records current user's lastSeen timestamp in localStorage
(function() {
    function recordLastSeen(userId) {
        const data = JSON.parse(localStorage.getItem('nd_user_last_seen') || '{}');
        data[userId] = new Date().toISOString();
        localStorage.setItem('nd_user_last_seen', JSON.stringify(data));
    }

    function track() {
        const loggedIn = window.loggedInUser || JSON.parse(localStorage.getItem('nd_logged_in_user') || 'null');
        if (loggedIn && loggedIn.id) {
            recordLastSeen(loggedIn.id);
        }
    }

    // Record immediately
    track();

    // Refresh every 30 seconds
    setInterval(track, 30000);
})();
