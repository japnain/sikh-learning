import type { AsyncIssue, AsyncIssueCode, AsyncStatus } from '../types'
import { isQaFaultError } from './runtime'

function getErrorDetail(error: unknown) {
  if (error instanceof Error) return error.message
  return typeof error === 'string' ? error : null
}

export function resolveAsyncIssue(
  error: unknown,
  fallbackCode: AsyncIssueCode = 'unavailable'
): AsyncIssue {
  const detail = getErrorDetail(error)

  if (isQaFaultError(error)) {
    return {
      code: 'qa-fault',
      detail,
    }
  }

  if (detail && /404|enoent|no such file/i.test(detail)) {
    return {
      code: 'missing',
      detail,
    }
  }

  if (detail && /offline|network|failed to fetch/i.test(detail)) {
    return {
      code: 'offline',
      detail,
    }
  }

  return {
    code: fallbackCode,
    detail,
  }
}

export function getCollectionAsyncStatus({
  loading,
  issue,
  length,
}: {
  loading: boolean
  issue: AsyncIssue | null
  length: number
}): AsyncStatus {
  if (loading) return 'loading'
  if (issue) return 'degraded'
  if (length === 0) return 'empty'
  return 'ready'
}

export function getValueAsyncStatus<T>({
  loading,
  issue,
  value,
  isEmpty,
}: {
  loading: boolean
  issue: AsyncIssue | null
  value: T | null | undefined
  isEmpty?: (value: T | null | undefined) => boolean
}): AsyncStatus {
  if (loading) return 'loading'
  if (issue) return 'degraded'
  if (!value || isEmpty?.(value)) return 'empty'
  return 'ready'
}
