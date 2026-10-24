import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPersonalDataBackup, mergePersonalDataBackups, parsePersonalDataBackup, PERSONAL_DATA_KEYS, restorePersonalDataBackup, summarizePersonalDataBackup } from './personalDataBackup'
import { useLanguageStore } from '../store/language'
import { useStoryStore } from '../store/stories'
import { useNitnemHistoryStore } from '../store/nitnemHistory'
import { useVocabStore } from '../store/vocab'
import { useReadingPlacesStore } from '../store/readingPlaces'
import { useBookmarksStore } from '../store/bookmarks'
import { useNitemStore, buildNitnemStudyPath, getNitnemOption } from '../store/nitnem'

const clock = '2026-10-20T10:00:00.000Z'
const bookmark = { id: 'saved-a', title: 'Japji Sahib', type: 'bani', source: 'G', ang: 1, savedAt: clock }
const event = { id: 'completion-a', optionId: 'japji-sahib', date: '2026-10-20', completed: true, occurredAt: clock, source: 'manual', wasSelected: true }
const word = { word: 'ਨਾਮੁ', transliteration: 'naam', kind: 'word', meaning_en: 'Name', meaning_hi: '', meaning_pa: '', scripture: 'Japji Sahib', sourceId: 'G', savedAt: clock,
  definitionSource: { name: 'Dictionary', url: 'https://example.com/word' }, context: { scripture: 'Japji Sahib', sourceId: 'G', ang: 1, line: 'ਸਤਿ ਨਾਮੁ' },
  senses: [{ meaning_en: 'Divine Name', meaning_hi: '', meaning_pa: '', context: { scripture: 'Other line', sourceId: 'G', ang: 2 } }] }
const noRuntime = { rehydrate: async () => {}, pauseSync: () => () => {} }
function state(backup: ReturnType<typeof createPersonalDataBackup>, key: string) { return (backup.data[key] as { state: Record<string, unknown> }).state }
beforeEach(() => { localStorage.clear(); vi.restoreAllMocks() })

describe('portable personal data', () => {
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
    expect(resume).toHaveBeenCalledWith(false)
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
  expect(useEpubReaderStore.getState().fontScale).toBe(1.3)
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
  expect(useEpubReaderStore.getState()).toMatchObject({ fontScale: 1.3, lineHeight: 'spacious' })
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
