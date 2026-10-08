import { useEffect, useState } from 'react'
import { ApplicationsBoard } from './components/ApplicationsBoard.tsx'
import { SignInScreen, SignUpScreen } from './components/AuthScreens.tsx'
import { IndiaJobsMap } from './components/IndiaJobsMap.tsx'
import { serpApiJobsSource } from './data/serpJobs.ts'
import { countJobsByState, withJobCounts } from './lib/aggregateJobs.ts'
import type { IndiaFeatureCollection, JobPin } from './types.ts'

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; geo: IndiaFeatureCollection; jobs: JobPin[] }
  | { status: 'error'; message: string }

function isIndiaCollection(value: unknown): value is IndiaFeatureCollection {
  if (!value || typeof value !== 'object') return false
  const record = value as { type?: unknown; features?: unknown }
  return record.type === 'FeatureCollection' && Array.isArray(record.features)
}

function LoadingScreen() {
  return (
    <div className="relative h-dvh overflow-hidden bg-white p-4" aria-busy="true">
      <p className="sr-only" aria-live="polite">
        Loading the map of Rails jobs across Indian states.
      </p>
      <div className="h-44 w-full max-w-sm animate-pulse rounded-2xl bg-slate-200" />
      <div className="absolute bottom-4 right-4 hidden h-[70%] w-72 animate-pulse rounded-2xl bg-slate-200 md:block" />
      <div className="absolute inset-x-4 bottom-4 h-48 animate-pulse rounded-2xl bg-slate-200 md:hidden" />
    </div>
  )
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="flex h-dvh items-center justify-center bg-white p-6 font-sans">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg" role="alert">
        <h1 className="font-brand text-xl font-semibold text-ink">The India map did not load</h1>
        <p className="mt-2 text-sm text-ink-muted">{message}</p>
      </div>
    </div>
  )
}

export default function App() {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' })
  const [screen, setScreen] = useState<'map' | 'sign-in' | 'sign-up' | 'applications'>('map')

  useEffect(() => {
    let cancelled = false

    async function loadMap() {
      try {
        const [response, jobs] = await Promise.all([fetch('/india-states.geojson'), serpApiJobsSource.load()])
        if (!response.ok) {
          throw new Error('The India map file could not be loaded. Refresh and try again.')
        }
        const payload: unknown = await response.json()
        if (!isIndiaCollection(payload)) {
          throw new Error('The India map file was not a valid collection of states.')
        }
        if (cancelled) return
        setLoad({
          status: 'ready',
          geo: withJobCounts(payload, countJobsByState(jobs)),
          jobs,
        })
      } catch (error) {
        if (cancelled) return
        const message = error instanceof Error ? error.message : 'The India map file could not be loaded.'
        setLoad({ status: 'error', message })
      }
    }

    void loadMap()
    return () => {
      cancelled = true
    }
  }, [])

  if (load.status === 'loading') return <LoadingScreen />
  if (load.status === 'error') return <ErrorScreen message={load.message} />
  return (
    <>
      <IndiaJobsMap
        geo={load.geo}
        jobs={load.jobs}
        showPanels={screen === 'map'}
        onSignIn={() => setScreen('sign-in')}
        onSignUp={() => setScreen('sign-up')}
        onOpenApplications={() => setScreen('applications')}
      />
      {screen === 'applications' ? <ApplicationsBoard onClose={() => setScreen('map')} /> : null}
      {screen === 'sign-in' ? (
        <SignInScreen onSignUp={() => setScreen('sign-up')} onSuccess={() => setScreen('map')} onClose={() => setScreen('map')} />
      ) : null}
      {screen === 'sign-up' ? (
        <SignUpScreen onSignIn={() => setScreen('sign-in')} onSuccess={() => setScreen('map')} onClose={() => setScreen('map')} />
      ) : null}
    </>
  )
}
