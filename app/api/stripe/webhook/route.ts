import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 })
  }

  let event
  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    const msg = (err as Error).message
    console.error('Webhook signature verification failed:', msg)
    return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      console.log('Payment succeeded:', session.id, 'amount:', session.amount_total)
      // Shop orders are handled by the shop's own webhook (/api/shop/webhook).
      break
    }
    case 'payment_intent.succeeded': {
      const intent = event.data.object
      console.log('PaymentIntent succeeded:', intent.id)
      break
    }
    case 'payment_intent.payment_failed': {
      const intent = event.data.object
      console.error('PaymentIntent failed:', intent.id, intent.last_payment_error?.message)
      break
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object
      console.log(`Subscription ${event.type}:`, sub.id, sub.status)
      break
    }
    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}
