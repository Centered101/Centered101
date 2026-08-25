import { redirect } from 'next/navigation'

/**
 * Root entry point.
 *
 * The prototype rendered the entire application here — both portals, all
 * state, all data — from a single client component. That content now lives in
 * `(admin)` and `(portal)`, so this only routes.
 *
 * From Phase 3 the destination depends on the session: admins to the admin
 * dashboard, clients to the portal, everyone else to /login. Until auth
 * exists there is nothing to branch on.
 */
export default function RootPage() {
  redirect('/work/admin/dashboard')
}
