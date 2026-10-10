export function MapChrome({ onBack }: { onBack: () => void }) {
  return (
    <div className="absolute left-4 top-[4.5rem] z-40 md:left-[calc(min(34rem,45vw)+1rem)]">
      <button
        type="button"
        className="cursor-pointer rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm font-semibold text-ink shadow-lg backdrop-blur-md transition-colors duration-200 hover:border-brand-border hover:bg-brand-soft hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        onClick={onBack}
      >
        Back to India
      </button>
    </div>
  )
}
