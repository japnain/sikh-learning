import { useMemo, useState, type FormEvent, type MouseEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useLocaleStore } from '../store/locale'
import type { UiLocale } from '../types'
import { SOURCE_READER_META, getSourceReaderUnitLabel, type SourceReaderId } from '../utils/sourceReaderMeta'
import { buildCurrentAppPath, buildLibraryReaderNavigationState, buildReaderOriginNavigationState } from '../utils/libraryReaderNavigation'
import { rememberDiscoveryReturn } from '../utils/discoveryReturn'
import { getSourceBrowsePage, parseSourceUnit } from '../utils/sourceBrowse'
import { IconArrowLeft, IconArrowRight, IconChevronDown, IconChevronUp, IconLibrary } from './icons'
import '../styles/source-browser.css'

type ScriptureSourceSection = { id: string; source?: SourceReaderId; overviewPath?: string }
type ScriptureSourceBrowserProps = {
  dataTestId?: string
  defaultOpenSections?: string[]
  sectionIds?: string[]
  sectionClassName?: string
}

const SECTIONS: ScriptureSourceSection[] = [
  { id: 'sggs', source: 'G' },
  { id: 'dasam-granth', source: 'D' },
  { id: 'bhai-gurdas-vaaran', source: 'B' },
  { id: 'panth-prakash-english', overviewPath: '/library/panth-prakash-english' },
]
const PAGE_SIZE = 50
const COPY = {
  en: {
    names: { G: 'Sri Guru Granth Sahib Ji', D: 'Sri Dasam Granth Sahib Ji', B: 'Bhai Gurdas Ji Vaaran', A: 'Amrit Keertan' },
    previous: 'Prev', next: 'Next', open: 'Open',
    jump: (unit: string) => `Open a specific ${unit}`,
    range: (unit: string, max: number) => `${unit} 1–${max}`,
    invalid: (unit: string, max: number) => `Enter a whole ${unit} number from 1 to ${max}.`,
    input: (name: string, unit: string) => `${name} ${unit} number`,
    destination: (name: string, unit: string, value: number) => `Open ${name} ${unit.toLowerCase()} ${value}`,
    page: (unit: string, first: number, last: number, total: number) => `${unit} ${first}–${last} of ${total}`,
    previousPage: (name: string) => `Previous numbers in ${name}`,
    nextPage: (name: string) => `Next numbers in ${name}`,
    book: 'Panth Prakash (English)', edition: 'English reading edition',
    bookDescription: 'Read the historical work across two volumes, with a chapter index and full-text search.',
    bookDetail: '169 episodes · 2 volumes', openBook: 'Open Panth Prakash', openBookLabel: 'Open Panth Prakash book reader',
  },
  pa: {
    names: { G: 'ਸ੍ਰੀ ਗੁਰੂ ਗ੍ਰੰਥ ਸਾਹਿਬ ਜੀ', D: 'ਸ੍ਰੀ ਦਸਮ ਗ੍ਰੰਥ ਸਾਹਿਬ ਜੀ', B: 'ਭਾਈ ਗੁਰਦਾਸ ਜੀ ਦੀਆਂ ਵਾਰਾਂ', A: 'ਅੰਮ੍ਰਿਤ ਕੀਰਤਨ' },
    previous: 'ਪਿਛਲੇ', next: 'ਅਗਲੇ', open: 'ਖੋਲ੍ਹੋ',
    jump: (unit: string) => `ਕੋਈ ਖ਼ਾਸ ${unit} ਖੋਲ੍ਹੋ`,
    range: (unit: string, max: number) => `${unit} 1–${max}`,
    invalid: (unit: string, max: number) => `${unit} ਲਈ 1 ਤੋਂ ${max} ਤੱਕ ਪੂਰਾ ਅੰਕ ਭਰੋ।`,
    input: (name: string, unit: string) => `${name} — ${unit} ਨੰਬਰ`,
    destination: (name: string, unit: string, value: number) => `${name} — ${unit} ${value} ਖੋਲ੍ਹੋ`,
    page: (unit: string, first: number, last: number, total: number) => `${unit} ${first}–${last}, ਕੁੱਲ ${total}`,
    previousPage: (name: string) => `${name} ਦੇ ਪਿਛਲੇ ਨੰਬਰ`,
    nextPage: (name: string) => `${name} ਦੇ ਅਗਲੇ ਨੰਬਰ`,
    book: 'ਪੰਥ ਪ੍ਰਕਾਸ਼ (ਅੰਗਰੇਜ਼ੀ)', edition: 'ਅੰਗਰੇਜ਼ੀ ਪਾਠ ਸੰਸਕਰਨ',
    bookDescription: 'ਦੋ ਭਾਗਾਂ ਵਿੱਚ ਇਤਿਹਾਸਕ ਰਚਨਾ ਪੜ੍ਹੋ; ਅਧਿਆਇ ਸੂਚੀ ਅਤੇ ਪੂਰੇ ਪਾਠ ਦੀ ਖੋਜ ਵੀ ਉਪਲਬਧ ਹੈ।',
    bookDetail: '169 ਪ੍ਰਸੰਗ · 2 ਭਾਗ', openBook: 'ਪੰਥ ਪ੍ਰਕਾਸ਼ ਖੋਲ੍ਹੋ', openBookLabel: 'ਪੰਥ ਪ੍ਰਕਾਸ਼ ਪੁਸਤਕ ਖੋਲ੍ਹੋ',
  },
  hi: {
    names: { G: 'श्री गुरु ग्रंथ साहिब जी', D: 'श्री दशम ग्रंथ साहिब जी', B: 'भाई गुरदास जी की वारें', A: 'अमृत कीर्तन' },
    previous: 'पिछले', next: 'अगले', open: 'खोलें',
    jump: (unit: string) => `कोई विशेष ${unit} खोलें`,
    range: (unit: string, max: number) => `${unit} 1–${max}`,
    invalid: (unit: string, max: number) => `${unit} के लिए 1 से ${max} तक पूर्ण अंक भरें।`,
    input: (name: string, unit: string) => `${name} — ${unit} संख्या`,
    destination: (name: string, unit: string, value: number) => `${name} — ${unit} ${value} खोलें`,
    page: (unit: string, first: number, last: number, total: number) => `${unit} ${first}–${last}, कुल ${total}`,
    previousPage: (name: string) => `${name} के पिछले नंबर`,
    nextPage: (name: string) => `${name} के अगले नंबर`,
    book: 'पंथ प्रकाश (अंग्रेज़ी)', edition: 'अंग्रेज़ी पाठ संस्करण',
    bookDescription: 'दो खंडों में ऐतिहासिक रचना पढ़ें; अध्याय सूची और पूरे पाठ में खोज भी उपलब्ध है।',
    bookDetail: '169 प्रसंग · 2 खंड', openBook: 'पंथ प्रकाश खोलें', openBookLabel: 'पंथ प्रकाश पुस्तक खोलें',
  },
} satisfies Record<UiLocale, unknown>

