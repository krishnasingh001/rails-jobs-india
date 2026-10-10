import { PageSheet } from './AppShell.tsx'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext.tsx'
import {
  checkResume,
  deleteResumeCheck,
  downloadResumeFile,
  listResumeChecks,
  loadResumeCheck,
  validateResumeFile,
  type AtsCheckCategory,
  type AtsCheckItem,
  type AtsCheckReport,
  type SavedResumeCheck,
} from '../lib/resumeCheck.ts'

type Phase = 'idle' | 'scanning' | 'report'

export function AtsResumeChecker({ onClose }: { onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<AtsCheckReport | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [targetRole, setTargetRole] = useState('')
  const { user } = useAuth()
  const [history, setHistory] = useState<SavedResumeCheck[]>([])
  const [saved, setSaved] = useState(false)

  const refreshHistory = useCallback(async () => {
    try {
      setHistory(await listResumeChecks())
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load your earlier checks.')
    }
  }, [])

  useEffect(() => {
    if (user) void refreshHistory()
  }, [user, refreshHistory])

  async function openSaved(check: SavedResumeCheck) {
    setError(null)
    try {
      const next = await loadResumeCheck(check.id)
      setReport(next)
      setSaved(false)
      setOpenId((next.categories.find((c) => c.points_to_gain > 0) ?? next.categories[0])?.id ?? null)
      setPhase('report')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not open this report.')
    }
  }

  async function removeSaved(check: SavedResumeCheck) {
    try {
      await deleteResumeCheck(check.id)
      setHistory((current) => current.filter((item) => item.id !== check.id))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not delete this check.')
    }
  }

  async function downloadSaved(check: SavedResumeCheck) {
    try {
      await downloadResumeFile(check)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not download this resume.')
    }
  }

  async function onFile(file: File | undefined | null) {
    if (!file) return
    const problem = validateResumeFile(file)
    if (problem) {
      setError(problem)
      return
    }
    setError(null)
    setPhase('scanning')
    try {
      const result = await checkResume(file, targetRole)
      const next = result.report
      setSaved(result.saved)
      if (result.saved) void refreshHistory()
      setReport(next)
      setOpenId((next.categories.find((c) => c.points_to_gain > 0) ?? next.categories[0])?.id ?? null)
      setPhase('report')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not analyze this resume.')
      setPhase('idle')
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function reset() {
    setPhase('idle')
    setReport(null)
    setError(null)
    setOpenId(null)
  }

  const scanning = phase === 'scanning'

  return (
    <PageSheet size="wide">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-brand text-xs font-semibold uppercase tracking-[0.14em] text-brand">Free tool</p>
              <h1 className="mt-1 font-brand text-2xl font-semibold text-ink">ATS resume checker</h1>
              <p className="mt-1 max-w-xl text-sm text-ink-muted">
                Upload a PDF or DOCX and get a score out of 100 with the checks recruiters’ software fails on Rails resumes.
              </p>
            </div>
            <button type="button" className="cursor-pointer text-sm font-semibold text-ink-muted hover:text-ink" onClick={onClose}>
              Back to the map
            </button>
          </div>

          {phase === 'report' && report ? (
            <ReportView
              report={report}
              openId={openId}
              onToggle={(id) => setOpenId((prev) => (prev === id ? null : id))}
              onReset={reset}
              saved={saved}
            />
          ) : (
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="target-role" className="block text-sm font-semibold text-ink">
                  Target role <span className="font-normal text-ink-muted">(optional)</span>
                </label>
                <textarea
                  id="target-role"
                  rows={3}
                  value={targetRole}
                  onChange={(event) => setTargetRole(event.target.value)}
                  placeholder="Paste a job title or short JD snippet, e.g. Senior Rails Engineer, Sidekiq, PostgreSQL, remote"
                  className="mt-2 w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-ink"
                />
                <p className="mt-1.5 text-xs text-ink-muted">Adds a keyword coverage check for that role. Leave blank for a general check.</p>
                <ul className="mt-5 space-y-2 text-sm text-ink-muted">
                  {[
                    'Checks contact info, sections, dates, content and Rails skills',
                    'Signed in, each resume and report is saved to your history',
                    'Rescan any time after you edit',
                  ].map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-emerald-600" aria-hidden>
                        ✓
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div
                onDragOver={(event) => {
                  event.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(event) => {
                  event.preventDefault()
                  setDragOver(false)
                  if (!scanning) void onFile(event.dataTransfer.files?.[0])
                }}
                className={[
                  'flex min-h-60 flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors',
                  dragOver ? 'border-brand bg-brand-soft' : 'border-slate-300 bg-white',
                  scanning ? 'opacity-70' : '',
                ].join(' ')}
              >
                <p className="font-brand text-base font-semibold text-ink">{scanning ? 'Scanning your resume…' : 'Drop your resume here'}</p>
                <p className="mt-1 text-sm text-ink-muted">PDF or DOCX · max 5MB</p>
                <button
                  type="button"
                  disabled={scanning}
                  onClick={() => inputRef.current?.click()}
                  className="mt-5 cursor-pointer rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {scanning ? 'Analyzing…' : 'Upload your resume'}
                </button>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(event) => void onFile(event.target.files?.[0])}
                />
              </div>
            </div>
          )}

          {phase !== 'report' ? (
            <section className="mt-6 border-t border-slate-100 pt-4" aria-label="Earlier checks">
              <h2 className="font-brand text-base font-semibold text-ink">Your earlier checks</h2>
              {!user ? (
                <p className="mt-1 text-sm text-ink-muted">Sign in to keep each resume you check and come back to its report.</p>
              ) : history.length === 0 ? (
                <p className="mt-1 text-sm text-ink-muted">Resumes you check while signed in are saved here (latest 20).</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {history.map((check) => (
                    <li key={check.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5">
                      <ScorePill score={check.overall_score} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink" title={check.filename}>
                          {check.filename}
                        </p>
                        <p className="truncate text-xs text-ink-muted">
                          {new Date(check.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                          {check.target_role ? ` · ${check.target_role}` : ''}
                        </p>
                      </div>
                      <div className="flex gap-3 text-xs font-semibold">
                        <button type="button" className="cursor-pointer text-brand hover:text-brand-hover" onClick={() => void openSaved(check)}>
                          View report
                        </button>
                        <button type="button" className="cursor-pointer text-ink-muted hover:text-ink" onClick={() => void downloadSaved(check)}>
                          Download
                        </button>
                        <button type="button" className="cursor-pointer text-ink-muted hover:text-brand" onClick={() => void removeSaved(check)}>
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          {error ? (
            <p className="mt-4 rounded-xl border border-brand-border bg-brand-soft px-3 py-2 text-sm text-brand" role="alert">
              {error}
            </p>
          ) : null}
    </PageSheet>
  )
}

function ReportView({
  report,
  openId,
  onToggle,
  onReset,
  saved,
}: {
  report: AtsCheckReport
  openId: string | null
  onToggle: (id: string) => void
  onReset: () => void
  saved: boolean
}) {
  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex justify-center">
          <ScoreRing score={report.overall_score} />
        </div>
        <p className="mt-3 text-center text-sm font-semibold text-ink">{report.summary}</p>
        <p className="mt-1 text-center text-xs text-ink-muted">
          {report.passed_count} of {report.total_checks} checks passed
        </p>
        {saved ? <p className="mt-2 text-center text-[11px] font-medium text-emerald-700">Saved to your history</p> : null}
        {report.filename ? (
          <p className="mt-2 truncate text-center text-[11px] text-ink-muted" title={report.filename}>
            {report.filename}
          </p>
        ) : null}
        <button
          type="button"
          onClick={onReset}
          className="mt-4 w-full cursor-pointer rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-brand-border hover:bg-brand-soft hover:text-brand"
        >
          Check another resume
        </button>
      </aside>

      <div className="space-y-3">
        {report.categories.map((category) => (
          <CategoryPanel key={category.id} category={category} open={openId === category.id} onToggle={() => onToggle(category.id)} />
        ))}
      </div>
    </div>
  )
}

function CategoryPanel({ category, open, onToggle }: { category: AtsCheckCategory; open: boolean; onToggle: () => void }) {
  const working = category.checks.filter((c) => c.status === 'pass')
  const losing = category.checks.filter((c) => c.status !== 'pass')
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left">
        <ScorePill score={category.score} />
        <div className="min-w-0 flex-1">
          <h2 className="font-brand text-base font-semibold text-ink">{category.label}</h2>
          {category.points_to_gain > 0 ? (
            <p className="text-xs text-ink-muted">+{category.points_to_gain} pts to gain</p>
          ) : (
            <p className="text-xs text-emerald-700">Looking strong</p>
          )}
        </div>
        <span className="text-ink-muted" aria-hidden>
          {open ? '−' : '+'}
        </span>
      </button>
      {open ? (
        <div className="grid gap-4 border-t border-slate-100 px-4 py-4 sm:grid-cols-2">
          <CheckGroup title="Where you lose points" items={losing} empty="Nothing critical here." />
          <CheckGroup title="Working for you" items={working} empty="No passes in this category yet." />
        </div>
      ) : null}
    </article>
  )
}

function CheckGroup({ title, items, empty }: { title: string; items: AtsCheckItem[]; empty: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">{title}</p>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
              <StatusDot status={item.status} />
              <div>
                <p className="text-sm font-medium text-ink">{item.label}</p>
                <p className="mt-0.5 text-xs text-ink-muted">{item.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ScoreRing({ score }: { score: number }) {
  const size = 120
  const stroke = 10
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const color = score >= 85 ? '#10b981' : score >= 70 ? '#f59e0b' : '#dc2626'
  return (
    <div className="relative" style={{ width: size, height: size }} role="img" aria-label={`ATS score ${score} out of 100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (score / 100) * c}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-brand text-3xl font-bold tabular-nums text-ink">{score}</span>
    </div>
  )
}

function ScorePill({ score }: { score: number }) {
  const tone = score >= 85 ? 'bg-emerald-50 text-emerald-700' : score >= 70 ? 'bg-amber-50 text-amber-800' : 'bg-brand-soft text-brand'
  return (
    <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums ${tone}`}>{score}</span>
  )
}

function StatusDot({ status }: { status: AtsCheckItem['status'] }) {
  const tone =
    status === 'pass' ? 'bg-emerald-100 text-emerald-700' : status === 'warn' ? 'bg-amber-100 text-amber-700' : 'bg-brand-soft text-brand'
  const glyph = status === 'pass' ? '✓' : status === 'warn' ? '!' : '×'
  return (
    <span className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${tone}`} aria-label={status}>
      {glyph}
    </span>
  )
}
