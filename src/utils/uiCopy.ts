import type { UiLocale } from '../types'

type LocaleCopy = {
  common: {
    on: string
    off: string
    selected: string
    tapToUse: string
    show: string
    hide: string
    small: string
    large: string
    copied: string
    back: string
    align: string
    of: string
  }
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
    readingScript: string
    meaning: string
    transliteration: string
    learningLevel: string
  }
  home: {
    promise: string
    greeting: string
    todaysHukamnama: string
    searchPlaceholder: string
    todaysPath: string
    shareProgress: string
    coreActionsDone: string
    read: string
    grow: string
    review: string
    keepGrowthActive: string
    reviewReady: string
    nitnemProgress: string
    dailyBanisComplete: string
    savedEyebrow: string
    savedTitle: string
    openSaved: string
    words: string
    phrases: string
    inProgress: string
    discoveryHistory: string
    inProgressBanis: string
    todaysPick: string
    noVerseAvailable: string
    recentlyStudied: string
    doReadingStep: string
    doGrowthStep: string
    doReviewStep: string
    coreLoopComplete: string
    coreLoopCompleteBody: string
  }
  more: {
    eyebrow: string
    title: string
    body: string
    productPromise: string
    promiseBody: string
    readerDefaults: string
    scriptLayoutTitle: string
    scriptLayoutDescription: string
    readingScript: string
    scriptSize: string
    readingSupportTitle: string
    readingSupportDescription: string
    transliteration: string
    larivaar: string
    vishraam: string
    meaningLanguage: string
    translationSourceTitle: string
    translationSourceDescription: string
    englishTranslation: string
    profileLanguage: string
    appLanguageTitle: string
    appLanguageDescription: string
    learningProfileTitle: string
    learningProfileDescription: string
    reopenOnHome: string
    grow: string
    openLearn: string
    growDescription: string
    about: string
    aboutBody: string
    aboutSource: string
    aboutTrust: string
  }
  study: {
    eyebrow: string
    introBody: string
    learnContext: string
    returnToLearn: string
    readerControls: string
    transliteration: string
    larivaar: string
    vishraam: string
    addNote: string
    saveBookmark: string
    hukamnamaSource: string
    goToSourceShabad: string
    exactSearchResult: string
    verse: string
    openFullShabad: string
  }
  library: {
    eyebrow: string
    title: string
    body: string
    sourceBrowsing: string
    sourceBrowsingBody: string
    savedSnapshot: string
    returnKeep: string
    bookmarks: string
    favorites: string
    phrases: string
    reviewBank: string
    reviewBankTitle: string
    resume: string
    resumeTitle: string
  }
}

