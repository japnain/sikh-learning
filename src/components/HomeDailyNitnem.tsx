import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconArrowRight, IconCheck, IconClose } from './icons'
import ModalSheet from './ModalSheet'
import { useLanguageStore } from '../store/language'
import { buildNitnemStudyPath, type NitnemRouteOption } from '../store/nitnem'
import { useSundarGutkaLengthStore } from '../store/sundarGutkaLength'
import type { SundarGutkaLength, UiLocale } from '../types'
import { getScriptTextFontClass, getScriptTextLang, renderScriptText } from '../utils/readerDisplay'
import { isSundarGutkaLengthSupportedBaniId } from '../utils/sundarGutkaLength'
import '../styles/home-daily-nitnem.css'

const COPY = {
  en: {
    title: 'Daily Nitnem', customize: 'Customize', saved: 'Your saved place',
    complete: 'Complete today', begin: 'Begin reading', resume: 'Continue reading', again: 'Read again',
    mark: 'Mark complete', undo: 'Undo completion', next: 'Up next', all: 'All banis',
    close: 'Close your banis', description: 'Your daily banis, in your chosen order. Read any bani or update today’s completion.',
    finished: 'Your Nitnem is complete.', finishedBody: 'Return to any bani whenever you wish.', revisit: 'Revisit your banis',
    empty: 'Make space for your daily banis.', choose: 'Choose your banis', order: 'Your practice, in your order.',
    count: (done: number, total: number) => `${done} of ${total} complete today`,
    allCount: (total: number) => total === 1 ? 'Your bani' : `All ${total} banis`, position: (index: number, total: number) => `Bani ${index} of ${total}`,
    groups: { Morning: 'Morning', Evening: 'Evening', Night: 'Night', Additional: 'Additional' },
    lengths: { short: 'Short', medium: 'Medium', long: 'Long', extralong: 'Extra long' },
  },
  pa: {
    title: 'ਰੋਜ਼ਾਨਾ ਨਿਤਨੇਮ', customize: 'ਬਦਲੋ', saved: 'ਤੁਹਾਡੀ ਸੰਭਾਲੀ ਥਾਂ',
    complete: 'ਅੱਜ ਪੂਰੀ', begin: 'ਪੜ੍ਹਨਾ ਸ਼ੁਰੂ ਕਰੋ', resume: 'ਪੜ੍ਹਨਾ ਜਾਰੀ ਰੱਖੋ', again: 'ਮੁੜ ਪੜ੍ਹੋ',
    mark: 'ਪੂਰੀ ਚਿੰਨ੍ਹੋ', undo: 'ਪੂਰਾ ਚਿੰਨ੍ਹ ਹਟਾਓ', next: 'ਅੱਗੇ', all: 'ਤੁਹਾਡੀਆਂ ਸਾਰੀਆਂ ਬਾਣੀਆਂ',
    close: 'ਬਾਣੀਆਂ ਬੰਦ ਕਰੋ', description: 'ਤੁਹਾਡੇ ਚੁਣੇ ਕ੍ਰਮ ਵਿੱਚ ਰੋਜ਼ਾਨਾ ਬਾਣੀਆਂ। ਕੋਈ ਬਾਣੀ ਪੜ੍ਹੋ ਜਾਂ ਅੱਜ ਦੀ ਪੂਰੀ ਬਾਣੀ ਚਿੰਨ੍ਹੋ।',
    finished: 'ਤੁਹਾਡਾ ਨਿਤਨੇਮ ਪੂਰਾ ਹੈ।', finishedBody: 'ਜਦੋਂ ਚਾਹੋ ਕਿਸੇ ਵੀ ਬਾਣੀ ਨੂੰ ਮੁੜ ਪੜ੍ਹੋ।', revisit: 'ਬਾਣੀਆਂ ਮੁੜ ਵੇਖੋ',
    empty: 'ਆਪਣੀਆਂ ਰੋਜ਼ਾਨਾ ਬਾਣੀਆਂ ਚੁਣੋ।', choose: 'ਬਾਣੀਆਂ ਚੁਣੋ', order: 'ਤੁਹਾਡਾ ਅਭਿਆਸ, ਤੁਹਾਡੇ ਕ੍ਰਮ ਵਿੱਚ।',
    count: (done: number, total: number) => `${total} ਵਿੱਚੋਂ ${done} ਅੱਜ ਪੂਰੀਆਂ`,
    allCount: (total: number) => `ਸਾਰੀਆਂ ${total} ਬਾਣੀਆਂ`, position: (index: number, total: number) => `${total} ਵਿੱਚੋਂ ਬਾਣੀ ${index}`,
    groups: { Morning: 'ਸਵੇਰ', Evening: 'ਸ਼ਾਮ', Night: 'ਰਾਤ', Additional: 'ਹੋਰ' },
    lengths: { short: 'ਛੋਟੀ', medium: 'ਦਰਮਿਆਨੀ', long: 'ਲੰਮੀ', extralong: 'ਵਧੇਰੇ ਲੰਮੀ' },
  },
  hi: {
    title: 'दैनिक नितनेम', customize: 'बदलें', saved: 'आपकी सहेजी जगह',
    complete: 'आज पूर्ण', begin: 'पढ़ना शुरू करें', resume: 'पढ़ना जारी रखें', again: 'फिर पढ़ें',
    mark: 'पूर्ण चिह्नित करें', undo: 'पूर्ण चिह्न हटाएँ', next: 'आगे', all: 'आपकी सभी बानियाँ',
    close: 'बानियाँ बंद करें', description: 'आपके चुने क्रम में दैनिक बानियाँ। कोई बानी पढ़ें या आज की पूर्णता बदलें।',
    finished: 'आपका नितनेम पूर्ण है।', finishedBody: 'जब चाहें किसी भी बानी को फिर पढ़ें।', revisit: 'बानियाँ फिर देखें',
    empty: 'अपनी दैनिक बानियाँ चुनें।', choose: 'बानियाँ चुनें', order: 'आपका अभ्यास, आपके क्रम में।',
    count: (done: number, total: number) => `${total} में से ${done} आज पूर्ण`,
    allCount: (total: number) => `सभी ${total} बानियाँ`, position: (index: number, total: number) => `${total} में से बानी ${index}`,
    groups: { Morning: 'सुबह', Evening: 'शाम', Night: 'रात', Additional: 'अन्य' },
    lengths: { short: 'संक्षिप्त', medium: 'मध्यम', long: 'लंबी', extralong: 'अधिक लंबी' },
  },
} as const

