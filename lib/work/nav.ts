import {
  ClipboardList,
  CreditCard,
  FileText,
  FolderKanban,
  Globe2,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  MessageSquareWarning,
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
 * Per-project tabs in the client portal. Every one of these is gated by the
 * unlock system in Phase 12 — `canAccessProjectResource()` decides which are
 * reachable, so this array is presentation order only, never permission.
 */
export const portalProjectTabs = [
  { label: 'ภาพรวม', segment: '' },
  // "ไทม์ไลน์" is WORK (project execution); "ไมล์สโตน" below is the PAYMENT
  // schedule. Two tabs on purpose — they are different entities answering
  // different questions (docs/PROJECT_TIMELINE.md §1).
  { label: 'ไทม์ไลน์', segment: 'timeline' },
  { label: 'ราคา', segment: 'pricing' },
  { label: 'การชำระเงิน', segment: 'payments' },
  { label: 'ไมล์สโตนชำระเงิน', segment: 'milestones' },
  { label: 'ตัวอย่างงาน', segment: 'preview' },
  { label: 'เอกสาร', segment: 'documents' },
  { label: 'การเผยแพร่', segment: 'deployment' },
  { label: 'ซอร์สโค้ด', segment: 'source-code' },
  { label: 'การส่งมอบ', segment: 'delivery' },
  { label: 'การดูแลรักษา', segment: 'maintenance' },
  { label: 'คำขอเปลี่ยนแปลง', segment: 'change-requests' },
  { label: 'สมาชิก', segment: 'members' },
] as const

/**
 * Per-project tabs on the ADMIN side. Same idea as `portalProjectTabs`, a
 * different set of destinations: staff see the whole project (delivery,
 * publishing, the activity log, the report) where a client sees their slice
 * of it. `review` and the intake `wizard` are entered from elsewhere and are
 * deliberately absent — a tab strip is the routine map, not every route.
 */
export const adminProjectTabs = [
  { label: 'ภาพรวม', segment: '' },
  { label: 'เอกสารและแบรนด์', segment: 'documents' },
  { label: 'การเผยแพร่', segment: 'publishing' },
  { label: 'การส่งมอบ', segment: 'delivery' },
  { label: 'คำขอเปลี่ยนแปลง', segment: 'change-requests' },
  { label: 'การดูแลรักษา', segment: 'maintenance' },
  { label: 'สรุปโปรเจกต์', segment: 'report' },
  { label: 'กิจกรรม', segment: 'activity' },
] as const

/** Resolves the deepest matching nav item, so nested routes stay highlighted. */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === '/work/portal') return pathname === '/work/portal'
  return pathname === href || pathname.startsWith(href + '/')
}
