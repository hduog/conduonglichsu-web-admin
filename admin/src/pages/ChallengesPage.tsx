import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { supabase } from '@/lib/supabase'
import type { ChallengeWithRelations, Challenge, ChallengeType, ChallengeStatus } from '@/types/database'
import { DataTable } from '@/components/shared/DataTable'
import { Pagination } from '@/components/shared/Pagination'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Badge } from '@/components/shared/Badge'
import { ChallengeForm } from '@/components/challenges/ChallengeForm'
import { formatDateTime } from '@/lib/utils'
import { Search, Plus, Pencil, Trash2, Users } from 'lucide-react'

const PAGE_SIZE = 20

const typeLabel: Record<ChallengeType, string> = {
  checkin: 'Check-in', quiz: 'Câu đố'
}

function getChallengeStatus(c: Challenge): ChallengeStatus {
  const now = new Date()
  if (c.end_at && new Date(c.end_at) < now) return 'ended'
  if (c.start_at && new Date(c.start_at) > now) return 'upcoming'
  return 'active'
}

const statusVariant: Record<ChallengeStatus, 'success' | 'warning' | 'default'> = {
  active: 'success', upcoming: 'warning', ended: 'default'
}
const statusLabel: Record<ChallengeStatus, string> = {
  active: 'Đang diễn ra', upcoming: 'Sắp diễn ra', ended: 'Đã kết thúc'
}

export function ChallengesPage() {
  const [challenges, setChallenges] = useState<ChallengeWithRelations[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Challenge | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Challenge | null>(null)

  async function fetchChallenges() {
    setLoading(true)
    let query = supabase
      .from('challenges')
      .select('*, heroes(id, full_name), badges(id, name, rarity)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

    if (search) query = query.ilike('title', `%${search}%`)

    const { data, count } = await query
    setChallenges((data as ChallengeWithRelations[]) ?? [])
    setTotal(count ?? 0)
    setLoading(false)
  }

  useEffect(() => { fetchChallenges() }, [page, search])

  async function handleDelete() {
    if (!deleteTarget) return
    await supabase.from('challenges').delete().eq('id', deleteTarget.id)
    setDeleteTarget(null)
    fetchChallenges()
  }

  const columns: ColumnDef<ChallengeWithRelations>[] = [
    {
      accessorKey: 'title',
      header: 'Tiêu đề',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-gray-900">{row.original.title}</p>
          {row.original.heroes && <p className="text-xs text-gray-400">{row.original.heroes.full_name}</p>}
        </div>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Loại',
      cell: ({ getValue }) => <Badge variant="info">{typeLabel[getValue() as ChallengeType]}</Badge>,
    },
    {
      id: 'status',
      header: 'Trạng thái',
      cell: ({ row }) => {
        const s = getChallengeStatus(row.original)
        return <Badge variant={statusVariant[s]}>{statusLabel[s]}</Badge>
      },
    },
    {
      accessorKey: 'start_at',
      header: 'Bắt đầu',
      cell: ({ getValue }) => formatDateTime(getValue() as string),
    },
    {
      accessorKey: 'participant_count',
      header: 'Người tham gia',
      cell: ({ getValue }) => (
        <span className="font-mono text-gray-600">{String(getValue())}</span>
      ),
    },
    {
      accessorKey: 'reward_points',
      header: 'Điểm thưởng',
      cell: ({ getValue }) => `+${String(getValue())} điểm`,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Link to={`/challenges/${row.original.id}/submissions`}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600 transition-colors" title="Bài nộp">
            <Users className="h-4 w-4" />
          </Link>
          <button onClick={() => { setEditTarget(row.original); setFormOpen(true) }}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-amber-600 transition-colors">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={() => setDeleteTarget(row.original)}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600 transition-colors">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Thử thách"
        description={`${total} thử thách`}
        action={
          <button onClick={() => { setEditTarget(null); setFormOpen(true) }}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" /> Thêm thử thách
          </button>
        }
      />

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Tìm theo tiêu đề..." className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
        </div>
      </div>

      <DataTable columns={columns} data={challenges} loading={loading} />
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />

      {formOpen && (
        <ChallengeForm
          challenge={editTarget}
          onClose={() => setFormOpen(false)}
          onSaved={() => { setFormOpen(false); fetchChallenges() }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa thử thách"
        description={`Xóa thử thách "${deleteTarget?.title}"?`}
        confirmLabel="Xóa" danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
