import { useEffect, useRef, useState } from 'react'
import { downloadLibraryWork, getLibraryDownloadStatus, removeDownloadedLibraryWork, type LibraryDownloadStatus } from '../../data/libraryRepository'
import type { LibraryWork } from '../../types'
import { useLocaleStore } from '../../store/locale'
import { LIBRARY_DOWNLOAD_COPY } from '../../content/libraryBookCopy'
import '../../styles/library-tools.css'

export default function LibraryDownloadControls({ work }: { work: LibraryWork }) {
  const locale = useLocaleStore(state => state.locale)
  const copy = LIBRARY_DOWNLOAD_COPY[locale]
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
    setNotice(copy.preparing)
    setProgress(null)
    try {
      await downloadLibraryWork(work.id, {
        volume, signal: request.signal,
        onProgress: (loaded, total) => {
          if (!mounted.current) return
          setProgress({ loaded, total })
          setNotice(loaded === total ? copy.verifying : copy.downloading(loaded, total))
        },
      })
      if (mounted.current) setNotice(volume ? copy.readyVolume(volume) : copy.readyBook)
    } catch (error) {
      if (!mounted.current) return
      const cancelled = error instanceof DOMException && error.name === 'AbortError'
      setFailed(!cancelled)
      setNotice(cancelled ? copy.cancelled : copy.failed)
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
      if (mounted.current) { setSaved(null); setNotice(copy.removed) }
    } catch {
      if (mounted.current) { setFailed(true); setNotice(copy.removeFailed) }
    } finally { if (mounted.current) setOperation(null) }
  }

  return (
    <section className="epub-download-panel" aria-labelledby="epub-download-title">
      <div>
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2 id="epub-download-title">{copy.title}</h2>
        <p>{copy.body}</p>
      </div>
      <p>{saved ? copy.saved(saved.downloaded, saved.total) : copy.empty}</p>
      <div className="epub-download-actions">
        <button type="button" disabled={busy} onClick={() => { void download() }}>{saved && saved.downloaded === saved.total ? copy.updateBook : copy.downloadBook}</button>
        {(work.publications ?? []).map(publication => {
          const volume = saved?.volumes.find(item => item.volume === publication.volume)
          const ready = Boolean(volume && volume.downloaded === volume.total)
          return <button key={publication.id} type="button" disabled={busy} onClick={() => { void download(publication.volume) }}>
            {ready ? copy.updateVolume(publication.volume) : copy.downloadVolume(publication.volume)}
            {ready ? <span className="epub-download-ready">{copy.ready}</span> : null}
          </button>
        })}
        {saved ? <button type="button" disabled={busy} onClick={() => { void remove() }}>{copy.remove}</button> : null}
        {operation === 'download' ? <button type="button" onClick={() => controller.current?.abort()}>{copy.cancel}</button> : null}
      </div>
      {progress ? <progress aria-label={copy.progress} value={progress.loaded} max={progress.total} /> : null}
      <p role={failed ? 'alert' : 'status'} aria-live="polite">{notice}</p>
    </section>
  )
}
