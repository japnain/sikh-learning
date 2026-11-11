import { useRef, useState, type ReactNode } from 'react'
import { useCloudSyncStore } from '../store/cloudSync'
import ModalSheet from './ModalSheet'
import { useLocaleStore } from '../store/locale'
import type { PersonalDataBackup, RestoreMode } from '../utils/personalDataBackup'

const PREFERENCE_KEYS = ['sikh-language', 'sikh-ui-locale', 'sikh-theme', 'sikh-onboarding', 'sikh-sundar-gutka-lengths', 'sikh-epub-reader-preferences', 'naamras-home-artwork', 'sikh-music', 'sikh-recitation', 'naamras-reader-presentation', 'naamras-ui-disclosure']
const COPY = {
  en: {
    deviceOnly: 'Saved on this device', deviceHelp: 'Cloud backup is unavailable in this version. Clearing browser or app data can remove your saved work. Keep a backup file to recover it or move it to another device.',
    restoredPreferences: 'Damaged preferences were replaced with defaults:',
    recovered: 'Backup ready. Damaged preferences were omitted and replaced with defaults in the file:',
    preferenceLabels: ['Reading and language', 'App language', 'Appearance', 'Welcome choices', 'Bani lengths', 'Book reader', 'Home artwork', 'Background sound', 'Recitation', 'Reader mode', 'Expanded sections'],
    cloudReplace: 'Cloud backup is connected. Replacing also deletes synced items missing from this file from your cloud account and other connected devices after sync. Choose Merge to keep those items.',
    title: 'Your reading, safely kept', body: 'Download a personal backup to move your saved work to another device or recover it later.',
    coverage: 'Includes saved passages, vocabulary and definitions, Stories saves, reading places, Nitnem history, search history, and preferences. Downloaded books, story text, scripture caches and sign-in details are not included.',
    private: 'The file contains your personal reading data. Keep it somewhere you trust.', download: 'Download backup', upload: 'Restore from a file', loading: 'Preparing…',
    preview: 'Review this backup', created: 'Created', bookmarks: 'Bookmarks', favorites: 'Saved passages', words: 'Vocabulary', stories: 'Saved stories', readingPlaces: 'Reading places', nitnemEvents: 'Nitnem records',
    merge: 'Merge with this device', mergeHelp: 'Keep current preferences, using defaults for any damaged preferences. Combine saved items and history; keep the newer reading places and vocabulary reviews.',
    replace: 'Replace this device’s reading data', replaceHelp: 'Replace the personal data listed above with this backup. Existing items absent from the file will be removed. Your sign-in and downloaded content stay unchanged.',
    choose: 'How to restore', confirm: 'Restore backup', cancel: 'Cancel', working: 'Restoring…', done: 'Your backup has been restored.', exported: 'Your backup is ready to save.',
    invalid: 'This file is not a supported NaamRas personal backup, is damaged, or exceeds the 16 MB limit. Nothing was changed.',
    failed: 'The backup could not be restored. Your previous data was kept. Check available device storage and try again.',
    rollback: 'The data change could not be safely finalized because device storage stopped working. Cloud backup is paused. Keep the selected backup and restore it again when storage is available.',
    exportFailed: 'A backup could not be created safely. Your saved data was not changed. Check device storage and try again, or open Support.',
  },
  pa: {
    deviceOnly: 'ਇਸ ਡਿਵਾਈਸ ਉੱਤੇ ਸੰਭਾਲਿਆ', deviceHelp: 'ਇਸ ਵਰਜਨ ਵਿੱਚ ਕਲਾਉਡ ਬੈਕਅੱਪ ਉਪਲਬਧ ਨਹੀਂ ਹੈ। ਬ੍ਰਾਊਜ਼ਰ ਜਾਂ ਐਪ ਦਾ ਡਾਟਾ ਮਿਟਾਉਣ ਨਾਲ ਸੰਭਾਲਿਆ ਕੰਮ ਮਿਟ ਸਕਦਾ ਹੈ। ਵਾਪਸ ਲਿਆਉਣ ਜਾਂ ਹੋਰ ਡਿਵਾਈਸ ਉੱਤੇ ਲਿਜਾਣ ਲਈ ਬੈਕਅੱਪ ਫਾਈਲ ਰੱਖੋ।',
    restoredPreferences: 'ਖਰਾਬ ਪਸੰਦਾਂ ਦੀ ਥਾਂ ਮੂਲ ਪਸੰਦਾਂ ਰੱਖੀਆਂ ਗਈਆਂ ਹਨ:',
    recovered: 'ਬੈਕਅੱਪ ਤਿਆਰ ਹੈ। ਖਰਾਬ ਪਸੰਦਾਂ ਛੱਡ ਕੇ ਫਾਈਲ ਵਿੱਚ ਮੂਲ ਪਸੰਦਾਂ ਰੱਖੀਆਂ ਗਈਆਂ ਹਨ:',
    preferenceLabels: ['ਪੜ੍ਹਾਈ ਅਤੇ ਭਾਸ਼ਾ', 'ਐਪ ਦੀ ਭਾਸ਼ਾ', 'ਦਿੱਖ', 'ਸ਼ੁਰੂਆਤੀ ਚੋਣਾਂ', 'ਬਾਣੀ ਦੀ ਲੰਬਾਈ', 'ਕਿਤਾਬ ਰੀਡਰ', 'ਮੁੱਖ ਚਿੱਤਰ', 'ਪਿਛੋਕੜ ਦੀ ਧੁਨ', 'ਪਾਠ ਦੀ ਆਵਾਜ਼', 'ਰੀਡਰ ਮੋਡ', 'ਖੁੱਲ੍ਹੇ ਭਾਗ'],
    cloudReplace: 'ਕਲਾਉਡ ਬੈਕਅੱਪ ਜੁੜਿਆ ਹੋਇਆ ਹੈ। ਬਦਲਣ ਉੱਤੇ ਇਸ ਫਾਈਲ ਵਿੱਚ ਨਾ ਹੋਣ ਵਾਲੀਆਂ ਸਿੰਕ ਕੀਤੀਆਂ ਚੀਜ਼ਾਂ ਅਗਲੇ ਸਿੰਕ ਤੋਂ ਬਾਅਦ ਕਲਾਉਡ ਖਾਤੇ ਅਤੇ ਹੋਰ ਜੁੜੀਆਂ ਡਿਵਾਈਸਾਂ ਤੋਂ ਵੀ ਮਿਟ ਜਾਣਗੀਆਂ। ਉਹਨਾਂ ਨੂੰ ਰੱਖਣ ਲਈ ਮਿਲਾਉਣ ਦਾ ਢੰਗ ਚੁਣੋ।',
    title: 'ਆਪਣੀ ਪੜ੍ਹਾਈ ਸੰਭਾਲ ਕੇ ਰੱਖੋ', body: 'ਸੰਭਾਲਿਆ ਕੰਮ ਕਿਸੇ ਹੋਰ ਡਿਵਾਈਸ ਉੱਤੇ ਲਿਜਾਣ ਜਾਂ ਬਾਅਦ ਵਿੱਚ ਵਾਪਸ ਲਿਆਉਣ ਲਈ ਨਿੱਜੀ ਬੈਕਅੱਪ ਡਾਊਨਲੋਡ ਕਰੋ।',
    coverage: 'ਇਸ ਵਿੱਚ ਸੰਭਾਲੇ ਅੰਸ਼, ਸ਼ਬਦ ਅਤੇ ਅਰਥ, ਕਹਾਣੀਆਂ ਦੀਆਂ ਸੰਭਾਲਾਂ, ਪੜ੍ਹਨ ਦੀਆਂ ਥਾਵਾਂ, ਨਿਤਨੇਮ ਇਤਿਹਾਸ, ਖੋਜ ਇਤਿਹਾਸ ਅਤੇ ਪਸੰਦਾਂ ਸ਼ਾਮਲ ਹਨ। ਡਾਊਨਲੋਡ ਕੀਤੀਆਂ ਕਿਤਾਬਾਂ, ਕਹਾਣੀਆਂ ਦਾ ਪਾਠ, ਬਾਣੀ ਦੀਆਂ ਆਫ਼ਲਾਈਨ ਕਾਪੀਆਂ ਅਤੇ ਸਾਈਨ-ਇਨ ਜਾਣਕਾਰੀ ਸ਼ਾਮਲ ਨਹੀਂ ਹਨ।',
    private: 'ਇਸ ਫਾਈਲ ਵਿੱਚ ਤੁਹਾਡੀ ਨਿੱਜੀ ਪੜ੍ਹਾਈ ਦੀ ਜਾਣਕਾਰੀ ਹੈ। ਇਸਨੂੰ ਭਰੋਸੇਯੋਗ ਥਾਂ ਰੱਖੋ।', download: 'ਬੈਕਅੱਪ ਡਾਊਨਲੋਡ ਕਰੋ', upload: 'ਫਾਈਲ ਤੋਂ ਵਾਪਸ ਲਿਆਓ', loading: 'ਤਿਆਰ ਹੋ ਰਿਹਾ ਹੈ…',
    preview: 'ਬੈਕਅੱਪ ਦੀ ਜਾਂਚ ਕਰੋ', created: 'ਬਣਾਇਆ ਗਿਆ', bookmarks: 'ਬੁੱਕਮਾਰਕ', favorites: 'ਸੰਭਾਲੇ ਅੰਸ਼', words: 'ਸ਼ਬਦਾਵਲੀ', stories: 'ਸੰਭਾਲੀਆਂ ਕਹਾਣੀਆਂ', readingPlaces: 'ਪੜ੍ਹਨ ਦੀਆਂ ਥਾਵਾਂ', nitnemEvents: 'ਨਿਤਨੇਮ ਰਿਕਾਰਡ',
    merge: 'ਇਸ ਡਿਵਾਈਸ ਦੇ ਡਾਟੇ ਨਾਲ ਮਿਲਾਓ', mergeHelp: 'ਮੌਜੂਦਾ ਪਸੰਦਾਂ ਰੱਖੋ; ਖਰਾਬ ਪਸੰਦਾਂ ਦੀ ਥਾਂ ਮੂਲ ਪਸੰਦਾਂ ਵਰਤੋ। ਸੰਭਾਲੀਆਂ ਚੀਜ਼ਾਂ ਅਤੇ ਇਤਿਹਾਸ ਮਿਲਾਓ; ਨਵੀਆਂ ਪੜ੍ਹਨ ਦੀਆਂ ਥਾਵਾਂ ਅਤੇ ਸ਼ਬਦ ਅਭਿਆਸ ਰੱਖੋ।',
    replace: 'ਇਸ ਡਿਵਾਈਸ ਦੀ ਪੜ੍ਹਾਈ ਦਾ ਡਾਟਾ ਬਦਲੋ', replaceHelp: 'ਉੱਪਰ ਦਿੱਤੀ ਨਿੱਜੀ ਜਾਣਕਾਰੀ ਨੂੰ ਇਸ ਬੈਕਅੱਪ ਨਾਲ ਬਦਲੋ। ਫਾਈਲ ਵਿੱਚ ਨਾ ਹੋਣ ਵਾਲੀਆਂ ਮੌਜੂਦਾ ਚੀਜ਼ਾਂ ਮਿਟ ਜਾਣਗੀਆਂ। ਸਾਈਨ-ਇਨ ਅਤੇ ਡਾਊਨਲੋਡ ਕੀਤੀ ਸਮੱਗਰੀ ਨਹੀਂ ਬਦਲੇਗੀ।',
    choose: 'ਵਾਪਸ ਲਿਆਉਣ ਦਾ ਢੰਗ', confirm: 'ਬੈਕਅੱਪ ਵਾਪਸ ਲਿਆਓ', cancel: 'ਰੱਦ ਕਰੋ', working: 'ਵਾਪਸ ਲਿਆਂਦਾ ਜਾ ਰਿਹਾ ਹੈ…', done: 'ਤੁਹਾਡਾ ਬੈਕਅੱਪ ਵਾਪਸ ਆ ਗਿਆ ਹੈ।', exported: 'ਤੁਹਾਡਾ ਬੈਕਅੱਪ ਸੰਭਾਲਣ ਲਈ ਤਿਆਰ ਹੈ।',
    invalid: 'ਇਹ NaamRas ਦਾ ਸਮਰਥਿਤ ਨਿੱਜੀ ਬੈਕਅੱਪ ਨਹੀਂ ਹੈ, ਖਰਾਬ ਹੈ ਜਾਂ 16 MB ਤੋਂ ਵੱਡਾ ਹੈ। ਕੁਝ ਨਹੀਂ ਬਦਲਿਆ।', failed: 'ਬੈਕਅੱਪ ਵਾਪਸ ਨਹੀਂ ਆ ਸਕਿਆ। ਪਿਛਲਾ ਡਾਟਾ ਰੱਖਿਆ ਗਿਆ ਹੈ। ਡਿਵਾਈਸ ਵਿੱਚ ਖਾਲੀ ਥਾਂ ਦੇਖੋ ਅਤੇ ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
    rollback: 'ਡਿਵਾਈਸ ਦੀ ਸਟੋਰੇਜ ਬੰਦ ਹੋਣ ਕਾਰਨ ਡਾਟੇ ਦਾ ਬਦਲਾਅ ਸੁਰੱਖਿਅਤ ਢੰਗ ਨਾਲ ਪੂਰਾ ਨਹੀਂ ਹੋ ਸਕਿਆ। ਕਲਾਉਡ ਬੈਕਅੱਪ ਰੁਕਿਆ ਹੋਇਆ ਹੈ। ਚੁਣਿਆ ਬੈਕਅੱਪ ਰੱਖੋ ਅਤੇ ਸਟੋਰੇਜ ਉਪਲਬਧ ਹੋਣ ਉੱਤੇ ਮੁੜ ਲਿਆਓ।', exportFailed: 'ਬੈਕਅੱਪ ਸੁਰੱਖਿਅਤ ਢੰਗ ਨਾਲ ਨਹੀਂ ਬਣ ਸਕਿਆ। ਸੰਭਾਲਿਆ ਡਾਟਾ ਨਹੀਂ ਬਦਲਿਆ। ਡਿਵਾਈਸ ਦੀ ਸਟੋਰੇਜ ਜਾਂਚੋ ਅਤੇ ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ, ਜਾਂ ਸਹਾਇਤਾ ਖੋਲ੍ਹੋ।',
  },
  hi: {
    deviceOnly: 'इस डिवाइस पर सहेजा गया', deviceHelp: 'इस संस्करण में क्लाउड बैकअप उपलब्ध नहीं है। ब्राउज़र या ऐप का डेटा मिटाने से सहेजा काम मिट सकता है। वापस पाने या दूसरे डिवाइस पर ले जाने के लिए बैकअप फाइल रखिए।',
    restoredPreferences: 'खराब पसंद की जगह मूल पसंद रखी गई हैं:',
    recovered: 'बैकअप तैयार है। खराब पसंद छोड़कर फाइल में मूल पसंद रखी गई हैं:',
    preferenceLabels: ['पठन और भाषा', 'ऐप की भाषा', 'रूप', 'शुरुआती विकल्प', 'बाणी की लंबाई', 'किताब रीडर', 'मुख्य चित्र', 'पृष्ठभूमि की ध्वनि', 'पाठ की आवाज़', 'रीडर मोड', 'खुले भाग'],
    cloudReplace: 'क्लाउड बैकअप जुड़ा हुआ है। बदलने पर इस फाइल में न मिलने वाली सिंक की गई चीजें अगले सिंक के बाद क्लाउड खाते और दूसरे जुड़े डिवाइसों से भी मिट जाएँगी। उन्हें रखने के लिए मिलाने का विकल्प चुनें।',
    title: 'अपना पढ़ना सुरक्षित रखिए', body: 'सहेजा हुआ काम दूसरे डिवाइस पर ले जाने या बाद में वापस पाने के लिए निजी बैकअप डाउनलोड कीजिए।',
    coverage: 'इसमें सहेजे अंश, शब्द और अर्थ, सहेजी कहानियाँ, पढ़ने की जगहें, नितनेम इतिहास, खोज इतिहास और पसंद शामिल हैं। डाउनलोड की गई किताबें, कहानी का पाठ, बाणी की ऑफलाइन प्रतियाँ और साइन-इन विवरण शामिल नहीं हैं।',
    private: 'इस फाइल में आपका निजी पठन डेटा है। इसे भरोसेमंद जगह रखिए।', download: 'बैकअप डाउनलोड करें', upload: 'फाइल से वापस लाएँ', loading: 'तैयार हो रहा है…',
    preview: 'बैकअप की जाँच करें', created: 'बनाया गया', bookmarks: 'बुकमार्क', favorites: 'सहेजे अंश', words: 'शब्दावली', stories: 'सहेजी कहानियाँ', readingPlaces: 'पढ़ने की जगहें', nitnemEvents: 'नितनेम रिकॉर्ड',
    merge: 'इस डिवाइस के डेटा से मिलाएँ', mergeHelp: 'मौजूदा पसंद रखें; खराब पसंद की जगह मूल पसंद इस्तेमाल करें। सहेजी चीजें और इतिहास मिलाएँ; नई पढ़ने की जगहें और शब्द अभ्यास रखें।',
    replace: 'इस डिवाइस का पठन डेटा बदलें', replaceHelp: 'ऊपर दिए निजी डेटा को इस बैकअप से बदलें। फाइल में न मिलने वाली मौजूदा चीजें हट जाएँगी। साइन-इन और डाउनलोड की सामग्री नहीं बदलेंगे।',
    choose: 'वापस लाने का तरीका', confirm: 'बैकअप वापस लाएँ', cancel: 'रद्द करें', working: 'वापस लाया जा रहा है…', done: 'आपका बैकअप वापस आ गया है।', exported: 'आपका बैकअप सहेजने के लिए तैयार है।',
    invalid: 'यह समर्थित NaamRas निजी बैकअप नहीं है, खराब है या 16 MB से बड़ा है। कुछ नहीं बदला गया।', failed: 'बैकअप वापस नहीं आ सका। पिछला डेटा रखा गया है। डिवाइस में खाली जगह जाँचें और फिर कोशिश करें।',
    rollback: 'डिवाइस की स्टोरेज बंद होने से डेटा का बदलाव सुरक्षित ढंग से पूरा नहीं हो सका। क्लाउड बैकअप रुका हुआ है। चुना बैकअप रखें और स्टोरेज उपलब्ध होने पर फिर वापस लाएँ।', exportFailed: 'बैकअप सुरक्षित ढंग से नहीं बन सका। सहेजा डेटा नहीं बदला। डिवाइस की स्टोरेज जाँचें और फिर कोशिश करें, या सहायता खोलें।',
  },
} as const

