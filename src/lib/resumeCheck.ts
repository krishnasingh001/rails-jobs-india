export type AtsCheckItem = {
  id: string
  label: string
  status: 'pass' | 'fail' | 'warn'
  detail: string
  impact: number
}

export type AtsCheckCategory = {
  id: string
  label: string
  score: number
  points_to_gain: number
  checks: AtsCheckItem[]
}

export type AtsCheckReport = {
  overall_score: number
  summary: string
  passed_count: number
  failed_count: number
  total_checks: number
  filename?: string | null
  target_role?: string | null
  categories: AtsCheckCategory[]
}

import { authToken } from './auth.ts'

export type SavedResumeCheck = {
  id: number
  filename: string
  byte_size: number
  target_role: string | null
  overall_score: number
  summary: string | null
  created_at: string
}

function authHeaders(): Headers {
  const headers = new Headers({ accept: 'application/json' })
  const token = authToken()
  if (token) headers.set('authorization', `Bearer ${token}`)
  return headers
}

export const MAX_RESUME_BYTES = 5 * 1024 * 1024

export function validateResumeFile(file: File): string | null {
  const name = file.name.toLowerCase()
  if (!name.endsWith('.pdf') && !name.endsWith('.docx')) return 'Please upload a PDF or DOCX resume.'
  if (file.size > MAX_RESUME_BYTES) return 'Resume must be 5MB or smaller.'
  return null
}

export async function checkResume(file: File, targetRole: string): Promise<{ report: AtsCheckReport; saved: boolean }> {
  const form = new FormData()
  form.append('resume', file)
  if (targetRole.trim()) form.append('target_role', targetRole.trim())

  const response = await fetch('/api/v1/resume_checks', { method: 'POST', body: form, headers: authHeaders() })
  const payload = (await response.json().catch(() => null)) as {
    data?: AtsCheckReport
    message?: string
    meta?: { saved?: boolean }
  } | null
  if (!response.ok || !payload?.data) throw new Error(payload?.message || 'Could not analyze this resume.')
  return { report: payload.data, saved: Boolean(payload.meta?.saved) }
}

export async function extractResumeSkills(file: File): Promise<string[]> {
  const form = new FormData()
  form.append('resume', file)
  const response = await fetch('/api/v1/resume_skills', { method: 'POST', body: form, headers: { accept: 'application/json' } })
  const payload = (await response.json().catch(() => null)) as { skills?: string[]; message?: string } | null
  if (!response.ok || !payload?.skills) throw new Error(payload?.message || 'Could not read this resume.')
  return payload.skills
}

export async function listResumeChecks(): Promise<SavedResumeCheck[]> {
  const response = await fetch('/api/v1/resume_checks', { headers: authHeaders() })
  const payload = (await response.json().catch(() => null)) as { data?: SavedResumeCheck[]; message?: string } | null
  if (!response.ok || !payload?.data) throw new Error(payload?.message || 'Could not load your earlier checks.')
  return payload.data
}

export async function loadResumeCheck(id: number): Promise<AtsCheckReport> {
  const response = await fetch(`/api/v1/resume_checks/${id}`, { headers: authHeaders() })
  const payload = (await response.json().catch(() => null)) as { data?: AtsCheckReport; message?: string } | null
  if (!response.ok || !payload?.data) throw new Error(payload?.message || 'Could not open this report.')
  return payload.data
}

export async function deleteResumeCheck(id: number): Promise<void> {
  const response = await fetch(`/api/v1/resume_checks/${id}`, { method: 'DELETE', headers: authHeaders() })
  if (!response.ok) throw new Error('Could not delete this check.')
}

export async function downloadResumeFile(check: SavedResumeCheck): Promise<void> {
  const response = await fetch(`/api/v1/resume_checks/${check.id}/file`, { headers: authHeaders() })
  if (!response.ok) throw new Error('Could not download this resume.')
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = check.filename
  link.click()
  URL.revokeObjectURL(url)
}
