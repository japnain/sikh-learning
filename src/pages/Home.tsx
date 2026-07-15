import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { TouchEvent as ReactTouchEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  IconArrowRight,
  IconBookmark,
  IconBookmarkFilled,
  IconCheck,
  IconLibrary,
  IconMoon,
  IconMoreHorizontal,
  IconSun,
} from '../components/icons'
import NaamRasLogoMark from '../components/NaamRasLogoMark'
import StreakBadge from '../components/StreakBadge'
import { useHukamnama } from '../hooks/useHukamnama'
import { useCurrentTime } from '../hooks/useCurrentTime'
import { useBookmarksStore } from '../store/bookmarks'
import { useFavoritesStore } from '../store/favorites'
import { useLanguageStore } from '../store/language'
import { useLocaleStore } from '../store/locale'
import { useOnboardingStore } from '../store/onboarding'
import { useProgressStore } from '../store/progress'
import { useSundarGutkaLengthStore } from '../store/sundarGutkaLength'
import { useThemeStore } from '../store/theme'
import { buildNitnemStudyPath, NITNEM_ROUTE_OPTIONS, type NitnemRouteOption, useNitemStore } from '../store/nitnem'
import { useVocabStore } from '../store/vocab'
import { buildVocabFeedbackId, useSavedFeedbackStore, type SavedFeedbackKind } from '../store/savedFeedback'
import type { UiLocale, VocabEntry } from '../types'
import {
  getEntryMeaningText,
  getLineMeaningText,
  getScriptTextFontClass,
  getScriptTextLang,
  isStructuralTitleLine,
  renderScriptText,
} from '../utils/readerDisplay'
import { getSundarGutkaLengthDetail, isSundarGutkaLengthSupportedBaniId } from '../utils/sundarGutkaLength'
import { getUiCopy } from '../utils/uiCopy'
import { formatUiDate } from '../utils/formatUiDate'
import { toLocalDayStamp } from '../utils/localDates'
import { buildSavedStudyPath } from '../utils/savedStudyPath'
import { getEditorialCopy } from '../content/editorialCopy'
import heroEclipseSrc from '../assets/home-eclipse/hero-eclipse.avif'
import savedMuralSrc from '../assets/living-library/saved-mural-landscape.avif'

const HOME_SPOTLIGHT_HIGHLIGHT_CLASSES = [
  'border-gold/45',
  'shadow-gold-strong',
  'ring-2',
  'ring-gold/35',
  'ring-offset-2',
  'ring-offset-parchment',
  'dark:ring-offset-dark-bg',
]

const SOURCE_SHORT_NAME: Record<string, string> = {
  G: 'SGGS',
  D: 'DG',
  B: 'BGV',
  A: 'AK',
}

type HomeSavedPreviewItem = {
  id: string
  kind: 'passage' | 'vocab'
  feedbackKind: SavedFeedbackKind
  label: string
  title: string
  detail: string
  path: string
  meta?: string
}

const HOME_SAVED_PREVIEW_APPEARANCE: Record<
  HomeSavedPreviewItem['kind'],
  {
    icon: typeof IconLibrary
    badgeClassName: string
    surfaceClassName: string
    detailClassName: string
  }
> = {
  passage: {
    icon: IconBookmarkFilled,
    badgeClassName: 'bg-saffron/12 text-saffron dark:bg-saffron/12 dark:text-saffron-light',
    surfaceClassName: 'border-saffron/14 bg-parchment-card dark:border-saffron/18 dark:bg-dark-card',
    detailClassName: 'text-saffron dark:text-saffron-light',
  },
  vocab: {
    icon: IconCheck,
    badgeClassName: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/14 dark:text-emerald-300',
    surfaceClassName: 'border-emerald-500/14 bg-parchment-card dark:border-emerald-500/20 dark:bg-dark-card',
    detailClassName: 'text-ink/70 dark:text-dark-text/70',
  },
}

function formatSavedPassageReference(source: string, ang: number, verseId?: number): string {
  const sourceLabel = SOURCE_SHORT_NAME[source] ?? source.toUpperCase()
  return verseId ? `${sourceLabel} · Ang ${ang} · Verse ${verseId}` : `${sourceLabel} · Ang ${ang}`
}

function compareSavedAtDesc(
  left: { savedAt: string },
  right: { savedAt: string }
): number {
  return new Date(right.savedAt).getTime() - new Date(left.savedAt).getTime()
}

function getVocabPreviewDetail(entry: VocabEntry, locale: UiLocale): string {
  if (locale === 'pa' && entry.meaning_pa.trim()) return entry.meaning_pa
  if (locale === 'hi' && entry.meaning_hi.trim()) return entry.meaning_hi
  if (entry.meaning_en.trim()) return entry.meaning_en
  if (entry.transliteration.trim()) return entry.transliteration
  return entry.scripture
}

