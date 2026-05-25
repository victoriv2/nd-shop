const fs = require('fs');
const jsFile = 'C:\\Users\\MFM IKOT ABASI\\Documents\\nd\\admin\\menu-buttons\\payout-purchase\\payout-purchase.js';
let content = fs.readFileSync(jsFile, 'utf8');

// Flex Submit
content = content.replace(
    /const price = ppFlexItemPrice \? ppFlexItemPrice\.value : '';/,
    `let price = '';
            if (variantKey === 'c3') {
                price = ppFlexItemPrice ? ppFlexItemPrice.value : '';
            } else {
                const flexToggle = modal.querySelector('#ppFlexFlexToggle');
                if (prod && prod.allowUserFlexiblePricing && flexToggle && flexToggle.checked) {
                    price = ppFlexItemPrice ? ppFlexItemPrice.value : '';
                } else {
                    const presetPrice = (pt[variantKey] || {}).price || (variantKey === 'c1' ? prod.price : 0);
                    price = presetPrice;
                }
            }`
);

fs.writeFileSync(jsFile, content);
console.log('Flex submit handler updated');
