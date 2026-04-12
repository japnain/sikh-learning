import { useId } from "react"
import { Link } from "react-router-dom"

export default function SpotlightButton({
  eyebrow,
  title,
  body,
  active,
  viewed = false,
  to,
}: {
  eyebrow: string
  title: string
  body: string
  active: boolean
  viewed?: boolean
  to: string
}) {
  const titleId = useId()
  const bodyId = useId()
  const metaId = useId()

  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      aria-labelledby={`${metaId} ${titleId}`}
      aria-describedby={bodyId}
      className={`block rounded-[28px] border px-4 py-4 text-left transition-all duration-300 ${
        active
          ? "border-saffron/30 bg-white shadow-soft dark:border-gold/25 dark:bg-dark-card"
          : "border-sand/12 bg-parchment-low/85 dark:border-dark-text/10 dark:!bg-dark-surface"
      } touch-manipulation`}
    >
      <div className="flex items-center justify-between gap-3">
        <p id={metaId} className="eyebrow">{eyebrow}</p>
        {viewed ? <span className="chip-pill">Viewed</span> : null}
      </div>
      <p id={titleId} className="mt-2 font-sans text-base font-semibold text-ink dark:text-dark-text">{title}</p>
      <p id={bodyId} className="mt-2 font-sans text-sm leading-6 text-ink/62 dark:text-dark-text/62">{body}</p>
    </Link>
  )
}
