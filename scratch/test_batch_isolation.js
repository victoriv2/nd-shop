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

// Load global-fixes.js
const fileCode = fs.readFileSync(path.join(__dirname, '..', 'global-fixes.js'), 'utf8');
eval(fileCode);

console.log("Mock environment set up and global-fixes.js loaded successfully.\n");

// Define two products with exact same details, but different IDs and dates added.
const productA = {
    id: "ndp_batch_A",
    name: "Honey beans",
    cost: 1500,
    pieces: 1, // regular product
    boughtQuantity: 10,
    isSpecial: false,
    isFlexible: false,
    isCustom: false,
    dateAdded: "2026-06-01T12:00:00.000Z"
};

const productB = {
    id: "ndp_batch_B",
    name: "Honey beans",
    cost: 1500,
    pieces: 1, // regular product
    boughtQuantity: 10,
    isSpecial: false,
    isFlexible: false,
    isCustom: false,
    dateAdded: "2026-06-10T12:00:00.000Z"
};

// Setup initial products
localStorage.setItem('nd_products_data', JSON.stringify([productA, productB]));

// ==========================================
// TEST CASE 1: Sale with productId
// ==========================================
console.log("--- TEST CASE 1: Sale of Honey beans with productId 'ndp_batch_A' ---");
const salesCase1 = [
    { item: "Honey beans", qty: 3, date: "2026-06-12T12:00:00.000Z", productId: "ndp_batch_A" }
];
localStorage.setItem('nd_sales_history', JSON.stringify(salesCase1));

let stockA = window.getRemainingProductStock("ndp_batch_A");
let stockB = window.getRemainingProductStock("ndp_batch_B");
console.log(`Product A Stock (Expected: 7): ${stockA}`);
console.log(`Product B Stock (Expected: 10): ${stockB}`);

if (stockA === 7 && stockB === 10) {
    console.log("✅ CASE 1 PASSED: Sale with productId isolated successfully!");
} else {
    console.error("❌ CASE 1 FAILED!");
    process.exit(1);
}

// ==========================================
// TEST CASE 2: Legacy Sale (No productId) during Product A's active period
// ==========================================
console.log("\n--- TEST CASE 2: Historical sale of Honey beans (no productId) on 2026-06-05 ---");
// On 2026-06-05, only Product A was active (added 2026-06-01). Product B was added 2026-06-10.
const salesCase2 = [
    { item: "Honey beans", qty: 4, date: "2026-06-05T12:00:00.000Z" }
];
localStorage.setItem('nd_sales_history', JSON.stringify(salesCase2));

stockA = window.getRemainingProductStock("ndp_batch_A");
stockB = window.getRemainingProductStock("ndp_batch_B");
console.log(`Product A Stock (Expected: 6): ${stockA}`);
console.log(`Product B Stock (Expected: 10): ${stockB}`);

if (stockA === 6 && stockB === 10) {
    console.log("✅ CASE 2 PASSED: Date-aware matching associated legacy sale with Product A correctly!");
} else {
    console.error("❌ CASE 2 FAILED!");
    process.exit(1);
}

// ==========================================
// TEST CASE 3: Legacy Sale (No productId) during Product B's active period
// ==========================================
console.log("\n--- TEST CASE 3: Historical sale of Honey beans (no productId) on 2026-06-15 ---");
// On 2026-06-15, Product B is the active batch because it was added 2026-06-10 (which is <= sale date).
const salesCase3 = [
    { item: "Honey beans", qty: 2, date: "2026-06-15T12:00:00.000Z" }
];
localStorage.setItem('nd_sales_history', JSON.stringify(salesCase3));

stockA = window.getRemainingProductStock("ndp_batch_A");
stockB = window.getRemainingProductStock("ndp_batch_B");
console.log(`Product A Stock (Expected: 10): ${stockA}`);
console.log(`Product B Stock (Expected: 8): ${stockB}`);

if (stockA === 10 && stockB === 8) {
    console.log("✅ CASE 3 PASSED: Date-aware matching associated legacy sale with Product B correctly!");
} else {
    console.error("❌ CASE 3 FAILED!");
    process.exit(1);
}

console.log("\n🎉 ALL TESTS PASSED! Independent inventory management confirmed successfully.");
process.exit(0);
