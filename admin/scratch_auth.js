function _checkModuleAdminAuth(moduleName, callback) {
    if (typeof customPrompt === 'function') {
        customPrompt(`Enter Admin PIN to access ${moduleName}`, 'password').then(pin => {
            if (pin === null) return;
            const requiredPin = localStorage.getItem('nd_delete_pin') || '1234';
            if (pin !== requiredPin) {
                if (typeof customAlert === 'function') customAlert("Incorrect Admin PIN! Access Denied.");
                else alert("Incorrect Admin PIN! Access Denied.");
                return;
            }
            callback();
        });
    } else {
        const pin = prompt(`Enter Admin PIN to access ${moduleName}`);
        if (pin === null) return;
        const requiredPin = localStorage.getItem('nd_delete_pin') || '1234';
        if (pin !== requiredPin) {
            alert("Incorrect Admin PIN! Access Denied.");
            return;
        }
        callback();
    }
}
