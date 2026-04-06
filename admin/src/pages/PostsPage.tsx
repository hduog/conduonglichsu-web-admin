import { useEffect, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { supabase } from '@/lib/supabase'
import type { PostWithUser } from '@/types/database'
import { DataTable } from '@/components/shared/DataTable'
import { Pagination } from '@/components/shared/Pagination'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { formatDateTime } from '@/lib/utils'
import { Search, Trash2, Heart, MessageCircle, Image } from 'lucide-react'

const PAGE_SIZE = 20

export function PostsPage() {
  const [posts, setPosts] = useState<PostWithUser[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<PostWithUser | null>(null)

  async function fetchPosts() {
    setLoading(true)
    let query = supabase
      .from('posts')
      .select('*, users(id, full_name, avatar_url), post_media(id, url, type)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

    if (search) query = query.ilike('content', `%${search}%`)

    const { data, count } = await query
    setPosts((data as PostWithUser[]) ?? [])
    setTotal(count ?? 0)
    setLoading(false)
  }

  useEffect(() => { fetchPosts() }, [page, search])

  async function handleDelete() {
    if (!deleteTarget) return
    await supabase.from('posts').delete().eq('id', deleteTarget.id)
    setDeleteTarget(null)
    fetchPosts()
  }

  const columns: ColumnDef<PostWithUser>[] = [
    {
      accessorKey: 'content',
      header: 'Nội dung',
      cell: ({ row }) => (
        <div className="max-w-md">
          <p className="text-sm text-gray-900 line-clamp-2">{row.original.content}</p>
          <p className="mt-0.5 text-xs text-gray-400">{row.original.users?.full_name ?? '—'}</p>
        </div>
      ),
    },
    {
      id: 'media',
      header: 'Media',
      cell: ({ row }) =>
        row.original.post_media?.length ? (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Image className="h-3.5 w-3.5" /> {row.original.post_media.length}
          </div>
        ) : '—',
    },
    {
      accessorKey: 'like_count',
      header: '',
      cell: ({ getValue }) => (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Heart className="h-3.5 w-3.5" /> {String(getValue())}
        </div>
      ),
    },
    {
      accessorKey: 'comment_count',
      header: '',
      cell: ({ getValue }) => (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <MessageCircle className="h-3.5 w-3.5" /> {String(getValue())}
        </div>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Ngày đăng',
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
      <PageHeader title="Bài đăng" description={`${total} bài đăng`} />

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Tìm theo nội dung..." className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
        </div>
      </div>

      <DataTable columns={columns} data={posts} loading={loading} />
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa bài đăng"
        description="Xóa bài đăng này? Tất cả bình luận và lượt thích cũng sẽ bị xóa."
        confirmLabel="Xóa" danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
