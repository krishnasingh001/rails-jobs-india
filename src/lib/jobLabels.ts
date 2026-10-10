import type { JobPin, Provenance } from '../types.ts'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function formatPosted(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const [year, month, day] = value.split('-')
  const monthName = MONTHS[Number(month) - 1]
  if (!year || !monthName || !day) return value
  return `${Number(day)} ${monthName} ${year}`
}

export function workModeLabel(mode: JobPin['workMode']): string {
  if (mode === 'hybrid') return 'Hybrid'
  if (mode === 'remote') return 'Remote'
  return 'On-site'
}

export function timeAgo(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return iso
  const minutes = Math.max(0, Math.round((now - then) / 60000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

// e.g. "From Google Jobs, fetched 3 hours ago, query: Rails in Pune"
export function provenanceLine(provenance: Provenance): string {
  const parts = [`From ${provenance.source}`]
  if (provenance.fetchedAt) parts.push(`fetched ${timeAgo(provenance.fetchedAt)}`)
  if (provenance.query) {
    parts.push(`query: ${provenance.query}${provenance.searchLocation ? ` in ${provenance.searchLocation}` : ''}`)
  }
  return parts.join(', ')
}
