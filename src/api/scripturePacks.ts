import { getNaamrasSupabaseConfig } from '../supabase/config'

const MAX_READING_BYTES = 64 * 1024 * 1024

export interface ScripturePackRequest {
  key: string
  revision: string
  variant?: 'default' | 'short' | 'medium' | 'long' | 'extralong'
}

/** Downloads only published, immutable scripture; the browser has no write privilege. */
export async function fetchScripturePack(request: ScripturePackRequest, signal?: AbortSignal): Promise<unknown> {
  signal?.throwIfAborted()
  const config = getNaamrasSupabaseConfig()
  if (!config.enabled || !config.url || !config.anonKey) throw new Error('The scripture service is not configured.')
  const url = new URL(`${config.url.replace(/\/+$/, '')}/rest/v1/scripture_reading_packs`)
  url.search = new URLSearchParams({
    select: 'payload_json,payload_sha256,payload_bytes', reading_key: `eq.${request.key}`,
    source_revision: `eq.${request.revision}`, variant: `eq.${request.variant ?? 'default'}`, format_version: 'eq.1', limit: '1',
  }).toString()
  const response = await fetch(url, { headers: { apikey: config.anonKey, Accept: 'application/json' }, signal })
  if (!response.ok) throw new Error('This reading could not be loaded. Please try again.')
  const rows: unknown = await response.json()
  signal?.throwIfAborted()
  const row = Array.isArray(rows) && rows.length === 1 ? rows[0] as Record<string, unknown> : null
  if (!row || typeof row.payload_json !== 'string' || typeof row.payload_sha256 !== 'string'
    || !/^[a-f0-9]{64}$/.test(row.payload_sha256) || !Number.isSafeInteger(row.payload_bytes)
    || Number(row.payload_bytes) <= 0 || Number(row.payload_bytes) > MAX_READING_BYTES
    || new TextEncoder().encode(row.payload_json).byteLength !== row.payload_bytes) {
    throw new Error('This reading is not available as a verified download yet.')
  }
  if (!globalThis.crypto?.subtle) throw new Error('This browser cannot verify the reading download. Use a secure connection.')
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(row.payload_json))
  const actual = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('')
  if (actual !== row.payload_sha256) throw new Error('This reading failed its integrity check. Please try again.')
  signal?.throwIfAborted()
  return JSON.parse(row.payload_json) as unknown
}
