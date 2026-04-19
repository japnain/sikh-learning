function InlineRailChip({
  label,
  active,
  onClick,
  testId,
}: {
  label: string
  active: boolean
  onClick: () => void
  testId?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2.5 font-sans text-xs font-semibold uppercase tracking-[0.18em] transition-all duration-300 touch-manipulation ${
        active
          ? "border-gold/30 bg-white/92 text-saffron shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_10px_22px_rgba(224,154,70,0.12)] dark:border-gold/20 dark:bg-dark-surface/92 dark:text-gold-light dark:shadow-[inset_0_1px_0_rgba(255,214,153,0.12),0_12px_26px_rgba(0,0,0,0.25)]"
          : "border-sand/15 bg-white/72 text-ink/72 hover:text-ink/86 dark:border-dark-text/12 dark:bg-dark-card/82 dark:text-dark-text/74 dark:hover:text-dark-text/88"
      }`}
      aria-pressed={active}
    >
      {label}
    </button>
  )
}

export default function InlineRail({
  chips,
  activeTargetId,
  onSelect,
  testId,
  ariaLabel,
  className = "mt-5 flex gap-2 overflow-x-auto pb-1",
}: {
  chips: Array<{ id: string; label: string; targetId?: string }>
  activeTargetId?: string | null
  onSelect: (chipId: string) => void
  testId: string
  ariaLabel: string
  className?: string
}) {
  return (
    <nav
      aria-label={ariaLabel}
      className={className}
      data-testid={testId}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {chips.map(chip => (
        <InlineRailChip
          key={chip.id}
          label={chip.label}
          active={activeTargetId === (chip.targetId ?? chip.id)}
          onClick={() => onSelect(chip.id)}
          testId={chip.id}
        />
      ))}
    </nav>
  )
}
