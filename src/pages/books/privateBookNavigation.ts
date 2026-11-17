/** Keep source text intact while making empty/punctuation-only navigation usable. */
export function privateSectionLabel(title: string | undefined, index: number) {
  const label = title?.trim() ?? ''
  return /[\p{L}\p{N}]/u.test(label) ? label : index === 0 ? 'Opening pages' : `Section ${index + 1}`
}

/** Filenames and numeric export labels are not meaningful illustration captions. */
export function privateImageCaption(alt: string | undefined) {
  const caption = alt?.trim() || ''
  if (!/[\p{L}]/u.test(caption) || /\.(?:jpe?g|png|gif|webp|svg|tiff?)$/i.test(caption)
    || /^(?:img|image|scan)[-_\s]*\d+$/i.test(caption)) return undefined
  return caption
}
