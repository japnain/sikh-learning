import type { Word } from '../types'
import { getWordFamilyForWord } from '../data/wordFamilies'
import { useLanguageStore } from '../store/language'
import { useVocabStore } from '../store/vocab'
import { getScriptTextFontClass, getScriptTextLang, renderScriptText } from '../utils/readerDisplay'
import { useBanidbKosh } from '../hooks/useBanidbKosh'
import { useMahanKosh } from '../hooks/useMahanKosh'
import { buildMahanKoshUrl } from '../utils/wordLookup'
import { IconArrowRight, IconCheck, IconClose } from './icons'
import ModalSheet from './ModalSheet'

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
    <ModalSheet
      open
      onClose={onClose}
      title={`Word details for ${word.gurmukhi}`}
      description="Meaning, dictionary context, and an option to save this word for review."
      className="ornate-top max-h-[80vh] rounded-t-lg flex flex-col animate-slide-up"
    >
      <div data-ai-surface="word-popover" data-ai-state="ready" className="contents">
        <div className="relative overflow-y-auto px-6 pt-6">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close word details"
            className="interactive-focus absolute right-4 top-4 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-parchment-low text-ink/68 dark:bg-dark-surface dark:text-dark-text/65"
          >
            <IconClose size={18} />
          </button>
          <p lang={getScriptTextLang(scriptMode)} className={`${getScriptTextFontClass(scriptMode)} text-3xl text-ink dark:text-dark-text mb-1`}>
            {renderScriptText(word.gurmukhi, scriptMode)}
          </p>
          {word.transliteration && <p className="font-sans text-ink/68 dark:text-dark-text/64 text-sm mb-1">{word.transliteration}</p>}
          {word.meaning_en
            ? <p className="font-sans text-ink dark:text-dark-text font-medium mb-1 leading-relaxed">{word.meaning_en}</p>
            : <p className="font-sans text-ink/68 dark:text-dark-text/64 text-sm italic mb-1">Meaning not available. You can still save this word.</p>
          }
          {meaningLanguage === 'hi' && word.meaning_hi && (
            <p className="font-sans text-ink/70 dark:text-dark-text/70 text-sm mb-4 leading-relaxed">{word.meaning_hi}</p>
          )}
          {meaningLanguage === 'pa' && word.meaning_pa && (
            <p lang={getScriptTextLang(scriptMode)} className={`${getScriptTextFontClass(scriptMode)} text-ink/70 dark:text-dark-text/70 text-sm mb-4 leading-relaxed`}>{renderScriptText(word.meaning_pa, scriptMode)}</p>
          )}

          {wordFamily ? (
            <section className="mt-5 rounded-lg border border-sand/15 dark:border-gold/10 bg-parchment-low/80 dark:bg-dark-surface/70 px-4 py-4">
              <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-gold-dark dark:text-gold-light">
                Word Family
              </p>
              <p className="mt-2 font-sans text-sm text-ink dark:text-dark-text">
                This word is in the <span lang={getScriptTextLang(scriptMode)} className={getScriptTextFontClass(scriptMode)}>{renderScriptText(wordFamily.root, scriptMode)}</span> family.
              </p>
              <p className="mt-2 font-sans text-sm text-ink/68 dark:text-dark-text/64">
                Root meaning: {wordFamily.rootMeaning}
              </p>
            </section>
          ) : null}

          <section
            className="mt-5 rounded-lg border border-sand/15 dark:border-gold/10 bg-parchment-low/80 dark:bg-dark-surface/70 px-4 py-4"
            data-ai-surface="mahankosh-popover"
            data-ai-state={loading ? 'loading' : error ? 'degraded' : visibleEntries.length === 0 && normalizedWord ? 'empty' : 'ready'}
            data-ai-error={error ?? undefined}
          >
            <div className="mb-3 flex flex-col items-start gap-3 min-[360px]:flex-row min-[360px]:items-center min-[360px]:justify-between">
              <div>
                <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-gold-dark dark:text-gold-light">
                  Mahankosh
                </p>
                <p className="font-sans text-sm text-ink/68 dark:text-dark-text/64 mt-1">
                  Classical dictionary context for this word
                </p>
              </div>
              {normalizedWord && (
                <a
                  href={fullLookupUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-sand/15 dark:border-gold/10 px-3 text-xs font-sans font-medium text-ink/70 dark:text-dark-text/70 transition-colors duration-300 hover:text-saffron dark:hover:text-saffron-light"
                  data-ai-action="open-full-mahankosh"
                >
                  Full entry
                  <IconArrowRight size={14} />
                </a>
              )}
            </div>

            {loading && (
              <p className="font-sans text-sm text-ink/68 dark:text-dark-text/64">
                Loading Mahankosh...
              </p>
            )}

            {!loading && error && (
              <p className="font-sans text-sm text-ink/68 dark:text-dark-text/64">
                Mahankosh is taking longer than usual. You can keep reading and return to this word again.
              </p>
            )}

            {!loading && !error && visibleEntries.length === 0 && normalizedWord && (
              <p className="font-sans text-sm text-ink/68 dark:text-dark-text/64">
                No Mahankosh entry found for this form yet.
              </p>
            )}

            {!loading && !error && visibleEntries.length > 0 && (
              <div className="space-y-3">
                {visibleEntries.map(entry => (
                  <article key={entry.id} className="rounded-lg border border-sand/10 dark:border-gold/10 bg-white/55 dark:bg-dark-card/55 px-4 py-3">
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
                          <span className="rounded-full bg-parchment-card/80 dark:bg-dark-surface/80 px-2.5 py-1 font-sans text-[11px] text-ink/68 dark:text-dark-text/64">
                            {entry.roman}
                          </span>
                        )}
                        {entry.hindi && (
                          <span className="rounded-full bg-parchment-card/80 dark:bg-dark-surface/80 px-2.5 py-1 font-sans text-[11px] text-ink/68 dark:text-dark-text/64">
                            {entry.hindi}
                          </span>
                        )}
                      </div>
                    )}
                    {entry.transliteration && (
                      <p className="font-sans text-xs italic text-ink/68 dark:text-dark-text/64 mb-2 leading-relaxed">
                        {entry.transliteration}
                      </p>
                    )}
                    {entry.description && (
                      <p lang={getScriptTextLang(scriptMode)} className={`${getScriptTextFontClass(scriptMode)} text-sm text-ink dark:text-dark-text leading-relaxed`}>
                        {renderScriptText(entry.description, scriptMode)}
                      </p>
                    )}
                    {entry.description_hi && (
                      <p className="font-sans text-xs text-ink/68 dark:text-dark-text/64 mt-2 leading-relaxed">
                        {entry.description_hi}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section
            className="mt-5 rounded-lg border border-sand/15 dark:border-gold/10 bg-parchment-low/80 dark:bg-dark-surface/70 px-4 py-4"
            data-ai-surface="banidb-kosh-popover"
            data-ai-state={banidbKoshLoading ? 'loading' : banidbKoshError ? 'degraded' : visibleBanidbKoshEntries.length === 0 ? 'empty' : 'ready'}
            data-ai-error={banidbKoshError ?? undefined}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-gold-dark dark:text-gold-light">
                  BaniDB Kosh
                </p>
                <p className="font-sans text-sm text-ink/68 dark:text-dark-text/64 mt-1">
                  Secondary word reference layered into the same lookup flow
                </p>
              </div>
            </div>

            {banidbKoshLoading && (
              <p className="font-sans text-sm text-ink/68 dark:text-dark-text/64">
                Loading BaniDB Kosh...
              </p>
            )}

            {!banidbKoshLoading && banidbKoshError && (
              <p className="font-sans text-sm text-ink/68 dark:text-dark-text/64">
                BaniDB Kosh is unavailable right now. Mahankosh stays available above.
              </p>
            )}

            {!banidbKoshLoading && !banidbKoshError && visibleBanidbKoshEntries.length === 0 && (
              <p className="font-sans text-sm text-ink/68 dark:text-dark-text/64">
                No BaniDB Kosh entry found for this word yet.
              </p>
            )}

            {!banidbKoshLoading && !banidbKoshError && visibleBanidbKoshEntries.length > 0 && (
              <div className="space-y-3">
                {visibleBanidbKoshEntries.map(entry => (
                  <article key={entry.id} className="rounded-lg border border-sand/10 dark:border-gold/10 bg-white/55 dark:bg-dark-card/55 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <p lang={getScriptTextLang(scriptMode)} className={`${getScriptTextFontClass(scriptMode)} text-lg text-ink dark:text-dark-text`}>
                        {renderScriptText(entry.wordUni || entry.word, scriptMode)}
                      </p>
                    </div>
                    <p lang={getScriptTextLang(scriptMode)} className={`${getScriptTextFontClass(scriptMode)} text-sm text-ink dark:text-dark-text leading-relaxed`}>
                      {renderScriptText(entry.definitionUni || entry.definition, scriptMode)}
                    </p>
                    {entry.definition && entry.definitionUni !== entry.definition && (
                      <p className="font-sans text-xs text-ink/68 dark:text-dark-text/64 mt-2 leading-relaxed">
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
            className={`flex-1 py-3 rounded-lg font-sans font-semibold text-sm min-h-[44px] active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 ${
              isSaved
                ? 'bg-gold/20 text-gold-dark dark:text-gold-light'
                : 'bg-saffron text-white'
            }`}
            data-ai-action="save-word"
          >
            {isSaved ? <><IconCheck size={16} /> Saved</> : 'Save Word'}
          </button>
        </div>
      </div>
    </ModalSheet>
  )
}
