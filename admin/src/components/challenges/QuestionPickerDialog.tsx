import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { QuestionWithOptions, QuestionAnswerType } from '@/types/database'
import { X, Plus, Trash2, Check } from 'lucide-react'

interface Props {
  alreadySelected: string[]
  onConfirm: (questions: QuestionWithOptions[]) => void
  onClose: () => void
}

const answerTypeLabel: Record<QuestionAnswerType, string> = {
  normal_text: 'Tự luận',
  checkbox: 'Trắc nghiệm',
}

export function QuestionPickerDialog({ alreadySelected, onConfirm, onClose }: Props) {
  const [questions, setQuestions] = useState<QuestionWithOptions[]>([])
  const [checked, setChecked] = useState<Set<string>>(new Set(alreadySelected))
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  // new question form
  const [newContent, setNewContent] = useState('')
  const [newType, setNewType] = useState<QuestionAnswerType>('normal_text')
  const [newOptions, setNewOptions] = useState([{ label: '', is_correct: false }])
  const [saving, setSaving] = useState(false)

  async function fetchQuestions() {
    setLoading(true)
    const { data } = await supabase
      .from('questions')
      .select('*, question_options(*)')
      .order('created_at', { ascending: false })
    setQuestions((data as QuestionWithOptions[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchQuestions() }, [])

  function toggle(id: string) {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function updateOption(i: number, patch: Partial<{ label: string; is_correct: boolean }>) {
    setNewOptions(prev => prev.map((o, idx) => idx === i ? { ...o, ...patch } : o))
  }

  async function saveNewQuestion() {
    if (!newContent.trim()) return
    setSaving(true)
    const { data: q } = await supabase
      .from('questions')
      .insert({ content: newContent.trim(), type_answer: newType })
      .select()
      .single()

    if (q && newType === 'checkbox') {
      const opts = newOptions
        .filter(o => o.label.trim())
        .map((o, i) => ({ question_id: q.id, label: o.label.trim(), is_correct: o.is_correct, sort_order: i }))
      if (opts.length > 0) await supabase.from('question_options').insert(opts)
    }

    setNewContent('')
    setNewType('normal_text')
    setNewOptions([{ label: '', is_correct: false }])
    setCreating(false)
    setSaving(false)
    await fetchQuestions()
    if (q) setChecked(prev => new Set([...prev, q.id]))
  }

  function handleConfirm() {
    onConfirm(questions.filter(q => checked.has(q.id)))
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl rounded-xl bg-white shadow-xl flex flex-col max-h-[80vh]">

        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
          <div>
            <h3 className="font-semibold text-gray-900">Chọn câu hỏi</h3>
            <p className="text-xs text-gray-400 mt-0.5">Đã chọn {checked.size} câu hỏi</p>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <p className="text-center text-sm text-gray-400 py-8">Đang tải...</p>
          ) : questions.length === 0 && !creating ? (
            <p className="text-center text-sm text-gray-400 py-8">Chưa có câu hỏi nào. Tạo câu hỏi đầu tiên!</p>
          ) : (
            questions.map(q => (
              <label
                key={q.id}
                className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                  checked.has(q.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked.has(q.id)}
                  onChange={() => toggle(q.id)}
                  className="mt-0.5 h-4 w-4 rounded accent-blue-600"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 leading-snug">{q.content}</p>
                  <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    q.type_answer === 'checkbox'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {answerTypeLabel[q.type_answer]}
                  </span>
                  {q.type_answer === 'checkbox' && q.question_options.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5">
                      {q.question_options
                        .sort((a, b) => a.sort_order - b.sort_order)
                        .map(o => (
                          <li key={o.id} className={`flex items-center gap-1 text-xs ${o.is_correct ? 'text-green-700 font-medium' : 'text-gray-500'}`}>
                            {o.is_correct
                              ? <Check className="h-3 w-3 shrink-0" />
                              : <span className="h-3 w-3 shrink-0" />}
                            {o.label}
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              </label>
            ))
          )}

          {/* Inline create form */}
          {creating && (
            <div className="rounded-lg border-2 border-blue-300 bg-blue-50 p-4 space-y-3">
              <p className="text-sm font-semibold text-blue-900">Câu hỏi mới</p>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nội dung câu hỏi *</label>
                <textarea
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  placeholder="Nhập nội dung câu hỏi..."
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 resize-none bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Loại câu trả lời</label>
                <select
                  value={newType}
                  onChange={e => {
                    setNewType(e.target.value as QuestionAnswerType)
                    setNewOptions([{ label: '', is_correct: false }])
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none bg-white"
                >
                  <option value="normal_text">Tự luận</option>
                  <option value="checkbox">Trắc nghiệm</option>
                </select>
              </div>

              {newType === 'checkbox' && (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-600">
                    Đáp án <span className="text-gray-400">(tích vào đáp án đúng)</span>
                  </label>
                  {newOptions.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={opt.is_correct}
                        onChange={e => updateOption(i, { is_correct: e.target.checked })}
                        className="h-4 w-4 rounded accent-green-600 shrink-0"
                        title="Đáp án đúng"
                      />
                      <input
                        value={opt.label}
                        onChange={e => updateOption(i, { label: e.target.value })}
                        placeholder={`Đáp án ${i + 1}`}
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none bg-white focus:ring-1 focus:ring-blue-400"
                      />
                      {newOptions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setNewOptions(newOptions.filter((_, idx) => idx !== i))}
                          className="text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setNewOptions([...newOptions, { label: '', is_correct: false }])}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                  >
                    <Plus className="h-3 w-3" /> Thêm đáp án
                  </button>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="flex-1 rounded-lg border border-gray-300 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={saveNewQuestion}
                  disabled={saving || !newContent.trim()}
                  className="flex-1 rounded-lg bg-blue-600 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Đang lưu...' : 'Lưu câu hỏi'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-3 flex items-center justify-between gap-2 shrink-0 bg-gray-50">
          <button
            type="button"
            onClick={() => setCreating(true)}
            disabled={creating}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-blue-400 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 disabled:opacity-40 transition-colors"
          >
            <Plus className="h-4 w-4" /> Tạo câu hỏi mới
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Xác nhận ({checked.size})
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
