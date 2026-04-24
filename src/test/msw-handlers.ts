import { http, HttpResponse } from 'msw'

function buildSource(id: 'G' | 'D' | 'R', english: string, pageNo: number | null = null) {
  return {
    id,
    sourceId: id,
    english,
    pageNo,
  }
}

function buildRaag(english: string, raagId = 1) {
  return {
    raagId,
    english,
  }
}

function buildWriter(english: string, writerId = 1) {
  return {
    writerId,
    english,
  }
}

const MOCK_VERSE_1 = {
  verseId: 1,
  shabadId: 1,
  verse: { unicode: 'ੴ ਸਤਿ ਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ' },
  larivaar: { unicode: 'ੴਸਤਿਨਾਮੁਕਰਤਾਪੁਰਖੁ' },
  transliteration: { english: 'ikOankaar sat naam kartaa purakh' },
  translation: {
    en: {
      bdb: 'One Universal Creator God. The Name Is Truth.',
      ms: 'There is but One God. True is His Name.',
      ssk: 'One Universal Creator God. The Name Is Truth.',
    },
    hi: {
      ss: 'एक ओंकार सतिनाम करता पुरख',
      sts: 'एक ओंकार सत्य नाम करता पुरख',
    },
    pu: {
      ss: { unicode: 'ਅਕਾਲ ਪੁਰਖ ਇੱਕ ਹੈ, ਜਿਸ ਦਾ ਨਾਮ ਸੱਚ ਹੈ' },
      ft: { unicode: 'ਇਕ ਅਕਾਲ ਪੁਰਖ ਹੈ ਜਿਸ ਦਾ ਨਾਮ ਸੱਚ ਹੈ' },
    },
  },
  visraam: {
    sttm: [{ p: 1, t: 'v' }],
    igurbani: [{ p: 2, t: 'v' }],
    sttm2: [{ p: 3, t: 'v' }],
  },
  pageNo: 1,
  source: buildSource('G', 'Sri Guru Granth Sahib Ji', 1),
  raag: buildRaag('Jap', 10),
  writer: buildWriter('Guru Nanak Dev Ji', 100),
}

const MOCK_VERSE_2 = {
  verseId: 2,
  shabadId: 1,
  verse: { unicode: 'ਨਿਰਭਉ ਨਿਰਵੈਰੁ ਅਕਾਲ ਮੂਰਤਿ' },
  larivaar: { unicode: 'ਨਿਰਭਉਨਿਰਵੈਰੁਅਕਾਲਮੂਰਤਿ' },
  transliteration: { english: 'nirbhau nirvair akaal moorat' },
  translation: {
    en: {
      bdb: 'No Fear. No Hatred. Image Of The Undying.',
      ms: 'Fearless and without hate, immortal in form.',
      ssk: 'No Fear. No Hatred. Image Of The Undying.',
    },
    hi: {
      ss: 'निर्भय निर्वैर अकाल मूरत',
      sts: 'निर्भउ निरवैर अकाल मूरत',
    },
    pu: {
      ss: { unicode: 'ਨਿਡਰ, ਵੈਰ ਰਹਿਤ, ਅਕਾਲ ਦੀ ਮੂਰਤ' },
      ft: { unicode: 'ਨਿਡਰ ਅਤੇ ਵੈਰ ਰਹਿਤ, ਅਕਾਲ ਦੀ ਮੂਰਤ' },
    },
  },
  visraam: {
    sttm: [{ p: 1, t: 'v' }],
    sttm2: [{ p: 2, t: 'v' }],
  },
  pageNo: 1,
  source: buildSource('G', 'Sri Guru Granth Sahib Ji', 1),
  raag: buildRaag('Jap', 10),
  writer: buildWriter('Guru Nanak Dev Ji', 100),
}

const MOCK_VERSE_3 = {
  verseId: 3,
  shabadId: 2,
  verse: { unicode: 'ਸੋਚੈ ਸੋਚਿ ਨ ਹੋਵਈ' },
  larivaar: { unicode: 'ਸੋਚੈਸੋਚਿਨਹੋਵਈ' },
  transliteration: { english: 'sochai soch na hovee' },
  translation: {
    en: {
      bdb: 'By thinking, He cannot be reduced to thought.',
      ms: 'By thought one can think Him not.',
      ssk: 'By thinking, He cannot be reduced to thought.',
    },
    hi: {
      ss: 'सोचने से वह सोचा नहीं जा सकता',
      sts: 'सोच से वह जाना नहीं जाता',
    },
    pu: {
      ss: { unicode: 'ਸੋਚਣ ਨਾਲ ਉਹ ਸੋਚਿਆ ਨਹੀਂ ਜਾ ਸਕਦਾ' },
      ft: { unicode: 'ਸੋਚ ਨਾਲ ਉਹ ਸਮਝਿਆ ਨਹੀਂ ਜਾ ਸਕਦਾ' },
    },
  },
  visraam: {
    igurbani: [{ p: 1, t: 'v' }],
  },
  pageNo: 1,
  source: buildSource('G', 'Sri Guru Granth Sahib Ji', 1),
  raag: buildRaag('Jap', 10),
  writer: buildWriter('Guru Nanak Dev Ji', 100),
}

export const MOCK_ANG_PAGE = [MOCK_VERSE_1, MOCK_VERSE_2, MOCK_VERSE_3]

