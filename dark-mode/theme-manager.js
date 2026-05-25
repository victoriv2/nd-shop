/* =============================================
   nd shop — Theme Manager
   =============================================
   Handles theme switching.
   Forced to ONLY light mode. No system or dark.
   ============================================= */

(function () {
    'use strict';

    function applyTheme() {
        document.documentElement.setAttribute('data-theme', 'light');
    }

    applyTheme();

    // ── Expose globally to prevent errors if other scripts call it ──
    window.NDITheme = {
        set: () => applyTheme(),
        get: () => 'light',
        resolve: () => 'light'
    };
})();
