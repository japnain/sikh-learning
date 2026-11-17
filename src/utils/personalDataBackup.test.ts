import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPersonalDataBackupResult, createPersonalDataBackup, mergePersonalDataBackups, parsePersonalDataBackup, PERSONAL_DATA_KEYS, restorePersonalDataBackupResult, restorePersonalDataBackup, summarizePersonalDataBackup } from './personalDataBackup'
import { useLanguageStore } from '../store/language'
import { useStoryStore } from '../store/stories'
import { useNitnemHistoryStore } from '../store/nitnemHistory'
import { useVocabStore } from '../store/vocab'
import { useReadingPlacesStore } from '../store/readingPlaces'
import { useBookmarksStore } from '../store/bookmarks'
import { useNitemStore, buildNitnemStudyPath, getNitnemOption, NITNEM_ROUTE_OPTIONS } from '../store/nitnem'
import { useReadingVisibilityStore } from '../store/readingVisibility'
import { getLocalCollectionSnapshotKey } from './localCollection'
import { DEFAULT_EPUB_READER_PREFERENCES, EPUB_READER_PREFERENCES_KEY } from './epubReaderPreferences'
import { getPersonalStorage, getPersonalStorageForOwner, resetPersonalStorageOwnerForTests, selectPersonalStorageOwner } from './ownerStorage'

const clock = '2026-10-20T10:00:00.000Z'
const bookmark = { id: 'saved-a', title: 'Japji Sahib', type: 'bani', source: 'G', ang: 1, savedAt: clock }
const event = { id: 'completion-a', optionId: 'japji-sahib', date: '2026-10-20', completed: true, occurredAt: clock, source: 'manual', wasSelected: true }
const word = { word: 'ਨਾਮੁ', transliteration: 'naam', kind: 'word', meaning_en: 'Name', meaning_hi: '', meaning_pa: '', scripture: 'Japji Sahib', sourceId: 'G', savedAt: clock,
  definitionSource: { name: 'Dictionary', url: 'https://example.com/word' }, context: { scripture: 'Japji Sahib', sourceId: 'G', ang: 1, line: 'ਸਤਿ ਨਾਮੁ' },
  senses: [{ meaning_en: 'Divine Name', meaning_hi: '', meaning_pa: '', context: { scripture: 'Other line', sourceId: 'G', ang: 2 } }] }
const noRuntime = { rehydrate: async () => {}, pauseSync: () => () => {} }
function state(backup: ReturnType<typeof createPersonalDataBackup>, key: string) { return (backup.data[key] as { state: Record<string, unknown> }).state }
beforeEach(() => { resetPersonalStorageOwnerForTests(); localStorage.clear(); vi.restoreAllMocks() })
afterEach(() => { resetPersonalStorageOwnerForTests() })

