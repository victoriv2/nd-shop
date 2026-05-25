import os

directory = r'c:\Users\mfmss\Documents\nd'

for root, dirs, files in os.walk(directory):
    if 'node_modules' in root or '.git' in root or 'knowledge' in root or '.gemini' in root:
        continue
    for file in files:
        if file.endswith('.html') or file.endswith('.js'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                c = f.read()
            old_c = c
            
            # Simple string replacements
            c = c.replace("'Bag'", "'Container 1'").replace("'Custard'", "'Container 2'").replace("'Cup'", "'Container 3'")
            
            # Also text in HTML >Bag<
            c = c.replace(">Bag<", ">Container 1<").replace(">Custard<", ">Container 2<").replace(">Cup<", ">Container 3<")
            
            # Label elements in HTML <span ...>Bag</span>
            c = c.replace(">Bag<", ">Container 1<").replace(">Custard<", ">Container 2<").replace(">Cup<", ">Container 3<")
            
            # also value="Bag"
            c = c.replace('value="Bag"', 'value="Container 1"').replace('value="Custard"', 'value="Container 2"').replace('value="Cup"', 'value="Container 3"')
            
            if c != old_c:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(c)
                print(f'Updated {filepath}')
