import type { JobPin, WorkMode } from '../types.ts'

export type SortKey = 'recent' | 'oldest' | 'company'
export type ModeFilter = WorkMode | 'all'

export type JobFilters = {
  query: string
  city: string
  stateCode: string | null
  mode: ModeFilter
  sort: SortKey
}

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'recent', label: 'Recently posted' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'company', label: 'Company A to Z' },
]

function postedTime(job: JobPin): number {
  const time = new Date(job.postedAt).getTime()
  return Number.isNaN(time) ? 0 : time
}

function matchesQuery(job: JobPin, needle: string): boolean {
  if (needle === '') return true
  const haystack = [job.title, job.company, job.locationLabel, job.city, job.state]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return needle.split(/\s+/).every((word) => haystack.includes(word))
}

export function sortJobs(jobs: JobPin[], sort: SortKey): JobPin[] {
  const copy = [...jobs]
  if (sort === 'company') return copy.sort((a, b) => a.company.localeCompare(b.company) || postedTime(b) - postedTime(a))
  if (sort === 'oldest') return copy.sort((a, b) => postedTime(a) - postedTime(b))
  return copy.sort((a, b) => postedTime(b) - postedTime(a))
}

/** Everything except the work-mode filter, so the mode chips can show counts for the rest of the filters. */
export function filterWithoutMode(jobs: JobPin[], filters: JobFilters): JobPin[] {
  const needle = filters.query.trim().toLowerCase()
  return jobs.filter(
    (job) =>
      (filters.city === '' || job.city === filters.city) &&
      (filters.stateCode === null || job.code === filters.stateCode) &&
      matchesQuery(job, needle),
  )
}

export function applyFilters(jobs: JobPin[], filters: JobFilters): JobPin[] {
  const matched = filterWithoutMode(jobs, filters).filter((job) => filters.mode === 'all' || job.workMode === filters.mode)
  return sortJobs(matched, filters.sort)
}
