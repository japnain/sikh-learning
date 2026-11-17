import { useEffect, useState } from 'react'
import PrivateBookshelf from './PrivateBookshelf'
import { createPrivateObjectUrl, fetchPrivateAsset, loadPrivateBooks, loadPrivateReadingState, revokePrivateObjectUrl, type PrivateBookSummary } from '../../data/privateLibrary'
import { usePrivateLibraryAccess } from '../../hooks/usePrivateLibraryAccess'

export default function PrivateBooksSection() {
  const access = usePrivateLibraryAccess()
  const [books, setBooks] = useState<PrivateBookSummary[]>([])
  const [covers, setCovers] = useState<Record<string, string>>({})
  const [progress, setProgress] = useState<Record<string, { fraction: number; completed?: boolean; updatedAt?: string }>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    const urls: string[] = []
    setBooks([]); setCovers({}); setProgress({}); setError(null)
    if (!access.allowed) { setLoading(false); return () => controller.abort() }
    setLoading(true)
    void loadPrivateBooks(controller.signal).then(async rows => {
      if (controller.signal.aborted) return
      setBooks(rows); setLoading(false)
      // Bound asset concurrency; opening a shelf never downloads a complete book.
      let index = 0
      const worker = async () => {
        while (index < rows.length && !controller.signal.aborted) {
          const book = rows[index++]
          await Promise.allSettled([
            book.coverAssetId ? fetchPrivateAsset(book.id, book.coverAssetId, { signal: controller.signal }).then(blob => {
              if (controller.signal.aborted) return
              const url = createPrivateObjectUrl(blob)
              urls.push(url)
              setCovers(current => ({ ...current, [book.id]: url }))
            }) : Promise.resolve(),
            loadPrivateReadingState(book.id, book.editionVersion, controller.signal).then(state => {
              if (!state || controller.signal.aborted) return
              setProgress(current => ({ ...current, [book.id]: { fraction: state.progress, completed: state.completed, updatedAt: state.updatedAt } }))
            }),
          ])
        }
      }
      await Promise.all([worker(), worker()])
    }).catch(() => {
      if (!controller.signal.aborted) { setError('Your books could not be loaded. Please try again.'); setLoading(false) }
    })
    return () => { controller.abort(); urls.forEach(revokePrivateObjectUrl) }
  }, [access.allowed, access.epoch, retry])
  if (!access.allowed) return null
  return <PrivateBookshelf books={books} coverUrls={covers} progress={progress} loading={loading} error={error} onRetry={() => setRetry(value => value + 1)} />
}
