interface Props { streak: number }

export default function StreakBadge({ streak }: Props) {
  return (
    <div
      className="flex items-center gap-1.5 bg-coal rounded-full px-3 py-1.5"
      style={{ boxShadow: '0 0 8px #C9A84C55' }}
    >
      <span className="text-base">🔥</span>
      <span className="text-[#C9A84C] font-semibold text-sm font-pixel">
        {streak} day{streak !== 1 ? 's' : ''}
      </span>
    </div>
  )
}