describe('portable data owner boundary', () => {
  it('allows only validated synchronous restore hydration to persist migrated reading places while sync is paused', async () => {
    selectPersonalStorageOwner('restore-hydration-account')
    const backup = createPersonalDataBackup()
    const path = buildNitnemStudyPath(getNitnemOption('japji-sahib')!)
    const session = { scriptureId: 'G-1', resumePath: path, resumeVerseId: 10, updatedAt: clock }
    state(backup, 'sikh-progress').currentSession = session
    state(backup, 'naamras-reading-places').places = {}
    await restorePersonalDataBackup(backup, 'replace')
    const storedPlaces = JSON.parse(getPersonalStorage().getItem('naamras-reading-places')!).state.places
    expect(Object.values(storedPlaces)).toContainEqual(session)
    expect(getPersonalStorage().getItem('naamras-personal-data-restore-recovery')).toBeNull()
  })

  it('exports only the active account partition and keeps guest data separate', () => {
    localStorage.setItem('sikh-bookmarks', JSON.stringify([bookmark]))
    selectPersonalStorageOwner('synthetic-account-a')
    const accountBookmark = { ...bookmark, id: 'account-bookmark', ang: 2 }
    getPersonalStorage().setItem('sikh-bookmarks', JSON.stringify([accountBookmark]))
    expect(createPersonalDataBackup().data['sikh-bookmarks']).toEqual([accountBookmark])
    expect(createPersonalDataBackup(getPersonalStorageForOwner('local')).data['sikh-bookmarks']).toEqual([bookmark])
  })

  it('rolls back only the captured owner when identity changes during asynchronous restore hydration', async () => {
    selectPersonalStorageOwner('synthetic-account-a')
    const accountA = getPersonalStorage()
    accountA.setItem('sikh-bookmarks', JSON.stringify([bookmark]))
    const incoming = createPersonalDataBackup()
    incoming.data['sikh-bookmarks'] = [{ ...bookmark, id: 'restored-a', ang: 2 }]
    const beforeA = accountA.getItem('sikh-bookmarks')
    const accountBBookmark = { ...bookmark, id: 'account-b', ang: 3 }
    const hydrate = vi.fn(async () => {
      selectPersonalStorageOwner('synthetic-account-b')
      getPersonalStorage().setItem('sikh-bookmarks', JSON.stringify([accountBBookmark]))
    })
    await expect(restorePersonalDataBackup(incoming, 'replace', { rehydrate: hydrate, pauseSync: noRuntime.pauseSync })).rejects.toThrow('restore-failed')
    expect(accountA.getItem('sikh-bookmarks')).toBe(beforeA)
    expect(JSON.parse(getPersonalStorage().getItem('sikh-bookmarks')!)).toEqual([accountBBookmark])
    expect(hydrate).toHaveBeenCalledTimes(1)
  })

  it('preserves intervening edits when A returns during restore and keeps recovery blocked', async () => {
    selectPersonalStorageOwner('synthetic-account-a')
    getPersonalStorage().setItem('sikh-bookmarks', JSON.stringify([bookmark]))
    const incoming = createPersonalDataBackup()
    const newer = { ...bookmark, id: 'newer-account-a', ang: 4 }
    const resume = vi.fn()
    await expect(restorePersonalDataBackup(incoming, 'replace', {
      pauseSync: () => resume,
      rehydrate: async () => {
        selectPersonalStorageOwner('synthetic-account-b')
        selectPersonalStorageOwner('synthetic-account-a')
        getPersonalStorage().setItem('sikh-bookmarks', JSON.stringify([newer]))
      },
    })).rejects.toThrow('restore-rollback-failed')
    expect(JSON.parse(getPersonalStorage().getItem('sikh-bookmarks')!)).toEqual([newer])
    expect(resume).toHaveBeenCalledWith(false, false)
  })
})

describe('portable reader appearance compatibility', () => {
  const appearance = { fontScale: 1.7, lineHeight: 'spacious', measure: 'wide', palette: 'sepia', fontFamily: 'sans', paragraphSpacing: 'compact', readingMode: 'scroll', pageTurn: 'fade' } as const

  it.each(['merge', 'replace'] as const)('round-trips all eight current fields through %s, actual store hydration and re-export', async mode => {
    const { useEpubReaderStore } = await import('../store/epubReader')
    useEpubReaderStore.setState(appearance)
    const exported = createPersonalDataBackupResult()
    expect(exported.omittedPreferences).not.toContain(EPUB_READER_PREFERENCES_KEY)
    expect(exported.backup.data[EPUB_READER_PREFERENCES_KEY]).toEqual({ version: 2, state: appearance })
    useEpubReaderStore.getState().resetPreferences()
    localStorage.clear()
    await restorePersonalDataBackup(exported.backup, mode, { pauseSync: noRuntime.pauseSync })
    await useEpubReaderStore.persist.rehydrate()
    expect(useEpubReaderStore.getState()).toMatchObject(appearance)
    expect(createPersonalDataBackup().data[EPUB_READER_PREFERENCES_KEY]).toEqual({ version: 2, state: appearance })
  })

  it.each([1, 2])('preserves version %s fields and supplies only absent newer appearance fields', async version => {
    const legacy = version === 1
      ? { fontScale: 1.45, lineHeight: 'compact', measure: 'narrow', palette: 'night' }
      : { fontScale: 1.45, lineHeight: 'compact', measure: 'narrow', palette: 'night', fontFamily: 'classic', paragraphSpacing: 'compact' }
    const raw = JSON.stringify({ version, state: legacy })
    localStorage.setItem(EPUB_READER_PREFERENCES_KEY, raw)
    const exported = createPersonalDataBackupResult()
    const expected = { version: 2, state: { ...DEFAULT_EPUB_READER_PREFERENCES, ...legacy } }
    expect(exported.omittedPreferences).not.toContain(EPUB_READER_PREFERENCES_KEY)
    expect(exported.backup.data[EPUB_READER_PREFERENCES_KEY]).toEqual(expected)
    expect(localStorage.getItem(EPUB_READER_PREFERENCES_KEY)).toBe(raw)
    exported.backup.data[EPUB_READER_PREFERENCES_KEY] = { version, state: legacy }
    await restorePersonalDataBackup(exported.backup, 'replace', { pauseSync: noRuntime.pauseSync })
    expect(createPersonalDataBackup().data[EPUB_READER_PREFERENCES_KEY]).toEqual(expected)
  })

  it('rejects future schemas on import and explicitly reports them on export without overwriting their bytes', () => {
    const backup = createPersonalDataBackup()
    const future = { version: 3, state: { ...appearance, newPreference: 'preserve' } }
    backup.data[EPUB_READER_PREFERENCES_KEY] = future
    expect(() => parsePersonalDataBackup(JSON.stringify(backup))).toThrow('preference-version')
    const raw = JSON.stringify(future)
    localStorage.setItem(EPUB_READER_PREFERENCES_KEY, raw)
    const result = createPersonalDataBackupResult()
    expect(result.omittedPreferences).toContain(EPUB_READER_PREFERENCES_KEY)
    expect(result.backup.data[EPUB_READER_PREFERENCES_KEY]).toEqual({ version: 2, state: DEFAULT_EPUB_READER_PREFERENCES })
    expect(localStorage.getItem(EPUB_READER_PREFERENCES_KEY)).toBe(raw)
  })

  it.each([
    { fontScale: 3 }, { fontScale: '1.3' }, { lineHeight: 'huge' }, { measure: 'full' },
    { palette: 'custom' }, { fontFamily: 'remote' }, { paragraphSpacing: -1 },
    { readingMode: 'unknown' }, { pageTurn: 'unknown' }, { unknownField: true },
  ])('rejects malformed appearance fields before any restore writes: %j', async invalid => {
    const backup = createPersonalDataBackup()
    backup.data[EPUB_READER_PREFERENCES_KEY] = { version: 2, state: { ...appearance, ...invalid } }
    const write = vi.spyOn(localStorage, 'setItem')
    await expect(restorePersonalDataBackup(backup, 'replace', noRuntime)).rejects.toThrow('preference-state')
    expect(write).not.toHaveBeenCalled()
  })
})

