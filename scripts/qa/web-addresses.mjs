/** Match a complete address in source copy, allowing an omitted HTTPS scheme. */
export function hasExactWebAddress(text, expectedAddress) {
  const expected = new URL(expectedAddress)
  return text.split(/[\s<>"'{}()[\]]+/u).some((word) => {
    const candidate = word.replace(/[.,;:!?]+$/u, '')
    try {
      const url = new URL(candidate)
      return url.href === expected.href
    } catch {
      try {
        return new URL(`https://${candidate}`).href === expected.href
      } catch {
        return false
      }
    }
  })
}
