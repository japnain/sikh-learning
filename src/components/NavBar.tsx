import { useEffect, useRef, type ReactElement } from 'react'
import { NavLink } from 'react-router-dom'
import { useLocaleStore } from '../store/locale'
import { getUiCopy } from '../utils/uiCopy'

type NavGlyphProps = {
  active: boolean
}

function HomeGlyph({ active }: NavGlyphProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="overflow-visible" aria-hidden="true">
      <path d="M12 3.1c0 0-2.8 2.6-2.8 4.7a2.8 2.8 0 0 0 5.6 0c0-2.1-2.8-4.7-2.8-4.7Z" fill="currentColor" opacity={active ? 0.92 : 0.58} />
      <path d="M4.6 20.1v-7.75L12 6.75l7.4 5.6v7.75" stroke="currentColor" strokeWidth={active ? 1.95 : 1.72} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.85 20.1v-4.2c0-1.75 1.42-3.17 3.15-3.17 1.73 0 3.15 1.42 3.15 3.17v4.2" stroke="currentColor" strokeWidth={active ? 1.88 : 1.65} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.25 11.55h9.5" stroke="currentColor" strokeWidth="1.28" strokeLinecap="round" opacity={active ? 0.42 : 0.22} />
    </svg>
  )
}

function ReadGlyph({ active }: NavGlyphProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="overflow-visible" aria-hidden="true">
      <path d="M4.45 6.45c1.3-1.02 2.97-1.55 5.02-1.55 1.68 0 3.31.42 4.52 1.25v12c-1.35-.8-2.95-1.2-4.8-1.2-1.7 0-3.27.4-4.74 1.2V6.45Z" fill="currentColor" opacity={active ? 0.15 : 0.08} />
      <path d="M19.55 6.45c-1.3-1.02-2.97-1.55-5.02-1.55-1.68 0-3.31.42-4.52 1.25v12c1.35-.8 2.95-1.2 4.8-1.2 1.7 0 3.27.4 4.74 1.2V6.45Z" fill="currentColor" opacity={active ? 0.11 : 0.05} />
      <path d="M4.45 6.45c1.3-1.02 2.97-1.55 5.02-1.55 1.68 0 3.31.42 4.52 1.25v12c-1.35-.8-2.95-1.2-4.8-1.2-1.7 0-3.27.4-4.74 1.2V6.45Z" stroke="currentColor" strokeWidth={active ? 1.92 : 1.68} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19.55 6.45c-1.3-1.02-2.97-1.55-5.02-1.55-1.68 0-3.31.42-4.52 1.25v12c1.35-.8 2.95-1.2 4.8-1.2 1.7 0 3.27.4 4.74 1.2V6.45Z" stroke="currentColor" strokeWidth={active ? 1.92 : 1.68} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 7.4v9.1M7 9.25h2.35M14.65 9.25H17M7 12.25h1.55M15.45 12.25H17" stroke="currentColor" strokeWidth="1.34" strokeLinecap="round" opacity={active ? 0.8 : 0.48} />
    </svg>
  )
}

function LearnGlyph({ active }: NavGlyphProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="overflow-visible" aria-hidden="true">
      <path d="M12 3.15 14 7.15l4.4.62-3.18 3.05.76 4.32L12 13.15l-3.98 1.99.76-4.32L5.6 7.77l4.4-.62L12 3.15Z" fill="currentColor" opacity={active ? 0.26 : 0.12} />
      <path d="M12 3.15 14 7.15l4.4.62-3.18 3.05.76 4.32L12 13.15l-3.98 1.99.76-4.32L5.6 7.77l4.4-.62L12 3.15Z" stroke="currentColor" strokeWidth={active ? 1.9 : 1.66} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 14.85v5.65M9.3 17.45h5.4" stroke="currentColor" strokeWidth="1.48" strokeLinecap="round" opacity={active ? 0.98 : 0.6} />
    </svg>
  )
}

function SavedGlyph({ active }: NavGlyphProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="overflow-visible" aria-hidden="true">
      <path d="M7 4.5h10a1.75 1.75 0 0 1 1.75 1.75v12.8L12 15.5l-6.75 3.55V6.25A1.75 1.75 0 0 1 7 4.5Z" fill="currentColor" opacity={active ? 0.16 : 0.08} />
      <path d="M7 4.5h10a1.75 1.75 0 0 1 1.75 1.75v12.8L12 15.5l-6.75 3.55V6.25A1.75 1.75 0 0 1 7 4.5Z" stroke="currentColor" strokeWidth={active ? 1.92 : 1.68} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.4 8.15h5.2M9.4 11.1h5.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity={active ? 0.82 : 0.44} />
    </svg>
  )
}

