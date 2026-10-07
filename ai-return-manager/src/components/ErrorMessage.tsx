interface ErrorMessageProps {
  message: string | null
  onDismiss?: () => void
}

export function ErrorMessage({ message, onDismiss }: ErrorMessageProps) {
  if (!message) return null
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-lg border border-[rgba(224,38,78,0.3)] bg-[var(--red-bg)] px-4 py-3 text-sm text-[var(--red)] font-medium"
    >
      <span className="mt-0.5 shrink-0 text-base">⚠</span>
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 text-[var(--red)] opacity-60 hover:opacity-100 text-lg leading-none"
          aria-label="Dismiss"
        >
          ×
        </button>
      )}
    </div>
  )
}

