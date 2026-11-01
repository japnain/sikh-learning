import type { UiLocale } from '../types'

interface StoryFindCopy {
  title: string
  description: string
  label: string
  placeholder: string
  hint: string
  empty: string
  clear: string
  results: string
  summary: (matches: number, passages: number) => string
  passage: (number: number) => string
}

export const STORY_FIND_UI: Record<UiLocale, StoryFindCopy> = {
  en: {
    title: 'Find in story',
    description: 'Find words in this story’s text. Choose a passage to continue reading there.',
    label: 'Find words in this story',
    placeholder: 'Word or phrase',
    hint: 'Enter a word or phrase to find it in this story.',
    empty: 'No matches in this story.',
    clear: 'Clear story search',
    results: 'Matching passages',
    summary: (matches, passages) => `${matches} ${matches === 1 ? 'match' : 'matches'} in ${passages} ${passages === 1 ? 'passage' : 'passages'}`,
    passage: number => `Go to passage ${number}`,
  },
  pa: {
    title: 'ਕਹਾਣੀ ਵਿੱਚ ਖੋਜੋ',
    description: 'ਇਸ ਕਹਾਣੀ ਦੀ ਲਿਖਤ ਵਿੱਚ ਸ਼ਬਦ ਲੱਭੋ। ਉੱਥੋਂ ਪੜ੍ਹਨ ਲਈ ਪੈਰਾ ਚੁਣੋ।',
    label: 'ਇਸ ਕਹਾਣੀ ਵਿੱਚ ਸ਼ਬਦ ਲੱਭੋ',
    placeholder: 'ਸ਼ਬਦ ਜਾਂ ਵਾਕ',
    hint: 'ਇਸ ਕਹਾਣੀ ਵਿੱਚ ਲੱਭਣ ਲਈ ਸ਼ਬਦ ਜਾਂ ਵਾਕ ਲਿਖੋ।',
    empty: 'ਇਸ ਕਹਾਣੀ ਵਿੱਚ ਕੋਈ ਮੇਲ ਨਹੀਂ ਮਿਲਿਆ।',
    clear: 'ਕਹਾਣੀ ਦੀ ਖੋਜ ਮਿਟਾਓ',
    results: 'ਮਿਲਦੇ ਪੈਰੇ',
    summary: (matches, passages) => `${passages} ਪੈਰਿਆਂ ਵਿੱਚ ${matches} ਮੇਲ`,
    passage: number => `ਪੈਰਾ ${number} ਉੱਤੇ ਜਾਓ`,
  },
  hi: {
    title: 'कहानी में खोजें',
    description: 'इस कहानी के पाठ में शब्द खोजें। वहाँ से पढ़ने के लिए अनुच्छेद चुनें।',
    label: 'इस कहानी में शब्द खोजें',
    placeholder: 'शब्द या वाक्यांश',
    hint: 'इस कहानी में खोजने के लिए शब्द या वाक्यांश लिखें।',
    empty: 'इस कहानी में कोई मिलान नहीं मिला।',
    clear: 'कहानी की खोज मिटाएँ',
    results: 'मिलते अनुच्छेद',
    summary: (matches, passages) => `${passages} अनुच्छेदों में ${matches} मिलान`,
    passage: number => `अनुच्छेद ${number} पर जाएँ`,
  },
}
