import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { useActivityEventsStore } from '../store/activityEvents'
import { useLocaleStore } from '../store/locale'
import { buildNitnemStudyPath, getNitnemOption, useNitemStore } from '../store/nitnem'
import { useNitnemHistoryStore } from '../store/nitnemHistory'
import { useNitnemPracticeStore } from '../store/nitnemPractice'
import { useProgressStore } from '../store/progress'
import { useReadingPlacesStore } from '../store/readingPlaces'
import { DEFAULT_SUNDAR_GUTKA_LENGTHS, useSundarGutkaLengthStore } from '../store/sundarGutkaLength'
import ReaderFinishPanel from './ReaderFinishPanel'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 17, 23, 59, 30))
  useLocaleStore.setState({ locale: 'en' })
  useSundarGutkaLengthStore.setState({ lengths: { ...DEFAULT_SUNDAR_GUTKA_LENGTHS } })
  useNitnemHistoryStore.setState({ events: [] })
  useNitnemPracticeStore.setState({ active: null })
  useActivityEventsStore.setState({ pendingEvents: [] })
  useProgressStore.setState({ currentSession: null })
  useReadingPlacesStore.setState({ places: {} })
  useNitemStore.setState({
    selectedIds: ['japji-sahib', 'jaap-sahib', 'rehras-sahib'],
    completedDate: '2026-10-17', completedIds: [], completionTrackingEnabled: true,
  })
})

afterEach(() => vi.restoreAllMocks())

const pathFor = (id: string) => buildNitnemStudyPath(getNitnemOption(id)!)

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="destination">{location.pathname}{location.search}|{location.state?.readerOrigin}</div>
}

function open(path = pathFor('japji-sahib')) {
  const again = vi.fn()
  const back = vi.fn()
  const result = render(<MemoryRouter initialEntries={[path]}>
    <ReaderFinishPanel readingPath={path} onReadAgain={again} onBack={back} />
    <LocationProbe />
  </MemoryRouter>)
  return { ...result, again, back }
}

test('reaching the finish panel does not complete a reading; an explicit action saves once and offers undo', () => {
  open()
  expect(useActivityEventsStore.getState().pendingEvents).toEqual([])
  fireEvent.click(screen.getByRole('button', { name: 'Mark complete for today' }))
  expect(screen.getByRole('status')).toHaveTextContent('Completed for today')
  expect(useNitemStore.getState().isComplete('japji-sahib')).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
  expect(screen.getByRole('button', { name: 'Mark complete for today' })).toBeInTheDocument()
  expect(useActivityEventsStore.getState().pendingEvents.map(event => event.eventType)).toEqual(['nitnem.completed', 'nitnem.uncompleted'])
})

test('next skips completed banis in personal order and returns to Home as the reader origin', () => {
  useNitemStore.getState().markComplete('jaap-sahib')
  open()
  fireEvent.click(screen.getByRole('button', { name: /Next bani Rehras Sahib/ }))
  expect(screen.getByTestId('destination')).toHaveTextContent(pathFor('rehras-sahib'))
  expect(screen.getByTestId('destination')).toHaveTextContent('|/')
  expect(useNitemStore.getState().isComplete('japji-sahib')).toBe(false)
})

test('next resumes its deliberately started exact practice without disturbing the previous reading', () => {
  useProgressStore.getState().updateSession({
    scriptureId: 'D-1', resumePath: pathFor('jaap-sahib'), resumeVerseId: 222,
    updatedAt: new Date().toISOString(),
  })
  useNitnemPracticeStore.getState().start('jaap-sahib', `${pathFor('jaap-sahib')}&resumeVerseId=222`)
  open()
  fireEvent.click(screen.getByRole('button', { name: /Next bani Jaap Sahib/ }))
  expect(screen.getByTestId('destination')).toHaveTextContent('resumeVerseId=222')
})

test('next begins a fresh practice instead of inheriting an unrelated old Study position', () => {
  useProgressStore.getState().updateSession({ scriptureId: 'D-1', resumePath: pathFor('jaap-sahib'), resumeVerseId: 999, updatedAt: new Date().toISOString() })
  open()
  fireEvent.click(screen.getByRole('button', { name: /Next bani Jaap Sahib/ }))
  expect(screen.getByTestId('destination')).not.toHaveTextContent('resumeVerseId=999')
  expect(useNitnemPracticeStore.getState().active?.optionId).toBe('jaap-sahib')
})

