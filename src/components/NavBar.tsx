import { NavLink } from 'react-router-dom'
import { useLocaleStore } from '../store/locale'
import { getUiCopy } from '../utils/uiCopy'

type NavGlyphProps = {
  active: boolean
}

function HomeGlyph({ active }: NavGlyphProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="overflow-visible" aria-hidden="true">
      <path d="M12 3.5c0 0-2.7 2.7-2.7 4.5a2.7 2.7 0 0 0 5.4 0c0-1.8-2.7-4.5-2.7-4.5Z" fill="currentColor" opacity={active ? 0.95 : 0.28} />
      <path d="M4.5 20.25v-7.9L12 6.9l7.5 5.45v7.9" stroke="currentColor" strokeWidth={active ? 1.8 : 1.6} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.6 20.25V15.7a3.4 3.4 0 0 1 6.8 0v4.55" stroke="currentColor" strokeWidth={active ? 1.8 : 1.6} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 20.25h16" stroke="currentColor" strokeWidth={active ? 1.8 : 1.6} strokeLinecap="round" />
    </svg>
  )
}

function ReadGlyph({ active }: NavGlyphProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="overflow-visible" aria-hidden="true">
      <path d="M4.5 6.4c1.5-1 3.1-1.5 4.8-1.5 1.7 0 3.4.5 4.7 1.5v11.95c-1.35-.85-2.97-1.28-4.7-1.28-1.78 0-3.4.45-4.8 1.35V6.4Z" stroke="currentColor" strokeWidth={active ? 1.8 : 1.6} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19.5 6.4c-1.5-1-3.1-1.5-4.8-1.5-1.7 0-3.34.5-4.7 1.5v11.95c1.32-.85 2.97-1.28 4.7-1.28 1.78 0 3.4.45 4.8 1.35V6.4Z" stroke="currentColor" strokeWidth={active ? 1.8 : 1.6} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 7.25v9.55" stroke="currentColor" strokeWidth={active ? 1.8 : 1.6} strokeLinecap="round" />
      <path d="M7 9.1h2.45M14.55 9.1H17M7 12.2h1.65M15.35 12.2H17" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity={active ? 0.8 : 0.45} />
    </svg>
  )
}

function LearnGlyph({ active }: NavGlyphProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="overflow-visible" aria-hidden="true">
      <path d="M12 3.3 13.9 7l4.1.58-2.96 2.9.7 4.12L12 12.7l-3.74 1.9.7-4.12L6 7.58 10.1 7 12 3.3Z" fill="currentColor" opacity={active ? 0.18 : 0.08} />
      <path d="M12 3.3 13.9 7l4.1.58-2.96 2.9.7 4.12L12 12.7l-3.74 1.9.7-4.12L6 7.58 10.1 7 12 3.3Z" stroke="currentColor" strokeWidth={active ? 1.8 : 1.6} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 14.9v5.8M9.2 17.5h5.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity={active ? 0.95 : 0.55} />
    </svg>
  )
}

function SavedGlyph({ active }: NavGlyphProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="overflow-visible" aria-hidden="true">
      <path d="M7 4.6h10a1.7 1.7 0 0 1 1.7 1.7v12.95l-6.7-3.55-6.7 3.55V6.3A1.7 1.7 0 0 1 7 4.6Z" stroke="currentColor" strokeWidth={active ? 1.8 : 1.6} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.2 8.2h5.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity={active ? 0.75 : 0.4} />
      <path d="M12 15.7V4.95" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" opacity={active ? 0.75 : 0.35} />
    </svg>
  )
}

function MoreGlyph({ active }: NavGlyphProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="overflow-visible" aria-hidden="true">
      <circle cx="12" cy="12" r="3.4" fill="currentColor" opacity={active ? 0.18 : 0.08} />
      <circle cx="12" cy="12" r="3.4" stroke="currentColor" strokeWidth={active ? 1.8 : 1.6} />
      <path d="M12 2.9v2.35M12 18.75v2.35M5.25 5.25l1.65 1.65M17.1 17.1l1.65 1.65M2.9 12h2.35M18.75 12h2.35M5.25 18.75l1.65-1.65M17.1 6.9l1.65-1.65" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" opacity={active ? 0.95 : 0.55} />
    </svg>
  )
}

export default function NavBar() {
  const locale = useLocaleStore(s => s.locale)
  const copy = getUiCopy(locale)
  const tabs = [
    { to: '/', label: copy.nav.home, Glyph: HomeGlyph },
    { to: '/banis', label: copy.nav.read, Glyph: ReadGlyph },
    { to: '/learn', label: copy.nav.learn, Glyph: LearnGlyph },
    { to: '/library', label: copy.nav.saved, Glyph: SavedGlyph },
    { to: '/more', label: copy.nav.more, Glyph: MoreGlyph },
  ]

  return (
    <nav className="fixed bottom-3 left-1/2 z-50 flex w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 items-center rounded-[30px] border border-white/55 bg-parchment-card/88 px-2 py-2 shadow-[0_18px_38px_rgba(77,53,22,0.14)] backdrop-blur-xl transition-colors duration-300 dark:border-gold/10 dark:bg-dark-card/88 dark:shadow-[0_22px_44px_rgba(0,0,0,0.45)]">
      <span className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-gold/20" />
      {tabs.map(tab => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className="group relative flex min-w-0 flex-1"
        >
          {({ isActive }) => (
            <span
              className={`relative flex w-full min-w-0 flex-col items-center justify-center gap-1.5 rounded-[22px] px-1.5 py-2.5 transition-all duration-300 ${
                isActive
                  ? 'text-saffron dark:text-gold-light'
                  : 'text-ink/38 dark:text-dark-text/38 hover:text-ink/62 dark:hover:text-dark-text/62'
              }`}
            >
              <span
                className={`absolute inset-0 rounded-[22px] transition-all duration-300 ${
                  isActive
                    ? 'bg-white/84 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_26px_rgba(224,154,70,0.16)] dark:bg-dark-surface/88 dark:shadow-[inset_0_1px_0_rgba(255,214,153,0.08),0_14px_28px_rgba(0,0,0,0.28)]'
                    : 'bg-transparent'
                }`}
              />
              <span
                className={`relative flex h-9 w-9 items-center justify-center rounded-2xl transition-all duration-300 ${
                  isActive
                    ? 'bg-gradient-to-br from-saffron/16 to-saffron-light/18 dark:from-gold/18 dark:to-saffron/12 scale-105'
                    : 'bg-transparent group-hover:bg-black/[0.03] dark:group-hover:bg-white/[0.03]'
                }`}
              >
                <tab.Glyph active={isActive} />
              </span>
              <span className={`relative truncate font-sans text-[10px] font-semibold tracking-[0.14em] uppercase transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-72'}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-[5px] h-1 w-7 rounded-full bg-gradient-to-r from-saffron to-saffron-light dark:from-gold dark:to-saffron shadow-[0_0_18px_rgba(224,154,70,0.45)]" />
              )}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
