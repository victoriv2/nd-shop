const fs = require('fs');
const path = require('path');

const excludeDirs = ['node_modules', '.git', '.venv', 'server'];
const validExtensions = ['.js', '.html', '.css', '.json', '.md'];

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            if (!excludeDirs.includes(file)) {
                processDirectory(fullPath);
            }
        } else {
            const ext = path.extname(file).toLowerCase();
            if (validExtensions.includes(ext)) {
                processFile(fullPath);
            }
        }
    }
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Replace specific known variants first
    content = content.replace(/nd shop/ig, 'nd shop');
    content = content.replace(/nd shop/ig, 'nd shop');
    
    // Replace 'nd_' prefixes for local storage keys etc.
    content = content.replace(/nd_/g, 'nd_');
    content = content.replace(/nd_/g, 'nd_');

    // Any standalone "nd shop" that might represent the shop name (with boundary)
    content = content.replace(/\bNDI\b/g, 'nd shop');
    content = content.replace(/\bNdi\b/g, 'nd shop');
    content = content.replace(/\bndi\b/g, 'nd shop');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
    }
}

processDirectory(__dirname);
console.log('Replacement complete.');
