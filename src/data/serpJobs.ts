import { normalizeLocation } from '../lib/normalizeLocation.ts'
import type { JobPin, JobsSource } from '../types.ts'

type SerpJob = {
  id: string
  title: string
  company: string
  location: string
  salary: string | null
  applyUrl: string | null
  applyHost: string | null
  postedAt: string
}

function isSerpJob(value: unknown): value is SerpJob {
  if (!value || typeof value !== 'object') return false
  const job = value as Partial<SerpJob>
  return typeof job.id === 'string' && typeof job.title === 'string' && typeof job.company === 'string'
}

function toJobPin(job: SerpJob): JobPin {
  const located = normalizeLocation(job.location)
  const place = [located.city, located.state].filter(Boolean).join(', ')
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    city: located.city,
    state: located.state,
    code: located.code,
    latitude: located.latitude,
    longitude: located.longitude,
    workMode: located.workMode,
    locationLabel: job.location.trim() || place || 'India',
    salaryLabel: job.salary,
    applyHost: job.applyHost,
    applyUrl: job.applyUrl,
    postedAt: job.postedAt,
  }
}

async function readJobs(response: Response): Promise<{ jobs: JobPin[]; added: number }> {
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : 'Could not load jobs from SerpApi.'
    throw new Error(message)
  }
  const jobs = payload && typeof payload === 'object' && 'jobs' in payload ? payload.jobs : null
  if (!Array.isArray(jobs)) throw new Error('SerpApi returned an unexpected job list.')
  const added =
    payload && typeof payload === 'object' && 'added' in payload && typeof payload.added === 'number' ? payload.added : 0
  return { jobs: jobs.filter(isSerpJob).map(toJobPin), added }
}

export const serpApiJobsSource: JobsSource = {
  load() {
    return fetch('/api/v1/jobs').then(readJobs).then((result) => result.jobs)
  },
}

export function harvestJobs(): Promise<{ jobs: JobPin[]; added: number }> {
  return fetch('/api/v1/harvests', { method: 'POST' }).then(readJobs)
}
