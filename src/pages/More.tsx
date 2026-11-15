import '../styles/settings.css'
import { lazy, Suspense, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import CloudSyncPanel from '../components/CloudSyncPanel'
import PersonalDataPanel from '../components/PersonalDataPanel'
import ModalSheet from '../components/ModalSheet'
import { MORE_HUB_COPY } from '../content/moreHubCopy'
import { useMusicStore } from '../store/music'
import SoundscapeControls from '../components/SoundscapeControls'
import { useLanguageStore } from '../store/language'
import { useCloudSyncStore } from '../store/cloudSync'
import { MORE_SETTINGS_COPY } from '../content/moreSettingsCopy'
import { SAMPLE_ONBOARDING_LINE } from '../content/onboardingCopy'
import { useLocaleStore } from '../store/locale'
import { useNitemStore } from '../store/nitnem'
import { useOnboardingStore } from '../store/onboarding'
import { useThemeStore, type ThemeMode } from '../store/theme'
import {
  getEnglishSourceLabels,
  getHindiSourceLabels,
  getLineSpacingLabels,
  getMeaningLanguageLabels,
  getPunjabiSourceLabels,
  getScriptModeLabels,
  getTextAlignmentLabels,
  getUiLocaleLabels,
  getVisraamSourceLabels,
} from '../utils/translations'
import { formatGurbaniText, getScriptTextFontClass, getScriptTextLang, renderScriptText } from '../utils/readerDisplay'
import { IconArrowRight, IconExternalLink, IconBanis, IconSun, IconMusic, IconLayers, IconUsers, IconClose, IconPause, IconPlay } from '../components/icons'
import { getUiCopy } from '../utils/uiCopy'
import { getEditorialCopy } from '../content/editorialCopy'
import { getPublicAppLinks } from '../utils/appConfig'
import { getSavedReaderPresentation, isReaderPresentationPreferenceSaved, setReaderPresentationPreference, subscribeReaderPresentation } from '../utils/readerPresentation'
import { READER_TEXT_SIZE } from '../utils/readerTextSize'
import '../styles/home-artwork.css'
import '../styles/more.css'

const HomeArtworkSettings = lazy(() => import('../components/HomeArtworkSettings'))

function SettingsBlock({
  title,
  description,
  children,
  headingId,
  testId,
  headingLevel = 2,
}: {
  title: string
  description?: string
  children: ReactNode
  headingId?: string
  testId?: string
  headingLevel?: 2 | 3
}) {
  const Heading = headingLevel === 3 ? 'h3' : 'h2'
  return (
    <div
      className="settings-block section-shell px-4 py-4"
      aria-labelledby={headingId}
      data-testid={testId}
    >
      <Heading id={headingId} className="eyebrow">{title}</Heading>
      {description ? (
        <p className="font-sans text-xs text-ink/68 dark:text-dark-text/64 mt-1 mb-3">
          {description}
        </p>
      ) : null}
      {children}
    </div>
  )
}

export default function More() {
  const {
    scriptMode,
    setScriptMode,
    showTransliteration,
    setShowTransliteration,
    meaningLanguage,
    setMeaningLanguage,
    fontSize,
    setFontSize,
    supportTextSize,
    setSupportTextSize,
    englishSource,
    setEnglishSource,
    punjabiSource,
    setPunjabiSource,
    hindiSource,
    setHindiSource,
    visraamSource,
    setVisraamSource,
    larivaar,
    setLarivaar,
    showVishraam,
    setShowVishraam,
    lineSpacing,
    setLineSpacing,
    textAlign,
    setTextAlign,
  } = useLanguageStore()
  const locale = useLocaleStore(s => s.locale)
  const settingsCopy = MORE_SETTINGS_COPY[locale]
  const cloudConfigured = useCloudSyncStore(state => state.configured)
  const currentUser = useCloudSyncStore(state => state.currentUser)
  const cloudStatus = useCloudSyncStore(state => state.status)
  const syncQueued = useCloudSyncStore(state => state.syncQueued)
  const musicPlaying = useMusicStore(state => state.isPlaying)
  const selectedSoundId = useMusicStore(state => state.selectedSoundId)
  const playbackError = useMusicStore(state => state.playbackError)
  const toggleSound = useMusicStore(state => state.toggleSound)
  const hub = MORE_HUB_COPY[locale]
  const [panel, setPanel] = useState<'appearance' | 'reader' | 'sound' | 'backup' | 'account' | 'about' | null>(null)
  const [readerSection, setReaderSection] = useState<'layout' | 'support' | 'sources'>('layout')
  const closeRef = useRef<HTMLButtonElement>(null)
  const presentationSaved = useSyncExternalStore(subscribeReaderPresentation, isReaderPresentationPreferenceSaved, () => true)
  const savedPresentation = useSyncExternalStore(subscribeReaderPresentation, getSavedReaderPresentation, () => null)
  const presentation = savedPresentation ?? (meaningLanguage !== 'none' || showTransliteration ? 'study' : 'read')
  const presentationCopy = locale === 'pa'
    ? { title: 'ਪੜ੍ਹਨ ਦਾ ਢੰਗ', read: 'ਪਾਠ', study: 'ਅਧਿਐਨ', hint: 'ਪਾਠ ਵਿੱਚ ਸਿਰਫ਼ ਗੁਰਬਾਣੀ ਦਿਸਦੀ ਹੈ। ਅਰਥ ਅਤੇ ਉਚਾਰਨ ਲਈ ਅਧਿਐਨ ਚੁਣੋ।' }
    : locale === 'hi'
      ? { title: 'पढ़ने का तरीका', read: 'पाठ', study: 'अध्ययन', hint: 'पाठ में केवल गुरबाणी दिखती है। अर्थ और उच्चारण के लिए अध्ययन चुनें।' }
      : { title: 'Reading mode', read: 'Read', study: 'Study', hint: 'Read shows Gurbani only. Choose Study to display your selected meanings and pronunciation help.' }
  const setLocale = useLocaleStore(s => s.setLocale)
  const openOnboarding = useOnboardingStore(s => s.openOnboarding)
  const themeMode = useThemeStore(s => s.mode)
  const setThemeMode = useThemeStore(s => s.setMode)
  const [artworkSettingsOpen, setArtworkSettingsOpen] = useState(false)
  const appearanceCopy = locale === 'pa'
    ? { system: 'ਸਿਸਟਮ', artwork: 'ਹੋਮ ਦਾ ਚਿੱਤਰ', artworkDescription: 'ਆਪਣਾ ਮਨਪਸੰਦ ਦ੍ਰਿਸ਼ ਜਾਂ ਹਰ ਰੋਜ਼ ਨਵਾਂ ਚਿੱਤਰ ਚੁਣੋ।' }
    : locale === 'hi'
      ? { system: 'सिस्टम', artwork: 'होम का चित्र', artworkDescription: 'पसंदीदा दृश्य चुनें या हर दिन नया चित्र।' }
      : { system: 'System', artwork: 'Home artwork', artworkDescription: 'Choose a favorite scene or a daily change.' }
  const selectedNitnemCount = useNitemStore(s => s.selectedIds.length)
  const completionTrackingEnabled = useNitemStore(s => s.completionTrackingEnabled)
  const copy = getUiCopy(locale)
  const editorial = getEditorialCopy(locale)
  const commonCopy = copy.common
  const moreCopy = copy.more
  const englishSourceLabels = getEnglishSourceLabels(locale)
  const punjabiSourceLabels = getPunjabiSourceLabels(locale)
  const hindiSourceLabels = getHindiSourceLabels(locale)
  const visraamSourceLabels = getVisraamSourceLabels(locale)
  const lineSpacingLabels = getLineSpacingLabels(locale)
  const meaningLanguageLabels = getMeaningLanguageLabels(locale)
  const scriptModeLabels = getScriptModeLabels(locale)
  const textAlignmentLabels = getTextAlignmentLabels(locale)
  const uiLocaleLabels = getUiLocaleLabels(locale)
  const publicLinks = getPublicAppLinks()
  const panelTitles = { appearance: hub.appearance, reader: moreCopy.readerDefaults, sound: hub.sound, backup: hub.backup, account: hub.account, about: moreCopy.about }
  const panelDescriptions = { appearance: hub.appearanceHelp, reader: hub.readerHelp, sound: hub.soundHelp, backup: hub.backupHelp, account: hub.accountHelp, about: hub.aboutHelp }
  const themeLabel = themeMode === 'system' ? appearanceCopy.system : themeMode === 'dark' ? moreCopy.darkMode : moreCopy.lightMode
  const accountSummary = cloudStatus === 'error' ? hub.needsAttention
    : cloudStatus === 'offline' ? hub.offline
      : cloudStatus === 'booting' ? hub.checking
        : cloudStatus === 'authenticating' ? hub.signingIn
          : cloudStatus === 'syncing' ? hub.syncing
            : currentUser && syncQueued ? hub.waiting
              : currentUser ? hub.connected : hub.signIn
  function settingRow(key: Exclude<typeof panel, null>, title: string, summary: string, icon: ReactNode) {
    return <button type="button" className="more-hub-row interactive-focus" onClick={() => setPanel(key)} aria-haspopup="dialog" data-testid={`more-open-${key}`}>
      <span className="more-hub-icon" aria-hidden="true">{icon}</span>
      <span className="more-hub-row-copy"><strong>{title}</strong><small>{summary}</small></span>
      <IconArrowRight size={16} />
    </button>
  }
  return (
    <div className="page-shell more-hub animate-fade-in" data-testid="page-more" lang={locale === 'pa' ? 'pa-Guru' : locale} data-page="more" data-ai-surface="more" data-ai-state="ready">
      <header className="more-page-heading">
        <p className="eyebrow">{moreCopy.eyebrow}</p>
        <h1>{hub.title}</h1>
        <p>{hub.body}</p>
      </header>

      <section className="more-daily-card" aria-labelledby="more-daily-nitnem-title" data-testid="more-daily-nitnem-link" id="daily-nitnem">
        <Link to="/nitnem/customize" state={{ nitnemOrigin: '/more' }} className="more-hub-row interactive-focus" data-testid="more-open-nitnem-customize">
          <span className="more-hub-icon" aria-hidden="true"><IconBanis size={22} /></span>
          <span className="more-hub-row-copy"><strong id="more-daily-nitnem-title">{hub.daily}</strong><small>{moreCopy.baniCount(selectedNitnemCount)} · {completionTrackingEnabled ? moreCopy.trackingOn : hub.chooseArrange}</small></span>
          <IconArrowRight size={18} />
        </Link>
      </section>

      <div className="more-hub-groups">
        <section className="more-hub-group" aria-labelledby="more-preferences-title">
          <h2 className="eyebrow" id="more-preferences-title">{hub.preferences}</h2>
          <div className="more-hub-list">
            {settingRow('reader', moreCopy.readerDefaults, `${scriptModeLabels[scriptMode]} · ${fontSize}px · ${presentation === 'read' ? presentationCopy.read : presentationCopy.study}`, <IconBanis size={20} />)}
            {settingRow('appearance', hub.appearance, `${themeLabel} · ${uiLocaleLabels[locale]}`, <IconSun size={20} />)}
            <div className="more-sound-row">
              {settingRow('sound', hub.sound, playbackError ? hub.soundError : musicPlaying ? hub.playing : selectedSoundId ? hub.paused : hub.soundHelp, <IconMusic size={20} />)}
              {selectedSoundId ? <button type="button" className="more-sound-toggle interactive-focus" onClick={() => selectedSoundId && toggleSound(selectedSoundId)} aria-label={musicPlaying ? hub.pause : hub.play}>
                {musicPlaying ? <IconPause size={18} /> : <IconPlay size={18} />}
              </button> : null}
            </div>
          </div>
          {playbackError ? <p className="more-sound-error" role="alert">{hub.soundError}</p> : null}
        </section>

        <section className="more-hub-group" aria-labelledby="more-data-title">
          <h2 className="eyebrow" id="more-data-title">{hub.yourData}</h2>
          <div className="more-hub-list">
            {cloudConfigured ? settingRow('account', hub.account, accountSummary, <IconUsers size={20} />) : null}
            {settingRow('backup', hub.backup, cloudConfigured ? hub.backupHelp : hub.deviceBackupHelp, <IconLayers size={20} />)}
          </div>
        </section>
      </div>

      <footer className="more-hub-footer">
        <button type="button" onClick={() => setPanel('about')} className="interactive-focus" aria-haspopup="dialog" data-testid="more-open-about">{hub.aboutNaamras}</button>
        {publicLinks.supportUrl ? <a href={publicLinks.supportUrl} target="_blank" rel="noreferrer" className="interactive-focus" data-testid="more-open-support">{moreCopy.support}<IconExternalLink size={12} /></a> : <Link to="/support" className="interactive-focus" data-testid="more-open-support">{moreCopy.support}</Link>}
        {publicLinks.privacyUrl ? <a href={publicLinks.privacyUrl} target="_blank" rel="noreferrer" className="interactive-focus" data-testid="more-open-public-privacy">{hub.privacy}<IconExternalLink size={12} /></a> : <Link to="/privacy" className="interactive-focus" data-testid="more-open-public-privacy">{hub.privacy}</Link>}
      </footer>

      {panel ? <ModalSheet open onClose={() => setPanel(null)} title={panelTitles[panel]} description={panelDescriptions[panel]} className="more-settings-sheet" testId={`more-${panel}-sheet`} initialFocusRef={closeRef}>
        <header className="more-sheet-heading" lang={locale}>
          <div><p className="eyebrow">{moreCopy.eyebrow}</p><h2>{panelTitles[panel]}</h2><p>{panelDescriptions[panel]}</p></div>
          <button type="button" ref={closeRef} onClick={() => setPanel(null)} className="more-sheet-close interactive-focus" aria-label={hub.close}><IconClose size={20} /></button>
        </header>
        {panel === 'reader' ? <div className="more-reader-switch" role="group" aria-label={hub.readerSections}>
          {(['layout', 'support', 'sources'] as const).map(section => <button key={section} type="button" aria-pressed={readerSection === section} className="interactive-focus" onClick={() => setReaderSection(section)}>{hub[section]}</button>)}
        </div> : null}
        <div className="more-sheet-body" lang={locale}>
          {panel === 'appearance' ? (
      <div className="more-appearance-panels grid gap-3">
        <SettingsBlock
          title={moreCopy.appearanceTitle}
          description={moreCopy.appearanceDescription}
          headingId="more-appearance-title"
          testId="more-appearance"
        >
          <div className="grid grid-cols-3 gap-2">
            {(['light', 'dark', 'system'] as ThemeMode[]).map(option => {
              const selected = themeMode === option
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setThemeMode(option)}
                  aria-pressed={selected}
                  className={`interactive-focus min-h-[48px] rounded-lg border px-3 font-sans text-sm font-semibold ${
                    selected
                      ? 'border-saffron bg-saffron text-white'
                      : 'border-sand/15 text-ink dark:border-dark-text/10 dark:text-dark-text'
                  }`}
                >
                  {option === 'system' ? appearanceCopy.system : option === 'dark' ? moreCopy.darkMode : moreCopy.lightMode}
                </button>
              )
            })}
          </div>
          <button type="button" className="home-artwork-more-link interactive-focus" onClick={() => setArtworkSettingsOpen(true)}
            data-testid="more-home-artwork">
            <span>{appearanceCopy.artwork}<small>{appearanceCopy.artworkDescription}</small></span>
            <IconArrowRight size={18} />
          </button>
        </SettingsBlock>

        <SettingsBlock
          title={moreCopy.appLanguageTitle}
          description={moreCopy.appLanguageDescription}
          headingId="more-app-language-title"
          testId="more-app-language"
        >
          <div className="grid grid-cols-3 gap-2">
            {(['en', 'pa', 'hi'] as const).map(option => {
              const selected = locale === option
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setLocale(option)}
                  aria-pressed={selected}
                  className={`interactive-focus min-h-[48px] rounded-lg border px-2 font-sans text-xs font-semibold ${
                    selected
                      ? 'border-saffron bg-saffron text-white'
                      : 'border-sand/15 text-ink dark:border-dark-text/10 dark:text-dark-text'
                  }`}
                >
                  {uiLocaleLabels[option]}
                </button>
              )
            })}
          </div>
        </SettingsBlock>
      </div>

          ) : null}
          {panel === 'reader' ? <div data-testid="more-reader-defaults" className="more-reader-panels">
            {readerSection === 'layout' ? <>
        <SettingsBlock
          title={moreCopy.scriptLayoutTitle}
          description={moreCopy.scriptLayoutDescription}
          headingId="more-script-layout-title"
          testId="more-script-layout"
          headingLevel={3}
        >
          <p className="font-sans text-sm text-ink dark:text-dark-text mb-2">{moreCopy.readingScript}</p>
          <div className="grid grid-cols-2 gap-2">
            {(['gurmukhi', 'devanagari'] as const).map(mode => {
              const selected = scriptMode === mode
              return (
                <button
                  key={mode}
                  onClick={() => setScriptMode(mode)}
                  aria-pressed={selected}
                  className={`rounded-lg px-3 py-3 font-sans text-xs font-medium min-h-[44px] transition-colors duration-200 ${
                    selected
                      ? 'bg-saffron text-white'
                      : 'bg-white/70 dark:bg-dark-card text-ink/70 dark:text-dark-text/70 border border-sand/15 dark:border-dark-text/10'
                  }`}
                >
                  {scriptModeLabels[mode]}
                </button>
              )
            })}
          </div>

          <div className="mt-4">
            <div className="flex justify-between mb-1">
            <label htmlFor="more-script-size" className="font-sans text-sm text-ink dark:text-dark-text">{moreCopy.scriptSize}</label>
            <span className="font-sans text-xs text-ink/68 dark:text-dark-text/64">{fontSize}px</span>
            </div>
            <input
              id="more-script-size"
              type="range"
              min={READER_TEXT_SIZE.min}
              max={READER_TEXT_SIZE.max}
              step={READER_TEXT_SIZE.step}
              value={fontSize}
              aria-valuetext={`${fontSize}px`}
              onChange={e => setFontSize(Number(e.target.value))}
              className="w-full min-h-[44px] accent-gold"
            />
            <div className="flex justify-between font-sans text-xs text-text-muted">
              <span>{commonCopy.small}</span><span>{commonCopy.large}</span>
            </div>
          </div>

          <fieldset className="mt-4">
            <legend className="mb-2 font-sans text-sm text-ink dark:text-dark-text">{settingsCopy.spacing}</legend>
            <div className="grid grid-cols-2 gap-2">
            {Object.entries(lineSpacingLabels).map(([key, label]) => {
              const selected = lineSpacing === key
              return (
                <button
                  key={key}
                  onClick={() => setLineSpacing(key as typeof lineSpacing)}
                  aria-pressed={selected}
                  className={`rounded-lg px-3 py-3 border min-h-[48px] font-sans text-xs font-medium ${
                    selected
                      ? 'bg-saffron text-white border-saffron'
                      : 'bg-white/70 dark:bg-dark-card border-sand/15 dark:border-dark-text/10 text-ink dark:text-dark-text'
                  }`}
                >
                  {label}
                </button>
              )
            })}
            </div>
          </fieldset>
          <fieldset className="mt-4">
            <legend className="mb-2 font-sans text-sm text-ink dark:text-dark-text">{settingsCopy.alignment}</legend>
            <div className="grid grid-cols-2 gap-2">
            {Object.entries(textAlignmentLabels).map(([key, label]) => {
              const selected = textAlign === key
              return (
                <button
                  key={key}
                  onClick={() => setTextAlign(key as typeof textAlign)}
                  aria-pressed={selected}
                  className={`rounded-lg px-2 py-3 font-sans text-xs font-medium min-h-[48px] ${
                    selected
                      ? 'bg-saffron text-white'
                      : 'bg-white/70 dark:bg-dark-card text-ink dark:text-dark-text border border-sand/15 dark:border-dark-text/10'
                  }`}
                >
                  {label}
                </button>
              )
            })}
            </div>
          </fieldset>
        </SettingsBlock>


            </> : null}
            {readerSection === 'support' ? <>
        <SettingsBlock
          title={moreCopy.readingSupportTitle}
          description={moreCopy.readingSupportDescription}
          headingId="more-reading-support-title"
          testId="more-reading-support"
          headingLevel={3}
        >
        <fieldset className="mb-4">
          <legend className="font-sans text-sm text-ink dark:text-dark-text mb-2">{presentationCopy.title}</legend>
          <div className="grid grid-cols-2 gap-2">
            {(['read', 'study'] as const).map(mode => <button key={mode} type="button"
              aria-pressed={presentation === mode} onClick={() => setReaderPresentationPreference(mode)}
              className={`interactive-focus min-h-[48px] rounded-lg border px-3 font-sans text-sm ${presentation === mode ? 'border-saffron bg-saffron text-white' : 'border-sand/15 text-ink dark:border-dark-text/10 dark:text-dark-text'}`}>
              {presentationCopy[mode]}
            </button>)}
          </div>
          <p className="mt-2 font-sans text-xs leading-5 text-text-muted">{presentationCopy.hint}</p>
          {!presentationSaved ? <p role="status" className="mt-2 font-sans text-sm leading-6 text-ink dark:text-dark-text">{settingsCopy.unsaved}</p> : null}
        </fieldset>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setShowTransliteration(!showTransliteration)}
            aria-pressed={showTransliteration}
            aria-describedby="more-study-support-note"
            className={`rounded-lg px-3 py-3 font-sans text-xs font-medium min-h-[48px] ${
              showTransliteration
                ? 'bg-saffron text-white'
                : 'bg-white/70 dark:bg-dark-card text-ink dark:text-dark-text border border-sand/15 dark:border-dark-text/10'
            }`}
          >
            {moreCopy.transliteration} {showTransliteration ? commonCopy.on : commonCopy.off}
          </button>
          <button
            onClick={() => setLarivaar(!larivaar)}
            aria-pressed={larivaar}
            className={`rounded-lg px-3 py-3 font-sans text-xs font-medium min-h-[48px] ${
              larivaar
                ? 'bg-saffron text-white'
                : 'bg-white/70 dark:bg-dark-card text-ink dark:text-dark-text border border-sand/15 dark:border-dark-text/10'
            }`}
          >
            {moreCopy.larivaar} {larivaar ? commonCopy.on : commonCopy.off}
          </button>
          <button
            onClick={() => setShowVishraam(!showVishraam)}
            aria-pressed={showVishraam}
            className={`rounded-lg px-3 py-3 font-sans text-xs font-medium min-h-[48px] ${
              showVishraam
                ? 'bg-saffron text-white'
                : 'bg-white/70 dark:bg-dark-card text-ink dark:text-dark-text border border-sand/15 dark:border-dark-text/10'
            }`}
          >
            {moreCopy.vishraam} {showVishraam ? commonCopy.on : commonCopy.off}
          </button>
        </div>

        <div className="mt-4">
          <p id="more-meaning-language" className="font-sans text-sm text-ink dark:text-dark-text mb-2">{moreCopy.meaningLanguage}</p>
          <p id="more-study-support-note" className="mb-2 font-sans text-xs leading-5 text-text-muted">{settingsCopy.studyOnly}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-labelledby="more-meaning-language" aria-describedby="more-study-support-note">
            {(['none', 'en', 'pa', 'hi'] as const).map(option => {
              const selected = meaningLanguage === option
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setMeaningLanguage(option)}
                  className={`rounded-lg px-2 py-3 border min-h-[48px] font-sans text-xs font-medium ${
                    selected
                      ? 'bg-saffron text-white border-saffron'
                      : 'bg-white/70 dark:bg-dark-card border-sand/15 dark:border-dark-text/10 text-ink dark:text-dark-text'
                  }`}
                >
                  {meaningLanguageLabels[option]}
                </button>
              )
            })}
          </div>
        </div>
        <fieldset className="mt-4" aria-describedby="more-study-support-note">
          <legend className="mb-2 font-sans text-sm text-ink dark:text-dark-text">{settingsCopy.supportSize}</legend>
          <div className="grid grid-cols-3 gap-2">
            {(['standard', 'large', 'extra-large'] as const).map(size => <button key={size} type="button"
              aria-pressed={supportTextSize === size} onClick={() => setSupportTextSize(size)}
              className={`interactive-focus min-h-[48px] rounded-lg border px-2 py-2 font-sans text-xs ${supportTextSize === size ? 'border-saffron bg-saffron text-white' : 'border-sand/15 text-ink dark:border-dark-text/10 dark:text-dark-text'}`}>
              {settingsCopy.supportSizes[size]}
            </button>)}
          </div>
        </fieldset>
        </SettingsBlock>


            </> : null}
            {readerSection !== 'sources' ? (
        <section className="more-reader-preview section-shell p-4" aria-labelledby="more-reader-preview-title" data-testid="more-reader-preview" data-support-text-size={supportTextSize} data-reader-presentation={presentation}>
          <h3 id="more-reader-preview-title" className="eyebrow mb-3">{settingsCopy.preview}</h3>
          <div style={{ textAlign }}>
            <p lang={getScriptTextLang(scriptMode)} className={`${getScriptTextFontClass(scriptMode)} text-ink dark:text-dark-text`} style={{ fontSize: `${fontSize}px`, lineHeight: lineSpacing === 'relaxed' ? 1.85 : 1.6 }}>
              {formatGurbaniText(SAMPLE_ONBOARDING_LINE.gurmukhi, { scriptMode, larivaar, showVishraam })}
            </p>
            {presentation === 'study' && showTransliteration ? <p data-reader-support="transliteration" lang="pa-Latn">{SAMPLE_ONBOARDING_LINE.transliteration}</p> : null}
            {presentation === 'study' && meaningLanguage !== 'none' ? <p data-reader-support="meaning" lang={meaningLanguage === 'pa' ? getScriptTextLang(scriptMode) : meaningLanguage} className={meaningLanguage === 'pa' ? getScriptTextFontClass(scriptMode) : meaningLanguage === 'hi' ? getScriptTextFontClass('devanagari') : 'font-sans'}>{meaningLanguage === 'pa' ? renderScriptText(SAMPLE_ONBOARDING_LINE.meaning.pa, scriptMode) : SAMPLE_ONBOARDING_LINE.meaning[meaningLanguage]}</p> : null}
          </div>
          <p className="mt-3 font-sans text-xs leading-5 text-text-muted">{settingsCopy.previewCaption}</p>
        </section>


            ) : null}
            {readerSection === 'sources' ? <>
        <SettingsBlock
          title={moreCopy.translationSourceTitle}
          description={moreCopy.translationSourceDescription}
          headingId="more-translation-source-title"
          testId="more-translation-source"
          headingLevel={3}
        >
          <p className="font-sans text-sm text-ink dark:text-dark-text mb-2">{moreCopy.englishTranslation}</p>
          <div className="grid gap-2">
            {Object.entries(englishSourceLabels).map(([key, label]) => {
              const selected = englishSource === key
              return (
                <button
                  key={key}
                  onClick={() => setEnglishSource(key as typeof englishSource)}
                  aria-pressed={selected}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-3 border min-h-[48px] ${
                    selected
                      ? 'bg-saffron text-white border-saffron'
                      : 'bg-white/70 dark:bg-dark-card border-sand/15 dark:border-dark-text/10 text-ink dark:text-dark-text'
                  }`}
                >
                  <span className="font-sans text-sm font-medium">{label}</span>
                  <span className="font-sans text-[10px] uppercase tracking-[0.18em] opacity-70">
                    {selected ? commonCopy.selected : commonCopy.tapToUse}
                  </span>
                </button>
              )
            })}
          </div>

          <p className="font-sans text-sm text-ink dark:text-dark-text mt-4 mb-2">{moreCopy.punjabiTranslation}</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(punjabiSourceLabels).map(([key, label]) => {
              const selected = punjabiSource === key
              return (
                <button
                  key={key}
                  onClick={() => setPunjabiSource(key as typeof punjabiSource)}
                  aria-pressed={selected}
                  className={`rounded-lg px-3 py-3 border min-h-[48px] font-sans text-xs font-medium ${
                    selected
                      ? 'bg-saffron text-white border-saffron'
                      : 'bg-white/70 dark:bg-dark-card border-sand/15 dark:border-dark-text/10 text-ink dark:text-dark-text'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>

          <p className="font-sans text-sm text-ink dark:text-dark-text mt-4 mb-2">{moreCopy.hindiTranslation}</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(hindiSourceLabels).map(([key, label]) => {
              const selected = hindiSource === key
              return (
                <button
                  key={key}
                  onClick={() => setHindiSource(key as typeof hindiSource)}
                  aria-pressed={selected}
                  className={`rounded-lg px-3 py-3 border min-h-[48px] font-sans text-xs font-medium ${
                    selected
                      ? 'bg-saffron text-white border-saffron'
                      : 'bg-white/70 dark:bg-dark-card border-sand/15 dark:border-dark-text/10 text-ink dark:text-dark-text'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>

          <p className="font-sans text-sm text-ink dark:text-dark-text mt-4 mb-2">{moreCopy.visraamSource}</p>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(visraamSourceLabels).map(([key, label]) => {
              const selected = visraamSource === key
              return (
                <button
                  key={key}
                  onClick={() => setVisraamSource(key as typeof visraamSource)}
                  aria-pressed={selected}
                  className={`rounded-lg px-3 py-3 border min-h-[48px] font-sans text-xs font-medium ${
                    selected
                      ? 'bg-saffron text-white border-saffron'
                      : 'bg-white/70 dark:bg-dark-card border-sand/15 dark:border-dark-text/10 text-ink dark:text-dark-text'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </SettingsBlock>

            </> : null}
          </div> : null}
          {panel === 'backup' ? <PersonalDataPanel /> : null}
          {panel === 'account' ? <CloudSyncPanel embedded /> : null}
          {panel === 'sound' ? <SoundscapeControls context="study" variant="full" storageKey="more-soundscapes-sheet" defaultExpanded /> : null}
          {panel === 'about' ? (
      <section className="more-about section-shell p-4" aria-labelledby="more-about-title" data-testid="more-about">
        <h2 id="more-about-title" className="eyebrow mb-3">{moreCopy.about}</h2>
        <p className="font-sans text-sm text-ink/70 dark:text-dark-text/70">
          {editorial?.more.aboutBody ?? moreCopy.aboutBody}
        </p>
        <p className="font-sans text-xs text-ink/68 dark:text-dark-text/64 mt-2">
          {hub.sourceContext}
        </p>
        <p className="font-sans text-xs text-ink/68 dark:text-dark-text/64 mt-2">
          {cloudConfigured ? settingsCopy.cloudTrust : settingsCopy.deviceTrust}
        </p>
        <button
          type="button"
          onClick={() => { setPanel(null); openOnboarding() }}
          className="interactive-focus interactive-pill-link mt-4 min-h-[48px] w-full gap-2 rounded-lg border border-sand/20 px-4 font-sans text-sm font-semibold text-ink dark:border-dark-text/15 dark:text-dark-text"
          data-testid="more-open-onboarding"
        >
          {moreCopy.reopenOnHome}
          <IconArrowRight size={14} />
        </button>
      </section>
          ) : null}
        </div>
      </ModalSheet> : null}
      {artworkSettingsOpen ? <Suspense fallback={<div role="status" className="sr-only">{hub.loadingArtwork}</div>}><HomeArtworkSettings open onClose={() => setArtworkSettingsOpen(false)} /></Suspense> : null}
    </div>
  )
}
