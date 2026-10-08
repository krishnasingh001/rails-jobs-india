const TOKEN_KEY = 'rails-jobs-india-token'

export type Account = {
  id: number
  name: string
  email: string
  role: 'candidate' | 'recruiter'
}

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
  role: string
}) {
  return request('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function logoutAccount() {
  return request('/api/v1/auth/logout', { method: 'DELETE' })
}
