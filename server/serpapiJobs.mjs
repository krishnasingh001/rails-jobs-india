import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const CACHE_PATH = join(process.cwd(), '.serpapi-cache.json')
const CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000

const QUERIES = [
  { q: 'Ruby on Rails', location: 'India' },
  { q: 'Ruby on Rails developer', location: 'Bengaluru, Karnataka, India' },
]

function readCache() {
  if (!existsSync(CACHE_PATH)) return null
  try {
    const parsed = JSON.parse(readFileSync(CACHE_PATH, 'utf8'))
    if (!parsed || !Array.isArray(parsed.jobs) || typeof parsed.fetchedAt !== 'number') return null
    if (Date.now() - parsed.fetchedAt > CACHE_MAX_AGE_MS) return null
    return parsed.jobs
  } catch {
    return null
  }
}

function writeCache(jobs) {
  writeFileSync(CACHE_PATH, JSON.stringify({ fetchedAt: Date.now(), jobs }))
}

function hostnameOf(link) {
  try {
    return new URL(link).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

function slimJob(job, index) {
  const applyLink = job.apply_options?.find((option) => option?.link)?.link ?? null
  const salary = job.detected_extensions?.salary
  return {
    id: String(job.job_id || `serp-${index}`),
    title: String(job.title || 'Rails role'),
    company: String(job.company_name || 'Company'),
    location: String(job.location || ''),
    salary: typeof salary === 'string' ? salary : null,
    applyUrl: typeof applyLink === 'string' ? applyLink : null,
    applyHost: typeof applyLink === 'string' ? hostnameOf(applyLink) : null,
    postedAt: String(job.detected_extensions?.posted_at || job.extensions?.[0] || ''),
  }
}

async function searchJobs(apiKey, query) {
  const url = new URL('https://serpapi.com/search.json')
  url.searchParams.set('engine', 'google_jobs')
  url.searchParams.set('q', query.q)
  url.searchParams.set('location', query.location)
  url.searchParams.set('gl', 'in')
  url.searchParams.set('hl', 'en')
  url.searchParams.set('api_key', apiKey)

  const response = await fetch(url)
  const payload = await response.json()
  if (!response.ok || payload.error) {
    const message = typeof payload.error === 'string' ? payload.error : 'SerpApi could not return Google Jobs.'
    throw new Error(message)
  }
  return Array.isArray(payload.jobs_results) ? payload.jobs_results : []
}

export async function loadSerpJobs(apiKey) {
  const cached = readCache()
  if (cached) return cached
  if (!apiKey) throw new Error('Add SERPAPI_KEY to .env and restart the dev server.')

  const seen = new Set()
  const jobs = []
  for (const query of QUERIES) {
    const results = await searchJobs(apiKey, query)
    for (const result of results) {
      const slim = slimJob(result, jobs.length)
      if (seen.has(slim.id)) continue
      seen.add(slim.id)
      jobs.push(slim)
    }
  }

  writeCache(jobs)
  return jobs
}
