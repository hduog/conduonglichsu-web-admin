import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { StatCard } from '@/components/shared/StatCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { Users, BookOpen, MapPin, Trophy, FileText, Clock } from 'lucide-react'

interface Stats {
  users: number
  heroes: number
  streets: number
  activeChallenges: number
  pendingSubmissions: number
  postsThisWeek: number
}

export function HomePage() {
  const [stats, setStats] = useState<Stats>({
    users: 0, heroes: 0, streets: 0,
    activeChallenges: 0, pendingSubmissions: 0, postsThisWeek: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      const now = new Date().toISOString()
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const [
        { count: users },
        { count: heroes },
        { count: streets },
        { count: activeChallenges },
        { count: pendingSubmissions },
        { count: postsThisWeek },
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('heroes').select('*', { count: 'exact', head: true }),
        supabase.from('streets').select('*', { count: 'exact', head: true }),
        supabase.from('challenges').select('*', { count: 'exact', head: true })
          .lte('start_at', now).gte('end_at', now),
        supabase.from('challenge_submissions').select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase.from('posts').select('*', { count: 'exact', head: true })
          .gte('created_at', weekAgo),
      ])

      setStats({
        users: users ?? 0,
        heroes: heroes ?? 0,
        streets: streets ?? 0,
        activeChallenges: activeChallenges ?? 0,
        pendingSubmissions: pendingSubmissions ?? 0,
        postsThisWeek: postsThisWeek ?? 0,
      })
      setLoading(false)
    }
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Tổng quan"
        description="Thống kê nhanh về hệ thống Con Đường Lịch Sử"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Người dùng" value={stats.users} icon={Users} color="text-blue-600" />
        <StatCard title="Nhân vật lịch sử" value={stats.heroes} icon={BookOpen} color="text-amber-600" />
        <StatCard title="Con đường" value={stats.streets} icon={MapPin} color="text-green-600" />
        <StatCard
          title="Thử thách đang diễn ra"
          value={stats.activeChallenges}
          icon={Trophy}
          color="text-purple-600"
        />
        <StatCard
          title="Bài nộp chờ duyệt"
          value={stats.pendingSubmissions}
          icon={Clock}
          color="text-red-600"
          sub={stats.pendingSubmissions > 0 ? 'Cần xem xét' : undefined}
        />
        <StatCard
          title="Bài đăng tuần này"
          value={stats.postsThisWeek}
          icon={FileText}
          color="text-indigo-600"
        />
      </div>
    </div>
  )
}
