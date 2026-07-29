const LIBRARY_READER_ORIGIN_KEY = 'libraryReaderOrigin'
const APP_ORIGIN = 'https://naamras.invalid'

export type LibraryReaderNavigationState = {
  [LIBRARY_READER_ORIGIN_KEY]: string
}

export function isSafeInternalAppPath(value: unknown): value is string {
  if (
    typeof value !== 'string'
    || !value.startsWith('/')
    || value.startsWith('//')
    || value.includes('\\')
  ) {
    return false
  }

  try {
    return new URL(value, APP_ORIGIN).origin === APP_ORIGIN
  } catch {
    return false
  }
}

export function getLibraryReaderOrigin(state: unknown, fallback: string): string {
  if (!state || typeof state !== 'object') return fallback

  const candidate = (state as Record<string, unknown>)[LIBRARY_READER_ORIGIN_KEY]
  return isSafeInternalAppPath(candidate) ? candidate : fallback
}

export function buildLibraryReaderNavigationState(origin: string): LibraryReaderNavigationState {
  return {
    [LIBRARY_READER_ORIGIN_KEY]: isSafeInternalAppPath(origin) ? origin : '/banis?collection=books',
  }
}

export function buildCurrentAppPath(location: {
  pathname: string
  search: string
  hash: string
}): string {
  return `${location.pathname}${location.search}${location.hash}`
}
