import { getNaamrasSupabaseConfig } from '../supabase/config'
import { READ_BANIDB_CATALOG_IDS } from '../data/banis'
import { SHABADOS_BANIS, SHABADOS_SOURCE_REVISION } from '../data/shabadosBanis'
import { HOSTED_BANI_REVISION } from './hostedBani'

const expectedRevisions = new Map<string, string>([
  ...READ_BANIDB_CATALOG_IDS.map(id => [`banidb:${id}`, HOSTED_BANI_REVISION] as const),
  ...SHABADOS_BANIS.map(bani => [`shabados:${bani.id}`, SHABADOS_SOURCE_REVISION] as const),
])

/** Anonymous read policies expose published packs only; availability never grants write access. */
export async function fetchPublishedScriptureReadingKeys(signal?: AbortSignal): Promise<string[]> {
  signal?.throwIfAborted()
  const config = getNaamrasSupabaseConfig()
  if (!config.enabled || !config.url || !config.anonKey) throw new Error('The scripture service is not configured.')
  const url = new URL(`${config.url.replace(/\/+$/, '')}/rest/v1/scripture_reading_packs`)
  url.search = new URLSearchParams({
    select: 'reading_key,source_revision', variant: 'eq.default', format_version: 'eq.1',
    source_revision: `in.(${HOSTED_BANI_REVISION},${SHABADOS_SOURCE_REVISION})`,
    limit: String(expectedRevisions.size * 2),
  }).toString()
  const response = await fetch(url, { headers: { apikey: config.anonKey, Accept: 'application/json' }, signal })
  if (!response.ok) throw new Error('Available downloads could not be checked. Please try again.')
  const rows: unknown = await response.json()
  signal?.throwIfAborted()
  if (!Array.isArray(rows)) throw new Error('Available downloads could not be checked. Please try again.')
  return [...new Set(rows.flatMap((row: unknown) => {
    if (!row || typeof row !== 'object') return []
    const { reading_key: key, source_revision: revision } = row as Record<string, unknown>
    return typeof key === 'string' && typeof revision === 'string' && expectedRevisions.get(key) === revision ? [key] : []
  }))]
}

/** Approximate text bytes, counting each named version once rather than its default alias. */
export async function fetchPublishedScriptureSizes(signal?: AbortSignal): Promise<Record<string, number>> {
  signal?.throwIfAborted()
  const config = getNaamrasSupabaseConfig()
  if (!config.enabled || !config.url || !config.anonKey) throw new Error('The scripture service is not configured.')
  const url = new URL(`${config.url.replace(/\/+$/, '')}/rest/v1/scripture_reading_packs`)
  url.search = new URLSearchParams({ select: 'reading_key,source_revision,variant,payload_bytes', format_version: 'eq.1',
    source_revision: `in.(${HOSTED_BANI_REVISION},${SHABADOS_SOURCE_REVISION})`, limit: String(expectedRevisions.size * 5) }).toString()
  const response = await fetch(url, { headers: { apikey: config.anonKey, Accept: 'application/json' }, signal })
  if (!response.ok) throw new Error('Download sizes are unavailable.')
  const rows: unknown = await response.json()
  signal?.throwIfAborted()
  if (!Array.isArray(rows)) throw new Error('Download sizes are unavailable.')
  const versions = new Map<string, Map<string, number>>()
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    const { reading_key: key, source_revision: revision, variant, payload_bytes: bytes } = row
    if (typeof key !== 'string' || expectedRevisions.get(key) !== revision
      || !['default', 'short', 'medium', 'long', 'extralong'].includes(variant)
      || !Number.isSafeInteger(bytes) || bytes <= 0) continue
    const reading = versions.get(key) ?? new Map<string, number>()
    reading.set(variant, bytes)
    versions.set(key, reading)
  }
  return Object.fromEntries([...versions].filter(([, variants]) => variants.has('default')).map(([key, variants]) => {
    if (variants.size > 1) variants.delete('default')
    return [key, [...variants.values()].reduce((total, size) => total + size, 0)]
  }))
}
