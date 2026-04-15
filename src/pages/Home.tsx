import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { fetchSearch, type SearchResult } from '../api/banidb'
import {
  IconArrowRight,
  IconBookmarkFilled,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconLibrary,
  IconMoon,
  IconSearch,
  IconSun,
} from '../components/icons'
import StreakBadge from '../components/StreakBadge'
import SearchHighlight, { hasSearchMatch } from '../components/SearchHighlight'
import { useHukamnama } from '../hooks/useHukamnama'
import useAppSearchMatches from '../hooks/useAppSearchMatches'
import { useCurrentTime } from '../hooks/useCurrentTime'
import useLearnCatalog from '../hooks/useLearnCatalog'
import { useBookmarksStore, type Bookmark } from '../store/bookmarks'
import { useFavoritesStore, type FavoriteItem } from '../store/favorites'
import { useLanguageStore } from '../store/language'
import { useLearningStore } from '../store/learning'
import { useLocaleStore } from '../store/locale'
import { useOnboardingStore } from '../store/onboarding'
import { buildSessionResumePath, useProgressStore } from '../store/progress'
import { useSundarGutkaLengthStore } from '../store/sundarGutkaLength'
import { useThemeStore } from '../store/theme'
import { buildNitnemStudyPath, compareNitnemOptions, NITNEM_ROUTE_OPTIONS, type NitnemRouteOption, useNitemStore } from '../store/nitnem'
import { useVocabStore } from '../store/vocab'
import { buildVocabFeedbackId, useSavedFeedbackStore, type SavedFeedbackKind } from '../store/savedFeedback'
import type { UiLocale, VocabEntry } from '../types'
import { getEntryMeaningText, getLineMeaningText, isStructuralTitleLine, renderScriptText } from '../utils/readerDisplay'
import { getSundarGutkaLengthDetail, isSundarGutkaLengthSupportedBaniId } from '../utils/sundarGutkaLength'
import { getLearningLevelLabels } from '../utils/translations'
import { getUiCopy } from '../utils/uiCopy'
import { formatUiDate } from '../utils/formatUiDate'
import { getAngTargets, groupSearchResults } from '../utils/appSearch'
import { toLocalDayStamp } from '../utils/learnDates'
import { getLearnItemLabel, getLearnSavedItems, getTodayLearnSurface } from '../utils/learnExperience'
import { buildLearnDetailPath, buildLearnTabPath } from '../utils/learnRails'
import { buildLearnSearchPath, buildReadSearchPath } from '../utils/searchRoutes'
import { getEditorialCopy } from '../content/editorialCopy'

const TODAYS_PATH_HIGHLIGHT_CLASSES = [
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
  kind: 'learn' | 'passage' | 'vocab'
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
  learn: {
    icon: IconLibrary,
    badgeClassName: 'bg-gold/12 text-gold dark:bg-gold/14 dark:text-gold-light',
    surfaceClassName: 'border-gold/16 bg-[linear-gradient(180deg,rgba(255,248,237,0.88),rgba(249,239,221,0.76))] dark:border-gold/16 dark:bg-[linear-gradient(180deg,rgba(42,31,57,0.96),rgba(28,21,40,0.92))]',
    detailClassName: 'text-ink/66 dark:text-dark-text/70',
  },
  passage: {
    icon: IconBookmarkFilled,
    badgeClassName: 'bg-saffron/12 text-saffron dark:bg-saffron/12 dark:text-saffron-light',
    surfaceClassName: 'border-saffron/14 bg-[linear-gradient(180deg,rgba(255,250,242,0.92),rgba(250,240,227,0.8))] dark:border-saffron/18 dark:bg-[linear-gradient(180deg,rgba(40,29,55,0.96),rgba(24,19,36,0.92))]',
    detailClassName: 'text-saffron dark:text-saffron-light',
  },
  vocab: {
    icon: IconCheck,
    badgeClassName: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/14 dark:text-emerald-300',
    surfaceClassName: 'border-emerald-500/14 bg-[linear-gradient(180deg,rgba(248,252,246,0.94),rgba(239,247,237,0.82))] dark:border-emerald-500/20 dark:bg-[linear-gradient(180deg,rgba(31,39,42,0.96),rgba(20,28,30,0.92))]',
    detailClassName: 'text-ink/70 dark:text-dark-text/72',
  },
}

function formatSavedPassageReference(source: string, ang: number, verseId?: number): string {
  const sourceLabel = SOURCE_SHORT_NAME[source] ?? source.toUpperCase()
  return verseId ? `${sourceLabel} · Ang ${ang} · Verse ${verseId}` : `${sourceLabel} · Ang ${ang}`
}

