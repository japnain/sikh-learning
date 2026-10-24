import { Fragment, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import ModalSheet from '../../components/ModalSheet'
import StoryArtwork from '../../components/StoryArtwork'
import {
  IconArrowLeft,
  IconArrowRight,
  IconBookmark,
  IconBookmarkFilled,
  IconCheck,
  IconClose,
  IconExternalLink,
} from '../../components/icons'
import { sameStorySummary } from '../../data/storyValidation'
import { loadStory, loadStoryCatalog } from '../../data/storyRepository'
import { useEpubReaderStore, type EpubReaderLineHeight, type EpubReaderMeasure } from '../../store/epubReader'
import { useLocaleStore } from '../../store/locale'
import { STORY_UI, storyUiLang } from '../../utils/storyUi'
import { useStoryStore } from '../../store/stories'
import { useThemeStore } from '../../store/theme'
import type { Story, StoryCatalog, StorySummary } from '../../types/stories'
import {
  addAppScrollListener,
  addAppScrollSettledListener,
  focusElementWithoutAppScroll,
  getAppViewportBounds,
  scrollAppTo,
  scrollElementIntoAppView,
} from '../../utils/appScroll'
import { buildLibraryReaderNavigationState, getLibraryReaderOrigin } from '../../utils/libraryReaderNavigation'
import '../../styles/stories.css'

type ReaderPanel = 'appearance' | 'account' | 'contents' | null
type StoryLoadState =
  | { key: string; status: 'loading' | 'error' }
  | { key: string; status: 'ready'; story: Story | null; catalog: StoryCatalog | null }

const LINE_HEIGHTS: Record<EpubReaderLineHeight, string> = { compact: '1.6', comfortable: '1.8', spacious: '2' }
const MEASURES: Record<EpubReaderMeasure, string> = { narrow: '32rem', standard: '38rem', wide: '44rem' }
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
  const [panel, setPanel] = useState<ReaderPanel>(null)
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
  const setFontScale = useEpubReaderStore(state => state.setFontScale)
  const setLineHeight = useEpubReaderStore(state => state.setLineHeight)
  const setMeasure = useEpubReaderStore(state => state.setMeasure)
  const themeMode = useThemeStore(state => state.mode)
  const setThemeMode = useThemeStore(state => state.setMode)
  const articleRef = useRef<HTMLElement | null>(null)
  const toolbarRef = useRef<HTMLElement | null>(null)
  const paragraphRefs = useRef(new Map<string, HTMLParagraphElement>())
  const sectionHeadingRefs = useRef(new Map<string, HTMLHeadingElement>())
  const pendingSectionRef = useRef<string | null>(null)
  const progressRef = useRef<HTMLDivElement | null>(null)
  const progressFillRef = useRef<HTMLSpanElement | null>(null)
  const activeParagraphRef = useRef(initialPosition?.paragraphId ?? story.paragraphs[0]?.id ?? '')
  const currentProgressRef = useRef(initialPosition?.progress ?? 0)
  const restoredRef = useRef(false)
  const pendingRestoreRef = useRef<(() => void) | null>(null)
  const committedRef = useRef('')
  const appearanceAnchorRef = useRef<string | null>(null)
  const lastAppearanceRef = useRef(`${fontScale}:${lineHeight}:${measure}`)
  const panelRef = useRef<ReaderPanel>(null)
  const nextStory = catalog?.stories.find(candidate => candidate.id === nextStoryId)
  const latestSummary = catalog?.stories.find(candidate => candidate.id === story.id)
  const isOlderEdition = latestSummary && !sameStorySummary(story, latestSummary)
  const sections = story.sections
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
    const paragraphs = story.paragraphs.map(paragraph => ({ id: paragraph.id, node: paragraphRefs.current.get(paragraph.id) }))
      .filter((paragraph): paragraph is { id: string; node: HTMLParagraphElement } => Boolean(paragraph.node))
    const first = paragraphs[0]?.node.getBoundingClientRect()
    const last = paragraphs.at(-1)?.node.getBoundingClientRect()
    // A hidden or not-yet-laid-out view must not replace a real saved position.
    if (!first || !last || last.bottom <= first.top) {
      return { paragraphId: activeParagraphRef.current, progress: currentProgressRef.current }
    }
    const viewport = getAppViewportBounds()
    const readingLine = Math.max(
      viewport.top + Math.min(120, viewport.height * 0.22),
      (toolbarRef.current?.getBoundingClientRect().bottom ?? viewport.top) + 24,
    )
    let paragraphId = paragraphs[0].id
    for (const paragraph of paragraphs) {
      const sectionHeading = sectionHeadingRefs.current.get(paragraph.id)
      if ((sectionHeading ?? paragraph.node).getBoundingClientRect().top > readingLine) break
      paragraphId = paragraph.id
    }
    const atEnd = last.bottom <= viewport.bottom - 24 && first.top < readingLine
    const progress = atEnd ? 1 : Math.max(0, Math.min(1, (readingLine - first.top) / (last.bottom - first.top)))
    return { paragraphId, progress: Math.round(progress * 1000) / 1000 }
  }, [story.paragraphs])

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
    let progressFrame: number | null = null
    const onScroll = () => {
      if (progressFrame !== null) return
      progressFrame = window.requestAnimationFrame(() => {
        progressFrame = null
        updateProgress()
      })
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') commitPosition()
    }
    const removeSettledListener = addAppScrollSettledListener(commitPosition)
    const removeScrollListener = addAppScrollListener(onScroll)
    window.addEventListener('pagehide', commitPosition)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      commitPosition()
      removeSettledListener()
      removeScrollListener()
      if (progressFrame !== null) window.cancelAnimationFrame(progressFrame)
      window.removeEventListener('pagehide', commitPosition)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [commitPosition, updateProgress])

  useEffect(() => {
    const appearance = `${fontScale}:${lineHeight}:${measure}`
    if (lastAppearanceRef.current !== appearance) {
      lastAppearanceRef.current = appearance
      if (restoredRef.current) appearanceAnchorRef.current ??= activeParagraphRef.current
    }
    if (!appearanceAnchorRef.current || panel) return
    // ModalSheet restores the locked page offset on dismissal. Restore the
    // paragraph after that paint so a larger font keeps the reader's place.
    let secondFrame: number | null = null
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        const anchorId = appearanceAnchorRef.current ?? ''
        const target = sectionHeadingRefs.current.get(anchorId) ?? paragraphRefs.current.get(anchorId)
        appearanceAnchorRef.current = null
        if (target) scrollElementIntoAppView(target, { block: 'start', behavior: 'auto' })
        updateProgress()
      })
    })
    return () => {
      window.cancelAnimationFrame(firstFrame)
      if (secondFrame !== null) window.cancelAnimationFrame(secondFrame)
    }
  }, [fontScale, lineHeight, measure, panel, updateProgress])

  useEffect(() => {
    if (panel || !pendingSectionRef.current) return
    const paragraphId = pendingSectionRef.current
    pendingSectionRef.current = null
    let secondFrame: number | null = null
    // Let the sheet release its scroll lock and restore its opener first.
    // The selected section then owns both reading position and keyboard focus.
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        const target = sectionHeadingRefs.current.get(paragraphId) ?? paragraphRefs.current.get(paragraphId)
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
    if (restoredRef.current) appearanceAnchorRef.current ??= activeParagraphRef.current
    change()
  }

  const openPanel = (nextPanel: Exclude<ReaderPanel, null>) => {
    commitPosition()
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

  const openSection = (paragraphId: string) => {
    pendingRestoreRef.current = null
    pendingSectionRef.current = paragraphId
    closePanel()
  }

  const toggleSaved = () => {
    const persisted = isSaved ? removeStory(story.id) : saveStory(storySummary(story))
    setStatus(`${isSaved ? copy.storyRemoved : copy.storySaved}${persisted ? '' : ` ${copy.storage}`}`)
  }

  const finishStory = () => {
    const lastParagraph = story.paragraphs.at(-1)
    if (!lastParagraph) return
    activeParagraphRef.current = lastParagraph.id
    currentProgressRef.current = 1
    committedRef.current = `${lastParagraph.id}:1`
    const persisted = savePosition(story.id, { paragraphId: lastParagraph.id, progress: 1, revision: story.revision, finishedAt: new Date().toISOString() })
    setStatus(`${copy.storyFinished}${persisted ? '' : ` ${copy.storage}`}`)
    if (progressFillRef.current) progressFillRef.current.style.transform = 'scaleX(1)'
    progressRef.current?.setAttribute('aria-valuenow', '100')
    progressRef.current?.setAttribute('aria-valuetext', copy.progressValue(100))
  }

  const readerStyle = {
    '--story-font-scale': String(fontScale),
    '--story-line-height': LINE_HEIGHTS[lineHeight],
    '--story-measure': MEASURES[measure],
  } as CSSProperties
  const panelTitle = panel === 'appearance' ? copy.appearance : panel === 'contents' ? copy.inStory : copy.account

  return (
    <div
      className="story-reader"
      lang={storyUiLang(locale)}
      data-page="story-reader"
      data-measure={measure}
      data-line-height={lineHeight}
      style={readerStyle}
    >
      <header ref={toolbarRef} className="story-reader-toolbar">
        <Link to={backTo} onClick={commitPosition} className="story-icon-button" aria-label={copy.back(backLabel)}>
          <IconArrowLeft size={21} />
        </Link>
        <span className="story-reader-toolbar-title" lang="en">{story.title}</span>
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
        <div
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
        </div>
      </header>
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
            <button type="button" onClick={() => openPanel('account')} aria-haspopup="dialog">{copy.account}</button>
          </div>
          <StoryArtwork kind={story.artwork} className="story-reader-artwork" />
        </header>
        <div className="story-prose">
          {story.paragraphs.map(paragraph => {
            const section = sections?.find(item => item.startParagraphId === paragraph.id)
            return <Fragment key={paragraph.id}>
              {section ? <h2
                id={`story-section-${section.id}`}
                className="story-section-heading"
                tabIndex={-1}
                ref={node => {
                  if (node) sectionHeadingRefs.current.set(paragraph.id, node)
                  else sectionHeadingRefs.current.delete(paragraph.id)
                }}
              >{section.title}</h2> : null}
            <p
              id={paragraph.id}
              ref={node => {
                if (node) paragraphRefs.current.set(paragraph.id, node)
                else paragraphRefs.current.delete(paragraph.id)
              }}
              className="story-paragraph"
            >
              {paragraph.text}
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
            ? copy.appearanceDescription
            : panel === 'contents' ? copy.contentsDescription : copy.accountDescription}
          className="story-reader-panel"
          testId="story-reader-panel"
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
                <p className="story-settings-note">{copy.appearanceDescription}</p>
                <fieldset className="story-setting-group">
                  <legend>{copy.textSize}</legend>
                  <div className="story-font-size">
                    <button type="button" aria-label={copy.decrease} disabled={fontScale <= 0.85} onClick={() => changeAppearance(() => setFontScale(fontScale - 0.05))}>
                      <span aria-hidden="true">A−</span>
                    </button>
                    <input
                      type="range"
                      aria-label={copy.textSize}
                      min="0.85"
                      max="1.3"
                      step="0.05"
                      value={fontScale}
                      onChange={event => changeAppearance(() => setFontScale(Number(event.target.value)))}
                    />
                    <button type="button" aria-label={copy.increase} disabled={fontScale >= 1.3} onClick={() => changeAppearance(() => setFontScale(fontScale + 0.05))}>
                      <span aria-hidden="true">A+</span>
                    </button>
                    <output>{Math.round(fontScale * 100)}%</output>
                  </div>
                </fieldset>
                <StoryChoiceGroup title={copy.lineSpacing} options={[{ value: 'compact', label: copy.closeSpacing }, { value: 'comfortable', label: copy.natural }, { value: 'spacious', label: copy.open }]} value={lineHeight} onChange={value => changeAppearance(() => setLineHeight(value))} />
                <StoryChoiceGroup title={copy.width} options={[{ value: 'narrow', label: copy.narrow }, { value: 'standard', label: copy.standard }, { value: 'wide', label: copy.wide }]} value={measure} onChange={value => changeAppearance(() => setMeasure(value))} />
                <StoryChoiceGroup title={copy.theme} options={[{ value: 'light', label: copy.light }, { value: 'dark', label: copy.dark }, { value: 'system', label: copy.system }]} value={themeMode} onChange={setThemeMode} />
              </>
            ) : panel === 'contents' ? (
              <nav aria-label={copy.sections}>
                <ol className="story-contents-list">
                  {sections?.map((section, index) => <li key={section.id}>
                    <button type="button" onClick={() => openSection(section.startParagraphId)} aria-current={activeSection?.id === section.id ? 'location' : undefined}>
                      <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><span lang="en">{section.title}</span>
                    </button>
                  </li>)}
                </ol>
              </nav>
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
