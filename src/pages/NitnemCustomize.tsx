import { Link } from 'react-router-dom'
import NitnemCustomizePanel from '../components/NitnemCustomizePanel'

export default function NitnemCustomize() {
  return (
    <div
      lang="en"
      className="page-shell animate-fade-in"
      data-testid="page-nitnem-customize"
      data-page="nitnem-customize"
      data-ai-surface="nitnem-customize"
      data-ai-state="ready"
    >
      <nav
        className="mb-4 flex flex-wrap items-center gap-2 font-sans text-xs text-ink/68 dark:text-dark-text/75"
        aria-label="Breadcrumb"
        data-testid="nitnem-customize-breadcrumbs"
      >
        <Link to="/" className="interactive-focus rounded-full px-2 py-1 text-gold-dark dark:text-gold-light">
          Home
        </Link>
        <span aria-hidden="true">/</span>
        <Link to="/#home-nitnem-title" className="interactive-focus rounded-full px-2 py-1 text-gold-dark dark:text-gold-light">
          Daily Nitnem
        </Link>
        <span aria-hidden="true">/</span>
        <span className="rounded-full px-2 py-1 text-ink/70 dark:text-dark-text/80">Customize</span>
      </nav>

      <section className="hero-surface mb-5 px-5 py-5" aria-labelledby="nitnem-customize-title">
        <p className="eyebrow">Daily Ritual</p>
        <h1 id="nitnem-customize-title" className="mt-2 font-display text-4xl leading-none text-ink dark:text-dark-text">
          Customize Daily Nitnem
        </h1>
        <p className="mt-3 max-w-[38rem] font-sans text-sm leading-6 text-ink/70 dark:text-dark-text/80">
          Choose the banis that appear on Home, set their order, and keep optional completion tracking separate from the main ritual card.
        </p>
      </section>

      <NitnemCustomizePanel />
    </div>
  )
}
