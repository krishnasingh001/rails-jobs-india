import { useEffect, useState } from 'react'
import { ExternalLink, Heart, MapPin, TrendingDown, Users } from 'lucide-react'
import { loadCompanyInsight, type CompanyInsight } from '../data/companyInsight.ts'

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; insight: CompanyInsight | null }

const linkClass =
  'inline-flex cursor-pointer items-center gap-1 text-sm font-semibold text-brand underline-offset-2 transition-colors duration-200 hover:text-brand-hover hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

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

function Block({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">
        <span className="text-brand">{icon}</span>
        {label}
      </h3>
      <div className="mt-1.5 text-sm text-ink">{children}</div>
    </div>
  )
}

export function CompanyInsightPanel({ company }: { company: string }) {
  const [state, setState] = useState<State>({ status: 'loading' })

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

  return (
    <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="job-company">
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

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Block icon={<TrendingDown className="h-4 w-4" aria-hidden="true" />} label="Layoffs, last 12 months">
              {insight.layoffs ?? 'Not found'}
            </Block>
            <Block icon={<Users className="h-4 w-4" aria-hidden="true" />} label="Head count">
              {insight.headCount ?? 'Not found'}
              {insight.foundedYear ? <span className="mt-1 block text-ink-muted">Founded {insight.foundedYear}</span> : null}
            </Block>
            <Block icon={<MapPin className="h-4 w-4" aria-hidden="true" />} label="Offices">
              {insight.offices.length > 0 ? (
                <ul className="list-disc space-y-1 pl-4">
                  {insight.offices.map((office) => (
                    <li key={office}>{office}</li>
                  ))}
                </ul>
              ) : (
                'Not found'
              )}
            </Block>
            <Block icon={<Heart className="h-4 w-4" aria-hidden="true" />} label="Values">
              {insight.values ?? 'Not found'}
            </Block>
          </div>

          <div className="mt-5 border-t border-slate-200 pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">Sources</h3>
            <p className="mt-1 text-xs text-ink-muted">
              Researched with Brave AI Mode{insight.fetchedAt ? ` on ${formatFetched(insight.fetchedAt)}` : ''}. AI-generated; check
              the sources before relying on it.
            </p>
            {insight.sources.length > 0 ? (
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
            ) : (
              <p className="mt-2 text-sm text-ink-muted">No source links were returned.</p>
            )}
          </div>
        </>
      ) : null}
    </section>
  )
}
