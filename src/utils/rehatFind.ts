/** Add safe, literal find highlights to already-sanitized chapter HTML. */
export function highlightRehatHtml(html: string, query: string, activeMatch = 0): { html: string; count: number } {
  const needle = query.trim().slice(0, 240)
  if (!needle || typeof document === 'undefined') return { html, count: 0 }
  const template = document.createElement('template')
  template.innerHTML = html
  const nodes: Array<{ node: Text; start: number; end: number }> = []
  let text = ''
  function collectText(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const textNode = node as Text
      nodes.push({ node: textNode, start: text.length, end: text.length + textNode.data.length })
      text += textNode.data
      return
    }
    const isBoundary = node.nodeType === Node.ELEMENT_NODE && ['P', 'LI', 'OL', 'UL', 'BR'].includes((node as Element).tagName)
    if (isBoundary) text += '\n'
    for (const child of Array.from(node.childNodes)) collectText(child)
    if (isBoundary) text += '\n'
  }
  collectText(template.content)
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const ranges = Array.from(text.matchAll(new RegExp(escaped, 'giu')), match => ({ start: match.index, end: match.index + match[0].length }))
  for (const { node, start, end } of nodes) {
    const overlaps = ranges.flatMap((range, index) => range.start < end && range.end > start
      ? [{ start: Math.max(range.start, start) - start, end: Math.min(range.end, end) - start, index }] : [])
    if (!overlaps.length) continue
    const fragment = document.createDocumentFragment()
    let cursor = 0
    for (const range of overlaps) {
      fragment.append(node.data.slice(cursor, range.start))
      const mark = document.createElement('mark')
      mark.dataset.rehatMatch = String(range.index)
      mark.className = 'rehat-find-match'
      if (range.index === activeMatch) mark.setAttribute('aria-current', 'true')
      mark.textContent = node.data.slice(range.start, range.end)
      fragment.append(mark)
      cursor = range.end
    }
    fragment.append(node.data.slice(cursor))
    node.replaceWith(fragment)
  }
  return { html: template.innerHTML, count: ranges.length }
}
