
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
async function run() {
    const { data, error } = await supabase.from('users').update({ first_name: 'Miracle', last_name: 'Ude' }).eq('id', 'nd00001').select();
    if (error) console.error('Supabase Error:', error);
    else console.log('Supabase Success:', data);
}
run();

