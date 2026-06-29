import { NextResponse } from 'next/server'
import { requireAnyAdminPermission } from '@/lib/admin-auth'
import { getStripe } from '@/lib/stripe'

export async function GET(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['manage_settings', 'view_logs'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const stripe = getStripe()

    const [balance, charges, products, subscriptions] = await Promise.allSettled([
      stripe.balance.retrieve(),
      stripe.charges.list({ limit: 20, expand: ['data.payment_intent'] }),
      stripe.products.list({ limit: 20, active: true, expand: ['data.default_price'] }),
      stripe.subscriptions.list({ limit: 10, status: 'all' }),
    ])

    const balanceData = balance.status === 'fulfilled' ? balance.value : null
    const chargesData = charges.status === 'fulfilled' ? charges.value.data : []
    const productsData = products.status === 'fulfilled' ? products.value.data : []
    const subsData = subscriptions.status === 'fulfilled' ? subscriptions.value.data : []

    const available = balanceData?.available.reduce((s, b) => s + b.amount, 0) ?? 0
    const pending = balanceData?.pending.reduce((s, b) => s + b.amount, 0) ?? 0

    const now = Math.floor(Date.now() / 1000)
    const monthStart = Math.floor(new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime() / 1000)
    const monthlyCharges = chargesData.filter((c) => c.created >= monthStart && c.paid)
    const monthlyRevenue = monthlyCharges.reduce((s, c) => s + (c.amount_captured || 0), 0)

    return NextResponse.json({
      balance: {
        available: available / 100,
        pending: pending / 100,
        currency: balanceData?.available[0]?.currency ?? 'thb',
      },
      revenue: {
        thisMonth: monthlyRevenue / 100,
        transactionsThisMonth: monthlyCharges.length,
      },
      recentCharges: chargesData.slice(0, 10).map((c) => ({
        id: c.id,
        amount: c.amount / 100,
        currency: c.currency,
        status: c.status,
        description: c.description,
        email: c.billing_details?.email,
        created: c.created,
        paid: c.paid,
        refunded: c.refunded,
      })),
      products: productsData.map((p) => {
        const price = p.default_price as { unit_amount?: number | null; currency?: string; recurring?: { interval?: string } | null } | null
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          active: p.active,
          price: price?.unit_amount ? price.unit_amount / 100 : null,
          currency: price?.currency,
          interval: price?.recurring?.interval ?? null,
          priceId: (p.default_price as { id?: string } | null)?.id ?? null,
        }
      }),
      subscriptions: {
        active: subsData.filter((s) => s.status === 'active').length,
        trialing: subsData.filter((s) => s.status === 'trialing').length,
        total: subsData.length,
      },
    })
  } catch (err) {
    const msg = (err as Error).message
    return NextResponse.json({ error: msg }, { status: 503 })
  }
}
