import type { SundarGutkaLength, UiLocale } from '../types'
import { useLocaleStore } from '../store/locale'
import { BANI_LENGTH_COPY } from './baniLengthCopy'
import '../styles/bani-length.css'

export interface BaniLengthControlProps {
  value: SundarGutkaLength
  onClick: () => void
  disabled?: boolean
  className?: string
  locale?: UiLocale
  ariaLabel?: string
}

export default function BaniLengthControl({ value, onClick, disabled, className = '', locale: requestedLocale, ariaLabel }: BaniLengthControlProps) {
  const storedLocale = useLocaleStore(state => state.locale)
  const locale = requestedLocale ?? storedLocale
  const copy = BANI_LENGTH_COPY[locale]
  return <button type="button" className={`bani-length-control ${className}`} onClick={onClick}
    disabled={disabled} aria-label={ariaLabel ?? copy.change(copy.lengths[value])} aria-haspopup="dialog"
    lang={locale} data-testid="bani-length-control">
    <span>{copy.title}</span><strong>{copy.lengths[value]}</strong>
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
  </button>
}
