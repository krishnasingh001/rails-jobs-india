import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { PageSheet } from './AppShell.tsx'
import { JobCard } from './JobDrawer.tsx'
import { useAuth } from '../context/AuthContext.tsx'
import { matchJobs, missingPreferences } from '../lib/matchJobs.ts'
import type { JobPin } from '../types.ts'

const linkButton =
  'inline-block rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

export function JobsForYouPage({ jobs, onOpenJob }: { jobs: JobPin[]; onOpenJob: (job: JobPin) => void }) {
  const { user } = useAuth()
  const missing = user ? missingPreferences(user) : []
  const matches = useMemo(() => (user && missing.length === 0 ? matchJobs(jobs, user) : []), [jobs, user, missing.length])

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

  const summary = [
    user.preferred_cities?.join(', '),
    user.work_modes?.join(' / '),
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
          <p className="mt-1 text-sm text-ink-muted">Based on {summary.join(' · ')}.</p>
        </div>
        <Link to="/profile" className="text-sm font-semibold text-brand hover:underline">
          Edit preferences
        </Link>
      </div>
      {matches.length === 0 ? (
        <p className="mt-6 text-sm text-ink-muted">No roles to rank yet. New jobs are added regularly.</p>
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
