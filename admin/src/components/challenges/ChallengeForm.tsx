import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import type { Challenge, Hero, Badge, QuestionWithOptions } from '@/types/database'
import { QuestionPickerDialog } from './QuestionPickerDialog'
import { X, MapPin, ListChecks, GripVertical, Trash2, Plus } from 'lucide-react'

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
  const [selectedQuestions, setSelectedQuestions] = useState<QuestionWithOptions[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      ...challenge,
      start_at: challenge?.start_at ? challenge.start_at.slice(0, 16) : '',
      end_at: challenge?.end_at ? challenge.end_at.slice(0, 16) : '',
      reward_points: challenge?.reward_points ?? 0,
      image_url: challenge?.image_url ?? '',
    },
  })

  const watchedType = watch('type')

  // Load reference data + existing questions for edit mode
  useEffect(() => {
    Promise.all([
      supabase.from('heroes').select('id, full_name').order('full_name'),
      supabase.from('badges').select('id, name').order('name'),
    ]).then(([{ data: h }, { data: b }]) => {
      setHeroes((h as Pick<Hero, 'id' | 'full_name'>[]) ?? [])
      setBadges((b as Pick<Badge, 'id' | 'name'>[]) ?? [])
    })

    if (challenge?.id && challenge.type === 'quiz') {
      supabase
        .from('challenge_questions')
        .select('sort_order, questions(*, question_options(*))')
        .eq('challenge_id', challenge.id)
        .order('sort_order')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then(({ data }) => {
          if (data) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setSelectedQuestions(data.map((d: any) => d.questions as QuestionWithOptions).filter(Boolean))
          }
        })
    }
  }, [challenge?.id])

  function removeQuestion(id: string) {
    setSelectedQuestions(prev => prev.filter(q => q.id !== id))
  }

  function moveQuestion(from: number, to: number) {
    setSelectedQuestions(prev => {
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function onSubmit(data: any) {
    const payload = {
      title: data.title,
      description: data.description,
      type: data.type,
      hero_id: data.hero_id || null,
      target_lat: data.type === 'checkin' ? (data.target_lat ?? null) : null,
      target_lng: data.type === 'checkin' ? (data.target_lng ?? null) : null,
      target_radius: data.type === 'checkin' ? (data.target_radius ?? null) : null,
      reward_points: data.reward_points,
      reward_badge_id: data.reward_badge_id || null,
      image_url: data.image_url || null,
      start_at: data.start_at,
      end_at: data.end_at,
    }

    let challengeId = challenge?.id ?? null

    if (challenge) {
      await supabase.from('challenges').update(payload).eq('id', challenge.id)
    } else {
      const { data: created } = await supabase.from('challenges').insert(payload).select('id').single()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      challengeId = (created as any)?.id ?? null
    }

    // Sync challenge_questions for quiz type
    if (data.type === 'quiz' && challengeId) {
      await supabase.from('challenge_questions').delete().eq('challenge_id', challengeId)
      if (selectedQuestions.length > 0) {
        await supabase.from('challenge_questions').insert(
          selectedQuestions.map((q, i) => ({
            challenge_id: challengeId,
            question_id: q.id,
            sort_order: i,
          }))
        )
      }
    }

    onSaved()
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/40" onClick={onClose} />
        <div className="relative z-10 w-full max-w-2xl rounded-xl bg-white shadow-xl overflow-hidden">

          {/* Modal header */}
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="font-semibold text-gray-900">
              {challenge ? 'Chỉnh sửa thử thách' : 'Thêm thử thách'}
            </h2>
            <button onClick={onClose} className="rounded p-1 hover:bg-gray-100">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="max-h-[75vh] overflow-y-auto p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">

              {/* Title */}
              <div className="col-span-2">
                <label className="label">Tiêu đề *</label>
                <input {...register('title')} className="input" placeholder="Tên thử thách..." />
                {errors.title && <p className="err">{errors.title.message}</p>}
              </div>

              {/* Type + Hero */}
              <div>
                <label className="label">Loại *</label>
                <select {...register('type')} className="input">
                  <option value="checkin">Check-in GPS</option>
                  <option value="quiz">Câu đố (Quiz)</option>
                </select>
              </div>
              <div>
                <label className="label">Nhân vật lịch sử</label>
                <select {...register('hero_id')} className="input">
                  <option value="">— Không liên kết —</option>
                  {heroes.map(h => <option key={h.id} value={h.id}>{h.full_name}</option>)}
                </select>
              </div>

              {/* GPS fields — only for checkin */}
              {watchedType === 'checkin' && (
                <>
                  <div className="col-span-2">
                    <div className="flex items-center gap-1.5 mb-3">
                      <MapPin className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium text-gray-700">Vị trí GPS mục tiêu</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 rounded-lg border border-blue-100 bg-blue-50 p-3">
                      <div>
                        <label className="label">Vĩ độ (lat)</label>
                        <input type="number" step="any" {...register('target_lat')} className="input" placeholder="10.7769" />
                      </div>
                      <div>
                        <label className="label">Kinh độ (lng)</label>
                        <input type="number" step="any" {...register('target_lng')} className="input" placeholder="106.7009" />
                      </div>
                      <div>
                        <label className="label">Bán kính hợp lệ (m)</label>
                        <input type="number" {...register('target_radius')} className="input" placeholder="100" />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Reward fields */}
              <div>
                <label className="label">Điểm thưởng *</label>
                <input type="number" {...register('reward_points')} className="input" />
              </div>
              <div>
                <label className="label">Huy hiệu thưởng</label>
                <select {...register('reward_badge_id')} className="input">
                  <option value="">— Không có —</option>
                  {badges.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              {/* Time range */}
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

              {/* Cover image */}
              <div className="col-span-2">
                <label className="label">URL ảnh bìa</label>
                <input {...register('image_url')} className="input" placeholder="https://..." />
                {errors.image_url && <p className="err">{errors.image_url.message}</p>}
              </div>

              {/* Description */}
              <div className="col-span-2">
                <label className="label">Mô tả *</label>
                <textarea {...register('description')} rows={3} className="input resize-none" />
                {errors.description && <p className="err">{errors.description.message}</p>}
              </div>

              {/* Quiz — question list */}
              {watchedType === 'quiz' && (
                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <ListChecks className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium text-gray-700">
                        Danh sách câu hỏi
                        {selectedQuestions.length > 0 && (
                          <span className="ml-1.5 rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
                            {selectedQuestions.length}
                          </span>
                        )}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPickerOpen(true)}
                      className="flex items-center gap-1 rounded-lg border border-purple-300 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-50 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" /> Thêm / chọn câu hỏi
                    </button>
                  </div>

                  {selectedQuestions.length === 0 ? (
                    <div
                      onClick={() => setPickerOpen(true)}
                      className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 py-8 cursor-pointer hover:border-purple-300 hover:bg-purple-50 transition-colors"
                    >
                      <ListChecks className="h-8 w-8 text-gray-300" />
                      <p className="text-sm text-gray-400">Chưa có câu hỏi nào. Nhấn để chọn.</p>
                    </div>
                  ) : (
                    <ul className="space-y-2 rounded-lg border border-gray-200 p-2">
                      {selectedQuestions.map((q, i) => (
                        <li key={q.id} className="flex items-start gap-2 rounded-lg bg-gray-50 px-3 py-2.5">
                          {/* Order controls */}
                          <div className="flex flex-col items-center gap-0.5 shrink-0 mt-0.5">
                            <button
                              type="button"
                              disabled={i === 0}
                              onClick={() => moveQuestion(i, i - 1)}
                              className="rounded p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-20"
                              title="Lên"
                            >
                              <GripVertical className="h-4 w-4" />
                            </button>
                            <span className="text-xs font-mono text-gray-400 leading-none">{i + 1}</span>
                            <button
                              type="button"
                              disabled={i === selectedQuestions.length - 1}
                              onClick={() => moveQuestion(i, i + 1)}
                              className="rounded p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-20 rotate-180"
                              title="Xuống"
                            >
                              <GripVertical className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Question content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800 leading-snug">{q.content}</p>
                            <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                              q.type_answer === 'checkbox'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}>
                              {q.type_answer === 'checkbox' ? 'Trắc nghiệm' : 'Tự luận'}
                            </span>
                            {q.type_answer === 'checkbox' && q.question_options.length > 0 && (
                              <p className="mt-0.5 text-xs text-gray-400">
                                {q.question_options.length} đáp án
                                {' · '}
                                {q.question_options.filter(o => o.is_correct).length} đúng
                              </p>
                            )}
                          </div>

                          {/* Remove */}
                          <button
                            type="button"
                            onClick={() => removeQuestion(q.id)}
                            className="shrink-0 rounded p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Xóa khỏi thử thách"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary">Hủy</button>
              <button type="submit" disabled={isSubmitting} className="btn-primary">
                {isSubmitting ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {pickerOpen && (
        <QuestionPickerDialog
          alreadySelected={selectedQuestions.map(q => q.id)}
          onConfirm={(questions) => {
            setSelectedQuestions(questions)
            setPickerOpen(false)
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}

      <style>{`
        .label{display:block;margin-bottom:0.25rem;font-size:0.875rem;font-weight:500;color:#374151}
        .input{width:100%;border-radius:0.5rem;border:1px solid #d1d5db;padding:0.5rem 0.75rem;font-size:0.875rem;outline:none;background:white}
        .input:focus{outline:none;ring:2px solid hsl(222.2 47.4% 11.2%)}
        .err{margin-top:0.25rem;font-size:0.75rem;color:#dc2626}
        .btn-primary{border-radius:0.5rem;background:hsl(222.2 47.4% 11.2%);padding:0.5rem 1rem;font-size:0.875rem;font-weight:500;color:white;transition:opacity .15s}
        .btn-primary:hover{opacity:0.9}
        .btn-primary:disabled{opacity:0.6}
        .btn-secondary{border-radius:0.5rem;border:1px solid #d1d5db;padding:0.5rem 1rem;font-size:0.875rem;font-weight:500;color:#374151}
        .btn-secondary:hover{background:#f9fafb}
      `}</style>
    </>
  )
}
