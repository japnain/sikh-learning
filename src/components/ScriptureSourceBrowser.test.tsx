import { useEffect } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import ScriptureSourceBrowser from './ScriptureSourceBrowser'
import { useLocaleStore } from '../store/locale'
import { buildCurrentAppPath } from '../utils/libraryReaderNavigation'
import { restoreDiscoveryReturn } from '../utils/discoveryReturn'
import { mockDocumentScroll } from '../test/documentScroll'

function BrowserPage() {
  const location = useLocation()
  const path = buildCurrentAppPath(location)
  useEffect(() => restoreDiscoveryReturn(path), [path])
  return <><ScriptureSourceBrowser sectionIds={['sggs', 'dasam-granth', 'bhai-gurdas-vaaran']} /><output data-testid="location">{path}</output></>
}
function ReaderStub() {
  const location = useLocation()
  const navigate = useNavigate()
  return <><output data-testid="reader-path">{buildCurrentAppPath(location)}</output><output data-testid="reader-state">{JSON.stringify(location.state)}</output><button onClick={() => navigate(location.state.readerOrigin)}>Back to sources</button><button onClick={() => navigate(-1)}>Browser back</button></>
}
function mount(path = '/banis?collection=sources') {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/banis" element={<BrowserPage />} /><Route path="/study" element={<ReaderStub />} /></Routes></MemoryRouter>)
}

beforeEach(() => { vi.restoreAllMocks(); useLocaleStore.setState({ locale: 'en' }); sessionStorage.clear() })

describe('scripture source browser', () => {
  test('keeps source expansion and number page in the URL through reader Back', async () => {
    const scroll = mockDocumentScroll({ top: 650, scrollHeight: 4000 })
    try {
      mount()
      fireEvent.click(screen.getByRole('button', { name: 'Sri Guru Granth Sahib Ji' }))
      fireEvent.click(screen.getByRole('button', { name: 'Next numbers in Sri Guru Granth Sahib Ji' }))
      expect(screen.getByText('Ang 51–100 of 1430')).toBeInTheDocument()
      const link = screen.getByRole('link', { name: 'Open Sri Guru Granth Sahib Ji ang 77' })
      fireEvent.click(link)
      expect(screen.getByTestId('reader-path')).toHaveTextContent('/study?source=G&ang=77')
      expect(screen.getByTestId('reader-state')).toHaveTextContent('sourceOpen=sggs')
      expect(screen.getByTestId('reader-state')).toHaveTextContent('sourcePage-sggs=2')
      scroll.setTop(0)
      fireEvent.click(screen.getByRole('button', { name: 'Back to sources' }))
      expect(screen.getByText('Ang 51–100 of 1430')).toBeInTheDocument()
      await waitFor(() => expect(screen.getByRole('link', { name: 'Open Sri Guru Granth Sahib Ji ang 77' })).toHaveFocus())
      await waitFor(() => expect(scroll.getTop()).toBe(650))
    } finally { scroll.restore() }
  })

  test('opens an exact Punjabi numeral and browser Back returns to its page', async () => {
    const scroll = mockDocumentScroll({ scrollHeight: 4000 })
    try {
      mount('/banis?collection=sources&sourceOpen=sggs')
      const field = screen.getByRole('textbox', { name: 'Sri Guru Granth Sahib Ji Ang number' })
      fireEvent.change(field, { target: { value: '੧੪੩੦' } })
      fireEvent.submit(field.closest('form')!)
      expect(screen.getByTestId('reader-path')).toHaveTextContent('/study?source=G&ang=1430')
      expect(screen.getByTestId('reader-state')).toHaveTextContent('sourcePage-sggs=29')
      fireEvent.click(screen.getByRole('button', { name: 'Browser back' }))
      expect(screen.getByText('Ang 1401–1430 of 1430')).toBeInTheDocument()
      await waitFor(() => expect(screen.getByRole('link', { name: 'Open Sri Guru Granth Sahib Ji ang 1430' })).toHaveFocus())
      expect(screen.getByRole('button', { name: 'Next numbers in Sri Guru Granth Sahib Ji' })).toBeDisabled()
    } finally { scroll.restore() }
  })

  test('validates against the selected source and never navigates for invalid input', () => {
    mount('/banis?collection=sources&sourceOpen=bhai-gurdas-vaaran')
    const field = screen.getByRole('textbox', { name: 'Bhai Gurdas Ji Vaaran Vaar number' })
    for (const value of ['0', '41', '1.5', '1e1', '-1']) {
      fireEvent.change(field, { target: { value } })
      fireEvent.submit(field.closest('form')!)
      expect(screen.getByRole('alert')).toHaveTextContent('Enter a whole Vaar number from 1 to 40.')
      expect(field).toHaveAttribute('aria-invalid', 'true')
      expect(screen.queryByTestId('reader-path')).not.toBeInTheDocument()
    }
    fireEvent.change(field, { target: { value: '४०' } })
    fireEvent.submit(field.closest('form')!)
    expect(screen.getByTestId('reader-path')).toHaveTextContent('/study?source=B&ang=40')
  })

  test('hydrates deep links and bounds stale page parameters', () => {
    mount('/banis?collection=sources&sourceOpen=sggs,bhai-gurdas-vaaran&sourcePage-sggs=999')
    expect(screen.getByRole('button', { name: 'Sri Guru Granth Sahib Ji' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Bhai Gurdas Ji Vaaran' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Ang 1401–1430 of 1430')).toBeInTheDocument()
    expect(screen.getByText('Vaar 1–40 of 40')).toBeInTheDocument()
  })

  test('translates source names, input help, controls and errors with the interface locale', async () => {
    mount('/banis?collection=sources&sourceOpen=sggs')
    act(() => useLocaleStore.setState({ locale: 'pa' }))
    expect(screen.getByRole('button', { name: 'ਸ੍ਰੀ ਗੁਰੂ ਗ੍ਰੰਥ ਸਾਹਿਬ ਜੀ' })).toHaveAttribute('aria-expanded', 'true')
    const input = screen.getByRole('textbox', { name: 'ਸ੍ਰੀ ਗੁਰੂ ਗ੍ਰੰਥ ਸਾਹਿਬ ਜੀ — ਅੰਗ ਨੰਬਰ' })
    const form = input.closest('form')!
    expect(within(form).getByRole('button', { name: 'ਖੋਲ੍ਹੋ' })).toBeInTheDocument()
    fireEvent.submit(form)
    expect(screen.getByRole('alert')).toHaveTextContent('ਅੰਗ ਲਈ 1 ਤੋਂ 1430 ਤੱਕ ਪੂਰਾ ਅੰਕ ਭਰੋ।')
    act(() => useLocaleStore.setState({ locale: 'hi' }))
    expect(screen.getByRole('textbox', { name: 'श्री गुरु ग्रंथ साहिब जी — अंग संख्या' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('अंग के लिए 1 से 1430 तक पूर्ण अंक भरें।')
  })
})
