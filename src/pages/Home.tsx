import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { TouchEvent as ReactTouchEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  IconArrowRight,
  IconBanis,
  IconBookmark,
  IconBookmarkFilled,
  IconCheck,
  IconHeart,
  IconLibrary,
  IconLayers,
  IconMoon,
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
import { getScriptTextFontClass, getScriptTextLang, isStructuralTitleLine, renderScriptText } from '../utils/readerDisplay'
import { getSundarGutkaLengthDetail, isSundarGutkaLengthSupportedBaniId } from '../utils/sundarGutkaLength'
import { getUiCopy } from '../utils/uiCopy'
import { formatUiDate } from '../utils/formatUiDate'
import { buildSavedStudyPath } from '../utils/savedStudyPath'
import { getEditorialCopy } from '../content/editorialCopy'
import nitnemPixelMotifSrc from '../assets/home-calm/nitnem-pixel-motif.webp'

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

type HomeHeroRevealStyle = CSSProperties & {
  '--home-hero-reveal': string
  '--home-hero-pointer-x': string
  '--home-hero-pointer-y': string
  '--home-hero-parallax-x': string
  '--home-hero-landscape-offset': string
  '--home-hero-content-offset': string
  '--home-hero-content-reserve': string
  '--home-hero-image-lock': string
  '--home-hero-image-scale': string
  '--home-hero-image-y': string
}

const HOME_HERO_CONTENT_OFFSET_REM = 8.5
const HOME_HERO_MOBILE_CONTENT_OFFSET_REM = 16.25
const HOME_HERO_COMPACT_CONTENT_OFFSET_REM = 3.5
const HOME_HERO_REVEAL_DISTANCE_PX = 380
const HOME_HERO_TOUCH_REVEAL_DISTANCE_PX = 150

function isHomeHeroMobileViewport(): boolean {
  return typeof window !== 'undefined' && window.innerWidth <= 560
}

function isHomeHeroCompactViewport(): boolean {
  return typeof window !== 'undefined' && window.innerHeight <= 760
}

function getHomeHeroContentOffsetRem(): number {
  if (typeof window === 'undefined') return HOME_HERO_CONTENT_OFFSET_REM

  if (isHomeHeroCompactViewport()) return HOME_HERO_COMPACT_CONTENT_OFFSET_REM

  return isHomeHeroMobileViewport()
    ? HOME_HERO_MOBILE_CONTENT_OFFSET_REM
    : HOME_HERO_CONTENT_OFFSET_REM
}

function useHomeHeroReveal() {
  const rootRef = useRef<HTMLElement | null>(null)
  const landscapeRef = useRef<HTMLSpanElement | null>(null)
  const frameRef = useRef<number | null>(null)
  const touchStartYRef = useRef<number | null>(null)
  const touchRevealPxRef = useRef(0)
  const valuesRef = useRef({ reveal: 0, pointerX: 0, pointerY: 0 })
  const [style, setStyle] = useState<HomeHeroRevealStyle>(() => {
    const contentOffsetRem = getHomeHeroContentOffsetRem()
    return {
      '--home-hero-reveal': '0',
      '--home-hero-pointer-x': '0',
      '--home-hero-pointer-y': '0',
      '--home-hero-parallax-x': '0rem',
      '--home-hero-landscape-offset': '0.4rem',
      '--home-hero-content-offset': `${contentOffsetRem}rem`,
      '--home-hero-content-reserve': `${contentOffsetRem}rem`,
      '--home-hero-image-lock': '0px',
      '--home-hero-image-scale': '1',
      '--home-hero-image-y': '0rem',
    }
  })

  const applyStyle = useCallback(() => {
    frameRef.current = null
    const scrollY = window.scrollY
    const contentOffsetRem = getHomeHeroContentOffsetRem()
    const isMobileHero = isHomeHeroMobileViewport()
    const reveal = isMobileHero ? 1 : valuesRef.current.reveal
    const inverseReveal = 1 - reveal
    const currentContentOffsetRem = isMobileHero
      ? contentOffsetRem
      : inverseReveal * contentOffsetRem
    const imageLock = isMobileHero ? 0 : scrollY * (0.62 + reveal * 0.38)
    const next: HomeHeroRevealStyle = {
      '--home-hero-reveal': reveal.toFixed(3),
      '--home-hero-pointer-x': valuesRef.current.pointerX.toFixed(3),
      '--home-hero-pointer-y': valuesRef.current.pointerY.toFixed(3),
      '--home-hero-parallax-x': `${(-valuesRef.current.pointerX * 0.42).toFixed(3)}rem`,
      '--home-hero-landscape-offset': '0.4rem',
      '--home-hero-content-offset': `${currentContentOffsetRem.toFixed(3)}rem`,
      '--home-hero-content-reserve': `${currentContentOffsetRem.toFixed(3)}rem`,
      '--home-hero-image-lock': `${imageLock.toFixed(1)}px`,
      '--home-hero-image-scale': `${(isMobileHero ? 1 : 1 + reveal * 0.12).toFixed(3)}`,
      '--home-hero-image-y': '0rem',
    }
    setStyle(current => (
      current['--home-hero-reveal'] === next['--home-hero-reveal']
      && current['--home-hero-pointer-x'] === next['--home-hero-pointer-x']
      && current['--home-hero-pointer-y'] === next['--home-hero-pointer-y']
      && current['--home-hero-parallax-x'] === next['--home-hero-parallax-x']
      && current['--home-hero-landscape-offset'] === next['--home-hero-landscape-offset']
      && current['--home-hero-content-offset'] === next['--home-hero-content-offset']
      && current['--home-hero-content-reserve'] === next['--home-hero-content-reserve']
      && current['--home-hero-image-lock'] === next['--home-hero-image-lock']
      && current['--home-hero-image-scale'] === next['--home-hero-image-scale']
      && current['--home-hero-image-y'] === next['--home-hero-image-y']
        ? current
        : next
    ))
  }, [])

  const scheduleStyle = useCallback(() => {
    if (frameRef.current !== null) return
    frameRef.current = window.requestAnimationFrame(applyStyle)
  }, [applyStyle])

  const updateReveal = useCallback((gestureRevealPx = touchRevealPxRef.current) => {
    if (isHomeHeroMobileViewport()) {
      touchRevealPxRef.current = 0
      valuesRef.current.reveal = 1
      valuesRef.current.pointerX = 0
      valuesRef.current.pointerY = 0
      scheduleStyle()
      return
    }

    const scrollY = window.scrollY
    if (scrollY > 4) {
      touchRevealPxRef.current = 0
    }
    const progressPx = scrollY + (scrollY <= 4 ? gestureRevealPx : 0)
    const rawReveal = Math.max(0, Math.min(1, progressPx / HOME_HERO_REVEAL_DISTANCE_PX))
    valuesRef.current.reveal = 1 - Math.pow(1 - rawReveal, 1.45)
    scheduleStyle()
  }, [scheduleStyle])

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reduceMotion.matches) {
      valuesRef.current.reveal = 1
      valuesRef.current.pointerX = 0
      valuesRef.current.pointerY = 0
      scheduleStyle()
      return undefined
    }

    updateReveal()
    const handleScroll = () => updateReveal()
    const handleResize = () => updateReveal()
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
    }
  }, [scheduleStyle, updateReveal])

  const updatePointer = useCallback((clientX: number, clientY: number, target: HTMLElement) => {
    if (isHomeHeroMobileViewport()) return

    const rect = target.getBoundingClientRect()
    valuesRef.current.pointerX = Math.max(-1, Math.min(1, ((clientX - rect.left) / rect.width - 0.5) * 2))
    valuesRef.current.pointerY = Math.max(-1, Math.min(1, ((clientY - rect.top) / rect.height - 0.5) * 2))
    scheduleStyle()
  }, [scheduleStyle])

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    updatePointer(event.clientX, event.clientY, event.currentTarget)
  }, [updatePointer])

  const handlePointerLeave = useCallback(() => {
    valuesRef.current.pointerX = 0
    valuesRef.current.pointerY = 0
    scheduleStyle()
  }, [scheduleStyle])

  const handleTouchMove = useCallback((event: ReactTouchEvent<HTMLElement>) => {
    if (isHomeHeroMobileViewport()) return

    const touch = event.touches[0]
    if (!touch) return
    updatePointer(touch.clientX, touch.clientY, event.currentTarget)
    if (touchStartYRef.current === null) return

    const dragDistance = Math.max(0, touchStartYRef.current - touch.clientY)
    if (window.scrollY <= 4 && dragDistance > 2) {
      touchRevealPxRef.current = Math.min(dragDistance * 1.2, HOME_HERO_TOUCH_REVEAL_DISTANCE_PX)
      updateReveal(touchRevealPxRef.current)
      return
    }

    window.requestAnimationFrame(() => updateReveal())
  }, [updatePointer, updateReveal])

  const handleTouchStart = useCallback((event: ReactTouchEvent<HTMLElement>) => {
    if (isHomeHeroMobileViewport()) return

    const touch = event.touches[0]
    touchStartYRef.current = touch?.clientY ?? null
    touchRevealPxRef.current = 0
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (isHomeHeroMobileViewport()) return

    touchStartYRef.current = null
    if (window.scrollY > 4) {
      touchRevealPxRef.current = 0
    }
    window.requestAnimationFrame(() => updateReveal())
  }, [updateReveal])

  return {
    rootRef,
    landscapeRef,
    style,
    handlePointerMove,
    handlePointerLeave,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  }
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

