const fs = require('fs');
const jsFile = 'C:\\Users\\MFM IKOT ABASI\\Documents\\nd\\payout\\payout.js';
let content = fs.readFileSync(jsFile, 'utf8');

// Default Dropdown
content = content.replace(
    /urpExistingDropdownWrapper\.classList\.remove\('open'\);/g,
    `const toggleWrapper = modal.querySelector('#urpExistingFlexPriceToggleWrapper');
                    if (item.allowUserFlexiblePricing) {
                        if (toggleWrapper) toggleWrapper.style.display = 'flex';
                    } else {
                        if (toggleWrapper) toggleWrapper.style.display = 'none';
                    }
                    const toggleCb = modal.querySelector('#urpExistingFlexToggle');
                    if (toggleCb) { toggleCb.checked = false; toggleCb.dispatchEvent(new Event('change')); }
                    urpExistingDropdownWrapper.classList.remove('open');`
);

// Special Dropdown
content = content.replace(
    /urpSpecDropdownWrapper\.classList\.remove\('open'\);/g,
    `const toggleWrapper = modal.querySelector('#urpSpecFlexPriceToggleWrapper');
                    if (item.allowUserFlexiblePricing) {
                        if (toggleWrapper) toggleWrapper.style.display = 'flex';
                    } else {
                        if (toggleWrapper) toggleWrapper.style.display = 'none';
                    }
                    const toggleCb = modal.querySelector('#urpSpecFlexToggle');
                    if (toggleCb) { toggleCb.checked = false; toggleCb.dispatchEvent(new Event('change')); }
                    urpSpecDropdownWrapper.classList.remove('open');`
);

// Custom Dropdown
content = content.replace(
    /urpCustomDropdownWrapper\.classList\.remove\('open'\);/g,
    `const toggleWrapper = modal.querySelector('#urpCustomFlexPriceToggleWrapper');
                    if (item.allowUserFlexiblePricing) {
                        if (toggleWrapper) toggleWrapper.style.display = 'flex';
                    } else {
                        if (toggleWrapper) toggleWrapper.style.display = 'none';
                    }
                    const toggleCb = modal.querySelector('#urpCustomFlexToggle');
                    if (toggleCb) { toggleCb.checked = false; toggleCb.dispatchEvent(new Event('change')); }
                    urpCustomDropdownWrapper.classList.remove('open');`
);

// We should also ensure the toggles are reset when the form clears after add to basket.
// Default Form Reset
content = content.replace(
    /urpExistingItemPrice\.dataset\.price = '';/,
    `urpExistingItemPrice.dataset.price = '';
            const tW = modal.querySelector('#urpExistingFlexPriceToggleWrapper');
            if (tW) tW.style.display = 'none';
            const tC = modal.querySelector('#urpExistingFlexToggle');
            if (tC) { tC.checked = false; tC.dispatchEvent(new Event('change')); }`
);

// Custom Form Reset
content = content.replace(
    /urpCustomItemPrice\.dataset\.price = '';/,
    `urpCustomItemPrice.dataset.price = '';
            const tW = modal.querySelector('#urpCustomFlexPriceToggleWrapper');
            if (tW) tW.style.display = 'none';
            const tC = modal.querySelector('#urpCustomFlexToggle');
            if (tC) { tC.checked = false; tC.dispatchEvent(new Event('change')); }`
);

// Special Form Reset
content = content.replace(
    /urpSpecItemSelect\.value = '';\s*urpSpecDropdownTrigger\.querySelector\('\.trigger-text'\)\.textContent = 'Select an Analytical Product';/,
    `urpSpecItemSelect.value = '';
            urpSpecDropdownTrigger.querySelector('.trigger-text').textContent = 'Select an Analytical Product';
            const tW = modal.querySelector('#urpSpecFlexPriceToggleWrapper');
            if (tW) tW.style.display = 'none';
            const tC = modal.querySelector('#urpSpecFlexToggle');
            if (tC) { tC.checked = false; tC.dispatchEvent(new Event('change')); }`
);

fs.writeFileSync(jsFile, content);
console.log('User dropdown logic completely fixed');
