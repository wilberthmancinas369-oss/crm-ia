import supabase from './config/supabase.js';

async function inspectSchema() {
  console.log('🔍 Inspecting Supabase Schema...');
  
  const tablesToInspect = ['profiles', 'users', 'groups', 'invitations'];
  
  for (const table of tablesToInspect) {
    console.log(`\n--- Table: ${table} ---`);
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`❌ Error fetching ${table}: ${error.message}`);
    } else if (data && data.length > 0) {
      console.log('Columns:', Object.keys(data[0]));
      console.log('Sample Row:', data[0]);
    } else {
      console.log('Table is empty or doesn\'t exist.');
    }
  }
}

inspectSchema().catch(console.error);
