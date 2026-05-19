import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Check your .env file.')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// Calls the Supabase Admin REST API directly — no second GoTrueClient,
// no localStorage conflicts with the main supabase client.
export async function adminCreateUser({ email, password, user_metadata }) {
  if (!supabaseServiceKey) {
    return { data: null, error: { message: 'VITE_SUPABASE_SERVICE_ROLE_KEY is not set' } }
  }
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'apikey': supabaseServiceKey,
    },
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata }),
  })
  const json = await res.json()
  if (!res.ok) return { data: null, error: { message: json.msg || json.message || 'Admin API error' } }
  return { data: { user: json }, error: null }
}
