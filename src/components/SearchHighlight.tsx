import { Fragment } from 'react'
import { buildSearchHighlightPattern, getSearchHighlightTokens } from '../utils/searchHighlight'

interface SearchHighlightProps {
  text: string
  query: string
  minimumTokenLength?: number
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

  const pattern = buildSearchHighlightPattern(tokens)
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
