import { authToken } from './auth.ts'
import type { JobPin } from '../types.ts'

export const APPLICATION_STATUSES = ['applied', 'screening', 'interview', 'offered', 'rejected', 'withdrawn'] as const

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied: 'Applied',
  screening: 'Screening',
  interview: 'Interview',
  offered: 'Offered',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
}

export type TrackedApplication = {
  id: number
  jobTitle: string
  company: string
  status: string
  statusDisplay: string
  jobUrl: string | null
  location: string
  createdAt: string
}

type BoardPayload = {
  data?: Record<string, TrackedApplication[]>
  message?: string
}

type WritePayload = {
  success?: boolean
  message?: string
  data?: TrackedApplication
  meta?: { alreadyTracked?: boolean }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = authToken()
  if (!token) throw new Error('Sign in to track applications.')
  const headers = new Headers(options.headers)
  headers.set('accept', 'application/json')
  headers.set('authorization', `Bearer ${token}`)
  if (options.body) headers.set('content-type', 'application/json')
  const response = await fetch(path, { ...options, headers })
  const payload = (await response.json().catch(() => null)) as (T & { message?: string }) | null
  if (!response.ok) throw new Error(payload?.message || 'Could not update this application.')
  return (payload ?? {}) as T
}

export async function loadApplicationBoard() {
  const payload = await request<BoardPayload>('/api/v1/tracked_applications')
  const columns = {} as Record<ApplicationStatus, TrackedApplication[]>
  for (const status of APPLICATION_STATUSES) {
    columns[status] = payload.data?.[status] ?? []
  }
  return columns
}

export async function trackJob(job: JobPin) {
  const payload = await request<WritePayload>('/api/v1/tracked_applications', {
    method: 'POST',
    body: JSON.stringify({
      job_external_id: job.id,
      job_title: job.title,
      company_name: job.company,
      job_url: job.applyUrl,
      location: job.locationLabel,
    }),
  })
  if (!payload.data) throw new Error(payload.message || 'Could not track application.')
  return { application: payload.data, alreadyTracked: Boolean(payload.meta?.alreadyTracked) }
}

export function updateApplicationStatus(id: number, status: ApplicationStatus) {
  return request<WritePayload>(`/api/v1/tracked_applications/${id}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  })
}

export function removeApplication(id: number) {
  return request<{ success?: boolean; message?: string }>(`/api/v1/tracked_applications/${id}`, {
    method: 'DELETE',
  })
}
