import { getAppVersion, getDiagnosticsEndpoint } from './appConfig'

export type DiagnosticCode =
  | 'react_render_failure'
  | 'unhandled_window_error'
  | 'unhandled_promise_rejection'

export type DiagnosticSource = 'error-boundary' | 'window-error' | 'unhandled-rejection'

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

function getSafePathname(pathname: string): string {
  const pathWithoutQuery = pathname.split(/[?#]/, 1)[0]
  const path = pathWithoutQuery.startsWith('/') ? pathWithoutQuery : '/'
  return path
    .split('/')
    .map(segment => (/^\d+$/.test(segment) ? ':id' : segment))
    .join('/')
    .slice(0, 160)
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
  const endpoint = getDiagnosticsEndpoint()
  if (!endpoint || typeof window === 'undefined') return false

  const body = JSON.stringify(createDiagnosticPayload(code, options))

  try {
    if (typeof navigator.sendBeacon === 'function') {
      const queued = navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }))
      if (queued) return true
    }
  } catch {
    // Fall through to a keepalive request when beacon transport is unavailable.
  }

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
