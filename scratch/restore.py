import json
import re
import sys

transcript_path = r"C:\Users\MFM IKOT ABASI\.gemini\antigravity\brain\6e170f61-89b2-4ce9-bc72-09afd550ce5d\.system_generated\logs\transcript.jsonl"
out_path = r"C:\Users\MFM IKOT ABASI\Documents\nd\admin\request\request.js"

original_content = None

with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            if data.get('type') == 'TOOL_RESPONSE' and 'request.js' in data.get('content', ''):
                content = data['content']
                # Search for the view_file output block for request.js
                if 'File Path: `file:///c:/Users/MFM%20IKOT%20ABASI/Documents/nd/admin/request/request.js`' in content:
                    original_content = content
                    break
        except Exception as e:
            pass

if original_content:
    # Extract the lines of code. It starts after "The following code has been modified..."
    lines = original_content.split('\n')
    extracted_lines = []
    in_code = False
    for line in lines:
        if line.startswith('1: '):
            in_code = True
        
        if in_code:
            if re.match(r'^\d+: ', line):
                # Remove the line number
                clean_line = line.split(': ', 1)[1]
                extracted_lines.append(clean_line)
            elif line.startswith('The above content'):
                in_code = False
                break
            else:
                extracted_lines.append(line)
                
    # write to file
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(extracted_lines))
        
    print(f"Successfully restored {len(extracted_lines)} lines to request.js")
else:
    print("Could not find the original request.js content in transcript.")
