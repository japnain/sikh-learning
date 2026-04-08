import { http, HttpResponse } from 'msw'

const MOCK_VERSE_1 = {
  verseId: 1,
  shabadId: 1,
  verse: { unicode: 'ੴ ਸਤਿ ਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ' },
  transliteration: { english: 'ikOankaar sat naam kartaa purakh' },
  translation: {
    en: {
      bdb: 'One Universal Creator God. The Name Is Truth.',
      ms: 'There is but One God. True is His Name.',
      ssk: 'One Universal Creator God. The Name Is Truth.',
    },
    hi: { ss: 'एक ओंकार सतिनाम करता पुरख' },
    pu: { ss: { unicode: 'ਅਕਾਲ ਪੁਰਖ ਇੱਕ ਹੈ, ਜਿਸ ਦਾ ਨਾਮ ਸੱਚ ਹੈ' } },
  },
  pageNo: 1,
  raag: { english: 'Jap' },
  writer: { english: 'Guru Nanak Dev Ji' },
}

const MOCK_VERSE_2 = {
  verseId: 2,
  shabadId: 1,
  verse: { unicode: 'ਨਿਰਭਉ ਨਿਰਵੈਰੁ ਅਕਾਲ ਮੂਰਤਿ' },
  transliteration: { english: 'nirbhau nirvair akaal moorat' },
  translation: {
    en: {
      bdb: 'No Fear. No Hatred. Image Of The Undying.',
      ms: 'Fearless and without hate, immortal in form.',
      ssk: 'No Fear. No Hatred. Image Of The Undying.',
    },
    hi: { ss: 'निर्भय निर्वैर अकाल मूरत' },
    pu: { ss: { unicode: 'ਨਿਡਰ, ਵੈਰ ਰਹਿਤ, ਅਕਾਲ ਦੀ ਮੂਰਤ' } },
  },
  pageNo: 1,
  raag: { english: 'Jap' },
  writer: { english: 'Guru Nanak Dev Ji' },
}

const MOCK_VERSE_3 = {
  verseId: 3,
  shabadId: 2,
  verse: { unicode: 'ਸੋਚੈ ਸੋਚਿ ਨ ਹੋਵਈ' },
  transliteration: { english: 'sochai soch na hovee' },
  translation: {
    en: {
      bdb: 'By thinking, He cannot be reduced to thought.',
      ms: 'By thought one can think Him not.',
      ssk: 'By thinking, He cannot be reduced to thought.',
    },
    hi: { ss: 'सोचने से वह सोचा नहीं जा सकता' },
    pu: { ss: { unicode: 'ਸੋਚਣ ਨਾਲ ਉਹ ਸੋਚਿਆ ਨਹੀਂ ਜਾ ਸਕਦਾ' } },
  },
  pageNo: 1,
  raag: { english: 'Jap' },
  writer: { english: 'Guru Nanak Dev Ji' },
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
      transliteration: { english: 'ikOankaar sat naam' },
      translation: {
        en: {
          bdb: 'One Universal Creator God. Truth.',
          ms: 'There is but One God. Truth.',
          ssk: 'One Universal Creator God. Truth.',
        },
        hi: { ss: 'एक ओंकार सतिनाम' },
        pu: { ss: { unicode: 'ਇੱਕ ਅਕਾਲ ਪੁਰਖ। ਸੱਚ।' } },
      },
      words: [
        {
          word: { unicode: 'ੴ' },
          transliteration: { english: 'ikOankaar' },
          translation: { en: { bdb: 'One Universal Creator' }, hi: { ss: 'एक ओंकार' }, pu: { ss: { unicode: 'ਇੱਕ ਅਕਾਲ ਪੁਰਖ' } } },
        },
        {
          word: { unicode: 'ਸਤਿ' },
          transliteration: { english: 'sat' },
          translation: { en: { bdb: 'Truth' }, hi: { ss: 'सत्य' }, pu: { ss: { unicode: 'ਸੱਚ' } } },
        },
      ],
    },
    {
      verseId: 2,
      shabadId: 1,
      pageNo: 1,
      verse: { unicode: 'ਕਰਤਾ ਪੁਰਖੁ ਨਿਰਭਉ' },
      transliteration: { english: 'karataa purakh nirabhau' },
      translation: {
        en: {
          bdb: 'Creative Being. No Fear.',
          ms: 'Creative being, beyond fear.',
          ssk: 'Creative Being. No Fear.',
        },
        hi: { ss: 'करता पुरख निर्भउ' },
        pu: { ss: { unicode: 'ਕਰਤਾ ਪੁਰਖ। ਨਿਰਭਉ।' } },
      },
      words: [],
    },
  ],
}

