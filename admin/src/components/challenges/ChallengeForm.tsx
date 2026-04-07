import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import type { Challenge, Hero, Badge } from '@/types/database'
import { X } from 'lucide-react'

const schema = z.object({
  title: z.string().min(1, 'Bắt buộc'),
  description: z.string().min(1, 'Bắt buộc'),
  type: z.enum(['checkin', 'cipher', 'race', 'quiz']),
  hero_id: z.string().optional().nullable(),
  target_lat: z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().nullable().optional()),
  target_lng: z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().nullable().optional()),
  target_radius: z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().nullable().optional()),
  reward_points: z.preprocess((v) => Number(v ?? 0), z.number().int().min(0)),
  reward_badge_id: z.string().optional().nullable(),
  image_url: z.string().url('URL không hợp lệ').optional().nullable().or(z.literal('')),
  start_at: z.string().min(1, 'Bắt buộc'),
  end_at: z.string().min(1, 'Bắt buộc'),
})

type FormData = z.infer<typeof schema>

interface ChallengeFormProps {
  challenge: Challenge | null
  onClose: () => void
  onSaved: () => void
}

export function ChallengeForm({ challenge, onClose, onSaved }: ChallengeFormProps) {
  const [heroes, setHeroes] = useState<Pick<Hero, 'id' | 'full_name'>[]>([])
  const [badges, setBadges] = useState<Pick<Badge, 'id' | 'name'>[]>([])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      ...challenge,
      start_at: challenge?.start_at ? challenge.start_at.slice(0, 16) : '',
      end_at: challenge?.end_at ? challenge.end_at.slice(0, 16) : '',
      reward_points: challenge?.reward_points ?? 0,
      image_url: challenge?.image_url ?? '',
    },
  })

  useEffect(() => {
    Promise.all([
      supabase.from('heroes').select('id, full_name').order('full_name'),
      supabase.from('badges').select('id, name').order('name'),
    ]).then(([{ data: h }, { data: b }]) => {
      setHeroes((h as Pick<Hero, 'id' | 'full_name'>[]) ?? [])
      setBadges((b as Pick<Badge, 'id' | 'name'>[]) ?? [])
    })
  }, [])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function onSubmit(data: any) {
    data = data as FormData
    const payload = {
      title: data.title,
      description: data.description,
      type: data.type,
      hero_id: data.hero_id || null,
      target_lat: data.target_lat ?? null,
      target_lng: data.target_lng ?? null,
      target_radius: data.target_radius ?? null,
      reward_points: data.reward_points,
      reward_badge_id: data.reward_badge_id || null,
      image_url: data.image_url || null,
      start_at: data.start_at,
      end_at: data.end_at,
    }
    if (challenge) {
      await supabase.from('challenges').update(payload).eq('id', challenge.id)
    } else {
      await supabase.from('challenges').insert(payload)
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-xl bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="font-semibold text-gray-900">{challenge ? 'Chỉnh sửa thử thách' : 'Thêm thử thách'}</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100"><X className="h-5 w-5 text-gray-500" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="max-h-[75vh] overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Tiêu đề *</label>
              <input {...register('title')} className="input" />
              {errors.title && <p className="err">{errors.title.message}</p>}
            </div>
            <div>
              <label className="label">Loại *</label>
              <select {...register('type')} className="input">
                <option value="checkin">Check-in GPS</option>
                <option value="cipher">Giải mã</option>
                <option value="race">Đua xe</option>
                <option value="quiz">Câu đố</option>
              </select>
            </div>
            <div>
              <label className="label">Nhân vật lịch sử</label>
              <select {...register('hero_id')} className="input">
                <option value="">— Không liên kết —</option>
                {heroes.map((h) => <option key={h.id} value={h.id}>{h.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Vĩ độ mục tiêu (lat)</label>
              <input type="number" step="any" {...register('target_lat')} className="input" />
            </div>
            <div>
              <label className="label">Kinh độ mục tiêu (lng)</label>
              <input type="number" step="any" {...register('target_lng')} className="input" />
            </div>
            <div>
              <label className="label">Bán kính hợp lệ (mét)</label>
              <input type="number" {...register('target_radius')} className="input" />
            </div>
            <div>
              <label className="label">Điểm thưởng *</label>
              <input type="number" {...register('reward_points')} className="input" />
            </div>
            <div>
              <label className="label">Bắt đầu *</label>
              <input type="datetime-local" {...register('start_at')} className="input" />
              {errors.start_at && <p className="err">{errors.start_at.message}</p>}
            </div>
            <div>
              <label className="label">Kết thúc *</label>
              <input type="datetime-local" {...register('end_at')} className="input" />
              {errors.end_at && <p className="err">{errors.end_at.message}</p>}
            </div>
            <div className="col-span-2">
              <label className="label">Huy hiệu thưởng</label>
              <select {...register('reward_badge_id')} className="input">
                <option value="">— Không có —</option>
                {badges.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">URL ảnh bìa</label>
              <input {...register('image_url')} className="input" placeholder="https://..." />
              {errors.image_url && <p className="err">{errors.image_url.message}</p>}
            </div>
            <div className="col-span-2">
              <label className="label">Mô tả *</label>
              <textarea {...register('description')} rows={3} className="input resize-none" />
              {errors.description && <p className="err">{errors.description.message}</p>}
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
