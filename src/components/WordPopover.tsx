import type { Word } from '../types'
import { useLanguageStore } from '../store/language'
import { useVocabStore } from '../store/vocab'
import { renderScriptText } from '../utils/readerDisplay'
import { IconCheck } from './icons'

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

  const handleSave = () => {
    if (isSaved) return
    addWord({
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
    <div className="fixed inset-0 z-50 flex items-end justify-center pb-20 bg-ink/20 dark:bg-black/40 popover-overlay" onClick={onClose}>
      <div
        className="ornate-top bg-parchment-card dark:bg-dark-card border border-sand/15 dark:border-gold/10 rounded-t-2xl p-6 w-full max-w-md mb-0 shadow-gold-strong animate-slide-up transition-colors duration-300"
        onClick={e => e.stopPropagation()}
      >
        <p lang={scriptMode === 'devanagari' ? 'hi' : 'pa-Guru'} className={`${scriptMode === 'devanagari' ? 'font-sans' : 'font-gurmukhi'} text-3xl text-ink dark:text-dark-text mb-1`}>
          {renderScriptText(word.gurmukhi, scriptMode)}
        </p>
        {word.transliteration && <p className="font-sans text-ink/60 dark:text-dark-text/60 text-sm mb-1">{word.transliteration}</p>}
        {word.meaning_en
          ? <p className="font-sans text-ink dark:text-dark-text font-medium mb-1">{word.meaning_en}</p>
          : <p className="font-sans text-ink/40 dark:text-dark-text/40 text-sm italic mb-1">Meaning not available — you can still save this word</p>
        }
        {meaningLanguage === 'hi' && word.meaning_hi && (
          <p className="font-sans text-ink/70 dark:text-dark-text/70 text-sm mb-4">{word.meaning_hi}</p>
        )}
        {meaningLanguage === 'pa' && word.meaning_pa && (
          <p lang="pa-Guru" className="font-gurmukhi text-ink/70 dark:text-dark-text/70 text-sm mb-4">{word.meaning_pa}</p>
        )}
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSave}
            className={`flex-1 py-3 rounded-full font-sans font-semibold text-sm min-h-[44px] active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 ${
              isSaved
                ? 'bg-gold/20 text-gold dark:text-gold-light'
                : 'bg-gradient-to-r from-saffron to-saffron-light text-white'
            }`}
          >
            {isSaved ? <><IconCheck size={16} /> Saved</> : 'Save Word'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-full bg-parchment-low dark:bg-dark-surface text-ink/60 dark:text-dark-text/60 font-sans font-semibold text-sm min-h-[44px] active:scale-95 transition-all duration-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
