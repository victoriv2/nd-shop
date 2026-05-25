const fs = require('fs');

const transcript_path = "C:\\Users\\MFM IKOT ABASI\\.gemini\\antigravity\\brain\\6e170f61-89b2-4ce9-bc72-09afd550ce5d\\.system_generated\\logs\\transcript.jsonl";
const out_path = "C:\\Users\\MFM IKOT ABASI\\Documents\\nd\\admin\\request\\request.js";

const lines = fs.readFileSync(transcript_path, 'utf-8').split('\n');
let original_content = null;

for (const line of lines) {
    if (!line.trim()) continue;
    try {
        const data = JSON.parse(line);
        if (data.type === 'TOOL_RESPONSE' && data.content) {
            if (data.content.includes('Total Lines: 822') && data.content.includes('let currentRequestFilter')) {
                original_content = data.content;
                break;
            }
        }
    } catch (e) {}
}

if (original_content) {
    const textLines = original_content.split('\n');
    const extracted_lines = [];
    let in_code = false;
    for (const line of textLines) {
        if (line.startsWith('1: ')) {
            in_code = true;
        }
        if (in_code) {
            const match = line.match(/^\d+: (.*)/);
            if (match) {
                extracted_lines.push(match[1]);
            } else if (line.startsWith('The above content') || line.startsWith('The above content does NOT show')) {
                in_code = false;
                break;
            } else {
                extracted_lines.push(line);
            }
        }
    }
    fs.writeFileSync(out_path, extracted_lines.join('\n'), 'utf-8');
    console.log("Successfully restored " + extracted_lines.length + " lines");
} else {
    console.log("Not found.");
}
