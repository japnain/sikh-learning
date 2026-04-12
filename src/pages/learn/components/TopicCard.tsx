import { useId } from "react"
import { Link } from "react-router-dom"
import type { TopicGuide } from "../../../types"

function getTopicCategoryLabel(topic: TopicGuide) {
  if (topic.category === "most-needed") return "Most Needed"
  if (topic.category === "practice") return "Practice"
  return "Inner Work"
}

export default function TopicCard({
  topic,
  active,
  viewed = false,
  to,
}: {
  topic: TopicGuide
  active: boolean
  viewed?: boolean
  to: string
}) {
  const categoryId = useId()
  const titleId = useId()
  const bodyId = useId()

  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      aria-labelledby={`${categoryId} ${titleId}`}
      aria-describedby={bodyId}
      className={`block min-h-[96px] rounded-[28px] border px-4 py-4 text-left transition-all duration-300 ${
        active
          ? "border-saffron/30 bg-white shadow-soft dark:border-gold/25 dark:bg-dark-card"
          : "border-sand/12 bg-parchment-low/85 dark:border-dark-text/10 dark:!bg-dark-surface"
      } touch-manipulation`}
    >
      <div className="flex items-center justify-between gap-3">
        <p id={categoryId} className="eyebrow">{getTopicCategoryLabel(topic)}</p>
        {viewed ? <span className="chip-pill">Viewed</span> : null}
      </div>
      <p id={titleId} className="mt-2 font-sans text-base font-semibold text-ink dark:text-dark-text">{topic.title}</p>
      <p id={bodyId} className="mt-2 font-sans text-sm leading-6 text-ink/60 dark:text-dark-text/60">{topic.centralInsight}</p>
    </Link>
  )
}
