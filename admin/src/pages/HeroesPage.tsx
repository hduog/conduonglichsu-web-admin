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
import { Search, Plus, Pencil, Trash2, CalendarDays, Upload, Download } from 'lucide-react'

const CSV_HEADERS = [
  'id', 'full_name', 'alias_name', 'birth_year', 'death_year',
  'province', 'era', 'category', 'bio_short', 'bio_full',
  'avatar_url', 'quote', 'created_at', 'updated_at',
]

function escapeCsvValue(val: unknown): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function heroesToCsv(data: Hero[]): string {
  const rows = data.map(h =>
    CSV_HEADERS.map(k => escapeCsvValue(h[k as keyof Hero])).join(',')
  )
  return [CSV_HEADERS.join(','), ...rows].join('\n')
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let cur = ''
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuote) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++ }
      else if (ch === '"') inQuote = false
      else cur += ch
    } else {
      if (ch === '"') inQuote = true
      else if (ch === ',') { result.push(cur); cur = '' }
      else cur += ch
    }
  }
  result.push(cur)
  return result
}

function csvToHeroes(text: string): Partial<Hero>[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = parseCsvLine(lines[0])
  return lines.slice(1).map(line => {
    const vals = parseCsvLine(line)
    const obj: Record<string, unknown> = {}
    headers.forEach((h, i) => {
      const v = vals[i] ?? ''
      obj[h] = v === '' ? null : v
    })
    // coerce numeric fields
    if (obj.birth_year) obj.birth_year = Number(obj.birth_year) || null
    if (obj.death_year) obj.death_year = Number(obj.death_year) || null
    // strip non-importable fields
    delete obj.id
    delete obj.created_at
    delete obj.updated_at
    return obj as Partial<Hero>
  })
}

const PAGE_SIZE = 20

const eraLabel: Record<HeroEra, string> = {
  hung_vuong: 'Hùng Vương',
  bac_thuoc: 'Bắc thuộc',
  ly_tran: 'Lý – Trần',
  le: 'Lê',
  nguyen: 'Nguyễn',
  can_dai: 'Cận đại',
}

const categoryLabel: Record<HeroCategory, string> = {
  military: 'Quân sự',
  politics: 'Chính trị',
  culture: 'Văn hóa',
  science: 'Khoa học',
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
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ ok: number; fail: number } | null>(null)

  async function fetchHeroes() {
    let mock_data = await supabase
      .from('heroes')
      .select('id, full_name');
      console.log('mock_data', mock_data);

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

  async function handleExport() {
    const { data } = await supabase.from('heroes').select('*').order('full_name')
    if (!data) return
    const csv = heroesToCsv(data as Hero[])
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `heroes_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setImporting(true)
    setImportResult(null)
    const text = await file.text()
    const rows = csvToHeroes(text)
    let ok = 0, fail = 0
    for (const row of rows) {
      const { error } = await supabase.from('heroes').insert(row)
      if (error) fail++; else ok++
    }
    setImportResult({ ok, fail })
    setImporting(false)
    fetchHeroes()
  }

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
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <Upload className="h-4 w-4" />
              {importing ? 'Đang nhập...' : 'Nhập CSV'}
              <input type="file" accept=".csv" className="hidden" onChange={handleImport} disabled={importing} />
            </label>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Download className="h-4 w-4" /> Xuất CSV
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" /> Thêm nhân vật
            </button>
          </div>
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

      {importResult && (
        <div className={`mb-4 rounded-lg px-4 py-2 text-sm ${importResult.fail > 0 ? 'bg-amber-50 text-amber-800' : 'bg-green-50 text-green-800'}`}>
          Nhập xong: <strong>{importResult.ok}</strong> thành công
          {importResult.fail > 0 && <>, <strong>{importResult.fail}</strong> lỗi</>}.
          <button onClick={() => setImportResult(null)} className="ml-3 underline">Đóng</button>
        </div>
      )}

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
