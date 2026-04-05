import { useMemo, useState } from 'react'
import type { ScriptureEntry, ScriptureLine, Word } from '../types'
import { useLanguageStore } from '../store/language'
import { gurmukhiToHindi } from '../utils/gurmukhiToHindi'
import { getLineEnglishText } from '../utils/translations'
import WordPopover from './WordPopover'

interface Props {
  entry: ScriptureEntry
  wordData?: Word[] | null
}

function fallbackLine(entry: ScriptureEntry): ScriptureLine {
  return {
    verseId: entry.verseIds?.[0] ?? 0,
    shabadId: entry.shabadId ?? 0,
    ang: entry.ang,
    gurmukhi: entry.gurmukhi,
    transliteration: entry.transliteration,
    translation_en: entry.translation_en,
    translations_en: { bdb: entry.translation_en },
    translation_hi: entry.translation_hi,
    translation_pa: entry.translation_pa,
  }
}

export default function StudyCard({ entry, wordData }: Props) {
  const [activeWord, setActiveWord] = useState<Word | null>(null)
  const hindiMode = useLanguageStore(s => s.hindiMode)
  const fontSize = useLanguageStore(s => s.fontSize)
  const englishSource = useLanguageStore(s => s.englishSource)

  const lines = useMemo(
    () => (entry.lines && entry.lines.length > 0 ? entry.lines : [fallbackLine(entry)]),
    [entry]
  )

  const cleanGurmukhi = (s: string) =>
    s.replace(/[;,।॥.\s]/g, '').replace(/[\u200B-\u200D\uFEFF]/g, '')

  const handleWordTap = (originalGurmukhi: string) => {
    const wordsToSearch = wordData ?? entry.words ?? []
    const cleaned = cleanGurmukhi(originalGurmukhi)
    if (!cleaned) return

    if (wordsToSearch.length > 0) {
      const exact = wordsToSearch.find(w => cleanGurmukhi(w.gurmukhi) === cleaned)
      if (exact) { setActiveWord(exact); return }
      const partial = wordsToSearch.find(w =>
        cleaned.includes(cleanGurmukhi(w.gurmukhi)) || cleanGurmukhi(w.gurmukhi).includes(cleaned)
      )
      if (partial) { setActiveWord(partial); return }
    }

    setActiveWord({
      gurmukhi: originalGurmukhi,
      transliteration: '',
      meaning_en: '',
      meaning_hi: '',
      meaning_pa: '',
    })
  }

  return (
    <>
      <section
        data-testid="study-card"
        className="animate-scale-in ornate-top bg-parchment-card dark:bg-dark-card rounded-3xl p-5 shadow-card dark:shadow-gold border border-sand/15 dark:border-gold/10"
      >
        <div className="mb-4 pb-4 border-b border-sand/15 dark:border-dark-text/10">
          <p className="font-sans text-[11px] text-gold dark:text-gold-light uppercase tracking-[0.18em]">
            {entry.scripture} · {entry.scripture === 'SGGS' || entry.scripture === 'DG' ? 'Ang' : 'Page'} {entry.ang}
          </p>
          {(entry.raag || entry.writer || entry.sourceName) && (
            <p className="font-sans text-xs text-ink/45 dark:text-dark-text/45 mt-1">
              {[entry.raag, entry.writer, entry.sourceName].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        <div className="space-y-4">
          {lines.map((line, index) => {
            const altTranslation = hindiMode ? line.translation_hi : line.translation_pa
            const englishText = getLineEnglishText(line, englishSource)

            return (
              <article
                key={`${line.verseId}-${index}`}
                data-testid="study-line"
                className="rounded-2xl bg-parchment/55 dark:bg-dark-surface/70 border border-sand/10 dark:border-dark-text/10 px-4 py-4"
              >
                <div className="flex flex-wrap gap-x-2 gap-y-3">
                  {line.gurmukhi.split(' ').filter(Boolean).map((word, wordIndex) => (
                    <button
                      key={`${line.verseId}-${wordIndex}`}
                      type="button"
                      lang={hindiMode ? 'hi' : 'pa-Guru'}
                      className={`${hindiMode ? 'font-sans' : 'font-gurmukhi'} bg-transparent border-0 p-0 text-left text-ink dark:text-dark-text leading-[1.9] active:text-gold dark:active:text-gold-light hover:text-gold dark:hover:text-gold-light transition-colors duration-300`}
                      style={{ fontSize: `${fontSize}px` }}
                      onClick={() => handleWordTap(word)}
                    >
                      {hindiMode ? gurmukhiToHindi(word) : word}
                    </button>
                  ))}
                </div>

                {line.transliteration && (
                  <p className="font-sans text-sm italic text-ink/60 dark:text-dark-text/60 mt-3 leading-relaxed">
                    {line.transliteration}
                  </p>
                )}

                {englishText && (
                  <p className="font-sans text-sm text-ink/85 dark:text-dark-text/85 mt-3 leading-relaxed">
                    {englishText}
                  </p>
                )}

                {altTranslation && (
                  hindiMode ? (
                    <p className="font-sans text-sm text-ink/65 dark:text-dark-text/65 mt-2 leading-relaxed">
                      {altTranslation}
                    </p>
                  ) : (
                    <p lang="pa-Guru" className="font-gurmukhi text-sm text-ink/65 dark:text-dark-text/65 mt-2 leading-relaxed">
                      {altTranslation}
                    </p>
                  )
                )}
              </article>
            )
          })}
        </div>

        <p className="font-sans text-ink/30 dark:text-dark-text/30 text-xs mt-4">
          Tap any Gurbani word for meaning
        </p>
      </section>

      {activeWord && (
        <WordPopover
          word={activeWord}
          onClose={() => setActiveWord(null)}
          scripture={entry.scripture}
          sourceId={entry.source ?? entry.id.split('-')[0]}
        />
      )}
    </>
  )
}
