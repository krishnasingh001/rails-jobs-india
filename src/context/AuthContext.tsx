import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  clearAuthToken,
  fetchAccount,
  loginAccount,
  logoutAccount,
  registerAccount,
  saveAuthToken,
  saveProfile,
  type Account,
  type AiLevel,
  type ProfileUpdate,
} from '../lib/auth.ts'

type AuthContextValue = {
  user: Account | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (payload: {
    name: string
    email: string
    password: string
    password_confirmation: string
    role?: string
    resume_url?: string
    skills?: string[]
    years_experience?: number | null
    resume_ai_fluency?: AiLevel | null
    resume_ai_signals?: string[]
  }) => Promise<void>
  updateProfile: (update: ProfileUpdate) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchAccount()
      .then((payload) => {
        if (!cancelled) setUser(payload.user ?? null)
      })
      .catch(() => {
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const payload = await loginAccount(email, password)
    if (payload.auth_token) saveAuthToken(payload.auth_token)
    setUser(payload.user ?? null)
  }, [])

  const register = useCallback(
    async (payload: {
      name: string
      email: string
      password: string
      password_confirmation: string
      role?: string
      resume_url?: string
      skills?: string[]
      years_experience?: number | null
      resume_ai_fluency?: AiLevel | null
      resume_ai_signals?: string[]
    }) => {
      const result = await registerAccount(payload)
      if (result.auth_token) saveAuthToken(result.auth_token)
      setUser(result.user ?? null)
    },
    [],
  )

  const updateProfile = useCallback(async (update: ProfileUpdate) => {
    const result = await saveProfile(update)
    if (result.user) setUser(result.user)
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutAccount()
    } finally {
      clearAuthToken()
      setUser(null)
    }
  }, [])

  const value = useMemo(() => ({ user, loading, login, register, updateProfile, logout }), [user, loading, login, register, updateProfile, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
