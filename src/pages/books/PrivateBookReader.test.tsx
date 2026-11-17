import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { vi } from 'vitest'
import type { PrivateBook } from '../../data/privateLibrary'
import PrivateBookReader from './PrivateBookReader'
import PrivateBookPage from './PrivateBookPage'
import { DEFAULT_EPUB_READER_PREFERENCES, useEpubReaderStore } from '../../store/epubReader'

const mocks = vi.hoisted(() => ({
  access: { allowed: true, loading: false, error: null as string | null, epoch: 1, recheck: vi.fn() },
  loadBook: vi.fn(), loadState: vi.fn(), saveState: vi.fn(), fetchAsset: vi.fn(),
  createUrl: vi.fn(), revokeUrl: vi.fn(), assetInfo: vi.fn(), assetRange: vi.fn(),
  pdfGetDocument: vi.fn(), pdfDestroy: vi.fn(), rangeData: vi.fn(),
}))
vi.mock('../../hooks/usePrivateLibraryAccess', () => ({ usePrivateLibraryAccess: () => mocks.access }))
vi.mock('../../data/privateLibrary', () => ({
  loadPrivateBook: mocks.loadBook, loadPrivateReadingState: mocks.loadState, savePrivateReadingState: mocks.saveState,
  fetchPrivateAsset: mocks.fetchAsset, createPrivateObjectUrl: mocks.createUrl, revokePrivateObjectUrl: mocks.revokeUrl,
  getPrivateAssetInfo: mocks.assetInfo, fetchPrivateAssetRange: mocks.assetRange,
  getPrivateLibraryAccess: () => mocks.access,
}))
vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  PDFDataRangeTransport: class { onDataRange = mocks.rangeData },
  getDocument: mocks.pdfGetDocument,
  TextLayer: class { render() { return Promise.resolve() } cancel() {} },
}))
vi.mock('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url', () => ({ default: '/assets/test-pdf-worker.mjs' }))

const book: PrivateBook = {
  id: 'book-fixture', title: 'Collected Reflections', authors: ['Example Writer'], description: 'An example edition for reading tests.',
  category: 'Essays', language: 'en', formats: ['epub'], editionVersion: 'revision-one', renderer: 'chapters',
  contents: [{ id: 'opening', title: 'Opening', assetId: 'chapter-opening' }, { id: 'closing', title: 'Closing', assetId: 'chapter-closing' }],
}
const chapters: Record<string, unknown> = {
  'chapter-opening': { id: 'opening', title: 'Opening', blocks: [
    { id: 'opening-heading', type: 'heading', text: 'A quiet beginning' },
    { id: 'verse', type: 'verse', text: 'First line\nSecond line' },
    { id: 'steps', type: 'list', ordered: true, start: 3, items: ['Consider the question', 'Read again'] },
    { id: 'table', type: 'table', rows: [['Term', 'Meaning'], ['Attention', 'An example']] },
    { id: 'reference', type: 'paragraph', text: 'Read the source note.', links: [{ text: 'Source note', targetChapterId: 'closing', targetAnchor: 'original-note-7' }] },
  ] },
  'chapter-closing': { id: 'closing', title: 'Closing', blocks: [
    { id: 'closing-heading', type: 'heading', text: 'A closing reflection' },
    { id: 'closing-note', anchor: 'original-note-7', type: 'note', text: 'The original note is preserved.' },
  ] },
}
function jsonBlob(data: unknown) { return { text: async () => JSON.stringify(data) } as Blob }
function ReaderRoutes({ detail = false }: { detail?: boolean }) {
  return <MemoryRouter initialEntries={[`/books/private/${book.id}${detail ? '' : '/read'}`]}><Routes>
    <Route path="/books/private/:bookId" element={<PrivateBookPage />} />
    <Route path="/books/private/:bookId/read" element={<PrivateBookReader />} />
    <Route path="/banis" element={<h1>Bookshelf</h1>} />
  </Routes></MemoryRouter>
}
function BrowserBack() {
  const navigate = useNavigate()
  return <button onClick={() => navigate(-1)}>Browser Back</button>
}
function ReaderWithHistory() {
  return <MemoryRouter initialEntries={['/previous', `/books/private/${book.id}/read`]} initialIndex={1}>
    <BrowserBack />
    <Routes><Route path="/previous" element={<h1>Previous page</h1>} /><Route path="/books/private/:bookId/read" element={<PrivateBookReader />} /></Routes>
  </MemoryRouter>
}
function BrowseLocation() {
  const location = useLocation()
  return <output data-testid="browse-location">{location.pathname}{location.search} {JSON.stringify(location.state)}</output>
}
function box(top: number, height: number): DOMRect {
  return { x: 0, y: top, top, bottom: top + height, left: 0, right: 700, width: 700, height, toJSON: () => ({}) }
}