export const MOCK_SHABAD_RESPONSE = {
  shabadInfo: {
    shabadId: 1,
    pageNo: 1,
    source: { sourceId: 'G', english: 'Sri Guru Granth Sahib Ji' },
    raag: { english: 'Jap' },
    writer: { english: 'Guru Nanak Dev Ji' },
  },
  verses: [
    {
      verseId: 1,
      shabadId: 1,
      pageNo: 1,
      verse: { unicode: 'ੴ ਸਤਿ ਨਾਮੁ' },
      larivaar: { unicode: 'ੴਸਤਿਨਾਮੁ' },
      transliteration: { english: 'ikOankaar sat naam' },
      translation: {
        en: {
          bdb: 'One Universal Creator God. Truth.',
          ms: 'There is but One God. Truth.',
          ssk: 'One Universal Creator God. Truth.',
        },
        hi: {
          ss: 'एक ओंकार सतिनाम',
          sts: 'एक ओंकार सत्य नाम',
        },
        pu: {
          ss: { unicode: 'ਇੱਕ ਅਕਾਲ ਪੁਰਖ। ਸੱਚ।' },
          ft: { unicode: 'ਇਕ ਅਕਾਲ ਪੁਰਖ। ਸੱਚ।' },
        },
      },
      visraam: {
        sttm: [{ p: 1, t: 'v' }],
        igurbani: [{ p: 2, t: 'v' }],
      },
      source: buildSource('G', 'Sri Guru Granth Sahib Ji', 1),
      raag: buildRaag('Jap', 10),
      writer: buildWriter('Guru Nanak Dev Ji', 100),
      words: [
        {
          word: { unicode: 'ੴ' },
          transliteration: { english: 'ikOankaar' },
          translation: {
            en: { bdb: 'One Universal Creator' },
            hi: { ss: 'एक ओंकार', sts: 'एकंकार' },
            pu: { ss: { unicode: 'ਇੱਕ ਅਕਾਲ ਪੁਰਖ' }, ft: { unicode: 'ਇਕ ਅਕਾਲ ਪੁਰਖ' } },
          },
        },
        {
          word: { unicode: 'ਸਤਿ' },
          transliteration: { english: 'sat' },
          translation: {
            en: { bdb: 'Truth' },
            hi: { ss: 'सत्य', sts: 'सत' },
            pu: { ss: { unicode: 'ਸੱਚ' }, ft: { unicode: 'ਸਤਿ' } },
          },
        },
      ],
    },
    {
      verseId: 2,
      shabadId: 1,
      pageNo: 1,
      verse: { unicode: 'ਕਰਤਾ ਪੁਰਖੁ ਨਿਰਭਉ' },
      larivaar: { unicode: 'ਕਰਤਾਪੁਰਖੁਨਿਰਭਉ' },
      transliteration: { english: 'karataa purakh nirabhau' },
      translation: {
        en: {
          bdb: 'Creative Being. No Fear.',
          ms: 'Creative being, beyond fear.',
          ssk: 'Creative Being. No Fear.',
        },
        hi: {
          ss: 'करता पुरख निर्भउ',
          sts: 'कर्ता पुरुष निर्भउ',
        },
        pu: {
          ss: { unicode: 'ਕਰਤਾ ਪੁਰਖ। ਨਿਰਭਉ।' },
          ft: { unicode: 'ਕਰਤਾ ਪੁਰਖ। ਨਿਡਰ।' },
        },
      },
      visraam: {
        sttm2: [{ p: 1, t: 'v' }],
      },
      source: buildSource('G', 'Sri Guru Granth Sahib Ji', 1),
      raag: buildRaag('Jap', 10),
      writer: buildWriter('Guru Nanak Dev Ji', 100),
      words: [],
    },
  ],
}

export const MOCK_SEARCH_RESPONSE = {
  verses: [
    {
      verseId: 100,
      shabadId: 50,
      source: buildSource('G', 'Sri Guru Granth Sahib Ji', 1402),
      verse: { unicode: 'ਵਾਹਿਗੁਰੂ ਵਾਹਿਗੁਰੂ' },
      larivaar: { unicode: 'ਵਾਹਿਗੁਰੂਵਾਹਿਗੁਰੂ' },
      transliteration: { english: 'vaahiguroo vaahiguroo' },
      translation: {
        en: { bdb: 'Waaheguru, Waaheguru' },
        hi: { ss: 'वाहेगुरु वाहेगुरु' },
        pu: { ss: { unicode: 'ਵਾਹਿਗੁਰੂ ਵਾਹਿਗੁਰੂ' } },
      },
      pageNo: 1402,
      raag: buildRaag('Raag Asa', 31),
      writer: buildWriter('Guru Arjan Dev Ji', 501),
    },
  ],
}

export const MOCK_ROMANIZED_SEARCH_RESPONSE = {
  verses: [
    {
      verseId: 101,
      shabadId: 51,
      source: buildSource('G', 'Sri Guru Granth Sahib Ji', 935),
      verse: { unicode: 'ਮਰਣੁ ਨ ਮੰਦਾ ਲੋਕਾ ਆਖੀਐ ਜੇ ਮਰਿ ਜਾਣੈ ਐਸਾ ਕੋਇ ॥' },
      larivaar: { unicode: 'ਮਰਣੁਨਮੰਦਾਲੋਕਾਆਖੀਐਜੇਮਰਿਜਾਣੈਐਸਾਕੋਇ॥' },
      transliteration: { english: 'maran na mandhaa lokaa aakheeai je mar jaanai aisaa koi' },
      translation: {
        en: { bdb: 'Death is not called bad when one knows how to die.' },
        hi: { ss: 'मरण बुरा नहीं कहा जाता।' },
        pu: { ss: { unicode: 'ਮਰਣਾ ਮੰਦਾ ਨਹੀਂ ਆਖਿਆ ਜਾਂਦਾ।' } },
      },
      pageNo: 935,
      raag: buildRaag('Raag Raamkalee', 40),
      writer: buildWriter('Guru Nanak Dev Ji', 100),
    },
  ],
}

