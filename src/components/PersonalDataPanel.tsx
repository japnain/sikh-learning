import { useRef, useState } from 'react'
import ModalSheet from './ModalSheet'
import { useLocaleStore } from '../store/locale'
import type { PersonalDataBackup, RestoreMode } from '../utils/personalDataBackup'

const COPY = {
  en: {
    title: 'Your reading, safely kept', body: 'Download a personal backup to move your saved work to another device or recover it later.',
    coverage: 'Includes saved passages, vocabulary and definitions, Stories saves, reading places, Nitnem history, search history, and preferences. Downloaded books, story text, scripture caches and sign-in details are not included.',
    private: 'The file contains your personal reading data. Keep it somewhere you trust.', download: 'Download backup', upload: 'Restore from a file', loading: 'Preparing…',
    preview: 'Review this backup', created: 'Created', bookmarks: 'Bookmarks', favorites: 'Saved passages', words: 'Vocabulary', stories: 'Saved stories', readingPlaces: 'Reading places', nitnemEvents: 'Nitnem records',
    merge: 'Merge with this device', mergeHelp: 'Keep current preferences. Combine saved items and history; keep the newer reading places and vocabulary reviews.',
    replace: 'Replace this device’s reading data', replaceHelp: 'Replace the personal data listed above with this backup. Existing items absent from the file will be removed. Your account and downloaded content stay unchanged.',
    choose: 'How to restore', confirm: 'Restore backup', cancel: 'Cancel', working: 'Restoring…', done: 'Your backup has been restored.', exported: 'Your backup is ready to save.',
    invalid: 'This file is not a supported NaamRas personal backup, is damaged, or exceeds the 16 MB limit. Nothing was changed.',
    failed: 'The backup could not be restored. Your previous data was kept. Check available device storage and try again.',
    rollback: 'The data change could not be safely finalized because device storage stopped working. Cloud backup is paused. Keep the selected backup and restore it again when storage is available.',
    exportFailed: 'A backup could not be created. Check that device storage is available and try again.',
  },
  pa: {
    title: 'ਆਪਣੀ ਪੜ੍ਹਾਈ ਸੰਭਾਲ ਕੇ ਰੱਖੋ', body: 'ਸੰਭਾਲਿਆ ਕੰਮ ਕਿਸੇ ਹੋਰ ਡਿਵਾਈਸ ਉੱਤੇ ਲਿਜਾਣ ਜਾਂ ਬਾਅਦ ਵਿੱਚ ਵਾਪਸ ਲਿਆਉਣ ਲਈ ਨਿੱਜੀ ਬੈਕਅੱਪ ਡਾਊਨਲੋਡ ਕਰੋ।',
    coverage: 'ਇਸ ਵਿੱਚ ਸੰਭਾਲੇ ਅੰਸ਼, ਸ਼ਬਦ ਅਤੇ ਅਰਥ, ਕਹਾਣੀਆਂ ਦੀਆਂ ਸੰਭਾਲਾਂ, ਪੜ੍ਹਨ ਦੀਆਂ ਥਾਵਾਂ, ਨਿਤਨੇਮ ਇਤਿਹਾਸ, ਖੋਜ ਇਤਿਹਾਸ ਅਤੇ ਪਸੰਦਾਂ ਸ਼ਾਮਲ ਹਨ। ਡਾਊਨਲੋਡ ਕੀਤੀਆਂ ਕਿਤਾਬਾਂ, ਕਹਾਣੀਆਂ ਦਾ ਪਾਠ, ਬਾਣੀ ਦੀਆਂ ਆਫ਼ਲਾਈਨ ਕਾਪੀਆਂ ਅਤੇ ਸਾਈਨ-ਇਨ ਜਾਣਕਾਰੀ ਸ਼ਾਮਲ ਨਹੀਂ ਹਨ।',
    private: 'ਇਸ ਫਾਈਲ ਵਿੱਚ ਤੁਹਾਡੀ ਨਿੱਜੀ ਪੜ੍ਹਾਈ ਦੀ ਜਾਣਕਾਰੀ ਹੈ। ਇਸਨੂੰ ਭਰੋਸੇਯੋਗ ਥਾਂ ਰੱਖੋ।', download: 'ਬੈਕਅੱਪ ਡਾਊਨਲੋਡ ਕਰੋ', upload: 'ਫਾਈਲ ਤੋਂ ਵਾਪਸ ਲਿਆਓ', loading: 'ਤਿਆਰ ਹੋ ਰਿਹਾ ਹੈ…',
    preview: 'ਬੈਕਅੱਪ ਦੀ ਜਾਂਚ ਕਰੋ', created: 'ਬਣਾਇਆ ਗਿਆ', bookmarks: 'ਬੁੱਕਮਾਰਕ', favorites: 'ਸੰਭਾਲੇ ਅੰਸ਼', words: 'ਸ਼ਬਦਾਵਲੀ', stories: 'ਸੰਭਾਲੀਆਂ ਕਹਾਣੀਆਂ', readingPlaces: 'ਪੜ੍ਹਨ ਦੀਆਂ ਥਾਵਾਂ', nitnemEvents: 'ਨਿਤਨੇਮ ਰਿਕਾਰਡ',
    merge: 'ਇਸ ਡਿਵਾਈਸ ਦੇ ਡਾਟੇ ਨਾਲ ਮਿਲਾਓ', mergeHelp: 'ਮੌਜੂਦਾ ਪਸੰਦਾਂ ਰੱਖੋ। ਸੰਭਾਲੀਆਂ ਚੀਜ਼ਾਂ ਅਤੇ ਇਤਿਹਾਸ ਮਿਲਾਓ; ਨਵੀਆਂ ਪੜ੍ਹਨ ਦੀਆਂ ਥਾਵਾਂ ਅਤੇ ਸ਼ਬਦ ਅਭਿਆਸ ਰੱਖੋ।',
    replace: 'ਇਸ ਡਿਵਾਈਸ ਦੀ ਪੜ੍ਹਾਈ ਦਾ ਡਾਟਾ ਬਦਲੋ', replaceHelp: 'ਉੱਪਰ ਦਿੱਤੀ ਨਿੱਜੀ ਜਾਣਕਾਰੀ ਨੂੰ ਇਸ ਬੈਕਅੱਪ ਨਾਲ ਬਦਲੋ। ਫਾਈਲ ਵਿੱਚ ਨਾ ਹੋਣ ਵਾਲੀਆਂ ਮੌਜੂਦਾ ਚੀਜ਼ਾਂ ਮਿਟ ਜਾਣਗੀਆਂ। ਖਾਤਾ ਅਤੇ ਡਾਊਨਲੋਡ ਕੀਤੀ ਸਮੱਗਰੀ ਨਹੀਂ ਬਦਲੇਗੀ।',
    choose: 'ਵਾਪਸ ਲਿਆਉਣ ਦਾ ਢੰਗ', confirm: 'ਬੈਕਅੱਪ ਵਾਪਸ ਲਿਆਓ', cancel: 'ਰੱਦ ਕਰੋ', working: 'ਵਾਪਸ ਲਿਆਂਦਾ ਜਾ ਰਿਹਾ ਹੈ…', done: 'ਤੁਹਾਡਾ ਬੈਕਅੱਪ ਵਾਪਸ ਆ ਗਿਆ ਹੈ।', exported: 'ਤੁਹਾਡਾ ਬੈਕਅੱਪ ਸੰਭਾਲਣ ਲਈ ਤਿਆਰ ਹੈ।',
    invalid: 'ਇਹ NaamRas ਦਾ ਸਮਰਥਿਤ ਨਿੱਜੀ ਬੈਕਅੱਪ ਨਹੀਂ ਹੈ, ਖਰਾਬ ਹੈ ਜਾਂ 16 MB ਤੋਂ ਵੱਡਾ ਹੈ। ਕੁਝ ਨਹੀਂ ਬਦਲਿਆ।', failed: 'ਬੈਕਅੱਪ ਵਾਪਸ ਨਹੀਂ ਆ ਸਕਿਆ। ਪਿਛਲਾ ਡਾਟਾ ਰੱਖਿਆ ਗਿਆ ਹੈ। ਡਿਵਾਈਸ ਵਿੱਚ ਖਾਲੀ ਥਾਂ ਦੇਖੋ ਅਤੇ ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
    rollback: 'ਡਿਵਾਈਸ ਦੀ ਸਟੋਰੇਜ ਬੰਦ ਹੋਣ ਕਾਰਨ ਡਾਟੇ ਦਾ ਬਦਲਾਅ ਸੁਰੱਖਿਅਤ ਢੰਗ ਨਾਲ ਪੂਰਾ ਨਹੀਂ ਹੋ ਸਕਿਆ। ਕਲਾਉਡ ਬੈਕਅੱਪ ਰੁਕਿਆ ਹੋਇਆ ਹੈ। ਚੁਣਿਆ ਬੈਕਅੱਪ ਰੱਖੋ ਅਤੇ ਸਟੋਰੇਜ ਉਪਲਬਧ ਹੋਣ ਉੱਤੇ ਮੁੜ ਲਿਆਓ।', exportFailed: 'ਬੈਕਅੱਪ ਨਹੀਂ ਬਣ ਸਕਿਆ। ਡਿਵਾਈਸ ਦੀ ਸਟੋਰੇਜ ਜਾਂਚੋ ਅਤੇ ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
  },
  hi: {
    title: 'अपना पढ़ना सुरक्षित रखिए', body: 'सहेजा हुआ काम दूसरे डिवाइस पर ले जाने या बाद में वापस पाने के लिए निजी बैकअप डाउनलोड कीजिए।',
    coverage: 'इसमें सहेजे अंश, शब्द और अर्थ, सहेजी कहानियाँ, पढ़ने की जगहें, नितनेम इतिहास, खोज इतिहास और पसंद शामिल हैं। डाउनलोड की गई किताबें, कहानी का पाठ, बाणी की ऑफलाइन प्रतियाँ और साइन-इन विवरण शामिल नहीं हैं।',
    private: 'इस फाइल में आपका निजी पठन डेटा है। इसे भरोसेमंद जगह रखिए।', download: 'बैकअप डाउनलोड करें', upload: 'फाइल से वापस लाएँ', loading: 'तैयार हो रहा है…',
    preview: 'बैकअप की जाँच करें', created: 'बनाया गया', bookmarks: 'बुकमार्क', favorites: 'सहेजे अंश', words: 'शब्दावली', stories: 'सहेजी कहानियाँ', readingPlaces: 'पढ़ने की जगहें', nitnemEvents: 'नितनेम रिकॉर्ड',
    merge: 'इस डिवाइस के डेटा से मिलाएँ', mergeHelp: 'मौजूदा पसंद रखें। सहेजी चीजें और इतिहास मिलाएँ; नई पढ़ने की जगहें और शब्द अभ्यास रखें।',
    replace: 'इस डिवाइस का पठन डेटा बदलें', replaceHelp: 'ऊपर दिए निजी डेटा को इस बैकअप से बदलें। फाइल में न मिलने वाली मौजूदा चीजें हट जाएँगी। खाता और डाउनलोड की सामग्री नहीं बदलेंगे।',
    choose: 'वापस लाने का तरीका', confirm: 'बैकअप वापस लाएँ', cancel: 'रद्द करें', working: 'वापस लाया जा रहा है…', done: 'आपका बैकअप वापस आ गया है।', exported: 'आपका बैकअप सहेजने के लिए तैयार है।',
    invalid: 'यह समर्थित NaamRas निजी बैकअप नहीं है, खराब है या 16 MB से बड़ा है। कुछ नहीं बदला गया।', failed: 'बैकअप वापस नहीं आ सका। पिछला डेटा रखा गया है। डिवाइस में खाली जगह जाँचें और फिर कोशिश करें।',
    rollback: 'डिवाइस की स्टोरेज बंद होने से डेटा का बदलाव सुरक्षित ढंग से पूरा नहीं हो सका। क्लाउड बैकअप रुका हुआ है। चुना बैकअप रखें और स्टोरेज उपलब्ध होने पर फिर वापस लाएँ।', exportFailed: 'बैकअप नहीं बन सका। डिवाइस की स्टोरेज जाँचें और फिर कोशिश करें।',
  },
} as const

