import { createClient } from '@supabase/supabase-js'

// For Create React App, we use process.env with REACT_APP_ prefix
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

// Add debug logging to see what's happening
console.log('🔍 Environment Check:')
console.log('🔍 NODE_ENV:', process.env.NODE_ENV)
console.log('🔍 REACT_APP_SUPABASE_URL exists:', !!supabaseUrl)
console.log('🔍 REACT_APP_SUPABASE_ANON_KEY exists:', !!supabaseAnonKey)

if (!supabaseUrl) {
  console.error('❌ REACT_APP_SUPABASE_URL is not defined in .env file')
  // Don't throw error in production, just log it
  if (process.env.NODE_ENV === 'development') {
    throw new Error('REACT_APP_SUPABASE_URL is undefined! Check your .env file and restart the server.')
  }
}

if (!supabaseAnonKey) {
  console.error('❌ REACT_APP_SUPABASE_ANON_KEY is not defined in .env file')
  if (process.env.NODE_ENV === 'development') {
    throw new Error('REACT_APP_SUPABASE_ANON_KEY is undefined! Check your .env file and restart the server.')
  }
}

// Create client with fallback values for production (they should be set in Vercel)
export const supabase = createClient(
  supabaseUrl || 'https://vxmunyvimfedyvdbvxwg.supabase.co',
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4bXVueXZpbWZlZHl2ZGJ2eHdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwNDY5MDQsImV4cCI6MjA4NjYyMjkwNH0.aOE_LhpCPAtum3V8iovBLzhqX2MsV7QhJP74slqz__s'
)

// Helper function to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!supabaseUrl && !!supabaseAnonKey
}