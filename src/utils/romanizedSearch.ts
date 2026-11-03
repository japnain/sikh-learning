function normalizeLatin(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
}

/** Mirrors BaniDB's phonetic normalization, without changing displayed text.
 * https://github.com/KhalisFoundation/banidb-api/blob/dev/api/controllers/phonetic.js
 */
export function normalizeRomanizedSearch(value: string) {
  return normalizeLatin(value.replace(/[()]/g, ''))
    .replace(/\bsatnaam\b|\bsatnam\b/g, 'sat naam')
    .replace(/\b([vw])a+h[ei] guru\b/g, '$1aheguru')
    .replace(/\b[ie]k\s+o[an]*kaar?\b|\b[ie]k\s+onkar\b/g, 'ikoankaar')
    .replace(/([aeiou])h(?=[aeiou])/g, '$1')
    .replace(/([aeiou])h(?=[^aeiou]|$)/g, '$1')
    .replace(/aa+/g, 'a').replace(/ee+|ii+/g, 'i').replace(/oo+|uu+/g, 'u')
    .replace(/ei|ai|ae|ay|ey/g, 'i').replace(/ao|au|aw|oa|oe|ou/g, 'u').replace(/o/g, 'u')
    .replace(/ph/g, 'p').replace(/bh/g, 'b')
    .replace(/ng(?=[^aeiou]|$)/g, 'n').replace(/m(?=[^aeiou]|$)/g, 'n').replace(/nh/g, 'n')
    .replace(/w/g, 'v').replace(/z/g, 's').replace(/qu/g, 'k').replace(/x/g, 'ks')
    .replace(/y(?=[aeiou])/g, '').replace(/([aeiou])y/g, '$1i')
    .replace(/([a-z])\1+/g, '$1').replace(/\s+/g, ' ').trim()
}

/** Whole word spelling variants; optional final-word prefix only while typing. */
export function matchRomanizedWord(text: string, query: string, allowPrefix = false) {
  const word = normalizeRomanizedSearch(text)
  const needle = normalizeRomanizedSearch(query)
  if (!word || !needle) return false
  if (word === needle) return true
  // Romanizers often insert an unstressed a: kirpa/kirapaa, simran/simaran.
  // Preserve other vowels rather than merging unrelated consonant skeletons.
  if (query.length >= 4) {
    const optionalSchwa = normalizeRomanizedSearch(query.toLowerCase().replace(/a/g, ''))
    if (optionalSchwa.length >= 3 && optionalSchwa === normalizeRomanizedSearch(text.toLowerCase().replace(/a/g, ''))) return true
  }
  return allowPrefix && (
    (needle.length >= 4 && word.startsWith(needle))
    || (query.length >= 4 && normalizeLatin(text).startsWith(normalizeLatin(query)))
  )
}

