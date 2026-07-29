export function getCanonicalSourceUrl(sourcePath?: string) {
  const canonicalOrigin = 'https://naamras.xyz'
  const currentPath = typeof window === 'undefined'
    ? '/'
    : `${window.location.pathname}${window.location.search}${window.location.hash}`
  const requestedPath = sourcePath?.trim() || currentPath

  try {
    const requestedUrl = new URL(requestedPath, canonicalOrigin)
    return requestedUrl.origin === canonicalOrigin
      ? requestedUrl.toString()
      : new URL('/', canonicalOrigin).toString()
  } catch {
    return new URL('/', canonicalOrigin).toString()
  }
}
