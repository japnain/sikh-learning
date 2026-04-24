import type { BanidbProxyQuery } from './banidb'

function buildSource(id: string, english: string, pageNo: number | null = null) {
  return { id, sourceId: id, english, pageNo }
}

function buildRaag(english: string, raagId = 1) {
  return { raagId, english }
}

function buildWriter(english: string, writerId = 1) {
  return { writerId, english }
}

function createTranslation(english: string, gurmukhi = english) {
  return {
    en: {
      bdb: english,
      ms: english,
      ssk: english,
    },
    hi: { ss: english },
    pu: { ss: { unicode: gurmukhi }, ft: { unicode: gurmukhi } },
  }
}

function createScriptureVerse({
  verseId,
  shabadId,
  text,
  pageNo,
  translation,
  transliteration = 'ik oa(n)kaar satigur prasaadh',
  source = 'G',
}: {
  verseId: number
  shabadId: number
  text: string
  pageNo: number
  translation: string
  transliteration?: string
  source?: string
}) {
  return {
    verseId,
    shabadId,
    verse: { unicode: text },
    larivaar: { unicode: text.replace(/\s+/g, '') },
    transliteration: { english: transliteration },
    translation: createTranslation(translation, text),
    pageNo,
    source: buildSource(source, source === 'D' ? 'Dasam Granth' : 'Sri Guru Granth Sahib Ji', pageNo),
    raag: buildRaag(source === 'D' ? 'Dasam Bani' : 'Raag Asa', source === 'D' ? 201 : 31),
    writer: buildWriter(source === 'D' ? 'Guru Gobind Singh Ji' : 'Guru Arjan Dev Ji', source === 'D' ? 701 : 501),
  }
}

function createQaShabadResponse(shabadId = 544, pageNo = 183) {
  return {
    shabadInfo: {
      shabadId,
      pageNo,
      source: { sourceId: 'G', english: 'Sri Guru Granth Sahib Ji', pageNo },
      raag: { english: 'Raag Asa', raagId: 31 },
      writer: { english: 'Guru Arjan Dev Ji', writerId: 501 },
    },
    verses: [
      {
        ...createScriptureVerse({
          verseId: 7718,
          shabadId,
          text: 'ੴ ਸਤਿ ਨਾਮੁ',
          pageNo,
          translation: 'One Creator, the Name is Truth.',
        }),
        words: [
          {
            word: { unicode: 'ੴ' },
            transliteration: { english: 'ikOankaar' },
            translation: createTranslation('One Universal Creator', 'ਇੱਕ ਅਕਾਲ ਪੁਰਖ'),
          },
          {
            word: { unicode: 'ਸਤਿ' },
            transliteration: { english: 'sat' },
            translation: createTranslation('Truth', 'ਸੱਚ'),
          },
        ],
      },
      {
        ...createScriptureVerse({
          verseId: 7719,
          shabadId,
          text: 'ਕਰਤਾ ਪੁਰਖੁ ਨਿਰਭਉ',
          pageNo,
          translation: 'Creative Being, without fear.',
          transliteration: 'karataa purakh nirabhau',
        }),
        words: [],
      },
    ],
  }
}

