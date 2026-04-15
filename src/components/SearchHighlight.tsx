import { Fragment } from 'react'

interface SearchHighlightProps {
  text: string
  query: string
  minimumTokenLength?: number
}

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

export function hasSearchMatch(text: string, query: string, minimumTokenLength = 2) {
  const tokens = getSearchHighlightTokens(query.trim(), minimumTokenLength)
  if (!text || tokens.length === 0) return false

  const lowerText = text.toLocaleLowerCase()
  return tokens.some(token => lowerText.includes(token.toLocaleLowerCase()))
}

export default function SearchHighlight({
  text,
  query,
  minimumTokenLength = 2,
}: SearchHighlightProps) {
  const tokens = getSearchHighlightTokens(query.trim(), minimumTokenLength)

  if (!text || tokens.length === 0) {
    return <>{text}</>
  }

  const pattern = new RegExp(`(${tokens.map(escapeRegExp).join('|')})`, 'gi')
  const parts = text.split(pattern)

  if (parts.length === 1) {
    return <>{text}</>
  }

  return (
    <>
      {parts.map((part, index) => (
        index % 2 === 1
          ? (
              <mark
                key={`${part}-${index}`}
                data-search-highlight="true"
                className="rounded-[0.35rem] bg-saffron/18 px-[0.18em] py-[0.02em] text-saffron-dark dark:bg-gold/16 dark:text-gold-light"
              >
                {part}
              </mark>
            )
          : <Fragment key={`${part}-${index}`}>{part}</Fragment>
      ))}
    </>
  )
}
