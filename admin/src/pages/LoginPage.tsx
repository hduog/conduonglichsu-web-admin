import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Star } from 'lucide-react'

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    console.log('Submitting login with', { email, password });
    const { error } = await signIn(email, password)
    console.log('Login result', { error });
    setLoading(false)
    if (error) {
      setError(error)
    } else {
      navigate('/')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Star className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Con Đường Lịch Sử</h1>
          <p className="text-sm text-gray-500">Đăng nhập vào trang quản trị</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border bg-white p-8 shadow-sm space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
              placeholder="admin@conduonglichsu.vn"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  )
}
