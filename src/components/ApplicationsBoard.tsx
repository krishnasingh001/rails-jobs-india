import { PageSheet } from './AppShell.tsx'
import { GripVertical } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
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

type DragGhost = {
  id: number
  title: string
  company: string
  x: number
  y: number
  width: number
}

function moveCard(columns: Columns, application: TrackedApplication, status: ApplicationStatus): Columns {
  const next = { ...columns }
  for (const key of APPLICATION_STATUSES) {
    next[key] = next[key].filter((item) => item.id !== application.id)
  }
  next[status] = [{ ...application, status, statusDisplay: APPLICATION_STATUS_LABELS[status] }, ...next[status]]
  return next
}

export function ApplicationsBoard({ onClose }: { onClose: () => void }) {
  const [columns, setColumns] = useState<Columns | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [overStatus, setOverStatus] = useState<ApplicationStatus | null>(null)
  const [ghost, setGhost] = useState<DragGhost | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const columnRefs = useRef<Partial<Record<ApplicationStatus, HTMLElement | null>>>({})
  const focusId = useRef<number | null>(null)

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

  useEffect(() => {
    if (focusId.current == null) return
    document.getElementById(`application-${focusId.current}`)?.focus()
    focusId.current = null
  }, [columns])

  function columnAt(x: number, y: number): ApplicationStatus | null {
    for (const status of APPLICATION_STATUSES) {
      const node = columnRefs.current[status]
      if (!node) continue
      const rect = node.getBoundingClientRect()
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return status
    }
    return null
  }

  async function changeStatus(application: TrackedApplication, status: ApplicationStatus) {
    if (status === application.status) return
    setBusyId(application.id)
    setError(null)
    let snapshot: Columns | null = null
    setColumns((current) => {
      snapshot = current
      return current ? moveCard(current, application, status) : current
    })
    setAnnouncement(`${application.jobTitle} moved to ${APPLICATION_STATUS_LABELS[status]}.`)
    try {
      await updateApplicationStatus(application.id, status)
    } catch (caught) {
      if (snapshot) setColumns(snapshot)
      const message = caught instanceof Error ? caught.message : 'Could not update this application.'
      setError(message)
      setAnnouncement(message)
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
      setAnnouncement(`${application.jobTitle} removed.`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not remove this application.')
    } finally {
      setBusyId(null)
    }
  }

  function startDrag(event: ReactPointerEvent<HTMLDivElement>, application: TrackedApplication) {
    if (event.button !== 0 || busyId === application.id) return
    event.preventDefault()
    const card = event.currentTarget
    const rect = card.getBoundingClientRect()
    const originX = event.clientX
    const originY = event.clientY
    const offsetX = originX - rect.left
    const offsetY = originY - rect.top
    let active = false

    function place(clientX: number, clientY: number) {
      setGhost({
        id: application.id,
        title: application.jobTitle,
        company: application.company,
        x: clientX - offsetX,
        y: clientY - offsetY,
        width: rect.width,
      })
      const next = columnAt(clientX, clientY)
      setOverStatus((current) => (current === next ? current : next))
    }

    function onMove(moveEvent: PointerEvent) {
      if (!active && Math.hypot(moveEvent.clientX - originX, moveEvent.clientY - originY) < 6) return
      if (!active) {
        active = true
        setDraggingId(application.id)
      }
      place(moveEvent.clientX, moveEvent.clientY)
    }

    function finish(endEvent: PointerEvent) {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
      const next = active ? columnAt(endEvent.clientX, endEvent.clientY) : null
      setDraggingId(null)
      setGhost(null)
      setOverStatus(null)
      if (next) void changeStatus(application, next)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
  }

  function moveWithKeyboard(event: ReactKeyboardEvent, application: TrackedApplication, status: ApplicationStatus) {
    const index = APPLICATION_STATUSES.indexOf(status)
    const next =
      event.key === 'ArrowRight' ? APPLICATION_STATUSES[index + 1] : event.key === 'ArrowLeft' ? APPLICATION_STATUSES[index - 1] : null
    if (!next) return
    event.preventDefault()
    focusId.current = application.id
    void changeStatus(application, next)
  }

  const total = columns ? APPLICATION_STATUSES.reduce((sum, status) => sum + columns[status].length, 0) : 0

  return (
    <PageSheet size="wide">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-brand text-xs font-semibold uppercase tracking-[0.14em] text-brand">Your account</p>
          <h1 className="mt-1 font-brand text-2xl font-semibold text-ink">Track applications</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {total} roles you are tracking. Drag a card into another column to change its status.
          </p>
        </div>
        <button
          type="button"
          className="cursor-pointer text-sm font-semibold text-ink-muted transition-colors duration-200 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          onClick={onClose}
        >
          Back to the map
        </button>
      </div>

      <p className="sr-only" role="status">
        {announcement}
      </p>

      {error ? (
        <p className="mt-4 rounded-xl border border-brand-border bg-brand-soft px-3 py-2 text-sm text-brand" role="alert">
          {error}
        </p>
      ) : null}

      {!columns && !error ? <p className="mt-6 text-sm text-ink-muted">Loading your applications…</p> : null}

      {columns ? (
        <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {APPLICATION_STATUSES.map((status) => {
            const highlighted = overStatus === status
            return (
              <section
                key={status}
                ref={(node) => {
                  columnRefs.current[status] = node
                }}
                className={`min-w-0 rounded-xl border bg-white transition-colors duration-200 ${
                  highlighted ? 'border-brand bg-brand-soft/50' : 'border-slate-200'
                }`}
                aria-label={`${APPLICATION_STATUS_LABELS[status]} column`}
              >
                <header className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                  <h2 className="font-brand text-sm font-semibold text-ink">{APPLICATION_STATUS_LABELS[status]}</h2>
                  <span className="font-brand text-sm text-brand">{columns[status].length}</span>
                </header>
                <ul className="min-h-28 space-y-2 p-2">
                  {columns[status].length === 0 ? (
                    <li className="px-1 py-3 text-xs text-ink-muted">{highlighted ? 'Drop here' : 'None yet'}</li>
                  ) : null}
                  {columns[status].map((application) => (
                    <li key={application.id}>
                      <div
                        id={`application-${application.id}`}
                        tabIndex={0}
                        className={`cursor-grab touch-none rounded-xl border border-slate-200 bg-white p-2 outline-none select-none active:cursor-grabbing ${
                          draggingId === application.id ? 'opacity-40' : ''
                        }`}
                        aria-label={`${application.jobTitle} at ${application.company}, ${APPLICATION_STATUS_LABELS[status]}. Drag to another column, or use the left and right arrow keys.`}
                        onPointerDown={(event) => startDrag(event, application)}
                        onKeyDown={(event) => moveWithKeyboard(event, application, status)}
                      >
                        <div className="flex items-start gap-1.5">
                          <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-ink">{application.jobTitle}</p>
                            <p className="mt-0.5 text-xs text-ink">{application.company}</p>
                            {application.location ? <p className="mt-0.5 text-xs text-ink-muted">{application.location}</p> : null}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="mt-1.5 cursor-pointer px-2 text-xs font-semibold text-brand transition-colors duration-200 hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed"
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
            )
          })}
        </div>
      ) : null}

      {ghost
        ? createPortal(
            <div
              className="pointer-events-none fixed z-[60] rounded-xl border border-brand bg-white p-2 shadow-lg"
              style={{ left: ghost.x, top: ghost.y, width: ghost.width }}
            >
              <div className="flex items-start gap-1.5">
                <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{ghost.title}</p>
                  <p className="mt-0.5 text-xs text-ink">{ghost.company}</p>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </PageSheet>
  )
}
