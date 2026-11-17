import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useLocaleStore } from '../store/locale'
import { fetchPublishedScriptureReadingKeys, fetchPublishedScriptureSizes } from '../api/scriptureCatalogue'
import { useBaniDownloadQueue } from '../store/baniDownloadQueue'
import {
  BANI_DOWNLOADS_CHANGED_EVENT,
  listBaniDownloads,
  removeBaniDownload,
  type BaniDownloadInfo,
  type BaniDownloadSource,
} from '../utils/baniDownloads'
import { IconChevronDown } from './icons'
import '../styles/bani-downloads.css'

export interface BaniDownloadItem {
  key: string
  title: string
  createSource: () => BaniDownloadSource
  onOpen?: () => void
}

const COPY = {
  en: {
    title: 'Offline banis',
    includesLengths: 'Every available length included',
    description: 'Save readings on this device, including every available length. Your usual length and reading place stay the same.',
    choose: 'Choose a bani to download',
    download: 'Download bani',
    update: 'Update download',
    all: 'Download all available',
    allReady: 'Available banis downloaded',
    downloaded: 'Downloaded',
    cancel: 'Cancel download',
    retry: 'Retry download',
    open: 'Read',
    remove: 'Remove download',
    empty: 'No banis downloaded on this device yet.',
    checking: 'Checking downloads…',
    checkingAvailable: 'Checking available downloads…',
    availabilityFailed: 'Available downloads could not be checked. Your saved readings are still available below.',
    retryAvailable: 'Check available downloads again',
    noneAvailable: 'No new readings are available to download right now.',
    offline: 'Connect to download more banis. Saved readings are available below.',
    failed: 'The download could not finish. Completed downloads have been kept. Check your connection and available device storage, then try again.',
    shellFailed: 'Naamras is still preparing offline reading. Reconnect, close other Naamras tabs, reopen the app, and try again.',
    listFailed: 'Saved downloads could not be checked. Try again.',
    removeFailed: 'This download could not be removed. Try again.',
    stopped: 'Download cancelled. Completed downloads are still available.',
    finished: 'Download complete. These readings are ready offline.',
    preserved: 'Removing a download keeps your bookmarks and reading progress.',
    textOnly: 'These downloads include reading text. Audio and online dictionary lookups need separate downloads or a connection.',
    sources: 'Reading sources',
    saved: (ready: number, total: number | null) => total === null ? `${ready} downloaded` : `${ready} downloaded · ${total} available to download`,
    progress: (done: number, total: number, title: string) => `Bani ${done + 1} of ${total}: ${title}`,
    lengths: (count: number) => count > 1 ? `${count} lengths saved` : 'Full reading saved',
    stages: { loading: 'Downloading all lengths…', verifying: 'Checking the reading…', saving: 'Saving on this device…' },
  },
  pa: {
    title: 'ਆਫ਼ਲਾਈਨ ਬਾਣੀਆਂ',
    includesLengths: 'ਹਰ ਉਪਲਬਧ ਲੰਬਾਈ ਸ਼ਾਮਲ ਹੈ',
    description: 'ਹਰ ਉਪਲਬਧ ਲੰਬਾਈ ਸਮੇਤ ਪਾਠ ਇਸ ਡਿਵਾਈਸ ਉੱਤੇ ਸੰਭਾਲੋ। ਤੁਹਾਡੀ ਆਮ ਲੰਬਾਈ ਅਤੇ ਪੜ੍ਹਨ ਦੀ ਥਾਂ ਨਹੀਂ ਬਦਲੇਗੀ।',
    choose: 'ਡਾਊਨਲੋਡ ਕਰਨ ਲਈ ਬਾਣੀ ਚੁਣੋ',
    download: 'ਬਾਣੀ ਡਾਊਨਲੋਡ ਕਰੋ', update: 'ਡਾਊਨਲੋਡ ਅੱਪਡੇਟ ਕਰੋ', all: 'ਸਾਰੀਆਂ ਉਪਲਬਧ ਬਾਣੀਆਂ ਡਾਊਨਲੋਡ ਕਰੋ', allReady: 'ਉਪਲਬਧ ਬਾਣੀਆਂ ਡਾਊਨਲੋਡ ਹਨ', downloaded: 'ਡਾਊਨਲੋਡ ਹੈ',
    cancel: 'ਡਾਊਨਲੋਡ ਰੱਦ ਕਰੋ', retry: 'ਡਾਊਨਲੋਡ ਫਿਰ ਅਜ਼ਮਾਓ', open: 'ਪੜ੍ਹੋ', remove: 'ਡਾਊਨਲੋਡ ਹਟਾਓ',
    empty: 'ਇਸ ਡਿਵਾਈਸ ਉੱਤੇ ਹਾਲੇ ਕੋਈ ਬਾਣੀ ਡਾਊਨਲੋਡ ਨਹੀਂ ਹੈ।', checking: 'ਡਾਊਨਲੋਡ ਚੈੱਕ ਕੀਤੇ ਜਾ ਰਹੇ ਹਨ…',
    checkingAvailable: 'ਉਪਲਬਧ ਡਾਊਨਲੋਡ ਚੈੱਕ ਕੀਤੇ ਜਾ ਰਹੇ ਹਨ…',
    availabilityFailed: 'ਉਪਲਬਧ ਡਾਊਨਲੋਡ ਚੈੱਕ ਨਹੀਂ ਹੋ ਸਕੇ। ਤੁਹਾਡੇ ਸੰਭਾਲੇ ਪਾਠ ਹੇਠਾਂ ਉਪਲਬਧ ਹਨ।',
    retryAvailable: 'ਉਪਲਬਧ ਡਾਊਨਲੋਡ ਫਿਰ ਚੈੱਕ ਕਰੋ', noneAvailable: 'ਇਸ ਵੇਲੇ ਕੋਈ ਨਵਾਂ ਪਾਠ ਡਾਊਨਲੋਡ ਲਈ ਉਪਲਬਧ ਨਹੀਂ ਹੈ।',
    offline: 'ਹੋਰ ਬਾਣੀਆਂ ਡਾਊਨਲੋਡ ਕਰਨ ਲਈ ਇੰਟਰਨੈੱਟ ਨਾਲ ਜੁੜੋ। ਸੰਭਾਲੇ ਪਾਠ ਹੇਠਾਂ ਉਪਲਬਧ ਹਨ।',
    failed: 'ਡਾਊਨਲੋਡ ਪੂਰਾ ਨਹੀਂ ਹੋ ਸਕਿਆ। ਪੂਰੇ ਹੋਏ ਡਾਊਨਲੋਡ ਸੰਭਾਲੇ ਹੋਏ ਹਨ। ਕਨੈਕਸ਼ਨ ਅਤੇ ਡਿਵਾਈਸ ਦੀ ਖਾਲੀ ਥਾਂ ਚੈੱਕ ਕਰਕੇ ਫਿਰ ਅਜ਼ਮਾਓ।',
    shellFailed: 'Naamras ਹਾਲੇ ਆਫ਼ਲਾਈਨ ਪੜ੍ਹਨ ਲਈ ਤਿਆਰੀ ਕਰ ਰਿਹਾ ਹੈ। ਇੰਟਰਨੈੱਟ ਨਾਲ ਮੁੜ ਜੁੜੋ, ਹੋਰ Naamras ਟੈਬਾਂ ਬੰਦ ਕਰੋ, ਐਪ ਦੁਬਾਰਾ ਖੋਲ੍ਹੋ ਅਤੇ ਫਿਰ ਅਜ਼ਮਾਓ।',
    listFailed: 'ਸੰਭਾਲੇ ਡਾਊਨਲੋਡ ਚੈੱਕ ਨਹੀਂ ਹੋ ਸਕੇ। ਫਿਰ ਅਜ਼ਮਾਓ।', removeFailed: 'ਇਹ ਡਾਊਨਲੋਡ ਹਟਾਇਆ ਨਹੀਂ ਜਾ ਸਕਿਆ। ਫਿਰ ਅਜ਼ਮਾਓ।',
    stopped: 'ਡਾਊਨਲੋਡ ਰੱਦ ਹੋਇਆ। ਪੂਰੇ ਹੋਏ ਡਾਊਨਲੋਡ ਹਾਲੇ ਉਪਲਬਧ ਹਨ।', finished: 'ਡਾਊਨਲੋਡ ਪੂਰਾ ਹੋਇਆ। ਇਹ ਪਾਠ ਆਫ਼ਲਾਈਨ ਤਿਆਰ ਹਨ।',
    preserved: 'ਡਾਊਨਲੋਡ ਹਟਾਉਣ ਨਾਲ ਬੁੱਕਮਾਰਕ ਅਤੇ ਪੜ੍ਹਨ ਦੀ ਪ੍ਰਗਤੀ ਨਹੀਂ ਮਿਟਦੀ।',
    textOnly: 'ਇਨ੍ਹਾਂ ਡਾਊਨਲੋਡਾਂ ਵਿੱਚ ਪਾਠ ਦੀ ਲਿਖਤ ਹੈ। ਆਡੀਓ ਅਤੇ ਔਨਲਾਈਨ ਕੋਸ਼ ਲਈ ਵੱਖਰਾ ਡਾਊਨਲੋਡ ਜਾਂ ਕਨੈਕਸ਼ਨ ਚਾਹੀਦਾ ਹੈ।',
    sources: 'ਪਾਠ ਦੇ ਸਰੋਤ',
    saved: (ready: number, total: number | null) => total === null ? `${ready} ਡਾਊਨਲੋਡ` : `${ready} ਡਾਊਨਲੋਡ · ${total} ਡਾਊਨਲੋਡ ਲਈ ਉਪਲਬਧ`,
    progress: (done: number, total: number, title: string) => `ਬਾਣੀ ${done + 1}/${total}: ${title}`,
    lengths: (count: number) => count > 1 ? `${count} ਲੰਬਾਈਆਂ ਸੰਭਾਲੀਆਂ` : 'ਪੂਰਾ ਪਾਠ ਸੰਭਾਲਿਆ',
    stages: { loading: 'ਸਾਰੀਆਂ ਲੰਬਾਈਆਂ ਡਾਊਨਲੋਡ ਹੋ ਰਹੀਆਂ ਹਨ…', verifying: 'ਪਾਠ ਚੈੱਕ ਕੀਤਾ ਜਾ ਰਿਹਾ ਹੈ…', saving: 'ਇਸ ਡਿਵਾਈਸ ਉੱਤੇ ਸੰਭਾਲਿਆ ਜਾ ਰਿਹਾ ਹੈ…' },
  },
  hi: {
    title: 'ऑफ़लाइन बाणियाँ',
    includesLengths: 'हर उपलब्ध लंबाई शामिल है',
    description: 'हर उपलब्ध लंबाई सहित पाठ इस डिवाइस पर सहेजें। आपकी सामान्य लंबाई और पढ़ने की जगह वही रहेगी।',
    choose: 'डाउनलोड करने के लिए बाणी चुनें', download: 'बाणी डाउनलोड करें', update: 'डाउनलोड अपडेट करें', all: 'सभी उपलब्ध बाणियाँ डाउनलोड करें', allReady: 'उपलब्ध बाणियाँ डाउनलोड हैं', downloaded: 'डाउनलोड है',
    cancel: 'डाउनलोड रद्द करें', retry: 'डाउनलोड फिर आज़माएँ', open: 'पढ़ें', remove: 'डाउनलोड हटाएँ',
    empty: 'इस डिवाइस पर अभी कोई बाणी डाउनलोड नहीं है।', checking: 'डाउनलोड जाँचे जा रहे हैं…',
    checkingAvailable: 'उपलब्ध डाउनलोड जाँचे जा रहे हैं…',
    availabilityFailed: 'उपलब्ध डाउनलोड जाँचे नहीं जा सके। आपके सहेजे हुए पाठ नीचे उपलब्ध हैं।',
    retryAvailable: 'उपलब्ध डाउनलोड फिर जाँचें', noneAvailable: 'अभी कोई नया पाठ डाउनलोड के लिए उपलब्ध नहीं है।',
    offline: 'और बाणियाँ डाउनलोड करने के लिए इंटरनेट से जुड़ें। सहेजे गए पाठ नीचे उपलब्ध हैं।',
    failed: 'डाउनलोड पूरा नहीं हो सका। पूरे हुए डाउनलोड सहेजे गए हैं। कनेक्शन और डिवाइस की खाली जगह जाँचकर फिर कोशिश करें।',
    shellFailed: 'Naamras अभी ऑफ़लाइन पढ़ने की तैयारी कर रहा है। इंटरनेट से फिर जुड़ें, दूसरे Naamras टैब बंद करें, ऐप दोबारा खोलें और फिर कोशिश करें।',
    listFailed: 'सहेजे गए डाउनलोड जाँचे नहीं जा सके। फिर कोशिश करें।', removeFailed: 'यह डाउनलोड हटाया नहीं जा सका। फिर कोशिश करें।',
    stopped: 'डाउनलोड रद्द हुआ। पूरे हुए डाउनलोड अभी भी उपलब्ध हैं।', finished: 'डाउनलोड पूरा हुआ। ये पाठ ऑफ़लाइन तैयार हैं।',
    preserved: 'डाउनलोड हटाने से बुकमार्क और पढ़ने की प्रगति नहीं मिटती।',
    textOnly: 'इन डाउनलोड में पाठ की लिखावट है। ऑडियो और ऑनलाइन शब्दकोश के लिए अलग डाउनलोड या कनेक्शन चाहिए।',
    sources: 'पाठ के स्रोत',
    saved: (ready: number, total: number | null) => total === null ? `${ready} डाउनलोड` : `${ready} डाउनलोड · ${total} डाउनलोड के लिए उपलब्ध`,
    progress: (done: number, total: number, title: string) => `बाणी ${done + 1}/${total}: ${title}`,
    lengths: (count: number) => count > 1 ? `${count} लंबाइयाँ सहेजीं` : 'पूरा पाठ सहेजा',
    stages: { loading: 'सभी लंबाइयाँ डाउनलोड हो रही हैं…', verifying: 'पाठ जाँचा जा रहा है…', saving: 'इस डिवाइस पर सहेजा जा रहा है…' },
  },
}

