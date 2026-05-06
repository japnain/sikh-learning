export default function SectionHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string
  title: string
  body?: string
}) {
  return (
    <div className="learn-section-header mb-3">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-2 font-display text-[2rem] leading-none text-ink dark:text-dark-text">{title}</h2>
      {body ? (
        <p className="mt-2 font-sans text-sm leading-6 text-ink/74 dark:text-dark-text/76">{body}</p>
      ) : null}
    </div>
  )
}
