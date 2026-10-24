export const READER_TEXT_SIZE = { min: 16, max: 34, step: 1, default: 22 } as const

export function normalizeReaderTextSize(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return READER_TEXT_SIZE.default
  return Math.min(READER_TEXT_SIZE.max, Math.max(READER_TEXT_SIZE.min, Math.round(value)))
}
