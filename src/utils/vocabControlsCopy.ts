import type { UiLocale, VocabKind } from '../types'

export const VOCAB_CONTROLS_COPY = {
  en: {
    search: 'Search words and phrases', all: 'All', word: 'Words', phrase: 'Phrases', filter: 'Saved item type',
    sort: 'Sort saved items', newest: 'Newest first', oldest: 'Oldest first',
    noMatches: 'No saved words or phrases match these filters.', clear: 'Clear filters',
    undo: 'Undo', removed: 'Removed from your saved words and phrases.', restored: 'Restored to your saved words and phrases.',
    storageWarning: 'Your change is kept for this session, but could not be saved on this device. Retry before closing the app.',
    retry: 'Retry saving', saved: 'Your changes are saved on this device.',
    remove: (kind: VocabKind, text: string) => `Remove ${kind === 'phrase' ? 'phrase' : 'word'}: ${text}`,
    cardCount: (index: number, total: number) => `${index} of ${total}`,
    matches: (count: number) => `${count} saved item${count === 1 ? '' : 's'}`,
  },
  pa: {
    search: 'ਸ਼ਬਦ ਅਤੇ ਵਾਕ ਖੋਜੋ', all: 'ਸਾਰੇ', word: 'ਸ਼ਬਦ', phrase: 'ਵਾਕ', filter: 'ਸੰਭਾਲੀ ਚੀਜ਼ ਦੀ ਕਿਸਮ',
    sort: 'ਸੰਭਾਲੀਆਂ ਚੀਜ਼ਾਂ ਦਾ ਕ੍ਰਮ', newest: 'ਨਵੇਂ ਪਹਿਲਾਂ', oldest: 'ਪੁਰਾਣੇ ਪਹਿਲਾਂ',
    noMatches: 'ਇਨ੍ਹਾਂ ਛਾਂਟਾਂ ਨਾਲ ਕੋਈ ਸੰਭਾਲਿਆ ਸ਼ਬਦ ਜਾਂ ਵਾਕ ਨਹੀਂ ਮਿਲਿਆ।', clear: 'ਛਾਂਟਾਂ ਸਾਫ਼ ਕਰੋ',
    undo: 'ਵਾਪਸ ਲਿਆਓ', removed: 'ਸੰਭਾਲੇ ਸ਼ਬਦਾਂ ਅਤੇ ਵਾਕਾਂ ਵਿੱਚੋਂ ਹਟਾਇਆ।', restored: 'ਸੰਭਾਲੇ ਸ਼ਬਦਾਂ ਅਤੇ ਵਾਕਾਂ ਵਿੱਚ ਵਾਪਸ ਲਿਆਂਦਾ।',
    storageWarning: 'ਇਹ ਬਦਲਾਅ ਇਸ ਸੈਸ਼ਨ ਲਈ ਰੱਖਿਆ ਹੈ, ਪਰ ਡਿਵਾਈਸ ਤੇ ਸੰਭਾਲਿਆ ਨਹੀਂ ਜਾ ਸਕਿਆ। ਐਪ ਬੰਦ ਕਰਨ ਤੋਂ ਪਹਿਲਾਂ ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
    retry: 'ਮੁੜ ਸੰਭਾਲੋ', saved: 'ਤੁਹਾਡੇ ਬਦਲਾਅ ਇਸ ਡਿਵਾਈਸ ਤੇ ਸੰਭਾਲੇ ਗਏ ਹਨ।',
    remove: (kind: VocabKind, text: string) => `${kind === 'phrase' ? 'ਵਾਕ' : 'ਸ਼ਬਦ'} ਹਟਾਓ: ${text}`,
    cardCount: (index: number, total: number) => `${total} ਵਿੱਚੋਂ ${index}`,
    matches: (count: number) => `${count} ਸੰਭਾਲੀਆਂ ਚੀਜ਼ਾਂ`,
  },
  hi: {
    search: 'शब्द और वाक्यांश खोजें', all: 'सभी', word: 'शब्द', phrase: 'वाक्यांश', filter: 'सहेजे आइटम का प्रकार',
    sort: 'सहेजे आइटम का क्रम', newest: 'नए पहले', oldest: 'पुराने पहले',
    noMatches: 'इन फ़िल्टर से कोई सहेजा शब्द या वाक्यांश नहीं मिला।', clear: 'फ़िल्टर हटाएँ',
    undo: 'वापस लाएँ', removed: 'सहेजे शब्दों और वाक्यांशों से हटा दिया।', restored: 'सहेजे शब्दों और वाक्यांशों में वापस रख दिया।',
    storageWarning: 'यह बदलाव इस सत्र में है, लेकिन डिवाइस पर सहेजा नहीं जा सका। ऐप बंद करने से पहले फिर कोशिश करें।',
    retry: 'फिर सहेजें', saved: 'आपके बदलाव इस डिवाइस पर सहेज दिए गए हैं।',
    remove: (kind: VocabKind, text: string) => `${kind === 'phrase' ? 'वाक्यांश' : 'शब्द'} हटाएँ: ${text}`,
    cardCount: (index: number, total: number) => `${total} में से ${index}`,
    matches: (count: number) => `${count} सहेजे आइटम`,
  },
} satisfies Record<UiLocale, object>
