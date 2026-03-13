// quick script to inspect a profile by email or id
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://vxmunyvimfedyvdbvxwg.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node debugProfile.js <email>');
    process.exit(1);
  }
  const { data, error } = await supabase.from('profiles').select('*').eq('email', email).single();
  if (error) console.error('error', error);
  else console.log('profile', data);
}

check();
