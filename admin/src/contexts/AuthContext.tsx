import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@/types/database'
import type { Session } from '@supabase/supabase-js'
import { useNavigate } from 'react-router-dom'

interface AuthContextValue {
  session: Session | null
  adminUser: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [adminUser, setAdminUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  async function loadUserProfile(userId: string) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    return data as User | null
  }

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
      try {
        if (session) {
          setSession(session);
        } else {
          navigate('/login')
        }
      } finally {
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])
  useEffect(() => {
    if (session) {
      loadUserProfile(session.user.id).then(profile => {
        setAdminUser(profile);
      })
    }
  }, [session])

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }

    const profile = await loadUserProfile(data.user.id)
    if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
      await supabase.auth.signOut()
      return { error: 'Bạn không có quyền truy cập trang quản trị.' }
    }

    setAdminUser(profile)
    return { error: null }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setAdminUser(null)
  }

  return (
    <AuthContext.Provider value={{ session, adminUser, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
