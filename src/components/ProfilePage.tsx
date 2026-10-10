import { useRef, useState, type FormEvent } from 'react'
import { Camera, Check, FileUp, X } from 'lucide-react'
import { Avatar, PageSheet } from './AppShell.tsx'
import { photoToAvatar } from '../lib/avatar.ts'
import { useAuth } from '../context/AuthContext.tsx'
import { CITIES } from '../data/cities.ts'
import type { AiLevel, WorkModePreference } from '../lib/auth.ts'
import { ResumesSection } from './ResumesSection.tsx'
import { extractResumeProfile, validateResumeFile, type ResumeProfile } from '../lib/resumeCheck.ts'

export const MODES: { value: WorkModePreference; label: string }[] = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
]

export const AI_LEVELS: { value: AiLevel; label: string; hint: string }[] = [
  { value: 'none', label: 'Not yet', hint: 'I have not used AI tools for work.' },
  { value: 'user', label: 'AI user', hint: 'I use tools like ChatGPT, Copilot or Claude in my daily work.' },
  { value: 'builder', label: 'AI builder', hint: 'I have built features on LLM APIs or ML tooling.' },
  { value: 'expert', label: 'AI expert', hint: 'I have shipped RAG, agents, evals or fine-tuning.' },
]

export function aiLevelLabel(level: AiLevel | null | undefined): string {
  return AI_LEVELS.find((item) => item.value === level)?.label ?? 'Not set'
}

export const fieldClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-ink transition-colors duration-200 focus:border-brand focus:ring-2 focus:ring-brand/15'

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-slate-100 pt-5">
      <h2 className="font-brand text-lg font-semibold text-ink">{title}</h2>
      {hint ? <p className="mt-0.5 text-sm text-ink-muted">{hint}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  )
}

export function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft py-1 pl-3 pr-1.5 text-sm font-semibold text-brand">
      {label}
      <button
        type="button"
        className="cursor-pointer rounded-full p-0.5 hover:bg-white/70 focus-visible:outline-2 focus-visible:outline-brand"
        onClick={onRemove}
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="sr-only">Remove {label}</span>
      </button>
    </span>
  )
}

