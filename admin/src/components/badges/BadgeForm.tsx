import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import type { Badge } from '@/types/database'
import { X } from 'lucide-react'

const schema = z.object({
  name: z.string().min(1, 'Bắt buộc'),
  code: z.string().min(1, 'Bắt buộc').regex(/^[a-z0-9_]+$/, 'Chỉ dùng chữ thường, số, dấu gạch dưới'),
  rarity: z.enum(['common', 'rare', 'epic', 'legendary']),
  description: z.string().optional().nullable(),
  image_url: z.string().url('URL không hợp lệ').optional().nullable().or(z.literal('')),
})

type FormData = z.infer<typeof schema>

interface BadgeFormProps {
  badge: Badge | null
  onClose: () => void
  onSaved: () => void
}

export function BadgeForm({ badge, onClose, onSaved }: BadgeFormProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { ...badge, rarity: badge?.rarity ?? 'common' },
  })

  async function onSubmit(data: FormData) {
    const payload = { ...data, image_url: data.image_url || null }
    if (badge) {
      await supabase.from('badges').update(payload).eq('id', badge.id)
    } else {
      await supabase.from('badges').insert(payload)
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="font-semibold text-gray-900">{badge ? 'Chỉnh sửa huy hiệu' : 'Thêm huy hiệu'}</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100"><X className="h-5 w-5 text-gray-500" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tên *</label>
              <input {...register('name')} className="input" />
              {errors.name && <p className="err">{errors.name.message}</p>}
            </div>
            <div>
              <label className="label">Mã (code) *</label>
              <input {...register('code')} className="input font-mono" placeholder="first_hero" />
              {errors.code && <p className="err">{errors.code.message}</p>}
            </div>
            <div className="col-span-2">
              <label className="label">Độ hiếm</label>
              <select {...register('rarity')} className="input">
                <option value="common">Phổ thông</option>
                <option value="rare">Hiếm</option>
                <option value="epic">Sử thi</option>
                <option value="legendary">Huyền thoại</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">URL ảnh huy hiệu</label>
              <input {...register('image_url')} className="input" placeholder="https://..." />
              {errors.image_url && <p className="err">{errors.image_url.message}</p>}
            </div>
            <div className="col-span-2">
              <label className="label">Mô tả</label>
              <textarea {...register('description')} rows={3} className="input resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Hủy</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Đang lưu...' : 'Lưu'}
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
