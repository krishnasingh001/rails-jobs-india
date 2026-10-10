import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { loadCompanyInsight, type CompanyInsight } from '../data/companyInsight.ts'

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; insight: CompanyInsight | null }

type LayoffEvent = { date: string; people: string; detail: string }

type ValueView = { quote: string | null; chips: string[]; rest: string }

const linkClass =
  'inline-flex cursor-pointer items-center gap-1 text-sm font-semibold text-brand underline-offset-2 transition-colors duration-200 hover:text-brand-hover hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

const OFFICE_LIMIT = 6

function hostOf(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, '')
  } catch {
    return link
  }
}

function formatFetched(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function friendlyDate(value: string): string {
  return value.replace(/\b\d{4}-\d{2}-\d{2}\b/g, (iso) => {
    const date = new Date(`${iso}T00:00:00Z`)
    return Number.isNaN(date.getTime())
      ? iso
      : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
  })
}

function prettyCount(value: string): string {
  return value.replace(/\d[\d,]*/g, (token) => {
    const digits = token.replace(/,/g, '')
    return /^\d+$/.test(digits) ? Number(digits).toLocaleString('en-IN') : token
  })
}

function parseHead(value: string): { figure: string; detail: string } | null {
  const match = value.match(/^([<>~]?\d[\d,]*)\b(?:\s+employees?)?\s*[.,]?\s*(.*)$/i)
  if (!match) return null
  const detail = match[2].trim().replace(/^\((.*)\)$/, '$1').trim()
  return { figure: prettyCount(match[1]), detail: friendlyDate(detail) }
}

function layoffEvents(text: string): LayoffEvent[] | null {
  const events: LayoffEvent[] = []
  for (const line of text.split('\n').map((item) => item.trim()).filter(Boolean)) {
    const parts = line.split(' · ')
    if (parts.length >= 2 && parts[0].length <= 80) {
      events.push({ date: friendlyDate(parts[0]), people: prettyCount(parts[1]), detail: parts.slice(2).join(' · ') })
      continue
    }
    if (events.length === 0) return null
    const current = events[events.length - 1]
    const gap = current.detail && !/[.!?]$/.test(current.detail) ? '. ' : ' '
    current.detail = `${current.detail}${current.detail ? gap : ''}${line}`
  }
  return events.length > 0 ? events : null
}

function splitList(value: string): string[] {
  return value
    .split(/,|\s+and\s+/i)
    .map((item) => item.replace(/^["']|["']$/g, '').replace(/\.$/, '').trim())
    .filter((item) => item.length > 1 && item.length <= 48)
}

function valueView(text: string): ValueView | null {
  const lines = text.split('\n').map((item) => item.trim()).filter(Boolean)
  if (lines.length >= 2 && lines.every((line) => line.length <= 48)) {
    return { quote: null, chips: lines, rest: '' }
  }

  const quote = text.match(/(?:^|[^A-Za-z])['"]([^'"]{6,90})['"]/)?.[1]?.replace(/\.$/, '') ?? null
  const include = text.match(/include:\s*([^.]*)/i)
  const colon = text.match(/^[^:]{1,24}:\s*(.+)$/)
  if (!include && colon) {
    const chips = splitList(colon[1])
    return chips.length >= 2 ? { quote, chips, rest: '' } : null
  }
  if (!include && (!text.includes('.') || text.split(',').length >= 3)) {
    const chips = splitList(text)
    return chips.length >= 2 ? { quote: null, chips, rest: '' } : null
  }
  const chips = include ? splitList(include[1]) : []
  if (chips.length < 2) return null
  const rest = text
    .split(/(?<=\.)\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence && !/include:/i.test(sentence) && !(quote && sentence.includes(quote)))
    .join(' ')
  return { quote, chips, rest }
}

function isHeadquarters(office: string): boolean {
  return /\bHQ\b|headquarters/i.test(office)
}

export function CompanyInsightPanel({ company }: { company: string }) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [officesOpen, setOfficesOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadCompanyInsight(company).then(
      (insight) => {
        if (!cancelled) setState({ status: 'ready', insight })
      },
      () => {
        if (!cancelled) setState({ status: 'error' })
      },
    )
    return () => {
      cancelled = true
    }
  }, [company])

  const insight = state.status === 'ready' ? state.insight : null
  const head = insight?.headCount ? parseHead(insight.headCount) : null
  const events = insight?.layoffs ? layoffEvents(insight.layoffs) : null
  const values = insight?.values ? valueView(insight.values) : null
  const places = insight?.offices.filter((office) => office.length <= 48) ?? []
  const officeNotes = insight?.offices.filter((office) => office.length > 48) ?? []
  const shownPlaces = officesOpen ? places : places.slice(0, OFFICE_LIMIT)

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="job-company">
      <h2 id="job-company" className="font-brand text-lg font-semibold text-ink">
        About {company}
      </h2>

      {state.status === 'loading' ? (
        <p className="mt-3 text-sm text-ink-muted" role="status">
          Loading the company insight…
        </p>
      ) : null}
      {state.status === 'error' ? (
        <p className="mt-3 text-sm text-brand" role="alert">
          Could not load the company insight.
        </p>
      ) : null}
      {state.status === 'ready' && !insight ? (
        <p className="mt-3 text-sm text-ink-muted">No researched profile for this company yet.</p>
      ) : null}

      {insight ? (
        <>
          {insight.domainArea ? <p className="mt-3 text-sm leading-relaxed text-ink">{insight.domainArea}</p> : null}

          {head || insight.headCount || insight.foundedYear ? (
            <dl className="mt-4 grid max-w-lg grid-cols-2 gap-4 border-y border-slate-200 py-4">
              {head ? (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">Head count</dt>
                  <dd className="mt-1 font-brand text-2xl font-semibold text-ink tabular-nums">{head.figure}</dd>
                  {head.detail ? <dd className="mt-0.5 text-xs leading-relaxed text-ink-muted">{head.detail}</dd> : null}
                </div>
              ) : insight.headCount ? (
                <div className="col-span-2">
                  <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">Head count</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-ink">{insight.headCount}</dd>
                </div>
              ) : null}
              {insight.foundedYear ? (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">Founded</dt>
                  <dd className="mt-1 font-brand text-2xl font-semibold text-ink tabular-nums">{insight.foundedYear}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}

          {insight.layoffs ? (
            <div className="mt-5">
              <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">Layoffs, last 12 months</h3>
              {events ? (
                <ol className="mt-1 divide-y divide-slate-200">
                  {events.map((event) => (
                    <li
                      key={`${event.date}-${event.people}`}
                      className={
                        event.date.length > 28
                          ? 'py-3'
                          : 'grid gap-1 py-3 sm:grid-cols-[10.5rem_minmax(0,1fr)] sm:items-baseline sm:gap-4'
                      }
                    >
                      <p className="text-sm font-semibold text-ink">{event.date}</p>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">{event.people}</p>
                        {event.detail ? <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">{event.detail}</p> : null}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-2 text-sm leading-relaxed text-ink">{insight.layoffs}</p>
              )}
            </div>
          ) : null}

          {insight.offices.length > 0 ? (
            <div className="mt-5">
              <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">Offices</h3>
              {places.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {shownPlaces.map((office) => (
                    <li
                      key={office}
                      className={
                        isHeadquarters(office)
                          ? 'rounded-full border border-brand-border bg-brand-soft px-2.5 py-1 text-sm font-semibold text-ink'
                          : 'rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-sm text-ink'
                      }
                    >
                      {office}
                    </li>
                  ))}
                </ul>
              ) : null}
              {officeNotes.map((note) => (
                <p key={note} className="mt-2 text-sm leading-relaxed text-ink-muted">
                  {note}
                </p>
              ))}
              {places.length > OFFICE_LIMIT ? (
                <button
                  type="button"
                  className="mt-2 cursor-pointer text-sm font-semibold text-brand transition-colors duration-200 hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  aria-expanded={officesOpen}
                  onClick={() => setOfficesOpen((open) => !open)}
                >
                  {officesOpen ? 'Show fewer' : `Show all ${places.length} offices`}
                </button>
              ) : null}
            </div>
          ) : null}

          {insight.values ? (
            <div className="mt-5">
              <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">Values</h3>
              {values ? (
                <>
                  {values.quote ? <p className="mt-2 font-brand text-base font-semibold text-ink">“{values.quote}”</p> : null}
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {values.chips.map((chip) => (
                      <li key={chip} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-sm text-ink">
                        {chip}
                      </li>
                    ))}
                  </ul>
                  {values.rest ? <p className="mt-2 text-sm leading-relaxed text-ink-muted">{values.rest}</p> : null}
                </>
              ) : (
                <p className="mt-2 text-sm leading-relaxed text-ink">{insight.values}</p>
              )}
            </div>
          ) : null}

          <p className="mt-5 border-t border-slate-200 pt-4 text-xs leading-relaxed text-ink-muted">
            Researched with Brave AI Mode{insight.fetchedAt ? ` on ${formatFetched(insight.fetchedAt)}` : ''}. AI-generated; check the
            sources before relying on it.
          </p>
          {insight.sources.length > 0 ? (
            <>
              <h3 className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">Sources</h3>
              <ol className="mt-2 space-y-1.5">
                {insight.sources.map((source, index) => (
                  <li key={source.link} className="flex items-center gap-2">
                    <span className="w-5 shrink-0 text-right text-xs text-ink-muted">{index + 1}.</span>
                    {source.icon ? (
                      <img src={source.icon} alt="" className="h-4 w-4 shrink-0 rounded-sm" loading="lazy" referrerPolicy="no-referrer" />
                    ) : null}
                    <a href={source.link} target="_blank" rel="noreferrer" className={`${linkClass} min-w-0`}>
                      <span className="truncate">{source.title}</span>
                      <span className="shrink-0 font-normal text-ink-muted">({hostOf(source.link)})</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="sr-only">Opens in a new tab</span>
                    </a>
                  </li>
                ))}
              </ol>
            </>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
