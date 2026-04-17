import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DG_ANG_COUNT, SGGS_ANG_COUNT } from '../utils/dailyPick'
import {
  IconArrowLeft,
  IconArrowRight,
  IconChevronDown,
  IconChevronUp,
} from './icons'

type ScriptureSourceSection = {
  id: string
  name: string
  source: string
  totalAngs: number
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
]

const PAGE_SIZE = 50

function angLabel(source: string) {
  return source === 'G' || source === 'D' ? 'Ang' : 'Page'
}

function AngPageBrowser({ source, totalAngs }: { source: string; totalAngs: number }) {
  const [page, setPage] = useState(0)
  const start = page * PAGE_SIZE + 1
  const end = Math.min(start + PAGE_SIZE - 1, totalAngs)

  return (
    <div>
      <div className="mb-4 grid grid-cols-5 gap-2">
        {Array.from({ length: end - start + 1 }, (_, index) => start + index).map(ang => (
          <Link
            key={ang}
            to={`/study?source=${source}&ang=${ang}`}
            className="section-shell interactive-focus interactive-card-link flex min-h-[44px] items-center justify-center rounded-2xl py-2 text-center font-sans text-sm text-ink hover:text-gold dark:text-dark-text dark:hover:text-gold-light"
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
          className="flex min-h-[44px] items-center gap-1 px-3 font-sans text-sm text-gold disabled:opacity-30 dark:text-gold-light"
        >
          <IconArrowLeft size={14} />
          Prev
        </button>
        <span className="font-sans text-xs text-ink/50 dark:text-dark-text/50">
          {angLabel(source)} {start}–{end} of {totalAngs}
        </span>
        <button
          type="button"
          onClick={() => setPage(current => current + 1)}
          disabled={end >= totalAngs}
          className="flex min-h-[44px] items-center gap-1 px-3 font-sans text-sm text-gold disabled:opacity-30 dark:text-gold-light"
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
              <span className="icon-surface h-8 w-8 text-gold dark:text-gold-light">
                {isOpen ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
              </span>
            </button>
            {isOpen ? (
              <div id={panelId} className="mt-4">
                <AngPageBrowser source={section.source} totalAngs={section.totalAngs} />
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
