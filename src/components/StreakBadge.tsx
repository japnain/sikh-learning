interface Props { streak: number }

export default function StreakBadge({ streak }: Props) {
  return (
    <div className="flex items-center gap-1.5 bg-parchment-low rounded-full px-3 py-1.5">
      <span className="text-base">🔥</span>
      <span className="font-sans font-semibold text-sm text-saffron">
        {streak} day{streak !== 1 ? 's' : ''}
      </span>
    </div>
  )
}