function isPlainClick(event: MouseEvent<HTMLAnchorElement>) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
}

function AngPageBrowser({ section, locale }: { section: ScriptureSourceSection & { source: SourceReaderId }; locale: UiLocale }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [jumpValue, setJumpValue] = useState('')
  const [invalid, setInvalid] = useState(false)
  const copy = COPY[locale]
  const source = section.source
  const name = copy.names[source]
  const total = SOURCE_READER_META[source].max
  const unit = getSourceReaderUnitLabel(source, locale)
  const pageKey = `sourcePage-${section.id}`
  const page = getSourceBrowsePage(searchParams.get(pageKey), total)
  const start = (page - 1) * PAGE_SIZE + 1
  const end = Math.min(start + PAGE_SIZE - 1, total)
  const origin = buildCurrentAppPath(location)
  const inputId = `source-${section.id}-jump`
  const rangeId = `${inputId}-range`
  const errorId = `${inputId}-error`
  const numberId = (value: number) => `source-${section.id}-${value}`
  const pathFor = (value: number) => `/study?source=${source}&ang=${value}`
  const setPage = (nextPage: number) => setSearchParams(current => {
    const next = new URLSearchParams(current)
    next.set(pageKey, String(nextPage))
    return next
  }, { replace: true, preventScrollReset: true })

  const openExact = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = parseSourceUnit(jumpValue, total)
    if (value === null) { setInvalid(true); return }
    setInvalid(false)
    const next = new URLSearchParams(searchParams)
    next.set(pageKey, String(Math.floor((value - 1) / PAGE_SIZE) + 1))
    const returnPath = `${location.pathname}?${next.toString()}${location.hash}`
    // Replace the browse entry before pushing the reader, so browser Back and
    // the reader's Back both return to the numbers containing this destination.
    setSearchParams(next, { replace: true, preventScrollReset: true })
    rememberDiscoveryReturn(returnPath, numberId(value))
    navigate(pathFor(value), { state: buildReaderOriginNavigationState(pathFor(value), returnPath) })
  }

  return (
    <div className="source-browse">
      <form onSubmit={openExact} className="source-browse-jump" aria-label={`${name} — ${copy.jump(unit)}`} noValidate>
        <label htmlFor={inputId}>{copy.jump(unit)}</label>
        <div className="source-browse-jump__controls">
          <input id={inputId} type="text" inputMode="numeric" autoComplete="off" enterKeyHint="go"
            value={jumpValue} onChange={event => { setJumpValue(event.target.value); setInvalid(false) }}
            aria-label={copy.input(name, unit)} aria-invalid={invalid || undefined}
            aria-describedby={invalid ? `${rangeId} ${errorId}` : rangeId} placeholder={`1–${total}`} />
          <button type="submit" className="interactive-focus">{copy.open}<IconArrowRight size={16} /></button>
        </div>
        <span id={rangeId} className="source-browse-range">{copy.range(unit, total)}</span>
        {invalid ? <p id={errorId} role="alert" className="source-browse-error">{copy.invalid(unit, total)}</p> : null}
      </form>
      <div className="source-browse-grid">
        {Array.from({ length: end - start + 1 }, (_, index) => start + index).map(value => (
          <Link key={value} id={numberId(value)} to={pathFor(value)}
            state={buildReaderOriginNavigationState(pathFor(value), origin)}
            onClick={event => { if (isPlainClick(event)) rememberDiscoveryReturn(origin, numberId(value)) }}
            aria-label={copy.destination(name, unit, value)} className="section-shell interactive-focus interactive-card-link">
            {value}
          </Link>
        ))}
      </div>
      <div className="source-browse-pagination">
        <button type="button" onClick={() => setPage(page - 1)} disabled={page === 1}
          aria-label={copy.previousPage(name)} className="interactive-focus"><IconArrowLeft size={14} />{copy.previous}</button>
        <span role="status" aria-live="polite">{copy.page(unit, start, end, total)}</span>
        <button type="button" onClick={() => setPage(page + 1)} disabled={end >= total}
          aria-label={copy.nextPage(name)} className="interactive-focus">{copy.next}<IconArrowRight size={14} /></button>
      </div>
    </div>
  )
}

