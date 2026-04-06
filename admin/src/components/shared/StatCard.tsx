import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  color?: string
  sub?: string
}

export function StatCard({ title, value, icon: Icon, color = 'text-blue-600', sub }: StatCardProps) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
          {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
        </div>
        <div className={`rounded-lg bg-gray-50 p-3 ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  )
}
