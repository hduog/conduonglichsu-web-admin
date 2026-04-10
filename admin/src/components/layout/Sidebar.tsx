import { NavLink } from 'react-router-dom'
import {
  Users, BookOpen, MapPin, Trophy, FileText,
  Award, Bell, LayoutDashboard, ChevronRight, Star, HelpCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Tổng quan' },
  { to: '/users', icon: Users, label: 'Người dùng' },
  { to: '/heroes', icon: BookOpen, label: 'Nhân vật lịch sử' },
  { to: '/streets', icon: MapPin, label: 'Con đường' },
  { to: '/challenges', icon: Trophy, label: 'Thử thách' },
  { to: '/questions', icon: HelpCircle, label: 'Ngân hàng câu hỏi' },
  { to: '/posts', icon: FileText, label: 'Bài đăng' },
  { to: '/badges', icon: Award, label: 'Huy hiệu' },
  { to: '/notifications', icon: Bell, label: 'Thông báo' },
]

export function Sidebar() {
  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-white">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Star className="h-6 w-6 text-amber-500" />
        <span className="font-semibold text-gray-900">Con Đường Lịch Sử</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{label}</span>
            <ChevronRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-50" />
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
