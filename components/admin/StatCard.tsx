import { cn } from '@/lib/utils'
import { TrendingDown, TrendingUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Trend = 'up' | 'down' | 'neutral' | 'warning'

type Props = {
  label: string
  value: string | number
  change?: string
  trend?: Trend
  description?: string
  icon: LucideIcon
  className?: string
}

const trendColor: Record<Trend, string> = {
  up: 'text-[#22C55E]',
  down: 'text-[#EF4444]',
  neutral: 'text-[#A1A1AA]',
  warning: 'text-[#F59E0B]',
}

export function StatCard({ label, value, change, trend = 'neutral', description, icon: Icon, className }: Props) {
  return (
    <div
      className={cn(
        'rounded-xl border border-[#27272A] bg-[#18181B] p-5 transition-colors hover:border-[#3f3f46]',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-[#A1A1AA]">{label}</p>
        <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-[#27272A] bg-[#09090B]">
          <Icon className="size-3.5 text-[#409EFE]" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-[#FAFAFA]">{value}</p>
      {change && (
        <div className={cn('mt-1.5 flex items-center gap-1 text-xs font-medium', trendColor[trend])}>
          {trend === 'up' && <TrendingUp className="size-3" />}
          {trend === 'down' && <TrendingDown className="size-3" />}
          {change}
        </div>
      )}
      {description && <p className="mt-0.5 text-[11px] text-[#52525b]">{description}</p>}
    </div>
  )
}
