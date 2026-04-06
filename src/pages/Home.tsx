import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconArrowRight,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconMoon,
  IconSearch,
  IconShare,
  IconSun,
} from '../components/icons'
import StreakBadge from '../components/StreakBadge'
import { BANIS } from '../data/banis'
import { GUIDED_JOURNEYS } from '../data/guidedJourneys'
import { useHukamnama } from '../hooks/useHukamnama'
import { useAng } from '../hooks/useAng'
import { useDailyFlowStore } from '../store/dailyFlow'
import { useLanguageStore } from '../store/language'
import { useLearningStore } from '../store/learning'
import { useLocaleStore } from '../store/locale'
import { useOnboardingStore } from '../store/onboarding'
import { useProgressStore } from '../store/progress'
import { useReadingProgressStore } from '../store/readingProgress'
import { useScriptureCacheStore } from '../store/scriptureCache'
import { useThemeStore } from '../store/theme'
import { useNitemStore, NITNEM_BANIS } from '../store/nitnem'
import { useVocabStore } from '../store/vocab'
import type { StudiedEntry } from '../types'
import { getEntryMeaningText, getLineMeaningText, isStructuralTitleLine, renderScriptText } from '../utils/readerDisplay'
import { LEARNING_LEVEL_LABELS } from '../utils/translations'
import { getUiCopy } from '../utils/uiCopy'
import { getDailyPickAng } from '../utils/dailyPick'

function parseSession(scriptureId: string | null | undefined): { source: string | null; ang: number | null } {
  if (!scriptureId) return { source: null, ang: null }
  const parts = scriptureId.split('-')
  if (parts.length < 2) return { source: null, ang: null }
  return {
    source: parts[0] ?? null,
    ang: Number(parts[1]) || null,
  }
}

