import { useId, useState } from 'react'
import { ArrowLeft, BookmarkPlus, ExternalLink, MapPin } from 'lucide-react'
import { useAuth } from '../context/AuthContext.tsx'
import { loadCompanyPlace, type CompanyPlace } from '../data/companyPlace.ts'
import { formatKilometres, travelSense } from '../lib/formatDistance.ts'
import { trackJob } from '../lib/applications.ts'
import type { JobPin } from '../types.ts'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

type JobDrawerProps = {
  title: string
  jobs: JobPin[]
  distanceKm: number | null
  emptyLabel: string | null
  backLabel: string
  onBack: () => void
  onShowOffice: (place: CompanyPlace) => void
}

function formatPosted(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const [year, month, day] = value.split('-')
  const monthName = MONTHS[Number(month) - 1]
  if (!year || !monthName || !day) return value
  return `${Number(day)} ${monthName} ${year}`
}

function workModeLabel(mode: JobPin['workMode']): string {
  if (mode === 'hybrid') return 'Hybrid'
  if (mode === 'remote') return 'Remote'
  return 'On-site'
}

function JobCard({ job, onShowOffice }: { job: JobPin; onShowOffice: (place: CompanyPlace) => void }) {
  const { user } = useAuth()
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const [place, setPlace] = useState<CompanyPlace | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [tracking, setTracking] = useState(false)
  const [trackMessage, setTrackMessage] = useState<string | null>(null)

  function reveal(found: CompanyPlace) {
    if (found.latitude != null && found.longitude != null) onShowOffice(found)
  }

  async function toggleOffice() {
    const next = !open
    setOpen(next)
    if (!next) return
    if (place) {
      reveal(place)
      return
    }
    if (error) return
    try {
      const found = await loadCompanyPlace(job.id)
      setPlace(found)
      if (found) reveal(found)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not look up this office.')
    }
  }

  async function track() {
    setTracking(true)
    setTrackMessage(null)
    try {
      const result = await trackJob(job)
      setTrackMessage(result.alreadyTracked ? 'Already on your application board.' : 'Application tracked.')
    } catch (caught) {
      setTrackMessage(caught instanceof Error ? caught.message : 'Could not track this application.')
    } finally {
      setTracking(false)
    }
  }

  return (
    <article className={`rounded-xl border bg-white transition-colors duration-200 ${open ? 'border-brand' : 'border-slate-200'}`}>
      <button
        type="button"
        className="w-full cursor-pointer px-3 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          void toggleOffice()
        }}
      >
        <h3 className="font-brand text-sm font-semibold text-ink">{job.title}</h3>
        <p className="mt-1 text-sm text-ink">{job.company}</p>
        <p className="mt-1 text-sm text-ink">{job.locationLabel}</p>
        <p className="mt-1 text-sm text-ink-muted">{workModeLabel(job.workMode)}</p>
        {job.salaryLabel ? <p className="mt-1 font-brand text-sm text-brand">{job.salaryLabel}</p> : null}
        <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          {open ? 'Hide office' : 'Show office'}
        </span>
      </button>
      {open ? (
        <div id={panelId} className="border-t border-slate-200 px-3 py-3">
          {place === undefined && !error ? <p className="text-sm text-ink-muted">Finding the office…</p> : null}
          {error ? (
            <p className="text-sm text-brand" role="alert">
              {error}
            </p>
          ) : null}
          {place ? (
            <div>
              {place.name ? <p className="text-sm font-semibold text-ink">{place.name}</p> : null}
              <p className="mt-1 text-sm text-ink">{place.address}</p>
              {place.latitude != null && place.longitude != null ? (
                <button
                  type="button"
                  className="mt-2 inline-flex cursor-pointer items-center gap-1 text-sm font-semibold text-brand transition-colors duration-200 hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  onClick={() => reveal(place)}
                >
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  Show on this map
                </button>
              ) : null}
            </div>
          ) : null}
          {place === null && !error ? <p className="text-sm text-ink-muted">Google Maps has no public office for this company.</p> : null}
        </div>
      ) : null}
      {job.applyUrl || job.postedAt ? (
        <div className="px-3 pb-3">
          {job.applyUrl ? (
            <a
              href={job.applyUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex cursor-pointer items-center gap-1 text-sm font-semibold text-brand underline-offset-2 transition-colors duration-200 hover:text-brand-hover hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {job.applyHost}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">Opens apply page in a new tab</span>
            </a>
          ) : null}
          {job.postedAt ? <p className="mt-1 text-sm text-ink-muted">Posted {formatPosted(job.postedAt)}</p> : null}
        </div>
      ) : null}
      {user ? (
        <div className="px-3 pb-3">
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-1 text-sm font-semibold text-brand transition-colors duration-200 hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:text-brand/70"
            disabled={tracking}
            onClick={() => {
              void track()
            }}
          >
            <BookmarkPlus className="h-3.5 w-3.5" aria-hidden="true" />
            {tracking ? 'Tracking…' : 'Track application'}
          </button>
          {trackMessage ? <p className="mt-1 text-xs text-ink-muted">{trackMessage}</p> : null}
        </div>
      ) : null}
    </article>
  )
}

export function JobDrawer({ title, jobs, distanceKm, emptyLabel, backLabel, onBack, onShowOffice }: JobDrawerProps) {
  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="border-b border-slate-200 px-4 py-3">
        <button
          type="button"
          className="mb-2 inline-flex cursor-pointer items-center gap-1 text-sm font-semibold text-brand transition-colors duration-200 hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {backLabel}
        </button>
        <h2 className="font-brand text-base font-semibold text-ink">{title}</h2>
        <p className="mt-1 font-brand text-sm text-brand">{jobs.length}</p>
        {distanceKm != null ? (
          <p className="mt-1 text-xs text-ink-muted">
            {formatKilometres(distanceKm)} · {travelSense(distanceKm)}
          </p>
        ) : null}
      </div>
      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {jobs.length === 0 && emptyLabel ? <li className="px-1 py-4 text-sm text-ink-muted">{emptyLabel}</li> : null}
        {jobs.map((job) => (
          <li key={job.id}>
            <JobCard job={job} onShowOffice={onShowOffice} />
          </li>
        ))}
      </ul>
    </section>
  )
}