describe('portable personal data', () => {
  it('replace restores hidden places to the shelf while merge keeps device-local dismissals', async () => {
    useReadingVisibilityStore.getState().hide('book:sample', clock)
    const backup = createPersonalDataBackup()
    expect(backup.data).not.toHaveProperty('naamras-reading-visibility')
    await restorePersonalDataBackup(backup, 'merge', { pauseSync: noRuntime.pauseSync })
    expect(useReadingVisibilityStore.getState().hidden).toEqual({ 'book:sample': clock })
    await restorePersonalDataBackup(backup, 'replace', { pauseSync: noRuntime.pauseSync })
    expect(useReadingVisibilityStore.getState().hidden).toEqual({})
    expect(JSON.parse(localStorage.getItem('naamras-reading-visibility')!).state.hidden).toEqual({})
  })

  it('rolls shelf visibility back with personal data when replace hydration fails', async () => {
    useReadingVisibilityStore.getState().hide('book:sample', clock)
    const previousVisibility = localStorage.getItem('naamras-reading-visibility')
    const backup = createPersonalDataBackup()
    vi.spyOn(useReadingVisibilityStore.persist, 'rehydrate').mockRejectedValueOnce(new Error('hydrate failed'))
    await expect(restorePersonalDataBackup(backup, 'replace', { pauseSync: noRuntime.pauseSync })).rejects.toThrow('restore-failed')
    expect(localStorage.getItem('naamras-reading-visibility')).toBe(previousVisibility)
    expect(useReadingVisibilityStore.getState().hidden).toEqual({ 'book:sample': clock })
  })

  it('migrates legacy recent searches and retains distinct scopes when merging backups', () => {
    const legacy = createPersonalDataBackup()
    const item = { query: 'Nanak', mode: 'auto-detect', source: 'all', pinned: true, savedAt: clock }
    legacy.data['sikh-recent-search'] = { version: 1, state: { recent: [item] } }
    const migrated = parsePersonalDataBackup(JSON.stringify(legacy))
    expect(migrated.data['sikh-recent-search']).toEqual({ version: 2, state: { recent: [{ ...item, scope: 'all' }] } })
    const incoming = createPersonalDataBackup()
    state(incoming, 'sikh-recent-search').recent = [{ ...item, scope: 'stories' }]
    expect(state(mergePersonalDataBackups(migrated, incoming), 'sikh-recent-search').recent).toHaveLength(2)
  })

  it('exports valid legacy focused-reader sizes using the current shared range', () => {
    const state = { ...useLanguageStore.getState(), fontSize: 38 }
    localStorage.setItem('sikh-language', JSON.stringify({ state, version: 0 }))
    const backup = createPersonalDataBackup()
    expect((backup.data['sikh-language'] as { state: { fontSize: number } }).state.fontSize).toBe(34)
    expect(JSON.parse(localStorage.getItem('sikh-language')!).state.fontSize).toBe(38)
  })

  it('exports every personal domain and excludes auth, account/device identity and downloaded caches', () => {
    localStorage.setItem('sb-test-auth-token', 'secret')
    localStorage.setItem('naamras-device-id', 'private-device')
    localStorage.setItem('naamras-cloud-sync-export-metadata', 'private-sync')
    localStorage.setItem('sikh-scripture-cache', 'downloaded-text')
    localStorage.setItem('sikh-bookmarks', JSON.stringify([bookmark]))
    localStorage.setItem('sikh-vocab', JSON.stringify({ version: 0, state: { vocab: [word] } }))
    const backup = createPersonalDataBackup()
    expect(Object.keys(backup.data).sort()).toEqual([...PERSONAL_DATA_KEYS].sort())
    expect(JSON.stringify(backup)).not.toMatch(/secret|private-device|private-sync|downloaded-text/)
    expect(state(backup, 'sikh-vocab').vocab).toEqual([word])
    expect(summarizePersonalDataBackup(backup)).toMatchObject({ bookmarks: 1, words: 1 })
  })

  it('rejects unsupported versions, dangerous state keys, invalid nested values and external reader links before writing', async () => {
    const valid = createPersonalDataBackup()
    for (const change of [
      (value: typeof valid) => { value.version = 2 as 1 },
      (value: typeof valid) => { state(value, 'sikh-language').setFontSize = 'corrupted action' },
      (value: typeof valid) => { state(value, 'sikh-language').fontSize = 1000 },
      (value: typeof valid) => { state(value, 'sikh-vocab').vocab = [{ ...word, senses: [{ meaning_en: 12 }] }] },
      (value: typeof valid) => { state(value, 'sikh-progress').currentSession = { scriptureId: 'G-1', resumePath: 'https://evil.test', updatedAt: clock } },
    ]) {
      const corrupt = structuredClone(valid); change(corrupt)
      expect(() => parsePersonalDataBackup(JSON.stringify(corrupt))).toThrow()
    }
    expect(() => parsePersonalDataBackup(JSON.stringify(valid).replace('"data":{', '"data":{"__proto__":{},'))).toThrow()
    expect(localStorage.length).toBe(0)
  })

  it('merges historical completion and new places without duplicating saves or replacing current preferences', () => {
    localStorage.setItem('sikh-language', JSON.stringify({ state: { ...state(createPersonalDataBackup(), 'sikh-language'), fontSize: 28 }, version: 0 }))
    const current = createPersonalDataBackup(), incoming = createPersonalDataBackup()
    current.data['sikh-bookmarks'] = [bookmark]
    incoming.data['sikh-bookmarks'] = [{ ...bookmark, id: 'other-device-id' }]
    state(current, 'sikh-vocab').vocab = [word]
    state(incoming, 'sikh-vocab').vocab = [{ ...word, meaning_en: 'Identity', savedAt: '2026-10-21T10:00:00.000Z' }]
    state(incoming, 'naamras-nitnem-history').events = [event]
    state(incoming, 'sikh-language').fontSize = 34
    const merged = mergePersonalDataBackups(current, incoming)
    expect((merged.data['sikh-bookmarks'] as unknown[])).toHaveLength(1)
    expect(state(merged, 'sikh-language').fontSize).toBe(28)
    expect(state(merged, 'naamras-nitnem-history').events).toEqual([event])
    expect((state(merged, 'sikh-vocab').vocab as typeof word[])[0].senses).toEqual(expect.arrayContaining([expect.objectContaining({ meaning_en: 'Identity' })]))
  })

  it('rolls every touched storage key back if a write fails and never changes mounted stores', async () => {
    localStorage.setItem('sikh-bookmarks', JSON.stringify([bookmark]))
    const before = new Map(PERSONAL_DATA_KEYS.map(key => [key, localStorage.getItem(key)]))
    const incoming = createPersonalDataBackup()
    state(incoming, 'sikh-language').fontSize = 34
    const write = localStorage.setItem.bind(localStorage)
    let failed = false
    vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (!failed && key === 'sikh-vocab') { failed = true; throw new DOMException('Full', 'QuotaExceededError') }
      write(key, value)
    })
    const rehydrate = vi.fn(async () => {})
    await expect(restorePersonalDataBackup(incoming, 'replace', { ...noRuntime, rehydrate })).rejects.toThrow('restore-failed')
    expect(rehydrate).not.toHaveBeenCalled()
    expect(new Map(PERSONAL_DATA_KEYS.map(key => [key, localStorage.getItem(key)]))).toEqual(before)
  })

  it('detects a silently discarded storage write', async () => {
    const incoming = createPersonalDataBackup()
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {})
    await expect(restorePersonalDataBackup(incoming, 'replace', noRuntime)).rejects.toThrow('restore-failed')
  })

  it('captures merge and rollback data only after sync has paused', async () => {
    const incoming = createPersonalDataBackup()
    const pauseSync = () => {
      // Models a cloud/local edit that completed while runtime was being loaded.
      localStorage.setItem('sikh-bookmarks', JSON.stringify([bookmark]))
      return () => {}
    }
    await restorePersonalDataBackup(incoming, 'merge', { ...noRuntime, pauseSync })
    expect(JSON.parse(localStorage.getItem('sikh-bookmarks')!)).toEqual([bookmark])
  })

  it('keeps cloud sync paused when storage cannot roll back a partial restore', async () => {
    useLanguageStore.getState().setFontSize(22)
    const incoming = createPersonalDataBackup()
    state(incoming, 'sikh-language').fontSize = 34
    const write = localStorage.setItem.bind(localStorage)
    let blocked = false
    vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (key === 'sikh-vocab') blocked = true
      if (blocked) throw new DOMException('Full', 'QuotaExceededError')
      write(key, value)
    })
    const resume = vi.fn()
    await expect(restorePersonalDataBackup(incoming, 'replace', { ...noRuntime, pauseSync: () => resume })).rejects.toThrow('restore-rollback-failed')
    expect(resume).toHaveBeenCalledWith(false, false)
  })

  it('restores full continuity and preferences onto a clean device and rehydrates the actual stores', async () => {
    const incoming = createPersonalDataBackup()
    incoming.data['sikh-bookmarks'] = [bookmark]
    state(incoming, 'sikh-vocab').vocab = [word]
    state(incoming, 'sikh-language').fontSize = 32
    state(incoming, 'sikh-epub-reader-preferences').fontScale = 1.2
    state(incoming, 'naamras-nitnem-history').events = [event]
    state(incoming, 'sikh-nitnem').weeklyDayGoal = 4
    const path = buildNitnemStudyPath(getNitnemOption('japji-sahib')!)
    const place = { scriptureId: 'G-1', resumePath: path, resumeVerseId: 10, updatedAt: clock }
    const { getExactReadingKey } = await import('../store/readingPlaces')
    state(incoming, 'naamras-reading-places').places = { [getExactReadingKey(path)!]: place }
    const storyPosition = { paragraphId: 'paragraph-1', progress: 0.5, revision: 1, updatedAt: clock }
    incoming.data['naamras-story-state-v1'] = { version: 1, saved: {}, positions: { 'bhai-lalo': storyPosition } }
    await restorePersonalDataBackup(incoming, 'replace', { pauseSync: noRuntime.pauseSync })
    expect(useLanguageStore.getState().fontSize).toBe(32)
    expect(useBookmarksStore.getState().bookmarks).toEqual([bookmark])
    expect(useVocabStore.getState().vocab[0]).toMatchObject(word)
    expect(useNitnemHistoryStore.getState().events).toEqual([event])
    expect(useNitemStore.getState().weeklyDayGoal).toBe(4)
    expect(Object.values(useReadingPlacesStore.getState().places)).toEqual([place])
    expect(useStoryStore.getState().positions['bhai-lalo']).toEqual(storyPosition)
    const exported = createPersonalDataBackup()
    expect(state(exported, 'sikh-epub-reader-preferences').fontScale).toBe(1.2)
    expect(summarizePersonalDataBackup(exported)).toMatchObject({ bookmarks: 1, words: 1, readingPlaces: 2, nitnemEvents: 1 })
  })
})


