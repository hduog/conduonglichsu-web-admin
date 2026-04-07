import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { supabase } from '@/lib/supabase'
import type { Hero, HeroEvent, EventType } from '@/types/database'
import { DataTable } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Badge } from '@/components/shared/Badge'
import { HeroEventForm } from '@/components/heroes/HeroEventForm'
import { Plus, Pencil, Trash2, ArrowLeft } from 'lucide-react'

const eventTypeLabel: Record<EventType, string> = {
  birth: 'Sinh', battle: 'Chiến trận', achievement: 'Thành tựu', death: 'Mất', other: 'Khác'
}
const eventTypeVariant: Record<EventType, 'success' | 'danger' | 'info' | 'warning' | 'default'> = {
  birth: 'success', battle: 'danger', achievement: 'info', death: 'default', other: 'warning'
}

export function HeroEventsPage() {
  const { id } = useParams<{ id: string }>()
  const [hero, setHero] = useState<Hero | null>(null)
  const [events, setEvents] = useState<HeroEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<HeroEvent | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<HeroEvent | null>(null)

  async function fetchData() {
    setLoading(true)
    const [{ data: heroData }, { data: eventsData }] = await Promise.all([
      supabase.from('heroes').select('*').eq('id', id!).single(),
      supabase.from('hero_events').select('*').eq('hero_id', id!).order('year'),
    ])
    setHero((heroData ?? null) as Hero | null)
    setEvents((eventsData as HeroEvent[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { fetchData() }, [id])

  async function handleDelete() {
    if (!deleteTarget) return
    await supabase.from('hero_events').delete().eq('id', deleteTarget.id)
    setDeleteTarget(null)
    fetchData()
  }

  const columns: ColumnDef<HeroEvent>[] = [
    { accessorKey: 'year', header: 'Năm' },
    {
      accessorKey: 'event_type',
      header: 'Loại',
      cell: ({ getValue }) => {
        const v = getValue() as EventType
        return <Badge variant={eventTypeVariant[v]}>{eventTypeLabel[v]}</Badge>
      },
    },
    { accessorKey: 'title', header: 'Tiêu đề' },
    { accessorKey: 'description', header: 'Mô tả', cell: ({ getValue }) => (
      <span className="line-clamp-2 max-w-xs text-xs text-gray-500">{getValue() as string}</span>
    )},
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
      <div className="mb-4">
        <Link to="/heroes" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Quay lại nhân vật
        </Link>
      </div>
      <PageHeader
        title={`Sự kiện: ${hero?.full_name ?? '...'}`}
        description={`${events.length} sự kiện`}
        action={
          <button onClick={() => { setEditTarget(null); setFormOpen(true) }}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" /> Thêm sự kiện
          </button>
        }
      />

      <DataTable columns={columns} data={events} loading={loading} />

      {formOpen && (
        <HeroEventForm
          heroId={id!}
          event={editTarget}
          onClose={() => setFormOpen(false)}
          onSaved={() => { setFormOpen(false); fetchData() }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa sự kiện"
        description={`Xóa sự kiện "${deleteTarget?.title}"?`}
        confirmLabel="Xóa"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
