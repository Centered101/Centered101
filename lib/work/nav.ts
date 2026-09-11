import {
  Calculator,
  ClipboardList,
  Code2,
  CreditCard,
  Eye,
  FileText,
  FolderKanban,
  Globe2,
  History,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  Mail,
  MessageSquareWarning,
  PackageCheck,
  Receipt,
  Settings,
  UserRound,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
}

/**
 * Sidebar navigation.
 *
 * Labels come straight from the v0 prototype and stay in the same order, so
 * the sidebar renders exactly as before. The only change is that each entry
 * now carries an `href` — the prototype tracked the active item in local state
 * and never actually navigated.
 *
 * `change-requests` is the one added entry: the brief requires the route, and
 * the prototype had no way to reach it.
 */
export const adminNav: NavItem[] = [
  { label: 'ภาพรวม', href: '/work/admin/dashboard', icon: LayoutDashboard },
  { label: 'คำขอโปรเจกต์', href: '/work/admin/inbox', icon: Mail },
  { label: 'ลูกค้า', href: '/work/admin/clients', icon: Users },
  { label: 'โปรเจกต์', href: '/work/admin/projects', icon: FolderKanban },
  { label: 'การชำระเงิน', href: '/work/admin/payments', icon: CreditCard },
  { label: 'ใบแจ้งหนี้', href: '/work/admin/invoices', icon: Receipt },
  { label: 'ไมล์สโตน', href: '/work/admin/milestones', icon: ClipboardList },
  { label: 'การเผยแพร่', href: '/work/admin/deployments', icon: Globe2 },
  { label: 'การดูแลรักษา', href: '/work/admin/maintenance', icon: LifeBuoy },
  {
    label: 'คำขอเปลี่ยนแปลง',
    href: '/work/admin/change-requests',
    icon: MessageSquareWarning,
  },
  { label: 'ไฟล์', href: '/work/admin/documents', icon: FileText },
  { label: 'ตั้งค่า', href: '/work/admin/settings', icon: Settings },
]

/**
 * Client portal navigation.
 *
 * Deliberately short. Payments, documents, deployments and maintenance are
 * PER PROJECT for a client — they are tabs inside a project, not top-level
 * destinations, because "your invoices" only means something once you have
 * chosen which project's invoices. The admin side is the reverse: it needs the
 * cross-project view, and has it.
 */
/**
 * Where the sidebar's identity card leads, per portal.
 *
 * Declared here with the rest of the navigation rather than in the Sidebar,
 * for the reason the hardcoded ตั้งค่า link was removed from it: a destination
 * written into shared chrome points at one portal from both, and the wrong
 * half of the users get bounced by a guard. The admin side has no /profile
 * route — ตั้งค่า is where an admin's own account lives.
 */
export const accountHref: Record<'admin' | 'portal', string> = {
  admin: '/work/admin/settings',
  portal: '/work/portal/profile',
}

/** What to call `accountHref`'s destination inside the account menu (AccountMenu) — "การตั้งค่า" for admin, "โปรไฟล์" for a client, matching the page each actually lands on. */
export const accountLabel: Record<'admin' | 'portal', string> = {
  admin: 'การตั้งค่า',
  portal: 'โปรไฟล์',
}

export const portalNav: NavItem[] = [
  { label: 'ภาพรวม', href: '/work/portal', icon: LayoutDashboard },
  { label: 'โปรเจกต์', href: '/work/portal/projects', icon: FolderKanban },
  { label: 'คำเชิญ', href: '/work/portal/invitations', icon: Mail },
  { label: 'โปรไฟล์', href: '/work/portal/profile', icon: UserRound },
]

/**
 * One entry in a project's section navigation.
 *
 * `segment` is appended to `/work/<portal>/projects/<id>` — `''` is the
 * overview itself. `icon` is shown beside the label now that these render in
 * the sidebar (ProjectNav) rather than as a bare text strip.
 */
export type ProjectNavItem = {
  label: string
  segment: string
  icon: LucideIcon
}

/**
 * A project's sections in the client portal. Every one of these is gated by
 * the unlock system in Phase 12 — `canAccessProjectResource()` decides which
 * are reachable, so this array is presentation order only, never permission.
 */
