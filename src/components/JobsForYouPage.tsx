import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageSheet } from './AppShell.tsx'
import { JobCard } from './JobDrawer.tsx'
import { useAuth } from '../context/AuthContext.tsx'
import { matchJobs, missingPreferences } from '../lib/matchJobs.ts'
import type { JobPin } from '../types.ts'

const linkButton =
  'inline-block rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

const MODE_LABELS = { remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site' } as const

export function JobsForYouPage({ jobs, onOpenJob }: { jobs: JobPin[]; onOpenJob: (job: JobPin) => void }) {
  const { user } = useAuth()
  // Filters switched off for this visit only. The saved profile is not touched.
  const [off, setOff] = useState<string[]>([])
  const missing = user ? missingPreferences(user) : []
  const matches = useMemo(() => {
    if (!user || missing.length > 0) return []
    return matchJobs(jobs, {
      ...user,
      preferred_cities: (user.preferred_cities ?? []).filter((city) => !off.includes(`city:${city}`)),
      work_modes: (user.work_modes ?? []).filter((mode) => !off.includes(`mode:${mode}`)),
    })
  }, [jobs, user, missing.length, off])

  if (!user) return null

  if (missing.length > 0) {
    return (
      <PageSheet size="narrow">
        <p className="font-brand text-xs font-semibold uppercase tracking-[0.14em] text-brand">Jobs for you</p>
        <h1 className="mt-1 font-brand text-2xl font-semibold text-ink">Tell us what you are looking for</h1>
        <p className="mt-2 text-sm text-ink-muted">
          We rank every opening against your preferences, but your profile is missing: <strong className="text-ink">{missing.join(', ')}</strong>.
        </p>
        <Link to="/profile" className={`${linkButton} mt-5`}>
          Fill in your profile
        </Link>
      </PageSheet>
    )
  }

  const filters = [
    ...(user.preferred_cities ?? []).map((city) => ({ key: `city:${city}`, label: city })),
    ...(user.work_modes ?? []).map((mode) => ({ key: `mode:${mode}`, label: MODE_LABELS[mode] })),
  ]
  const toggle = (key: string) => setOff((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]))
  const summary = [
    user.expected_salary_lpa != null ? `${user.expected_salary_lpa}L+ a year` : null,
    user.years_experience != null ? `${user.years_experience} yrs experience` : null,
  ].filter(Boolean)

  return (
    <PageSheet size="wide">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-brand text-xs font-semibold uppercase tracking-[0.14em] text-brand">Jobs for you</p>
          <h1 className="mt-1 font-brand text-2xl font-semibold text-ink">
            {matches.length} {matches.length === 1 ? 'role' : 'roles'} ranked for you
          </h1>
          {summary.length > 0 ? <p className="mt-1 text-sm text-ink-muted">Ranked using {summary.join(' · ')}.</p> : null}
        </div>
        <Link to="/profile" className="text-sm font-semibold text-brand hover:underline">
          Edit preferences
        </Link>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Filters from your profile">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Showing only</span>
        {filters.map((filter) => {
          const active = !off.includes(filter.key)
          return (
            <button
              key={filter.key}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(filter.key)}
              className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-3 py-1 text-sm font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                active ? 'border-brand bg-brand-soft text-brand' : 'border-slate-300 bg-white text-ink-muted line-through hover:border-brand-border'
              }`}
            >
              {filter.label}
              {active ? <X className="h-3.5 w-3.5" aria-hidden="true" /> : null}
              <span className="sr-only">{active ? 'Turn off for now' : 'Turn back on'}</span>
            </button>
          )
        })}
        {off.length > 0 ? (
          <button type="button" className="cursor-pointer text-sm font-semibold text-brand hover:underline" onClick={() => setOff([])}>
            Reset
          </button>
        ) : null}
      </div>
      {matches.length === 0 ? (
        <p className="mt-6 text-sm text-ink-muted">
          No roles match your cities and work modes right now. Turn off a filter above to look wider, or{' '}
          <Link to="/profile" className="font-semibold text-brand hover:underline">
            edit your preferences
          </Link>
          . New jobs are added regularly.
        </p>
      ) : (
        <ul className="mt-5 grid gap-3 lg:grid-cols-2">
          {matches.map((match) => (
            <li key={match.job.id}>
              <JobCard job={match.job} match={match} onOpenJob={onOpenJob} />
            </li>
          ))}
        </ul>
      )}
    </PageSheet>
  )
}
