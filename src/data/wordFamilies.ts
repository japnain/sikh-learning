import type { WordFamily } from '../types'

export const WORD_FAMILIES: WordFamily[] = [
  {
    id: 'naam-root',
    root: 'ਨਾਮ',
    rootTransliteration: 'naam',
    rootMeaning: 'name; the Divine Name',
    theme: 'divine-names',
    relatedThemePathId: 'words-for-the-divine',
    members: [
      { gurmukhi: 'ਨਾਮੁ', transliteration: 'naam', meaning: 'the Name', exampleAng: 1 },
      { gurmukhi: 'ਨਾਮਿ', transliteration: 'naam', meaning: 'in the Name', exampleAng: 5 },
      { gurmukhi: 'ਨਾਮੇ', transliteration: 'naame', meaning: 'with names', exampleAng: 108 },
      { gurmukhi: 'ਸਤਿਨਾਮੁ', transliteration: 'satinaam', meaning: 'True Name', exampleAng: 1 },
    ],
  },
  {
    id: 'gur-root',
    root: 'ਗੁਰ',
    rootTransliteration: 'gur',
    rootMeaning: 'Guru; guidance',
    theme: 'guidance',
    relatedThemePathId: 'inside-the-nitnem',
    members: [
      { gurmukhi: 'ਗੁਰੂ', transliteration: 'guroo', meaning: 'Guru' },
      { gurmukhi: 'ਗੁਰਿ', transliteration: 'gur', meaning: 'through the Guru', exampleAng: 2 },
      { gurmukhi: 'ਗੁਰਮੁਖਿ', transliteration: 'gurmukh', meaning: 'Guru-facing one', exampleAng: 5 },
      { gurmukhi: 'ਗੁਰਪ੍ਰਸਾਦਿ', transliteration: 'gurprasaad', meaning: 'by Guru’s grace', exampleAng: 1 },
    ],
  },
  {
    id: 'kar-root',
    root: 'ਕਰ',
    rootTransliteration: 'kar',
    rootMeaning: 'do; make; create',
    theme: 'creation',
    relatedThemePathId: 'creation-and-time',
    members: [
      { gurmukhi: 'ਕਰਤਾ', transliteration: 'kartaa', meaning: 'creator / doer', exampleAng: 1 },
      { gurmukhi: 'ਕਰਿ', transliteration: 'kar', meaning: 'having done', exampleAng: 8 },
      { gurmukhi: 'ਕਰਮ', transliteration: 'karam', meaning: 'action / grace' },
      { gurmukhi: 'ਕਰਣੀ', transliteration: 'karanee', meaning: 'conduct / action' },
    ],
  },
  {
    id: 'bhagat-root',
    root: 'ਭਗਤ',
    rootTransliteration: 'bhagat',
    rootMeaning: 'devotion; devotee',
    theme: 'devotion',
    relatedThemePathId: 'language-of-devotion',
    members: [
      { gurmukhi: 'ਭਗਤਿ', transliteration: 'bhagat', meaning: 'devotion' },
      { gurmukhi: 'ਭਗਤ', transliteration: 'bhagat', meaning: 'devotee' },
      { gurmukhi: 'ਭਗਤਾ', transliteration: 'bhagataa', meaning: 'devotees' },
    ],
  },
  {
    id: 'hukam-root',
    root: 'ਹੁਕਮ',
    rootTransliteration: 'hukam',
    rootMeaning: 'order; command',
    theme: 'creation',
    relatedThemePathId: 'creation-and-time',
    members: [
      { gurmukhi: 'ਹੁਕਮੁ', transliteration: 'hukam', meaning: 'command / order', exampleAng: 1 },
      { gurmukhi: 'ਹੁਕਮਿ', transliteration: 'hukam', meaning: 'within Hukam', exampleAng: 1 },
      { gurmukhi: 'ਹੁਕਮੀ', transliteration: 'hukamee', meaning: 'the Commander', exampleAng: 1 },
    ],
  },
  {
    id: 'sat-root',
    root: 'ਸਤ',
    rootTransliteration: 'sat',
    rootMeaning: 'truth; true',
    theme: 'divine-names',
    relatedThemePathId: 'words-for-the-divine',
    members: [
      { gurmukhi: 'ਸਤਿ', transliteration: 'sat', meaning: 'truth', exampleAng: 1 },
      { gurmukhi: 'ਸਚੁ', transliteration: 'sach', meaning: 'true', exampleAng: 1 },
      { gurmukhi: 'ਸਤਿਨਾਮੁ', transliteration: 'satinaam', meaning: 'True Name', exampleAng: 1 },
    ],
  },
  {
    id: 'har-root',
    root: 'ਹਰ',
    rootTransliteration: 'har',
    rootMeaning: 'the Divine; remover',
    theme: 'divine-names',
    relatedThemePathId: 'words-for-the-divine',
    members: [
      { gurmukhi: 'ਹਰਿ', transliteration: 'har', meaning: 'the Divine' },
      { gurmukhi: 'ਹਰਿ ਨਾਮੁ', transliteration: 'har naam', meaning: 'the Divine Name' },
      { gurmukhi: 'ਹਰਿ ਜਨ', transliteration: 'har jan', meaning: 'servant of the Divine' },
    ],
  },
  {
    id: 'akal-root',
    root: 'ਅਕਾਲ',
    rootTransliteration: 'akaal',
    rootMeaning: 'beyond time',
    theme: 'creation',
    relatedThemePathId: 'creation-and-time',
    members: [
      { gurmukhi: 'ਅਕਾਲ', transliteration: 'akaal', meaning: 'timeless', exampleAng: 1 },
      { gurmukhi: 'ਅਕਾਲ ਮੂਰਤਿ', transliteration: 'akaal moorat', meaning: 'timeless form', exampleAng: 1 },
      { gurmukhi: 'ਅਕਾਲ ਪੁਰਖ', transliteration: 'akaal purakh', meaning: 'timeless being' },
    ],
  },
  {
    id: 'purakh-root',
    root: 'ਪੁਰਖ',
    rootTransliteration: 'purakh',
    rootMeaning: 'being; personified presence',
    theme: 'divine-names',
    relatedThemePathId: 'words-for-the-divine',
    members: [
      { gurmukhi: 'ਪੁਰਖੁ', transliteration: 'purakh', meaning: 'being', exampleAng: 1 },
      { gurmukhi: 'ਅਕਾਲ ਪੁਰਖ', transliteration: 'akaal purakh', meaning: 'timeless being' },
      { gurmukhi: 'ਕਰਤਾ ਪੁਰਖੁ', transliteration: 'kartaa purakh', meaning: 'creative being', exampleAng: 1 },
    ],
  },
  {
    id: 'simar-root',
    root: 'ਸਿਮਰ',
    rootTransliteration: 'simar',
    rootMeaning: 'remember; meditate',
    theme: 'devotion',
    relatedThemePathId: 'language-of-devotion',
    members: [
      { gurmukhi: 'ਸਿਮਰਿ', transliteration: 'simar', meaning: 'remembering' },
      { gurmukhi: 'ਸਿਮਰਨ', transliteration: 'simaran', meaning: 'remembrance' },
      { gurmukhi: 'ਸਿਮਰਉ', transliteration: 'simarau', meaning: 'I remember' },
    ],
  },
  {
    id: 'aradh-root',
    root: 'ਅਰਾਧ',
    rootTransliteration: 'araadh',
    rootMeaning: 'adore; worship',
    theme: 'devotion',
    relatedThemePathId: 'language-of-devotion',
    members: [
      { gurmukhi: 'ਅਰਾਧਨਾ', transliteration: 'araadhanaa', meaning: 'adoration' },
      { gurmukhi: 'ਅਰਾਧਿ', transliteration: 'araadh', meaning: 'worshipping' },
      { gurmukhi: 'ਅਰਾਧੇ', transliteration: 'araadhe', meaning: 'they adore' },
    ],
  },
  {
    id: 'nir-root',
    root: 'ਨਿਰ',
    rootTransliteration: 'nir',
    rootMeaning: 'without; free from',
    theme: 'divine-names',
    relatedThemePathId: 'words-for-the-divine',
    members: [
      { gurmukhi: 'ਨਿਰਭਉ', transliteration: 'nirbhau', meaning: 'without fear', exampleAng: 1 },
      { gurmukhi: 'ਨਿਰਵੈਰੁ', transliteration: 'nirvair', meaning: 'without hatred', exampleAng: 1 },
      { gurmukhi: 'ਨਿਰੰਕਾਰ', transliteration: 'nirankaar', meaning: 'formless' },
    ],
  },
  {
    id: 'bhau-root',
    root: 'ਭਉ',
    rootTransliteration: 'bhau',
    rootMeaning: 'fear; awe',
    theme: 'devotion',
    members: [
      { gurmukhi: 'ਭਉ', transliteration: 'bhau', meaning: 'fear / awe' },
      { gurmukhi: 'ਨਿਰਭਉ', transliteration: 'nirbhau', meaning: 'without fear', exampleAng: 1 },
      { gurmukhi: 'ਭਉਜਲ', transliteration: 'bhaujal', meaning: 'world-ocean of fear' },
    ],
  },
  {
    id: 'vair-root',
    root: 'ਵੈਰ',
    rootTransliteration: 'vair',
    rootMeaning: 'enmity',
    theme: 'devotion',
    members: [
      { gurmukhi: 'ਵੈਰੁ', transliteration: 'vair', meaning: 'enmity' },
      { gurmukhi: 'ਨਿਰਵੈਰੁ', transliteration: 'nirvair', meaning: 'without enmity', exampleAng: 1 },
      { gurmukhi: 'ਵੈਰੀ', transliteration: 'vairee', meaning: 'enemy' },
    ],
  },
  {
    id: 'sehaj-root',
    root: 'ਸਹਜ',
    rootTransliteration: 'sehaj',
    rootMeaning: 'natural ease; poise',
    theme: 'devotion',
    members: [
      { gurmukhi: 'ਸਹਜਿ', transliteration: 'sehaj', meaning: 'in natural ease' },
      { gurmukhi: 'ਸਹਜ', transliteration: 'sehaj', meaning: 'poise / ease' },
      { gurmukhi: 'ਸਹਜੇ', transliteration: 'sehaje', meaning: 'with natural ease' },
    ],
  },
  {
    id: 'anand-root',
    root: 'ਅਨੰਦ',
    rootTransliteration: 'anand',
    rootMeaning: 'bliss',
    theme: 'devotion',
    relatedThemePathId: 'inside-the-nitnem',
    members: [
      { gurmukhi: 'ਅਨੰਦੁ', transliteration: 'anand', meaning: 'bliss' },
      { gurmukhi: 'ਆਨੰਦ', transliteration: 'aanand', meaning: 'joy' },
      { gurmukhi: 'ਅਨੰਦ ਸਾਹਿਬ', transliteration: 'anand sahib', meaning: 'Anand Sahib' },
    ],
  },
  {
    id: 'charan-root',
    root: 'ਚਰਨ',
    rootTransliteration: 'charan',
    rootMeaning: 'feet; refuge',
    theme: 'devotion',
    members: [
      { gurmukhi: 'ਚਰਨ', transliteration: 'charan', meaning: 'feet' },
      { gurmukhi: 'ਚਰਣ ਕਮਲ', transliteration: 'charan kamal', meaning: 'lotus feet' },
      { gurmukhi: 'ਚਰਣੀ', transliteration: 'charanee', meaning: 'at the feet' },
    ],
  },
  {
    id: 'kirpa-root',
    root: 'ਕਿਰਪਾ',
    rootTransliteration: 'kirpaa',
    rootMeaning: 'grace',
    theme: 'devotion',
    members: [
      { gurmukhi: 'ਕਿਰਪਾ', transliteration: 'kirpaa', meaning: 'grace' },
      { gurmukhi: 'ਕਿਰਪਾਲ', transliteration: 'kirpaal', meaning: 'gracious one' },
      { gurmukhi: 'ਕਿਰਪਾ ਕਰਿ', transliteration: 'kirpaa kar', meaning: 'grant grace' },
    ],
  },
  {
    id: 'sabad-root',
    root: 'ਸਬਦ',
    rootTransliteration: 'sabad',
    rootMeaning: 'shabad; divine utterance',
    theme: 'inside-the-nitnem',
    relatedThemePathId: 'inside-the-nitnem',
    members: [
      { gurmukhi: 'ਸਬਦੁ', transliteration: 'sabad', meaning: 'the Word' },
      { gurmukhi: 'ਸਬਦੀ', transliteration: 'sabadee', meaning: 'through the Word' },
      { gurmukhi: 'ਸ਼ਬਦ', transliteration: 'shabad', meaning: 'utterance / hymn' },
    ],
  },
  {
    id: 'man-root',
    root: 'ਮਨ',
    rootTransliteration: 'man',
    rootMeaning: 'mind',
    theme: 'inside-the-nitnem',
    members: [
      { gurmukhi: 'ਮਨੁ', transliteration: 'man', meaning: 'mind' },
      { gurmukhi: 'ਮਨਸਾ', transliteration: 'mansaa', meaning: 'desire / intention' },
      { gurmukhi: 'ਮਨਮੁਖ', transliteration: 'manmukh', meaning: 'self-facing one' },
    ],
  },
  {
    id: 'mukh-root',
    root: 'ਮੁਖ',
    rootTransliteration: 'mukh',
    rootMeaning: 'face; orientation',
    theme: 'inside-the-nitnem',
    members: [
      { gurmukhi: 'ਮੁਖਿ', transliteration: 'mukh', meaning: 'by the mouth / in speech' },
      { gurmukhi: 'ਗੁਰਮੁਖਿ', transliteration: 'gurmukh', meaning: 'Guru-facing one', exampleAng: 5 },
      { gurmukhi: 'ਮਨਮੁਖ', transliteration: 'manmukh', meaning: 'self-facing one' },
    ],
  },
  {
    id: 'jan-root',
    root: 'ਜਨ',
    rootTransliteration: 'jan',
    rootMeaning: 'person; servant',
    theme: 'devotion',
    members: [
      { gurmukhi: 'ਜਨ', transliteration: 'jan', meaning: 'person / servant' },
      { gurmukhi: 'ਜਨਾ', transliteration: 'janaa', meaning: 'people / servants' },
      { gurmukhi: 'ਹਰਿ ਜਨ', transliteration: 'har jan', meaning: 'servant of the Divine' },
    ],
  },
  {
    id: 'preet-root',
    root: 'ਪ੍ਰੀਤ',
    rootTransliteration: 'preet',
    rootMeaning: 'love',
    theme: 'devotion',
    members: [
      { gurmukhi: 'ਪ੍ਰੀਤਿ', transliteration: 'preet', meaning: 'love' },
      { gurmukhi: 'ਪ੍ਰੀਤਮ', transliteration: 'preetam', meaning: 'beloved' },
      { gurmukhi: 'ਪ੍ਰੀਤਿ ਲਗਾਈ', transliteration: 'preet lagaaee', meaning: 'attached in love' },
    ],
  },
  {
    id: 'joat-root',
    root: 'ਜੋਤ',
    rootTransliteration: 'jot',
    rootMeaning: 'light',
    theme: 'divine-names',
    relatedThemePathId: 'words-for-the-divine',
    members: [
      { gurmukhi: 'ਜੋਤਿ', transliteration: 'jot', meaning: 'light' },
      { gurmukhi: 'ਜੋਤੀ', transliteration: 'jotee', meaning: 'lights' },
      { gurmukhi: 'ਪਰਜੋਤ', transliteration: 'parjot', meaning: 'supreme light' },
    ],
  },
  {
    id: 'akal-time-root',
    root: 'ਕਾਲ',
    rootTransliteration: 'kaal',
    rootMeaning: 'time; death',
    theme: 'creation',
    relatedThemePathId: 'creation-and-time',
    members: [
      { gurmukhi: 'ਕਾਲ', transliteration: 'kaal', meaning: 'time / death' },
      { gurmukhi: 'ਅਕਾਲ', transliteration: 'akaal', meaning: 'timeless', exampleAng: 1 },
      { gurmukhi: 'ਮਹਾਕਾਲ', transliteration: 'mahaakaal', meaning: 'great time / great death' },
    ],
  },
  {
    id: 'rach-root',
    root: 'ਰਚ',
    rootTransliteration: 'rach',
    rootMeaning: 'arrange; compose; create',
    theme: 'creation',
    relatedThemePathId: 'creation-and-time',
    members: [
      { gurmukhi: 'ਰਚਨਾ', transliteration: 'rachanaa', meaning: 'creation / arrangement' },
      { gurmukhi: 'ਰਚਿ', transliteration: 'rach', meaning: 'having fashioned' },
      { gurmukhi: 'ਰਚਿਆ', transliteration: 'rachiaa', meaning: 'created' },
    ],
  },
  {
    id: 'bakhsh-root',
    root: 'ਬਖਸ',
    rootTransliteration: 'bakhas',
    rootMeaning: 'forgive; bestow',
    theme: 'devotion',
    members: [
      { gurmukhi: 'ਬਖਸਿਸ਼', transliteration: 'bakhshish', meaning: 'gift / grace' },
      { gurmukhi: 'ਬਖਸਿ', transliteration: 'bakhas', meaning: 'forgive / bestow' },
      { gurmukhi: 'ਬਖਸੇ', transliteration: 'bakhase', meaning: 'bestowed' },
    ],
  },
  {
    id: 'saran-root',
    root: 'ਸਰਨ',
    rootTransliteration: 'saran',
    rootMeaning: 'refuge',
    theme: 'devotion',
    members: [
      { gurmukhi: 'ਸਰਨਿ', transliteration: 'saran', meaning: 'in refuge' },
      { gurmukhi: 'ਸਰਣਾਗਤਿ', transliteration: 'saranaagat', meaning: 'one who has taken refuge' },
      { gurmukhi: 'ਸਰਣ', transliteration: 'saran', meaning: 'refuge' },
    ],
  },
]

export const WORD_FAMILY_BY_ID = Object.fromEntries(
  WORD_FAMILIES.map(family => [family.id, family])
) as Record<string, WordFamily>

function normalizeWordKey(word: string): string {
  return word.replace(/[;,।॥.\s]/g, '').replace(/[\u200B-\u200D\uFEFF]/g, '')
}

export const WORD_FAMILY_BY_MEMBER_KEY = new Map<string, WordFamily>()

for (const family of WORD_FAMILIES) {
  WORD_FAMILY_BY_MEMBER_KEY.set(normalizeWordKey(family.root), family)
  for (const member of family.members) {
    WORD_FAMILY_BY_MEMBER_KEY.set(normalizeWordKey(member.gurmukhi), family)
  }
}

export function getWordFamilyForWord(word: string): WordFamily | null {
  return WORD_FAMILY_BY_MEMBER_KEY.get(normalizeWordKey(word)) ?? null
}
