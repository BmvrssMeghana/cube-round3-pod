interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

const sizeMap = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-[3px]',
}

export function Spinner({ size = 'md', label = 'Loading…' }: SpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12" role="status" aria-label={label}>
      <div className={`${sizeMap[size]} rounded-full border-white/10 border-t-red-500 animate-spin`} />
      <span className="text-xs text-white/30 uppercase tracking-widest">{label}</span>
    </div>
  )
}
