import type { ShabadDeepDive } from "../../../types"
import type { LearnResolvedExcerpt } from "../../../utils/learnExperience"
import CitationLine from "./CitationLine"
import { useLanguageStore } from "../../../store/language"
import { getScriptTextFontClass, getScriptTextLang, renderScriptText } from "../../../utils/readerDisplay"

export default function ExcerptBlock({
  excerpt,
  shabad,
}: {
  excerpt: LearnResolvedExcerpt
  shabad: ShabadDeepDive
}) {
  const scriptMode = useLanguageStore(state => state.scriptMode)

  return (
    <div className="section-shell-quiet learn-detail-excerpt-block p-4">
      <CitationLine shabad={shabad} />
      <div className="mt-3 space-y-3">
        {excerpt.lines.map(line => (
          <div key={line.verseId} className="reader-divider pb-3 last:pb-0">
            <p lang={getScriptTextLang(scriptMode)} className={`${getScriptTextFontClass(scriptMode)} text-2xl leading-10 text-ink dark:text-dark-text`}>
              {renderScriptText(line.gurmukhi, scriptMode)}
            </p>
            <p className="mt-2 font-sans text-xs leading-6 text-ink/55 dark:text-dark-text/55">
              {line.transliteration}
            </p>
            <p className="mt-2 font-sans text-sm leading-6 text-ink dark:text-dark-text">{line.translation}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="section-shell learn-detail-info-card px-4 py-4">
          <p className="eyebrow">Deeper Meaning</p>
          <p className="mt-2 font-sans text-sm leading-6 text-ink dark:text-dark-text">{excerpt.shortMeaning}</p>
        </div>
        <div className="section-shell learn-detail-info-card px-4 py-4">
          <p className="eyebrow">Live This</p>
          <p className="mt-2 font-sans text-sm leading-6 text-ink dark:text-dark-text">{excerpt.lifeApplication}</p>
        </div>
      </div>
    </div>
  )
}
