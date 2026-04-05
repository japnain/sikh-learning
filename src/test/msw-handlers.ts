import { http, HttpResponse } from 'msw'

const MOCK_VERSE_1 = {
  verseId: 1,
  shabadId: 1,
  verse: { unicode: 'ੴ ਸਤਿ ਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ' },
  transliteration: { english: 'ikOankaar sat naam kartaa purakh' },
  translation: {
    en: { bdb: 'One Universal Creator God. The Name Is Truth.' },
    hi: { ss: 'एक ओंकार सतिनाम करता पुरख' },
    pu: { ss: { unicode: 'ਅਕਾਲ ਪੁਰਖ ਇੱਕ ਹੈ, ਜਿਸ ਦਾ ਨਾਮ ਸੱਚ ਹੈ' } },
  },
  pageNo: 1,
}

const MOCK_VERSE_2 = {
  verseId: 2,
  shabadId: 1,
  verse: { unicode: 'ਨਿਰਭਉ ਨਿਰਵੈਰੁ ਅਕਾਲ ਮੂਰਤਿ' },
  transliteration: { english: 'nirbhau nirvair akaal moorat' },
  translation: {
    en: { bdb: 'No Fear. No Hatred. Image Of The Undying.' },
    hi: { ss: 'निर्भय निर्वैर अकाल मूरत' },
    pu: { ss: { unicode: 'ਨਿਡਰ, ਵੈਰ ਰਹਿਤ, ਅਕਾਲ ਦੀ ਮੂਰਤ' } },
  },
  pageNo: 1,
}

const MOCK_VERSE_3 = {
  verseId: 3,
  shabadId: 2,
  verse: { unicode: 'ਸੋਚੈ ਸੋਚਿ ਨ ਹੋਵਈ' },
  transliteration: { english: 'sochai soch na hovee' },
  translation: {
    en: { bdb: 'By thinking, He cannot be reduced to thought.' },
    hi: { ss: 'सोचने से वह सोचा नहीं जा सकता' },
    pu: { ss: { unicode: 'ਸੋਚਣ ਨਾਲ ਉਹ ਸੋਚਿਆ ਨਹੀਂ ਜਾ ਸਕਦਾ' } },
  },
  pageNo: 1,
}

export const MOCK_ANG_PAGE = [MOCK_VERSE_1, MOCK_VERSE_2, MOCK_VERSE_3]

export const MOCK_SHABAD_RESPONSE = {
  verses: [
    {
      verseId: 1,
      verse: { unicode: 'ੴ ਸਤਿ ਨਾਮੁ' },
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
  ],
}

export const MOCK_SEARCH_RESPONSE = {
  verses: [
    {
      verseId: 100,
      shabadId: 50,
      verse: { unicode: 'ਵਾਹਿਗੁਰੂ ਵਾਹਿਗੁਰੂ' },
      transliteration: { english: 'vaahiguroo vaahiguroo' },
      translation: { en: { bdb: 'Waaheguru, Waaheguru' }, pu: { ss: { unicode: '' } } },
      pageNo: 1402,
    },
  ],
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
    return HttpResponse.json(MOCK_SHABAD_RESPONSE)
  }),

  http.get('https://api.banidb.com/v2/search/:query', () => {
    return HttpResponse.json(MOCK_SEARCH_RESPONSE)
  }),
]
