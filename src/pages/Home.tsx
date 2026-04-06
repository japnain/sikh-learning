import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconArrowRight,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconMoon,
  IconSearch,
  IconSun,
} from '../components/icons'
import OnboardingSheet from '../components/OnboardingSheet'
import StreakBadge from '../components/StreakBadge'
import { BANIS } from '../data/banis'
import { useHukamnama } from '../hooks/useHukamnama'
import { useAng } from '../hooks/useAng'
import { useLanguageStore } from '../store/language'
import { useLearningStore } from '../store/learning'
import { useOnboardingStore } from '../store/onboarding'
import { useProgressStore } from '../store/progress'
import { useReadingProgressStore } from '../store/readingProgress'
import { useScriptureCacheStore } from '../store/scriptureCache'
import { useThemeStore } from '../store/theme'
import { useNitemStore, NITNEM_BANIS } from '../store/nitnem'
import { useVocabStore } from '../store/vocab'
import type { StudiedEntry } from '../types'
import { getEntryMeaningText, renderScriptText } from '../utils/readerDisplay'
import { LEARNING_LEVEL_LABELS } from '../utils/translations'
import { getDailyPickAng } from '../utils/dailyPick'

function greeting(): string {
  return 'SatShriAkaal'
}

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
  const setScriptMode = useLanguageStore(s => s.setScriptMode)
  const showTransliteration = useLanguageStore(s => s.showTransliteration)
  const setShowTransliteration = useLanguageStore(s => s.setShowTransliteration)
  const setMeaningLanguage = useLanguageStore(s => s.setMeaningLanguage)
  const setEnglishSource = useLanguageStore(s => s.setEnglishSource)
  const { markComplete, unmarkComplete, isComplete, resetIfNewDay } = useNitemStore()
  const { getProgress } = useReadingProgressStore()
  const vocab = useVocabStore(s => s.vocab)
  const { masteredSymbols, completedLessons, practiceStreak } = useLearningStore()
  const {
    hasCompletedOnboarding,
    learningLevel,
    setLearningLevel,
    completeOnboarding,
  } = useOnboardingStore()
  const [nitnemOpen, setNitnemOpen] = useState(false)

  resetIfNewDay()

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

  const heroPrimary = useMemo(() => {
    if (showLearnHero) {
      return {
        eyebrow: 'Grow',
        title: 'Build the habit before the overwhelm.',
        body: 'Start with guided letters, practice recognition, then move into live pankti when you are ready.',
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
        body: 'Nitnem should feel immediate. Resume your last reading without hunting through the library.',
        buttonLabel: 'Resume Reading',
        buttonAction: () => navigate(`/study?source=${sessionTarget.source}&ang=${sessionTarget.ang}`),
        secondaryLabel: 'Open today’s hukamnama',
        secondaryAction: () => navigate(hukamnama ? `/study?hukamnamaDate=${hukamnama.date}` : '/banis'),
      }
    }

    return {
      eyebrow: 'Read',
      title: 'Begin with today’s hukamnama.',
      body: 'A calm first step for daily reading, with meaning controls and a cleaner mobile reader built in.',
      buttonLabel: 'Open Today’s Hukamnama',
      buttonAction: () => navigate(hukamnama ? `/study?hukamnamaDate=${hukamnama.date}` : '/banis'),
      secondaryLabel: 'Browse Read',
      secondaryAction: () => navigate('/banis'),
    }
  }, [currentSession, hukamnama, navigate, sessionTarget.ang, sessionTarget.source, showLearnHero])

  return (
    <div className="page-shell animate-fade-in">
      <div className="flex justify-between items-start gap-3 mb-5">
        <div>
          <p className="font-display text-3xl text-ink dark:text-dark-text leading-none">Nitnem</p>
          <p className="font-sans text-xs text-ink/55 dark:text-dark-text/55 mt-1">
            Read Gurbani daily. Understand it better. Grow into it steadily.
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
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <h1 className="font-display text-[1.8rem] leading-none text-ink dark:text-dark-text mt-2">
          {greeting()}
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
              {renderScriptText(hukamnama.entry.lines?.[0]?.gurmukhi ?? hukamnama.entry.gurmukhi, scriptMode)}
            </p>
            {meaningLanguage !== 'none' && (
              <p className={`mt-3 text-sm text-ink/70 dark:text-dark-text/70 line-clamp-2 ${meaningLanguage === 'pa' ? 'font-gurmukhi' : 'font-sans'}`}>
                {getEntryMeaningText(hukamnama.entry, meaningLanguage, englishSource)}
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

      <section className="grid grid-cols-1 gap-3 mb-5 animate-slide-up stagger-2">
        <button
          onClick={() => navigate('/vocab')}
          className="section-shell p-4 text-left active:scale-[0.99] transition-transform duration-150"
        >
          <p className="eyebrow">Review</p>
          <p className="font-sans text-base font-semibold text-ink dark:text-dark-text mt-2">
            {dueReview.length > 0 ? `${dueReview.length} review item${dueReview.length === 1 ? '' : 's'} due` : 'Your review queue is clear'}
          </p>
          <p className="font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/65 mt-1">
            Saved words and full phrases stay ready for short daily revision.
          </p>
        </button>

        <button
          onClick={() => navigate('/learn')}
          className="section-shell p-4 text-left active:scale-[0.99] transition-transform duration-150"
        >
          <p className="eyebrow">Grow</p>
          <p className="font-sans text-base font-semibold text-ink dark:text-dark-text mt-2">
            {LEARNING_LEVEL_LABELS[learningLevel]} track
          </p>
          <p className="font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/65 mt-1">
            {masteredSymbols.length} symbols mastered, {completedLessons.length} lessons complete, {practiceStreak} day practice streak.
          </p>
        </button>
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
              ) : todaysPick ? (
                <button
                  onClick={() => navigate(`/study?source=${source}&ang=${ang}`)}
                  className="w-full section-shell px-4 py-4 text-left"
                >
                  <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-gold dark:text-gold-light">
                    Today&apos;s Pick · {todaysPick.scripture} · Ang {todaysPick.ang}
                  </p>
                  <p
                    lang={scriptMode === 'devanagari' ? 'hi' : 'pa-Guru'}
                    className={`${scriptMode === 'devanagari' ? 'font-sans' : 'font-gurmukhi'} text-xl leading-relaxed text-ink dark:text-dark-text mt-2 line-clamp-2`}
                  >
                    {renderScriptText(todaysPick.gurmukhi, scriptMode)}
                  </p>
                  {meaningLanguage !== 'none' && (
                    <p className={`mt-2 text-sm text-ink/65 dark:text-dark-text/65 line-clamp-2 ${meaningLanguage === 'pa' ? 'font-gurmukhi' : 'font-sans'}`}>
                      {getEntryMeaningText(todaysPick, meaningLanguage, englishSource)}
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

      {!hasCompletedOnboarding && (
        <OnboardingSheet
          scriptMode={scriptMode}
          setScriptMode={setScriptMode}
          showTransliteration={showTransliteration}
          setShowTransliteration={setShowTransliteration}
          meaningLanguage={meaningLanguage}
          setMeaningLanguage={setMeaningLanguage}
          englishSource={englishSource}
          setEnglishSource={setEnglishSource}
          learningLevel={learningLevel}
          setLearningLevel={setLearningLevel}
          onComplete={() => completeOnboarding(learningLevel)}
        />
      )}
    </div>
  )
}
