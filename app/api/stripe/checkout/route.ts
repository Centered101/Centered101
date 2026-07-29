import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'

type CheckoutBody = {
  priceId: string
  mode?: 'payment' | 'subscription'
  successUrl?: string
  cancelUrl?: string
  metadata?: Record<string, string>
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as CheckoutBody
    const { priceId, mode = 'payment', successUrl, cancelUrl, metadata } = body

    if (!priceId) {
      return NextResponse.json({ error: 'priceId is required' }, { status: 400 })
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const stripe = getStripe()

    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || `${siteUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${siteUrl}/payment/cancelled`,
      metadata,
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (err) {
    const msg = (err as Error).message
    console.error('Stripe checkout error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