function formatHukamnamaDate(locale: UiLocale, date: string): string {
  const parsed = new Date(`${date}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  const dateLabel = formatUiDate(locale, parsed)
  return locale === 'en'
    ? `${dateLabel}, ${parsed.getFullYear()}`
    : `${dateLabel} ${parsed.getFullYear()}`
}

type HomeMessages = {
  brandTagline: string
  readingPreferences: string
  streakLabel: (streak: number) => string
  pathReceive: string
  pathPractice: string
  pathKeep: string
  heroArtworkAlt: string
  artworkUnavailable: string
  loadingHukamnama: string
  todaysHukamnama: string
  earlierHukamnama: (date: string) => string
  liveReading: string
  availableOffline: string
  olderReading: string
  refresh: string
  refreshing: string
  retry: string
  hukamnamaUnavailable: string
  hukamnamaUnavailableBody: string
  browseRead: string
  readHukamnama: string
  angLabel: string
  dailyNitnem: string
  nitnemHeroTitle: string
  nitnemCarouselLabel: (index: number, total: number) => string
  nitnemPosition: (index: number, total: number) => string
  nitnemCompletion: (completed: number) => string
  nitnemProgressValue: (completed: number, total: number) => string
  nitnemCarousel: string
  previousBani: string
  nextBani: string
  groupLabel: Record<NitnemRouteOption['group'], string>
  groupDetail: Record<NitnemRouteOption['group'], string>
  currentBani: string
  beginNitnem: string
  customizeNitnemShort: string
  customizeNitnem: string
  chooseNitnemBody: string
  savedJustNow: string
  savedPreview: string
  savedEmptyTitle: string
  savedEmptyBody: string
  savedArtworkAlt: string
  savedNotice: Record<SavedFeedbackKind, string>
}

const HOME_MESSAGES: Record<UiLocale, HomeMessages> = {
  en: {
    brandTagline: 'Read. Reflect. Return.',
    readingPreferences: 'Reading preferences',
    streakLabel: streak => streak === 0 ? 'Begin today' : `${streak} day${streak === 1 ? '' : 's'}`,
    pathReceive: 'Receive',
    pathPractice: 'Practice',
    pathKeep: 'Keep',
    heroArtworkAlt: 'Painted landscape with an eclipse, mountains, a fire, travelers, and a white domed building.',
    artworkUnavailable: 'Artwork unavailable. The Hukamnama remains available below.',
    loadingHukamnama: "Loading the Hukamnama and its source details.",
    todaysHukamnama: "Today's Hukamnama",
    earlierHukamnama: date => `Hukamnama for ${date}`,
    liveReading: 'Current reading',
    availableOffline: 'Available offline',
    olderReading: 'Earlier reading',
    refresh: 'Refresh',
    refreshing: 'Refreshing',
    retry: 'Try again',
    hukamnamaUnavailable: 'Hukamnama unavailable',
    hukamnamaUnavailableBody: "We couldn't load the Hukamnama or a saved copy. Try again, or continue into Read.",
    browseRead: 'Open Read',
    readHukamnama: 'Read Hukamnama',
    angLabel: 'Ang',
    dailyNitnem: 'Daily Nitnem',
    nitnemHeroTitle: 'Anchor the day in Nitnem.',
    nitnemCarouselLabel: (index, total) => `Nitnem card ${index} of ${total}`,
    nitnemPosition: (index, total) => `Bani ${index} of ${total}`,
    nitnemCompletion: completed => `${completed} complete`,
    nitnemProgressValue: (completed, total) => `${completed} of ${total} daily banis complete`,
    nitnemCarousel: 'Daily Nitnem selected banis',
    previousBani: 'Previous Nitnem bani',
    nextBani: 'Next Nitnem bani',
    groupLabel: { Morning: 'Morning', Evening: 'Evening', Night: 'Night', Additional: 'Additional' },
    groupDetail: { Morning: 'Morning bani.', Evening: 'Evening bani.', Night: 'Night bani.', Additional: 'Additional bani.' },
    currentBani: 'Current bani',
    beginNitnem: 'Begin Nitnem',
    customizeNitnemShort: 'Customize',
    customizeNitnem: 'Customize Daily Nitnem',
    chooseNitnemBody: 'Choose the banis that should appear in your daily Nitnem ritual.',
    savedJustNow: 'Saved just now',
    savedPreview: 'Saved preview',
    savedEmptyTitle: 'Nothing saved yet',
    savedEmptyBody: 'Open Read and save a passage or word. Your most recent return points will appear here.',
    savedArtworkAlt: 'Narrative mural with a gateway, gathering figures, instruments, and landscape scenes.',
    savedNotice: {
      bookmark: 'Bookmarked passage added to the shelf.',
      favorite: 'Favorite added to the shelf.',
      review: 'Review Bank updated.',
    },
  },
  pa: {
    brandTagline: 'ਪੜ੍ਹੋ · ਵਿਚਾਰੋ · ਮੁੜ ਆਓ',
    readingPreferences: 'ਪੜ੍ਹਨ ਦੀਆਂ ਪਸੰਦਾਂ',
    streakLabel: streak => streak === 0 ? 'ਅੱਜ ਸ਼ੁਰੂ ਕਰੋ' : `${streak} ਦਿਨ`,
    pathReceive: 'ਪ੍ਰਾਪਤ',
    pathPractice: 'ਅਭਿਆਸ',
    pathKeep: 'ਸੰਭਾਲ',
    heroArtworkAlt: 'ਗ੍ਰਹਿਣ, ਪਹਾੜਾਂ, ਅੱਗ, ਯਾਤਰੀਆਂ ਅਤੇ ਚਿੱਟੀ ਗੁੰਬਦਦਾਰ ਇਮਾਰਤ ਵਾਲਾ ਚਿੱਤਰਿਤ ਦ੍ਰਿਸ਼।',
    artworkUnavailable: 'ਚਿੱਤਰ ਉਪਲਬਧ ਨਹੀਂ ਹੈ। ਹੁਕਮਨਾਮਾ ਹੇਠਾਂ ਉਪਲਬਧ ਹੈ।',
    loadingHukamnama: 'ਹੁਕਮਨਾਮਾ ਅਤੇ ਉਸ ਦੇ ਸਰੋਤ ਵੇਰਵੇ ਲੋਡ ਹੋ ਰਹੇ ਹਨ।',
    todaysHukamnama: 'ਅੱਜ ਦਾ ਹੁਕਮਨਾਮਾ',
    earlierHukamnama: date => `${date} ਦਾ ਹੁਕਮਨਾਮਾ`,
    liveReading: 'ਮੌਜੂਦਾ ਪਾਠ',
    availableOffline: 'ਆਫ਼ਲਾਈਨ ਉਪਲਬਧ',
    olderReading: 'ਪਿਛਲਾ ਪਾਠ',
    refresh: 'ਤਾਜ਼ਾ ਕਰੋ',
    refreshing: 'ਤਾਜ਼ਾ ਹੋ ਰਿਹਾ ਹੈ',
    retry: 'ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ',
    hukamnamaUnavailable: 'ਹੁਕਮਨਾਮਾ ਉਪਲਬਧ ਨਹੀਂ',
    hukamnamaUnavailableBody: 'ਹੁਕਮਨਾਮਾ ਜਾਂ ਸੰਭਾਲੀ ਕਾਪੀ ਲੋਡ ਨਹੀਂ ਹੋ ਸਕੀ। ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ ਜਾਂ ਪੜ੍ਹੋ ਖੋਲ੍ਹੋ।',
    browseRead: 'ਪੜ੍ਹੋ ਖੋਲ੍ਹੋ',
    readHukamnama: 'ਹੁਕਮਨਾਮਾ ਪੜ੍ਹੋ',
    angLabel: 'ਅੰਗ',
    dailyNitnem: 'ਰੋਜ਼ਾਨਾ ਨਿਤਨੇਮ',
    nitnemHeroTitle: 'ਨਿਤਨੇਮ ਨਾਲ ਦਿਨ ਨੂੰ ਅਡੋਲ ਕਰੋ।',
    nitnemCarouselLabel: (index, total) => `ਨਿਤਨੇਮ ਕਾਰਡ ${index} / ${total}`,
    nitnemPosition: (index, total) => `ਬਾਣੀ ${index} / ${total}`,
    nitnemCompletion: completed => `${completed} ਪੂਰੀਆਂ`,
    nitnemProgressValue: (completed, total) => `${total} ਵਿੱਚੋਂ ${completed} ਰੋਜ਼ਾਨਾ ਬਾਣੀਆਂ ਪੂਰੀਆਂ`,
    nitnemCarousel: 'ਚੁਣੀਆਂ ਹੋਈਆਂ ਰੋਜ਼ਾਨਾ ਨਿਤਨੇਮ ਬਾਣੀਆਂ',
    previousBani: 'ਪਿਛਲੀ ਨਿਤਨੇਮ ਬਾਣੀ',
    nextBani: 'ਅਗਲੀ ਨਿਤਨੇਮ ਬਾਣੀ',
    groupLabel: { Morning: 'ਸਵੇਰ', Evening: 'ਸ਼ਾਮ', Night: 'ਰਾਤ', Additional: 'ਵਾਧੂ' },
    groupDetail: { Morning: 'ਸਵੇਰ ਦੀ ਬਾਣੀ।', Evening: 'ਸ਼ਾਮ ਦੀ ਬਾਣੀ।', Night: 'ਰਾਤ ਦੀ ਬਾਣੀ।', Additional: 'ਵਾਧੂ ਬਾਣੀ।' },
    currentBani: 'ਮੌਜੂਦਾ ਬਾਣੀ',
    beginNitnem: 'ਨਿਤਨੇਮ ਸ਼ੁਰੂ ਕਰੋ',
    customizeNitnemShort: 'ਸੰਵਾਰੋ',
    customizeNitnem: 'ਰੋਜ਼ਾਨਾ ਨਿਤਨੇਮ ਸੰਵਾਰੋ',
    chooseNitnemBody: 'ਉਹ ਬਾਣੀਆਂ ਚੁਣੋ ਜੋ ਤੁਹਾਡੇ ਰੋਜ਼ਾਨਾ ਨਿਤਨੇਮ ਵਿੱਚ ਦਿਸਣੀਆਂ ਚਾਹੀਦੀਆਂ ਹਨ।',
    savedJustNow: 'ਹੁਣੇ ਸੰਭਾਲਿਆ',
    savedPreview: 'ਸੰਭਾਲੀ ਝਲਕ',
    savedEmptyTitle: 'ਹਾਲੇ ਕੁਝ ਸੰਭਾਲਿਆ ਨਹੀਂ',
    savedEmptyBody: 'ਪੜ੍ਹੋ ਖੋਲ੍ਹ ਕੇ ਕੋਈ ਪੰਕਤੀ ਜਾਂ ਸ਼ਬਦ ਸੰਭਾਲੋ। ਤੁਹਾਡੇ ਹਾਲੀਆ ਵਾਪਸੀ ਬਿੰਦੂ ਇੱਥੇ ਦਿਸਣਗੇ।',
    savedArtworkAlt: 'ਦਰਵਾਜ਼ੇ, ਇਕੱਠੇ ਹੋਏ ਲੋਕਾਂ, ਸਾਜ਼ਾਂ ਅਤੇ ਕੁਦਰਤੀ ਦ੍ਰਿਸ਼ਾਂ ਵਾਲਾ ਕਥਾਤਮਕ ਮਿਊਰਲ।',
    savedNotice: {
      bookmark: 'ਬੁੱਕਮਾਰਕ ਕੀਤੀ ਪੰਕਤੀ ਸੰਭਾਲੀ ਗਈ।',
      favorite: 'ਮਨਪਸੰਦ ਸੰਭਾਲਿਆ ਗਿਆ।',
      review: 'ਦੁਹਰਾਈ ਬੈਂਕ ਤਾਜ਼ਾ ਹੋਇਆ।',
    },
  },
  hi: {
    brandTagline: 'पढ़ें · विचार करें · लौटें',
    readingPreferences: 'पढ़ने की पसंद',
    streakLabel: streak => streak === 0 ? 'आज शुरू करें' : `${streak} दिन`,
    pathReceive: 'ग्रहण',
    pathPractice: 'अभ्यास',
    pathKeep: 'सहेजें',
    heroArtworkAlt: 'ग्रहण, पहाड़ों, अग्नि, यात्रियों और सफेद गुंबददार इमारत वाला चित्रित दृश्य।',
    artworkUnavailable: 'चित्र उपलब्ध नहीं है। हुकमनामा नीचे उपलब्ध है।',
    loadingHukamnama: 'हुकमनामा और उसके स्रोत विवरण लोड हो रहे हैं।',
    todaysHukamnama: 'आज का हुकमनामा',
    earlierHukamnama: date => `${date} का हुकमनामा`,
    liveReading: 'वर्तमान पाठ',
    availableOffline: 'ऑफ़लाइन उपलब्ध',
    olderReading: 'पिछला पाठ',
    refresh: 'ताज़ा करें',
    refreshing: 'ताज़ा हो रहा है',
    retry: 'फिर कोशिश करें',
    hukamnamaUnavailable: 'हुकमनामा उपलब्ध नहीं',
    hukamnamaUnavailableBody: 'हुकमनामा या सहेजी हुई प्रति लोड नहीं हो सकी। फिर कोशिश करें या पढ़ें खोलें।',
    browseRead: 'पढ़ें खोलें',
    readHukamnama: 'हुकमनामा पढ़ें',
    angLabel: 'अंग',
    dailyNitnem: 'दैनिक नितनेम',
    nitnemHeroTitle: 'नितनेम से दिन को स्थिर करो।',
    nitnemCarouselLabel: (index, total) => `नितनेम कार्ड ${index} / ${total}`,
    nitnemPosition: (index, total) => `बानी ${index} / ${total}`,
    nitnemCompletion: completed => `${completed} पूर्ण`,
    nitnemProgressValue: (completed, total) => `${total} में से ${completed} दैनिक बानियाँ पूर्ण`,
    nitnemCarousel: 'चुनी हुई दैनिक नितनेम बानियाँ',
    previousBani: 'पिछली नितनेम बानी',
    nextBani: 'अगली नितनेम बानी',
    groupLabel: { Morning: 'सुबह', Evening: 'शाम', Night: 'रात', Additional: 'अतिरिक्त' },
    groupDetail: { Morning: 'सुबह की बानी।', Evening: 'शाम की बानी।', Night: 'रात की बानी।', Additional: 'अतिरिक्त बानी।' },
    currentBani: 'वर्तमान बानी',
    beginNitnem: 'नितनेम शुरू करें',
    customizeNitnemShort: 'बदलें',
    customizeNitnem: 'दैनिक नितनेम बदलें',
    chooseNitnemBody: 'वे बानियाँ चुनें जो आपके दैनिक नितनेम में दिखाई दें।',
    savedJustNow: 'अभी सहेजा',
    savedPreview: 'सहेजी झलक',
    savedEmptyTitle: 'अभी कुछ सहेजा नहीं',
    savedEmptyBody: 'पढ़ें खोलकर कोई पंक्ति या शब्द सहेजें। आपके हाल के वापसी बिंदु यहाँ दिखाई देंगे।',
    savedArtworkAlt: 'द्वार, एकत्र लोगों, वाद्ययंत्रों और प्राकृतिक दृश्यों वाला कथात्मक भित्तिचित्र।',
    savedNotice: {
      bookmark: 'बुकमार्क किया अंश सहेजा गया।',
      favorite: 'पसंदीदा सहेजा गया।',
      review: 'रिव्यू बैंक अपडेट हुआ।',
    },
  },
}

export default function Home() {
  const location = useLocation()
  const navigate = useNavigate()
  const streak = useProgressStore(state => state.streak)
  const scriptMode = useLanguageStore(s => s.scriptMode)
  const showTransliteration = useLanguageStore(s => s.showTransliteration)
  const meaningLanguage = useLanguageStore(s => s.meaningLanguage)
  const englishSource = useLanguageStore(s => s.englishSource)
  const locale = useLocaleStore(s => s.locale)
  const {
    completedDate,
    completedIds,
    completionTrackingEnabled,
    selectedIds,
    resetIfNewDay,
  } = useNitemStore()
  const bookmarks = useBookmarksStore(state => state.bookmarks)
  const favorites = useFavoritesStore(state => state.favorites)
  const vocab = useVocabStore(s => s.vocab)
  const lastSaved = useSavedFeedbackStore(state => state.lastSaved)
  const {
    openOnboarding,
  } = useOnboardingStore()
  const copy = getUiCopy(locale)
  const editorial = getEditorialCopy(locale)
  const homeCopy = copy.home
  const libraryCopy = copy.library
  const homeMessages = HOME_MESSAGES[locale]
  const nitnemSpotlightRef = useRef<HTMLElement | null>(null)
  const nitnemCarouselRef = useRef<HTMLDivElement | null>(null)
  const nitnemScrollTimeoutRef = useRef<number | null>(null)
  const nitnemMomentSyncedRef = useRef(false)
  const nitnemUserScrollRef = useRef(false)
  const nitnemSwipeRef = useRef<{ pointerId: number; startX: number; startY: number; handled: boolean } | null>(null)
  const [heroImageFailed, setHeroImageFailed] = useState(false)
  const sundarGutkaLengths = useSundarGutkaLengthStore(state => state.lengths)
  const now = useCurrentTime()
  const homeNow = useMemo(() => new Date(now), [now])
  const homeDateLabel = useMemo(() => formatUiDate(locale, homeNow), [homeNow, locale])
  const getNitnemOptionDetail = (option: NitnemRouteOption) => (
    locale !== 'en'
      ? homeMessages.groupDetail[option.group]
      : option.supportsLengthAdjustment && isSundarGutkaLengthSupportedBaniId(option.baseBaniId)
      ? getSundarGutkaLengthDetail(sundarGutkaLengths[option.baseBaniId])
      : option.detail
  )

  useEffect(() => {
    resetIfNewDay()
  }, [resetIfNewDay])

  useEffect(() => {
    const state = (location.state as {
      reopenOnboarding?: boolean
      highlightTodayPath?: boolean
    } | null) ?? null

    if (!state?.reopenOnboarding && !state?.highlightTodayPath) return

    let highlightTimer: number | null = null

    if (state.reopenOnboarding) {
      openOnboarding()
    }

    if (state.highlightTodayPath) {
      globalThis.requestAnimationFrame(() => {
        nitnemSpotlightRef.current?.classList.add(...HOME_SPOTLIGHT_HIGHLIGHT_CLASSES)
        nitnemSpotlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
      highlightTimer = window.setTimeout(() => {
        nitnemSpotlightRef.current?.classList.remove(...HOME_SPOTLIGHT_HIGHLIGHT_CLASSES)
      }, 2600)
    }

    navigate(location.pathname, { replace: true, state: null })

    return () => {
      if (highlightTimer !== null) {
        window.clearTimeout(highlightTimer)
      }
    }
  }, [location.pathname, location.state, navigate, openOnboarding])

  const {
    data: hukamnama,
    loading: hukamnamaLoading,
    refreshing: hukamnamaRefreshing,
    isCached: hukamnamaIsCached,
    isOlder: hookReportsOlderHukamnama,
    retry: retryHukamnama,
  } = useHukamnama()

  const selectedNitnemOptions = useMemo(() => {
    return selectedIds
      .map(optionId => NITNEM_ROUTE_OPTIONS.find(option => option.id === optionId) ?? null)
      .filter((option): option is NitnemRouteOption => option !== null)
  }, [selectedIds])
  const nitnemMoment = useMemo<NitnemRouteOption['group']>(() => {
    const hour = new Date(now).getHours()
    if (hour >= 21) return 'Night'
    if (hour >= 16) return 'Evening'
    return 'Morning'
  }, [now])
  const preferredNitnemIndex = useMemo(() => {
    const momentIndex = selectedNitnemOptions.findIndex(option => option.group === nitnemMoment)
    return momentIndex >= 0 ? momentIndex : 0
  }, [nitnemMoment, selectedNitnemOptions])
  const [activeNitnemIndex, setActiveNitnemIndex] = useState(preferredNitnemIndex)
  const safeNitnemIndex = selectedNitnemOptions.length > 0
    ? Math.max(0, Math.min(activeNitnemIndex, selectedNitnemOptions.length - 1))
    : 0
  const activeNitnemOption = selectedNitnemOptions[safeNitnemIndex]
    ?? selectedNitnemOptions[preferredNitnemIndex]
    ?? selectedNitnemOptions[0]
    ?? null
  const nitnemHasCarousel = selectedNitnemOptions.length > 1
  const nitnemCompletedCount = useMemo(() => {
    if (!completionTrackingEnabled || completedDate !== toLocalDayStamp(homeNow)) return 0
    const completed = new Set(completedIds)
    return selectedNitnemOptions.filter(option => completed.has(option.id)).length
  }, [completedDate, completedIds, completionTrackingEnabled, homeNow, selectedNitnemOptions])
  const nitnemPositionLabel = homeMessages.nitnemPosition(
    safeNitnemIndex + 1,
    selectedNitnemOptions.length
  )

  useEffect(() => {
    if (selectedNitnemOptions.length === 0) return

    setActiveNitnemIndex(currentIndex => {
      if (!nitnemMomentSyncedRef.current) {
        nitnemMomentSyncedRef.current = true
        return preferredNitnemIndex
      }

      return Math.max(0, Math.min(currentIndex, selectedNitnemOptions.length - 1))
    })
  }, [preferredNitnemIndex, selectedNitnemOptions.length])

  const scrollNitnemCarouselTo = useCallback((index: number, behavior: ScrollBehavior = 'auto') => {
    const carousel = nitnemCarouselRef.current
    const target = carousel?.querySelector<HTMLElement>(`[data-nitnem-index="${index}"]`)
    if (!carousel || !target) return
    const firstCard = carousel.querySelector<HTMLElement>('[data-nitnem-index]')
    const left = Math.max(0, target.offsetLeft - (firstCard?.offsetLeft ?? 0))
    if (typeof carousel.scrollTo === 'function') {
      carousel.scrollTo({ left, behavior })
      return
    }
    carousel.scrollLeft = left
  }, [])

  const setNitnemCarouselIndex = useCallback((index: number) => {
    if (selectedNitnemOptions.length === 0) return
    const boundedIndex = ((index % selectedNitnemOptions.length) + selectedNitnemOptions.length) % selectedNitnemOptions.length
    if (boundedIndex === safeNitnemIndex) {
      window.requestAnimationFrame(() => scrollNitnemCarouselTo(boundedIndex, 'smooth'))
      return
    }
    nitnemUserScrollRef.current = true
    setActiveNitnemIndex(boundedIndex)
  }, [safeNitnemIndex, scrollNitnemCarouselTo, selectedNitnemOptions.length])

  useEffect(() => {
    if (!nitnemHasCarousel) return undefined
    const behavior: ScrollBehavior = nitnemUserScrollRef.current ? 'smooth' : 'auto'
    nitnemUserScrollRef.current = false
    const frame = window.requestAnimationFrame(() => scrollNitnemCarouselTo(safeNitnemIndex, behavior))
    return () => window.cancelAnimationFrame(frame)
  }, [nitnemHasCarousel, safeNitnemIndex, scrollNitnemCarouselTo])

  useEffect(() => {
    return () => {
      if (nitnemScrollTimeoutRef.current) {
        window.clearTimeout(nitnemScrollTimeoutRef.current)
      }
    }
  }, [])

  const handleNitnemCarouselScroll = () => {
    const carousel = nitnemCarouselRef.current
    if (!carousel || !nitnemHasCarousel) return

    if (nitnemScrollTimeoutRef.current) {
      window.clearTimeout(nitnemScrollTimeoutRef.current)
    }

    nitnemScrollTimeoutRef.current = window.setTimeout(() => {
      const cards = Array.from(carousel.querySelectorAll<HTMLElement>('[data-nitnem-index]'))
      const firstCardOffset = cards[0]?.offsetLeft ?? 0
      const nearestCard = cards.reduce<HTMLElement | null>((nearest, card) => {
        if (!nearest) return card
        const cardDistance = Math.abs((card.offsetLeft - firstCardOffset) - carousel.scrollLeft)
        const nearestDistance = Math.abs((nearest.offsetLeft - firstCardOffset) - carousel.scrollLeft)
        return cardDistance < nearestDistance
          ? card
          : nearest
      }, null)
      const nextIndex = Number(nearestCard?.dataset.nitnemIndex ?? 0)
      setActiveNitnemIndex(Math.max(0, Math.min(nextIndex, selectedNitnemOptions.length - 1)))
    }, 80)
  }

  const handleNitnemPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!nitnemHasCarousel) return
    if (event.pointerType === 'mouse' && event.button !== 0) return

    nitnemSwipeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      handled: false,
    }
  }, [nitnemHasCarousel])

  const completeNitnemSwipeFromPoint = useCallback((clientX: number, clientY: number) => {
    const swipe = nitnemSwipeRef.current
    if (!swipe || swipe.handled) return false

    const deltaX = clientX - swipe.startX
    const deltaY = clientY - swipe.startY
    if (Math.abs(deltaX) < 36 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.2) return false

    swipe.handled = true
    setNitnemCarouselIndex(safeNitnemIndex + (deltaX < 0 ? 1 : -1))
    return true
  }, [safeNitnemIndex, setNitnemCarouselIndex])

  const handleNitnemPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const swipe = nitnemSwipeRef.current
    if (!swipe || swipe.pointerId !== event.pointerId) return
    if (completeNitnemSwipeFromPoint(event.clientX, event.clientY)) {
      event.currentTarget.setPointerCapture?.(event.pointerId)
      event.preventDefault()
    }
  }, [completeNitnemSwipeFromPoint])

  const handleNitnemPointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const swipe = nitnemSwipeRef.current
    if (swipe?.pointerId === event.pointerId && completeNitnemSwipeFromPoint(event.clientX, event.clientY)) {
      event.preventDefault()
    }
    if (nitnemSwipeRef.current?.pointerId === event.pointerId) {
      nitnemSwipeRef.current = null
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture?.(event.pointerId)
      }
    }
  }, [completeNitnemSwipeFromPoint])

  const handleNitnemPointerCancel = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const swipe = nitnemSwipeRef.current
    if (swipe?.pointerId === event.pointerId) {
      nitnemSwipeRef.current = null
    }
  }, [])

  const handleNitnemTouchStart = useCallback((event: ReactTouchEvent<HTMLDivElement>) => {
    if (!nitnemHasCarousel) return
    const touch = event.touches[0]
    if (!touch) return
    nitnemSwipeRef.current = {
      pointerId: -1,
      startX: touch.clientX,
      startY: touch.clientY,
      handled: false,
    }
  }, [nitnemHasCarousel])

  const handleNitnemTouchMove = useCallback((event: ReactTouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0]
    if (!touch || nitnemSwipeRef.current?.pointerId !== -1) return
    if (completeNitnemSwipeFromPoint(touch.clientX, touch.clientY)) {
      event.preventDefault()
    }
  }, [completeNitnemSwipeFromPoint])

  const handleNitnemTouchEnd = useCallback((event: ReactTouchEvent<HTMLDivElement>) => {
    const touch = event.changedTouches[0]
    if (touch && nitnemSwipeRef.current?.pointerId === -1 && completeNitnemSwipeFromPoint(touch.clientX, touch.clientY)) {
      event.preventDefault()
    }
    if (nitnemSwipeRef.current?.pointerId === -1) {
      nitnemSwipeRef.current = null
    }
  }, [completeNitnemSwipeFromPoint])
  const savedBookmarks = bookmarks.length
  const savedFavorites = favorites.length
  const savedReviewItems = vocab.length
  const hasSavedContent = savedBookmarks + savedFavorites + savedReviewItems > 0
  const isDarkTheme = useThemeStore(s => s.dark)
  const toggleTheme = useThemeStore(s => s.toggle)
  const savedShelfNotice = lastSaved ? homeMessages.savedNotice[lastSaved.kind] : null

  const hukamnamaPreviewLine = useMemo(() => {
    if (!hukamnama) return null
    return hukamnama.entry.lines?.find(line => !line.isHeader && line.gurmukhi.trim() && !isStructuralTitleLine(line.gurmukhi))
      ?? hukamnama.entry.lines?.find(line => !line.isHeader && line.gurmukhi.trim())
      ?? hukamnama.entry.lines?.find(line => line.gurmukhi.trim())
      ?? null
  }, [hukamnama])
  const hukamnamaTransliterationPreview = useMemo(() => {
    if (!hukamnama || !showTransliteration) return ''
    return hukamnamaPreviewLine?.transliteration || hukamnama.entry.transliteration
  }, [hukamnama, hukamnamaPreviewLine?.transliteration, showTransliteration])
  const hukamnamaMeaningPreview = useMemo(() => {
    if (!hukamnama || meaningLanguage === 'none') return ''
    return hukamnamaPreviewLine
      ? getLineMeaningText(hukamnamaPreviewLine, meaningLanguage, englishSource)
      : getEntryMeaningText(hukamnama.entry, meaningLanguage, englishSource)
  }, [englishSource, hukamnama, hukamnamaPreviewLine, meaningLanguage])
  const hukamnamaDateLabel = hukamnama ? formatHukamnamaDate(locale, hukamnama.date) : ''
  const hukamnamaIsOlder = Boolean(
    hukamnama
    && (hookReportsOlderHukamnama || hukamnama.date !== toLocalDayStamp(homeNow))
  )
  const hukamnamaTitle = hukamnamaIsOlder
    ? homeMessages.earlierHukamnama(hukamnamaDateLabel)
    : homeMessages.todaysHukamnama
  const hukamnamaStateLabel = hukamnamaIsCached
    ? homeMessages.availableOffline
    : hukamnamaIsOlder
      ? homeMessages.olderReading
      : homeMessages.liveReading
  const savedPreviewItems = useMemo<HomeSavedPreviewItem[]>(() => {
    const previewItems: HomeSavedPreviewItem[] = []

    const latestSavedPassage = [
      ...bookmarks.map(item => ({ item, feedbackKind: 'bookmark' as const, label: libraryCopy.bookmarks })),
      ...favorites.map(item => ({ item, feedbackKind: 'favorite' as const, label: libraryCopy.favorites })),
    ].sort((left, right) => compareSavedAtDesc(left.item, right.item))[0]
    if (latestSavedPassage) {
      previewItems.push({
        id: latestSavedPassage.item.id,
        kind: 'passage',
        feedbackKind: latestSavedPassage.feedbackKind,
        label: latestSavedPassage.label,
        title: latestSavedPassage.item.title,
        detail: formatSavedPassageReference(
          latestSavedPassage.item.source,
          latestSavedPassage.item.ang,
          'verseId' in latestSavedPassage.item ? latestSavedPassage.item.verseId : undefined
        ),
        path: buildSavedStudyPath(latestSavedPassage.item),
      })
    }

    const latestVocab = [...vocab].sort(compareSavedAtDesc)[0]
    if (latestVocab) {
      previewItems.push({
        id: buildVocabFeedbackId(latestVocab),
        kind: 'vocab',
        feedbackKind: 'review',
        label: libraryCopy.reviewBank,
        title: latestVocab.word,
        detail: getVocabPreviewDetail(latestVocab, locale),
        path: '/vocab',
        meta: (latestVocab.kind ?? 'word') === 'phrase' ? homeCopy.phrases : homeCopy.words,
      })
    }

    return previewItems.slice(0, 3)
  }, [bookmarks, favorites, homeCopy.phrases, homeCopy.words, libraryCopy.bookmarks, libraryCopy.favorites, libraryCopy.reviewBank, locale, vocab])
  return (
    <div className="home-stack page-shell pb-[calc(var(--nav-stack-height)+var(--safe-area-bottom)+4.75rem)] animate-fade-in" data-testid="page-home" data-page="home" data-ai-surface="home" data-ai-state="ready">
      <section
        className="home-door-shell mb-3 px-5 py-4 animate-slide-up stagger-1"
        aria-labelledby="home-hukamnama-title"
        data-testid="home-hero"
        data-ai-surface="daily-reading-room"
      >
        <header className="flex items-center justify-between gap-4" data-testid="home-brand-header">
          <div className="flex min-w-0 items-center gap-3">
            <NaamRasLogoMark
              size={50}
              className="shrink-0 drop-shadow-[0_8px_14px_rgba(122,84,32,0.18)]"
              testId="home-brand-mark"
            />
            <div className="min-w-0">
              <h1 id="home-title" className="font-display text-[2.05rem] leading-none text-ink dark:text-dark-text">
                {editorial?.brand.name ?? 'NaamRas'}
              </h1>
              <p className="mt-1 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-dark dark:text-gold-light">
                {homeMessages.brandTagline}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/library"
              aria-label={homeCopy.openSaved}
              className="home-door-icon-button"
              data-testid="home-header-saved"
            >
              <IconBookmark size={19} />
            </Link>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDarkTheme ? copy.more.lightMode : copy.more.darkMode}
              className="home-door-icon-button"
              data-testid="home-theme-toggle"
            >
              {isDarkTheme ? <IconSun size={17} /> : <IconMoon size={17} />}
            </button>
          </div>
        </header>

        <div className="home-day-meta mt-3 border-y border-sand/20 py-2.5 dark:border-dark-text/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-display text-[1.05rem] leading-none text-ink/78 dark:text-dark-text/82">
              {homeDateLabel}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openOnboarding}
                className="chip-pill interactive-focus"
                data-testid="home-reading-preferences"
              >
                {homeMessages.readingPreferences}
              </button>
              <StreakBadge streak={streak} label={homeMessages.streakLabel(streak)} />
            </div>
          </div>
        </div>

        <div className="home-path-marker" data-testid="home-path-receive">
          <span aria-hidden="true">01</span>
          <p>{homeMessages.pathReceive}</p>
        </div>

        <figure className="home-door-frame">
          <div className="home-door-artwork">
            {heroImageFailed ? (
              <div
                className="home-hero-art-fallback"
                role="img"
                aria-label={homeMessages.artworkUnavailable}
                data-testid="home-hero-art-fallback"
              >
                <span className="home-hero-art-fallback-landscape" aria-hidden="true" />
              </div>
            ) : (
              <img
                src={heroEclipseSrc}
                alt={homeMessages.heroArtworkAlt}
                width={1178}
                height={1280}
                loading="eager"
                decoding="async"
                fetchPriority="high"
                className="home-hero-art"
                data-testid="home-hero-artwork"
                onError={() => setHeroImageFailed(true)}
              />
            )}
          </div>
          <div className="home-door-content" data-testid="home-daily-reading-room">
            {hukamnamaLoading && !hukamnama ? (
              <div
                className="home-hukam-card animate-pulse px-3.5 py-3.5"
                data-testid="home-hukamnama-loading"
                role="status"
                aria-live="polite"
                aria-busy="true"
              >
                <h2 id="home-hukamnama-title" className="sr-only">{homeMessages.todaysHukamnama}</h2>
                <span className="sr-only">{homeMessages.loadingHukamnama}</span>
                <div aria-hidden="true">
                  <div className="h-3 rounded bg-sand/20 dark:bg-dark-text/10 w-32 mb-4" />
                  <div className="h-16 rounded bg-sand/20 dark:bg-dark-text/10" />
                  <div className="mt-4 h-4 rounded bg-sand/20 dark:bg-dark-text/10 w-4/5" />
                  <div className="mt-2 h-4 rounded bg-sand/20 dark:bg-dark-text/10 w-3/5" />
                  <div className="mt-4 h-12 rounded bg-sand/20 dark:bg-dark-text/10" />
                </div>
              </div>
            ) : hukamnama ? (
              <div
                className="home-hukam-card px-3.5 py-3.5"
                data-testid="home-hukamnama-card"
                data-ai-surface="home-hukamnama"
                data-ai-state={hukamnamaIsCached ? 'degraded' : 'ready'}
                aria-busy={hukamnamaRefreshing || undefined}
              >
                <div className="home-card-heading-row">
                  <h2 id="home-hukamnama-title" className="home-section-label">
                    {hukamnamaTitle}
                  </h2>
                  <span className={`home-soft-pill ${hukamnamaIsCached || hukamnamaIsOlder ? 'home-state-pill--degraded' : ''}`}>
                    {hukamnamaStateLabel}
                  </span>
                </div>
                <div className="home-hukam-source-state" role="status" aria-live="polite">
                  <time dateTime={hukamnama.date}>{hukamnamaDateLabel}</time>
                  {(hukamnamaIsCached || hukamnamaIsOlder) ? (
                    <button
                      type="button"
                      onClick={retryHukamnama}
                      disabled={hukamnamaRefreshing}
                      className="home-hukam-refresh interactive-focus"
                    >
                      {hukamnamaRefreshing ? homeMessages.refreshing : homeMessages.refresh}
                    </button>
                  ) : null}
                </div>
                <p
                  lang={getScriptTextLang(scriptMode)}
                  className={`${getScriptTextFontClass(scriptMode)} home-hukam-line`}
                >
                  {renderScriptText(hukamnamaPreviewLine?.gurmukhi ?? hukamnama.entry.gurmukhi, scriptMode)}
                </p>
                <div className="home-hukam-support">
                  {hukamnamaTransliterationPreview ? (
                    <p className="home-hukam-transliteration">{hukamnamaTransliterationPreview}</p>
                  ) : null}
                  {hukamnamaMeaningPreview ? (
                    <p
                      className="home-hukam-meaning"
                      lang={meaningLanguage === 'pa' ? 'pa-Guru' : meaningLanguage === 'hi' ? 'hi' : 'en'}
                    >
                      {hukamnamaMeaningPreview}
                    </p>
                  ) : null}
                </div>
                <p className="home-hukam-provenance">
                  <span>{hukamnama.entry.sourceName || hukamnama.entry.scripture}</span>
                  <span aria-hidden="true">·</span>
                  <span>{homeMessages.angLabel} {hukamnama.ang}</span>
                  {hukamnama.entry.raag ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{renderScriptText(hukamnama.entry.raag, scriptMode)}</span>
                    </>
                  ) : null}
                </p>
                <Link
                  to={`/study?hukamnamaDate=${hukamnama.date}`}
                  state={{ readerOrigin: '/' }}
                  className="home-primary-action interactive-focus interactive-pill-link"
                  data-testid="home-hero-primary-action"
                  data-ai-action="open-hukamnama"
                >
                  <IconLibrary size={20} />
                  <span>{homeMessages.readHukamnama}</span>
                </Link>
              </div>
            ) : (
              <div
                className="home-hukam-card px-3.5 py-3.5"
                data-testid="home-hukamnama-error"
                data-ai-surface="home-hukamnama"
                data-ai-state="degraded"
                data-ai-error="study-hukamnama"
              >
                <h2 id="home-hukamnama-title" className="home-section-label">{homeMessages.hukamnamaUnavailable}</h2>
                <p className="home-hukam-error-body">
                  {homeMessages.hukamnamaUnavailableBody}
                </p>
                <div className="home-hukam-error-actions">
                  <button
                    type="button"
                    onClick={retryHukamnama}
                    className="home-primary-action interactive-focus"
                    data-testid="home-hukamnama-retry"
                  >
                    {homeMessages.retry}
                  </button>
                  <Link
                    to="/banis"
                    className="home-secondary-action interactive-focus interactive-pill-link"
                    data-ai-action="browse-read"
                  >
                    {homeMessages.browseRead}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </figure>
      </section>

      <section
        ref={nitnemSpotlightRef}
        tabIndex={-1}
        className="home-nitnem-tray mb-4 px-4 py-4 animate-slide-up stagger-3 transition-[box-shadow,transform,border-color] duration-500"
        aria-labelledby="home-nitnem-title"
        data-testid="home-nitnem-spotlight"
      >
        <div className="home-path-marker" data-testid="home-path-practice">
          <span aria-hidden="true">02</span>
          <p>{homeMessages.pathPractice}</p>
        </div>

        <div className="home-nitnem-heading">
          <div className="min-w-0">
            <p
              className="font-sans text-[11px] uppercase tracking-[0.24em] text-gold-dark dark:text-gold-light"
            >
              {homeMessages.dailyNitnem}
            </p>
            <h2 id="home-nitnem-title" className="mt-2 max-w-[18ch] font-display text-[1.75rem] leading-[0.98] text-ink dark:text-dark-text sm:max-w-none">
              {homeMessages.nitnemHeroTitle}
            </h2>
          </div>
          <Link
            to="/nitnem/customize"
            className="home-nitnem-customize interactive-focus"
            aria-label={homeMessages.customizeNitnem}
            title={homeMessages.customizeNitnem}
            data-testid="home-nitnem-manage"
          >
            <IconMoreHorizontal size={17} />
            <span>{homeMessages.customizeNitnemShort}</span>
          </Link>
        </div>

        <div className="home-nitnem-practice">
          {activeNitnemOption ? (
            <>
              <div className="home-nitnem-toolbar">
                <div className="min-w-0">
                  <p className="home-nitnem-moment">{homeMessages.groupLabel[activeNitnemOption.group]}</p>
                  <p className="home-nitnem-position" aria-live="polite">
                    {nitnemPositionLabel}
                    {completionTrackingEnabled ? (
                      <span>{homeMessages.nitnemCompletion(nitnemCompletedCount)}</span>
                    ) : null}
                  </p>
                </div>
                {nitnemHasCarousel ? (
                  <div className="home-nitnem-nav" data-testid="home-nitnem-carousel-controls" aria-label={homeMessages.nitnemCarousel}>
                    <button
                      type="button"
                      onClick={() => setNitnemCarouselIndex(safeNitnemIndex - 1)}
                      className="interactive-focus"
                      aria-label={homeMessages.previousBani}
                      aria-controls="home-nitnem-carousel"
                    >
                      <IconArrowRight size={16} className="rotate-180" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setNitnemCarouselIndex(safeNitnemIndex + 1)}
                      className="interactive-focus"
                      aria-label={homeMessages.nextBani}
                      aria-controls="home-nitnem-carousel"
                    >
                      <IconArrowRight size={16} />
                    </button>
                  </div>
                ) : null}
              </div>

              {completionTrackingEnabled ? (
                <div
                  className="home-nitnem-progress"
                  role="progressbar"
                  aria-label={homeMessages.dailyNitnem}
                  aria-valuemin={0}
                  aria-valuemax={selectedNitnemOptions.length}
                  aria-valuenow={nitnemCompletedCount}
                  aria-valuetext={homeMessages.nitnemProgressValue(nitnemCompletedCount, selectedNitnemOptions.length)}
                >
                  <span
                    style={{ width: `${selectedNitnemOptions.length > 0 ? (nitnemCompletedCount / selectedNitnemOptions.length) * 100 : 0}%` }}
                  />
                </div>
              ) : null}

              <div
                ref={nitnemCarouselRef}
                id="home-nitnem-carousel"
                onScroll={handleNitnemCarouselScroll}
                onPointerDown={handleNitnemPointerDown}
                onPointerMove={handleNitnemPointerMove}
                onPointerUp={handleNitnemPointerUp}
                onPointerCancel={handleNitnemPointerCancel}
                onTouchStart={handleNitnemTouchStart}
                onTouchMove={handleNitnemTouchMove}
                onTouchEnd={handleNitnemTouchEnd}
                className="home-nitnem-carousel"
                data-testid="home-nitnem-carousel"
                role="region"
                aria-roledescription="carousel"
                aria-label={homeMessages.nitnemCarousel}
              >
                {selectedNitnemOptions.map((option, index) => {
                  const active = index === safeNitnemIndex
                  return (
                    <article
                      key={`home-nitnem-card-${option.id}`}
                      data-nitnem-index={index}
                      data-testid={active ? 'home-nitnem-active-card' : undefined}
                      aria-label={homeMessages.nitnemCarouselLabel(index + 1, selectedNitnemOptions.length)}
                      aria-current={active ? 'true' : undefined}
                      aria-hidden={active ? undefined : true}
                      role="group"
                      aria-roledescription="slide"
                      className="home-nitnem-card"
                    >
                      <div className="home-nitnem-card-grid">
                        <p className="home-section-label">{homeMessages.currentBani}</p>
                        <p lang={getScriptTextLang(scriptMode)} className={getScriptTextFontClass(scriptMode)}>
                          {renderScriptText(option.gurmukhiTitle, scriptMode)}
                        </p>
                        {showTransliteration ? <p>{option.romanizedTitle}</p> : null}
                        <div className="home-ritual-note">
                          {getNitnemOptionDetail(option)}
                        </div>
                      </div>

                      <Link
                        to={buildNitnemStudyPath(option)}
                        state={{ readerOrigin: '/' }}
                        className="home-primary-action interactive-focus interactive-pill-link"
                        data-testid={active ? 'home-nitnem-primary-action' : undefined}
                        tabIndex={active ? undefined : -1}
                      >
                        {homeMessages.beginNitnem}
                      </Link>
                    </article>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="home-nitnem-empty">
              <p className="font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/70">
                {homeMessages.chooseNitnemBody}
              </p>
            </div>
          )}
        </div>
      </section>

      <section
        className="home-saved-cabinet p-4 mb-5 animate-slide-up stagger-4"
        aria-labelledby="home-saved-title"
        data-testid="home-saved-overview"
      >
        <div className="home-path-marker" data-testid="home-path-keep">
          <span aria-hidden="true">03</span>
          <p>{homeMessages.pathKeep}</p>
        </div>

        <div className="home-saved-heading flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">{homeCopy.savedEyebrow}</p>
            <h2 id="home-saved-title" className="font-display text-3xl text-ink dark:text-dark-text leading-none mt-2">
              {editorial?.home.savedTitle ?? homeCopy.savedTitle}
            </h2>
          </div>
          {hasSavedContent ? (
            <Link
              to="/library"
              className="interactive-focus inline-flex min-h-11 shrink-0 items-center gap-1 whitespace-nowrap px-2 font-sans text-sm text-gold-dark dark:text-gold-light"
            >
              {homeCopy.openSaved} <IconArrowRight size={14} />
            </Link>
          ) : null}
        </div>
        {savedShelfNotice ? (
          <div aria-live="polite" className="mt-3 min-h-[1.5rem]">
            <p role="status" className="inline-flex rounded-full bg-gold/10 px-3 py-1.5 font-sans text-xs font-medium text-gold-dark dark:bg-gold/12 dark:text-gold-light">
              {savedShelfNotice}
            </p>
          </div>
        ) : null}
        {hasSavedContent ? (
          <div className="home-saved-layout" data-testid="home-saved-layout">
          <Link
            to="/library"
            className="home-saved-art-band interactive-focus"
            aria-label={`${homeCopy.openSaved}. ${homeMessages.savedArtworkAlt}`}
            data-testid="home-saved-art"
          >
            <img
              src={savedMuralSrc}
              alt={homeMessages.savedArtworkAlt}
              width={1920}
              height={1080}
              loading="lazy"
              decoding="async"
            />
            <span className="home-saved-art-caption" aria-hidden="true">
              <span>{homeCopy.openSaved}</span>
              <IconArrowRight size={16} />
            </span>
          </Link>

          <div className="home-saved-shelf">
            <div className="home-saved-summary" data-testid="home-saved-metrics">
              <p className={`home-saved-summary-item ${lastSaved?.kind === 'bookmark' ? 'saved-feedback-highlight' : ''}`}>
                <strong>{savedBookmarks}</strong>
                <span>{libraryCopy.bookmarks}</span>
              </p>
              <p className={`home-saved-summary-item ${lastSaved?.kind === 'favorite' ? 'saved-feedback-highlight' : ''}`}>
                <strong>{savedFavorites}</strong>
                <span>{libraryCopy.favorites}</span>
              </p>
              <p className={`home-saved-summary-item ${lastSaved?.kind === 'review' ? 'saved-feedback-highlight' : ''}`}>
                <strong>{savedReviewItems}</strong>
                <span>{libraryCopy.reviewBank}</span>
              </p>
            </div>

            <div className="home-saved-preview-list" data-testid="home-saved-preview-list">
              {savedPreviewItems.length > 0 ? (
                savedPreviewItems.map(item => {
                  const appearance = HOME_SAVED_PREVIEW_APPEARANCE[item.kind]
                  const SavedPreviewIcon = appearance.icon
                  const isHighlighted = lastSaved?.kind === item.feedbackKind && lastSaved.targetId === item.id

                  return (
                  <Link
                    key={item.id}
                    to={item.path}
                    className={`section-shell-quiet interactive-focus interactive-card-link flex w-full items-start gap-3 px-4 py-4 text-left transition-colors duration-300 hover:border-gold/18 dark:hover:border-gold/20 ${appearance.surfaceClassName} ${isHighlighted ? 'saved-feedback-highlight' : ''}`}
                    data-testid={`home-saved-preview-${item.kind}`}
                  >
                    <span className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${appearance.badgeClassName}`}>
                      <SavedPreviewIcon size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="eyebrow">{item.label}</p>
                        {item.meta ? <span className="chip-pill">{item.meta}</span> : null}
                        {isHighlighted ? <span className="chip-pill">{homeMessages.savedJustNow}</span> : null}
                      </div>
                      <p className="mt-2 font-sans text-sm font-semibold text-ink dark:text-dark-text">
                        {item.title}
                      </p>
                      {item.kind === 'passage' ? (
                        <p className={`mt-2 font-sans text-[11px] uppercase tracking-[0.18em] ${appearance.detailClassName}`}>
                          {item.detail}
                        </p>
                      ) : (
                        <p className={`mt-1.5 font-sans text-sm leading-6 ${appearance.detailClassName}`}>
                          {item.detail}
                        </p>
                      )}
                    </div>
                    <span className="mt-1 shrink-0 text-gold-dark dark:text-gold-light">
                      <IconArrowRight size={16} />
                    </span>
                  </Link>
                )})
              ) : (
                <div className="home-quiet-card home-saved-empty-preview px-4 py-4">
                  <p className="eyebrow">{homeMessages.savedPreview}</p>
                  <p className="mt-2 font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/70">
                    {homeMessages.savedEmptyBody}
                  </p>
                </div>
              )}
            </div>
          </div>
          </div>
        ) : (
          <div className="home-saved-compact-empty" data-testid="home-saved-empty">
            <span className="home-saved-empty-icon" aria-hidden="true">
              <IconBookmark size={18} />
            </span>
            <div className="min-w-0">
              <p className="home-section-label">{homeMessages.savedEmptyTitle}</p>
              <p>{homeMessages.savedEmptyBody}</p>
            </div>
            <Link to="/banis" className="home-secondary-action interactive-focus interactive-pill-link">
              {homeMessages.browseRead}
              <IconArrowRight size={15} />
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}