describe('Private book reading', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.access = { allowed: true, loading: false, error: null, epoch: 1, recheck: vi.fn() }
    mocks.loadBook.mockResolvedValue(book)
    mocks.loadState.mockResolvedValue(null)
    mocks.saveState.mockImplementation(async (_book, _edition, state) => state)
    mocks.fetchAsset.mockImplementation(async (_book, asset) => jsonBlob(chapters[asset]))
    mocks.createUrl.mockReturnValue('blob:private-image')
    mocks.assetInfo.mockResolvedValue({ size: 131_072, contentType: 'application/pdf' })
    mocks.assetRange.mockImplementation(async (_book, _asset, begin, end) => new ArrayBuffer(end - begin))
    useEpubReaderStore.setState(DEFAULT_EPUB_READER_PREFERENCES)
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {})
  })
  afterEach(() => { vi.restoreAllMocks() })

  test('denied accounts never request book content or saved positions', () => {
    mocks.access.allowed = false
    render(<ReaderRoutes />)
    expect(screen.getByRole('heading', { name: 'This book is unavailable' })).toBeInTheDocument()
    expect(mocks.loadBook).not.toHaveBeenCalled()
    expect(mocks.loadState).not.toHaveBeenCalled()
    expect(mocks.fetchAsset).not.toHaveBeenCalled()
    expect(screen.queryByText(book.title)).not.toBeInTheDocument()
  })

  test('preserves poems, ordered lists, tables and cross-section source notes', async () => {
    const user = userEvent.setup()
    render(<ReaderRoutes />)
    expect(await screen.findByRole('heading', { name: 'A quiet beginning' })).toBeInTheDocument()
    expect(screen.getByText(/First line/).textContent).toBe('First line\nSecond line')
    expect(screen.getByText('Consider the question').closest('ol')).toHaveAttribute('start', '3')
    expect(screen.getByRole('cell', { name: 'Attention' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Source note' }))
    expect(await screen.findByText('The original note is preserved.')).toBeInTheDocument()
    expect(document.getElementById('closing-note')).toBeInTheDocument()
    await waitFor(() => expect(vi.mocked(HTMLElement.prototype.scrollIntoView).mock.contexts).toContain(document.getElementById('closing-note')))
    expect(mocks.fetchAsset).toHaveBeenCalledWith(book.id, 'chapter-closing', expect.objectContaining({ signal: expect.any(AbortSignal) }))
    await user.click(screen.getByRole('button', { name: 'Back to reading' }))
    expect(await screen.findByRole('heading', { name: 'A quiet beginning' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Back to reading' })).not.toBeInTheDocument()
  })

  test('resumes the saved section and stores bookmarks through account-scoped state', async () => {
    const user = userEvent.setup()
    mocks.loadState.mockResolvedValue({ index: 1, offset: 40, progress: 0.65, bookmarks: [] })
    render(<ReaderRoutes />)
    expect(await screen.findByRole('heading', { name: 'A closing reflection' })).toBeInTheDocument()
    expect(screen.queryByText('A quiet beginning')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Bookmark this position' }))
    await waitFor(() => expect(mocks.saveState).toHaveBeenCalledWith(book.id, book.editionVersion, expect.objectContaining({ index: 1, bookmarks: [expect.objectContaining({ index: 1, label: 'Closing' })] })), { timeout: 2000 })
    await user.click(screen.getByRole('button', { name: /Bookmarks · 1/ }))
    expect(screen.getByRole('heading', { name: 'Your bookmarks' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove bookmark: Closing' })).toBeInTheDocument()
  })

  test('does not overwrite saved position when loading it fails', async () => {
    mocks.loadState.mockRejectedValue(new Error('offline'))
    render(<ReaderRoutes />)
    expect(await screen.findByRole('heading', { name: 'Your reading session could not be opened' })).toBeInTheDocument()
    expect(mocks.saveState).not.toHaveBeenCalled()
    expect(mocks.fetchAsset).not.toHaveBeenCalled()
  })

  test('removes private text immediately when access changes', async () => {
    const view = render(<ReaderRoutes />)
    await screen.findByRole('heading', { name: 'A quiet beginning' })
    await waitFor(() => expect(window.scrollTo).toHaveBeenCalled())
    mocks.saveState.mockClear()
    fireEvent.scroll(window)
    mocks.access = { ...mocks.access, allowed: false, epoch: 2 }
    view.rerender(<ReaderRoutes />)
    expect(screen.queryByText(book.title)).not.toBeInTheDocument()
    expect(screen.queryByText('A quiet beginning')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'This book is unavailable' })).toBeInTheDocument()
    expect(mocks.saveState).not.toHaveBeenCalled()
  })

  test('flushes the latest scroll position on browser Back before either debounce fires', async () => {
    render(<ReaderWithHistory />)
    await screen.findByRole('heading', { name: 'A quiet beginning' })
    await waitFor(() => expect(window.scrollTo).toHaveBeenCalled())
    const content = document.querySelector<HTMLElement>('.private-reader__content')!
    vi.spyOn(content, 'getBoundingClientRect').mockReturnValue(box(-300, 1400))
    vi.spyOn(document.getElementById('opening-heading')!, 'getBoundingClientRect').mockReturnValue(box(-300, 100))
    vi.spyOn(document.getElementById('verse')!, 'getBoundingClientRect').mockReturnValue(box(100, 100))
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(400)
    mocks.saveState.mockClear()
    fireEvent.scroll(window)
    fireEvent.click(screen.getByRole('button', { name: 'Browser Back' }))
    expect(screen.getByRole('heading', { name: 'Previous page' })).toBeInTheDocument()
    expect(mocks.saveState).toHaveBeenCalledTimes(1)
    expect(mocks.saveState).toHaveBeenLastCalledWith(book.id, book.editionVersion, expect.objectContaining({ index: 0, offset: 400, blockId: 'verse', blockOffset: 35 }))
  })

  test('restores a stable source block after its pixel position changes', async () => {
    mocks.loadState.mockResolvedValue({ index: 1, offset: 999, blockId: 'closing-note', blockOffset: 20, progress: 0.8, bookmarks: [] })
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function(this: HTMLElement) {
      return this.dataset.sourceId === 'closing-note' ? box(600, 120) : box(0, 0)
    })
    render(<ReaderRoutes />)
    await screen.findByText('The original note is preserved.')
    await waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith({ top: 485, behavior: 'instant' }))
  })

  test('waits for chapter illustrations before restoring the saved block', async () => {
    mocks.loadState.mockResolvedValue({ index: 0, offset: 0, blockId: 'after-image', blockOffset: 10, progress: 0.2, bookmarks: [] })
    mocks.fetchAsset.mockImplementation(async (_book, asset) => jsonBlob(asset === 'chapter-opening' ? {
      id: 'opening', title: 'Opening', blocks: [
        { id: 'illustration', type: 'image', assetId: 'illustration-image', alt: 'Original illustration' },
        { id: 'after-image', type: 'paragraph', text: 'Text after the illustration.' },
      ],
    } : {}))
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function(this: HTMLElement) {
      return this.dataset.sourceId === 'after-image' ? box(700, 120) : box(0, 0)
    })
    render(<ReaderRoutes />)
    const image = await screen.findByRole('img', { name: 'Original illustration' })
    expect(window.scrollTo).not.toHaveBeenCalled()
    fireEvent.load(image)
    await waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith({ top: 575, behavior: 'instant' }))
  })

  test('only fetches the protected search index when Find is submitted', async () => {
    const user = userEvent.setup()
    mocks.loadBook.mockResolvedValue({ ...book, searchAssetId: 'book-search' })
    mocks.fetchAsset.mockImplementation(async (_book, asset) => jsonBlob(asset === 'book-search' ? { chapters: [{ id: 'closing', title: 'Closing', blocks: [{ id: 'closing-note', text: 'The original note is preserved.' }] }] } : chapters[asset]))
    render(<ReaderRoutes />)
    await screen.findByRole('heading', { name: 'A quiet beginning' })
    expect(mocks.fetchAsset.mock.calls.some(call => call[1] === 'book-search')).toBe(false)
    await user.click(screen.getByRole('button', { name: 'Find in book' }))
    await user.type(screen.getByRole('searchbox', { name: 'Search words' }), 'preserved')
    await user.click(screen.getByRole('button', { name: 'Find', exact: true }))
    expect(await screen.findByText('1 matching passages')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Closing: The original note/ }))
    expect(await screen.findByRole('heading', { name: 'A closing reflection' })).toBeInTheDocument()
  })

  test('reads image-page EPUBs without dropping their content', async () => {
    mocks.loadBook.mockResolvedValue({ ...book, renderer: 'pages', pageCount: 2, contents: [{ id: 'page-one', title: 'Page 1', page: 1, assetId: 'image-one' }, { id: 'page-two', title: 'Page 2', page: 2, assetId: 'image-two' }] })
    render(<ReaderRoutes />)
    const page = await screen.findByRole('img', { name: 'Page 1' })
    expect(page).toHaveAttribute('src', 'blob:private-image')
    fireEvent.load(page)
    expect(screen.queryByRole('button', { name: 'Find in book' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByRole('img', { name: 'Page 2' })).toBeInTheDocument()
    expect(mocks.revokeUrl).toHaveBeenCalledWith('blob:private-image')
  })

  test('offers zoom and fit width for image-only sections without relabeling source contents', async () => {
    const user = userEvent.setup()
    mocks.fetchAsset.mockImplementation(async (_book, asset) => jsonBlob(asset === 'chapter-opening' ? {
      id: 'opening', title: 'Opening', blocks: [{ id: 'scan', type: 'image', assetId: 'scan-image', alt: 'Original scanned page' }],
    } : chapters[asset]))
    render(<ReaderRoutes />)
    const image = await screen.findByRole('img', { name: 'Original scanned page' })
    fireEvent.load(image)
    expect(screen.getByText('Opening', { selector: '.reader-header__subtitle' })).toBeInTheDocument()
    expect(image).toHaveStyle({ width: '100%' })
    expect(image.closest('figure')).toHaveAttribute('tabindex', '0')
    await user.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(image).toHaveStyle({ width: '120%' })
    await user.click(screen.getByRole('button', { name: 'Fit width' }))
    expect(image).toHaveStyle({ width: '100%' })
    await user.click(screen.getByRole('button', { name: 'Reading appearance' }))
    expect(screen.getByRole('slider', { name: /Page zoom/ })).toBeInTheDocument()
    expect(screen.queryByRole('slider', { name: 'Text size' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Close reading panel' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('heading', { name: 'A closing reflection' })
    expect(screen.queryByRole('button', { name: 'Fit width' })).not.toBeInTheDocument()
  })

  test('loads PDFs through authenticated ranges and destroys the document on exit', async () => {
    mocks.loadBook.mockResolvedValue({ ...book, renderer: 'pdf', primaryAssetId: 'source-pdf', pageCount: 3, contents: [] })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as CanvasRenderingContext2D)
    mocks.pdfGetDocument.mockImplementation((options: { range: { requestDataRange: (begin: number, end: number) => void } }) => {
      options.range.requestDataRange(65_536, 131_072)
      return { destroy: mocks.pdfDestroy, promise: Promise.resolve({ numPages: 3, getPage: async () => ({
        getViewport: ({ scale }: { scale: number }) => ({ width: 600 * scale, height: 800 * scale, scale }),
        render: () => ({ promise: Promise.resolve(), cancel: vi.fn() }),
        getTextContent: async () => ({ items: [], styles: {} }),
      }) }) }
    })
    const view = render(<ReaderRoutes />)
    await waitFor(() => expect(mocks.pdfGetDocument).toHaveBeenCalled())
    expect(mocks.assetInfo).toHaveBeenCalledWith(book.id, 'source-pdf', expect.any(AbortSignal))
    expect(mocks.assetRange).toHaveBeenCalledWith(book.id, 'source-pdf', 0, 65_536, expect.any(AbortSignal))
    expect(mocks.assetRange).toHaveBeenCalledWith(book.id, 'source-pdf', 65_536, 131_072, expect.any(AbortSignal))
    expect(mocks.fetchAsset).not.toHaveBeenCalled()
    view.unmount()
    expect(mocks.pdfDestroy).toHaveBeenCalled()
    expect(mocks.assetInfo.mock.calls[0][2].aborted).toBe(true)
  })

  test('searches PDF text only on request and navigates to its matching page', async () => {
    const user = userEvent.setup()
    mocks.loadBook.mockResolvedValue({ ...book, renderer: 'pdf', primaryAssetId: 'source-pdf', pageCount: 3, contents: [] })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as CanvasRenderingContext2D)
    const getPage = vi.fn(async (pageNumber: number) => ({
      getViewport: ({ scale }: { scale: number }) => ({ width: 600 * scale, height: 800 * scale, scale }),
      render: () => ({ promise: Promise.resolve(), cancel: vi.fn() }),
      getTextContent: async () => ({ items: [{ str: pageNumber === 2 ? 'A passage about careful attention.' : 'A different passage.' }], styles: {} }),
    }))
    mocks.pdfGetDocument.mockReturnValue({ destroy: mocks.pdfDestroy, promise: Promise.resolve({ numPages: 3, getPage }) })
    render(<ReaderRoutes />)
    await waitFor(() => expect(getPage).toHaveBeenCalledWith(1))
    expect(getPage).not.toHaveBeenCalledWith(2)
    await user.click(screen.getByRole('button', { name: 'Find in book' }))
    await user.type(screen.getByRole('searchbox', { name: 'Search words' }), 'attention')
    await user.click(screen.getByRole('button', { name: 'Find', exact: true }))
    expect(await screen.findByText('1 matching passages')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Page 2: A passage about careful attention/ }))
    expect(await screen.findByText('Page 2 of 3')).toBeInTheDocument()
  })

  test('hides the previous PDF canvas while the next page is rendering', async () => {
    mocks.loadBook.mockResolvedValue({ ...book, renderer: 'pdf', primaryAssetId: 'source-pdf', pageCount: 2, contents: [] })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as CanvasRenderingContext2D)
    let finishPage!: () => void
    const pendingPage = new Promise<void>(resolve => { finishPage = resolve })
    mocks.pdfGetDocument.mockReturnValue({ destroy: mocks.pdfDestroy, promise: Promise.resolve({ numPages: 2, getPage: async (pageNumber: number) => ({
      getViewport: ({ scale }: { scale: number }) => ({ width: 600 * scale, height: 800 * scale, scale }),
      render: () => ({ promise: pageNumber === 2 ? pendingPage : Promise.resolve(), cancel: vi.fn() }),
      getTextContent: async () => ({ items: [], styles: {} }),
    }) }) })
    render(<ReaderRoutes />)
    expect(await screen.findByRole('img', { name: 'Page 1' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText('Loading page 2…')).toBeInTheDocument()
    expect(document.querySelector('canvas')).not.toBeVisible()
    await act(async () => { finishPage(); await pendingPage })
    expect(await screen.findByRole('img', { name: 'Page 2' })).toBeVisible()
  })

  test('detail covers use revocable private URLs and carry browse context into reading', async () => {
    mocks.loadBook.mockResolvedValue({ ...book, coverAssetId: 'cover' })
    const view = render(<ReaderRoutes detail />)
    await screen.findByRole('heading', { name: book.title })
    await waitFor(() => expect(mocks.createUrl).toHaveBeenCalled())
    expect(screen.getByRole('link', { name: 'Begin reading' })).toHaveAttribute('href', `/books/private/${book.id}/read`)
    view.unmount()
    expect(mocks.revokeUrl).toHaveBeenCalledWith('blob:private-image')
  })

  test('carries only the browsing origin through detail, reading and Books navigation', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={[{ pathname: `/books/private/${book.id}`, state: { privateBookshelfOrigin: '/banis?collection=books', privateBookshelf: { query: 'private search words' } } }]}><Routes>
      <Route path="/books/private/:bookId" element={<PrivateBookPage />} />
      <Route path="/books/private/:bookId/read" element={<PrivateBookReader />} />
      <Route path="/banis" element={<BrowseLocation />} />
    </Routes></MemoryRouter>)
    await user.click(await screen.findByRole('link', { name: 'Begin reading' }))
    await screen.findByRole('heading', { name: 'A quiet beginning' })
    await user.click(screen.getByRole('link', { name: 'Back to book details' }))
    await user.click(await screen.findByRole('link', { name: 'Books', exact: true }))
    expect(screen.getByTestId('browse-location')).toHaveTextContent('/banis?collection=books {"privateBookshelfOrigin":"/banis?collection=books"}')
    expect(screen.getByTestId('browse-location')).not.toHaveTextContent('private search words')
  })

  test('search sheets focus the input, contain keyboard focus, and return focus on Escape', async () => {
    const user = userEvent.setup()
    render(<ReaderRoutes />)
    await screen.findByRole('heading', { name: 'A quiet beginning' })
    const opener = screen.getByRole('button', { name: 'Find in book' })
    await user.click(opener)
    const dialog = screen.getByRole('dialog', { name: 'Find in book' })
    expect(screen.getByRole('searchbox', { name: 'Search words' })).toHaveFocus()
    for (let index = 0; index < 5; index++) {
      await user.tab()
      expect(dialog).toContainElement(document.activeElement as HTMLElement)
    }
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(opener).toHaveFocus())
  })

  test('focus reading keeps a reachable way to reveal controls and restores keyboard focus', async () => {
    const user = userEvent.setup()
    render(<ReaderRoutes />)
    await screen.findByRole('heading', { name: 'A quiet beginning' })
    const focus = screen.getByRole('button', { name: 'Focus', exact: true })
    await user.click(focus)
    expect(document.querySelector('.private-reader__header')).toHaveAttribute('inert')
    expect(screen.getByRole('button', { name: 'Show reading controls' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(document.querySelector('.private-reader__header')).not.toHaveAttribute('inert')
    expect(focus).toHaveFocus()
  })

  test('restores the same source passage after typography reflows underneath an appearance sheet', async () => {
    const user = userEvent.setup()
    mocks.loadState.mockResolvedValue({ index: 0, offset: 465, blockId: 'verse', blockOffset: 20, progress: .2, bookmarks: [] })
    let passageTop = 600
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function(this: HTMLElement) {
      return this.dataset.sourceId === 'verse' ? box(passageTop, 200) : box(0, 0)
    })
    render(<ReaderRoutes />)
    await waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith({ top: 485, behavior: 'instant' }))
    await user.click(screen.getByRole('button', { name: 'Reading appearance' }))
    await user.click(screen.getByRole('button', { name: 'Increase text size' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Typeface' }), 'classic')
    expect(useEpubReaderStore.getState()).toEqual(expect.objectContaining({ fontScale: 1.1, fontFamily: 'classic' }))
    passageTop = 900
    await user.click(screen.getByRole('button', { name: 'Close reading panel' }))
    await waitFor(() => expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 785, behavior: 'instant' }))
    expect(document.querySelector('main')).toHaveStyle('--private-font-family: Georgia, "Times New Roman", serif')
  })

  test('same-section bookmarks jump after the dialog releases its scroll lock', async () => {
    const user = userEvent.setup()
    mocks.loadState.mockResolvedValue({ index: 0, offset: 0, progress: 0, bookmarks: [{ id: 'mark', index: 0, offset: 300, blockId: 'verse', blockOffset: 20, label: 'Saved passage', createdAt: '2026-01-01' }] })
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function(this: HTMLElement) {
      return this.dataset.sourceId === 'verse' ? box(700, 200) : box(0, 0)
    })
    render(<ReaderRoutes />)
    await screen.findByRole('heading', { name: 'A quiet beginning' })
    await waitFor(() => expect(window.scrollTo).toHaveBeenCalled())
    await user.click(screen.getByRole('button', { name: 'Bookmarks · 1' }))
    await user.click(screen.getByRole('button', { name: 'Saved passage', exact: true }))
    await waitFor(() => expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 585, behavior: 'instant' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('an illustration failure cannot overwrite a saved position before retry succeeds', async () => {
    mocks.loadState.mockResolvedValue({ index: 0, offset: 500, blockId: 'after-image', blockOffset: 10, progress: .2, bookmarks: [] })
    mocks.fetchAsset.mockImplementation(async (_book, asset) => jsonBlob(asset === 'chapter-opening' ? {
      id: 'opening', title: 'Opening', blocks: [
        { id: 'illustration', type: 'image', assetId: 'illustration-image', alt: '001' },
        { id: 'after-image', type: 'paragraph', text: 'Text after the illustration.' },
      ],
    } : {}))
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function(this: HTMLElement) {
      return this.dataset.sourceId === 'after-image' ? box(700, 120) : box(0, 0)
    })
    render(<ReaderRoutes />)
    const image = await screen.findByRole('img', { name: 'Original book illustration' })
    expect(document.querySelector('figcaption')).not.toBeInTheDocument()
    fireEvent.error(image)
    fireEvent.scroll(window)
    fireEvent(window, new Event('pagehide'))
    expect(window.scrollTo).not.toHaveBeenCalled()
    expect(mocks.saveState).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Retry image' }))
    fireEvent.load(await screen.findByRole('img', { name: 'Original book illustration' }))
    await waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith({ top: 575, behavior: 'instant' }))
  })

  test('PDF outlines navigate to source pages and keyboard navigation never changes an active page field', async () => {
    const user = userEvent.setup()
    mocks.loadBook.mockResolvedValue({ ...book, renderer: 'pdf', primaryAssetId: 'source-pdf', pageCount: 3, contents: [{ id: 'final-part', title: 'Final part', page: 3 }] })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as CanvasRenderingContext2D)
    const getPage = vi.fn(async () => ({
      getViewport: ({ scale }: { scale: number }) => ({ width: 600 * scale, height: 800 * scale, scale }),
      render: () => ({ promise: Promise.resolve(), cancel: vi.fn() }),
      getTextContent: async () => ({ items: [], styles: {} }),
    }))
    mocks.pdfGetDocument.mockReturnValue({ destroy: mocks.pdfDestroy, promise: Promise.resolve({ numPages: 3, getPage }) })
    render(<ReaderRoutes />)
    await screen.findByRole('img', { name: 'Page 1' })
    await user.click(screen.getByRole('button', { name: 'Pages', exact: true }))
    expect(screen.getByRole('spinbutton', { name: 'Page' })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(getPage).not.toHaveBeenCalledWith(2)
    await user.click(screen.getByRole('button', { name: /Final part/ }))
    await screen.findByRole('img', { name: 'Page 3' })
    await user.click(screen.getByRole('button', { name: 'Back to reading' }))
    await screen.findByRole('img', { name: 'Page 1' })
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(await screen.findByRole('img', { name: 'Page 2' })).toBeVisible()
  })
})
