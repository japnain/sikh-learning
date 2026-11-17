import { useId } from 'react'
import { useLocaleStore } from '../store/locale'
import { EPUB_APP_PALETTE_LABEL, EPUB_FONT_SCALE_MAX, EPUB_FONT_SCALE_MIN, EPUB_FONT_SCALE_STEP, useEpubReaderStore } from '../store/epubReader'
import { BOOK_READER_COPY } from '../pages/library/bookReaderCopy'


export default function ProseReaderSettings() {
  const locale = useLocaleStore(state => state.locale)
  const copy = BOOK_READER_COPY[locale]
  const settings = useEpubReaderStore()
  const sizeId = useId()
  return <div className="prose-settings">
    <label htmlFor={sizeId}>{copy.textSize} <output>{Math.round(settings.fontScale * 100)}%</output></label>
    <input id={sizeId} type="range" min={EPUB_FONT_SCALE_MIN} max={EPUB_FONT_SCALE_MAX} step={EPUB_FONT_SCALE_STEP} value={settings.fontScale} onChange={event => settings.setFontScale(Number(event.target.value))} aria-valuetext={`${Math.round(settings.fontScale * 100)}%`} />
    <fieldset><legend>{copy.lineSpacing}</legend><div>{(['compact', 'comfortable', 'spacious'] as const).map(value => <button key={value} type="button" aria-pressed={settings.lineHeight === value} onClick={() => settings.setLineHeight(value)}>{copy[value]}</button>)}</div></fieldset>
    <fieldset><legend>{copy.textWidth}</legend><div>{(['narrow', 'standard', 'wide'] as const).map(value => <button key={value} type="button" aria-pressed={settings.measure === value} onClick={() => settings.setMeasure(value)}>{copy[value]}</button>)}</div></fieldset>
    <fieldset><legend>{copy.pageColor}</legend><div>{(['app', 'paper', 'sepia', 'night'] as const).map(value => <button key={value} type="button" aria-pressed={settings.palette === value} onClick={() => settings.setPalette(value)}>{value === 'app' ? EPUB_APP_PALETTE_LABEL[locale] : copy[value]}</button>)}</div></fieldset>
    <button type="button" className="prose-settings-reset" onClick={settings.resetPreferences}>{copy.reset}</button>
  </div>
}
