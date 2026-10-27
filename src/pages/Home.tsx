import '../styles/home.css'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { IconArrowRight, IconMoon, IconSun } from '../components/icons'
import { useHukamnama } from '../hooks/useHukamnama'
import { useHomeArtwork } from '../hooks/useHomeArtwork'
import { useCurrentTime } from '../hooks/useCurrentTime'
import { useBookmarksStore } from '../store/bookmarks'
import { useFavoritesStore } from '../store/favorites'
import { useLanguageStore } from '../store/language'
import { useLocaleStore } from '../store/locale'
import { useOnboardingStore } from '../store/onboarding'
import { useProgressStore } from '../store/progress'
import { getExactReadingKey, useReadingPlacesStore } from '../store/readingPlaces'
import { useSundarGutkaLengthStore } from '../store/sundarGutkaLength'
import { useThemeStore } from '../store/theme'
import { NITNEM_ROUTE_OPTIONS, setNitnemCompletionSafely, type NitnemRouteOption, useNitemStore } from '../store/nitnem'
import { getNitnemCompletionForDay, getNitnemHistorySummary, useNitnemHistoryStore } from '../store/nitnemHistory'
import { useNitnemPracticeStore } from '../store/nitnemPractice'
import { getActiveNitnemPractice, getNitnemPracticeResume } from '../utils/nitnemPractice'
import { getNextIncompleteNitnemReading } from '../utils/nitnemReadingIdentity'
import { buildNitnemStudyPath } from '../store/nitnem'
import { asSupportedSundarGutkaBaniId, normalizeSundarGutkaLength } from '../utils/sundarGutkaLength'
import { useVocabStore } from '../store/vocab'
import { buildVocabFeedbackId, useSavedFeedbackStore, type SavedFeedbackKind } from '../store/savedFeedback'
import type { SundarGutkaLength, UiLocale, VocabEntry } from '../types'
import { getEntryMeaningText, getLineMeaningText, getScriptTextFontClass, getScriptTextLang, renderScriptText } from '../utils/readerDisplay'
import { getHukamnamaPreviewLine } from '../utils/hukamnamaPreview'
import { getUiCopy } from '../utils/uiCopy'
import { formatUiDate } from '../utils/formatUiDate'
import { toLocalDayStamp } from '../utils/localDates'
import { buildSavedStudyPath } from '../utils/savedStudyPath'
import { formatSourceReaderReference } from '../utils/sourceReaderMeta'
import { getHomeNitnemResume } from '../utils/homeNitnemResume'
import { clearHomeNitnemReturn, getHomeNitnemReturn, rememberHomeNitnemReturn } from '../utils/homeNitnemNavigation'
import { getAppViewportHeight, scrollElementIntoAppView } from '../utils/appScroll'
import { isExactBaniReading } from '../utils/baniReadingValidation'
import type { BaniFetchResult } from '../api/banidb'
import type { BaniLengthDestination } from '../utils/baniLengthSelection'

import HomeDailyNitnem from '../components/HomeDailyNitnem'
import HomeReturnArea from '../components/HomeReturnArea'

const HomeArtworkSettings = lazy(() => import('../components/HomeArtworkSettings'))

type HomeSavedPreviewItem = {
  id: string
  kind: 'passage' | 'vocab'
  feedbackKind: SavedFeedbackKind
  label: string
  title: string
  detail: string
  path: string
  excerpt?: string
  isScripture?: boolean
  meaning?: string
  meaningLanguage?: 'en' | 'pa' | 'hi'
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
  savedBook: string
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
    savedBook: 'Book',
    savedEmptyTitle: 'Nothing saved yet',
    savedEmptyBody: 'Save a passage or word to keep it here.',
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
    savedBook: 'ਕਿਤਾਬ',
    savedEmptyTitle: 'ਹਾਲੇ ਕੁਝ ਸੰਭਾਲਿਆ ਨਹੀਂ',
    savedEmptyBody: 'ਕੋਈ ਪੰਕਤੀ ਜਾਂ ਸ਼ਬਦ ਸੰਭਾਲੋ ਤਾਂ ਜੋ ਉਹ ਇੱਥੇ ਮਿਲ ਸਕੇ।',
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
    savedBook: 'पुस्तक',
    savedEmptyTitle: 'अभी कुछ सहेजा नहीं',
    savedEmptyBody: 'किसी पंक्ति या शब्द को सहेजें ताकि वह यहाँ मिल सके।',
    savedArtworkAlt: 'द्वार, एकत्र लोगों, वाद्ययंत्रों और प्राकृतिक दृश्यों वाला कथात्मक भित्तिचित्र।',
    savedNotice: {
      bookmark: 'बुकमार्क किया अंश सहेजा गया।',
      favorite: 'पसंदीदा सहेजा गया।',
      review: 'रिव्यू बैंक अपडेट हुआ।',
    },
  },
}

