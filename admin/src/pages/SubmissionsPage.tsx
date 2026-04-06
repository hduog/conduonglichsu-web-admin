import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { supabase } from '@/lib/supabase'
import type { SubmissionWithUser, Challenge, SubmissionStatus } from '@/types/database'
import { DataTable } from '@/components/shared/DataTable'
import { Pagination } from '@/components/shared/Pagination'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Badge } from '@/components/shared/Badge'
import { formatDateTime } from '@/lib/utils'
import { ArrowLeft, CheckCircle, XCircle, ExternalLink } from 'lucide-react'

const PAGE_SIZE = 20

const statusVariant: Record<SubmissionStatus, 'warning' | 'success' | 'danger'> = {
  pending: 'warning', approved: 'success', rejected: 'danger'
}
const statusLabel: Record<SubmissionStatus, string> = {
  pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối'
}

export function SubmissionsPage() {
  const { id } = useParams<{ id: string }>()
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [submissions, setSubmissions] = useState<SubmissionWithUser[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: 'approved' | 'rejected' } | null>(null)

  async function fetchData() {
    setLoading(true)
    const [{ data: chal }, { data: subs, count }] = await Promise.all([
      supabase.from('challenges').select('*').eq('id', id!).single(),
      supabase.from('challenge_submissions')
        .select('*, users(id, full_name, avatar_url, email)', { count: 'exact' })
        .eq('challenge_id', id!)
        .order('submitted_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    ])
    setChallenge((chal ?? null) as Challenge | null)
    setSubmissions((subs as SubmissionWithUser[]) ?? [])
    setTotal(count ?? 0)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [id, page])

  async function handleAction() {
    if (!confirmAction) return
    await supabase.from('challenge_submissions')
      .update({ status: confirmAction.action, reviewed_at: new Date().toISOString() })
      .eq('id', confirmAction.id)

    if (confirmAction.action === 'approved' && challenge) {
      const sub = submissions.find((s) => s.id === confirmAction.id)
      if (sub) {
        // Optionally call a Supabase RPC to award points — requires a DB function
        try {
          await supabase.rpc('add_user_points', {
            p_user_id: sub.user_id, p_points: challenge.reward_points
          })
        } catch {
          // RPC may not exist yet; points can be awarded via DB trigger instead
        }
      }
    }

    setConfirmAction(null)
    fetchData()
  }

  const columns: ColumnDef<SubmissionWithUser>[] = [
    {
      id: 'user',
      header: 'Người dùng',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-gray-900">{row.original.users?.full_name ?? '—'}</p>
          <p className="text-xs text-gray-400">{row.original.users?.email}</p>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Trạng thái',
      cell: ({ getValue }) => {
        const v = getValue() as SubmissionStatus
        return <Badge variant={statusVariant[v]}>{statusLabel[v]}</Badge>
      },
    },
    {
      accessorKey: 'distance_meters',
      header: 'Khoảng cách',
      cell: ({ getValue }) => {
        const v = getValue() as number | null
        return v != null ? `${v.toFixed(0)} m` : '—'
      },
    },
    {
      accessorKey: 'photo_url',
      header: 'Ảnh',
      cell: ({ getValue }) => {
        const url = getValue() as string | null
        return url ? (
          <a href={url} target="_blank" rel="noreferrer"
            className="flex items-center gap-1 text-blue-600 hover:underline text-xs">
            Xem ảnh <ExternalLink className="h-3 w-3" />
          </a>
        ) : '—'
      },
    },
    {
      accessorKey: 'submitted_at',
      header: 'Nộp lúc',
      cell: ({ getValue }) => formatDateTime(getValue() as string),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) =>
        row.original.status === 'pending' ? (
          <div className="flex gap-1">
            <button onClick={() => setConfirmAction({ id: row.original.id, action: 'approved' })}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50 transition-colors">
              <CheckCircle className="h-3.5 w-3.5" /> Duyệt
            </button>
            <button onClick={() => setConfirmAction({ id: row.original.id, action: 'rejected' })}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 transition-colors">
              <XCircle className="h-3.5 w-3.5" /> Từ chối
            </button>
          </div>
        ) : null,
    },
  ]

  return (
    <div>
      <div className="mb-4">
        <Link to="/challenges" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Quay lại thử thách
        </Link>
      </div>
      <PageHeader
        title={`Bài nộp: ${challenge?.title ?? '...'}`}
        description={`${total} bài nộp`}
      />

      <DataTable columns={columns} data={submissions} loading={loading} />
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />

      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.action === 'approved' ? 'Duyệt bài nộp' : 'Từ chối bài nộp'}
        description={
          confirmAction?.action === 'approved'
            ? 'Xác nhận duyệt bài nộp này? Người dùng sẽ nhận điểm thưởng.'
            : 'Từ chối bài nộp này?'
        }
        confirmLabel={confirmAction?.action === 'approved' ? 'Duyệt' : 'Từ chối'}
        danger={confirmAction?.action === 'rejected'}
        onConfirm={handleAction}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  )
}
