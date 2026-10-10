import { PageSheet } from './AppShell.tsx'
import { useEffect, useState } from 'react'
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  loadApplicationBoard,
  removeApplication,
  updateApplicationStatus,
  type ApplicationStatus,
  type TrackedApplication,
} from '../lib/applications.ts'

type Columns = Record<ApplicationStatus, TrackedApplication[]>

export function ApplicationsBoard({ onClose }: { onClose: () => void }) {
  const [columns, setColumns] = useState<Columns | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    loadApplicationBoard()
      .then((next) => {
        if (!cancelled) setColumns(next)
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : 'Could not load applications.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function changeStatus(application: TrackedApplication, status: ApplicationStatus) {
    if (status === application.status) return
    setBusyId(application.id)
    setError(null)
    try {
      await updateApplicationStatus(application.id, status)
      setColumns((current) => {
        if (!current) return current
        const next = { ...current }
        for (const key of APPLICATION_STATUSES) {
          next[key] = next[key].filter((item) => item.id !== application.id)
        }
        next[status] = [{ ...application, status, statusDisplay: APPLICATION_STATUS_LABELS[status] }, ...next[status]]
        return next
      })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update this application.')
    } finally {
      setBusyId(null)
    }
  }

  async function remove(application: TrackedApplication) {
    setBusyId(application.id)
    setError(null)
    try {
      await removeApplication(application.id)
      setColumns((current) => {
        if (!current) return current
        const next = { ...current }
        for (const key of APPLICATION_STATUSES) {
          next[key] = next[key].filter((item) => item.id !== application.id)
        }
        return next
      })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not remove this application.')
    } finally {
      setBusyId(null)
    }
  }

  const total = columns ? APPLICATION_STATUSES.reduce((sum, status) => sum + columns[status].length, 0) : 0

  return (
    <PageSheet size="wide">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-brand text-xs font-semibold uppercase tracking-[0.14em] text-brand">Your account</p>
              <h1 className="mt-1 font-brand text-2xl font-semibold text-ink">Track applications</h1>
              <p className="mt-1 text-sm text-ink-muted">{total} roles you are tracking.</p>
            </div>
            <button
              type="button"
              className="cursor-pointer text-sm font-semibold text-ink-muted hover:text-ink"
              onClick={onClose}
            >
              Back to the map
            </button>
          </div>

          {error ? (
            <p className="mt-4 rounded-xl border border-brand-border bg-brand-soft px-3 py-2 text-sm text-brand" role="alert">
              {error}
            </p>
          ) : null}

          {!columns && !error ? <p className="mt-6 text-sm text-ink-muted">Loading your applications…</p> : null}

          {columns ? (
            <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              {APPLICATION_STATUSES.map((status) => (
                <section key={status} className="min-w-0 rounded-xl border border-slate-200 bg-white">
                  <header className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                    <h2 className="font-brand text-sm font-semibold text-ink">{APPLICATION_STATUS_LABELS[status]}</h2>
                    <span className="font-brand text-sm text-brand">{columns[status].length}</span>
                  </header>
                  <ul className="space-y-2 p-2">
                    {columns[status].length === 0 ? <li className="px-1 py-3 text-xs text-ink-muted">None yet</li> : null}
                    {columns[status].map((application) => (
                      <li key={application.id} className="rounded-xl border border-slate-200 p-2">
                        <p className="text-sm font-semibold text-ink">{application.jobTitle}</p>
                        <p className="mt-0.5 text-xs text-ink">{application.company}</p>
                        {application.location ? <p className="mt-0.5 text-xs text-ink-muted">{application.location}</p> : null}
                        <label className="mt-2 block text-xs font-medium text-ink-muted" htmlFor={`status-${application.id}`}>
                          Status
                        </label>
                        <select
                          id={`status-${application.id}`}
                          className="mt-1 w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-ink"
                          style={{ colorScheme: 'light' }}
                          value={application.status}
                          disabled={busyId === application.id}
                          onChange={(event) => {
                            void changeStatus(application, event.target.value as ApplicationStatus)
                          }}
                        >
                          {APPLICATION_STATUSES.map((option) => (
                            <option key={option} value={option}>
                              {APPLICATION_STATUS_LABELS[option]}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="mt-2 cursor-pointer text-xs font-semibold text-brand hover:text-brand-hover disabled:cursor-not-allowed"
                          disabled={busyId === application.id}
                          onClick={() => {
                            void remove(application)
                          }}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          ) : null}
    </PageSheet>
  )
}