function buildSavedPassagePath(item: Bookmark | FavoriteItem): string {
  if ('verseId' in item && item.verseId && item.shabadId) {
    return `/study?shabadId=${item.shabadId}&verseId=${item.verseId}`
  }

  if (item.shabadId) {
    return `/study?shabadId=${item.shabadId}`
  }

  return `/study?source=${item.source}&ang=${item.ang}`
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

const HOME_MESSAGES: Record<UiLocale, {
  resumeReading: string
  resumeStudyBody: string
  resumeReadingBody: string
  openTodaysHukamnama: string
  todaysMeaningBody: string
  todaysReadingBody: string
  buildHabitTitle: string
  learnScriptTitle: string
  buildConfidenceTitle: string
  childLearnBody: string
  adultLearnBody: string
  pickUpPausedTitle: string
  nitnemImmediateBody: string
  dailyNitnem: string
  nitnemHeroTitle: string
  nitnemHeroBody: string
  nitnemRemaining: (count: number) => string
  nitnemCompleteToday: string
  nitnemCarouselLabel: (index: number, total: number) => string
  beginNitnem: string
  continueNitnem: string
  completeNitnemStep: string
  markNitnemIncomplete: string
  customizeNitnem: string
  hideNitnemCustomize: string
  chooseNitnemBody: string
  beginTodayTitle: string
  beginTodayMeaningTitle: string
  beginTodayMeaningBody: string
  beginTodayBody: string
  todayInLearn: string
  todayInLearnBody: string
  openLearnToday: string
  continueInLearn: string
  featuredShabad: string
  openFeaturedShabad: string
  topicGuideMeta: string
  learnFallbackTitle: string
  learnFallbackBody: string
  browseRead: string
  trackSuffix: string
  reviewDue: (count: number) => string
}> = {
  en: {
    resumeReading: 'Resume Reading',
    resumeStudyBody: 'Return to the last passage you were studying so the context stays intact.',
    resumeReadingBody: 'Open the passage you were already working through.',
    openTodaysHukamnama: 'Open Today’s Hukamnama',
    todaysMeaningBody: 'Start with the daily hukamnama and keep the meaning close.',
    todaysReadingBody: 'Start with the daily hukamnama and stay in a steady daily rhythm.',
    buildHabitTitle: 'Build a reading habit before adding more weight.',
    learnScriptTitle: 'Learn the script before chasing too much meaning.',
    buildConfidenceTitle: 'Build reading confidence before the overwhelm.',
    childLearnBody: 'Keep the next step simple: guided letters, short drills, then one real line at a time.',
    adultLearnBody: 'Start with guided letters, practice recognition, then move into live pankti when you are ready.',
    pickUpPausedTitle: 'Pick up exactly where you paused.',
    nitnemImmediateBody: 'Nitnem should feel immediate. Resume your last reading without hunting through the library.',
    dailyNitnem: 'Daily Nitnem',
    nitnemHeroTitle: 'Move through Nitnem one bani at a time.',
    nitnemHeroBody: 'A calm ritual card for the next bani that matters now, with the rest tucked behind it until you need it.',
    nitnemRemaining: (count) => `${count} remaining today`,
    nitnemCompleteToday: 'Complete for today',
    nitnemCarouselLabel: (index, total) => `Nitnem card ${index} of ${total}`,
    beginNitnem: 'Begin Nitnem',
    continueNitnem: 'Continue Nitnem',
    completeNitnemStep: 'Mark as complete',
    markNitnemIncomplete: 'Mark as incomplete',
    customizeNitnem: 'Customize Daily Nitnem',
    hideNitnemCustomize: 'Hide Nitnem options',
    chooseNitnemBody: 'Choose the banis that should appear in your daily Nitnem ritual.',
    beginTodayTitle: 'Begin with today’s hukamnama.',
    beginTodayMeaningTitle: 'Begin with today’s hukamnama and keep the meaning close.',
    beginTodayMeaningBody: 'A calm first step for daily reading, with meaning controls and guided support built into the reader.',
    beginTodayBody: 'A calm first step for daily reading, with meaning controls and a cleaner mobile reader built in.',
    todayInLearn: 'Today in Learn',
    todayInLearnBody: 'Keep the learning side of the app grounded in one real next step, not placeholder prompts.',
    openLearnToday: 'Open Learn Today',
    continueInLearn: 'Continue in Learn',
    featuredShabad: 'Featured Shabad',
    openFeaturedShabad: 'Open Featured Shabad',
    topicGuideMeta: 'Topic guide',
    learnFallbackTitle: 'Open Learn',
    learnFallbackBody: 'Browse the guided surfaces that are already live in the app.',
    browseRead: 'Browse Read',
    trackSuffix: 'track',
    reviewDue: (count) => `${count} review item${count === 1 ? '' : 's'} due`,
  },
  pa: {
    resumeReading: 'ਪੜ੍ਹਨਾ ਜਾਰੀ ਰੱਖੋ',
    resumeStudyBody: 'ਜਿੱਥੇ ਤੁਸੀਂ ਅਖੀਰ ਵਾਰ ਅਰਥ ਨਾਲ ਪੜ੍ਹ ਰਹੇ ਸੀ, ਓਥੇ ਹੀ ਵਾਪਸ ਜਾਓ ਤਾਂ ਜੋ ਸੰਦਰਭ ਬਣਾ ਰਹੇ।',
    resumeReadingBody: 'ਉਹੀ ਪੰਕਤੀ ਖੋਲ੍ਹੋ ਜਿਸ ਤੇ ਤੁਸੀਂ ਪਹਿਲਾਂ ਕੰਮ ਕਰ ਰਹੇ ਸੀ।',
    openTodaysHukamnama: 'ਅੱਜ ਦਾ ਹੁਕਮਨਾਮਾ ਖੋਲ੍ਹੋ',
    todaysMeaningBody: 'ਰੋਜ਼ਾਨਾ ਹੁਕਮਨਾਮੇ ਨਾਲ ਸ਼ੁਰੂ ਕਰੋ ਅਤੇ ਅਰਥ ਨੂੰ ਨੇੜੇ ਰੱਖੋ।',
    todaysReadingBody: 'ਰੋਜ਼ਾਨਾ ਹੁਕਮਨਾਮੇ ਨਾਲ ਸ਼ੁਰੂ ਕਰੋ ਅਤੇ ਪਾਠ ਦੀ ਲਯ ਬਣਾਈ ਰੱਖੋ।',
    buildHabitTitle: 'ਹੋਰ ਭਾਰ ਜੋੜਨ ਤੋਂ ਪਹਿਲਾਂ ਪੜ੍ਹਨ ਦੀ ਆਦਤ ਬਣਾਓ।',
    learnScriptTitle: 'ਬਹੁਤ ਅਰਥ ਦੇ ਪਿੱਛੇ ਦੌੜਨ ਤੋਂ ਪਹਿਲਾਂ ਲਿਪੀ ਸਿੱਖੋ।',
    buildConfidenceTitle: 'ਘਬਰਾਹਟ ਤੋਂ ਪਹਿਲਾਂ ਪੜ੍ਹਨ ਦਾ ਵਿਸ਼ਵਾਸ ਬਣਾਓ।',
    childLearnBody: 'ਅਗਲਾ ਕਦਮ ਸੌਖਾ ਰੱਖੋ: ਮਾਰਗਦਰਸ਼ਿਤ ਅੱਖਰ, ਛੋਟੇ ਅਭਿਆਸ, ਫਿਰ ਇੱਕ ਅਸਲੀ ਲਾਈਨ।',
    adultLearnBody: 'ਮਾਰਗਦਰਸ਼ਿਤ ਅੱਖਰਾਂ ਨਾਲ ਸ਼ੁਰੂ ਕਰੋ, ਪਛਾਣ ਦਾ ਅਭਿਆਸ ਕਰੋ, ਫਿਰ ਜਦੋਂ ਤਿਆਰ ਹੋਵੋ ਤਾਂ ਜੀਵੰਤ ਪੰਕਤੀ ਵੱਲ ਵਧੋ।',
    pickUpPausedTitle: 'ਜਿੱਥੇ ਰੁਕੇ ਸੀ ਓਥੇ ਹੀ ਤੋਂ ਚੁੱਕੋ।',
    nitnemImmediateBody: 'ਨਿਤਨੇਮ ਤੁਰੰਤ ਮਹਿਸੂਸ ਹੋਣਾ ਚਾਹੀਦਾ ਹੈ। ਲਾਇਬ੍ਰੇਰੀ ਵਿੱਚ ਲੱਭਣ ਤੋਂ ਬਿਨਾਂ ਆਪਣਾ ਪਿਛਲਾ ਪਾਠ ਜਾਰੀ ਰੱਖੋ।',
    dailyNitnem: 'ਰੋਜ਼ਾਨਾ ਨਿਤਨੇਮ',
    nitnemHeroTitle: 'ਨਿਤਨੇਮ ਨੂੰ ਇੱਕ ਵਾਰ ਵਿੱਚ ਇੱਕ ਬਾਣੀ ਨਾਲ ਨੇੜੇ ਰੱਖੋ।',
    nitnemHeroBody: 'ਅਗਲੀ ਜ਼ਰੂਰੀ ਬਾਣੀ ਪਹਿਲਾਂ ਦਿਖੇ, ਬਾਕੀ ਚੋਣਾਂ ਸਿਰਫ਼ ਲੋੜ ਪੈਣ ਤੇ ਖੁੱਲਣ।',
    nitnemRemaining: (count) => `ਅੱਜ ਲਈ ${count} ਬਾਕੀ`,
    nitnemCompleteToday: 'ਅੱਜ ਲਈ ਪੂਰਾ',
    nitnemCarouselLabel: (index, total) => `ਨਿਤਨੇਮ ਕਾਰਡ ${index} / ${total}`,
    beginNitnem: 'ਨਿਤਨੇਮ ਸ਼ੁਰੂ ਕਰੋ',
    continueNitnem: 'ਨਿਤਨੇਮ ਜਾਰੀ ਰੱਖੋ',
    completeNitnemStep: 'ਪੂਰਾ ਚਿੰਨ੍ਹਿਤ ਕਰੋ',
    markNitnemIncomplete: 'ਅਧੂਰਾ ਚਿੰਨ੍ਹਿਤ ਕਰੋ',
    customizeNitnem: 'ਰੋਜ਼ਾਨਾ ਨਿਤਨੇਮ ਸੰਵਾਰੋ',
    hideNitnemCustomize: 'ਨਿਤਨੇਮ ਚੋਣਾਂ ਲੁਕਾਓ',
    chooseNitnemBody: 'ਉਹ ਬਾਣੀਆਂ ਚੁਣੋ ਜੋ ਤੁਹਾਡੇ ਰੋਜ਼ਾਨਾ ਨਿਤਨੇਮ ਵਿੱਚ ਦਿਸਣੀਆਂ ਚਾਹੀਦੀਆਂ ਹਨ।',
    beginTodayTitle: 'ਅੱਜ ਦੇ ਹੁਕਮਨਾਮੇ ਨਾਲ ਸ਼ੁਰੂ ਕਰੋ।',
    beginTodayMeaningTitle: 'ਅੱਜ ਦੇ ਹੁਕਮਨਾਮੇ ਨਾਲ ਸ਼ੁਰੂ ਕਰੋ ਅਤੇ ਅਰਥ ਨੂੰ ਨੇੜੇ ਰੱਖੋ।',
    beginTodayMeaningBody: 'ਰੋਜ਼ਾਨਾ ਪਾਠ ਲਈ ਇੱਕ ਸ਼ਾਂਤ ਪਹਿਲਾ ਕਦਮ, ਜਿਸ ਵਿੱਚ ਅਰਥ ਨਿਯੰਤਰਣ ਅਤੇ ਮਾਰਗਦਰਸ਼ਿਤ ਸਹਾਇਤਾ ਬਣੀ ਹੋਈ ਹੈ।',
    beginTodayBody: 'ਰੋਜ਼ਾਨਾ ਪਾਠ ਲਈ ਇੱਕ ਸ਼ਾਂਤ ਪਹਿਲਾ ਕਦਮ, ਜਿਸ ਵਿੱਚ ਅਰਥ ਨਿਯੰਤਰਣ ਅਤੇ ਹੋਰ ਸਾਫ਼ ਮੋਬਾਈਲ ਪਾਠਕ ਸ਼ਾਮਲ ਹੈ।',
    todayInLearn: 'ਅੱਜ Learn ਵਿੱਚ',
    todayInLearnBody: 'ਸਿੱਖਣ ਵਾਲੀ ਸਤਹ ਨੂੰ ਇੱਕ ਅਸਲੀ ਅਗਲੇ ਕਦਮ ਨਾਲ ਜੁੜਿਆ ਰੱਖੋ।',
    openLearnToday: 'ਅੱਜ ਦਾ Learn ਖੋਲ੍ਹੋ',
    continueInLearn: 'Learn ਵਿੱਚ ਜਾਰੀ ਰੱਖੋ',
    featuredShabad: 'ਖਾਸ ਸ਼ਬਦ',
    openFeaturedShabad: 'ਖਾਸ ਸ਼ਬਦ ਖੋਲ੍ਹੋ',
    topicGuideMeta: 'ਵਿਸ਼ਾ ਮਾਰਗਦਰਸ਼ਕ',
    learnFallbackTitle: 'Learn ਖੋਲ੍ਹੋ',
    learnFallbackBody: 'ਐਪ ਦੇ ਮਾਰਗਦਰਸ਼ਿਤ ਅਤੇ ਜੀਵੰਤ ਸਤਹਾਂ ਵਿੱਚ ਦਾਖ਼ਲ ਹੋਵੋ।',
    browseRead: 'ਪੜ੍ਹੋ ਬ੍ਰਾਊਜ਼ ਕਰੋ',
    trackSuffix: 'ਮਾਰਗ',
    reviewDue: (count) => `${count} ਦੁਹਰਾਈ ਆਇਟਮ ਬਾਕੀ`,
  },
  hi: {
    resumeReading: 'पढ़ना जारी रखें',
    resumeStudyBody: 'जिस अंश को आप अर्थ के साथ पढ़ रहे थे, वहीं लौटें ताकि संदर्भ बना रहे।',
    resumeReadingBody: 'वही अंश खोलें जिस पर आप पहले काम कर रहे थे।',
    openTodaysHukamnama: 'आज का हुकमनामा खोलें',
    todaysMeaningBody: 'दैनिक हुकमनामे से शुरू करें और अर्थ को पास रखें।',
    todaysReadingBody: 'दैनिक हुकमनामे से शुरू करें और पढ़ने की लय बनाए रखें।',
    buildHabitTitle: 'और भार जोड़ने से पहले पढ़ने की आदत बनाइए।',
    learnScriptTitle: 'बहुत अर्थ पकड़ने से पहले लिपि सीखिए।',
    buildConfidenceTitle: 'घबराहट से पहले पढ़ने का आत्मविश्वास बनाइए।',
    childLearnBody: 'अगला कदम सरल रखें: मार्गदर्शित अक्षर, छोटे अभ्यास, फिर एक वास्तविक पंक्ति।',
    adultLearnBody: 'मार्गदर्शित अक्षरों से शुरू करें, पहचान का अभ्यास करें, फिर तैयार होने पर जीवंत पंक्ति में जाएँ।',
    pickUpPausedTitle: 'जहाँ रुके थे, वहीं से आगे बढ़ें।',
    nitnemImmediateBody: 'नितनेम तुरंत उपलब्ध लगना चाहिए। लाइब्रेरी में खोजे बिना अपना पिछला पाठ जारी रखें।',
    dailyNitnem: 'दैनिक नितनेम',
    nitnemHeroTitle: 'नितनेम को एक समय में एक बानी के साथ पास रखें।',
    nitnemHeroBody: 'अगली ज़रूरी बानी सामने रहे, बाकी विकल्प तभी खुलें जब आप उन्हें सच में चाहें।',
    nitnemRemaining: (count) => `आज ${count} बाकी`,
    nitnemCompleteToday: 'आज के लिए पूरा',
    nitnemCarouselLabel: (index, total) => `नितनेम कार्ड ${index} / ${total}`,
    beginNitnem: 'नितनेम शुरू करें',
    continueNitnem: 'नितनेम जारी रखें',
    completeNitnemStep: 'पूरा चिन्हित करें',
    markNitnemIncomplete: 'अधूरा चिन्हित करें',
    customizeNitnem: 'दैनिक नितनेम बदलें',
    hideNitnemCustomize: 'नितनेम विकल्प छिपाएँ',
    chooseNitnemBody: 'वे बानियाँ चुनें जो आपके दैनिक नितनेम में दिखाई दें।',
    beginTodayTitle: 'आज के हुकमनामे से शुरू करें।',
    beginTodayMeaningTitle: 'आज के हुकमनामे से शुरू करें और अर्थ को पास रखें।',
    beginTodayMeaningBody: 'दैनिक पाठ के लिए एक शांत पहला कदम, जिसमें अर्थ नियंत्रण और मार्गदर्शित सहायता पहले से जुड़ी हो।',
    beginTodayBody: 'दैनिक पाठ के लिए एक शांत पहला कदम, जिसमें अर्थ नियंत्रण और एक अधिक साफ़ मोबाइल रीडर शामिल है।',
    todayInLearn: 'आज Learn में',
    todayInLearnBody: 'सीखने वाली सतह को एक वास्तविक अगले कदम से जोड़े रखें।',
    openLearnToday: 'आज का Learn खोलें',
    continueInLearn: 'Learn में जारी रखें',
    featuredShabad: 'विशेष शबद',
    openFeaturedShabad: 'विशेष शबद खोलें',
    topicGuideMeta: 'विषय मार्गदर्शिका',
    learnFallbackTitle: 'Learn खोलें',
    learnFallbackBody: 'ऐप के भीतर मौजूद वास्तविक guided surfaces में जाएँ।',
    browseRead: 'रीड ब्राउज़ करें',
    trackSuffix: 'मार्ग',
    reviewDue: (count) => `${count} रिव्यू आइटम बाकी`,
  },
}

export default function Home() {
  const location = useLocation()
  const navigate = useNavigate()
  const streak = useProgressStore(state => state.streak)
  const currentSession = useProgressStore(state => state.currentSession)
  const { dark, toggle: toggleTheme } = useThemeStore()
  const scriptMode = useLanguageStore(s => s.scriptMode)
  const meaningLanguage = useLanguageStore(s => s.meaningLanguage)
  const englishSource = useLanguageStore(s => s.englishSource)
  const locale = useLocaleStore(s => s.locale)
  const {
    selectedIds,
    markComplete,
    unmarkComplete,
    isComplete,
    toggleSelected,
    resetSelections,
    resetIfNewDay,
  } = useNitemStore()
  const bookmarks = useBookmarksStore(state => state.bookmarks)
  const favorites = useFavoritesStore(state => state.favorites)
  const vocab = useVocabStore(s => s.vocab)
  const lastSaved = useSavedFeedbackStore(state => state.lastSaved)
  const learnStateSnapshot = useLearningStore(state => state.learnState)
  const {
    learningLevel,
    learningGoal,
    openOnboarding,
  } = useOnboardingStore()
  const copy = getUiCopy(locale)
  const editorial = getEditorialCopy(locale)
  const homeCopy = copy.home
  const libraryCopy = copy.library
  const homeMessages = HOME_MESSAGES[locale]
  const learningLevelLabels = getLearningLevelLabels(locale)
  const [nitnemOpen, setNitnemOpen] = useState(false)
  const [activeNitnemIndex, setActiveNitnemIndex] = useState(0)
  const [homeSearchQuery, setHomeSearchQuery] = useState('')
  const [homeSearchResults, setHomeSearchResults] = useState<SearchResult[]>([])
  const [homeSearching, setHomeSearching] = useState(false)
  const [homeSearchError, setHomeSearchError] = useState(false)
  const [confirmingNitnemReset, setConfirmingNitnemReset] = useState(false)
  const nitnemCarouselRef = useRef<HTMLDivElement | null>(null)
  const todaysPathRef = useRef<HTMLElement | null>(null)
  const homeSearchInputRef = useRef<HTMLInputElement | null>(null)
  const homeSearchDebounceRef = useRef<number | null>(null)
  const nitnemResetConfirmRef = useRef<number | null>(null)
  const sundarGutkaLengths = useSundarGutkaLengthStore(state => state.lengths)
  const now = useCurrentTime()
  const {
    catalog: learnCatalog,
    loading: learnCatalogLoading,
    error: learnCatalogError,
  } = useLearnCatalog()
  const learnDayStamp = toLocalDayStamp(new Date(now))

  const getNitnemOptionDetail = (option: NitnemRouteOption) => (
    option.supportsLengthAdjustment && isSundarGutkaLengthSupportedBaniId(option.baseBaniId)
      ? getSundarGutkaLengthDetail(sundarGutkaLengths[option.baseBaniId])
      : option.detail
  )

  useEffect(() => {
    resetIfNewDay()
  }, [resetIfNewDay])

  useEffect(() => {
    return () => {
      if (homeSearchDebounceRef.current !== null) {
        window.clearTimeout(homeSearchDebounceRef.current)
      }
      if (nitnemResetConfirmRef.current !== null) {
        window.clearTimeout(nitnemResetConfirmRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (nitnemOpen) return
    if (nitnemResetConfirmRef.current !== null) {
      window.clearTimeout(nitnemResetConfirmRef.current)
      nitnemResetConfirmRef.current = null
    }
    setConfirmingNitnemReset(false)
  }, [nitnemOpen])

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
        todaysPathRef.current?.classList.add(...TODAYS_PATH_HIGHLIGHT_CLASSES)
        todaysPathRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
      highlightTimer = window.setTimeout(() => {
        todaysPathRef.current?.classList.remove(...TODAYS_PATH_HIGHLIGHT_CLASSES)
      }, 2600)
    }

    navigate(location.pathname, { replace: true, state: null })

    return () => {
      if (highlightTimer !== null) {
        window.clearTimeout(highlightTimer)
      }
    }
  }, [location.pathname, location.state, navigate, openOnboarding])

  const { data: hukamnama, loading: hukamnamaLoading } = useHukamnama()
  const todayLearnSurface = useMemo(
    () => (learnCatalog ? getTodayLearnSurface(learnCatalog, learnDayStamp, learnStateSnapshot) : null),
    [learnCatalog, learnDayStamp, learnStateSnapshot]
  )
  const todayGuidance = todayLearnSurface?.dailyGuidance.item ?? null
  const todayGuidancePath = todayGuidance
    ? buildLearnDetailPath('daily-guidance', todayGuidance.id, 'today')
    : null
  const featuredShabad = todayLearnSurface?.featuredShabad.item ?? null
  const featuredShabadPath = featuredShabad
    ? buildLearnDetailPath('shabad-deep-dive', featuredShabad.id, 'today')
    : null
  const learnTodayPath = buildLearnTabPath('today')
  const learnTopicsPath = buildLearnTabPath('topics')

  const selectedNitnemOptions = useMemo(() => {
    return selectedIds
      .map(optionId => NITNEM_ROUTE_OPTIONS.find(option => option.id === optionId) ?? null)
      .filter((option): option is NitnemRouteOption => option !== null)
      .sort(compareNitnemOptions)
  }, [selectedIds])
  const availableNitnemOptions = useMemo(() => {
    return [...NITNEM_ROUTE_OPTIONS].sort(compareNitnemOptions)
  }, [])
  const nitnemDone = selectedNitnemOptions.filter(option => isComplete(option.id)).length
  const nitnemRemainingCount = Math.max(0, selectedNitnemOptions.length - nitnemDone)
  const nitnemProgressPct = selectedNitnemOptions.length > 0
    ? (nitnemDone / selectedNitnemOptions.length) * 100
    : 0
  const savedLearnItems = useMemo(
    () => (learnCatalog ? getLearnSavedItems(learnCatalog, learnStateSnapshot.savedItemIds) : []),
    [learnCatalog, learnStateSnapshot.savedItemIds]
  )
  const savedBookmarks = bookmarks.length
  const savedFavorites = favorites.length
  const savedReviewItems = vocab.length
  const resumePath = buildSessionResumePath(currentSession)
  const savedShelfNotice = useMemo(() => {
    switch (lastSaved?.kind) {
      case 'learn':
        return 'Learn save added to the shelf.'
      case 'bookmark':
        return 'Bookmarked passage added to the shelf.'
      case 'favorite':
        return 'Favorite added to the shelf.'
      case 'review':
        return 'Review Bank updated.'
      default:
        return null
    }
  }, [lastSaved?.kind])

  const readAction = useMemo(() => {
    const path = resumePath ?? (hukamnama ? `/study?hukamnamaDate=${hukamnama.date}` : '/banis')

    if (resumePath) {
      return {
        title: homeMessages.resumeReading,
        body: learningGoal === 'understand'
          ? homeMessages.resumeStudyBody
          : homeMessages.resumeReadingBody,
        path,
      }
    }

    return {
      title: homeMessages.openTodaysHukamnama,
      body: learningGoal === 'understand'
        ? homeMessages.todaysMeaningBody
        : homeMessages.todaysReadingBody,
      path,
    }
  }, [homeMessages, hukamnama, learningGoal, resumePath])
  const hukamnamaPreviewLine = useMemo(() => {
    if (!hukamnama) return null
    return hukamnama.entry.lines?.find(line => !line.isHeader && line.gurmukhi.trim() && !isStructuralTitleLine(line.gurmukhi))
      ?? hukamnama.entry.lines?.find(line => !line.isHeader && line.gurmukhi.trim())
      ?? hukamnama.entry.lines?.find(line => line.gurmukhi.trim())
      ?? null
  }, [hukamnama])
  const hukamnamaMeaningPreview = useMemo(() => {
    if (!hukamnama || meaningLanguage === 'none') return ''
    if (hukamnamaPreviewLine) {
      return getLineMeaningText(hukamnamaPreviewLine, meaningLanguage, englishSource)
    }
    return getEntryMeaningText(hukamnama.entry, meaningLanguage, englishSource)
  }, [englishSource, hukamnama, hukamnamaPreviewLine, meaningLanguage])
  const savedPreviewItems = useMemo<HomeSavedPreviewItem[]>(() => {
    const previewItems: HomeSavedPreviewItem[] = []
    const latestLearnSave = savedLearnItems[0]

    if (latestLearnSave) {
      previewItems.push({
        id: latestLearnSave.id,
        kind: 'learn',
        feedbackKind: 'learn',
        label: getLearnItemLabel(latestLearnSave.kind),
        title: latestLearnSave.title,
        detail: latestLearnSave.detail,
        path: buildLearnDetailPath(latestLearnSave.kind, latestLearnSave.id, 'saved'),
        meta: latestLearnSave.theme,
      })
    }

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
        path: buildSavedPassagePath(latestSavedPassage.item),
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
  }, [bookmarks, favorites, homeCopy.phrases, homeCopy.words, libraryCopy.bookmarks, libraryCopy.favorites, libraryCopy.reviewBank, locale, savedLearnItems, vocab])
  const featuredShabadSupport = useMemo(() => {
    if (featuredShabad && featuredShabadPath) {
      return {
        title: homeMessages.featuredShabad,
        summary: featuredShabad.title,
        body: editorial?.learn.compactShabadBody ?? featuredShabad.whyItMatters,
        meta: featuredShabad.rotation.theme,
        actionLabel: homeMessages.openFeaturedShabad,
        path: featuredShabadPath,
      }
    }

    if (todayGuidance && todayGuidancePath) {
      return {
        title: homeMessages.featuredShabad,
        summary: todayGuidance.title,
        body: editorial?.learn.compactGuidanceBody ?? todayGuidance.summary,
        meta: homeCopy.grow,
        actionLabel: homeMessages.openLearnToday,
        path: todayGuidancePath,
      }
    }

    return {
      title: homeMessages.featuredShabad,
      summary: homeMessages.learnFallbackTitle,
      body: homeMessages.learnFallbackBody,
      meta: learningLevelLabels[learningLevel],
      actionLabel: homeMessages.openLearnToday,
      path: learnTodayPath,
    }
  }, [
    editorial?.learn.compactGuidanceBody,
    editorial?.learn.compactShabadBody,
    featuredShabad,
    featuredShabadPath,
    homeCopy.grow,
    homeMessages.featuredShabad,
    homeMessages.learnFallbackBody,
    homeMessages.learnFallbackTitle,
    homeMessages.openFeaturedShabad,
    homeMessages.openLearnToday,
    learnTodayPath,
    learningLevel,
    learningLevelLabels,
    todayGuidance,
    todayGuidancePath,
  ])
  const learnSupport = useMemo(() => {
    const continueLearning = todayLearnSurface?.continueLearning

    if (continueLearning?.kind === 'collection') {
      return {
        title: homeMessages.todayInLearn,
        summary: continueLearning.collection.subtitle,
        body: editorial?.learn.compactContinueBody ?? continueLearning.collection.description,
        meta: continueLearning.collection.durationLabel,
        actionLabel: homeMessages.continueInLearn,
        path: buildLearnDetailPath('collection', continueLearning.collection.id, 'today'),
      }
    }

    if (continueLearning?.kind === 'topic') {
      return {
        title: homeMessages.todayInLearn,
        summary: continueLearning.topic.shortTitle,
        body: editorial?.learn.compactContinueBody ?? continueLearning.topic.centralInsight,
        meta: homeMessages.topicGuideMeta,
        actionLabel: homeMessages.continueInLearn,
        path: buildLearnDetailPath('topic-guide', continueLearning.topic.id, 'today'),
      }
    }

    if (todayGuidance && todayGuidancePath) {
      return {
        title: homeMessages.todayInLearn,
        summary: todayGuidance.title,
        body: editorial?.learn.compactGuidanceBody ?? todayGuidance.summary ?? homeMessages.todayInLearnBody,
        meta: homeCopy.grow,
        actionLabel: homeMessages.openLearnToday,
        path: todayGuidancePath,
      }
    }

    return {
      title: homeMessages.learnFallbackTitle,
      summary: homeMessages.todayInLearn,
      body: homeMessages.learnFallbackBody,
      meta: learningLevelLabels[learningLevel],
      actionLabel: homeMessages.openLearnToday,
      path: learnTodayPath,
    }
  }, [
    editorial?.learn.compactContinueBody,
    editorial?.learn.compactGuidanceBody,
    homeCopy.grow,
    homeMessages.continueInLearn,
    homeMessages.learnFallbackBody,
    homeMessages.learnFallbackTitle,
    homeMessages.openLearnToday,
    homeMessages.todayInLearn,
    homeMessages.todayInLearnBody,
    homeMessages.topicGuideMeta,
    learnTodayPath,
    learningLevel,
    learningLevelLabels,
    todayGuidance,
    todayGuidancePath,
    todayLearnSurface?.continueLearning,
  ])
  const homeAppMatches = useAppSearchMatches(homeSearchQuery, 'all').slice(0, 6)
  const homeAngTargets = useMemo(
    () => getAngTargets(homeSearchQuery, 'all'),
    [homeSearchQuery]
  )
  const groupedHomeSearchResults = useMemo(
    () => groupSearchResults(homeSearchResults).slice(0, 4),
    [homeSearchResults]
  )
  const trimmedHomeSearchQuery = homeSearchQuery.trim()
  const hasActiveHomeSearch = trimmedHomeSearchQuery.length >= 2
  const homeHasLearnMatches = homeAppMatches.some(match => match.kind === 'learn-topic')
  const homeHasReadRouteMatches = homeAppMatches.some(match => match.kind === 'read-route')
  const preferredHomeSearchSurface = useMemo<'learn' | 'read'>(() => {
    if (homeAngTargets.length > 0) return 'read'
    if (homeHasLearnMatches && !homeHasReadRouteMatches) return 'learn'
    if (homeHasReadRouteMatches || groupedHomeSearchResults.length > 0) return 'read'
    return 'learn'
  }, [groupedHomeSearchResults.length, homeAngTargets.length, homeHasLearnMatches, homeHasReadRouteMatches])
  const learnSearchPath = hasActiveHomeSearch ? buildLearnSearchPath(trimmedHomeSearchQuery) : null
  const readSearchPath = hasActiveHomeSearch
    ? buildReadSearchPath({
      query: trimmedHomeSearchQuery,
      mode: homeAngTargets.length > 0 ? 'ang' : 'auto-detect',
      source: 'all',
    })
    : null

  const openLearnSearch = () => {
    navigate(learnSearchPath ?? buildLearnSearchPath(trimmedHomeSearchQuery), {
      state: trimmedHomeSearchQuery ? null : { focusSearch: true },
    })
  }

  const openReadSearch = () => {
    navigate(readSearchPath ?? buildReadSearchPath({
      query: trimmedHomeSearchQuery,
      mode: homeAngTargets.length > 0 ? 'ang' : 'auto-detect',
      source: 'all',
    }), {
      state: trimmedHomeSearchQuery ? null : { focusSearch: true },
    })
  }

  const openPreferredSearch = () => {
    if (preferredHomeSearchSurface === 'read') {
      openReadSearch()
      return
    }
    openLearnSearch()
  }

  useEffect(() => {
    const trimmed = homeSearchQuery.trim()
    let cancelled = false

    if (homeSearchDebounceRef.current !== null) {
      window.clearTimeout(homeSearchDebounceRef.current)
      homeSearchDebounceRef.current = null
    }

    if (trimmed.length < 2) {
      setHomeSearchResults([])
      setHomeSearchError(false)
      setHomeSearching(false)
      return
    }

    setHomeSearchError(false)
    setHomeSearching(true)
    homeSearchDebounceRef.current = window.setTimeout(async () => {
      try {
        const results = await fetchSearch(trimmed, 8, 'all', 'home-search')
        if (cancelled) return
        setHomeSearchResults(results)
        setHomeSearchError(false)
      } catch {
        if (cancelled) return
        setHomeSearchResults([])
        setHomeSearchError(true)
      } finally {
        if (!cancelled) {
          setHomeSearching(false)
        }
      }
    }, 260)

    return () => {
      cancelled = true
      if (homeSearchDebounceRef.current !== null) {
        window.clearTimeout(homeSearchDebounceRef.current)
        homeSearchDebounceRef.current = null
      }
    }
  }, [homeSearchQuery])

  useEffect(() => {
    if (selectedNitnemOptions.length === 0) {
      setActiveNitnemIndex(0)
      return
    }
    setActiveNitnemIndex(currentIndex => Math.min(currentIndex, selectedNitnemOptions.length - 1))
  }, [selectedNitnemOptions.length])

  useEffect(() => {
    const container = nitnemCarouselRef.current
    if (!container) return

    const slide = container.children.item(activeNitnemIndex)
    if (slide instanceof HTMLElement && typeof slide.scrollIntoView === 'function') {
      slide.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [activeNitnemIndex])

  const handleNitnemReset = () => {
    if (confirmingNitnemReset) {
      if (nitnemResetConfirmRef.current !== null) {
        window.clearTimeout(nitnemResetConfirmRef.current)
        nitnemResetConfirmRef.current = null
      }
      setConfirmingNitnemReset(false)
      resetSelections()
      return
    }

    setConfirmingNitnemReset(true)
    if (nitnemResetConfirmRef.current !== null) {
      window.clearTimeout(nitnemResetConfirmRef.current)
    }
    nitnemResetConfirmRef.current = window.setTimeout(() => {
      nitnemResetConfirmRef.current = null
      setConfirmingNitnemReset(false)
    }, 3000)
  }

  return (
    <div className="page-shell animate-fade-in" data-testid="page-home" data-page="home" data-ai-surface="home" data-ai-state="ready">
      <div className="flex justify-between items-start gap-3 mb-5">
        <div>
          <p className="eyebrow">{editorial?.brand.domain ?? 'Naamras.xyz'}</p>
          <p className="font-display text-[3.1rem] text-ink dark:text-dark-text leading-none mt-2">
            {editorial?.brand.name ?? 'NaamRas'}
          </p>
          <p className="font-sans text-sm leading-6 text-ink/62 dark:text-dark-text/62 mt-3 max-w-[26ch]">
            {editorial?.brand.promise ?? copy.home.promise}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="section-shell-quiet min-h-[44px] min-w-[44px] flex items-center justify-center text-ink/75 dark:text-dark-text/75 active:scale-95 transition-transform duration-150"
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={dark}
            data-testid="home-theme-toggle"
            data-ai-action="toggle-theme"
          >
            {dark ? <IconSun size={18} /> : <IconMoon size={18} />}
          </button>
          <StreakBadge streak={streak} />
        </div>
      </div>

      <div className="mb-4">
        <p className="font-sans text-xs uppercase tracking-[0.18em] text-gold dark:text-gold-light">
          {formatUiDate(locale)}
        </p>
        <h1 className="font-display text-[1.8rem] leading-none text-ink dark:text-dark-text mt-2">
          <span className="block">{copy.home.greetingPrimary}</span>
          <span className="mt-2 block font-sans text-[0.85rem] font-medium uppercase tracking-[0.18em] text-gold dark:text-gold-light">
            {copy.home.greetingSecondary}
          </span>
        </h1>
      </div>

      <section
        className="hero-surface ornate-top p-6 mb-5 animate-slide-up stagger-1"
        aria-labelledby="home-hero-title"
        data-testid="home-hero"
      >
        <h2 id="home-hero-title" className="sr-only">NaamRas Learn</h2>
        <div className="flex items-center justify-between gap-3 mb-5">
          <span className="eyebrow">{editorial?.learn.eyebrow ?? 'NaamRas Learn'}</span>
          <span className="chip-pill">{learningLevelLabels[learningLevel]}</span>
        </div>
        <div className="grid gap-4">
          {hukamnamaLoading ? (
            <div className="section-shell-quiet p-5 animate-pulse" data-testid="home-hukamnama-card">
              <div className="h-3 rounded bg-sand/20 dark:bg-dark-text/10 w-28 mb-3" />
              <div className="h-3 rounded bg-sand/20 dark:bg-dark-text/10 w-40" />
              <div className="mt-4 h-12 rounded bg-sand/20 dark:bg-dark-text/10" />
              <div className="mt-3 h-4 rounded bg-sand/20 dark:bg-dark-text/10 w-4/5" />
              <div className="mt-2 h-4 rounded bg-sand/20 dark:bg-dark-text/10 w-3/5" />
            </div>
          ) : hukamnama ? (
            <div
              className="section-shell-quiet p-5"
              data-testid="home-hukamnama-card"
              data-ai-surface="home-hukamnama"
              data-ai-state="ready"
            >
              <p className="eyebrow mb-2">{homeCopy.todaysHukamnama}</p>
              <p className="font-sans text-[11px] text-ink/65 dark:text-dark-text/65 mb-2">
                {hukamnama.entry.raag ? `${hukamnama.entry.raag} · ` : ''}
                {hukamnama.entry.scripture} · Ang {hukamnama.ang}
              </p>
              <p
                lang={scriptMode === 'devanagari' ? 'hi' : 'pa-Guru'}
                className={`${scriptMode === 'devanagari' ? 'font-sans' : 'font-gurmukhi'} mt-4 text-[2.2rem] leading-[1.15] text-ink dark:text-dark-text line-clamp-3`}
              >
                {renderScriptText(hukamnamaPreviewLine?.gurmukhi ?? hukamnama.entry.gurmukhi, scriptMode)}
              </p>
              {hukamnamaMeaningPreview && (
                <p className={`mt-4 text-sm leading-6 text-ink/70 dark:text-dark-text/70 line-clamp-3 ${meaningLanguage === 'pa' ? 'font-gurmukhi' : 'font-sans'}`}>
                  {hukamnamaMeaningPreview}
                </p>
              )}
              <Link
                to={`/study?hukamnamaDate=${hukamnama.date}`}
                className="interactive-focus interactive-pill-link mt-5 min-h-[50px] rounded-full bg-gradient-to-r from-saffron to-saffron-light px-5 text-white font-sans text-sm font-semibold active:scale-95 transition-transform duration-150"
                data-testid="home-hero-primary-action"
                data-ai-action="open-hukamnama"
              >
                Open Today&apos;s Hukamnama
              </Link>
            </div>
          ) : (
            <div
              className="section-shell-quiet p-5"
              data-testid="home-hukamnama-error"
              data-ai-surface="home-hukamnama"
              data-ai-state="degraded"
              data-ai-error="study-hukamnama"
            >
              <p className="eyebrow mb-2">{homeCopy.todaysHukamnama}</p>
              <p className="font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/65">
                Couldn&apos;t load today&apos;s hukamnama right now. You can still continue into Read.
              </p>
              <Link
                to="/banis"
                className="interactive-focus interactive-pill-link mt-4 min-h-[46px] rounded-full border border-sand/15 bg-white/70 px-4 text-ink font-sans text-sm font-medium dark:border-dark-text/10 dark:bg-dark-card/70 dark:text-dark-text"
                data-ai-action="browse-read"
              >
                Browse Read
              </Link>
            </div>
          )}

          <div
            className="section-shell-quiet p-5"
            data-testid="home-guidance-hero"
            data-ai-surface="home-guidance"
            data-ai-state={learnCatalogLoading ? 'loading' : learnCatalogError ? 'degraded' : todayGuidance && todayGuidancePath ? 'ready' : 'empty'}
            data-ai-error={learnCatalogError ? 'learn-catalog' : undefined}
          >
            {learnCatalogLoading ? (
              <div className="animate-pulse" data-testid="home-guidance-skeleton">
                <div className="h-3 rounded bg-sand/20 dark:bg-dark-text/10 w-28" />
                <div className="mt-4 h-10 rounded bg-sand/20 dark:bg-dark-text/10" />
                <div className="mt-3 h-4 rounded bg-sand/20 dark:bg-dark-text/10 w-4/5" />
                <div className="mt-2 h-4 rounded bg-sand/20 dark:bg-dark-text/10 w-3/5" />
              </div>
            ) : todayGuidance && todayGuidancePath ? (
              <>
                <p className="eyebrow">Today&apos;s Guidance</p>
                <h3 className="mt-3 font-display text-[2rem] leading-[0.98] text-ink dark:text-dark-text max-w-[18ch]">
                  {todayGuidance.title}
                </h3>
                <p className="mt-4 max-w-[34ch] font-sans text-sm leading-6 text-ink/72 dark:text-dark-text/74">
                  {todayGuidance.summary || editorial?.learn.compactGuidanceBody || 'Open today’s Learn doorway and move into the exact guide chosen for the day.'}
                </p>
                <Link
                  to={todayGuidancePath}
                  className="interactive-focus interactive-pill-link mt-4 min-h-[42px] gap-2 font-sans text-sm font-semibold text-gold dark:text-gold-light"
                  data-testid="home-hero-guidance-action"
                  data-ai-action="open-todays-guidance"
                >
                  <span>Open Today&apos;s Guidance</span>
                  <IconArrowRight size={14} />
                </Link>
              </>
            ) : (
              <>
                <p className="eyebrow">Today&apos;s Guidance</p>
                <h3 className="mt-3 font-display text-[2rem] leading-[0.98] text-ink dark:text-dark-text max-w-[18ch]">
                  {learnCatalogError ? 'Today’s Learn guidance could not be loaded.' : 'Today’s guidance is preparing the next doorway.'}
                </h3>
                <p className="mt-4 max-w-[34ch] font-sans text-sm leading-6 text-ink/72 dark:text-dark-text/74">
                  {learnCatalogError
                    ? 'Home is staying grounded in the hukamnama-led path until the Learn archive is available again.'
                    : editorial?.learn.compactGuidanceBody || 'A short doorway into the day, anchored in a real line and written for return rather than skimming.'}
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      <section
        className="section-shell p-3.5 mb-5 animate-slide-up stagger-2"
        aria-labelledby="home-smart-search-title"
        data-testid="home-smart-search"
        data-ai-surface="home-smart-search"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="home-smart-search-title" className="font-display text-[1.35rem] leading-[0.96] text-ink dark:text-dark-text">
              {editorial?.home.learnSearchTitle ?? 'Search paths already inside the app.'}
            </h2>
            <p className="mt-1.5 max-w-[31ch] font-sans text-[12px] leading-[1.35] text-ink/68 dark:text-dark-text/72">
              {editorial?.home.learnSearchBody ?? 'Type a topic, bani, shabad, or ang. Direct destinations appear first, then broader Gurbani search results.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (hasActiveHomeSearch) {
                openPreferredSearch()
                return
              }
              homeSearchInputRef.current?.focus()
            }}
            className="icon-surface h-9 w-9 shrink-0 rounded-[16px] text-gold dark:text-gold-light active:scale-95 transition-transform duration-150"
            aria-label={hasActiveHomeSearch ? 'Continue this search' : 'Focus search'}
            data-testid="home-smart-search-open-full"
          >
            <IconSearch size={16} />
          </button>
        </div>

        <label
          htmlFor="home-smart-search-input"
          className="mt-3 flex items-center gap-2.5 rounded-[20px] border border-gold/16 bg-[linear-gradient(180deg,rgba(255,252,244,0.94),rgba(247,236,215,0.9))] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_12px_24px_rgba(77,53,22,0.09)] transition-shadow duration-300 focus-within:border-saffron/28 focus-within:shadow-[inset_0_1px_0_rgba(255,255,255,0.96),0_16px_26px_rgba(224,154,70,0.14)] dark:border-gold/12 dark:bg-[linear-gradient(180deg,rgba(36,27,46,0.96),rgba(27,20,38,0.94))] dark:shadow-[inset_0_1px_0_rgba(255,214,153,0.08),0_12px_24px_rgba(0,0,0,0.28)]"
        >
          <span className="icon-surface h-8 w-8 shrink-0 text-saffron dark:text-gold-light">
            <IconSearch size={14} />
          </span>
          <input
            ref={homeSearchInputRef}
            id="home-smart-search-input"
            name="home-smart-search"
            type="search"
            value={homeSearchQuery}
            onChange={(event) => setHomeSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              openPreferredSearch()
            }}
            placeholder={editorial?.home.learnSearchPlaceholder ?? 'Try anxiety, Japji Sahib, hukam, or Ang 12'}
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            aria-label="Search paths, banis, topics, or angs"
            inputMode="search"
            className="w-full bg-transparent font-sans text-[13px] text-ink placeholder:text-ink/40 focus:outline-none dark:text-dark-text dark:placeholder:text-dark-text/36"
            data-testid="home-smart-search-input"
            data-ai-search-input="home-smart-search"
            data-ai-action="home-smart-search"
          />
        </label>

        {hasActiveHomeSearch ? (
          <div className="mt-2.5 flex flex-wrap gap-1.5" data-testid="home-smart-search-transfer-links">
            <Link
              to={learnSearchPath ?? buildLearnSearchPath(trimmedHomeSearchQuery)}
              className="interactive-focus interactive-pill-link rounded-full border border-saffron/18 bg-white/76 px-3 py-1.5 font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-ink transition-all duration-300 active:scale-[0.98] dark:border-saffron/20 dark:bg-dark-card/78 dark:text-dark-text"
              data-testid="home-open-learn-search"
              data-ai-action="open-learn-search"
            >
              Continue in Learn
            </Link>
            <Link
              to={readSearchPath ?? buildReadSearchPath({
                query: trimmedHomeSearchQuery,
                mode: homeAngTargets.length > 0 ? 'ang' : 'auto-detect',
                source: 'all',
              })}
              className="interactive-focus interactive-pill-link rounded-full border border-sand/20 bg-white/76 px-3 py-1.5 font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-ink transition-all duration-300 active:scale-[0.98] dark:border-dark-text/10 dark:bg-dark-card/78 dark:text-dark-text"
              data-testid="home-open-read-search"
              data-ai-action="open-read-search"
            >
              Continue in Read
            </Link>
          </div>
        ) : (
          <div className="mt-2.5 flex flex-wrap gap-1.5" data-testid="home-smart-search-quick-links">
            {todayGuidancePath ? (
              <Link
                to={todayGuidancePath}
                className="interactive-focus interactive-pill-link rounded-full border border-sand/20 bg-white/76 px-3 py-1.5 font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-ink transition-all duration-300 active:scale-[0.98] dark:border-dark-text/10 dark:bg-dark-card/78 dark:text-dark-text"
                data-testid="home-open-guidance"
                data-ai-action="open-guidance"
              >
                Open Today&apos;s Guidance
              </Link>
            ) : null}
            <Link
              to={learnTopicsPath}
              className="interactive-focus interactive-pill-link rounded-full border border-sand/20 bg-white/76 px-3 py-1.5 font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-ink transition-all duration-300 active:scale-[0.98] dark:border-dark-text/10 dark:bg-dark-card/78 dark:text-dark-text"
              data-testid="home-open-topics"
              data-ai-action="open-topics"
            >
              Explore Topics
            </Link>
            <Link
              to="/banis"
              className="interactive-focus interactive-pill-link rounded-full border border-sand/20 bg-white/76 px-3 py-1.5 font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-ink transition-all duration-300 active:scale-[0.98] dark:border-dark-text/10 dark:bg-dark-card/78 dark:text-dark-text"
              data-testid="home-open-read"
              data-ai-action="browse-read"
            >
              Browse Read
            </Link>
          </div>
        )}

        <div
          className="mt-2.5 space-y-2.5"
          aria-live="polite"
          data-testid="home-smart-search-results"
          data-ai-search-state={hasActiveHomeSearch ? 'active' : 'idle'}
          data-ai-state={
            !hasActiveHomeSearch
              ? 'empty'
              : homeSearching
                ? 'loading'
                : homeSearchError
                  ? 'degraded'
                  : (homeAngTargets.length > 0 || homeAppMatches.length > 0 || groupedHomeSearchResults.length > 0)
                    ? 'ready'
                    : 'empty'
          }
          data-ai-error={homeSearchError ? 'home-search' : undefined}
        >
          {!hasActiveHomeSearch ? (
            <p className="font-sans text-xs leading-5 text-ink/46 dark:text-dark-text/46">
              Preview the best doorway here. The same query can continue in Learn or Read without starting over.
            </p>
          ) : null}

          {homeAngTargets.length > 0 ? (
            <div className="space-y-2" data-testid="home-smart-search-ang-results">
              <div className="flex items-center justify-between gap-3 px-1">
                <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-ink/60 dark:text-dark-text/60">
                  Direct ang
                </p>
                <p className="font-sans text-[11px] text-ink/60 dark:text-dark-text/60">
                  Open the page without running a word search
                </p>
              </div>
              {homeAngTargets.map(target => (
                <Link
                  key={target.source}
                  to={target.path}
                  className="interactive-focus interactive-card-link w-full rounded-[22px] border border-sand/16 bg-white/74 px-4 py-3 text-left transition-all duration-300 active:scale-[0.99] dark:border-dark-text/10 dark:bg-dark-card/78"
                  data-ai-result-kind="ang"
                >
                  <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text">
                    Open {target.label} {target.kind}{' '}
                    <SearchHighlight text={homeSearchQuery.trim()} query={trimmedHomeSearchQuery} />
                  </p>
                  <p className="mt-1 font-sans text-xs text-ink/55 dark:text-dark-text/55">
                    Direct page lookup without leaving the home surface.
                  </p>
                </Link>
              ))}
            </div>
          ) : null}

          {homeAppMatches.length > 0 ? (
            <div className="space-y-2" data-testid="home-smart-search-app-results">
              <div className="flex items-center justify-between gap-3 px-1">
                <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-ink/60 dark:text-dark-text/60">
                  In the app
                </p>
                <p className="font-sans text-[11px] text-ink/60 dark:text-dark-text/60">
                  Exact destinations first
                </p>
              </div>
              {homeAppMatches.map(match => (
                (() => {
                  const showMatchedQuery = trimmedHomeSearchQuery.length >= 2
                    && !hasSearchMatch(match.label, trimmedHomeSearchQuery)
                    && !hasSearchMatch(match.detail, trimmedHomeSearchQuery)

                  return (
                    <Link
                      key={match.key}
                      to={match.path}
                      className="interactive-focus interactive-card-link w-full rounded-[24px] border border-saffron/20 bg-gradient-to-r from-saffron/8 to-saffron-light/10 px-4 py-3 text-left transition-all duration-300 active:scale-[0.99] dark:border-saffron/18 dark:from-saffron/12 dark:to-saffron-light/12"
                      data-ai-result-kind={match.kind}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text">
                            <SearchHighlight text={match.label} query={trimmedHomeSearchQuery} />
                          </p>
                          <p className="mt-1 font-sans text-xs text-ink/55 dark:text-dark-text/55">
                            <SearchHighlight text={match.detail} query={trimmedHomeSearchQuery} />
                          </p>
                          {showMatchedQuery ? (
                            <p className="mt-2 font-sans text-[11px] text-ink/52 dark:text-dark-text/54">
                              Matched for <SearchHighlight text={trimmedHomeSearchQuery} query={trimmedHomeSearchQuery} />
                            </p>
                          ) : null}
                        </div>
                        <span className="chip-pill">{match.kind === 'learn-topic' ? 'Learn' : 'Read'}</span>
                      </div>
                    </Link>
                  )
                })()
              ))}
            </div>
          ) : null}

          {homeSearching ? (
            <p className="px-1 font-sans text-xs text-ink/60 dark:text-dark-text/60">
              Searching Gurbani results...
            </p>
          ) : null}

          {homeSearchError ? (
            <p className="px-1 font-sans text-xs text-ink/65 dark:text-dark-text/65" data-testid="home-smart-search-error">
              Couldn't search right now. Try again.
            </p>
          ) : null}

          {!homeSearching && groupedHomeSearchResults.length > 0 ? (
            <div className="space-y-2" data-testid="home-smart-search-gurbani-results">
              <div className="flex items-center justify-between gap-3 px-1">
                <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-ink/60 dark:text-dark-text/60">
                  Gurbani search
                </p>
                <p className="font-sans text-[11px] text-ink/60 dark:text-dark-text/60">
                  Broader matches after direct paths
                </p>
              </div>
              {groupedHomeSearchResults.map(result => (
                <Link
                  key={result.key}
                  to={`/study?shabadId=${result.shabadId}&verseId=${result.verseId}`}
                  className="interactive-focus interactive-card-link w-full rounded-[22px] border border-sand/16 bg-white/74 px-4 py-3 text-left transition-all duration-300 active:scale-[0.99] dark:border-dark-text/10 dark:bg-dark-card/78"
                  data-ai-result-kind="gurbani-search"
                >
                  <p lang="pa-Guru" className="font-gurmukhi text-sm text-ink dark:text-dark-text">
                    <SearchHighlight text={result.gurmukhi} query={trimmedHomeSearchQuery} />
                  </p>
                  <p className="mt-0.5 font-sans text-xs text-ink/65 dark:text-dark-text/65">
                    <SearchHighlight text={result.transliteration} query={trimmedHomeSearchQuery} />
                  </p>
                  <p className="mt-0.5 font-sans text-xs text-ink/60 dark:text-dark-text/60">
                    <SearchHighlight text={result.translation_en} query={trimmedHomeSearchQuery} />
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {result.sourceName ? <span className="chip-pill">{result.sourceName}</span> : null}
                    {typeof result.pageNo === 'number' && result.pageNo > 0 ? <span className="chip-pill">{`Ang ${result.pageNo}`}</span> : null}
                    {result.matchCount > 1 ? <span className="chip-pill">{`${result.matchCount} matches`}</span> : null}
                  </div>
                </Link>
              ))}
            </div>
          ) : null}

          {hasActiveHomeSearch && !homeSearching && !homeSearchError && homeAppMatches.length === 0 && homeAngTargets.length === 0 && groupedHomeSearchResults.length === 0 ? (
            <p className="px-1 font-sans text-xs text-ink/60 dark:text-dark-text/60">
              No in-app or Gurbani matches found yet.
            </p>
          ) : null}
        </div>
      </section>

      <section
        className="hero-surface ornate-top p-5 mb-5 animate-slide-up stagger-3"
        aria-labelledby="home-nitnem-title"
        data-testid="home-nitnem-spotlight"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p id="home-nitnem-title" className="eyebrow">{homeMessages.dailyNitnem}</p>
            <h2 className="mt-2 font-display text-[2rem] leading-none text-ink dark:text-dark-text">
              {homeMessages.nitnemHeroTitle}
            </h2>
            <p className="mt-3 max-w-[34ch] font-sans text-sm leading-6 text-ink/72 dark:text-dark-text/74">
              {homeMessages.nitnemHeroBody}
            </p>
          </div>
          <span className="chip-pill shrink-0">
            {selectedNitnemOptions.length > 0
              ? nitnemRemainingCount > 0
                ? homeMessages.nitnemRemaining(nitnemRemainingCount)
                : homeMessages.nitnemCompleteToday
              : homeMessages.customizeNitnem}
          </span>
        </div>

        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-sand/20 dark:bg-dark-text/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-saffron to-saffron-light transition-all duration-500"
            style={{ width: `${nitnemProgressPct}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/58 dark:text-dark-text/60">
            {selectedNitnemOptions.length > 0
              ? `${nitnemDone} / ${selectedNitnemOptions.length} ${homeCopy.dailyBanisComplete}`
              : homeMessages.chooseNitnemBody}
          </p>
          {selectedNitnemOptions.length > 0 ? (
            <p className="font-sans text-[11px] text-ink/54 dark:text-dark-text/56">
              {homeMessages.nitnemCarouselLabel(activeNitnemIndex + 1, selectedNitnemOptions.length)}
            </p>
          ) : null}
        </div>

        {selectedNitnemOptions.length > 0 ? (
          <>
            <div
              ref={nitnemCarouselRef}
              className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none]"
              data-testid="home-nitnem-carousel"
              onScroll={(event) => {
                const { clientWidth, scrollLeft } = event.currentTarget
                if (clientWidth < 1) return
                const nextIndex = Math.max(
                  0,
                  Math.min(selectedNitnemOptions.length - 1, Math.round(scrollLeft / clientWidth))
                )
                if (nextIndex !== activeNitnemIndex) {
                  setActiveNitnemIndex(nextIndex)
                }
              }}
            >
              {selectedNitnemOptions.map((option, index) => {
                const done = isComplete(option.id)
                const isActive = index === activeNitnemIndex

                return (
                  <article
                    key={option.id}
                    className={`section-shell-quiet min-w-full snap-center p-5 transition-transform duration-300 ${
                      isActive ? 'border-gold/20 dark:border-gold/20' : 'scale-[0.985]'
                    }`}
                    aria-label={homeMessages.nitnemCarouselLabel(index + 1, selectedNitnemOptions.length)}
                    data-testid={isActive ? 'home-nitnem-active-card' : undefined}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="eyebrow">{option.group}</p>
                        <p lang="pa-Guru" className="mt-3 font-gurmukhi text-[1.9rem] leading-tight text-ink dark:text-dark-text">
                          {option.gurmukhiTitle}
                        </p>
                        <p className="mt-2 font-sans text-sm font-semibold text-ink/76 dark:text-dark-text/80">
                          {option.romanizedTitle}
                        </p>
                        <p className="mt-2 max-w-[34ch] font-sans text-sm leading-6 text-ink/66 dark:text-dark-text/68">
                          {getNitnemOptionDetail(option)}
                        </p>
                      </div>
                      <span className="chip-pill shrink-0">
                        {index + 1}/{selectedNitnemOptions.length}
                      </span>
                    </div>

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                      <Link
                        to={buildNitnemStudyPath(option)}
                        className="interactive-focus interactive-pill-link min-h-[48px] flex-1 rounded-2xl bg-gradient-to-r from-saffron to-saffron-light px-4 font-sans text-sm font-semibold text-white"
                        data-testid={index === activeNitnemIndex ? 'home-nitnem-primary-action' : undefined}
                      >
                        {nitnemDone > 0 ? homeMessages.continueNitnem : homeMessages.beginNitnem}
                      </Link>
                      <button
                        type="button"
                        onClick={() => done ? unmarkComplete(option.id) : markComplete(option.id)}
                        className={`min-h-[48px] rounded-2xl border px-4 font-sans text-sm font-medium transition-colors duration-300 ${
                          done
                            ? 'border-gold/15 bg-gold/12 text-gold dark:border-gold/22 dark:bg-gold/12 dark:text-gold-light'
                            : 'border-sand/12 bg-white/80 text-ink dark:border-gold/20 dark:bg-gold/10 dark:text-gold-light'
                        }`}
                      >
                        <span className="inline-flex items-center gap-2">
                          <IconCheck size={14} className={done ? '' : 'text-saffron dark:text-gold-light'} />
                          {done ? homeMessages.markNitnemIncomplete : homeMessages.completeNitnemStep}
                        </span>
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>

            <div className="mt-4 flex justify-center gap-2">
              {selectedNitnemOptions.map((option, index) => (
                <button
                  key={`${option.id}-dot`}
                  type="button"
                  onClick={() => setActiveNitnemIndex(index)}
                  aria-label={homeMessages.nitnemCarouselLabel(index + 1, selectedNitnemOptions.length)}
                  aria-pressed={index === activeNitnemIndex}
                  className={`h-3 rounded-full border transition-all duration-300 ${
                    index === activeNitnemIndex
                      ? 'w-8 border-[rgba(232,196,104,0.8)] bg-gold shadow-[0_0_18px_rgba(232,196,104,0.25)] dark:border-[rgba(232,196,104,0.82)] dark:bg-gold-light'
                      : 'w-3 border-[rgba(232,196,104,0.22)] bg-[rgba(232,196,104,0.18)] dark:border-[rgba(232,196,104,0.38)] dark:bg-[rgba(255,248,225,0.18)]'
                  }`}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="section-shell-quiet mt-5 p-5">
            <p className="font-sans text-sm leading-6 text-ink/70 dark:text-dark-text/72">
              {homeMessages.chooseNitnemBody}
            </p>
          </div>
        )}

        <div className="section-shell-quiet mt-5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="eyebrow">{homeMessages.customizeNitnem}</p>
              <p className="mt-2 max-w-[34ch] font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/70">
                {homeMessages.chooseNitnemBody}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNitnemOpen(open => !open)}
              className="flex shrink-0 items-center gap-2"
              aria-expanded={nitnemOpen}
              aria-controls="home-nitnem-panel"
            >
              <span className="font-sans text-xs font-semibold text-gold dark:text-gold-light">
                {nitnemOpen ? homeMessages.hideNitnemCustomize : homeMessages.customizeNitnem}
              </span>
              <span className="icon-surface h-10 w-10 text-gold dark:text-gold-light">
                {nitnemOpen ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
              </span>
            </button>
          </div>

          {nitnemOpen ? (
            <div id="home-nitnem-panel" className="mt-5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-sans text-xs text-ink/55 dark:text-dark-text/58">
                  Length choices for supported banis stay inside the reader.
                </p>
                <button
                  type="button"
                  onClick={handleNitnemReset}
                  className="font-sans text-xs text-gold dark:text-gold-light underline underline-offset-2"
                  data-testid="home-nitnem-reset"
                >
                  {confirmingNitnemReset ? 'Tap again to reset' : 'Reset'}
                </button>
              </div>

              {(['Morning', 'Evening', 'Night', 'Additional'] as const).map(group => (
                <div key={`manage-${group}`}>
                  <p className="mb-2 font-sans text-[11px] uppercase tracking-[0.18em] text-gold dark:text-gold-light">
                    {group}
                  </p>
                  <div className="space-y-2">
                    {availableNitnemOptions
                      .filter(option => option.group === group)
                      .map(option => {
                        const selected = selectedIds.includes(option.id)

                        return (
                          <button
                            key={`manage-${option.id}`}
                            type="button"
                            onClick={() => toggleSelected(option.id)}
                            className={`w-full rounded-2xl border px-3 py-3 text-left transition-colors duration-300 ${
                              selected
                                ? 'border-saffron bg-gradient-to-r from-saffron to-saffron-light text-white'
                                : 'border-sand/15 bg-white/70 text-ink dark:border-dark-text/10 dark:bg-dark-card dark:text-dark-text'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p lang="pa-Guru" className="font-gurmukhi text-lg leading-relaxed">
                                  {option.gurmukhiTitle}
                                </p>
                                <p className={`mt-1 font-sans text-xs font-semibold ${selected ? 'text-white/92' : 'text-ink/72 dark:text-dark-text/76'}`}>
                                  {option.romanizedTitle}
                                </p>
                                <p className={`mt-1 font-sans text-xs ${selected ? 'text-white/80' : 'text-ink/55 dark:text-dark-text/55'}`}>
                                  {getNitnemOptionDetail(option)}
                                </p>
                              </div>
                              <span className={`rounded-full px-2 py-1 font-sans text-[10px] uppercase tracking-[0.18em] ${
                                selected
                                  ? 'bg-white/15 text-white'
                                  : 'bg-gold/10 text-gold dark:text-gold-light'
                              }`}>
                                {selected ? 'Shown' : 'Hidden'}
                              </span>
                            </div>
                          </button>
                        )
                      })}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section
        ref={todaysPathRef}
        tabIndex={-1}
        className="section-shell p-5 mb-5 animate-slide-up stagger-4 transition-[box-shadow,transform,border-color] duration-500"
        aria-labelledby="home-todays-path-title"
        data-testid="home-todays-path"
      >
        <p id="home-todays-path-title" className="eyebrow">{homeCopy.todaysPath}</p>
        <div className="mt-4 grid gap-4">
          <div className="section-shell-quiet p-5">
            <p className="eyebrow">{homeCopy.read}</p>
            <h3 className="mt-2 font-display text-[2rem] leading-none text-ink dark:text-dark-text">
              {readAction.title}
            </h3>
            <p className="mt-3 max-w-[34ch] font-sans text-sm leading-6 text-ink/72 dark:text-dark-text/74">
              {editorial?.home.pathBodyPrefix ? `${editorial.home.pathBodyPrefix} ${readAction.body}` : readAction.body}
            </p>
            <Link
              to={readAction.path}
              className="interactive-focus interactive-pill-link mt-5 min-h-[48px] w-full rounded-2xl bg-gradient-to-r from-saffron to-saffron-light px-4 font-sans text-sm font-semibold text-white"
              data-testid="home-todays-path-action"
            >
              {readAction.title}
            </Link>
          </div>

          <div className="grid gap-3">
            <div
              className="section-shell-quiet p-4"
              data-testid="home-todays-path-featured-shabad"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="eyebrow">{featuredShabadSupport.title}</p>
                  <p className="mt-2 font-sans text-sm font-semibold text-ink dark:text-dark-text">
                    {featuredShabadSupport.summary}
                  </p>
                </div>
                <span className="chip-pill">{featuredShabadSupport.meta}</span>
              </div>

              <p className="mt-2 font-sans text-sm leading-6 text-ink/66 dark:text-dark-text/68">
                {featuredShabadSupport.body}
              </p>
              <Link
                to={featuredShabadSupport.path}
                className="interactive-focus interactive-pill-link mt-4 min-h-[42px] gap-2 font-sans text-sm font-semibold text-gold dark:text-gold-light"
                data-testid="home-open-featured-shabad"
              >
                <span>{featuredShabadSupport.actionLabel}</span>
                <IconArrowRight size={14} />
              </Link>
            </div>

            <div
              className="section-shell-quiet p-4"
              data-testid="home-todays-path-learn"
              data-ai-surface="home-todays-path-learn"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="eyebrow">{learnSupport.title}</p>
                  <p className="mt-2 font-sans text-base font-semibold text-ink dark:text-dark-text">
                    {learnSupport.summary}
                  </p>
                  <p className="mt-2 font-sans text-sm leading-6 text-ink/66 dark:text-dark-text/68">
                    {learnSupport.body}
                  </p>
                </div>
                <span className="chip-pill shrink-0">{learnSupport.meta}</span>
              </div>
              <Link
                to={learnSupport.path}
                className="interactive-focus interactive-pill-link mt-4 min-h-[42px] gap-2 font-sans text-sm font-semibold text-gold dark:text-gold-light"
                data-testid="home-open-continue-learning"
              >
                <span>{learnSupport.actionLabel}</span>
                <IconArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section
        className="section-shell p-4 mb-5 animate-slide-up stagger-4"
        aria-labelledby="home-saved-title"
        data-testid="home-saved-overview"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">{homeCopy.savedEyebrow}</p>
            <h3 id="home-saved-title" className="font-display text-3xl text-ink dark:text-dark-text leading-none mt-2">
              {editorial?.home.savedTitle ?? homeCopy.savedTitle}
            </h3>
          </div>
          <Link
            to="/library"
            className="interactive-focus inline-flex items-center gap-1 font-sans text-sm text-gold dark:text-gold-light"
          >
            {homeCopy.openSaved} <IconArrowRight size={14} />
          </Link>
        </div>
        {savedShelfNotice ? (
          <div aria-live="polite" className="mt-3 min-h-[1.5rem]">
            <p role="status" className="inline-flex rounded-full bg-gold/10 px-3 py-1.5 font-sans text-xs font-medium text-gold-dark dark:bg-gold/12 dark:text-gold-light">
              {savedShelfNotice}
            </p>
          </div>
        ) : null}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="home-saved-metrics">
          <div className={`section-shell-quiet px-3 py-3 transition-all duration-300 ${lastSaved?.kind === 'learn' ? 'saved-feedback-highlight' : ''}`}>
            <p className="font-sans text-2xl text-ink dark:text-dark-text">{learnStateSnapshot.savedItemIds.length}</p>
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/60 dark:text-dark-text/60 mt-1">{libraryCopy.learnSaves}</p>
          </div>
          <div className={`section-shell-quiet px-3 py-3 transition-all duration-300 ${lastSaved?.kind === 'bookmark' ? 'saved-feedback-highlight' : ''}`}>
            <p className="font-sans text-2xl text-ink dark:text-dark-text">{savedBookmarks}</p>
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/60 dark:text-dark-text/60 mt-1">{libraryCopy.bookmarks}</p>
          </div>
          <div className={`section-shell-quiet px-3 py-3 transition-all duration-300 ${lastSaved?.kind === 'favorite' ? 'saved-feedback-highlight' : ''}`}>
            <p className="font-sans text-2xl text-ink dark:text-dark-text">{savedFavorites}</p>
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/60 dark:text-dark-text/60 mt-1">{libraryCopy.favorites}</p>
          </div>
          <div className={`section-shell-quiet px-3 py-3 transition-all duration-300 ${lastSaved?.kind === 'review' ? 'saved-feedback-highlight' : ''}`}>
            <p className="font-sans text-2xl text-ink dark:text-dark-text">{savedReviewItems}</p>
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/60 dark:text-dark-text/60 mt-1">{libraryCopy.reviewBank}</p>
          </div>
        </div>

        <div className="mt-4 space-y-2" data-testid="home-saved-preview-list">
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
                    {isHighlighted ? <span className="chip-pill">Saved just now</span> : null}
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
                <span className="mt-1 shrink-0 text-gold dark:text-gold-light">
                  <IconArrowRight size={16} />
                </span>
              </Link>
            )})
          ) : (
            <div className="section-shell-quiet px-4 py-4">
              <p className="eyebrow">Saved Preview</p>
              <p className="mt-2 font-sans text-sm leading-6 text-ink/66 dark:text-dark-text/70">
                Learn saves, bookmarked passages, favorites, and review items will appear here once you start keeping pieces close.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
