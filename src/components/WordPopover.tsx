import type { Word } from '../types'

interface Props {
  word: Word
  onClose: () => void
}

export default function WordPopover({ word, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-parchment-card dark:bg-dark-card border border-sand/15 dark:border-dark-text/10 rounded-t-2xl p-6 w-full max-w-md mb-0 shadow-sm transition-colors duration-300"
        onClick={e => e.stopPropagation()}
      >
        <p lang="pa-Guru" className="font-gurmukhi text-3xl text-ink dark:text-dark-text mb-1">{word.gurmukhi}</p>
        <p className="font-sans text-ink/60 dark:text-dark-text/60 text-sm mb-1">{word.transliteration}</p>
        <p className="font-sans text-ink dark:text-dark-text font-medium mb-1">{word.meaning_en}</p>
        <p lang="pa-Guru" className="font-gurmukhi text-ink/70 dark:text-dark-text/70 text-sm mb-4">{word.meaning_pa}</p>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-full bg-parchment-low dark:bg-dark-surface text-ink/60 dark:text-dark-text/60 font-sans font-semibold text-sm min-h-[44px] transition-colors duration-300"
        >
          Close
        </button>
      </div>
    </div>
  )
}
