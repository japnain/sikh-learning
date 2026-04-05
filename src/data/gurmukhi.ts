export interface GurmukhiLetter {
  gurmukhi: string
  name: string
  pronunciation: string
  example: string
  exampleMeaning: string
}

// The 35 Gurmukhi letters (ਪੈਂਤੀ ਅੱਖਰ) with Gurbani examples
export const GURMUKHI_LETTERS: GurmukhiLetter[] = [
  { gurmukhi: 'ੳ', name: 'Ura',    pronunciation: 'U (as in up)',    example: 'ਉਪਮਾ',   exampleMeaning: 'praise' },
  { gurmukhi: 'ਅ', name: 'Aira',   pronunciation: 'A (as in arm)',   example: 'ਅਕਾਲ',   exampleMeaning: 'timeless' },
  { gurmukhi: 'ੲ', name: 'Iri',    pronunciation: 'I (as in ink)',   example: 'ਇੱਕ',    exampleMeaning: 'one' },
  { gurmukhi: 'ਸ', name: 'Sassa',  pronunciation: 'S (as in sun)',   example: 'ਸਤਿਨਾਮੁ', exampleMeaning: 'True Name' },
  { gurmukhi: 'ਹ', name: 'Haha',   pronunciation: 'H (as in hat)',   example: 'ਹਰਿ',    exampleMeaning: 'God' },
  { gurmukhi: 'ਕ', name: 'Kakka',  pronunciation: 'K (as in kit)',   example: 'ਕਰਤਾ',   exampleMeaning: 'Creator' },
  { gurmukhi: 'ਖ', name: 'Khakha', pronunciation: 'Kh (aspirated)',  example: 'ਖਾਲਸਾ',  exampleMeaning: 'pure one' },
  { gurmukhi: 'ਗ', name: 'Gagga',  pronunciation: 'G (as in go)',    example: 'ਗੁਰੂ',   exampleMeaning: 'Guru' },
  { gurmukhi: 'ਘ', name: 'Ghagha', pronunciation: 'Gh (aspirated)',  example: 'ਘਰ',     exampleMeaning: 'home' },
  { gurmukhi: 'ਙ', name: 'Nganga', pronunciation: 'Ng (as in sing)', example: 'ਅੰਗ',    exampleMeaning: 'limb / page' },
  { gurmukhi: 'ਚ', name: 'Chacha', pronunciation: 'Ch (as in chin)', example: 'ਚਰਨ',   exampleMeaning: "Guru's feet" },
  { gurmukhi: 'ਛ', name: 'Chhachha', pronunciation: 'Chh (aspirated)', example: 'ਛਤ੍ਰ', exampleMeaning: 'canopy' },
  { gurmukhi: 'ਜ', name: 'Jajja',  pronunciation: 'J (as in joy)',   example: 'ਜਪੁ',    exampleMeaning: 'recite' },
  { gurmukhi: 'ਝ', name: 'Jhajha', pronunciation: 'Jh (aspirated)',  example: 'ਝੂਠ',   exampleMeaning: 'falsehood' },
  { gurmukhi: 'ਞ', name: 'Nyanya', pronunciation: 'Ny (as in canyon)', example: 'ਗਿਆਨ', exampleMeaning: 'divine knowledge' },
  { gurmukhi: 'ਟ', name: 'Tatta',  pronunciation: 'T (retroflex)',   example: 'ਟੇਕ',    exampleMeaning: 'support' },
  { gurmukhi: 'ਠ', name: 'Thattha', pronunciation: 'Th (retroflex aspirated)', example: 'ਠਾਕੁਰ', exampleMeaning: 'Lord' },
  { gurmukhi: 'ਡ', name: 'Dadda',  pronunciation: 'D (retroflex)',   example: 'ਡਰ',     exampleMeaning: 'fear' },
  { gurmukhi: 'ਢ', name: 'Dhadha', pronunciation: 'Dh (retroflex aspirated)', example: 'ਢਾਡੀ', exampleMeaning: 'bard' },
  { gurmukhi: 'ਣ', name: 'Nanna',  pronunciation: 'N (retroflex)',   example: 'ਗੁਣ',    exampleMeaning: 'virtue' },
  { gurmukhi: 'ਤ', name: 'Tatta',  pronunciation: 'T (dental)',      example: 'ਤੂ',     exampleMeaning: 'You (God)' },
  { gurmukhi: 'ਥ', name: 'Thatha', pronunciation: 'Th (dental aspirated)', example: 'ਥਾਪਿਆ', exampleMeaning: 'established' },
  { gurmukhi: 'ਦ', name: 'Dadda',  pronunciation: 'D (dental)',      example: 'ਦਾਸ',    exampleMeaning: 'servant' },
  { gurmukhi: 'ਧ', name: 'Dhadha', pronunciation: 'Dh (dental aspirated)', example: 'ਧਰਮ', exampleMeaning: 'righteous path' },
  { gurmukhi: 'ਨ', name: 'Nanna',  pronunciation: 'N (as in no)',    example: 'ਨਾਮੁ',   exampleMeaning: 'Divine Name' },
  { gurmukhi: 'ਪ', name: 'Pappa',  pronunciation: 'P (as in put)',   example: 'ਪਾਰਬ੍ਰਹਮ', exampleMeaning: 'Supreme God' },
  { gurmukhi: 'ਫ', name: 'Phappha', pronunciation: 'Ph (aspirated)', example: 'ਫਲ',    exampleMeaning: 'fruit / reward' },
  { gurmukhi: 'ਬ', name: 'Babba',  pronunciation: 'B (as in but)',   example: 'ਬ੍ਰਹਮ',  exampleMeaning: 'Brahm (God)' },
  { gurmukhi: 'ਭ', name: 'Bhabha', pronunciation: 'Bh (aspirated)',  example: 'ਭਗਤਿ',  exampleMeaning: 'devotion' },
  { gurmukhi: 'ਮ', name: 'Mamma',  pronunciation: 'M (as in man)',   example: 'ਮਨ',     exampleMeaning: 'mind' },
  { gurmukhi: 'ਯ', name: 'Yayya',  pronunciation: 'Y (as in yes)',   example: 'ਯੋਗ',    exampleMeaning: 'union with God' },
  { gurmukhi: 'ਰ', name: 'Rara',   pronunciation: 'R (as in run)',   example: 'ਰਾਮ',    exampleMeaning: 'Lord Rama / God' },
  { gurmukhi: 'ਲ', name: 'Lalla',  pronunciation: 'L (as in love)',  example: 'ਲਿਵ',    exampleMeaning: 'absorption in God' },
  { gurmukhi: 'ਵ', name: 'Vavva',  pronunciation: 'V/W (as in van)', example: 'ਵਾਹਿਗੁਰੂ', exampleMeaning: 'Wondrous Lord' },
  { gurmukhi: 'ੜ', name: 'Rarra',  pronunciation: 'Rr (retroflex r)', example: 'ਗੜ੍ਹ',  exampleMeaning: 'fortress' },
]

