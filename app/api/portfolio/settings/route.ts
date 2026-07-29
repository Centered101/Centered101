import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const DEFAULTS = {
  hero_image_url: '/porfilio/images/bg-avatar-hero.png',
  hero_image_x: 160,
  hero_image_y: -12,
  hero_image_width: 50,
  hero_image_max_width: 760,
  hero_image_opacity: 95,
}

const KEYS = Object.keys(DEFAULTS)

function readNumber(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export async function GET() {
  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json(DEFAULTS)

  const { data, error } = await supabase
    .from('system_settings')
    .select('key, value')
    .in('key', KEYS)

  if (error) return NextResponse.json(DEFAULTS)

  const settings = Object.fromEntries((data ?? []).map((row) => [row.key, row.value])) as Record<string, unknown>

  return NextResponse.json({
    hero_image_url: typeof settings.hero_image_url === 'string' && settings.hero_image_url.trim()
      ? settings.hero_image_url
      : DEFAULTS.hero_image_url,
    hero_image_x: readNumber(settings.hero_image_x, DEFAULTS.hero_image_x),
    hero_image_y: readNumber(settings.hero_image_y, DEFAULTS.hero_image_y),
    hero_image_width: readNumber(settings.hero_image_width, DEFAULTS.hero_image_width),
    hero_image_max_width: readNumber(settings.hero_image_max_width, DEFAULTS.hero_image_max_width),
    hero_image_opacity: readNumber(settings.hero_image_opacity, DEFAULTS.hero_image_opacity),
  })
}
