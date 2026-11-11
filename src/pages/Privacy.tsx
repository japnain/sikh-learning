import '../styles/settings.css'
import { Link } from 'react-router-dom'
import { IconArrowLeft } from '../components/icons'
import { useLocaleStore } from '../store/locale'
import { useCloudSyncStore } from '../store/cloudSync'
import { getDiagnosticsEndpoint } from '../utils/appConfig'

const COPY = {
  en: { more: 'More', support: 'Open Support', notice: '' },
  pa: { more: 'ਹੋਰ', support: 'ਸਹਾਇਤਾ ਖੋਲ੍ਹੋ', notice: 'ਪਰਦੇਦਾਰੀ ਨੀਤੀ ਇਸ ਵੇਲੇ ਸਿਰਫ਼ ਅੰਗਰੇਜ਼ੀ ਵਿੱਚ ਉਪਲਬਧ ਹੈ। ਹੇਠਾਂ ਮੂਲ ਅੰਗਰੇਜ਼ੀ ਨੀਤੀ ਦਿੱਤੀ ਗਈ ਹੈ। ਸਹਾਇਤਾ ਦਾ ਪੰਨਾ ਪੰਜਾਬੀ ਵਿੱਚ ਉਪਲਬਧ ਹੈ।' },
  hi: { more: 'और', support: 'सहायता खोलें', notice: 'गोपनीयता नीति अभी केवल अंग्रेज़ी में उपलब्ध है। नीचे मूल अंग्रेज़ी नीति दी गई है। सहायता का पृष्ठ हिंदी में उपलब्ध है।' },
} as const

