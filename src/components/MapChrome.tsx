import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown, LocateFixed, Map as MapIcon, Pentagon, RefreshCw } from 'lucide-react'
import { ORIGIN_CHOICES } from '../data/cities.ts'
import type { Origin } from '../types.ts'

function OriginSelect({
  value,
  usingDeviceLocation,
  onChange,
}: {
  value: string
  usingDeviceLocation: boolean
  onChange: (cityName: string) => void
}) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const selected = usingDeviceLocation ? 'Your location' : value
  const options = usingDeviceLocation ? ['Your location', ...ORIGIN_CHOICES] : [...ORIGIN_CHOICES]

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      <button
        id="origin-city"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-left text-sm font-medium text-ink transition-colors duration-200 hover:border-brand-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="truncate">{selected}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-ink-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Distance from"
          className="absolute top-full z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {options.map((city) => {
            const isSelected = city === selected
            return (
              <li key={city} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                    isSelected ? 'bg-brand-soft font-semibold text-brand' : 'text-ink hover:bg-brand-soft/70'
                  }`}
                  onClick={() => {
                    if (city !== 'Your location') onChange(city)
                    setOpen(false)
                  }}
                >
                  {isSelected ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : <span className="h-4 w-4 shrink-0" aria-hidden="true" />}
                  {city}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}

type MapChromeProps = {
  origin: Origin
  usingDeviceLocation: boolean
  locateMessage: string | null
  remoteCount: number
  remoteActive: boolean
  pitched: boolean
  showBack: boolean
  locatedJobs: number
  hiringStates: number
  onOriginChange: (cityName: string) => void
  onLocate: () => void
  onTogglePitch: () => void
  onBack: () => void
  onRemote: () => void
  harvesting: boolean
  harvestMessage: string | null
  harvestFailed: boolean
  onHarvest: () => void
}

export function MapChrome({
  origin,
  usingDeviceLocation,
  locateMessage,
  remoteCount,
  remoteActive,
  pitched,
  showBack,
  locatedJobs,
  hiringStates,
  onOriginChange,
  onLocate,
  onTogglePitch,
  onBack,
  onRemote,
  harvesting,
  harvestMessage,
  harvestFailed,
  onHarvest,
}: MapChromeProps) {
  return (
    <div className="pointer-events-none absolute inset-x-4 top-4 z-20 flex flex-wrap items-start justify-between gap-2">
      <section className="pointer-events-auto w-full min-w-0 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-lg backdrop-blur-md md:w-80">
        <p className="font-brand text-xs font-semibold uppercase tracking-[0.14em] text-brand">Rails jobs in India</p>
        <h1 className="mt-1 font-brand text-xl font-semibold text-ink">Where the roles are</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {locatedJobs} city roles across {hiringStates} states. Deeper red means more roles.
        </p>
        <label className="mt-3 block cursor-pointer text-xs font-medium text-ink-muted" htmlFor="origin-city">
          Distance from
        </label>
        <div className="mt-1 flex gap-2">
          <OriginSelect value={origin.name} usingDeviceLocation={usingDeviceLocation} onChange={onOriginChange} />
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-1 rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            onClick={onLocate}
          >
            <LocateFixed className="h-4 w-4" aria-hidden="true" />
            Locate
          </button>
        </div>
        {locateMessage ? <p className="mt-2 text-xs text-ink-muted">{locateMessage}</p> : null}
        <button
          type="button"
          className={`mt-3 inline-flex cursor-pointer items-center rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
            remoteActive
              ? 'border-brand bg-brand-soft text-brand'
              : 'border-slate-300 bg-white text-ink hover:border-brand-border hover:bg-brand-soft hover:text-brand'
          }`}
          onClick={onRemote}
        >
          Remote · {remoteCount}
        </button>
        <button
          type="button"
          className="mt-3 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:bg-brand/70"
          onClick={onHarvest}
          disabled={harvesting}
          aria-busy={harvesting}
        >
          <RefreshCw className={`h-4 w-4 ${harvesting ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true" />
          {harvesting ? 'Fetching jobs' : 'Fetch latest jobs'}
        </button>
        {harvestMessage ? (
          <p className={`mt-2 text-xs ${harvestFailed ? 'text-brand' : 'text-ink-muted'}`} role={harvestFailed ? 'alert' : 'status'}>
            {harvestMessage}
          </p>
        ) : null}
      </section>

      <div className="pointer-events-auto flex shrink-0 flex-row gap-2 md:flex-col md:items-end">
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-2 text-sm font-semibold text-ink shadow-lg backdrop-blur-md transition-colors duration-200 hover:border-brand-border hover:bg-brand-soft hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          onClick={onTogglePitch}
          aria-pressed={pitched}
          aria-label={pitched ? 'Show the map in 2D' : 'Show the map in 3D'}
        >
          {pitched ? <Pentagon className="h-4 w-4" aria-hidden="true" /> : <MapIcon className="h-4 w-4" aria-hidden="true" />}
          {pitched ? '3D' : '2D'}
        </button>
        {showBack ? (
          <button
            type="button"
            className="cursor-pointer rounded-full bg-brand px-3 py-2 text-sm font-semibold text-white shadow-lg transition-colors duration-200 hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            onClick={onBack}
          >
            Back to India
          </button>
        ) : null}
      </div>
    </div>
  )
}
