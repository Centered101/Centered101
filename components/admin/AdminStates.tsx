import { Inbox, Loader2, RefreshCw, ServerOff } from 'lucide-react'

export function AdminLoading({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-3">
      <Loader2 className="size-6 animate-spin text-[#3f3f46]" />
      <p className="text-xs text-[#52525b]">{message}</p>
    </div>
  )
}

export function AdminError({
  error,
  onRetry,
}: {
  error: string
  onRetry?: () => void
}) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-3">
      <div className="grid size-10 place-items-center rounded-full border border-[#EF4444]/20 bg-[#EF4444]/10">
        <ServerOff className="size-5 text-[#EF4444]" />
      </div>
      <p className="max-w-xs text-center text-sm text-[#EF4444]">{error}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 rounded-lg border border-[#27272A] bg-[#18181B] px-3 py-1.5 text-xs text-[#A1A1AA] transition-colors hover:text-[#FAFAFA]"
        >
          <RefreshCw className="size-3" />
          Retry
        </button>
      )}
    </div>
  )
}

export function AdminEmpty({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="grid size-10 place-items-center rounded-full border border-[#27272A] bg-[#18181B]">
        <Inbox className="size-5 text-[#3f3f46]" />
      </div>
      <div>
        <p className="text-sm font-medium text-[#FAFAFA]">{title}</p>
        {description && <p className="mt-0.5 text-[12px] text-[#52525b]">{description}</p>}
      </div>
      {action}
    </div>
  )
}
