'use client'

import { cn } from '@/lib/utils'

interface TheSvgIconProps {
  label: string
  slug?: string | null
  className?: string
}

export function TheSvgIcon({ label, slug, className }: TheSvgIconProps) {
  return (
    <span
      className={cn(
        'grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-background/60',
        className,
      )}
      aria-hidden="true"
    >
      {slug ? (
        <img
          src={`https://thesvg.org/icons/${slug}/default.svg`}
          alt=""
          className="size-5"
          loading="lazy"
        />
      ) : (
        <span className="text-xs font-bold text-accent">{label.slice(0, 2).toUpperCase()}</span>
      )}
    </span>
  )
}
