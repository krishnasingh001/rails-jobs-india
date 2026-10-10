import { authToken } from './auth.ts'

export type FitSkill = { name: string; terms: string[] }

export type JobFit = {
  required: FitSkill[]
  matched: string[]
  missing: string[]
  score: number | null
  signed_in: boolean
  has_skills: boolean
  ats_score: number | null
}

export async function loadJobFit(title: string, description: string): Promise<JobFit> {
  const headers = new Headers({ accept: 'application/json', 'content-type': 'application/json' })
  const token = authToken()
  if (token) headers.set('authorization', `Bearer ${token}`)
  const response = await fetch('/api/v1/job_fit', { method: 'POST', headers, body: JSON.stringify({ title, description }) })
  const payload = (await response.json().catch(() => null)) as { data?: JobFit; message?: string } | null
  if (!response.ok || !payload?.data) throw new Error(payload?.message || 'Could not check your fit for this job.')
  return payload.data
}
