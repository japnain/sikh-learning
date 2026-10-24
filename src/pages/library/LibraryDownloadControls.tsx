import { useEffect, useRef, useState } from 'react'
import { downloadLibraryWork, getLibraryDownloadStatus, removeDownloadedLibraryWork, type LibraryDownloadStatus } from '../../data/libraryRepository'
import type { LibraryWork } from '../../types'
import '../../styles/library-tools.css'

export default function LibraryDownloadControls({ work }: { work: LibraryWork }) {
  const [saved, setSaved] = useState<LibraryDownloadStatus | null>(null)
  const [progress, setProgress] = useState<{ loaded: number; total: number } | null>(null)
  const [notice, setNotice] = useState('')
  const [failed, setFailed] = useState(false)
  const [operation, setOperation] = useState<'download' | 'remove' | null>(null)
  const busy = operation !== null
  const controller = useRef<AbortController | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    void getLibraryDownloadStatus(work.id).then(status => { if (mounted.current) setSaved(status) })
    return () => { mounted.current = false; controller.current?.abort() }
  }, [work.id])

  async function download(volume?: number) {
    if (busy) return
    const request = new AbortController()
    controller.current = request
    setOperation('download')
    setFailed(false)
    setNotice('Preparing your download…')
    setProgress(null)
    try {
      await downloadLibraryWork(work.id, {
        volume, signal: request.signal,
        onProgress: (loaded, total) => {
          if (!mounted.current) return
          setProgress({ loaded, total })
          setNotice(loaded === total ? 'Verifying saved text…' : `Downloading ${loaded} of ${total} sections…`)
        },
      })
      if (mounted.current) setNotice(volume ? `Volume ${volume} is ready to read offline.` : 'The complete book is ready to read offline.')
    } catch (error) {
      if (!mounted.current) return
      const cancelled = error instanceof DOMException && error.name === 'AbortError'
      setFailed(!cancelled)
      setNotice(cancelled ? 'Download cancelled. Any existing download is unchanged.' : error instanceof Error ? error.message : 'The download could not be saved. Please try again.')
    } finally {
      const status = await getLibraryDownloadStatus(work.id)
      if (mounted.current) { setSaved(status); setOperation(null); setProgress(null) }
      if (controller.current === request) controller.current = null
    }
  }

  async function remove() {
    setOperation('remove')
    setFailed(false)
    try {
      await removeDownloadedLibraryWork(work.id)
      if (mounted.current) { setSaved(null); setNotice('Downloaded text removed. Your bookmarks and reading place are kept.') }
    } catch {
      if (mounted.current) { setFailed(true); setNotice('The download could not be removed. Please try again.') }
    } finally { if (mounted.current) setOperation(null) }
  }

  return (
    <section className="epub-download-panel" aria-labelledby="epub-download-title">
      <div>
        <p className="eyebrow">Read offline</p>
        <h2 id="epub-download-title">Keep this book on your device</h2>
        <p>Download the reading text and search index for this browser. Bookmarks stay separate. Clearing browser storage also removes downloads.</p>
      </div>
      <p>{saved ? `${saved.downloaded} of ${saved.total} sections saved on this device.` : 'No book sections downloaded yet.'}</p>
      <div className="epub-download-actions">
        <button type="button" disabled={busy} onClick={() => { void download() }}>{saved && saved.downloaded === saved.total ? 'Update book download' : 'Download complete book'}</button>
        {(work.publications ?? []).map(publication => {
          const volume = saved?.volumes.find(item => item.volume === publication.volume)
          const ready = Boolean(volume && volume.downloaded === volume.total)
          return <button key={publication.id} type="button" disabled={busy} onClick={() => { void download(publication.volume) }}>
            {ready ? `Update volume ${publication.volume}` : `Download volume ${publication.volume}`}
            {ready ? <span className="epub-download-ready">Ready offline</span> : null}
          </button>
        })}
        {saved ? <button type="button" disabled={busy} onClick={() => { void remove() }}>Remove download</button> : null}
        {operation === 'download' ? <button type="button" onClick={() => controller.current?.abort()}>Cancel download</button> : null}
      </div>
      {progress ? <progress aria-label="Book download progress" value={progress.loaded} max={progress.total} /> : null}
      <p role={failed ? 'alert' : 'status'} aria-live="polite">{notice}</p>
    </section>
  )
}