export function ProfilePage({ onClose }: { onClose: () => void }) {
  const { user, updateProfile } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  const [avatar, setAvatar] = useState<string | null>(user?.avatar ?? null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [cities, setCities] = useState<string[]>(user?.preferred_cities ?? [])
  const [modes, setModes] = useState<WorkModePreference[]>(user?.work_modes ?? [])
  const [salary, setSalary] = useState(user?.expected_salary_lpa != null ? String(user.expected_salary_lpa) : '')
  const [years, setYears] = useState(user?.years_experience != null ? String(user.years_experience) : '')
  const [aiLevel, setAiLevel] = useState<AiLevel | null>(user?.ai_fluency ?? null)
  const [resumeAi, setResumeAi] = useState<{ level: AiLevel; signals: string[] } | null>(
    user?.resume_ai_fluency ? { level: user.resume_ai_fluency, signals: user.resume_ai_signals ?? [] } : null,
  )
  const [skills, setSkills] = useState<string[]>(user?.skills ?? [])
  const [skillDraft, setSkillDraft] = useState('')
  const [resumeUrl, setResumeUrl] = useState(user?.resume_url ?? '')
  const [found, setFound] = useState<ResumeProfile | null>(null)
  const [reading, setReading] = useState(false)
  const [readError, setReadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; failed: boolean } | null>(null)

  if (!user) return null

  async function onResume(file: File | undefined) {
    if (!file) return
    const problem = validateResumeFile(file)
    if (problem) {
      setReadError(problem)
      return
    }
    setReading(true)
    setReadError(null)
    try {
      const result = await extractResumeProfile(file)
      setFound(result)
      setSkills((current) => [...current, ...result.skills.filter((s) => !current.some((c) => c.toLowerCase() === s.toLowerCase()))].slice(0, 40))
      if (result.yearsExperience != null) setYears(String(result.yearsExperience))
      setResumeAi({ level: result.aiLevel, signals: result.aiSignals })
      setAiLevel((current) => current ?? result.aiLevel)
    } catch (caught) {
      setReadError(caught instanceof Error ? caught.message : 'Could not read this resume.')
    } finally {
      setReading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return
    setPhotoError(null)
    try {
      setAvatar(await photoToAvatar(file))
    } catch (caught) {
      setPhotoError(caught instanceof Error ? caught.message : 'Could not use that photo.')
    } finally {
      if (photoRef.current) photoRef.current.value = ''
    }
  }

  function addSkill() {
    const value = skillDraft.trim()
    if (value && !skills.some((skill) => skill.toLowerCase() === value.toLowerCase())) setSkills([...skills, value])
    setSkillDraft('')
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      await updateProfile({
        avatar,
        preferred_cities: cities,
        work_modes: modes,
        expected_salary_lpa: salary.trim() === '' ? null : Number(salary),
        years_experience: years.trim() === '' ? null : Number(years),
        ai_fluency: aiLevel,
        resume_ai_fluency: resumeAi?.level ?? null,
        resume_ai_signals: resumeAi?.signals ?? [],
        skills,
        resume_url: resumeUrl.trim(),
      })
      setMessage({ text: 'Saved. Your Jobs for you list is updated.', failed: false })
    } catch (caught) {
      setMessage({ text: caught instanceof Error ? caught.message : 'Could not save your profile.', failed: true })
    } finally {
      setSaving(false)
    }
  }

  const availableCities = CITIES.filter((city) => !cities.includes(city.name))

  return (
    <PageSheet size="wide">
      <form onSubmit={(event) => void onSubmit(event)} className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-1.5">
              <Avatar name={user.name} src={avatar} size="lg" />
              <input
                ref={photoRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => void onPhoto(event.target.files?.[0])}
              />
              <div className="flex items-center gap-3 text-xs font-semibold">
                <button
                  type="button"
                  className="inline-flex cursor-pointer items-center gap-1 text-brand hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  onClick={() => photoRef.current?.click()}
                >
                  <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                  {avatar ? 'Change' : 'Upload photo'}
                </button>
                {avatar ? (
                  <button type="button" className="cursor-pointer text-ink-muted hover:text-brand" onClick={() => setAvatar(null)}>
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
            <div>
              <p className="font-brand text-xs font-semibold uppercase tracking-[0.14em] text-brand">Your profile</p>
              <h1 className="mt-1 font-brand text-2xl font-semibold text-ink">{user.name}</h1>
              <p className="mt-1 max-w-xl text-sm text-ink-muted">
                {user.email}. We use what you add here to rank your <strong>Jobs for you</strong> list. Nothing is shared with employers.
              </p>
              {photoError ? (
                <p className="mt-1 text-sm text-brand" role="alert">
                  {photoError}
                </p>
              ) : null}
            </div>
          </div>
          <button type="button" className="cursor-pointer text-sm font-semibold text-ink-muted hover:text-ink" onClick={onClose}>
            Back to the map
          </button>
        </div>

        <Section
          title="Your resumes"
          hint="Keep up to five, such as a backend and a full-stack version. Each job is scored against the one that fits it best. These save as soon as you change them."
        >
          <ResumesSection />
        </Section>

        <Section title="Start from your resume" hint="Upload a PDF or DOCX to fill in your profile-wide skills, years of experience and AI experience. You can edit everything.">
          <button
            type="button"
            disabled={reading}
            onClick={() => fileRef.current?.click()}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-ink transition-colors duration-200 hover:border-brand-border hover:bg-brand-soft hover:text-brand disabled:cursor-not-allowed disabled:opacity-70"
          >
            <FileUp className="h-4 w-4" aria-hidden="true" />
            {reading ? 'Reading your resume…' : 'Read my resume'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(event) => void onResume(event.target.files?.[0])}
          />
          {found ? (
            <p className="mt-2 text-sm text-emerald-700" role="status">
              Found {found.skills.length} skills
              {found.yearsExperience != null
                ? `, about ${found.yearsExperience} years of experience (${found.experienceSource === 'stated' ? 'stated on your resume' : 'added up from your job dates'})`
                : ', no clear years of experience'}
              {`, and AI level “${aiLevelLabel(found.aiLevel)}”.`}
            </p>
          ) : null}
          {readError ? (
            <p className="mt-2 text-sm text-brand" role="alert">
              {readError}
            </p>
          ) : null}
        </Section>

        <Section title="Where and how do you want to work?">
          <p className="text-sm font-semibold text-ink">Cities</p>
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
          <p className="mt-4 text-sm font-semibold text-ink">Work mode</p>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Work mode">
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
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="profile-salary" className="block text-sm font-semibold text-ink">
                Expected salary <span className="font-normal text-ink-muted">(lakh per year)</span>
              </label>
              <input
                id="profile-salary"
                type="number"
                min={1}
                max={1000}
                step={1}
                inputMode="numeric"
                value={salary}
                onChange={(event) => setSalary(event.target.value)}
                placeholder="e.g. 18"
                className={`${fieldClass} mt-1`}
              />
            </div>
            <div>
              <label htmlFor="profile-years" className="block text-sm font-semibold text-ink">
                Years of experience
              </label>
              <input
                id="profile-years"
                type="number"
                min={0}
                max={50}
                step={0.5}
                inputMode="decimal"
                value={years}
                onChange={(event) => setYears(event.target.value)}
                placeholder="e.g. 4.5"
                className={`${fieldClass} mt-1`}
              />
            </div>
          </div>
        </Section>

        <Section title="AI fluency" hint="How much do you work with AI? Be honest, it only changes how jobs that mention AI are ranked for you.">
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="AI fluency">
            {AI_LEVELS.map((level) => {
              const active = aiLevel === level.value
              return (
                <button
                  key={level.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setAiLevel(level.value)}
                  className={`cursor-pointer rounded-xl border px-4 py-3 text-left transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                    active ? 'border-brand bg-brand-soft' : 'border-slate-200 bg-white hover:border-brand-border'
                  }`}
                >
                  <span className={`block text-sm font-semibold ${active ? 'text-brand' : 'text-ink'}`}>{level.label}</span>
                  <span className="mt-0.5 block text-xs text-ink-muted">{level.hint}</span>
                </button>
              )
            })}
          </div>
          {resumeAi ? (
            <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-ink">
              <span className="font-semibold">Your resume suggests: {aiLevelLabel(resumeAi.level)}.</span>{' '}
              {resumeAi.signals.length > 0 ? `Found: ${resumeAi.signals.join(', ')}.` : 'We found no AI-related work on it.'}{' '}
              <span className="text-ink-muted">This is a keyword check of what you wrote, not a test of your skills.</span>
            </p>
          ) : (
            <p className="mt-3 text-sm text-ink-muted">Read your resume above and we will also check it for AI experience.</p>
          )}
        </Section>

        <Section title="Skills" hint="Used to compare you with each job’s requirements.">
          <div className="flex flex-wrap items-center gap-2">
            {skills.map((skill) => (
              <Chip key={skill} label={skill} onRemove={() => setSkills(skills.filter((item) => item !== skill))} />
            ))}
            {skills.length === 0 ? <span className="text-sm text-ink-muted">No skills yet.</span> : null}
          </div>
          <div className="mt-3 flex max-w-sm gap-2">
            <label htmlFor="profile-skill" className="sr-only">
              Add a skill
            </label>
            <input
              id="profile-skill"
              value={skillDraft}
              maxLength={40}
              onChange={(event) => setSkillDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  addSkill()
                }
              }}
              placeholder="Add a skill, e.g. Sidekiq"
              className={fieldClass}
            />
            <button
              type="button"
              onClick={addSkill}
              className="cursor-pointer rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-ink transition-colors duration-200 hover:border-brand-border hover:bg-brand-soft hover:text-brand"
            >
              Add
            </button>
          </div>
          <div className="mt-4 max-w-md">
            <label htmlFor="profile-resume-url" className="block text-sm font-semibold text-ink">
              Resume link <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <input
              id="profile-resume-url"
              type="url"
              value={resumeUrl}
              onChange={(event) => setResumeUrl(event.target.value)}
              placeholder="https://"
              className={`${fieldClass} mt-1`}
            />
          </div>
        </Section>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
          <button
            type="submit"
            disabled={saving}
            className="cursor-pointer rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? 'Saving…' : 'Save profile'}
          </button>
          {message ? (
            <p className={`text-sm ${message.failed ? 'text-brand' : 'text-emerald-700'}`} role={message.failed ? 'alert' : 'status'}>
              {message.text}
            </p>
          ) : null}
        </div>
      </form>
    </PageSheet>
  )
}
