import type { ShabadDeepDive } from "../../../types"

export default function CitationLine({ shabad }: { shabad: ShabadDeepDive }) {
  return (
    <p className="learn-citation-line font-sans text-[11px] uppercase tracking-[0.16em] text-gold dark:text-gold-light">
      {shabad.citation.guru} · {shabad.citation.raag} · Ang {shabad.citation.ang}
    </p>
  )
}
