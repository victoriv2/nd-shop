const fs = require('fs');
const jsFile = 'C:\\Users\\MFM IKOT ABASI\\Documents\\nd\\payout\\payout.js';
let content = fs.readFileSync(jsFile, 'utf8');

// 1. Default Dropdown
content = content.replace(
    /const pContainer = modal\.querySelector\('#urpExistingPriceContainer'\);\s*const fContainer = modal\.querySelector\('#urpExistingFlexPriceContainer'\);\s*if \(item\.allowUserFlexiblePricing\) \{[\s\S]*?\} else \{[\s\S]*?\}/,
    `const toggleWrapper = modal.querySelector('#urpExistingFlexPriceToggleWrapper');
                    if (item.allowUserFlexiblePricing) {
                        if (toggleWrapper) toggleWrapper.style.display = 'flex';
                    } else {
                        if (toggleWrapper) toggleWrapper.style.display = 'none';
                    }
                    const toggleCb = modal.querySelector('#urpExistingFlexToggle');
                    if (toggleCb) { toggleCb.checked = false; toggleCb.dispatchEvent(new Event('change')); }
    `
);

// 2. Special Dropdown
content = content.replace(
    /const fContainer = modal\.querySelector\('#urpSpecFlexPriceContainer'\);\s*if \(item\.allowUserFlexiblePricing\) \{[\s\S]*?\} else \{[\s\S]*?\}/,
    `const toggleWrapper = modal.querySelector('#urpSpecFlexPriceToggleWrapper');
                    if (item.allowUserFlexiblePricing) {
                        if (toggleWrapper) toggleWrapper.style.display = 'flex';
                    } else {
                        if (toggleWrapper) toggleWrapper.style.display = 'none';
                    }
                    const toggleCb = modal.querySelector('#urpSpecFlexToggle');
                    if (toggleCb) { toggleCb.checked = false; toggleCb.dispatchEvent(new Event('change')); }
    `
);

// 3. Custom Dropdown
content = content.replace(
    /const pContainer = modal\.querySelector\('#urpCustomPriceContainer'\);\s*const fContainer = modal\.querySelector\('#urpCustomFlexPriceContainer'\);\s*if \(item\.allowUserFlexiblePricing\) \{[\s\S]*?\} else \{[\s\S]*?\}/,
    `const toggleWrapper = modal.querySelector('#urpCustomFlexPriceToggleWrapper');
                    if (item.allowUserFlexiblePricing) {
                        if (toggleWrapper) toggleWrapper.style.display = 'flex';
                    } else {
                        if (toggleWrapper) toggleWrapper.style.display = 'none';
                    }
                    const toggleCb = modal.querySelector('#urpCustomFlexToggle');
                    if (toggleCb) { toggleCb.checked = false; toggleCb.dispatchEvent(new Event('change')); }
    `
);

// 4. Flexible Dropdown - inside radio click listener
content = content.replace(
    /if \(urpFlexCustomPriceContainer\) urpFlexCustomPriceContainer\.style\.display = 'block';/,
    `if (val === 'c3') {
                        if (urpFlexCustomPriceContainer) urpFlexCustomPriceContainer.style.display = 'block';
                        const toggleWrapper = modal.querySelector('#urpFlexFlexPriceToggleWrapper');
                        if (toggleWrapper) toggleWrapper.style.display = 'none';
                    } else {
                        const toggleWrapper = modal.querySelector('#urpFlexFlexPriceToggleWrapper');
                        if (selectedProduct && selectedProduct.allowUserFlexiblePricing) {
                            if (toggleWrapper) toggleWrapper.style.display = 'flex';
                        } else {
                            if (toggleWrapper) toggleWrapper.style.display = 'none';
                        }
                    }
    `
);

content = content.replace(
    /if \(urpFlexCustomPriceContainer\) urpFlexCustomPriceContainer\.style\.display = 'none';/,
    `if (urpFlexCustomPriceContainer) urpFlexCustomPriceContainer.style.display = 'none';
                      const toggleWrapper = modal.querySelector('#urpFlexFlexPriceToggleWrapper');
                      if (toggleWrapper) toggleWrapper.style.display = 'none';
                      const toggleCb = modal.querySelector('#urpFlexFlexToggle');
                      if (toggleCb) { toggleCb.checked = false; toggleCb.dispatchEvent(new Event('change')); }
    `
);

fs.writeFileSync(jsFile, content);
console.log('User dropdown logic updated successfully');
