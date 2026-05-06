import { useId } from "react"
import { Link } from "react-router-dom"
import SearchHighlight from "../../../components/SearchHighlight"
import type { TopicGuide } from "../../../types"

export default function TopicDoorCard({
  topic,
  active,
  query = "",
  viewed = false,
  to,
}: {
  topic: TopicGuide
  active: boolean
  query?: string
  viewed?: boolean
  to: string
}) {
  const titleId = useId()
  const bodyId = useId()

  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      className={`learn-card learn-card--door block rounded-[24px] border px-4 py-4 text-left transition-all duration-300 ${
        active
          ? "border-saffron/30 bg-white shadow-soft dark:border-gold/25 dark:bg-dark-card"
          : "border-sand/12 bg-parchment-low/85 dark:border-dark-text/10 dark:!bg-dark-surface"
      } touch-manipulation`}
    >
      <div className="flex items-center justify-between gap-3">
        <p id={titleId} className="eyebrow"><SearchHighlight text={topic.shortTitle} query={query} /></p>
        {viewed ? <span className="chip-pill">Viewed</span> : null}
      </div>
      <p id={bodyId} className="mt-2 font-sans text-sm leading-6 text-ink dark:text-dark-text">
        <SearchHighlight text={topic.issueStatement} query={query} />
      </p>
    </Link>
  )
}
