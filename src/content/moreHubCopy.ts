import type { UiLocale } from '../types'

const english = {
  title: 'Your NaamRas.', body: 'A few thoughtful choices for your daily reading.',
  daily: 'Customize daily banis', chooseArrange: 'Choose & arrange', preferences: 'Reading & appearance',
  appearance: 'Appearance & language', appearanceHelp: 'Theme, Home artwork, and the language of your menus.',
  readerHelp: 'Set your reading defaults. Changes apply as you choose them.', readerSections: 'Reader settings sections',
  layout: 'Layout', support: 'Reading support', sources: 'Sources',
  sound: 'Soundscapes', soundHelp: 'Background sounds for reading', playing: 'Playing · choose a sound', paused: 'Paused · ready to play',
  soundError: 'This sound could not be played. Check your connection and try again.', pause: 'Pause soundscape', play: 'Play soundscape',
  yourData: 'Your data', account: 'Account', accountHelp: 'Your sign-in and optional cloud sync.', signIn: 'Sign in or create an account', connected: 'Signed in · manage your account',
  needsAttention: 'Sync needs attention', offline: 'Offline · reading stays on this device', syncing: 'Syncing your reading', checking: 'Checking your account…', signingIn: 'Opening sign-in…', waiting: 'Changes waiting to sync',
  backup: 'Backup & restore', backupHelp: 'Export or restore your personal reading data', deviceBackupHelp: 'Keep or restore a copy of your reading',
  aboutNaamras: 'About NaamRas', aboutHelp: 'About the app and your reading setup.', privacy: 'Privacy', close: 'Close settings',
  sourceContext: 'Reading sources and available translations are identified in the reader. Availability varies by text.',
  loadingArtwork: 'Loading artworks…',
}

