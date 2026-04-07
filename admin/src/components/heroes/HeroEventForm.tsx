import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import type { HeroEvent } from '@/types/database'
import { X } from 'lucide-react'

const schema = z.object({
  event_type: z.enum(['birth', 'battle', 'achievement', 'death', 'other']),
  year: z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().int()),
  title: z.string().min(1, 'Bắt buộc'),
  description: z.string().min(1, 'Bắt buộc'),
  image_url: z.string().url('URL không hợp lệ').optional().nullable().or(z.literal('')),
})

type FormData = z.infer<typeof schema>

interface HeroEventFormProps {
  heroId: string
  event: HeroEvent | null
  onClose: () => void
  onSaved: () => void
}

export function HeroEventForm({ heroId, event, onClose, onSaved }: HeroEventFormProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: event ?? { event_type: 'achievement' },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function onSubmit(data: any) {
    data = data as FormData
    const payload = {
      event_type: data.event_type,
      year: data.year,
      title: data.title,
      description: data.description,
      image_url: data.image_url || null,
    }
    if (event) {
      await supabase.from('hero_events').update(payload).eq('id', event.id)
    } else {
      await supabase.from('hero_events').insert({ ...payload, hero_id: heroId })
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="font-semibold text-gray-900">{event ? 'Chỉnh sửa sự kiện' : 'Thêm sự kiện'}</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100"><X className="h-5 w-5 text-gray-500" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Loại *</label>
              <select {...register('event_type')} className="input">
                <option value="birth">Sinh</option>
                <option value="battle">Chiến trận</option>
                <option value="achievement">Thành tựu</option>
                <option value="death">Mất</option>
                <option value="other">Khác</option>
              </select>
            </div>
            <div>
              <label className="label">Năm *</label>
              <input type="number" {...register('year')} className="input" />
              {errors.year && <p className="err">{errors.year.message}</p>}
            </div>
            <div className="col-span-2">
              <label className="label">Tiêu đề *</label>
              <input {...register('title')} className="input" />
              {errors.title && <p className="err">{errors.title.message}</p>}
            </div>
            <div className="col-span-2">
              <label className="label">Mô tả *</label>
              <textarea {...register('description')} rows={3} className="input resize-none" />
              {errors.description && <p className="err">{errors.description.message}</p>}
            </div>
            <div className="col-span-2">
              <label className="label">URL ảnh minh hoạ</label>
              <input {...register('image_url')} className="input" placeholder="https://..." />
              {errors.image_url && <p className="err">{errors.image_url.message}</p>}
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
        .label { display:block; margin-bottom:0.25rem; font-size:0.875rem; font-weight:500; color:#374151; }
        .input { width:100%; border-radius:0.5rem; border:1px solid #d1d5db; padding:0.5rem 0.75rem; font-size:0.875rem; outline:none; }
        .err { margin-top:0.25rem; font-size:0.75rem; color:#dc2626; }
        .btn-primary { border-radius:0.5rem; background:hsl(222.2 47.4% 11.2%); padding:0.5rem 1rem; font-size:0.875rem; font-weight:500; color:white; }
        .btn-secondary { border-radius:0.5rem; border:1px solid #d1d5db; padding:0.5rem 1rem; font-size:0.875rem; font-weight:500; color:#374151; }
        .btn-secondary:hover { background:#f9fafb; }
      `}</style>
    </div>
  )
}
