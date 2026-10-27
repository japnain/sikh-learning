import type { UiLocale, VocabSense, Word } from '../types'
import { useState } from 'react'
import { hasVocabMeaning, hasVocabSense } from '../utils/vocabReview'
import { getWordFamilyForWord } from '../data/wordFamilies'
import { useLanguageStore } from '../store/language'
import { useLocaleStore } from '../store/locale'
import { isVocabEntryPersisted, useVocabStore } from '../store/vocab'
import { getScriptTextFontClass, getScriptTextLang, renderScriptText } from '../utils/readerDisplay'
import { useBanidbKosh } from '../hooks/useBanidbKosh'
import { useMahanKosh } from '../hooks/useMahanKosh'
import { buildMahanKoshUrl } from '../utils/wordLookup'
import { IconArrowRight, IconCheck, IconClose } from './icons'
import ModalSheet from './ModalSheet'

const REFERENCE_COPY: Record<UiLocale, {
  title: (word: string) => string
  description: string
  close: string
  save: string
  saved: string
  saveFailed: string
  englishFallback: string
  languages: { en: string; pa: string; hi: string }
  meaningUnavailable: (language: string) => string
  family: string
  familyDescription: string
  rootMeaning: string
  classicalContext: string
  additionalContext: string
  fullEntry: string
  exact: string
  loading: string
  refreshing: string
  unavailable: string
  retained: string
  missing: string
  retry: (name: string) => string
  chooseDefinition: string
  useDefinition: string
  selectedDefinition: string
  studyDefinition: string
  savingDefinition: (name: string) => string
}> = {
  en: {
    title: word => `Word details for ${word}`, description: 'Study meaning, dictionary context, and an option to save this word for review.',
    close: 'Close word details', save: 'Save Word', saved: 'Saved',
    saveFailed: 'This word could not be saved.', englishFallback: 'English fallback',
    languages: { en: 'English', pa: 'Punjabi', hi: 'Hindi' },
    meaningUnavailable: language => `No ${language} study meaning is available for this word. You can still explore the dictionaries below.`,
    family: 'Word Family', familyDescription: 'This word belongs to the following root:', rootMeaning: 'Root meaning (English)',
    classicalContext: 'Classical dictionary context for this word', additionalContext: 'Additional dictionary definitions', fullEntry: 'Full entry', exact: 'Exact',
    loading: 'Loading reference…', refreshing: 'Refreshing reference…',
    unavailable: 'This reference could not be loaded. You can retry without leaving your reading.',
    retained: 'Your previously loaded entry remains available below.',
    missing: 'No dictionary entry found for this form.',
    retry: name => `Try ${name} again`,
    chooseDefinition: 'Choose a definition above to save an answer for review.',
    useDefinition: 'Use this definition', selectedDefinition: 'Definition selected', studyDefinition: 'Use study meaning',
    savingDefinition: name => `Review answer: ${name}`,
  },
  pa: {
    title: word => `${word} ਦੇ ਵੇਰਵੇ`, description: 'ਸ਼ਬਦ ਦੇ ਅਰਥ, ਸ਼ਬਦਕੋਸ਼ ਦੇ ਹਵਾਲੇ ਅਤੇ ਦੁਹਰਾਈ ਲਈ ਸੁਰੱਖਿਅਤ ਕਰਨ ਦੀ ਚੋਣ।',
    close: 'ਸ਼ਬਦ ਦੇ ਵੇਰਵੇ ਬੰਦ ਕਰੋ', save: 'ਸ਼ਬਦ ਸੁਰੱਖਿਅਤ ਕਰੋ', saved: 'ਸੁਰੱਖਿਅਤ ਕੀਤਾ',
    saveFailed: 'ਇਹ ਸ਼ਬਦ ਸੰਭਾਲਿਆ ਨਹੀਂ ਜਾ ਸਕਿਆ।', englishFallback: 'ਉਪਲਬਧ ਅੰਗਰੇਜ਼ੀ ਅਰਥ',
    languages: { en: 'ਅੰਗਰੇਜ਼ੀ', pa: 'ਪੰਜਾਬੀ', hi: 'ਹਿੰਦੀ' },
    meaningUnavailable: language => `ਇਸ ਸ਼ਬਦ ਦੇ ${language} ਅਧਿਐਨ ਅਰਥ ਉਪਲਬਧ ਨਹੀਂ ਹਨ। ਹੇਠਾਂ ਸ਼ਬਦਕੋਸ਼ ਵੇਖ ਸਕਦੇ ਹੋ।`,
    family: 'ਸ਼ਬਦ ਪਰਿਵਾਰ', familyDescription: 'ਇਹ ਸ਼ਬਦ ਇਸ ਮੂਲ ਨਾਲ ਸੰਬੰਧਿਤ ਹੈ:', rootMeaning: 'ਮੂਲ ਅਰਥ (ਅੰਗਰੇਜ਼ੀ)',
    classicalContext: 'ਇਸ ਸ਼ਬਦ ਲਈ ਪੁਰਾਤਨ ਸ਼ਬਦਕੋਸ਼ ਦਾ ਹਵਾਲਾ', additionalContext: 'ਸ਼ਬਦਕੋਸ਼ ਦੇ ਹੋਰ ਅਰਥ', fullEntry: 'ਪੂਰਾ ਹਵਾਲਾ', exact: 'ਸਹੀ ਮਿਲਾਨ',
    loading: 'ਸ਼ਬਦਕੋਸ਼ ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ…', refreshing: 'ਸ਼ਬਦਕੋਸ਼ ਮੁੜ ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ…',
    unavailable: 'ਇਹ ਹਵਾਲਾ ਲੋਡ ਨਹੀਂ ਹੋ ਸਕਿਆ। ਪਾਠ ਛੱਡੇ ਬਿਨਾਂ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰ ਸਕਦੇ ਹੋ।',
    retained: 'ਪਹਿਲਾਂ ਲੋਡ ਹੋਇਆ ਹਵਾਲਾ ਹੇਠਾਂ ਉਪਲਬਧ ਹੈ।',
    missing: 'ਇਸ ਰੂਪ ਲਈ ਸ਼ਬਦਕੋਸ਼ ਵਿੱਚ ਕੋਈ ਹਵਾਲਾ ਨਹੀਂ ਮਿਲਿਆ।',
    retry: name => `${name} ਮੁੜ ਅਜ਼ਮਾਓ`,
    chooseDefinition: 'ਦੁਹਰਾਈ ਲਈ ਉੱਤਰ ਸੰਭਾਲਣ ਵਾਸਤੇ ਉੱਪਰੋਂ ਅਰਥ ਚੁਣੋ।',
    useDefinition: 'ਇਹ ਅਰਥ ਵਰਤੋ', selectedDefinition: 'ਅਰਥ ਚੁਣਿਆ ਗਿਆ', studyDefinition: 'ਅਧਿਐਨ ਅਰਥ ਵਰਤੋ',
    savingDefinition: name => `ਦੁਹਰਾਈ ਦਾ ਉੱਤਰ: ${name}`,
  },
  hi: {
    title: word => `${word} के विवरण`, description: 'शब्द का अर्थ, शब्दकोश के संदर्भ और दोहराने के लिए सहेजने का विकल्प।',
    close: 'शब्द के विवरण बंद करें', save: 'शब्द सहेजें', saved: 'सहेजा गया',
    saveFailed: 'यह शब्द सहेजा नहीं जा सका।', englishFallback: 'उपलब्ध अंग्रेज़ी अर्थ',
    languages: { en: 'अंग्रेज़ी', pa: 'पंजाबी', hi: 'हिंदी' },
    meaningUnavailable: language => `इस शब्द का ${language} अध्ययन अर्थ उपलब्ध नहीं है। नीचे दिए गए शब्दकोश देख सकते हैं।`,
    family: 'शब्द परिवार', familyDescription: 'यह शब्द इस मूल से संबंधित है:', rootMeaning: 'मूल अर्थ (अंग्रेज़ी)',
    classicalContext: 'इस शब्द के लिए पारंपरिक शब्दकोश का संदर्भ', additionalContext: 'शब्दकोश के अन्य अर्थ', fullEntry: 'पूरा संदर्भ', exact: 'सटीक मिलान',
    loading: 'शब्दकोश लोड हो रहा है…', refreshing: 'शब्दकोश फिर लोड हो रहा है…',
    unavailable: 'यह संदर्भ लोड नहीं हो सका। पाठ छोड़े बिना फिर कोशिश कर सकते हैं।',
    retained: 'पहले लोड हुआ संदर्भ नीचे उपलब्ध है।',
    missing: 'इस रूप के लिए शब्दकोश में कोई प्रविष्टि नहीं मिली।',
    retry: name => `${name} फिर आज़माएँ`,
    chooseDefinition: 'दोहराने के लिए उत्तर सहेजने हेतु ऊपर से अर्थ चुनें।',
    useDefinition: 'यह अर्थ चुनें', selectedDefinition: 'अर्थ चुना गया', studyDefinition: 'अध्ययन का अर्थ चुनें',
    savingDefinition: name => `रिव्यू का उत्तर: ${name}`,
  },
}

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
  const locale = useLocaleStore(s => s.locale)
  const referenceCopy = REFERENCE_COPY[locale]
  const uiLang = locale === 'pa' ? 'pa-Guru' : locale
  const meaningLanguage = useLanguageStore(s => s.meaningLanguage)
  const preferredLanguage = meaningLanguage === 'none' ? 'en' : meaningLanguage
  const preferredMeaning = word[`meaning_${preferredLanguage}`]?.trim()
  const meaning = preferredMeaning || word.meaning_en?.trim()
  const actualMeaningLanguage = preferredMeaning ? preferredLanguage : 'en'
  const englishFallback = Boolean(meaning && !preferredMeaning && preferredLanguage !== 'en')
  const { vocab, addWord } = useVocabStore()
  const [definitionChoice, setDefinitionChoice] = useState<{ word: string; id: string } | null>(null)
  const [failedWord, setFailedWord] = useState<string | null>(null)
  const wordFamily = getWordFamilyForWord(word.gurmukhi)
  const { entries, loading, refreshing, error, normalizedWord, retry } = useMahanKosh(word.gurmukhi)
  const {
    entries: banidbKoshEntries,
    loading: banidbKoshLoading,
    error: banidbKoshError,
    refreshing: banidbKoshRefreshing,
    retry: retryBanidbKosh,
  } = useBanidbKosh(word.gurmukhi)
  const visibleEntries = entries.slice(0, 3)
  const visibleBanidbKoshEntries = banidbKoshEntries.slice(0, 3)
  const fullLookupUrl = visibleEntries[0]?.sourceUrl ?? buildMahanKoshUrl(normalizedWord || word.gurmukhi)

  const context = { scripture, sourceId, ang, shabadId, verseId, line }
  const definitionOptions: Array<{ id: string; sense: VocabSense }> = [
    { id: 'study', sense: { meaning_en: word.meaning_en, meaning_hi: word.meaning_hi, meaning_pa: word.meaning_pa, definitionSource: { name: 'BaniDB' } } },
    ...visibleEntries.map(entry => ({ id: `mahankosh-${entry.id}`, sense: {
      meaning_en: '', meaning_hi: entry.description_hi || '', meaning_pa: entry.description || '',
      definitionSource: { name: 'Mahankosh', entryId: String(entry.id), url: entry.sourceUrl },
    } })),
    ...visibleBanidbKoshEntries.map(entry => ({ id: `kosh-${entry.id}`, sense: {
      meaning_en: '', meaning_hi: '', meaning_pa: entry.definitionUni?.trim() || '',
      definitionSource: { name: 'BaniDB Kosh', entryId: String(entry.id) },
    } })),
  ].filter(option => hasVocabMeaning(option.sense))
  const selectedId = definitionChoice?.word === word.gurmukhi ? definitionChoice.id : 'study'
  const selectedDefinition = definitionOptions.find(option => option.id === selectedId)
  const selectedSense = selectedDefinition ? { ...selectedDefinition.sense, context } : null
  const existingWord = vocab.find(v => v.word === word.gurmukhi && (v.kind ?? 'word') === 'word')
  const selectedAlreadySaved = Boolean(existingWord && selectedSense && hasVocabSense(existingWord, selectedSense))
  const isSaved = selectedAlreadySaved && Boolean(selectedSense && isVocabEntryPersisted(word.gurmukhi, 'word', selectedSense))
  const saveFailed = !isSaved && (selectedAlreadySaved || failedWord === word.gurmukhi)
  const selectDefinition = (id: string) => { setDefinitionChoice({ word: word.gurmukhi, id }); setFailedWord(null) }

  const handleSave = () => {
    if (isSaved || !selectedSense) return
    const result = addWord({
      kind: 'word',
      word: word.gurmukhi,
      transliteration: word.transliteration,
      ...selectedSense,
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
    setFailedWord(result.persisted ? null : word.gurmukhi)
  }

  return (
    <ModalSheet
      open
      onClose={onClose}
      title={referenceCopy.title(renderScriptText(word.gurmukhi, scriptMode))}
      description={referenceCopy.description}
      className="study-reader-word-sheet max-h-[85dvh] rounded-2xl flex flex-col"
      testId="study-word-details-sheet"
    >
      <div data-ai-surface="word-popover" data-ai-state="ready" className="contents" lang={uiLang}>
        <header className="study-word-header relative shrink-0 border-b border-sand/15 px-6 py-4 dark:border-dark-text/15">
          <button
            type="button"
            onClick={onClose}
            aria-label={referenceCopy.close}
            className="interactive-focus absolute right-4 top-4 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-parchment-low text-ink/68 dark:bg-dark-surface dark:text-dark-text/65"
          >
            <IconClose size={18} />
          </button>
          <p lang={getScriptTextLang(scriptMode)} className={`${getScriptTextFontClass(scriptMode)} text-3xl text-ink dark:text-dark-text mb-1 pr-[48px]`}>
            {renderScriptText(word.gurmukhi, scriptMode)}
          </p>
        </header>
        <div className="study-word-body min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-4">
          {word.transliteration && <p lang="pa-Latn" className="font-sans text-ink/68 dark:text-dark-text/64 text-sm mb-1">{word.transliteration}</p>}
          {englishFallback ? <p className="font-sans text-xs text-ink/68 dark:text-dark-text/64 mb-1">{referenceCopy.englishFallback}</p> : null}
          {meaning ? (
            <p data-testid="word-primary-meaning" lang={actualMeaningLanguage === 'pa' ? getScriptTextLang(scriptMode) : actualMeaningLanguage}
              className={`${actualMeaningLanguage === 'pa' ? getScriptTextFontClass(scriptMode) : actualMeaningLanguage === 'hi' ? getScriptTextFontClass('devanagari') : 'font-sans'} text-ink dark:text-dark-text font-medium mb-1 leading-relaxed`}>
              {actualMeaningLanguage === 'pa' ? renderScriptText(meaning, scriptMode) : meaning}
            </p>
          ) : <p data-testid="word-meaning-status" className="font-sans text-ink/68 dark:text-dark-text/64 text-sm italic mb-1">{referenceCopy.meaningUnavailable(referenceCopy.languages[preferredLanguage])}</p>}

          {definitionOptions.some(option => option.id === 'study') && selectedId !== 'study' ? (
            <button type="button" onClick={() => selectDefinition('study')} className="interactive-focus min-h-[44px] font-sans text-sm text-gold-dark dark:text-gold-light">{referenceCopy.studyDefinition}</button>
          ) : null}

          {wordFamily ? (
            <section className="study-reader-word-reference mt-5 border-t border-sand/20 dark:border-dark-text/15 py-5">
              <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text">
                {referenceCopy.family}
              </p>
              <p className="mt-2 font-sans text-sm text-ink dark:text-dark-text">
                {referenceCopy.familyDescription} <span lang={getScriptTextLang(scriptMode)} className={getScriptTextFontClass(scriptMode)}>{renderScriptText(wordFamily.root, scriptMode)}</span>
              </p>
              <p className="mt-2 font-sans text-sm text-ink/68 dark:text-dark-text/64">
                {referenceCopy.rootMeaning}: <span lang="en">{wordFamily.rootMeaning}</span>
              </p>
            </section>
          ) : null}

          <section
            className="study-reader-word-reference mt-5 border-t border-sand/20 dark:border-dark-text/15 py-5"
            data-ai-surface="mahankosh-popover"
            data-ai-state={loading ? 'loading' : error ? 'degraded' : visibleEntries.length === 0 && normalizedWord ? 'empty' : 'ready'}
            data-ai-error={error ?? undefined}
          >
            <div className="mb-3 flex flex-col items-start gap-3 min-[360px]:flex-row min-[360px]:items-center min-[360px]:justify-between">
              <div>
                <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text">
                  Mahankosh
                </p>
                <p className="font-sans text-sm text-ink/68 dark:text-dark-text/64 mt-1">
                  {referenceCopy.classicalContext}
                </p>
              </div>
              {normalizedWord && (
                <a
                  href={fullLookupUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="interactive-focus shrink-0 inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-sand/20 dark:border-dark-text/15 px-3 text-sm font-sans font-medium text-ink dark:text-dark-text transition-colors duration-150"
                  data-ai-action="open-full-mahankosh"
                >
                  {referenceCopy.fullEntry}
                  <IconArrowRight size={14} />
                </a>
              )}
            </div>

            {loading && (
              <p role="status" className="font-sans text-sm text-ink/75 dark:text-dark-text/75">
                {refreshing ? referenceCopy.refreshing : referenceCopy.loading}
              </p>
            )}

            {!loading && error && (
              <div className="study-reader-word-recovery">
                <p role="status" className="font-sans text-sm text-ink/75 dark:text-dark-text/75">{referenceCopy.unavailable}{visibleEntries.length > 0 ? ` ${referenceCopy.retained}` : ''}</p>
                <button type="button" onClick={retry} className="interactive-focus mt-2 min-h-[44px] rounded-lg border border-sand/20 px-3 font-sans text-sm font-medium dark:border-dark-text/20">{referenceCopy.retry('Mahankosh')}</button>
              </div>
            )}

            {!loading && !error && visibleEntries.length === 0 && normalizedWord && (
              <p className="font-sans text-sm text-ink/68 dark:text-dark-text/64">
                {referenceCopy.missing}
              </p>
            )}

            {visibleEntries.length > 0 && (
              <div className="space-y-3">
                {visibleEntries.map(entry => (
                  <article key={entry.id} className="border-t border-sand/15 pt-3 first:border-t-0 first:pt-0 dark:border-dark-text/15">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <p lang={getScriptTextLang(scriptMode)} className={`${getScriptTextFontClass(scriptMode)} text-lg text-ink dark:text-dark-text`}>
                        {renderScriptText(entry.word, scriptMode)}
                      </p>
                      {entry.exactMatch && (
                        <span className="rounded-full bg-saffron/12 px-2 py-1 font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-saffron dark:text-saffron-light">
                          {referenceCopy.exact}
                        </span>
                      )}
                    </div>
                    {(entry.roman || entry.hindi) && (
                      <div className="mb-2 flex flex-wrap gap-2">
                        {entry.roman && (
                          <span lang="pa-Latn" className="rounded-full bg-[rgb(var(--color-surface)/0.8)] dark:bg-dark-surface/80 px-2.5 py-1 font-sans text-[11px] text-ink/68 dark:text-dark-text/64">
                            {entry.roman}
                          </span>
                        )}
                        {entry.hindi && (
                          <span lang="hi" className="rounded-full bg-[rgb(var(--color-surface)/0.8)] dark:bg-dark-surface/80 px-2.5 py-1 font-sans text-[11px] text-ink/68 dark:text-dark-text/64">
                            {entry.hindi}
                          </span>
                        )}
                      </div>
                    )}
                    {entry.transliteration && (
                      <p lang="pa-Latn" className="font-sans text-xs italic text-ink/68 dark:text-dark-text/64 mb-2 leading-relaxed">
                        {entry.transliteration}
                      </p>
                    )}
                    {entry.description && (
                      <p lang={getScriptTextLang(scriptMode)} className={`${getScriptTextFontClass(scriptMode)} text-sm text-ink dark:text-dark-text leading-relaxed`}>
                        {renderScriptText(entry.description, scriptMode)}
                      </p>
                    )}
                    {entry.description_hi && (
                      <p lang="hi" className="font-sans text-xs text-ink/68 dark:text-dark-text/64 mt-2 leading-relaxed">
                        {entry.description_hi}
                      </p>
                    )}
                    {(entry.description?.trim() || entry.description_hi?.trim()) ? <button
                      type="button" aria-label={`${selectedId === `mahankosh-${entry.id}` ? referenceCopy.selectedDefinition : referenceCopy.useDefinition} · Mahankosh ${entry.id}`} aria-pressed={selectedId === `mahankosh-${entry.id}`}
                      onClick={() => selectDefinition(`mahankosh-${entry.id}`)}
                      className="interactive-focus mt-2 min-h-[44px] rounded-lg border border-sand/20 px-3 font-sans text-sm text-ink dark:border-dark-text/20 dark:text-dark-text"
                    >{selectedId === `mahankosh-${entry.id}` ? referenceCopy.selectedDefinition : referenceCopy.useDefinition}<span className="sr-only"> · Mahankosh {entry.id}</span></button> : null}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section
            className="study-reader-word-reference mt-5 border-t border-sand/20 dark:border-dark-text/15 py-5"
            data-ai-surface="banidb-kosh-popover"
            data-ai-state={banidbKoshLoading ? 'loading' : banidbKoshError ? 'degraded' : visibleBanidbKoshEntries.length === 0 ? 'empty' : 'ready'}
            data-ai-error={banidbKoshError ?? undefined}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text">
                  BaniDB Kosh
                </p>
                <p className="font-sans text-sm text-ink/68 dark:text-dark-text/64 mt-1">
                  {referenceCopy.additionalContext}
                </p>
              </div>
            </div>

            {banidbKoshLoading && (
              <p role="status" className="font-sans text-sm text-ink/75 dark:text-dark-text/75">
                {banidbKoshRefreshing ? referenceCopy.refreshing : referenceCopy.loading}
              </p>
            )}

            {!banidbKoshLoading && banidbKoshError && (
              <div className="study-reader-word-recovery">
                <p role="status" className="font-sans text-sm text-ink/75 dark:text-dark-text/75">{referenceCopy.unavailable}{visibleBanidbKoshEntries.length > 0 ? ` ${referenceCopy.retained}` : ''}</p>
                <button type="button" onClick={retryBanidbKosh} className="interactive-focus mt-2 min-h-[44px] rounded-lg border border-sand/20 px-3 font-sans text-sm font-medium dark:border-dark-text/20">{referenceCopy.retry('BaniDB Kosh')}</button>
              </div>
            )}

            {!banidbKoshLoading && !banidbKoshError && visibleBanidbKoshEntries.length === 0 && (
              <p className="font-sans text-sm text-ink/68 dark:text-dark-text/64">
                {referenceCopy.missing}
              </p>
            )}

            {visibleBanidbKoshEntries.length > 0 && (
              <div className="space-y-3">
                {visibleBanidbKoshEntries.map(entry => (
                  <article key={entry.id} className="border-t border-sand/15 pt-3 first:border-t-0 first:pt-0 dark:border-dark-text/15">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <p lang={getScriptTextLang(scriptMode)} className={`${getScriptTextFontClass(scriptMode)} text-lg text-ink dark:text-dark-text`}>
                        {renderScriptText(entry.wordUni || word.gurmukhi, scriptMode)}
                      </p>
                    </div>
                    <p lang={getScriptTextLang(scriptMode)} className={`${getScriptTextFontClass(scriptMode)} text-sm text-ink dark:text-dark-text leading-relaxed`}>
                      {entry.definitionUni ? renderScriptText(entry.definitionUni, scriptMode) : referenceCopy.missing}
                    </p>
                    {entry.definition && entry.definitionUni !== entry.definition && (
                      <details className="mt-3 font-sans text-sm leading-relaxed text-ink/80 dark:text-dark-text/80">
                        <summary className="interactive-focus min-h-[44px] cursor-pointer py-3">{locale === 'pa' ? 'ਮੂਲ ਸਰੋਤ ਲਿਖਤ (ਪੁਰਾਣੀ ਲਿਪੀ-ਕੋਡਿੰਗ)' : locale === 'hi' ? 'मूल स्रोत पाठ (पुराना एन्कोडिंग)' : 'Original source text (legacy encoding)'}</summary>
                        <p className="break-words whitespace-pre-wrap">{entry.definition}</p>
                      </details>
                    )}
                    {entry.definitionUni?.trim() ? <button
                      type="button" aria-label={`${selectedId === `kosh-${entry.id}` ? referenceCopy.selectedDefinition : referenceCopy.useDefinition} · BaniDB Kosh ${entry.id}`} aria-pressed={selectedId === `kosh-${entry.id}`}
                      onClick={() => selectDefinition(`kosh-${entry.id}`)}
                      className="interactive-focus mt-2 min-h-[44px] rounded-lg border border-sand/20 px-3 font-sans text-sm text-ink dark:border-dark-text/20 dark:text-dark-text"
                    >{selectedId === `kosh-${entry.id}` ? referenceCopy.selectedDefinition : referenceCopy.useDefinition}<span className="sr-only"> · BaniDB Kosh {entry.id}</span></button> : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="shrink-0 flex flex-col gap-2 border-t border-sand/10 dark:border-gold/10 px-6 py-4 bg-[rgb(var(--color-surface)/0.95)] dark:bg-dark-card/95">
          <p role="status" className="font-sans text-sm leading-relaxed text-ink/75 dark:text-dark-text/75">{selectedDefinition ? referenceCopy.savingDefinition(selectedDefinition.sense.definitionSource?.name ?? 'BaniDB') : referenceCopy.chooseDefinition}</p>
          {saveFailed ? <p role="alert" className="font-sans text-sm leading-relaxed text-ink dark:text-dark-text">{referenceCopy.saveFailed}</p> : null}
          <button
            onClick={handleSave}
            disabled={!selectedSense || isSaved}
            className={`interactive-focus flex-1 py-3 rounded-lg font-sans font-semibold text-sm min-h-[44px] disabled:opacity-60 transition-colors duration-150 flex items-center justify-center gap-2 ${
              isSaved
                ? 'bg-gold/20 text-gold-dark dark:text-gold-light'
                : 'bg-saffron text-white'
            }`}
            data-ai-action="save-word"
          >
            {isSaved ? <><IconCheck size={16} /> {referenceCopy.saved}</> : referenceCopy.save}
          </button>
        </div>
      </div>
    </ModalSheet>
  )
}
