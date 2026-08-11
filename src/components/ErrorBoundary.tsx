import { Component, type ErrorInfo, type ReactNode } from 'react'
import { reportDiagnostic } from '../utils/diagnostics'
import { resolveAppPath } from '../utils/basePath'

interface Props { children: ReactNode }
interface State { hasError: boolean }

export default class ErrorBoundary extends Component<Props, State> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error: Error, info: ErrorInfo) {
    reportDiagnostic('react_render_failure', { source: 'error-boundary', fatal: true })
    if (import.meta.env.DEV) console.error('ErrorBoundary caught:', error, info.componentStack)
  }
  render() {
    if (this.state.hasError) {
      return (
        <main
          lang="en"
          id="main-content"
          tabIndex={-1}
          className="page-shell animate-fade-in"
          data-testid="page-app-error"
          data-page="app-error"
          data-ai-surface="app-error-boundary"
          data-ai-state="degraded"
          data-ai-error="unavailable"
        >
          <section className="section-shell border border-gold/12 bg-parchment-card p-5 dark:border-gold/10 dark:bg-dark-card">
            <p className="eyebrow">NaamRas</p>
            <p className="mt-2 font-display text-[2rem] leading-none text-ink dark:text-dark-text">This view needs a clean reset.</p>
            <p className="mt-3 max-w-[34ch] font-sans text-sm leading-6 text-ink/70 dark:text-dark-text/72">
              Your reading state is still on this device. Reload the view or jump back home and continue from there.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-lg bg-saffron px-4 py-2 font-sans text-xs font-semibold uppercase tracking-[0.16em] text-white"
                data-ai-action="reload-app"
              >
                Reload app
              </button>
              <button
                type="button"
                onClick={() => window.location.assign(resolveAppPath('/', import.meta.env.BASE_URL))}
                className="rounded-lg border border-sand/16 bg-white/78 px-4 py-2 font-sans text-xs font-semibold uppercase tracking-[0.16em] text-ink dark:border-dark-text/10 dark:bg-dark-card/78 dark:text-dark-text"
                data-ai-action="go-home"
              >
                Go home
              </button>
            </div>
          </section>
        </main>
      )
    }
    return this.props.children
  }
}
