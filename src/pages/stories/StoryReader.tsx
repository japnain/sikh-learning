import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import ModalSheet from '../../components/ModalSheet'
import ReaderHeader from '../../components/ReaderHeader'
import StoryArtwork from '../../components/StoryArtwork'
import {
  IconArrowLeft,
  IconArrowRight,
  IconBookmark,
  IconBookmarkFilled,
  IconCheck,
  IconClose,
  IconExternalLink,
  IconSearch,
} from '../../components/icons'
import { sameStorySummary } from '../../data/storyValidation'
import { loadStory, loadStoryCatalog } from '../../data/storyRepository'
import { EPUB_FONT_SCALE_MIN, EPUB_FONT_SCALE_MAX, EPUB_FONT_SCALE_STEP, useEpubReaderStore, type EpubReaderLineHeight, type EpubReaderMeasure, type EpubReaderPalette } from '../../store/epubReader'
import { useLocaleStore } from '../../store/locale'
import { STORY_UI, storyUiLang } from '../../utils/storyUi'
import { STORY_FIND_UI } from '../../utils/storyFindUi'
import { useStoryStore } from '../../store/stories'
import type { Story, StoryCatalog, StorySummary } from '../../types/stories'
import {
  addAppScrollSettledListener,
  focusElementWithoutAppScroll,
  getAppScrollTop,
  getAppViewportBounds,
  scrollAppTo,
  scrollElementIntoAppView,
} from '../../utils/appScroll'
import { buildLibraryReaderNavigationState, getLibraryReaderOrigin } from '../../utils/libraryReaderNavigation'
import '../../styles/stories.css'

type ReaderPanel = 'appearance' | 'account' | 'contents' | 'find' | null
type StoryLoadState =
  | { key: string; status: 'loading' | 'error' }
  | { key: string; status: 'ready'; story: Story | null; catalog: StoryCatalog | null }

const LINE_HEIGHTS: Record<EpubReaderLineHeight, string> = { compact: '1.6', comfortable: '1.8', spacious: '2' }
const MEASURES: Record<EpubReaderMeasure, string> = { narrow: '32rem', standard: '38rem', wide: '44rem' }
const PANEL_PALETTES: Record<EpubReaderPalette, string> = { paper: 'story-reader-panel--paper', sepia: 'story-reader-panel--sepia', night: 'story-reader-panel--night' }
const APPEARANCE_COPY = {
  en: { description: 'Text size, spacing, width and page color are shared with Books and Rehat. Your app theme stays separate.', pageColor: 'Page color', paper: 'Paper', sepia: 'Sepia', night: 'Night', reset: 'Reset reading settings', compact: 'Compact', comfortable: 'Comfort', spacious: 'Spacious', preview: 'Text preview' },
  pa: { description: 'ਲਿਖਤ ਦਾ ਆਕਾਰ, ਫ਼ਾਸਲਾ, ਚੌੜਾਈ ਅਤੇ ਪੰਨੇ ਦਾ ਰੰਗ ਕਿਤਾਬਾਂ ਅਤੇ ਰਹਿਤ ਨਾਲ ਸਾਂਝੇ ਹਨ। ਐਪ ਦਾ ਥੀਮ ਵੱਖਰਾ ਰਹਿੰਦਾ ਹੈ।', pageColor: 'ਪੰਨੇ ਦਾ ਰੰਗ', paper: 'ਕਾਗਜ਼', sepia: 'ਸੇਪੀਆ', night: 'ਰਾਤ', reset: 'ਪਾਠ ਦੀਆਂ ਸੈਟਿੰਗਾਂ ਮੁੜ ਸੈੱਟ ਕਰੋ', compact: 'ਨੇੜੇ', comfortable: 'ਸਧਾਰਨ', spacious: 'ਖੁੱਲ੍ਹਾ', preview: 'ਲਿਖਤ ਦੀ ਝਲਕ' },
  hi: { description: 'अक्षरों का आकार, अंतर, चौड़ाई और पन्ने का रंग किताबों और रहित के साथ साझा हैं। ऐप की थीम अलग रहती है।', pageColor: 'पन्ने का रंग', paper: 'कागज़', sepia: 'सेपिया', night: 'रात', reset: 'पाठ की सेटिंग रीसेट करें', compact: 'पास', comfortable: 'सामान्य', spacious: 'खुला', preview: 'पाठ का पूर्वावलोकन' },
}
type AppearanceAnchor = { paragraphId: string; offset: number } | { scrollTop: number }
type StoryFindRange = { start: number; end: number }

function storyMatchRanges(text: string, query: string): StoryFindRange[] {
  if (!query) return []
  // Treat punctuation and markup as literal text, including regular-expression
  // metacharacters. Match offsets always refer to the original prose.
  const pattern = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'giu')
  return Array.from(text.matchAll(pattern), match => ({ start: match.index, end: match.index + match[0].length }))
}

function StoryHighlightedText({ text, ranges }: { text: string; ranges: StoryFindRange[] }) {
  if (!ranges.length) return <>{text}</>
  const content: ReactNode[] = []
  let cursor = 0
  for (const range of ranges) {
    content.push(text.slice(cursor, range.start), <mark key={range.start} className="story-find-highlight">{text.slice(range.start, range.end)}</mark>)
    cursor = range.end
  }
  content.push(text.slice(cursor))
  return <>{content}</>
}

