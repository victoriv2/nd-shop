const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
);

async function check() {
    const { data: productsRes } = await supabase.from('products').select('*');
    const { data: salesRes } = await supabase.from('sales_history').select('*');

    const allProducts = productsRes.map(row => row.data);
    const products = allProducts.filter(item => item && !item.isDeleted && !item.cleared).map(item => ({
        ...item,
        isSpecial: item.isSpecial === true || item.isSpecial === 'true',
        isFlexible: item.isFlexible === true || item.isFlexible === 'true',
        isCustom: item.isCustom === true || item.isCustom === 'true'
    }));

    const sales = salesRes.map(row => row.data);

    // Filter default products
    const defaultProducts = products.filter(p => !p.isSpecial && !p.isFlexible && !p.isCustom);

    console.log(`Found ${defaultProducts.length} default products.`);
    
    // De-duplicate base names
    const seenBaseNames = new Set();

    for (const p of defaultProducts) {
        const baseName = p.name;
        if (seenBaseNames.has(baseName.toLowerCase())) continue;
        seenBaseNames.add(baseName.toLowerCase());
        
        // Find oldest date added
        let oldestDateAdded = null;
        const activeMatches = products.filter(item => item.name && item.name.trim().toLowerCase() === baseName.toLowerCase());
        activeMatches.forEach(item => {
            if (item.dateAdded) {
                const t = new Date(item.dateAdded).getTime();
                if (!oldestDateAdded || t < oldestDateAdded) {
                    oldestDateAdded = t;
                }
            }
        });

        // Simple parse date function (matches window.parseSaleDate in global-fixes.js)
        const parseSaleDate = (dateString) => {
            if (!dateString) return 0;
            // Handle expected format: "DD-MM-YYYY HH:mm:ss"
            const parts = dateString.split(/[- :]/);
            if (parts.length >= 6) {
                return new Date(parts[2], parts[1] - 1, parts[0], parts[3], parts[4], parts[5]).getTime();
            }
            return new Date(dateString).getTime() || 0;
        };

        const filteredSales = oldestDateAdded ? sales.filter(sale => parseSaleDate(sale.date || sale.timestamp) >= oldestDateAdded) : sales;

        let totalBoughtPieces = 0;
        products.forEach(item => {
            if (item.name && item.name.trim().toLowerCase() === baseName.toLowerCase() && !item.isSpecial && !item.isFlexible && !item.isCustom) {
                totalBoughtPieces += (parseFloat(item.boughtQuantity) || 0) * (parseInt(item.pieces) || 1);
            }
        });
        
        let totalSoldPieces = 0;
        filteredSales.forEach(sale => {
            if (sale.item) {
                let saleBaseName = sale.item.trim();
                let saleVariant = '';
                const match = sale.item.match(/^(.*?)\s+\(([^)]+)\)$/);
                if (match) {
                    saleBaseName = match[1].trim();
                    saleVariant = match[2].trim();
                }
                const isMatch = (saleBaseName.toLowerCase() === baseName.toLowerCase());
                if (isMatch) {
                    const q = parseFloat(sale.qty) || 0;
                    const bulkSuffix = (p.bulkUnit || 'Carton').trim().toLowerCase();
                    if (saleVariant.toLowerCase() === bulkSuffix || saleVariant.toLowerCase() === 'carton') {
                        totalSoldPieces += q * (parseInt(p.pieces) || 1);
                    } else {
                        totalSoldPieces += q;
                    }
                }
            }
        });

        const remaining = totalBoughtPieces - totalSoldPieces;
        if (remaining <= 0) {
            console.log(`OUT OF STOCK: ${p.name} (Remaining: ${remaining})`);
        } else {
            console.log(`IN STOCK: ${p.name} (Remaining: ${remaining})`);
        }
    }
}

check().catch(console.error);
