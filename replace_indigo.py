import os
import re

target_dir = r"c:\Users\MFM IKOT ABASI\Documents\nd-shop"
hex_to_replace = re.compile(r'#1B263B', re.IGNORECASE)
new_hex = '#312E81' # Bold and mature indigo

count = 0
for root, dirs, files in os.walk(target_dir):
    if "node_modules" in root or ".git" in root:
        continue
    for file in files:
        if file.endswith(('.html', '.css', '.js')):
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                if hex_to_replace.search(content):
                    new_content = hex_to_replace.sub(new_hex, content)
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Updated {path}")
                    count += 1
            except Exception as e:
                pass
print(f"Replaced in {count} files")
