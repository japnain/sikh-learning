import { useEffect, useRef, useState } from 'react'
import type { BaniFetchResult } from '../api/banidb'
import type { SundarGutkaLength } from '../types'
import { loadExactBaniReading } from '../utils/baniLengthSelection'
import { isExactBaniReading } from '../utils/baniReadingValidation'

/** Keep the old route mounted until an exact replacement is ready. */
export function useBaniLengthSelection(routeIdentity: string) {
  const [preparedReading, setPreparedReading] = useState<BaniFetchResult | null>(null)
  const [pendingRequest, setPendingRequest] = useState<{ route: string; pending: boolean }>({ route: routeIdentity, pending: false })
  const request = useRef<AbortController | null>(null)
  const route = useRef(routeIdentity)
  route.current = routeIdentity
  useEffect(() => () => { request.current?.abort(); request.current = null }, [routeIdentity])
  const cancel = () => {
    request.current?.abort()
    request.current = null
    setPendingRequest({ route: route.current, pending: false })
  }
  const prepare = async (baniDbId: number, length: SundarGutkaLength, prepared?: BaniFetchResult) => {
    request.current?.abort()
    const controller = new AbortController()
    const origin = route.current
    request.current = controller
    setPendingRequest({ route: origin, pending: true })
    try {
      const reading = isExactBaniReading(prepared, baniDbId, length) ? prepared! : await loadExactBaniReading(baniDbId, length, controller.signal)
      if (controller.signal.aborted || origin !== route.current || request.current !== controller) throw new DOMException('Reading changed', 'AbortError')
      setPreparedReading(reading)
      return reading
    } finally {
      if (request.current === controller) {
        request.current = null
        setPendingRequest({ route: origin, pending: false })
      }
    }
  }
  return { prepare, cancel, preparedReading, pending: pendingRequest.route === routeIdentity && pendingRequest.pending }
}
