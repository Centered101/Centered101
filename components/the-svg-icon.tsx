'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export type IconVariant = 'default' | 'mono' | 'light' | 'dark' | 'wordmark'

export const ICON_VARIANTS: IconVariant[] = ['default', 'mono', 'light', 'dark', 'wordmark']

interface TheSvgIconProps {
  label: string
  slug?: string | null
  variant?: IconVariant
  className?: string
}

// Some stored slugs don't match thesvg.org's naming, which makes the icon 404
// and render as a broken image. Map the common forms to the real slug.
const SLUG_ALIASES: Record<string, string> = {
  nextjs: 'nextdotjs',
  'next.js': 'nextdotjs',
  next: 'nextdotjs',
  nodejs: 'nodedotjs',
  'node.js': 'nodedotjs',
  node: 'nodedotjs',
  tailwindcss: 'tailwind-css',
  tailwind: 'tailwind-css',
  kalilinux: 'kali-linux',
  kali: 'kali-linux',
  vscode: 'visual-studio-code',
  'vs-code': 'visual-studio-code',
  visualstudiocode: 'visual-studio-code',
  googlecloud: 'google-cloud',
  'google cloud': 'google-cloud',
  'c++': 'cplusplus',
  cpp: 'cplusplus',
}

function resolveSlug(slug: string) {
  const key = slug.trim().toLowerCase()
  return SLUG_ALIASES[key] ?? key
}

/**
 * The `icon` field can carry a variant as a suffix, e.g. "jquery:mono".
 * Returns the bare slug and the chosen variant (defaults to "default").
 */
export function parseIconValue(value?: string | null): { slug: string | null; variant: IconVariant } {
  if (!value) return { slug: null, variant: 'default' }
  const [rawSlug, rawVariant] = value.split(':')
  const slug = rawSlug?.trim() || null
  const variant = rawVariant?.trim().toLowerCase() as IconVariant
  return { slug, variant: ICON_VARIANTS.includes(variant) ? variant : 'default' }
}

/** Serialize a slug + variant back into the stored `icon` value. */
export function buildIconValue(slug: string, variant: IconVariant): string {
  const clean = slug.trim()
  if (!clean) return ''
  return variant === 'default' ? clean : `${clean}:${variant}`
}

/** Resolve the thesvg.org URL for a slug + variant (applies slug aliases). */
export function iconUrl(slug: string, variant: IconVariant = 'default'): string {
  return `https://thesvg.org/icons/${resolveSlug(slug)}/${variant}.svg`
}

export function TheSvgIcon({ label, slug, variant, className }: TheSvgIconProps) {
  const parsed = parseIconValue(slug)
  const resolvedSlug = parsed.slug
  const wantVariant = variant ?? parsed.variant

  // 0 = requested variant · 1 = fall back to "default" · 2 = give up → initials
  const [stage, setStage] = useState(0)
  useEffect(() => {
    setStage(0)
  }, [resolvedSlug, wantVariant])

  const activeVariant: IconVariant = stage === 0 ? wantVariant : 'default'
  const showFallback = !resolvedSlug || stage >= 2

  return (
    <span
      className={cn(
        'grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-background/60',
        className,
      )}
      aria-hidden="true"
    >
      {showFallback ? (
        <span className="text-xs font-bold text-accent">{label.slice(0, 2).toUpperCase()}</span>
      ) : (
        <img
          key={activeVariant}
          src={iconUrl(resolvedSlug, activeVariant)}
          alt=""
          draggable={false}
          onContextMenu={(event) => event.preventDefault()}
          // A missing variant (e.g. Notion has no light/dark) drops to "default",
          // then to the initials badge — never a broken image.
          onError={() => setStage((s) => (s === 0 && wantVariant !== 'default' ? 1 : 2))}
          className="size-5 select-none"
          loading="lazy"
        />
      )}
    </span>
  )
}
