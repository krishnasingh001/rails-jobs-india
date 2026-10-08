import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  clearAuthToken,
  fetchAccount,
  loginAccount,
  logoutAccount,
  registerAccount,
  saveAuthToken,
  type Account,
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
    role: string
  }) => Promise<void>
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
      role: string
    }) => {
      const result = await registerAccount(payload)
      if (result.auth_token) saveAuthToken(result.auth_token)
      setUser(result.user ?? null)
    },
    [],
  )

  const logout = useCallback(async () => {
    try {
      await logoutAccount()
    } finally {
      clearAuthToken()
      setUser(null)
    }
  }, [])

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