type Counts = { bookmarks: number; favorites: number; words: number; stories: number; readingPlaces: number; nitnemEvents: number }
export default function PersonalDataPanel({ children }: { children?: ReactNode }) {
  const configured = useCloudSyncStore(state => state.configured)
  const cloudConnected = useCloudSyncStore(state => state.configured && Boolean(state.currentUser))
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
      const { createPersonalDataBackupResult } = await import('../utils/personalDataBackup')
      const { backup, omittedPreferences } = createPersonalDataBackupResult()
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }))
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `naamras-backup-${backup.createdAt.slice(0, 10)}.json`
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setNotice(omittedPreferences.length ? `${copy.recovered} ${omittedPreferences.map(key => copy.preferenceLabels[PREFERENCE_KEYS.indexOf(key)]).join(', ')}.` : copy.exported)
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
      const { restorePersonalDataBackupResult } = await import('../utils/personalDataBackup')
      const { omittedPreferences } = await restorePersonalDataBackupResult(preview.backup, mode)
      setPreview(null)
      setNotice(omittedPreferences.length ? `${copy.done} ${copy.restoredPreferences} ${omittedPreferences.map(key => copy.preferenceLabels[PREFERENCE_KEYS.indexOf(key)]).join(', ')}.` : copy.done)
    } catch (error) { setNotice(error instanceof Error && ['restore-rollback-failed', 'restore-recovery-required'].includes(error.message) ? copy.rollback : copy.failed) }
    finally { setBusy(false) }
  }
  return <section className="section-shell-quiet mt-5 px-4 py-5" aria-labelledby="personal-data-title" data-testid="personal-data-panel" lang={locale}>
    {!configured && <p className="eyebrow">{copy.deviceOnly}</p>}
    <h2 id="personal-data-title" className="font-display text-2xl text-ink dark:text-dark-text">{copy.title}</h2>
    <p className="mt-3 font-sans text-sm leading-6 text-ink/75 dark:text-dark-text/75">{configured ? copy.body : copy.deviceHelp}</p>
    <p className="mt-2 font-sans text-sm leading-6 text-ink/75 dark:text-dark-text/75">{copy.coverage}</p>
    <p className="mt-2 font-sans text-xs leading-5 text-ink/75 dark:text-dark-text/75">{copy.private}</p>
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      <button className={button} disabled={busy} onClick={() => { void download() }}>{copy.download}</button>
      <button className={button} disabled={busy} onClick={() => input.current?.click()}>{copy.upload}</button>
      <input ref={input} type="file" accept="application/json,.json" hidden aria-label={copy.upload} tabIndex={-1} onChange={event => { const file = event.target.files?.[0]; if (file) void selectFile(file) }} />
    </div>
    <p role="status" className="mt-3 font-sans text-sm leading-6 text-ink dark:text-dark-text">{busy ? copy.loading : notice}</p>
    {children}
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
        {mode === 'replace' && cloudConnected && <p role="note" className="mt-3 rounded-lg border border-saffron/30 bg-saffron/10 p-3 text-sm leading-6 text-ink dark:text-dark-text">{copy.cloudReplace}</p>}
        <p role="status" className="mt-3 text-sm text-ink dark:text-dark-text">{notice}</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2"><button className={button} disabled={busy} onClick={() => setPreview(null)}>{copy.cancel}</button><button className={button} disabled={busy} onClick={() => { void restore() }}>{busy ? copy.working : copy.confirm}</button></div>
      </div>}
    </ModalSheet>
  </section>
}
