const fs = require('fs');

async function migrate() {
    const apikey = process.env.SUPABASE_KEY;
    if (!apikey) {
        console.error("SUPABASE_KEY not set");
        return;
    }
    const res = await fetch('https://obydxcefymdjvebrxata.supabase.co/rest/v1/sales_history', {
        headers: {
            apikey,
            Authorization: 'Bearer ' + apikey
        }
    });
    const rows = await res.json();
    if (!Array.isArray(rows)) {
        console.error("Failed to fetch rows", rows);
        return;
    }

    // Parse dates and sort chronologically
    function parseDate(dateStr) {
        if (!dateStr) return 0;
        try {
            if (dateStr.includes('·')) {
                const parts = dateStr.split('·');
                const d = new Date(parts[0].trim());
                const timeParts = parts[1].trim().match(/(\d+):(\d+)\s*(am|pm)/i);
                if (timeParts) {
                    let h = parseInt(timeParts[1]);
                    if (timeParts[3].toLowerCase() === 'pm' && h < 12) h += 12;
                    if (timeParts[3].toLowerCase() === 'am' && h === 12) h = 0;
                    d.setHours(h, parseInt(timeParts[2]), 0, 0);
                }
                return d.getTime();
            }
            return new Date(dateStr).getTime();
        } catch(e) {
            return 0;
        }
    }

    let parsedRows = rows.map(r => {
        let d = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
        return {
            id: r.id,
            data: d,
            time: parseDate(d.date)
        };
    });

    parsedRows.sort((a,b) => a.time - b.time);

    let userBalances = {};
    let updates = [];

    parsedRows.forEach(r => {
        let d = r.data;
        let customerID = d.customerID;
        if (!customerID) return;

        let bal = userBalances[customerID] || 0;
        
        // If it's already migrated (has payoutEarned), don't touch it, or recalculate anyway to be safe
        let delta = d.payoutEarned !== undefined ? d.payoutEarned : d.payout;
        
        if (d.payoutEarned === undefined) {
            // It hasn't been migrated to the new format yet.
            // Earlier we made deductions positive and added isRewardPurchase.
            // Or it could be negative.
            let isDeduct = d.isRewardPurchase || d.type === 'Payout Purchase' || delta < 0;
            let val = Math.abs(delta || 0);
            delta = isDeduct ? -val : val;
        }

        bal += delta;
        userBalances[customerID] = bal;

        // Update the data object
        d.payoutEarned = delta;
        d.payout = bal; // running balance!

        updates.push({id: r.id, data: d});
    });

    console.log("Migrating", updates.length, "rows");

    for (let u of updates) {
        await fetch('https://obydxcefymdjvebrxata.supabase.co/rest/v1/sales_history?id=eq.' + u.id, {
            method: 'PATCH',
            headers: {
                apikey,
                Authorization: 'Bearer ' + apikey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({data: u.data})
        });
    }

    console.log("Done");
}

migrate();
