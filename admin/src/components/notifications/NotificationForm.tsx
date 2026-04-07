import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import type { User } from '@/types/database'
import { X } from 'lucide-react'

const schema = z.object({
  title: z.string().min(1, 'Bắt buộc'),
  body: z.string().min(1, 'Bắt buộc'),
  type: z.enum(['badge', 'challenge', 'hero', 'community', 'location', 'system']),
  target: z.enum(['all', 'specific']),
  user_id: z.string().uuid().optional().nullable(),
})

type FormData = z.infer<typeof schema>

interface NotificationFormProps {
  onClose: () => void
  onSaved: () => void
}

export function NotificationForm({ onClose, onSaved }: NotificationFormProps) {
  const [users, setUsers] = useState<Pick<User, 'id' | 'name' | 'email'>[]>([])
  const [sending, setSending] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'system', target: 'all' },
  })

  const target = watch('target')

  useEffect(() => {
    supabase.from('users').select('id, name, email').order('name').then(({ data }: { data: Pick<User, 'id' | 'name' | 'email'>[] | null }) => {
      setUsers(data ?? [])
    })
  }, [])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function onSubmit(data: any) {
    data = data as FormData
    setSending(true)
    const base = { title: data.title, body: data.body, type: data.type, is_read: false }

    if (data.target === 'all') {
      const insertRows = users.map((u) => ({ ...base, user_id: u.id }))
      await supabase.from('notifications').insert(insertRows)
    } else if (data.user_id) {
      await supabase.from('notifications').insert({ ...base, user_id: data.user_id })
    }

    setSending(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="font-semibold text-gray-900">Gửi thông báo</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100"><X className="h-5 w-5 text-gray-500" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="label">Tiêu đề *</label>
            <input {...register('title')} className="input" />
            {errors.title && <p className="err">{errors.title.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Loại</label>
              <select {...register('type')} className="input">
                <option value="system">Hệ thống</option>
                <option value="badge">Huy hiệu</option>
                <option value="challenge">Thử thách</option>
                <option value="hero">Nhân vật</option>
                <option value="community">Cộng đồng</option>
                <option value="location">Địa điểm</option>
              </select>
            </div>
            <div>
              <label className="label">Gửi đến</label>
              <select {...register('target')} className="input">
                <option value="all">Tất cả người dùng</option>
                <option value="specific">Người dùng cụ thể</option>
              </select>
            </div>
          </div>
          {target === 'specific' && (
            <div>
              <label className="label">Chọn người dùng</label>
              <select {...register('user_id')} className="input">
                <option value="">— Chọn —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label">Nội dung *</label>
            <textarea {...register('body')} rows={3} className="input resize-none" />
            {errors.body && <p className="err">{errors.body.message}</p>}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Hủy</button>
            <button type="submit" disabled={sending} className="btn-primary">
              {sending ? 'Đang gửi...' : 'Gửi thông báo'}
            </button>
          </div>
        </form>
      </div>
      <style>{`
        .label{display:block;margin-bottom:0.25rem;font-size:0.875rem;font-weight:500;color:#374151}
        .input{width:100%;border-radius:0.5rem;border:1px solid #d1d5db;padding:0.5rem 0.75rem;font-size:0.875rem;outline:none}
        .err{margin-top:0.25rem;font-size:0.75rem;color:#dc2626}
        .btn-primary{border-radius:0.5rem;background:hsl(222.2 47.4% 11.2%);padding:0.5rem 1rem;font-size:0.875rem;font-weight:500;color:white}
        .btn-secondary{border-radius:0.5rem;border:1px solid #d1d5db;padding:0.5rem 1rem;font-size:0.875rem;font-weight:500;color:#374151}
        .btn-secondary:hover{background:#f9fafb}
      `}</style>
    </div>
  )
}
