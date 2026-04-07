import type { Milestone } from '../types'

interface Props {
  milestone: Milestone
  onDismiss: () => void
}

export default function MilestoneCelebration({ milestone, onDismiss }: Props) {
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-ink/55 px-4 pb-6 pt-10 dark:bg-black/70">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${milestone.title} earned`}
        className="hero-surface w-full max-w-md animate-slide-up rounded-[32px] px-6 py-6 shadow-gold-strong"
      >
        <p className="eyebrow">Milestone Earned</p>
        {milestone.gurmukhi ? (
          <p lang="pa-Guru" className="mt-4 font-gurmukhi text-4xl leading-tight text-ink dark:text-dark-text">
            {milestone.gurmukhi}
          </p>
        ) : null}
        <h2 className="mt-4 font-display text-3xl leading-none text-ink dark:text-dark-text">
          {milestone.title}
        </h2>
        <p className="mt-3 font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/65">
          {milestone.description}
        </p>
        <div className="section-shell-quiet mt-5 px-4 py-4">
          <p className="font-sans text-sm text-ink dark:text-dark-text">
            {milestone.earnedMessage}
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-5 w-full rounded-full bg-gradient-to-r from-saffron to-saffron-light px-5 py-3 font-sans text-sm font-semibold text-white"
        >
          Waheguru
        </button>
      </div>
    </div>
  )
}