const EXPERIENCE_COPY = {
  en: { close: 'Close', artwork: 'Home artwork', study: 'Study', complete: 'Mark complete', undo: 'Undo completion', completed: 'Complete today', notStarted: 'Ready to read', inProgress: 'Saved place', begin: 'Begin reading', resume: 'Continue reading', again: 'Read again', savedPlace: 'Return to your saved place.', ready: 'A little space for your daily practice.', today: 'complete today', all: 'All banis', week: 'This week', days: 'days', goal: 'Weekly goal', streak: 'day streak', best: 'Best', saved: 'Saved for later', browse: 'Explore Gurbani', preferences: 'Reading preferences', finishedNotice: 'marked complete.', undoneNotice: 'Completion undone.', dayNames: ['M', 'T', 'W', 'T', 'F', 'S', 'S'] },
  pa: { close: 'ਬੰਦ ਕਰੋ', artwork: 'ਮੁੱਖ ਪੰਨੇ ਦਾ ਚਿੱਤਰ', study: 'ਵਿਚਾਰ', complete: 'ਪੂਰੀ ਚਿੰਨ੍ਹੋ', undo: 'ਪੂਰਾ ਚਿੰਨ੍ਹ ਹਟਾਓ', completed: 'ਅੱਜ ਪੂਰੀ', notStarted: 'ਪੜ੍ਹਨ ਲਈ ਤਿਆਰ', inProgress: 'ਸੰਭਾਲੀ ਥਾਂ', begin: 'ਪੜ੍ਹਨਾ ਸ਼ੁਰੂ ਕਰੋ', resume: 'ਪੜ੍ਹਨਾ ਜਾਰੀ ਰੱਖੋ', again: 'ਮੁੜ ਪੜ੍ਹੋ', savedPlace: 'ਆਪਣੀ ਸੰਭਾਲੀ ਥਾਂ ਤੋਂ ਜਾਰੀ ਰੱਖੋ।', ready: 'ਰੋਜ਼ਾਨਾ ਅਭਿਆਸ ਲਈ ਥੋੜ੍ਹੀ ਜਿਹੀ ਥਾਂ।', today: 'ਅੱਜ ਪੂਰੀਆਂ', all: 'ਸਾਰੀਆਂ ਬਾਣੀਆਂ', week: 'ਇਸ ਹਫ਼ਤੇ', days: 'ਦਿਨ', goal: 'ਹਫ਼ਤਾਵਾਰੀ ਟੀਚਾ', streak: 'ਦਿਨ ਲਗਾਤਾਰ', best: 'ਸਭ ਤੋਂ ਵੱਧ', saved: 'ਬਾਅਦ ਲਈ ਸੰਭਾਲਿਆ', browse: 'ਗੁਰਬਾਣੀ ਖੋਜੋ', preferences: 'ਪੜ੍ਹਨ ਦੀਆਂ ਪਸੰਦਾਂ', finishedNotice: 'ਪੂਰੀ ਚਿੰਨ੍ਹੀ ਗਈ।', undoneNotice: 'ਪੂਰਾ ਚਿੰਨ੍ਹ ਹਟਾਇਆ ਗਿਆ।', dayNames: ['ਸੋ', 'ਮੰ', 'ਬੁੱ', 'ਵੀ', 'ਸ਼ੁੱ', 'ਸ਼', 'ਐ'] },
  hi: { close: 'बंद करें', artwork: 'मुख पृष्ठ का चित्र', study: 'अध्ययन', complete: 'पूर्ण चिह्नित करें', undo: 'पूर्ण चिह्न हटाएँ', completed: 'आज पूर्ण', notStarted: 'पढ़ने के लिए तैयार', inProgress: 'सहेजी जगह', begin: 'पढ़ना शुरू करें', resume: 'पढ़ना जारी रखें', again: 'फिर पढ़ें', savedPlace: 'अपनी सहेजी जगह से जारी रखें।', ready: 'दैनिक अभ्यास के लिए थोड़ी जगह।', today: 'आज पूर्ण', all: 'सभी बानियाँ', week: 'इस सप्ताह', days: 'दिन', goal: 'साप्ताहिक लक्ष्य', streak: 'दिन लगातार', best: 'सर्वश्रेष्ठ', saved: 'बाद के लिए सहेजा', browse: 'गुरबानी खोजें', preferences: 'पढ़ने की पसंद', finishedNotice: 'पूर्ण चिह्नित हुई।', undoneNotice: 'पूर्ण चिह्न हटा दिया गया।', dayNames: ['सो', 'मं', 'बु', 'गु', 'शु', 'श', 'र'] },
} as const

