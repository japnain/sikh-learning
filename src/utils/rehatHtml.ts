export function stripHtmlTags(value: string) {
  if (typeof window === 'undefined' || typeof window.DOMParser === 'undefined') {
    // This function returns plain text, never trusted HTML. Without a parser,
    // preserve literal input rather than risk rebuilding tags with a regexp.
    return value.replace(/\s+/g, ' ').trim()
  }

  const parsed = new window.DOMParser().parseFromString(value, 'text/html')
  function readText(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ''
    if (node.nodeType !== Node.ELEMENT_NODE) return ''
    const tagName = (node as Element).tagName.toLowerCase()
    if (tagName === 'script' || tagName === 'style') return ''
    return ` ${Array.from(node.childNodes, readText).join('')} `
  }
  return Array.from(parsed.body.childNodes, readText).join('').replace(/\s+/g, ' ').trim()
}

const ALLOWED_REHAT_TAGS = new Set(['a', 'b', 'br', 'em', 'i', 'li', 'ol', 'p', 'strong', 'u', 'ul'])

function isSafeRehatHref(value: string) {
  try {
    const url = new URL(value, window.location.origin)
    return ['http:', 'https:', 'mailto:'].includes(url.protocol)
  } catch {
    return false
  }
}

export function sanitizeRehatHtml(value: string) {
  if (typeof window === 'undefined' || typeof window.DOMParser === 'undefined') {
    // The caller inserts this result as HTML. Encode every delimiter in one
    // pass so even malformed/nested input remains literal text without a DOM.
    const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
    return value.replace(/[&<>"']/g, character => entities[character])
  }

  const parser = new window.DOMParser()
  const document = parser.parseFromString(value, 'text/html')
  const sourceRoot = document.body
  const outputRoot = document.createElement('div')

  function sanitizeNode(node: Node): Node {
    if (node.nodeType === Node.TEXT_NODE) {
      return document.createTextNode(node.textContent ?? '')
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return document.createDocumentFragment()
    }

    const element = node as Element
    const tagName = element.tagName.toLowerCase()

    if (tagName === 'script' || tagName === 'style') {
      return document.createDocumentFragment()
    }

    if (!ALLOWED_REHAT_TAGS.has(tagName)) {
      const fragment = document.createDocumentFragment()
      for (const child of Array.from(element.childNodes)) {
        fragment.appendChild(sanitizeNode(child))
      }
      return fragment
    }

    const nextElement = document.createElement(tagName)
    if (tagName === 'a') {
      const href = element.getAttribute('href')
      if (href && isSafeRehatHref(href)) {
        nextElement.setAttribute('href', href)
        nextElement.setAttribute('rel', 'noreferrer')
      }
    }

    for (const child of Array.from(element.childNodes)) {
      nextElement.appendChild(sanitizeNode(child))
    }

    return nextElement
  }

  for (const child of Array.from(sourceRoot?.childNodes ?? [])) {
    outputRoot.appendChild(sanitizeNode(child))
  }

  return outputRoot.innerHTML
}
