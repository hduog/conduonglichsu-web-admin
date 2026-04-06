import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onChange: (page: number) => void
}

export function Pagination({ page, pageSize, total, onChange }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between pt-4 text-sm text-gray-600">
      <span>
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} / {total} kết quả
      </span>
      <div className="flex gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="rounded p-1.5 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
          const p = i + 1
          return (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`rounded px-2.5 py-1 transition-colors ${
                p === page
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-gray-100'
              }`}
            >
              {p}
            </button>
          )
        })}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="rounded p-1.5 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
