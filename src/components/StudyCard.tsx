import { useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import type { ScriptureEntry, ScriptureLine, ScriptureVisraamMarker, Word } from '../types'
import { useLanguageStore } from '../store/language'
import { useLocaleStore } from '../store/locale'
import { formatGurbaniText, formatGurbaniWord, getLineMeaningText, getScriptTextFontClass, getScriptTextLang, renderScriptText } from '../utils/readerDisplay'
import { getHindiSourceLabels, getPunjabiSourceLabels, getVisraamSourceLabels } from '../utils/translations'
import WordPopover from './WordPopover'
import AudioPlayer from './AudioPlayer'
import { IconBookmark, IconBookmarkFilled, IconClose, IconMoreHorizontal, IconShare } from './icons'

interface Props {
  entry: ScriptureEntry
  wordData?: Word[] | null
  hideMainLines?: boolean
  showHeaderBlock?: boolean
  showAudioPlayer?: boolean
  sectionId?: string
  sectionEyebrow?: string | null
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
    translations_hi: { ss: entry.translation_hi },
    translation_pa: entry.translation_pa,
    translations_pa: { ss: entry.translation_pa },
  }
}

function ReaderChip({
  children,
  active = false,
}: {
  children: ReactNode
  active?: boolean
}) {
  return (
    <span className={`rounded-full border px-2.5 py-1 font-sans text-[10px] ${
      active
        ? 'border-saffron/25 bg-saffron/10 text-saffron dark:border-saffron/25 dark:bg-saffron/10 dark:text-saffron-light'
        : 'border-sand/12 bg-parchment-low/80 text-ink/55 dark:border-dark-text/10 dark:bg-dark-surface/70 dark:text-dark-text/58'
    }`}>
      {children}
    </span>
  )
}

