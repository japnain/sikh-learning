interface StreakState {
  streak: number
  lastStudied: string | null
}

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function daysDiff(dateA: string, dateB: string): number {
  const a = parseLocalDate(dateA).getTime()
  const b = parseLocalDate(dateB).getTime()
  return Math.round(Math.abs(b - a) / (1000 * 60 * 60 * 24))
}

export function isStreakAlive(lastStudied: string, today: string): boolean {
  return daysDiff(lastStudied, today) <= 1
}

export function getUpdatedStreak(state: StreakState, today: string): StreakState {
  if (state.lastStudied === today) return state
  if (!state.lastStudied || !isStreakAlive(state.lastStudied, today)) {
    return { streak: 1, lastStudied: today }
  }
  return { streak: state.streak + 1, lastStudied: today }
}
