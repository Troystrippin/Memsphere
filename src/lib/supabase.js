import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

console.log('🔍 Environment Check:')
console.log('🔍 NODE_ENV:', process.env.NODE_ENV)
console.log('🔍 REACT_APP_SUPABASE_URL:', supabaseUrl ? '✅ Found' : '❌ Missing')
console.log('🔍 REACT_APP_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Found' : '❌ Missing')

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase environment variables are missing!');
}

// Create client with explicit storage settings and better error handling
export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: {
        getItem: (key) => {
          try {
            const item = window.localStorage.getItem(key);
            console.log(`📦 Storage GET ${key}:`, item ? 'Found' : 'Not found');
            return item;
          } catch (e) {
            console.error('Storage get error:', e);
            return null;
          }
        },
        setItem: (key, value) => {
          try {
            window.localStorage.setItem(key, value);
            console.log(`📦 Storage SET ${key}:`, value ? 'Saved' : 'Empty');
          } catch (e) {
            console.error('Storage set error:', e);
          }
        },
        removeItem: (key) => {
          try {
            window.localStorage.removeItem(key);
            console.log(`📦 Storage REMOVE ${key}`);
          } catch (e) {
            console.error('Storage remove error:', e);
          }
        }
      },
      storageKey: 'sb-session',
      flowType: 'pkce'
    }
  }
)

// Add a test function to verify connection
export const testSupabaseConnection = async () => {
  try {
    console.log('🔍 Testing Supabase connection...');
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    if (error) {
      console.error('❌ Supabase connection test failed:', error.message);
      return false;
    }
    console.log('✅ Supabase connection successful');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection test error:', error);
    return false;
  }
}

export const isSupabaseConfigured = () => {
  const configured = !!supabaseUrl && !!supabaseAnonKey;
  console.log('🔍 Supabase configured:', configured);
  return configured;
}