function storyFindExcerpt(text: string, range: StoryFindRange) {
  const start = Math.max(0, range.start - 65)
  const end = Math.min(text.length, range.end + 100)
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`
}

function StoryChoiceGroup<T extends string>({ title, options, value, onChange }: {
  title: string
  options: ReadonlyArray<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
}) {
  return (
    <fieldset className="story-setting-group">
      <legend>{title}</legend>
      <div className="story-setting-options">
        {options.map(option => (
          <button
            key={option.value}
            type="button"
            className="story-setting-option"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

function storySummary(story: Story): StorySummary {
  const { id, title, subtitle, description, collectionId, themes, people, artwork, wordCount, readingMinutes, revision, metadataRevision, series } = story
  return { id, title, subtitle, description, collectionId, themes, people, artwork, wordCount, readingMinutes, revision,
    ...(metadataRevision === undefined ? {} : { metadataRevision }), ...(series ? { series } : {}) }
}

function decodeParagraphHash(hash: string) {
  try {
    return decodeURIComponent(hash.replace(/^#/, ''))
  } catch {
    return ''
  }
}

function isSavedOrigin(path: string) {
  const pathname = path.split(/[?#]/)[0]
  return pathname === '/saved' || pathname === '/library'
}

function nextStoryInCollection(catalog: StoryCatalog | null, story: Story, positions: Record<string, { revision: number; finishedAt?: string }>) {
  const stories = catalog?.stories ?? []
  const isUnread = (candidate: StorySummary) => {
    const position = positions[candidate.id]
    return !position?.finishedAt || position.revision !== candidate.revision
  }
  const series = story.series
  const laterParts = series ? stories.filter(candidate => candidate.series?.id === series.id && candidate.series.order > series.order)
    .sort((a, b) => a.series!.order - b.series!.order) : []
  if (laterParts.length) return laterParts.find(isUnread) ?? laterParts[0]
  const related = story.relatedStoryIds?.flatMap(id => {
    const candidate = stories.find(item => item.id === id && item.id !== story.id)
    return candidate ? [candidate] : []
  }) ?? []
  if (related.length) return related.find(isUnread) ?? related[0]
  const index = stories.findIndex(candidate => candidate.id === story.id)
  const following = [...stories.slice(index + 1), ...stories.slice(0, Math.max(0, index))]
    .filter(candidate => candidate.id !== story.id)
  const unread = following.filter(isUnread)
  return unread.find(candidate => candidate.collectionId === story.collectionId)
    ?? unread[0]
    ?? following.find(candidate => candidate.collectionId === story.collectionId)
    ?? following[0]
}

function StoryReaderState({ status, backTo, retry }: { status: 'loading' | 'error' | 'missing'; backTo: string; retry: () => void }) {
  const locale = useLocaleStore(state => state.locale)
  const copy = STORY_UI[locale]
  return (
    <div className="story-reader story-reader-state" lang={storyUiLang(locale)} data-page="story-reader">
      <Link to={backTo} className="story-reader-back">
        <IconArrowLeft size={18} />
        <span>{isSavedOrigin(backTo) ? copy.saved : copy.stories}</span>
      </Link>
      <div className="story-reader-state-card" role={status === 'loading' ? 'status' : undefined}>
        <p className="story-reader-eyebrow">{copy.stories}</p>
        <h1>{status === 'loading' ? copy.openingStory : status === 'error' ? copy.openError : copy.missing}</h1>
        <p>{status === 'loading' ? copy.openingBody : status === 'error' ? copy.errorBody : copy.missingBody}</p>
        {status === 'error' ? <button type="button" className="story-button-primary" onClick={retry}>{copy.retry}</button> : null}
        {status === 'missing' ? <Link to="/banis?collection=stories" className="story-button-primary">{copy.browse}</Link> : null}
      </div>
    </div>
  )
}

export function StoryReadingView({ story, catalog, backTo, hash, preview: requestedPreview = false }: { story: Story; catalog: StoryCatalog | null; backTo: string; hash: string; preview?: boolean }) {
  const locale = useLocaleStore(state => state.locale)
  const copy = STORY_UI[locale]
  const preview = import.meta.env.DEV && requestedPreview
  const appearanceCopy = APPEARANCE_COPY[locale]
  const findCopy = STORY_FIND_UI[locale]
  const [panel, setPanel] = useState<ReaderPanel>(null)
  const [findQuery, setFindQuery] = useState('')
  const [selectedFindParagraph, setSelectedFindParagraph] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [initialPosition] = useState(() => {
    const position = preview ? undefined : useStoryStore.getState().positions[story.id]
    return position?.revision === story.revision ? position : undefined
  })
  const isSaved = useStoryStore(state => !preview && Boolean(state.saved[story.id]))
  const isFinished = useStoryStore(state => {
    const position = state.positions[story.id]
    return !preview && position?.revision === story.revision && Boolean(position.finishedAt)
  })
  const nextStoryId = useStoryStore(state => nextStoryInCollection(catalog, story, preview ? {} : state.positions)?.id)
  const saveStory = useStoryStore(state => state.saveStory)
  const removeStory = useStoryStore(state => state.removeStory)
  const savePosition = useStoryStore(state => state.savePosition)
  const fontScale = useEpubReaderStore(state => state.fontScale)
  const lineHeight = useEpubReaderStore(state => state.lineHeight)
  const measure = useEpubReaderStore(state => state.measure)
  const palette = useEpubReaderStore(state => state.palette)
  const setFontScale = useEpubReaderStore(state => state.setFontScale)
  const setLineHeight = useEpubReaderStore(state => state.setLineHeight)
  const setMeasure = useEpubReaderStore(state => state.setMeasure)
  const setPalette = useEpubReaderStore(state => state.setPalette)
  const resetPreferences = useEpubReaderStore(state => state.resetPreferences)
  const articleRef = useRef<HTMLElement | null>(null)
  const toolbarRef = useRef<HTMLElement | null>(null)
  const paragraphRefs = useRef(new Map<string, HTMLParagraphElement>())
  const sectionHeadingRefs = useRef(new Map<string, HTMLHeadingElement>())
  const pendingDestinationRef = useRef<{ paragraphId: string; section: boolean } | null>(null)
  const findInputRef = useRef<HTMLInputElement | null>(null)
  const progressRef = useRef<HTMLDivElement | null>(null)
  const progressFillRef = useRef<HTMLSpanElement | null>(null)
  const activeParagraphRef = useRef(initialPosition?.paragraphId ?? story.paragraphs[0]?.id ?? '')
  const currentProgressRef = useRef(initialPosition?.progress ?? 0)
  const restoredRef = useRef(false)
  const pendingRestoreRef = useRef<(() => void) | null>(null)
  const committedRef = useRef('')
  const appearanceAnchorRef = useRef<AppearanceAnchor | null>(null)
  const appearanceChangedRef = useRef(false)
  const lastAppearanceRef = useRef(`${fontScale}:${lineHeight}:${measure}:${palette}`)
  const panelRef = useRef<ReaderPanel>(null)
  const nextStory = catalog?.stories.find(candidate => candidate.id === nextStoryId)
  const latestSummary = catalog?.stories.find(candidate => candidate.id === story.id)
  const isOlderEdition = latestSummary && !sameStorySummary(story, latestSummary)
  const sections = story.sections
  const normalizedFindQuery = findQuery.trim()
  const findPassages = useMemo(() => story.paragraphs.map((paragraph, index) => {
    const section = sections?.find(item => item.startParagraphId === paragraph.id)
    const ranges = storyMatchRanges(paragraph.text, normalizedFindQuery)
    const headingRanges = storyMatchRanges(section?.title ?? '', normalizedFindQuery)
    return { paragraph, index, section, ranges, headingRanges }
  }), [story.paragraphs, sections, normalizedFindQuery])
  const findResults = findPassages.filter(passage => passage.ranges.length || passage.headingRanges.length)
  const findMatchCount = findResults.reduce((count, passage) => count + passage.ranges.length + passage.headingRanges.length, 0)
  const hasContents = Boolean(sections && sections.length > 1)
  const activeParagraphIndex = story.paragraphs.findIndex(paragraph => paragraph.id === activeParagraphRef.current)
  const activeSection = sections?.filter(section => story.paragraphs.findIndex(paragraph => paragraph.id === section.startParagraphId) <= activeParagraphIndex).at(-1)
  const relatedStories = story.relatedStoryIds?.flatMap(id => {
    const candidate = catalog?.stories.find(item => item.id === id && item.id !== story.id && item.id !== nextStoryId)
    return candidate ? [candidate] : []
  }).slice(0, 3) ?? []
  const backLabel = isSavedOrigin(backTo) ? copy.saved : locale === 'en' ? 'stories' : copy.stories
  const storyRoute = preview ? '/stories/drafts' : '/stories'

  const readPosition = useCallback(() => {
    const paragraphs = story.paragraphs
    const first = paragraphRefs.current.get(paragraphs[0]?.id ?? '')?.getBoundingClientRect()
    const last = paragraphRefs.current.get(paragraphs.at(-1)?.id ?? '')?.getBoundingClientRect()
    // A hidden or not-yet-laid-out view must not replace a real saved position.
    if (!first || !last || last.bottom <= first.top) {
      return { paragraphId: activeParagraphRef.current, progress: currentProgressRef.current }
    }
    const viewport = getAppViewportBounds()
    const readingLine = Math.max(
      viewport.top + Math.min(120, viewport.height * 0.22),
      (toolbarRef.current?.getBoundingClientRect().bottom ?? viewport.top) + 24,
    )
    // Prose remains in document order. Find the current paragraph with a
    // logarithmic number of geometry reads, only after scrolling settles.
    let low = 0
    let high = paragraphs.length - 1
    let activeIndex = 0
    while (low <= high) {
      const middle = (low + high) >>> 1
      const id = paragraphs[middle].id
      const target = sectionHeadingRefs.current.get(id) ?? paragraphRefs.current.get(id)
      if (target && target.getBoundingClientRect().top <= readingLine) {
        activeIndex = middle
        low = middle + 1
      } else high = middle - 1
    }
    const atEnd = last.bottom <= viewport.bottom - 24 && first.top < readingLine
    const progress = atEnd ? 1 : Math.max(0, Math.min(1, (readingLine - first.top) / (last.bottom - first.top)))
    return { paragraphId: paragraphs[activeIndex].id, progress: Math.round(progress * 1000) / 1000 }
  }, [story.paragraphs])

  const captureAppearanceAnchor = () => {
    const position = readPosition()
    if (position.progress === 0) return { scrollTop: getAppScrollTop() }
    const target = sectionHeadingRefs.current.get(position.paragraphId) ?? paragraphRefs.current.get(position.paragraphId)
    const readingTop = (toolbarRef.current?.getBoundingClientRect().bottom ?? getAppViewportBounds().top) + 24
    return target ? { paragraphId: position.paragraphId, offset: target.getBoundingClientRect().top - readingTop } : null
  }

  const copyRef = useRef(copy)
  useEffect(() => {
    copyRef.current = copy
    progressRef.current?.setAttribute('aria-valuetext', copy.progressValue(Math.round(currentProgressRef.current * 100)))
  }, [copy])

  const updateProgress = useCallback(() => {
    if (!restoredRef.current || panelRef.current) return
    const position = readPosition()
    activeParagraphRef.current = position.paragraphId
    currentProgressRef.current = position.progress
    const percentage = Math.round(position.progress * 100)
    progressRef.current?.setAttribute('aria-valuenow', String(percentage))
    progressRef.current?.setAttribute('aria-valuetext', copyRef.current.progressValue(percentage))
    if (progressFillRef.current) progressFillRef.current.style.transform = `scaleX(${position.progress})`
  }, [readPosition])

  const commitPosition = useCallback(() => {
    if (!restoredRef.current || panelRef.current) return
    updateProgress()
    if (preview) return
    const paragraphId = activeParagraphRef.current
    if (!paragraphId) return
    const progress = currentProgressRef.current
    if (progress === 0 && !useStoryStore.getState().positions[story.id]) return
    const key = `${paragraphId}:${progress}`
    if (committedRef.current === key) return
    committedRef.current = key
    const previousPosition = useStoryStore.getState().positions[story.id]
    const finishedAt = previousPosition?.revision === story.revision ? previousPosition.finishedAt : undefined
    savePosition(story.id, { paragraphId, progress, revision: story.revision, ...(finishedAt ? { finishedAt } : {}) })
  }, [preview, savePosition, story.id, story.revision, updateProgress])

  useEffect(() => {
    panelRef.current = panel
    if (panel !== 'find') return
    // Contents and Find share the same sheet. Switching its contents does
    // not remount the dialog, so move focus to the newly available input.
    const frame = window.requestAnimationFrame(() => findInputRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [panel])

  useEffect(() => {
    restoredRef.current = false
    const requestedId = decodeParagraphHash(hash)
    const savedId = initialPosition && initialPosition.progress > 0 ? initialPosition.paragraphId : null
    const targetId = paragraphRefs.current.has(requestedId) ? requestedId : savedId && paragraphRefs.current.has(savedId) ? savedId : null
    let cancelled = false
    let frame: number | null = null
    const restore = () => {
      if (cancelled || restoredRef.current) return
      if (panelRef.current) {
        pendingRestoreRef.current = restore
        return
      }
      pendingRestoreRef.current = null
      const target = targetId ? sectionHeadingRefs.current.get(targetId) ?? paragraphRefs.current.get(targetId) : null
      if (target) {
        activeParagraphRef.current = targetId!
        scrollElementIntoAppView(target, { block: 'start', behavior: 'auto' })
      } else {
        activeParagraphRef.current = story.paragraphs[0]?.id ?? ''
        currentProgressRef.current = 0
        scrollAppTo({ top: 0, left: 0, behavior: 'auto' })
      }
      restoredRef.current = true
      updateProgress()
      const focused = document.activeElement
      if (articleRef.current && (focused === document.body || focused?.id === 'main-content')) {
        focusElementWithoutAppScroll(articleRef.current)
      }
    }
    // The app's display fonts can change the height above the prose on a cold
    // launch. Restore after they settle, rather than saving an offset too early.
    void Promise.resolve(document.fonts?.ready).then(() => {
      if (!cancelled) frame = window.requestAnimationFrame(restore)
    })
    return () => {
      cancelled = true
      if (pendingRestoreRef.current === restore) pendingRestoreRef.current = null
      if (frame !== null) window.cancelAnimationFrame(frame)
    }
  }, [hash, initialPosition, story.paragraphs, updateProgress])

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') commitPosition()
    }
    const removeSettledListener = addAppScrollSettledListener(commitPosition)
    window.addEventListener('pagehide', commitPosition)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      commitPosition()
      removeSettledListener()
      window.removeEventListener('pagehide', commitPosition)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [commitPosition])

  useEffect(() => {
    const appearance = `${fontScale}:${lineHeight}:${measure}:${palette}`
    if (lastAppearanceRef.current !== appearance) {
      lastAppearanceRef.current = appearance
      appearanceChangedRef.current = true
    }
    if (!appearanceAnchorRef.current || !appearanceChangedRef.current || panel) return
    // ModalSheet restores the locked page offset on dismissal. Restore the
    // paragraph after that paint so a larger font keeps the reader's place.
    let secondFrame: number | null = null
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        const anchor = appearanceAnchorRef.current
        appearanceAnchorRef.current = null
        appearanceChangedRef.current = false
        if (!anchor) return
        if ('scrollTop' in anchor) scrollAppTo({ top: anchor.scrollTop, behavior: 'auto' })
        else {
          const target = sectionHeadingRefs.current.get(anchor.paragraphId) ?? paragraphRefs.current.get(anchor.paragraphId)
          if (target) {
            const readingTop = (toolbarRef.current?.getBoundingClientRect().bottom ?? getAppViewportBounds().top) + 24
            scrollAppTo({ top: Math.max(0, getAppScrollTop() + target.getBoundingClientRect().top - readingTop - anchor.offset), behavior: 'auto' })
          }
        }
        updateProgress()
      })
    })
    return () => {
      window.cancelAnimationFrame(firstFrame)
      if (secondFrame !== null) window.cancelAnimationFrame(secondFrame)
    }
  }, [fontScale, lineHeight, measure, palette, panel, updateProgress])

  useEffect(() => {
    if (panel || !pendingDestinationRef.current) return
    const { paragraphId, section } = pendingDestinationRef.current
    pendingDestinationRef.current = null
    let secondFrame: number | null = null
    // Let the sheet release its scroll lock and restore its opener first.
    // The selected section or search passage then owns position and focus.
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        const target = (section ? sectionHeadingRefs.current.get(paragraphId) : null) ?? paragraphRefs.current.get(paragraphId)
        if (!target) return
        activeParagraphRef.current = paragraphId
        restoredRef.current = true
        scrollElementIntoAppView(target, { block: 'start', behavior: 'auto' })
        focusElementWithoutAppScroll(target)
        commitPosition()
      })
    })
    return () => {
      window.cancelAnimationFrame(firstFrame)
      if (secondFrame !== null) window.cancelAnimationFrame(secondFrame)
    }
  }, [panel, commitPosition])

  const changeAppearance = (change: () => void) => {
    if (restoredRef.current) appearanceAnchorRef.current ??= captureAppearanceAnchor()
    change()
  }

  const openPanel = (nextPanel: Exclude<ReaderPanel, null>) => {
    commitPosition()
    if (nextPanel === 'appearance') {
      appearanceAnchorRef.current = restoredRef.current ? captureAppearanceAnchor() : null
      appearanceChangedRef.current = false
    }
    panelRef.current = nextPanel
    setPanel(nextPanel)
  }

  const closePanel = () => {
    panelRef.current = null
    setPanel(null)
    const pendingRestore = pendingRestoreRef.current
    if (pendingRestore) {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(pendingRestore)
      })
    }
  }

  const openSection = (paragraphId: string, section = true) => {
    pendingRestoreRef.current = null
    pendingDestinationRef.current = { paragraphId, section }
    closePanel()
  }

  const toggleSaved = () => {
    const persisted = isSaved ? removeStory(story.id) : saveStory(storySummary(story))
    setStatus(persisted ? isSaved ? copy.storyRemoved : copy.storySaved : locale === 'pa' ? 'ਇਹ ਤਬਦੀਲੀ ਸੰਭਾਲੀ ਨਹੀਂ ਜਾ ਸਕੀ।' : locale === 'hi' ? 'यह बदलाव सहेजा नहीं जा सका।' : 'This change could not be saved.')
  }

  const finishStory = () => {
    const lastParagraph = story.paragraphs.at(-1)
    if (!lastParagraph) return
    activeParagraphRef.current = lastParagraph.id
    currentProgressRef.current = 1
    committedRef.current = `${lastParagraph.id}:1`
    const persisted = savePosition(story.id, { paragraphId: lastParagraph.id, progress: 1, revision: story.revision, finishedAt: new Date().toISOString() })
    setStatus(persisted ? copy.storyFinished : locale === 'pa' ? 'ਇਹ ਤਬਦੀਲੀ ਸੰਭਾਲੀ ਨਹੀਂ ਜਾ ਸਕੀ।' : locale === 'hi' ? 'यह बदलाव सहेजा नहीं जा सका।' : 'This change could not be saved.')
    if (progressFillRef.current) progressFillRef.current.style.transform = 'scaleX(1)'
    progressRef.current?.setAttribute('aria-valuenow', '100')
    progressRef.current?.setAttribute('aria-valuetext', copy.progressValue(100))
  }

  const readerStyle = {
    '--story-font-scale': String(fontScale),
    '--story-line-height': LINE_HEIGHTS[lineHeight],
    '--story-measure': MEASURES[measure],
  } as CSSProperties
  const panelTitle = panel === 'appearance' ? copy.appearance : panel === 'contents' ? copy.inStory : panel === 'find' ? findCopy.title : copy.account

  return (
    <div
      className="story-reader"
      lang={storyUiLang(locale)}
      data-page="story-reader"
      data-measure={measure}
      data-line-height={lineHeight}
      data-palette={palette}
      style={readerStyle}
    >
      <ReaderHeader ref={toolbarRef} className="story-reader-toolbar"
        title={story.title} titleLang="en"
        back={<Link to={backTo} onClick={commitPosition} className="story-icon-button" aria-label={copy.back(backLabel)}><IconArrowLeft size={21} /></Link>}
        actions={<>
{hasContents ? <button
          type="button"
          className="story-icon-button"
          aria-label={copy.contents}
          aria-haspopup="dialog"
          aria-expanded={panel === 'contents'}
          onClick={() => openPanel('contents')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h10" />
          </svg>
        </button> : null}
        {!hasContents ? <button
          type="button"
          className="story-icon-button"
          aria-label={findCopy.title}
          aria-haspopup="dialog"
          aria-expanded={panel === 'find'}
          onClick={() => openPanel('find')}
        >
          <IconSearch size={20} />
        </button> : null}
        <button
          type="button"
          className="story-icon-button story-appearance-trigger"
          aria-label={copy.appearance}
          aria-haspopup="dialog"
          aria-expanded={panel === 'appearance'}
          onClick={() => openPanel('appearance')}
        >
          <span aria-hidden="true">Aa</span>
        </button>
        {!preview ? <button
          type="button"
          className="story-icon-button"
          aria-label={isSaved ? copy.removeStory : copy.saveStory}
          aria-pressed={isSaved}
          onClick={toggleSaved}
        >
          {isSaved ? <IconBookmarkFilled size={20} /> : <IconBookmark size={20} />}
        </button> : null}
        </>}
        progress={<div
          ref={progressRef}
          className="story-reading-progress"
          role="progressbar"
          aria-label={copy.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round((initialPosition?.progress ?? 0) * 100)}
          aria-valuetext={copy.progressValue(Math.round((initialPosition?.progress ?? 0) * 100))}
        >
          <span ref={progressFillRef} className="story-reading-progress-fill" style={{ transform: `scaleX(${initialPosition?.progress ?? 0})` }} />
        </div>}
      />
      {isOlderEdition && <p className="story-edition-notice" role="status">{copy.downloadedEdition}</p>}
      <article lang="en" ref={articleRef} tabIndex={-1} aria-labelledby="story-title" className="story-reader-content">
        <header className="story-reader-heading">
          {story.series ? <p className="story-reader-series">{story.series.title} <span aria-hidden="true">·</span> <span lang={storyUiLang(locale)}>{copy.part(story.series.order)}</span></p> : null}
          <p className="story-reader-eyebrow" lang="en">{story.accountType}</p>
          <h1 id="story-title" className="story-reader-title">{story.title}</h1>
          <p className="story-reader-subtitle">{story.subtitle}</p>
          <div className="story-reader-meta" lang={storyUiLang(locale)}>
            <span>{copy.minutes(story.readingMinutes)}</span>
            <span aria-hidden="true">·</span>
            <button type="button" onClick={() => openPanel('account')} aria-haspopup="dialog" aria-expanded={panel === 'account'}>{copy.account}</button>
          </div>
          <StoryArtwork kind={story.artwork} className="story-reader-artwork" />
        </header>
        <div className="story-prose">
          {findPassages.map(({ paragraph, section, ranges, headingRanges }) => {
            return <Fragment key={paragraph.id}>
              {section ? <h2
                id={`story-section-${section.id}`}
                className="story-section-heading"
                tabIndex={-1}
                ref={node => {
                  if (node) sectionHeadingRefs.current.set(paragraph.id, node)
                  else sectionHeadingRefs.current.delete(paragraph.id)
                }}
                data-find-current={selectedFindParagraph === paragraph.id && headingRanges.length > 0 ? 'true' : undefined}
              ><StoryHighlightedText text={section.title} ranges={headingRanges} /></h2> : null}
            <p
              id={paragraph.id}
              tabIndex={-1}
              ref={node => {
                if (node) paragraphRefs.current.set(paragraph.id, node)
                else paragraphRefs.current.delete(paragraph.id)
              }}
              className="story-paragraph"
              data-find-current={selectedFindParagraph === paragraph.id && ranges.length > 0 ? 'true' : undefined}
            >
              <StoryHighlightedText text={paragraph.text} ranges={ranges} />
            </p>
            </Fragment>
          })}
        </div>
        <footer className="story-reader-footer" lang={storyUiLang(locale)}>
          <span className="story-end-mark" aria-hidden="true">✦</span>
          <p className="story-reader-end-copy">{isFinished ? copy.carry : copy.pause}</p>
          {!preview ? <button type="button" className="story-reader-finish" onClick={finishStory} disabled={isFinished}>
            {isFinished ? <><IconCheck size={17} />{copy.finishDone}</> : copy.finish}
          </button> : null}
          {nextStory ? (
            <Link
              to={`${storyRoute}/${nextStory.id}`}
              state={buildLibraryReaderNavigationState(backTo)}
              onClick={commitPosition}
              className="story-reader-next"
              aria-label={copy.nextLabel(nextStory.title, nextStory.readingMinutes)}
            >
              <span>
                <small>{story.series && nextStory.series?.id === story.series.id ? copy.continueSeries(story.series.title) : copy.next}</small>
                <strong lang="en">{nextStory.title}</strong>
                <span>{copy.minutes(nextStory.readingMinutes)}</span>
              </span>
              <IconArrowRight size={20} />
            </Link>
          ) : null}
          {relatedStories.length ? <nav className="story-related" aria-label={copy.related}>
            <h2>{copy.more}</h2>
            {relatedStories.map(related => <Link key={related.id} to={`${storyRoute}/${related.id}`} state={buildLibraryReaderNavigationState(backTo)} onClick={commitPosition}>
              <span><span lang="en">{related.title}</span><small>{copy.minutes(related.readingMinutes)}</small></span><IconArrowRight size={18} />
            </Link>)}
          </nav> : null}
          <Link to={backTo} className="story-reader-return" onClick={commitPosition}>{copy.return(backLabel)}</Link>
        </footer>
      </article>
      <p className="story-status sr-only" role="status" aria-live="polite">{status}</p>
      {panel ? (
        <ModalSheet
          open
          onClose={closePanel}
          title={panelTitle}
          description={panel === 'appearance'
            ? appearanceCopy.description
            : panel === 'contents' ? copy.contentsDescription : panel === 'find' ? findCopy.description : copy.accountDescription}
          className={`story-reader-panel ${PANEL_PALETTES[palette]}`}
          testId="story-reader-panel"
          initialFocusRef={panel === 'find' ? findInputRef : undefined}
        >
          <header className="story-panel-header" lang={storyUiLang(locale)}>
            <h2>{panelTitle}</h2>
            <button type="button" className="story-icon-button" aria-label={copy.close(locale === 'en' ? panelTitle.toLowerCase() : panelTitle)} onClick={closePanel}>
              <IconClose size={20} />
            </button>
          </header>
          <div className="story-panel-body" lang={storyUiLang(locale)}>
            {panel === 'appearance' ? (
              <>
                <p className="story-settings-note">{appearanceCopy.description}</p>
                <fieldset className="story-setting-group">
                  <legend>{copy.textSize}</legend>
                  <div className="story-font-size">
                    <button type="button" aria-label={copy.decrease} disabled={fontScale <= EPUB_FONT_SCALE_MIN} onClick={() => changeAppearance(() => setFontScale(fontScale - EPUB_FONT_SCALE_STEP))}>
                      <span aria-hidden="true">A−</span>
                    </button>
                    <input
                      type="range"
                      aria-label={copy.textSize}
                      min={EPUB_FONT_SCALE_MIN}
                      max={EPUB_FONT_SCALE_MAX}
                      step={EPUB_FONT_SCALE_STEP}
                      value={fontScale}
                      onChange={event => changeAppearance(() => setFontScale(Number(event.target.value)))}
                    />
                    <button type="button" aria-label={copy.increase} disabled={fontScale >= EPUB_FONT_SCALE_MAX} onClick={() => changeAppearance(() => setFontScale(fontScale + EPUB_FONT_SCALE_STEP))}>
                      <span aria-hidden="true">A+</span>
                    </button>
                    <output>{Math.round(fontScale * 100)}%</output>
                  </div>
                </fieldset>
                <div className="story-appearance-preview" role="region" aria-label={appearanceCopy.preview} tabIndex={0} style={readerStyle}>
                  <p lang="en">{story.paragraphs.find(paragraph => paragraph.id === activeParagraphRef.current)?.text ?? story.paragraphs[0]?.text}</p>
                </div>
                <StoryChoiceGroup title={copy.lineSpacing} options={[{ value: 'compact', label: appearanceCopy.compact }, { value: 'comfortable', label: appearanceCopy.comfortable }, { value: 'spacious', label: appearanceCopy.spacious }]} value={lineHeight} onChange={value => changeAppearance(() => setLineHeight(value))} />
                <StoryChoiceGroup title={copy.width} options={[{ value: 'narrow', label: copy.narrow }, { value: 'standard', label: copy.standard }, { value: 'wide', label: copy.wide }]} value={measure} onChange={value => changeAppearance(() => setMeasure(value))} />
                <StoryChoiceGroup<EpubReaderPalette> title={appearanceCopy.pageColor} options={[{ value: 'paper', label: appearanceCopy.paper }, { value: 'sepia', label: appearanceCopy.sepia }, { value: 'night', label: appearanceCopy.night }]} value={palette} onChange={value => changeAppearance(() => setPalette(value))} />
                <button type="button" className="story-text-button" onClick={() => changeAppearance(resetPreferences)}>{appearanceCopy.reset}</button>
              </>
            ) : panel === 'find' ? (
              <>
                <label className="story-find-label" htmlFor="story-find-query">{findCopy.label}</label>
                <div className="story-find-input">
                  <input ref={findInputRef} id="story-find-query" type="search" maxLength={200} value={findQuery}
                    placeholder={findCopy.placeholder} aria-describedby="story-find-status" autoComplete="off"
                    onChange={event => { setFindQuery(event.target.value); setSelectedFindParagraph(null) }} />
                  {findQuery ? <button type="button" className="story-icon-button" aria-label={findCopy.clear}
                    onClick={() => { setFindQuery(''); setSelectedFindParagraph(null); findInputRef.current?.focus() }}><IconClose size={18} /></button> : null}
                </div>
                <p id="story-find-status" className="story-find-status" role="status" aria-live="polite">
                  {!normalizedFindQuery ? findCopy.hint : findResults.length ? findCopy.summary(findMatchCount, findResults.length) : findCopy.empty}
                </p>
                {findResults.length ? <ol className="story-find-results" aria-label={findCopy.results}>
                  {findResults.map(({ paragraph, index, section, ranges, headingRanges }) => {
                    const text = ranges.length ? paragraph.text : section!.title
                    const excerpt = storyFindExcerpt(text, ranges[0] ?? headingRanges[0])
                    return <li key={paragraph.id}><button type="button" aria-label={findCopy.passage(index + 1)}
                      aria-describedby={`story-find-excerpt-${paragraph.id}`}
                      aria-current={selectedFindParagraph === paragraph.id ? 'location' : undefined}
                      onClick={() => { setSelectedFindParagraph(paragraph.id); openSection(paragraph.id, !ranges.length) }}>
                      <span>{findCopy.passage(index + 1)}</span>
                      <span id={`story-find-excerpt-${paragraph.id}`} lang="en"><StoryHighlightedText text={excerpt} ranges={storyMatchRanges(excerpt, normalizedFindQuery)} /></span>
                    </button></li>
                  })}
                </ol> : null}
              </>
            ) : panel === 'contents' ? (
              <>
              <button type="button" className="story-action-button" onClick={() => openPanel('find')}>
                <IconSearch size={18} />{findCopy.title}
              </button>
              <nav aria-label={copy.sections}>
                <ol className="story-contents-list">
                  {sections?.map((section, index) => <li key={section.id}>
                    <button type="button" onClick={() => openSection(section.startParagraphId)} aria-current={activeSection?.id === section.id ? 'location' : undefined}>
                      <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><span lang="en">{section.title}</span>
                    </button>
                  </li>)}
                </ol>
              </nav>
              </>
            ) : (
              <>
                <p className="story-reader-eyebrow" lang="en">{story.accountType}</p>
                <p className="story-account-note" lang="en">{story.accountNote}</p>
                <h3>{copy.sources}</h3>
                <ol className="story-source-list">
                  {story.sources.map(source => (
                    <li key={`${source.title}:${source.reference}`} className="story-source">
                      {source.role ? <p className="story-source-role">{copy.sourceRoles[source.role]}</p> : null}
                      <p lang="en"><strong>{source.title}</strong></p>
                      <p lang="en">{source.author}{source.year === undefined ? '' : `, ${source.year}`}. {source.reference}</p>
                      {source.workDate ? <p>{copy.originalWork}: <span lang="en">{source.workDate}</span></p> : null}
                      {source.edition ? <p lang="en">{source.edition}</p> : null}
                      {source.translator ? <p>{copy.translation}: <span lang="en">{source.translator}</span></p> : null}
                      {source.editor ? <p>{copy.editor}: <span lang="en">{source.editor}</span></p> : null}
                      {source.locator ? <p className="story-source-locator" lang="en">{source.locator.kind === 'ang' ? 'Ang' : source.locator.kind === 'vaar-pauri' ? 'Vaar / Pauri' : source.locator.kind.charAt(0).toUpperCase() + source.locator.kind.slice(1)} {source.locator.value}</p> : null}
                      <a href={source.url} target="_blank" rel="noopener noreferrer">{copy.readSource}<IconExternalLink size={14} /></a>
                    </li>
                  ))}
                </ol>
                <h3>{copy.editorialNote}</h3>
                <p lang="en">{story.editorialNote}</p>
                {story.editorial ? <>
                  <h3>{copy.review}</h3>
                  <p lang="en">{story.editorial.credit}</p>
                  <dl className="story-review-list">
                    <div><dt>{copy.historyReview}</dt><dd>{story.editorial.historyReview.status === 'pending' ? copy.pending : `${story.editorial.historyReview.reviewer} · ${story.editorial.historyReview.date}`}</dd></div>
                    <div><dt>{copy.englishReview}</dt><dd>{story.editorial.englishReview.status === 'pending' ? copy.pending : `${story.editorial.englishReview.reviewer} · ${story.editorial.englishReview.date}`}</dd></div>
                  </dl>
                </> : null}
                <h3>{copy.attribution}</h3>
                <p lang="en">{story.rights.note}</p>
                {story.rights.records?.filter(record => record.attribution).map(record => <p key={record.id} lang="en">{record.attribution}</p>)}
                {story.glossary?.length ? (
                  <>
                    <h3>{copy.glossary}</h3>
                    <dl className="story-glossary" lang="en">
                      {story.glossary.map(entry => <div key={entry.term}><dt>{entry.term}</dt><dd>{entry.meaning}</dd></div>)}
                    </dl>
                  </>
                ) : null}
              </>
            )}
          </div>
        </ModalSheet>
      ) : null}
    </div>
  )
}

export default function StoryReader() {
  const { storyId = '' } = useParams<{ storyId: string }>()
  const location = useLocation()
  const backTo = getLibraryReaderOrigin(location.state, '/banis?collection=stories')
  const [attempt, setAttempt] = useState(0)
  const [loadState, setLoadState] = useState<StoryLoadState>({ key: '', status: 'loading' })
  const loadKey = `${storyId}:${attempt}`

  useEffect(() => {
    let cancelled = false
    let catalog: StoryCatalog | null = null
    // Optional discovery metadata must not hold up an already downloaded story.
    void loadStoryCatalog().then(value => {
      catalog = value
      if (!cancelled) setLoadState(current => current.key === loadKey && current.status === 'ready'
        ? { ...current, catalog: value } : current)
    }).catch(() => { /* The account itself remains readable without recommendations. */ })
    void loadStory(storyId).then(story => {
      if (!cancelled) setLoadState({ key: loadKey, status: 'ready', story, catalog })
    }).catch(() => {
      if (!cancelled) setLoadState({ key: loadKey, status: 'error' })
    })
    return () => { cancelled = true }
  }, [storyId, loadKey])

  const retry = () => setAttempt(value => value + 1)
  if (loadState.key !== loadKey || loadState.status === 'loading') return <StoryReaderState status="loading" backTo={backTo} retry={retry} />
  if (loadState.status !== 'ready') return <StoryReaderState status="error" backTo={backTo} retry={retry} />
  if (!loadState.story) return <StoryReaderState status="missing" backTo={backTo} retry={retry} />
  return <StoryReadingView key={storyId} story={loadState.story} catalog={loadState.catalog} backTo={backTo} hash={location.hash} />
}