function createBaniVerse(baniDbId: number) {
  const source = baniDbId === 4 || baniDbId === 6 || baniDbId === 9 ? 'D' : 'G'
  const pageNo = source === 'D' ? 1 : Math.max(1, baniDbId)

  return {
    verses: [
      {
        ...createScriptureVerse({
          verseId: baniDbId * 100 + 1,
          shabadId: baniDbId,
          text: source === 'D' ? 'ੴ ਸ੍ਰੀ ਵਾਹਿਗੁਰੂ ਜੀ ਕੀ ਫਤਹਿ ॥' : 'ੴ ਸਤਿਗੁਰ ਪ੍ਰਸਾਦਿ ॥',
          pageNo,
          source,
          translation: 'By the grace of the True Guru.',
        }),
        existsSGPC: 1,
        existsMedium: 1,
        existsTaksal: 1,
        existsBuddhaDal: 1,
      },
      {
        ...createScriptureVerse({
          verseId: baniDbId * 100 + 2,
          shabadId: baniDbId,
          text: source === 'D' ? 'ਨਮੋ ਸਰਬ ਕਾਲੇ ॥' : 'ਹਰਿ ਜੁਗੁ ਜੁਗੁ ਭਗਤ ਉਪਾਇਆ ਪੈਜ ਰਖਦਾ ਆਇਆ ਰਾਮ ਰਾਜੇ ॥',
          pageNo,
          source,
          translation: 'The Divine protects devotion through every age.',
          transliteration: source === 'D' ? 'namo sarab kaale' : 'har jug jug bhagat upaiaa',
        }),
        existsSGPC: 1,
        existsMedium: 1,
        existsTaksal: 1,
        existsBuddhaDal: 1,
      },
    ],
  }
}

