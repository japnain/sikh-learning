import type { AsyncStatus } from '../types'

type SurfaceState = Extract<AsyncStatus, 'loading' | 'empty' | 'degraded'>

interface SurfaceStateAction {
  label: string
  onClick: () => void
  aiAction: string
  emphasis?: 'primary' | 'secondary'
}

interface SurfaceStateCardProps {
  surface: string
  state: SurfaceState
  eyebrow: string
  title: string
  body: string
  actions?: SurfaceStateAction[]
  testId?: string
  page?: string
  errorCode?: string | null
  pageShell?: boolean
  headingLevel?: 1 | 2
  lang?: string
}

export default function SurfaceStateCard({
  surface,
  state,
  eyebrow,
  title,
  body,
  actions = [],
  testId,
  page,
  errorCode = null,
  pageShell = true,
  headingLevel = 1,
  lang,
}: SurfaceStateCardProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h1'
  const content = (
    <section
      className="section-shell border border-gold/12 bg-parchment-card p-5 shadow-card dark:border-gold/10 dark:bg-dark-card"
      data-ai-surface={surface}
      data-ai-state={state}
      data-ai-error={state === 'degraded' && errorCode ? errorCode : undefined}
    >
      <p className="eyebrow">{eyebrow}</p>
      <Heading className="mt-2 font-display text-[2rem] leading-none text-ink dark:text-dark-text">{title}</Heading>
      <p className="mt-3 max-w-[34ch] font-sans text-sm leading-6 text-ink/70 dark:text-dark-text/72">{body}</p>
      {actions.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {actions.map(action => (
            <button
              key={action.aiAction}
              type="button"
              onClick={action.onClick}
              className={
                action.emphasis === 'secondary'
                  ? 'rounded-full border border-sand/16 bg-white/78 px-4 py-2 font-sans text-xs font-semibold uppercase tracking-[0.16em] text-ink dark:border-dark-text/10 dark:bg-dark-card/78 dark:text-dark-text'
                  : 'rounded-lg bg-saffron px-4 py-2 font-sans text-xs font-semibold uppercase tracking-[0.16em] text-white'
              }
              data-ai-action={action.aiAction}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  )

  if (!pageShell) {
    return content
  }

  return (
    <div
      lang={lang}
      className="page-shell animate-fade-in"
      data-testid={testId}
      data-page={page}
      data-ai-surface={surface}
      data-ai-state={state}
      data-ai-error={state === 'degraded' && errorCode ? errorCode : undefined}
    >
      {content}
    </div>
  )
}
