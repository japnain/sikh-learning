import { useEffect, useRef, useState } from 'react'
import ModalSheet from './ModalSheet'
import { IconArrowRight, IconCheck, IconClose } from './icons'
import { homeArtworkCatalog } from '../data/homeArtworkCatalog'
import { useLocaleStore } from '../store/locale'
import { getHomeArtworkId, HOME_ARTWORK_COLLECTION_IDS, useHomeArtworkStore, type HomeArtworkMode } from '../store/homeArtwork'
import { ECLIPSE_ARTWORK, preloadHomeArtwork, type HomeArtworkAsset } from '../utils/homeArtwork'
import '../styles/home-artwork.css'

const COPY = {
  en: {
    title: 'Home artwork', description: 'Choose a familiar scene or a daily change.', eyebrow: 'Home · Appearance',
    close: 'Close artwork settings', rhythm: 'Artwork changes', fixed: 'Keep one', daily: 'Daily change', visit: 'Each visit',
    fixedNote: 'A favorite, always', dailyNote: 'A new painting each day', visitNote: 'A fresh welcome',
    fixedExplanation: 'Keep the artwork you choose each time you return.',
    dailyExplanation: 'A new painting each day from your collection of fourteen.',
    visitExplanation: 'Move through the collection each time you return to Home.',
    original: 'The original atmosphere', collection: 'The collection', count: '14 works of art',
    preview: 'Preview', selected: 'Selected', cancel: 'Cancel', apply: 'Apply to Home', applying: 'Applying…',
    retry: 'Retry artwork', loading: 'Loading artwork…',
    unavailable: 'This artwork could not be loaded. Please choose another or try again.',
    storage: 'Applied for now, but this device could not save your preference.', keep: 'Keep',
  },
  pa: {
    title: 'ਹੋਮ ਦਾ ਚਿੱਤਰ', description: 'ਮਨਪਸੰਦ ਚਿੱਤਰ ਚੁਣੋ ਜਾਂ ਹਰ ਰੋਜ਼ ਬਦਲੋ।', eyebrow: 'ਹੋਮ · ਦਿੱਖ',
    close: 'ਚਿੱਤਰ ਸੈਟਿੰਗਾਂ ਬੰਦ ਕਰੋ', rhythm: 'ਚਿੱਤਰ ਬਦਲਣਾ', fixed: 'ਇੱਕ ਰੱਖੋ', daily: 'ਹਰ ਰੋਜ਼', visit: 'ਹਰ ਵਾਰ',
    fixedNote: 'ਹਮੇਸ਼ਾ ਮਨਪਸੰਦ', dailyNote: 'ਰੋਜ਼ ਨਵਾਂ ਚਿੱਤਰ', visitNote: 'ਨਵਾਂ ਸਵਾਗਤ',
    fixedExplanation: 'ਹਰ ਵਾਰ ਵਾਪਸ ਆਉਣ ਉੱਤੇ ਆਪਣਾ ਚੁਣਿਆ ਚਿੱਤਰ ਰੱਖੋ।',
    dailyExplanation: 'ਚੌਦਾਂ ਚਿੱਤਰਾਂ ਵਿੱਚੋਂ ਹਰ ਰੋਜ਼ ਨਵਾਂ ਚਿੱਤਰ।',
    visitExplanation: 'ਹੋਮ ਉੱਤੇ ਵਾਪਸ ਆਉਣ ਵੇਲੇ ਅਗਲਾ ਚਿੱਤਰ ਵੇਖੋ।',
    original: 'ਅਸਲ ਮਾਹੌਲ', collection: 'ਸੰਗ੍ਰਹਿ', count: '14 ਚਿੱਤਰ',
    preview: 'ਝਲਕ', selected: 'ਚੁਣਿਆ', cancel: 'ਰੱਦ ਕਰੋ', apply: 'ਹੋਮ ਉੱਤੇ ਲਾਗੂ ਕਰੋ', applying: 'ਲਾਗੂ ਹੋ ਰਿਹਾ ਹੈ…',
    retry: 'ਚਿੱਤਰ ਮੁੜ ਲੋਡ ਕਰੋ', loading: 'ਚਿੱਤਰ ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ…',
    unavailable: 'ਇਹ ਚਿੱਤਰ ਲੋਡ ਨਹੀਂ ਹੋ ਸਕਿਆ। ਹੋਰ ਚੁਣੋ ਜਾਂ ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
    storage: 'ਹੁਣ ਲਈ ਲਾਗੂ ਹੈ, ਪਰ ਇਸ ਡਿਵਾਈਸ ਉੱਤੇ ਪਸੰਦ ਸੁਰੱਖਿਅਤ ਨਹੀਂ ਹੋ ਸਕੀ।', keep: 'ਰੱਖੋ',
  },
  hi: {
    title: 'होम का चित्र', description: 'पसंदीदा दृश्य चुनें या हर दिन बदलें।', eyebrow: 'होम · रूप',
    close: 'चित्र सेटिंग बंद करें', rhythm: 'चित्र बदलना', fixed: 'एक रखें', daily: 'हर दिन', visit: 'हर बार',
    fixedNote: 'हमेशा पसंदीदा', dailyNote: 'रोज नया चित्र', visitNote: 'नया स्वागत',
    fixedExplanation: 'हर बार लौटने पर अपना चुना हुआ चित्र रखें।',
    dailyExplanation: 'चौदह चित्रों के संग्रह से हर दिन नया चित्र।',
    visitExplanation: 'होम पर लौटने पर संग्रह का अगला चित्र देखें।',
    original: 'मूल वातावरण', collection: 'संग्रह', count: '14 चित्र',
    preview: 'झलक', selected: 'चुना गया', cancel: 'रद्द करें', apply: 'होम पर लागू करें', applying: 'लागू हो रहा है…',
    retry: 'चित्र फिर लोड करें', loading: 'चित्र लोड हो रहा है…',
    unavailable: 'यह चित्र लोड नहीं हो सका। दूसरा चुनें या फिर कोशिश करें।',
    storage: 'अभी लागू है, लेकिन यह डिवाइस आपकी पसंद सहेज नहीं सका।', keep: 'रखें',
  },
} as const