test('an unrelated reading offers return and read-again without daily completion', () => {
  const { again, back } = open('/study?source=G&shabadId=4')
  expect(screen.queryByRole('button', { name: 'Mark complete for today' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Next bani/ })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Read again' }))
  const returnControl = screen.getByRole('button', { name: 'Return to where you started' })
  expect(returnControl).toHaveAttribute('data-reader-back', 'true')
  fireEvent.click(returnControl)
  expect(again).toHaveBeenCalledOnce()
  expect(back).toHaveBeenCalledOnce()
})

test('tracking disabled and a different exact variant never offer completion', () => {
  useNitemStore.setState({ completionTrackingEnabled: false })
  const first = open()
  expect(screen.queryByRole('button', { name: 'Mark complete for today' })).not.toBeInTheDocument()
  first.unmount()
  useNitemStore.setState({ completionTrackingEnabled: true, selectedIds: ['tav-prasad-savaiye'] })
  open(pathFor('tav-prasad-savaiye-dheenan-ki'))
  expect(screen.queryByRole('button', { name: 'Mark complete for today' })).not.toBeInTheDocument()
})

test('an open temporary reading stays eligible when the usual length changes', () => {
  open(pathFor('rehras-sahib'))
  expect(screen.getByRole('button', { name: 'Mark complete for today' })).toBeInTheDocument()
  act(() => useSundarGutkaLengthStore.getState().setLength('rehras-sahib', 'long'))
  expect(screen.getByRole('button', { name: 'Mark complete for today' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Mark complete for today' }))
  expect(screen.getByRole('status')).toHaveTextContent('Completed for today · Short')
  expect(useNitnemHistoryStore.getState().events.at(-1)?.readingPath).toContain('sgLength=short')
})

test('exploring Long retains Short practice credit and Undo uses the recorded Short event', () => {
  const short = pathFor('rehras-sahib')
  useNitemStore.getState().markComplete('rehras-sahib', short)
  open(short.replace('sgLength=short', 'sgLength=long'))
  expect(screen.queryByRole('button', { name: 'Finish this reading' })).not.toBeInTheDocument()
  expect(screen.getByRole('status')).toHaveTextContent('Completed for today · Short')
  expect(screen.getByRole('status')).not.toHaveTextContent('Long')
  fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
  expect(useNitnemHistoryStore.getState().events.at(-1)).toMatchObject({ completed: false, readingPath: short })
  expect(useNitemStore.getState().isComplete('rehras-sahib')).toBe(false)
})

test('an intentional Long reread can finish after Short completed today without rewriting practice credit', () => {
  useNitemStore.setState({ selectedIds: ['rehras-sahib'] })
  const short = pathFor('rehras-sahib')
  useNitemStore.getState().markComplete('rehras-sahib', short)
  const history = [...useNitnemHistoryStore.getState().events]
  const activity = [...useActivityEventsStore.getState().pendingEvents]
  useNitnemPracticeStore.getState().start('rehras-sahib', short.replace('sgLength=short', 'sgLength=long'))
  open(useNitnemPracticeStore.getState().active!.readingPath)
  expect(screen.queryByRole('button', { name: /Next bani/ })).not.toBeInTheDocument()
  expect(useNitnemPracticeStore.getState().active?.completed).toBe(false)
  fireEvent.click(screen.getByRole('button', { name: 'Finish this reading' }))
  expect(useNitnemPracticeStore.getState().active?.completed).toBe(true)
  expect(screen.queryByRole('button', { name: 'Finish this reading' })).not.toBeInTheDocument()
  expect(useNitnemHistoryStore.getState().events).toEqual(history)
  expect(useActivityEventsStore.getState().pendingEvents).toEqual(activity)
  expect(useNitemStore.getState().isComplete('rehras-sahib')).toBe(true)
  expect(screen.getByRole('status')).toHaveTextContent('Completed for today · Short')
  expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument()
})

test('finishing an intentional reread rolls back a failed context write and stays retryable', () => {
  useNitemStore.setState({ selectedIds: ['rehras-sahib'] })
  const short = pathFor('rehras-sahib')
  useNitemStore.getState().markComplete('rehras-sahib', short)
  useNitnemPracticeStore.getState().start('rehras-sahib', short.replace('sgLength=short', 'sgLength=long'))
  const before = useNitnemPracticeStore.getState().active!
  const stored = localStorage.getItem('naamras-nitnem-practice')
  open(before.readingPath)
  const realWrite = localStorage.setItem.bind(localStorage)
  const write = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
    if (key === 'naamras-nitnem-practice') throw new Error('Storage unavailable')
    realWrite(key, value)
  })
  fireEvent.click(screen.getByRole('button', { name: 'Finish this reading' }))
  expect(screen.getByRole('alert')).toHaveTextContent('This change could not be saved')
  expect(screen.getByRole('button', { name: 'Finish this reading' })).toBeInTheDocument()
  expect(useNitnemPracticeStore.getState().active).toEqual(before)
  expect(localStorage.getItem('naamras-nitnem-practice')).toBe(stored)
  expect(useNitnemHistoryStore.getState().events).toHaveLength(1)
  write.mockRestore()
  fireEvent.click(screen.getByRole('button', { name: 'Finish this reading' }))
  expect(useNitnemPracticeStore.getState().active?.completed).toBe(true)
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(useNitnemHistoryStore.getState().events).toHaveLength(1)
})

test('tracking off still lets an intentional reading finish without recording daily practice', () => {
  useNitemStore.setState({ selectedIds: ['rehras-sahib'], completionTrackingEnabled: false })
  useNitnemPracticeStore.getState().start('rehras-sahib', pathFor('rehras-sahib'))
  const practice = useNitnemPracticeStore.getState().active!
  const mounted = open(practice.readingPath)
  expect(screen.queryByRole('button', { name: 'Mark complete for today' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Finish this reading' }))
  expect(useNitnemPracticeStore.getState().active?.completed).toBe(true)
  expect(useNitemStore.getState().completionTrackingEnabled).toBe(false)
  expect(useNitemStore.getState().completedIds).toEqual([])
  expect(useNitnemHistoryStore.getState().events).toEqual([])
  expect(useActivityEventsStore.getState().pendingEvents).toEqual([])
  mounted.unmount()
  open(pathFor('rehras-sahib'))
  expect(screen.queryByRole('button', { name: 'Finish this reading' })).not.toBeInTheDocument()
})

test('complete and continue persists this reading before opening the next chosen bani', () => {
  open()
  fireEvent.click(screen.getByRole('button', { name: 'Complete & continue' }))
  expect(useNitemStore.getState().isComplete('japji-sahib')).toBe(true)
  expect(useNitnemHistoryStore.getState().events).toHaveLength(1)
  expect(screen.getByTestId('destination')).toHaveTextContent(pathFor('jaap-sahib'))
})

test('failed complete and continue leaves the current reading open and retryable', () => {
  open()
  const write = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Storage full') })
  fireEvent.click(screen.getByRole('button', { name: 'Complete & continue' }))
  expect(screen.getByTestId('destination')).toHaveTextContent(pathFor('japji-sahib'))
  expect(screen.getByRole('alert')).toHaveTextContent('This change could not be saved')
  expect(useNitemStore.getState().isComplete('japji-sahib')).toBe(false)
  write.mockRestore()
})

test('a session crossing midnight records the action for the new day immediately', () => {
  useNitemStore.getState().markComplete('japji-sahib')
  open()
  expect(screen.getByRole('status')).toHaveTextContent('Completed for today')
  act(() => vi.advanceTimersByTime(31000))
  fireEvent.click(screen.getByRole('button', { name: 'Mark complete for today' }))
  expect(screen.getByRole('status')).toHaveTextContent('Completed for today')
  expect(useNitnemHistoryStore.getState().events.map(event => event.date)).toEqual(['2026-10-17', '2026-10-18'])
})

test('a failed save shows a retryable message and keeps the reading uncompleted', () => {
  open()
  const write = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Storage full') })
  fireEvent.click(screen.getByRole('button', { name: 'Mark complete for today' }))
  expect(screen.getByRole('alert')).toHaveTextContent('This change could not be saved')
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  expect(useNitnemHistoryStore.getState().events).toEqual([])
  expect(useActivityEventsStore.getState().pendingEvents).toEqual([])
  write.mockRestore()
  fireEvent.click(screen.getByRole('button', { name: 'Mark complete for today' }))
  expect(screen.getByRole('status')).toHaveTextContent('Completed for today')
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(useNitnemHistoryStore.getState().events).toHaveLength(1)
})

test('a completed routine has a calm return action and never advances automatically', () => {
  useNitemStore.getState().markComplete('japji-sahib')
  useNitemStore.getState().markComplete('jaap-sahib')
  useNitemStore.getState().markComplete('rehras-sahib')
  open()
  expect(screen.queryByRole('button', { name: /Next bani/ })).not.toBeInTheDocument()
  expect(screen.getByTestId('destination')).toHaveTextContent(pathFor('japji-sahib'))
  fireEvent.click(screen.getByRole('button', { name: 'Return to today’s Nitnem' }))
  expect(screen.getByTestId('destination')).toHaveTextContent('/|')
})
