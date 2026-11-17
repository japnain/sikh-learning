import { SHABADOS_LINE_ID_BASE, type ShabadosBaniReading } from '../api/shabados'
import { SHABADOS_PACK_FORMAT, SHABADOS_SOURCE_REVISION } from '../data/shabadosBanis'

/** A small provider-shaped fixture; text order and IDs are intentionally explicit. */
export function shabadosReadingFixture(id = 'ALHN'): ShabadosBaniReading {
  const lines = [
    ['AB01', 'ਸਲੋਕੁ ॥', 'Opening heading', true],
    ['AB02', 'ਸਚੁ ਨਾਮੁ ਮੇਰਾ ਆਧਾਰੋ ॥', 'The True Name is my support.', false],
    ['AB03', 'ਸਚੁ ਨਾਮੁ ਅਧਾਰੁ ਮੇਰਾ ॥', 'The True Name is my support and ending.', false],
  ].map(([providerLineId, gurmukhi, meaning, isHeader]) => ({
    providerLineId: String(providerLineId),
    verseId: SHABADOS_LINE_ID_BASE + parseInt(String(providerLineId), 36),
    shabadId: 0, ang: 578, gurmukhi: String(gurmukhi), isHeader: Boolean(isHeader),
    transliteration: 'sach naam', translation_en: String(meaning),
    translations_en: { bdb: String(meaning) }, translation_hi: '', translation_pa: '',
  }))
  return {
    entries: [{
      id: `shabados-${id}-section-1`, source: 'G', scripture: 'SGGS', shabadId: 0, ang: 578,
      lines, verseIds: lines.map(line => line.verseId),
      gurmukhi: lines.map(line => line.gurmukhi).join('\n'), transliteration: 'sach naam',
      translation_en: 'The True Name is my support.', translation_hi: '', translation_pa: '', words: [],
    }],
    normalizationRevision: 2, availableLengths: [], resolvedLength: null,
    provenance: { provider: 'shabados', readingId: id, sourceRevision: SHABADOS_SOURCE_REVISION,
      formatVersion: SHABADOS_PACK_FORMAT, assets: [`${id}.json`] },
  }
}