export const MOCK_SEARCH_RESPONSE = {
  verses: [
    {
      verseId: 100,
      shabadId: 50,
      source: { id: 'G' },
      verse: { unicode: 'ਵਾਹਿਗੁਰੂ ਵਾਹਿਗੁਰੂ' },
      transliteration: { english: 'vaahiguroo vaahiguroo' },
      translation: { en: { bdb: 'Waaheguru, Waaheguru' }, pu: { ss: { unicode: '' } } },
      pageNo: 1402,
    },
  ],
}

export const MOCK_BANIS_INDEX = [
  { ID: 2, gurmukhiUni: 'ਜਪੁਜੀ ਸਾਹਿਬ', transliterations: { english: 'japujee saahib' } },
  { ID: 24, gurmukhiUni: 'ਅਰਦਾਸ', transliterations: { english: 'aradhaas' } },
  { ID: 21, gurmukhiUni: 'ਰਹਰਾਸਿ ਸਾਹਿਬ', transliterations: { english: 'raharaas saahib' } },
  { ID: 90, gurmukhiUni: 'ਆਸਾ ਦੀ ਵਾਰ', transliterations: { english: 'aasaa dhee vaar' } },
  { ID: 33, gurmukhiUni: 'ਬਾਵਨ ਅਖਰੀ', transliterations: { english: 'baavan akharee' } },
]

