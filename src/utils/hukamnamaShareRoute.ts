const HUKAMNAMA_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

function normalizePositiveInteger(
  value: string | number | null | undefined,
  maximum = Number.MAX_SAFE_INTEGER,
): number | null {
  if (typeof value === 'string' && !/^\d+$/.test(value)) return null
  const candidate = typeof value === 'number' ? value : Number(value)
  return Number.isSafeInteger(candidate) && candidate > 0 && candidate <= maximum
    ? candidate
    : null
}

export function normalizeHukamnamaDate(value?: string | null): string | null {
  const candidate = value?.trim() ?? ''
  const match = HUKAMNAMA_DATE_PATTERN.exec(candidate)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
    ? candidate
    : null
}

export function buildHukamnamaStudyPath(value?: string | null): string {
  const date = normalizeHukamnamaDate(value)
  return date ? `/study?hukamnamaDate=${encodeURIComponent(date)}` : '/'
}

export function buildHukamnamaShortPath(value?: string | null): string {
  const date = normalizeHukamnamaDate(value)
  return date ? `/h/${date}` : '/'
}

export function buildPersonalHukamnamaStudyPath(
  shabadValue?: string | number | null,
  angValue?: string | number | null,
  resumeVerseValue?: string | number | null,
): string {
  const shabadId = normalizePositiveInteger(shabadValue)
  const ang = normalizePositiveInteger(angValue, 1430)
  const resumeVerseId = resumeVerseValue === null || resumeVerseValue === undefined
    ? null
    : normalizePositiveInteger(resumeVerseValue)
  if (!shabadId || !ang || (resumeVerseValue != null && !resumeVerseId)) return '/'

  const params = new URLSearchParams({
    shabadId: String(shabadId),
    flow: 'ardaas-hukamnama',
    randomHukamnamaAng: String(ang),
  })
  if (resumeVerseId) params.set('resumeVerseId', String(resumeVerseId))
  return `/study?${params.toString()}`
}

export function buildPersonalHukamnamaShortPath(
  shabadValue?: string | number | null,
  angValue?: string | number | null,
  resumeVerseValue?: string | number | null,
): string {
  const studyPath = buildPersonalHukamnamaStudyPath(
    shabadValue,
    angValue,
    resumeVerseValue,
  )
  if (studyPath === '/') return '/'

  const shabadId = normalizePositiveInteger(shabadValue)!
  const ang = normalizePositiveInteger(angValue, 1430)!
  const resumeVerseId = resumeVerseValue == null
    ? null
    : normalizePositiveInteger(resumeVerseValue)!
  return `/p/${shabadId}/${ang}${resumeVerseId ? `/${resumeVerseId}` : ''}`
}
