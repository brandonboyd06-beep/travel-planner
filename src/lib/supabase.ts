import type { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey)

let clientPromise: Promise<SupabaseClient | null> | null = null

export function getSupabaseClient() {
  if (!isSupabaseConfigured) return Promise.resolve(null)

  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) => createClient(
    supabaseUrl,
    supabasePublishableKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    },
  ))

  return clientPromise
}
