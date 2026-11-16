import { useState } from 'react'
import { useLocaleStore } from '../store/locale'
import { useCloudSyncStore } from '../store/cloudSync'
import { SUPPORT_COPY } from '../utils/supportCopy'
import { Link } from 'react-router-dom'
import { IconArrowLeft, IconArrowRight, IconCheck, IconShare } from '../components/icons'
import { buildSupportMailto, getSupportEmail } from '../utils/appConfig'
import { createSupportReport, downloadSupportReport } from '../utils/supportReport'

export default function Support() {
  const locale = useLocaleStore(state => state.locale)
  const configured = useCloudSyncStore(state => state.configured)
  const copy = SUPPORT_COPY[locale]
  const troubleshootingItems = [
    { title: copy.opening, body: copy.openingHelp },
    { title: copy.progress, body: configured ? copy.cloudProgress : copy.localProgress },
    { title: copy.text, body: copy.textHelp },
  ]
  const supportEmail = getSupportEmail()
  const supportMailto = buildSupportMailto(supportEmail)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'unavailable'>('idle')
  const [report, setReport] = useState(() => createSupportReport(locale))
  const [downloadState, setDownloadState] = useState<'idle' | 'started' | 'unavailable'>('idle')

  const copyReportTemplate = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(report)
      setCopyState('copied')
    } catch {
      setCopyState('unavailable')
    }
  }

  const downloadReport = () => {
    try {
      downloadSupportReport(report)
      setDownloadState('started')
    } catch {
      setDownloadState('unavailable')
    }
  }

  return (
    <div
      lang={locale}
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
        {copy.more}
      </Link>

      <section className="hero-surface px-5 py-5" aria-labelledby="support-title">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1 id="support-title" className="mt-2 font-display text-4xl leading-none text-ink dark:text-dark-text">
          {copy.title}
        </h1>
        <p className="mt-3 max-w-[58ch] font-sans text-sm leading-6 text-ink/66 dark:text-dark-text/70">
          {copy.intro}
        </p>
        <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
          {supportMailto ? (
            <a
              href={supportMailto}
              className="interactive-focus interactive-pill-link min-h-[48px] w-full gap-2 rounded-lg bg-ink px-4 font-sans text-sm font-semibold text-parchment dark:bg-parchment dark:text-dark-bg sm:w-auto"
              data-testid="support-email"
            >
              {copy.email}
              <IconArrowRight size={14} />
            </a>
          ) : null}
        </div>
        {!supportMailto ? (
          <p className="mt-3 font-sans text-xs leading-5 text-ink/72 dark:text-dark-text/62" data-testid="support-email-unavailable">
            {copy.noEmail}
          </p>
        ) : null}
      </section>

      <section className="mt-5" aria-labelledby="support-common-title">
        <p className="eyebrow">{copy.common}</p>
        <h2 id="support-common-title" className="mt-2 font-display text-2xl leading-none text-ink dark:text-dark-text">
          {copy.tryFirst}
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
        <p className="eyebrow">{copy.useful}</p>
        <h2 id="support-report-title" className="mt-2 font-display text-2xl leading-none text-ink dark:text-dark-text">
          {copy.prepare}
        </h2>
        <p className="mt-3 font-sans text-sm leading-6 text-ink/66 dark:text-dark-text/70">
          {copy.reportHelp}
        </p>
        <label htmlFor="support-report" className="mt-4 block font-sans text-sm font-semibold text-ink dark:text-dark-text">{copy.review}</label>
        <textarea
          id="support-report"
          value={report}
          onChange={event => { setReport(event.target.value); setCopyState('idle'); setDownloadState('idle') }}
          rows={14}
          spellCheck={false}
          className="interactive-focus mt-2 w-full rounded-lg border border-sand/30 bg-parchment-card p-3 font-sans text-sm leading-6 text-ink dark:border-dark-text/20 dark:bg-dark-card dark:text-dark-text"
        />
        <button
          type="button"
          onClick={copyReportTemplate}
          className="interactive-focus interactive-pill-link mt-4 min-h-[48px] w-full gap-2 rounded-lg border border-sand/20 px-4 font-sans text-sm font-semibold text-ink dark:border-dark-text/15 dark:text-dark-text sm:w-auto"
          data-testid="support-copy-template"
        >
          {copyState === 'copied' ? <IconCheck size={15} /> : <IconShare size={15} />}
          {copyState === 'copied' ? copy.copied : copy.copy}
        </button>
        <button type="button" onClick={downloadReport} className="interactive-focus interactive-pill-link mt-3 min-h-[48px] w-full rounded-lg border border-sand/20 px-4 font-sans text-sm font-semibold text-ink dark:border-dark-text/15 dark:text-dark-text sm:ml-3 sm:w-auto">
          {copy.download}
        </button>
        <p className="mt-2 font-sans text-xs leading-5 text-ink/66 dark:text-dark-text/58" aria-live="polite">
          {copyState === 'unavailable'
            ? copy.copyUnavailable
            : downloadState === 'unavailable'
              ? copy.downloadUnavailable
              : downloadState === 'started'
                ? copy.downloadStarted
                : copy.shareHelp}
        </p>
      </section>

      <Link
        to="/privacy"
        className="interactive-focus interactive-pill-link mt-3 min-h-[48px] w-full gap-2 rounded-lg border border-sand/20 px-4 font-sans text-sm font-semibold text-ink dark:border-dark-text/15 dark:text-dark-text"
      >
        {copy.privacy}
        <IconArrowRight size={14} />
      </Link>
    </div>
  )
}