const HOME_MESSAGES: Record<UiLocale, {
  dailyNitnem: string
  nitnemHeroTitle: string
  nitnemCarouselLabel: (index: number, total: number) => string
  beginNitnem: string
  customizeNitnem: string
  chooseNitnemBody: string
}> = {
  en: {
    dailyNitnem: 'Daily Nitnem',
    nitnemHeroTitle: 'Anchor the day in Nitnem.',
    nitnemCarouselLabel: (index, total) => `Nitnem card ${index} of ${total}`,
    beginNitnem: 'Begin Nitnem',
    customizeNitnem: 'Customize Daily Nitnem',
    chooseNitnemBody: 'Choose the banis that should appear in your daily Nitnem ritual.',
  },
  pa: {
    dailyNitnem: 'ਰੋਜ਼ਾਨਾ ਨਿਤਨੇਮ',
    nitnemHeroTitle: 'ਨਿਤਨੇਮ ਨਾਲ ਦਿਨ ਨੂੰ ਅਡੋਲ ਕਰੋ।',
    nitnemCarouselLabel: (index, total) => `ਨਿਤਨੇਮ ਕਾਰਡ ${index} / ${total}`,
    beginNitnem: 'ਨਿਤਨੇਮ ਸ਼ੁਰੂ ਕਰੋ',
    customizeNitnem: 'ਰੋਜ਼ਾਨਾ ਨਿਤਨੇਮ ਸੰਵਾਰੋ',
    chooseNitnemBody: 'ਉਹ ਬਾਣੀਆਂ ਚੁਣੋ ਜੋ ਤੁਹਾਡੇ ਰੋਜ਼ਾਨਾ ਨਿਤਨੇਮ ਵਿੱਚ ਦਿਸਣੀਆਂ ਚਾਹੀਦੀਆਂ ਹਨ।',
  },
  hi: {
    dailyNitnem: 'दैनिक नितनेम',
    nitnemHeroTitle: 'नितनेम से दिन को स्थिर करो।',
    nitnemCarouselLabel: (index, total) => `नितनेम कार्ड ${index} / ${total}`,
    beginNitnem: 'नितनेम शुरू करें',
    customizeNitnem: 'दैनिक नितनेम बदलें',
    chooseNitnemBody: 'वे बानियाँ चुनें जो आपके दैनिक नितनेम में दिखाई दें।',
  },
}

