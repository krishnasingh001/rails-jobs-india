import { PageSheet } from './AppShell.tsx'
import { useState, type FormEvent, type ReactNode } from 'react'
import { useAuth } from '../context/AuthContext.tsx'
import { checkResume, extractResumeSkills, validateResumeFile } from '../lib/resumeCheck.ts'

const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.in',
  'yahoo.co.uk',
  'ymail.com',
  'hotmail.com',
  'hotmail.co.uk',
  'outlook.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'proton.me',
  'protonmail.com',
  'aol.com',
  'zoho.com',
  'zohomail.com',
  'gmx.com',
  'gmx.net',
  'mail.com',
  'yandex.com',
  'yandex.ru',
  'rediffmail.com',
  'inbox.com',
])

function isFreeEmail(email: string) {
  const domain = email.trim().toLowerCase().split('@')[1]
  return Boolean(domain && FREE_EMAIL_DOMAINS.has(domain))
}

const fieldClass =
  'mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-ink transition-colors duration-200 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15'

function AuthShell({
  kicker,
  title,
  subtitle,
  children,
  footer,
  onClose,
}: {
  kicker: string
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
  onClose: () => void
}) {
  return (
    <PageSheet size="narrow">
          <div className="mb-6 text-center">
            <p className="font-brand text-xs font-semibold uppercase tracking-[0.14em] text-brand">{kicker}</p>
            <h1 className="mt-2 font-brand text-3xl font-semibold text-ink">{title}</h1>
            <p className="mt-2 text-sm text-ink-muted">{subtitle}</p>
          </div>
          {children}
          <div className="mt-6 text-center text-sm text-ink-muted">{footer}</div>
          <div className="mt-3 text-center">
            <button type="button" className="cursor-pointer text-sm font-semibold text-ink-muted hover:text-ink" onClick={onClose}>
              Back to the map
            </button>
          </div>
    </PageSheet>
  )
}

export function SignInScreen({
  onSignUp,
  onSuccess,
  onClose,
}: {
  onSignUp: () => void
  onSuccess: () => void
  onClose: () => void
}) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(email, password)
      onSuccess()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign in failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      kicker="Welcome back"
      title="Sign in"
      subtitle="Access the India Rails jobs map with your account."
      footer={
        <>
          New here?{' '}
          <button type="button" className="cursor-pointer font-semibold text-brand hover:underline" onClick={onSignUp}>
            Create an account
          </button>
        </>
      }
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error ? (
          <div className="rounded-xl border border-brand-border bg-brand-soft px-3 py-2 text-sm text-brand" role="alert">
            {error}
          </div>
        ) : null}
        <div>
          <label htmlFor="email" className="text-xs font-medium text-ink-muted">
            Email
          </label>
          <input id="email" type="email" autoComplete="email" required className={fieldClass} value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        <div>
          <label htmlFor="password" className="text-xs font-medium text-ink-muted">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            className={fieldClass}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex w-full cursor-pointer items-center justify-center rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:bg-brand/70"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  )
}

