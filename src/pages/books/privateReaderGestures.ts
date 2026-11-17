export interface PrivateReaderGesture {
  startX: number
  startY: number
  endX: number
  endY: number
  duration: number
  width: number
  selectionActive: boolean
  multiplePointers: boolean
  interactive: boolean
  zoomed: boolean
}

export function classifyPrivateReaderGesture(gesture: PrivateReaderGesture): 'next' | 'previous' | 'toggle' | null {
  const { startX, startY, endX, endY, duration, width, selectionActive, multiplePointers, interactive, zoomed } = gesture
  if (selectionActive || multiplePointers || interactive || width <= 0 || duration < 0
    || ![startX, startY, endX, endY, duration, width].every(Number.isFinite)) return null
  const dx = endX - startX
  const dy = endY - startY
  if (!zoomed && Math.abs(dx) >= 45 && Math.abs(dy) < Math.abs(dx) * .6 && duration <= 900) {
    return dx < 0 ? 'next' : 'previous'
  }
  if (duration > 350 || Math.hypot(dx, dy) >= 10) return null
  if (startX >= width * .22 && startX <= width * .78) return 'toggle'
  if (zoomed) return null
  return startX < width * .22 ? 'previous' : 'next'
}
