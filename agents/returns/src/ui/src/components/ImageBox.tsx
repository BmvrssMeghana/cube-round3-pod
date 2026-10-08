interface ImageBoxProps {
  label: string
  src: string | null
  placeholder?: string
}

export function ImageBox({ label, src, placeholder = 'No image available' }: ImageBoxProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-bold uppercase tracking-wider text-[var(--text2)] text-center">
        {label}
      </p>
      <div className="aspect-square w-full max-w-sm mx-auto rounded-xl border border-[var(--border)] bg-[var(--bg3)] overflow-hidden flex items-center justify-center">
        {src ? (
          <img src={src} alt={label} className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs text-[var(--text3)] px-4 text-center font-medium">{placeholder}</span>
        )}
      </div>
    </div>
  )
}