export const MOCK_BANIS_INDEX = [
  { ID: 2, gurmukhiUni: 'ਜਪੁਜੀ ਸਾਹਿਬ', transliterations: { english: 'japujee saahib' } },
  { ID: 4, gurmukhiUni: 'ਜਾਪੁ ਸਾਹਿਬ', transliterations: { english: 'jaap saahib' } },
  { ID: 6, gurmukhiUni: 'ਤ੍ਵ ਪ੍ਰਸਾਦਿ ਸਵੱਯੇ ਸ੍ਰਾਵਗ ਸੁੱਧ', transliterations: { english: 'tavai prasaadh savaye sraavag sudh' } },
  { ID: 9, gurmukhiUni: 'ਬੇਨਤੀ ਚੌਪਈ ਸਾਹਿਬ', transliterations: { english: 'benatee chauapiee saahib' } },
  { ID: 10, gurmukhiUni: 'ਅਨੰਦੁ ਸਾਹਿਬ', transliterations: { english: 'anandh saahib' } },
  { ID: 11, gurmukhiUni: 'ਲਾਵਾਂ', transliterations: { english: 'laavaan' } },
  { ID: 24, gurmukhiUni: 'ਅਰਦਾਸ', transliterations: { english: 'aradhaas' } },
  { ID: 21, gurmukhiUni: 'ਰਹਰਾਸਿ ਸਾਹਿਬ', transliterations: { english: 'raharaas saahib' } },
  { ID: 22, gurmukhiUni: 'ਆਰਤੀ', transliterations: { english: 'aaratee' } },
  { ID: 23, gurmukhiUni: 'ਸੋਹਿਲਾ ਸਾਹਿਬ', transliterations: { english: 'sohilaa saahib' } },
  { ID: 30, gurmukhiUni: 'ਸਲੋਕ ਮਹਲਾ ੯', transliterations: { english: 'salok mahalaa nauvaa' } },
  { ID: 31, gurmukhiUni: 'ਸੁਖਮਨੀ ਸਾਹਿਬ', transliterations: { english: 'sukhamanee saahib' } },
  { ID: 90, gurmukhiUni: 'ਆਸਾ ਦੀ ਵਾਰ', transliterations: { english: 'aasaa dhee vaar' } },
  { ID: 33, gurmukhiUni: 'ਬਾਵਨ ਅਖਰੀ', transliterations: { english: 'baavan akharee' } },
]

export const MOCK_BANI_RESPONSE = {
  verses: [
    {
      verseId: 1,
      shabadId: 1,
      verse: { unicode: 'ੴ ਸਤਿ ਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ' },
      larivaar: { unicode: 'ੴਸਤਿਨਾਮੁਕਰਤਾਪੁਰਖੁ' },
      transliteration: { english: 'ikOankaar sat naam kartaa purakh' },
      translation: {
        en: {
          bdb: 'One Universal Creator God. The Name Is Truth.',
          ms: 'There is but One God. True is His Name.',
          ssk: 'One Universal Creator God. The Name Is Truth.',
        },
        hi: {
          ss: 'एक ओंकार सतिनाम करता पुरख',
          sts: 'एक ओंकार सत्य नाम करता पुरख',
        },
        pu: {
          ss: { unicode: 'ਅਕਾਲ ਪੁਰਖ ਇੱਕ ਹੈ, ਜਿਸ ਦਾ ਨਾਮ ਸੱਚ ਹੈ' },
          ft: { unicode: 'ਇਕ ਅਕਾਲ ਪੁਰਖ ਹੈ ਜਿਸ ਦਾ ਨਾਮ ਸੱਚ ਹੈ' },
        },
      },
      visraam: {
        sttm: [{ p: 1, t: 'v' }],
        igurbani: [{ p: 2, t: 'v' }],
      },
      pageNo: 1,
      source: buildSource('G', 'Sri Guru Granth Sahib Ji', 1),
      raag: buildRaag('Jap', 10),
      writer: buildWriter('Guru Nanak Dev Ji', 100),
    },
    {
      verseId: 2,
      shabadId: 2,
      verse: { unicode: 'ਸੋਚੈ ਸੋਚਿ ਨ ਹੋਵਈ' },
      larivaar: { unicode: 'ਸੋਚੈਸੋਚਿਨਹੋਵਈ' },
      transliteration: { english: 'sochai soch na hovee' },
      translation: {
        en: {
          bdb: 'By thinking, He cannot be reduced to thought.',
          ms: 'By thought one can think Him not.',
          ssk: 'By thinking, He cannot be reduced to thought.',
        },
        hi: {
          ss: 'सोचने से वह सोचा नहीं जा सकता',
          sts: 'सोच से वह जाना नहीं जाता',
        },
        pu: {
          ss: { unicode: 'ਸੋਚਣ ਨਾਲ ਉਹ ਸੋਚਿਆ ਨਹੀਂ ਜਾ ਸਕਦਾ' },
          ft: { unicode: 'ਸੋਚ ਨਾਲ ਉਹ ਸਮਝਿਆ ਨਹੀਂ ਜਾ ਸਕਦਾ' },
        },
      },
      visraam: {
        sttm2: [{ p: 1, t: 'v' }],
      },
      pageNo: 2,
      source: buildSource('G', 'Sri Guru Granth Sahib Ji', 2),
      raag: buildRaag('Jap', 10),
      writer: buildWriter('Guru Nanak Dev Ji', 100),
    },
  ],
}

