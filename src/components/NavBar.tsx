import { NavLink } from 'react-router-dom'
import { IconHome, IconLibrary, IconBanis, IconMore } from './icons'

const tabs = [
  { to: '/', label: 'Home', Icon: IconHome },
  { to: '/library', label: 'Library', Icon: IconLibrary },
  { to: '/banis', label: 'Banis', Icon: IconBanis },
  { to: '/more', label: 'More', Icon: IconMore },
]

export default function NavBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-parchment/80 dark:bg-dark-bg/80 backdrop-blur-xl border-t border-sand/15 dark:border-gold/10 flex justify-around items-center h-16 px-2 z-50 transition-colors duration-300">
      {tabs.map(tab => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl min-w-[44px] min-h-[44px] justify-center transition-all duration-300 ease-in-out active:scale-95 ${
              isActive ? 'text-gold dark:text-gold-light' : 'text-ink/35 dark:text-dark-text/35'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <tab.Icon size={20} className={`transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
              <span className="font-sans text-[10px] font-medium">{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-gold dark:bg-gold-light" />
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
