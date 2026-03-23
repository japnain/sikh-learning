import type { Word } from '../types'

interface Props {
  word: Word
  onSave: (word: Word) => void
  onClose: () => void
}

export default function WordPopover({ word, onSave, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-[#1A1A1A] border border-[#2a2a2a] rounded-t-2xl p-6 w-full max-w-md mb-0"
        onClick={e => e.stopPropagation()}
      >
        <p lang="pa-Guru" className="font-gurmukhi text-3xl text-white mb-1">{word.gurmukhi}</p>
        <p className="text-gray-400 text-sm mb-1">{word.transliteration}</p>
        <p className="text-white font-medium mb-1">{word.meaning_en}</p>
        <p lang="pa-Guru" className="font-gurmukhi text-gray-300 text-sm mb-4">{word.meaning_pa}</p>
        <button
          onClick={() => { onSave(word); onClose() }}
          className="w-full py-3 rounded-xl bg-[#C9A84C] text-black font-semibold text-sm min-h-[44px]"
        >
          Save to Vocab
        </button>
      </div>
    </div>
  )
}
