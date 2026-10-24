import { highlightRehatHtml } from './rehatFind'
import { sanitizeRehatHtml } from './rehatHtml'

test('find highlights repeated phrases across inline markup without removing any chapter text', () => {
  const html = '<p>Keep <strong>seva</strong> close. Keep seva always.</p><p>Unmatched context remains.</p>'
  const result = highlightRehatHtml(html, 'keep seva', 1)
  const document = new DOMParser().parseFromString(result.html, 'text/html')
  expect(result.count).toBe(2)
  expect(document.body.textContent).toBe('Keep seva close. Keep seva always.Unmatched context remains.')
  expect(document.querySelector('[data-rehat-match="1"]')?.getAttribute('aria-current')).toBe('true')
  expect(document.querySelector('strong')?.textContent).toBe('seva')
})

test('find does not join separate paragraphs or list items into a word', () => {
  expect(highlightRehatHtml('<p>seva</p><p>always</p>', 'sevaalways').count).toBe(0)
  expect(highlightRehatHtml('<p>seva<br>always</p>', 'sevaalways').count).toBe(0)
  expect(highlightRehatHtml('<ul><li>seva</li><li>always</li></ul>', 'sevaalways').count).toBe(0)
})

test('find treats metacharacters and markup as literal text and preserves sanitized safety', () => {
  const html = sanitizeRehatHtml('<p>Try [seva] and service.</p><script>bad()</script>')
  expect(highlightRehatHtml(html, '[seva]').count).toBe(1)
  const result = highlightRehatHtml(html, '<img src=x onerror=bad()>')
  expect(result.count).toBe(0)
  expect(result.html).toContain('Try [seva] and service.')
  expect(result.html).not.toContain('script')
  expect(result.html).not.toContain('onerror')
})
