export interface SearchRevealLayout {
  currentScrollTop: number
  inputTop: number
  feedbackTop: number
  feedbackBottom: number
  visibleTop: number
  visibleBottom: number
  feedbackPreviewHeight?: number
}

export function getSearchRevealScrollTop({
  currentScrollTop,
  inputTop,
  feedbackTop,
  feedbackBottom,
  visibleTop,
  visibleBottom,
  feedbackPreviewHeight = 96,
}: SearchRevealLayout) {
  const previewBottom = Math.min(feedbackBottom, feedbackTop + feedbackPreviewHeight)
  const contentTop = Math.min(inputTop, feedbackTop)
  const availableHeight = Math.max(0, visibleBottom - visibleTop)
  const contentHeight = Math.max(0, previewBottom - contentTop)

  let offset = 0
  if (contentHeight <= availableHeight) {
    if (contentTop < visibleTop) {
      offset = contentTop - visibleTop
    } else if (previewBottom > visibleBottom) {
      offset = previewBottom - visibleBottom
    }
  } else if (inputTop < visibleTop) {
    offset = inputTop - visibleTop
  } else if (feedbackTop > visibleBottom - 44) {
    offset = feedbackTop - (visibleBottom - 44)
  }

  return Math.max(0, currentScrollTop + offset)
}
