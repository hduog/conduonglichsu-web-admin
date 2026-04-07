import { useEffect, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { supabase } from '@/lib/supabase'
import type { StreetWithHero, Street } from '@/types/database'
import { DataTable } from '@/components/shared/DataTable'
import { Pagination } from '@/components/shared/Pagination'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { StreetForm } from '@/components/streets/StreetForm'
import { Search, Plus, Pencil, Trash2, MapPin, Upload, Download } from 'lucide-react'

const CSV_HEADERS = [
  'id', 'name', 'city', 'province', 'hero_id',
  'lat', 'lng', 'description', 'created_at', 'updated_at',
]

function escapeCsvValue(val: unknown): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function streetsToCsv(data: Street[]): string {
  const rows = data.map(s =>
    CSV_HEADERS.map(k => escapeCsvValue(s[k as keyof Street])).join(',')
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

function csvToStreets(text: string): Partial<Street>[] {
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
    if (obj.lat) obj.lat = Number(obj.lat) || null
    if (obj.lng) obj.lng = Number(obj.lng) || null
    delete obj.id
    delete obj.created_at
    delete obj.updated_at
    return obj as Partial<Street>
  })
}

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
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ ok: number; fail: number } | null>(null)

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

  async function handleExport() {
    const { data } = await supabase.from('streets').select('*').order('name')
    if (!data) return
    const csv = streetsToCsv(data as Street[])
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `streets_${new Date().toISOString().slice(0, 10)}.csv`
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
    const rows = csvToStreets(text)
    let ok = 0, fail = 0
    for (const row of rows) {
      const { error } = await supabase.from('streets').insert(row)
      if (error) fail++; else ok++
    }
    setImportResult({ ok, fail })
    setImporting(false)
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
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <Upload className="h-4 w-4" />
              {importing ? 'Đang nhập...' : 'Nhập CSV'}
              <input type="file" accept=".csv" className="hidden" onChange={handleImport} disabled={importing} />
            </label>
            <button onClick={handleExport}
              className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <Download className="h-4 w-4" /> Xuất CSV
            </button>
            <button onClick={() => { setEditTarget(null); setFormOpen(true) }}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              <Plus className="h-4 w-4" /> Thêm đường
            </button>
          </div>
        }
      />

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Tìm theo tên đường..." className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
        </div>
      </div>

      {importResult && (
        <div className={`mb-4 rounded-lg px-4 py-2 text-sm ${importResult.fail > 0 ? 'bg-amber-50 text-amber-800' : 'bg-green-50 text-green-800'}`}>
          Nhập xong: <strong>{importResult.ok}</strong> thành công
          {importResult.fail > 0 && <>, <strong>{importResult.fail}</strong> lỗi</>}.
          <button onClick={() => setImportResult(null)} className="ml-3 underline">Đóng</button>
        </div>
      )}

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
