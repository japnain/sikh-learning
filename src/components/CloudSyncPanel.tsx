import { useState } from 'react'
import { IconChevronDown, IconChevronUp } from './icons'
import ModalSheet from './ModalSheet'
import { deleteCloudAccount, sendMagicLink, signInWithProvider, signOutOfCloud, syncNow } from '../supabase/runtime'
import { usePersistentDisclosure } from '../hooks/usePersistentDisclosure'
import { useCloudSyncStore } from '../store/cloudSync'
import { useLocaleStore } from '../store/locale'

const CLOUD_COPY = {
  en: {
    eyebrow: 'Personal data', localTitle: 'Your reading stays on this device.', title: 'Optional cloud backup',
    localSummary: 'This version does not automatically back up to an account. Keep a backup file to make your reading data recoverable.',
    localDetail: 'Your saves, vocabulary, reading places, Nitnem history and preferences are stored in this browser. Clearing app or site data removes them. Use the backup file controls to keep a copy or move to another device.',
    signedOut: 'Reading is available without an account. Sign in only if you want to back up the supported items below.',
    connected: 'Your account keeps the supported items below in sync. A backup file includes the rest of your personal reading data.',
    coverageTitle: 'Included in cloud backup',
    coverage: 'Scripture and book bookmarks, saved scripture passages, vocabulary, reading progress, your most recent reading, selected Nitnem banis and the current day’s completions, core scripture-reader settings, app language and theme.',
    exclusionsTitle: 'Keep these in a backup file',
    exclusions: 'Story saves and reading places, earlier Nitnem history, weekly goals, tracking choices, separate places for each bani, an active Nitnem practice, book/story reading preferences, reading mode, supporting-text size, artwork and sound preferences stay on this device. A complete backup file includes them. Downloaded reading content is separate from personal-data backup.',
    mergeHint: 'First sign-in combines supported data from this device with your account.',
    signInApple: 'Continue with Apple', signInEmail: 'Email a sign-in link', emailLabel: 'Email address',
    emailSent: 'Check your email for your sign-in link. You can keep reading while you wait.',
    unavailable: 'Account sign-in is unavailable right now. You can keep reading and use a backup file.',
    syncNow: 'Sync now', signOut: 'Sign out', deleteAccount: 'Delete cloud account',
    deleteTitle: 'Delete your cloud account?',
    deleteDescription: 'Your account and all synced NaamRas data will be permanently deleted. This cannot be undone.',
    deleteLocalNote: 'Reading data on this device stays available until you clear the app or site data.',
    deleteConfirm: 'Delete account permanently', deleteCancel: 'Keep account', deleting: 'Deleting account…',
    queueReady: 'Your changes are waiting for the next successful connection.',
    offline: 'You are offline. Keep reading on this device; cloud backup will resume when you reconnect.',
    error: 'Cloud backup could not finish. Your reading stays available on this device. Please try again.',
    recovery: 'Device storage could not finish a data change. Cloud backup is paused. Free device storage, then restore your personal backup before syncing again.',
    authError: 'Sign-in is unavailable right now. Please try again, or keep reading without an account.',
    accountError: 'The account change could not be completed. Please try again.',
    lastSynced: 'Last synced', notSynced: 'No completed sync yet', connectedAs: 'Connected as',
    changesWaiting: 'Changes waiting', noChangesWaiting: 'No changes waiting',
    localOnlyStatus: 'On this device', signedOutStatus: 'Optional', readyStatus: 'Connected',
    syncingStatus: 'Syncing', queuedStatus: 'Changes waiting', offlineStatus: 'Offline',
    errorStatus: 'Needs attention', authStatus: 'Opening sign-in', loadingStatus: 'Checking account',
  },
  pa: {
    eyebrow: 'ਨਿੱਜੀ ਡਾਟਾ', localTitle: 'ਤੁਹਾਡੀ ਪੜ੍ਹਾਈ ਇਸ ਡਿਵਾਈਸ ਤੇ ਰਹਿੰਦੀ ਹੈ।', title: 'ਚੋਣਵਾਂ ਕਲਾਉਡ ਬੈਕਅੱਪ',
    localSummary: 'ਇਸ ਵਰਜਨ ਵਿੱਚ ਖਾਤੇ ਨਾਲ ਆਪਣੇ ਆਪ ਬੈਕਅੱਪ ਨਹੀਂ ਹੁੰਦਾ। ਪੜ੍ਹਾਈ ਦਾ ਡਾਟਾ ਮੁੜ ਪ੍ਰਾਪਤ ਕਰਨ ਲਈ ਬੈਕਅੱਪ ਫ਼ਾਈਲ ਰੱਖੋ।',
    localDetail: 'ਸੰਭਾਲੀਆਂ ਚੀਜ਼ਾਂ, ਸ਼ਬਦਾਵਲੀ, ਪੜ੍ਹਨ ਦੀਆਂ ਥਾਵਾਂ, ਨਿਤਨੇਮ ਦਾ ਇਤਿਹਾਸ ਅਤੇ ਪਸੰਦਾਂ ਇਸ ਬ੍ਰਾਊਜ਼ਰ ਵਿੱਚ ਰਹਿੰਦੀਆਂ ਹਨ। ਐਪ ਜਾਂ ਸਾਈਟ ਦਾ ਡਾਟਾ ਸਾਫ਼ ਕਰਨ ਨਾਲ ਇਹ ਮਿਟ ਜਾਂਦੇ ਹਨ। ਨਕਲ ਰੱਖਣ ਜਾਂ ਦੂਜੇ ਡਿਵਾਈਸ ਤੇ ਲਿਜਾਣ ਲਈ ਬੈਕਅੱਪ ਫ਼ਾਈਲ ਵਾਲੇ ਬਟਨ ਵਰਤੋ।',
    signedOut: 'ਬਿਨਾਂ ਖਾਤੇ ਦੇ ਵੀ ਪੜ੍ਹ ਸਕਦੇ ਹੋ। ਹੇਠਾਂ ਦਿੱਤੀਆਂ ਚੀਜ਼ਾਂ ਦਾ ਬੈਕਅੱਪ ਚਾਹੀਦਾ ਹੋਵੇ ਤਾਂ ਹੀ ਸਾਈਨ ਇਨ ਕਰੋ।',
    connected: 'ਤੁਹਾਡੇ ਖਾਤੇ ਰਾਹੀਂ ਹੇਠਾਂ ਦਿੱਤੀਆਂ ਚੀਜ਼ਾਂ ਇਕਸਾਰ ਰਹਿੰਦੀਆਂ ਹਨ। ਬੈਕਅੱਪ ਫ਼ਾਈਲ ਵਿੱਚ ਬਾਕੀ ਨਿੱਜੀ ਪੜ੍ਹਾਈ ਦਾ ਡਾਟਾ ਵੀ ਸ਼ਾਮਲ ਹੁੰਦਾ ਹੈ।',
    coverageTitle: 'ਕਲਾਉਡ ਬੈਕਅੱਪ ਵਿੱਚ ਸ਼ਾਮਲ',
    coverage: 'ਗੁਰਬਾਣੀ ਅਤੇ ਕਿਤਾਬਾਂ ਦੇ ਬੁੱਕਮਾਰਕ, ਸੰਭਾਲੇ ਗੁਰਬਾਣੀ ਅੰਸ਼, ਸ਼ਬਦਾਵਲੀ, ਪੜ੍ਹਾਈ ਦੀ ਤਰੱਕੀ, ਸਭ ਤੋਂ ਤਾਜ਼ਾ ਪੜ੍ਹਨ ਦੀ ਥਾਂ, ਚੁਣੀਆਂ ਨਿਤਨੇਮ ਬਾਣੀਆਂ ਅਤੇ ਅੱਜ ਦੀ ਪੂਰਨਤਾ, ਗੁਰਬਾਣੀ ਰੀਡਰ ਦੀਆਂ ਮੁੱਖ ਸੈਟਿੰਗਾਂ, ਐਪ ਦੀ ਭਾਸ਼ਾ ਅਤੇ ਥੀਮ।',
    exclusionsTitle: 'ਇਨ੍ਹਾਂ ਲਈ ਬੈਕਅੱਪ ਫ਼ਾਈਲ ਰੱਖੋ',
    exclusions: 'ਸੰਭਾਲੀਆਂ ਕਹਾਣੀਆਂ ਅਤੇ ਉਨ੍ਹਾਂ ਦੀਆਂ ਪੜ੍ਹਨ ਥਾਵਾਂ, ਪੁਰਾਣਾ ਨਿਤਨੇਮ ਇਤਿਹਾਸ, ਹਫ਼ਤਾਵਾਰੀ ਟੀਚੇ, ਟਰੈਕਿੰਗ ਚੋਣਾਂ, ਹਰ ਬਾਣੀ ਦੀ ਵੱਖਰੀ ਥਾਂ, ਚੱਲਦੀ ਨਿਤਨੇਮ ਪੜ੍ਹਾਈ, ਕਿਤਾਬਾਂ ਜਾਂ ਕਹਾਣੀਆਂ ਦੀਆਂ ਰੀਡਰ ਪਸੰਦਾਂ, ਪੜ੍ਹਨ ਦਾ ਢੰਗ, ਸਹਾਇਕ ਲਿਖਤ ਦਾ ਆਕਾਰ, ਚਿੱਤਰ ਅਤੇ ਆਵਾਜ਼ ਦੀਆਂ ਪਸੰਦਾਂ ਇਸ ਡਿਵਾਈਸ ਤੇ ਰਹਿੰਦੀਆਂ ਹਨ। ਪੂਰੀ ਬੈਕਅੱਪ ਫ਼ਾਈਲ ਵਿੱਚ ਇਹ ਸ਼ਾਮਲ ਹਨ। ਡਾਊਨਲੋਡ ਕੀਤੀ ਪੜ੍ਹਨ ਸਮੱਗਰੀ ਨਿੱਜੀ ਡਾਟੇ ਦੇ ਬੈਕਅੱਪ ਤੋਂ ਵੱਖਰੀ ਹੈ।',
    mergeHint: 'ਪਹਿਲੀ ਸਾਈਨ ਇਨ ਵੇਲੇ ਇਸ ਡਿਵਾਈਸ ਦਾ ਸਮਰਥਿਤ ਡਾਟਾ ਤੁਹਾਡੇ ਖਾਤੇ ਦੇ ਡਾਟੇ ਨਾਲ ਮਿਲਾਇਆ ਜਾਂਦਾ ਹੈ।',
    signInApple: 'Apple ਨਾਲ ਜਾਰੀ ਰੱਖੋ', signInEmail: 'ਸਾਈਨ ਇਨ ਲਿੰਕ ਈਮੇਲ ਕਰੋ', emailLabel: 'ਈਮੇਲ ਪਤਾ',
    emailSent: 'ਸਾਈਨ ਇਨ ਲਿੰਕ ਲਈ ਆਪਣੀ ਈਮੇਲ ਵੇਖੋ। ਉਡੀਕ ਕਰਦੇ ਹੋਏ ਪੜ੍ਹਨਾ ਜਾਰੀ ਰੱਖ ਸਕਦੇ ਹੋ।',
    unavailable: 'ਇਸ ਵੇਲੇ ਖਾਤੇ ਵਿੱਚ ਸਾਈਨ ਇਨ ਨਹੀਂ ਹੋ ਸਕਦਾ। ਪੜ੍ਹਨਾ ਜਾਰੀ ਰੱਖੋ ਅਤੇ ਬੈਕਅੱਪ ਫ਼ਾਈਲ ਵਰਤੋ।',
    syncNow: 'ਹੁਣੇ ਸਿੰਕ ਕਰੋ', signOut: 'ਸਾਈਨ ਆਉਟ', deleteAccount: 'ਕਲਾਉਡ ਖਾਤਾ ਮਿਟਾਓ',
    deleteTitle: 'ਆਪਣਾ ਕਲਾਉਡ ਖਾਤਾ ਮਿਟਾਉਣਾ ਹੈ?',
    deleteDescription: 'ਤੁਹਾਡਾ ਖਾਤਾ ਅਤੇ ਸਿੰਕ ਕੀਤਾ ਸਾਰਾ NaamRas ਡਾਟਾ ਹਮੇਸ਼ਾ ਲਈ ਮਿਟ ਜਾਵੇਗਾ। ਇਹ ਵਾਪਸ ਨਹੀਂ ਹੋ ਸਕਦਾ।',
    deleteLocalNote: 'ਇਸ ਡਿਵਾਈਸ ਦੀ ਪੜ੍ਹਾਈ ਦਾ ਡਾਟਾ ਤਦ ਤੱਕ ਰਹੇਗਾ ਜਦ ਤੱਕ ਤੁਸੀਂ ਐਪ ਜਾਂ ਸਾਈਟ ਦਾ ਡਾਟਾ ਸਾਫ਼ ਨਹੀਂ ਕਰਦੇ।',
    deleteConfirm: 'ਖਾਤਾ ਹਮੇਸ਼ਾ ਲਈ ਮਿਟਾਓ', deleteCancel: 'ਖਾਤਾ ਰੱਖੋ', deleting: 'ਖਾਤਾ ਮਿਟਾਇਆ ਜਾ ਰਿਹਾ ਹੈ…',
    queueReady: 'ਤੁਹਾਡੇ ਬਦਲਾਅ ਅਗਲੇ ਸਫਲ ਕਨੈਕਸ਼ਨ ਦੀ ਉਡੀਕ ਕਰ ਰਹੇ ਹਨ।',
    offline: 'ਇੰਟਰਨੈੱਟ ਨਾਲ ਸੰਪਰਕ ਨਹੀਂ ਹੈ। ਇਸ ਡਿਵਾਈਸ ਤੇ ਪੜ੍ਹਨਾ ਜਾਰੀ ਰੱਖੋ; ਦੁਬਾਰਾ ਜੁੜਨ ਤੇ ਕਲਾਉਡ ਬੈਕਅੱਪ ਜਾਰੀ ਹੋਵੇਗਾ।',
    error: 'ਕਲਾਉਡ ਬੈਕਅੱਪ ਪੂਰਾ ਨਹੀਂ ਹੋ ਸਕਿਆ। ਇਸ ਡਿਵਾਈਸ ਤੇ ਪੜ੍ਹਨਾ ਜਾਰੀ ਰੱਖ ਸਕਦੇ ਹੋ। ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
    recovery: 'ਡਿਵਾਈਸ ਦੀ ਸਟੋਰੇਜ ਡਾਟੇ ਦਾ ਬਦਲਾਅ ਪੂਰਾ ਨਹੀਂ ਕਰ ਸਕੀ। ਕਲਾਉਡ ਬੈਕਅੱਪ ਰੁਕਿਆ ਹੋਇਆ ਹੈ। ਸਟੋਰੇਜ ਖਾਲੀ ਕਰੋ ਅਤੇ ਮੁੜ ਸਿੰਕ ਕਰਨ ਤੋਂ ਪਹਿਲਾਂ ਨਿੱਜੀ ਬੈਕਅੱਪ ਵਾਪਸ ਲਿਆਓ।',
    authError: 'ਇਸ ਵੇਲੇ ਸਾਈਨ ਇਨ ਨਹੀਂ ਹੋ ਸਕਦਾ। ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ ਜਾਂ ਬਿਨਾਂ ਖਾਤੇ ਦੇ ਪੜ੍ਹਨਾ ਜਾਰੀ ਰੱਖੋ।',
    accountError: 'ਖਾਤੇ ਦਾ ਬਦਲਾਅ ਪੂਰਾ ਨਹੀਂ ਹੋ ਸਕਿਆ। ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
    lastSynced: 'ਆਖਰੀ ਸਿੰਕ', notSynced: 'ਹਾਲੇ ਕੋਈ ਸਿੰਕ ਪੂਰਾ ਨਹੀਂ ਹੋਇਆ', connectedAs: 'ਜੁੜਿਆ ਖਾਤਾ',
    changesWaiting: 'ਬਦਲਾਅ ਉਡੀਕ ਵਿੱਚ', noChangesWaiting: 'ਕੋਈ ਬਦਲਾਅ ਬਾਕੀ ਨਹੀਂ',
    localOnlyStatus: 'ਇਸ ਡਿਵਾਈਸ ਤੇ', signedOutStatus: 'ਚੋਣਵਾਂ', readyStatus: 'ਜੁੜਿਆ ਹੋਇਆ',
    syncingStatus: 'ਸਿੰਕ ਹੋ ਰਿਹਾ ਹੈ', queuedStatus: 'ਬਦਲਾਅ ਉਡੀਕ ਵਿੱਚ', offlineStatus: 'ਆਫ਼ਲਾਈਨ',
    errorStatus: 'ਧਿਆਨ ਚਾਹੀਦਾ', authStatus: 'ਸਾਈਨ ਇਨ ਖੁੱਲ ਰਹੀ ਹੈ', loadingStatus: 'ਖਾਤਾ ਜਾਂਚਿਆ ਜਾ ਰਿਹਾ ਹੈ',
  },
  hi: {
    eyebrow: 'निजी डेटा', localTitle: 'आपकी पढ़ाई इसी डिवाइस पर रहती है।', title: 'वैकल्पिक क्लाउड बैकअप',
    localSummary: 'इस संस्करण में खाते पर अपने आप बैकअप नहीं होता। पढ़ाई का डेटा वापस पाने के लिए बैकअप फ़ाइल रखें।',
    localDetail: 'सहेजी गई चीज़ें, शब्दावली, पढ़ने की जगहें, नितनेम का इतिहास और पसंद इस ब्राउज़र में रहते हैं। ऐप या साइट का डेटा साफ़ करने पर ये मिट जाते हैं। कॉपी रखने या दूसरे डिवाइस पर ले जाने के लिए बैकअप फ़ाइल के बटन इस्तेमाल करें।',
    signedOut: 'बिना खाते के भी पढ़ सकते हैं। नीचे दी गई चीज़ों का बैकअप चाहिए तो ही साइन इन करें।',
    connected: 'आपका खाता नीचे दी गई चीज़ों को एक जैसा रखता है। बैकअप फ़ाइल में बाकी निजी पढ़ाई का डेटा भी शामिल होता है।',
    coverageTitle: 'क्लाउड बैकअप में शामिल',
    coverage: 'गुरबाणी और किताबों के बुकमार्क, सहेजे गुरबाणी अंश, शब्दावली, पढ़ने की प्रगति, सबसे हाल की पढ़ने की जगह, चुनी नितनेम बाणियाँ और आज की पूर्णता, गुरबाणी रीडर की मुख्य सेटिंग, ऐप की भाषा और थीम।',
    exclusionsTitle: 'इनके लिए बैकअप फ़ाइल रखें',
    exclusions: 'सहेजी कहानियाँ और उनकी पढ़ने की जगहें, पुराना नितनेम इतिहास, साप्ताहिक लक्ष्य, ट्रैकिंग विकल्प, हर बाणी की अलग जगह, जारी नितनेम अभ्यास, किताबों या कहानियों की रीडर पसंद, पढ़ने का तरीका, सहायक पाठ का आकार, चित्र और ध्वनि की पसंद इस डिवाइस पर रहती हैं। पूरी बैकअप फ़ाइल में ये शामिल हैं। डाउनलोड की गई पढ़ने की सामग्री निजी डेटा के बैकअप से अलग है।',
    mergeHint: 'पहली साइन इन पर इस डिवाइस का समर्थित डेटा आपके खाते के डेटा से मिलाया जाता है।',
    signInApple: 'Apple के साथ जारी रखें', signInEmail: 'साइन इन लिंक ईमेल करें', emailLabel: 'ईमेल पता',
    emailSent: 'साइन इन लिंक के लिए अपनी ईमेल देखें। इंतज़ार करते हुए पढ़ना जारी रख सकते हैं।',
    unavailable: 'अभी खाते में साइन इन उपलब्ध नहीं है। पढ़ना जारी रखें और बैकअप फ़ाइल इस्तेमाल करें।',
    syncNow: 'अभी सिंक करें', signOut: 'साइन आउट', deleteAccount: 'क्लाउड खाता मिटाएँ',
    deleteTitle: 'अपना क्लाउड खाता मिटाना है?',
    deleteDescription: 'आपका खाता और सिंक किया गया सारा NaamRas डेटा हमेशा के लिए मिट जाएगा। इसे वापस नहीं लाया जा सकता।',
    deleteLocalNote: 'इस डिवाइस की पढ़ाई का डेटा तब तक रहेगा जब तक आप ऐप या साइट का डेटा साफ़ नहीं करते।',
    deleteConfirm: 'खाता हमेशा के लिए मिटाएँ', deleteCancel: 'खाता रखें', deleting: 'खाता मिटाया जा रहा है…',
    queueReady: 'आपके बदलाव अगले सफल कनेक्शन का इंतज़ार कर रहे हैं।',
    offline: 'इंटरनेट से संपर्क नहीं है। इस डिवाइस पर पढ़ना जारी रखें; दोबारा जुड़ने पर क्लाउड बैकअप जारी होगा।',
    error: 'क्लाउड बैकअप पूरा नहीं हो सका। इस डिवाइस पर पढ़ना जारी रख सकते हैं। कृपया फिर कोशिश करें।',
    recovery: 'डिवाइस की स्टोरेज डेटा का बदलाव पूरा नहीं कर सकी। क्लाउड बैकअप रुका हुआ है। स्टोरेज खाली करें, फिर सिंक करने से पहले निजी बैकअप वापस लाएँ।',
    authError: 'अभी साइन इन उपलब्ध नहीं है। फिर कोशिश करें या बिना खाते के पढ़ना जारी रखें।',
    accountError: 'खाते का बदलाव पूरा नहीं हो सका। कृपया फिर कोशिश करें।',
    lastSynced: 'आखिरी सिंक', notSynced: 'अभी कोई सिंक पूरा नहीं हुआ', connectedAs: 'जुड़ा खाता',
    changesWaiting: 'बदलाव इंतज़ार में', noChangesWaiting: 'कोई बदलाव बाकी नहीं',
    localOnlyStatus: 'इस डिवाइस पर', signedOutStatus: 'वैकल्पिक', readyStatus: 'जुड़ा हुआ',
    syncingStatus: 'सिंक हो रहा है', queuedStatus: 'बदलाव इंतज़ार में', offlineStatus: 'ऑफ़लाइन',
    errorStatus: 'ध्यान चाहिए', authStatus: 'साइन इन खुल रही है', loadingStatus: 'खाता जाँचा जा रहा है',
  },
} as const