export const MOCK_BANI_RESPONSE = {
  verses: [
    {
      verseId: 1,
      shabadId: 1,
      verse: { unicode: 'ੴ ਸਤਿ ਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ' },
      transliteration: { english: 'ikOankaar sat naam kartaa purakh' },
      translation: {
        en: {
          bdb: 'One Universal Creator God. The Name Is Truth.',
          ms: 'There is but One God. True is His Name.',
          ssk: 'One Universal Creator God. The Name Is Truth.',
        },
        hi: { ss: 'एक ओंकार सतिनाम करता पुरख' },
        pu: { ss: { unicode: 'ਅਕਾਲ ਪੁਰਖ ਇੱਕ ਹੈ, ਜਿਸ ਦਾ ਨਾਮ ਸੱਚ ਹੈ' } },
      },
      pageNo: 1,
      source: { id: 'G' },
    },
    {
      verseId: 2,
      shabadId: 2,
      verse: { unicode: 'ਸੋਚੈ ਸੋਚਿ ਨ ਹੋਵਈ' },
      transliteration: { english: 'sochai soch na hovee' },
      translation: {
        en: {
          bdb: 'By thinking, He cannot be reduced to thought.',
          ms: 'By thought one can think Him not.',
          ssk: 'By thinking, He cannot be reduced to thought.',
        },
        hi: { ss: 'सोचने से वह सोचा नहीं जा सकता' },
        pu: { ss: { unicode: 'ਸੋਚਣ ਨਾਲ ਉਹ ਸੋਚਿਆ ਨਹੀਂ ਜਾ ਸਕਦਾ' } },
      },
      pageNo: 2,
      source: { id: 'G' },
    },
  ],
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
    {
      header: 1,
      verse: {
        verseId: 2628,
        shabadId: 21,
        verse: { unicode: 'ਰਹਰਾਸਿ ਸਾਹਿਬ' },
        transliteration: { english: 'raharaas saahib' },
        translation: {
          en: { bdb: 'Rehras Sahib', ms: 'Rehras Sahib', ssk: 'Rehras Sahib' },
          hi: {},
          pu: { ss: { unicode: '' } },
        },
        pageNo: null,
      },
    },
    {
      verse: {
        verseId: 2629,
        shabadId: 21,
        verse: { unicode: 'ਸ੍ਰੀ ਵਾਹਿਗੁਰੂ ਜੀ ਕੀ ਫਤਹ ॥' },
        transliteration: { english: 'sree vaahiguroo jee kee fateh ||' },
        translation: {
          en: { bdb: "Victory is the Lord's.", ms: "Victory belongs to the Divine.", ssk: "Victory is the Lord's." },
          hi: { ss: 'श्री वाहेगुरू जी की फतेह।' },
          pu: { ss: { unicode: 'ਸ੍ਰੀ ਵਾਹਿਗੁਰੂ ਜੀ ਕੀ ਫਤਹ।' } },
        },
        pageNo: null,
      },
    },
    {
      verse: {
        verseId: 2630,
        shabadId: 21,
        verse: { unicode: 'ੴ ਸਤਿਗੁਰ ਪ੍ਰਸਾਦਿ ॥' },
        transliteration: { english: 'ikOankaar satigur prasaadh ||' },
        translation: {
          en: {
            bdb: 'The Lord is One and can be realized through the True Guru.',
            ms: 'There is One God. By the True Guru His grace is obtained.',
            ssk: 'One Universal Creator God. By The Grace Of The True Guru.',
          },
          hi: { ss: 'एक ओंकार सतिगुर प्रसादि।' },
          pu: { ss: { unicode: 'ੴ ਸਤਿਗੁਰ ਪ੍ਰਸਾਦਿ।' } },
        },
        pageNo: 8,
        source: { id: 'G' },
      },
    },
    {
      verse: {
        verseId: 2631,
        shabadId: 21,
        verse: { unicode: 'ਸੋ ਦਰੁ ਤੇਰਾ ਕੇਹਾ ਸੋ ਘਰੁ ਕੇਹਾ' },
        transliteration: { english: 'so dhar teraa kehaa so ghar kehaa' },
        translation: {
          en: {
            bdb: 'Where is that Gate of Yours, and where is that Home?',
            ms: 'What is that gate and what is that house of Yours?',
            ssk: 'What is that Gate, and what is that Dwelling, O Lord?',
          },
          hi: { ss: 'तेरा वह द्वार कैसा है, वह घर कैसा है?' },
          pu: { ss: { unicode: 'ਤੇਰਾ ਉਹ ਦਰ ਕਿਹੋ ਜਿਹਾ ਹੈ, ਉਹ ਘਰ ਕਿਹੋ ਜਿਹਾ ਹੈ?' } },
        },
        pageNo: 8,
        source: { id: 'G' },
      },
    },
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
      RaagEnglish: 'Raag Gauree',
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

export const handlers = [
  http.get('https://api.banidb.com/v2/angs/:ang/:source', ({ params }) => {
    const { ang } = params as { ang: string; source: string }
    if (ang === '9999') return HttpResponse.json({ page: [] })
    if (ang === 'error') return HttpResponse.error()
    const page = MOCK_ANG_PAGE.map(v => ({ ...v, pageNo: Number(ang) }))
    return HttpResponse.json({ page })
  }),

  http.get('https://api.banidb.com/v2/shabads/:shabadId', ({ params }) => {
    const { shabadId } = params as { shabadId: string }
    if (shabadId === '9999') return HttpResponse.json({ verses: [] })
    if (shabadId === 'error') return HttpResponse.error()
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
  }),

  http.get('https://api.banidb.com/v2/search/:query', () => {
    return HttpResponse.json(MOCK_SEARCH_RESPONSE)
  }),

  http.get('https://api.banidb.com/v2/banis', () => {
    return HttpResponse.json(MOCK_BANIS_INDEX)
  }),

  http.get('https://api.banidb.com/v2/banis/:baniId', ({ params }) => {
    const { baniId } = params as { baniId: string }
    if (baniId === '21') return HttpResponse.json(MOCK_REHRAS_BANI_RESPONSE)
    if (baniId === '24') return HttpResponse.json(MOCK_ARDAAS_BANI_RESPONSE)
    return HttpResponse.json(MOCK_BANI_RESPONSE)
  }),

  http.get('https://api.banidb.com/v2/amritkeertan', () => {
    return HttpResponse.json(MOCK_AMRIT_HEADERS)
  }),

  http.get('https://api.banidb.com/v2/amritkeertan/index/:headerId', () => {
    return HttpResponse.json(MOCK_AMRIT_HEADER_RESPONSE)
  }),

  http.get('https://api.banidb.com/v2/hukamnamas', () => {
    return HttpResponse.json(MOCK_HUKAMNAMA_RESPONSE)
  }),

  http.get('https://api.banidb.com/v2/hukamnamas/:year/:month/:day', () => {
    return HttpResponse.json(MOCK_HUKAMNAMA_RESPONSE)
  }),

  http.get('https://backend.searchgurbani.com/api/res/mahan-kosh/view', ({ request }) => {
    const url = new URL(request.url)
    const keyword = url.searchParams.get('keyword') ?? ''
    return HttpResponse.json(MOCK_MAHANKOSH_RESPONSES[keyword] ?? { lines: [] })
  }),
]
