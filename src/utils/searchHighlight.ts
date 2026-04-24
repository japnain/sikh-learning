function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function getSearchHighlightTokens(query: string, minimumTokenLength = 2) {
  return [...new Set(
    query
      .split(/[\s,.;:!?()[\]{}"'“”‘’/\\|-]+/)
      .map(token => token.trim())
      .filter(token => token.length >= minimumTokenLength)
  )].sort((left, right) => right.length - left.length)
}

export function buildSearchHighlightPattern(tokens: string[]) {
  return new RegExp(`(${tokens.map(escapeRegExp).join('|')})`, 'gi')
}

export function hasSearchMatch(text: string, query: string, minimumTokenLength = 2) {
  const tokens = getSearchHighlightTokens(query.trim(), minimumTokenLength)
  if (!text || tokens.length === 0) return false

  const lowerText = text.toLocaleLowerCase()
  return tokens.some(token => lowerText.includes(token.toLocaleLowerCase()))
}
