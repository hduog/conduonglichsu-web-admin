import { useEffect, useRef, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { supabase } from '@/lib/supabase'
import type { QuestionAnswerType, QuestionWithOptions } from '@/types/database'
import { DataTable } from '@/components/shared/DataTable'
import { Pagination } from '@/components/shared/Pagination'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Badge } from '@/components/shared/Badge'
import { QuestionForm } from '@/components/questions/QuestionForm'
import { Plus, Pencil, Trash2, CheckCircle2, AlignLeft, Download, Upload } from 'lucide-react'

const PAGE_SIZE = 20

const typeLabel: Record<QuestionAnswerType, string> = {
  normal_text: 'Tự luận',
  checkbox: 'Trắc nghiệm',
}

const typeVariant: Record<QuestionAnswerType, 'default' | 'info'> = {
  normal_text: 'default',
  checkbox: 'info',
}

// ── CSV helpers ────────────────────────────────────────────────────────────────

function escapeCsvCell(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes(';')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/** Encode options as "label1:true;label2:false" */
function encodeOptions(q: QuestionWithOptions): string {
  if (q.type_answer === 'normal_text' || !q.question_options?.length) return ''
  return q.question_options
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(o => `${o.label.replace(/[;:]/g, ' ')}:${o.is_correct}`)
    .join(';')
}

function questionsToCsv(rows: QuestionWithOptions[]): string {
  const header = 'content,type_answer,options'
  const body = rows.map(q =>
    [
      escapeCsvCell(q.content),
      q.type_answer,
      escapeCsvCell(encodeOptions(q)),
    ].join(',')
  )
  return [header, ...body].join('\n')
}

/** Parse a CSV line respecting double-quoted cells */
function parseCsvLine(line: string): string[] {
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
  return cells
}

interface ParsedRow {
  content: string
  type_answer: QuestionAnswerType
  options: Array<{ label: string; is_correct: boolean }>
}

function parseCsvRows(text: string): ParsedRow[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  // Validate header
  const header = lines[0].split(',').map(h => h.trim())
  if (!header.includes('content') || !header.includes('type_answer')) {
    throw new Error('File CSV thiếu cột "content" hoặc "type_answer".')
  }
  const idxContent = header.indexOf('content')
  const idxType = header.indexOf('type_answer')
  const idxOptions = header.indexOf('options')

  return lines.slice(1).map((line, i) => {
    const rowNum = i + 2
    const cells = parseCsvLine(line)
    const content = (cells[idxContent] ?? '').trim()
    const type_answer = (cells[idxType] ?? '').trim() as QuestionAnswerType

    if (!content) throw new Error(`Hàng ${rowNum}: trường "content" không được để trống.`)
    if (type_answer !== 'normal_text' && type_answer !== 'checkbox') {
      throw new Error(`Hàng ${rowNum}: "type_answer" phải là "normal_text" hoặc "checkbox".`)
    }

    let options: Array<{ label: string; is_correct: boolean }> = []
    if (type_answer === 'checkbox') {
      const raw = idxOptions !== -1 ? (cells[idxOptions] ?? '').trim() : ''
      if (!raw) throw new Error(`Hàng ${rowNum}: câu hỏi trắc nghiệm phải có cột "options".`)
      options = raw.split(';').map((part, j) => {
        const colonIdx = part.lastIndexOf(':')
        if (colonIdx === -1) throw new Error(`Hàng ${rowNum}, lựa chọn ${j + 1}: định dạng phải là "nhãn:true/false".`)
        const label = part.slice(0, colonIdx).trim()
        const is_correct = part.slice(colonIdx + 1).trim().toLowerCase() === 'true'
        if (!label) throw new Error(`Hàng ${rowNum}, lựa chọn ${j + 1}: nhãn không được để trống.`)
        return { label, is_correct }
      })
      if (options.length < 2) throw new Error(`Hàng ${rowNum}: câu hỏi trắc nghiệm cần ít nhất 2 lựa chọn.`)
      if (!options.some(o => o.is_correct)) throw new Error(`Hàng ${rowNum}: phải có ít nhất 1 đáp án đúng.`)
    }

    return { content, type_answer, options }
  })
}

// ── Page component ─────────────────────────────────────────────────────────────

export function QuestionsPage() {
  const [questions, setQuestions] = useState<QuestionWithOptions[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<QuestionAnswerType | 'all'>('all')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<QuestionWithOptions | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<QuestionWithOptions | null>(null)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function fetchQuestions() {
    setLoading(true)

    let query = supabase
      .from('questions')
      .select('*, question_options(*)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

    if (filterType !== 'all') {
      query = query.eq('type_answer', filterType)
    }
    if (search.trim()) {
      query = query.ilike('content', `%${search.trim()}%`)
    }

    const { data, count } = await query

    setQuestions((data as QuestionWithOptions[]) ?? [])
    setTotal(count ?? 0)
    setLoading(false)
  }

  useEffect(() => { fetchQuestions() }, [page, filterType, search])

  function applyFilter(type: QuestionAnswerType | 'all') {
    setFilterType(type)
    setPage(1)
  }

  function applySearch() {
    setSearch(searchInput)
    setPage(1)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    await supabase.from('questions').delete().eq('id', deleteTarget.id)
    setDeleteTarget(null)
    fetchQuestions()
  }

  // ── Export ──────────────────────────────────────────────────────────────────

  async function handleExport() {
    const { data } = await supabase
      .from('questions')
      .select('*, question_options(*)')
      .order('created_at', { ascending: false })
    if (!data) return
    const csv = questionsToCsv(data as QuestionWithOptions[])
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `questions_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Import ──────────────────────────────────────────────────────────────────

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportError(null)

    try {
      const text = await file.text()
      const rows = parseCsvRows(text)
      if (rows.length === 0) throw new Error('File CSV rỗng hoặc không có dữ liệu.')

      for (const row of rows) {
        // Insert question
        const { data: inserted, error: qErr } = await supabase
          .from('questions')
          .insert({ content: row.content, type_answer: row.type_answer })
          .select('id')
          .single()
        if (qErr) throw new Error(qErr.message)

        // Insert options if checkbox
        if (row.type_answer === 'checkbox' && row.options.length > 0) {
          const { error: oErr } = await supabase.from('question_options').insert(
            row.options.map((o, i) => ({
              question_id: inserted.id,
              label: o.label,
              is_correct: o.is_correct,
              sort_order: i,
            }))
          )
          if (oErr) throw new Error(oErr.message)
        }
      }

      fetchQuestions()
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Lỗi không xác định.')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ── Columns ─────────────────────────────────────────────────────────────────

  const columns: ColumnDef<QuestionWithOptions>[] = [
    {
      accessorKey: 'content',
      header: 'Nội dung câu hỏi',
      cell: ({ getValue }) => (
        <p className="max-w-md text-sm text-gray-800 line-clamp-2">{getValue() as string}</p>
      ),
    },
    {
      accessorKey: 'type_answer',
      header: 'Loại',
      cell: ({ getValue }) => {
        const v = getValue() as QuestionAnswerType
        return (
          <div className="flex items-center gap-1.5">
            {v === 'checkbox'
              ? <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
              : <AlignLeft className="h-3.5 w-3.5 text-gray-400" />
            }
            <Badge variant={typeVariant[v]}>{typeLabel[v]}</Badge>
          </div>
        )
      },
    },
    {
      id: 'options_count',
      header: 'Số lựa chọn',
      cell: ({ row }) => {
        const count = row.original.question_options?.length ?? 0
        if (row.original.type_answer === 'normal_text') {
          return <span className="text-gray-400 text-sm">—</span>
        }
        const correctCount = row.original.question_options?.filter(o => o.is_correct).length ?? 0
        return (
          <span className="text-sm text-gray-600">
            {count} lựa chọn
            {correctCount > 0 && (
              <span className="ml-1 text-green-600">({correctCount} đúng)</span>
            )}
          </span>
        )
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Ngày tạo',
      cell: ({ getValue }) => (
        <span className="text-sm text-gray-500">
          {new Date(getValue() as string).toLocaleDateString('vi-VN')}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <button
            onClick={() => { setEditTarget(row.original); setFormOpen(true) }}
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

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        title="Ngân hàng câu hỏi"
        description={`${total} câu hỏi`}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Download className="h-4 w-4" /> Xuất CSV
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Upload className="h-4 w-4" /> {importing ? 'Đang nhập…' : 'Nhập CSV'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleImport}
            />
            <button
              onClick={() => { setEditTarget(null); setFormOpen(true) }}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" /> Thêm câu hỏi
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

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && applySearch()}
            placeholder="Tìm nội dung câu hỏi..."
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary w-72"
          />
          <button
            onClick={applySearch}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Tìm
          </button>
        </div>

        <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
          {(['all', 'normal_text', 'checkbox'] as const).map(t => (
            <button
              key={t}
              onClick={() => applyFilter(t)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                filterType === t
                  ? 'bg-primary text-primary-foreground'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {t === 'all' ? 'Tất cả' : typeLabel[t]}
            </button>
          ))}
        </div>
      </div>

      <DataTable columns={columns} data={questions} loading={loading} />
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />

      {formOpen && (
        <QuestionForm
          question={editTarget}
          onClose={() => setFormOpen(false)}
          onSaved={() => { setFormOpen(false); fetchQuestions() }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa câu hỏi"
        description={`Xóa câu hỏi "${deleteTarget?.content.slice(0, 60)}${(deleteTarget?.content.length ?? 0) > 60 ? '...' : ''}"?`}
        confirmLabel="Xóa"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
