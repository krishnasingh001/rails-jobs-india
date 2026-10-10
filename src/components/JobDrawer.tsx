import { useId, useState } from 'react'
import { ArrowLeft, BookmarkPlus, ExternalLink, MapPin } from 'lucide-react'
import { useAuth } from '../context/AuthContext.tsx'
import { loadCompanyPlace, type CompanyPlace } from '../data/companyPlace.ts'
import { formatKilometres, travelSense } from '../lib/formatDistance.ts'
import { trackJob } from '../lib/applications.ts'
import { formatPosted, workModeLabel } from '../lib/jobLabels.ts'
import { matchTone, type JobMatch } from '../lib/matchJobs.ts'
import type { JobPin } from '../types.ts'

type JobDrawerProps = {
  title: string
  jobs: JobPin[]
  distanceKm: number | null
  emptyLabel: string | null
  backLabel: string
  onBack: () => void
  onShowOffice: (place: CompanyPlace) => void
  onOpenJob: (job: JobPin) => void
}

function CompanyLogo({ company, src }: { company: string; src: string | null }) {
  const [failed, setFailed] = useState(false)
  const initials = company
    .split(/\s+/)
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        className="h-11 w-11 shrink-0 rounded-lg border border-slate-200 bg-white object-contain"
        onError={() => setFailed(true)}
      />
    )
  }
  return (
    <span
      aria-hidden="true"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-soft font-brand text-sm font-semibold text-brand"
    >
      {initials || '?'}
    </span>
  )
}

function isFresh(postedAt: string): boolean {
  const then = new Date(postedAt).getTime()
  return !Number.isNaN(then) && Date.now() - then < 3 * 24 * 60 * 60 * 1000
}

function shortDate(postedAt: string): string {
  const full = formatPosted(postedAt)
  return full.replace(/ \d{4}$/, '')
}

export function JobCard({
  job,
  match,
  onShowOffice,
  onOpenJob,
}: {
  job: JobPin
  match?: JobMatch
  onShowOffice?: (place: CompanyPlace) => void
  onOpenJob: (job: JobPin) => void
}) {
  const { user } = useAuth()
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const [place, setPlace] = useState<CompanyPlace | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [tracking, setTracking] = useState(false)
  const [trackMessage, setTrackMessage] = useState<string | null>(null)

  function reveal(found: CompanyPlace) {
    if (found.latitude != null && found.longitude != null) onShowOffice?.(found)
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

  const fresh = isFresh(job.postedAt)
  return (
    <article className={`rounded-xl border bg-white transition-colors duration-200 hover:border-brand-border ${open ? 'border-brand' : 'border-slate-200'}`}>
      <button
        type="button"
        className="flex w-full cursor-pointer items-start gap-3 px-3 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        onClick={() => onOpenJob(job)}
      >
        <CompanyLogo company={job.company} src={job.thumbnail} />
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <span className="font-brand text-base font-semibold leading-snug text-ink">{job.title}</span>
            {fresh ? (
              <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand">New</span>
            ) : job.postedAt ? (
              <span className="shrink-0 pt-0.5 text-xs text-ink-muted">{shortDate(job.postedAt)}</span>
            ) : null}
          </span>
          <span className="mt-0.5 block text-sm text-ink">{job.company}</span>
          <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
            <span>{job.locationLabel}</span>
            <span className="rounded-full border border-slate-200 px-2 py-0.5 font-medium text-ink">{workModeLabel(job.workMode)}</span>
            {job.salaryLabel ? <span className="font-brand text-sm font-semibold text-brand">{job.salaryLabel}</span> : null}
          </span>
        </span>
      </button>
      {match ? (
        <div className="flex flex-wrap items-center gap-1.5 px-3 pb-2.5">
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${matchTone(match.score).className}`}>
            {match.score}% · {matchTone(match.score).label}
          </span>
          {match.reasons.map((reason) => (
            <span
              key={reason.kind}
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${reason.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}
            >
              <span aria-hidden="true">{reason.ok ? '✓ ' : '! '}</span>
              <span className="sr-only">{reason.ok ? 'Matches: ' : 'Does not match: '}</span>
              {reason.label}
            </span>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 px-3 py-2">
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-brand transition-colors duration-200 hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => {
            void toggleOffice()
          }}
        >
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          {open ? 'Hide office' : 'Show office'}
        </button>
        {job.applyUrl ? (
          <a
            href={job.applyUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-brand underline-offset-2 transition-colors duration-200 hover:text-brand-hover hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Apply on {job.applyHost}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">Opens apply page in a new tab</span>
          </a>
        ) : null}
        {user ? (
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-brand transition-colors duration-200 hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:text-brand/70"
            disabled={tracking}
            onClick={() => {
              void track()
            }}
          >
            <BookmarkPlus className="h-3.5 w-3.5" aria-hidden="true" />
            {tracking ? 'Tracking…' : 'Track'}
          </button>
        ) : null}
      </div>
      {trackMessage ? <p className="px-3 pb-2 text-xs text-ink-muted">{trackMessage}</p> : null}
      {open ? (
        <div id={panelId} className="border-t border-slate-100 px-3 py-3">
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
              {onShowOffice && place.latitude != null && place.longitude != null ? (
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
    </article>
  )
}

export function JobDrawer({ title, jobs, distanceKm, emptyLabel, backLabel, onBack, onShowOffice, onOpenJob }: JobDrawerProps) {
  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="border-b border-slate-200 px-5 py-4">
        <button
          type="button"
          className="mb-2 inline-flex cursor-pointer items-center gap-1 text-sm font-semibold text-brand transition-colors duration-200 hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {backLabel}
        </button>
        <h2 className="font-brand text-xl font-semibold text-ink">{title}</h2>
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
            <JobCard job={job} onShowOffice={onShowOffice} onOpenJob={onOpenJob} />
          </li>
        ))}
      </ul>
    </section>
  )
}
