import { Link } from "react-router-dom"
import { IconArrowRight } from "../../../components/icons"
import type { ShabadDeepDive } from "../../../types"
import CitationLine from "./CitationLine"
import SaveButton from "./SaveButton"

export default function ShabadCard({
  shabad,
  active,
  completed,
  saved,
  to,
  onToggleSave,
}: {
  shabad: ShabadDeepDive
  active: boolean
  completed: boolean
  saved: boolean
  to: string
  onToggleSave: () => void
}) {
  return (
    <div className={`rounded-[30px] border px-4 py-4 transition-all duration-300 ${active ? "border-saffron/30 bg-white shadow-soft dark:border-gold/25 dark:bg-dark-card" : "border-sand/12 bg-parchment-low/85 dark:border-dark-text/10 dark:!bg-dark-surface"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <CitationLine shabad={shabad} />
          <p className="mt-2 font-sans text-base font-semibold text-ink dark:text-dark-text">{shabad.title}</p>
          <p className="mt-2 font-sans text-sm leading-6 text-ink/62 dark:text-dark-text/62">{shabad.summary}</p>
        </div>
        <SaveButton saved={saved} onClick={onToggleSave} label={shabad.title} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="chip-pill">{shabad.difficulty}</span>
        <span className="chip-pill">{shabad.lengthBand}</span>
        {completed ? <span className="chip-pill">Viewed</span> : null}
        {shabad.themes.slice(0, 2).map(theme => (
          <span key={theme} className="chip-pill">{theme}</span>
        ))}
      </div>

      <Link
        to={to}
        aria-label={`Study this shabad: ${shabad.title}`}
        className="mt-4 inline-flex min-h-[42px] items-center gap-2 font-sans text-sm font-semibold text-saffron dark:text-gold-light touch-manipulation"
      >
        Study this shabad <IconArrowRight size={16} />
      </Link>
    </div>
  )
}
