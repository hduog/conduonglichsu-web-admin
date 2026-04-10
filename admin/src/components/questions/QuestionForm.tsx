import { useEffect, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import type { QuestionWithOptions } from '@/types/database'
import { X, Plus, Trash2, GripVertical } from 'lucide-react'

const optionSchema = z.object({
  label: z.string().min(1, 'Bắt buộc'),
  is_correct: z.boolean(),
})

const schema = z.object({
  content: z.string().min(1, 'Bắt buộc'),
  type_answer: z.enum(['normal_text', 'checkbox']),
  options: z.array(optionSchema),
}).superRefine((val, ctx) => {
  if (val.type_answer === 'checkbox') {
    if (val.options.length < 2) {
      ctx.addIssue({ code: 'custom', path: ['options'], message: 'Phải có ít nhất 2 lựa chọn.' })
    }
    if (!val.options.some(o => o.is_correct)) {
      ctx.addIssue({ code: 'custom', path: ['options'], message: 'Phải có ít nhất 1 đáp án đúng.' })
    }
  }
})

type FormData = z.infer<typeof schema>

interface QuestionFormProps {
  question: QuestionWithOptions | null
  onClose: () => void
  onSaved: () => void
}

export function QuestionForm({ question, onClose, onSaved }: QuestionFormProps) {
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, control, watch, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      content: question?.content ?? '',
      type_answer: question?.type_answer ?? 'normal_text',
      options: question?.question_options
        ?.slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(o => ({ label: o.label, is_correct: o.is_correct })) ?? [],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'options' })
  const typeAnswer = watch('type_answer')

  // Keep at least 2 options when switching to checkbox
  useEffect(() => {
    if (typeAnswer === 'checkbox' && fields.length < 2) {
      const needed = 2 - fields.length
      for (let i = 0; i < needed; i++) append({ label: '', is_correct: false })
    }
  }, [typeAnswer]) // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(data: FormData) {
    setServerError(null)
    try {
      let questionId = question?.id

      if (question) {
        const { error } = await supabase
          .from('questions')
          .update({ content: data.content, type_answer: data.type_answer })
          .eq('id', question.id)
        if (error) throw error
      } else {
        const { data: inserted, error } = await supabase
          .from('questions')
          .insert({ content: data.content, type_answer: data.type_answer })
          .select('id')
          .single()
        if (error) throw error
        questionId = inserted.id
      }

      // Replace options: delete old then insert new
      await supabase.from('question_options').delete().eq('question_id', questionId!)

      if (data.type_answer === 'checkbox' && data.options.length > 0) {
        const { error } = await supabase.from('question_options').insert(
          data.options.map((o, i) => ({
            question_id: questionId!,
            label: o.label,
            is_correct: o.is_correct,
            sort_order: i,
          }))
        )
        if (error) throw error
      }

      onSaved()
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Lỗi không xác định.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl rounded-xl bg-white shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
          <h2 className="font-semibold text-gray-900">
            {question ? 'Chỉnh sửa câu hỏi' : 'Thêm câu hỏi'}
          </h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col overflow-hidden">
          <div className="overflow-y-auto p-6 space-y-5">
            {serverError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {serverError}
              </div>
            )}

            {/* Content */}
            <div>
              <label className={s.label}>Nội dung câu hỏi *</label>
              <textarea
                {...register('content')}
                rows={3}
                className={s.input + ' resize-none'}
                placeholder="Nhập câu hỏi..."
              />
              {errors.content && <p className={s.err}>{errors.content.message}</p>}
            </div>

            {/* Type */}
            <div>
              <label className={s.label}>Loại câu trả lời</label>
              <select {...register('type_answer')} className={s.input}>
                <option value="normal_text">Văn bản tự do (normal_text)</option>
                <option value="checkbox">Trắc nghiệm (checkbox)</option>
              </select>
            </div>

            {/* Options — only for checkbox */}
            {typeAnswer === 'checkbox' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={s.label + ' mb-0'}>Lựa chọn</label>
                  <button
                    type="button"
                    onClick={() => append({ label: '', is_correct: false })}
                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" /> Thêm lựa chọn
                  </button>
                </div>

                {(errors.options as { message?: string } | undefined)?.message && (
                  <p className={s.err + ' mb-2'}>{(errors.options as { message?: string }).message}</p>
                )}

                <div className="space-y-2">
                  {fields.map((field, idx) => (
                    <div key={field.id} className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <GripVertical className="mt-2 h-4 w-4 shrink-0 text-gray-300" />

                      {/* is_correct */}
                      <label className="flex items-center gap-1.5 mt-2 cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          {...register(`options.${idx}.is_correct`)}
                          className="h-4 w-4 rounded border-gray-300 text-green-600"
                        />
                        <span className="text-xs text-gray-500">Đúng</span>
                      </label>

                      {/* label */}
                      <div className="flex-1">
                        <input
                          {...register(`options.${idx}.label`)}
                          className={s.input}
                          placeholder={`Lựa chọn ${idx + 1}`}
                        />
                        {errors.options?.[idx]?.label && (
                          <p className={s.err}>{errors.options[idx]!.label?.message}</p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => remove(idx)}
                        disabled={fields.length <= 2}
                        className="mt-2 rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-red-500 disabled:opacity-30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t px-6 py-4 shrink-0">
            <button type="button" onClick={onClose} className={s.btnSecondary}>Hủy</button>
            <button type="submit" disabled={isSubmitting} className={s.btnPrimary}>
              {isSubmitting ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .q-label{display:block;margin-bottom:0.25rem;font-size:0.875rem;font-weight:500;color:#374151}
        .q-input{width:100%;border-radius:0.5rem;border:1px solid #d1d5db;padding:0.5rem 0.75rem;font-size:0.875rem;outline:none;background:white}
        .q-input:focus{border-color:#6366f1;box-shadow:0 0 0 2px rgba(99,102,241,.15)}
        .q-err{margin-top:0.25rem;font-size:0.75rem;color:#dc2626}
        .q-btn-primary{border-radius:0.5rem;background:hsl(222.2 47.4% 11.2%);padding:0.5rem 1rem;font-size:0.875rem;font-weight:500;color:white;transition:opacity .15s}
        .q-btn-primary:hover:not(:disabled){opacity:.9}
        .q-btn-primary:disabled{opacity:.6;cursor:not-allowed}
        .q-btn-secondary{border-radius:0.5rem;border:1px solid #d1d5db;padding:0.5rem 1rem;font-size:0.875rem;font-weight:500;color:#374151}
        .q-btn-secondary:hover{background:#f9fafb}
      `}</style>
    </div>
  )
}

// Style shorthand (avoids repetition in JSX)
const s = {
  label: 'q-label block mb-1 text-sm font-medium text-gray-700',
  input: 'q-input',
  err: 'q-err',
  btnPrimary: 'q-btn-primary',
  btnSecondary: 'q-btn-secondary',
}
