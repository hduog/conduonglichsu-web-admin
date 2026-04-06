import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import type { Hero } from '@/types/database'
import { X } from 'lucide-react'

const schema = z.object({
  full_name: z.string().min(1, 'Bắt buộc'),
  alias_name: z.string().optional(),
  birth_year: z.coerce.number().int().optional().nullable(),
  death_year: z.coerce.number().int().optional().nullable(),
  era: z.enum(['ancient', 'medieval', 'modern', 'contemporary']).optional().nullable(),
  category: z.enum(['military', 'political', 'cultural', 'scientific', 'other']).optional().nullable(),
  bio: z.string().optional().nullable(),
  image_url: z.string().url('URL không hợp lệ').optional().nullable().or(z.literal('')),
  province: z.string().optional().nullable(),
})

type FormData = z.infer<typeof schema>

interface HeroFormProps {
  hero: Hero | null
  onClose: () => void
  onSaved: () => void
}

export function HeroForm({ hero, onClose, onSaved }: HeroFormProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: hero ? { ...hero, alias_name: hero.alias_name ?? undefined } : {},
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function onSubmit(data: any) {
    data = data as FormData
    const payload = {
      ...data,
      image_url: data.image_url || null,
      alias_name: data.alias_name || null,
    }
    if (hero) {
      await supabase.from('heroes').update(payload).eq('id', hero.id)
    } else {
      await supabase.from('heroes').insert(payload)
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-xl bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="font-semibold text-gray-900">
            {hero ? 'Chỉnh sửa nhân vật' : 'Thêm nhân vật'}
          </h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100 transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="max-h-[75vh] overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Tên đầy đủ *</label>
              <input {...register('full_name')} className="input" />
              {errors.full_name && <p className="err">{errors.full_name.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tên khác</label>
              <input {...register('alias_name')} className="input" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tỉnh/Thành phố</label>
              <input {...register('province')} className="input" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Năm sinh</label>
              <input type="number" {...register('birth_year')} className="input" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Năm mất</label>
              <input type="number" {...register('death_year')} className="input" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Thời đại</label>
              <select {...register('era')} className="input">
                <option value="">—</option>
                <option value="ancient">Cổ đại</option>
                <option value="medieval">Trung đại</option>
                <option value="modern">Cận đại</option>
                <option value="contemporary">Hiện đại</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Lĩnh vực</label>
              <select {...register('category')} className="input">
                <option value="">—</option>
                <option value="military">Quân sự</option>
                <option value="political">Chính trị</option>
                <option value="cultural">Văn hóa</option>
                <option value="scientific">Khoa học</option>
                <option value="other">Khác</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">URL ảnh đại diện</label>
              <input {...register('image_url')} className="input" placeholder="https://..." />
              {errors.image_url && <p className="err">{errors.image_url.message}</p>}
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Tiểu sử</label>
              <textarea {...register('bio')} rows={4} className="input resize-none" />
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
        .input { width: 100%; border-radius: 0.5rem; border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; font-size: 0.875rem; outline: none; }
        .input:focus { ring: 2px; border-color: transparent; box-shadow: 0 0 0 2px hsl(222.2 47.4% 11.2% / 0.3); }
        .err { margin-top: 0.25rem; font-size: 0.75rem; color: #dc2626; }
        .btn-primary { border-radius: 0.5rem; background: hsl(222.2 47.4% 11.2%); padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; color: white; }
        .btn-primary:hover { opacity: 0.9; }
        .btn-primary:disabled { opacity: 0.6; }
        .btn-secondary { border-radius: 0.5rem; border: 1px solid #d1d5db; padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; color: #374151; }
        .btn-secondary:hover { background: #f9fafb; }
      `}</style>
    </div>
  )
}
