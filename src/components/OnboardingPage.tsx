import { useState, type FormEvent } from 'react'
import { Check } from 'lucide-react'
import { PageSheet } from './AppShell.tsx'
import { Chip, MODES, fieldClass } from './ProfilePage.tsx'
import { useAuth } from '../context/AuthContext.tsx'
import { CITIES } from '../data/cities.ts'
import type { WorkModePreference } from '../lib/auth.ts'

/** The step right after sign-up: just enough to fill Jobs for you. Everything else lives on the profile page. */
export function OnboardingPage({ onDone }: { onDone: () => void }) {
  const { user, updateProfile } = useAuth()
  const [cities, setCities] = useState<string[]>(user?.preferred_cities ?? [])
  const [modes, setModes] = useState<WorkModePreference[]>(user?.work_modes ?? [])
  const [salary, setSalary] = useState(user?.expected_salary_lpa != null ? String(user.expected_salary_lpa) : '')
  const [years, setYears] = useState(user?.years_experience != null ? String(user.years_experience) : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!user) return null

  const remoteOnly = modes.length > 0 && modes.every((mode) => mode === 'remote')
  const needsCities = modes.length > 0 && !remoteOnly && cities.length === 0
  const canSave = modes.length > 0 && !needsCities
  const availableCities = CITIES.filter((city) => !cities.includes(city.name))

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      await updateProfile({
        preferred_cities: cities,
        work_modes: modes,
        expected_salary_lpa: salary.trim() === '' ? null : Number(salary),
        years_experience: years.trim() === '' ? null : Number(years),
      })
      onDone()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save your preferences.')
      setSaving(false)
    }
  }

  return (
    <PageSheet size="narrow">
      <form onSubmit={(event) => void onSubmit(event)} className="space-y-5">
        <div>
          <p className="font-brand text-xs font-semibold uppercase tracking-[0.14em] text-brand">Welcome, {user.name.split(' ')[0]}</p>
          <h1 className="mt-1 font-brand text-2xl font-semibold text-ink">Where do you want to work?</h1>
          <p className="mt-2 text-sm text-ink-muted">
            We only show roles in the cities and work modes you pick. Remote roles appear only if you choose Remote. You can change this any time.
          </p>
        </div>

        <fieldset>
          <legend className="text-sm font-semibold text-ink">Work mode</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {MODES.map((mode) => {
              const active = modes.includes(mode.value)
              return (
                <button
                  key={mode.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setModes(active ? modes.filter((item) => item !== mode.value) : [...modes, mode.value])}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                    active ? 'border-brand bg-brand-soft text-brand' : 'border-slate-300 bg-white text-ink hover:border-brand-border hover:bg-brand-soft hover:text-brand'
                  }`}
                >
                  {active ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                  {mode.label}
                </button>
              )
            })}
          </div>
        </fieldset>

        <div>
          <p className="text-sm font-semibold text-ink">
            Cities {remoteOnly ? <span className="font-normal text-ink-muted">(not needed for remote only)</span> : null}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {cities.map((city) => (
              <Chip key={city} label={city} onRemove={() => setCities(cities.filter((item) => item !== city))} />
            ))}
            {cities.length < 10 ? (
              <select
                aria-label="Add a city"
                value=""
                onChange={(event) => event.target.value && setCities([...cities, event.target.value])}
                className={`${fieldClass} w-auto cursor-pointer`}
              >
                <option value="">Add a city…</option>
                {availableCities.map((city) => (
                  <option key={city.name} value={city.name}>
                    {city.name}, {city.state}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
          {needsCities ? <p className="mt-2 text-sm text-ink-muted">Pick at least one city for hybrid or on-site roles.</p> : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="onboard-salary" className="block text-sm font-semibold text-ink">
              Expected salary <span className="font-normal text-ink-muted">(lakh per year, optional)</span>
            </label>
            <input id="onboard-salary" type="number" min={1} max={1000} inputMode="numeric" value={salary} onChange={(event) => setSalary(event.target.value)} placeholder="e.g. 18" className={`${fieldClass} mt-1`} />
          </div>
          <div>
            <label htmlFor="onboard-years" className="block text-sm font-semibold text-ink">
              Years of experience <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <input id="onboard-years" type="number" min={0} max={50} step={0.5} inputMode="decimal" value={years} onChange={(event) => setYears(event.target.value)} placeholder="e.g. 4.5" className={`${fieldClass} mt-1`} />
          </div>
        </div>

        {error ? (
          <p className="text-sm text-brand" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={saving || !canSave}
            className="cursor-pointer rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? 'Saving…' : 'Show my jobs'}
          </button>
          <button type="button" className="cursor-pointer text-sm font-semibold text-ink-muted hover:text-ink" onClick={onDone}>
            Skip for now
          </button>
        </div>
      </form>
    </PageSheet>
  )
}
