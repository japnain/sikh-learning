import { describe, expect, it } from 'vitest'
import type { ScriptureEntry } from '../types'
import { findRouteBani, resolveBaniStartMarker } from './baniStartMarker'

const rehrasPageEntries: ScriptureEntry[] = [
  {
    id: 'G-8-37',
    scripture: 'SGGS',
    ang: 8,
    source: 'G',
    shabadId: 37,
    verseIds: [348],
    gurmukhi: 'ਸਰਮ ਖੰਡ ਕੀ ਬਾਣੀ ਰੂਪੁ ॥',
    transliteration: 'saram kha(n)dd kee baanee roop ||',
    translation_en: 'The Word of the realm of humility is beauty.',
    translation_hi: '',
    translation_pa: '',
    lines: [
      {
        verseId: 348,
        shabadId: 37,
        ang: 8,
        gurmukhi: 'ਸਰਮ ਖੰਡ ਕੀ ਬਾਣੀ ਰੂਪੁ ॥',
        transliteration: 'saram kha(n)dd kee baanee roop ||',
        translation_en: 'The Word of the realm of humility is beauty.',
        translations_en: { bdb: 'The Word of the realm of humility is beauty.' },
        translation_hi: '',
        translation_pa: '',
      },
    ],
    words: [],
  },
  {
    id: 'G-8-40',
    scripture: 'SGGS',
    ang: 8,
    source: 'G',
    shabadId: 40,
    verseIds: [386, 388],
    gurmukhi: 'ਸੋ ਦਰੁ ਰਾਗੁ ਆਸਾ ਮਹਲਾ ੧',
    transliteration: 'so dhar raag aasaa mahalaa pehilaa',
    translation_en: 'So Dar.',
    translation_hi: '',
    translation_pa: '',
    lines: [
      {
        verseId: 386,
        shabadId: 40,
        ang: 8,
        gurmukhi: 'ਸੋ ਦਰੁ ਰਾਗੁ ਆਸਾ ਮਹਲਾ ੧',
        transliteration: 'so dhar raag aasaa mahalaa pehilaa',
        translation_en: 'So Dar.',
        translations_en: { bdb: 'So Dar.' },
        translation_hi: '',
        translation_pa: '',
      },
      {
        verseId: 388,
        shabadId: 40,
        ang: 8,
        gurmukhi: 'ਸੋ ਦਰੁ ਤੇਰਾ ਕੇਹਾ ਸੋ ਘਰੁ ਕੇਹਾ',
        transliteration: 'so dhar teraa kehaa so ghar kehaa',
        translation_en: 'Where is that Gate of Yours, and where is that Home?',
        translations_en: { bdb: 'Where is that Gate of Yours, and where is that Home?' },
        translation_hi: '',
        translation_pa: '',
      },
    ],
    words: [],
  },
]

const japjiEntries: ScriptureEntry[] = [
  {
    id: 'G-1-1',
    scripture: 'SGGS',
    ang: 1,
    source: 'G',
    shabadId: 1,
    verseIds: [1],
    gurmukhi: 'ੴ ਸਤਿ ਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ',
    transliteration: 'ik oa(n)kaar sat naam karataa purakh',
    translation_en: 'One Universal Creator God. The Name Is Truth.',
    translation_hi: '',
    translation_pa: '',
    lines: [
      {
        verseId: 1,
        shabadId: 1,
        ang: 1,
        gurmukhi: 'ੴ ਸਤਿ ਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ',
        transliteration: 'ik oa(n)kaar sat naam karataa purakh',
        translation_en: 'One Universal Creator God. The Name Is Truth.',
        translations_en: { bdb: 'One Universal Creator God. The Name Is Truth.' },
        translation_hi: '',
        translation_pa: '',
      },
    ],
    words: [],
  },
]

describe('bani start marker helpers', () => {
  it('matches canonical bani routes by source, start ang, and name', () => {
    expect(findRouteBani('Rehras Sahib', 'G', 8)?.id).toBe('rehras-sahib')
    expect(findRouteBani('Japji Sahib', 'G', 1)?.id).toBe('japji-sahib')
  })

  it('uses the exact override verse for overlapping bani starts like Rehras Sahib', () => {
    expect(
      resolveBaniStartMarker({
        baniName: 'Rehras Sahib',
        source: 'G',
        startAng: 8,
        currentAng: 8,
        entries: rehrasPageEntries,
      })
    ).toEqual({
      verseId: 386,
      label: 'Rehras Sahib starts here',
      bani: expect.objectContaining({ id: 'rehras-sahib' }),
    })
  })

  it('falls back to the first renderable line when a bani has no exact override', () => {
    expect(
      resolveBaniStartMarker({
        baniName: 'Japji Sahib',
        source: 'G',
        startAng: 1,
        currentAng: 1,
        entries: japjiEntries,
      })
    ).toEqual({
      verseId: 1,
      label: 'Japji Sahib starts here',
      bani: expect.objectContaining({ id: 'japji-sahib' }),
    })
  })

  it('does not show a start marker after the first ang of a bani', () => {
    expect(
      resolveBaniStartMarker({
        baniName: 'Japji Sahib',
        source: 'G',
        startAng: 1,
        currentAng: 2,
        entries: japjiEntries,
      })
    ).toBeNull()
  })
})