function createBaniTranslation(label: string) {
  return {
    en: {
      bdb: label,
      ms: label,
      ssk: label,
    },
    hi: { ss: label, sts: `${label} (STS)` },
    pu: {
      ss: { unicode: label },
      ft: { unicode: `${label} (FT)` },
    },
  }
}

function createStructuredBaniVerse({
  verseId,
  shabadId,
  unicode,
  transliteration,
  pageNo,
  source = 'G',
  existsSGPC,
  existsMedium,
  existsTaksal,
  existsBuddhaDal,
  header,
}: {
  verseId: number
  shabadId: number
  unicode: string
  transliteration: string
  pageNo: number | null
  source?: 'G' | 'D'
  existsSGPC?: number
  existsMedium?: number
  existsTaksal?: number
  existsBuddhaDal?: number
  header?: number
}) {
  return {
    ...(typeof header === 'number' ? { header } : {}),
    ...(typeof existsSGPC === 'number' ? { existsSGPC } : {}),
    ...(typeof existsMedium === 'number' ? { existsMedium } : {}),
    ...(typeof existsTaksal === 'number' ? { existsTaksal } : {}),
    ...(typeof existsBuddhaDal === 'number' ? { existsBuddhaDal } : {}),
    verse: {
      verseId,
      shabadId,
      verse: { unicode },
      larivaar: { unicode: unicode.replace(/\s+/g, '') },
      transliteration: { english: transliteration },
      translation: createBaniTranslation(unicode),
      pageNo,
      source: buildSource(source, source === 'G' ? 'Sri Guru Granth Sahib Ji' : 'Dasam Granth', pageNo),
      raag: buildRaag(source === 'G' ? 'Raag Asa' : 'Dasam Bani', source === 'G' ? 31 : 201),
      writer: buildWriter(source === 'G' ? 'Guru Arjan Dev Ji' : 'Guru Gobind Singh Ji', source === 'G' ? 501 : 701),
    },
  }
}

export const MOCK_ARDAAS_BANI_RESPONSE = {
  verses: [
    {
      verseId: 2401,
      shabadId: 24,
      verse: { unicode: 'ਏਕ ਓਅੰਕਾਰ ਵਾਹਿਗੁਰੂ ਜੀ ਕੀ ਫਤਹ ॥' },
      transliteration: { english: 'ek oa(n)kaar vaahiguroo jee kee fateh ||' },
      translation: {
        en: {
          bdb: 'One Universal Creator. Victory belongs to Waheguru.',
          ms: 'The One Divine. Victory belongs to Waheguru.',
          ssk: 'One Universal Creator. Victory belongs to Waheguru.',
        },
        hi: { ss: 'एक ओअंकार। वाहेगुरु जी की फतेह।' },
        pu: { ss: { unicode: 'ਇੱਕ ਓਅੰਕਾਰ। ਵਾਹਿਗੁਰੂ ਜੀ ਕੀ ਫਤਹ।' } },
      },
      pageNo: 1,
      source: { id: 'G' },
    },
    {
      verseId: 2402,
      shabadId: 24,
      verse: { unicode: 'ਸ੍ਰੀ ਭਗੌਤੀ ਜੀ ਸਹਾਇ ॥' },
      transliteration: { english: 'sree bhagautee jee sahaaei ||' },
      translation: {
        en: {
          bdb: 'May the Divine Power help us.',
          ms: 'May the Divine Power assist us.',
          ssk: 'May the Divine Power help us.',
        },
        hi: { ss: 'श्री भगौती जी सहायता करें।' },
        pu: { ss: { unicode: 'ਸ੍ਰੀ ਭਗੌਤੀ ਜੀ ਸਹਾਇ ਹੋਣ।' } },
      },
      pageNo: 1,
      source: { id: 'G' },
    },
  ],
}