export const MORE_HUB_COPY: Record<UiLocale, typeof english> = {
  en: english,
  pa: {
    title: 'ਤੁਹਾਡਾ ਨਾਮਰਸ।', body: 'ਰੋਜ਼ਾਨਾ ਪੜ੍ਹਨ ਲਈ ਆਪਣੀਆਂ ਪਸੰਦਾਂ ਚੁਣੋ।',
    daily: 'ਰੋਜ਼ਾਨਾ ਬਾਣੀਆਂ ਚੁਣੋ', chooseArrange: 'ਚੁਣੋ ਅਤੇ ਕ੍ਰਮ ਬਦਲੋ', preferences: 'ਪੜ੍ਹਾਈ ਅਤੇ ਦਿੱਖ',
    appearance: 'ਦਿੱਖ ਅਤੇ ਭਾਸ਼ਾ', appearanceHelp: 'ਥੀਮ, ਹੋਮ ਦਾ ਚਿੱਤਰ ਅਤੇ ਮੀਨੂ ਦੀ ਭਾਸ਼ਾ।',
    readerHelp: 'ਪੜ੍ਹਨ ਦੀਆਂ ਮੂਲ ਚੋਣਾਂ। ਬਦਲਾਅ ਚੁਣਦੇ ਹੀ ਲਾਗੂ ਹੁੰਦੇ ਹਨ।', readerSections: 'ਪਾਠ ਦੀਆਂ ਸੈਟਿੰਗਾਂ ਦੇ ਭਾਗ',
    layout: 'ਦਿੱਖ', support: 'ਪੜ੍ਹਨ ਦੀ ਸਹਾਇਤਾ', sources: 'ਸਰੋਤ',
    sound: 'ਪਿਛੋਕੜ ਦੀਆਂ ਧੁਨਾਂ', soundHelp: 'ਪੜ੍ਹਨ ਲਈ ਪਿਛੋਕੜ ਦੀਆਂ ਧੁਨਾਂ', playing: 'ਚੱਲ ਰਿਹਾ · ਧੁਨ ਚੁਣੋ', paused: 'ਰੁਕਿਆ ਹੋਇਆ · ਚਲਾਉਣ ਲਈ ਤਿਆਰ',
    soundError: 'ਇਹ ਧੁਨ ਨਹੀਂ ਚੱਲ ਸਕੀ। ਇੰਟਰਨੈੱਟ ਜਾਂਚੋ ਅਤੇ ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ।', pause: 'ਸਾਊਂਡਸਕੇਪ ਰੋਕੋ', play: 'ਸਾਊਂਡਸਕੇਪ ਚਲਾਓ',
    yourData: 'ਤੁਹਾਡਾ ਡਾਟਾ', account: 'ਖਾਤਾ', accountHelp: 'ਤੁਹਾਡੀ ਸਾਈਨ ਇਨ ਅਤੇ ਚੋਣਵਾਂ ਕਲਾਉਡ ਸਿੰਕ।', signIn: 'ਸਾਈਨ ਇਨ ਕਰੋ ਜਾਂ ਖਾਤਾ ਬਣਾਓ', connected: 'ਸਾਈਨ ਇਨ ਹੈ · ਖਾਤਾ ਸੰਭਾਲੋ',
    needsAttention: 'ਸਿੰਕ ਵੱਲ ਧਿਆਨ ਦਿਓ', offline: 'ਆਫ਼ਲਾਈਨ · ਪੜ੍ਹਾਈ ਇਸ ਡਿਵਾਈਸ ਉੱਤੇ ਹੈ', syncing: 'ਪੜ੍ਹਾਈ ਸਿੰਕ ਹੋ ਰਹੀ ਹੈ', checking: 'ਖਾਤਾ ਜਾਂਚਿਆ ਜਾ ਰਿਹਾ ਹੈ…', signingIn: 'ਸਾਈਨ ਇਨ ਖੁੱਲ ਰਹੀ ਹੈ…', waiting: 'ਬਦਲਾਅ ਸਿੰਕ ਦੀ ਉਡੀਕ ਵਿੱਚ',
    backup: 'ਬੈਕਅੱਪ ਅਤੇ ਬਹਾਲੀ', backupHelp: 'ਪੜ੍ਹਾਈ ਦਾ ਡਾਟਾ ਐਕਸਪੋਰਟ ਕਰੋ ਜਾਂ ਵਾਪਸ ਲਿਆਓ', deviceBackupHelp: 'ਪੜ੍ਹਾਈ ਦੀ ਕਾਪੀ ਰੱਖੋ ਜਾਂ ਵਾਪਸ ਲਿਆਓ',
    aboutNaamras: 'ਨਾਮਰਸ ਬਾਰੇ', aboutHelp: 'ਐਪ ਅਤੇ ਪੜ੍ਹਨ ਦੀਆਂ ਚੋਣਾਂ ਬਾਰੇ।', privacy: 'ਨਿੱਜਤਾ', close: 'ਸੈਟਿੰਗਾਂ ਬੰਦ ਕਰੋ',
    sourceContext: 'ਪੜ੍ਹਨ ਦੇ ਸਰੋਤ ਅਤੇ ਉਪਲਬਧ ਅਨੁਵਾਦ ਰੀਡਰ ਵਿੱਚ ਦਰਸਾਏ ਜਾਂਦੇ ਹਨ। ਉਪਲਬਧਤਾ ਪਾਠ ਅਨੁਸਾਰ ਬਦਲਦੀ ਹੈ।', loadingArtwork: 'ਚਿੱਤਰ ਲੋਡ ਹੋ ਰਹੇ ਹਨ…',
  },
  hi: {
    title: 'आपका नामरस।', body: 'रोज़ पढ़ने के लिए अपनी पसंद चुनें।',
    daily: 'दैनिक बाणियाँ चुनें', chooseArrange: 'चुनें और क्रम बदलें', preferences: 'पठन और रूप',
    appearance: 'रूप और भाषा', appearanceHelp: 'थीम, होम का चित्र और मेनू की भाषा।',
    readerHelp: 'पढ़ने के मूल विकल्प चुनें। बदलाव चुनते ही लागू होते हैं।', readerSections: 'रीडर सेटिंग के भाग',
    layout: 'रूप', support: 'पठन सहायता', sources: 'स्रोत',
    sound: 'पृष्ठभूमि की ध्वनियाँ', soundHelp: 'पढ़ने के लिए पृष्ठभूमि की ध्वनियाँ', playing: 'चल रहा · ध्वनि चुनें', paused: 'रुका हुआ · चलाने के लिए तैयार',
    soundError: 'यह ध्वनि नहीं चल सकी। इंटरनेट जाँचें और फिर कोशिश करें।', pause: 'साउंडस्केप रोकें', play: 'साउंडस्केप चलाएँ',
    yourData: 'आपका डेटा', account: 'खाता', accountHelp: 'आपकी साइन इन और वैकल्पिक क्लाउड सिंक।', signIn: 'साइन इन करें या खाता बनाएँ', connected: 'साइन इन है · खाता सँभालें',
    needsAttention: 'सिंक पर ध्यान दें', offline: 'ऑफलाइन · पठन इस डिवाइस पर है', syncing: 'पठन सिंक हो रहा है', checking: 'खाता जाँचा जा रहा है…', signingIn: 'साइन इन खुल रही है…', waiting: 'बदलाव सिंक के इंतज़ार में',
    backup: 'बैकअप और बहाली', backupHelp: 'पठन डेटा एक्सपोर्ट करें या वापस लाएँ', deviceBackupHelp: 'पठन की प्रति रखें या वापस लाएँ',
    aboutNaamras: 'नामरस के बारे में', aboutHelp: 'ऐप और पढ़ने के विकल्पों के बारे में।', privacy: 'गोपनीयता', close: 'सेटिंग बंद करें',
    sourceContext: 'पढ़ने के स्रोत और उपलब्ध अनुवाद रीडर में दिखाए जाते हैं। उपलब्धता पाठ के अनुसार बदलती है।', loadingArtwork: 'चित्र लोड हो रहे हैं…',
  },
}
