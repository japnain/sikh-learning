/** Accept the numeral scripts used by the interface without accepting decimals or exponents. */
export function parseSourceUnit(value: string, maximum: number): number | null {
  const digits = Array.from(value.trim(), character => {
    const code = character.codePointAt(0)!
    for (const zero of [0x0660, 0x06f0, 0x0966, 0x0a66, 0xff10]) {
      if (code >= zero && code <= zero + 9) return String(code - zero)
    }
    return character
  }).join('')
  if (!/^\d+$/.test(digits)) return null
  const number = Number(digits)
  return Number.isSafeInteger(number) && number >= 1 && number <= maximum ? number : null
}

export function getSourceBrowsePage(value: string | null, maximum: number, pageSize = 50) {
  const lastPage = Math.max(1, Math.ceil(maximum / pageSize))
  const parsed = value && /^\d+$/.test(value) ? Number(value) : 1
  return Number.isSafeInteger(parsed) ? Math.max(1, Math.min(lastPage, parsed)) : 1
}