const UI_COPY: Record<UiLocale, LocaleCopy> = {
  en: {
    common: {
      on: 'On',
      off: 'Off',
      selected: 'Selected',
      tapToUse: 'Tap to use',
      show: 'Show',
      hide: 'Hide',
      small: 'Small',
      large: 'Large',
      copied: 'Copied',
      back: 'Back',
      align: 'Align',
      of: 'of',
    },
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
      readingScript: 'Reading script',
      meaning: 'Meaning',
      transliteration: 'Transliteration',
      learningLevel: 'Learning level',
    },
    home: {
      promise: 'Read Gurbani daily. Understand it better. Grow into it steadily.',
      greeting: 'SatShriAkaal',
      todaysHukamnama: 'Today’s Hukamnama',
      searchPlaceholder: 'Search Gurbani, first letters, transliteration, or meaning',
      todaysPath: 'Today’s Path',
      shareProgress: 'Share progress',
      coreActionsDone: 'core actions done',
      read: 'Read',
      grow: 'Grow',
      review: 'Review',
      keepGrowthActive: 'Keep one guided step active so progress compounds over time.',
      reviewReady: 'Saved words and full phrases stay ready for short daily revision.',
      nitnemProgress: 'Nitnem Progress',
      dailyBanisComplete: 'daily banis complete',
      savedEyebrow: 'Saved',
      savedTitle: 'Keep what matters.',
      openSaved: 'Open Saved',
      words: 'Words',
      phrases: 'Phrases',
      inProgress: 'In Progress',
      discoveryHistory: 'Discovery & History',
      inProgressBanis: 'In-progress banis',
      todaysPick: 'Today’s pick',
      noVerseAvailable: 'No verse available today.',
      recentlyStudied: 'Recently studied',
      doReadingStep: 'Do reading step',
      doGrowthStep: 'Do growth step',
      doReviewStep: 'Do review step',
      coreLoopComplete: 'Today’s core loop is complete',
      coreLoopCompleteBody: 'You can revisit a journey, continue a bani, or leave the day with a clean streak.',
    },
    more: {
      eyebrow: 'More',
      title: 'Set the tone of the app.',
      body: 'The defaults here shape Home, Study, Hukamnama, and Learn. The app should feel deliberate, calm, and consistent every time you open it.',
      productPromise: 'Product Promise',
      promiseBody: 'Nitnem is being shaped as a mobile-first reading and learning companion, not a generic utility dashboard.',
      readerDefaults: 'Reader Defaults',
      scriptLayoutTitle: 'Script & Layout',
      scriptLayoutDescription: 'Choose the script, text size, spacing, and alignment that keep long reading comfortable.',
      readingScript: 'Reading script',
      scriptSize: 'Script size',
      readingSupportTitle: 'Reading Support',
      readingSupportDescription: 'Toggle the extra support layers that make the reader lighter or more guided.',
      transliteration: 'Transliteration',
      larivaar: 'Larivaar',
      vishraam: 'Vishraam',
      meaningLanguage: 'Meaning language',
      translationSourceTitle: 'Translation Source',
      translationSourceDescription: 'Keep one English source selected so the reader stays consistent.',
      englishTranslation: 'English translation',
      profileLanguage: 'Profile & App Language',
      appLanguageTitle: 'App Language',
      appLanguageDescription: 'This changes the app chrome and guidance copy, not the scripture text itself.',
      learningProfileTitle: 'Learning Profile',
      learningProfileDescription: 'This changes what Home recommends first and how Learn frames the path ahead.',
      reopenOnHome: 'Re-open first setup on Home',
      grow: 'Grow',
      openLearn: 'Open Learn',
      growDescription: 'Letters, recognition drills, Gurbani bridge, and mastery tracking',
      about: 'About',
      aboutBody: 'Nitnem is a Sikh scripture reading and learning app shaped around three pillars: Read, Understand, and Grow.',
      aboutSource: 'Scripture data is sourced from BaniDB v2. Recitation remains intentionally disabled until a working source exists.',
      aboutTrust: 'Source transparency and correction reporting are part of the trust layer. Until those flows are built, issues should be treated as product work, not hidden edge cases.',
    },
    study: {
      eyebrow: 'Understand',
      introBody: 'Comfortable reading first. Controls stay close, the text stays primary, and audio remains clearly marked until it is real.',
      learnContext: 'Learn Context',
      returnToLearn: 'Return to Learn',
      readerControls: 'Reader Controls',
      transliteration: 'Transliteration',
      larivaar: 'Larivaar',
      vishraam: 'Vishraam',
      addNote: 'Add a note...',
      saveBookmark: 'Save Bookmark',
      hukamnamaSource: 'Go to source shabad',
      goToSourceShabad: 'Go to source shabad',
      exactSearchResult: 'Exact Search Result',
      verse: 'Verse',
      openFullShabad: 'Open full shabad',
    },
    library: {
      eyebrow: 'Saved',
      title: 'Your reading shelf.',
      body: 'Keep bookmarks, saved words, saved phrases, and in-progress banis in one place. Scripture browsing stays available, but it no longer leads the product.',
      sourceBrowsing: 'Source Browsing',
      sourceBrowsingBody: 'Open scripture by ang or page when you need it.',
      savedSnapshot: 'Saved Snapshot',
      returnKeep: 'Return to what you want to keep.',
      bookmarks: 'Bookmarks',
      favorites: 'Favorites',
      phrases: 'Phrases',
      reviewBank: 'Review Bank',
      reviewBankTitle: 'Words and phrases in one review flow',
      resume: 'Resume',
      resumeTitle: 'Continue your current reading',
    },
  },
  pa: {
    common: {
      on: 'ਚਾਲੂ',
      off: 'ਬੰਦ',
      selected: 'ਚੁਣਿਆ',
      tapToUse: 'ਵਰਤਣ ਲਈ ਛੂਹੋ',
      show: 'ਦਿਖਾਓ',
      hide: 'ਲੁਕਾਓ',
      small: 'ਛੋਟਾ',
      large: 'ਵੱਡਾ',
      copied: 'ਕਾਪੀ ਹੋਇਆ',
      back: 'ਵਾਪਸ',
      align: 'ਸਰਖਾ',
      of: 'ਵਿੱਚੋਂ',
    },
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
      readingScript: 'ਪੜ੍ਹਨ ਦੀ ਲਿਪੀ',
      meaning: 'ਅਰਥ',
      transliteration: 'ਲਿਪਾਂਤਰ',
      learningLevel: 'ਸਿੱਖਣ ਦਾ ਪੱਧਰ',
    },
    home: {
      promise: 'ਰੋਜ਼ ਗੁਰਬਾਣੀ ਪੜ੍ਹੋ। ਵਧੇਰੇ ਸਮਝੋ। ਹੌਲੇ ਹੌਲੇ ਅੱਗੇ ਵਧੋ।',
      greeting: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ',
      todaysHukamnama: 'ਅੱਜ ਦਾ ਹੁਕਮਨਾਮਾ',
      searchPlaceholder: 'ਗੁਰਬਾਣੀ, ਪਹਿਲੇ ਅੱਖਰ, ਲਿਪਾਂਤਰ ਜਾਂ ਅਰਥ ਖੋਜੋ',
      todaysPath: 'ਅੱਜ ਦਾ ਰਸਤਾ',
      shareProgress: 'ਤਰੱਕੀ ਸਾਂਝੀ ਕਰੋ',
      coreActionsDone: 'ਮੁੱਖ ਕਦਮ ਪੂਰੇ',
      read: 'ਪੜ੍ਹੋ',
      grow: 'ਵਧੋ',
      review: 'ਦੁਹਰਾਈ',
      keepGrowthActive: 'ਇੱਕ ਮਾਰਗਦਰਸ਼ਿਤ ਕਦਮ ਰੋਜ਼ ਚਾਲੂ ਰੱਖੋ ਤਾਂ ਜੋ ਤਰੱਕੀ ਜੁੜਦੀ ਰਹੇ।',
      reviewReady: 'ਸੰਭਾਲੇ ਸ਼ਬਦ ਅਤੇ ਪੂਰੇ ਵਾਕ ਰੋਜ਼ਾਨਾ ਛੋਟੀ ਦੁਹਰਾਈ ਲਈ ਤਿਆਰ ਹਨ।',
      nitnemProgress: 'ਨਿਤਨੇਮ ਤਰੱਕੀ',
      dailyBanisComplete: 'ਰੋਜ਼ਾਨਾ ਬਾਣੀਆਂ ਪੂਰੀਆਂ',
      savedEyebrow: 'ਸੰਭਾਲਿਆ',
      savedTitle: 'ਜੋ ਮਹੱਤਵਪੂਰਨ ਹੈ ਉਸਨੂੰ ਸੰਭਾਲੋ।',
      openSaved: 'ਸੰਭਾਲਿਆ ਖੋਲ੍ਹੋ',
      words: 'ਸ਼ਬਦ',
      phrases: 'ਵਾਕ',
      inProgress: 'ਜਾਰੀ',
      discoveryHistory: 'ਖੋਜ ਅਤੇ ਇਤਿਹਾਸ',
      inProgressBanis: 'ਜਾਰੀ ਬਾਣੀਆਂ',
      todaysPick: 'ਅੱਜ ਦੀ ਚੋਣ',
      noVerseAvailable: 'ਅੱਜ ਕੋਈ ਸ਼ਬਦ ਉਪਲਬਧ ਨਹੀਂ।',
      recentlyStudied: 'ਹਾਲ ਹੀ ਵਿੱਚ ਪੜ੍ਹਿਆ',
      doReadingStep: 'ਪੜ੍ਹਨ ਵਾਲਾ ਕਦਮ ਕਰੋ',
      doGrowthStep: 'ਵਾਧੇ ਵਾਲਾ ਕਦਮ ਕਰੋ',
      doReviewStep: 'ਦੁਹਰਾਈ ਵਾਲਾ ਕਦਮ ਕਰੋ',
      coreLoopComplete: 'ਅੱਜ ਦਾ ਮੁੱਖ ਚੱਕਰ ਪੂਰਾ ਹੈ',
      coreLoopCompleteBody: 'ਤੁਸੀਂ ਕਿਸੇ ਯਾਤਰਾ ਤੇ ਮੁੜ ਸਕਦੇ ਹੋ, ਬਾਣੀ ਜਾਰੀ ਰੱਖ ਸਕਦੇ ਹੋ ਜਾਂ ਦਿਨ ਨੂੰ ਸਾਫ਼ ਲਕੀਰ ਨਾਲ ਮੁਕਾ ਸਕਦੇ ਹੋ।',
    },
    more: {
      eyebrow: 'ਹੋਰ',
      title: 'ਐਪ ਦਾ ਮਿਜ਼ਾਜ ਸੈੱਟ ਕਰੋ।',
      body: 'ਇੱਥੋਂ ਵਾਲੀਆਂ ਮੂਲ ਸੈਟਿੰਗਾਂ ਘਰ, ਅਧਿਐਨ, ਹੁਕਮਨਾਮਾ ਅਤੇ ਸਿੱਖੋ ਭਾਗ ਨੂੰ ਰੂਪ ਦੇਂਦੀਆਂ ਹਨ। ਐਪ ਹਰ ਵਾਰ ਖੁਲ੍ਹਣ ਤੇ ਸੰਤੁਲਿਤ, ਸ਼ਾਂਤ ਅਤੇ ਇਕਸਾਰ ਮਹਿਸੂਸ ਹੋਣੀ ਚਾਹੀਦੀ ਹੈ।',
      productPromise: 'ਉਤਪਾਦ ਵਚਨ',
      promiseBody: 'ਨਿਤਨੇਮ ਨੂੰ ਮੋਬਾਈਲ-ਪਹਿਲਾਂ ਪੜ੍ਹਨ ਅਤੇ ਸਿੱਖਣ ਦੇ ਸਾਥੀ ਵਾਂਗ ਬਣਾਇਆ ਜਾ ਰਿਹਾ ਹੈ, ਨਾ ਕਿ ਕਿਸੇ ਆਮ ਯੂਟਿਲਿਟੀ ਡੈਸ਼ਬੋਰਡ ਵਾਂਗ।',
      readerDefaults: 'ਪਾਠ ਮੂਲ ਸੈਟਿੰਗਾਂ',
      scriptLayoutTitle: 'ਲਿਪੀ ਅਤੇ ਲੇਆਉਟ',
      scriptLayoutDescription: 'ਉਹ ਲਿਪੀ, ਆਕਾਰ, ਅੰਤਰ ਅਤੇ ਸਰਖਾਈ ਚੁਣੋ ਜੋ ਲੰਬੇ ਪਾਠ ਨੂੰ ਆਰਾਮਦਾਇਕ ਰੱਖੇ।',
      readingScript: 'ਪੜ੍ਹਨ ਦੀ ਲਿਪੀ',
      scriptSize: 'ਲਿਪੀ ਦਾ ਆਕਾਰ',
      readingSupportTitle: 'ਪੜ੍ਹਨ ਸਹਾਇਤਾ',
      readingSupportDescription: 'ਉਹ ਪਰਤਾਂ ਚਾਲੂ ਜਾਂ ਬੰਦ ਕਰੋ ਜੋ ਪਾਠਕ ਨੂੰ ਹਲਕਾ ਜਾਂ ਵਧੇਰੇ ਮਾਰਗਦਰਸ਼ਿਤ ਬਣਾਉਂਦੀਆਂ ਹਨ।',
      transliteration: 'ਲਿਪਾਂਤਰ',
      larivaar: 'ਲੜੀਵਾਰ',
      vishraam: 'ਵਿਸ਼ਰਾਮ',
      meaningLanguage: 'ਅਰਥ ਦੀ ਭਾਸ਼ਾ',
      translationSourceTitle: 'ਅਨੁਵਾਦ ਸਰੋਤ',
      translationSourceDescription: 'ਇੱਕ ਅੰਗਰੇਜ਼ੀ ਸਰੋਤ ਚੁਣ ਕੇ ਰੱਖੋ ਤਾਂ ਜੋ ਪਾਠਕ ਇਕਸਾਰ ਰਹੇ।',
      englishTranslation: 'ਅੰਗਰੇਜ਼ੀ ਅਨੁਵਾਦ',
      profileLanguage: 'ਪ੍ਰੋਫ਼ਾਈਲ ਅਤੇ ਐਪ ਭਾਸ਼ਾ',
      appLanguageTitle: 'ਐਪ ਭਾਸ਼ਾ',
      appLanguageDescription: 'ਇਹ ਐਪ ਦੇ ਬਾਹਰੀ ਲੇਬਲ ਅਤੇ ਮਾਰਗਦਰਸ਼ਕ ਲਿਖਤ ਨੂੰ ਬਦਲਦਾ ਹੈ, ਗੁਰਬਾਣੀ ਦੇ ਮੂਲ ਪਾਠ ਨੂੰ ਨਹੀਂ।',
      learningProfileTitle: 'ਸਿੱਖਣ ਪ੍ਰੋਫ਼ਾਈਲ',
      learningProfileDescription: 'ਇਹ ਬਦਲਦਾ ਹੈ ਕਿ ਘਰ ਪਹਿਲਾਂ ਕੀ ਸੁਝਾਅ ਦਿੰਦਾ ਹੈ ਅਤੇ ਸਿੱਖੋ ਭਾਗ ਅੱਗੇ ਦਾ ਰਸਤਾ ਕਿਵੇਂ ਦਿਖਾਉਂਦਾ ਹੈ।',
      reopenOnHome: 'ਘਰ ਤੇ ਪਹਿਲਾ ਸੈੱਟਅੱਪ ਮੁੜ ਖੋਲ੍ਹੋ',
      grow: 'ਵਧੋ',
      openLearn: 'ਸਿੱਖੋ ਖੋਲ੍ਹੋ',
      growDescription: 'ਅੱਖਰ, ਪਛਾਣ ਅਭਿਆਸ, ਗੁਰਬਾਣੀ ਪੁਲ ਅਤੇ ਨਿਪੁੰਨਤਾ ਟਰੈਕਿੰਗ',
      about: 'ਬਾਰੇ',
      aboutBody: 'ਨਿਤਨੇਮ ਇੱਕ ਸਿੱਖ ਧਰਮਗ੍ਰੰਥ ਪੜ੍ਹਨ ਅਤੇ ਸਿੱਖਣ ਵਾਲੀ ਐਪ ਹੈ ਜੋ ਤਿੰਨ ਥੰਮ੍ਹਾਂ ਤੇ ਟਿਕੀ ਹੈ: ਪੜ੍ਹੋ, ਸਮਝੋ ਅਤੇ ਵਧੋ।',
      aboutSource: 'ਧਰਮਗ੍ਰੰਥ ਦਾ ਡਾਟਾ BaniDB v2 ਤੋਂ ਆਉਂਦਾ ਹੈ। ਸਹੀ ਸਰੋਤ ਉਪਲਬਧ ਹੋਣ ਤੱਕ ਪਾਠ ਆਵਾਜ਼ ਜਾਣਬੁੱਝ ਕੇ ਬੰਦ ਰੱਖੀ ਗਈ ਹੈ।',
      aboutTrust: 'ਸਰੋਤ ਪਾਰਦਰਸ਼ਤਾ ਅਤੇ ਸੁਧਾਰ ਰਿਪੋਰਟਿੰਗ ਭਰੋਸੇ ਦੀ ਪਰਤ ਦਾ ਹਿੱਸਾ ਹਨ। ਜਦ ਤੱਕ ਉਹ ਫਲੋ ਬਣਦੇ ਨਹੀਂ, ਮਸਲਿਆਂ ਨੂੰ ਛੁਪੇ ਹੋਏ ਕੋਨੇ ਨਹੀਂ ਸਗੋਂ ਉਤਪਾਦ ਕੰਮ ਸਮਝਿਆ ਜਾਣਾ ਚਾਹੀਦਾ ਹੈ।',
    },
    study: {
      eyebrow: 'ਸਮਝੋ',
      introBody: 'ਸਭ ਤੋਂ ਪਹਿਲਾਂ ਆਰਾਮਦਾਇਕ ਪਾਠ। ਨਿਯੰਤਰਣ ਨੇੜੇ ਰਹਿੰਦੇ ਹਨ, ਪਾਠ ਕੇਂਦਰ ਵਿੱਚ ਰਹਿੰਦਾ ਹੈ ਅਤੇ ਆਡੀਓ ਸਪਸ਼ਟ ਤੌਰ ਤੇ ਅਲੱਗ ਚਿੰਨ੍ਹਿਤ ਰਹਿੰਦਾ ਹੈ ਜਦ ਤੱਕ ਉਹ ਸੱਚਮੁੱਚ ਤਿਆਰ ਨਹੀਂ ਹੁੰਦਾ।',
      learnContext: 'ਸਿੱਖਣ ਸੰਦਰਭ',
      returnToLearn: 'ਸਿੱਖੋ ਵੱਲ ਵਾਪਸ',
      readerControls: 'ਪਾਠਕ ਨਿਯੰਤਰਣ',
      transliteration: 'ਲਿਪਾਂਤਰ',
      larivaar: 'ਲੜੀਵਾਰ',
      vishraam: 'ਵਿਸ਼ਰਾਮ',
      addNote: 'ਨੋਟ ਸ਼ਾਮਲ ਕਰੋ...',
      saveBookmark: 'ਬੁੱਕਮਾਰਕ ਸੰਭਾਲੋ',
      hukamnamaSource: 'ਮੂਲ ਸ਼ਬਦ ਤੇ ਜਾਓ',
      goToSourceShabad: 'ਮੂਲ ਸ਼ਬਦ ਤੇ ਜਾਓ',
      exactSearchResult: 'ਸਹੀ ਖੋਜ ਨਤੀਜਾ',
      verse: 'ਪੰਕਤੀ',
      openFullShabad: 'ਪੂਰਾ ਸ਼ਬਦ ਖੋਲ੍ਹੋ',
    },
    library: {
      eyebrow: 'ਸੰਭਾਲਿਆ',
      title: 'ਤੁਹਾਡੀ ਪੜ੍ਹਨ ਵਾਲੀ ਰੈਕ।',
      body: 'ਬੁੱਕਮਾਰਕ, ਸੰਭਾਲੇ ਸ਼ਬਦ, ਸੰਭਾਲੇ ਵਾਕ ਅਤੇ ਜਾਰੀ ਬਾਣੀਆਂ ਇਕ ਥਾਂ ਰੱਖੋ। ਧਰਮਗ੍ਰੰਥ ਬ੍ਰਾਊਜ਼ਿੰਗ ਉਪਲਬਧ ਰਹਿੰਦੀ ਹੈ, ਪਰ ਹੁਣ ਇਹ ਉਤਪਾਦ ਨੂੰ ਨੇਤ੍ਰਿਤਵ ਨਹੀਂ ਕਰਦੀ।',
      sourceBrowsing: 'ਸਰੋਤ ਬ੍ਰਾਊਜ਼ਿੰਗ',
      sourceBrowsingBody: 'ਜਦੋਂ ਲੋੜ ਹੋਵੇ ਤਾਂ ਅੰਗ ਜਾਂ ਸਫ਼ੇ ਰਾਹੀਂ ਗ੍ਰੰਥ ਖੋਲ੍ਹੋ।',
      savedSnapshot: 'ਸੰਭਾਲਿਆ ਦਰਸ਼ਨ',
      returnKeep: 'ਜੋ ਤੁਸੀਂ ਸੰਭਾਲਣਾ ਚਾਹੁੰਦੇ ਹੋ ਉਸ ਵੱਲ ਮੁੜੋ।',
      bookmarks: 'ਬੁੱਕਮਾਰਕ',
      favorites: 'ਮਨਪਸੰਦ',
      phrases: 'ਵਾਕ',
      reviewBank: 'ਦੁਹਰਾਈ ਬੈਂਕ',
      reviewBankTitle: 'ਸ਼ਬਦ ਅਤੇ ਵਾਕ ਇੱਕ ਹੀ ਦੁਹਰਾਈ ਰਸਤੇ ਵਿੱਚ',
      resume: 'ਜਾਰੀ ਰੱਖੋ',
      resumeTitle: 'ਆਪਣਾ ਮੌਜੂਦਾ ਪਾਠ ਜਾਰੀ ਰੱਖੋ',
    },
  },
  hi: {
    common: {
      on: 'चालू',
      off: 'बंद',
      selected: 'चयनित',
      tapToUse: 'इस्तेमाल करने के लिए टैप करें',
      show: 'दिखाएँ',
      hide: 'छुपाएँ',
      small: 'छोटा',
      large: 'बड़ा',
      copied: 'कॉपी हुआ',
      back: 'वापस',
      align: 'संरेखण',
      of: 'में से',
    },
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
      readingScript: 'पढ़ने की लिपि',
      meaning: 'अर्थ',
      transliteration: 'लिप्यंतरण',
      learningLevel: 'सीखने का स्तर',
    },
    home: {
      promise: 'रोज़ गुरबाणी पढ़ें। बेहतर समझें। धीरे धीरे आगे बढ़ें।',
      greeting: 'सत श्री अकाल',
      todaysHukamnama: 'आज का हुकमनामा',
      searchPlaceholder: 'गुरबाणी, पहले अक्षर, लिप्यंतरण या अर्थ खोजें',
      todaysPath: 'आज का मार्ग',
      shareProgress: 'प्रगति साझा करें',
      coreActionsDone: 'मुख्य कदम पूरे',
      read: 'पढ़ें',
      grow: 'बढ़ें',
      review: 'दोहराव',
      keepGrowthActive: 'एक मार्गदर्शित कदम रोज़ सक्रिय रखें ताकि प्रगति जुड़ती रहे।',
      reviewReady: 'सहेजे हुए शब्द और पूरे वाक्य रोज़ की छोटी पुनरावृत्ति के लिए तैयार हैं।',
      nitnemProgress: 'नितनेम प्रगति',
      dailyBanisComplete: 'दैनिक बाणियाँ पूरी',
      savedEyebrow: 'सहेजा',
      savedTitle: 'जो ज़रूरी है उसे संभालकर रखें।',
      openSaved: 'सहेजा खोलें',
      words: 'शब्द',
      phrases: 'वाक्यांश',
      inProgress: 'जारी',
      discoveryHistory: 'खोज और इतिहास',
      inProgressBanis: 'जारी बाणियाँ',
      todaysPick: 'आज की पसंद',
      noVerseAvailable: 'आज कोई पंक्ति उपलब्ध नहीं है।',
      recentlyStudied: 'हाल ही में पढ़ा',
      doReadingStep: 'पढ़ने का कदम करें',
      doGrowthStep: 'विकास का कदम करें',
      doReviewStep: 'दोहराव का कदम करें',
      coreLoopComplete: 'आज का मुख्य चक्र पूरा है',
      coreLoopCompleteBody: 'आप किसी यात्रा पर लौट सकते हैं, बाणी जारी रख सकते हैं, या दिन को साफ़ लय के साथ समाप्त कर सकते हैं।',
    },
    more: {
      eyebrow: 'और',
      title: 'ऐप का स्वर तय करें।',
      body: 'यहाँ की डिफॉल्ट सेटिंग्स होम, स्टडी, हुकमनामा और लर्न को आकार देती हैं। ऐप हर बार खुलने पर संतुलित, शांत और एकसार महसूस होना चाहिए।',
      productPromise: 'उत्पाद वादा',
      promiseBody: 'नितनेम को मोबाइल-प्रथम पढ़ने और सीखने के साथी की तरह बनाया जा रहा है, किसी सामान्य यूटिलिटी डैशबोर्ड की तरह नहीं।',
      readerDefaults: 'रीडर डिफॉल्ट्स',
      scriptLayoutTitle: 'लिपि और लेआउट',
      scriptLayoutDescription: 'वह लिपि, आकार, अंतर और संरेखण चुनिए जो लंबे पाठ को आरामदायक रखे।',
      readingScript: 'पढ़ने की लिपि',
      scriptSize: 'लिपि का आकार',
      readingSupportTitle: 'पढ़ने की सहायता',
      readingSupportDescription: 'उन अतिरिक्त परतों को चालू या बंद करें जो रीडर को हल्का या अधिक मार्गदर्शित बनाती हैं।',
      transliteration: 'लिप्यंतरण',
      larivaar: 'लड़ीवार',
      vishraam: 'विश्राम',
      meaningLanguage: 'अर्थ की भाषा',
      translationSourceTitle: 'अनुवाद स्रोत',
      translationSourceDescription: 'एक अंग्रेज़ी स्रोत चुना रखें ताकि रीडर एकसार रहे।',
      englishTranslation: 'अंग्रेज़ी अनुवाद',
      profileLanguage: 'प्रोफ़ाइल और ऐप भाषा',
      appLanguageTitle: 'ऐप भाषा',
      appLanguageDescription: 'यह ऐप के बाहरी लेबल और मार्गदर्शक कॉपी को बदलता है, मूल गुरबाणी पाठ को नहीं।',
      learningProfileTitle: 'सीखने की प्रोफ़ाइल',
      learningProfileDescription: 'यह बदलता है कि होम पहले क्या सुझाता है और लर्न आगे का रास्ता कैसे दिखाता है।',
      reopenOnHome: 'होम पर पहला सेटअप फिर से खोलें',
      grow: 'बढ़ें',
      openLearn: 'लर्न खोलें',
      growDescription: 'अक्षर, पहचान अभ्यास, गुरबाणी पुल और महारत ट्रैकिंग',
      about: 'परिचय',
      aboutBody: 'नितनेम एक सिख धर्मग्रंथ पढ़ने और सीखने की ऐप है जो तीन स्तंभों पर बनी है: पढ़ें, समझें और बढ़ें।',
      aboutSource: 'धर्मग्रंथ डेटा BaniDB v2 से लिया गया है। सही स्रोत मिलने तक पाठ-आवाज़ जानबूझकर बंद रखी गई है।',
      aboutTrust: 'स्रोत पारदर्शिता और सुधार रिपोर्टिंग भरोसे की परत का हिस्सा हैं। जब तक वे प्रवाह नहीं बनते, मुद्दों को छिपे हुए किनारे नहीं बल्कि उत्पाद कार्य माना जाना चाहिए।',
    },
    study: {
      eyebrow: 'समझें',
      introBody: 'सबसे पहले आरामदायक पढ़ना। नियंत्रण पास रहते हैं, पाठ केंद्र में रहता है और ऑडियो तब तक अलग चिन्हित रहता है जब तक वह वास्तव में तैयार न हो।',
      learnContext: 'सीखने का संदर्भ',
      returnToLearn: 'लर्न पर वापस जाएँ',
      readerControls: 'रीडर नियंत्रण',
      transliteration: 'लिप्यंतरण',
      larivaar: 'लड़ीवार',
      vishraam: 'विश्राम',
      addNote: 'नोट जोड़ें...',
      saveBookmark: 'बुकमार्क सेव करें',
      hukamnamaSource: 'मूल शबद पर जाएँ',
      goToSourceShabad: 'मूल शबद पर जाएँ',
      exactSearchResult: 'सटीक खोज परिणाम',
      verse: 'पंक्ति',
      openFullShabad: 'पूरा शबद खोलें',
    },
    library: {
      eyebrow: 'सहेजा',
      title: 'आपकी पढ़ने की शेल्फ़।',
      body: 'बुकमार्क, सहेजे हुए शब्द, सहेजे हुए वाक्यांश और जारी बाणियाँ एक ही जगह रखें। धर्मग्रंथ ब्राउज़िंग उपलब्ध रहती है, लेकिन अब वही उत्पाद का केंद्र नहीं है।',
      sourceBrowsing: 'स्रोत ब्राउज़िंग',
      sourceBrowsingBody: 'ज़रूरत पड़ने पर अंग या पृष्ठ से ग्रंथ खोलें।',
      savedSnapshot: 'सहेजा हुआ दृश्य',
      returnKeep: 'जिसे आप संभालकर रखना चाहते हैं, उसकी ओर लौटें।',
      bookmarks: 'बुकमार्क',
      favorites: 'पसंदीदा',
      phrases: 'वाक्यांश',
      reviewBank: 'रिव्यू बैंक',
      reviewBankTitle: 'शब्द और वाक्यांश एक ही रिव्यू प्रवाह में',
      resume: 'जारी रखें',
      resumeTitle: 'अपना मौजूदा पाठ जारी रखें',
    },
  },
}

export function getUiCopy(locale: UiLocale): LocaleCopy {
  return UI_COPY[locale]
}