it('round-trips actual public store actions including book locators, artwork, active practice and attributed vocabulary', async () => {
  const [{ useEpubReaderStore }, { useProgressStore }, { useHomeArtworkStore }, { useFavoritesStore }, { useNitnemPracticeStore }, { useRecentSearchStore }, { useMusicStore }, { useOnboardingStore }, { useSundarGutkaLengthStore }] = await Promise.all([
    import('../store/epubReader'), import('../store/progress'), import('../store/homeArtwork'), import('../store/favorites'), import('../store/nitnemPractice'), import('../store/recentSearch'), import('../store/music'), import('../store/onboarding'), import('../store/sundarGutkaLength'),
  ])
  const { default: story } = await import('../../public/data/stories/bhai-lalo.json')
  const { parseSummary } = await import('../data/storyValidation')
  const path = buildNitnemStudyPath(getNitnemOption('japji-sahib')!)
  useBookmarksStore.getState().addBookmark({ type: 'book', title: 'Book chapter', workId: 'panth-prakash-english', chapterId: 'episode-1', chapterLabel: '1', blockId: 'block-1' })
  useFavoritesStore.getState().addFavorite({ source: 'G', ang: 1, type: 'ang', title: 'Ang one' })
  useVocabStore.getState().addWord(word)
  useStoryStore.getState().saveStory(parseSummary(story)!)
  useStoryStore.getState().savePosition(story.id, { paragraphId: story.paragraphs[0].id, progress: 0.4, revision: story.revision })
  useNitnemHistoryStore.getState().record({ ...event, source: 'manual' })
  useNitnemPracticeStore.getState().start('japji-sahib', path)
  useNitemStore.getState().setWeeklyDayGoal(3)
  useLanguageStore.getState().setFontSize(30)
  useEpubReaderStore.getState().setFontScale(99)
  expect(useEpubReaderStore.getState().fontScale).toBe(2)
  useEpubReaderStore.getState().setLineHeight('spacious')
  useHomeArtworkStore.getState().applyPreferences({ mode: 'daily', selectedId: 'court-mural' })
  useMusicStore.getState().setVolume(0.2)
  useOnboardingStore.getState().completeOnboarding('daily-reader')
  useSundarGutkaLengthStore.getState().setLength('rehras-sahib', 'long')
  useRecentSearchStore.getState().addRecent('Khalsa', 'english', 'all')
  useProgressStore.getState().updateSession({ scriptureId: 'book:panth-prakash-english:episode-1', resumePath: '/library/panth-prakash-english/chapters/episode-1', updatedAt: clock,
    readerLocator: { href: '/library/panth-prakash-english/chapters/episode-1', type: 'application/xhtml+xml', locations: { progression: 0.4, totalProgression: 0.1, position: 35, blockId: 'block-1' } } })
  const backup = createPersonalDataBackup()
  localStorage.clear()
  useLanguageStore.getState().setFontSize(18)
  await restorePersonalDataBackup(backup, 'replace', { pauseSync: noRuntime.pauseSync })
  const after = createPersonalDataBackup()
  expect(summarizePersonalDataBackup(after)).toEqual(summarizePersonalDataBackup(backup))
  expect(useLanguageStore.getState().fontSize).toBe(30)
  expect(useEpubReaderStore.getState()).toMatchObject({ fontScale: 2, lineHeight: 'spacious' })
  expect(useNitnemPracticeStore.getState().active?.optionId).toBe('japji-sahib')
  expect(useNitemStore.getState().weeklyDayGoal).toBe(3)
  expect(useHomeArtworkStore.getState().mode).toBe('daily')
  expect(useProgressStore.getState().currentSession?.readerLocator?.locations.blockId).toBe('block-1')
  expect(useStoryStore.getState().saved[story.id]?.title).toBe(story.title)
  expect(useVocabStore.getState().vocab.find(item => item.word === word.word)?.definitionSource).toEqual(word.definitionSource)
  expect(state(after, 'sikh-music').volume).toBe(0.2)
  expect(state(after, 'sikh-sundar-gutka-lengths').lengths).toMatchObject({ 'rehras-sahib': 'long' })
})