const FOLIO_COPY = {
  en: { choose: 'Choose a bani to read', order: 'Your routine, in order.', complete: 'Your selected banis are complete today.', selection: 'Selected reading', empty: 'Choose your daily banis to begin.', artwork: 'Artwork', recorded: 'Practice recorded', weekEmpty: 'Begin with one bani.', weekToday: 'Today’s practice is recorded.', weekReturn: 'A little space for today.', weekMet: 'Your weekly goal is met.', weekExplanation: 'One completed bani records a day of practice.' },
  pa: { choose: 'ਪੜ੍ਹਨ ਲਈ ਬਾਣੀ ਚੁਣੋ', order: 'ਤੁਹਾਡੀ ਰੋਜ਼ਾਨਾ ਬਾਣੀਆਂ ਦਾ ਕ੍ਰਮ।', complete: 'ਅੱਜ ਤੁਹਾਡੀਆਂ ਚੁਣੀਆਂ ਬਾਣੀਆਂ ਪੂਰੀਆਂ ਹਨ।', selection: 'ਚੁਣਿਆ ਪਾਠ', empty: 'ਸ਼ੁਰੂ ਕਰਨ ਲਈ ਰੋਜ਼ਾਨਾ ਬਾਣੀਆਂ ਚੁਣੋ।', artwork: 'ਚਿੱਤਰ', recorded: 'ਅਭਿਆਸ ਦਰਜ ਹੋਇਆ', weekEmpty: 'ਇੱਕ ਬਾਣੀ ਨਾਲ ਸ਼ੁਰੂ ਕਰੋ।', weekToday: 'ਅੱਜ ਦਾ ਅਭਿਆਸ ਦਰਜ ਹੋ ਗਿਆ ਹੈ।', weekReturn: 'ਅੱਜ ਦੇ ਅਭਿਆਸ ਲਈ ਥੋੜ੍ਹੀ ਥਾਂ।', weekMet: 'ਇਸ ਹਫ਼ਤੇ ਦਾ ਟੀਚਾ ਪੂਰਾ ਹੋ ਗਿਆ ਹੈ।', weekExplanation: 'ਇੱਕ ਬਾਣੀ ਪੂਰੀ ਕਰਨ ਨਾਲ ਅਭਿਆਸ ਦਾ ਇੱਕ ਦਿਨ ਦਰਜ ਹੁੰਦਾ ਹੈ।' },
  hi: { choose: 'पढ़ने के लिए बानी चुनें', order: 'आपकी दैनिक बानियाँ, आपके क्रम में।', complete: 'आज आपकी चुनी हुई बानियाँ पूर्ण हैं।', selection: 'चुना हुआ पाठ', empty: 'शुरू करने के लिए दैनिक बानियाँ चुनें।', artwork: 'चित्र', recorded: 'अभ्यास दर्ज हुआ', weekEmpty: 'एक बानी से शुरू करें।', weekToday: 'आज का अभ्यास दर्ज हो गया है।', weekReturn: 'आज के अभ्यास के लिए थोड़ी जगह।', weekMet: 'इस सप्ताह का लक्ष्य पूरा हो गया है।', weekExplanation: 'एक बानी पूरी करने से अभ्यास का एक दिन दर्ज होता है।' },
} as const

