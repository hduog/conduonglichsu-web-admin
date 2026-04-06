import { useEffect, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { supabase } from '@/lib/supabase'
import type { Badge as BadgeType, BadgeRarity } from '@/types/database'
import { DataTable } from '@/components/shared/DataTable'
import { Pagination } from '@/components/shared/Pagination'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Badge } from '@/components/shared/Badge'
import { BadgeForm } from '@/components/badges/BadgeForm'
import { Plus, Pencil, Trash2 } from 'lucide-react'

const PAGE_SIZE = 20

const rarityVariant: Record<BadgeRarity, 'default' | 'info' | 'purple' | 'warning'> = {
  common: 'default', rare: 'info', epic: 'purple', legendary: 'warning'
}
const rarityLabel: Record<BadgeRarity, string> = {
  common: 'Phổ thông', rare: 'Hiếm', epic: 'Sử thi', legendary: 'Huyền thoại'
}

export function BadgesPage() {
  const [badges, setBadges] = useState<BadgeType[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<BadgeType | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<BadgeType | null>(null)

  async function fetchBadges() {
    setLoading(true)
    const { data, count } = await supabase
      .from('badges')
      .select('*', { count: 'exact' })
      .order('rarity')
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

    setBadges((data as BadgeType[]) ?? [])
    setTotal(count ?? 0)
    setLoading(false)
  }

  useEffect(() => { fetchBadges() }, [page])

  async function handleDelete() {
    if (!deleteTarget) return
    await supabase.from('badges').delete().eq('id', deleteTarget.id)
    setDeleteTarget(null)
    fetchBadges()
  }

  const columns: ColumnDef<BadgeType>[] = [
    {
      accessorKey: 'name',
      header: 'Tên huy hiệu',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          {row.original.image_url && (
            <img src={row.original.image_url} alt="" className="h-8 w-8 rounded-full object-cover" />
          )}
          <div>
            <p className="font-medium text-gray-900">{row.original.name}</p>
            <p className="text-xs text-gray-400 font-mono">{row.original.code}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'rarity',
      header: 'Độ hiếm',
      cell: ({ getValue }) => {
        const v = getValue() as BadgeRarity
        return <Badge variant={rarityVariant[v]}>{rarityLabel[v]}</Badge>
      },
    },
    {
      accessorKey: 'description',
      header: 'Mô tả',
      cell: ({ getValue }) => (
        <span className="text-sm text-gray-500 line-clamp-2">{(getValue() as string | null) ?? '—'}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex gap-1">
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
        title="Huy hiệu"
        description={`${total} huy hiệu`}
        action={
          <button onClick={() => { setEditTarget(null); setFormOpen(true) }}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" /> Thêm huy hiệu
          </button>
        }
      />

      <DataTable columns={columns} data={badges} loading={loading} />
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />

      {formOpen && (
        <BadgeForm
          badge={editTarget}
          onClose={() => setFormOpen(false)}
          onSaved={() => { setFormOpen(false); fetchBadges() }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa huy hiệu"
        description={`Xóa huy hiệu "${deleteTarget?.name}"?`}
        confirmLabel="Xóa" danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
