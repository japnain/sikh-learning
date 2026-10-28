import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { RehatChapterSummary } from '../types'
import { useCompanionCopy } from '../utils/companionCopy'
import { STORY_UI } from '../utils/storyUi'
import { useEpubReaderStore } from '../store/epubReader'
import ReaderHeader from './ReaderHeader'
import ModalSheet from './ModalSheet'
import { IconArrowLeft, IconClose, IconSearch } from './icons'

const COPY = {
  en: { contents: 'Rehat contents', find: 'Find in chapter' },
  pa: { contents: 'ਰਹਿਤ ਦੀ ਸਮੱਗਰੀ', find: 'ਅਧਿਆਇ ਵਿੱਚ ਲੱਭੋ' },
  hi: { contents: 'रहित की विषय-सूची', find: 'अध्याय में खोजें' },
}

export default function RehatReaderHeader({ title, subtitle, rehatId, chapterId, chapters, loading, error, onRetry, search }: {
  title: string
  subtitle: string
  rehatId: number | null
  chapterId: number | null
  chapters: RehatChapterSummary[]
  loading: boolean
  error: boolean
  onRetry: () => void
  search: ReactNode
}) {
  const { t, locale } = useCompanionCopy()
  const ui = STORY_UI[locale]
  const copy = COPY[locale]
  const [panel, setPanel] = useState<'contents' | 'appearance' | null>(null)
  const [findOpen, setFindOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const { fontScale, lineHeight, measure, setFontScale, setLineHeight, setMeasure } = useEpubReaderStore()

  useEffect(() => {
    if (findOpen) searchRef.current?.querySelector('input')?.focus({ preventScroll: true })
  }, [findOpen])

  return <>
    <ReaderHeader
      className="rehat-reader-toolbar"
      data-testid="rehat-reader-header"
      heading
      title={title}
      titleLang="en"
      subtitle={subtitle}
      back={<Link to={rehatId ? `/banis/rehat/${rehatId}` : '/banis/rehat'} aria-label={t('Back to chapters')}><IconArrowLeft size={20} /></Link>}
      actions={<>
        <button type="button" aria-label={copy.contents} aria-haspopup="dialog" onClick={() => setPanel('contents')}>
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <button type="button" aria-label={copy.find} aria-expanded={findOpen} aria-controls="rehat-reader-find" onClick={() => setFindOpen(open => !open)}><IconSearch size={20} /></button>
        <button type="button" aria-label={ui.appearance} aria-haspopup="dialog" onClick={() => setPanel('appearance')}><span aria-hidden="true">Aa</span></button>
      </>}
      secondary={findOpen ? <div id="rehat-reader-find" className="rehat-reader-find" ref={searchRef}>{search}</div> : null}
    />
    <ModalSheet open={panel === 'contents'} onClose={() => setPanel(null)} title={copy.contents} description={ui.contentsDescription} className="rehat-reader-sheet" testId="rehat-contents-sheet">
      <div className="rehat-reader-sheet__heading"><h2>{copy.contents}</h2><button type="button" className="interactive-focus" aria-label={ui.close(copy.contents)} onClick={() => setPanel(null)}><IconClose size={20} /></button></div>
      <p lang="en" className="rehat-reader-sheet__source">{subtitle}</p>
      {loading ? <p role="status">{t('Loading chapters...')}</p> : error ? <div role="alert"><p>{t('Rehat chapters could not load right now.')}</p><button type="button" className="interactive-focus" onClick={onRetry}>{t('Retry')}</button></div> : <nav aria-label={copy.contents}>
        {chapters.map(chapter => <Link key={chapter.chapterId} to={`/banis/rehat/${rehatId}/chapters/${chapter.chapterId}`} className="interactive-focus rehat-reader-sheet__chapter" aria-current={chapter.chapterId === chapterId ? 'page' : undefined} onClick={() => setPanel(null)}><span lang="en">{chapter.chapterName}</span>{chapter.chapterId === chapterId ? <span aria-hidden="true">•</span> : null}</Link>)}
      </nav>}
      <Link className="interactive-focus rehat-reader-sheet__chapter" to={rehatId ? `/banis/rehat/${rehatId}` : '/banis/rehat'} onClick={() => setPanel(null)}>{t('Back to all sections')}</Link>
    </ModalSheet>
    <ModalSheet open={panel === 'appearance'} onClose={() => setPanel(null)} title={ui.appearance} description={ui.appearanceDescription} className="rehat-reader-sheet" testId="rehat-appearance-sheet">
      <div className="rehat-reader-sheet__heading"><h2>{ui.appearance}</h2><button type="button" className="interactive-focus" aria-label={ui.close(ui.appearance)} onClick={() => setPanel(null)}><IconClose size={20} /></button></div>
      <div className="rehat-reader-setting"><p>{ui.textSize}</p><div className="rehat-reader-setting__scale"><button type="button" className="interactive-focus" aria-label={ui.decrease} disabled={fontScale <= 0.85} onClick={() => setFontScale(fontScale - 0.05)}>A−</button><output aria-live="polite">{Math.round(fontScale * 100)}%</output><button type="button" className="interactive-focus" aria-label={ui.increase} disabled={fontScale >= 1.3} onClick={() => setFontScale(fontScale + 0.05)}>A+</button></div></div>
      <div className="rehat-reader-setting"><p id="rehat-line-spacing">{ui.lineSpacing}</p><div role="group" aria-labelledby="rehat-line-spacing">{(['compact', 'comfortable', 'spacious'] as const).map((value, index) => <button key={value} type="button" className="interactive-focus" aria-pressed={lineHeight === value} onClick={() => setLineHeight(value)}>{[ui.closeSpacing, ui.natural, ui.open][index]}</button>)}</div></div>
      <div className="rehat-reader-setting"><p id="rehat-reading-width">{ui.width}</p><div role="group" aria-labelledby="rehat-reading-width">{(['narrow', 'standard', 'wide'] as const).map(value => <button key={value} type="button" className="interactive-focus" aria-pressed={measure === value} onClick={() => setMeasure(value)}>{ui[value]}</button>)}</div></div>
    </ModalSheet>
  </>
}
