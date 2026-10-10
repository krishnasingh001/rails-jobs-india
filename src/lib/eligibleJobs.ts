import type { WorkModePreference } from './auth.ts'
import type { JobPin } from '../types.ts'

export type JobWants = {
  cities: string[]
  modes: WorkModePreference[]
}

/**
 * The hard filters for a candidate's feed. Everything else only ranks.
 * - A job the scrape found remote shows only when the candidate wants remote.
 * - Any other job needs a work mode the candidate chose (no modes chosen means no mode filter)
 *   and, when they chose cities, to be in one of them. A job with no known city cannot be confirmed, so it is left out.
 */
export function isEligible(job: JobPin, wants: JobWants): boolean {
  if (job.workMode === 'remote') return wants.modes.includes('remote')
  if (wants.modes.length > 0 && !wants.modes.includes(job.workMode)) return false
  if (wants.cities.length === 0) return true
  const city = job.city?.toLowerCase()
  return city != null && wants.cities.some((wanted) => wanted.toLowerCase() === city)
}
