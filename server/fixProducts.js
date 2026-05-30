require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://obydxcefymdjvebrxata.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
    console.error("Missing SUPABASE_SERVICE_KEY");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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
        if (p.data && p.data.payoutRate !== undefined) {
            delete p.data.payoutRate;
            const { error: updErr } = await supabase.from('products').update({ data: p.data }).eq('id', p.id);
            if (updErr) {
                console.error(`Error updating product ${p.id}:`, updErr);
            } else {
                count++;
            }
        }
    }
    
    console.log(`Successfully removed payoutRate from ${count} products!`);
}

fix();