function formatSyncTimestamp(value: string | null, locale: string) {
  if (!value || !Number.isFinite(Date.parse(value))) return null
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

export default function CloudSyncPanel() {
  const locale = useLocaleStore(state => state.locale)
  const copy = CLOUD_COPY[locale]
  const { configured, status, currentUser, availableProviders, lastSyncedAt, lastError, syncQueued } = useCloudSyncStore()
  const [magicLinkEmail, setMagicLinkEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [actionError, setActionError] = useState(false)
  const [actionPending, setActionPending] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [detailsOpen, setDetailsOpen] = usePersistentDisclosure('more-cloud-sync', false)
  const isOffline = configured && (status === 'offline' || (typeof navigator !== 'undefined' && navigator.onLine === false))
  const recoveryRequired = lastError === 'personal-data-restore-recovery-required'
  const hasError = configured && Boolean(lastError || actionError || status === 'error')
  const loading = configured && ['booting', 'authenticating', 'syncing'].includes(status)
  const isBusy = loading || actionPending || isDeletingAccount
  const panelState = loading ? 'loading' : hasError || isOffline ? 'degraded' : !configured || !currentUser ? 'empty' : 'ready'
  const panelError = hasError || isOffline ? !currentUser && status === 'error' ? 'supabase-bootstrap' : 'cloud-sync' : undefined
  const statusLabel = !configured ? copy.localOnlyStatus : isOffline ? copy.offlineStatus : hasError ? copy.errorStatus
    : status === 'booting' ? copy.loadingStatus : status === 'authenticating' ? copy.authStatus : status === 'syncing' ? copy.syncingStatus
      : currentUser && syncQueued ? copy.queuedStatus : currentUser ? copy.readyStatus : copy.signedOutStatus
  const summary = !configured ? copy.localSummary : currentUser ? copy.connected : copy.signedOut
  const statusClassName = hasError ? 'bg-[#b4553d]/12 text-[#b4553d] dark:bg-[#ffb29d]/12 dark:text-[#ffb29d]'
    : currentUser && !isOffline && !loading && !syncQueued ? 'bg-[#dfead8] text-[#3c6a3f] dark:bg-[#203224] dark:text-[#9fd8a3]'
      : 'bg-sand/14 text-ink/72 dark:bg-dark-text/12 dark:text-dark-text/72'
  const formattedLastSynced = formatSyncTimestamp(lastSyncedAt, locale)
  const supportsApple = availableProviders.includes('apple')
  const supportsEmail = availableProviders.includes('email')
  const panelId = 'more-cloud-sync-panel'
  const primaryButton = 'interactive-focus min-h-[48px] w-full rounded-lg bg-saffron px-4 py-3 font-sans text-sm font-semibold text-white disabled:opacity-45'
  const secondaryButton = 'interactive-focus min-h-[48px] w-full rounded-lg border border-sand/15 bg-white/70 px-4 py-3 font-sans text-sm font-semibold text-ink disabled:opacity-45 dark:border-dark-text/10 dark:bg-dark-card dark:text-dark-text'

  async function runAction(operation: () => Promise<{ ok: boolean }>, sentEmail = false) {
    if (actionPending) return
    setActionPending(true)
    setActionError(false)
    setEmailSent(false)
    try {
      const result = await operation()
      setActionError(!result.ok)
      if (result.ok && sentEmail) setEmailSent(true)
    } catch {
      setActionError(true)
    } finally {
      setActionPending(false)
    }
  }

  async function handleDeleteAccount() {
    if (isDeletingAccount) return
    setIsDeletingAccount(true)
    setActionError(false)
    try {
      const result = await deleteCloudAccount()
      if (result.ok) setDeleteDialogOpen(false)
      else setActionError(true)
    } catch {
      setActionError(true)
    } finally {
      setIsDeletingAccount(false)
    }
  }

  return (
    <section className="section-shell mb-5 overflow-hidden" aria-labelledby="more-cloud-sync-title" lang={locale}
      data-testid="more-cloud-sync" data-ai-surface="cloud-sync-panel" data-ai-state={panelState} data-ai-error={panelError}>
      <div className="relative px-5 pt-5 pb-4" data-ai-anchor="cloud-sync-summary">
        <button type="button" onClick={() => setDetailsOpen(current => !current)} aria-expanded={detailsOpen} aria-controls={panelId}
          className="interactive-focus relative flex w-full items-start justify-between gap-4 text-left">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="eyebrow">{copy.eyebrow}</p>
              <span className={`rounded-full px-3 py-1.5 font-sans text-[11px] font-semibold tracking-[0.12em] ${statusClassName}`} data-ai-anchor="cloud-sync-status">{statusLabel}</span>
            </div>
            <h2 id="more-cloud-sync-title" className="mt-3 font-display text-[1.85rem] leading-none text-ink dark:text-dark-text">{configured ? copy.title : copy.localTitle}</h2>
            <p className="mt-3 max-w-[45ch] font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/70">{summary}</p>
            {configured && currentUser ? <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 font-sans text-xs text-ink/68 dark:text-dark-text/64" data-ai-surface="cloud-sync-metrics" data-ai-state={panelState}>
              <span data-ai-anchor="cloud-sync-pending">{syncQueued ? copy.changesWaiting : copy.noChangesWaiting}</span>
              <span data-ai-anchor="cloud-sync-last-synced">{formattedLastSynced ? `${copy.lastSynced}: ${formattedLastSynced}` : copy.notSynced}</span>
            </div> : null}
          </div>
          <span className="icon-surface mt-1 h-10 w-10 shrink-0 text-gold-dark dark:text-gold-light" aria-hidden="true">{detailsOpen ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}</span>
        </button>
      </div>

      {detailsOpen ? <div id={panelId} className="px-5 pb-5">
        {!configured ? <div className="hero-surface px-4 py-4" data-ai-surface="cloud-sync-local-only" data-ai-state="empty">
          <p className="font-sans text-sm leading-6 text-ink/72 dark:text-dark-text/72">{copy.localDetail}</p>
        </div> : <div className="section-shell-quiet px-4 py-4" data-ai-surface="cloud-sync-account" data-ai-state={panelState} data-ai-error={panelError}>
          {currentUser ? <div>
            <p className="eyebrow">{copy.connectedAs}</p>
            <p className="mt-2 break-words font-sans text-base font-semibold text-ink dark:text-dark-text">{currentUser.name ?? currentUser.email}</p>
            {currentUser.name ? <p className="mt-1 break-words font-sans text-xs text-ink/68 dark:text-dark-text/64">{currentUser.email}</p> : null}
          </div> : <p className="font-sans text-xs leading-5 text-ink/68 dark:text-dark-text/64">{copy.mergeHint}</p>}
          <div className="mt-4 space-y-3 font-sans text-xs leading-5 text-ink/68 dark:text-dark-text/64">
            <div><h3 className="font-semibold text-ink dark:text-dark-text">{copy.coverageTitle}</h3><p>{copy.coverage}</p></div>
            <div><h3 className="font-semibold text-ink dark:text-dark-text">{copy.exclusionsTitle}</h3><p>{copy.exclusions}</p></div>
          </div>
          <div className="mt-4 space-y-2 font-sans text-xs leading-5" aria-live="polite" data-ai-anchor="cloud-sync-notices">
            {isOffline ? <p className="text-saffron dark:text-saffron-light">{copy.offline}</p> : null}
            {currentUser && syncQueued ? <p className="text-ink/68 dark:text-dark-text/64">{copy.queueReady}</p> : null}
            {emailSent ? <p role="status" className="text-ink/72 dark:text-dark-text/72">{copy.emailSent}</p> : null}
            {hasError ? <p role="alert" className="text-[#b4553d] dark:text-[#ffb29d]">{recoveryRequired ? copy.recovery : currentUser ? copy.error : copy.authError}</p> : null}
          </div>
          <div className="mt-4 grid gap-3">
            {!currentUser ? <>
              {supportsApple ? <button type="button" onClick={() => { void runAction(() => signInWithProvider('apple')) }} disabled={isBusy || isOffline} data-ai-action="cloud-sign-in-apple" className={primaryButton}>{copy.signInApple}</button> : null}
              {supportsEmail ? <form className="grid gap-2" onSubmit={event => { event.preventDefault(); void runAction(() => sendMagicLink(magicLinkEmail.trim()), true) }}>
                <label htmlFor="cloud-sign-in-email" className="font-sans text-xs font-semibold text-ink dark:text-dark-text">{copy.emailLabel}</label>
                <input id="cloud-sign-in-email" value={magicLinkEmail} onChange={event => { setMagicLinkEmail(event.target.value); setEmailSent(false) }} type="email" autoComplete="email" required maxLength={254}
                  className="interactive-focus min-h-[48px] w-full rounded-lg border border-sand/15 bg-white/75 px-4 py-3 font-sans text-sm text-ink dark:border-dark-text/10 dark:bg-dark-card dark:text-dark-text" />
                <button type="submit" disabled={isBusy || isOffline || !magicLinkEmail.trim()} data-ai-action="cloud-sign-in-email" className={supportsApple ? secondaryButton : primaryButton}>{copy.signInEmail}</button>
              </form> : null}
              {!supportsApple && !supportsEmail ? <p className="font-sans text-sm leading-6 text-ink/72 dark:text-dark-text/72">{copy.unavailable}</p> : null}
            </> : <>
              <button type="button" onClick={() => { void runAction(() => syncNow('manual')) }} disabled={isBusy || isOffline || recoveryRequired} data-ai-action="cloud-sync-now" className={primaryButton}>{copy.syncNow}</button>
              <button type="button" onClick={() => { void runAction(signOutOfCloud) }} disabled={actionPending || isDeletingAccount} data-ai-action="cloud-sign-out" className={secondaryButton}>{copy.signOut}</button>
              <button type="button" onClick={() => { setActionError(false); setDeleteDialogOpen(true) }} disabled={isBusy || isOffline} data-ai-action="cloud-delete-account"
                className="interactive-focus min-h-[48px] w-full rounded-lg border border-[#b4553d]/28 bg-[#b4553d]/8 px-4 py-3 font-sans text-sm font-semibold text-[#9b3f2c] disabled:opacity-45 dark:border-[#ffb29d]/22 dark:bg-[#ffb29d]/8 dark:text-[#ffb29d]">{copy.deleteAccount}</button>
            </>}
          </div>
        </div>}
      </div> : null}

      <ModalSheet open={deleteDialogOpen} onClose={() => { if (!isDeletingAccount) setDeleteDialogOpen(false) }} title={copy.deleteTitle} description={copy.deleteDescription} className="rounded-lg" testId="cloud-delete-account-dialog">
        <div className="px-5 py-5" lang={locale}>
          <p className="eyebrow">{copy.deleteAccount}</p>
          <h2 className="mt-2 font-display text-3xl leading-none text-ink dark:text-dark-text">{copy.deleteTitle}</h2>
          <p className="mt-3 font-sans text-sm leading-6 text-ink/70 dark:text-dark-text/72">{copy.deleteDescription}</p>
          <p className="mt-3 font-sans text-xs leading-5 text-ink/68 dark:text-dark-text/64">{copy.deleteLocalNote}</p>
          {hasError ? <p role="alert" className="mt-3 font-sans text-xs leading-5 text-[#9b3f2c] dark:text-[#ffb29d]">{copy.accountError}</p> : null}
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => setDeleteDialogOpen(false)} disabled={isDeletingAccount} className={secondaryButton}>{copy.deleteCancel}</button>
            <button type="button" onClick={() => { void handleDeleteAccount() }} disabled={isDeletingAccount} className="interactive-focus min-h-[48px] rounded-lg bg-[#a94732] px-4 py-3 font-sans text-sm font-semibold text-white disabled:opacity-45 dark:bg-[#d86f58] dark:text-[#160c09]" data-testid="cloud-delete-account-confirm">{isDeletingAccount ? copy.deleting : copy.deleteConfirm}</button>
          </div>
        </div>
      </ModalSheet>
    </section>
  )
}