export const MOCK_REHRAS_BANI_RESPONSE = {
  verses: [
    createStructuredBaniVerse({
      verseId: 2628,
      shabadId: 21,
      unicode: 'ਰਹਰਾਸਿ ਸਾਹਿਬ',
      transliteration: 'raharaas saahib',
      pageNo: null,
      header: 1,
      existsTaksal: 1,
      existsBuddhaDal: 1,
    }),
    createStructuredBaniVerse({
      verseId: 2629,
      shabadId: 21,
      unicode: 'ਸਲੋਕ ਮਃ ੧ ॥',
      transliteration: 'salok mahalaa pehilaa ||',
      pageNo: null,
      existsBuddhaDal: 1,
    }),
    createStructuredBaniVerse({
      verseId: 2630,
      shabadId: 21,
      unicode: 'ਧੰਨੁ ਸੁ ਕਾਗਦੁ ਕਲਮ ਧੰਨੁ ਧਨ ਭਾਂਡਾ ਧਨੁ ਮਸੁ ॥',
      transliteration: 'dha(n)nu su kaagadh kalam dha(n)nu dhan bhaa(n)ddaa dhan mas ||',
      pageNo: null,
      existsBuddhaDal: 1,
    }),
    createStructuredBaniVerse({
      verseId: 2631,
      shabadId: 21,
      unicode: 'ਹਰਿ ਜੁਗੁ ਜੁਗੁ ਭਗਤ ਉਪਾਇਆ ਪੈਜ ਰਖਦਾ ਆਇਆ ਰਾਮ ਰਾਜੇ ॥',
      transliteration: 'har jug jug bhagat upaiaa paij rakhadhaa aaiaa raam raaje ||',
      pageNo: 8,
      source: 'G',
      existsTaksal: 1,
      existsBuddhaDal: 1,
    }),
    createStructuredBaniVerse({
      verseId: 2632,
      shabadId: 21,
      unicode: 'ੴ ਸਤਿਗੁਰ ਪ੍ਰਸਾਦਿ ॥',
      transliteration: 'ik oa(n)kaar satigur prasaadh ||',
      pageNo: 8,
      source: 'G',
      existsSGPC: 1,
      existsMedium: 1,
      existsTaksal: 1,
      existsBuddhaDal: 1,
    }),
    createStructuredBaniVerse({
      verseId: 2633,
      shabadId: 21,
      unicode: 'ਸੋ ਦਰੁ ਤੇਰਾ ਕੇਹਾ ਸੋ ਘਰੁ ਕੇਹਾ ਜਿਤੁ ਬਹਿ ਸਰਬ ਸਮਾਲੇ ॥',
      transliteration: 'so dhar teraa kehaa so ghar kehaa jit beh sarab samaale ||',
      pageNo: 8,
      source: 'G',
      existsSGPC: 1,
      existsMedium: 1,
      existsTaksal: 1,
      existsBuddhaDal: 1,
    }),
    createStructuredBaniVerse({
      verseId: 2634,
      shabadId: 21,
      unicode: 'ਹਰਿ ਕੇ ਸੰਤ ਜਨਾ ਕੀ ਹਉ ਬਲਿਹਾਰੀ ॥',
      transliteration: 'har ke sa(n)t janaa kee hau balihaaree ||',
      pageNo: 9,
      source: 'G',
      existsMedium: 1,
      existsTaksal: 1,
      existsBuddhaDal: 1,
    }),
    createStructuredBaniVerse({
      verseId: 4001,
      shabadId: 210,
      unicode: 'ਕਬਿਯੋ ਬਾਚ ਬੇਨਤੀ ਚੌਪਈ ॥',
      transliteration: 'kabiyo baach benatee chauapiee ||',
      pageNo: 1386,
      source: 'D',
      existsSGPC: 1,
      existsMedium: 1,
      existsTaksal: 1,
      existsBuddhaDal: 1,
    }),
    createStructuredBaniVerse({
      verseId: 4002,
      shabadId: 211,
      unicode: 'ਅਨੰਦੁ ਭਇਆ ਮੇਰੀ ਮਾਏ ਸਤਿਗੁਰੂ ਮੈ ਪਾਇਆ ॥',
      transliteration: 'ana(n)dh bhiaa meree maae satiguroo mai paiaa ||',
      pageNo: 917,
      source: 'G',
      existsSGPC: 1,
      existsMedium: 1,
      existsTaksal: 1,
      existsBuddhaDal: 1,
    }),
  ],
}

export const MOCK_CHAUPAI_BANI_RESPONSE = {
  verses: [
    createStructuredBaniVerse({
      verseId: 9001,
      shabadId: 9,
      unicode: 'ਦੋਹਰਾ ॥',
      transliteration: 'dhoharaa ||',
      pageNo: null,
      existsBuddhaDal: 1,
    }),
    createStructuredBaniVerse({
      verseId: 9002,
      shabadId: 9,
      unicode: 'ੴ ਸ੍ਰੀ ਵਾਹਿਗੁਰੂ ਜੀ ਕੀ ਫਤਹ ॥',
      transliteration: 'ik oa(n)kaar sree vaahiguroo jee kee fateh ||',
      pageNo: 1386,
      source: 'D',
      existsTaksal: 1,
      existsBuddhaDal: 1,
    }),
    createStructuredBaniVerse({
      verseId: 9003,
      shabadId: 9,
      unicode: 'ਕਬਿਯੋ ਬਾਚ ਬੇਨਤੀ ॥',
      transliteration: 'kabiyo baach benatee ||',
      pageNo: 1386,
      source: 'D',
      existsSGPC: 1,
      existsMedium: 1,
      existsTaksal: 1,
      existsBuddhaDal: 1,
    }),
    createStructuredBaniVerse({
      verseId: 9004,
      shabadId: 9,
      unicode: 'ਹਮਰੀ ਕਰੋ ਹਾਥ ਦੈ ਰੱਛਾ ॥',
      transliteration: 'hamaree karo haath dhai racha ||',
      pageNo: 1386,
      source: 'D',
      existsSGPC: 1,
      existsMedium: 1,
      existsTaksal: 1,
      existsBuddhaDal: 1,
    }),
  ],
}

export const MOCK_AARTI_BANI_RESPONSE = {
  verses: [
    createStructuredBaniVerse({
      verseId: 2201,
      shabadId: 22,
      unicode: 'ਆਰਤੀ-ਆਰਤਾ',
      transliteration: 'aaratee aarataa',
      pageNo: null,
      existsBuddhaDal: 1,
    }),
    createStructuredBaniVerse({
      verseId: 2202,
      shabadId: 22,
      unicode: 'ੴ ਸਤਿਗੁਰ ਪ੍ਰਸਾਦਿ ॥',
      transliteration: 'ik oa(n)kaar satigur prasaadh ||',
      pageNo: 663,
      source: 'G',
      existsSGPC: 1,
      existsMedium: 1,
      existsBuddhaDal: 1,
    }),
    createStructuredBaniVerse({
      verseId: 2203,
      shabadId: 22,
      unicode: 'ਗਗਨ ਮੈ ਥਾਲੁ ਰਵਿ ਚੰਦੁ ਦੀਪਕ ਬਨੇ ਤਾਰਿਕਾ ਮੰਡਲ ਜਨਕ ਮੋਤੀ ॥',
      transliteration: 'gagan mai thaal rav cha(n)dh dheepak bane taarikaa ma(n)ddal janak motee ||',
      pageNo: 663,
      source: 'G',
      existsSGPC: 1,
      existsMedium: 1,
      existsBuddhaDal: 1,
    }),
    createStructuredBaniVerse({
      verseId: 2204,
      shabadId: 22,
      unicode: 'ਸਭ ਮਹਿ ਜੋਤਿ ਜੋਤਿ ਹੈ ਸੋਇ ॥',
      transliteration: 'sabh meh jot jot hai soi ||',
      pageNo: 663,
      source: 'G',
      existsTaksal: 1,
      existsBuddhaDal: 1,
    }),
  ],
}

