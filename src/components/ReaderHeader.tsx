import { useImperativeHandle, useLayoutEffect, useRef, type ComponentPropsWithRef, type ReactNode } from 'react'
import '../styles/persistent-reader-header.css'

type ReaderHeaderProps = Omit<ComponentPropsWithRef<'header'>, 'children' | 'title'> & {
  title: string
  subtitle?: string
  titleLang?: string
  titleId?: string
  titleClassName?: string
  heading?: boolean
  titleDetails?: ReactNode
  back: ReactNode
  actions?: ReactNode
  secondary?: ReactNode
  progress?: ReactNode
}

/** One persistent heading and control layout for scripture, stories and books. */
export default function ReaderHeader({ className = '', ref, title, subtitle, titleLang, titleId,
  titleClassName = '', heading = false, titleDetails, back, actions, secondary, progress, ...props }: ReaderHeaderProps) {
  const headerRef = useRef<HTMLElement>(null)
  useImperativeHandle(ref, () => headerRef.current!, [])
  useLayoutEffect(() => {
    const header = headerRef.current
    const page = header?.parentElement
    if (!header || !page) return
    const measure = () => {
      header.dataset.enlargedText = String(Number.parseFloat(getComputedStyle(document.documentElement).fontSize) >= 24)
      const height = Math.ceil(header.getBoundingClientRect().height)
      if (height > 0) page.style.setProperty('--reader-header-height', `${height}px`)
    }
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(header)
    window.addEventListener('resize', measure)
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure) }
  }, [])
  const Title = heading ? 'h1' : 'p'
  return <header {...props} ref={headerRef} className={`reader-header ${className}`} data-reader-header="persistent">
    {back}
    <div className="reader-header__identity study-reader-topbar__identity">
      <Title id={titleId} lang={titleLang} className={`reader-header__title ${titleClassName}`} title={title}>{title}</Title>
      {subtitle ? <p className="reader-header__subtitle">{subtitle}</p> : null}
      {titleDetails}
    </div>
    <div className="reader-header__actions study-reader-topbar__actions">{actions}</div>
    {secondary ? <div className="reader-header__secondary">{secondary}</div> : null}
    {progress}
  </header>
}
