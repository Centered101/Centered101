import { cn } from '@/lib/utils'

const toneClasses = {
  success: 'border-[#22C55E]/30 bg-[#22C55E]/10 text-[#22C55E]',
  info: 'border-[#409EFE]/30 bg-[#409EFE]/10 text-[#409EFE]',
  warning: 'border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#F59E0B]',
  danger: 'border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444]',
  neutral: 'border-[#27272A] bg-[#18181B] text-[#A1A1AA]',
  purple: 'border-violet-400/25 bg-violet-400/10 text-violet-300',
} as const

type Tone = keyof typeof toneClasses

function statusTone(status: string): Tone {
  const s = status.toLowerCase()

  if (
    ['active', 'published', 'verified', 'confirmed', 'operational', 'success', 'completed', 'live'].includes(s)
  ) return 'success'

  if (['draft', 'pending', 'invited', 'maintenance', 'scheduled', 'paused'].includes(s)) return 'warning'

  if (['suspended', 'cancelled', 'revoked', 'blocked', 'incident', 'archived', 'inactive'].includes(s)) return 'danger'

  if (['owner', 'admin', 'developer', 'super_admin'].includes(s)) return 'purple'

  if (['degraded', 'info'].includes(s)) return 'info'

  return 'neutral'
}

export function StatusBadge({
  status,
  tone,
  className,
}: {
  status: string
  tone?: Tone
  className?: string
}) {
  const resolvedTone = tone ?? statusTone(status)

  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-md border px-2 text-xs font-medium capitalize',
        toneClasses[resolvedTone],
        className
      )}
    >
      {status.replace(/_/g, ' ')}
    </span>
  )
}
