const fs = require('fs');

let productJs = fs.readFileSync('c:/Users/mfmss/Documents/nd/admin/product/product-details.js', 'utf8');
let restockJs = fs.readFileSync('c:/Users/mfmss/Documents/nd/admin/menu-buttons/restock/restock.js', 'utf8');

// Find the block from product-details.js
const pLines = productJs.split('\n');
const startIdx = pLines.findIndex(l => l.includes("if (id === 'pdEditPriceDefProfit') {"));
const endIdx = pLines.findIndex((l, i) => i > startIdx && l.includes("if (id === 'pdEditPriceAnaBagPrice'")) + 4; // capture the return;}

let listenerBlockStr = pLines.slice(startIdx, endIdx).join('\n')
    .replace(/pdEditPrice/g, 'rsEditPrice')
    .replace(/_pdEditPrice/g, '_rsEditPrice')
    .replace(/currentSelectedProduct/g, '_rsCurrentProduct');

const rsLines = restockJs.split('\n');
const insertTarget = rsLines.findIndex(l => l.includes("// Title label updates"));
rsLines.splice(insertTarget, 0, '        // Edit Price Form logic\n' + listenerBlockStr + '\n');

fs.writeFileSync('c:/Users/mfmss/Documents/nd/admin/menu-buttons/restock/restock.js', rsLines.join('\n'));
console.log('Successfully injected price input listeners');
