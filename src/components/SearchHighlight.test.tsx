import { render } from '@testing-library/react'
import { expect, test } from 'vitest'
import SearchHighlight from './SearchHighlight'

test('renders phonetic highlights as text without changing scripture or treating it as markup', () => {
  const text = 'sat nām <script>alert("naam")</script>'
  const { container } = render(<SearchHighlight text={text} query="naam" mode="transliteration" />)
  expect(container.textContent).toBe(text)
  expect(container.querySelector('script')).toBeNull()
  expect([...container.querySelectorAll('mark')].map(mark => mark.textContent)).toEqual(['nām', 'naam'])
})

test('wraps a complete Gurmukhi grapheme when only its consonant matched', () => {
  const { container } = render(<SearchHighlight text="ਸਤਿ ਨਾਮੁ" query="ਸਤ" />)
  expect(container.textContent).toBe('ਸਤਿ ਨਾਮੁ')
  expect(container.querySelector('mark')).toHaveTextContent('ਸਤਿ')
})
