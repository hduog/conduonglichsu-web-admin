import { useEffect, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { supabase } from '@/lib/supabase'
import type { StreetWithHero, Street } from '@/types/database'
import { DataTable } from '@/components/shared/DataTable'
import { Pagination } from '@/components/shared/Pagination'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { StreetForm } from '@/components/streets/StreetForm'
import { Search, Plus, Pencil, Trash2, MapPin } from 'lucide-react'

const PAGE_SIZE = 20

export function StreetsPage() {
  const [streets, setStreets] = useState<StreetWithHero[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Street | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Street | null>(null)

  async function fetchStreets() {
    setLoading(true)
    let query = supabase
      .from('streets')
      .select('*, heroes(id, full_name)', { count: 'exact' })
      .order('name')
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

    if (search) query = query.ilike('name', `%${search}%`)

    const { data, count } = await query
    setStreets((data as StreetWithHero[]) ?? [])
    setTotal(count ?? 0)
    setLoading(false)
  }

  useEffect(() => { fetchStreets() }, [page, search])

  async function handleDelete() {
    if (!deleteTarget) return
    await supabase.from('streets').delete().eq('id', deleteTarget.id)
    setDeleteTarget(null)
    fetchStreets()
  }

  const columns: ColumnDef<StreetWithHero>[] = [
    {
      accessorKey: 'name',
      header: 'Tên đường',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
          <span className="font-medium text-gray-900">{row.original.name}</span>
        </div>
      ),
    },
    {
      id: 'hero',
      header: 'Nhân vật',
      cell: ({ row }) => row.original.heroes?.full_name ?? '—',
    },
    { accessorKey: 'province', header: 'Tỉnh/Thành', cell: ({ getValue }) => (getValue() as string | null) ?? '—' },
    {
      id: 'coords',
      header: 'Tọa độ',
      cell: ({ row }) =>
        row.original.lat && row.original.lng
          ? `${row.original.lat.toFixed(5)}, ${row.original.lng.toFixed(5)}`
          : '—',
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
        title="Con đường"
        description={`${total} con đường`}
        action={
          <button onClick={() => { setEditTarget(null); setFormOpen(true) }}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" /> Thêm đường
          </button>
        }
      />

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Tìm theo tên đường..." className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
        </div>
      </div>

      <DataTable columns={columns} data={streets} loading={loading} />
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />

      {formOpen && (
        <StreetForm
          street={editTarget}
          onClose={() => setFormOpen(false)}
          onSaved={() => { setFormOpen(false); fetchStreets() }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa con đường"
        description={`Xóa đường "${deleteTarget?.name}"?`}
        confirmLabel="Xóa" danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
