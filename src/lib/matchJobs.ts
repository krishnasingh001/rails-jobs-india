import type { Account, AiLevel } from './auth.ts'
import type { JobPin } from '../types.ts'

export type MatchReason = {
  kind: 'skills' | 'mode' | 'city' | 'salary' | 'experience' | 'ai'
  ok: boolean
  label: string
}

export type JobMatch = {
  job: JobPin
  /** 0-100, scored only on the things both the candidate and the job state. */
  score: number
  reasons: MatchReason[]
}

const WEIGHTS = { skills: 35, mode: 20, city: 20, salary: 10, experience: 10, ai: 5 } as const

const SKILLS_FOR_FULL_MARKS = 8
const AI_RANK: Record<AiLevel, number> = { none: 0, user: 1, builder: 2, expert: 3 }
const AI_JOB_WORDS = /(?<![a-z])(?:ai|llm|llms|genai|generative ai|machine learning|chatgpt|copilot|openai|rag)(?![a-z])/i

/** Annual salary range in lakh per year from a label such as "₹12L–₹14L a year" or "₹90K–₹1.2L a month". */
export function salaryRangeLpa(label: string | null): { min: number; max: number } | null {
  if (!label) return null
  const amounts = [...label.matchAll(/(\d+(?:\.\d+)?)\s*(K|L|Cr)\b/gi)].map((m) => {
    const value = Number(m[1])
    const unit = (m[2] ?? '').toLowerCase()
    return unit === 'k' ? value / 100 : unit === 'cr' ? value * 100 : value
  })
  if (amounts.length === 0) return null
  const perMonth = /\ba month\b|\/\s*mo|per month/i.test(label)
  const factor = perMonth ? 12 : 1
  const round = (value: number) => Math.round(value * 10) / 10
  return { min: round(Math.min(...amounts) * factor), max: round(Math.max(...amounts) * factor) }
}

/** The smallest years of experience a posting asks for, e.g. "3+ years" or "2-5 years of experience". */
export function requiredYears(description: string): number | null {
  const found = [...description.matchAll(/(\d{1,2})\s*(?:\+|-\s*\d{1,2}|to\s*\d{1,2})?\s*(?:years?|yrs?)\b/gi)]
    .filter((m) => {
      const around = description.slice(Math.max(0, (m.index ?? 0) - 40), (m.index ?? 0) + m[0].length + 40)
      return /experience|exp\b|relevant/i.test(around)
    })
    .map((m) => Number(m[1]))
    .filter((years) => years > 0 && years <= 25)
  return found.length > 0 ? Math.min(...found) : null
}

function formatLpa(value: number): string {
  return Number.isInteger(value) ? `${value}L` : `${value.toFixed(1)}L`
}

/** What the candidate still has to fill in before a ranked list makes sense. Skills and AI fluency are optional. */
export function missingPreferences(user: Account): string[] {
  const missing: string[] = []
  if ((user.preferred_cities?.length ?? 0) === 0) missing.push('preferred cities')
  if ((user.work_modes?.length ?? 0) === 0) missing.push('work mode')
  if (user.expected_salary_lpa == null) missing.push('expected salary')
  if (user.years_experience == null) missing.push('years of experience')
  return missing
}

export function matchJob(job: JobPin, user: Account): JobMatch {
  const reasons: MatchReason[] = []
  let earned = 0
  let possible = 0
  const add = (kind: MatchReason['kind'], fraction: number, label: string) => {
    earned += WEIGHTS[kind] * fraction
    possible += WEIGHTS[kind]
    reasons.push({ kind, ok: fraction === 1, label })
  }

  const have = new Set((user.skills ?? []).map((skill) => skill.toLowerCase()))
  if (have.size > 0 && job.skills.length > 0) {
    const matched = job.skills.filter((skill) => have.has(skill.toLowerCase()))
    // Long wish-lists would sink every candidate, so only the first few skills count in full.
    const wanted = Math.min(job.skills.length, SKILLS_FOR_FULL_MARKS)
    add('skills', Math.min(1, matched.length / wanted), `${matched.length} of ${job.skills.length} skills`)
  }

  const modes = user.work_modes ?? []
  if (modes.length > 0) {
    const ok = modes.includes(job.workMode)
    add('mode', ok ? 1 : 0, ok ? workLabel(job.workMode) : `${workLabel(job.workMode)}, not your preference`)
  }

  const cities = (user.preferred_cities ?? []).map((city) => city.toLowerCase())
  if (cities.length > 0 && job.workMode !== 'remote') {
    const ok = job.city != null && cities.includes(job.city.toLowerCase())
    add('city', ok ? 1 : 0, job.city ? (ok ? job.city : `${job.city}, not a preferred city`) : 'Location not specific')
  }

  const range = salaryRangeLpa(job.salaryLabel)
  if (user.expected_salary_lpa != null && range) {
    const expected = user.expected_salary_lpa
    const fraction = range.max >= expected ? 1 : range.max >= expected * 0.8 ? 0.5 : 0
    add('salary', fraction, fraction === 1 ? `Pays up to ${formatLpa(range.max)}` : `Pays up to ${formatLpa(range.max)}, you want ${formatLpa(expected)}`)
  }

  const asked = requiredYears(job.description)
  if (user.years_experience != null && asked != null) {
    const years = user.years_experience
    const fraction = years >= asked ? 1 : years >= asked - 1 ? 0.5 : 0
    add('experience', fraction, `Asks ${asked}+ yrs, you have ${years}`)
  }

  const aiLevel = user.ai_fluency ?? user.resume_ai_fluency ?? null
  if (aiLevel && aiLevel !== 'none' && AI_JOB_WORDS.test(`${job.title}\n${job.description}`)) {
    add('ai', AI_RANK[aiLevel] >= 1 ? 1 : 0, 'Mentions AI work, which fits your AI experience')
  }

  return { job, score: possible === 0 ? 0 : Math.round((earned / possible) * 100), reasons }
}

function workLabel(mode: JobPin['workMode']): string {
  return mode === 'remote' ? 'Remote' : mode === 'hybrid' ? 'Hybrid' : 'On-site'
}

export function matchJobs(jobs: JobPin[], user: Account): JobMatch[] {
  return jobs
    .map((job) => matchJob(job, user))
    .filter((match) => match.reasons.length > 0)
    .sort((a, b) => b.score - a.score || Date.parse(b.job.postedAt) - Date.parse(a.job.postedAt))
}

export function matchTone(score: number): { label: string; className: string } {
  if (score >= 75) return { label: 'Strong match', className: 'bg-emerald-50 text-emerald-700' }
  if (score >= 50) return { label: 'Good match', className: 'bg-amber-50 text-amber-800' }
  return { label: 'Partial match', className: 'bg-slate-100 text-ink-muted' }
}
