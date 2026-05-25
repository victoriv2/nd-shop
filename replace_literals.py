import os
import re

directory = r'c:\Users\mfmss\Documents\nd'

# Patterns to replace
patterns = [
    (re.compile(r"\|\|\s*'Bag'"), "|| 'Container 1'"),
    (re.compile(r"\|\|\s*'Custard'"), "|| 'Container 2'"),
    (re.compile(r"\|\|\s*'Cup'"), "|| 'Container 3'"),
    (re.compile(r":\s*'Bag'"), ": 'Container 1'"),
    (re.compile(r":\s*'Custard'"), ": 'Container 2'"),
    (re.compile(r":\s*'Cup'"), ": 'Container 3'"),
    (re.compile(r"=\s*'Bag';"), "= 'Container 1';"),
    (re.compile(r"=\s*'Custard';"), "= 'Container 2';"),
    (re.compile(r"=\s*'Cup';"), "= 'Container 3';"),
    (re.compile(r"\?\s*'Bag'"), "? 'Container 1'"),
    (re.compile(r"\?\s*'Custard'"), "? 'Container 2'"),
    (re.compile(r"\?\s*'Cup'"), "? 'Container 3'"),
]

for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith('.js'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                
            orig_content = content
            for regex, rep in patterns:
                content = regex.sub(rep, content)
                
            if content != orig_content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                print('Updated:', filepath)
