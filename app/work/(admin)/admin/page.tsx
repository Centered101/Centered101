import { redirect } from 'next/navigation'

/**
 * /work/admin has no content of its own — the dashboard is the admin home.
 *
 * It exists so the bare route resolves instead of 404-ing, since people type
 * it and link to it. The (admin) layout has already run by the time this
 * redirects, so an unauthorized visitor never reaches the dashboard URL.
 */
export default function AdminIndexPage() {
  redirect('/work/admin/dashboard')
}
