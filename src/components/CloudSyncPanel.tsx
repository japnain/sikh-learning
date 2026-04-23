import { IconChevronDown, IconChevronUp } from './icons'
import { signInWithProvider, signOutOfCloud, syncNow } from '../insforge/runtime'
import { usePersistentDisclosure } from '../hooks/usePersistentDisclosure'
import { useCloudSyncStore } from '../store/cloudSync'
import { useLocaleStore } from '../store/locale'
import { useActivityEventsStore } from '../store/activityEvents'

const CLOUD_COPY = {
  en: {
    eyebrow: 'Cloud Sync',
    title: 'Keep NaamRas with you across devices.',
    body: 'InsForge backs up bookmarks, vocab, Learn saves, progress, and reader preferences without changing the guest reading flow.',
    notConfigured: 'This build is still running local-only. Add the InsForge environment variables to enable sign-in and sync.',
    signedOut: 'Browsing stays anonymous. Sign in only when you want backup and cross-device sync.',
    providersHint: 'Enable Google and Apple in InsForge auth to match the mobile-first rollout.',
    signInGoogle: 'Continue with Google',
    signInApple: 'Continue with Apple',
    signInGithub: 'Continue with GitHub',
    syncNow: 'Sync now',
    signOut: 'Sign out',
    queueReady: 'Changes are queued and will sync on the next successful connection.',
    offline: 'You are offline. Local changes are still safe on this device.',
    lastSynced: 'Last synced',
    connectedAs: 'Connected as',
    pendingChanges: 'Pending changes',
    syncMode: 'Sync mode',
    guestMode: 'Guest reading',
    cloudMode: 'Cloud connected',
    waiting: 'Waiting',
    providers: 'Providers',
    providerSupported: 'Supported',
    providerNeedsSetup: 'Needs setup',
    featureGuest: 'Guest reading stays open',
    featureLibrary: 'Bookmarks, vocab, Learn, progress',
    featureMerge: 'Offline queue with merge replay',
    mergeHint: 'First sign-in merges this device into your account before syncing future changes.',
    localOnlyStatus: 'Local only',
    signedOutStatus: 'Backup optional',
    readyStatus: 'Cloud connected',
    syncingStatus: 'Syncing now',
    queuedStatus: 'Sync queued',
    offlineStatus: 'Offline',
    errorStatus: 'Needs attention',
    authStatus: 'Opening sign-in',
  },
  pa: {
    eyebrow: 'ਕਲਾਉਡ ਸਿੰਕ',
    title: 'NaamRas ਨੂੰ ਹਰ ਡਿਵਾਈਸ ਤੇ ਨਾਲ ਰੱਖੋ।',
    body: 'InsForge ਬੁੱਕਮਾਰਕ, ਸ਼ਬਦ, Learn saves, ਤਰੱਕੀ ਅਤੇ ਰੀਡਰ ਪਸੰਦਾਂ ਦਾ ਬੈਕਅੱਪ ਰੱਖਦਾ ਹੈ, ਪਰ guest ਪੜ੍ਹਾਈ ਨੂੰ ਨਹੀਂ ਤੋੜਦਾ।',
    notConfigured: 'ਇਹ build ਹਾਲੇ ਸਿਰਫ਼ local mode ਵਿੱਚ ਹੈ। Sign-in ਅਤੇ sync ਲਈ InsForge environment variables ਜੋੜੋ।',
    signedOut: 'ਬ੍ਰਾਊਜ਼ਿੰਗ ਅਗਿਆਤ ਹੀ ਰਹਿੰਦੀ ਹੈ। Sign in ਕੇਵਲ ਤਦੋਂ ਕਰੋ ਜਦੋਂ ਤੁਸੀਂ backup ਅਤੇ cross-device sync ਚਾਹੁੰਦੇ ਹੋ।',
    providersHint: 'ਮੋਬਾਈਲ-ਪਹਿਲਾਂ rollout ਲਈ InsForge auth ਵਿੱਚ Google ਅਤੇ Apple ਚਾਲੂ ਕਰੋ।',
    signInGoogle: 'Google ਨਾਲ ਜਾਰੀ ਰੱਖੋ',
    signInApple: 'Apple ਨਾਲ ਜਾਰੀ ਰੱਖੋ',
    signInGithub: 'GitHub ਨਾਲ ਜਾਰੀ ਰੱਖੋ',
    syncNow: 'ਹੁਣੇ sync ਕਰੋ',
    signOut: 'Sign out',
    queueReady: 'ਬਦਲਾਅ queue ਵਿੱਚ ਹਨ ਅਤੇ ਅਗਲੀ ਸਫਲ ਕਨੈਕਸ਼ਨ ਤੇ sync ਹੋ ਜਾਣਗੇ।',
    offline: 'ਤੁਸੀਂ offline ਹੋ। Local ਬਦਲਾਅ ਇਸ ਡਿਵਾਈਸ ਤੇ ਸੁਰੱਖਿਅਤ ਹਨ।',
    lastSynced: 'ਆਖਰੀ sync',
    connectedAs: 'ਇਸ ਨਾਂ ਨਾਲ ਜੁੜੇ ਹੋਏ',
    pendingChanges: 'ਬਾਕੀ ਬਦਲਾਅ',
    syncMode: 'ਸਿੰਕ ਮੋਡ',
    guestMode: 'Guest ਪੜ੍ਹਾਈ',
    cloudMode: 'ਕਲਾਉਡ ਨਾਲ ਜੁੜਿਆ',
    waiting: 'ਉਡੀਕ ਵਿੱਚ',
    providers: 'ਪ੍ਰੋਵਾਈਡਰ',
    providerSupported: 'ਸਮਰਥਿਤ',
    providerNeedsSetup: 'ਸੈੱਟਅੱਪ ਲੋੜੀਂਦਾ',
    featureGuest: 'Guest ਪੜ੍ਹਾਈ ਖੁੱਲ੍ਹੀ ਰਹਿੰਦੀ ਹੈ',
    featureLibrary: 'ਬੁੱਕਮਾਰਕ, ਸ਼ਬਦ, Learn, ਤਰੱਕੀ',
    featureMerge: 'Offline queue ਅਤੇ merge replay',
    mergeHint: 'ਪਹਿਲੀ sign-in ਇਸ ਡਿਵਾਈਸ ਦਾ ਡਾਟਾ ਤੁਹਾਡੇ account ਨਾਲ merge ਕਰਦੀ ਹੈ, ਫਿਰ ਅੱਗੇ sync ਹੁੰਦਾ ਹੈ।',
    localOnlyStatus: 'ਸਿਰਫ਼ local',
    signedOutStatus: 'ਬੈਕਅੱਪ ਚੋਣਵਾਂ',
    readyStatus: 'ਕਲਾਉਡ ਨਾਲ ਜੁੜਿਆ',
    syncingStatus: 'ਹੁਣੇ sync ਹੋ ਰਿਹਾ',
    queuedStatus: 'Sync queue ਵਿੱਚ',
    offlineStatus: 'Offline',
    errorStatus: 'ਧਿਆਨ ਚਾਹੀਦਾ',
    authStatus: 'Sign-in ਖੁੱਲ ਰਹੀ ਹੈ',
  },
  hi: {
    eyebrow: 'क्लाउड सिंक',
    title: 'NaamRas को हर डिवाइस पर साथ रखिए।',
    body: 'InsForge बुकमार्क, शब्द, Learn saves, प्रगति और रीडर पसंदों का बैकअप रखता है, बिना guest reading flow को बदले।',
    notConfigured: 'यह build अभी केवल local mode में है। Sign-in और sync के लिए InsForge environment variables जोड़िए।',
    signedOut: 'ब्राउज़िंग गुमनाम ही रहती है। Sign in केवल तब करें जब आपको backup और cross-device sync चाहिए।',
    providersHint: 'मोबाइल-प्रथम rollout के लिए InsForge auth में Google और Apple चालू कीजिए।',
    signInGoogle: 'Google के साथ जारी रखें',
    signInApple: 'Apple के साथ जारी रखें',
    signInGithub: 'GitHub के साथ जारी रखें',
    syncNow: 'अभी sync करें',
    signOut: 'Sign out',
    queueReady: 'बदलाव queue में हैं और अगली सफल कनेक्शन पर sync हो जाएंगे।',
    offline: 'आप offline हैं। Local बदलाव इस डिवाइस पर सुरक्षित हैं।',
    lastSynced: 'आखिरी sync',
    connectedAs: 'इस रूप में जुड़े हैं',
    pendingChanges: 'बाकी बदलाव',
    syncMode: 'सिंक मोड',
    guestMode: 'Guest reading',
    cloudMode: 'क्लाउड जुड़ा हुआ',
    waiting: 'प्रतीक्षा में',
    providers: 'प्रोवाइडर',
    providerSupported: 'समर्थित',
    providerNeedsSetup: 'सेटअप चाहिए',
    featureGuest: 'Guest reading खुली रहती है',
    featureLibrary: 'बुकमार्क, शब्द, Learn, प्रगति',
    featureMerge: 'Offline queue और merge replay',
    mergeHint: 'पहली sign-in इस डिवाइस के डेटा को आपके account के साथ merge करती है, फिर आगे sync चलता है।',
    localOnlyStatus: 'केवल local',
    signedOutStatus: 'बैकअप वैकल्पिक',
    readyStatus: 'क्लाउड जुड़ा हुआ',
    syncingStatus: 'अभी sync हो रहा है',
    queuedStatus: 'Sync queue में',
    offlineStatus: 'Offline',
    errorStatus: 'ध्यान चाहिए',
    authStatus: 'Sign-in खुल रही है',
  },
} as const

