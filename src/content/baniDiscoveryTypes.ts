export interface BaniDiscoveryReference {
  label: string
  url: string
}

/** Editorial context is separate from the scripture and its canonical routes. */
export interface BaniDiscoveryEntry {
  name: string
  summary: string
  detail?: string
  references: BaniDiscoveryReference[]
}

export type BaniDiscoveryEntries = Record<number, BaniDiscoveryEntry>
