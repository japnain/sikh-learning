import { useId, useState } from 'react'
import type { ResolvedBaniProfileSection } from '../content/baniSections/profileTypes'
import type { ScriptMode, UiLocale } from '../types'
import { getScriptTextFontClass, getScriptTextLang, renderScriptText } from '../utils/readerDisplay'
import { getSourceReaderUnitLabel } from '../utils/sourceReaderMeta'

type Section = ResolvedBaniProfileSection

const COPY = {
  en: { show: 'Show', hide: 'Hide', page: 'Page', shabad: 'shabads', stanza: 'stanzas', pauri: 'pauris', salok: 'saloks', section: 'sections' },
  pa: { show: 'ਖੋਲ੍ਹੋ', hide: 'ਬੰਦ ਕਰੋ', page: 'ਪੰਨਾ', shabad: 'ਸ਼ਬਦ', stanza: 'ਪਦ', pauri: 'ਪਉੜੀਆਂ', salok: 'ਸਲੋਕ', section: 'ਭਾਗ' },
  hi: { show: 'खोलें', hide: 'बंद करें', page: 'पृष्ठ', shabad: 'शबद', stanza: 'पद', pauri: 'पउड़ियाँ', salok: 'सलोक', section: 'भाग' },
} as const

function childSummary(children: readonly Section[], locale: UiLocale) {
  const kind = children[0]?.kind
  const sharedKind = children.every(child => child.kind === kind) ? kind : 'section'
  const key = sharedKind === 'shabad' || sharedKind === 'stanza' || sharedKind === 'pauri' || sharedKind === 'salok' ? sharedKind : 'section'
  const noun = children.length === 1
    ? locale === 'en' ? key : key === 'pauri' ? locale === 'pa' ? 'ਪਉੜੀ' : 'पउड़ी' : COPY[locale][key]
    : COPY[locale][key]
  return `${children.length} ${noun}`
}

function SectionLink({ section, labelId, current, locale, scriptMode, onJump }: {
  section: Section
  labelId?: string
  current: boolean
  locale: UiLocale
  scriptMode: ScriptMode
  onJump: (entryIndex: number, lineIndex: number) => void
}) {
  return <button type="button" data-reader-section-link={section.id} data-section-verse-id={section.verseId}
    aria-current={current ? 'location' : undefined} onClick={() => onJump(section.entryIndex, section.lineIndex)}>
    <span className="study-reader-section-label">
      <span id={labelId} lang={/[\u0A00-\u0A7F]/u.test(section.label) ? 'pa-Guru' : undefined}>{section.label}</span>
      {section.ang != null ? <small>{section.source ? getSourceReaderUnitLabel(section.source, locale) : COPY[locale].page} {section.ang}</small> : null}
    </span>
    <span className={getScriptTextFontClass(scriptMode)} lang={getScriptTextLang(scriptMode)}>{renderScriptText(section.excerpt, scriptMode)}</span>
  </button>
}

/** Mounted only in Contents. Expanding groups never reads or moves the scripture scroller. */
export default function BaniContentsSections({ sections, currentPath, locale, scriptMode, onJump }: {
  sections: readonly Section[]
  currentPath: readonly Section[]
  locale: UiLocale
  scriptMode: ScriptMode
  onJump: (entryIndex: number, lineIndex: number) => void
}) {
  const id = useId()
  // A freshly opened Contents reveals the current child; other groups stay compact.
  const [expanded, setExpanded] = useState(() => new Set(currentPath.slice(0, -1).map(section => section.id)))
  const currentParent = currentPath[0]
  const current = currentPath.length > 1 && currentParent && !expanded.has(currentParent.id)
    ? currentParent : currentPath.at(-1)

  return <ol className="study-reader-section-list study-reader-section-list--compositions" data-testid="bani-composition-sections">
    {sections.map((section, index) => {
      const children = section.children ?? []
      const open = expanded.has(section.id)
      const labelId = `${id}-label-${index}`
      const panelId = `${id}-children-${index}`
      const toggleId = `${id}-toggle-${index}`
      const actionId = `${id}-action-${index}`
      return <li key={section.id} data-reader-section-group={section.id}
        className={children.length ? 'bani-contents-group' : undefined}
        data-current-ancestor={currentPath.length > 1 && currentParent?.id === section.id ? 'true' : undefined}>
        <div className={children.length ? 'bani-contents-parent-row' : undefined}>
          <SectionLink section={section} labelId={labelId} current={current?.id === section.id} locale={locale} scriptMode={scriptMode} onJump={onJump} />
          {children.length ? <button type="button" className="bani-contents-toggle" data-reader-section-toggle={section.id}
            aria-expanded={open} aria-controls={panelId} aria-labelledby={`${actionId} ${toggleId} ${labelId}`}
            onClick={() => setExpanded(previous => {
              const next = new Set(previous)
              if (next.has(section.id)) next.delete(section.id)
              else next.add(section.id)
              return next
            })}>
            <span id={actionId} className="sr-only">{open ? COPY[locale].hide : COPY[locale].show}</span>
            <span id={toggleId}>{childSummary(children, locale)}</span>
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none"><path d={open ? 'm4 10 4-4 4 4' : 'm4 6 4 4 4-4'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button> : null}
        </div>
        {children.length ? <ol id={panelId} className="bani-contents-children" hidden={!open} aria-labelledby={labelId}>
          {open ? children.map(child => <li key={child.id}>
            <SectionLink section={child} current={current?.id === child.id} locale={locale} scriptMode={scriptMode} onJump={onJump} />
          </li>) : null}
        </ol> : null}
      </li>
    })}
  </ol>
}
