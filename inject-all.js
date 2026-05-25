const fs = require('fs');

let productJs = fs.readFileSync('c:/Users/mfmss/Documents/nd/admin/product/product-details.js', 'utf8');

const pLines = productJs.split('\n');

/// BLOCK 1: function _rsOpenEditPriceForm
const s1 = pLines.findIndex(l => l.includes('function openEditPriceForm()'));
const e1 = pLines.findIndex((l, i) => i > s1 && l.includes('document.getElementById(\'pdActionDoneBtn\')?.addEventListener'));

const b1 = pLines.slice(s1, e1).join('\n')
    .replace(/function openEditPriceForm/g, 'function _rsOpenEditPriceForm')
    .replace(/pdEditPrice/g, 'rsEditPrice')
    .replace(/pdAction/g, 'rsAction')
    .replace(/_pdEditPrice/g, '_rsEditPrice')
    .replace(/currentSelectedProduct/g, '_rsCurrentProduct')
    .replace(/productEditPriceFormView/g, 'rsEditPriceFormView')
    .replace(/_pdEditAnaCalc/g, '_rsEditAnaCalc')
    .replace(/_pdEditDefCalc/g, '_rsEditDefCalc');

/// BLOCK 2: input listeners
const s2 = pLines.findIndex(l => l.includes("if (id === 'pdEditPriceDefProfit') {"));
const e2 = pLines.findIndex((l, i) => i > s2 && l.includes("if (id === 'pdEditPriceAnaBagPrice'")) + 4; // capture the return;}

const b2 = pLines.slice(s2, e2).join('\n')
    .replace(/pdEditPrice/g, 'rsEditPrice')
    .replace(/_pdEditPrice/g, '_rsEditPrice')
    .replace(/currentSelectedProduct/g, '_rsCurrentProduct');

let restockJs = fs.readFileSync('c:/Users/mfmss/Documents/nd/admin/menu-buttons/restock/restock.js', 'utf8');
const rsLines = restockJs.split('\n');

// Inject block 1 right before function _rsShowSuccess
const t1 = rsLines.findIndex(l => l.includes('function _rsShowSuccess(title, desc)'));
rsLines.splice(t1, 0, '\n' + b1 + '\n');

// Inject block 2 right before // Title label updates
const t2 = rsLines.findIndex(l => l.includes('// Title label updates'));
rsLines.splice(t2, 0, '        // Edit Price Form logic\n' + b2 + '\n');

fs.writeFileSync('c:/Users/mfmss/Documents/nd/admin/menu-buttons/restock/restock.js', rsLines.join('\n'));
console.log('Done injecting everything');
