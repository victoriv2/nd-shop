const fs = require('fs');
const prodHtml = fs.readFileSync('c:/Users/mfmss/Documents/nd/admin/product/product-details.html', 'utf8');
const lines = prodHtml.split('\n');
const start = lines.findIndex(l => l.includes('<div id="productEditPriceFormView"'));
const end = lines.findIndex((l, i) => i > start && l.includes('<div id="productActionSuccessView"')) - 1;
const priceViewStr = lines.slice(start, end).join('\n')
    .replace(/productEditPriceFormView/g, 'rsEditPriceFormView')
    .replace(/pdEditPrice/g, 'rsEditPrice')
    .replace(/adminProductEditPriceClose/g, 'adminRestockEditPriceClose');

let restockHtml = fs.readFileSync('c:/Users/mfmss/Documents/nd/admin/menu-buttons/restock/restock.html', 'utf8');
const rsLines = restockHtml.split('\n');
const insertIdx = rsLines.findIndex(l => l.includes('<!-- VIEW 4: Success -->'));

rsLines.splice(insertIdx, 0, '        <!-- VIEW 5: Edit Price Form -->\n' + priceViewStr + '\n');
fs.writeFileSync('c:/Users/mfmss/Documents/nd/admin/menu-buttons/restock/restock.html', rsLines.join('\n'));
console.log('Successfully injected rsEditPriceFormView');
