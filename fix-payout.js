const fs = require('fs');
const jsFile = 'C:\\Users\\MFM IKOT ABASI\\Documents\\nd\\payout\\payout.js';
let content = fs.readFileSync(jsFile, 'utf8');

// 1. Default
content = content.replace(
    /const price = urpExistingPrice\.dataset\.price;/,
    `let price = urpExistingPrice.dataset.price;
        const existingToggle = modal.querySelector('#urpExistingFlexToggle');
        const prodLookup = defaultInventory.find(p => p.name === itemName);
        let isFlexPrice = false;
        if (prodLookup && prodLookup.allowUserFlexiblePricing && existingToggle && existingToggle.checked) {
            const fPrice = modal.querySelector('#urpExistingFlexPrice').value;
            if(fPrice) { price = fPrice; isFlexPrice = true; }
        }`
);
content = content.replace(
    /_addToURPBasket\(\`\$\{finalName\}\s*\(\$\{finalUnit\}\)\`,\s*requiredQty,\s*Number\(price\),\s*finalUnit,\s*isWholesale\);/,
    `_addToURPBasket(\`\${finalName} (\${finalUnit})\`, requiredQty, Number(price), finalUnit, isWholesale, isFlexPrice);`
);

// 2. Special
content = content.replace(
    /const price = urpSpecVariantBagPrice\.dataset\.price;/,
    `let price = urpSpecVariantBagPrice.dataset.price;
            const prodLookup = specialInventory.find(p => p.name === itemName);
            const specToggle = modal.querySelector('#urpSpecFlexToggle');
            let isFlexPrice = false;
            if (prodLookup && prodLookup.allowUserFlexiblePricing && specToggle && specToggle.checked) {
                const fPrice = modal.querySelector('#urpSpecFlexPrice').value;
                if(fPrice) { price = fPrice; isFlexPrice = true; }
            }`
);
content = content.replace(
    /const price = urpSpecVariantCustardPrice\.dataset\.price;/,
    `let price = urpSpecVariantCustardPrice.dataset.price;
            const prodLookup = specialInventory.find(p => p.name === itemName);
            const specToggle = modal.querySelector('#urpSpecFlexToggle');
            let isFlexPrice = false;
            if (prodLookup && prodLookup.allowUserFlexiblePricing && specToggle && specToggle.checked) {
                const fPrice = modal.querySelector('#urpSpecFlexPrice').value;
                if(fPrice) { price = fPrice; isFlexPrice = true; }
            }`
);
content = content.replace(
    /const price = urpSpecVariantCupPrice\.dataset\.price;/,
    `let price = urpSpecVariantCupPrice.dataset.price;
            const prodLookup = specialInventory.find(p => p.name === itemName);
            const specToggle = modal.querySelector('#urpSpecFlexToggle');
            let isFlexPrice = false;
            if (prodLookup && prodLookup.allowUserFlexiblePricing && specToggle && specToggle.checked) {
                const fPrice = modal.querySelector('#urpSpecFlexPrice').value;
                if(fPrice) { price = fPrice; isFlexPrice = true; }
            }`
);
content = content.replace(
    /_addToURPBasket\(\`\$\{itemName\}\s*\(\$\{titleStr\}\)\`,\s*requiredQty,\s*Number\(price\),\s*titleStr\);/g,
    `_addToURPBasket(\`\${itemName} (\${titleStr})\`, requiredQty, Number(price), titleStr, false, isFlexPrice);`
);

// 3. Custom
content = content.replace(
    /const price = urpCustomItemPrice\.dataset\.price;/,
    `let price = urpCustomItemPrice.dataset.price;
        const prodLookup = customInventory.find(p => p.name === itemName);
        const customToggle = modal.querySelector('#urpCustomFlexToggle');
        let isFlexPrice = false;
        if (prodLookup && prodLookup.allowUserFlexiblePricing && customToggle && customToggle.checked) {
            const fPrice = modal.querySelector('#urpCustomFlexPrice').value;
            if(fPrice) { price = fPrice; isFlexPrice = true; }
        }`
);
content = content.replace(
    /_addToURPBasket\(\`\$\{itemName\}\s*\(Custom\)\`,\s*requiredQty,\s*Number\(price\),\s*'Custom'\);/,
    `_addToURPBasket(\`\${itemName} (Custom)\`, requiredQty, Number(price), 'Custom', false, isFlexPrice);`
);


fs.writeFileSync(jsFile, content);
console.log('payout.js submit handlers updated');
