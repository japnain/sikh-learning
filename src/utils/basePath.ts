function isAbsoluteUrl(path: string) {
  return /^(?:[a-z]+:)?\/\//i.test(path) || path.startsWith('data:') || path.startsWith('blob:')
}

export function normalizeBasePath(basePath: string | undefined | null): string {
  if (!basePath || basePath === '/') return '/'

  const withLeadingSlash = basePath.startsWith('/') ? basePath : `/${basePath}`
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
}

export function getRouterBasename(basePath: string | undefined | null): string | undefined {
  const normalizedBasePath = normalizeBasePath(basePath)
  return normalizedBasePath === '/' ? undefined : normalizedBasePath.replace(/\/$/, '')
}

export function resolveAppPath(path: string, basePath: string | undefined | null): string {
  if (isAbsoluteUrl(path)) return path

  const normalizedBasePath = normalizeBasePath(basePath)
  const trimmedPath = path.startsWith('/') ? path.slice(1) : path
  return `${normalizedBasePath}${trimmedPath}`
}