export const portalProjectTabs: readonly ProjectNavItem[] = [
  { label: 'ภาพรวม', segment: '', icon: LayoutDashboard },
  // "ไทม์ไลน์" is WORK (project execution); "ไมล์สโตน" below is the PAYMENT
  // schedule. Two tabs on purpose — they are different entities answering
  // different questions (docs/PROJECT_TIMELINE.md §1).
  { label: 'ไทม์ไลน์', segment: 'timeline', icon: ListChecks },
  { label: 'ราคา', segment: 'pricing', icon: Calculator },
  { label: 'การชำระเงิน', segment: 'payments', icon: CreditCard },
  { label: 'ไมล์สโตนชำระเงิน', segment: 'milestones', icon: ClipboardList },
  { label: 'ตัวอย่างงาน', segment: 'preview', icon: Eye },
  { label: 'เอกสาร', segment: 'documents', icon: FileText },
  { label: 'การเผยแพร่', segment: 'deployment', icon: Globe2 },
  { label: 'ซอร์สโค้ด', segment: 'source-code', icon: Code2 },
  { label: 'การส่งมอบ', segment: 'delivery', icon: PackageCheck },
  { label: 'การดูแลรักษา', segment: 'maintenance', icon: LifeBuoy },
  { label: 'คำขอเปลี่ยนแปลง', segment: 'change-requests', icon: MessageSquareWarning },
  { label: 'สมาชิก', segment: 'members', icon: Users },
]

/**
 * A project's sections on the ADMIN side. Same idea as `portalProjectTabs`, a
 * different set of destinations: staff see the whole project (delivery,
 * publishing, the activity log, the report) where a client sees their slice
 * of it. `review` and the intake `wizard` are entered from elsewhere and are
 * deliberately absent — this is the routine map, not every route.
 */
export const adminProjectTabs: readonly ProjectNavItem[] = [
  { label: 'ภาพรวม', segment: '', icon: LayoutDashboard },
  { label: 'เอกสารและแบรนด์', segment: 'documents', icon: FileText },
  { label: 'การเผยแพร่', segment: 'publishing', icon: Globe2 },
  { label: 'การส่งมอบ', segment: 'delivery', icon: PackageCheck },
  { label: 'คำขอเปลี่ยนแปลง', segment: 'change-requests', icon: MessageSquareWarning },
  { label: 'การดูแลรักษา', segment: 'maintenance', icon: LifeBuoy },
  { label: 'สรุปโปรเจกต์', segment: 'report', icon: ClipboardList },
  { label: 'กิจกรรม', segment: 'activity', icon: History },
]

/**
 * `usePathname()` is not stable across this app's two URL shapes. Behind the
 * subdomain proxy (proxy.ts) the browser shows `/portal/…` — the `/work`
 * prefix stripped by a 308 — but a client-side navigation to a `/work/…` href
 * leaves the prefix on until the next hard load. Route matching in the client
 * chrome (nav highlight, breadcrumb, the project section nav) has to treat
 * both as the same path, so it all goes through this first.
 */
export function workPath(pathname: string): string {
  return pathname.replace(/^\/work(?=\/|$)/, '') || '/'
}

/**
 * Paths under /work whose prefix is REAL and must survive stripping.
 *
 * Shared with proxy.ts, which owns the authoritative reasoning: `/work/api/*`
 * is where the workspace's own routes live (a bare `/api/*` on the subdomain
 * deliberately reaches the MAIN site's API instead), and anything with a file
 * extension is a public asset served at that literal path (`/work/favicon.ico`).
 */
export function ownsWorkPrefix(pathname: string): boolean {
  return pathname.startsWith('/work/api/') || /\.[a-z0-9]+$/i.test(pathname)
}

/**
 * `href` as it should appear on THIS host: unchanged on a host where /work is
 * the real path (apex, preview deployments), prefix dropped on work.<root>
 * where it's invisible (see proxy.ts). `stripPrefix` comes from
 * `isWorkSubdomain()` (lib/work/auth/callback-url.ts) in a Server Component,
 * or `useWorkHref()` (work-link-context.tsx) in a Client Component — nothing
 * here can determine the host itself, only apply the decision once it's known.
 */
export function workHref(href: string, stripPrefix: boolean): string {
  return stripPrefix && !ownsWorkPrefix(href) ? workPath(href) : href
}

/** Resolves the deepest matching nav item, so nested routes stay highlighted. */
export function isNavItemActive(pathname: string, href: string): boolean {
  const path = workPath(pathname)
  const target = workPath(href)
  if (target === '/portal') return path === '/portal'
  return path === target || path.startsWith(target + '/')
}
