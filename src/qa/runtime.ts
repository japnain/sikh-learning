import type { QaStoredControls } from './types'

export type QaFaultTarget =
  | 'home-search'
  | 'read-search'
  | 'study-ang'
  | 'study-bani'
  | 'study-shabad'
  | 'study-hukamnama'
  | 'mahankosh'
  | 'supabase-bootstrap'
  | 'cloud-sync'

type QaFaultKind = 'fail' | 'empty' | 'slow'

const QA_STORAGE_KEY = 'naamras:qa-controls'
const QA_DELAY_MS = 850

function isQaRuntimeEnabled() {
  return typeof window !== 'undefined' && (import.meta.env.DEV || import.meta.env.MODE === 'test')
}

function parseControlList(value: string | null): Set<string> {
  if (!value) return new Set()

  return new Set(
    value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
  )
}

function readStoredControls(): QaStoredControls | null {
  if (!isQaRuntimeEnabled() || typeof window === 'undefined') return null

  const raw = window.localStorage.getItem(QA_STORAGE_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as QaStoredControls
  } catch {
    return null
  }
}

function getControlsFromStorage(kind: QaFaultKind) {
  const controls = readStoredControls()
  if (!controls) return new Set<string>()
  return new Set(controls[kind] ?? [])
}

function getControlsFromQuery(kind: QaFaultKind) {
  if (!isQaRuntimeEnabled() || typeof window === 'undefined') return new Set<string>()

  const params = new URLSearchParams(window.location.search)
  const key = kind === 'fail' ? 'qaFail' : kind === 'empty' ? 'qaEmpty' : 'qaSlow'
  return parseControlList(params.get(key))
}

function hasTarget(controlSet: Set<string>, target: QaFaultTarget) {
  return controlSet.has('*') || controlSet.has(target)
}

export function hasQaFault(kind: QaFaultKind, target: QaFaultTarget) {
  if (!isQaRuntimeEnabled()) return false

  return hasTarget(getControlsFromQuery(kind), target) || hasTarget(getControlsFromStorage(kind), target)
}

export function isQaFaultError(error: unknown): boolean {
  return Boolean(
    error
    && typeof error === 'object'
    && 'name' in error
    && (error as { name?: string }).name === 'QaFaultError'
  )
}

export function createQaFaultError(target: QaFaultTarget, kind: Exclude<QaFaultKind, 'slow'> = 'fail') {
  const error = new Error(`QA ${kind} fault injected for ${target}`)
  error.name = 'QaFaultError'
  return error
}

export async function applyQaDelay(target: QaFaultTarget) {
  if (!hasQaFault('slow', target) || typeof window === 'undefined') return

  await new Promise<void>(resolve => {
    window.setTimeout(resolve, QA_DELAY_MS)
  })
}

export async function withQaControl<T>(
  target: QaFaultTarget,
  run: () => Promise<T>,
  options?: {
    emptyValue?: T | (() => T)
  }
): Promise<T> {
  await applyQaDelay(target)

  if (hasQaFault('fail', target)) {
    throw createQaFaultError(target)
  }

  if (hasQaFault('empty', target) && options?.emptyValue !== undefined) {
    return typeof options.emptyValue === 'function'
      ? (options.emptyValue as () => T)()
      : options.emptyValue
  }

  return run()
}
