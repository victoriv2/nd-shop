require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://obydxcefymdjvebrxata.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
    console.error("Missing SUPABASE_SERVICE_KEY");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function cleanObject(obj) {
    if (obj && typeof obj === 'object') {
        if (obj.payoutRate !== undefined) {
            delete obj.payoutRate;
        }
        for (const key in obj) {
            cleanObject(obj[key]);
        }
    }
}

async function fix() {
    console.log("Fetching products...");
    const { data: products, error } = await supabase.from('products').select('*');
    if (error) {
        console.error("Fetch error:", error);
        return;
    }

    console.log(`Found ${products.length} products. Scanning for payoutRate...`);
    let count = 0;
    
    for (const p of products) {
        if (p.data) {
            const originalStr = JSON.stringify(p.data);
            cleanObject(p.data);
            if (JSON.stringify(p.data) !== originalStr) {
                console.log(`Cleaning product: ${p.data.name} (ID: ${p.id})`);
                const { error: updErr } = await supabase.from('products').update({ data: p.data }).eq('id', p.id);
                if (updErr) {
                    console.error(`Error updating product ${p.id}:`, updErr);
                } else {
                    count++;
                }
            }
        }
    }
    
    console.log(`Successfully cleaned and updated ${count} products!`);
}

fix();
