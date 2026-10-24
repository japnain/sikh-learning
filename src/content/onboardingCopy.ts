import type { UiLocale } from '../types'

export const SAMPLE_ONBOARDING_LINE = {
  gurmukhi: 'ੴ ਸਤਿ ਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ',
  transliteration: 'ik oankaar sat naam kartaa purakh',
  meaning: {
    en: 'One Universal Creator. Truth is the Name. Creative Being.',
    pa: 'ਇੱਕ ਓਅੰਕਾਰ। ਸਤਿ ਨਾਮੁ। ਕਰਤਾ ਪੁਰਖੁ।',
    hi: 'एक ओंकार। सत्य नाम। करता पुरुष।',
  },
}

const english = {
  scriptTitle: 'Choose your script.',
  scriptBody: 'Gurbani will appear in this script throughout the app.',
  scriptNames: { gurmukhi: 'Gurmukhi', devanagari: 'Devanagari' },
  pronunciationTitle: 'Pronunciation help',
  pronunciationBody: 'Show Roman letters beneath Gurbani.',
  meaningTitle: 'Choose your meanings.',
  meaningBody: 'Shown beneath each line. Turn them off for Gurbani only.',
  meanings: { none: 'Off', en: 'English', pa: 'ਪੰਜਾਬੀ', hi: 'हिन्दी' },
  previewLabel: 'Reader preview',
  continue: 'Continue',
  start: 'Open NaamRas',
  save: 'Done',
  immediateChanges: 'Changes apply immediately. You can adjust them anytime.',
  back: 'Back',
  close: 'Close',
  saving: 'Saving…',
  completionError: 'Your setup couldn’t finish. Please try again.',
  footer: 'You can change these anytime in More.',
  step: 'Step',
  of: 'of',
}

export type OnboardingCopy = typeof english

const punjabi: OnboardingCopy = {
  scriptTitle: 'ਆਪਣੀ ਲਿਪੀ ਚੁਣੋ।',
  scriptBody: 'ਐਪ ਵਿੱਚ ਗੁਰਬਾਣੀ ਇਸ ਲਿਪੀ ਵਿੱਚ ਦਿਸੇਗੀ।',
  scriptNames: { gurmukhi: 'ਗੁਰਮੁਖੀ', devanagari: 'ਦੇਵਨਾਗਰੀ' },
  pronunciationTitle: 'ਉਚਾਰਨ ਲਈ ਸਹਾਇਤਾ',
  pronunciationBody: 'ਗੁਰਬਾਣੀ ਹੇਠ ਰੋਮਨ ਅੱਖਰਾਂ ਵਿੱਚ ਉਚਾਰਨ ਦਿਖਾਓ।',
  meaningTitle: 'ਅਰਥਾਂ ਦੀ ਭਾਸ਼ਾ ਚੁਣੋ।',
  meaningBody: 'ਹਰ ਤੁਕ ਹੇਠ ਅਰਥ ਦਿਸਣਗੇ। ਸਿਰਫ਼ ਗੁਰਬਾਣੀ ਲਈ ਬੰਦ ਕਰੋ।',
  meanings: { none: 'ਬੰਦ', en: 'English', pa: 'ਪੰਜਾਬੀ', hi: 'हिन्दी' },
  previewLabel: 'ਪਾਠ ਦੀ ਝਲਕ',
  continue: 'ਅੱਗੇ',
  start: 'ਨਾਮਰਸ ਖੋਲ੍ਹੋ',
  save: 'ਹੋ ਗਿਆ',
  immediateChanges: 'ਚੋਣਾਂ ਤੁਰੰਤ ਲਾਗੂ ਹੁੰਦੀਆਂ ਹਨ। ਤੁਸੀਂ ਇਨ੍ਹਾਂ ਨੂੰ ਕਿਸੇ ਵੀ ਸਮੇਂ ਬਦਲ ਸਕਦੇ ਹੋ।',
  back: 'ਪਿੱਛੇ',
  close: 'ਬੰਦ ਕਰੋ',
  saving: 'ਸੰਭਾਲਿਆ ਜਾ ਰਿਹਾ ਹੈ…',
  completionError: 'ਤਿਆਰੀ ਪੂਰੀ ਨਹੀਂ ਹੋ ਸਕੀ। ਕਿਰਪਾ ਕਰਕੇ ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
  footer: 'ਇਹ ਚੋਣਾਂ ਹੋਰ ਵਿੱਚ ਕਿਸੇ ਵੀ ਸਮੇਂ ਬਦਲ ਸਕਦੇ ਹੋ।',
  step: 'ਪੜਾਅ',
  of: 'ਵਿੱਚੋਂ',
}

const hindi: OnboardingCopy = {
  scriptTitle: 'अपनी लिपि चुनें।',
  scriptBody: 'ऐप में गुरबाणी इसी लिपि में दिखेगी।',
  scriptNames: { gurmukhi: 'गुरमुखी', devanagari: 'देवनागरी' },
  pronunciationTitle: 'उच्चारण में सहायता',
  pronunciationBody: 'गुरबाणी के नीचे रोमन अक्षरों में उच्चारण दिखाएँ।',
  meaningTitle: 'अर्थों की भाषा चुनें।',
  meaningBody: 'हर पंक्ति के नीचे अर्थ दिखेंगे। केवल गुरबाणी के लिए बंद करें।',
  meanings: { none: 'बंद', en: 'English', pa: 'ਪੰਜਾਬੀ', hi: 'हिन्दी' },
  previewLabel: 'पाठ की झलक',
  continue: 'आगे',
  start: 'नामरस खोलें',
  save: 'हो गया',
  immediateChanges: 'बदलाव तुरंत लागू होते हैं। आप इन्हें कभी भी बदल सकते हैं।',
  back: 'पीछे',
  close: 'बंद करें',
  saving: 'सहेजा जा रहा है…',
  completionError: 'तैयारी पूरी नहीं हो सकी। कृपया फिर कोशिश करें।',
  footer: 'इन विकल्पों को अधिक में कभी भी बदल सकते हैं।',
  step: 'चरण',
  of: 'में से',
}

const copyByLocale: Record<UiLocale, OnboardingCopy> = { en: english, pa: punjabi, hi: hindi }

export function getOnboardingCopy(locale: UiLocale): OnboardingCopy {
  return copyByLocale[locale]
}
