/**
 * Transliterate Gurmukhi script to Devanagari (Hindi) script.
 * The two scripts share Brahmi origins and have a near 1:1 mapping
 * at a Unicode offset of 0x0100 (Gurmukhi 0x0A00 → Devanagari 0x0900).
 */
export function gurmukhiToHindi(text: string): string {
  let result = ''
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code >= 0x0A00 && code <= 0x0A7F) {
      switch (code) {
        case 0x0A70: result += '\u0902'; break   // ੰ tippi → ं anusvara
        case 0x0A71: result += '\u094D'; break   // ੱ adhak → ् halant
        case 0x0A73: result += '\u0909'; break   // ੳ ura → उ
        case 0x0A74: result += text[i]; break     // ੴ ik onkar → keep as-is
        case 0x0A5C: result += '\u0921\u093C'; break // ੜ → ड़
        default: result += String.fromCharCode(code - 0x0100)
      }
    } else {
      result += text[i]
    }
  }
  return result
}