export const MOCK_SOHILA_BANI_RESPONSE = {
  verses: [
    createStructuredBaniVerse({
      verseId: 2301,
      shabadId: 23,
      unicode: 'ਸੋਹਿਲਾ ਸਾਹਿਬ',
      transliteration: 'sohilaa saahib',
      pageNo: null,
      header: 1,
      existsBuddhaDal: 1,
    }),
    createStructuredBaniVerse({
      verseId: 2302,
      shabadId: 23,
      unicode: 'ਰਾਗੁ ਗਉੜੀ ਦੀਪਕੀ ਮਹਲਾ ੧ ॥',
      transliteration: 'raag gauRee dheepakee mahalaa pehilaa ||',
      pageNo: null,
      header: 1,
      existsTaksal: 1,
      existsBuddhaDal: 1,
    }),
    createStructuredBaniVerse({
      verseId: 2303,
      shabadId: 23,
      unicode: 'ੴ ਸਤਿਗੁਰ ਪ੍ਰਸਾਦਿ ॥',
      transliteration: 'ik oa(n)kaar satigur prasaadh ||',
      pageNo: 12,
      source: 'G',
      existsSGPC: 1,
      existsMedium: 1,
      existsTaksal: 1,
      existsBuddhaDal: 1,
    }),
    createStructuredBaniVerse({
      verseId: 2304,
      shabadId: 23,
      unicode: 'ਜੈ ਘਰਿ ਕੀਰਤਿ ਆਖੀਐ ਕਰਤੇ ਕਾ ਹੋਇ ਬੀਚਾਰੋ ॥',
      transliteration: 'jai ghar keerat aakheeaai karate kaa hoi beechaaro ||',
      pageNo: 12,
      source: 'G',
      existsMedium: 1,
      existsTaksal: 1,
      existsBuddhaDal: 1,
    }),
    createStructuredBaniVerse({
      verseId: 2305,
      shabadId: 23,
      unicode: 'ਤਿਤੁ ਘਰਿ ਗਾਵਹੁ ਸੋਹਿਲਾ ਸਿਵਰਿਹੁ ਸਿਰਜਣਹਾਰੋ ॥',
      transliteration: 'tit ghar gaavahu sohilaa sivarih sirajanahaaro ||',
      pageNo: 12,
      source: 'G',
      existsTaksal: 1,
      existsBuddhaDal: 1,
    }),
  ],
}

export const MOCK_AMRIT_HEADERS = {
  headers: [
    {
      HeaderID: 1,
      GurmukhiUni: 'ਦੁਇ ਕਰ ਜੋੜਿ ਕਰਉ ਅਰਦਾਸਿ ॥',
      Transliterations: { en: 'dhui kar joR karau aradhaas ||' },
    },
  ],
}

export const MOCK_AMRIT_HEADER_RESPONSE = {
  index: [
    {
      ShabadID: 816,
      GurmukhiUni: 'ਡੰਡਉਤਿ ਬੰਦਨ ਅਨਿਕ ਬਾਰ ਸਰਬ ਕਲਾ ਸਮਰਥ ॥',
      Transliterations: { en: 'dda(n)ddaut ba(n)dhan anik baar sarab kalaa samarath ||' },
      SourceEnglish: 'Sri Guru Granth Sahib Ji',
      SourceID: 'G',
      RaagEnglish: 'Raag Gauree',
      RaagID: 17,
      PageNo: 65,
    },
  ],
}

export const MOCK_HUKAMNAMA_RESPONSE = {
  isLatest: true,
  date: {
    gregorian: {
      year: 2026,
      month: 4,
      date: 5,
    },
  },
  shabads: [
    {
      shabadInfo: {
        shabadId: 2591,
        pageNo: 680,
        source: { sourceId: 'G', english: 'Sri Guru Granth Sahib Ji' },
        raag: { english: 'Raag Dhanaasree' },
        writer: { english: 'Guru Arjan Dev Ji' },
      },
      verses: [
        {
          verseId: 29344,
          shabadId: 2591,
          verse: { unicode: 'ਜਤਨ ਕਰੈ ਮਾਨੁਖ ਡਹਕਾਵੈ ਓਹੁ ਅੰਤਰਜਾਮੀ ਜਾਨੈ ॥' },
          transliteration: { english: 'jatan karai maanukh ddahakaavai oh a(n)tarajaamee jaanai ||' },
          translation: {
            en: {
              bdb: 'People try to deceive others, but the Inner-knower knows everything.',
              ms: 'The man makes efforts to deceive others, but the Lord knows everything.',
              ssk: 'People try to deceive others, but the Inner-knower knows everything.',
            },
            hi: { ss: 'मनुष्य धोखा देता है पर प्रभु सब जानता है।' },
            pu: { ss: { unicode: 'ਮਨੁੱਖ ਧੋਖਾ ਦੇਂਦਾ ਹੈ ਪਰ ਪ੍ਰਭੂ ਸਭ ਜਾਣਦਾ ਹੈ।' } },
          },
          pageNo: 680,
        },
        {
          verseId: 29347,
          shabadId: 2591,
          verse: { unicode: 'ਉਤ ਤਾਕੈ ਉਤ ਤੇ ਉਤ ਪੇਖੈ ਆਵੈ ਲੋਭੀ ਫੇਰਿ ॥ ਰਹਾਉ ॥' },
          transliteration: { english: 'aut taakai ut te ut pekhai aavai lobhee fer || rahaau ||' },
          translation: {
            en: {
              bdb: 'Looking around, this way and that, the greedy people come and go. ||Pause||',
              ms: 'The greedy man looks all around and returns again. Pause.',
              ssk: 'Looking around, this way and that, the greedy people come and go. ||Pause||',
            },
            hi: { ss: 'लोभी मनुष्य इधर उधर देखता फिरता है। रहाउ।' },
            pu: { ss: { unicode: 'ਲੋਭੀ ਮਨੁੱਖ ਇੱਧਰ ਉੱਧਰ ਵੇਖਦਾ ਫਿਰਦਾ ਹੈ। ਰਹਾਉ।' } },
          },
          pageNo: 680,
        },
      ],
    },
  ],
}

