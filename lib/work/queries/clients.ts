import 'server-only'

import { createClient } from '@/lib/work/supabase/server'
import { tallyBy, unwrapOr } from './internal'

/**
 * Client company records.
 *
 * A `client` is a COMPANY the agency works for, not a person who signs in —
 * that distinction runs through the whole schema (migration 0004). Nothing
 * here grants portal access; that comes from project_members.
 */

export type ClientListItem = {
  id: string
  name: string
  clientCode: string | null
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
  projectCount: number
  createdAt: string
}

type ClientRow = {
  id: string
  name: string
  client_code: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  created_at: string
}

export async function getClients(): Promise<ClientListItem[]> {
  const supabase = await createClient()

  const result = await supabase
    .from('clients')
    .select('id, name, client_code, contact_name, contact_email, contact_phone, created_at')
    .is('archived_at', null)
    .order('created_at', { ascending: false })

  const rows = unwrapOr<ClientRow[]>(result, 'ลูกค้า', [])
  if (rows.length === 0) return []

  // Project counts in one extra read rather than N+1. `head: true` with a
  // count would need one request per client; fetching the client_id column for
  // visible projects and tallying is a single round trip.
  const projectsResult = await supabase
    .from('projects')
    .select('client_id')
    .is('archived_at', null)

  const projects = unwrapOr<{ client_id: string }[]>(projectsResult, 'โปรเจกต์', [])
  const counts = tallyBy(projects, (project) => project.client_id)

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    clientCode: row.client_code,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    projectCount: counts.get(row.id) ?? 0,
    createdAt: row.created_at,
  }))
}

/** Minimal list for the project form's client picker. */
export async function getClientOptions(): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient()

  const result = await supabase
    .from('clients')
    .select('id, name')
    .is('archived_at', null)
    .order('name', { ascending: true })

  return unwrapOr<{ id: string; name: string }[]>(result, 'ลูกค้า', [])
}

// A getClientById() lived here with no callers, and it returned
// `projectCount: 0` unconditionally — a value that would have been wrong the
// moment anything rendered it. Deleted rather than left as a trap.
