import type { UiLocale } from '../types'

type LocaleCopy = {
  nav: {
    home: string
    read: string
    learn: string
    saved: string
    more: string
  }
  onboarding: {
    eyebrow: string
    title: string
    body: string
    audience: string
    goal: string
    save: string
  }
  home: {
    promise: string
    greeting: string
  }
}

const UI_COPY: Record<UiLocale, LocaleCopy> = {
  en: {
    nav: {
      home: 'Home',
      read: 'Read',
      learn: 'Learn',
      saved: 'Saved',
      more: 'More',
    },
    onboarding: {
      eyebrow: 'Welcome',
      title: 'Set your reading defaults',
      body: 'Choose how Gurbani should open and how much support you want while learning.',
      audience: 'Audience',
      goal: 'Primary goal',
      save: 'Save Setup',
    },
    home: {
      promise: 'Read Gurbani daily. Understand it better. Grow into it steadily.',
      greeting: 'SatShriAkaal',
    },
  },
  pa: {
    nav: {
      home: 'ਘਰ',
      read: 'ਪੜ੍ਹੋ',
      learn: 'ਸਿੱਖੋ',
      saved: 'ਸੰਭਾਲਿਆ',
      more: 'ਹੋਰ',
    },
    onboarding: {
      eyebrow: 'ਜੀ ਆਇਆਂ ਨੂੰ',
      title: 'ਆਪਣੇ ਪੜ੍ਹਨ ਵਾਲੇ ਮੂਲ ਸੈੱਟ ਕਰੋ',
      body: 'ਚੁਣੋ ਕਿ ਗੁਰਬਾਣੀ ਕਿਵੇਂ ਖੁੱਲੇ ਅਤੇ ਸਿੱਖਣ ਵੇਲੇ ਕਿੰਨੀ ਮਦਦ ਦਿਖਾਈ ਜਾਵੇ।',
      audience: 'ਸਰੋਤਾ',
      goal: 'ਮੁੱਖ ਮਨੋਰਥ',
      save: 'ਸੈੱਟਅੱਪ ਸੰਭਾਲੋ',
    },
    home: {
      promise: 'ਰੋਜ਼ ਗੁਰਬਾਣੀ ਪੜ੍ਹੋ। ਵਧੇਰੇ ਸਮਝੋ। ਹੌਲੇ ਹੌਲੇ ਅੱਗੇ ਵਧੋ।',
      greeting: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ',
    },
  },
  hi: {
    nav: {
      home: 'होम',
      read: 'पढ़ें',
      learn: 'सीखें',
      saved: 'सहेजा',
      more: 'और',
    },
    onboarding: {
      eyebrow: 'स्वागत',
      title: 'अपनी पढ़ने की डिफॉल्ट सेटिंग चुनें',
      body: 'चुनिए कि गुरबाणी कैसे खुले और सीखते समय कितनी सहायता दिखे।',
      audience: 'श्रोता',
      goal: 'मुख्य लक्ष्य',
      save: 'सेटअप सेव करें',
    },
    home: {
      promise: 'रोज़ गुरबाणी पढ़ें। बेहतर समझें। धीरे धीरे आगे बढ़ें।',
      greeting: 'सत श्री अकाल',
    },
  },
}

export function getUiCopy(locale: UiLocale): LocaleCopy {
  return UI_COPY[locale]
}
