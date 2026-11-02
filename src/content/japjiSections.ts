/**
 * Complete 385-row BaniDB Japji capture, normalized by production fetchBani.
 * Captured 2026-10-31; shared bani-v1 fingerprint includes ordered original text,
 * local IDs, original pages, header metadata and source attribution.
 * Only separately validated zero-ID synthetic display headings may be excluded.
 */
export const JAPJI_REVIEWED_READING_FINGERPRINT = 'bani-v1:385:7ee45e6262c9411e'

/**
 * Checked navigation anchors, not replacement scripture text.
 *
 * Reviewed 2026-10-31 against the Gurmukhi primary text on SriGranth,
 * Sri Guru Granth Sahib Ji, Angs 1–8:
 * https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=1
 * (the same page endpoint, Param=2 through Param=8).
 *
 * The opening/closing saloks and 38-pauri structure are independently described
 * by Punjabi University: https://eos.learnpunjabi.org/JAPU.html
 *
 * Each prefix is the beginning of its named pauri, checked immediately after
 * the preceding numbered conclusion. In particular pauri 36 begins on Ang 7
 * with “ਗਿਆਨ ਖੰਡ ਮਹਿ ਗਿਆਨੁ ਪਰਚੰਡੁ”, not the Ang 8 page opening.
 * Prefixes are matched only against the original Gurmukhi. Never display these
 * strings as replacement text, or infer support for another bani from them.
 */