const MOCK_MAHANKOSH_RESPONSES: Record<string, { lines: Array<Record<string, unknown>> }> = {
  'ੴ': {
    lines: [
      {
        ID: 1,
        srch: 'ੴ',
        translit: 'ik oankaar',
        word: 'ੴ',
        roman: 'ik oankar',
        hindi: 'इक ओंकार',
        description: 'ਇੱਕ ਅਕਾਲ ਪੁਰਖ.',
        roman_desc: 'ik akaal purakh.',
        hindi_desc: 'एक अकाल पुरुष।',
      },
    ],
  },
  'ਸਤਿ': {
    lines: [
      {
        ID: 2,
        srch: 'ਸਤਿ',
        translit: 'sat',
        word: 'ਸਤਿ',
        roman: 'sat',
        hindi: 'सति',
        description: 'ਸੱਚ.',
        roman_desc: 'sach.',
        hindi_desc: 'सत्य।',
      },
    ],
  },
}

function trimTrailingSlashes(value: string) {
  return value.replace(/\/+$/, '')
}

function deriveFunctionsUrl(baseUrl: string) {
  const url = new URL(baseUrl)
  if (url.hostname.includes('.functions.insforge.app')) {
    return trimTrailingSlashes(url.origin)
  }

  const [appKey] = url.hostname.split('.')
  return `https://${appKey}.functions.insforge.app`
}

const INSFORGE_BASE_URL = import.meta.env.VITE_INSFORGE_URL?.trim() || 'https://epz3fhj8.us-east.insforge.app'
const INSFORGE_FUNCTIONS_URL = trimTrailingSlashes(
  import.meta.env.VITE_INSFORGE_FUNCTIONS_URL?.trim() || deriveFunctionsUrl(INSFORGE_BASE_URL)
)
const BANIDB_FUNCTION_SLUG = import.meta.env.VITE_INSFORGE_BANIDB_FUNCTION?.trim() || 'banidb-proxy'
const BANIDB_PROXY_URL = `${INSFORGE_FUNCTIONS_URL}/${BANIDB_FUNCTION_SLUG.replace(/^\/+/, '')}`

