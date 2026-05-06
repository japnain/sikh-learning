export default function InventoryMetric({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="section-shell-quiet learn-metric-card min-w-0 overflow-hidden rounded-[24px] px-4 py-4">
      <p className="break-words font-sans text-[11px] uppercase tracking-[0.12em] text-ink/68 dark:text-dark-text/78">
        {label}
      </p>
      <p className="mt-2 font-display text-[1.75rem] leading-none text-ink dark:text-dark-text sm:text-[2rem]">{value}</p>
    </div>
  )
}
