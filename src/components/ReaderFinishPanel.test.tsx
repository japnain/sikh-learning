import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { useActivityEventsStore } from '../store/activityEvents'
import { useLocaleStore } from '../store/locale'
import { buildNitnemStudyPath, getNitnemOption, useNitemStore } from '../store/nitnem'
import { useNitnemHistoryStore } from '../store/nitnemHistory'
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
  expect(screen.getByTestId('destination')).toHaveTextContent(`${pathFor('rehras-sahib')}|/`)
  expect(useNitemStore.getState().isComplete('japji-sahib')).toBe(false)
})

test('next resumes its own exact saved verse without disturbing the previous reading', () => {
  useProgressStore.getState().updateSession({
    scriptureId: 'D-1', resumePath: pathFor('jaap-sahib'), resumeVerseId: 222,
    updatedAt: new Date().toISOString(),
  })
  open()
  fireEvent.click(screen.getByRole('button', { name: /Next bani Jaap Sahib/ }))
  expect(screen.getByTestId('destination')).toHaveTextContent('resumeVerseId=222')
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

test('an open reader responds when its selected length changes', () => {
  open(pathFor('rehras-sahib'))
  expect(screen.getByRole('button', { name: 'Mark complete for today' })).toBeInTheDocument()
  act(() => useSundarGutkaLengthStore.getState().setLength('rehras-sahib', 'long'))
  expect(screen.queryByRole('button', { name: 'Mark complete for today' })).not.toBeInTheDocument()
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
