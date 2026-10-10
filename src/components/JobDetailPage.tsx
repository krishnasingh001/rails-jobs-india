import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BookmarkPlus, Building2, Clock, ExternalLink, FileCheck, MapPin, Share2, Wallet } from 'lucide-react'
import { JobFitCard } from './JobFitCard.tsx'
import { CompanyInsightPanel } from './CompanyInsightPanel.tsx'
import { useAuth } from '../context/AuthContext.tsx'
import { loadCompanyPlace, type CompanyPlace } from '../data/companyPlace.ts'
import { loadJobFit, type JobFit } from '../lib/jobFit.ts'
import { rankResumes, type JobMatch } from '../lib/matchJobs.ts'
import { trackJob } from '../lib/applications.ts'
import { applySiteLabel, formatPosted, provenanceLine, timeAgo, workModeLabel } from '../lib/jobLabels.ts'
import type { JobPin } from '../types.ts'

type JobDetailPageProps = {
  job: JobPin
  onBack: () => void
  onSignIn: () => void
}

const linkClass =
  'inline-flex cursor-pointer items-center gap-1 text-sm font-semibold text-brand underline-offset-2 transition-colors duration-200 hover:text-brand-hover hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

function Fact({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-brand">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">{label}</dt>
        <dd className="mt-0.5 text-sm leading-relaxed text-ink">{children}</dd>
      </div>
    </div>
  )
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Wraps skill words from the fit check in <mark>: green when the candidate has them, amber when not. */
function highlight(paragraph: string, fit: JobFit | null) {
  if (!fit || fit.required.length === 0) return paragraph
  const kinds = new Map<string, boolean>()
  for (const skill of fit.required) {
    for (const term of skill.terms) kinds.set(term.toLowerCase(), fit.matched.includes(skill.name))
  }
  const terms = [...kinds.keys()].sort((a, b) => b.length - a.length).map(escapeRegExp)
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(${terms.join('|')})(?![\\p{L}\\p{N}])`, 'giu')
  return paragraph.split(pattern).map((part, index) => {
    const matched = kinds.get(part.toLowerCase())
    if (matched === undefined || index % 2 === 0) return part
    return (
      <mark
        key={index}
        className={`rounded px-0.5 ${matched ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}`}
      >
        {part}
      </mark>
    )
  })
}

const SECTION_TITLES = [
  'Preferred Qualifications',
  'Minimum Qualifications',
  'What you will do',
  "What you'll do",
  'Job Description',
  'Meet the Team',
  'Your Impact',
  'Responsibilities',
  'Qualifications',
  'Requirements',
  'About the job',
  'About the role',
  'What we offer',
  'Who we are',
  'About us',
  'The role',
  'Benefits',
  'Preferred',
  'Disclaimer',
]

function separateHeadings(text: string): string {
  let result = text.replace(/\r\n/g, '\n')
  for (const title of SECTION_TITLES) {
    result = result.replace(new RegExp(`(${escapeRegExp(title)})(?=[A-Za-z])`, 'gi'), '$1\n')
  }
  return result
}

function isSectionTitle(part: string): boolean {
  const label = part.replace(/:$/, '').trim()
  if (SECTION_TITLES.some((title) => title.toLowerCase() === label.toLowerCase())) return true
  return label.length > 0 && label.length <= 40 && label.includes(' ') && !/[.!?,]/.test(label)
}

type DescriptionBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; items: string[] }

function descriptionBlocks(text: string): DescriptionBlock[] {
  const parts = separateHeadings(text)
    .split(/\n+/)
    .map((part) => part.trim())
    .filter((part) => part && !/^job description$/i.test(part))
  const blocks: DescriptionBlock[] = []
  let items: string[] = []
  function flush() {
    if (items.length === 0) return
    blocks.push({ kind: 'list', items })
    items = []
  }
  for (const part of parts) {
    if (isSectionTitle(part)) {
      flush()
      blocks.push({ kind: 'heading', text: part.replace(/:$/, '') })
      continue
    }
    if (part.includes(' ') && part.length < 280 && (part.match(/[.!?](?:\s|$)/g) ?? []).length <= 1) {
      items.push(part)
      continue
    }
    flush()
    blocks.push({ kind: 'paragraph', text: part })
  }
  flush()
  return blocks
}

function Description({ text, fit }: { text: string; fit: JobFit | null }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-ink">
      {descriptionBlocks(text).map((block, index) => {
        if (block.kind === 'heading') {
          return (
            <h3 key={index} className="pt-2 font-brand text-base font-semibold text-ink first:pt-0">
              {block.text}
            </h3>
          )
        }
        if (block.kind === 'list') {
          return (
            <ul key={index} className="list-disc space-y-2 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={`${itemIndex}-${item}`}>{highlight(item, fit)}</li>
              ))}
            </ul>
          )
        }
        return <p key={index}>{highlight(block.text, fit)}</p>
      })}
    </div>
  )
}

function skillsOf(match: JobMatch): string | null {
  return match.reasons.find((reason) => reason.kind === 'skills')?.label ?? null
}

/** Names the resume to apply with, and why, using the same scoring as the Jobs for you list. */
function ApplyWithResume({ ranked }: { ranked: JobMatch[] }) {
  const best = ranked[0]
  const next = ranked[1]
  if (!best?.resume) return null
  const clearWin = next?.resume && best.score > next.score
  const skills = skillsOf(best)
  return (
    <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3" role="note">
      <FileCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
      <p className="text-sm text-emerald-900">
        <strong className="font-semibold">Apply with your “{best.resume.label}” resume.</strong>{' '}
        {clearWin
          ? `It matches this role more closely${skills ? `: ${skills}` : ''}, compared with ${skillsOf(next) ?? `a ${next.score}% match`} on “${next.resume?.label}”.`
          : next
            ? 'Your resumes fit this role about equally, so any of them will do.'
            : skills
              ? `It matches ${skills} this role asks for.`
              : 'It is the one we compared this role with.'}
      </p>
    </div>
  )
}

export function JobDetailPage({ job, onBack, onSignIn }: JobDetailPageProps) {
  const { user } = useAuth()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [place, setPlace] = useState<CompanyPlace | null | undefined>(undefined)
  const [placeError, setPlaceError] = useState<string | null>(null)
  const [lookingUp, setLookingUp] = useState(false)
  const [tracking, setTracking] = useState(false)
  const [trackMessage, setTrackMessage] = useState<string | null>(null)
  const [fit, setFit] = useState<JobFit | null>(null)
  const [fitError, setFitError] = useState<string | null>(null)
  const navigate = useNavigate()
  const userId = user?.id ?? null
  const resumes = user?.resumes ?? []
  const ranked = useMemo(() => (user && resumes.length > 0 ? rankResumes(job, user) : []), [job, user, resumes.length])
  const bestResumeId = ranked[0]?.resume?.id ?? null
  const [pickedResumeId, setPickedResumeId] = useState<number | null>(null)
  const pickedStillExists = resumes.some((resume) => resume.id === pickedResumeId)
  const resumeId = pickedStillExists ? pickedResumeId : bestResumeId

  useEffect(() => {
    let cancelled = false
    setFit(null)
    setFitError(null)
    loadJobFit(job.title, job.description, resumeId)
      .then((result) => {
        if (!cancelled) setFit(result)
      })
      .catch((caught) => {
        if (!cancelled) setFitError(caught instanceof Error ? caught.message : 'Could not check your fit for this job.')
      })
    return () => {
      cancelled = true
    }
  }, [job.id, job.title, job.description, userId, resumeId])

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onBack()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onBack])

  async function findOffice() {
    setLookingUp(true)
    setPlaceError(null)
    try {
      setPlace(await loadCompanyPlace(job.id))
    } catch (caught) {
      setPlaceError(caught instanceof Error ? caught.message : 'Could not look up this office.')
    } finally {
      setLookingUp(false)
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

  const otherOptions = job.applyOptions.filter((option) => option.link !== job.applyUrl)
  const jobType = job.extensions.find((item) => !/\bago\b/i.test(item)) ?? null
  const posted = job.postedAt ? formatPosted(job.postedAt) : null

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-7xl">
        <button
          type="button"
          className="mb-4 inline-flex cursor-pointer items-center gap-1 text-sm font-semibold text-brand transition-colors duration-200 hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to map
        </button>

        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-4">
            {job.thumbnail ? (
              <img src={job.thumbnail} alt="" className="h-14 w-14 shrink-0 rounded-lg border border-slate-200 object-contain" />
            ) : null}
            <div className="min-w-0">
              <h1
                ref={headingRef}
                tabIndex={-1}
                className="font-brand text-2xl font-semibold leading-tight text-balance text-ink outline-none sm:text-3xl"
              >
                {job.title}
              </h1>
              <p className="mt-1 text-base text-ink">{job.company}</p>
              <p className="mt-1 text-sm text-ink-muted">
                {job.locationLabel} · {workModeLabel(job.workMode)}
              </p>
            </div>
          </div>

          {ranked.length > 0 ? <ApplyWithResume ranked={ranked} /> : null}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {job.applyUrl ? (
              <a
                href={job.applyUrl}
                target="_blank"
                rel="noreferrer"
                title={job.applyHost ? `Apply on ${job.applyHost}` : 'Apply'}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-brand bg-transparent px-4 py-2 text-sm font-semibold text-brand transition-colors duration-200 hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                Apply{job.applyHost ? ` on ${applySiteLabel(job.applyHost)}` : ''}
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Opens in a new tab</span>
              </a>
            ) : null}
            {user ? (
              <button
                type="button"
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink transition-colors duration-200 hover:border-brand-border hover:bg-brand-soft hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-70"
                disabled={tracking}
                onClick={() => {
                  void track()
                }}
              >
                <BookmarkPlus className="h-4 w-4" aria-hidden="true" />
                {tracking ? 'Tracking…' : 'Track application'}
              </button>
            ) : (
              <button type="button" className={linkClass} onClick={onSignIn}>
                Sign in to track this application
              </button>
            )}
            {job.shareLink ? (
              <a href={job.shareLink} target="_blank" rel="noreferrer" className={linkClass}>
                <Share2 className="h-4 w-4" aria-hidden="true" />
                View on Google Jobs
                <span className="sr-only">Opens in a new tab</span>
              </a>
            ) : null}
          </div>
          {trackMessage ? (
            <p className="mt-2 text-sm text-ink-muted" role="status">
              {trackMessage}
            </p>
          ) : null}
        </header>

        <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="min-w-0 space-y-4">
        <CompanyInsightPanel key={job.company} company={job.company} />

        <JobFitCard
          fit={fit}
          error={fitError}
          onSignIn={onSignIn}
          onAts={() => navigate('/ats')}
          resumes={resumes}
          resumeId={resumeId}
          bestResumeId={bestResumeId}
          onPickResume={setPickedResumeId}
        />

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="job-description">
          <h2 id="job-description" className="font-brand text-lg font-semibold text-ink">
            About this role
          </h2>
          <div className="mt-3">
            {job.description.trim() ? (
              <Description text={job.description} fit={fit} />
            ) : (
              <p className="text-sm text-ink-muted">No description was listed. Use the apply link for the full posting.</p>
            )}
          </div>
        </section>

        </div>

        <aside className="min-w-0 space-y-4" aria-label="Job details">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Role facts">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
            <Fact icon={<MapPin className="h-4 w-4" aria-hidden="true" />} label="Location">
              {job.locationLabel}
            </Fact>
            <Fact icon={<Building2 className="h-4 w-4" aria-hidden="true" />} label="Work mode">
              {workModeLabel(job.workMode)}
              {jobType ? ` · ${jobType}` : ''}
            </Fact>
            <Fact icon={<Wallet className="h-4 w-4" aria-hidden="true" />} label="Salary">
              {job.salaryLabel ?? 'Not listed'}
            </Fact>
            <Fact icon={<Clock className="h-4 w-4" aria-hidden="true" />} label="Posted">
              {posted ?? 'Not listed'}
              {job.via ? ` · via ${job.via}` : ''}
            </Fact>
          </dl>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="job-office">
          <h2 id="job-office" className="font-brand text-lg font-semibold text-ink">
            Office
          </h2>
          <div className="mt-3 text-sm">
            {place === undefined ? (
              <button
                type="button"
                className={`${linkClass} disabled:cursor-not-allowed disabled:opacity-70`}
                disabled={lookingUp}
                onClick={() => {
                  void findOffice()
                }}
              >
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {lookingUp ? 'Finding the office…' : 'Find the office'}
              </button>
            ) : null}
            {placeError ? (
              <p className="text-brand" role="alert">
                {placeError}
              </p>
            ) : null}
            {place ? (
              <div>
                {place.name ? <p className="font-semibold text-ink">{place.name}</p> : null}
                <p className="mt-1 text-ink">{place.address}</p>
                {place.mapsUrl ? (
                  <a href={place.mapsUrl} target="_blank" rel="noreferrer" className={`${linkClass} mt-2`}>
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    Open in Google Maps
                    <span className="sr-only">Opens in a new tab</span>
                  </a>
                ) : null}
              </div>
            ) : null}
            {place === null ? (
              <p className="text-ink-muted">Google Maps has no public office for this company.</p>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="job-provenance">
          <h2 id="job-provenance" className="font-brand text-lg font-semibold text-ink">
            Where this listing came from
          </h2>
          <p className="mt-2 text-sm text-ink">{provenanceLine(job.provenance)}</p>
          <dl className="mt-3 grid gap-y-2 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">Source</dt>
              <dd className="text-ink">
                {job.provenance.source}
                {job.provenance.via ? ` · posted on ${job.provenance.via}` : ''}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">Search</dt>
              <dd className="text-ink">
                {job.provenance.query ?? 'Unknown'}
                {job.provenance.searchLocation ? ` · ${job.provenance.searchLocation}` : ''}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">First seen</dt>
              <dd className="text-ink">{job.provenance.firstSeenAt ? timeAgo(job.provenance.firstSeenAt) : 'Unknown'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">Last fetched</dt>
              <dd className="text-ink">{job.provenance.fetchedAt ? timeAgo(job.provenance.fetchedAt) : 'Unknown'}</dd>
            </div>
          </dl>
          {job.provenance.originalUrl ? (
            <a href={job.provenance.originalUrl} target="_blank" rel="noreferrer" className={`${linkClass} mt-3`}>
              View the original listing
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">Opens in a new tab</span>
            </a>
          ) : null}
          <p className="mt-3 text-xs text-ink-muted">
            Times are when we fetched the listing, not when the employer posted it.
          </p>
        </section>

        {otherOptions.length > 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="job-apply">
            <h2 id="job-apply" className="font-brand text-lg font-semibold text-ink">
              Other places to apply
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {otherOptions.map((option) => (
                <li key={option.link}>
                  <a
                    href={option.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-ink transition-colors duration-200 hover:border-brand-border hover:bg-brand-soft hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    {option.title}
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="sr-only">Opens in a new tab</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        </aside>
        </div>
      </div>
    </div>
  )
}
