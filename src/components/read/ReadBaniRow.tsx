import { useRef } from 'react'
import type { BaniDiscoveryEntry } from '../../content/baniDiscoveryTypes'
import { useLocaleStore } from '../../store/locale'
import { focusElementWithoutAppScroll } from '../../utils/appScroll'
import { IconArrowRight, IconChevronDown, IconExternalLink } from '../icons'
import '../../styles/read-bani-row.css'

const LABELS = {
  en: { about: 'About this bani', references: 'References', close: 'Close details' },
  pa: { about: 'ਇਸ ਬਾਣੀ ਬਾਰੇ', references: 'ਹਵਾਲੇ', close: 'ਵੇਰਵੇ ਬੰਦ ਕਰੋ' },
  hi: { about: 'इस बाणी के बारे में', references: 'संदर्भ', close: 'विवरण बंद करें' },
}

export interface ReadBaniRowProps {
  identity: string
  entry: BaniDiscoveryEntry
  onOpen: () => void
  scriptTitle?: string
  scriptLang?: string
  scriptClassName?: string
  focusId?: string
}

/** Discovery context stays outside the scripture and the launch action. */
export default function ReadBaniRow({ identity, entry, onOpen, scriptTitle, scriptLang, scriptClassName = '', focusId }: ReadBaniRowProps) {
  const locale = useLocaleStore(state => state.locale)
  const labels = LABELS[locale]
  const detailsRef = useRef<HTMLDetailsElement | null>(null)
  const summaryRef = useRef<HTMLElement | null>(null)
  const launchId = focusId ?? `read-bani-${encodeURIComponent(identity)}`
  const nameId = `${launchId}-name`
  const scriptId = `${launchId}-script`
  const summaryId = `${launchId}-summary`
  const secondaryTitle = scriptTitle?.trim()
  const hasScriptTitle = Boolean(secondaryTitle && secondaryTitle.toLocaleLowerCase('en') !== entry.name.trim().toLocaleLowerCase('en'))
  const hasDetails = Boolean(entry.detail?.trim() || entry.references.length)

  const closeDetails = () => {
    if (detailsRef.current) detailsRef.current.open = false
    if (summaryRef.current) focusElementWithoutAppScroll(summaryRef.current)
  }

  return <div className="read-bani-row" data-bani-identity={identity}>
    <button type="button" id={launchId} className="read-bani-row__open" data-read-launch="true"
      aria-labelledby={`${nameId}${hasScriptTitle ? ` ${scriptId}` : ''}`} aria-describedby={summaryId} onClick={onOpen}>
      <span className="read-bani-row__titles">
        <span id={nameId} lang="en" className="read-bani-row__name">{entry.name}</span>
        {hasScriptTitle ? <span id={scriptId} lang={scriptLang} className={`read-bani-row__script ${scriptClassName}`}>{secondaryTitle}</span> : null}
      </span>
      <IconArrowRight size={18} className="read-bani-row__arrow" />
    </button>
    <p id={summaryId} lang="en" className="read-bani-row__summary">{entry.summary}</p>
    {hasDetails ? <details ref={detailsRef} className="read-bani-row__details" lang={locale === 'pa' ? 'pa-Guru' : locale}>
      <summary ref={summaryRef}>
        <span>{labels.about}</span><IconChevronDown size={16} />
      </summary>
      <div className="read-bani-row__context">
        {entry.detail ? <p lang="en">{entry.detail}</p> : null}
        {entry.references.length ? <div className="read-bani-row__references">
          <p className="read-bani-row__references-label">{labels.references}</p>
          <ul>
            {entry.references.map(reference => <li key={`${reference.label}:${reference.url}`}>
              <a href={reference.url} lang="en" target="_blank" rel="noopener noreferrer">
                <span>{reference.label}</span><IconExternalLink size={14} />
              </a>
            </li>)}
          </ul>
        </div> : null}
        <button type="button" className="read-bani-row__close" onClick={closeDetails}>{labels.close}</button>
      </div>
    </details> : null}
  </div>
}
