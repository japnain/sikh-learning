// Navigation-only proofreading. The archived EPUB, narrative blocks, IDs and
// reading positions remain unchanged. Source spellings are retained explicitly.
export const PANTH_PRAKASH_DISPLAY_TITLES = [
  {
    episodeNumber: 14,
    sourceTitle: 'The Khalsa Must Be Autonomous And Self- Respecting',
    displayTitle: 'The Khalsa Must Be Autonomous And Self-Respecting',
    sourceHref: 'EPUB/page_119.html',
    printPageNumber: 75,
    reason: 'Remove the space within the hyphenated word in navigation labels.',
  },
  {
    episodeNumber: 19,
    sourceTitle: 'Martyrdom of the Elder Sahibzadas - The Battale of Chamkaur',
    displayTitle: 'Martyrdom of the Elder Sahibzadas - The Battle of Chamkaur',
    sourceHref: 'EPUB/page_163.html',
    printPageNumber: 119,
    reason: 'Correct Battale to Battle in navigation labels only.',
  },
].map(entry => ({
  ...entry,
  publicationId: 'volume-1',
  sourceSha256: 'f9f801cc84551a8e895df8f9b812c634f5b9ecaf630e10f58ad5a99e90771768',
  policy: 'Editorial display override; original EPUB title retained, not a correction to the source edition.',
}))

export function panthPrakashDisplayTitle(episodeNumber, sourceTitle) {
  const override = PANTH_PRAKASH_DISPLAY_TITLES.find(entry => entry.episodeNumber === episodeNumber)
  if (!override) return sourceTitle
  if (sourceTitle !== override.sourceTitle) throw new Error(`Review display-title source for episode ${episodeNumber}`)
  return override.displayTitle
}
