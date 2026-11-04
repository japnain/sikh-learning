import { useLayoutEffect, useRef, type ReactElement } from 'react'
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

  useLayoutEffect(() => {
    const element = stackRef.current
    if (!element) return
    const nav = element.querySelector<HTMLElement>('.app-nav')
    if (!nav) return
    const labels = Array.from(nav.querySelectorAll<HTMLElement>('.app-nav-tab__label'))
    const desktop = window.matchMedia('(min-width: 1024px)')
    let frame: number | null = null
    let active = true
    let lastHeight: number | null = null

    const updateHeight = () => {
      frame = null
      const isDesktopRail = desktop.matches
      if (!isDesktopRail) {
        const styles = getComputedStyle(nav)
        const available = nav.clientWidth - (parseFloat(styles.paddingLeft) || 0) - (parseFloat(styles.paddingRight) || 0)
        const fourColumnWidth = (available - 3 * (parseFloat(styles.columnGap) || 0)) / 4
        const requiredWidth = Math.max(0, ...labels.map(label => label.scrollWidth + 8))
        const expanded = String(requiredWidth > fourColumnWidth && fourColumnWidth > 0)
        if (nav.dataset.expandedLabels !== expanded) nav.dataset.expandedLabels = expanded
      }
      const reservedHeight = isDesktopRail ? 0 : Math.ceil(element.getBoundingClientRect().height)
      if (reservedHeight !== lastHeight) {
        document.documentElement.style.setProperty('--nav-stack-height', `${reservedHeight}px`)
        lastHeight = reservedHeight
      }
    }

    const scheduleMeasurement = () => {
      if (frame === null && active) frame = window.requestAnimationFrame(updateHeight)
    }

    // Measure actual navigation changes, not mobile browser-toolbar animation.
    // Height-only viewport resizes during scrolling must not relayout the page.
    updateHeight()
    void document.fonts?.ready.then(scheduleMeasurement)
    const observer = new ResizeObserver(scheduleMeasurement)
    observer.observe(element)
    labels.forEach(label => observer.observe(label))
    desktop.addEventListener('change', scheduleMeasurement)

    return () => {
      active = false
      if (frame !== null) window.cancelAnimationFrame(frame)
      observer.disconnect()
      desktop.removeEventListener('change', scheduleMeasurement)
      document.documentElement.style.setProperty('--nav-stack-height', '0px')
    }
  }, [locale])

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
