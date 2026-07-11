import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DG_ANG_COUNT, SGGS_ANG_COUNT } from '../utils/dailyPick'
import {
  IconArrowLeft,
  IconArrowRight,
  IconChevronDown,
  IconChevronUp,
  IconLibrary,
  IconSearch,
} from './icons'

type ScriptureSourceSection = {
  id: string
  name: string
  source?: string
  totalAngs?: number
  pagePathTemplate?: string
  overviewPath?: string
  overviewEyebrow?: string
  overviewDescription?: string
  overviewStats?: string[]
  quickBrowseLabel?: string
}

type ScriptureSourceBrowserProps = {
  dataTestId?: string
  defaultOpenSections?: string[]
  sectionClassName?: string
}

const SCRIPTURE_SOURCE_SECTIONS: ScriptureSourceSection[] = [
  { id: 'sggs', name: 'Sri Guru Granth Sahib Ji', source: 'G', totalAngs: SGGS_ANG_COUNT },
  { id: 'dasam-granth', name: 'Dasam Granth', source: 'D', totalAngs: DG_ANG_COUNT },
  { id: 'bhai-gurdas-vaaran', name: 'Bhai Gurdas Ji Vaaran', source: 'B', totalAngs: 628 },
  {
    id: 'panth-prakash-english',
    name: 'Panth Prakash (English)',
    overviewPath: '/library/panth-prakash-english',
    overviewEyebrow: 'EPUB book reader',
    overviewDescription:
      'Open the EPUB-derived book reader for volume navigation, chapter reading, and full-text search across both supplied volumes.',
    overviewStats: ['171 chapters', '169 episodes', '2 EPUB volumes'],
  },
]

const PAGE_SIZE = 50

function angLabel(section: ScriptureSourceSection) {
  return section.pagePathTemplate ? 'Page' : section.source === 'G' || section.source === 'D' ? 'Ang' : 'Page'
}

function buildPagePath(section: ScriptureSourceSection, ang: number) {
  if (section.pagePathTemplate) {
    return section.pagePathTemplate.includes(':pageNumber')
      ? section.pagePathTemplate.replace(':pageNumber', String(ang))
      : section.pagePathTemplate
  }

  return `/study?source=${section.source}&ang=${ang}`
}

function buildPageLinkLabel(section: ScriptureSourceSection, ang: number) {
  const label = angLabel(section).toLowerCase()
  return `Open ${section.name.replace(' (English)', '')} ${label} ${ang}`
}

