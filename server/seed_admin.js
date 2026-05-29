require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function setupAdmin() {
    try {
        console.log('Adding is_admin column to users table if not exists...');
        // We'll use the rpc or just a direct query if we have it, but wait, supabase-js doesn't have direct DDL querying without rpc or postgres.
        // I'll execute the SQL via MCP tool instead for the DDL.
        
        console.log('Hashing admin password...');
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        console.log('Upserting admin profile...');
        const { error } = await supabase.from('users').upsert({
            id: 'nd_admin_001',
            email: 'admin@nd-shop.sbs',
            phone: '08109316532',
            password: hashedPassword,
            name: 'ND Shop Admin',
            first_name: 'ND',
            last_name: 'Admin',
            is_admin: true
        }, { onConflict: 'email' });
        
        if (error) {
            console.error('Error upserting admin:', error);
        } else {
            console.log('Admin profile created successfully!');
        }
    } catch (e) {
        console.error('Error setup:', e);
    }
}

setupAdmin();
