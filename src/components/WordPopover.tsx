import type { Word } from '../types'
import { getWordFamilyForWord } from '../data/wordFamilies'
import { useLanguageStore } from '../store/language'
import { useVocabStore } from '../store/vocab'
import { getScriptTextFontClass, getScriptTextLang, renderScriptText } from '../utils/readerDisplay'
import { useBanidbKosh } from '../hooks/useBanidbKosh'
import { useMahanKosh } from '../hooks/useMahanKosh'
import { buildMahanKoshUrl } from '../utils/wordLookup'
import { IconArrowRight, IconCheck } from './icons'

interface Props {
  word: Word
  onClose: () => void
  scripture?: string
  sourceId?: string
  ang?: number
  shabadId?: number
  verseId?: number
  line?: string
}

export default function WordPopover({
  word,
  onClose,
  scripture = '',
  sourceId = '',
  ang,
  shabadId,
  verseId,
  line,
}: Props) {
  const scriptMode = useLanguageStore(s => s.scriptMode)
  const meaningLanguage = useLanguageStore(s => s.meaningLanguage)
  const { vocab, addWord } = useVocabStore()
  const isSaved = vocab.some(v => v.word === word.gurmukhi)
  const wordFamily = getWordFamilyForWord(word.gurmukhi)
  const { entries, loading, error, normalizedWord } = useMahanKosh(word.gurmukhi)
  const {
    entries: banidbKoshEntries,
    loading: banidbKoshLoading,
    error: banidbKoshError,
  } = useBanidbKosh(word.gurmukhi)
  const visibleEntries = entries.slice(0, 3)
  const visibleBanidbKoshEntries = banidbKoshEntries.slice(0, 3)
  const fullLookupUrl = visibleEntries[0]?.sourceUrl ?? buildMahanKoshUrl(normalizedWord || word.gurmukhi)

  const handleSave = () => {
    if (isSaved) return
    addWord({
      kind: 'word',
      word: word.gurmukhi,
      transliteration: word.transliteration,
      meaning_en: word.meaning_en,
      meaning_hi: word.meaning_hi,
      meaning_pa: word.meaning_pa,
      scripture,
      sourceId,
      savedAt: new Date().toISOString(),
      context: {
        scripture,
        sourceId,
        ang,
        shabadId,
        verseId,
        line,
      },
    })
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/20 dark:bg-black/40 popover-overlay"
      onClick={onClose}
      style={{ paddingBottom: 'calc(var(--nav-stack-height, 0px) + 1rem + env(safe-area-inset-bottom))' }}
      data-ai-surface="word-popover"
      data-ai-state="ready"
    >
      <div
        className="ornate-top bg-parchment-card dark:bg-dark-card border border-sand/15 dark:border-gold/10 rounded-t-2xl w-full max-w-md mb-0 shadow-gold-strong animate-slide-up transition-colors duration-300 max-h-[80vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="overflow-y-auto px-6 pt-6">
          <p lang={getScriptTextLang(scriptMode)} className={`${getScriptTextFontClass(scriptMode)} text-3xl text-ink dark:text-dark-text mb-1`}>
            {renderScriptText(word.gurmukhi, scriptMode)}
          </p>
          {word.transliteration && <p className="font-sans text-ink/60 dark:text-dark-text/60 text-sm mb-1">{word.transliteration}</p>}
          {word.meaning_en
            ? <p className="font-sans text-ink dark:text-dark-text font-medium mb-1 leading-relaxed">{word.meaning_en}</p>
            : <p className="font-sans text-ink/40 dark:text-dark-text/40 text-sm italic mb-1">Meaning not available. You can still save this word.</p>
          }
          {meaningLanguage === 'hi' && word.meaning_hi && (
            <p className="font-sans text-ink/70 dark:text-dark-text/70 text-sm mb-4 leading-relaxed">{word.meaning_hi}</p>
          )}
          {meaningLanguage === 'pa' && word.meaning_pa && (
            <p lang={getScriptTextLang(scriptMode)} className={`${getScriptTextFontClass(scriptMode)} text-ink/70 dark:text-dark-text/70 text-sm mb-4 leading-relaxed`}>{renderScriptText(word.meaning_pa, scriptMode)}</p>
          )}

          {wordFamily ? (
            <section className="mt-5 rounded-[24px] border border-sand/15 dark:border-gold/10 bg-parchment-low/80 dark:bg-dark-surface/70 px-4 py-4">
              <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-gold dark:text-gold-light">
                Word Family
              </p>
              <p className="mt-2 font-sans text-sm text-ink dark:text-dark-text">
                This word is in the <span lang={getScriptTextLang(scriptMode)} className={getScriptTextFontClass(scriptMode)}>{renderScriptText(wordFamily.root, scriptMode)}</span> family.
              </p>
              <p className="mt-2 font-sans text-sm text-ink/60 dark:text-dark-text/60">
                Root meaning: {wordFamily.rootMeaning}
              </p>
            </section>
          ) : null}

          <section
            className="mt-5 rounded-[24px] border border-sand/15 dark:border-gold/10 bg-parchment-low/80 dark:bg-dark-surface/70 px-4 py-4"
            data-ai-surface="mahankosh-popover"
            data-ai-state={loading ? 'loading' : error ? 'degraded' : visibleEntries.length === 0 && normalizedWord ? 'empty' : 'ready'}
            data-ai-error={error ?? undefined}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-gold dark:text-gold-light">
                  Mahankosh
                </p>
                <p className="font-sans text-sm text-ink/55 dark:text-dark-text/55 mt-1">
                  Classical dictionary context for this word
                </p>
              </div>
              {normalizedWord && (
                <a
                  href={fullLookupUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 inline-flex min-h-[36px] items-center gap-1 rounded-full border border-sand/15 dark:border-gold/10 px-3 text-xs font-sans font-medium text-ink/70 dark:text-dark-text/70 transition-colors duration-300 hover:text-saffron dark:hover:text-saffron-light"
                  data-ai-action="open-full-mahankosh"
                >
                  Full entry
                  <IconArrowRight size={14} />
                </a>
              )}
            </div>

            {loading && (
              <p className="font-sans text-sm text-ink/55 dark:text-dark-text/55">
                Loading Mahankosh...
              </p>
            )}

            {!loading && error && (
              <p className="font-sans text-sm text-ink/55 dark:text-dark-text/55">
                Mahankosh is taking longer than usual. You can keep reading and return to this word again.
              </p>
            )}

            {!loading && !error && visibleEntries.length === 0 && normalizedWord && (
              <p className="font-sans text-sm text-ink/55 dark:text-dark-text/55">
                No Mahankosh entry found for this form yet.
              </p>
            )}

            {!loading && !error && visibleEntries.length > 0 && (
              <div className="space-y-3">
                {visibleEntries.map(entry => (
                  <article key={entry.id} className="rounded-[20px] border border-sand/10 dark:border-gold/10 bg-white/55 dark:bg-dark-card/55 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <p lang={getScriptTextLang(scriptMode)} className={`${getScriptTextFontClass(scriptMode)} text-lg text-ink dark:text-dark-text`}>
                        {renderScriptText(entry.word, scriptMode)}
                      </p>
                      {entry.exactMatch && (
                        <span className="rounded-full bg-saffron/12 px-2 py-1 font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-saffron dark:text-saffron-light">
                          Exact
                        </span>
                      )}
                    </div>
                    {(entry.roman || entry.hindi) && (
                      <div className="mb-2 flex flex-wrap gap-2">
                        {entry.roman && (
                          <span className="rounded-full bg-parchment-card/80 dark:bg-dark-surface/80 px-2.5 py-1 font-sans text-[11px] text-ink/58 dark:text-dark-text/58">
                            {entry.roman}
                          </span>
                        )}
                        {entry.hindi && (
                          <span className="rounded-full bg-parchment-card/80 dark:bg-dark-surface/80 px-2.5 py-1 font-sans text-[11px] text-ink/58 dark:text-dark-text/58">
                            {entry.hindi}
                          </span>
                        )}
                      </div>
                    )}
                    {entry.transliteration && (
                      <p className="font-sans text-xs italic text-ink/55 dark:text-dark-text/55 mb-2 leading-relaxed">
                        {entry.transliteration}
                      </p>
                    )}
                    {entry.description && (
                      <p lang={getScriptTextLang(scriptMode)} className={`${getScriptTextFontClass(scriptMode)} text-sm text-ink dark:text-dark-text leading-relaxed`}>
                        {renderScriptText(entry.description, scriptMode)}
                      </p>
                    )}
                    {entry.description_hi && (
                      <p className="font-sans text-xs text-ink/60 dark:text-dark-text/60 mt-2 leading-relaxed">
                        {entry.description_hi}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section
            className="mt-5 rounded-[24px] border border-sand/15 dark:border-gold/10 bg-parchment-low/80 dark:bg-dark-surface/70 px-4 py-4"
            data-ai-surface="banidb-kosh-popover"
            data-ai-state={banidbKoshLoading ? 'loading' : banidbKoshError ? 'degraded' : visibleBanidbKoshEntries.length === 0 ? 'empty' : 'ready'}
            data-ai-error={banidbKoshError ?? undefined}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-gold dark:text-gold-light">
                  BaniDB Kosh
                </p>
                <p className="font-sans text-sm text-ink/55 dark:text-dark-text/55 mt-1">
                  Secondary word reference layered into the same lookup flow
                </p>
              </div>
            </div>

            {banidbKoshLoading && (
              <p className="font-sans text-sm text-ink/55 dark:text-dark-text/55">
                Loading BaniDB Kosh...
              </p>
            )}

            {!banidbKoshLoading && banidbKoshError && (
              <p className="font-sans text-sm text-ink/55 dark:text-dark-text/55">
                BaniDB Kosh is unavailable right now. Mahankosh stays available above.
              </p>
            )}

            {!banidbKoshLoading && !banidbKoshError && visibleBanidbKoshEntries.length === 0 && (
              <p className="font-sans text-sm text-ink/55 dark:text-dark-text/55">
                No BaniDB Kosh entry found for this word yet.
              </p>
            )}

            {!banidbKoshLoading && !banidbKoshError && visibleBanidbKoshEntries.length > 0 && (
              <div className="space-y-3">
                {visibleBanidbKoshEntries.map(entry => (
                  <article key={entry.id} className="rounded-[20px] border border-sand/10 dark:border-gold/10 bg-white/55 dark:bg-dark-card/55 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <p lang={getScriptTextLang(scriptMode)} className={`${getScriptTextFontClass(scriptMode)} text-lg text-ink dark:text-dark-text`}>
                        {renderScriptText(entry.wordUni || entry.word, scriptMode)}
                      </p>
                    </div>
                    <p lang={getScriptTextLang(scriptMode)} className={`${getScriptTextFontClass(scriptMode)} text-sm text-ink dark:text-dark-text leading-relaxed`}>
                      {renderScriptText(entry.definitionUni || entry.definition, scriptMode)}
                    </p>
                    {entry.definition && entry.definitionUni !== entry.definition && (
                      <p className="font-sans text-xs text-ink/60 dark:text-dark-text/60 mt-2 leading-relaxed">
                        {entry.definition}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="flex gap-2 mt-4 border-t border-sand/10 dark:border-gold/10 px-6 py-4 bg-parchment-card/95 dark:bg-dark-card/95">
          <button
            onClick={handleSave}
            className={`flex-1 py-3 rounded-full font-sans font-semibold text-sm min-h-[44px] active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 ${
              isSaved
                ? 'bg-gold/20 text-gold dark:text-gold-light'
                : 'bg-gradient-to-r from-saffron to-saffron-light text-white'
            }`}
            data-ai-action="save-word"
          >
            {isSaved ? <><IconCheck size={16} /> Saved</> : 'Save Word'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-full bg-parchment-low dark:bg-dark-surface text-ink/60 dark:text-dark-text/60 font-sans font-semibold text-sm min-h-[44px] active:scale-95 transition-all duration-300"
            data-ai-action="close-word-popover"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