function LineActionItem({
  label,
  onClick,
  icon,
  active = false,
}: {
  label: string
  onClick: () => void
  icon?: ReactNode
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border px-4 py-3 text-left font-sans text-sm transition-all duration-300 ${
        active
          ? 'bg-saffron/10 dark:bg-saffron/15 border-saffron/20 text-saffron dark:text-saffron-light'
          : 'bg-parchment-low dark:bg-dark-surface border-sand/10 dark:border-dark-text/10 text-ink dark:text-dark-text'
      }`}
    >
      <span className="flex items-center justify-between gap-3">
        <span>{label}</span>
        {icon ? <span className="shrink-0">{icon}</span> : null}
      </span>
    </button>
  )
}

export default function StudyCard({
  entry,
  wordData,
  hideMainLines = false,
  showHeaderBlock = true,
  showAudioPlayer = false,
  sectionId,
  sectionEyebrow = null,
  onSavePhrase,
  onCopyLine,
  onShareLine,
  onBookmarkLine,
  isLineBookmarked,
  isPhraseSaved,
}: Props) {
  const [activeWord, setActiveWord] = useState<Word | null>(null)
  const [activeLine, setActiveLine] = useState<ScriptureLine | null>(null)
  const [actionLine, setActionLine] = useState<ScriptureLine | null>(null)
  const [sourceLayersOpen, setSourceLayersOpen] = useState(false)
  const locale = useLocaleStore(s => s.locale)
  const scriptMode = useLanguageStore(s => s.scriptMode)
  const showTransliteration = useLanguageStore(s => s.showTransliteration)
  const meaningLanguage = useLanguageStore(s => s.meaningLanguage)
  const fontSize = useLanguageStore(s => s.fontSize)
  const englishSource = useLanguageStore(s => s.englishSource)
  const punjabiSource = useLanguageStore(s => s.punjabiSource)
  const hindiSource = useLanguageStore(s => s.hindiSource)
  const larivaar = useLanguageStore(s => s.larivaar)
  const showVishraam = useLanguageStore(s => s.showVishraam)
  const visraamSource = useLanguageStore(s => s.visraamSource)
  const lineSpacing = useLanguageStore(s => s.lineSpacing)
  const textAlign = useLanguageStore(s => s.textAlign)
  const punjabiSourceLabels = getPunjabiSourceLabels(locale)
  const hindiSourceLabels = getHindiSourceLabels(locale)
  const visraamSourceLabels = getVisraamSourceLabels(locale)

  const lines = useMemo(
    () => (entry.lines && entry.lines.length > 0 ? entry.lines : [fallbackLine(entry)]),
    [entry]
  )
  const introLines = lines.filter(line => line.isHeader)
  const mainLines = lines.filter(line => !line.isHeader)
  const shouldRenderHeaderBlock = showHeaderBlock && introLines.length > 0
  const visibleMainLines = hideMainLines
    ? []
    : shouldRenderHeaderBlock
    ? (mainLines.length > 0 ? mainLines : (introLines.length > 0 ? [] : lines))
    : lines

  const cleanGurmukhi = (s: string) =>
    s.replace(/[;,।॥.\s]/g, '').replace(/[\u200B-\u200D\uFEFF]/g, '')

  const scriptAlignmentClass = textAlign === 'center' ? 'text-center items-center' : 'text-left items-start'
  const meaningAlignmentClass = textAlign === 'center' ? 'text-center' : 'text-left'
  const lineSpacingClass = lineSpacing === 'relaxed' ? 'leading-[2.15]' : 'leading-[1.7]'
  const actionMeaning = actionLine ? getLineMeaningText(actionLine, meaningLanguage, englishSource) : ''
  const actionSourceLayers = useMemo(() => {
    if (!actionLine) {
      return {
        punjabiVariants: [] as Array<[string, string]>,
        hindiVariants: [] as Array<[string, string]>,
        visraamVariants: [] as Array<[string, ScriptureVisraamMarker[]]>,
        hasExpandedSurface: false,
      }
    }

    const punjabiVariants = Object.entries(actionLine.translations_pa ?? {}).filter((entry): entry is [string, string] => Boolean(entry[1]))
    const hindiVariants = Object.entries(actionLine.translations_hi ?? {}).filter((entry): entry is [string, string] => Boolean(entry[1]))
    const visraamVariants = Object.entries(actionLine.visraam ?? {}).filter((entry): entry is [string, ScriptureVisraamMarker[]] => Array.isArray(entry[1]) && entry[1].length > 0)

    return {
      punjabiVariants,
      hindiVariants,
      visraamVariants,
      hasExpandedSurface: punjabiVariants.length > 1 || hindiVariants.length > 1 || visraamVariants.length > 0,
    }
  }, [actionLine])

  const handleWordTap = (
    event: MouseEvent<HTMLButtonElement>,
    originalGurmukhi: string,
    line: ScriptureLine
  ) => {
    event.preventDefault()
    event.stopPropagation()

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

  const closeActionSheet = () => {
    setActionLine(null)
    setSourceLayersOpen(false)
  }

  const handleLineAction = (line: ScriptureLine, action?: (line: ScriptureLine, entry: ScriptureEntry) => void) => {
    action?.(line, entry)
    closeActionSheet()
  }

  return (
    <>
      <section
        id={sectionId}
        data-testid="study-card"
        className="animate-scale-in scroll-mt-24 section-shell rounded-xl px-4 py-5 sm:px-5"
      >
        <div className="mb-5">
          {sectionEyebrow ? (
            <p className="font-sans text-[11px] text-gold dark:text-gold-light uppercase tracking-[0.2em] mb-2">
              {sectionEyebrow}
            </p>
          ) : null}
          <p className="font-sans text-[11px] text-gold dark:text-gold-light uppercase tracking-[0.2em]">
            {entry.scripture} · {entry.scripture === 'SGGS' || entry.scripture === 'DG' ? 'Ang' : 'Page'} {entry.ang}
          </p>
          {(entry.raag || entry.writer || entry.sourceName) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {entry.sourceName ? <ReaderChip>{entry.sourceName}</ReaderChip> : null}
              {entry.raag ? <ReaderChip>{entry.raag}</ReaderChip> : null}
              {entry.writer ? <ReaderChip>{entry.writer}</ReaderChip> : null}
            </div>
          )}
        </div>

        {showAudioPlayer && entry.shabadId ? (
          <div className="mb-4">
            <AudioPlayer shabadId={entry.shabadId} />
          </div>
        ) : null}

        {shouldRenderHeaderBlock && (
          <div data-testid="study-header-block" className="mb-5 section-shell-quiet rounded-lg px-4 py-4">
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
                      {formatGurbaniText(line.gurmukhi, { scriptMode, larivaar, showVishraam, larivaarText: line.larivaar })}
                    </p>
                    {showTransliteration && line.transliteration && (
                      <p className={`font-sans text-sm italic text-ink/60 dark:text-dark-text/60 mt-2 leading-relaxed ${meaningAlignmentClass}`}>
                        {line.transliteration}
                      </p>
                    )}
                    {introMeaning && (
                      meaningLanguage === 'pa' ? (
                        <p lang={getScriptTextLang(scriptMode)} className={`${getScriptTextFontClass(scriptMode)} text-sm text-ink/75 dark:text-dark-text/75 mt-2 leading-relaxed ${meaningAlignmentClass}`}>
                          {renderScriptText(introMeaning, scriptMode)}
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

        {visibleMainLines.length > 0 && (
          <>
            <div className="space-y-0">
              {visibleMainLines.map((line, index) => {
                const meaningText = getLineMeaningText(line, meaningLanguage, englishSource)

                return (
                  <article
                    key={`${line.verseId}-${index}`}
                    data-testid="study-line"
                    data-verse-id={line.verseId}
                    className={`reader-divider relative px-1 pr-10 py-5 ${meaningAlignmentClass}`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActionLine(line)
                        setSourceLayersOpen(false)
                      }}
                      aria-label={`Open verse actions for line ${index + 1}`}
                      className={`absolute right-0 top-4 flex min-h-[32px] min-w-[32px] items-center justify-center rounded-full border border-transparent text-ink/28 transition-colors duration-300 hover:border-sand/20 hover:text-ink/55 dark:text-dark-text/28 dark:hover:border-dark-text/10 dark:hover:text-dark-text/55 ${
                        isLineBookmarked?.(line, entry) ? 'text-saffron dark:text-saffron-light' : ''
                      }`}
                    >
                      <IconMoreHorizontal size={16} />
                    </button>

                    {larivaar ? (
                      <p
                        lang={scriptMode === 'devanagari' ? 'hi' : 'pa-Guru'}
                        className={`${scriptMode === 'devanagari' ? 'font-sans' : 'font-gurmukhi'} text-ink dark:text-dark-text ${lineSpacingClass} ${meaningAlignmentClass}`}
                        style={{ fontSize: `${fontSize}px` }}
                      >
                        {formatGurbaniText(line.gurmukhi, { scriptMode, larivaar: true, showVishraam, larivaarText: line.larivaar })}
                      </p>
                    ) : (
                      <div className={`flex flex-wrap gap-x-2 gap-y-3 ${scriptAlignmentClass}`}>
                        {line.gurmukhi.split(' ').filter(Boolean).map((word, wordIndex) => (
                          <button
                            key={`${line.verseId}-${wordIndex}`}
                            type="button"
                            lang={scriptMode === 'devanagari' ? 'hi' : 'pa-Guru'}
                            className={`${scriptMode === 'devanagari' ? 'font-sans' : 'font-gurmukhi'} bg-transparent border-0 p-0 mr-[0.1em] text-ink dark:text-dark-text ${lineSpacingClass} active:text-gold dark:active:text-gold-light hover:text-gold dark:hover:text-gold-light transition-colors duration-300`}
                            style={{ fontSize: `${fontSize}px` }}
                            onPointerDown={event => event.stopPropagation()}
                            onClick={event => handleWordTap(event, word, line)}
                          >
                            {formatGurbaniWord(word, { scriptMode, showVishraam })}
                          </button>
                        ))}
                      </div>
                    )}

                    {showTransliteration && line.transliteration && (
                      <p className={`font-sans text-sm italic text-ink/60 dark:text-dark-text/60 mt-3 leading-relaxed ${meaningAlignmentClass}`}>
                        {line.transliteration}
                      </p>
                    )}

                    {meaningText && (
                      meaningLanguage === 'pa' ? (
                        <p lang={getScriptTextLang(scriptMode)} className={`${getScriptTextFontClass(scriptMode)} text-sm text-ink/75 dark:text-dark-text/75 mt-3 leading-relaxed ${meaningAlignmentClass}`}>
                          {renderScriptText(meaningText, scriptMode)}
                        </p>
                      ) : (
                        <p className={`font-sans text-sm text-ink/85 dark:text-dark-text/85 mt-3 leading-relaxed ${meaningAlignmentClass}`}>
                          {meaningText}
                        </p>
                      )
                    )}

                  </article>
                )
              })}
            </div>

            <p className={`font-sans text-ink/30 dark:text-dark-text/30 text-xs mt-5 ${meaningAlignmentClass}`}>
              Tap a Gurbani word for meaning. Use the verse menu for saving, sharing, and source layers.
            </p>
          </>
        )}
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

      {actionLine && (
        <div className="fixed inset-0 z-[70] bg-ink/35 dark:bg-black/60">
          <button
            type="button"
            onClick={closeActionSheet}
            className="absolute inset-0"
            aria-label="Close verse actions"
          />
          <div
            className="absolute inset-x-0 bottom-0 flex justify-center px-3"
            style={{ paddingBottom: 'calc(var(--nav-stack-height, 0px) + 0.75rem + env(safe-area-inset-bottom))' }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Verse actions"
              data-testid="study-verse-actions-sheet"
              className="w-full max-w-md overflow-y-auto rounded-[30px] border border-sand/15 bg-parchment-card px-4 pb-5 pt-3 shadow-gold-strong max-h-[min(72vh,38rem)] dark:border-dark-text/10 dark:bg-dark-card"
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-sand/25 dark:bg-dark-text/15" />
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-gold dark:text-gold-light">
                    Verse Actions
                  </p>
                  <p
                    lang={scriptMode === 'devanagari' ? 'hi' : 'pa-Guru'}
                    className={`${scriptMode === 'devanagari' ? 'font-sans' : 'font-gurmukhi'} mt-2 text-xl leading-relaxed text-ink dark:text-dark-text`}
                  >
                    {formatGurbaniText(actionLine.gurmukhi, { scriptMode, larivaar, showVishraam, larivaarText: actionLine.larivaar })}
                  </p>
                  {showTransliteration && actionLine.transliteration && (
                    <p className="mt-2 font-sans text-sm italic text-ink/55 dark:text-dark-text/55">
                      {actionLine.transliteration}
                    </p>
                  )}
                  {actionMeaning && (
                    <p className={`mt-2 text-sm text-ink/70 dark:text-dark-text/70 ${meaningLanguage === 'pa' ? 'font-gurmukhi' : 'font-sans'}`}>
                      {actionMeaning}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={closeActionSheet}
                  aria-label="Dismiss verse actions"
                  className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-full bg-parchment-low text-ink/50 dark:bg-dark-surface dark:text-dark-text/50"
                >
                  <IconClose size={16} />
                </button>
              </div>

              <div className="space-y-2">
                <LineActionItem
                  label={isPhraseSaved?.(actionLine, entry) ? 'Phrase Saved' : 'Save Phrase'}
                  onClick={() => handleLineAction(actionLine, onSavePhrase)}
                  active={Boolean(isPhraseSaved?.(actionLine, entry))}
                />
                <LineActionItem
                  label="Copy"
                  onClick={() => handleLineAction(actionLine, onCopyLine)}
                />
                <LineActionItem
                  label="Share"
                  onClick={() => handleLineAction(actionLine, onShareLine)}
                  icon={<IconShare size={16} />}
                />
                <LineActionItem
                  label={isLineBookmarked?.(actionLine, entry) ? 'Bookmarked' : 'Bookmark'}
                  onClick={() => handleLineAction(actionLine, onBookmarkLine)}
                  active={Boolean(isLineBookmarked?.(actionLine, entry))}
                  icon={isLineBookmarked?.(actionLine, entry) ? <IconBookmarkFilled size={16} /> : <IconBookmark size={16} />}
                />
                {actionSourceLayers.hasExpandedSurface ? (
                  <LineActionItem
                    label={sourceLayersOpen ? 'Hide Source Layers' : 'Show Source Layers'}
                    onClick={() => setSourceLayersOpen(open => !open)}
                    active={sourceLayersOpen}
                  />
                ) : null}
              </div>

              {actionSourceLayers.hasExpandedSurface && sourceLayersOpen ? (
                <div
                  className="mt-3 space-y-3 rounded-lg border border-sand/12 bg-parchment-low/75 px-4 py-4 dark:border-dark-text/10 dark:bg-dark-surface/70"
                  data-testid="study-source-layers-sheet"
                >
                  {actionSourceLayers.punjabiVariants.length > 0 ? (
                    <div>
                      <p className="mb-2 font-sans text-[11px] uppercase tracking-[0.18em] text-gold dark:text-gold-light">
                        Punjabi
                      </p>
                      <div className="space-y-2">
                        {actionSourceLayers.punjabiVariants.map(([sourceKey, text]) => (
                          <div key={`pa-${sourceKey}`} className="rounded-lg border border-sand/10 bg-white/60 px-3 py-3 dark:border-dark-text/10 dark:bg-dark-card/55">
                            <div className="mb-2 flex flex-wrap gap-1.5">
                              <ReaderChip active={sourceKey === punjabiSource}>
                                {punjabiSourceLabels[sourceKey] ?? sourceKey.toUpperCase()}
                              </ReaderChip>
                              {sourceKey === punjabiSource ? <ReaderChip active>Selected</ReaderChip> : null}
                            </div>
                            <p lang={getScriptTextLang(scriptMode)} className={`${getScriptTextFontClass(scriptMode)} text-sm leading-relaxed text-ink dark:text-dark-text`}>
                              {renderScriptText(text, scriptMode)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {actionSourceLayers.hindiVariants.length > 0 ? (
                    <div>
                      <p className="mb-2 font-sans text-[11px] uppercase tracking-[0.18em] text-gold dark:text-gold-light">
                        Hindi
                      </p>
                      <div className="space-y-2">
                        {actionSourceLayers.hindiVariants.map(([sourceKey, text]) => (
                          <div key={`hi-${sourceKey}`} className="rounded-lg border border-sand/10 bg-white/60 px-3 py-3 dark:border-dark-text/10 dark:bg-dark-card/55">
                            <div className="mb-2 flex flex-wrap gap-1.5">
                              <ReaderChip active={sourceKey === hindiSource}>
                                {hindiSourceLabels[sourceKey] ?? sourceKey.toUpperCase()}
                              </ReaderChip>
                              {sourceKey === hindiSource ? <ReaderChip active>Selected</ReaderChip> : null}
                            </div>
                            <p className="font-sans text-sm leading-relaxed text-ink dark:text-dark-text">
                              {text}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {actionSourceLayers.visraamVariants.length > 0 ? (
                    <div>
                      <p className="mb-2 font-sans text-[11px] uppercase tracking-[0.18em] text-gold dark:text-gold-light">
                        Visraam Sets
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {actionSourceLayers.visraamVariants.map(([sourceKey, markers]) => (
                          <ReaderChip key={`visraam-${sourceKey}`} active={sourceKey === visraamSource}>
                            {(visraamSourceLabels[sourceKey as keyof typeof visraamSourceLabels] ?? sourceKey.toUpperCase())} · {markers.length}
                          </ReaderChip>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
