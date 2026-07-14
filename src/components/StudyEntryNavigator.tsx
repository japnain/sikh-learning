import { IconArrowLeft, IconArrowRight } from './icons'

interface StudyEntryNavigatorProps {
  placement: 'top' | 'bottom'
  currentIndex: number
  total: number
  currentLabel: string
  currentTitle: string
  previousLabel: string
  nextLabel: string
  previousTitle: string | null
  nextTitle: string | null
  beginningLabel: string
  endLabel: string
  continueLabel: string
  navLabel: string
  titleLang?: string
  titleClassName: string
  onPrevious: () => void
  onNext: () => void
}

export default function StudyEntryNavigator({
  placement,
  currentIndex,
  total,
  currentLabel,
  currentTitle,
  previousLabel,
  nextLabel,
  previousTitle,
  nextTitle,
  beginningLabel,
  endLabel,
  continueLabel,
  navLabel,
  titleLang,
  titleClassName,
  onPrevious,
  onNext,
}: StudyEntryNavigatorProps) {
  const isBottom = placement === 'bottom'
  const previousDisabled = currentIndex === 0
  const nextDisabled = currentIndex === total - 1
  const previousContext = previousTitle ?? beginningLabel
  const nextContext = nextTitle ?? endLabel
  const placementClass = isBottom
    ? 'study-entry-navigator--bottom'
    : 'study-entry-navigator--top'

  return (
    <nav
      className={`study-entry-navigator ${placementClass} section-shell-quiet`}
      aria-label={isBottom ? `${continueLabel}: ${navLabel}` : navLabel}
      data-testid={isBottom ? 'study-entry-paginator-bottom' : 'study-entry-paginator'}
      data-placement={placement}
    >
      <div
        className="study-entry-navigator__heading"
        aria-live={isBottom ? undefined : 'polite'}
        aria-atomic={isBottom ? undefined : 'true'}
      >
        <div>
          <p className="eyebrow">{isBottom ? continueLabel : currentLabel}</p>
          {isBottom ? (
            <p className="study-entry-navigator__position">{currentLabel}</p>
          ) : (
            <p lang={titleLang} className={`study-entry-navigator__current-title ${titleClassName}`}>
              {currentTitle}
            </p>
          )}
        </div>
        {isBottom ? (
          <span className="study-entry-navigator__count" aria-hidden="true">
            {currentIndex + 1} / {total}
          </span>
        ) : null}
      </div>

      {isBottom ? (
        <div
          className="study-entry-navigator__progress"
          role="progressbar"
          aria-label={currentLabel}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={currentIndex + 1}
        >
          <span style={{ width: `${((currentIndex + 1) / total) * 100}%` }} />
        </div>
      ) : null}

      <div className="study-entry-navigator__controls">
        <button
          type="button"
          onClick={onPrevious}
          disabled={previousDisabled}
          aria-label={`${previousLabel}: ${previousContext}`}
          className="study-entry-navigator__button study-entry-navigator__button--previous interactive-focus"
          data-ai-action={`study-${placement}-previous-shabad`}
        >
          <span className="study-entry-navigator__icon" aria-hidden="true">
            <IconArrowLeft size={17} />
          </span>
          <span className="study-entry-navigator__button-copy">
            <span className="study-entry-navigator__button-label">{previousLabel}</span>
            {isBottom ? (
              <span lang={previousTitle ? titleLang : undefined} className={`study-entry-navigator__preview ${previousTitle ? titleClassName : 'font-sans'}`}>
                {previousContext}
              </span>
            ) : null}
          </span>
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          aria-label={`${nextLabel}: ${nextContext}`}
          className="study-entry-navigator__button study-entry-navigator__button--next interactive-focus"
          data-ai-action={`study-${placement}-next-shabad`}
        >
          <span className="study-entry-navigator__button-copy">
            <span className="study-entry-navigator__button-label">{nextLabel}</span>
            {isBottom ? (
              <span lang={nextTitle ? titleLang : undefined} className={`study-entry-navigator__preview ${nextTitle ? titleClassName : 'font-sans'}`}>
                {nextContext}
              </span>
            ) : null}
          </span>
          <span className="study-entry-navigator__icon" aria-hidden="true">
            <IconArrowRight size={17} />
          </span>
        </button>
      </div>
    </nav>
  )
}