export default function Home() {
  const locale = useLocaleStore(s => s.locale)
  const scriptMode = useLanguageStore(s => s.scriptMode)
  const showTransliteration = useLanguageStore(s => s.showTransliteration)
  const meaningLanguage = useLanguageStore(s => s.meaningLanguage)
  const englishSource = useLanguageStore(s => s.englishSource)
  const isDark = useThemeStore(s => s.dark)
  const toggleTheme = useThemeStore(s => s.toggle)
  const openOnboarding = useOnboardingStore(s => s.openOnboarding)
  const currentSession = useProgressStore(s => s.currentSession)
  const readingPlaces = useReadingPlacesStore(s => s.places)
  const practice = useNitnemPracticeStore(s => s.active)
  const nitnem = useNitemStore()
  const resetIfNewDay = useNitemStore(s => s.resetIfNewDay)
  const events = useNitnemHistoryStore(s => s.events)
  useSundarGutkaLengthStore(s => s.lengths)
  const bookmarks = useBookmarksStore(s => s.bookmarks)
  const favorites = useFavoritesStore(s => s.favorites)
  const vocab = useVocabStore(s => s.vocab)
  const lastSaved = useSavedFeedbackStore(s => s.lastSaved)
  const now = useCurrentTime()
  const currentDate = useMemo(() => new Date(now), [now])
  const day = toLocalDayStamp(currentDate)
  const continuity = useMemo(() => getNitnemHistorySummary(events, currentDate, nitnem.weeklyDayGoal), [events, currentDate, nitnem.weeklyDayGoal])
  const homeMessages = HOME_MESSAGES[locale]
  const x = EXPERIENCE_COPY[locale]
  const folio = FOLIO_COPY[locale]
  const copy = getUiCopy(locale)
  const location = useLocation()
  const navigate = useNavigate()
  const nitnemRef = useRef<HTMLDivElement>(null)
  const arrivalRef = useRef<HTMLElement>(null)
  const [artOpen, setArtOpen] = useState(false)
  const [pinnableArrival, setPinnableArrival] = useState(false)
  const [failedImageKey, setFailedImageKey] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [chosenOptionId, setChosenOptionId] = useState<string | null>(null)
  const [initialBrowseId] = useState(getHomeNitnemReturn)
  useEffect(() => { clearHomeNitnemReturn(initialBrowseId) }, [initialBrowseId])
  const { asset, imageStyle, onImageError, imageKey } = useHomeArtwork()
  const artworkStageRatio = Math.max(1, asset.width / asset.height)
  const { data: hukamnama, loading, refreshing, isCached, isOlder, retry } = useHukamnama()

  const selected = useMemo(() => nitnem.selectedIds.map(id => NITNEM_ROUTE_OPTIONS.find(o => o.id === id)).filter((o): o is NitnemRouteOption => Boolean(o)), [nitnem.selectedIds])
  const completed = useMemo(() => new Set(nitnem.completedDate === day ? nitnem.completedIds : []), [nitnem.completedDate, nitnem.completedIds, day])
  const activePractice = getActiveNitnemPractice(selected, practice, day)
  const activeOptionId = activePractice?.optionId
    ?? selected.find(option => option.id === chosenOptionId && !(nitnem.completionTrackingEnabled && completed.has(option.id)))?.id
    ?? selected.find(option => !(nitnem.completionTrackingEnabled && completed.has(option.id)))?.id
    ?? selected[0]?.id
  const activeOption = selected.find(option => option.id === activeOptionId)
  const practiceResume = (option: NitnemRouteOption) => getNitnemPracticeResume(option, activePractice, readingPlaces, currentSession)
  const readingPath = (option: NitnemRouteOption) => practiceResume(option) ?? buildNitnemStudyPath(option)
  const allComplete = nitnem.completionTrackingEnabled && selected.length > 0 && selected.every(option => completed.has(option.id))
  const entryCopy = {
    en: { label: 'Daily Nitnem', begin: 'Begin Nitnem', resume: 'Continue Nitnem', complete: 'Your banis are complete today', view: 'Your Nitnem', sessionOnly: 'Reading is available for this session. Your place could not be saved on this device.' },
    pa: { label: 'ਰੋਜ਼ਾਨਾ ਨਿਤਨੇਮ', begin: 'ਨਿਤਨੇਮ ਸ਼ੁਰੂ ਕਰੋ', resume: 'ਨਿਤਨੇਮ ਜਾਰੀ ਰੱਖੋ', complete: 'ਅੱਜ ਤੁਹਾਡੀਆਂ ਬਾਣੀਆਂ ਪੂਰੀਆਂ ਹਨ', view: 'ਤੁਹਾਡਾ ਨਿਤਨੇਮ', sessionOnly: 'ਇਸ ਵਾਰ ਪੜ੍ਹ ਸਕਦੇ ਹੋ। ਇਸ ਯੰਤਰ ਉੱਤੇ ਤੁਹਾਡੀ ਥਾਂ ਸੰਭਾਲੀ ਨਹੀਂ ਜਾ ਸਕੀ।' },
    hi: { label: 'दैनिक नितनेम', begin: 'नितनेम शुरू करें', resume: 'नितनेम जारी रखें', complete: 'आज आपकी बानियाँ पूर्ण हैं', view: 'आपका नितनेम', sessionOnly: 'इस सत्र में पढ़ सकते हैं। इस उपकरण पर आपकी जगह सहेजी नहीं जा सकी।' },
  }[locale]
  const entryLength = activeOption ? normalizeSundarGutkaLength(new URLSearchParams(readingPath(activeOption).split('?')[1]).get('sgLength')) : null
  const entryLengthLabels = {
    en: { short: 'Short', medium: 'Medium', long: 'Long', extralong: 'Extra long' },
    pa: { short: 'ਛੋਟੀ', medium: 'ਦਰਮਿਆਨੀ', long: 'ਲੰਮੀ', extralong: 'ਵਧੇਰੇ ਲੰਮੀ' },
    hi: { short: 'संक्षिप्त', medium: 'मध्यम', long: 'लंबी', extralong: 'अधिक लंबी' },
  }[locale]
  const beginReading = (option: NitnemRouteOption, path: string) => {
    rememberHomeNitnemReturn(option.id)
    const store = useNitnemPracticeStore.getState()
    const continuing = getNitnemPracticeResume(option, store.active, readingPlaces, currentSession)
    const saved = continuing ? store.updatePath(path) : store.start(option.id, path)
    if (!saved) setNotice(entryCopy.sessionOnly)
    setChosenOptionId(option.id)
    const activePath = useNitnemPracticeStore.getState().active?.readingPath ?? path
    navigate(activePath, { state: { readerOrigin: '/', ...(!saved ? { nitnemSessionOnly: true } : {}) } })
  }
  const changeReadingLength = async (option: NitnemRouteOption, length: SundarGutkaLength, remember: boolean, signal?: AbortSignal,
    preparedReading?: BaniFetchResult, preparedDestination?: BaniLengthDestination) => {
    const id = asSupportedSundarGutkaBaniId(option.baseBaniId)
    if (!id || !option.baniDbId) return
    const { getBaniLengthDestination, loadExactBaniReading } = await import('../utils/baniLengthSelection')
    const prepared = isExactBaniReading(preparedReading, option.baniDbId, length)
    const loaded = prepared ? preparedReading! : await loadExactBaniReading(option.baniDbId, length, signal)
    if (signal?.aborted) throw new DOMException('Reading change cancelled.', 'AbortError')
    const resolvedLength = loaded.resolvedLength ?? length
    const currentPath = readingPath(option)
    const currentParams = new URLSearchParams(currentPath.split('?')[1])
    const currentVerseId = Number(currentParams.get('resumeVerseId'))
    const continuing = getActiveNitnemPractice([option], useNitnemPracticeStore.getState().active)
    const resolvedDestination = getBaniLengthDestination(currentPath, loaded, continuing ? readingPlaces : {},
      continuing && currentVerseId > 0 ? { verseId: currentVerseId, source: currentParams.get('resumeSource') ?? currentParams.get('source') ?? undefined } : null)
    const targetKey = getExactReadingKey(resolvedDestination.path)
    const destination = prepared && preparedDestination && targetKey
      && getExactReadingKey(preparedDestination.path) === targetKey
      ? preparedDestination : resolvedDestination
    const path = destination.path
    const store = useNitnemPracticeStore.getState()
    const previousPractice = store.active
    const previousLengths = { ...useSundarGutkaLengthStore.getState().lengths }
    const persistedPractice = localStorage.getItem('naamras-nitnem-practice')
    const persistedLengths = localStorage.getItem('sikh-sundar-gutka-lengths')
    try {
      const ongoing = getActiveNitnemPractice([option], store.active)
      const saved = ongoing ? store.switchReading(option.id, path) : store.start(option.id, path)
      if (!saved) throw new Error(entryCopy.sessionOnly)
      if (remember) useSundarGutkaLengthStore.getState().setLength(id, resolvedLength)
    } catch (error) {
      try { useNitnemPracticeStore.setState({ active: previousPractice }) } catch { /* Restore memory even when device storage is unavailable. */ }
      try { useSundarGutkaLengthStore.setState({ lengths: previousLengths }) } catch { /* Restore the previous preference independently. */ }
      for (const [key, value] of [['naamras-nitnem-practice', persistedPractice], ['sikh-sundar-gutka-lengths', persistedLengths]]) {
        try { if (value === null) localStorage.removeItem(key!); else localStorage.setItem(key!, value!) } catch { /* Keep the chooser retryable. */ }
      }
      throw error
    }
    setChosenOptionId(option.id)
    rememberHomeNitnemReturn(option.id)
    navigate(useNitnemPracticeStore.getState().active?.readingPath ?? path, { state: { readerOrigin: '/' } })
  }


  useEffect(() => { resetIfNewDay() }, [resetIfNewDay, day])
  useEffect(() => {
    const element = arrivalRef.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const measure = () => {
      const arrivalHeight = element.getBoundingClientRect().height
      setPinnableArrival(arrivalHeight > 0 && arrivalHeight <= getAppViewportHeight() - 24)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    window.addEventListener('resize', measure)
    return () => { observer.disconnect(); window.removeEventListener('resize', measure) }
  }, [])
  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 3200)
    return () => window.clearTimeout(timer)
  }, [notice])
  useEffect(() => {
    const state = location.state as { reopenOnboarding?: boolean; highlightTodayPath?: boolean } | null
    if (!state?.reopenOnboarding && !state?.highlightTodayPath) return
    if (state.reopenOnboarding) openOnboarding()
    if (state.highlightTodayPath && nitnemRef.current) scrollElementIntoAppView(nitnemRef.current, { behavior: 'smooth', block: 'center' })
    navigate(location.pathname, { replace: true, state: null })
  }, [location.state, location.pathname, navigate, openOnboarding])

  const previewLine = hukamnama ? getHukamnamaPreviewLine(hukamnama.entry, hukamnama.source) : undefined
  const meaning = !hukamnama || meaningLanguage === 'none' ? '' : previewLine
    ? getLineMeaningText(previewLine, meaningLanguage, englishSource)
    : getEntryMeaningText(hukamnama.entry, meaningLanguage, englishSource)
  const transliteration = !showTransliteration || !hukamnama ? '' : previewLine?.transliteration || hukamnama.entry.transliteration
  const older = Boolean(hukamnama && (isOlder || hukamnama.date !== day))
  const dateLabel = hukamnama ? formatHukamnamaDate(locale, hukamnama.date) : formatUiDate(locale, currentDate)
  const hukamTitle = older ? homeMessages.earlierHukamnama(dateLabel) : homeMessages.todaysHukamnama
  const stateLabel = isCached ? homeMessages.availableOffline : older ? homeMessages.olderReading : homeMessages.liveReading
  const handleCompletion = (option: NitnemRouteOption) => {
    const complete = !useNitemStore.getState().isComplete(option.id)
    const recorded = getNitnemCompletionForDay(useNitnemHistoryStore.getState().events, day, option.id)
    const result = setNitnemCompletionSafely(option.id, complete, complete ? readingPath(option) : recorded?.readingPath)
    if (result === 'failed') {
      setNotice(locale === 'pa' ? 'ਇਹ ਤਬਦੀਲੀ ਸੰਭਾਲੀ ਨਹੀਂ ਜਾ ਸਕੀ। ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ।' : locale === 'hi' ? 'यह बदलाव सहेजा नहीं जा सका। फिर कोशिश करें।' : 'This change could not be saved. Please try again.')
    } else if (result === 'changed' || result === 'unchanged') {
      if (complete) {
        useNitnemPracticeStore.getState().finish(option.id)
        const next = getNextIncompleteNitnemReading(option.id, nitnem.selectedIds, useNitemStore.getState().completedIds)
        setChosenOptionId(next?.id ?? null)
      } else setChosenOptionId(option.id)
      setNotice(complete ? `${option.romanizedTitle} ${x.finishedNotice}` : x.undoneNotice)
    }
  }
  const savedItems = useMemo<HomeSavedPreviewItem[]>(() => {
    const items: HomeSavedPreviewItem[] = []
    const latest = [...bookmarks.map(item => ({ item, feedbackKind: 'bookmark' as const, label: copy.library.bookmarks })), ...favorites.map(item => ({ item, feedbackKind: 'favorite' as const, label: copy.library.favorites }))].sort((a, b) => compareSavedAtDesc(a.item, b.item))[0]
    if (latest) {
      const item = latest.item
      items.push({ id: item.id, kind: 'passage', feedbackKind: latest.feedbackKind, label: latest.label, title: item.title,
        excerpt: item.excerpt, isScripture: !('workId' in item),
        meaning: meaningLanguage === 'pa' ? item.translation_pa : meaningLanguage === 'hi' ? item.translation_hi : meaningLanguage === 'en' ? item.translation_en : undefined,
        meaningLanguage: meaningLanguage === 'none' ? undefined : meaningLanguage,
        detail: 'workId' in item ? `${homeMessages.savedBook} · ${item.chapterLabel}` : formatSourceReaderReference({ source: item.source, value: item.ang, locale, verseId: item.verseId }), path: buildSavedStudyPath(item) })
    }
    const latestWord = [...vocab].sort(compareSavedAtDesc)[0]
    if (latestWord) items.push({ id: buildVocabFeedbackId(latestWord), kind: 'vocab', feedbackKind: 'review', label: copy.library.reviewBank, title: latestWord.word, detail: getVocabPreviewDetail(latestWord, locale), path: '/vocab' })
    return items
  }, [bookmarks, favorites, vocab, copy.library, homeMessages.savedBook, locale, meaningLanguage])

  return (
    <div className="home-stack page-shell home-experience" data-testid="page-home" data-page="home" data-ai-surface="home" data-ai-state="ready">
      <section ref={arrivalRef} className="home-arrival" aria-labelledby="home-hukamnama-title" data-testid="home-hero" data-pinnable={pinnableArrival ? 'true' : undefined} data-gallery-art={asset.id !== 'eclipse' ? 'true' : undefined} data-ai-surface="daily-reading-room">
        <header className="home-masthead" data-testid="home-brand-header">
          <h1 id="home-title" className="home-wordmark">Naam<span>Ras</span><i aria-hidden="true" /></h1>
          <div className="home-header-tools">
            <button type="button" onClick={toggleTheme} aria-label={isDark ? copy.more.lightMode : copy.more.darkMode} className="home-icon-button" data-testid="home-theme-toggle">{isDark ? <IconSun size={18} /> : <IconMoon size={18} />}</button>
            <button type="button" onClick={() => setArtOpen(true)} aria-label={x.artwork} className="home-artwork-button" data-testid="home-artwork-settings"><ArtworkIcon /><span>{folio.artwork}</span></button>
          </div>
        </header>
        {activeOption && (!allComplete || activePractice) ? <Link className="home-nitnem-entry" data-testid="home-nitnem-entry" to={readingPath(activeOption)}
          state={{ readerOrigin: '/' }} onClick={event => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0) { event.preventDefault(); beginReading(activeOption, readingPath(activeOption)) } }}>
          <span><small>{entryCopy.label}</small><span>{activeOption.romanizedTitle}{entryLength ? ` · ${entryLengthLabels[entryLength]}` : ''}</span></span>
          <span>{practiceResume(activeOption) ? entryCopy.resume : entryCopy.begin}<IconArrowRight size={17} /></span>
        </Link> : allComplete ? <a className="home-nitnem-entry" href="#home-nitnem-title"><span><small>{entryCopy.label}</small><span>{entryCopy.complete}</span></span><span>{entryCopy.view}<IconArrowRight size={17} /></span></a> : null}
        <div className="home-arrival-art" style={{ aspectRatio: artworkStageRatio, maxWidth: `${400 * artworkStageRatio}px` }} data-testid="home-hero-art-stage" data-artwork-id={asset.id}>
          {failedImageKey === imageKey ? <div className="home-hero-art-fallback" role="img" aria-label={homeMessages.artworkUnavailable} data-testid="home-hero-art-fallback" /> : <img key={imageKey} src={asset.src} alt={asset.localizedDescription[locale]} width={asset.width} height={asset.height} decoding="async" loading="eager" fetchPriority="high" style={imageStyle} onError={() => { onImageError(); if (asset.id === 'eclipse') setFailedImageKey(imageKey) }} data-testid="home-hero-artwork" />}
        </div>
        <div className="home-hukam-content" data-testid="home-daily-reading-room">
          {loading && !hukamnama ? <div className="home-hukam-skeleton" role="status" aria-busy="true" data-testid="home-hukamnama-loading"><h2 id="home-hukamnama-title" className="sr-only">{homeMessages.todaysHukamnama}</h2><span className="sr-only">{homeMessages.loadingHukamnama}</span><i /><i /><i /></div> : hukamnama ? <div data-testid="home-hukamnama-card" data-ai-surface="home-hukamnama" data-ai-state={isCached ? 'degraded' : 'ready'} aria-busy={refreshing || undefined}>
            <div className="home-hukam-heading"><h2 id="home-hukamnama-title">{hukamTitle}</h2><time dateTime={hukamnama.date}>{dateLabel}</time></div>
            <p lang={getScriptTextLang(scriptMode)} className={`${getScriptTextFontClass(scriptMode)} home-hukam-line`}>{renderScriptText(previewLine?.gurmukhi ?? hukamnama.entry.gurmukhi, scriptMode)}</p>
            {transliteration ? <p className="home-hukam-transliteration">{transliteration}</p> : null}
            {meaning ? <p className="home-hukam-meaning" lang={meaningLanguage === 'pa' ? 'pa-Guru' : meaningLanguage === 'hi' ? 'hi' : 'en'}>{meaning}</p> : null}
            <div className="home-hukam-actions"><Link to={`/study?hukamnamaDate=${hukamnama.date}`} state={{ readerOrigin: '/' }} className="home-hukam-read" data-testid="home-hero-primary-action">{homeMessages.readHukamnama}<IconArrowRight size={20} /></Link><button type="button" onClick={openOnboarding} className="home-hukam-study" aria-label={x.preferences}><span aria-hidden="true">Aa</span><span>{x.preferences}</span></button></div>
            <p className="home-hukam-provenance"><span>{hukamnama.entry.sourceName || hukamnama.entry.scripture}</span><span aria-hidden="true">·</span><span>{homeMessages.angLabel} {hukamnama.ang}</span>{hukamnama.entry.raag ? <><span aria-hidden="true">·</span><span>{renderScriptText(hukamnama.entry.raag, scriptMode)}</span></> : null}</p>
            <div className="home-hukam-state" role="status"><span>{stateLabel}</span>{isCached || older ? <button type="button" onClick={retry} disabled={refreshing}>{refreshing ? homeMessages.refreshing : homeMessages.refresh}</button> : null}</div>
          </div> : <div data-testid="home-hukamnama-error" data-ai-state="degraded"><h2 id="home-hukamnama-title">{homeMessages.hukamnamaUnavailable}</h2><p className="home-hukam-error-body">{homeMessages.hukamnamaUnavailableBody}</p><div className="home-hukam-actions"><button onClick={retry} type="button" className="home-hukam-read" data-testid="home-hukamnama-retry">{homeMessages.retry}<IconArrowRight size={18} /></button><Link to="/banis" className="home-hukam-study">{homeMessages.browseRead}</Link></div></div>}
        </div>
      </section>

      <div className="home-practice-column">
        <div ref={nitnemRef} tabIndex={-1} className="home-daily-anchor">
          <HomeDailyNitnem selected={selected} completed={completed} tracking={nitnem.completionTrackingEnabled}
            activeId={activeOptionId} initialBrowseId={initialBrowseId} getResume={practiceResume} getReadingPath={readingPath}
            getSavedStudy={option => getHomeNitnemResume(option, currentSession, readingPlaces)}
            getCompletionPath={option => getNitnemCompletionForDay(events, day, option.id)?.readingPath}
            onRead={beginReading} onLengthChange={changeReadingLength} onComplete={handleCompletion} locale={locale} />
        </div>
        <HomeReturnArea locale={locale} savedItems={savedItems} lastSavedNotice={lastSaved ? homeMessages.savedNotice[lastSaved.kind] : null}
          practice={{ tracking: nitnem.completionTrackingEnabled, days: continuity.week, completedDays: continuity.completedDaysThisWeek,
            weeklyGoal: nitnem.weeklyDayGoal, currentStreak: continuity.currentStreak, bestStreak: continuity.bestStreak }} />
      </div>
      {notice ? <div role="status" className="home-completion-notice">{notice}</div> : null}
      {artOpen ? <Suspense fallback={<div role="status" className="home-completion-notice">{locale === 'pa' ? 'ਚਿੱਤਰ ਲੋਡ ਹੋ ਰਹੇ ਹਨ…' : locale === 'hi' ? 'चित्र लोड हो रहे हैं…' : 'Loading artworks…'}</div>}><HomeArtworkSettings open={artOpen} onClose={() => setArtOpen(false)} /></Suspense> : null}
    </div>
  )
}

function ArtworkIcon() { return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="8" cy="8" r="1.5" /><path d="m3 17 6-6 4 4 3-3 5 5" /></svg> }
