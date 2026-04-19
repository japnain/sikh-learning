import { IconStreak } from './icons'

interface Props { streak: number }

export default function StreakBadge({ streak }: Props) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-sand/15 bg-parchment-card/88 px-3 py-1.5 transition-colors duration-300 shadow-soft dark:border-dark-text/10 dark:bg-dark-surface">
      <IconStreak size={18} className="text-gold dark:text-gold-light" />
      <span className="font-sans font-semibold text-sm text-gold dark:text-gold-light">
        {streak} day{streak !== 1 ? 's' : ''}
      </span>
    </div>
  )
}