function ArtworkSettingsContent({ onClose }: { onClose: () => void }) {
  const locale = useLocaleStore(state => state.locale)
  const copy = COPY[locale]
  const preference = useHomeArtworkStore()
  const [draft, setDraft] = useState(() => ({ mode: preference.mode, selectedId: preference.selectedId }))
  const [applying, setApplying] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [failedPreviewId, setFailedPreviewId] = useState<string | null>(null)
  const [previewAttempt, setPreviewAttempt] = useState(0)
  const [previewLoading, setPreviewLoading] = useState(true)
  const closeRef = useRef<HTMLButtonElement>(null)
  const activeRef = useRef(true)
  const previewVisitIndex = preference.mode === 'visit'
    ? preference.visitIndex : (preference.visitIndex + 1) % HOME_ARTWORK_COLLECTION_IDS.length
  const previewId = getHomeArtworkId({ ...draft, visitIndex: previewVisitIndex })
  const preview = homeArtworkCatalog.find(asset => asset.id === previewId) ?? ECLIPSE_ARTWORK

  useEffect(() => {
    activeRef.current = true
    return () => { activeRef.current = false }
  }, [])

  const close = () => {
    activeRef.current = false
    onClose()
  }
  const choose = (asset: HomeArtworkAsset) => {
    if (asset.id !== preview.id) setPreviewLoading(true)
    setDraft({ mode: 'fixed', selectedId: asset.id })
    setNotice(null)
  }
  const retryPreview = () => {
    setFailedPreviewId(null)
    setPreviewLoading(true)
    setPreviewAttempt(value => value + 1)
    setNotice(null)
  }
  const apply = async () => {
    setApplying(true)
    setNotice(null)
    try {
      await preloadHomeArtwork(preview)
      if (!activeRef.current) return
      const persisted = preference.applyPreferences(draft)
      if (persisted) close()
      else setNotice(copy.storage)
    } catch {
      if (activeRef.current) {
        setNotice(copy.unavailable)
        setFailedPreviewId(preview.id)
      }
    } finally {
      if (activeRef.current) setApplying(false)
    }
  }
  const selected = (id: string) => draft.mode === 'fixed' && draft.selectedId === id
  const tile = (asset: HomeArtworkAsset) => (
    <button
      type="button" key={asset.id}
      className="home-artwork-tile"
      aria-label={`${copy.keep} ${asset.displayName[locale]}`}
      aria-pressed={selected(asset.id)}
      onClick={() => choose(asset)} disabled={applying}
      data-artwork-id={asset.id}
    >
      <span className="home-artwork-tile__image" style={{ backgroundColor: asset.mat }}>
        <img src={asset.thumbnail} alt="" loading="lazy" decoding="async" width="160" height="120" />
        {selected(asset.id) ? <span className="home-artwork-selected" aria-hidden="true"><IconCheck size={17} /></span> : null}
      </span>
      <span>{asset.displayName[locale]}</span>
    </button>
  )

  return (
    <ModalSheet open onClose={close} title={copy.title} description={copy.description}
      className="home-artwork-dialog" testId="home-artwork-settings" initialFocusRef={closeRef}>
      <header className="home-artwork-header">
        <h2>{copy.title}</h2>
        <button ref={closeRef} type="button" onClick={close} className="home-artwork-close" aria-label={copy.close}><IconClose size={22} /></button>
      </header>
      <div className="home-artwork-body">
        <div className="home-artwork-preview">
          <div style={{ backgroundColor: preview.mat }} aria-busy={previewLoading}>
            {failedPreviewId !== preview.id ? <img key={`${preview.id}:${previewAttempt}`} src={preview.src} alt={preview.localizedDescription[locale]}
              decoding="async" width={preview.width} height={preview.height} onLoad={() => setPreviewLoading(false)}
              onError={() => { setFailedPreviewId(preview.id); setPreviewLoading(false) }} /> : null}
          </div>
          <div><p className="home-artwork-eyebrow">{copy.preview}</p><h3>{preview.displayName[locale]}</h3>
            {failedPreviewId === preview.id ? <button type="button" className="home-artwork-retry" onClick={retryPreview} disabled={applying}>{copy.retry}</button> : previewLoading ? <p role="status">{copy.loading}</p> : <p>{copy.description}</p>}
          </div>
        </div>
        <details className="home-artwork-rhythm">
          <summary><span>{copy.rhythm}</span><strong>{copy[draft.mode]}<IconArrowRight size={15} /></strong></summary>
          <fieldset className="home-artwork-modes">
          <legend className="sr-only">{copy.rhythm}</legend>
          <div>{(['fixed', 'daily', 'visit'] as HomeArtworkMode[]).map(mode => (
            <label key={mode} className="home-artwork-mode" data-selected={draft.mode === mode}>
              <input type="radio" name="home-artwork-mode" value={mode} checked={draft.mode === mode} aria-label={copy[mode]}
                disabled={applying} onChange={() => {
                  if (getHomeArtworkId({ ...draft, mode, visitIndex: previewVisitIndex }) !== preview.id) setPreviewLoading(true)
                  setDraft(current => ({ ...current, mode })); setNotice(null)
                }} />
              <span>{copy[mode]}</span>
            </label>
          ))}</div>
          </fieldset>
          <p className="home-artwork-explanation">{copy[`${draft.mode}Explanation`]}</p>
        </details>
        <button type="button" className="home-artwork-eclipse" onClick={() => choose(ECLIPSE_ARTWORK)}
          aria-pressed={selected('eclipse')} aria-label={`${copy.keep} ${ECLIPSE_ARTWORK.displayName[locale]}`} disabled={applying} data-artwork-id="eclipse">
          <img src={ECLIPSE_ARTWORK.thumbnail} alt="" width="64" height="72" />
          <span><strong>{ECLIPSE_ARTWORK.displayName[locale]}</strong><small>{copy.original}</small></span>
          {selected('eclipse') ? <IconCheck size={20} /> : null}
        </button>
        <div className="home-artwork-gallery-heading"><h3>{copy.collection}</h3><span>{copy.count}</span></div>
        <div className="home-artwork-gallery" data-testid="home-artwork-gallery">{homeArtworkCatalog.map(tile)}</div>
      </div>
      <footer className="home-artwork-footer">
        <p role="status" aria-live="polite">{notice ?? `${draft.mode === 'fixed' ? copy.selected : copy[draft.mode]} · ${preview.displayName[locale]}`}</p>
        <div>
          <button type="button" className="home-artwork-cancel" onClick={close}>{copy.cancel}</button>
          <button type="button" className="home-artwork-apply" onClick={() => { void apply() }} disabled={applying}>
            {applying ? copy.applying : copy.apply}<IconArrowRight size={18} />
          </button>
        </div>
      </footer>
    </ModalSheet>
  )
}

export default function HomeArtworkSettings({ open, onClose }: { open: boolean; onClose: () => void }) {
  return open ? <ArtworkSettingsContent onClose={onClose} /> : null
}
