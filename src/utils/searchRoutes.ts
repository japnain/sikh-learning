import type { SearchMode } from '../types'
import type { SearchSource } from './appSearch'

export function buildLearnSearchPath(query?: string) {
  const trimmed = query?.trim() ?? ''
  const params = new URLSearchParams({ tab: 'topics' })
  if (trimmed) {
    params.set('query', trimmed)
  }
  return `/learn?${params.toString()}`
}

export function buildReadSearchPath(options?: {
  query?: string
  mode?: SearchMode
  source?: SearchSource
}) {
  const trimmed = options?.query?.trim() ?? ''
  const mode = options?.mode ?? 'auto-detect'
  const source = options?.source ?? 'all'

  if (!trimmed && mode === 'auto-detect' && source === 'all') {
    return '/banis'
  }

  const params = new URLSearchParams()
  if (trimmed) {
    params.set('query', trimmed)
  }
  if (mode !== 'auto-detect') {
    params.set('mode', mode)
  }
  if (source !== 'all') {
    params.set('source', source)
  }

  const serialized = params.toString()
  return serialized ? `/banis?${serialized}` : '/banis'
}
