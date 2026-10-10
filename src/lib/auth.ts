const TOKEN_KEY = 'rails-jobs-india-token'

export type Account = {
  id: number
  name: string
  email: string
  role: 'candidate'
  resume_url?: string | null
  skills?: string[]
  preferred_cities?: string[]
  work_modes?: WorkModePreference[]
  expected_salary_lpa?: number | null
  years_experience?: number | null
  ai_fluency?: AiLevel | null
  resume_ai_fluency?: AiLevel | null
  resume_ai_signals?: string[]
  avatar?: string | null
}

export type WorkModePreference = 'remote' | 'hybrid' | 'onsite'
export type AiLevel = 'none' | 'user' | 'builder' | 'expert'

export type ProfileUpdate = Partial<{
  skills: string[]
  resume_url: string
  avatar: string | null
  preferred_cities: string[]
  work_modes: WorkModePreference[]
  expected_salary_lpa: number | null
  years_experience: number | null
  ai_fluency: AiLevel | null
  resume_ai_fluency: AiLevel | null
  resume_ai_signals: string[]
}>

export function authToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function saveAuthToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY)
}

type AuthPayload = {
  success?: boolean
  message?: string
  errors?: string[]
  user?: Account
  auth_token?: string
  requires_confirmation?: boolean
}

async function request(path: string, options: RequestInit = {}): Promise<AuthPayload> {
  const headers = new Headers(options.headers)
  headers.set('accept', 'application/json')
  if (options.body) headers.set('content-type', 'application/json')
  const token = authToken()
  if (token) headers.set('authorization', `Bearer ${token}`)

  const response = await fetch(path, { ...options, headers })
  const payload = (await response.json().catch(() => null)) as AuthPayload | null
  if (!response.ok) {
    const message = payload?.errors?.join(', ') || payload?.message || 'Request failed.'
    throw new Error(message)
  }
  return payload ?? {}
}

export function fetchAccount() {
  return request('/api/v1/auth/me')
}

export function loginAccount(email: string, password: string) {
  return request('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function registerAccount(payload: {
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
}) {
  return request('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function logoutAccount() {
  return request('/api/v1/auth/logout', { method: 'DELETE' })
}

export function saveProfile(update: ProfileUpdate) {
  return request('/api/v1/profile', { method: 'PATCH', body: JSON.stringify(update) })
}
