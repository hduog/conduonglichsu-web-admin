import { useEffect, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { supabase } from '@/lib/supabase'
import type { User, UserRole } from '@/types/database'
import { DataTable } from '@/components/shared/DataTable'
import { Pagination } from '@/components/shared/Pagination'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/shared/Badge'
import { formatDateTime } from '@/lib/utils'
import { Search } from 'lucide-react'

const PAGE_SIZE = 20

const roleVariant: Record<UserRole, 'default' | 'info' | 'purple'> = {
  user: 'default',
  admin: 'info',
  super_admin: 'purple',
}

const roleLabel: Record<UserRole, string> = {
  user: 'User',
  admin: 'Admin',
  super_admin: 'Super Admin',
}

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingRole, setEditingRole] = useState<{ id: string; role: UserRole } | null>(null)

  async function fetchUsers() {
    setLoading(true)
    let query = supabase
      .from('users')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`)
    }

    const { data, count } = await query
    setUsers((data as User[]) ?? [])
    setTotal(count ?? 0)
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [page, search])

  async function updateRole(userId: string, role: UserRole) {
    await supabase.from('users').update({ role }).eq('id', userId)
    setEditingRole(null)
    fetchUsers()
  }

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'full_name',
      header: 'Tên',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-gray-900">{row.original.full_name ?? '—'}</p>
          <p className="text-xs text-gray-400">{row.original.email}</p>
        </div>
      ),
    },
    {
      accessorKey: 'role',
      header: 'Vai trò',
      cell: ({ row }) =>
        editingRole?.id === row.original.id ? (
          <select
            value={editingRole.role}
            onChange={(e) => setEditingRole({ id: row.original.id, role: e.target.value as UserRole })}
            onBlur={() => updateRole(editingRole.id, editingRole.role)}
            className="rounded border px-2 py-1 text-xs"
            autoFocus
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
        ) : (
          <button onClick={() => setEditingRole({ id: row.original.id, role: row.original.role })}>
            <Badge variant={roleVariant[row.original.role]}>
              {roleLabel[row.original.role]}
            </Badge>
          </button>
        ),
    },
    {
      accessorKey: 'points',
      header: 'Điểm',
      cell: ({ getValue }) => <span className="font-mono">{String(getValue())}</span>,
    },
    {
      accessorKey: 'level',
      header: 'Level',
    },
    {
      accessorKey: 'exploration_streak',
      header: 'Streak',
      cell: ({ getValue }) => `${String(getValue())} ngày`,
    },
    {
      accessorKey: 'created_at',
      header: 'Tham gia',
      cell: ({ getValue }) => formatDateTime(getValue() as string),
    },
  ]

  return (
    <div>
      <PageHeader title="Người dùng" description={`${total} tài khoản`} />

      <div className="mb-4 flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Tìm theo tên, email..."
            className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <DataTable columns={columns} data={users} loading={loading} />
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
    </div>
  )
}