type CloudCopy = {
  [Key in keyof typeof CLOUD_COPY.en]: string
}

const PROVIDER_META = {
  google: {
    name: 'Google',
    labelKey: 'signInGoogle',
  },
  apple: {
    name: 'Apple',
    labelKey: 'signInApple',
  },
  github: {
    name: 'GitHub',
    labelKey: 'signInGithub',
  },
} as const

type CloudSyncSurfaceState = 'loading' | 'ready' | 'empty' | 'degraded'

function formatSyncTimestamp(value: string | null, locale: string) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function getStatusView({
  configured,
  status,
  currentUser,
  syncQueued,
  offline,
  lastError,
  copy,
}: {
  configured: boolean
  status: string
  currentUser: { id: string } | null
  syncQueued: boolean
  offline: boolean
  lastError: string | null
  copy: CloudCopy
}) {
  if (!configured) {
    return {
      label: copy.localOnlyStatus,
      className: 'bg-sand/14 text-ink/72 dark:bg-dark-text/12 dark:text-dark-text/72',
    }
  }

  if (offline || status === 'offline') {
    return {
      label: copy.offlineStatus,
      className: 'bg-saffron/12 text-saffron dark:bg-saffron/15 dark:text-saffron-light',
    }
  }

  if (currentUser && (lastError || status === 'error')) {
    return {
      label: copy.errorStatus,
      className: 'bg-[#b4553d]/12 text-[#b4553d] dark:bg-[#ffb29d]/12 dark:text-[#ffb29d]',
    }
  }

  if (status === 'authenticating') {
    return {
      label: copy.authStatus,
      className: 'bg-gold/12 text-gold-dark dark:bg-gold/12 dark:text-gold-light',
    }
  }

  if (status === 'syncing') {
    return {
      label: copy.syncingStatus,
      className: 'bg-gold/12 text-gold-dark dark:bg-gold/12 dark:text-gold-light',
    }
  }

  if (currentUser && syncQueued) {
    return {
      label: copy.queuedStatus,
      className: 'bg-gold/12 text-gold-dark dark:bg-gold/12 dark:text-gold-light',
    }
  }

  if (currentUser) {
    return {
      label: copy.readyStatus,
      className: 'bg-[#dfead8] text-[#3c6a3f] dark:bg-[#203224] dark:text-[#9fd8a3]',
    }
  }

  return {
    label: copy.signedOutStatus,
    className: 'bg-gold/10 text-gold-dark dark:bg-gold/10 dark:text-gold-light',
  }
}