function formatBytes(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/** Explicit device downloads live outside the scripture reader and its preferences. */
export default function BaniDownloadsPanel({ items, initiallyOpen = false }: { items: readonly BaniDownloadItem[]; initiallyOpen?: boolean }) {
  const locale = useLocaleStore(state => state.locale)
  const copy = COPY[locale]
  const selectId = useId()
  const [downloads, setDownloads] = useState<BaniDownloadInfo[]>([])
  const [expanded, setExpanded] = useState(initiallyOpen)
  const [filter, setFilter] = useState('')
  const [showAll, setShowAll] = useState(false)
  const summaryRef = useRef<HTMLElement>(null)
  const [removalNotice, setRemovalNotice] = useState(false)
  const queue = useBaniDownloadQueue()
  const { progress, message, retryKeys } = queue
  const [checking, setChecking] = useState(true)
  const [sizes, setSizes] = useState<Record<string, number>>({})
  const [publishedKeys, setPublishedKeys] = useState<string[] | null>(null)
  const [checkingAvailable, setCheckingAvailable] = useState(false)
  const [availabilityFailed, setAvailabilityFailed] = useState(false)
  const [selectedKey, setSelectedKey] = useState(items[0]?.key ?? '')
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine !== false)
  const [error, setError] = useState<'listFailed' | 'removeFailed' | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const availabilityControllerRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)
  const openedRef = useRef(initiallyOpen)
  const refreshRevision = useRef(0)
  const itemsByKey = useMemo(() => new Map(items.map(item => [item.key, item])), [items])
  const publishedKeySet = new Set(publishedKeys ?? [])
  const availableItems = items.filter(item => publishedKeySet.has(item.key))
  const selected = availableItems.find(item => item.key === selectedKey) ?? availableItems[0]
  const downloadedKeys = new Set(downloads.map(item => item.key))
  const remainingItems = availableItems.filter(item => !downloadedKeys.has(item.key))
  const totalSize = remainingItems.length && remainingItems.every(item => sizes[item.key]) ? remainingItems.reduce((total, item) => total + sizes[item.key], 0) : null
  const estimate = locale === 'pa' ? 'ਪਾਠ ਦਾ ਅੰਦਾਜ਼ਨ ਆਕਾਰ' : locale === 'hi' ? 'पाठ का अनुमानित आकार' : 'Estimated text size'
  const extraSize = locale === 'pa' ? 'ਐਪ ਦੀਆਂ ਫ਼ਾਈਲਾਂ ਅਤੇ ਡਿਵਾਈਸ ਸਟੋਰੇਜ ਲਈ ਹੋਰ ਥਾਂ ਲੱਗ ਸਕਦੀ ਹੈ।' : locale === 'hi' ? 'ऐप की फ़ाइलें और डिवाइस स्टोरेज अतिरिक्त जगह ले सकते हैं।' : 'App files and device storage may use additional space.'
  const catalogueReady = availableItems.filter(item => downloadedKeys.has(item.key)).length
  const downloading = progress !== null
  const busy = downloading || removing !== null

  const refresh = useCallback(async () => {
    const revision = ++refreshRevision.current
    try {
      const saved = await listBaniDownloads()
      if (mountedRef.current && revision === refreshRevision.current) {
        setDownloads(saved)
        setError(current => current === 'listFailed' ? null : current)
        setChecking(false)
      }
      return saved
    } catch {
      if (mountedRef.current && revision === refreshRevision.current) {
        setChecking(false)
        setError('listFailed')
      }
      return null
    }
  }, [])

  const refreshAvailable = useCallback(async () => {
    availabilityControllerRef.current?.abort()
    if (navigator.onLine === false) return
    const controller = new AbortController()
    availabilityControllerRef.current = controller
    const deadline = window.setTimeout(() => controller.abort(new Error('Available downloads could not be checked.')), 30_000)
    setCheckingAvailable(true)
    setAvailabilityFailed(false)
    try {
      const [keys, estimates] = await Promise.allSettled([fetchPublishedScriptureReadingKeys(controller.signal), fetchPublishedScriptureSizes(controller.signal)])
      if (keys.status === 'rejected') throw keys.reason
      if (mountedRef.current && availabilityControllerRef.current === controller) {
        setPublishedKeys(keys.value)
        setSizes(estimates.status === 'fulfilled' ? estimates.value : {})
      }
    } catch {
      if (mountedRef.current && availabilityControllerRef.current === controller) {
        setPublishedKeys(null)
        setAvailabilityFailed(true)
      }
    } finally {
      window.clearTimeout(deadline)
      if (mountedRef.current && availabilityControllerRef.current === controller) {
        setCheckingAvailable(false)
        availabilityControllerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    const changed = () => {
      // The running queue receives each already-verified result directly. Reading
      // every saved pack on each item would repeatedly decode the full catalogue.
      if (openedRef.current && !useBaniDownloadQueue.getState().progress) void refresh()
    }
    const connectionChanged = () => {
      const connected = navigator.onLine !== false
      setOnline(connected)
      if (connected && openedRef.current) void refreshAvailable()
    }
    window.addEventListener(BANI_DOWNLOADS_CHANGED_EVENT, changed)
    window.addEventListener('online', connectionChanged)
    window.addEventListener('offline', connectionChanged)
    return () => {
      mountedRef.current = false
      availabilityControllerRef.current?.abort()
      window.removeEventListener(BANI_DOWNLOADS_CHANGED_EVENT, changed)
      window.removeEventListener('online', connectionChanged)
      window.removeEventListener('offline', connectionChanged)
    }
  }, [refresh, refreshAvailable])

  useEffect(() => {
    if (expanded && !downloading) void refresh()
  }, [expanded, downloading, refresh])

  useEffect(() => {
    if (!queue.completed.length) return
    setDownloads(previous => [...new Map([...previous, ...queue.completed].map(item => [item.key, item])).values()]
      .sort((a, b) => a.title.localeCompare(b.title)))
  }, [queue.completed])

  useEffect(() => { if (initiallyOpen) void refreshAvailable() }, [initiallyOpen, refreshAvailable])

  const startDownloads = async (keys: string[]) => {
    if (progress || !online || checkingAvailable || !publishedKeys) return
    setError(null)
    setRemovalNotice(false)
    await queue.start(keys.flatMap(key => { const item = itemsByKey.get(key); return item && publishedKeySet.has(key) ? [item] : [] }))
  }

  const remove = async (key: string) => {
    if (busy) return
    setRemoving(key)
    setError(null)
    queue.clearNotice()
    setRemovalNotice(false)
    try {
      if (!await removeBaniDownload(key)) throw new Error('Download removal failed')
      await refresh()
      if (mountedRef.current) { setRemovalNotice(true); summaryRef.current?.focus() }
    } catch { if (mountedRef.current) setError('removeFailed') }
    finally { if (mountedRef.current) setRemoving(null) }
  }

  const displayError = error ?? queue.error
  const matches = downloads.filter(item => item.title.toLocaleLowerCase().includes(filter.trim().toLocaleLowerCase()))
  const visible = showAll || filter.trim() ? matches : matches.slice(0, 6)
  const management = {
    en: { attention: 'Downloads need attention · open to retry', search: 'Find a downloaded bani', all: 'Show all downloads', fewer: 'Show fewer', removed: 'Download removed. Bookmarks and progress kept.', none: 'No downloaded banis match this search.', active: 'Downloading… You can keep reading. Keep this app open to finish.' },
    pa: { attention: 'ਡਾਊਨਲੋਡ ਚੈੱਕ ਕਰੋ · ਫਿਰ ਅਜ਼ਮਾਉਣ ਲਈ ਖੋਲ੍ਹੋ', search: 'ਡਾਊਨਲੋਡ ਕੀਤੀ ਬਾਣੀ ਲੱਭੋ', all: 'ਸਾਰੇ ਡਾਊਨਲੋਡ ਵੇਖੋ', fewer: 'ਘੱਟ ਵੇਖੋ', removed: 'ਡਾਊਨਲੋਡ ਹਟਾਇਆ। ਬੁੱਕਮਾਰਕ ਅਤੇ ਪ੍ਰਗਤੀ ਸੰਭਾਲੇ ਹਨ।', none: 'ਇਸ ਖੋਜ ਨਾਲ ਕੋਈ ਡਾਊਨਲੋਡ ਕੀਤੀ ਬਾਣੀ ਨਹੀਂ ਮਿਲੀ।', active: 'ਡਾਊਨਲੋਡ ਜਾਰੀ ਹੈ। ਤੁਸੀਂ ਪੜ੍ਹ ਸਕਦੇ ਹੋ। ਪੂਰਾ ਹੋਣ ਤੱਕ ਐਪ ਖੁੱਲ੍ਹੀ ਰੱਖੋ।' },
    hi: { attention: 'डाउनलोड जाँचें · फिर आज़माने के लिए खोलें', search: 'डाउनलोड की गई बाणी खोजें', all: 'सभी डाउनलोड देखें', fewer: 'कम दिखाएँ', removed: 'डाउनलोड हटाया। बुकमार्क और प्रगति सुरक्षित हैं।', none: 'इस खोज से कोई डाउनलोड की गई बाणी नहीं मिली।', active: 'डाउनलोड जारी है। आप पढ़ सकते हैं। पूरा होने तक ऐप खुला रखें।' },
  }[locale]
  return <><div className="sr-only" role="status" aria-live="polite">{progress ? copy.progress(progress.done, progress.total, progress.title) : !expanded && displayError ? copy[displayError] : !expanded && message ? copy[message] : !expanded && removalNotice ? management.removed : ''}</div><details open={expanded} className="bani-downloads" data-testid="bani-downloads" onToggle={event => {
    const open = event.currentTarget.open
    setExpanded(open)
    if (open) {
      openedRef.current = true
      void refreshAvailable()
    }
  }}>
    <summary ref={summaryRef} className="bani-downloads__summary">
      <span><span className="bani-downloads__title">{copy.title}</span><span className="bani-downloads__count">{progress ? copy.progress(progress.done, progress.total, progress.title) : displayError ? management.attention : !expanded && message ? copy[message] : checking ? expanded ? copy.checking : copy.includesLengths : copy.saved(downloads.length, publishedKeys === null ? null : availableItems.length)}</span></span>
      <IconChevronDown size={17} />
    </summary>

    {expanded ? <div className="bani-downloads__body">
      <p>{copy.description}</p>
      {progress ? <p className="bani-downloads__note">{management.active}</p> : null}
      <label htmlFor={selectId}>{copy.choose}</label>
      <select id={selectId} value={selected?.key ?? ''} disabled={busy || checkingAvailable || !availableItems.length} onChange={event => setSelectedKey(event.target.value)}>
        {availableItems.map(item => <option key={item.key} value={item.key}>{item.title}{downloadedKeys.has(item.key) ? ` — ${copy.downloaded}` : ''}</option>)}
      </select>
      {selected && sizes[selected.key] ? <p className="bani-downloads__note">{estimate}: {formatBytes(sizes[selected.key])}</p> : null}
      <div className="bani-downloads__actions">
        <button type="button" disabled={busy || checking || checkingAvailable || !online || !selected} onClick={() => { if (selected) void startDownloads([selected.key]) }}>
          {selected && downloadedKeys.has(selected.key) ? copy.update : copy.download}
        </button>
        <button type="button" className="bani-downloads__secondary" disabled={busy || checking || checkingAvailable || !online || !availableItems.length || catalogueReady === availableItems.length}
          onClick={() => { void startDownloads(availableItems.filter(item => !downloadedKeys.has(item.key)).map(item => item.key)) }}>
          {availableItems.length > 0 && catalogueReady === availableItems.length ? copy.allReady : copy.all}
        </button>
      </div>
      {totalSize ? <p className="bani-downloads__note">{copy.all} · {estimate}: {formatBytes(totalSize)}. {extraSize}</p> : null}
      {!online ? <p className="bani-downloads__note">{copy.offline}</p> : null}
      {checkingAvailable ? <p className="bani-downloads__note" role="status">{copy.checkingAvailable}</p> : null}
      {availabilityFailed && online ? <div role="alert"><p>{copy.availabilityFailed}</p><button type="button" disabled={busy || checkingAvailable} className="bani-downloads__text-button" onClick={() => { void refreshAvailable() }}>{copy.retryAvailable}</button></div> : null}
      {!checkingAvailable && publishedKeys !== null && !availableItems.length ? <p className="bani-downloads__note">{copy.noneAvailable}</p> : null}
      {progress ? <div className="bani-downloads__progress" >
        <p>{copy.progress(progress.done, progress.total, progress.title)}</p>
        <progress value={progress.done + Math.min(progress.detail.completed / Math.max(1, progress.detail.total), .99)} max={progress.total} aria-label={copy.title} />
        <p className="bani-downloads__note">{copy.stages[progress.detail.stage]}</p>
        <button type="button" className="bani-downloads__text-button" onClick={queue.cancel}>{copy.cancel}</button>
      </div> : null}
      {message ? <p role="status">{copy[message]}</p> : null}
      {message === 'stopped' && retryKeys.length ? <button type="button" disabled={busy || !online || checkingAvailable || !retryKeys.some(key => publishedKeySet.has(key))} className="bani-downloads__text-button" onClick={() => { void startDownloads(retryKeys) }}>{copy.retry}</button> : null}
      {removalNotice ? <p role="status">{management.removed}</p> : null}
      {displayError ? <div role="alert"><p>{copy[displayError]}</p>
        {(displayError === 'failed' || displayError === 'shellFailed') && retryKeys.length ? <button type="button" disabled={busy || !online || checkingAvailable || !retryKeys.some(key => publishedKeySet.has(key))} className="bani-downloads__text-button" onClick={() => { void startDownloads(retryKeys) }}>{copy.retry}</button> : null}
        {displayError === 'listFailed' ? <button type="button" disabled={busy} className="bani-downloads__text-button" onClick={() => { setError(null); setChecking(true); void refresh() }}>{copy.retry}</button> : null}
      </div> : null}
      {!checking && error !== 'listFailed' && !downloads.length ? <p className="bani-downloads__note">{copy.empty}</p> : null}
      {downloads.length > 6 ? <label className="bani-downloads__filter">{management.search}<input type="search" value={filter} onChange={event => setFilter(event.target.value)} /></label> : null}
      {filter && !matches.length ? <p role="status">{management.none}</p> : null}
      {downloads.length ? <ul className="bani-downloads__saved" aria-label={copy.title}>
        {visible.map(download => <li key={download.key}>
          <div><p lang="en" className="bani-downloads__saved-title">{download.title}</p><p className="bani-downloads__note">{copy.lengths(download.availableLengths.length)} · {formatBytes(download.byteSize)}</p></div>
          <div className="bani-downloads__saved-actions">
            {itemsByKey.get(download.key)?.onOpen ? <button type="button" className="bani-downloads__text-button" aria-label={`${copy.open}: ${download.title}`} onClick={itemsByKey.get(download.key)!.onOpen}>{copy.open}</button> : null}
            <button type="button" disabled={busy} className="bani-downloads__text-button" aria-label={`${copy.remove}: ${download.title}`} onClick={() => { void remove(download.key) }}>{removing === download.key ? '…' : copy.remove}</button>
          </div>
        </li>)}
      </ul> : null}
      {!filter && downloads.length > 6 ? <button type="button" className="bani-downloads__text-button" aria-expanded={showAll} onClick={() => setShowAll(value => !value)}>{showAll ? management.fewer : `${management.all} (${downloads.length})`}</button> : null}
      <p className="bani-downloads__note">{copy.preserved}</p>
      <p className="bani-downloads__note">{copy.textOnly}</p>
      <p className="bani-downloads__note">{copy.sources}: <a href="https://www.banidb.com/" target="_blank" rel="noreferrer">BaniDB</a> · <a href="https://www.shabados.com/" target="_blank" rel="noreferrer">Shabad OS</a></p>
    </div> : null}
  </details></>
}
