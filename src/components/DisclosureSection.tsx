import type { ReactNode } from "react"
import { IconChevronDown, IconChevronUp } from "./icons"
import { usePersistentDisclosure } from "../hooks/usePersistentDisclosure"

export default function DisclosureSection({
  storageKey,
  eyebrow,
  title,
  summary,
  children,
  defaultOpen = false,
  className = "section-shell-quiet mt-5 p-4",
  bodyClassName = "mt-4",
  badge,
  titleClassName = "font-sans text-base font-semibold text-ink dark:text-dark-text",
  sectionId,
  testId,
}: {
  storageKey: string
  eyebrow?: string
  title: string
  summary?: string
  children: ReactNode
  defaultOpen?: boolean
  className?: string
  bodyClassName?: string
  badge?: string
  titleClassName?: string
  sectionId?: string
  testId?: string
}) {
  const [open, setOpen] = usePersistentDisclosure(storageKey, defaultOpen)
  const headingId = sectionId ? `${sectionId}-title` : undefined
  const panelId = sectionId ? `${sectionId}-panel` : undefined

  return (
    <section className={className} aria-labelledby={headingId} data-testid={testId} data-state={open ? "open" : "closed"}>
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-start justify-between gap-4 text-left"
      >
        <div className="min-w-0 flex-1">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <div className={`${eyebrow ? "mt-2" : ""} flex flex-wrap items-center gap-2`}>
            <p id={headingId} className={titleClassName}>{title}</p>
            {badge ? <span className="chip-pill">{badge}</span> : null}
          </div>
          {summary ? (
            <p className="mt-2 font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/68">{summary}</p>
          ) : null}
        </div>
        <span
          className={`icon-surface mt-1 h-10 w-10 shrink-0 ${
            open ? "text-ink/60 dark:text-dark-text/64" : "text-gold dark:text-gold-light"
          }`}
          aria-hidden="true"
        >
          {open ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
        </span>
      </button>

      {open ? <div id={panelId} className={bodyClassName}>{children}</div> : null}
    </section>
  )
}
