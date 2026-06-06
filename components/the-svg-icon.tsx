'use client'

import { cn } from '@/lib/utils'

interface TheSvgIconProps {
  label: string
  slug?: string | null
  className?: string
}

export function TheSvgIcon({ label, slug, className }: TheSvgIconProps) {
  const normalizedSlug = slug?.toLowerCase()

  return (
    <span
      className={cn(
        'grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-background/60',
        className,
      )}
      aria-hidden="true"
    >
      {normalizedSlug === 'vercel' ? (
        <svg viewBox="0 0 24 24" className="size-5 fill-foreground" role="img">
          <path d="M12 2 24 22H0L12 2Z" />
        </svg>
      ) : slug ? (
        <img
          src={`https://thesvg.org/icons/${slug}/default.svg`}
          alt=""
          draggable={false}
          onContextMenu={(event) => event.preventDefault()}
          className="size-5 select-none"
          loading="lazy"
        />
      ) : (
        <span className="text-xs font-bold text-accent">{label.slice(0, 2).toUpperCase()}</span>
      )}
    </span>
  )
}
