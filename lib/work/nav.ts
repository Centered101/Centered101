import {
  ClipboardList,
  CreditCard,
  FileText,
  FolderKanban,
  Globe2,
  LayoutDashboard,
  LifeBuoy,
  MessageSquareWarning,
  Receipt,
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
]

export const portalNav: NavItem[] = [
  { label: 'ภาพรวม', href: '/work/portal', icon: LayoutDashboard },
  { label: 'โปรเจกต์', href: '/work/portal/projects', icon: FolderKanban },
]

/**
 * Per-project tabs in the client portal. Every one of these is gated by the
 * unlock system in Phase 12 — `canAccessProjectResource()` decides which are
 * reachable, so this array is presentation order only, never permission.
 */
export const portalProjectTabs = [
  { label: 'ภาพรวม', segment: '' },
  { label: 'ตัวอย่างงาน', segment: 'preview' },
  { label: 'การชำระเงิน', segment: 'payments' },
  { label: 'เอกสาร', segment: 'documents' },
  { label: 'การเผยแพร่', segment: 'deployment' },
  { label: 'ซอร์สโค้ด', segment: 'source-code' },
  { label: 'การดูแลรักษา', segment: 'maintenance' },
  { label: 'คำขอเปลี่ยนแปลง', segment: 'change-requests' },
] as const

/** Resolves the deepest matching nav item, so nested routes stay highlighted. */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === '/work/portal') return pathname === '/work/portal'
  return pathname === href || pathname.startsWith(href + '/')
}