function MoreGlyph({ active }: NavGlyphProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="overflow-visible" aria-hidden="true">
      <circle cx="12" cy="12" r="3.35" fill="currentColor" opacity={active ? 0.24 : 0.12} />
      <circle cx="12" cy="12" r="3.35" stroke="currentColor" strokeWidth={active ? 1.92 : 1.68} />
      <path d="M12 2.9v2.35M12 18.75v2.35M5.25 5.25l1.65 1.65M17.1 17.1l1.65 1.65M2.9 12h2.35M18.75 12h2.35M5.25 18.75l1.65-1.65M17.1 6.9l1.65-1.65" stroke="currentColor" strokeWidth="1.42" strokeLinecap="round" opacity={active ? 0.98 : 0.56} />
    </svg>
  )
}

export default function NavBar() {
  const locale = useLocaleStore(s => s.locale)
  const copy = getUiCopy(locale)
  const stackRef = useRef<HTMLDivElement | null>(null)

  const tabs: Array<{
    id: string
    to: string
    label: string
    ariaLabel: string
    Glyph: (props: NavGlyphProps) => ReactElement
  }> = [
    {
      id: 'home',
      to: '/',
      label: copy.nav.home,
      ariaLabel: `${copy.nav.home} tab`,
      Glyph: HomeGlyph,
    },
    {
      id: 'read',
      to: '/banis',
      label: copy.nav.read,
      ariaLabel: `${copy.nav.read} tab`,
      Glyph: ReadGlyph,
    },
    {
      id: 'learn',
      to: '/learn',
      label: copy.nav.learn,
      ariaLabel: `${copy.nav.learn} tab`,
      Glyph: LearnGlyph,
    },
    {
      id: 'saved',
      to: '/library',
      label: copy.nav.saved,
      ariaLabel: `${copy.nav.saved} tab`,
      Glyph: SavedGlyph,
    },
    {
      id: 'more',
      to: '/more',
      label: copy.nav.more,
      ariaLabel: `${copy.nav.more} tab and settings`,
      Glyph: MoreGlyph,
    },
  ]

  useEffect(() => {
    const element = stackRef.current
    if (!element) return

    const updateHeight = () => {
      document.documentElement.style.setProperty('--nav-stack-height', `${Math.ceil(element.getBoundingClientRect().height)}px`)
    }

    updateHeight()
    const observer = new ResizeObserver(() => updateHeight())
    observer.observe(element)
    window.addEventListener('resize', updateHeight)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateHeight)
    }
  }, [])

  return (
    <div className="app-nav-stack z-50" ref={stackRef} data-testid="nav-stack" data-ai-surface="nav-stack">
      <nav
        className="app-nav flex items-center rounded-full border px-2 py-2 transition-colors duration-300"
        aria-label="Primary navigation"
        data-testid="primary-nav"
        data-ai-surface="primary-nav"
      >
        {tabs.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            aria-label={tab.ariaLabel}
            title={tab.ariaLabel}
            data-testid={`nav-tab-${tab.id}`}
            data-ai-action={`nav-${tab.id}`}
            className="group relative flex min-w-0 flex-1 items-center justify-center"
          >
            {({ isActive }) => (
              <span
                className={`relative flex min-h-[56px] w-full min-w-0 items-center justify-center rounded-full px-1 transition-colors duration-200 ${
                  isActive
                    ? 'text-saffron dark:text-gold-light'
                    : 'text-ink/54 hover:text-ink/76 dark:text-dark-text/58 dark:hover:text-dark-text/78'
                }`}
                data-active={isActive}
              >
                <span
                  className="absolute inset-1 rounded-full border border-transparent transition-colors duration-200 group-hover:bg-ink/[0.03] dark:group-hover:bg-dark-text/[0.04]"
                />
                <span
                  className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors duration-200 ${
                    isActive
                      ? 'border-saffron/18 bg-saffron/9 dark:border-gold/16 dark:bg-gold/10'
                      : 'border-transparent bg-transparent'
                  }`}
                >
                  <tab.Glyph active={isActive} />
                </span>
                <span className="sr-only">{tab.label}</span>
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
