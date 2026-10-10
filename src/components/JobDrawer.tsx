import { useId, useState } from 'react'
import { AlertCircle, ArrowLeft, BookmarkPlus, Check, ExternalLink, MapPin } from 'lucide-react'
import { useAuth } from '../context/AuthContext.tsx'
import { loadCompanyPlace, type CompanyPlace } from '../data/companyPlace.ts'
import { formatKilometres, travelSense } from '../lib/formatDistance.ts'
import { trackJob } from '../lib/applications.ts'
import { applySiteLabel, formatPosted, placeLabel, timeAgo, workModeLabel } from '../lib/jobLabels.ts'
import { matchTone, type JobMatch } from '../lib/matchJobs.ts'
import type { JobPin, WorkMode } from '../types.ts'

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
        className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 bg-white object-contain p-0.5"
        onError={() => setFailed(true)}
      />
    )
  }
  return (
    <span
      aria-hidden="true"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft font-brand text-sm font-semibold text-brand ring-1 ring-brand-border"
    >
      {initials || '?'}
    </span>
  )
}

function isFresh(postedAt: string): boolean {
  const then = new Date(postedAt).getTime()
  return !Number.isNaN(then) && Date.now() - then < 3 * 24 * 60 * 60 * 1000
}

function postedLabel(postedAt: string): string {
  if (!postedAt) return ''
  const parsed = Date.parse(postedAt)
  if (!Number.isNaN(parsed)) return timeAgo(postedAt)
  return formatPosted(postedAt).replace(/ \d{4}$/, '')
}

function modeChipClass(mode: WorkMode): string {
  if (mode === 'remote') return 'bg-sky-50 text-sky-950 ring-sky-200'
  if (mode === 'hybrid') return 'bg-amber-50 text-amber-950 ring-amber-200'
  return 'bg-white text-ink ring-slate-200'
}

