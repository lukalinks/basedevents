import { createClient } from '@supabase/supabase-js'

// Prefer a non-public server var if present; fallback to public
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl) {
  console.error('Supabase URL is not set. Set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL')
}

if (!serviceRoleKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is not set. Admin operations will fail.')
}

export const supabaseAdmin = (supabaseUrl && serviceRoleKey)
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null as unknown as ReturnType<typeof createClient>


