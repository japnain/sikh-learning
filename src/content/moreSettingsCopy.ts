import type { UiLocale } from '../types'

const english = {
  spacing: 'Line spacing',
  alignment: 'Text alignment',
  preview: 'Reader preview',
  previewCaption: 'Sample text · Your selected translation and pause sources appear in the reader.',
  supportSize: 'Meaning and transliteration size',
  studyOnly: 'Meanings and pronunciation help are shown in Study mode.',
  supportSizes: { standard: 'Standard', large: 'Large', 'extra-large': 'Extra large' },
  unsaved: 'This reading mode is active for this session, but could not be saved on this device. Try again to keep it for next time.',
  deviceTrust: 'Your saved reading and preferences stay on this device. Export a backup to keep a separate copy.',
  cloudTrust: 'Your saved reading and preferences stay on this device. You can also sign in for optional cloud sync or export a backup.',
}
type MoreSettingsCopy = typeof english

export const MORE_SETTINGS_COPY: Record<UiLocale, MoreSettingsCopy> = {
  en: english,
  pa: {
    spacing: 'ਪੰਕਤੀ ਵਿੱਥ', alignment: 'ਪਾਠ ਦੀ ਸੇਧ', preview: 'ਪਾਠ ਦੀ ਝਲਕ',
    previewCaption: 'ਨਮੂਨਾ · ਚੁਣੇ ਅਰਥ ਅਤੇ ਵਿਸ਼ਰਾਮ ਸਰੋਤ ਪਾਠ ਵਿੱਚ ਦਿਸਣਗੇ।',
    supportSize: 'ਅਰਥ ਅਤੇ ਲਿਪੀਅੰਤਰਨ ਦਾ ਆਕਾਰ',
    studyOnly: 'ਅਰਥ ਅਤੇ ਉਚਾਰਨ ਦੀ ਸਹਾਇਤਾ ਅਧਿਐਨ ਮੋਡ ਵਿੱਚ ਦਿਸਦੀ ਹੈ।',
    supportSizes: { standard: 'ਆਮ', large: 'ਵੱਡਾ', 'extra-large': 'ਹੋਰ ਵੱਡਾ' },
    unsaved: 'ਇਹ ਪੜ੍ਹਨ ਦਾ ਢੰਗ ਇਸ ਸੈਸ਼ਨ ਵਿੱਚ ਲਾਗੂ ਹੈ, ਪਰ ਡਿਵਾਈਸ ਉੱਤੇ ਸੰਭਾਲਿਆ ਨਹੀਂ ਜਾ ਸਕਿਆ। ਅਗਲੀ ਵਾਰ ਲਈ ਸੰਭਾਲਣ ਵਾਸਤੇ ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
    deviceTrust: 'ਤੁਹਾਡਾ ਸੰਭਾਲਿਆ ਪਾਠ ਅਤੇ ਚੋਣਾਂ ਇਸ ਡਿਵਾਈਸ ਉੱਤੇ ਰਹਿੰਦੀਆਂ ਹਨ। ਵੱਖਰੀ ਕਾਪੀ ਲਈ ਬੈਕਅੱਪ ਐਕਸਪੋਰਟ ਕਰੋ।',
    cloudTrust: 'ਤੁਹਾਡਾ ਸੰਭਾਲਿਆ ਪਾਠ ਅਤੇ ਚੋਣਾਂ ਇਸ ਡਿਵਾਈਸ ਉੱਤੇ ਰਹਿੰਦੀਆਂ ਹਨ। ਚਾਹੋ ਤਾਂ ਕਲਾਊਡ ਸਿੰਕ ਲਈ ਸਾਈਨ ਇਨ ਕਰੋ ਜਾਂ ਬੈਕਅੱਪ ਐਕਸਪੋਰਟ ਕਰੋ।',
  },
  hi: {
    spacing: 'पंक्ति का अंतर', alignment: 'पाठ का संरेखण', preview: 'पाठ की झलक',
    previewCaption: 'नमूना · चुने हुए अर्थ और विश्राम स्रोत पाठ में दिखेंगे।',
    supportSize: 'अर्थ और लिप्यंतरण का आकार',
    studyOnly: 'अर्थ और उच्चारण की सहायता अध्ययन मोड में दिखती है।',
    supportSizes: { standard: 'सामान्य', large: 'बड़ा', 'extra-large': 'और बड़ा' },
    unsaved: 'यह पढ़ने का तरीका इस सत्र में लागू है, लेकिन डिवाइस पर सहेजा नहीं जा सका। अगली बार के लिए सहेजने हेतु फिर कोशिश करें।',
    deviceTrust: 'आपका सहेजा हुआ पाठ और पसंद इस डिवाइस पर रहते हैं। अलग प्रति रखने के लिए बैकअप एक्सपोर्ट करें।',
    cloudTrust: 'आपका सहेजा हुआ पाठ और पसंद इस डिवाइस पर रहते हैं। आप वैकल्पिक क्लाउड सिंक के लिए साइन इन कर सकते हैं या बैकअप एक्सपोर्ट कर सकते हैं।',
  },
}
