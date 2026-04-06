import { Menu, Bell } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function Navbar({ onMenuClick }) {
  const { user } = useAuth()
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3 sticky top-0 z-10">
      <button onClick={onMenuClick} className="lg:hidden text-gray-500 hover:text-gray-700">
        <Menu size={22} />
      </button>
      <div className="flex-1" />
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <div className="text-sm font-medium text-gray-800">{user?.name}</div>
          <div className="text-xs text-gray-400 capitalize">{user?.role}</div>
        </div>
        <div className="w-8 h-8 rounded-full bg-primary-900 flex items-center justify-center text-gold-400 font-bold text-sm">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  )
}
