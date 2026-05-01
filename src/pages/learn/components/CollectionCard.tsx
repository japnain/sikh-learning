import { useId } from "react"
import { Link } from "react-router-dom"
import type { Collection } from "../../../types"

export default function CollectionCard({
  collection,
  active,
  progressText,
  to,
}: {
  collection: Collection
  active: boolean
  progressText?: string
  to: string
}) {
  const metaId = useId()
  const titleId = useId()
  const progressId = useId()
  const subtitleId = useId()
  const bodyId = useId()

  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      aria-labelledby={`${metaId} ${titleId}`}
      aria-describedby={progressText ? `${progressId} ${subtitleId} ${bodyId}` : `${subtitleId} ${bodyId}`}
      className={`block w-full max-w-full rounded-[30px] border px-4 py-4 text-left transition-all duration-300 ${
        active
          ? "border-saffron/30 bg-white shadow-soft dark:border-gold/25 dark:bg-dark-card"
          : "border-sand/12 bg-parchment-low/85 dark:border-dark-text/10 dark:!bg-dark-surface"
      } touch-manipulation`}
    >
      <div className="flex items-center justify-between gap-3">
        <p id={metaId} className="eyebrow">{collection.durationLabel}</p>
        {progressText ? <span id={progressId} className="chip-pill">{progressText}</span> : null}
      </div>
      <p id={titleId} className="mt-2 font-sans text-base font-semibold text-ink dark:text-dark-text">{collection.title}</p>
      <p id={subtitleId} className="mt-1 font-sans text-sm text-ink/66 dark:text-dark-text/72">{collection.subtitle}</p>
      <p id={bodyId} className="mt-3 font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/74">{collection.description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {collection.themes.map(theme => (
          <span key={theme} className="chip-pill">{theme}</span>
        ))}
      </div>
    </Link>
  )
}
