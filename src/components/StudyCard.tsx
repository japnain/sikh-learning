import { useMemo, useState } from 'react'
import type { ScriptureEntry, ScriptureLine, Word } from '../types'
import { useLanguageStore } from '../store/language'
import { formatGurbaniText, formatGurbaniWord, getLineMeaningText } from '../utils/readerDisplay'
import WordPopover from './WordPopover'
import AudioPlayer from './AudioPlayer'
import { IconBookmark, IconBookmarkFilled, IconShare } from './icons'

interface Props {
  entry: ScriptureEntry
  wordData?: Word[] | null
  onSavePhrase?: (line: ScriptureLine, entry: ScriptureEntry) => void
  onCopyLine?: (line: ScriptureLine, entry: ScriptureEntry) => void
  onShareLine?: (line: ScriptureLine, entry: ScriptureEntry) => void
  onBookmarkLine?: (line: ScriptureLine, entry: ScriptureEntry) => void
  isLineBookmarked?: (line: ScriptureLine, entry: ScriptureEntry) => boolean
  isPhraseSaved?: (line: ScriptureLine, entry: ScriptureEntry) => boolean
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

export default function StudyCard({
  entry,
  wordData,
  onSavePhrase,
  onCopyLine,
  onShareLine,
  onBookmarkLine,
  isLineBookmarked,
  isPhraseSaved,
}: Props) {
  const [activeWord, setActiveWord] = useState<Word | null>(null)
  const [activeLine, setActiveLine] = useState<ScriptureLine | null>(null)
  const scriptMode = useLanguageStore(s => s.scriptMode)
  const showTransliteration = useLanguageStore(s => s.showTransliteration)
  const meaningLanguage = useLanguageStore(s => s.meaningLanguage)
  const fontSize = useLanguageStore(s => s.fontSize)
  const englishSource = useLanguageStore(s => s.englishSource)
  const larivaar = useLanguageStore(s => s.larivaar)
  const showVishraam = useLanguageStore(s => s.showVishraam)
  const lineSpacing = useLanguageStore(s => s.lineSpacing)
  const textAlign = useLanguageStore(s => s.textAlign)

  const lines = useMemo(
    () => (entry.lines && entry.lines.length > 0 ? entry.lines : [fallbackLine(entry)]),
    [entry]
  )
  const introLines = lines.filter(line => line.isHeader)
  const mainLines = lines.filter(line => !line.isHeader)
  const visibleMainLines = mainLines.length > 0 ? mainLines : lines

  const cleanGurmukhi = (s: string) =>
    s.replace(/[;,।॥.\s]/g, '').replace(/[\u200B-\u200D\uFEFF]/g, '')

  const scriptAlignmentClass = textAlign === 'center' ? 'text-center items-center' : 'text-left items-start'
  const meaningAlignmentClass = textAlign === 'center' ? 'text-center' : 'text-left'
  const lineSpacingClass = lineSpacing === 'relaxed' ? 'leading-[2.15]' : 'leading-[1.7]'

  const handleWordTap = (originalGurmukhi: string, line: ScriptureLine) => {
    const wordsToSearch = wordData ?? entry.words ?? []
    const cleaned = cleanGurmukhi(originalGurmukhi)
    if (!cleaned) return

    if (wordsToSearch.length > 0) {
      const exact = wordsToSearch.find(w => cleanGurmukhi(w.gurmukhi) === cleaned)
      if (exact) { setActiveWord(exact); setActiveLine(line); return }
      const partial = wordsToSearch.find(w =>
        cleaned.includes(cleanGurmukhi(w.gurmukhi)) || cleanGurmukhi(w.gurmukhi).includes(cleaned)
      )
      if (partial) { setActiveWord(partial); setActiveLine(line); return }
    }

    setActiveWord({
      gurmukhi: originalGurmukhi,
      transliteration: '',
      meaning_en: '',
      meaning_hi: '',
      meaning_pa: '',
    })
    setActiveLine(line)
  }

  return (
    <>
      <section
        data-testid="study-card"
        className="animate-scale-in ornate-top section-shell rounded-[30px] px-5 py-6"
      >
        <div className="mb-5">
          <p className="font-sans text-[11px] text-gold dark:text-gold-light uppercase tracking-[0.2em]">
            {entry.scripture} · {entry.scripture === 'SGGS' || entry.scripture === 'DG' ? 'Ang' : 'Page'} {entry.ang}
          </p>
          {(entry.raag || entry.writer || entry.sourceName) && (
            <p className="font-sans text-xs text-ink/45 dark:text-dark-text/45 mt-1 leading-5">
              {[entry.raag, entry.writer, entry.sourceName].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        {entry.shabadId ? (
          <div className="mb-4">
            <AudioPlayer shabadId={entry.shabadId} />
          </div>
        ) : null}

        {introLines.length > 0 && (
          <div className="mb-5 section-shell-quiet rounded-[24px] px-4 py-4">
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-gold dark:text-gold-light mb-2">
              Intro
            </p>
            <div className="space-y-3">
              {introLines.map((line, index) => {
                const introMeaning = getLineMeaningText(line, meaningLanguage, englishSource)
                return (
                  <div key={`intro-${line.verseId}-${index}`}>
                    <p
                      lang={scriptMode === 'devanagari' ? 'hi' : 'pa-Guru'}
                      className={`${scriptMode === 'devanagari' ? 'font-sans' : 'font-gurmukhi'} text-ink dark:text-dark-text ${lineSpacingClass} ${meaningAlignmentClass}`}
                      style={{ fontSize: `${fontSize}px` }}
                    >
                      {formatGurbaniText(line.gurmukhi, { scriptMode, larivaar, showVishraam })}
                    </p>
                    {showTransliteration && line.transliteration && (
                      <p className={`font-sans text-sm italic text-ink/60 dark:text-dark-text/60 mt-2 leading-relaxed ${meaningAlignmentClass}`}>
                        {line.transliteration}
                      </p>
                    )}
                    {introMeaning && (
                      meaningLanguage === 'pa' ? (
                        <p lang="pa-Guru" className={`font-gurmukhi text-sm text-ink/75 dark:text-dark-text/75 mt-2 leading-relaxed ${meaningAlignmentClass}`}>
                          {introMeaning}
                        </p>
                      ) : (
                        <p className={`font-sans text-sm text-ink/75 dark:text-dark-text/75 mt-2 leading-relaxed ${meaningAlignmentClass}`}>
                          {introMeaning}
                        </p>
                      )
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="space-y-0">
          {visibleMainLines.map((line, index) => {
            const meaningText = getLineMeaningText(line, meaningLanguage, englishSource)

            return (
              <article
                key={`${line.verseId}-${index}`}
                data-testid="study-line"
                className={`reader-divider px-1 py-5 ${meaningAlignmentClass}`}
              >
                <div className={`flex flex-wrap ${larivaar ? 'gap-x-0 gap-y-2' : 'gap-x-2 gap-y-3'} ${scriptAlignmentClass}`}>
                  {line.gurmukhi.split(' ').filter(Boolean).map((word, wordIndex) => (
                    <button
                      key={`${line.verseId}-${wordIndex}`}
                      type="button"
                      lang={scriptMode === 'devanagari' ? 'hi' : 'pa-Guru'}
                      className={`${scriptMode === 'devanagari' ? 'font-sans' : 'font-gurmukhi'} bg-transparent border-0 p-0 ${larivaar ? '' : 'mr-[0.1em]'} text-ink dark:text-dark-text ${lineSpacingClass} active:text-gold dark:active:text-gold-light hover:text-gold dark:hover:text-gold-light transition-colors duration-300`}
                      style={{ fontSize: `${fontSize}px` }}
                      onClick={() => handleWordTap(word, line)}
                    >
                      {formatGurbaniWord(word, { scriptMode, showVishraam })}
                    </button>
                  ))}
                </div>

                {showTransliteration && line.transliteration && (
                  <p className={`font-sans text-sm italic text-ink/60 dark:text-dark-text/60 mt-3 leading-relaxed ${meaningAlignmentClass}`}>
                    {line.transliteration}
                  </p>
                )}

                {meaningText && (
                  meaningLanguage === 'pa' ? (
                    <p lang="pa-Guru" className={`font-gurmukhi text-sm text-ink/75 dark:text-dark-text/75 mt-3 leading-relaxed ${meaningAlignmentClass}`}>
                      {meaningText}
                    </p>
                  ) : (
                    <p className={`font-sans text-sm text-ink/85 dark:text-dark-text/85 mt-3 leading-relaxed ${meaningAlignmentClass}`}>
                      {meaningText}
                    </p>
                  )
                )}

                <div className={`mt-4 pt-3 border-t border-sand/10 dark:border-dark-text/10 flex items-center gap-2 ${textAlign === 'center' ? 'justify-center flex-wrap' : 'justify-between'}`}>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onSavePhrase?.(line, entry)}
                      className={`font-sans text-[11px] uppercase tracking-[0.18em] ${
                        isPhraseSaved?.(line, entry)
                          ? 'text-saffron dark:text-saffron-light'
                          : 'text-ink/45 dark:text-dark-text/45'
                      }`}
                    >
                      {isPhraseSaved?.(line, entry) ? 'Saved' : 'Save Phrase'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onCopyLine?.(line, entry)}
                      className="font-sans text-[11px] text-ink/45 dark:text-dark-text/45 uppercase tracking-[0.18em]"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onShareLine?.(line, entry)}
                      className="min-h-[32px] min-w-[32px] flex items-center justify-center text-ink/40 dark:text-dark-text/40"
                      aria-label="Share verse"
                    >
                      <IconShare size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onBookmarkLine?.(line, entry)}
                      className={`min-h-[32px] min-w-[32px] flex items-center justify-center ${
                        isLineBookmarked?.(line, entry)
                          ? 'text-saffron dark:text-saffron-light'
                          : 'text-ink/40 dark:text-dark-text/40'
                      }`}
                      aria-label="Bookmark verse"
                    >
                      {isLineBookmarked?.(line, entry)
                        ? <IconBookmarkFilled size={15} />
                        : <IconBookmark size={15} />}
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>

        <p className={`font-sans text-ink/30 dark:text-dark-text/30 text-xs mt-5 ${meaningAlignmentClass}`}>
          Tap any Gurbani word for meaning
        </p>
      </section>

      {activeWord && (
        <WordPopover
          word={activeWord}
          onClose={() => {
            setActiveWord(null)
            setActiveLine(null)
          }}
          scripture={entry.scripture}
          sourceId={entry.source ?? entry.id.split('-')[0]}
          ang={activeLine?.ang ?? entry.ang}
          shabadId={activeLine?.shabadId ?? entry.shabadId}
          verseId={activeLine?.verseId}
          line={activeLine?.gurmukhi}
        />
      )}
    </>
  )
}
