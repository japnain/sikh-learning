import { afterEach, describe, expect, it, vi } from 'vitest'
import { captureReaderAnchor, isReaderScrollUnmovedOrClamped, restoreReaderAnchor } from './readerAnchor'
import * as appScroll from './appScroll'

function rect(top: number, height: number): DOMRect {
  return { top, bottom: top + height, height, width: 350, left: 0, right: 350, x: 0, y: top, toJSON: () => ({}) }
}

function sourceLine(key: string, top: number, height: number) {
  const line = document.createElement('article')
  line.dataset.readerAnchor = key
  line.dataset.verseId = '0'
  vi.spyOn(line, 'getBoundingClientRect').mockReturnValue(rect(top, height))
  document.body.append(line)
  return line
}

afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks() })

describe('semantic reader anchors', () => {
  it('anchors the visible body after preceding metadata and content-detected headings at enlarged native geometry', () => {
    vi.spyOn(appScroll, 'getAppViewportBounds').mockReturnValue({ top: 0, bottom: 844, height: 844 })
    const previous = sourceLine('bani-21-12-0:2', 130, 80)
    previous.dataset.lineKind = 'header'
    const title = sourceLine('bani-21-1386-0:0', 335, 80)
    title.dataset.lineKind = 'header'
    const unflaggedHeading = sourceLine('bani-21-1386-0:1', 435, 60)
    unflaggedHeading.dataset.readerStructural = 'true'
    sourceLine('bani-21-1386-0:2', 538, 100)

    expect(captureReaderAnchor()).toMatchObject({ key: 'bani-21-1386-0:2', viewportTop: 538 })
  })

  it('falls back to a visible heading when the body is outside the viewport', () => {
    vi.spyOn(appScroll, 'getAppViewportBounds').mockReturnValue({ top: 0, bottom: 844, height: 844 })
    const heading = sourceLine('visible-heading:0', 130, 80)
    heading.dataset.lineKind = 'header'
    sourceLine('body-below-viewport:0', 1000, 100)
    expect(captureReaderAnchor()).toMatchObject({ key: 'visible-heading:0', viewportTop: 130 })
  })

  it('honors an explicitly selected heading when appearance was opened from its verse actions', () => {
    vi.spyOn(appScroll, 'getAppViewportBounds').mockReturnValue({ top: 0, bottom: 844, height: 844 })
    const heading = sourceLine('selected-heading:0', 130, 80)
    heading.dataset.lineKind = 'header'
    sourceLine('visible-body:0', 538, 100)
    expect(captureReaderAnchor(document, 'selected-heading:0')).toMatchObject({ key: 'selected-heading:0', viewportTop: 130 })
  })

  it.each([
    [1000, false, true],
    [987, true, true],
    [987, false, false],
    [1100, true, false],
    [1100, false, false],
  ])('allows only an unchanged top or a genuine downward document-end clamp (%i, end=%s)', (currentTop, atEnd, allowed) => {
    vi.spyOn(appScroll, 'getAppScrollTop').mockReturnValue(currentTop)
    vi.spyOn(appScroll, 'isAppScrollAtEnd').mockReturnValue(atEnd)
    expect(isReaderScrollUnmovedOrClamped(1000)).toBe(allowed)
  })

  it('keeps the current tall source line rather than skipping to the next line', () => {
    vi.spyOn(appScroll, 'getAppViewportBounds').mockReturnValue({ top: 0, bottom: 844, height: 844 })
    sourceLine('earlier-entry:0', -400, 100)
    sourceLine('current-entry:0', -100, 400)
    sourceLine('following-entry:0', 300, 100)

    expect(captureReaderAnchor()).toMatchObject({ key: 'current-entry:0', viewportTop: 16 })
  })

  it('restores the same point in a source line after larger text reflows earlier passages', () => {
    vi.spyOn(appScroll, 'getAppViewportBounds').mockReturnValue({ top: 0, bottom: 844, height: 844 })
    vi.spyOn(appScroll, 'getAppScrollTop').mockReturnValue(1000)
    const scroll = vi.spyOn(appScroll, 'scrollAppTo').mockImplementation(() => {})
    const toolbar = document.createElement('div')
    toolbar.className = 'study-reader-topbar'
    vi.spyOn(toolbar, 'getBoundingClientRect').mockReturnValue(rect(0, 80))
    document.body.append(toolbar)
    sourceLine('same-zero-verse-id:0', -400, 100)
    const current = sourceLine('correct-entry:0', 20, 120)
    const anchor = captureReaderAnchor()!
    vi.mocked(current.getBoundingClientRect).mockReturnValue(rect(320, 240))

    restoreReaderAnchor(anchor)

    expect(scroll).toHaveBeenCalledWith({ top: 1360, behavior: 'auto' })
  })

  it('does not move to a different passage if the anchored source no longer exists', () => {
    const scroll = vi.spyOn(appScroll, 'scrollAppTo').mockImplementation(() => {})
    sourceLine('different-route:0', 50, 100)
    restoreReaderAnchor({ key: 'previous-route:0', fraction: 0, viewportTop: 80 })
    expect(scroll).not.toHaveBeenCalled()
  })

  it('keeps a selected source line when appearance opens below the first visible line', () => {
    vi.spyOn(appScroll, 'getAppViewportBounds').mockReturnValue({ top: 0, bottom: 844, height: 844 })
    sourceLine('first-visible:0', 40, 150)
    sourceLine('selected-intro:1', 230, 160)

    expect(captureReaderAnchor(document, 'selected-intro:1')).toMatchObject({
      key: 'selected-intro:1',
      viewportTop: 230,
      fraction: 0,
    })
  })
})
