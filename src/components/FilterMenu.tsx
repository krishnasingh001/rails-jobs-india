import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Check, ChevronDown } from 'lucide-react'

type Option<T extends string> = {
  value: T
  label: string
}

type FilterMenuProps<T extends string> = {
  id: string
  label: string
  value: T
  options: Option<T>[]
  placeholder?: string
  /** Names the button when no visible label points at `id`. */
  buttonLabel?: string
  inline?: boolean
  align?: 'left' | 'right'
  onChange: (value: T) => void
}

export function FilterMenu<T extends string>({
  id,
  label,
  value,
  options,
  placeholder,
  buttonLabel,
  inline = false,
  align = 'left',
  onChange,
}: FilterMenuProps<T>) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const typed = useRef('')
  const typedTimer = useRef(0)
  const listId = useId()
  const selected = options.findIndex((option) => option.value === value)
  const current = selected >= 0 ? options[selected] : undefined

  useEffect(() => {
    if (!open) return
    listRef.current?.focus()
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [open])

  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  function close(restoreFocus: boolean) {
    setOpen(false)
    if (restoreFocus) buttonRef.current?.focus()
  }

  function choose(index: number) {
    const option = options[index]
    if (!option) return
    onChange(option.value)
    close(true)
  }

  function openAt(index: number) {
    setActive(index)
    setOpen(true)
  }

  function onTriggerKey(event: ReactKeyboardEvent) {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openAt(selected >= 0 ? selected : 0)
    }
  }

  function onListKey(event: ReactKeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((index) => Math.min(options.length - 1, index + 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((index) => Math.max(0, index - 1))
    } else if (event.key === 'Home') {
      event.preventDefault()
      setActive(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      setActive(options.length - 1)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      choose(active)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      close(true)
    } else if (event.key.length === 1 && /\S/.test(event.key)) {
      window.clearTimeout(typedTimer.current)
      typed.current = `${typed.current}${event.key}`.toLowerCase()
      typedTimer.current = window.setTimeout(() => {
        typed.current = ''
      }, 500)
      const match = options.findIndex((option) => option.label.toLowerCase().startsWith(typed.current))
      if (match >= 0) setActive(match)
    }
  }

  return (
    <div ref={rootRef} className={inline ? 'relative' : 'relative mt-1'}>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={buttonLabel}
        className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2 text-left text-sm shadow-sm transition-colors duration-200 hover:border-brand-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
          inline ? 'w-auto min-w-44' : 'w-full'
        } ${current ? 'text-ink' : 'text-ink-muted'} ${open ? 'border-brand ring-2 ring-brand/15' : 'border-slate-300'}`}
        onClick={() => (open ? close(false) : openAt(selected >= 0 ? selected : 0))}
        onKeyDown={onTriggerKey}
      >
        <span className="truncate">{current?.label ?? placeholder}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-ink-muted transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={label}
          tabIndex={-1}
          className={`absolute z-30 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-[0_16px_40px_rgb(15_23_42/0.12)] outline-none ${
            inline ? 'w-max min-w-full' : 'w-full'
          } ${align === 'right' ? 'right-0' : 'left-0'}`}
          onKeyDown={onListKey}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value
            const isActive = index === active
            return (
              <li key={option.value || 'all'} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  data-active={isActive ? 'true' : undefined}
                  className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors duration-150 ${
                    isSelected ? 'bg-brand-soft font-semibold text-brand' : isActive ? 'bg-slate-50 text-ink' : 'text-ink hover:bg-slate-50'
                  }`}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(index)}
                >
                  <Check className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'opacity-100' : 'opacity-0'}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
