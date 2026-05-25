const fs = require('fs');
const jsFile = 'C:\\Users\\MFM IKOT ABASI\\Documents\\nd\\admin\\menu-buttons\\payout-purchase\\payout-purchase.js';
let content = fs.readFileSync(jsFile, 'utf8');

const toggleLogic = `
// Initialize Flexible Pricing Toggles for Payout Purchase
function initPPToggles() {
    const toggles = [
        { id: 'ppExistingFlexToggle', cFixed: 'ppExistingPriceContainer', cFlex: 'ppExistingFlexPriceContainer' },
        { id: 'ppSpecFlexToggle', cFixed: null, cFlex: 'ppSpecFlexPriceContainer' },
        { id: 'ppCustomFlexToggle', cFixed: 'ppCustomPriceContainer', cFlex: 'ppCustomFlexPriceContainer' },
        { id: 'ppFlexFlexToggle', cFixed: null, cFlex: 'ppFlexCustomPriceContainer' }
    ];

    toggles.forEach(t => {
        const toggle = document.getElementById(t.id);
        if (toggle) {
            toggle.addEventListener('change', function() {
                const bg = document.getElementById(t.id + 'Bg');
                const knob = document.getElementById(t.id + 'Knob');
                const cFixed = t.cFixed ? document.getElementById(t.cFixed) : null;
                const cFlex = document.getElementById(t.cFlex);

                if (this.checked) {
                    if (bg) bg.style.backgroundColor = '#f0abfc';
                    if (knob) knob.style.transform = 'translateX(20px)';
                    if (cFixed) cFixed.style.display = 'none';
                    if (cFlex) cFlex.style.display = 'block';
                } else {
                    if (bg) bg.style.backgroundColor = '#e2e8f0';
                    if (knob) knob.style.transform = 'translateX(0)';
                    if (cFixed) cFixed.style.display = 'block';
                    if (cFlex) cFlex.style.display = 'none';
                }
            });
        }
    });
}
document.addEventListener('DOMContentLoaded', initPPToggles);
initPPToggles();
`;

if (!content.includes('initPPToggles()')) {
    content += '\n' + toggleLogic;
}

// 1. Default Dropdown
content = content.replace(
    /const pContainer = modal\.querySelector\('#ppExistingPriceContainer'\);\s*const fContainer = modal\.querySelector\('#ppExistingFlexPriceContainer'\);\s*if \(item\.allowUserFlexiblePricing\) \{[\s\S]*?\} else \{[\s\S]*?\}/,
    `const toggleWrapper = modal.querySelector('#ppExistingFlexPriceToggleWrapper');
                    if (item.allowUserFlexiblePricing) {
                        if (toggleWrapper) toggleWrapper.style.display = 'flex';
                    } else {
                        if (toggleWrapper) toggleWrapper.style.display = 'none';
                    }
                    const toggleCb = modal.querySelector('#ppExistingFlexToggle');
                    if (toggleCb) { toggleCb.checked = false; toggleCb.dispatchEvent(new Event('change')); }
    `
);

// 2. Special Dropdown
content = content.replace(
    /const fContainer = modal\.querySelector\('#ppSpecFlexPriceContainer'\);\s*if \(item\.allowUserFlexiblePricing\) \{[\s\S]*?\} else \{[\s\S]*?\}/,
    `const toggleWrapper = modal.querySelector('#ppSpecFlexPriceToggleWrapper');
                    if (item.allowUserFlexiblePricing) {
                        if (toggleWrapper) toggleWrapper.style.display = 'flex';
                    } else {
                        if (toggleWrapper) toggleWrapper.style.display = 'none';
                    }
                    const toggleCb = modal.querySelector('#ppSpecFlexToggle');
                    if (toggleCb) { toggleCb.checked = false; toggleCb.dispatchEvent(new Event('change')); }
    `
);

// 3. Custom Dropdown
content = content.replace(
    /const pContainer = modal\.querySelector\('#ppCustomPriceContainer'\);\s*const fContainer = modal\.querySelector\('#ppCustomFlexPriceContainer'\);\s*if \(item\.allowUserFlexiblePricing\) \{[\s\S]*?\} else \{[\s\S]*?\}/,
    `const toggleWrapper = modal.querySelector('#ppCustomFlexPriceToggleWrapper');
                    if (item.allowUserFlexiblePricing) {
                        if (toggleWrapper) toggleWrapper.style.display = 'flex';
                    } else {
                        if (toggleWrapper) toggleWrapper.style.display = 'none';
                    }
                    const toggleCb = modal.querySelector('#ppCustomFlexToggle');
                    if (toggleCb) { toggleCb.checked = false; toggleCb.dispatchEvent(new Event('change')); }
    `
);

// Now for Flexible Dropdown
content = content.replace(
    /if \(ppFlexCustomPriceContainer\) ppFlexCustomPriceContainer\.style\.display = 'block';/,
    `if (val === 'c3') {
                        if (ppFlexCustomPriceContainer) ppFlexCustomPriceContainer.style.display = 'block';
                        const toggleWrapper = modal.querySelector('#ppFlexFlexPriceToggleWrapper');
                        if (toggleWrapper) toggleWrapper.style.display = 'none';
                    } else {
                        const toggleWrapper = modal.querySelector('#ppFlexFlexPriceToggleWrapper');
                        if (selectedProduct && selectedProduct.allowUserFlexiblePricing) {
                            if (toggleWrapper) toggleWrapper.style.display = 'flex';
                        } else {
                            if (toggleWrapper) toggleWrapper.style.display = 'none';
                        }
                    }
    `
);

// In flexible variant reset
content = content.replace(
    /if \(ppFlexCustomPriceContainer\) ppFlexCustomPriceContainer\.style\.display = 'none';/,
    `if (ppFlexCustomPriceContainer) ppFlexCustomPriceContainer.style.display = 'none';
                      const toggleWrapper = modal.querySelector('#ppFlexFlexPriceToggleWrapper');
                      if (toggleWrapper) toggleWrapper.style.display = 'none';
                      const toggleCb = modal.querySelector('#ppFlexFlexToggle');
                      if (toggleCb) { toggleCb.checked = false; toggleCb.dispatchEvent(new Event('change')); }
    `
);

fs.writeFileSync(jsFile, content);
console.log('JS updated successfully');
