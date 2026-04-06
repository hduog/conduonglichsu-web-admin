import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { supabase } from '@/lib/supabase'
import type { Hero, HeroEra, HeroCategory } from '@/types/database'
import { DataTable } from '@/components/shared/DataTable'
import { Pagination } from '@/components/shared/Pagination'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Badge } from '@/components/shared/Badge'
import { HeroForm } from '@/components/heroes/HeroForm'
import { Search, Plus, Pencil, Trash2, CalendarDays } from 'lucide-react'

const PAGE_SIZE = 20

const eraLabel: Record<HeroEra, string> = {
  ancient: 'Cổ đại', medieval: 'Trung đại', modern: 'Cận đại', contemporary: 'Hiện đại'
}

const categoryLabel: Record<HeroCategory, string> = {
  military: 'Quân sự', political: 'Chính trị', cultural: 'Văn hóa',
  scientific: 'Khoa học', other: 'Khác'
}

export function HeroesPage() {
  const [heroes, setHeroes] = useState<Hero[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Hero | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Hero | null>(null)

  async function fetchHeroes() {
    setLoading(true)
    let query = supabase
      .from('heroes')
      .select('*', { count: 'exact' })
      .order('full_name')
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

    if (search) query = query.ilike('full_name', `%${search}%`)

    const { data, count } = await query
    setHeroes((data as Hero[]) ?? [])
    setTotal(count ?? 0)
    setLoading(false)
  }

  useEffect(() => { fetchHeroes() }, [page, search])

  async function handleDelete() {
    if (!deleteTarget) return
    await supabase.from('heroes').delete().eq('id', deleteTarget.id)
    setDeleteTarget(null)
    fetchHeroes()
  }

  function openCreate() { setEditTarget(null); setFormOpen(true) }
  function openEdit(hero: Hero) { setEditTarget(hero); setFormOpen(true) }

  const columns: ColumnDef<Hero>[] = [
    {
      accessorKey: 'full_name',
      header: 'Tên nhân vật',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-gray-900">{row.original.full_name}</p>
          {row.original.alias_name && (
            <p className="text-xs text-gray-400">{row.original.alias_name}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'era',
      header: 'Thời đại',
      cell: ({ getValue }) => {
        const v = getValue() as HeroEra | null
        return v ? <Badge variant="info">{eraLabel[v]}</Badge> : '—'
      },
    },
    {
      accessorKey: 'category',
      header: 'Lĩnh vực',
      cell: ({ getValue }) => {
        const v = getValue() as HeroCategory | null
        return v ? <Badge variant="default">{categoryLabel[v]}</Badge> : '—'
      },
    },
    {
      accessorKey: 'birth_year',
      header: 'Năm sinh – mất',
      cell: ({ row }) =>
        `${row.original.birth_year ?? '?'} – ${row.original.death_year ?? '?'}`,
    },
    {
      accessorKey: 'province',
      header: 'Tỉnh/Thành',
      cell: ({ getValue }) => (getValue() as string | null) ?? '—',
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Link
            to={`/heroes/${row.original.id}/events`}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600 transition-colors"
            title="Sự kiện"
          >
            <CalendarDays className="h-4 w-4" />
          </Link>
          <button
            onClick={() => openEdit(row.original)}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-amber-600 transition-colors"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => setDeleteTarget(row.original)}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Nhân vật lịch sử"
        description={`${total} nhân vật`}
        action={
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Thêm nhân vật
          </button>
        }
      />

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Tìm theo tên..."
            className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <DataTable columns={columns} data={heroes} loading={loading} />
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />

      {formOpen && (
        <HeroForm
          hero={editTarget}
          onClose={() => setFormOpen(false)}
          onSaved={() => { setFormOpen(false); fetchHeroes() }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa nhân vật"
        description={`Bạn có chắc muốn xóa "${deleteTarget?.full_name}"? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
