import { NextResponse } from 'next/server'
import { getShopStripe, getShopWebhookSecret } from '@/lib/shop/stripe'
import { createShopAdminClient } from '@/lib/shop/supabase-server'
import { pushLineMessage, buildShopOrderFlexMessage } from '@/lib/line/messaging'

export const dynamic = 'force-dynamic'

// Dedicated webhook for the shop's own Stripe account.
// Configure this endpoint in the shop's Stripe dashboard and set
// SHOP_STRIPE_WEBHOOK_SECRET to its signing secret.
export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')
  const webhookSecret = getShopWebhookSecret()

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 })
  }

  let event
  try {
    const stripe = getShopStripe()
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    const msg = (err as Error).message
    console.error('Shop webhook signature verification failed:', msg)
    return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      const admin = createShopAdminClient()
      if (admin) {
        const orderId = session.metadata?.shop_order_id
        const col = orderId ? 'id' : 'stripe_session_id'
        const val = orderId || session.id

        const { error } = await admin.from('shop_orders').update({ status: 'paid' }).eq(col, val)
        if (error) console.error('Failed to mark shop order paid:', error.message)

        // Rich giga Flex notification to LINE (non-blocking).
        try {
          const { data: order } = await admin.from('shop_orders').select('*').eq(col, val).single()
          if (order) {
            await pushLineMessage(buildShopOrderFlexMessage({
              id: order.id,
              customerName: order.customer_name,
              customerEmail: order.customer_email,
              total: Number(order.total),
              currency: order.currency,
              items: order.items,
            }))
          }
        } catch (notifyError) {
          console.warn('LINE order notification skipped:', notifyError)
        }
      }
      break
    }
    case 'checkout.session.expired': {
      const session = event.data.object
      const admin = createShopAdminClient()
      if (admin) {
        const { error } = await admin
          .from('shop_orders')
          .update({ status: 'cancelled' })
          .eq('stripe_session_id', session.id)
        if (error) console.error('Failed to cancel shop order:', error.message)
      }
      break
    }
    default:
      console.log(`Unhandled shop event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}
