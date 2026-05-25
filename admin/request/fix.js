const fs = require('fs');
const backup = fs.readFileSync('c:/Users/MFM IKOT ABASI/Documents/nd/admin/request/reconstructed.txt', 'utf8');
let current = fs.readFileSync('c:/Users/MFM IKOT ABASI/Documents/nd/admin/request/request.js', 'utf8');

// Find the block from backup
const startString = '            tr.innerHTML = `';
const endString = '                            onclick="_openAdminItemEditModal(${idx})"';

const startIdx = backup.indexOf(startString);
const endIdx = backup.indexOf(endString);

if (startIdx > -1 && endIdx > -1) {
    const block = backup.substring(startIdx, endIdx);
    
    // In the current file, the block got deleted, so `onclick="_openAdminItemEditModal(${idx})"` is right after the ? imgHtml : fallback line
    current = current.replace('                            onclick="_openAdminItemEditModal(${idx})"', block + '                            onclick="_openAdminItemEditModal(${idx})"');
    
    fs.writeFileSync('c:/Users/MFM IKOT ABASI/Documents/nd/admin/request/request.js', current);
    console.log('Fixed block successfully!');
} else {
    console.log('Could not find block in backup.');
}