// The 10 Gurmukhi vowels (ਲਗਾਂ)
export const GURMUKHI_VOWELS: GurmukhiLetter[] = [
  { gurmukhi: 'ਾ', name: 'Aara',    pronunciation: 'aa (long a)',   example: 'ਨਾਮ', exampleMeaning: 'Name' },
  { gurmukhi: 'ਿ', name: 'Sihari',  pronunciation: 'i (short i)',   example: 'ਸਿਮਰਨ', exampleMeaning: 'remembrance' },
  { gurmukhi: 'ੀ', name: 'Bihari',  pronunciation: 'ee (long i)',   example: 'ਨੀਤਿ', exampleMeaning: 'policy' },
  { gurmukhi: 'ੁ', name: 'Onkar',   pronunciation: 'u (short u)',   example: 'ਸੁਖ', exampleMeaning: 'comfort' },
  { gurmukhi: 'ੂ', name: 'Dulenkar', pronunciation: 'oo (long u)', example: 'ਊਚ', exampleMeaning: 'exalted' },
  { gurmukhi: 'ੇ', name: 'Lavan',   pronunciation: 'e (as in say)', example: 'ਹੇ', exampleMeaning: 'O!' },
  { gurmukhi: 'ੈ', name: 'Dulaivan', pronunciation: 'ai (as in air)', example: 'ਕੈਸੇ', exampleMeaning: 'how' },
  { gurmukhi: 'ੋ', name: 'Hora',    pronunciation: 'o (as in go)',  example: 'ਸੋ', exampleMeaning: 'that' },
  { gurmukhi: 'ੌ', name: 'Kanaura', pronunciation: 'au (as in cow)', example: 'ਕੌਣ', exampleMeaning: 'who' },
  { gurmukhi: 'ੰ', name: 'Tippi',   pronunciation: 'n/m (nasal)',  example: 'ਸੰਤ', exampleMeaning: 'saint' },
]