export const JAPJI_PAURI_ANCHORS: readonly { number: number; ang: number; prefix: string }[] = [
  { number: 1, ang: 1, prefix: 'ਸੋਚੈ ਸੋਚਿ ਨ ਹੋਵਈ' },
  { number: 2, ang: 1, prefix: 'ਹੁਕਮੀ ਹੋਵਨਿ ਆਕਾਰ' },
  { number: 3, ang: 1, prefix: 'ਗਾਵੈ ਕੋ ਤਾਣੁ ਹੋਵੈ' },
  { number: 4, ang: 2, prefix: 'ਸਾਚਾ ਸਾਹਿਬੁ ਸਾਚੁ ਨਾਇ' },
  { number: 5, ang: 2, prefix: 'ਥਾਪਿਆ ਨ ਜਾਇ ਕੀਤਾ ਨ ਹੋਇ' },
  { number: 6, ang: 2, prefix: 'ਤੀਰਥਿ ਨਾਵਾ ਜੇ ਤਿਸੁ ਭਾਵਾ' },
  { number: 7, ang: 2, prefix: 'ਜੇ ਜੁਗ ਚਾਰੇ ਆਰਜਾ' },
  { number: 8, ang: 2, prefix: 'ਸੁਣਿਐ ਸਿਧ ਪੀਰ ਸੁਰਿ ਨਾਥ' },
  { number: 9, ang: 2, prefix: 'ਸੁਣਿਐ ਈਸਰੁ ਬਰਮਾ ਇੰਦੁ' },
  { number: 10, ang: 3, prefix: 'ਸੁਣਿਐ ਸਤੁ ਸੰਤੋਖੁ ਗਿਆਨੁ' },
  { number: 11, ang: 3, prefix: 'ਸੁਣਿਐ ਸਰਾ ਗੁਣਾ ਕੇ ਗਾਹ' },
  { number: 12, ang: 3, prefix: 'ਮੰਨੇ ਕੀ ਗਤਿ ਕਹੀ ਨ ਜਾਇ' },
  { number: 13, ang: 3, prefix: 'ਮੰਨੈ ਸੁਰਤਿ ਹੋਵੈ ਮਨਿ ਬੁਧਿ' },
  { number: 14, ang: 3, prefix: 'ਮੰਨੈ ਮਾਰਗਿ ਠਾਕ ਨ ਪਾਇ' },
  { number: 15, ang: 3, prefix: 'ਮੰਨੈ ਪਾਵਹਿ ਮੋਖੁ ਦੁਆਰੁ' },
  { number: 16, ang: 3, prefix: 'ਪੰਚ ਪਰਵਾਣ ਪੰਚ ਪਰਧਾਨੁ' },
  { number: 17, ang: 3, prefix: 'ਅਸੰਖ ਜਪ ਅਸੰਖ ਭਾਉ' },
  { number: 18, ang: 4, prefix: 'ਅਸੰਖ ਮੂਰਖ ਅੰਧ ਘੋਰ' },
  { number: 19, ang: 4, prefix: 'ਅਸੰਖ ਨਾਵ ਅਸੰਖ ਥਾਵ' },
  { number: 20, ang: 4, prefix: 'ਭਰੀਐ ਹਥੁ ਪੈਰੁ ਤਨੁ ਦੇਹ' },
  { number: 21, ang: 4, prefix: 'ਤੀਰਥੁ ਤਪੁ ਦਇਆ ਦਤੁ ਦਾਨੁ' },
  { number: 22, ang: 5, prefix: 'ਪਾਤਾਲਾ ਪਾਤਾਲ ਲਖ ਆਗਾਸਾ ਆਗਾਸ' },
  { number: 23, ang: 5, prefix: 'ਸਾਲਾਹੀ ਸਾਲਾਹਿ ਏਤੀ ਸੁਰਤਿ' },
  { number: 24, ang: 5, prefix: 'ਅੰਤੁ ਨ ਸਿਫਤੀ ਕਹਣਿ ਨ ਅੰਤੁ' },
  { number: 25, ang: 5, prefix: 'ਬਹੁਤਾ ਕਰਮੁ ਲਿਖਿਆ ਨਾ ਜਾਇ' },
  { number: 26, ang: 5, prefix: 'ਅਮੁਲ ਗੁਣ ਅਮੁਲ ਵਾਪਾਰ' },
  { number: 27, ang: 6, prefix: 'ਸੋ ਦਰੁ ਕੇਹਾ ਸੋ ਘਰੁ ਕੇਹਾ' },
  { number: 28, ang: 6, prefix: 'ਮੁੰਦਾ ਸੰਤੋਖੁ ਸਰਮੁ ਪਤੁ ਝੋਲੀ' },
  { number: 29, ang: 6, prefix: 'ਭੁਗਤਿ ਗਿਆਨੁ ਦਇਆ ਭੰਡਾਰਣਿ' },
  { number: 30, ang: 7, prefix: 'ਏਕਾ ਮਾਈ ਜੁਗਤਿ ਵਿਆਈ' },
  { number: 31, ang: 7, prefix: 'ਆਸਣੁ ਲੋਇ ਲੋਇ ਭੰਡਾਰ' },
  { number: 32, ang: 7, prefix: 'ਇਕ ਦੂ ਜੀਭੌ ਲਖ ਹੋਹਿ' },
  { number: 33, ang: 7, prefix: 'ਆਖਣਿ ਜੋਰੁ ਚੁਪੈ ਨਹ ਜੋਰੁ' },
  { number: 34, ang: 7, prefix: 'ਰਾਤੀ ਰੁਤੀ ਥਿਤੀ ਵਾਰ' },
  { number: 35, ang: 7, prefix: 'ਧਰਮ ਖੰਡ ਕਾ ਏਹੋ ਧਰਮੁ' },
  { number: 36, ang: 7, prefix: 'ਗਿਆਨ ਖੰਡ ਮਹਿ ਗਿਆਨੁ ਪਰਚੰਡੁ' },
  { number: 37, ang: 8, prefix: 'ਕਰਮ ਖੰਡ ਕੀ ਬਾਣੀ ਜੋਰੁ' },
  { number: 38, ang: 8, prefix: 'ਜਤੁ ਪਾਹਾਰਾ ਧੀਰਜੁ ਸੁਨਿਆਰੁ' },
]