export function SignUpScreen({
  onSignIn,
  onSuccess,
  onClose,
}: {
  onSignIn: () => void
  onSuccess: () => void
  onClose: () => void
}) {
  const { register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [role, setRole] = useState('candidate')
  const [resumeUrl, setResumeUrl] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [resumeName, setResumeName] = useState<string | null>(null)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [reading, setReading] = useState(false)
  const [resumeError, setResumeError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onResumeFile(file: File | undefined) {
    if (!file) return
    const problem = validateResumeFile(file)
    if (problem) {
      setResumeError(problem)
      return
    }
    setReading(true)
    setResumeError(null)
    try {
      const found = await extractResumeSkills(file)
      setResumeName(file.name)
      setResumeFile(file)
      setSkills((current) => [...current, ...found.filter((skill) => !current.some((c) => c.toLowerCase() === skill.toLowerCase()))])
    } catch (caught) {
      setResumeError(caught instanceof Error ? caught.message : 'Could not read this resume.')
    } finally {
      setReading(false)
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    if (role === 'recruiter' && isFreeEmail(email)) {
      setError('Recruiters must sign up with a business email. Personal emails (Gmail, Yahoo, Outlook, etc.) are not allowed.')
      setBusy(false)
      return
    }
    try {
      await register({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
        role,
        ...(role === 'candidate' ? { resume_url: resumeUrl.trim(), skills } : {}),
      })
      if (role === 'candidate' && resumeFile) {
        // Keep the signup resume in the ATS history. The account already exists, so a failure here must not block sign-up.
        await checkResume(resumeFile, '').catch(() => undefined)
      }
      onSuccess()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign up failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      kicker="Get started"
      title="Create your account"
      subtitle="Join as a candidate or recruiter."
      footer={
        <>
          Already have an account?{' '}
          <button type="button" className="cursor-pointer font-semibold text-brand hover:underline" onClick={onSignIn}>
            Sign in
          </button>
        </>
      }
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error ? (
          <div className="rounded-xl border border-brand-border bg-brand-soft px-3 py-2 text-sm text-brand" role="alert">
            {error}
          </div>
        ) : null}
        <div>
          <label htmlFor="name" className="text-xs font-medium text-ink-muted">
            Full name
          </label>
          <input id="name" required className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div>
          <label htmlFor="signup-email" className="text-xs font-medium text-ink-muted">
            {role === 'recruiter' ? 'Work email' : 'Email'}
          </label>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            required
            placeholder={role === 'recruiter' ? 'you@company.com' : undefined}
            className={fieldClass}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          {role === 'recruiter' ? (
            <p className="mt-1.5 text-xs text-ink-muted">Use your company email. Personal providers like Gmail or Yahoo are not accepted.</p>
          ) : null}
        </div>
        <fieldset>
          <legend className="text-xs font-medium text-ink-muted">I am a</legend>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {(['candidate', 'recruiter'] as const).map((option) => (
              <label
                key={option}
                className={`flex cursor-pointer items-center justify-center rounded-xl border px-3 py-3 text-sm font-semibold transition-colors duration-200 ${
                  role === option ? 'border-brand bg-brand-soft text-brand' : 'border-slate-200 bg-white text-ink-muted hover:bg-brand-soft/70'
                }`}
              >
                <input type="radio" name="role" value={option} checked={role === option} onChange={() => setRole(option)} className="sr-only" />
                {option === 'candidate' ? 'Candidate' : 'Recruiter'}
              </label>
            ))}
          </div>
        </fieldset>
        {role === 'candidate' ? (
          <section className="space-y-3 rounded-xl border border-slate-200 p-3">
            <div>
              <label htmlFor="resume-file" className="text-xs font-medium text-ink-muted">
                Upload your resume <span className="font-normal">(optional, PDF or DOCX)</span>
              </label>
              <input
                id="resume-file"
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                disabled={reading}
                className="mt-1 block w-full cursor-pointer text-sm text-ink-muted file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand"
                onChange={(event) => {
                  void onResumeFile(event.target.files?.[0])
                  event.target.value = ''
                }}
              />
              <p className="mt-1 text-xs text-ink-muted">
                {reading ? 'Reading your resume…' : resumeName ? `Skills read from ${resumeName}. It will be saved to your ATS history.` : 'We read your skills from it and save it to your ATS history.'}
              </p>
              {resumeError ? (
                <p className="mt-1 text-xs text-brand" role="alert">
                  {resumeError}
                </p>
              ) : null}
            </div>
            {skills.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5" aria-label="Skills from your resume">
                {skills.map((skill) => (
                  <li key={skill} className="flex items-center gap-1 rounded-full bg-brand-soft py-1 pl-2.5 pr-1.5 text-xs font-medium text-brand">
                    {skill}
                    <button
                      type="button"
                      aria-label={`Remove ${skill}`}
                      className="cursor-pointer rounded-full px-1 leading-none hover:bg-brand-border"
                      onClick={() => setSkills((current) => current.filter((item) => item !== skill))}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <div>
              <label htmlFor="resume-url" className="text-xs font-medium text-ink-muted">
                Resume link <span className="font-normal">(optional)</span>
              </label>
              <input
                id="resume-url"
                type="url"
                inputMode="url"
                placeholder="https://drive.google.com/…"
                className={fieldClass}
                value={resumeUrl}
                onChange={(event) => setResumeUrl(event.target.value)}
              />
            </div>
          </section>
        ) : null}
        <div>
          <label htmlFor="signup-password" className="text-xs font-medium text-ink-muted">
            Password
          </label>
          <input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            className={fieldClass}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <div>
          <label htmlFor="password_confirmation" className="text-xs font-medium text-ink-muted">
            Confirm password
          </label>
          <input
            id="password_confirmation"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            className={fieldClass}
            value={passwordConfirmation}
            onChange={(event) => setPasswordConfirmation(event.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex w-full cursor-pointer items-center justify-center rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:bg-brand/70"
        >
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  )
}
