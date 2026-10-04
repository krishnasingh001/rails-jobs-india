import type { CityCount, StateCount } from '../types.ts'
import { formatKilometres, travelSense } from '../lib/formatDistance.ts'

type PlaceListProps = {
  mode: 'states' | 'cities'
  states: StateCount[]
  cities: CityCount[]
  stateName: string | null
  query: string
  hoverCode: string | null
  selectedCode: string | null
  onQuery: (value: string) => void
  onSelectState: (code: string) => void
  onSelectCity: (code: string, city: string) => void
  onBackToStates: () => void
}

export function PlaceList({
  mode,
  states,
  cities,
  stateName,
  query,
  hoverCode,
  selectedCode,
  onQuery,
  onSelectState,
  onSelectCity,
  onBackToStates,
}: PlaceListProps) {
  const needle = query.trim().toLowerCase()
  const visibleStates = states.filter((state) => state.name.toLowerCase().includes(needle))
  const visibleCities = cities.filter((city) => city.city.toLowerCase().includes(needle))
  const maxJobs = Math.max(1, ...states.map((state) => state.jobs))

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="border-b border-slate-200 px-4 py-3">
        {mode === 'cities' ? (
          <button
            type="button"
            className="mb-2 cursor-pointer text-sm font-semibold text-brand transition-colors duration-200 hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            onClick={onBackToStates}
          >
            All states
          </button>
        ) : null}
        <h2 className="font-brand text-base font-semibold text-ink">
          {mode === 'states' ? 'States' : stateName}
        </h2>
        <label className="mt-2 block cursor-pointer text-xs font-medium text-ink-muted" htmlFor="place-filter">
          {mode === 'states' ? 'Filter states' : 'Filter cities'}
        </label>
        <input
          id="place-filter"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder={mode === 'states' ? 'Karnataka, Delhi…' : 'Bengaluru, Pune…'}
          className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-ink transition-colors duration-200 placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/15"
        />
      </div>
      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-2">
        {mode === 'states'
          ? visibleStates.map((state) => {
              const selected = state.code === selectedCode
              const hovered = state.code === hoverCode
              return (
                <li key={state.code}>
                  <button
                    type="button"
                    className={`w-full cursor-pointer rounded-xl px-3 py-2 text-left transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                      selected ? 'bg-brand-soft' : hovered ? 'bg-brand-soft/70' : 'hover:bg-brand-soft/40'
                    }`}
                    onClick={() => onSelectState(state.code)}
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-medium text-ink">{state.name}</span>
                      <span className="font-brand text-sm text-brand">{state.jobs}</span>
                    </span>
                    <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <span
                        className="block h-full rounded-full bg-brand"
                        style={{ width: `${(state.jobs / maxJobs) * 100}%` }}
                      />
                    </span>
                  </button>
                </li>
              )
            })
          : visibleCities.map((city) => (
              <li key={city.city}>
                <button
                  type="button"
                  className="w-full cursor-pointer rounded-xl px-3 py-2 text-left transition-colors duration-200 hover:bg-brand-soft/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  onClick={() => onSelectCity(city.code, city.city)}
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium text-ink">{city.city}</span>
                    <span className="font-brand text-sm text-brand">{city.jobs}</span>
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-muted">
                    {formatKilometres(city.distanceKm)} · {travelSense(city.distanceKm)}
                  </span>
                </button>
              </li>
            ))}
        {mode === 'states' && visibleStates.length === 0 ? (
          <li className="px-3 py-6 text-sm text-ink-muted">No state matches that filter.</li>
        ) : null}
        {mode === 'cities' && visibleCities.length === 0 ? (
          <li className="px-3 py-6 text-sm text-ink-muted">No Rails roles in this state yet.</li>
        ) : null}
      </ul>
    </section>
  )
}