it('rolls mounted stores and disk back if hydration fails after some domains have applied', async () => {
  useLanguageStore.getState().setFontSize(24)
  const incoming = createPersonalDataBackup()
  state(incoming, 'sikh-language').fontSize = 34
  const before = new Map(PERSONAL_DATA_KEYS.map(key => [key, localStorage.getItem(key)]))
  vi.spyOn(useVocabStore.persist, 'rehydrate').mockRejectedValueOnce(new Error('hydrate failed'))
  await expect(restorePersonalDataBackup(incoming, 'replace', { pauseSync: noRuntime.pauseSync })).rejects.toThrow('restore-failed')
  expect(useLanguageStore.getState().fontSize).toBe(24)
  expect(new Map(PERSONAL_DATA_KEYS.map(key => [key, localStorage.getItem(key)]))).toEqual(before)
})

it('replaces old mounted reading places before migrating the restored global session', async () => {
  const { useProgressStore } = await import('../store/progress')
  const incoming = createPersonalDataBackup()
  const source = { scriptureId: 'G-20', resumePath: '/study?source=G&ang=20', resumeVerseId: 234, updatedAt: clock }
  const book = {
    scriptureId: 'panth-prakash-english-episode-001',
    resumePath: '/library/panth-prakash-english/chapters/episode-001', updatedAt: clock,
    readerLocator: {
      href: '/library/panth-prakash-english/chapters/episode-001', type: 'application/xhtml+xml', revision: 'edition-1',
      locations: { progression: .4, totalProgression: .1, position: 12, blockId: 'paragraph-12' },
    },
  }
  const importedPlaces = { 'source:G': source, 'book:panth-prakash-english': book }
  state(incoming, 'naamras-reading-places').places = importedPlaces
  state(incoming, 'sikh-progress').currentSession = source
  const previous = { scriptureId: 'D-1', resumePath: '/study?source=D&ang=1', resumeVerseId: 99, updatedAt: clock }
  useReadingPlacesStore.setState({ places: { 'source:D': previous } })
  useProgressStore.setState({ currentSession: previous })

  await restorePersonalDataBackup(incoming, 'replace', { pauseSync: noRuntime.pauseSync })

  expect(useReadingPlacesStore.getState().places).toEqual(importedPlaces)
  expect(state(createPersonalDataBackup(), 'naamras-reading-places').places).toEqual(importedPlaces)
  expect(useProgressStore.getState().currentSession).toEqual(source)
})


