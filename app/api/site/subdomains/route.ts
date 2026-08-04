import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ecosystemSubdomains } from '@/lib/ecosystem'

type PublicSubdomain = {
  id: string
  name: string
  type: string
  status: string
  description: string | null
  provider: string | null
}

const PRIVATE_DOMAINS = new Set(['admin.centered101.com'])

function isPublicSubdomain(item: Pick<PublicSubdomain, 'name'>) {
  return !PRIVATE_DOMAINS.has(item.name)
}

const FALLBACK_SUBDOMAINS: PublicSubdomain[] = [
  {
    id: 'apex',
    name: 'centered101.com',
    type: 'apex',
    status: 'active',
    description: 'Main hub for the Centered101 ecosystem',
    provider: 'Vercel',
  },
  ...ecosystemSubdomains.map((name) => ({
    id: name,
    name,
    type: 'subdomain',
    status: 'active',
    description: null,
    provider: 'Vercel',
  })),
].filter(isPublicSubdomain)

export async function GET() {
  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ configured: false, subdomains: FALLBACK_SUBDOMAINS })

  const { data, error } = await supabase
    .from('subdomains')
    .select('id, name, type, status, description, provider')
    .in('status', ['active', 'maintenance', 'pending'])
    .order('type', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json({ configured: false, subdomains: FALLBACK_SUBDOMAINS })
    }
    return NextResponse.json({ configured: false, subdomains: FALLBACK_SUBDOMAINS })
  }

  return NextResponse.json({
    configured: true,
    subdomains: (data ?? [])
      .map((item) => ({
        id: String(item.id),
        name: String(item.name),
        type: String(item.type ?? 'subdomain'),
        status: String(item.status ?? 'active'),
        description: typeof item.description === 'string' ? item.description : null,
        provider: typeof item.provider === 'string' ? item.provider : null,
      }))
      .filter(isPublicSubdomain),
  })
}
