interface Props {
  shabadId: number
}

export default function AudioPlayer({ shabadId }: Props) {
  return (
    <div
      className="rounded-2xl bg-parchment/55 dark:bg-dark-surface/70 border border-sand/10 dark:border-dark-text/10 px-3 py-3"
      data-shabad-id={shabadId}
    >
      <p className="font-sans text-[11px] text-gold dark:text-gold-light uppercase tracking-[0.18em]">
        Recitation
      </p>
      <p className="font-sans text-sm text-ink dark:text-dark-text mt-1">
        Recitation coming soon
      </p>
      <p className="font-sans text-xs text-ink/55 dark:text-dark-text/55 mt-1">
        This shabad reader is ready for audio once we add a public or self-hosted recitation source.
      </p>
    </div>
  )
}
