import { useEffect, useRef, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { supabase } from '@/lib/supabase'
import type { Badge as BadgeType, BadgeRarity } from '@/types/database'
import { DataTable } from '@/components/shared/DataTable'
import { Pagination } from '@/components/shared/Pagination'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Badge } from '@/components/shared/Badge'
import { BadgeForm } from '@/components/badges/BadgeForm'
import { Plus, Pencil, Trash2, Download, Upload } from 'lucide-react'

// ── CSV helpers ────────────────────────────────────────────────────────────────

const CSV_HEADERS = ['code', 'name', 'description', 'rarity', 'icon_url'] as const
type CsvField = typeof CSV_HEADERS[number]

function escapeCsvCell(value: string | null | undefined): string {
  const str = value ?? ''
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function badgesToCsv(rows: BadgeType[]): string {
  const header = CSV_HEADERS.join(',')
  const body = rows.map(b =>
    CSV_HEADERS.map(k => escapeCsvCell(b[k as CsvField])).join(',')
  )
  return [header, ...body].join('\n')
}

function parseCsvRows(text: string): Partial<BadgeType>[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim())
  return lines.slice(1).map(line => {
    // Handle quoted cells
    const cells: string[] = []
    let cur = ''
    let inQuote = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++ }
        else inQuote = !inQuote
      } else if (ch === ',' && !inQuote) {
        cells.push(cur); cur = ''
      } else {
        cur += ch
      }
    }
    cells.push(cur)
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h] = (cells[i] ?? '').trim() })
    return obj as Partial<BadgeType>
  })
}

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
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  async function handleExport() {
    const { data } = await supabase
      .from('badges')
      .select('*')
      .order('rarity')
    if (!data) return
    const csv = badgesToCsv(data as BadgeType[])
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `badges_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportError(null)

    try {
      const text = await file.text()
      const rows = parseCsvRows(text)
      if (rows.length === 0) throw new Error('File CSV rỗng hoặc sai định dạng.')

      const VALID_RARITIES = ['common', 'rare', 'epic', 'legendary']
      const records = rows.map((r, i) => {
        if (!r.code) throw new Error(`Hàng ${i + 2}: thiếu trường "code".`)
        if (!r.name) throw new Error(`Hàng ${i + 2}: thiếu trường "name".`)
        if (!r.rarity || !VALID_RARITIES.includes(r.rarity)) {
          throw new Error(`Hàng ${i + 2}: "rarity" phải là common/rare/epic/legendary.`)
        }
        // description and icon_url are optional — omit or leave blank in CSV
        return {
          code: r.code,
          name: r.name,
          description: r.description || null,
          rarity: r.rarity,
          icon_url: r.icon_url || '',
        }
      })

      const { error } = await supabase
        .from('badges')
        .upsert(records, { onConflict: 'code' })

      if (error) throw new Error(error.message)
      fetchBadges()
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Lỗi không xác định.')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const columns: ColumnDef<BadgeType>[] = [
    {
      accessorKey: 'name',
      header: 'Tên huy hiệu',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          {row.original.icon_url && (
            <img src={row.original.icon_url} alt="" className="h-8 w-8 rounded-full object-cover" />
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
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <Download className="h-4 w-4" /> Xuất CSV
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
              <Upload className="h-4 w-4" /> {importing ? 'Đang nhập…' : 'Nhập CSV'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleImport}
            />
            <button onClick={() => { setEditTarget(null); setFormOpen(true) }}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              <Plus className="h-4 w-4" /> Thêm huy hiệu
            </button>
          </div>
        }
      />

      {importError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          <span>{importError}</span>
          <button onClick={() => setImportError(null)} className="ml-4 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

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
