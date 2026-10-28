import type { UiLocale } from '../types'

export const SEARCH_SCOPES = ['all', 'gurbani', 'books', 'stories'] as const
export type SearchScope = typeof SEARCH_SCOPES[number]

export const READ_SEARCH_UI: Record<UiLocale, {
  scopes: Record<SearchScope, string>; scopeLabel: string; results: string; browse: string;
  exit: string; recover: (query: string) => string; metadataHint: string; openingStories: string;
  searchLabels: Record<SearchScope, string>; placeholders: Record<SearchScope, string>;
  emptyBody: Record<SearchScope, string>;
}> = {
  en: {
    scopes: { all: 'All', gurbani: 'Gurbani', books: 'Books', stories: 'Stories' },
    scopeLabel: 'Result type', results: 'Search results', browse: 'Browse collections',
    exit: 'Back to browsing', recover: query => `Return to “${query}”`,
    metadataHint: 'Find stories by title, person or theme.',
    openingStories: 'Opening the story collection…',
    searchLabels: { all: 'Search Gurbani, books and stories', gurbani: 'Search Gurbani', books: 'Search books', stories: 'Search stories' },
    placeholders: { all: 'Find a bani, book, story, or passage', gurbani: 'Gurbani, first letters, transliteration, or meaning', books: 'Book title, chapter, person, or phrase', stories: 'Story title, person, or theme' },
    emptyBody: { all: 'Try a bani name, book title, person, or simpler phrase.', gurbani: 'Try a full bani name, a Gurmukhi phrase, or a simpler spelling.', books: 'Try a book title, person, place, or a shorter phrase.', stories: 'Try a story title, person, or theme such as service.' },
  },
  pa: {
    scopes: { all: 'ਸਾਰੇ', gurbani: 'ਗੁਰਬਾਣੀ', books: 'ਕਿਤਾਬਾਂ', stories: 'ਸਾਖੀਆਂ' },
    scopeLabel: 'ਨਤੀਜੇ ਦੀ ਕਿਸਮ', results: 'ਖੋਜ ਦੇ ਨਤੀਜੇ', browse: 'ਸੰਗ੍ਰਹਿ ਵੇਖੋ',
    exit: 'ਸੰਗ੍ਰਹਿ ਵੱਲ ਵਾਪਸ', recover: query => `“${query}” ਵੱਲ ਵਾਪਸ`,
    metadataHint: 'ਸਿਰਲੇਖ, ਵਿਅਕਤੀ ਜਾਂ ਵਿਸ਼ੇ ਰਾਹੀਂ ਸਾਖੀਆਂ ਖੋਜੋ।',
    openingStories: 'ਸਾਖੀਆਂ ਦਾ ਸੰਗ੍ਰਹਿ ਖੁੱਲ੍ਹ ਰਿਹਾ ਹੈ…',
    searchLabels: { all: 'ਗੁਰਬਾਣੀ, ਕਿਤਾਬਾਂ ਅਤੇ ਸਾਖੀਆਂ ਖੋਜੋ', gurbani: 'ਗੁਰਬਾਣੀ ਖੋਜੋ', books: 'ਕਿਤਾਬਾਂ ਖੋਜੋ', stories: 'ਸਾਖੀਆਂ ਖੋਜੋ' },
    placeholders: { all: 'ਬਾਣੀ, ਕਿਤਾਬ, ਸਾਖੀ ਜਾਂ ਪਾਠ ਖੋਜੋ', gurbani: 'ਗੁਰਬਾਣੀ, ਪਹਿਲੇ ਅੱਖਰ, ਲਿਪਾਂਤਰ ਜਾਂ ਅਰਥ', books: 'ਕਿਤਾਬ, ਅਧਿਆਇ, ਵਿਅਕਤੀ ਜਾਂ ਵਾਕ', stories: 'ਸਾਖੀ ਦਾ ਸਿਰਲੇਖ, ਵਿਅਕਤੀ ਜਾਂ ਵਿਸ਼ਾ' },
    emptyBody: { all: 'ਬਾਣੀ, ਕਿਤਾਬ, ਵਿਅਕਤੀ ਜਾਂ ਛੋਟਾ ਵਾਕ ਅਜ਼ਮਾਓ।', gurbani: 'ਪੂਰਾ ਬਾਣੀ ਨਾਮ, ਗੁਰਮੁਖੀ ਵਾਕ ਜਾਂ ਸੌਖੀ ਵਰਤਨੀ ਅਜ਼ਮਾਓ।', books: 'ਕਿਤਾਬ ਦਾ ਨਾਮ, ਵਿਅਕਤੀ, ਥਾਂ ਜਾਂ ਛੋਟਾ ਵਾਕ ਅਜ਼ਮਾਓ।', stories: 'ਸਾਖੀ ਦਾ ਸਿਰਲੇਖ, ਵਿਅਕਤੀ ਜਾਂ ਸੇਵਾ ਵਰਗਾ ਵਿਸ਼ਾ ਅਜ਼ਮਾਓ।' },
  },
  hi: {
    scopes: { all: 'सभी', gurbani: 'गुरबाणी', books: 'किताबें', stories: 'साखियाँ' },
    scopeLabel: 'नतीजे का प्रकार', results: 'खोज के नतीजे', browse: 'संग्रह देखें',
    exit: 'संग्रह पर वापस', recover: query => `“${query}” पर वापस`,
    metadataHint: 'शीर्षक, व्यक्ति या विषय से साखियाँ खोजें।',
    openingStories: 'साखियों का संग्रह खुल रहा है…',
    searchLabels: { all: 'गुरबाणी, किताबें और साखियाँ खोजें', gurbani: 'गुरबाणी खोजें', books: 'किताबें खोजें', stories: 'साखियाँ खोजें' },
    placeholders: { all: 'बाणी, किताब, साखी या पाठ खोजें', gurbani: 'गुरबाणी, पहले अक्षर, लिप्यंतरण या अर्थ', books: 'किताब, अध्याय, व्यक्ति या वाक्य', stories: 'साखी का शीर्षक, व्यक्ति या विषय' },
    emptyBody: { all: 'बाणी, किताब, व्यक्ति या छोटा वाक्य आज़माएँ।', gurbani: 'पूरा बाणी नाम, गुरमुखी वाक्य या सरल वर्तनी आज़माएँ।', books: 'किताब का नाम, व्यक्ति, स्थान या छोटा वाक्य आज़माएँ।', stories: 'साखी का शीर्षक, व्यक्ति या सेवा जैसा विषय आज़माएँ।' },
  },
}