const quietAction =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink shadow-sm transition-colors duration-200 hover:border-brand-border hover:bg-brand-soft hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60'

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
  const [trackMessage, setTrackMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

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
      setTrackMessage({
        tone: 'ok',
        text: result.alreadyTracked ? 'Already on your application board.' : 'Application tracked.',
      })
    } catch (caught) {
      setTrackMessage({
        tone: 'error',
        text: caught instanceof Error ? caught.message : 'Could not track this application.',
      })
    } finally {
      setTracking(false)
    }
  }

  const fresh = isFresh(job.postedAt)
  const posted = postedLabel(job.postedAt)
  return (
    <article
      className={`relative overflow-hidden rounded-2xl border bg-white shadow-[0_1px_2px_rgb(15_23_42/0.05),0_10px_24px_rgb(15_23_42/0.05)] transition-[border-color,box-shadow] duration-200 motion-reduce:transition-none ${
        open
          ? 'border-brand shadow-[0_10px_28px_rgb(220_38_38/0.12)]'
          : 'border-slate-200/80 hover:border-brand-border hover:shadow-[0_12px_32px_rgb(220_38_38/0.1)]'
      }`}
    >
      <span aria-hidden="true" className={`absolute inset-y-4 left-0 w-1 rounded-r-full ${open ? 'bg-brand' : 'bg-brand/80'}`} />
      <button
        type="button"
        className="flex w-full cursor-pointer items-start gap-3 bg-gradient-to-br from-brand-soft/70 via-white to-white py-3 pr-3.5 pl-4 text-left transition-colors duration-200 hover:from-brand-soft focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand"
        onClick={() => onOpenJob(job)}
      >
        <CompanyLogo company={job.company} src={job.thumbnail} />
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-3">
            <span className="line-clamp-2 font-brand text-base font-semibold leading-snug tracking-tight text-ink">{job.title}</span>
            <span className="flex shrink-0 items-center gap-1.5">
              {fresh ? <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-white">New</span> : null}
              {posted ? (
                <time
                  className="rounded-full bg-white px-2 py-0.5 text-xs font-medium tabular-nums text-ink-muted ring-1 ring-slate-200"
                  dateTime={Number.isNaN(Date.parse(job.postedAt)) ? undefined : job.postedAt}
                >
                  {posted}
                </time>
              ) : null}
            </span>
          </span>
          <span className="mt-1 block truncate text-sm font-medium text-ink-muted">{job.company}</span>
          <span className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs font-medium text-ink-muted ring-1 ring-slate-200">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
              <span>{placeLabel(job)}</span>
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${modeChipClass(job.workMode)}`}>
              {workModeLabel(job.workMode)}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 font-brand text-xs font-semibold ring-1 ${
                job.salaryLabel ? 'bg-brand-soft text-brand ring-brand-border' : 'bg-white text-ink-muted ring-slate-200'
              }`}
            >
              {job.salaryLabel ?? 'Salary not listed'}
            </span>
          </span>
        </span>
      </button>
      {match ? (
        <div className="flex flex-wrap items-center gap-1.5 px-3.5 pb-3">
          <span className={`rounded-md px-1.5 py-0.5 text-xs font-bold tabular-nums ${matchTone(match.score).className}`}>
            {match.score}% · {matchTone(match.score).label}
          </span>
          {match.resume && (user?.resumes?.length ?? 0) > 1 ? (
            <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-xs font-semibold text-brand">Apply with: {match.resume.label}</span>
          ) : null}
          {match.reasons.map((reason) => (
            <span
              key={reason.kind}
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ${reason.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}
            >
              {reason.ok ? <Check className="h-3 w-3 shrink-0" aria-hidden="true" /> : <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />}
              <span className="sr-only">{reason.ok ? 'Matches: ' : 'Does not match: '}</span>
              {reason.label}
            </span>
          ))}
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-white px-3 py-2 pl-3.5">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            className={`${quietAction} ${open ? 'border-brand-border bg-brand-soft text-brand' : ''}`}
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => {
              void toggleOffice()
            }}
          >
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {open ? 'Hide office' : 'Show office'}
          </button>
          {user ? (
            <button
              type="button"
              className={quietAction}
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
        {job.applyUrl ? (
          <a
            href={job.applyUrl}
            target="_blank"
            rel="noreferrer"
            title={job.applyHost ? `Apply on ${job.applyHost}` : 'Apply'}
            className="inline-flex min-w-0 max-w-[62%] cursor-pointer items-center gap-1.5 rounded-lg border border-brand bg-transparent px-3 py-1.5 text-xs font-semibold text-brand transition-colors duration-200 hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand"
          >
            <span className="truncate">Apply{job.applyHost ? ` on ${applySiteLabel(job.applyHost)}` : ''}</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="sr-only">Opens apply page in a new tab</span>
          </a>
        ) : null}
      </div>
      {trackMessage ? (
        <p
          className={`px-3.5 py-2 text-xs font-medium ${trackMessage.tone === 'error' ? 'text-brand' : 'text-emerald-800'}`}
          role={trackMessage.tone === 'error' ? 'alert' : 'status'}
        >
          {trackMessage.text}
        </p>
      ) : null}
      {open ? (
        <div id={panelId} className="border-t border-brand-border bg-brand-soft/50 px-3.5 py-3">
          {place === undefined && !error ? <p className="text-sm text-ink-muted">Finding the office…</p> : null}
          {error ? (
            <p className="text-sm text-brand" role="alert">
              {error}
            </p>
          ) : null}
          {place ? (
            <div>
              {place.name ? <p className="text-sm font-semibold text-ink">{place.name}</p> : null}
              <p className="mt-1 text-sm leading-relaxed text-ink">{place.address}</p>
              {onShowOffice && place.latitude != null && place.longitude != null ? (
                <button
                  type="button"
                  className="mt-2 inline-flex cursor-pointer items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-sm font-semibold text-brand shadow-sm transition-colors duration-200 hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
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
      <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#f8f4f0] px-3 py-3">
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