export default function ScriptureSourceBrowser({ dataTestId, defaultOpenSections = [], sectionIds,
  sectionClassName = 'section-shell px-4 py-4' }: ScriptureSourceBrowserProps) {
  const locale = useLocaleStore(state => state.locale)
  const copy = COPY[locale]
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const sections = useMemo(() => sectionIds ? SECTIONS.filter(section => sectionIds.includes(section.id)) : SECTIONS, [sectionIds])
  const openSections = searchParams.has('sourceOpen')
    ? searchParams.get('sourceOpen')!.split(',').filter(id => SECTIONS.some(section => section.id === id))
    : defaultOpenSections
  const toggle = (id: string) => setSearchParams(current => {
    const next = new URLSearchParams(current)
    next.set('sourceOpen', (openSections.includes(id) ? openSections.filter(key => key !== id) : [...openSections, id]).join(','))
    return next
  }, { replace: true, preventScrollReset: true })
  const origin = buildCurrentAppPath(location)

  return (
    <div className="space-y-3" data-component="scripture-source-browser" data-testid={dataTestId} lang={locale}>
      {sections.map(section => {
        const isOpen = openSections.includes(section.id)
        const panelId = `${dataTestId ?? 'scripture-source'}-${section.id}`
        if (section.overviewPath) return (
          <article key={section.id} className={`${sectionClassName} source-book-overview`} data-testid="panth-prakash-source-card">
            <IconLibrary size={24} aria-hidden="true" />
            <p className="source-browse-range">{copy.edition}</p><h3>{copy.book}</h3><p>{copy.bookDescription}</p><p>{copy.bookDetail}</p>
            <Link to={section.overviewPath} state={buildLibraryReaderNavigationState(origin)}
              id="source-panth-prakash-open" aria-label={copy.openBookLabel} className="interactive-focus"
              onClick={event => { if (isPlainClick(event)) rememberDiscoveryReturn(origin, 'source-panth-prakash-open') }}>
              {copy.openBook}<IconArrowRight size={16} />
            </Link>
          </article>
        )
        if (!section.source) return null
        return (
          <div key={section.id} className={sectionClassName}>
            <button id={`source-${section.id}-toggle`} type="button" onClick={() => toggle(section.id)}
              className="interactive-focus source-browse-heading" aria-expanded={isOpen} aria-controls={panelId}>
              <span>{copy.names[section.source]}</span>
              <span className="icon-surface h-8 w-8" aria-hidden="true">{isOpen ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}</span>
            </button>
            {isOpen ? <div id={panelId} className="mt-4"><AngPageBrowser section={{ ...section, source: section.source }} locale={locale} /></div> : null}
          </div>
        )
      })}
    </div>
  )
}
