import { Fragment } from 'react'
import { getSearchHighlightFragments, type SearchHighlightMode } from '../utils/searchHighlight'

interface SearchHighlightProps {
  text: string
  query: string
  minimumTokenLength?: number
  mode?: SearchHighlightMode
}

export default function SearchHighlight({
  text,
  query,
  minimumTokenLength = 2,
  mode = 'literal',
}: SearchHighlightProps) {
  const fragments = getSearchHighlightFragments(text, query, minimumTokenLength, mode)

  return (
    <>
      {fragments.map((fragment, index) => (
        fragment.match
          ? (
              <mark
                key={index}
                data-search-highlight="true"
                className="rounded-[0.35rem] bg-saffron/18 px-[0.18em] py-[0.02em] text-saffron-dark dark:bg-gold/16 dark:text-gold-light"
              >
                {fragment.text}
              </mark>
            )
          : <Fragment key={index}>{fragment.text}</Fragment>
      ))}
    </>
  )
}
