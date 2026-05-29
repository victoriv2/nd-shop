import os
import re

def patch_auth():
    with open('auth/auth.js', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Save token on login
    content = content.replace("localStorage.setItem('nd_current_user', JSON.stringify(data.user));", "localStorage.setItem('nd_current_user', JSON.stringify(data.user));\n                        if (data.token) localStorage.setItem('nd_token', data.token);")
    
    # Save token on register
    content = content.replace("localStorage.setItem('nd_current_user', JSON.stringify(regData.user));", "localStorage.setItem('nd_current_user', JSON.stringify(regData.user));\n                                if (regData.token) localStorage.setItem('nd_token', regData.token);")
    
    with open('auth/auth.js', 'w', encoding='utf-8') as f:
        f.write(content)

def patch_admin_login():
    with open('admin/login/login.js', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Save token on admin login
    content = content.replace("localStorage.setItem('nd_admin', 'true');", "localStorage.setItem('nd_admin', 'true');\n                if (data.token) localStorage.setItem('nd_token', data.token);")
    
    with open('admin/login/login.js', 'w', encoding='utf-8') as f:
        f.write(content)

def inject_headers(filepath):
    if not os.path.exists(filepath): return
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Replace plain fetches to add Authorization
    # Look for fetch(`...`, {
    # If it has headers: {
    # Replace headers: { with headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('nd_token') || ''), 
    
    pattern = re.compile(r'(headers:\s*\{)')
    content = pattern.sub(r"\1\n                    'Authorization': 'Bearer ' + (localStorage.getItem('nd_token') || ''),", content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

def patch_supabase_sync():
    with open('supabase-sync.js', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # get-table fetch is without options, need to add it
    # const res = await fetch(`${window.API_BASE}/api/get-table/${tableName}?userId=${userId}`);
    content = content.replace(
        "const res = await fetch(`${window.API_BASE}/api/get-table/${tableName}?userId=${userId}`);",
        "const res = await fetch(`${window.API_BASE}/api/get-table/${tableName}?userId=${userId}`, { headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('nd_token') || '') } });"
    )
    # const res = await fetch(`${window.API_BASE}/api/get-table/admin_settings`);
    content = content.replace(
        "const res = await fetch(`${window.API_BASE}/api/get-table/admin_settings`);",
        "const res = await fetch(`${window.API_BASE}/api/get-table/admin_settings`, { headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('nd_token') || '') } });"
    )
    
    with open('supabase-sync.js', 'w', encoding='utf-8') as f:
        f.write(content)

patch_auth()
patch_admin_login()
inject_headers('auth/auth.js')
inject_headers('admin/login/login.js')
inject_headers('menu-buttons/edit-profile/edit-profile.js')
inject_headers('admin/product/product.js')
inject_headers('supabase-sync.js')

# Also we need to make sure real-time-sync-tester.js is removed from index.html
def remove_tester():
    with open('index.html', 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace('<script src="real-time-sync-tester.js"></script>', '')
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(content)

remove_tester()
print("Frontend patch complete")
