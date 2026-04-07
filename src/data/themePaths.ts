import type { ThemePath } from '../types'

export const THEME_PATHS: ThemePath[] = [
  {
    id: 'words-for-the-divine',
    title: 'Words For The Divine',
    subtitle: 'Names, qualities, and how Gurbani layers them',
    description: 'Follow divine names and qualities across roots, prefixes, and longer reflective lines.',
    themeTag: 'divine-names',
    moduleIds: [
      'start-satnam-meaning',
      'understand-naam-root',
      'understand-nir-prefix',
      'deep-sarab-attributes',
      'deep-theme-thread',
    ],
    wordFamilyIds: ['naam-root', 'sat-root', 'nir-root', 'har-root'],
    minimumProgramId: 'understand-gurbani',
  },
  {
    id: 'language-of-devotion',
    title: 'The Language Of Devotion',
    subtitle: 'How Gurbani speaks surrender, praise, and remembrance',
    description: 'Move through repeated devotional roots and short grammar notes that make prayerful language easier to follow.',
    themeTag: 'devotion',
    moduleIds: [
      'understand-keyword-family',
      'understand-gur-root',
      'deep-bhagat-family',
      'deep-hukam-clause',
    ],
    wordFamilyIds: ['bhagat-root', 'simar-root', 'aradh-root', 'saran-root'],
    minimumProgramId: 'understand-gurbani',
  },
  {
    id: 'nanak-speaks',
    title: 'Nanak Speaks',
    subtitle: 'Spot the Nanak marker and first-person voice',
    description: 'Learn how the signature and grammatical framing signal voice, reflection, and instruction.',
    themeTag: 'voice',
    moduleIds: [
      'deep-nanak-signature',
      'deep-classical-endings',
      'deep-passage-reflection',
    ],
    wordFamilyIds: ['jan-root', 'man-root'],
    minimumProgramId: 'deep-study',
  },
  {
    id: 'creation-and-time',
    title: 'Creation & Time',
    subtitle: 'Creator language, hukam, and timelessness',
    description: 'Trace creation language from opening decode work into hukam, timelessness, and the ਕਰ root family.',
    themeTag: 'creation',
    moduleIds: [
      'build-kartaa-decode',
      'deep-hukam-clause',
      'deep-kar-root',
      'deep-sarab-attributes',
    ],
    wordFamilyIds: ['kar-root', 'hukam-root', 'akal-time-root', 'purakh-root'],
    minimumProgramId: 'deep-study',
  },
  {
    id: 'inside-the-nitnem',
    title: 'Inside The Nitnem',
    subtitle: 'Recurring patterns across daily banis',
    description: 'Use guided reading, roots, and comparisons to recognize phrases that keep returning in daily practice.',
    themeTag: 'nitnem',
    moduleIds: [
      'start-japji-guided',
      'build-rehras-guided',
      'understand-jaap-guided',
      'understand-da-di-de',
      'understand-gur-root',
    ],
    wordFamilyIds: ['gur-root', 'naam-root', 'hukam-root'],
    minimumProgramId: 'build-fluency',
  },
]

export const THEME_PATH_BY_ID = Object.fromEntries(
  THEME_PATHS.map(path => [path.id, path])
) as Record<string, ThemePath>
