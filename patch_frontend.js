const fs = require('fs');
const path = require('path');

function patch_auth() {
    let content = fs.readFileSync('auth/auth.js', 'utf8');
    content = content.replace("localStorage.setItem('nd_current_user', JSON.stringify(data.user));", "localStorage.setItem('nd_current_user', JSON.stringify(data.user));\n                        if (data.token) localStorage.setItem('nd_token', data.token);");
    content = content.replace("localStorage.setItem('nd_current_user', JSON.stringify(regData.user));", "localStorage.setItem('nd_current_user', JSON.stringify(regData.user));\n                                if (regData.token) localStorage.setItem('nd_token', regData.token);");
    fs.writeFileSync('auth/auth.js', content, 'utf8');
}

function patch_admin_login() {
    let content = fs.readFileSync('admin/login/login.js', 'utf8');
    content = content.replace("localStorage.setItem('nd_admin', 'true');", "localStorage.setItem('nd_admin', 'true');\n                if (data.token) localStorage.setItem('nd_token', data.token);");
    fs.writeFileSync('admin/login/login.js', content, 'utf8');
}

function inject_headers(filepath) {
    if (!fs.existsSync(filepath)) return;
    let content = fs.readFileSync(filepath, 'utf8');
    content = content.replace(/(headers:\s*\{)/g, "$1\n                    'Authorization': 'Bearer ' + (localStorage.getItem('nd_token') || ''),");
    fs.writeFileSync(filepath, content, 'utf8');
}

function patch_supabase_sync() {
    let content = fs.readFileSync('supabase-sync.js', 'utf8');
    content = content.replace(
        "const res = await fetch(`${window.API_BASE}/api/get-table/${tableName}?userId=${userId}`);",
        "const res = await fetch(`${window.API_BASE}/api/get-table/${tableName}?userId=${userId}`, { headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('nd_token') || '') } });"
    );
    content = content.replace(
        "const res = await fetch(`${window.API_BASE}/api/get-table/admin_settings`);",
        "const res = await fetch(`${window.API_BASE}/api/get-table/admin_settings`, { headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('nd_token') || '') } });"
    );
    fs.writeFileSync('supabase-sync.js', content, 'utf8');
}

function remove_tester() {
    if (!fs.existsSync('index.html')) return;
    let content = fs.readFileSync('index.html', 'utf8');
    content = content.replace('<script src="real-time-sync-tester.js"></script>', '');
    fs.writeFileSync('index.html', content, 'utf8');
}

patch_auth();
patch_admin_login();
inject_headers('auth/auth.js');
inject_headers('admin/login/login.js');
inject_headers('menu-buttons/edit-profile/edit-profile.js');
inject_headers('admin/product/product.js');
inject_headers('supabase-sync.js');
remove_tester();

console.log("Frontend patch complete");
