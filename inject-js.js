const fs = require('fs');

let productJs = fs.readFileSync('c:/Users/mfmss/Documents/nd/admin/product/product-details.js', 'utf8');
let restockJs = fs.readFileSync('c:/Users/mfmss/Documents/nd/admin/menu-buttons/restock/restock.js', 'utf8');

// The block we want from product-details.js starts at 'function openEditPriceForm()'
const pLines = productJs.split('\n');
const startIdx = pLines.findIndex(l => l.includes('function openEditPriceForm()'));
const endIdx = pLines.findIndex((l, i) => i > startIdx && l.trim() === 'function _pdExecuteClear()') - 2;

const codeBlockStr = '\n\n' + pLines.slice(startIdx, endIdx).join('\n')
    .replace(/function openEditPriceForm/g, 'function _rsOpenEditPriceForm')
    .replace(/pdEditPrice/g, 'rsEditPrice')
    .replace(/pdAction/g, 'rsAction')
    .replace(/_pdEditPrice/g, '_rsEditPrice')
    .replace(/pdSaveEdit/g, 'rsSaveEdit')
    .replace(/currentSelectedProduct/g, '_rsCurrentProduct')
    .replace(/productEditPriceFormView/g, 'rsEditPriceFormView')
    .replace(/_pdExecuteEditPrice/g, '_rsExecuteEditPrice')
    .replace(/_pdShowSuccess/g, '_rsShowSuccess')
    .replace(/closeAdminProductDetails\(\)/g, 'closeRestockDetailModal()')
    .replace(/_pdCloseAllEditProductFlows\(\)/g, '')
    .replace(/productDetailsView/g, 'rsDetailView')
    .replace(/renderProductsDetailedSummary\(\);/g, 'renderRestockList();\n    if (typeof window.renderProductsGlobal === "function") window.renderProductsGlobal();\n');

// Append to restock.js (we can just add it before the end of the file, or right after function _rsExecuteDelete()
const rsLines = restockJs.split('\n');
const insertTarget = rsLines.findIndex(l => l.includes('function _rsShowSuccess(title, desc)'));
rsLines.splice(insertTarget, 0, codeBlockStr + '\n\n');

fs.writeFileSync('c:/Users/mfmss/Documents/nd/admin/menu-buttons/restock/restock.js', rsLines.join('\n'));
console.log('Successfully injected _rsOpenEditPriceForm JS logic');