function getMockBanidbResponse(url: URL) {
  if (url.pathname === '/v2/banis') {
    return HttpResponse.json(MOCK_BANIS_INDEX)
  }

  if (url.pathname === '/v2/amritkeertan') {
    return HttpResponse.json(MOCK_AMRIT_HEADERS)
  }

  if (url.pathname === '/v2/hukamnamas') {
    return HttpResponse.json(MOCK_HUKAMNAMA_RESPONSE)
  }

  const angMatch = url.pathname.match(/^\/v2\/angs\/([^/]+)\/([^/]+)$/)
  if (angMatch) {
    const [, ang] = angMatch
    if (ang === '9999') return HttpResponse.json({ page: [] })
    if (ang === 'error') return HttpResponse.json({ error: 'upstream failure' }, { status: 502 })
    const page = MOCK_ANG_PAGE.map(verse => ({ ...verse, pageNo: Number(ang) }))
    return HttpResponse.json({ page })
  }

  const shabadMatch = url.pathname.match(/^\/v2\/shabads\/([^/]+)$/)
  if (shabadMatch) {
    const [, shabadId] = shabadMatch
    if (shabadId === '9999') return HttpResponse.json({ verses: [] })
    if (shabadId === 'error') return HttpResponse.json({ error: 'upstream failure' }, { status: 502 })
    const shabadIdNumber = Number(shabadId)
    return HttpResponse.json({
      ...MOCK_SHABAD_RESPONSE,
      shabadInfo: {
        ...MOCK_SHABAD_RESPONSE.shabadInfo,
        shabadId: shabadIdNumber,
      },
      verses: MOCK_SHABAD_RESPONSE.verses.map((verse, index) => ({
        ...verse,
        shabadId: shabadIdNumber,
        verseId: shabadIdNumber === 50 ? 100 + index : verse.verseId,
      })),
    })
  }

  if (url.pathname.startsWith('/v2/search/')) {
    const query = decodeURIComponent(url.pathname.replace('/v2/search/', '')).toLowerCase()
    const searchType = url.searchParams.get('searchtype')

    if (url.searchParams.get('source') === 'R') {
      return HttpResponse.json({
        verses: [
          {
            verseId: 9100,
            shabadId: 1,
            source: buildSource('R', 'Rehat', null),
            verse: { unicode: 'ਸੇਵਾ ਅਤੇ ਸਿਮਰਨ' },
            transliteration: { english: 'sevaa ate simaran' },
            translation: {
              en: { bdb: 'Service and remembrance' },
              hi: { ss: 'सेवा और सिमरन' },
              pu: { ss: { unicode: 'ਸੇਵਾ ਅਤੇ ਸਿਮਰਨ' } },
            },
            pageNo: null,
            raag: buildRaag('Rehat Search', 0),
            writer: buildWriter('Sikh Rehat Maryada', 0),
          },
        ],
      })
    }

    if (query === 'death') {
      return HttpResponse.json(
        searchType === '3' || searchType === '4'
          ? MOCK_ROMANIZED_SEARCH_RESPONSE
          : { verses: [] }
      )
    }

    return HttpResponse.json(MOCK_SEARCH_RESPONSE)
  }

  const baniMatch = url.pathname.match(/^\/v2\/banis\/([^/]+)$/)
  if (baniMatch) {
    const [, baniId] = baniMatch
    if (baniId === '21') return HttpResponse.json(MOCK_REHRAS_BANI_RESPONSE)
    if (baniId === '22') return HttpResponse.json(MOCK_AARTI_BANI_RESPONSE)
    if (baniId === '23') return HttpResponse.json(MOCK_SOHILA_BANI_RESPONSE)
    if (baniId === '24') return HttpResponse.json(MOCK_ARDAAS_BANI_RESPONSE)
    if (baniId === '9') return HttpResponse.json(MOCK_CHAUPAI_BANI_RESPONSE)
    return HttpResponse.json(MOCK_BANI_RESPONSE)
  }

  if (url.pathname.startsWith('/v2/amritkeertan/index/')) {
    return HttpResponse.json(MOCK_AMRIT_HEADER_RESPONSE)
  }

  const koshSearchMatch = url.pathname.match(/^\/v2\/kosh\/search\/(.+)$/)
  if (koshSearchMatch) {
    const [, query] = koshSearchMatch
    const normalized = decodeURIComponent(query)
    const entries = normalized === 'ੴ'
      ? [{
          id: 1,
          word: 'ik oankar',
          wordUni: 'ੴ',
          definition: 'One Creator',
          definitionUni: 'ਇੱਕ ਕਰਤਾ ਪੁਰਖ',
        }]
      : []
    return HttpResponse.json(entries)
  }

  const koshMatch = url.pathname.match(/^\/v2\/kosh\/(.+)$/)
  if (koshMatch) {
    const [, query] = koshMatch
    const normalized = decodeURIComponent(query)
    const entries = normalized === 'ੴ'
      ? [{ id: 1, word: 'ik oankar', wordUni: 'ੴ' }]
      : []
    return HttpResponse.json(entries)
  }

  if (url.pathname === '/v2/rehats') {
    return HttpResponse.json({
      maryadas: [
        { rehatID: 1, rehatName: 'Sikh Rehat Maryada', alphabet: 'S' },
        { rehatID: 2, rehatName: 'Tankhah Nama', alphabet: 'T' },
      ],
    })
  }

  const rehatChapterContentMatch = url.pathname.match(/^\/v2\/rehats\/(\d+)\/chapters\/(\d+)$/)
  if (rehatChapterContentMatch) {
    const [, rehatId, chapterId] = rehatChapterContentMatch
    return HttpResponse.json({
      chapters: [
        {
          chapterID: Number(chapterId),
          chapterName: Number(chapterId) === 11 ? 'Daily Discipline' : 'Shared Conduct',
          chapterContent: Number(rehatId) === 1
            ? '<p>Amritvela, nitnem, seva, and simran remain central.</p>'
            : '<p>Sangat discipline and shared conduct are expected.</p>',
          alphabet: 'D',
        },
      ],
    })
  }

  const rehatChaptersMatch = url.pathname.match(/^\/v2\/rehats\/(\d+)$/)
  if (rehatChaptersMatch) {
    const [, rehatId] = rehatChaptersMatch
    return HttpResponse.json({
      chapters: Number(rehatId) === 1
        ? [
            { chapterID: 11, chapterName: 'Daily Discipline', alphabet: 'D' },
            { chapterID: 12, chapterName: 'Shared Conduct', alphabet: 'S' },
          ]
        : [
            { chapterID: 21, chapterName: 'Tankhah Guidance', alphabet: 'T' },
          ],
    })
  }

  const datedHukamnamaMatch = url.pathname.match(/^\/v2\/hukamnamas\/\d{4}\/\d{2}\/\d{2}$/)
  if (datedHukamnamaMatch) {
    return HttpResponse.json(MOCK_HUKAMNAMA_RESPONSE)
  }

  return null
}

export const handlers = [
  http.post(BANIDB_PROXY_URL, async ({ request }) => {
    const body = await request.json() as { path?: unknown; query?: unknown }
    if (typeof body.path !== 'string') {
      return HttpResponse.json({ error: 'Request body must include a string path.' }, { status: 400 })
    }

    const url = new URL(body.path, 'https://api.banidb.com')
    if (!url.pathname.startsWith('/v2/')) {
      return HttpResponse.json({ error: 'Only BaniDB v2 read paths are allowed.' }, { status: 400 })
    }

    if (body.query && typeof body.query === 'object' && !Array.isArray(body.query)) {
      for (const [key, value] of Object.entries(body.query as Record<string, string>)) {
        if (value === undefined || value === null) continue
        url.searchParams.set(key, String(value))
      }
    }

    return getMockBanidbResponse(url) ?? HttpResponse.json({ error: 'Not found.' }, { status: 404 })
  }),

  http.get('https://backend.searchgurbani.com/api/res/mahan-kosh/view', ({ request }) => {
    const url = new URL(request.url)
    const keyword = url.searchParams.get('keyword') ?? ''
    return HttpResponse.json(MOCK_MAHANKOSH_RESPONSES[keyword] ?? { lines: [] })
  }),
]
