import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { RehatChapterSummary } from '../types'
import { useCompanionCopy } from '../utils/companionCopy'
import { STORY_UI } from '../utils/storyUi'
import { EPUB_FONT_SCALE_MIN, EPUB_FONT_SCALE_MAX, EPUB_FONT_SCALE_STEP, useEpubReaderStore } from '../store/epubReader'
import ReaderHeader from './ReaderHeader'
import ModalSheet from './ModalSheet'
import { IconArrowLeft, IconClose, IconSearch } from './icons'
import { REHAT_PALETTE_CLASSES } from '../utils/rehatAppearance'

const COPY = {
  en: { contents: 'Rehat contents', find: 'Find in chapter', palette: 'Page appearance', paper: 'Paper', sepia: 'Sepia', night: 'Night', reset: 'Restore reading defaults', description: 'Reading preferences are shared with stories and books.' },
  pa: { contents: 'ਰਹਿਤ ਦੀ ਸਮੱਗਰੀ', find: 'ਅਧਿਆਇ ਵਿੱਚ ਲੱਭੋ', palette: 'ਸਫ਼ੇ ਦੀ ਦਿੱਖ', paper: 'ਕਾਗ਼ਜ਼', sepia: 'ਸੇਪੀਆ', night: 'ਰਾਤ', reset: 'ਪੜ੍ਹਨ ਦੀਆਂ ਮੂਲ ਸੈਟਿੰਗਾਂ ਵਾਪਸ ਲਿਆਓ', description: 'ਪੜ੍ਹਨ ਦੀਆਂ ਪਸੰਦਾਂ ਸਾਖੀਆਂ ਅਤੇ ਕਿਤਾਬਾਂ ਨਾਲ ਸਾਂਝੀਆਂ ਹਨ।' },
  hi: { contents: 'रहित की विषय-सूची', find: 'अध्याय में खोजें', palette: 'पृष्ठ की दिखावट', paper: 'कागज़', sepia: 'सेपिया', night: 'रात', reset: 'पढ़ने की मूल सेटिंग बहाल करें', description: 'पढ़ने की पसंद साखियों और किताबों के साथ साझा है।' },
}

