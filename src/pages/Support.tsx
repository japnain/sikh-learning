import { Link } from 'react-router-dom'
import { IconArrowLeft, IconArrowRight, IconExternalLink } from '../components/icons'

const SUPPORT_ISSUE_URL = 'https://github.com/japnain/sikh-learning/issues/new?title=NaamRas%20support%3A%20'

const troubleshootingItems = [
  {
    title: 'A reading does not open',
    body: 'Check your connection, return to the catalog, and open the reading again. Content that has already been cached may remain available when the network is limited.',
  },
  {
    title: 'Saved progress looks different',
    body: 'Guest reading progress belongs to the current device and browser. Connect cloud backup only when you want supported saved items to follow you to another device.',
  },
  {
    title: 'The text is difficult to read',
    body: 'Open More to adjust script, meaning language, text size, line spacing, contrast, and motion preferences without changing the source text.',
  },
]

export default function Support() {
  return (
    <div
      className="page-shell animate-fade-in"
      data-testid="page-support"
      data-page="support"
      data-ai-surface="support"
      data-ai-state="ready"
    >
      <Link
        to="/more"
        className="interactive-focus mb-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-sand/15 bg-parchment-card px-4 py-2 font-sans text-sm text-ink/72 dark:border-dark-text/10 dark:bg-dark-card dark:text-dark-text/74"
      >
        <IconArrowLeft size={16} />
        More
      </Link>

      <section className="hero-surface px-5 py-5" aria-labelledby="support-title">
        <p className="eyebrow">NaamRas Support</p>
        <h1 id="support-title" className="mt-2 font-display text-4xl leading-none text-ink dark:text-dark-text">
          Help that gets you back to reading.
        </h1>
        <p className="mt-3 max-w-[58ch] font-sans text-sm leading-6 text-ink/66 dark:text-dark-text/70">
          Start with the checks below. When something is still wrong, send a report with the screen, device, and steps that reproduced it.
        </p>
        <a
          href={SUPPORT_ISSUE_URL}
          target="_blank"
          rel="noreferrer"
          className="interactive-focus interactive-pill-link mt-4 min-h-[48px] w-full gap-2 rounded-lg bg-ink px-4 font-sans text-sm font-semibold text-parchment dark:bg-parchment dark:text-dark-bg sm:w-auto"
          data-testid="support-report-problem"
        >
          Report a problem
          <IconExternalLink size={15} />
        </a>
      </section>

      <section className="mt-5" aria-labelledby="support-common-title">
        <p className="eyebrow">Common Fixes</p>
        <h2 id="support-common-title" className="mt-2 font-display text-2xl leading-none text-ink dark:text-dark-text">
          Try these first
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {troubleshootingItems.map((item) => (
            <article key={item.title} className="section-shell-quiet px-4 py-4">
              <h3 className="font-sans text-sm font-semibold text-ink dark:text-dark-text">{item.title}</h3>
              <p className="mt-2 font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/66">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-shell-quiet mt-5 px-4 py-4" aria-labelledby="support-report-title">
        <p className="eyebrow">A Useful Report</p>
        <h2 id="support-report-title" className="mt-2 font-display text-2xl leading-none text-ink dark:text-dark-text">
          Include context, not private content
        </h2>
        <p className="mt-3 font-sans text-sm leading-6 text-ink/66 dark:text-dark-text/70">
          Include your device model, operating-system or browser version, the page you were using, and the shortest steps that reproduce the issue. Do not post account identifiers, private notes, saved passages, or screenshots containing personal information.
        </p>
      </section>

      <Link
        to="/privacy"
        className="interactive-focus interactive-pill-link mt-3 min-h-[48px] w-full gap-2 rounded-lg border border-sand/20 px-4 font-sans text-sm font-semibold text-ink dark:border-dark-text/15 dark:text-dark-text"
      >
        Read the privacy policy
        <IconArrowRight size={14} />
      </Link>
    </div>
  )
}
