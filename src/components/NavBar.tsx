import { useEffect, useRef, type ReactElement } from 'react'
import { Link, useLocation } from 'react-router-dom'
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
      <circle cx="12" cy="12" r="7.15" fill="currentColor" opacity={active ? 0.12 : 0.06} />
      <circle cx="12" cy="12" r="7.15" stroke="currentColor" strokeWidth={active ? 1.9 : 1.65} />
      <path
        d="M8.25 12h.02M12 12h.02M15.75 12h.02"
        stroke="currentColor"
        strokeWidth={active ? 2.4 : 2.05}
        strokeLinecap="round"
        opacity={active ? 0.96 : 0.58}
      />
    </svg>
  )
}

export default function NavBar() {
  const locale = useLocaleStore(s => s.locale)
  const location = useLocation()
  const copy = getUiCopy(locale)
  const stackRef = useRef<HTMLDivElement | null>(null)
  const isBookRoute = /^\/library\/[^/]+(?:\/chapters\/[^/]+)?\/?$/.test(location.pathname)
  const activeTabId = isBookRoute
    ? 'read'
    : location.pathname === '/'
      ? 'home'
      : location.pathname === '/banis' || location.pathname.startsWith('/banis/')
        ? 'read'
        : location.pathname === '/saved' || location.pathname.startsWith('/saved/')
          ? 'saved'
          : location.pathname === '/more' || location.pathname.startsWith('/more/')
            ? 'more'
            : null

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
      ariaLabel: copy.nav.home,
      Glyph: HomeGlyph,
    },
    {
      id: 'read',
      to: '/banis',
      label: copy.nav.read,
      ariaLabel: copy.nav.read,
      Glyph: ReadGlyph,
    },
    {
      id: 'saved',
      to: '/saved',
      label: copy.nav.saved,
      ariaLabel: copy.nav.saved,
      Glyph: SavedGlyph,
    },
    {
      id: 'more',
      to: '/more',
      label: copy.nav.more,
      ariaLabel: copy.nav.more,
      Glyph: MoreGlyph,
    },
  ]

  useEffect(() => {
    const element = stackRef.current
    if (!element) return

    const updateHeight = () => {
      const isDesktopRail = window.matchMedia?.('(min-width: 1024px)').matches ?? window.innerWidth >= 1024
      const reservedHeight = isDesktopRail ? 0 : Math.ceil(element.getBoundingClientRect().height)
      document.documentElement.style.setProperty('--nav-stack-height', `${reservedHeight}px`)
    }

    updateHeight()
    const observer = new ResizeObserver(() => updateHeight())
    observer.observe(element)
    window.addEventListener('resize', updateHeight)
    window.visualViewport?.addEventListener('resize', updateHeight)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateHeight)
      window.visualViewport?.removeEventListener('resize', updateHeight)
      document.documentElement.style.setProperty('--nav-stack-height', '0px')
    }
  }, [])

  return (
    <>
      <div className="app-nav-scrim" aria-hidden="true" />
      <div className="app-nav-stack" ref={stackRef} data-testid="nav-stack" data-ai-surface="nav-stack">
        <nav
          className="app-nav"
          aria-label={copy.nav.primaryNavigation}
          data-testid="primary-nav"
          data-ai-surface="primary-nav"
        >
          {tabs.map(tab => (
            <Link
              key={tab.to}
              to={tab.to}
              aria-label={tab.ariaLabel}
              aria-current={tab.id === activeTabId ? 'page' : undefined}
              title={tab.ariaLabel}
              data-testid={`nav-tab-${tab.id}`}
              data-ai-action={`nav-${tab.id}`}
              className={`app-nav-tab ${tab.id === activeTabId ? 'is-active' : ''}`}
            >
              <span className="app-nav-tab__icon" aria-hidden="true">
                <tab.Glyph active={tab.id === activeTabId} />
              </span>
              <span className="app-nav-tab__label">{tab.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </>
  )
}
