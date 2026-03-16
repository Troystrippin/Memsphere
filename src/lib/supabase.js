import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

console.log('🔍 Environment Check:')
console.log('🔍 NODE_ENV:', process.env.NODE_ENV)
console.log('🔍 REACT_APP_SUPABASE_URL exists:', !!supabaseUrl)
console.log('🔍 REACT_APP_SUPABASE_ANON_KEY exists:', !!supabaseAnonKey)

// Create client with explicit storage settings
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
      storageKey: 'sb-session',
      flowType: 'pkce'
    }
  }
)

export const isSupabaseConfigured = () => {
  return !!supabaseUrl && !!supabaseAnonKey
}