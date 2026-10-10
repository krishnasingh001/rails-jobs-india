import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.tsx'

export function Avatar({ name, src, size = 'sm' }: { name: string; src?: string | null; size?: 'sm' | 'lg' }) {
  const box = size === 'lg' ? 'h-24 w-24 text-3xl' : 'h-8 w-8 text-xs'
  const initials = name
    .split(/\s+/)
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return src ? (
    <img src={src} alt="" className={`${box} shrink-0 rounded-full border border-slate-200 object-cover`} />
  ) : (
    <span
      aria-hidden="true"
      className={`${box} inline-flex shrink-0 items-center justify-center rounded-full bg-brand-soft font-brand font-semibold text-brand`}
    >
      {initials || '?'}
    </span>
  )
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-3 py-1.5 text-sm font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
    isActive ? 'bg-brand-soft text-brand' : 'text-ink hover:bg-slate-100'
  }`

export function TopNav() {
  const { user, logout } = useAuth()
  return (
    <header className="absolute inset-x-0 top-0 z-[60] flex h-14 items-center gap-2 border-b border-slate-200 bg-white/95 px-3 font-sans backdrop-blur-md sm:gap-4 sm:px-5">
      <Link
        to="/"
        className="shrink-0 font-brand text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:text-base"
      >
        <span className="text-brand">Rails</span> jobs India
      </Link>
      <nav aria-label="Main" className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        <NavLink to="/for-you" className={navLinkClass}>
          Jobs for you
        </NavLink>
        <NavLink to="/ats" className={navLinkClass}>
          ATS checker
        </NavLink>
        {user ? (
          <NavLink to="/applications" className={navLinkClass}>
            Applications
          </NavLink>
        ) : null}
      </nav>
      <div className="flex shrink-0 items-center gap-2 text-sm">
        {user ? (
          <>
            <NavLink
              to="/profile"
              aria-label={`${user.name}, open your profile`}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-full py-1 pl-1 pr-1 font-semibold transition-colors duration-200 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:pr-3 ${
                  isActive ? 'bg-brand-soft text-brand' : 'text-ink'
                }`
              }
            >
              <Avatar name={user.name} src={user.avatar} />
              <span className="hidden max-w-40 truncate sm:inline">{user.name}</span>
            </NavLink>
            <button
              type="button"
              className="cursor-pointer rounded-full border border-slate-300 px-3 py-1.5 font-semibold text-ink transition-colors duration-200 hover:border-brand-border hover:bg-brand-soft hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              onClick={() => {
                void logout()
              }}
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link
              to="/sign-in"
              className="rounded-full px-3 py-1.5 font-semibold text-ink transition-colors duration-200 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Sign in
            </Link>
            <Link
              to="/sign-up"
              className="rounded-full bg-brand px-3 py-1.5 font-semibold text-white transition-colors duration-200 hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <span className="hidden sm:inline">Create account</span>
              <span className="sm:hidden">Join</span>
            </Link>
          </>
        )}
      </div>
    </header>
  )
}

/** Scrolling layer that sits over the (still mounted) map on every non-map page. */
export function PageOverlay({ density, children }: { density: 'light' | 'heavy'; children: ReactNode }) {
  return (
    <div
      className={`absolute inset-0 z-50 flex flex-col overflow-y-auto px-4 pb-8 pt-[4.5rem] font-sans text-ink backdrop-blur-[2px] ${
        density === 'heavy' ? 'bg-[#f8f4f0]/60' : 'bg-[#f8f4f0]/30'
      }`}
    >
      {children}
    </div>
  )
}

/** The one white surface every page uses. `narrow` is for forms, `wide` for data. */
export function PageSheet({ size, children }: { size: 'narrow' | 'wide'; children: ReactNode }) {
  return (
    <div className={`mx-auto w-full ${size === 'narrow' ? 'my-auto max-w-md' : 'max-w-5xl'}`}>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg sm:p-6">{children}</div>
    </div>
  )
}
