import { Check, X } from 'lucide-react'
import type { UserResume } from '../lib/auth.ts'
import type { JobFit } from '../lib/jobFit.ts'

function scoreTone(score: number): string {
  if (score >= 70) return 'text-emerald-700'
  if (score >= 40) return 'text-amber-700'
  return 'text-brand'
}

function Chip({ name, matched }: { name: string; matched: boolean }) {
  return (
    <li
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${
        matched ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'
      }`}
    >
      {matched ? <Check className="h-3 w-3" aria-hidden="true" /> : <X className="h-3 w-3" aria-hidden="true" />}
      {name}
      <span className="sr-only">{matched ? ' (you have this)' : ' (missing from your profile)'}</span>
    </li>
  )
}

export function JobFitCard({
  fit,
  error,
  onSignIn,
  onAts,
  resumes = [],
  resumeId = null,
  bestResumeId = null,
  onPickResume,
}: {
  fit: JobFit | null
  error: string | null
  onSignIn: () => void
  onAts: () => void
  resumes?: UserResume[]
  resumeId?: number | null
  bestResumeId?: number | null
  onPickResume?: (id: number) => void
}) {
  const link =
    'cursor-pointer font-semibold text-brand underline-offset-2 hover:text-brand-hover hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'
  return (
    <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="job-fit">
      <h2 id="job-fit" className="font-brand text-lg font-semibold text-ink">
        Job fit check
      </h2>
      {resumes.length > 1 && onPickResume ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <label htmlFor="fit-resume" className="text-ink-muted">
            Scored against
          </label>
          <select
            id="fit-resume"
            value={resumeId ?? ''}
            onChange={(event) => onPickResume(Number(event.target.value))}
            className="cursor-pointer rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-ink focus:border-brand focus:ring-2 focus:ring-brand/15"
          >
            {resumes.map((resume) => (
              <option key={resume.id} value={resume.id}>
                {resume.label}
                {resume.id === bestResumeId ? ' (best fit)' : ''}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {error ? (
        <p className="mt-2 text-sm text-brand" role="alert">
          {error}
        </p>
      ) : !fit ? (
        <p className="mt-2 text-sm text-ink-muted">Checking the skills this role asks for…</p>
      ) : fit.required.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">
          This posting doesn’t name any skills we recognise, so we can’t score your fit. Read the description below.
        </p>
      ) : (
        <>
          {fit.score != null && fit.has_skills ? (
            <div className="mt-3 flex flex-wrap items-end gap-x-8 gap-y-3">
              <div>
                <p className={`font-brand text-4xl font-semibold ${scoreTone(fit.score)}`}>{fit.score}%</p>
                <p className="text-xs text-ink-muted">
                  skill match · {fit.matched.length} of {fit.required.length} skills
                </p>
              </div>
              {fit.ats_score != null ? (
                <div>
                  <p className={`font-brand text-4xl font-semibold ${scoreTone(fit.ats_score)}`}>{fit.ats_score}</p>
                  <p className="text-xs text-ink-muted">your resume’s ATS score</p>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-sm text-ink">
              {fit.signed_in ? (
                <>
                  Add skills to your profile or{' '}
                  <button type="button" className={link} onClick={onAts}>
                    run the ATS checker
                  </button>{' '}
                  to see how well you match.
                </>
              ) : (
                <>
                  <button type="button" className={link} onClick={onSignIn}>
                    Sign in
                  </button>{' '}
                  to see how your skills match what this role asks for.
                </>
              )}
            </p>
          )}
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Skills this role asks for">
            {fit.required.map((skill) => (
              <Chip key={skill.name} name={skill.name} matched={fit.matched.includes(skill.name)} />
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-muted">
            Based on a keyword match against a fixed list of skills, not an AI reading. It can miss skills outside that list and
            doesn’t judge years of experience.
          </p>
        </>
      )}
    </section>
  )
}
