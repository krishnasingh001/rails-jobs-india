import { useRef, useState } from 'react'
import { FileUp, Trash2 } from 'lucide-react'
import { Chip, fieldClass } from './ProfilePage.tsx'
import { useAuth } from '../context/AuthContext.tsx'
import { createResume, deleteResume, updateResume, type AiLevel, type UserResume, type UserResumeInput } from '../lib/auth.ts'
import { extractResumeProfile, validateResumeFile } from '../lib/resumeCheck.ts'

const MAX_RESUMES = 5
const AI_LABELS: Record<AiLevel, string> = { none: 'No AI work', user: 'AI user', builder: 'AI builder', expert: 'AI expert' }

function labelFromFilename(name: string, taken: string[]): string {
  const base = name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 36) || 'Resume'
  let label = base
  for (let n = 2; taken.some((item) => item.toLowerCase() === label.toLowerCase()); n += 1) label = `${base} ${n}`
  return label
}

function ResumeCard({ resume, onChanged, onError }: { resume: UserResume; onChanged: () => Promise<void>; onError: (message: string | null) => void }) {
  const [label, setLabel] = useState(resume.label)
  const [years, setYears] = useState(resume.years_experience != null ? String(resume.years_experience) : '')
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  async function save(input: UserResumeInput) {
    setBusy(true)
    onError(null)
    try {
      await updateResume(resume.id, input)
      await onChanged()
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : 'Could not save this resume.')
      setLabel(resume.label)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!window.confirm(`Delete “${resume.label}”?`)) return
    setBusy(true)
    onError(null)
    try {
      await deleteResume(resume.id)
      await onChanged()
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : 'Could not delete this resume.')
      setBusy(false)
    }
  }

  function addSkill() {
    const value = draft.trim()
    setDraft('')
    if (value && !resume.skills.some((skill) => skill.toLowerCase() === value.toLowerCase())) void save({ skills: [...resume.skills, value] })
  }

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4" aria-busy={busy}>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`resume-label-${resume.id}`} className="sr-only">
          Resume name
        </label>
        <input
          id={`resume-label-${resume.id}`}
          value={label}
          maxLength={40}
          onChange={(event) => setLabel(event.target.value)}
          onBlur={() => label.trim() !== resume.label && label.trim() !== '' && void save({ label: label.trim() })}
          className={`${fieldClass} max-w-xs font-semibold`}
        />
        <span className="text-xs text-ink-muted">
          {resume.skills.length} skills
          {resume.ai_fluency ? ` · ${AI_LABELS[resume.ai_fluency]}` : ''}
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={() => void remove()}
          className="ml-auto inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-ink-muted hover:text-brand focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-60"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          Delete
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {resume.skills.map((skill) => (
          <Chip key={skill} label={skill} onRemove={() => void save({ skills: resume.skills.filter((item) => item !== skill) })} />
        ))}
        {resume.skills.length === 0 ? <span className="text-sm text-ink-muted">No skills on this resume yet.</span> : null}
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div className="flex gap-2">
          <label htmlFor={`resume-skill-${resume.id}`} className="sr-only">
            Add a skill to {resume.label}
          </label>
          <input
            id={`resume-skill-${resume.id}`}
            value={draft}
            maxLength={40}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                addSkill()
              }
            }}
            placeholder="Add a skill"
            className={`${fieldClass} w-44`}
          />
          <button
            type="button"
            onClick={addSkill}
            className="cursor-pointer rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-ink transition-colors duration-200 hover:border-brand-border hover:bg-brand-soft hover:text-brand"
          >
            Add
          </button>
        </div>
        <div>
          <label htmlFor={`resume-years-${resume.id}`} className="block text-xs font-semibold text-ink-muted">
            Years of experience
          </label>
          <input
            id={`resume-years-${resume.id}`}
            type="number"
            min={0}
            max={50}
            step={0.5}
            value={years}
            onChange={(event) => setYears(event.target.value)}
            onBlur={() => {
              const next = years.trim() === '' ? null : Number(years)
              if (next !== resume.years_experience) void save({ years_experience: next })
            }}
            className={`${fieldClass} mt-0.5 w-28`}
          />
        </div>
      </div>
    </li>
  )
}

/** Manage the candidate's resumes. Changes save straight away, apart from the profile form. */
export function ResumesSection() {
  const { user, reloadUser } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [reading, setReading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resumes = user?.resumes ?? []

  async function onFile(file: File | undefined) {
    if (!file) return
    const problem = validateResumeFile(file)
    if (problem) {
      setError(problem)
      return
    }
    setReading(true)
    setError(null)
    try {
      const found = await extractResumeProfile(file)
      await createResume({
        label: labelFromFilename(file.name, resumes.map((resume) => resume.label)),
        skills: found.skills.slice(0, 40),
        years_experience: found.yearsExperience,
        ai_fluency: found.aiLevel,
        ai_signals: found.aiSignals,
      })
      await reloadUser()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not add this resume.')
    } finally {
      setReading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div>
      {resumes.length > 0 ? (
        <ul className="space-y-3">
          {resumes.map((resume) => (
            <ResumeCard key={resume.id} resume={resume} onChanged={reloadUser} onError={setError} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-muted">No resumes yet. Add one and every job will be scored against it.</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={reading || resumes.length >= MAX_RESUMES}
          onClick={() => fileRef.current?.click()}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-ink transition-colors duration-200 hover:border-brand-border hover:bg-brand-soft hover:text-brand disabled:cursor-not-allowed disabled:opacity-70"
        >
          <FileUp className="h-4 w-4" aria-hidden="true" />
          {reading ? 'Reading your resume…' : 'Add a resume'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(event) => void onFile(event.target.files?.[0])}
        />
        {resumes.length >= MAX_RESUMES ? <span className="text-sm text-ink-muted">You can keep up to {MAX_RESUMES} resumes.</span> : null}
      </div>
      {error ? (
        <p className="mt-2 text-sm text-brand" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
