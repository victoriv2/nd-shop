const fs = require('fs');
const path = require('path');

// Mock localStorage and browser globals for Node.js
const mockStorage = {};
global.localStorage = {
    getItem: (key) => mockStorage[key] || null,
    setItem: (key, val) => {
        mockStorage[key] = String(val);
    },
    removeItem: (key) => {
        delete mockStorage[key];
    },
    clear: () => {
        for (let k in mockStorage) delete mockStorage[k];
    }
};

global.sessionStorage = {
    getItem: (key) => null,
    setItem: (key, val) => {},
    removeItem: (key) => {}
};

global.window = {
    parseSaleDate: (dateStr) => {
        if (!dateStr) return 0;
        return new Date(dateStr).getTime();
    },
    addEventListener: () => {},
    dispatchEvent: () => {}
};

global.CustomEvent = class {
    constructor(type, details) {
        this.type = type;
        this.detail = details;
    }
};

global.document = {
    addEventListener: () => {}
};

global.MutationObserver = class {
    constructor() {}
    observe() {}
    disconnect() {}
};

const fileCode = fs.readFileSync(path.join(__dirname, '..', 'global-fixes.js'), 'utf8');
eval(fileCode);

console.log("Mock environment set up. global-fixes.js evaluated successfully.");

const product = {
    id: "ndp_default_test_123",
    name: "Golden Bread",
    cost: 10,
    pieces: 10,
    boughtQuantity: 5,
    isSpecial: false,
    isFlexible: false,
    isCustom: false,
    dateAdded: "2026-06-25T13:00:00.000Z"
};

localStorage.setItem('nd_products_data', JSON.stringify([product]));
localStorage.setItem('nd_sales_history', JSON.stringify([]));

console.log("--- Initial Stock Check ---");
let remaining = window.getRemainingProductStock("ndp_default_test_123");
console.log("Initial remaining pieces:", remaining);

const sales = [
    { item: "Golden Bread (Carton)", qty: 2, date: "2026-06-25T13:10:00.000Z" },
    { item: "Golden Bread (piece)", qty: 5, date: "2026-06-25T13:15:00.000Z" }
];
localStorage.setItem('nd_sales_history', JSON.stringify(sales));
remaining = window.getRemainingProductStock("ndp_default_test_123");
console.log("Remaining after sales:", remaining);

console.log("--- Simulating Retail Only Top-Up of 15 pieces ---");
let products = JSON.parse(localStorage.getItem('nd_products_data'));
let old = products[0];
const retailCost = 10;
const retailQty = 15;
const pcs = old.pieces;
const newTotalCost = retailCost * retailQty;
const boughtQuantityToAdd = retailQty / pcs;

old.purchaseCost = (parseFloat(old.purchaseCost) || 0) + newTotalCost;
old.boughtQuantity = (parseFloat(old.boughtQuantity) || 0) + boughtQuantityToAdd;
localStorage.setItem('nd_products_data', JSON.stringify(products));

remaining = window.getRemainingProductStock("ndp_default_test_123");
console.log("Remaining after top-up:", remaining);

if (remaining === 40) {
    console.log("SUCCESS! Retail top-up logic works perfectly with stock calculation.");
} else {
    console.error("FAILURE! Expected 40 pieces, got " + remaining);
    process.exit(1);
}