export function getMockBanidbResponse(path: string, query?: BanidbProxyQuery): unknown | null {
  const url = new URL(path, 'https://api.banidb.com')

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue
      url.searchParams.set(key, String(value))
    }
  }

  if (url.pathname === '/v2/banis') {
    return [
      { ID: 2, gurmukhiUni: 'ਜਪੁਜੀ ਸਾਹਿਬ', transliterations: { english: 'japujee saahib' } },
      { ID: 21, gurmukhiUni: 'ਰਹਰਾਸਿ ਸਾਹਿਬ', transliterations: { english: 'raharaas saahib' } },
      { ID: 22, gurmukhiUni: 'ਆਰਤੀ', transliterations: { english: 'aaratee' } },
      { ID: 23, gurmukhiUni: 'ਸੋਹਿਲਾ ਸਾਹਿਬ', transliterations: { english: 'sohilaa saahib' } },
      { ID: 24, gurmukhiUni: 'ਅਰਦਾਸ', transliterations: { english: 'aradhaas' } },
    ]
  }

  const baniMatch = url.pathname.match(/^\/v2\/banis\/(\d+)$/)
  if (baniMatch) {
    return createBaniVerse(Number(baniMatch[1]))
  }

  if (url.pathname === '/v2/amritkeertan') {
    return {
      headers: [
        {
          HeaderID: 1,
          GurmukhiUni: 'ਦੁਇ ਕਰ ਜੋੜਿ ਕਰਉ ਅਰਦਾਸਿ ॥',
          Transliterations: { en: 'dhui kar joR karau aradhaas ||' },
        },
      ],
    }
  }

  if (url.pathname.startsWith('/v2/amritkeertan/index/')) {
    return {
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
  }

  const angMatch = url.pathname.match(/^\/v2\/angs\/([^/]+)\/([^/]+)$/)
  if (angMatch) {
    const [, ang, source] = angMatch
    const pageNo = Number(ang) || 1
    return {
      page: [
        createScriptureVerse({
          verseId: pageNo * 10 + 1,
          shabadId: pageNo,
          text: 'ੴ ਸਤਿਗੁਰ ਪ੍ਰਸਾਦਿ ॥',
          pageNo,
          source,
          translation: 'By the grace of the True Guru.',
        }),
        createScriptureVerse({
          verseId: pageNo * 10 + 2,
          shabadId: pageNo,
          text: 'ਹਰਿ ਜੁਗੁ ਜੁਗੁ ਭਗਤ ਉਪਾਇਆ ਪੈਜ ਰਖਦਾ ਆਇਆ ਰਾਮ ਰਾਜੇ ॥',
          pageNo,
          source,
          translation: 'The Divine protects devotion through every age.',
          transliteration: 'har jug jug bhagat upaiaa',
        }),
      ],
    }
  }

  const shabadMatch = url.pathname.match(/^\/v2\/shabads\/([^/]+)$/)
  if (shabadMatch) {
    return createQaShabadResponse(Number(shabadMatch[1]) || 544, 183)
  }

  if (url.pathname.startsWith('/v2/search/')) {
    const searchQuery = decodeURIComponent(url.pathname.replace('/v2/search/', '')).toLowerCase()
    const searchType = url.searchParams.get('searchtype')

    if (searchQuery === 'death') {
      return {
        verses: searchType === '3' || searchType === '4'
          ? [
              createScriptureVerse({
                verseId: 101,
                shabadId: 51,
                text: 'ਮਰਣੁ ਨ ਮੰਦਾ ਲੋਕਾ ਆਖੀਐ ਜੇ ਮਰਿ ਜਾਣੈ ਐਸਾ ਕੋਇ ॥',
                pageNo: 935,
                translation: 'Death is not called bad when one knows how to die.',
                transliteration: 'maran na mandhaa lokaa aakheeai je mar jaanai aisaa koi',
              }),
            ]
          : [],
      }
    }

    return {
      verses: [
        createScriptureVerse({
          verseId: 100,
          shabadId: 50,
          text: 'ਵਾਹਿਗੁਰੂ ਵਾਹਿਗੁਰੂ',
          pageNo: 1402,
          translation: 'Waaheguru, Waaheguru',
          transliteration: 'vaahiguroo vaahiguroo',
        }),
      ],
    }
  }

  if (/^\/v2\/hukamnamas(?:\/\d{4}\/\d{2}\/\d{2})?$/.test(url.pathname)) {
    return {
      isLatest: true,
      date: { gregorian: { year: 2026, month: 4, date: 23 } },
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
            createScriptureVerse({
              verseId: 29344,
              shabadId: 2591,
              text: 'ਜਤਨ ਕਰੈ ਮਾਨੁਖ ਡਹਕਾਵੈ ਓਹੁ ਅੰਤਰਜਾਮੀ ਜਾਨੈ ॥',
              pageNo: 680,
              translation: 'People try to deceive others, but the Inner-knower knows everything.',
              transliteration: 'jatan karai maanukh ddahakaavai',
            }),
          ],
        },
      ],
    }
  }

  const koshSearchMatch = url.pathname.match(/^\/v2\/kosh\/search\/(.+)$/)
  if (koshSearchMatch) {
    const normalized = decodeURIComponent(koshSearchMatch[1])
    return normalized === 'ੴ'
      ? [{ id: 1, word: 'ik oankar', wordUni: 'ੴ', definition: 'One Creator', definitionUni: 'ਇੱਕ ਕਰਤਾ ਪੁਰਖ' }]
      : []
  }

  const koshMatch = url.pathname.match(/^\/v2\/kosh\/(.+)$/)
  if (koshMatch) {
    const normalized = decodeURIComponent(koshMatch[1])
    return normalized === 'ੴ'
      ? [{ id: 1, word: 'ik oankar', wordUni: 'ੴ' }]
      : []
  }

  if (url.pathname === '/v2/rehats') {
    return { maryadas: [{ rehatID: 1, rehatName: 'Sikh Rehat Maryada', alphabet: 'S' }] }
  }

  const rehatChapterContentMatch = url.pathname.match(/^\/v2\/rehats\/(\d+)\/chapters\/(\d+)$/)
  if (rehatChapterContentMatch) {
    return {
      chapters: [
        {
          chapterID: Number(rehatChapterContentMatch[2]),
          chapterName: 'Daily Discipline',
          chapterContent: '<p>Amritvela, nitnem, seva, and simran remain central.</p>',
          alphabet: 'D',
        },
      ],
    }
  }

  if (/^\/v2\/rehats\/\d+$/.test(url.pathname)) {
    return { chapters: [{ chapterID: 11, chapterName: 'Daily Discipline', alphabet: 'D' }] }
  }

  return null
}
