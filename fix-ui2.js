const fs = require('fs');
const jsFile = 'C:\\Users\\MFM IKOT ABASI\\Documents\\nd\\admin\\menu-buttons\\payout-purchase\\payout-purchase.js';
let content = fs.readFileSync(jsFile, 'utf8');

// 1. Default
content = content.replace(
    /const prodLookup = defaultInventory\.find\(p => p\.name === itemName\);\s*let isFlexPrice = false;\s*if \(prodLookup && prodLookup\.allowUserFlexiblePricing\) \{/g,
    `const prodLookup = defaultInventory.find(p => p.name === itemName);
            let isFlexPrice = false;
            const existingToggle = modal.querySelector('#ppExistingFlexToggle');
            if (prodLookup && prodLookup.allowUserFlexiblePricing && existingToggle && existingToggle.checked) {`
);

// 2. Special
content = content.replace(
    /const prodLookup = specialInventory\.find\(p => p\.name === itemName\);\s*if \(prodLookup && prodLookup\.allowUserFlexiblePricing\) \{/g,
    `const prodLookup = specialInventory.find(p => p.name === itemName);
            const specToggle = modal.querySelector('#ppSpecFlexToggle');
            if (prodLookup && prodLookup.allowUserFlexiblePricing && specToggle && specToggle.checked) {`
);

// 3. Custom
content = content.replace(
    /const prodLookup = customInventory\.find\(p => p\.name === itemName\);\s*if \(prodLookup && prodLookup\.allowUserFlexiblePricing\) \{/g,
    `const prodLookup = customInventory.find(p => p.name === itemName);
        const customToggle = modal.querySelector('#ppCustomFlexToggle');
        if (prodLookup && prodLookup.allowUserFlexiblePricing && customToggle && customToggle.checked) {`
);

fs.writeFileSync(jsFile, content);
console.log('Submit handlers updated');
