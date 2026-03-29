import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/library', label: 'Library', icon: '📚' },
  { to: '/study', label: 'Study', icon: '📖' },
  { to: '/banis', label: 'Banis', icon: '🙏' },
  { to: '/vocab', label: 'Vocab', icon: '💬' },
]

export default function NavBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-parchment/80 backdrop-blur-xl border-t border-sand/15 flex justify-around items-center h-16 px-2 z-50">
      {tabs.map(tab => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl min-w-[44px] min-h-[44px] justify-center transition-colors duration-300 ease-in-out ${
              isActive ? 'text-saffron' : 'text-ink/40'
            }`
          }
        >
          <span className="text-lg">{tab.icon}</span>
          <span className="font-sans text-[10px]">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