function getCloudSyncSurfaceState({
  configured,
  status,
  currentUser,
  lastError,
  offline,
}: {
  configured: boolean
  status: string
  currentUser: { id: string } | null
  lastError: string | null
  offline: boolean
}): CloudSyncSurfaceState {
  if (status === 'booting' || status === 'authenticating' || status === 'syncing') {
    return 'loading'
  }

  if (currentUser && (offline || lastError || status === 'error')) {
    return 'degraded'
  }

  if (!configured || !currentUser) {
    return 'empty'
  }

  return 'ready'
}

function getCloudSyncErrorCode({
  status,
  currentUser,
  lastError,
  offline,
}: {
  status: string
  currentUser: { id: string } | null
  lastError: string | null
  offline: boolean
}) {
  if (!currentUser || !(offline || lastError || status === 'error')) return null
  return 'cloud-sync'
}

function getCloudSyncSummary({
  configured,
  currentUser,
  syncQueued,
  offline,
  lastError,
  pendingEventsCount,
}: {
  configured: boolean
  currentUser: { id: string } | null
  syncQueued: boolean
  offline: boolean
  lastError: string | null
  pendingEventsCount: number
}) {
  if (!configured) {
    return 'Local only. Backup can stay optional until cloud continuity is ready.'
  }

  if (!currentUser) {
    return pendingEventsCount > 0
      ? `Guest reading stays open. ${pendingEventsCount} change${pendingEventsCount === 1 ? '' : 's'} will be ready whenever you choose backup.`
      : 'Guest reading stays open. Sign in only when you want backup and quiet cross-device continuity.'
  }

  if (offline) {
    return pendingEventsCount > 0
      ? `Offline for now. ${pendingEventsCount} queued change${pendingEventsCount === 1 ? '' : 's'} stay safe on this device.`
      : 'Offline for now. Local changes stay safe until the next connection.'
  }

  if (lastError) {
    return 'Cloud continuity needs attention before the next backup can finish.'
  }

  if (syncQueued) {
    return pendingEventsCount > 0
      ? `${pendingEventsCount} queued change${pendingEventsCount === 1 ? '' : 's'} will travel on the next successful sync.`
      : 'A sync is queued and will travel on the next successful connection.'
  }

  return 'Bookmarks, vocabulary, Learn progress, and reader preferences follow you quietly.'
}

