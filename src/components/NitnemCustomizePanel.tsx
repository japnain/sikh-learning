import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconArrowRight } from './icons'
import {
  buildNitnemStudyPath,
  compareNitnemOptions,
  NITNEM_ROUTE_OPTIONS,
  type NitnemRouteOption,
  useNitemStore,
} from '../store/nitnem'
import { useSundarGutkaLengthStore } from '../store/sundarGutkaLength'
import { getSundarGutkaLengthDetail, isSundarGutkaLengthSupportedBaniId } from '../utils/sundarGutkaLength'

function SettingsBlock({
  title,
  description,
  children,
  headingId,
  testId,
}: {
  title: string
  description?: string
  children: ReactNode
  headingId?: string
  testId?: string
}) {
  return (
    <div
      className="section-shell px-4 py-4"
      aria-labelledby={headingId}
      data-testid={testId}
    >
      <p id={headingId} className="eyebrow">{title}</p>
      {description ? (
        <p className="mt-1 mb-3 font-sans text-xs text-ink/50 dark:text-dark-text/50">
          {description}
        </p>
      ) : null}
      {children}
    </div>
  )
}

export default function NitnemCustomizePanel() {
  const navigate = useNavigate()
  const {
    selectedIds,
    completionTrackingEnabled,
    setCompletionTrackingEnabled,
    markComplete,
    unmarkComplete,
    isComplete,
    toggleSelected,
    moveSelected,
    resetSelections,
    resetIfNewDay,
  } = useNitemStore()
  const sundarGutkaLengths = useSundarGutkaLengthStore(state => state.lengths)
  const [confirmingReset, setConfirmingReset] = useState(false)
  const resetConfirmRef = useRef<number | null>(null)

  const selectedNitnemOptions = useMemo(() => {
    return selectedIds
      .map(optionId => NITNEM_ROUTE_OPTIONS.find(option => option.id === optionId) ?? null)
      .filter((option): option is NitnemRouteOption => option !== null)
  }, [selectedIds])
  const availableNitnemOptions = useMemo(() => {
    return [...NITNEM_ROUTE_OPTIONS].sort(compareNitnemOptions)
  }, [])
  const nitnemDone = selectedNitnemOptions.filter(option => isComplete(option.id)).length
  const nitnemTotal = selectedNitnemOptions.length
  const nitnemProgressPct = nitnemTotal > 0 ? (nitnemDone / nitnemTotal) * 100 : 0

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
      if (resetConfirmRef.current !== null) {
        window.clearTimeout(resetConfirmRef.current)
      }
    }
  }, [])

  const handleReset = () => {
    if (confirmingReset) {
      if (resetConfirmRef.current !== null) {
        window.clearTimeout(resetConfirmRef.current)
        resetConfirmRef.current = null
      }
      setConfirmingReset(false)
      resetSelections()
      return
    }

    setConfirmingReset(true)
    if (resetConfirmRef.current !== null) {
      window.clearTimeout(resetConfirmRef.current)
    }
    resetConfirmRef.current = window.setTimeout(() => {
      resetConfirmRef.current = null
      setConfirmingReset(false)
    }, 3000)
  }

  return (
    <div className="space-y-4" data-testid="nitnem-customize-panel">
      <SettingsBlock
        title="Ritual Order"
        description="Home follows this exact order. Start here, reorder here, and keep completion away from the Home card."
        headingId="nitnem-ritual-order-title"
        testId="nitnem-ritual-order"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="font-sans text-xs text-ink/55 dark:text-dark-text/60">
            Selected banis appear on Home in this sequence.
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="font-sans text-xs text-gold underline underline-offset-2 dark:text-gold-light"
            data-testid="nitnem-reset"
          >
            {confirmingReset ? 'Tap again to reset' : 'Reset'}
          </button>
        </div>

        <div className="space-y-2">
          {selectedNitnemOptions.map((option, index) => {
            const canRemove = selectedNitnemOptions.length > 1

            return (
              <article
                key={`ritual-order-${option.id}`}
                className="rounded-lg border border-sand/14 bg-parchment-card/72 px-3 py-3 text-ink dark:border-dark-text/10 dark:bg-dark-card/72 dark:text-dark-text"
                data-testid="nitnem-ritual-item"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold/20 bg-gold/10 font-sans text-[11px] font-semibold text-gold dark:text-gold-light">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p lang="pa-Guru" className="font-gurmukhi text-lg leading-relaxed">
                        {option.gurmukhiTitle}
                      </p>
                      <span className="rounded-full bg-ink/5 px-2 py-1 font-sans text-[10px] uppercase tracking-[0.16em] text-ink/55 dark:bg-white/10 dark:text-dark-text/60">
                        {option.group}
                      </span>
                    </div>
                    <p className="mt-1 font-sans text-xs font-semibold text-ink/70 dark:text-dark-text/75">
                      {option.romanizedTitle}
                    </p>
                    <p className="mt-1 font-sans text-xs text-ink/55 dark:text-dark-text/58">
                      {getNitnemOptionDetail(option)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <button
                    type="button"
                    onClick={() => moveSelected(option.id, 'up')}
                    disabled={index === 0}
                    className="rounded-lg border border-sand/15 bg-parchment-low px-3 py-2 font-sans text-xs font-medium text-ink/70 transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-40 dark:border-dark-text/10 dark:bg-dark-surface dark:text-dark-text/70"
                    aria-label={`Move ${option.romanizedTitle} up`}
                  >
                    Move up
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSelected(option.id, 'down')}
                    disabled={index === selectedNitnemOptions.length - 1}
                    className="rounded-lg border border-sand/15 bg-parchment-low px-3 py-2 font-sans text-xs font-medium text-ink/70 transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-40 dark:border-dark-text/10 dark:bg-dark-surface dark:text-dark-text/70"
                    aria-label={`Move ${option.romanizedTitle} down`}
                  >
                    Move down
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleSelected(option.id)}
                    disabled={!canRemove}
                    className="rounded-lg border border-sand/15 bg-parchment-low px-3 py-2 font-sans text-xs font-medium text-ink/70 transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-40 dark:border-dark-text/10 dark:bg-dark-surface dark:text-dark-text/70"
                    aria-label={`Remove ${option.romanizedTitle} from Daily Nitnem`}
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(buildNitnemStudyPath(option))}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-3 py-2 font-sans text-xs font-semibold text-parchment transition-colors duration-300 dark:bg-parchment dark:text-dark-bg"
                  >
                    Begin
                    <IconArrowRight size={13} />
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </SettingsBlock>

      <SettingsBlock
        title="Available Banis"
        description="Add banis to the end of your ritual order. Length choices for supported banis stay inside the reader."
        headingId="nitnem-selection-title"
        testId="nitnem-selection"
      >
        <div className="space-y-4">
          {(['Morning', 'Evening', 'Night', 'Additional'] as const).map(group => (
            <div key={`manage-${group}`}>
              <p className="mb-2 font-sans text-[11px] uppercase tracking-[0.18em] text-ink/50 dark:text-dark-text/50">
                {group}
              </p>
              <div className="space-y-2">
                {availableNitnemOptions
                  .filter(option => option.group === group)
                  .map(option => {
                    const selected = selectedIds.includes(option.id)

                    return (
                      <div
                        key={`manage-${option.id}`}
                        className={`rounded-lg border px-3 py-3 transition-colors duration-300 ${
                          selected
                            ? 'border-gold/24 bg-[linear-gradient(180deg,rgba(250,241,222,0.9),rgba(246,235,214,0.82))] text-ink dark:border-gold/26 dark:bg-[linear-gradient(180deg,rgba(54,41,63,0.96),rgba(38,29,47,0.92))] dark:text-dark-text'
                            : 'border-sand/15 bg-parchment-card/72 text-ink dark:border-dark-text/10 dark:bg-dark-card/72 dark:text-dark-text'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p lang="pa-Guru" className="font-gurmukhi text-lg leading-relaxed">
                              {option.gurmukhiTitle}
                            </p>
                            <p className={`mt-1 font-sans text-xs font-semibold ${selected ? 'text-ink/75 dark:text-dark-text/75' : 'text-ink/70 dark:text-dark-text/75'}`}>
                              {option.romanizedTitle}
                            </p>
                            <p className={`mt-1 font-sans text-xs ${selected ? 'text-ink/60 dark:text-dark-text/60' : 'text-ink/55 dark:text-dark-text/55'}`}>
                              {getNitnemOptionDetail(option)}
                            </p>
                          </div>
                          {selected ? (
                            <span className="rounded-full bg-ink/6 px-2 py-1 font-sans text-[10px] uppercase tracking-[0.18em] text-ink dark:bg-white/10 dark:text-dark-text">
                              Selected
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggleSelected(option.id)}
                              className="rounded-full bg-gold/12 px-3 py-2 font-sans text-[11px] font-semibold text-gold transition-colors duration-300 hover:bg-gold/18 dark:text-gold-light"
                              aria-label={`Add ${option.romanizedTitle}`}
                            >
                              Add
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          ))}
        </div>

        {selectedNitnemOptions[0] ? (
          <button
            type="button"
            onClick={() => navigate(buildNitnemStudyPath(selectedNitnemOptions[0]))}
            className="mt-4 w-full rounded-lg bg-ink px-4 py-3 font-sans text-sm font-semibold text-parchment transition-colors duration-300 dark:bg-parchment dark:text-dark-bg"
          >
            Open first selected bani
          </button>
        ) : null}
      </SettingsBlock>

      <SettingsBlock
        title="Completion Tracking"
        description="Optional progress controls live here so Home can stay focused on starting the bani."
        headingId="nitnem-completion-title"
        testId="nitnem-completion"
      >
        <button
          type="button"
          onClick={() => setCompletionTrackingEnabled(!completionTrackingEnabled)}
          aria-pressed={completionTrackingEnabled}
          className={`w-full rounded-lg border px-4 py-3 text-left transition-colors duration-300 ${
            completionTrackingEnabled
              ? 'border-gold/24 bg-gold/10 text-ink dark:border-gold/24 dark:bg-gold/12 dark:text-dark-text'
              : 'border-sand/15 bg-parchment-card/72 text-ink/72 dark:border-dark-text/10 dark:bg-dark-card/72 dark:text-dark-text/72'
          }`}
          data-testid="nitnem-completion-toggle"
        >
          <span className="flex items-center justify-between gap-3">
            <span className="font-sans text-sm font-semibold">
              Completion tracking {completionTrackingEnabled ? 'On' : 'Off'}
            </span>
            <span className="rounded-full border border-current/15 px-2.5 py-1 font-sans text-[10px] uppercase tracking-[0.16em]">
              {completionTrackingEnabled ? 'Visible here' : 'Optional'}
            </span>
          </span>
        </button>

        {completionTrackingEnabled ? (
          <div className="mt-4 space-y-3" data-testid="nitnem-completion-panel">
            <div>
              <div className="h-px overflow-hidden bg-sand/18 dark:bg-dark-text/12">
                <div
                  className="h-full bg-[linear-gradient(90deg,rgba(158,111,41,0.9),rgba(232,196,104,0.7))]"
                  style={{ width: `${nitnemProgressPct}%` }}
                />
              </div>
              <p className="mt-2 font-sans text-[11px] uppercase tracking-[0.16em] text-ink/50 dark:text-dark-text/55">
                {nitnemDone} / {nitnemTotal} daily banis complete
              </p>
            </div>

            <div className="grid gap-2">
              {selectedNitnemOptions.map(option => {
                const done = isComplete(option.id)

                return (
                  <div
                    key={`complete-${option.id}`}
                    className="rounded-lg border border-sand/12 bg-parchment-card/70 px-3 py-3 dark:border-dark-text/10 dark:bg-white/5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p lang="pa-Guru" className="font-gurmukhi text-lg leading-relaxed text-ink dark:text-dark-text">
                          {option.gurmukhiTitle}
                        </p>
                        <p className="mt-1 font-sans text-xs font-semibold text-ink/70 dark:text-dark-text/75">
                          {option.romanizedTitle}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => done ? unmarkComplete(option.id) : markComplete(option.id)}
                        className={`shrink-0 rounded-full border px-3 py-2 font-sans text-[11px] font-semibold transition-colors duration-300 ${
                          done
                            ? 'border-gold/24 bg-gold/10 text-gold dark:text-gold-light'
                            : 'border-sand/16 bg-parchment-low text-ink/62 dark:border-dark-text/10 dark:bg-dark-surface dark:text-dark-text/68'
                        }`}
                      >
                        {done ? 'Complete' : 'Mark complete'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}
      </SettingsBlock>
    </div>
  )
}
