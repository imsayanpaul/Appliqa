const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabaseUrl = process.env.SUPABASE_URL || 'https://tpphgqamdblhjmecdqmj.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    try {
        // Query to check table columns
        const { data, error } = await supabase.rpc('execute_sql', {
            sql_query: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'profiles';"
        });

        if (error) {
            console.log("RPC execute_sql failed, trying standard select:", error.message);
            // Let's just select a row and print its keys
            const { data: rows, error: selectError } = await supabase
                .from('profiles')
                .select('*')
                .limit(1);
            if (selectError) {
                console.error("Select failed:", selectError.message);
            } else if (rows && rows.length > 0) {
                console.log("Columns from row keys:", Object.keys(rows[0]));
            } else {
                console.log("No rows found in profiles table.");
            }
        } else {
            console.log("Columns:", data);
        }
    } catch (err) {
        console.error(err);
    }
}

checkColumns();
