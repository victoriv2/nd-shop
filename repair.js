const fs = require('fs');
const jsFile = 'C:\\Users\\MFM IKOT ABASI\\Documents\\nd\\admin\\menu-buttons\\payout-purchase\\payout-purchase.js';
let content = fs.readFileSync(jsFile, 'utf8');

// remove duplicate initPPToggles
content = content.replace("    initPPToggles();\r\n    if (typeof initPPToggles === 'function') initPPToggles();", "    if (typeof initPPToggles === 'function') initPPToggles();");
content = content.replace("    initPPToggles();\n    if (typeof initPPToggles === 'function') initPPToggles();", "    if (typeof initPPToggles === 'function') initPPToggles();");

// remove trailing }
content = content.replace(/}\r?\n}\r?\n?$/, "}\n");

fs.writeFileSync(jsFile, content);
console.log('Fixed syntax in payout-purchase.js');