function SourceOverviewCard({
  section,
  isOpen,
  onToggleQuickPages,
  panelId,
}: {
  section: ScriptureSourceSection
  isOpen: boolean
  onToggleQuickPages: () => void
  panelId: string
}) {
  return (
    <div
      className="relative overflow-hidden rounded-lg border border-gold/25 bg-parchment-card p-4 shadow-soft dark:border-gold-light/25 dark:bg-dark-surface"
    >
      <div className="relative space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="font-sans text-[0.68rem] font-bold uppercase tracking-[0.24em] text-gold-dark dark:text-gold-light">
              {section.overviewEyebrow ?? 'Source edition'}
            </p>
            <div>
              <h3 className="font-serif text-2xl font-semibold leading-tight text-ink dark:text-dark-text">{section.name}</h3>
              {section.overviewDescription ? (
                <p className="mt-2 max-w-2xl font-sans text-sm leading-6 text-ink/70 dark:text-dark-text/70">
                  {section.overviewDescription}
                </p>
              ) : null}
            </div>
          </div>
          <span className="icon-surface shrink-0 text-gold-dark dark:text-gold-light" aria-hidden="true">
            <IconLibrary size={20} />
          </span>
        </div>

        {section.overviewStats?.length ? (
          <div className="flex flex-wrap gap-2" aria-label={`${section.name} edition details`}>
            {section.overviewStats.map(stat => (
              <span
                key={stat}
                className="rounded-full border border-gold/20 bg-white/70 px-3 py-1 font-sans text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink/65 dark:border-gold-light/20 dark:bg-white/5 dark:text-dark-text/65"
              >
                {stat}
              </span>
            ))}
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          {section.overviewPath ? (
            <Link
              to={section.overviewPath}
              aria-label="Open Panth Prakash book reader"
              className="interactive-focus inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 py-3 font-sans text-sm font-semibold text-cream shadow-lg shadow-ink/10 transition hover:-translate-y-0.5 hover:bg-gold hover:text-ink dark:bg-gold-light dark:text-dark-bg dark:hover:bg-cream"
            >
              Open Panth Prakash
              <IconArrowRight size={16} />
            </Link>
          ) : null}

          {section.pagePathTemplate ? (
            <button
              type="button"
              onClick={onToggleQuickPages}
              className="interactive-focus inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg border border-gold/25 bg-white/70 px-4 py-3 font-sans text-sm font-semibold text-ink transition hover:border-gold/50 hover:text-gold-dark dark:border-gold-light/25 dark:bg-white/5 dark:text-dark-text dark:hover:text-gold-light"
              aria-label={isOpen ? 'Hide quick page numbers' : 'Show quick page numbers'}
              aria-expanded={isOpen}
              aria-controls={panelId}
            >
              <IconSearch size={15} />
              {isOpen ? 'Hide quick pages' : 'Quick page numbers'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function AngPageBrowser({ section }: { section: ScriptureSourceSection }) {
  const [page, setPage] = useState(0)
  if (!section.totalAngs) return null
  const start = page * PAGE_SIZE + 1
  const end = Math.min(start + PAGE_SIZE - 1, section.totalAngs)

  return (
    <div>
      <div className="mb-4 grid grid-cols-5 gap-2">
        {Array.from({ length: end - start + 1 }, (_, index) => start + index).map(ang => (
          <Link
            key={ang}
            to={buildPagePath(section, ang)}
            aria-label={buildPageLinkLabel(section, ang)}
            className="section-shell interactive-focus interactive-card-link flex min-h-[44px] items-center justify-center rounded-lg py-2 text-center font-sans text-sm text-ink hover:text-gold-dark dark:text-dark-text dark:hover:text-gold-light"
          >
            {ang}
          </Link>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setPage(current => Math.max(0, current - 1))}
          disabled={page === 0}
          className="flex min-h-[44px] items-center gap-1 px-3 font-sans text-sm text-gold-dark disabled:opacity-30 dark:text-gold-light"
        >
          <IconArrowLeft size={14} />
          Prev
        </button>
        <span className="font-sans text-xs text-ink/68 dark:text-dark-text/64">
          {angLabel(section)} {start}–{end} of {section.totalAngs}
        </span>
        <button
          type="button"
          onClick={() => setPage(current => current + 1)}
          disabled={end >= section.totalAngs}
          className="flex min-h-[44px] items-center gap-1 px-3 font-sans text-sm text-gold-dark disabled:opacity-30 dark:text-gold-light"
        >
          Next
          <IconArrowRight size={14} />
        </button>
      </div>
    </div>
  )
}

export default function ScriptureSourceBrowser({
  dataTestId,
  defaultOpenSections = [],
  sectionClassName = 'section-shell px-4 py-4',
}: ScriptureSourceBrowserProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(defaultOpenSections.map(sectionId => [sectionId, true]))
  )

  const sections = useMemo(() => SCRIPTURE_SOURCE_SECTIONS, [])

  return (
    <div className="space-y-3" data-component="scripture-source-browser" data-testid={dataTestId}>
      {sections.map(section => {
        const isOpen = Boolean(expanded[section.id])
        const panelId = `${dataTestId ?? 'scripture-source'}-${section.id}`

        if (section.overviewPath) {
          return (
            <div
              key={section.id}
              className={sectionClassName}
              data-testid={`${section.id.replace('-english', '')}-source-card`}
            >
              <SourceOverviewCard
                section={section}
                isOpen={isOpen}
                onToggleQuickPages={() => setExpanded(current => ({ ...current, [section.id]: !current[section.id] }))}
                panelId={panelId}
              />
              {isOpen ? (
                <div id={panelId} className="mt-4">
                  <AngPageBrowser section={section} />
                </div>
              ) : null}
            </div>
          )
        }

        return (
          <div key={section.id} className={sectionClassName}>
            <button
              type="button"
              onClick={() => setExpanded(current => ({ ...current, [section.id]: !current[section.id] }))}
              className="interactive-focus flex min-h-[44px] w-full items-center justify-between gap-3"
              aria-expanded={isOpen}
              aria-controls={panelId}
            >
              <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text">{section.name}</p>
              <span className="icon-surface h-8 w-8 text-gold-dark dark:text-gold-light">
                {isOpen ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
              </span>
            </button>
            {isOpen ? (
              <div id={panelId} className="mt-4">
                <AngPageBrowser section={section} />
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
