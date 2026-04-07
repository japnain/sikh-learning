import type { ThemePath } from '../types'

interface Props {
  path: ThemePath
  completedCount: number
  isStarted: boolean
  isComplete: boolean
  onStart: () => void
  onOpen: () => void
}

export default function ThemePathCard({
  path,
  completedCount,
  isStarted,
  isComplete,
  onStart,
  onOpen,
}: Props) {
  const totalCount = path.moduleIds.length
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className={`section-shell px-4 py-4 ${isComplete ? 'border-saffron/30' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{path.themeTag.replace(/-/g, ' ')}</p>
          <p className="mt-2 font-sans text-base font-semibold text-ink dark:text-dark-text">
            {path.title}
          </p>
          <p className="mt-1 font-sans text-xs text-ink/50 dark:text-dark-text/50">
            {path.subtitle}
          </p>
          <p className="mt-2 font-sans text-sm text-ink/60 dark:text-dark-text/60">
            {path.description}
          </p>
        </div>
        <div className="text-right">
          <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text">{pct}%</p>
          <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-ink/45 dark:text-dark-text/45">
            Progress
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="chip-pill">{path.wordFamilyIds.length} families</span>
        <span className="chip-pill">{totalCount} modules</span>
        {isComplete ? <span className="chip-pill">Complete</span> : null}
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-sand/20 dark:bg-dark-text/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-saffron to-saffron-light"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="flex-1 rounded-2xl bg-gradient-to-r from-saffron to-saffron-light px-4 py-3 font-sans text-sm font-semibold text-white"
        >
          {isStarted ? 'Open path' : 'Preview path'}
        </button>
        <button
          type="button"
          onClick={onStart}
          className="rounded-2xl section-shell-quiet px-4 py-3 font-sans text-sm text-ink dark:text-dark-text"
        >
          {isStarted ? 'Started' : 'Start'}
        </button>
      </div>
    </div>
  )
}
