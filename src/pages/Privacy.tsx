import { Link } from 'react-router-dom'
import { IconArrowLeft } from '../components/icons'

export default function Privacy() {
  return (
    <div className="page-shell animate-fade-in" data-testid="page-privacy" data-page="privacy" data-ai-surface="privacy" data-ai-state="ready">
      <Link
        to="/more"
        className="interactive-focus mb-4 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-sand/15 bg-parchment-card px-4 py-2 font-sans text-sm text-ink/72 dark:border-dark-text/10 dark:bg-dark-card dark:text-dark-text/74"
      >
        <IconArrowLeft size={16} />
        More
      </Link>

      <section className="hero-surface px-5 py-5" aria-labelledby="privacy-title">
        <p className="eyebrow">Privacy & Sources</p>
        <h1 id="privacy-title" className="mt-2 font-display text-4xl leading-none text-ink dark:text-dark-text">
          NaamRas keeps reading clear and optional.
        </h1>
        <p className="mt-3 font-sans text-sm leading-6 text-ink/66 dark:text-dark-text/70">
          You can use the app as a guest. Cloud backup is optional and should only be connected when you want saved progress available across devices.
        </p>
      </section>

      <section className="section-shell mt-5 px-4 py-4" aria-labelledby="privacy-data-title">
        <p className="eyebrow">Data</p>
        <h2 id="privacy-data-title" className="mt-2 font-display text-2xl leading-none text-ink dark:text-dark-text">
          What the app stores
        </h2>
        <div className="mt-4 grid gap-3">
          <div className="section-shell-quiet px-4 py-4">
            <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text">On this device</p>
            <p className="mt-1 font-sans text-sm leading-6 text-ink/62 dark:text-dark-text/66">
              Reader preferences, onboarding choices, saved passages, bookmarks, vocabulary review, and reading progress are stored locally for guest use.
            </p>
          </div>
          <div className="section-shell-quiet px-4 py-4">
            <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text">When cloud sync is connected</p>
            <p className="mt-1 font-sans text-sm leading-6 text-ink/62 dark:text-dark-text/66">
              Account identity and user-owned saved content may be synced through the configured backend so the same shelf can appear on another device.
            </p>
          </div>
          <div className="section-shell-quiet px-4 py-4">
            <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text">Scripture lookup</p>
            <p className="mt-1 font-sans text-sm leading-6 text-ink/62 dark:text-dark-text/66">
              Scripture and translation requests use BaniDB-backed lookup flows. Reader screens show source context where the app can identify it.
            </p>
          </div>
        </div>
      </section>

      <section className="section-shell-quiet mt-5 px-4 py-4" aria-labelledby="privacy-review-title">
        <p className="eyebrow">Review Fit</p>
        <h2 id="privacy-review-title" className="mt-2 font-display text-2xl leading-none text-ink dark:text-dark-text">
          Clear access and honest feature claims
        </h2>
        <p className="mt-3 font-sans text-sm leading-6 text-ink/66 dark:text-dark-text/70">
          NaamRas does not present subscriptions, trials, paid locks, restore-purchase controls, or unsupported recitation playback claims in this build.
        </p>
      </section>
    </div>
  )
}
