import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SocialLink, SocialLinkIcon } from '@/lib/social-links/types'

type SocialLinkRow = {
  id?: string | number
  name?: string | null
  label?: string | null
  href?: string | null
  url?: string | null
  icon?: SocialLinkIcon | string | null
  sort_order?: number | null
  is_active?: boolean | null
}

const VALID_ICONS = new Set([
  'github',
  'twitter',
  'instagram',
  'website',
  'email',
  'orcid',
  'line',
  'globe',
])

function cleanEnv(value: string | undefined) {
  return value?.trim().replace(/^['"]|['"]$/g, '')
}

function normalizeIcon(icon: string | null | undefined): SocialLinkIcon {
  if (icon && VALID_ICONS.has(icon)) {
    return icon as SocialLinkIcon
  }

  return 'globe'
}

function normalizeRow(row: SocialLinkRow, index: number): SocialLink | null {
  const href = row.href || row.url

  if (!href || row.is_active === false) {
    return null
  }

  return {
    id: String(row.id || `social-${index}`),
    name: row.name || 'Social',
    label: row.label || row.name || null,
    href,
    icon: normalizeIcon(row.icon),
    sortOrder: row.sort_order ?? index,
  }
}

function fallbackLinks() {
  const githubUsername = cleanEnv(process.env.GITHUB_USERNAME) || 'Centered101'
  const siteUrl = cleanEnv(process.env.NEXT_PUBLIC_SITE_URL)
  const email = cleanEnv(process.env.CONTACT_EMAIL)
  const instagram = cleanEnv(process.env.INSTAGRAM_USERNAME)
  const twitter = cleanEnv(process.env.TWITTER_USERNAME)
  const orcidId = cleanEnv(process.env.ORCID_ID)
  const lineUrl = cleanEnv(process.env.LINE_PROFILE_URL)

  const links: SocialLink[] = [
    {
      id: 'github',
      name: 'GitHub',
      label: `@${githubUsername}`,
      href: `https://github.com/${githubUsername}`,
      icon: 'github',
      sortOrder: 10,
    },
  ]

  if (instagram) {
    links.push({
      id: 'instagram',
      name: 'Instagram',
      label: `@${instagram}`,
      href: `https://instagram.com/${instagram}`,
      icon: 'instagram',
      sortOrder: 20,
    })
  }

  if (twitter) {
    links.push({
      id: 'twitter',
      name: 'Twitter',
      label: `@${twitter}`,
      href: `https://twitter.com/${twitter}`,
      icon: 'twitter',
      sortOrder: 30,
    })
  }

  if (siteUrl) {
    links.push({
      id: 'website',
      name: 'Website',
      label: siteUrl.replace(/^https?:\/\//, ''),
      href: siteUrl,
      icon: 'website',
      sortOrder: 40,
    })
  }

  if (email) {
    links.push({
      id: 'email',
      name: 'Email',
      label: email,
      href: `mailto:${email}`,
      icon: 'email',
      sortOrder: 50,
    })
  }

  if (orcidId) {
    links.push({
      id: 'orcid',
      name: 'ORCID iD',
      label: orcidId,
      href: `https://orcid.org/${orcidId.replace(/^https?:\/\/(www\.)?orcid\.org\//i, '')}`,
      icon: 'orcid',
      sortOrder: 60,
    })
  }

  if (lineUrl) {
    links.push({
      id: 'line',
      name: 'LINE',
      label: 'LINE',
      href: lineUrl,
      icon: 'line',
      sortOrder: 70,
    })
  }

  return links
}

export async function GET() {
  try {
    const supabase = createAdminClient() || await createClient()
    const { data, error } = await supabase
      .from('social_links')
      .select('id,name,label,href,icon,sort_order,is_active')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.warn('Social links read failed:', error)
      return NextResponse.json({ configured: false, links: fallbackLinks() })
    }

    const links = (data || [])
      .map(normalizeRow)
      .filter((link): link is SocialLink => Boolean(link))

    return NextResponse.json({
      configured: true,
      links: links.length > 0 ? links : fallbackLinks(),
    })
  } catch (error) {
    console.warn('Social links API unavailable:', error)
    return NextResponse.json({ configured: false, links: fallbackLinks() })
  }
}
