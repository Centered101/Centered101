import { redirect } from 'next/navigation'

import { resolveLandingPath } from '@/lib/work/auth/permissions'

/**
 * Root entry point.
 *
 * Routes by ROLE, read from the database. Agency staff land on the admin
 * dashboard, clients on their portal, signed-out visitors on /login. Nothing
 * here reads a preference, a cookie or a stored "last portal" — where a person
 * belongs is a fact about their membership rows, and only those decide it.
 */
export default async function RootPage() {
  redirect(await resolveLandingPath())
}
