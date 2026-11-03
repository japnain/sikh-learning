import type { SearchMode, UiLocale } from '../types'

export const PRIMARY_SEARCH_MODES = ['auto-detect', 'english', 'transliteration', 'gurmukhi'] as const

type IntentCopy = {
  label: string
  hint: string
  placeholder: string
  examples: readonly string[]
}

type SearchIntentCopy = {
  groupLabel: string
  examplesLabel: string
  submit: string
  clear: string
  modes: Record<SearchMode, IntentCopy>
}

export const SEARCH_INTENT_COPY: Record<UiLocale, SearchIntentCopy> = {
  en: {
    groupLabel: 'How to search Gurbani', examplesLabel: 'Search ideas', submit: 'Search', clear: 'Clear search text',
    modes: {
      'auto-detect': { label: 'Auto detect', hint: 'Search English meanings and transliteration together. Gurmukhi and ang numbers work too.', placeholder: 'A meaning, Gurbani phrase, or bani name', examples: ['compassion', 'hukam', 'ਸਤਿ ਨਾਮੁ'] },
      english: { label: 'English meaning', hint: 'Search a topic, word, or phrase in English translations. Related terms appear above the results.', placeholder: 'Try compassion, peace, or without fear', examples: ['compassion', 'peace', 'without fear'] },
      transliteration: { label: 'Transliteration', hint: 'Type Gurbani as it sounds in English letters.', placeholder: 'Try hukam or sat naam', examples: ['hukam', 'sat naam', 'waheguru'] },
      gurmukhi: { label: 'Gurmukhi', hint: 'Search a word or phrase written in Gurmukhi.', placeholder: 'Try ਸਤਿ ਨਾਮੁ or ਨਿਰਭਉ', examples: ['ਸਤਿ ਨਾਮੁ', 'ਨਿਰਭਉ', 'ਵਾਹਿਗੁਰੂ'] },
      'first-letters': { label: 'First Letters', hint: 'Enter the first Gurmukhi letter of each word, starting at the beginning of a line.', placeholder: 'For ਸੋਚੈ ਸੋਚਿ ਨ ਹੋਵਈ, type ਸਸਨਹ', examples: ['ਸਸਨਹ'] },
      'first-letters-anywhere': { label: 'Anywhere', hint: 'Enter the first Gurmukhi letters of consecutive words anywhere in a line.', placeholder: 'First letters of the words you remember', examples: ['ਸਸਨਹ'] },
      ang: { label: 'Ang / Vaar', hint: 'Enter an ang or vaar number, then choose its source.', placeholder: 'Ang or vaar number', examples: ['1', '8', '1430'] },
    },
  },
  pa: {
    groupLabel: 'ਗੁਰਬਾਣੀ ਖੋਜਣ ਦਾ ਢੰਗ', examplesLabel: 'ਖੋਜ ਦੀਆਂ ਉਦਾਹਰਨਾਂ', submit: 'ਖੋਜੋ', clear: 'ਖੋਜ ਦਾ ਪਾਠ ਮਿਟਾਓ',
    modes: {
      'auto-detect': { label: 'ਆਪਣੇ ਆਪ ਪਛਾਣੋ', hint: 'ਅੰਗਰੇਜ਼ੀ ਅਰਥ ਅਤੇ ਲਿਪਾਂਤਰ ਇਕੱਠੇ ਖੋਜੋ। ਗੁਰਮੁਖੀ ਜਾਂ ਅੰਗ ਨੰਬਰ ਵੀ ਲਿਖ ਸਕਦੇ ਹੋ।', placeholder: 'ਅਰਥ, ਗੁਰਬਾਣੀ ਦੀ ਤੁਕ ਜਾਂ ਬਾਣੀ ਦਾ ਨਾਮ', examples: ['compassion', 'hukam', 'ਸਤਿ ਨਾਮੁ'] },
      english: { label: 'ਅੰਗਰੇਜ਼ੀ ਅਰਥ', hint: 'ਅੰਗਰੇਜ਼ੀ ਅਨੁਵਾਦਾਂ ਵਿੱਚ ਵਿਸ਼ਾ, ਸ਼ਬਦ ਜਾਂ ਵਾਕ ਖੋਜੋ। ਸਬੰਧਤ ਸ਼ਬਦ ਨਤੀਜਿਆਂ ਦੇ ਉੱਪਰ ਦਿਖਾਏ ਜਾਂਦੇ ਹਨ।', placeholder: 'compassion, peace ਜਾਂ without fear', examples: ['compassion', 'peace', 'without fear'] },
      transliteration: { label: 'ਲਿਪਾਂਤਰ', hint: 'ਗੁਰਬਾਣੀ ਦਾ ਉਚਾਰਨ ਅੰਗਰੇਜ਼ੀ ਅੱਖਰਾਂ ਵਿੱਚ ਲਿਖੋ।', placeholder: 'hukam ਜਾਂ sat naam ਲਿਖੋ', examples: ['hukam', 'sat naam', 'waheguru'] },
      gurmukhi: { label: 'ਗੁਰਮੁਖੀ', hint: 'ਗੁਰਮੁਖੀ ਵਿੱਚ ਲਿਖਿਆ ਸ਼ਬਦ ਜਾਂ ਤੁਕ ਖੋਜੋ।', placeholder: 'ਸਤਿ ਨਾਮੁ ਜਾਂ ਨਿਰਭਉ ਲਿਖੋ', examples: ['ਸਤਿ ਨਾਮੁ', 'ਨਿਰਭਉ', 'ਵਾਹਿਗੁਰੂ'] },
      'first-letters': { label: 'ਪਹਿਲੇ ਅੱਖਰ', hint: 'ਤੁਕ ਦੇ ਸ਼ੁਰੂ ਤੋਂ ਹਰ ਸ਼ਬਦ ਦਾ ਪਹਿਲਾ ਗੁਰਮੁਖੀ ਅੱਖਰ ਲਿਖੋ।', placeholder: 'ਸੋਚੈ ਸੋਚਿ ਨ ਹੋਵਈ ਲਈ ਸਸਨਹ ਲਿਖੋ', examples: ['ਸਸਨਹ'] },
      'first-letters-anywhere': { label: 'ਕਿਤੇ ਵੀ', hint: 'ਤੁਕ ਵਿੱਚ ਕਿਤੇ ਵੀ ਆਉਂਦੇ ਲਗਾਤਾਰ ਸ਼ਬਦਾਂ ਦੇ ਪਹਿਲੇ ਗੁਰਮੁਖੀ ਅੱਖਰ ਲਿਖੋ।', placeholder: 'ਯਾਦ ਆਉਂਦੇ ਸ਼ਬਦਾਂ ਦੇ ਪਹਿਲੇ ਅੱਖਰ', examples: ['ਸਸਨਹ'] },
      ang: { label: 'ਅੰਗ / ਵਾਰ', hint: 'ਅੰਗ ਜਾਂ ਵਾਰ ਦਾ ਨੰਬਰ ਲਿਖੋ, ਫਿਰ ਸਰੋਤ ਚੁਣੋ।', placeholder: 'ਅੰਗ ਜਾਂ ਵਾਰ ਦਾ ਨੰਬਰ', examples: ['1', '8', '1430'] },
    },
  },
  hi: {
    groupLabel: 'गुरबाणी खोजने का तरीका', examplesLabel: 'खोज के उदाहरण', submit: 'खोजें', clear: 'खोज का पाठ मिटाएँ',
    modes: {
      'auto-detect': { label: 'अपने आप पहचानें', hint: 'अंग्रेज़ी अर्थ और लिप्यंतरण साथ खोजें। गुरमुखी या अंग संख्या भी लिख सकते हैं।', placeholder: 'अर्थ, गुरबाणी की पंक्ति या बाणी का नाम', examples: ['compassion', 'hukam', 'ਸਤਿ ਨਾਮੁ'] },
      english: { label: 'अंग्रेज़ी अर्थ', hint: 'अंग्रेज़ी अनुवादों में विषय, शब्द या वाक्य खोजें। संबंधित शब्द परिणामों के ऊपर दिखाए जाते हैं।', placeholder: 'compassion, peace या without fear', examples: ['compassion', 'peace', 'without fear'] },
      transliteration: { label: 'लिप्यंतरण', hint: 'गुरबाणी का उच्चारण अंग्रेज़ी अक्षरों में लिखें।', placeholder: 'hukam या sat naam लिखें', examples: ['hukam', 'sat naam', 'waheguru'] },
      gurmukhi: { label: 'गुरमुखी', hint: 'गुरमुखी में लिखा शब्द या पंक्ति खोजें।', placeholder: 'ਸਤਿ ਨਾਮੁ या ਨਿਰਭਉ लिखें', examples: ['ਸਤਿ ਨਾਮੁ', 'ਨਿਰਭਉ', 'ਵਾਹਿਗੁਰੂ'] },
      'first-letters': { label: 'पहले अक्षर', hint: 'पंक्ति के आरंभ से हर शब्द का पहला गुरमुखी अक्षर लिखें।', placeholder: 'ਸੋਚੈ ਸੋਚਿ ਨ ਹੋਵਈ के लिए ਸਸਨਹ लिखें', examples: ['ਸਸਨਹ'] },
      'first-letters-anywhere': { label: 'कहीं भी', hint: 'पंक्ति में कहीं भी आने वाले लगातार शब्दों के पहले गुरमुखी अक्षर लिखें।', placeholder: 'याद आने वाले शब्दों के पहले अक्षर', examples: ['ਸਸਨਹ'] },
      ang: { label: 'अंग / वार', hint: 'अंग या वार की संख्या लिखें, फिर स्रोत चुनें।', placeholder: 'अंग या वार की संख्या', examples: ['1', '8', '1430'] },
    },
  },
}
