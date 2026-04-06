import { useEffect, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { supabase } from '@/lib/supabase'
import type { Notification, NotificationType } from '@/types/database'
import { DataTable } from '@/components/shared/DataTable'
import { Pagination } from '@/components/shared/Pagination'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Badge } from '@/components/shared/Badge'
import { NotificationForm } from '@/components/notifications/NotificationForm'
import { formatDateTime } from '@/lib/utils'
import { Plus, Trash2, CheckCircle, XCircle } from 'lucide-react'

const PAGE_SIZE = 20

const typeVariant: Record<NotificationType, 'warning' | 'info' | 'purple' | 'success' | 'default' | 'danger'> = {
  badge: 'warning', challenge: 'info', hero: 'purple',
  community: 'success', location: 'default', system: 'danger'
}

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Notification | null>(null)

  async function fetchNotifications() {
    setLoading(true)
    const { data, count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

    setNotifications((data as Notification[]) ?? [])
    setTotal(count ?? 0)
    setLoading(false)
  }

  useEffect(() => { fetchNotifications() }, [page])

  async function handleDelete() {
    if (!deleteTarget) return
    await supabase.from('notifications').delete().eq('id', deleteTarget.id)
    setDeleteTarget(null)
    fetchNotifications()
  }

  const columns: ColumnDef<Notification>[] = [
    {
      accessorKey: 'title',
      header: 'Thông báo',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-gray-900">{row.original.title}</p>
          {row.original.body && <p className="text-xs text-gray-400 line-clamp-1">{row.original.body}</p>}
        </div>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Loại',
      cell: ({ getValue }) => {
        const v = getValue() as NotificationType
        return <Badge variant={typeVariant[v]}>{v}</Badge>
      },
    },
    {
      accessorKey: 'is_read',
      header: 'Đã đọc',
      cell: ({ getValue }) =>
        getValue() ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
          <XCircle className="h-4 w-4 text-gray-300" />
        ),
    },
    {
      accessorKey: 'created_at',
      header: 'Gửi lúc',
      cell: ({ getValue }) => formatDateTime(getValue() as string),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <button onClick={() => setDeleteTarget(row.original)}
          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600 transition-colors">
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Thông báo"
        description={`${total} thông báo`}
        action={
          <button onClick={() => setFormOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" /> Gửi thông báo
          </button>
        }
      />

      <DataTable columns={columns} data={notifications} loading={loading} />
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />

      {formOpen && (
        <NotificationForm
          onClose={() => setFormOpen(false)}
          onSaved={() => { setFormOpen(false); fetchNotifications() }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa thông báo"
        description="Xóa thông báo này?"
        confirmLabel="Xóa" danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
