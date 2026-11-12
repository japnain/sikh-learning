import type { UiLocale } from '../types'

export const WELCOME_COPY: Record<UiLocale, { eyebrow: string; title: string; body: string; begin: string; signup: string; signin: string; guest: string }> = {
  en: { eyebrow: 'Gurbani · Reflection · Daily practice', title: 'A little space for the sacred.', body: 'Read, listen and return to Gurbani. Make NaamRas your own, one quiet moment at a time.', begin: 'Begin reading', signup: 'Create account', signin: 'Sign in', guest: 'Free to read. An account is optional.' },
  pa: { eyebrow: 'ਗੁਰਬਾਣੀ · ਵਿਚਾਰ · ਰੋਜ਼ਾਨਾ ਅਭਿਆਸ', title: 'ਗੁਰਬਾਣੀ ਲਈ ਕੁਝ ਸਮਾਂ।', body: 'ਗੁਰਬਾਣੀ ਪੜ੍ਹੋ, ਸੁਣੋ ਅਤੇ ਉਸ ਨਾਲ ਜੁੜੋ। ਨਾਮਰਸ ਨੂੰ ਆਪਣੀ ਰੋਜ਼ਾਨਾ ਜ਼ਿੰਦਗੀ ਦਾ ਹਿੱਸਾ ਬਣਾਓ।', begin: 'ਪੜ੍ਹਨਾ ਸ਼ੁਰੂ ਕਰੋ', signup: 'ਖਾਤਾ ਬਣਾਓ', signin: 'ਸਾਈਨ ਇਨ', guest: 'ਪੜ੍ਹਨਾ ਮੁਫ਼ਤ ਹੈ। ਖਾਤਾ ਬਣਾਉਣਾ ਚੋਣਵਾਂ ਹੈ।' },
  hi: { eyebrow: 'गुरबाणी · विचार · दैनिक अभ्यास', title: 'गुरबाणी के लिए थोड़ा समय।', body: 'गुरबाणी पढ़ें, सुनें और उससे जुड़ें। नामरस को अपनी रोज़ की ज़िंदगी का हिस्सा बनाएँ।', begin: 'पढ़ना शुरू करें', signup: 'खाता बनाएँ', signin: 'साइन इन', guest: 'पढ़ना मुफ़्त है। खाता बनाना वैकल्पिक है।' },
}
