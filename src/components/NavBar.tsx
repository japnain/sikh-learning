import { useEffect, useRef, type ReactElement } from 'react'
import { NavLink } from 'react-router-dom'
import { useLocaleStore } from '../store/locale'
import { getUiCopy } from '../utils/uiCopy'

type NavGlyphProps = {
  active: boolean
}

type NavAccent = {
  activeText: string
  badge: string
  tile: string
  pill: string
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
    accent: NavAccent
  }> = [
    {
      id: 'home',
      to: '/',
      label: copy.nav.home,
      ariaLabel: `${copy.nav.home} tab`,
      Glyph: HomeGlyph,
      accent: {
        activeText: 'text-[#d95d56] dark:text-[#ff8f80]',
        badge: 'bg-[radial-gradient(circle_at_30%_25%,rgba(255,160,140,0.5),transparent_55%),linear-gradient(135deg,rgba(217,93,86,0.22),rgba(255,125,84,0.2))] dark:bg-[radial-gradient(circle_at_30%_25%,rgba(255,176,150,0.25),transparent_55%),linear-gradient(135deg,rgba(217,93,86,0.25),rgba(255,125,84,0.12))]',
        tile: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,247,244,0.88))] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_12px_28px_rgba(217,93,86,0.18)] dark:bg-[linear-gradient(180deg,rgba(35,24,44,0.96),rgba(26,18,39,0.94))] dark:shadow-[inset_0_1px_0_rgba(255,143,128,0.12),0_14px_28px_rgba(0,0,0,0.34)]',
        pill: 'from-[#d95d56] to-[#ff8a5f]',
      },
    },
    {
      id: 'read',
      to: '/banis',
      label: copy.nav.read,
      ariaLabel: `${copy.nav.read} tab`,
      Glyph: ReadGlyph,
      accent: {
        activeText: 'text-[#3f76dc] dark:text-[#7bb8ff]',
        badge: 'bg-[radial-gradient(circle_at_30%_25%,rgba(157,213,255,0.45),transparent_55%),linear-gradient(135deg,rgba(63,118,220,0.2),rgba(58,170,220,0.18))] dark:bg-[radial-gradient(circle_at_30%_25%,rgba(157,213,255,0.2),transparent_55%),linear-gradient(135deg,rgba(63,118,220,0.24),rgba(58,170,220,0.12))]',
        tile: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(245,249,255,0.88))] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_12px_28px_rgba(63,118,220,0.18)] dark:bg-[linear-gradient(180deg,rgba(29,34,58,0.96),rgba(20,24,42,0.94))] dark:shadow-[inset_0_1px_0_rgba(123,184,255,0.12),0_14px_28px_rgba(0,0,0,0.34)]',
        pill: 'from-[#3f76dc] to-[#38aadc]',
      },
    },
    {
      id: 'learn',
      to: '/learn',
      label: copy.nav.learn,
      ariaLabel: `${copy.nav.learn} tab`,
      Glyph: LearnGlyph,
      accent: {
        activeText: 'text-saffron dark:text-gold-light',
        badge: 'bg-[radial-gradient(circle_at_30%_25%,rgba(255,223,153,0.46),transparent_55%),linear-gradient(135deg,rgba(224,154,70,0.22),rgba(255,201,89,0.16))] dark:bg-[radial-gradient(circle_at_30%_25%,rgba(255,223,153,0.2),transparent_55%),linear-gradient(135deg,rgba(224,154,70,0.25),rgba(255,201,89,0.1))]',
        tile: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,251,243,0.88))] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_12px_28px_rgba(224,154,70,0.18)] dark:bg-[linear-gradient(180deg,rgba(36,29,51,0.96),rgba(23,18,36,0.94))] dark:shadow-[inset_0_1px_0_rgba(255,214,153,0.1),0_14px_28px_rgba(0,0,0,0.34)]',
        pill: 'from-saffron to-gold-light',
      },
    },
    {
      id: 'saved',
      to: '/library',
      label: copy.nav.saved,
      ariaLabel: `${copy.nav.saved} tab`,
      Glyph: SavedGlyph,
      accent: {
        activeText: 'text-[#1e9d74] dark:text-[#68e0ae]',
        badge: 'bg-[radial-gradient(circle_at_30%_25%,rgba(171,255,222,0.45),transparent_55%),linear-gradient(135deg,rgba(30,157,116,0.22),rgba(70,200,138,0.18))] dark:bg-[radial-gradient(circle_at_30%_25%,rgba(171,255,222,0.2),transparent_55%),linear-gradient(135deg,rgba(30,157,116,0.24),rgba(70,200,138,0.1))]',
        tile: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(244,255,249,0.88))] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_12px_28px_rgba(30,157,116,0.16)] dark:bg-[linear-gradient(180deg,rgba(28,43,44,0.96),rgba(19,33,35,0.94))] dark:shadow-[inset_0_1px_0_rgba(104,224,174,0.1),0_14px_28px_rgba(0,0,0,0.34)]',
        pill: 'from-[#1e9d74] to-[#46c88a]',
      },
    },
    {
      id: 'more',
      to: '/more',
      label: copy.nav.more,
      ariaLabel: `${copy.nav.more} tab and settings`,
      Glyph: MoreGlyph,
      accent: {
        activeText: 'text-[#8e58dc] dark:text-[#c3a0ff]',
        badge: 'bg-[radial-gradient(circle_at_30%_25%,rgba(229,190,255,0.45),transparent_55%),linear-gradient(135deg,rgba(142,88,220,0.2),rgba(182,109,231,0.18))] dark:bg-[radial-gradient(circle_at_30%_25%,rgba(229,190,255,0.18),transparent_55%),linear-gradient(135deg,rgba(142,88,220,0.24),rgba(182,109,231,0.1))]',
        tile: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(251,246,255,0.88))] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_12px_28px_rgba(142,88,220,0.18)] dark:bg-[linear-gradient(180deg,rgba(39,29,56,0.96),rgba(27,19,41,0.94))] dark:shadow-[inset_0_1px_0_rgba(195,160,255,0.1),0_14px_28px_rgba(0,0,0,0.34)]',
        pill: 'from-[#8e58dc] to-[#c388ff]',
      },
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
        className="app-nav flex items-center rounded-[30px] border border-white/42 bg-parchment-card/28 px-2 py-2 shadow-[0_20px_42px_rgba(77,53,22,0.18)] backdrop-blur-[30px] transition-colors duration-300 dark:border-gold/12 dark:bg-dark-panel/24 dark:shadow-[0_24px_48px_rgba(0,0,0,0.45)]"
        aria-label="Primary navigation"
        data-testid="primary-nav"
        data-ai-surface="primary-nav"
      >
        <span className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-gold/20" />
        {tabs.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            aria-label={tab.ariaLabel}
            title={tab.ariaLabel}
            data-testid={`nav-tab-${tab.id}`}
            className="group relative flex min-w-0 flex-1"
          >
            {({ isActive }) => (
              <span
                className={`relative flex w-full min-w-0 flex-col items-center justify-center gap-1.5 rounded-[22px] px-1.5 py-2.5 transition-all duration-300 ${
                  isActive
                    ? `${tab.accent.activeText}`
                    : 'text-ink/52 dark:text-dark-text/58 hover:text-ink/74 dark:hover:text-dark-text/78'
                }`}
              >
                <span
                  className={`absolute inset-0 rounded-[22px] transition-all duration-300 ${
                    isActive
                      ? tab.accent.tile
                      : 'bg-transparent'
                  }`}
                />
                <span
                  className={`relative flex h-10 w-10 items-center justify-center rounded-[18px] transition-all duration-300 ${
                    isActive
                      ? `${tab.accent.badge} scale-[1.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.48)]`
                      : 'border border-black/[0.04] bg-white/[0.18] group-hover:bg-white/[0.26] dark:border-white/[0.04] dark:bg-white/[0.06] dark:group-hover:bg-white/[0.09]'
                  }`}
                >
                  <tab.Glyph active={isActive} />
                </span>
                <span className={`relative truncate font-sans text-[10px] font-semibold tracking-[0.14em] uppercase transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-90'}`}>
                  {tab.label}
                </span>
                {isActive ? (
                  <span className={`absolute bottom-[5px] h-1 w-7 rounded-full bg-gradient-to-r ${tab.accent.pill} shadow-[0_0_18px_rgba(224,154,70,0.45)]`} />
                ) : null}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
