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
}: SurfaceStateCardProps) {
  const content = (
    <section
      className="section-shell p-5 border border-gold/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(250,240,222,0.88))] shadow-card dark:border-gold/10 dark:bg-[linear-gradient(180deg,rgba(34,27,45,0.96),rgba(24,19,34,0.94))]"
      data-ai-surface={surface}
      data-ai-state={state}
      data-ai-error={state === 'degraded' && errorCode ? errorCode : undefined}
    >
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-2 font-display text-[2rem] leading-none text-ink dark:text-dark-text">{title}</h1>
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
                  : 'rounded-full bg-gradient-to-r from-saffron to-saffron-light px-4 py-2 font-sans text-xs font-semibold uppercase tracking-[0.16em] text-white'
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