describe('personal data recovery', () => {
  it('exports all valid saved work and names damaged optional preferences without modifying storage', () => {
    localStorage.setItem('sikh-bookmarks', JSON.stringify([bookmark]))
    localStorage.setItem('sikh-vocab', JSON.stringify({ version: 0, state: { vocab: [word] } }))
    localStorage.setItem('naamras-ui-disclosure', '{bad json')
    localStorage.setItem('naamras-reader-presentation', 'obsolete')
    localStorage.setItem('sikh-theme', JSON.stringify({ version: 1, state: { mode: 'invalid' } }))
    const before = { ...localStorage }
    const { backup, omittedPreferences } = createPersonalDataBackupResult()
    expect(omittedPreferences).toEqual(['sikh-theme', 'naamras-reader-presentation', 'naamras-ui-disclosure'])
    expect(backup.data['naamras-ui-disclosure']).toEqual({})
    expect(backup.data['naamras-reader-presentation']).toBeNull()
    expect(summarizePersonalDataBackup(backup)).toMatchObject({ bookmarks: 1, words: 1 })
    expect({ ...localStorage }).toEqual(before)
    expect(parsePersonalDataBackup(JSON.stringify(backup))).toEqual(backup)
  })

  it.each(['sikh-bookmarks', 'sikh-favorites', 'sikh-vocab', 'naamras-story-state-v1'])('never silently drops malformed critical data from %s', key => {
    localStorage.setItem('sikh-bookmarks', JSON.stringify([bookmark]))
    localStorage.setItem(key, key === 'sikh-bookmarks' ? JSON.stringify([bookmark, { id: 'bad' }]) : '{bad json')
    expect(() => createPersonalDataBackupResult()).toThrow()
  })

  it('keeps storage access failures visible even for optional preferences', () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => { throw new DOMException('Denied', 'SecurityError') })
    expect(() => createPersonalDataBackupResult()).toThrow('Denied')
  })

  it('merges valid local and imported saves despite a damaged disclosure preference', async () => {
    const incoming = createPersonalDataBackup()
    incoming.data['sikh-bookmarks'] = [{ ...bookmark, id: 'incoming', ang: 2 }]
    localStorage.setItem('sikh-bookmarks', JSON.stringify([bookmark]))
    localStorage.setItem('naamras-ui-disclosure', '{broken')
    const { backup: restored, omittedPreferences } = await restorePersonalDataBackupResult(incoming, 'merge', noRuntime)
    expect(omittedPreferences).toEqual(['naamras-ui-disclosure'])
    expect(restored.data['sikh-bookmarks']).toHaveLength(2)
    expect(restored.data['naamras-ui-disclosure']).toEqual({})
    expect(createPersonalDataBackup().data['sikh-bookmarks']).toHaveLength(2)
  })

  it('rolls collection snapshot pointers back after a later hydration failure', async () => {
    const incoming = createPersonalDataBackup()
    useBookmarksStore.getState().replaceBookmarks([{ ...bookmark, type: 'bani' }])
    const key = getLocalCollectionSnapshotKey('sikh-bookmarks')
    const previous = localStorage.getItem(key)
    const rehydrate = vi.fn().mockRejectedValueOnce(new Error('failed')).mockResolvedValue(undefined)
    await expect(restorePersonalDataBackup(incoming, 'replace', { ...noRuntime, rehydrate })).rejects.toThrow('restore-failed')
    expect(localStorage.getItem(key)).toBe(previous)
    expect(createPersonalDataBackup().data['sikh-bookmarks']).toEqual([bookmark])
  })
})

