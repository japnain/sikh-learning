import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getNaamrasSupabaseConfig } from './config'

let cachedClient: SupabaseClient | null | undefined

export function getNaamrasSupabaseClient() {
  if (cachedClient !== undefined) return cachedClient

  const config = getNaamrasSupabaseConfig()
  if (!config.enabled || !config.url || !config.anonKey) {
    cachedClient = null
    return cachedClient
  }

  cachedClient = createClient(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  })

  return cachedClient
}

export function resetNaamrasSupabaseClientForTests() {
  cachedClient = undefined
}
