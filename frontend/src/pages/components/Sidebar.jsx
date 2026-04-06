import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, FileText, CreditCard, Users,
  Package, TrendingUp, Receipt, LogOut, X
} from 'lucide-react'

const borrowerNav = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/apply',      icon: FileText,        label: 'Apply for Loan' },
  { to: '/my-loans',   icon: Receipt,         label: 'My Loans' },
]

const adminNav = [
  { to: '/admin',             icon: LayoutDashboard, label: 'Dashboard'        },
  { to: '/admin/users',       icon: Users,           label: 'User Registry'    },
  { to: '/admin/inventory',   icon: Package,         label: 'Loan Inventory'   },
  { to: '/admin/interest',    icon: TrendingUp,      label: 'Interest Records' },
  { to: '/admin/payments',    icon: CreditCard,      label: 'All Payments'     },
]

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const nav = user?.role === 'admin' ? adminNav : borrowerNav

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <>
      {/* Overlay on mobile */}
      {open && <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={onClose} />}

      <aside className={`
        fixed top-0 left-0 z-30 h-full w-64 bg-primary-900 flex flex-col shadow-xl
        transform transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>
        {/* Brand */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-primary-800">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gold-500 flex items-center justify-center text-white font-bold text-lg">₱</div>
            <div>
              <div className="text-white font-bold leading-tight">LoanApp PH</div>
              <div className="text-primary-300 text-xs">{user?.role === 'admin' ? 'Admin Portal' : 'Borrower Portal'}</div>
            </div>
          </div>
          <button className="lg:hidden text-primary-300 hover:text-white" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* User info */}
        <div className="px-5 py-3 border-b border-primary-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary-700 flex items-center justify-center text-gold-400 font-bold text-sm">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-white text-sm font-medium truncate">{user?.name}</div>
              <div className="text-primary-300 text-xs truncate">{user?.email}</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/admin' || to === '/dashboard'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-primary-700 text-white font-medium'
                    : 'text-primary-200 hover:bg-primary-800 hover:text-white'
                }`
              }>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-primary-800">
          <button onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-primary-200 hover:bg-red-900/40 hover:text-red-300 transition-colors">
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  )
}
