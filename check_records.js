import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dwtasustyvwqbisgfdla.supabase.co';
const supabaseKey = 'sb_publishable_wAA7HroSNLmJLNVkdhD1iA_nHftiR6G';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecords() {
    const { data, error } = await supabase.from('maternal_records')
        .select('id, first_name, last_name, created_by, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error("Error fetching records:", error);
        return;
    }

    console.log("Latest records:", data);
}

checkRecords();
