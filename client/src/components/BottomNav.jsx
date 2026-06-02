import { NavLink } from 'react-router-dom'
import { Home, ArrowUpRight, QrCode, Clock, Wallet } from 'lucide-react'

const NAV = [
  { to: '/',        icon: Home,          label: 'Home' },
  { to: '/send',    icon: ArrowUpRight,  label: 'Send' },
  { to: '/qr',      icon: QrCode,        label: 'QR' },
  { to: '/history', icon: Clock,         label: 'History' },
  { to: '/wallet',  icon: Wallet,        label: 'Wallet' },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {NAV.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <Icon size={22} strokeWidth={1.8} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
