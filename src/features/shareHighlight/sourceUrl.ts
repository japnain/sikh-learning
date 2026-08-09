import {
  buildHukamnamaShortPath,
  normalizeHukamnamaDate,
} from '../../utils/hukamnamaShareRoute'

const CANONICAL_ORIGIN = 'https://naamras.xyz'

export function getCanonicalSourceUrl(sourcePath?: string) {
  const currentPath = typeof window === 'undefined'
    ? '/'
    : `${window.location.pathname}${window.location.search}${window.location.hash}`
  const requestedPath = sourcePath?.trim() || currentPath

  try {
    const requestedUrl = new URL(requestedPath, CANONICAL_ORIGIN)
    return requestedUrl.origin === CANONICAL_ORIGIN
      ? requestedUrl.toString()
      : new URL('/', CANONICAL_ORIGIN).toString()
  } catch {
    return new URL('/', CANONICAL_ORIGIN).toString()
  }
}

export function getHukamnamaShareUrl(dateIso?: string | null) {
  const date = normalizeHukamnamaDate(dateIso)
  return date
    ? new URL(buildHukamnamaShortPath(date), CANONICAL_ORIGIN).toString()
    : null
}
