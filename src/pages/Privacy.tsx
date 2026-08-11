import { Link } from 'react-router-dom'
import { IconArrowLeft } from '../components/icons'

export default function Privacy() {
  return (
    <div lang="en" className="page-shell animate-fade-in" data-testid="page-privacy" data-page="privacy" data-ai-surface="privacy" data-ai-state="ready">
      <Link
        to="/more"
        className="interactive-focus mb-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-sand/15 bg-parchment-card px-4 py-2 font-sans text-sm text-ink/72 dark:border-dark-text/10 dark:bg-dark-card dark:text-dark-text/74"
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
        <p className="mt-3 font-sans text-xs leading-5 text-ink/68 dark:text-dark-text/64">
          Effective July 18, 2026
        </p>
      </section>

      <section className="privacy-data-section mt-5" aria-labelledby="privacy-data-title">
        <p className="eyebrow">Data</p>
        <h2 id="privacy-data-title" className="mt-2 font-display text-2xl leading-none text-ink dark:text-dark-text">
          What the app stores
        </h2>
        <div className="privacy-data-grid mt-4 grid gap-3">
          <div className="section-shell-quiet px-4 py-4">
            <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text">On this device</p>
            <p className="mt-1 font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/66">
              Reader preferences, onboarding choices, saved passages, bookmarks, vocabulary review, and reading progress are stored locally for guest use.
            </p>
          </div>
          <div className="section-shell-quiet px-4 py-4">
            <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text">When cloud sync is connected</p>
            <p className="mt-1 font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/66">
              Account identity and user-owned saved content may be synced through the configured backend so the same shelf can appear on another device.
            </p>
          </div>
          <div className="section-shell-quiet px-4 py-4">
            <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text">Scripture lookup</p>
            <p className="mt-1 font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/66">
              Scripture and translation requests are sent over HTTPS to BaniDB. Search terms and requested content are included in the API request. Khalis Foundation's published policy says its services may record the requesting IP address and requested page or path in server logs.
            </p>
          </div>
          <div className="section-shell-quiet px-4 py-4">
            <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text">Crash diagnostics</p>
            <p className="mt-1 font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/66">
              Diagnostics stay off unless a release endpoint is configured. When enabled, NaamRas sends only a generic failure code, app version, and screen path without query details. Error text, stacks, scripture, saved content, and account identifiers are excluded.
            </p>
          </div>
        </div>
      </section>

      <section className="section-shell-quiet mt-5 px-4 py-4" aria-labelledby="privacy-use-title">
        <p className="eyebrow">Use & Control</p>
        <h2 id="privacy-use-title" className="mt-2 font-display text-2xl leading-none text-ink dark:text-dark-text">
          Why data is used and how to remove it
        </h2>
        <p className="mt-3 font-sans text-sm leading-6 text-ink/66 dark:text-dark-text/70">
          Local data supports your reading preferences, saved items, and progress. You can remove it by clearing NaamRas app or site data. In configured cloud builds, More includes a separate Delete cloud account action that removes the account and synced NaamRas data. Signing out alone only disconnects the device.
        </p>
      </section>

      <section className="section-shell-quiet mt-5 px-4 py-4" aria-labelledby="privacy-services-title">
        <p className="eyebrow">Services</p>
        <h2 id="privacy-services-title" className="mt-2 font-display text-2xl leading-none text-ink dark:text-dark-text">
          Providers and diagnostics
        </h2>
        <p className="mt-3 font-sans text-sm leading-6 text-ink/66 dark:text-dark-text/70">
          BaniDB-backed services provide scripture lookup. Khalis Foundation says it may use request and server-log information to provide and improve services, conduct research, and create anonymous reports. Its terms are at banidb.com/tos and its privacy policy is at khalisfoundation.org/about/privacy-policy. The current App Store 1.0 build does not configure Supabase sign-in, cloud sync, or diagnostics. If a later release enables them, this notice and the App Store disclosures must be updated first.
        </p>
      </section>

      <section className="section-shell-quiet mt-5 px-4 py-4" aria-labelledby="privacy-review-title">
        <p className="eyebrow">Sources & Claims</p>
        <h2 id="privacy-review-title" className="mt-2 font-display text-2xl leading-none text-ink dark:text-dark-text">
          Clear access and honest feature claims
        </h2>
        <p className="mt-3 font-sans text-sm leading-6 text-ink/66 dark:text-dark-text/70">
          NaamRas identifies source context where available and does not present subscriptions, trials, paid locks, or restore-purchase controls in this build. Report source or translation concerns through Support so they can be reviewed against the referenced provider.
        </p>
      </section>

      <Link
        to="/support"
        className="interactive-focus interactive-pill-link mt-3 min-h-[48px] w-full gap-2 rounded-lg border border-sand/20 px-4 font-sans text-sm font-semibold text-ink dark:border-dark-text/15 dark:text-dark-text"
      >
        Open Support
      </Link>
    </div>
  )
}
