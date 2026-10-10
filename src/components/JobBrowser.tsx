import { Search, X } from 'lucide-react'
import type { CompanyPlace } from '../data/companyPlace.ts'
import { SORT_OPTIONS, type JobFilters, type ModeFilter } from '../lib/filterJobs.ts'
import { workModeLabel } from '../lib/jobLabels.ts'
import type { CityCount, JobPin } from '../types.ts'
import { FilterMenu } from './FilterMenu.tsx'
import { JobCard } from './JobDrawer.tsx'

type ModeCounts = Record<ModeFilter, number>

type JobBrowserProps = {
  jobs: JobPin[]
  total: number
  filters: JobFilters
  cities: CityCount[]
  stateName: string | null
  modeCounts: ModeCounts
  onFilters: (patch: Partial<JobFilters>) => void
  onClearState: () => void
  onReset: () => void
  onHoverJob: (code: string | null) => void
  onShowOffice: (place: CompanyPlace) => void
  onOpenJob: (job: JobPin) => void
}

const MODES: ModeFilter[] = ['all', 'remote', 'hybrid', 'onsite']

const fieldClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-ink transition-colors duration-200 focus:border-brand focus:ring-2 focus:ring-brand/15'

export function JobBrowser({
  jobs,
  total,
  filters,
  cities,
  stateName,
  modeCounts,
  onFilters,
  onClearState,
  onReset,
  onHoverJob,
  onShowOffice,
  onOpenJob,
}: JobBrowserProps) {
  const filtered = filters.query.trim() !== '' || filters.city !== '' || filters.stateCode !== null || filters.mode !== 'all'

  return (
    <section className="flex h-full min-h-0 flex-col">
      <header className="relative z-20 shrink-0 border-b border-slate-200 bg-white px-5 py-4">
        <p className="font-brand text-xs font-semibold uppercase tracking-[0.14em] text-brand">Rails jobs in India</p>
        <h1 className="mt-1 font-brand text-xl font-semibold text-ink">All openings</h1>

        <label className="sr-only" htmlFor="job-search">
          Search jobs
        </label>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            id="job-search"
            type="search"
            value={filters.query}
            onChange={(event) => onFilters({ query: event.target.value })}
            placeholder="Search title, company or place"
            className={`${fieldClass} pl-9`}
          />
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-ink-muted" htmlFor="job-city">
              City
            </label>
            <FilterMenu
              id="job-city"
              label="City"
              value={filters.city}
              options={[{ value: '', label: 'All cities' }, ...cities.map((city) => ({ value: city.city, label: `${city.city} (${city.jobs})` }))]}
              onChange={(city) => onFilters({ city })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-muted" htmlFor="job-sort">
              Sort by
            </label>
            <FilterMenu
              id="job-sort"
              label="Sort by"
              value={filters.sort}
              align="right"
              options={SORT_OPTIONS}
              onChange={(sort) => onFilters({ sort })}
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Work mode">
          {MODES.map((mode) => {
            const active = filters.mode === mode
            return (
              <button
                key={mode}
                type="button"
                aria-pressed={active}
                className={`inline-flex cursor-pointer items-center rounded-full border px-3 py-1 text-sm font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                  active
                    ? 'border-brand bg-brand-soft text-brand'
                    : 'border-slate-300 bg-white text-ink hover:border-brand-border hover:bg-brand-soft hover:text-brand'
                }`}
                onClick={() => onFilters({ mode })}
              >
                {mode === 'all' ? 'All' : workModeLabel(mode)} · {modeCounts[mode]}
              </button>
            )
          })}
        </div>

        {stateName ? (
          <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-brand-soft px-3 py-1 text-sm font-semibold text-brand">
            {stateName}
            <button
              type="button"
              className="cursor-pointer rounded-full p-0.5 hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-brand"
              onClick={onClearState}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">Clear state filter</span>
            </button>
          </p>
        ) : null}

        <p className="mt-3 flex items-center justify-between gap-3 text-sm text-ink-muted" aria-live="polite">
          <span>
            <span className="font-brand font-semibold text-brand">{jobs.length}</span>
            {filtered ? ` of ${total}` : ''} {jobs.length === 1 ? 'role' : 'roles'}
          </span>
          {filtered ? (
            <button
              type="button"
              className="cursor-pointer text-sm font-semibold text-brand hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              onClick={onReset}
            >
              Clear filters
            </button>
          ) : null}
        </p>
      </header>

      <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#f8f4f0] px-3 py-3" onMouseLeave={() => onHoverJob(null)}>
        {jobs.length === 0 ? (
          <li className="px-1 py-6 text-sm text-ink-muted">No roles match these filters.</li>
        ) : null}
        {jobs.map((job) => (
          <li
            key={job.id}
            onMouseEnter={() => onHoverJob(job.code)}
            onFocus={() => onHoverJob(job.code)}
            onBlur={() => onHoverJob(null)}
          >
            <JobCard job={job} onShowOffice={onShowOffice} onOpenJob={onOpenJob} />
          </li>
        ))}
      </ul>
    </section>
  )
}