export interface HomeDailyNitnemProps {
  selected: NitnemRouteOption[]
  completed: ReadonlySet<string>
  tracking: boolean
  activeId: string | undefined
  getResume: (option: NitnemRouteOption) => string | null
  onComplete: (option: NitnemRouteOption) => void
  locale: UiLocale
}

export default function HomeDailyNitnem({ selected, completed, tracking, activeId, getResume, onComplete, locale }: HomeDailyNitnemProps) {
  const copy = COPY[locale]
  const scriptMode = useLanguageStore(state => state.scriptMode)
  const lengths = useSundarGutkaLengthStore(state => state.lengths)
  const [allOpen, setAllOpen] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const isDone = (option: NitnemRouteOption) => tracking && completed.has(option.id)
  const resumes = new Map(selected.map(option => [option.id, isDone(option) ? null : getResume(option)]))
  const count = tracking ? selected.filter(isDone).length : 0
  const finished = tracking && selected.length > 0 && count === selected.length
  const active = selected.find(option => option.id === activeId) ?? selected.find(option => !isDone(option)) ?? selected[0]
  const activeIndex = active ? selected.indexOf(active) : -1
  const activeDone = active ? isDone(active) : false
  const resume = active ? resumes.get(active.id) : null
  const upcoming = active ? [...selected.slice(activeIndex + 1), ...selected.slice(0, activeIndex)]
    .filter(option => !isDone(option)).slice(0, 2) : []
  const lengthLabel = (option: NitnemRouteOption) => {
    const length: SundarGutkaLength | null = option.supportsLengthAdjustment && isSundarGutkaLengthSupportedBaniId(option.baseBaniId)
      ? lengths[option.baseBaniId] : null
    return length ? copy.lengths[length] : null
  }
  const details = (option: NitnemRouteOption) => [copy.groups[option.group], lengthLabel(option)].filter(Boolean).join(' · ')
  const readingPath = (option: NitnemRouteOption) => resumes.get(option.id) || buildNitnemStudyPath(option)
  const title = (option: NitnemRouteOption, heading = false) => <>
    <span className={`${getScriptTextFontClass(scriptMode)} ${heading ? 'home-daily-script' : 'home-daily-row-script'}`}
      lang={getScriptTextLang(scriptMode)}>{renderScriptText(option.gurmukhiTitle, scriptMode)}</span>
    <span className={heading ? 'home-daily-english' : 'home-daily-row-english'}>{option.romanizedTitle}</span>
  </>
  const completion = (option: NitnemRouteOption, className: string) => <button type="button" className={className}
    aria-label={`${isDone(option) ? copy.undo : copy.mark}: ${option.romanizedTitle}`}
    aria-pressed={isDone(option)} onClick={() => onComplete(option)}>
    <span aria-hidden="true" className="home-daily-completion-mark">{isDone(option) ? <IconCheck size={15} /> : null}</span>
    <span>{isDone(option) ? copy.undo : copy.mark}</span>
  </button>

  return <section className="home-daily" aria-labelledby="home-nitnem-title" data-testid="home-nitnem-spotlight">
    <header className="home-daily-heading">
      <h2 id="home-nitnem-title">{copy.title}</h2>
      <Link to="/nitnem/customize" data-testid="home-nitnem-manage">{copy.customize}<SettingsIcon /></Link>
    </header>
    <div className="home-daily-summary" data-testid="home-nitnem-summary">
      <p>{tracking && selected.length > 0 ? copy.count(count, selected.length) : copy.order}</p>
      {selected.length > 0 ? <button type="button" className="home-daily-all-link" onClick={() => setAllOpen(true)}>{copy.allCount(selected.length)}<IconArrowRight size={15} /></button> : null}
    </div>
    {tracking && selected.length > 0 ? <div className="home-daily-progress" role="progressbar"
      aria-label={copy.title} aria-valuemin={0} aria-valuemax={selected.length} aria-valuenow={count} aria-valuetext={copy.count(count, selected.length)}>
      {selected.map(option => <span key={option.id} aria-hidden="true" data-complete={isDone(option)} />)}
    </div> : null}

    {finished ? <div className="home-daily-finished" data-testid="home-nitnem-finished">
      <span className="home-daily-finished-mark" aria-hidden="true"><IconCheck size={25} /></span>
      <h3>{copy.finished}</h3><p>{copy.finishedBody}</p>
      <button type="button" className="home-daily-read" onClick={() => setAllOpen(true)}>{copy.revisit}<IconArrowRight size={19} /></button>
    </div> : active ? <>
      <article className={`home-daily-current${activeDone ? ' is-complete' : ''}`} data-testid="home-nitnem-active-reading" data-nitnem-id={active.id} data-nitnem-index={activeIndex} aria-labelledby="home-daily-current-title">
        <div className="home-daily-current-overline"><span>{details(active)}</span>
          <span className="home-daily-position"><span className="sr-only">{copy.position(activeIndex + 1, selected.length)}</span><span aria-hidden="true">{String(activeIndex + 1).padStart(2, '0')}<span className="home-daily-position-divider"> / </span>{String(selected.length).padStart(2, '0')}</span></span>
        </div>
        <div data-testid="home-nitnem-reading-panel">
          <h3 id="home-daily-current-title">{title(active, true)}</h3>
          {activeDone || resume ? <p className="home-daily-current-meta">{activeDone ? copy.complete : copy.saved}</p> : null}
          <div className="home-daily-current-actions">
            <Link to={readingPath(active)} state={{ readerOrigin: '/' }}
              className={activeDone ? 'home-daily-read-again' : 'home-daily-read'} data-testid={activeDone ? undefined : 'home-nitnem-primary-action'}>
              {activeDone ? copy.again : resume ? copy.resume : copy.begin}<IconArrowRight size={19} />
            </Link>
            {tracking ? completion(active, 'home-daily-complete') : null}
          </div>
        </div>
      </article>
      {upcoming.length > 0 ? <div className="home-daily-upcoming" data-testid="home-nitnem-next">
        <h3>{copy.next}</h3>
        <ol aria-label={copy.next}>
          {upcoming.map(option => <li key={option.id}>
            <Link to={readingPath(option)} state={{ readerOrigin: '/' }} className="home-daily-next"
              aria-label={`${resumes.get(option.id) ? copy.resume : copy.begin}: ${option.romanizedTitle}`}>
              <span className="home-daily-next-number" aria-hidden="true">{String(selected.indexOf(option) + 1).padStart(2, '0')}</span>
              <span className="home-daily-next-copy">{title(option)}{resumes.get(option.id) || lengthLabel(option) ? <span className="home-daily-next-meta">{resumes.get(option.id) ? copy.saved : lengthLabel(option)}</span> : null}</span>
              <IconArrowRight size={19} />
            </Link>
          </li>)}
        </ol>
      </div> : null}
    </> : <div className="home-daily-empty"><p>{copy.empty}</p><Link to="/nitnem/customize" className="home-daily-read">{copy.choose}<IconArrowRight size={19} /></Link></div>}

    {allOpen ? <ModalSheet open onClose={() => setAllOpen(false)} title={copy.all} description={copy.description}
      className="home-daily-sheet" testId="home-nitnem-all" initialFocusRef={closeRef}>
      <header className="home-daily-sheet-heading"><div><p>{copy.title}</p><h2>{copy.all}</h2></div>
        <button ref={closeRef} type="button" onClick={() => setAllOpen(false)} aria-label={copy.close}><IconClose size={21} /></button>
      </header>
      <ol className="home-daily-sheet-list" aria-label={copy.title}>
        {selected.map((option, index) => <li key={option.id} data-nitnem-id={option.id}>
          <Link to={readingPath(option)} state={{ readerOrigin: '/' }} className="home-daily-sheet-reading" onClick={() => setAllOpen(false)}
            aria-label={`${isDone(option) ? copy.again : resumes.get(option.id) ? copy.resume : copy.begin}: ${option.romanizedTitle}`}>
            <span className="home-daily-next-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <span className="home-daily-next-copy">{title(option)}<span className="home-daily-next-meta">{isDone(option) ? copy.complete : resumes.get(option.id) ? copy.saved : details(option)}</span></span>
            <IconArrowRight size={19} />
          </Link>
          {tracking ? completion(option, 'home-daily-sheet-complete') : null}
        </li>)}
      </ol>
      <footer className="home-daily-sheet-footer"><Link to="/nitnem/customize" onClick={() => setAllOpen(false)}>{copy.customize}<SettingsIcon /></Link></footer>
    </ModalSheet> : null}
  </section>
}

function SettingsIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M3 7h7m6 0h5M3 17h12m6 0h0" /><circle cx="13" cy="7" r="3" /><circle cx="18" cy="17" r="3" /></svg>
}