export default function Privacy() {
  const locale = useLocaleStore(state => state.locale)
  const configured = useCloudSyncStore(state => state.configured)
  const copy = COPY[locale]
  return (
    <div lang={locale} className="page-shell animate-fade-in" data-testid="page-privacy" data-page="privacy" data-ai-surface="privacy" data-ai-state="ready">
      <Link
        to="/more"
        className="interactive-focus mb-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-sand/15 bg-parchment-card px-4 py-2 font-sans text-sm text-ink/72 dark:border-dark-text/10 dark:bg-dark-card dark:text-dark-text/74"
      >
        <IconArrowLeft size={16} />
        {copy.more}
      </Link>

      {copy.notice && <p role="note" className="section-shell-quiet mb-4 px-4 py-3 font-sans text-sm leading-6 text-ink dark:text-dark-text" data-testid="privacy-language-notice">{copy.notice}</p>}

      <section lang="en" className="hero-surface px-5 py-5" aria-labelledby="privacy-title">
        <p className="eyebrow">Privacy & Sources</p>
        <h1 id="privacy-title" className="mt-2 font-display text-4xl leading-none text-ink dark:text-dark-text">
          NaamRas keeps reading clear and optional.
        </h1>
        <p className="mt-3 font-sans text-sm leading-6 text-ink/66 dark:text-dark-text/70">
          {configured ? 'You can use the app as a guest. Cloud backup is optional and can sync supported saved items across devices when you connect an account.' : 'You can use the app without an account. Cloud backup and sign-in are unavailable in this version. Personal reading data stays on this device; use Download backup in More to save a portable copy.'}
        </p>
        <p className="mt-3 font-sans text-xs leading-5 text-ink/68 dark:text-dark-text/64">
          Effective November 11, 2026
        </p>
      </section>

      <section lang="en" className="privacy-data-section mt-5" aria-labelledby="privacy-data-title">
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
            <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text">{configured ? 'When cloud sync is connected' : 'Cloud backup unavailable'}</p>
            <p className="mt-1 font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/66">
              {configured ? 'In builds with cloud backup, NaamRas checks Supabase for available sign-in methods. Supabase receives connection information such as your IP address for that request. If you choose to sign in, Supabase processes your account identity and stores your saved passages, vocabulary, reading progress, preferences, and reading activity so they can be restored on another device. More lists which items are included and which still need a file backup.' : 'This version does not send your personal saved data to a cloud backup account. A downloaded backup contains personal reading data; store it somewhere you trust and review who can access it.'}
            </p>
          </div>
          <div className="section-shell-quiet px-4 py-4">
            <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text">Scripture lookup</p>
            <p className="mt-1 font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/66">
              Scripture and translation requests are sent over HTTPS to BaniDB, directly or through NaamRas’s Supabase proxy when configured. Search terms and requested content are included in the API request. If the proxy is unavailable and direct access is enabled, NaamRas retries with BaniDB directly. Each service handling a request receives connection information. Khalis Foundation's published policy says its services may record the requesting IP address and requested page or path in server logs.
            </p>
          </div>
          <div className="section-shell-quiet px-4 py-4">
            <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text">Word lookup</p>
            <p className="mt-1 font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/66">
              Opening a word sends that selected word over HTTPS to BaniDB and to SearchGurbani's Mahan Kosh service at backend.searchgurbani.com. Each provider receives the requesting IP address and lookup URL. NaamRas does not control these providers' logs or retention. Following a source link also opens that provider's website.
            </p>
          </div>
          <div className="section-shell-quiet px-4 py-4">
            <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text">Technical reports</p>
            <p className="mt-1 font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/66">
              Up to 20 recent technical failures are kept in memory for the current app session so you can review, copy, or download a support report. Reloading clears this history. Records contain generic failure codes, time and count, app version, and a screen category; they exclude search terms, reading titles, error text, stacks, scripture, saved content, and account identifiers. Automatic sending stays off unless a release endpoint is configured. When enabled, only the generic failure code, source, fatal flag, app version, and screen category are sent.
            </p>
          </div>
        </div>
      </section>

      <section lang="en" className="section-shell-quiet mt-5 px-4 py-4" aria-labelledby="privacy-use-title">
        <p className="eyebrow">Use & Control</p>
        <h2 id="privacy-use-title" className="mt-2 font-display text-2xl leading-none text-ink dark:text-dark-text">
          Why data is used and how to remove it
        </h2>
        <p className="mt-3 font-sans text-sm leading-6 text-ink/66 dark:text-dark-text/70">
          Local data supports your reading preferences, saved items, and progress. Clearing NaamRas app or site data removes it, so download a backup first if you want to keep it. {configured ? 'More includes a separate Delete cloud account action that removes your account and synced NaamRas data. Signing out alone only disconnects this device. Replacing personal data from a file also removes synced items absent from that file from your account and connected devices after sync.' : 'Cloud sign-in and account deletion controls are unavailable in this version because cloud backup is disabled.'} Downloaded backup files remain wherever you save them until you delete them yourself.
        </p>
      </section>

      <section lang="en" className="section-shell-quiet mt-5 px-4 py-4" aria-labelledby="privacy-services-title">
        <p className="eyebrow">Services</p>
        <h2 id="privacy-services-title" className="mt-2 font-display text-2xl leading-none text-ink dark:text-dark-text">
          Providers and diagnostics
        </h2>
        <p className="mt-3 font-sans text-sm leading-6 text-ink/66 dark:text-dark-text/70">
          BaniDB-backed services provide scripture lookup, and SearchGurbani provides additional Mahan Kosh word definitions. Khalis Foundation says it may use request and server-log information to provide and improve services, conduct research, and create anonymous reports. Its terms are at banidb.com/tos and its privacy policy is at khalisfoundation.org/about/privacy-policy. Supabase provides optional account authentication, cloud backup, and scripture proxy services in configured builds. More shows whether cloud backup is available in your build. {configured ? 'This version offers optional Supabase sign-in and cloud sync.' : 'This version does not enable Supabase sign-in or cloud sync.'} {getDiagnosticsEndpoint() ? 'Automatic technical diagnostics are enabled for the limited fields described above.' : 'Automatic technical diagnostics are disabled in this version.'} Support reports you copy or download remain under your control; posting one to GitHub makes it public.
        </p>
      </section>

      <section lang="en" className="section-shell-quiet mt-5 px-4 py-4" aria-labelledby="privacy-review-title">
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
        {copy.support}
      </Link>
    </div>
  )
}
