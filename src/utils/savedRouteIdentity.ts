export function isSafeSavedReturnPath(value: unknown): value is string {
  const hasControlCharacter = typeof value === 'string'
    && Array.from(value).some(character => {
      const codePoint = character.codePointAt(0) ?? 0
      return codePoint <= 31 || codePoint === 127
    })

  if (
    typeof value !== 'string'
    || !value.startsWith('/')
    || value.startsWith('//')
    || value.includes('\\')
    || hasControlCharacter
  ) {
    return false
  }

  try {
    const url = new URL(value, 'https://naamras.local')
    if (url.origin !== 'https://naamras.local') return false

    const decodedPath = decodeURIComponent(url.pathname)
    if (decodedPath.includes('\\') || decodedPath.startsWith('//')) return false

    return value === '/study'
      || value.startsWith('/study?')
      || url.pathname.startsWith('/library/')
  } catch {
    return false
  }
}

export function getSavedReturnIdentity(value: unknown) {
  if (!isSafeSavedReturnPath(value)) return null

  try {
    const url = new URL(value, 'https://naamras.local')
    // A live resume position changes while reading. Keep it on the return
    // route, but exclude it from the identity used for duplicate detection.
    url.searchParams.delete('resumeVerseId')
    if (url.searchParams.has('baniDbId') || url.searchParams.has('baniId')) {
      url.searchParams.delete('ang')
      url.searchParams.delete('source')
      url.searchParams.delete('bani')
      url.searchParams.delete('exactBani')
      url.searchParams.delete('startAng')
      url.searchParams.delete('endAng')
    }
    if (url.searchParams.has('shabadId')) {
      url.searchParams.delete('ang')
      url.searchParams.delete('source')
      url.searchParams.delete('baniName')
    }
    if (url.searchParams.has('hukamnamaDate')) {
      url.searchParams.delete('ang')
      url.searchParams.delete('source')
    }
    url.searchParams.sort()
    return `${url.pathname}${url.search}${url.pathname.startsWith('/library/') ? '' : url.hash}`
  } catch {
    return null
  }
}

/**
 * Legacy saves only identified a generic Ang, shabad, or verse. They can be
 * matched to an exact route when that route contains no context the legacy
 * record could not represent. A same-Ang legacy save must not stand in for a
 * dated/personal Hukamnama or a named Bani reading.
 */
export function canUseLegacySavedLocationFallback(value: unknown) {
  if (!isSafeSavedReturnPath(value)) return false

  try {
    const url = new URL(value, 'https://naamras.local')
    if (url.pathname !== '/study') return false
    if (
      url.searchParams.has('hukamnamaDate')
      || url.searchParams.get('flow') === 'ardaas-hukamnama'
      || url.searchParams.has('baniDbId')
      || url.searchParams.has('baniId')
    ) {
      return false
    }

    return url.searchParams.has('shabadId')
      || (url.searchParams.has('source') && url.searchParams.has('ang'))
  } catch {
    return false
  }
}
