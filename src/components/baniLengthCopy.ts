import type { SundarGutkaLength, UiLocale } from '../types'
import type { SupportedSundarGutkaBaniId } from '../utils/sundarGutkaLength'
import type { BaniLengthDestination } from '../utils/baniLengthSelection'

interface BaniLengthCopy {
  title: string
  description: string
  change: (length: string) => string
  close: string
  current: string
  usual: string
  options: string
  checking: string
  unavailable: string
  empty: string
  retry: string
  remember: string
  readingOnly: string
  remembered: string
  apply: (length: string) => string
  applying: string
  failed: string
  preview: string
  previewLoading: string
  previewUnavailable: string
  opening: string
  ending: string
  source: string
  savedPreview: string
  destinationLoading: string
  destinationUnavailable: string
  destinations: Record<BaniLengthDestination['destination'], string>
  lengths: Record<SundarGutkaLength, string>
  banis: Record<SupportedSundarGutkaBaniId, string>
}

export const BANI_LENGTH_COPY: Record<UiLocale, BaniLengthCopy> = {
  en: {
    title: 'Bani length',
    description: 'Choose the text for this reading. Your usual Nitnem length changes only when you choose to update it.',
    change: length => `Change bani length: ${length}`,
    close: 'Close bani length',
    current: 'Current', usual: 'Usual', options: 'Available lengths',
    checking: 'Checking available lengths…',
    unavailable: 'Other lengths could not be checked. Your current reading is unchanged.',
    empty: 'No verified length choices are available right now.', retry: 'Retry',
    remember: 'Use for my Nitnem',
    readingOnly: 'For this reading only. Your usual length stays the same.',
    remembered: 'This becomes your usual length for this bani in Nitnem.',
    apply: length => `Read ${length.toLocaleLowerCase()}`,
    applying: 'Preparing reading…', failed: 'This length could not be opened. Please try again.',
    preview: 'See opening and ending text', previewLoading: 'Loading source text…',
    previewUnavailable: 'The source preview is unavailable. You can retry without changing your reading.',
    opening: 'Opening text', ending: 'Ending text', source: 'Text from this length’s BaniDB source.',
    savedPreview: 'Showing saved source text.',
    destinationLoading: 'Checking where this reading will open…',
    destinationUnavailable: 'Choose an available length to check where it will open.',
    destinations: { 'same-verse': 'Continue at the same verse in this length.', 'saved-place': 'Open this length at its saved place.', beginning: 'Start this length from its beginning.' },
    lengths: { short: 'Short', medium: 'Medium', long: 'Long', extralong: 'Extra long' },
    banis: { 'chaupai-sahib': 'Benati Chaupai Sahib', 'rehras-sahib': 'Rehras Sahib', aarti: 'Aarti', 'kirtan-sohila': 'Kirtan Sohila' },
  },
  pa: {
    title: 'ਬਾਣੀ ਦੀ ਲੰਬਾਈ',
    description: 'ਇਸ ਪਾਠ ਲਈ ਲਿਖਤ ਚੁਣੋ। ਨਿਤਨੇਮ ਦੀ ਆਮ ਲੰਬਾਈ ਸਿਰਫ਼ ਤੁਹਾਡੇ ਚੁਣਨ ਨਾਲ ਬਦਲੇਗੀ।',
    change: length => `ਬਾਣੀ ਦੀ ਲੰਬਾਈ ਬਦਲੋ: ${length}`,
    close: 'ਬਾਣੀ ਦੀ ਲੰਬਾਈ ਬੰਦ ਕਰੋ',
    current: 'ਮੌਜੂਦਾ', usual: 'ਆਮ', options: 'ਉਪਲਬਧ ਲੰਬਾਈਆਂ',
    checking: 'ਉਪਲਬਧ ਲੰਬਾਈਆਂ ਵੇਖੀਆਂ ਜਾ ਰਹੀਆਂ ਹਨ…',
    unavailable: 'ਹੋਰ ਲੰਬਾਈਆਂ ਦੀ ਜਾਂਚ ਨਹੀਂ ਹੋ ਸਕੀ। ਤੁਹਾਡਾ ਮੌਜੂਦਾ ਪਾਠ ਨਹੀਂ ਬਦਲਿਆ।',
    empty: 'ਇਸ ਵੇਲੇ ਤਸਦੀਕ ਕੀਤੀ ਲੰਬਾਈ ਉਪਲਬਧ ਨਹੀਂ ਹੈ।', retry: 'ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ',
    remember: 'ਮੇਰੇ ਨਿਤਨੇਮ ਲਈ ਵਰਤੋ',
    readingOnly: 'ਸਿਰਫ਼ ਇਸ ਪਾਠ ਲਈ। ਤੁਹਾਡੀ ਆਮ ਲੰਬਾਈ ਉਹੀ ਰਹੇਗੀ।',
    remembered: 'ਇਹ ਨਿਤਨੇਮ ਵਿੱਚ ਇਸ ਬਾਣੀ ਦੀ ਆਮ ਲੰਬਾਈ ਬਣੇਗੀ।',
    apply: length => `${length} ਪਾਠ ਪੜ੍ਹੋ`,
    applying: 'ਪਾਠ ਤਿਆਰ ਹੋ ਰਿਹਾ ਹੈ…', failed: 'ਇਹ ਪਾਠ ਨਹੀਂ ਖੁੱਲ੍ਹ ਸਕਿਆ। ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
    preview: 'ਆਰੰਭ ਅਤੇ ਅੰਤ ਦੀ ਲਿਖਤ ਵੇਖੋ', previewLoading: 'ਮੂਲ ਲਿਖਤ ਲੋਡ ਹੋ ਰਹੀ ਹੈ…',
    previewUnavailable: 'ਮੂਲ ਲਿਖਤ ਦੀ ਝਲਕ ਉਪਲਬਧ ਨਹੀਂ ਹੈ। ਆਪਣਾ ਪਾਠ ਬਦਲੇ ਬਿਨਾਂ ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
    opening: 'ਆਰੰਭ ਦੀ ਲਿਖਤ', ending: 'ਅੰਤ ਦੀ ਲਿਖਤ', source: 'ਇਸ ਲੰਬਾਈ ਦੇ BaniDB ਸਰੋਤ ਦੀ ਲਿਖਤ।',
    savedPreview: 'ਸੰਭਾਲੀ ਮੂਲ ਲਿਖਤ ਦਿਖਾਈ ਜਾ ਰਹੀ ਹੈ।',
    destinationLoading: 'ਪਾਠ ਕਿੱਥੋਂ ਖੁੱਲ੍ਹੇਗਾ, ਵੇਖਿਆ ਜਾ ਰਿਹਾ ਹੈ…',
    destinationUnavailable: 'ਪਾਠ ਕਿੱਥੋਂ ਖੁੱਲ੍ਹੇਗਾ, ਵੇਖਣ ਲਈ ਉਪਲਬਧ ਲੰਬਾਈ ਚੁਣੋ।',
    destinations: { 'same-verse': 'ਇਸੇ ਪੰਕਤੀ ਤੋਂ ਚੁਣੀ ਲੰਬਾਈ ਵਿੱਚ ਜਾਰੀ ਰਹੇਗਾ।', 'saved-place': 'ਚੁਣੀ ਲੰਬਾਈ ਦੀ ਸੰਭਾਲੀ ਥਾਂ ਤੋਂ ਖੁੱਲ੍ਹੇਗਾ।', beginning: 'ਚੁਣੀ ਲੰਬਾਈ ਸ਼ੁਰੂ ਤੋਂ ਖੁੱਲ੍ਹੇਗੀ।' },
    lengths: { short: 'ਛੋਟੀ', medium: 'ਦਰਮਿਆਨੀ', long: 'ਲੰਮੀ', extralong: 'ਵਧੇਰੇ ਲੰਮੀ' },
    banis: { 'chaupai-sahib': 'ਬੇਨਤੀ ਚੌਪਈ ਸਾਹਿਬ', 'rehras-sahib': 'ਰਹਿਰਾਸ ਸਾਹਿਬ', aarti: 'ਆਰਤੀ', 'kirtan-sohila': 'ਕੀਰਤਨ ਸੋਹਿਲਾ' },
  },
  hi: {
    title: 'बानी की लंबाई',
    description: 'इस पाठ की लिखावट चुनें। आपके चुनने पर ही नितनेम की सामान्य लंबाई बदलेगी।',
    change: length => `बानी की लंबाई बदलें: ${length}`,
    close: 'बानी की लंबाई बंद करें',
    current: 'वर्तमान', usual: 'सामान्य', options: 'उपलब्ध लंबाइयाँ',
    checking: 'उपलब्ध लंबाइयाँ देखी जा रही हैं…',
    unavailable: 'अन्य लंबाइयों की जाँच नहीं हो सकी। आपका वर्तमान पाठ नहीं बदला है।',
    empty: 'अभी कोई सत्यापित लंबाई उपलब्ध नहीं है।', retry: 'फिर कोशिश करें',
    remember: 'मेरे नितनेम के लिए उपयोग करें',
    readingOnly: 'केवल इस पाठ के लिए। आपकी सामान्य लंबाई वही रहेगी।',
    remembered: 'यह नितनेम में इस बानी की सामान्य लंबाई बनेगी।',
    apply: length => `${length} पाठ पढ़ें`,
    applying: 'पाठ तैयार हो रहा है…', failed: 'यह पाठ नहीं खुल सका। फिर कोशिश करें।',
    preview: 'आरंभ और अंत का पाठ देखें', previewLoading: 'मूल पाठ लोड हो रहा है…',
    previewUnavailable: 'मूल पाठ की झलक उपलब्ध नहीं है। अपना पाठ बदले बिना फिर कोशिश करें।',
    opening: 'आरंभ का पाठ', ending: 'अंत का पाठ', source: 'इस लंबाई के BaniDB स्रोत का पाठ।',
    savedPreview: 'सहेजा गया मूल पाठ दिखाया जा रहा है।',
    destinationLoading: 'पाठ कहाँ से खुलेगा, यह देखा जा रहा है…',
    destinationUnavailable: 'पाठ कहाँ से खुलेगा, यह देखने के लिए उपलब्ध लंबाई चुनें।',
    destinations: { 'same-verse': 'चुनी लंबाई में इसी पंक्ति से जारी रहेगा।', 'saved-place': 'चुनी लंबाई की सहेजी जगह से खुलेगा।', beginning: 'चुनी लंबाई शुरुआत से खुलेगी।' },
    lengths: { short: 'संक्षिप्त', medium: 'मध्यम', long: 'लंबी', extralong: 'अधिक लंबी' },
    banis: { 'chaupai-sahib': 'बेनती चौपई साहिब', 'rehras-sahib': 'रहिरास साहिब', aarti: 'आरती', 'kirtan-sohila': 'कीर्तन सोहिला' },
  },
}

export function getBaniLengthDestinationLabel(destination: BaniLengthDestination['destination'], locale: UiLocale): string {
  return BANI_LENGTH_COPY[locale].destinations[destination]
}
