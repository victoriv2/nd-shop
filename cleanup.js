const fs = require('fs');
let text = fs.readFileSync('c:/Users/mfmss/Documents/nd/admin/menu-buttons/restock/restock.js', 'utf8');
let lines = text.split('\n');
lines.splice(2062, 2615 - 2062); // Removes from index 2062 up to 2614
fs.writeFileSync('c:/Users/mfmss/Documents/nd/admin/menu-buttons/restock/restock.js', lines.join('\n'));
console.log('Deleted garbage lines');
