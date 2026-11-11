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
  headingLevel,
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
  headingLevel?: 2 | 3
}) {
  const [open, setOpen] = usePersistentDisclosure(storageKey, defaultOpen)
  const headingId = sectionId ? `${sectionId}-title` : undefined
  const panelId = sectionId ? `${sectionId}-panel` : undefined
  const Heading = headingLevel === 2 ? 'h2' : headingLevel === 3 ? 'h3' : 'div'

  return (
    <section id={sectionId} className={className} aria-labelledby={headingId} data-testid={testId} data-state={open ? "open" : "closed"}>
      <Heading>
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        aria-expanded={open}
        aria-controls={panelId}
        className="interactive-focus flex min-h-[44px] w-full items-start justify-between gap-4 text-left"
      >
        <span className="min-w-0 flex-1">
          {eyebrow ? <span className="eyebrow block">{eyebrow}</span> : null}
          <span className={`${eyebrow ? "mt-2" : ""} flex flex-wrap items-center gap-2`}>
            <span id={headingId} className={titleClassName}>{title}</span>
            {badge ? <span className="chip-pill">{badge}</span> : null}
          </span>
          {summary ? (
            <span className="block mt-2 font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/68">{summary}</span>
          ) : null}
        </span>
        <span
          className={`icon-surface mt-1 h-10 w-10 shrink-0 ${
            open ? "text-ink/68 dark:text-dark-text/64" : "text-gold-dark dark:text-gold-light"
          }`}
          aria-hidden="true"
        >
          {open ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
        </span>
      </button>
      </Heading>

      {open ? <div id={panelId} className={bodyClassName}>{children}</div> : null}
    </section>
  )
}
