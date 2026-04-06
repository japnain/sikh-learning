import { NavLink } from 'react-router-dom'
import { IconHome, IconLibrary, IconBanis, IconMore, IconStar } from './icons'
import { useLocaleStore } from '../store/locale'
import { getUiCopy } from '../utils/uiCopy'

export default function NavBar() {
  const locale = useLocaleStore(s => s.locale)
  const copy = getUiCopy(locale)
  const tabs = [
    { to: '/', label: copy.nav.home, Icon: IconHome },
    { to: '/banis', label: copy.nav.read, Icon: IconBanis },
    { to: '/learn', label: copy.nav.learn, Icon: IconStar },
    { to: '/library', label: copy.nav.saved, Icon: IconLibrary },
    { to: '/more', label: copy.nav.more, Icon: IconMore },
  ]

  return (
    <nav className="fixed bottom-3 left-3 right-3 max-w-md mx-auto section-shell-quiet px-2 py-2 flex justify-around items-center z-50 transition-colors duration-300">
      {tabs.map(tab => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            `relative flex flex-col items-center gap-1 px-2 py-2 rounded-2xl min-w-[58px] min-h-[52px] justify-center transition-all duration-300 ease-in-out active:scale-95 ${
              isActive
                ? 'text-gold-dark dark:text-gold-light bg-white/70 dark:bg-dark-card/70'
                : 'text-ink/35 dark:text-dark-text/35'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <tab.Icon size={19} className={`transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
              <span className="font-sans text-[10px] font-medium tracking-[0.12em] uppercase">{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-1 w-5 h-[2px] rounded-full bg-gold dark:bg-gold-light" />
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
