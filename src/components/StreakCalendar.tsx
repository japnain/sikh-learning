import StreakBadge from './StreakBadge'
import { getLastNDays } from '../utils/learnDates'

interface Props {
  streakCalendar: Record<string, boolean>
  practiceStreak: number
  longestStreak: number
}

function chunkWeeks(dayStamps: string[]) {
  const weeks: string[][] = []

  for (let index = 0; index < dayStamps.length; index += 7) {
    weeks.push(dayStamps.slice(index, index + 7))
  }

  return weeks
}

export default function StreakCalendar({
  streakCalendar,
  practiceStreak,
  longestStreak,
}: Props) {
  const recentDays = getLastNDays(91).reverse()
  const weeks = chunkWeeks(recentDays)
  const hasPractice = Object.values(streakCalendar).some(Boolean)

  return (
    <section className="section-shell-quiet p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Streak Calendar</p>
          <p className="mt-2 font-sans text-sm text-ink/65 dark:text-dark-text/65">
            Your last 13 weeks of Learn activity at a glance.
          </p>
        </div>
        <StreakBadge streak={practiceStreak} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="section-shell px-3 py-3">
          <p className="font-sans text-2xl text-ink dark:text-dark-text">{practiceStreak}</p>
          <p className="mt-1 font-sans text-[11px] uppercase tracking-[0.18em] text-ink/45 dark:text-dark-text/45">
            Current streak
          </p>
        </div>
        <div className="section-shell px-3 py-3">
          <p className="font-sans text-2xl text-ink dark:text-dark-text">{longestStreak}</p>
          <p className="mt-1 font-sans text-[11px] uppercase tracking-[0.18em] text-ink/45 dark:text-dark-text/45">
            Longest streak
          </p>
        </div>
      </div>

      {hasPractice ? (
        <div className="mt-4 overflow-x-auto">
          <div
            className="grid min-w-[16rem] gap-1.5"
            style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}
          >
            {weeks.map((week, weekIndex) => (
              <div
                key={`week-${weekIndex}`}
                className="grid gap-1.5"
                style={{ gridTemplateRows: 'repeat(7, minmax(0, 1fr))' }}
              >
                {week.map(dayStamp => (
                  <div
                    key={dayStamp}
                    title={dayStamp}
                    className={`h-4 w-4 justify-self-center rounded-md border border-transparent ${
                      streakCalendar[dayStamp]
                        ? 'bg-saffron/80 shadow-soft'
                        : 'bg-sand/20 dark:bg-dark-text/10'
                    }`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="section-shell px-4 py-4 mt-4">
          <p className="font-sans text-sm text-ink/60 dark:text-dark-text/60">
            Your practice days will light up here after the first Learn session.
          </p>
        </div>
      )}
    </section>
  )
}
