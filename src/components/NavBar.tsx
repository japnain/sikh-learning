import { useEffect, useRef, type ReactElement } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useLocaleStore } from '../store/locale'
import { NavHomeGlyph, NavReadGlyph, NavSavedGlyph, NavMoreGlyph } from './NavigationGlyphs'
import { getUiCopy } from '../utils/uiCopy'

type NavGlyphProps = { active: boolean }

export default function NavBar() {
  const locale = useLocaleStore(s => s.locale)
  const location = useLocation()
  const copy = getUiCopy(locale)
  const stackRef = useRef<HTMLDivElement | null>(null)
  const isBookRoute = /^\/library\/[^/]+(?:\/chapters\/[^/]+)?\/?$/.test(location.pathname)
  const activeTabId = isBookRoute || location.pathname.startsWith('/stories')
    ? 'read'
    : location.pathname === '/' || location.pathname.startsWith('/nitnem/customize')
      ? 'home'
      : location.pathname === '/banis' || location.pathname.startsWith('/banis/')
        ? 'read'
        : location.pathname === '/saved'
            || location.pathname.startsWith('/saved/')
            || location.pathname === '/vocab'
            || location.pathname.startsWith('/vocab/')
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
      Glyph: NavHomeGlyph,
    },
    {
      id: 'read',
      to: '/banis',
      label: copy.nav.read,
      ariaLabel: copy.nav.read,
      Glyph: NavReadGlyph,
    },
    {
      id: 'saved',
      to: '/saved',
      label: copy.nav.saved,
      ariaLabel: copy.nav.saved,
      Glyph: NavSavedGlyph,
    },
    {
      id: 'more',
      to: '/more',
      label: copy.nav.more,
      ariaLabel: copy.nav.moreDestination,
      Glyph: NavMoreGlyph,
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
              className="app-nav-tab"
            >
              <span className="app-nav-tab__icon" aria-hidden="true">
                <tab.Glyph active={tab.id === activeTabId} />
              </span>
              <span className="app-nav-tab__label">{tab.label}</span>
              <span className="app-nav-tab__active-marker" aria-hidden="true" />
              {tab.id === 'more' ? (
                <span className="sr-only"> — {copy.nav.moreDestination}</span>
              ) : null}
            </Link>
          ))}
        </nav>
      </div>
    </>
  )
}