it('keeps recovery-required classification when storage reads fail during rollback notification', async () => {
  const incoming = createPersonalDataBackup()
  const resume = vi.fn()
  const rehydrate = vi.fn(async () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => { throw new DOMException('Unavailable', 'SecurityError') })
    throw new Error('hydrate-failed')
  })
  await expect(restorePersonalDataBackup(incoming, 'replace', { rehydrate, pauseSync: () => resume })).rejects.toThrow('restore-rollback-failed')
  expect(resume).toHaveBeenCalledWith(false, false)
})

it('allows explicit replace to recover a corrupt collection snapshot', async () => {
  const incoming = createPersonalDataBackup()
  incoming.data['sikh-bookmarks'] = [bookmark]
  localStorage.setItem(getLocalCollectionSnapshotKey('sikh-bookmarks'), '{broken')
  await restorePersonalDataBackup(incoming, 'replace', noRuntime)
  expect(createPersonalDataBackup().data['sikh-bookmarks']).toEqual([bookmark])
})

it('keeps an unsaved vocabulary retry available when a later restore hydration fails', async () => {
  useVocabStore.setState({ vocab: [] })
  const incoming = createPersonalDataBackup()
  const write = localStorage.setItem.bind(localStorage)
  const failingWrite = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
    if (key === 'sikh-vocab' || key.startsWith('naamras-collection-v1:sikh-vocab:')) throw new DOMException('Full', 'QuotaExceededError')
    write(key, value)
  })
  useVocabStore.getState().addWord({ ...word, kind: 'word' })
  expect(useVocabStore.getState().vocab).toHaveLength(1)
  failingWrite.mockRestore()
  vi.spyOn(useReadingVisibilityStore.persist, 'rehydrate').mockRejectedValueOnce(new Error('later hydration failed'))
  await expect(restorePersonalDataBackup(incoming, 'replace', { pauseSync: noRuntime.pauseSync })).rejects.toThrow('restore-failed')
  expect(useVocabStore.getState().vocab).toHaveLength(1)
  expect(useVocabStore.getState().retryPersistence()).toBe(true)
  expect(state(createPersonalDataBackup(), 'sikh-vocab').vocab).toHaveLength(1)
})


it('exports and restores an expanded daily routine without the obsolete fifty-bani limit', async () => {
  const ids = NITNEM_ROUTE_OPTIONS.map(option => option.id).reverse()
  useNitemStore.setState({ selectedIds: ids, completedIds: [], completedDate: '2026-11-12', completionTrackingEnabled: true, weeklyDayGoal: 7 })
  const result = createPersonalDataBackupResult()
  expect(result.omittedPreferences).not.toContain('sikh-nitnem')
  const parsed = parsePersonalDataBackup(JSON.stringify(result.backup))
  expect(state(parsed, 'sikh-nitnem').selectedIds).toEqual(ids)
  await restorePersonalDataBackup(parsed, 'replace', noRuntime)
  expect(JSON.parse(localStorage.getItem('sikh-nitnem')!).state.selectedIds).toEqual(ids)
})
