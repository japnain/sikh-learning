import type { BaniDiscoveryEntry } from '../content/baniDiscoveryTypes'

export const SHABADOS_SOURCE_REVISION = 'shabados-v5.0.0-next.0-517890c7e7c2'
export const SHABADOS_DEFINITION_REVISION = '157b8dc3749fa6b8789610af8c7cb1c4eff3b35a'
export const SHABADOS_PACK_FORMAT = 1

export interface ShabadosBani extends BaniDiscoveryEntry {
  id: string
  gurmukhi: string
}

const definitionUrl = (id: string) => `https://github.com/shabados/shabados/blob/${SHABADOS_DEFINITION_REVISION}/database/collections/banis/${id}.toml`

/** Additional assemblies, not duplicate replacements for the existing BaniDB catalogue. */
export const SHABADOS_BANIS: readonly ShabadosBani[] = [
  {
    id: 'ALHN', name: 'Alahnia', gurmukhi: 'ਅਲਾਹਣੀਆ',
    summary: 'Songs of grief from Sri Guru Granth Sahib Ji, gathered as one reading.',
    detail: 'This Shabad OS collection gives these SGGS compositions their own place in the bani catalogue. The source text remains available in the full scripture reader as well.',
    references: [{ label: 'Shabad OS · Alahnia collection', url: definitionUrl('ALHN') }],
  },
  {
    id: 'ANN6', name: 'Anand Sahib · Six Pauris and Salok', gurmukhi: 'ਅਨੰਦੁ ਸਾਹਿਬ (੬ ਪਉੜੀਆਂ ਅਤੇ ਸਲੋਕੁ)',
    summary: 'A separate shorter Anand reading with the concluding text in this collection.',
    detail: 'This is the six-pauri-and-salok assembly published by Shabad OS. The existing full Anand Sahib reading and its navigation remain unchanged.',
    references: [{ label: 'Shabad OS · Six-pauri Anand collection', url: definitionUrl('ANN6') }],
  },
  {
    id: 'MDVI', name: 'Paath Bhog · Mundavani', gurmukhi: 'ਪਾਠ ਦਾ ਭੋਗ (ਮੁੰਦਾਵਣੀ)',
    summary: 'A closing reading assembled under Mundavani in the Shabad OS collection.',
    detail: 'An assembled Paath Bhog reading, not just the individual Mundavani shabad. Its source-defined order and accompanying sections are preserved.',
    references: [{ label: 'Shabad OS · Mundavani Paath Bhog collection', url: definitionUrl('MDVI') }],
  },
  {
    id: 'RGMA', name: 'Paath Bhog · Ragmala', gurmukhi: 'ਪਾਠ ਦਾ ਭੋਗ (ਰਾਗਮਾਲਾ)',
    summary: 'The Shabad OS Paath Bhog assembly that includes Ragmala.',
    detail: 'This closing collection is distinct from the existing standalone Raag Maala entry. Both retain their own order and reading position.',
    references: [{ label: 'Shabad OS · Ragmala Paath Bhog collection', url: definitionUrl('RGMA') }],
  },
]

export function getShabadosBani(id: string | null | undefined): ShabadosBani | undefined {
  return SHABADOS_BANIS.find(bani => bani.id === id)
}

export function getShabadosBaniPath(id: string): string {
  const bani = getShabadosBani(id)
  if (!bani) return '/banis'
  return `/study?${new URLSearchParams({ shabadosBani: bani.id, bani: bani.name, source: 'G' })}`
}