export default function RehatReaderHeader({ title, subtitle, rehatId, chapterId, chapters, loading, error, onRetry, search, readOrigin, onAppearanceOpen, onAppearanceClose, onFindClose }: {
  title: string
  subtitle: string
  rehatId: number | null
  chapterId: number | null
  chapters: RehatChapterSummary[]
  loading: boolean
  error: boolean
  onRetry: () => void
  search: ReactNode
  readOrigin: string
  onAppearanceOpen: () => void
  onAppearanceClose: () => void
  onFindClose: () => void
}) {
  const { t, locale } = useCompanionCopy()
  const ui = STORY_UI[locale]
  const copy = COPY[locale]
  const [panel, setPanel] = useState<'contents' | 'appearance' | null>(null)
  const [findOpen, setFindOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const navigationState = { readerOrigin: readOrigin }
  const closePanel = () => {
    if (panel === 'appearance') onAppearanceClose()
    setPanel(null)
  }
  const { fontScale, lineHeight, measure, palette, setFontScale, setLineHeight, setMeasure, setPalette, resetPreferences } = useEpubReaderStore()
  const closeAppearance = () => { setPanel(null); onAppearanceClose() }

  useEffect(() => {
    if (findOpen) searchRef.current?.querySelector('input')?.focus({ preventScroll: true })
  }, [findOpen])

  return <>
    <ReaderHeader
      className="rehat-reader-toolbar"
      data-testid="rehat-reader-header"
      title={title}
      titleLang="en"
      back={<Link state={navigationState} to={rehatId ? `/banis/rehat/${rehatId}` : '/banis/rehat'} aria-label={t('Back to chapters')}><IconArrowLeft size={20} /></Link>}
      actions={<>
        <button type="button" aria-label={copy.contents} aria-haspopup="dialog" aria-expanded={panel === 'contents'} onClick={() => setPanel('contents')}>
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <button type="button" aria-label={copy.find} aria-expanded={findOpen} aria-controls="rehat-reader-find" onClick={() => { if (findOpen) onFindClose(); setFindOpen(open => !open) }}><IconSearch size={20} /></button>
        <button type="button" aria-label={ui.appearance} aria-haspopup="dialog" aria-expanded={panel === 'appearance'} onClick={() => { onAppearanceOpen(); setPanel('appearance') }}><span aria-hidden="true">Aa</span></button>
      </>}
      secondary={findOpen ? <div id="rehat-reader-find" className="rehat-reader-find" ref={searchRef}>{search}</div> : null}
    />
    <ModalSheet open={panel === 'contents'} onClose={closePanel} title={copy.contents} description={ui.contentsDescription} className={`rehat-reader-sheet ${REHAT_PALETTE_CLASSES[palette]}`} testId="rehat-contents-sheet">
      <div className="rehat-reader-sheet__heading"><h2>{copy.contents}</h2><button type="button" className="interactive-focus" aria-label={ui.close(copy.contents)} onClick={closePanel}><IconClose size={20} /></button></div>
      <p lang="en" className="rehat-reader-sheet__source">{subtitle}</p>
      {loading ? <p role="status">{t('Loading chapters...')}</p> : error ? <div role="alert"><p>{t('Rehat chapters could not load right now.')}</p><button type="button" className="interactive-focus" onClick={onRetry}>{t('Retry')}</button></div> : <nav aria-label={copy.contents}>
        {chapters.map(chapter => <Link key={chapter.chapterId} state={navigationState} to={`/banis/rehat/${rehatId}/chapters/${chapter.chapterId}`} className="interactive-focus rehat-reader-sheet__chapter" aria-current={chapter.chapterId === chapterId ? 'page' : undefined} onClick={closePanel}><span lang="en">{chapter.chapterName}</span>{chapter.chapterId === chapterId ? <span aria-hidden="true">•</span> : null}</Link>)}
      </nav>}
      <Link className="interactive-focus rehat-reader-sheet__chapter" state={navigationState} to={rehatId ? `/banis/rehat/${rehatId}` : '/banis/rehat'} onClick={closePanel}>{t('Back to all sections')}</Link>
    </ModalSheet>
    <ModalSheet open={panel === 'appearance'} onClose={closeAppearance} title={ui.appearance} description={copy.description} className={`rehat-reader-sheet ${REHAT_PALETTE_CLASSES[palette]}`} testId="rehat-appearance-sheet">
      <div className="rehat-reader-sheet__heading"><h2>{ui.appearance}</h2><button type="button" className="interactive-focus" aria-label={ui.close(ui.appearance)} onClick={closeAppearance}><IconClose size={20} /></button></div>
      <div className="rehat-reader-setting"><p>{ui.textSize}</p><div className="rehat-reader-setting__scale"><button type="button" className="interactive-focus" aria-label={ui.decrease} disabled={fontScale <= EPUB_FONT_SCALE_MIN} onClick={() => setFontScale(fontScale - EPUB_FONT_SCALE_STEP)}>A−</button><output aria-live="polite">{Math.round(fontScale * 100)}%</output><button type="button" className="interactive-focus" aria-label={ui.increase} disabled={fontScale >= EPUB_FONT_SCALE_MAX} onClick={() => setFontScale(fontScale + EPUB_FONT_SCALE_STEP)}>A+</button></div></div>
      <div className="rehat-reader-setting"><p id="rehat-line-spacing">{ui.lineSpacing}</p><div role="group" aria-labelledby="rehat-line-spacing">{(['compact', 'comfortable', 'spacious'] as const).map((value, index) => <button key={value} type="button" className="interactive-focus" aria-pressed={lineHeight === value} onClick={() => setLineHeight(value)}>{[ui.closeSpacing, ui.natural, ui.open][index]}</button>)}</div></div>
      <div className="rehat-reader-setting"><p id="rehat-reading-width">{ui.width}</p><div role="group" aria-labelledby="rehat-reading-width">{(['narrow', 'standard', 'wide'] as const).map(value => <button key={value} type="button" className="interactive-focus" aria-pressed={measure === value} onClick={() => setMeasure(value)}>{ui[value]}</button>)}</div></div>
      <div className="rehat-reader-setting"><p id="rehat-page-appearance">{copy.palette}</p><div role="group" aria-labelledby="rehat-page-appearance">{(['paper', 'sepia', 'night'] as const).map(value => <button key={value} type="button" className="interactive-focus" aria-pressed={palette === value} onClick={() => setPalette(value)}>{copy[value]}</button>)}</div></div>
      <button type="button" className="interactive-focus rehat-reader-reset" onClick={resetPreferences}>{copy.reset}</button>
    </ModalSheet>
  </>
}
