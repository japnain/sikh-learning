import { afterEach, expect, test, vi } from 'vitest'
import { sanitizeRehatHtml, stripHtmlTags } from './rehatHtml'

afterEach(() => vi.restoreAllMocks())

test('extracts readable text using HTML parsing with paragraph boundaries and decoded entities', () => {
  expect(stripHtmlTags('<p>Keep <strong>seva</strong> &amp; care.</p><p>Share.</p><script>hidden()</script><style>hidden{}</style>'))
    .toBe('Keep seva & care. Share.')
  expect(stripHtmlTags('<p title="a > b">A &lt; B</p>')).toBe('A < B')
})

test.each([
  '<scr<script>ipt>alert(1)</scr</script>ipt><p>Keep</p>',
  '<STYLE>bad</STYLE><img src=x onerror=alert(1)><p onclick=alert(1)>Keep</p>',
  '<svg><foreignObject><p onmouseover=alert(1)>Keep</p></foreignObject></svg>',
  '<math><mtext><a href="javascript:alert(1)">Keep</a></mtext></math>',
  '<a href="java&#x09;script:alert(1)">Keep</a><iframe srcdoc="<script>alert(1)</script>"></iframe>',
])('reconstructs only allowed HTML for malformed or hostile input: %s', input => {
  const sanitized = sanitizeRehatHtml(input)
  const output = new DOMParser().parseFromString(sanitized, 'text/html')
  expect(output.body.textContent).toContain('Keep')
  expect(output.querySelector('script, style, img, svg, math, iframe')).toBeNull()
  for (const element of output.body.querySelectorAll('*')) {
    expect(Array.from(element.attributes).some(attribute => attribute.name.startsWith('on'))).toBe(false)
    const href = element.getAttribute('href')
    if (href) expect(['https:', 'http:', 'mailto:']).toContain(new URL(href, window.location.origin).protocol)
  }
})

test('preserves safe links and content after attempted wrapper breakouts', () => {
  const output = sanitizeRehatHtml('</div><p>First</p><p><a href="https://example.com" onclick="bad()">Second</a></p>')
  expect(output).toBe('<p>First</p><p><a href="https://example.com" rel="noreferrer">Second</a></p>')
})

test('without DOMParser the HTML fallback escapes input instead of returning partially stripped markup', () => {
  const Parser = window.DOMParser
  const input = '<scr<script>ipt>alert(1)</scr</script>ipt><img src=x onerror="bad()"> &lt;b&gt;'
  vi.spyOn(window, 'DOMParser', 'get').mockReturnValue(undefined as unknown as typeof DOMParser)
  const sanitized = sanitizeRehatHtml(input)
  const output = new Parser().parseFromString(sanitized, 'text/html')
  expect(output.body.children).toHaveLength(0)
  expect(output.body.textContent).toBe(input)
  expect(stripHtmlTags(input)).toBe(input)
})