type Counts = { bookmarks: number; favorites: number; words: number; stories: number; readingPlaces: number; nitnemEvents: number }
export default function PersonalDataPanel() {
  const locale = useLocaleStore(state => state.locale)
  const copy = COPY[locale]
  const input = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<{ backup: PersonalDataBackup; counts: Counts } | null>(null)
  const [mode, setMode] = useState<RestoreMode>('merge')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const button = 'interactive-focus min-h-[48px] rounded-lg border border-sand/25 px-4 py-3 font-sans text-sm font-semibold text-ink disabled:opacity-50 dark:border-dark-text/20 dark:text-dark-text'
  async function download() {
    setBusy(true)
    try {
      const { createPersonalDataBackup } = await import('../utils/personalDataBackup')
      const backup = createPersonalDataBackup()
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }))
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `naamras-backup-${backup.createdAt.slice(0, 10)}.json`
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setNotice(copy.exported)
    } catch { setNotice(copy.exportFailed) }
    finally { setBusy(false) }
  }
  async function selectFile(file: File) {
    setBusy(true)
    setNotice('')
    try {
      const api = await import('../utils/personalDataBackup')
      if (file.size > api.PERSONAL_BACKUP_MAX_BYTES) throw new Error('large')
      const backup = api.parsePersonalDataBackup(await file.text())
      setMode('merge')
      setPreview({ backup, counts: api.summarizePersonalDataBackup(backup) })
    } catch { setNotice(copy.invalid) }
    finally { setBusy(false); if (input.current) input.current.value = '' }
  }
  async function restore() {
    if (!preview) return
    setBusy(true)
    try {
      const { restorePersonalDataBackup } = await import('../utils/personalDataBackup')
      await restorePersonalDataBackup(preview.backup, mode)
      setPreview(null)
      setNotice(copy.done)
    } catch (error) { setNotice(error instanceof Error && ['restore-rollback-failed', 'restore-recovery-required'].includes(error.message) ? copy.rollback : copy.failed) }
    finally { setBusy(false) }
  }
  return <section className="section-shell-quiet mt-5 px-4 py-5" aria-labelledby="personal-data-title" data-testid="personal-data-panel">
    <h2 id="personal-data-title" className="font-display text-2xl text-ink dark:text-dark-text">{copy.title}</h2>
    <p className="mt-3 font-sans text-sm leading-6 text-ink/75 dark:text-dark-text/75">{copy.body}</p>
    <p className="mt-2 font-sans text-sm leading-6 text-ink/75 dark:text-dark-text/75">{copy.coverage}</p>
    <p className="mt-2 font-sans text-xs leading-5 text-ink/75 dark:text-dark-text/75">{copy.private}</p>
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      <button className={button} disabled={busy} onClick={() => { void download() }}>{copy.download}</button>
      <button className={button} disabled={busy} onClick={() => input.current?.click()}>{copy.upload}</button>
      <input ref={input} type="file" accept="application/json,.json" className="sr-only" aria-label={copy.upload} tabIndex={-1} onChange={event => { const file = event.target.files?.[0]; if (file) void selectFile(file) }} />
    </div>
    <p role="status" className="mt-3 font-sans text-sm leading-6 text-ink dark:text-dark-text">{busy ? copy.loading : notice}</p>
    <ModalSheet open={Boolean(preview)} onClose={() => { if (!busy) setPreview(null) }} title={copy.preview} description={copy.private}>
      {preview && <div className="px-5 py-5">
        <h2 className="font-display text-2xl text-ink dark:text-dark-text">{copy.preview}</h2>
        <p className="mt-2 text-sm text-ink dark:text-dark-text">{copy.created}: {new Date(preview.backup.createdAt).toLocaleString(locale)}</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm text-ink dark:text-dark-text">
          {(Object.keys(preview.counts) as (keyof Counts)[]).map(key => <div key={key}><dt>{copy[key]}</dt><dd className="font-semibold">{preview.counts[key]}</dd></div>)}
        </dl>
        <fieldset className="mt-5 text-ink dark:text-dark-text"><legend className="font-semibold">{copy.choose}</legend>
          {(['merge', 'replace'] as const).map(value => <label key={value} className="mt-3 flex cursor-pointer gap-3 rounded-lg border border-sand/25 p-3 dark:border-dark-text/20">
            <input type="radio" name="restore-mode" value={value} checked={mode === value} disabled={busy} onChange={() => setMode(value)} className="mt-1" />
            <span><span className="block text-sm font-semibold">{copy[value]}</span><span className="mt-1 block text-sm leading-6">{copy[value === 'merge' ? 'mergeHelp' : 'replaceHelp']}</span></span>
          </label>)}
        </fieldset>
        <p role="status" className="mt-3 text-sm text-ink dark:text-dark-text">{notice}</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2"><button className={button} disabled={busy} onClick={() => setPreview(null)}>{copy.cancel}</button><button className={button} disabled={busy} onClick={() => { void restore() }}>{busy ? copy.working : copy.confirm}</button></div>
      </div>}
    </ModalSheet>
  </section>
}
