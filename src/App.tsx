import { useEffect, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { PageOverlay, PageSheet, TopNav } from './components/AppShell.tsx'
import { useAuth } from './context/AuthContext.tsx'
import { AtsResumeChecker } from './components/AtsResumeChecker.tsx'
import { ApplicationsBoard } from './components/ApplicationsBoard.tsx'
import { SignInScreen, SignUpScreen } from './components/AuthScreens.tsx'
import { IndiaJobsMap } from './components/IndiaJobsMap.tsx'
import { JobsForYouPage } from './components/JobsForYouPage.tsx'
import { ProfilePage } from './components/ProfilePage.tsx'
import { JobDetailPage } from './components/JobDetailPage.tsx'
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
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading: authLoading } = useAuth()
  const home = () => navigate('/')
  const goBack = () => (location.key === 'default' ? navigate('/') : navigate(-1))

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
  const onMap = location.pathname === '/'
  const density = location.pathname === '/sign-in' || location.pathname === '/sign-up' ? 'light' : 'heavy'
  const jobsById = new Map(load.jobs.map((job) => [job.id, job]))

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <IndiaJobsMap
        geo={load.geo}
        jobs={load.jobs}
        showPanels={onMap}
        onOpenJob={(job) => navigate(`/jobs/${encodeURIComponent(job.id)}`)}
      />
      <TopNav />
      {onMap ? null : (
        <PageOverlay density={density}>
          <Routes>
            <Route path="/sign-in" element={<SignInScreen onSignUp={() => navigate('/sign-up')} onSuccess={home} onClose={home} />} />
            <Route path="/sign-up" element={<SignUpScreen onSignIn={() => navigate('/sign-in')} onSuccess={() => navigate('/profile')} onClose={home} />} />
            <Route path="/ats" element={<AtsResumeChecker onClose={home} />} />
            <Route
              path="/applications"
              element={authLoading ? null : user ? <ApplicationsBoard onClose={home} /> : <Navigate to="/sign-in" replace />}
            />
            <Route
              path="/for-you"
              element={
                authLoading ? null : user ? (
                  <JobsForYouPage jobs={load.jobs} onOpenJob={(job) => navigate(`/jobs/${encodeURIComponent(job.id)}`)} />
                ) : (
                  <Navigate to="/sign-in" replace />
                )
              }
            />
            <Route
              path="/profile"
              element={authLoading ? null : user ? <ProfilePage onClose={home} /> : <Navigate to="/sign-in" replace />}
            />
            <Route
              path="/jobs/:id"
              element={<JobRoute jobs={jobsById} onBack={goBack} onSignIn={() => navigate('/sign-in')} />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </PageOverlay>
      )}
    </div>
  )
}

function JobRoute({ jobs, onBack, onSignIn }: { jobs: Map<string, JobPin>; onBack: () => void; onSignIn: () => void }) {
  const { id } = useParams()
  const job = id ? jobs.get(id) : undefined
  if (!job) {
    return (
      <PageSheet size="narrow">
        <h1 className="font-brand text-xl font-semibold text-ink">Job not found</h1>
        <p className="mt-2 text-sm text-ink-muted">This role may have been removed.</p>
        <Link to="/" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">
          Back to the map
        </Link>
      </PageSheet>
    )
  }
  return <JobDetailPage job={job} onBack={onBack} onSignIn={onSignIn} />
}
