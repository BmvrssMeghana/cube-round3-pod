interface ImageBoxProps {
  label: string
  src: string | null
  placeholder?: string
}

export function ImageBox({ label, src, placeholder = 'No image available' }: ImageBoxProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 text-center">
        {label}
      </p>
      <div className="aspect-square w-full max-w-sm mx-auto rounded-xl border border-white/10 bg-white/5 overflow-hidden flex items-center justify-center">
        {src ? (
          <img src={src} alt={label} className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs text-white/20 px-4 text-center">{placeholder}</span>
        )}
      </div>
    </div>
  )
}