function getProviderAvailabilityView({
  enabled,
  statusView,
  copy,
}: {
  enabled: boolean
  statusView: { label: string; className: string }
  copy: CloudCopy
}) {
  if (!enabled) {
    return {
      label: copy.providerNeedsSetup,
      statusLabel: null,
      statusClassName: null,
      className: 'text-ink/52 dark:text-dark-text/52',
    }
  }

  return {
    label: copy.providerSupported,
    statusLabel: statusView.label,
    statusClassName: statusView.className,
    className: 'text-ink dark:text-dark-text',
  }
}

export default function CloudSyncPanel() {
  const locale = useLocaleStore(state => state.locale)
  const copy = CLOUD_COPY[locale]
  const {
    configured,
    status,
    currentUser,
    availableProviders,
    lastSyncedAt,
    lastError,
    syncQueued,
  } = useCloudSyncStore()
  const pendingEventsCount = useActivityEventsStore(state => state.pendingEvents.length)

  const supportedProviders = availableProviders.filter(
    (provider): provider is keyof typeof PROVIDER_META => provider in PROVIDER_META
  )
  const supportsGoogle = supportedProviders.includes('google')
  const supportsApple = supportedProviders.includes('apple')
  const isBusy = status === 'booting' || status === 'authenticating' || status === 'syncing'
  const formattedLastSynced = formatSyncTimestamp(lastSyncedAt, locale)
  const isOffline = status === 'offline' || (typeof navigator !== 'undefined' && navigator.onLine === false)
  const statusView = getStatusView({
    configured,
    status,
    currentUser,
    syncQueued,
    offline: isOffline,
    lastError,
    copy,
  })
  const panelState = getCloudSyncSurfaceState({
    configured,
    status,
    currentUser,
    lastError,
    offline: isOffline,
  })
  const panelError = getCloudSyncErrorCode({
    status,
    currentUser,
    lastError,
    offline: isOffline,
  })
  const [detailsOpen, setDetailsOpen] = usePersistentDisclosure('more-cloud-sync', false)
  const summary = getCloudSyncSummary({
    configured,
    currentUser,
    syncQueued,
    offline: isOffline,
    lastError,
    pendingEventsCount,
  })
  const panelId = 'more-cloud-sync-panel'

  return (
    <section
      className="section-shell mb-5 overflow-hidden"
      aria-labelledby="more-cloud-sync-title"
      data-testid="more-cloud-sync"
      data-ai-surface="cloud-sync-panel"
      data-ai-state={panelState}
      data-ai-error={panelError ?? undefined}
    >
      <div className="relative px-5 pt-5 pb-4" data-ai-anchor="cloud-sync-summary">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(232,196,104,0.18),transparent_72%)] dark:bg-[radial-gradient(circle_at_top,rgba(232,196,104,0.12),transparent_72%)]" />
        <button
          type="button"
          onClick={() => setDetailsOpen(current => !current)}
          aria-expanded={detailsOpen}
          aria-controls={panelId}
          className="interactive-focus relative flex w-full items-start justify-between gap-4 text-left"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="eyebrow">{copy.eyebrow}</p>
              <span
                className={`rounded-full px-3 py-1.5 font-sans text-[11px] font-semibold tracking-[0.12em] ${statusView.className}`}
                data-ai-anchor="cloud-sync-status"
              >
                {statusView.label}
              </span>
            </div>
            <h2 id="more-cloud-sync-title" className="mt-3 font-display text-[1.85rem] leading-none text-ink dark:text-dark-text">
              {copy.title}
            </h2>
            <p className="mt-3 max-w-[36ch] font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/70">
              {summary}
            </p>
            <div
              className="mt-4 flex flex-wrap gap-x-4 gap-y-2 font-sans text-xs text-ink/56 dark:text-dark-text/58"
              data-ai-surface="cloud-sync-metrics"
              data-ai-state={panelState}
            >
              <span data-ai-anchor="cloud-sync-pending">
                {pendingEventsCount === 0
                  ? 'No changes waiting'
                  : `${pendingEventsCount} change${pendingEventsCount === 1 ? '' : 's'} waiting`}
              </span>
              <span data-ai-anchor="cloud-sync-mode">{currentUser ? 'Cloud connected' : 'Backup optional'}</span>
              <span data-ai-anchor="cloud-sync-last-synced">
                {formattedLastSynced
                  ? `Last backup ${formattedLastSynced}`
                  : currentUser
                    ? 'First backup ahead'
                    : 'Not backed up yet'}
              </span>
            </div>
          </div>
          <span
            className={`icon-surface mt-1 h-10 w-10 shrink-0 ${
              detailsOpen ? 'text-ink/60 dark:text-dark-text/64' : 'text-gold dark:text-gold-light'
            }`}
            aria-hidden="true"
          >
            {detailsOpen ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
          </span>
        </button>
      </div>

      {detailsOpen ? (
        <div id={panelId} className="px-5 pb-5">
          {!configured ? (
            <div className="hero-surface px-4 py-4" data-ai-surface="cloud-sync-local-only" data-ai-state="empty">
              <p className="font-sans text-sm leading-6 text-ink/72 dark:text-dark-text/72">{copy.notConfigured}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-ink/55 dark:text-dark-text/55">
                <span className="chip-pill">{copy.featureGuest}</span>
                <span className="chip-pill">{copy.featureLibrary}</span>
                <span className="chip-pill">{copy.featureMerge}</span>
              </div>
            </div>
          ) : (
            <div
              className="section-shell-quiet relative overflow-hidden px-4 py-4"
              data-ai-surface="cloud-sync-account"
              data-ai-state={panelState}
              data-ai-error={panelError ?? undefined}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/55 to-transparent dark:from-white/5 dark:to-transparent" />
              <div className="relative">
                {currentUser ? (
                  <>
                    <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-gold dark:text-gold-light">
                      {copy.connectedAs}
                    </p>
                    <p className="mt-2 font-sans text-base font-semibold text-ink dark:text-dark-text">
                      {currentUser.name ?? currentUser.email}
                    </p>
                    {currentUser.name ? (
                      <p className="mt-1 font-sans text-xs text-ink/55 dark:text-dark-text/55">{currentUser.email}</p>
                    ) : null}
                  </>
                ) : (
                  <>
                    <p className="font-sans text-sm text-ink/72 dark:text-dark-text/72">{copy.signedOut}</p>
                    <p className="mt-3 font-sans text-xs leading-5 text-ink/58 dark:text-dark-text/58">{copy.mergeHint}</p>
                  </>
                )}

                <div className="mt-4 rounded-[20px] border border-sand/12 bg-white/80 px-3 py-3 dark:border-dark-text/10 dark:bg-dark-card/75">
                  <div className="flex flex-wrap gap-x-4 gap-y-2 font-sans text-xs text-ink/60 dark:text-dark-text/60">
                    <span>{copy.pendingChanges} {pendingEventsCount}</span>
                    <span>{copy.lastSynced} {formattedLastSynced ?? copy.waiting}</span>
                    <span>{copy.syncMode} {currentUser ? copy.cloudMode : copy.guestMode}</span>
                  </div>
                </div>

                <p className="eyebrow mt-4">{copy.providers}</p>
                <div className="mt-4 grid grid-cols-2 gap-2" data-ai-surface="cloud-sync-providers" data-ai-state={supportedProviders.length === 0 ? 'empty' : 'ready'}>
                  {(['google', 'apple', 'github'] as const).map(providerId => {
                    const provider = PROVIDER_META[providerId]
                    const enabled = supportedProviders.includes(providerId)
                    const providerState = getProviderAvailabilityView({
                      enabled,
                      statusView,
                      copy,
                    })

                    return (
                      <div
                        key={providerId}
                        className={`rounded-[20px] border px-3 py-3 ${
                          enabled
                            ? 'border-gold/20 bg-white/85 dark:border-gold/15 dark:bg-dark-card/80'
                            : 'border-sand/10 bg-parchment-low/85 dark:border-dark-text/10 dark:bg-dark-surface/80'
                        }`}
                        data-ai-anchor={`cloud-provider-${providerId}`}
                      >
                        <p className="eyebrow">{provider.name}</p>
                        <p className={`mt-2 font-sans text-sm font-semibold ${providerState.className}`}>
                          {providerState.label}
                        </p>
                        {providerState.statusLabel ? (
                          <p className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${providerState.statusClassName}`}>
                            {providerState.statusLabel}
                          </p>
                        ) : null}
                      </div>
                    )
                  })}
                </div>

                {!supportsGoogle || !supportsApple ? (
                  <p className="mt-4 font-sans text-xs leading-5 text-ink/58 dark:text-dark-text/58">{copy.providersHint}</p>
                ) : null}

                <div className="mt-4 space-y-2" aria-live="polite" data-ai-anchor="cloud-sync-notices">
                  {isOffline ? (
                    <p className="font-sans text-xs text-saffron dark:text-saffron-light">{copy.offline}</p>
                  ) : null}

                  {syncQueued ? (
                    <p className="font-sans text-xs text-ink/60 dark:text-dark-text/60">{copy.queueReady}</p>
                  ) : null}

                  {lastError ? (
                    <p className="font-sans text-xs text-[#b4553d] dark:text-[#ffb29d]">{lastError}</p>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-ink/55 dark:text-dark-text/55">
                  <span className="chip-pill">{copy.featureGuest}</span>
                  <span className="chip-pill">{copy.featureLibrary}</span>
                  <span className="chip-pill">{copy.featureMerge}</span>
                </div>

                <div className="mt-4 grid gap-2">
                  {!currentUser ? (
                    <>
                      {supportedProviders.map((providerId, index) => {
                        const provider = PROVIDER_META[providerId]
                        const label = copy[provider.labelKey]

                        return (
                          <button
                            key={providerId}
                            type="button"
                            onClick={() => { void signInWithProvider(providerId) }}
                            disabled={isBusy}
                            data-ai-action={`cloud-sign-in-${providerId}`}
                            className={`w-full rounded-2xl px-4 py-3 font-sans text-sm font-semibold disabled:opacity-45 ${
                              index === 0
                                ? 'bg-gradient-to-r from-saffron to-saffron-light text-white'
                                : 'border border-sand/15 bg-white/70 text-ink dark:border-dark-text/10 dark:bg-dark-card dark:text-dark-text'
                            }`}
                          >
                            {label}
                          </button>
                        )
                      })}
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => { void syncNow('manual') }}
                        disabled={isBusy}
                        data-ai-action="cloud-sync-now"
                        className="w-full rounded-2xl bg-gradient-to-r from-saffron to-saffron-light px-4 py-3 font-sans text-sm font-semibold text-white disabled:opacity-45"
                      >
                        {copy.syncNow}
                      </button>
                      <button
                        type="button"
                        onClick={() => { void signOutOfCloud() }}
                        disabled={isBusy}
                        data-ai-action="cloud-sign-out"
                        className="w-full rounded-2xl border border-sand/15 bg-white/70 px-4 py-3 font-sans text-sm font-semibold text-ink disabled:opacity-45 dark:border-dark-text/10 dark:bg-dark-card dark:text-dark-text"
                      >
                        {copy.signOut}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </section>
  )
}
