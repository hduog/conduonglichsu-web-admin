import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import type { Street, Hero } from '@/types/database'
import { X } from 'lucide-react'

const schema = z.object({
  name: z.string().min(1, 'Bắt buộc'),
  hero_id: z.string().optional().nullable(),
  lat: z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().nullable().optional()),
  lng: z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().nullable().optional()),
  province: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
})

type FormData = z.infer<typeof schema>

interface StreetFormProps {
  street: Street | null
  onClose: () => void
  onSaved: () => void
}

export function StreetForm({ street, onClose, onSaved }: StreetFormProps) {
  const [heroes, setHeroes] = useState<Pick<Hero, 'id' | 'full_name'>[]>([])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: street ?? {},
  })

  useEffect(() => {
    supabase.from('heroes').select('id, full_name').order('full_name').then(({ data }: { data: Pick<Hero, 'id' | 'full_name'>[] | null }) => {
      setHeroes(data ?? [])
    })
  }, [])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function onSubmit(data: any) {
    data = data as FormData
    const payload = { ...data, hero_id: data.hero_id || null }
    if (street) {
      await supabase.from('streets').update(payload).eq('id', street.id)
    } else {
      await supabase.from('streets').insert(payload)
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="font-semibold text-gray-900">{street ? 'Chỉnh sửa đường' : 'Thêm con đường'}</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100"><X className="h-5 w-5 text-gray-500" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="label">Tên đường *</label>
            <input {...register('name')} className="input" />
            {errors.name && <p className="err">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Nhân vật lịch sử</label>
            <select {...register('hero_id')} className="input">
              <option value="">— Không liên kết —</option>
              {heroes.map((h) => <option key={h.id} value={h.id}>{h.full_name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Vĩ độ (lat)</label>
              <input type="number" step="any" {...register('lat')} className="input" />
            </div>
            <div>
              <label className="label">Kinh độ (lng)</label>
              <input type="number" step="any" {...register('lng')} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Tỉnh/Thành phố</label>
            <input {...register('province')} className="input" />
          </div>
          <div>
            <label className="label">Mô tả</label>
            <textarea {...register('description')} rows={3} className="input resize-none" />
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