export default function Home() {
  const navigate = useNavigate()
  const { streak, currentSession, studied } = useProgressStore()
  const { getEntryById } = useScriptureCacheStore()
  const { dark, toggle: toggleTheme } = useThemeStore()
  const scriptMode = useLanguageStore(s => s.scriptMode)
  const meaningLanguage = useLanguageStore(s => s.meaningLanguage)
  const englishSource = useLanguageStore(s => s.englishSource)
  const locale = useLocaleStore(s => s.locale)
  const { markComplete, unmarkComplete, isComplete, resetIfNewDay } = useNitemStore()
  const ensureDailyToday = useDailyFlowStore(s => s.ensureToday)
  const toggleDailyAction = useDailyFlowStore(s => s.toggleAction)
  const isDailyActionDone = useDailyFlowStore(s => s.isCompleted)
  const completedActionIds = useDailyFlowStore(s => s.completedActionIds)
  const { getProgress } = useReadingProgressStore()
  const vocab = useVocabStore(s => s.vocab)
  const { masteredSymbols, completedLessons, journeys, activeJourneyId } = useLearningStore()
  const {
    learningLevel,
    audience,
    learningGoal,
  } = useOnboardingStore()
  const copy = getUiCopy(locale)
  const [nitnemOpen, setNitnemOpen] = useState(false)
  const [showCopied, setShowCopied] = useState(false)

  useEffect(() => {
    resetIfNewDay()
    ensureDailyToday()
  }, [ensureDailyToday, resetIfNewDay])

  const { source, ang } = getDailyPickAng()
  const { entries: pickEntries, loading: pickLoading } = useAng(ang, source)
  const todaysPick = pickEntries[0] ?? null
  const { data: hukamnama, loading: hukamnamaLoading } = useHukamnama()

  const nitnemDone = NITNEM_BANIS.filter(b => isComplete(b.id)).length
  const dueReview = vocab.filter(entry => new Date(entry.review?.dueAt ?? entry.savedAt).getTime() <= Date.now())
  const savedWords = vocab.filter(entry => (entry.kind ?? 'word') === 'word').length
  const savedPhrases = vocab.filter(entry => (entry.kind ?? 'word') === 'phrase').length

  const PROGRESS_BANIS = BANIS.filter(b =>
    ['japji-sahib', 'sukhmani-sahib', 'anand-sahib', 'rehras-sahib', 'jaap-sahib'].includes(b.id)
  )
  const progressItems = PROGRESS_BANIS
    .map(b => ({ ...b, ...getProgress(b.id) }))
    .filter(p => p.done > 0)

  const recentlyStudied = [...studied]
    .sort((a: StudiedEntry, b: StudiedEntry) =>
      new Date(b.swipedAt).getTime() - new Date(a.swipedAt).getTime()
    )
    .slice(0, 5)
    .map((s: StudiedEntry) => {
      const entry = getEntryById(s.id)
      return entry ? { ...entry, swipedAt: s.swipedAt } : null
    })
    .filter((e): e is NonNullable<typeof e> => e !== null)

  const sessionTarget = parseSession(currentSession?.scriptureId)
  const showLearnHero = learningLevel === 'beginner' && !currentSession
  const activeJourney = useMemo(() => {
    if (activeJourneyId) {
      return GUIDED_JOURNEYS.find(journey => journey.id === activeJourneyId) ?? null
    }
    return GUIDED_JOURNEYS.find(journey => journeys[journey.id] && !journeys[journey.id]?.completedAt) ?? null
  }, [activeJourneyId, journeys])
  const activeJourneyProgress = activeJourney ? journeys[activeJourney.id] : null
  const nextJourneyStep = activeJourney?.steps.find(step => !activeJourneyProgress?.completedStepIds.includes(step.id)) ?? null
  const completedDailyCount = completedActionIds.length

  const readAction = useMemo(() => {
    if (currentSession && sessionTarget.source && sessionTarget.ang) {
      return {
        title: 'Resume Reading',
        body: learningGoal === 'understand'
          ? 'Return to the last passage you were studying so the context stays intact.'
          : 'Open the passage you were already working through.',
        onAction: () => navigate(`/study?source=${sessionTarget.source}&ang=${sessionTarget.ang}`),
      }
    }

    return {
      title: 'Open Today’s Hukamnama',
      body: learningGoal === 'understand'
        ? 'Start with the daily hukamnama and keep the meaning close.'
        : 'Start with the daily hukamnama and stay in a steady daily rhythm.',
      onAction: () => navigate(hukamnama ? `/study?hukamnamaDate=${hukamnama.date}` : '/banis'),
    }
  }, [currentSession, hukamnama, learningGoal, navigate, sessionTarget.ang, sessionTarget.source])

  const heroPrimary = useMemo(() => {
    if (showLearnHero) {
      return {
        eyebrow: 'Grow',
        title: learningGoal === 'habit'
          ? 'Build a reading habit before adding more weight.'
          : learningGoal === 'understand'
            ? 'Learn the script before chasing too much meaning.'
            : 'Build reading confidence before the overwhelm.',
        body: audience === 'child'
          ? 'Keep the next step simple: guided letters, short drills, then one real line at a time.'
          : 'Start with guided letters, practice recognition, then move into live pankti when you are ready.',
        buttonLabel: 'Continue Learn',
        buttonAction: () => navigate('/learn'),
        secondaryLabel: 'Open today’s hukamnama',
        secondaryAction: () => navigate(hukamnama ? `/study?hukamnamaDate=${hukamnama.date}` : '/banis'),
      }
    }

    if (currentSession && sessionTarget.source && sessionTarget.ang) {
      return {
        eyebrow: 'Read',
        title: 'Pick up exactly where you paused.',
        body: learningGoal === 'understand'
          ? 'Return to the last passage you were studying so the context stays intact.'
          : 'Nitnem should feel immediate. Resume your last reading without hunting through the library.',
        buttonLabel: 'Resume Reading',
        buttonAction: () => navigate(`/study?source=${sessionTarget.source}&ang=${sessionTarget.ang}`),
        secondaryLabel: 'Open today’s hukamnama',
        secondaryAction: () => navigate(hukamnama ? `/study?hukamnamaDate=${hukamnama.date}` : '/banis'),
      }
    }

    return {
      eyebrow: 'Read',
      title: learningGoal === 'habit'
        ? 'Begin with today’s hukamnama.'
        : learningGoal === 'understand'
          ? 'Begin with today’s hukamnama and keep the meaning close.'
          : 'Begin with today’s hukamnama.',
      body: learningGoal === 'understand'
        ? 'A calm first step for daily reading, with meaning controls and guided support built into the reader.'
        : 'A calm first step for daily reading, with meaning controls and a cleaner mobile reader built in.',
      buttonLabel: 'Open Today’s Hukamnama',
      buttonAction: () => navigate(hukamnama ? `/study?hukamnamaDate=${hukamnama.date}` : '/banis'),
      secondaryLabel: 'Browse Read',
      secondaryAction: () => navigate('/banis'),
    }
  }, [audience, currentSession, hukamnama, learningGoal, navigate, sessionTarget.ang, sessionTarget.source, showLearnHero])

  const openGrowAction = () => {
    toggleDailyAction('grow')
    if (nextJourneyStep?.type === 'study' && nextJourneyStep.source && nextJourneyStep.ang) {
      navigate(`/study?source=${nextJourneyStep.source}&ang=${nextJourneyStep.ang}&bani=${encodeURIComponent(nextJourneyStep.baniTitle ?? activeJourney?.title ?? 'Journey')}`)
      return
    }
    if (nextJourneyStep?.type === 'review') {
      navigate('/vocab')
      return
    }
    navigate('/learn')
  }

  const openReadAction = () => {
    toggleDailyAction('read')
    readAction.onAction()
  }

  const openReviewAction = () => {
    toggleDailyAction('review')
    navigate('/vocab')
  }

  const nextStep = useMemo(() => {
    if (!isDailyActionDone('read')) {
      return {
        title: readAction.title,
        body: readAction.body,
        actionLabel: 'Do reading step',
        onAction: openReadAction,
      }
    }

    if (!isDailyActionDone('grow')) {
      return {
        title: activeJourney ? activeJourney.title : 'Continue Learn',
        body: nextJourneyStep
          ? nextJourneyStep.title
          : `${LEARNING_LEVEL_LABELS[learningLevel]} track should stay active today.`,
        actionLabel: 'Do growth step',
        onAction: openGrowAction,
      }
    }

    if (!isDailyActionDone('review')) {
      return {
        title: dueReview.length > 0 ? `${dueReview.length} review item${dueReview.length === 1 ? '' : 's'} due` : 'Quick review pass',
        body: 'Use saved words and phrases to keep comprehension sticky.',
        actionLabel: 'Do review step',
        onAction: openReviewAction,
      }
    }

    return {
      title: 'Today’s core loop is complete',
      body: 'You can revisit a journey, continue a bani, or leave the day with a clean streak.',
      actionLabel: 'Open Saved',
      onAction: () => navigate('/library'),
    }
  }, [activeJourney, dueReview.length, isDailyActionDone, learningLevel, navigate, nextJourneyStep, readAction])

  const todaysPickPreview = useMemo(() => {
    if (!todaysPick) return null
    const previewLine = todaysPick.lines?.find(line => !line.isHeader && line.gurmukhi.trim() && !isStructuralTitleLine(line.gurmukhi))
      ?? todaysPick.lines?.find(line => !line.isHeader && line.gurmukhi.trim())
      ?? todaysPick.lines?.find(line => line.gurmukhi.trim())
    if (!previewLine) return todaysPick
    return {
      ...todaysPick,
      gurmukhi: previewLine.gurmukhi,
      transliteration: previewLine.transliteration || todaysPick.transliteration,
      translation_en: previewLine.translation_en || todaysPick.translation_en,
      translation_hi: previewLine.translation_hi || todaysPick.translation_hi,
      translation_pa: previewLine.translation_pa || todaysPick.translation_pa,
      lines: [previewLine],
    }
  }, [todaysPick])
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

  const handleShareProgress = async () => {
    const text = [
      'Nitnem progress update',
      `${streak} day streak`,
      `${masteredSymbols.length} symbols mastered`,
      `${completedLessons.length} lessons completed`,
      `${nitnemDone} of ${NITNEM_BANIS.length} Nitnem banis complete today`,
      activeJourney ? `${activeJourney.title}: ${activeJourneyProgress?.completedStepIds.length ?? 0}/${activeJourney.steps.length} steps` : '',
    ].filter(Boolean).join('\n')

    if (navigator.share) {
      try {
        await navigator.share({ text })
        return
      } catch {
        // fall through to clipboard
      }
    }

    await navigator.clipboard.writeText(text)
    setShowCopied(true)
    setTimeout(() => setShowCopied(false), 2000)
  }

  return (
    <div className="page-shell animate-fade-in">
      <div className="flex justify-between items-start gap-3 mb-5">
        <div>
          <p className="font-display text-3xl text-ink dark:text-dark-text leading-none">Nitnem</p>
          <p className="font-sans text-xs text-ink/55 dark:text-dark-text/55 mt-1">
            {copy.home.promise}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="section-shell-quiet min-h-[44px] min-w-[44px] flex items-center justify-center text-ink/75 dark:text-dark-text/75 active:scale-95 transition-transform duration-150"
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? <IconSun size={18} /> : <IconMoon size={18} />}
          </button>
          <StreakBadge streak={streak} />
        </div>
      </div>

      <div className="mb-4">
        <p className="font-sans text-xs uppercase tracking-[0.18em] text-gold dark:text-gold-light">
          {new Date().toLocaleDateString(locale === 'pa' ? 'pa-IN' : locale === 'hi' ? 'hi-IN' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <h1 className="font-display text-[1.8rem] leading-none text-ink dark:text-dark-text mt-2">
          {copy.home.greeting}
        </h1>
      </div>

      <section className="hero-surface ornate-top p-6 mb-5 animate-slide-up stagger-1">
        <div className="flex items-center justify-between gap-3 mb-4">
          <span className="eyebrow">{heroPrimary.eyebrow}</span>
          <span className="chip-pill">{LEARNING_LEVEL_LABELS[learningLevel]}</span>
        </div>
        <h2 className="font-display text-[2rem] leading-[0.95] text-ink dark:text-dark-text max-w-[12ch]">
          {heroPrimary.title}
        </h2>
        <p className="font-sans text-sm leading-6 text-ink/70 dark:text-dark-text/70 mt-3 max-w-[32ch]">
          {heroPrimary.body}
        </p>

        {hukamnamaLoading ? (
          <div className="section-shell-quiet mt-5 p-4 animate-pulse">
            <div className="h-3 rounded bg-sand/20 dark:bg-dark-text/10 w-24 mb-3" />
            <div className="h-6 rounded bg-sand/20 dark:bg-dark-text/10 mb-2" />
            <div className="h-4 rounded bg-sand/20 dark:bg-dark-text/10 w-4/5" />
          </div>
        ) : hukamnama ? (
          <div className="section-shell-quiet mt-5 p-4">
            <p className="eyebrow mb-2">Today’s Hukamnama</p>
            <p className="font-sans text-[11px] text-ink/50 dark:text-dark-text/50 mb-2">
              {hukamnama.entry.raag ? `${hukamnama.entry.raag} · ` : ''}
              {hukamnama.entry.scripture} · Ang {hukamnama.ang}
            </p>
            <p
              lang={scriptMode === 'devanagari' ? 'hi' : 'pa-Guru'}
              className={`${scriptMode === 'devanagari' ? 'font-sans' : 'font-gurmukhi'} text-2xl leading-relaxed text-ink dark:text-dark-text line-clamp-3`}
            >
              {renderScriptText(hukamnamaPreviewLine?.gurmukhi ?? hukamnama.entry.gurmukhi, scriptMode)}
            </p>
            {hukamnamaMeaningPreview && (
              <p className={`mt-3 text-sm text-ink/70 dark:text-dark-text/70 line-clamp-2 ${meaningLanguage === 'pa' ? 'font-gurmukhi' : 'font-sans'}`}>
                {hukamnamaMeaningPreview}
              </p>
            )}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 mt-5">
          <button
            onClick={heroPrimary.buttonAction}
            className="min-h-[50px] rounded-full bg-gradient-to-r from-saffron to-saffron-light text-white font-sans text-sm font-semibold px-5 active:scale-95 transition-transform duration-150"
          >
            {heroPrimary.buttonLabel}
          </button>
          <button
            onClick={heroPrimary.secondaryAction}
            className="min-h-[48px] rounded-full bg-white/70 dark:bg-dark-card/70 text-ink dark:text-dark-text font-sans text-sm font-medium px-5 border border-sand/15 dark:border-dark-text/10 active:scale-95 transition-transform duration-150"
          >
            {heroPrimary.secondaryLabel}
          </button>
        </div>
      </section>

      <button
        onClick={() => navigate('/banis')}
        className="section-shell-quiet w-full flex items-center gap-3 px-4 py-3 mb-5 active:scale-[0.99] transition-transform duration-150"
      >
        <IconSearch size={16} className="text-ink/35 dark:text-dark-text/35" />
        <span className="font-sans text-sm text-ink/45 dark:text-dark-text/45">
          Search Gurbani, first letters, transliteration, or meaning
        </span>
      </button>

      <section className="section-shell p-4 mb-5 animate-slide-up stagger-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Today&apos;s Path</p>
            <p className="font-sans text-base font-semibold text-ink dark:text-dark-text mt-2">
              {nextStep.title}
            </p>
            <p className="font-sans text-sm text-ink/65 dark:text-dark-text/65 mt-1">
              {nextStep.body}
            </p>
          </div>
          <button
            onClick={handleShareProgress}
            className="min-h-[40px] min-w-[40px] rounded-full section-shell-quiet flex items-center justify-center text-gold dark:text-gold-light"
            aria-label="Share progress"
          >
            {showCopied ? <span className="font-sans text-[10px]">Copied</span> : <IconShare size={16} />}
          </button>
        </div>
        <div className="h-1.5 bg-sand/20 dark:bg-dark-text/10 rounded-full overflow-hidden mt-4">
          <div className="h-full bg-gradient-to-r from-saffron to-saffron-light rounded-full" style={{ width: `${(completedDailyCount / 3) * 100}%` }} />
        </div>
        <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/45 dark:text-dark-text/45 mt-2">
          {completedDailyCount} of 3 core actions done
        </p>
        <button
          onClick={nextStep.onAction}
          className="mt-4 w-full rounded-2xl bg-gradient-to-r from-saffron to-saffron-light text-white font-sans text-sm font-semibold min-h-[48px]"
        >
          {nextStep.actionLabel}
        </button>

        <div className="grid grid-cols-1 gap-3 mt-4">
          <button
            onClick={openReadAction}
            className="section-shell-quiet p-4 text-left active:scale-[0.99] transition-transform duration-150"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow">Read</p>
                <p className="font-sans text-base font-semibold text-ink dark:text-dark-text mt-2">
                  {readAction.title}
                </p>
                <p className="font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/65 mt-1">
                  {readAction.body}
                </p>
              </div>
              {isDailyActionDone('read') ? <IconCheck size={16} className="text-saffron dark:text-saffron-light" /> : null}
            </div>
          </button>

          <button
            onClick={openGrowAction}
            className="section-shell-quiet p-4 text-left active:scale-[0.99] transition-transform duration-150"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow">Grow</p>
                <p className="font-sans text-base font-semibold text-ink dark:text-dark-text mt-2">
                  {activeJourney ? activeJourney.title : `${LEARNING_LEVEL_LABELS[learningLevel]} track`}
                </p>
                <p className="font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/65 mt-1">
                  {nextJourneyStep ? nextJourneyStep.title : 'Keep one guided step active so progress compounds over time.'}
                </p>
              </div>
              {isDailyActionDone('grow') ? <IconCheck size={16} className="text-saffron dark:text-saffron-light" /> : null}
            </div>
          </button>

          <button
            onClick={openReviewAction}
            className="section-shell-quiet p-4 text-left active:scale-[0.99] transition-transform duration-150"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow">Review</p>
                <p className="font-sans text-base font-semibold text-ink dark:text-dark-text mt-2">
                  {dueReview.length > 0 ? `${dueReview.length} item${dueReview.length === 1 ? '' : 's'} due` : 'Quick review pass'}
                </p>
                <p className="font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/65 mt-1">
                  Saved words and full phrases stay ready for short daily revision.
                </p>
              </div>
              {isDailyActionDone('review') ? <IconCheck size={16} className="text-saffron dark:text-saffron-light" /> : null}
            </div>
          </button>
        </div>
      </section>

      <section className="section-shell-quiet p-4 mb-5 animate-slide-up stagger-3">
        <button
          onClick={() => setNitnemOpen(o => !o)}
          className="w-full flex items-center justify-between gap-3 min-h-[44px]"
        >
          <div className="text-left">
            <p className="eyebrow">Nitnem Progress</p>
            <p className="font-sans text-sm text-ink dark:text-dark-text mt-1">
              {nitnemDone} of {NITNEM_BANIS.length} daily banis complete
            </p>
          </div>
          <span className="text-gold dark:text-gold-light">
            {nitnemOpen ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
          </span>
        </button>
        <div className="h-1.5 bg-sand/20 dark:bg-dark-text/10 rounded-full overflow-hidden mt-4">
          <div
            className="h-full bg-gradient-to-r from-saffron to-saffron-light rounded-full transition-all duration-500"
            style={{ width: `${(nitnemDone / NITNEM_BANIS.length) * 100}%` }}
          />
        </div>
        {nitnemOpen && (
          <div className="mt-4 space-y-2">
            {NITNEM_BANIS.map(bani => {
              const done = isComplete(bani.id)
              return (
                <div key={bani.id} className="section-shell px-3 py-3 flex items-center gap-3">
                  <button
                    onClick={() => done ? unmarkComplete(bani.id) : markComplete(bani.id)}
                    className={`w-7 h-7 rounded-full border flex items-center justify-center flex-shrink-0 ${
                      done ? 'bg-saffron border-saffron text-white' : 'border-sand/35 dark:border-dark-text/20 text-transparent'
                    }`}
                  >
                    <IconCheck size={14} />
                  </button>
                  <button
                    onClick={() => {
                      const params = new URLSearchParams({
                        source: bani.source,
                        ang: String(bani.startAng),
                        bani: bani.name,
                        endAng: String(bani.endAng),
                      })
                      navigate(`/study?${params}`)
                    }}
                    className="flex-1 text-left"
                  >
                    <p className={`font-sans text-sm ${done ? 'text-ink/40 dark:text-dark-text/40 line-through' : 'text-ink dark:text-dark-text'}`}>
                      {bani.name}
                    </p>
                    <p className="font-sans text-[11px] text-ink/45 dark:text-dark-text/45 mt-1">
                      {bani.time}
                    </p>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="section-shell p-4 mb-5 animate-slide-up stagger-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Saved</p>
            <h3 className="font-display text-3xl text-ink dark:text-dark-text leading-none mt-2">Keep what matters.</h3>
          </div>
          <button
            onClick={() => navigate('/library')}
            className="font-sans text-sm text-gold dark:text-gold-light flex items-center gap-1"
          >
            Open Saved <IconArrowRight size={14} />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="section-shell-quiet px-3 py-3">
            <p className="font-sans text-2xl text-ink dark:text-dark-text">{savedWords}</p>
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/45 dark:text-dark-text/45 mt-1">Words</p>
          </div>
          <div className="section-shell-quiet px-3 py-3">
            <p className="font-sans text-2xl text-ink dark:text-dark-text">{savedPhrases}</p>
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/45 dark:text-dark-text/45 mt-1">Phrases</p>
          </div>
          <div className="section-shell-quiet px-3 py-3">
            <p className="font-sans text-2xl text-ink dark:text-dark-text">{progressItems.length}</p>
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/45 dark:text-dark-text/45 mt-1">In Progress</p>
          </div>
        </div>
      </section>

      {(progressItems.length > 0 || todaysPick || recentlyStudied.length > 0) && (
        <section className="section-shell-quiet p-4 animate-slide-up stagger-5">
          <p className="eyebrow mb-4">Discovery & History</p>

          {progressItems.length > 0 && (
            <div className="mb-4">
              <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text mb-2">In-progress banis</p>
              <div className="space-y-2">
                {progressItems.slice(0, 3).map(p => (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/study?source=${p.source}&ang=${p.startAng}&bani=${encodeURIComponent(p.name)}`)}
                    className="w-full section-shell px-4 py-3 text-left"
                  >
                    <div className="flex justify-between gap-3">
                      <p className="font-sans text-sm text-ink dark:text-dark-text">{p.name}</p>
                      <p className="font-sans text-xs text-ink/45 dark:text-dark-text/45">{p.pct}%</p>
                    </div>
                    <div className="h-1.5 bg-sand/20 dark:bg-dark-text/10 rounded-full overflow-hidden mt-2">
                      <div className="h-full bg-gradient-to-r from-saffron to-saffron-light rounded-full" style={{ width: `${p.pct}%` }} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text mb-2">Today’s pick</p>
              {pickLoading ? (
                <div className="section-shell px-4 py-4 animate-pulse">
                  <div className="h-3 rounded bg-sand/20 dark:bg-dark-text/10 w-20 mb-3" />
                  <div className="h-6 rounded bg-sand/20 dark:bg-dark-text/10 mb-2" />
                </div>
              ) : todaysPickPreview ? (
                <button
                  onClick={() => navigate(`/study?source=${source}&ang=${ang}`)}
                  className="w-full section-shell px-4 py-4 text-left"
                >
                  <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-gold dark:text-gold-light">
                    Today&apos;s Pick · {todaysPickPreview.scripture} · Ang {todaysPickPreview.ang}
                  </p>
                  <p
                    lang={scriptMode === 'devanagari' ? 'hi' : 'pa-Guru'}
                    className={`${scriptMode === 'devanagari' ? 'font-sans' : 'font-gurmukhi'} text-xl leading-relaxed text-ink dark:text-dark-text mt-2 line-clamp-2`}
                  >
                    {renderScriptText(todaysPickPreview.gurmukhi, scriptMode)}
                  </p>
                  {meaningLanguage !== 'none' && (
                    <p className={`mt-2 text-sm text-ink/65 dark:text-dark-text/65 line-clamp-2 ${meaningLanguage === 'pa' ? 'font-gurmukhi' : 'font-sans'}`}>
                      {getEntryMeaningText(todaysPickPreview, meaningLanguage, englishSource)}
                    </p>
                  )}
                </button>
              ) : (
                <p className="font-sans text-sm text-ink/55 dark:text-dark-text/55">No verse available today.</p>
              )}
            </div>

            {recentlyStudied.length > 0 && (
              <div>
                <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text mb-2">Recently studied</p>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {recentlyStudied.map(entry => (
                    <button
                      key={entry.id}
                      className="flex-shrink-0 w-52 section-shell px-4 py-4 text-left"
                      onClick={() => {
                        const parts = entry.id.split('-')
                        if (parts.length >= 2) navigate(`/study?source=${parts[0]}&ang=${parts[1]}`)
                      }}
                    >
                      <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-gold dark:text-gold-light">
                        {entry.scripture}
                      </p>
                      <p
                        lang={scriptMode === 'devanagari' ? 'hi' : 'pa-Guru'}
                        className={`${scriptMode === 'devanagari' ? 'font-sans' : 'font-gurmukhi'} text-sm leading-7 text-ink dark:text-dark-text mt-2 line-clamp-3`}
                      >
                        {renderScriptText(entry.gurmukhi, scriptMode)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