export default function Home() {
  const location = useLocation()
  const navigate = useNavigate()
  const streak = useProgressStore(state => state.streak)
  const scriptMode = useLanguageStore(s => s.scriptMode)
  const locale = useLocaleStore(s => s.locale)
  const {
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
  const sundarGutkaLengths = useSundarGutkaLengthStore(state => state.lengths)
  const now = useCurrentTime()
  const homeNow = useMemo(() => new Date(now), [now])
  const homeDateLabel = useMemo(() => formatUiDate(locale, homeNow), [homeNow, locale])
  const homeTimeLabel = useMemo(() => {
    const localeCode = locale === 'pa' ? 'pa-IN' : locale === 'hi' ? 'hi-IN' : 'en-US'
    return new Intl.DateTimeFormat(localeCode, { hour: 'numeric', minute: '2-digit' }).format(homeNow)
  }, [homeNow, locale])
  const getNitnemOptionDetail = (option: NitnemRouteOption) => (
    option.supportsLengthAdjustment && isSundarGutkaLengthSupportedBaniId(option.baseBaniId)
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

  const { data: hukamnama, loading: hukamnamaLoading } = useHukamnama()

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
    const left = target.offsetLeft
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
      const nearestCard = cards.reduce<HTMLElement | null>((nearest, card) => {
        if (!nearest) return card
        return Math.abs(card.offsetLeft - carousel.scrollLeft) < Math.abs(nearest.offsetLeft - carousel.scrollLeft)
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
  const isDarkTheme = useThemeStore(s => s.dark)
  const toggleTheme = useThemeStore(s => s.toggle)
  const {
    rootRef: homeHeroRootRef,
    landscapeRef: homeHeroLandscapeRef,
    style: homeHeroStyle,
    handlePointerMove: handleHomeHeroPointerMove,
    handlePointerLeave: handleHomeHeroPointerLeave,
    handleTouchStart: handleHomeHeroTouchStart,
    handleTouchMove: handleHomeHeroTouchMove,
    handleTouchEnd: handleHomeHeroTouchEnd,
  } = useHomeHeroReveal()
  const savedShelfNotice = useMemo(() => {
    switch (lastSaved?.kind) {
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

  const hukamnamaPreviewLine = useMemo(() => {
    if (!hukamnama) return null
    return hukamnama.entry.lines?.find(line => !line.isHeader && line.gurmukhi.trim() && !isStructuralTitleLine(line.gurmukhi))
      ?? hukamnama.entry.lines?.find(line => !line.isHeader && line.gurmukhi.trim())
      ?? hukamnama.entry.lines?.find(line => line.gurmukhi.trim())
      ?? null
  }, [hukamnama])
  const hukamnamaTransliterationPreview = useMemo(() => {
    if (!hukamnama) return ''
    return hukamnamaPreviewLine?.transliteration || hukamnama.entry.transliteration
  }, [hukamnama, hukamnamaPreviewLine?.transliteration])
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
        ref={homeHeroRootRef}
        style={homeHeroStyle}
        onPointerMove={handleHomeHeroPointerMove}
        onPointerLeave={handleHomeHeroPointerLeave}
        onTouchStart={handleHomeHeroTouchStart}
        onTouchMove={handleHomeHeroTouchMove}
        onTouchEnd={handleHomeHeroTouchEnd}
        onTouchCancel={handleHomeHeroTouchEnd}
        className="home-door-shell mb-3 px-5 py-4 animate-slide-up stagger-1"
        aria-labelledby="home-hero-title"
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
              <p className="font-display text-[2.05rem] leading-none text-ink dark:text-dark-text">
                {editorial?.brand.name ?? 'NaamRas'}
              </p>
              <p className="mt-1 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-dark dark:text-gold-light">
                Daily · Divine · You
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/library"
              aria-label="Open saved library"
              className="home-door-icon-button"
              data-testid="home-header-saved"
            >
              <IconBookmark size={19} />
            </Link>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDarkTheme ? 'Switch to light mode' : 'Switch to dark mode'}
              className="home-door-icon-button"
              data-testid="home-theme-toggle"
            >
              {isDarkTheme ? <IconSun size={17} /> : <IconMoon size={17} />}
            </button>
          </div>
        </header>

        <div className="mt-3 border-y border-sand/20 py-2.5 dark:border-dark-text/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-display text-[1.05rem] leading-none text-ink/78 dark:text-dark-text/82">
              {homeDateLabel}
            </p>
            <div className="flex items-center gap-2">
              <span className="chip-pill">Reading Profile</span>
              <StreakBadge streak={streak} />
            </div>
          </div>
        </div>

        <div className="home-door-frame" aria-label="Daily reading room">
          <span ref={homeHeroLandscapeRef} className="home-landscape-reveal" aria-hidden="true" />
          <h1 id="home-hero-title" className="sr-only">
            NaamRas home
          </h1>

          <div className="home-door-content" data-testid="home-daily-reading-room">
            {hukamnamaLoading ? (
              <div className="home-hukam-card animate-pulse px-3.5 py-3.5" data-testid="home-hukamnama-card">
                <div className="h-3 rounded bg-sand/20 dark:bg-dark-text/10 w-32 mb-4" />
                <div className="h-16 rounded bg-sand/20 dark:bg-dark-text/10" />
                <div className="mt-4 h-4 rounded bg-sand/20 dark:bg-dark-text/10 w-4/5" />
                <div className="mt-2 h-4 rounded bg-sand/20 dark:bg-dark-text/10 w-3/5" />
                <div className="mt-4 h-12 rounded bg-sand/20 dark:bg-dark-text/10" />
              </div>
            ) : hukamnama ? (
              <div
                className="home-hukam-card px-3.5 py-3.5"
                data-testid="home-hukamnama-card"
                data-ai-surface="home-hukamnama"
                data-ai-state="ready"
              >
                <div className="home-card-heading-row">
                  <p className="home-section-label">
                    {homeCopy.todaysHukamnama}
                  </p>
                  <span className="home-soft-pill home-raag-pill">
                      {renderScriptText(hukamnama.entry.raag || 'Sri Darbar Sahib', scriptMode)}
</span>
                </div>
                <p
                  lang={getScriptTextLang(scriptMode)}
                  className={`${getScriptTextFontClass(scriptMode)} home-hukam-line`}
                >
                  {renderScriptText(hukamnamaPreviewLine?.gurmukhi ?? hukamnama.entry.gurmukhi, scriptMode)}
                </p>
                <div className="home-hukam-meta-row">
                  {hukamnamaTransliterationPreview ? (
                    <p className="home-hukam-transliteration">
                      {hukamnamaTransliterationPreview}
                    </p>
                  ) : <span />}
                  <span className="home-hukam-time">
                    <IconSun size={15} />
                    {homeTimeLabel}
                  </span>
                </div>
                <Link
                  to={`/study?hukamnamaDate=${hukamnama.date}`}
                  className="home-primary-action interactive-focus interactive-pill-link"
                  data-testid="home-hero-primary-action"
                  data-ai-action="open-hukamnama"
                >
                  <IconLibrary size={20} />
                  <span>Read Hukamnama</span>
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
                <p className="home-section-label">{homeCopy.todaysHukamnama}</p>
                <p className="mt-3 font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/65">
                  Couldn&apos;t load today&apos;s hukamnama right now. You can still continue into Read.
                </p>
                <Link
                  to="/banis"
                  className="home-primary-action interactive-focus interactive-pill-link mt-4"
                  data-ai-action="browse-read"
                >
                  Browse Read
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      <section
        ref={nitnemSpotlightRef}
        tabIndex={-1}
        className="home-nitnem-tray mb-4 px-4 py-4 animate-slide-up stagger-3 transition-[box-shadow,transform,border-color] duration-500"
        aria-labelledby="home-nitnem-title"
        data-testid="home-nitnem-spotlight"
      >
        <img
          src={nitnemPixelMotifSrc}
          alt=""
          aria-hidden="true"
          className="home-nitnem-motif"
        />
        <span className="home-tray-emblem" aria-hidden="true">
          <IconBanis size={28} />
        </span>
        <span className="home-tray-corner home-tray-corner-left" aria-hidden="true" />
        <span className="home-tray-corner home-tray-corner-right" aria-hidden="true" />
        <div className="home-nitnem-heading flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              id="home-nitnem-title"
              className="font-sans text-[11px] uppercase tracking-[0.24em] text-gold-dark dark:text-gold-light"
            >
              {homeMessages.dailyNitnem}
            </p>
            <h2 className="mt-2 max-w-[18ch] font-display text-[1.75rem] leading-[0.98] text-ink dark:text-dark-text sm:max-w-none">
              {homeMessages.nitnemHeroTitle}
            </h2>
          </div>
          <span className="shrink-0 rounded-full border border-sand/16 bg-parchment-card/78 px-3 py-1.5 font-sans text-[11px] uppercase tracking-[0.18em] text-ink/68 dark:border-dark-text/10 dark:bg-white/5 dark:text-dark-text/64">
            {activeNitnemOption?.group ?? homeMessages.dailyNitnem}
          </span>
        </div>

        <div className="mt-4">
          {activeNitnemOption ? (
            <>
              <div
                ref={nitnemCarouselRef}
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
                aria-label="Daily Nitnem selected banis"
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
                      className="home-nitnem-card"
                    >
                      <div className="home-nitnem-card-grid">
                        <p className="home-section-label">Today&apos;s Bani</p>
                        <p lang={getScriptTextLang(scriptMode)} className={getScriptTextFontClass(scriptMode)}>
                          {renderScriptText(option.gurmukhiTitle, scriptMode)}
                        </p>
                        <p>{option.romanizedTitle}</p>
                        <div className="home-ritual-note">
                          {getNitnemOptionDetail(option)}
                        </div>
                      </div>

                      <Link
                        to={buildNitnemStudyPath(option)}
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

              {nitnemHasCarousel ? (
                <div className="mt-3 flex items-center justify-between gap-3" data-testid="home-nitnem-carousel-controls">
                  <button
                    type="button"
                    onClick={() => setNitnemCarouselIndex(safeNitnemIndex - 1)}
                    className="interactive-focus icon-surface h-11 w-11 disabled:opacity-40"
                    aria-label="Previous Nitnem bani"
                  >
                    <IconArrowRight size={16} className="rotate-180" />
                  </button>
                  <p
                    className="min-w-20 text-center font-sans text-xs font-medium text-ink/68 dark:text-dark-text/64"
                    aria-live="polite"
                  >
                    {safeNitnemIndex + 1} of {selectedNitnemOptions.length}
                  </p>
                  <button
                    type="button"
                    onClick={() => setNitnemCarouselIndex(safeNitnemIndex + 1)}
                    className="interactive-focus icon-surface h-11 w-11 disabled:opacity-40"
                    aria-label="Next Nitnem bani"
                  >
                    <IconArrowRight size={16} />
                  </button>
                </div>
              ) : null}

              <Link
                to="/nitnem/customize"
                className="home-outline-action interactive-focus interactive-pill-link mt-3 min-h-[48px] w-full rounded-lg border border-sand/16 bg-transparent px-5 font-sans text-sm font-medium text-ink/65 dark:border-dark-text/10 dark:text-dark-text/70"
                data-testid="home-nitnem-manage"
              >
                {homeMessages.customizeNitnem}
              </Link>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-sand/18 px-4 py-5 dark:border-dark-text/10">
              <p className="font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/70">
                {homeMessages.chooseNitnemBody}
              </p>
              <Link
                to="/nitnem/customize"
                className="interactive-focus interactive-pill-link mt-4 min-h-[48px] rounded-lg bg-ink px-5 font-sans text-sm font-semibold text-parchment dark:bg-parchment dark:text-dark-bg"
                data-testid="home-nitnem-manage"
              >
                {homeMessages.customizeNitnem}
              </Link>
            </div>
          )}
        </div>
      </section>

      <section
        className="home-saved-cabinet p-4 mb-5 animate-slide-up stagger-4"
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
            className="interactive-focus inline-flex min-h-11 shrink-0 items-center gap-1 whitespace-nowrap px-2 font-sans text-sm text-gold-dark dark:text-gold-light"
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
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3" data-testid="home-saved-metrics">
          <div className={`home-quiet-card px-3 py-3 transition-all duration-300 ${lastSaved?.kind === 'bookmark' ? 'saved-feedback-highlight' : ''}`}>
            <IconLibrary className="home-saved-metric-icon" size={20} />
            <p className="font-sans text-2xl text-ink dark:text-dark-text">{savedBookmarks}</p>
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/68 dark:text-dark-text/64 mt-1">{libraryCopy.bookmarks}</p>
          </div>
          <div className={`home-quiet-card px-3 py-3 transition-all duration-300 ${lastSaved?.kind === 'favorite' ? 'saved-feedback-highlight' : ''}`}>
            <IconHeart className="home-saved-metric-icon" size={20} />
            <p className="font-sans text-2xl text-ink dark:text-dark-text">{savedFavorites}</p>
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/68 dark:text-dark-text/64 mt-1">{libraryCopy.favorites}</p>
          </div>
          <div className={`home-quiet-card px-3 py-3 transition-all duration-300 ${lastSaved?.kind === 'review' ? 'saved-feedback-highlight' : ''}`}>
            <IconLayers className="home-saved-metric-icon" size={20} />
            <p className="font-sans text-2xl text-ink dark:text-dark-text">{savedReviewItems}</p>
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/68 dark:text-dark-text/64 mt-1">{libraryCopy.reviewBank}</p>
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
                <span className="mt-1 shrink-0 text-gold-dark dark:text-gold-light">
                  <IconArrowRight size={16} />
                </span>
              </Link>
            )})
          ) : (
            <div className="home-quiet-card home-saved-empty-preview px-4 py-4">
              <p className="eyebrow">Saved Preview</p>
              <p className="mt-2 font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/70">
                Bookmarked passages, favorites, and review items will appear here once you start keeping pieces close.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
