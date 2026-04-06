export function normalizeLookupWord(word: string): string {
  return word
    .replace(/[।॥.,;:!?"'“”‘’()[\]{}]/g, '')
    .replace(/[੦-੯0-9]/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
}

export function buildMahanKoshUrl(word: string): string {
  return `https://www.searchgurbani.com/mahan-kosh/view?word=${encodeURIComponent(normalizeLookupWord(word))}`
}
