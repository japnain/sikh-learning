export function stripHtmlTags(value: string) {
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
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
    return stripHtmlTags(value)
  }

  const parser = new window.DOMParser()
  const document = parser.parseFromString(`<div>${value}</div>`, 'text/html')
  const sourceRoot = document.body.firstElementChild
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
