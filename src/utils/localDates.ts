export function toLocalDayStamp(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseLocalDayStamp(dayStamp: string): Date {
  const [year, month, day] = dayStamp.split('-').map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

export function dayDiffLocal(startStamp: string, endStamp: string): number {
  const start = parseLocalDayStamp(startStamp)
  const end = parseLocalDayStamp(endStamp)
  return Math.round((end.getTime() - start.getTime()) / 86400000)
}

export function getLastNDays(dayCount: number, endDate = new Date()): string[] {
  const days: string[] = []
  const cursor = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())

  for (let index = dayCount - 1; index >= 0; index -= 1) {
    const nextDay = new Date(cursor)
    nextDay.setDate(cursor.getDate() - index)
    days.push(toLocalDayStamp(nextDay))
  }

  return days
}
