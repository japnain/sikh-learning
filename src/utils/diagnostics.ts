import { getAppVersion, getDiagnosticsEndpoint } from './appConfig'

export type DiagnosticCode =
  | 'react_render_failure'
  | 'unhandled_window_error'
  | 'unhandled_promise_rejection'
  | 'provider_request_failed'

export type DiagnosticProvider = 'banidb' | 'mahankosh' | 'stories' | 'library'
export type DiagnosticSource = 'error-boundary' | 'window-error' | 'unhandled-rejection' | DiagnosticProvider

export interface DiagnosticPayload {
  schema: 1
  code: DiagnosticCode
  source: DiagnosticSource
  fatal: boolean
  path: string
  appVersion: string
}

interface DiagnosticOptions {
  source: DiagnosticSource
  fatal?: boolean
}

export interface DiagnosticHistoryEntry extends DiagnosticPayload {
  occurredAt: string
  count: number
}

const MAX_HISTORY = 20
const recentFailures: DiagnosticHistoryEntry[] = []

/** Session memory only: no account data, request URL, content, or exception text. */
export function getDiagnosticHistory(): DiagnosticHistoryEntry[] {
  return recentFailures.map(entry => ({ ...entry }))
}

export function clearDiagnosticHistory(): void {
  recentFailures.length = 0
}

function getSafePathname(pathname: string): string {
  const path = pathname.split(/[?#]/, 1)[0].replace(/\/$/, '') || '/'
  if (['/', '/banis', '/study', '/library', '/stories', '/vocab', '/more', '/support', '/privacy', '/nitnem/customize'].includes(path)) return path
  if (/^\/banis\/(amrit-keertan|rehat)(\/[^/]+)?$/.test(path)) return path.replace(/\/(amrit-keertan|rehat)\/[^/]+$/, '/$1/:id')
  if (/^\/library\/[^/]+\/chapters\/[^/]+$/.test(path)) return '/library/:work/chapters/:chapter'
  if (/^\/library\/[^/]+$/.test(path)) return '/library/:work'
  if (/^\/stories\/[^/]+$/.test(path)) return '/stories/:story'
  // Unknown routes can contain names, emails, or arbitrary user-provided text.
  return '/other'
}

export function createDiagnosticPayload(
  code: DiagnosticCode,
  options: DiagnosticOptions,
  pathname = typeof window === 'undefined' ? '/' : window.location.pathname,
): DiagnosticPayload {
  return {
    schema: 1,
    code,
    source: options.source,
    fatal: options.fatal ?? false,
    path: getSafePathname(pathname),
    appVersion: getAppVersion(),
  }
}

export function reportDiagnostic(code: DiagnosticCode, options: DiagnosticOptions): boolean {
  if (typeof window === 'undefined') return false
  const payload = createDiagnosticPayload(code, options)
  const previous = recentFailures.at(-1)
  const now = new Date()
  if (previous && previous.code === payload.code && previous.source === payload.source
    && previous.path === payload.path && now.getTime() - Date.parse(previous.occurredAt) < 60_000) {
    previous.count += 1
    return false
  }
  recentFailures.push({ ...payload, occurredAt: now.toISOString(), count: 1 })
  if (recentFailures.length > MAX_HISTORY) recentFailures.shift()

  const endpoint = getDiagnosticsEndpoint()
  if (!endpoint) return false

  const body = JSON.stringify(payload)
  // fetch explicitly omits credentials; sendBeacon cannot express that policy.
  if (typeof globalThis.fetch !== 'function') return false

  void globalThis.fetch(endpoint, {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'omit',
    keepalive: true,
    referrerPolicy: 'no-referrer',
  }).catch(() => undefined)

  return true
}

export function reportProviderFailure(source: DiagnosticProvider, error?: unknown): boolean {
  if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') return false
  return reportDiagnostic('provider_request_failed', { source })
}

export function installGlobalDiagnosticHandlers(): () => void {
  if (typeof window === 'undefined') return () => undefined

  const handleWindowError = () => {
    reportDiagnostic('unhandled_window_error', { source: 'window-error', fatal: true })
  }
  const handleUnhandledRejection = () => {
    reportDiagnostic('unhandled_promise_rejection', { source: 'unhandled-rejection' })
  }

  window.addEventListener('error', handleWindowError)
  window.addEventListener('unhandledrejection', handleUnhandledRejection)

  return () => {
    window.removeEventListener('error', handleWindowError)
    window.removeEventListener('unhandledrejection', handleUnhandledRejection)
  }
}
