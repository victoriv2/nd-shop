/**
 * Clear the saved admin page state from localStorage
 * This should be called whenever a modal is closed, so refresh doesn't restore it
 */
window.clearAdminModalPersistence = function () {
    try {
        localStorage.removeItem('nd_admin_page_state');
        console.log('[ModalPersistence] Admin page state cleared on modal close');
    } catch (e) {
        console.warn('[ModalPersistence] Error clearing page state:', e);
    }
};
