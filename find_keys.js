const fs = require('fs');
const path = require('path');
const keys = new Set();
function walk(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (!file.includes('node_modules') && !file.includes('.git')) {
                walk(fullPath);
            }
        } else if (fullPath.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const matches = content.match(/localStorage\.getItem\((['"])(.*?)\1\)/g);
            if (matches) {
                matches.forEach(m => {
                    const match = m.match(/localStorage\.getItem\((['"])(.*?)\1\)/);
                    if (match && match[2]) keys.add(match[2]);
                });
            }
        }
    });
}
walk('.');
console.log([...keys].sort().join('\n'));
