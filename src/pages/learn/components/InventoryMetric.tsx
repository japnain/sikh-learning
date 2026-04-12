export default function InventoryMetric({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="section-shell-quiet rounded-[24px] px-4 py-4">
      <p className="font-sans text-[11px] uppercase tracking-[0.16em] text-ink/60 dark:text-dark-text/60">
        {label}
      </p>
      <p className="mt-2 font-display text-[2rem] leading-none text-ink dark:text-dark-text">{value}</p>
    </div>
  )
}
