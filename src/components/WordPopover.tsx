import type { Word } from '../types'
import { useLanguageStore } from '../store/language'
import { useVocabStore } from '../store/vocab'

interface Props {
  word: Word
  onClose: () => void
  scripture?: string
  sourceId?: string
}

export default function WordPopover({ word, onClose, scripture = '', sourceId = '' }: Props) {
  const hindiMode = useLanguageStore(s => s.hindiMode)
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
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-parchment-card dark:bg-dark-card border border-sand/15 dark:border-dark-text/10 rounded-t-2xl p-6 w-full max-w-md mb-0 shadow-sm transition-colors duration-300"
        onClick={e => e.stopPropagation()}
      >
        <p lang="pa-Guru" className="font-gurmukhi text-3xl text-ink dark:text-dark-text mb-1">{word.gurmukhi}</p>
        <p className="font-sans text-ink/60 dark:text-dark-text/60 text-sm mb-1">{word.transliteration}</p>
        <p className="font-sans text-ink dark:text-dark-text font-medium mb-1">{word.meaning_en}</p>
        {hindiMode
          ? <p className="font-sans text-ink/70 dark:text-dark-text/70 text-sm mb-4">{word.meaning_hi}</p>
          : <p lang="pa-Guru" className="font-gurmukhi text-ink/70 dark:text-dark-text/70 text-sm mb-4">{word.meaning_pa}</p>
        }
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className={`flex-1 py-3 rounded-full font-sans font-semibold text-sm min-h-[44px] transition-colors duration-300 ${
              isSaved
                ? 'bg-saffron/20 text-saffron dark:text-saffron-light'
                : 'bg-parchment-low dark:bg-dark-surface text-ink/60 dark:text-dark-text/60'
            }`}
          >
            {isSaved ? 'Saved ✓' : 'Save Word'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-full bg-parchment-low dark:bg-dark-surface text-ink/60 dark:text-dark-text/60 font-sans font-semibold text-sm min-h-[44px] transition-colors duration-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
