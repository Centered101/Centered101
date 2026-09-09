import { PageHeading } from '@/components/work/data/panel'
import { PricingPanel } from '@/components/work/domain/pricing-panel'
import { requireProjectAccess } from '@/lib/work/auth/permissions'
import { getPricingItems, getPricingTotals } from '@/lib/work/queries/pricing'

export const metadata = { title: 'ราคา' }

/**
 * Pricing tab — a dedicated route for what the overview page already shows
 * inline (docs/PROJECT_WORKSPACE_IMPLEMENTATION.md Phase 1). Same panel,
 * same data, same guard (`canManagePricing` — true for staff finance or a
 * self-serve project's OWNER, false for every other client-side role); this
 * page adds nothing new, it only gives Pricing its own place in the nav
 * instead of living only on the overview.
 */
export default async function PortalPricingPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const access = await requireProjectAccess(id)

  const [items, totals] = await Promise.all([getPricingItems(id), getPricingTotals(id)])

  return (
    <>
      <PageHeading eyebrow="โปรเจกต์" title="ราคา" description="รายการราคาและยอดรวมของโปรเจกต์" />
      <PricingPanel projectId={id} items={items} totals={totals} canManageFinance={access.canManagePricing} />
    </>
  )
}
