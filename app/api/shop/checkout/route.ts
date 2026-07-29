import { NextResponse } from 'next/server'
import { getShopStripe } from '@/lib/shop/stripe'
import { createShopAdminClient } from '@/lib/shop/supabase-server'

export const dynamic = 'force-dynamic'

type CheckoutItem = {
  name: string
  price: number
  quantity: number
  image?: string
  code?: string
}

type CheckoutBody = {
  items: CheckoutItem[]
  discount?: number
  couponCode?: string
  customer?: { name?: string; email?: string }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckoutBody
    const { items, discount = 0, couponCode, customer } = body

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    const stripe = getShopStripe()

    const origin =
      request.headers.get('origin') ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'http://localhost:3000'

    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
    const total = Math.max(0, subtotal - discount)

    // Record a pending order first (service-role bypasses RLS).
    const admin = createShopAdminClient()
    let orderId: string | null = null
    if (admin) {
      const { data, error } = await admin
        .from('shop_orders')
        .insert({
          customer_name: customer?.name || null,
          customer_email: customer?.email || null,
          total,
          currency: 'thb',
          status: 'pending',
          items,
        })
        .select('id')
        .single()
      if (error) {
        console.error('Failed to create shop order:', error.message)
      } else {
        orderId = data.id
      }
    } else {
      console.warn('Service-role client unavailable; skipping shop_orders insert')
    }

    // Flat-baht discount → ad-hoc Stripe coupon.
    let discounts: { coupon: string }[] | undefined
    if (discount > 0) {
      const coupon = await stripe.coupons.create({
        amount_off: Math.round(discount * 100),
        currency: 'thb',
        duration: 'once',
        name: couponCode || 'Discount',
      })
      discounts = [{ coupon: coupon.id }]
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: items.map((i) => ({
        price_data: {
          currency: 'thb',
          product_data: { name: i.name, ...(i.image ? { images: [i.image] } : {}) },
          unit_amount: Math.round(i.price * 100),
        },
        quantity: i.quantity,
      })),
      discounts,
      customer_email: customer?.email || undefined,
      success_url: `${origin}/shop/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/shop/checkout/cancelled`,
      metadata: {
        kind: 'shop',
        ...(orderId ? { shop_order_id: orderId } : {}),
        ...(couponCode ? { coupon_code: couponCode } : {}),
      },
    })

    // Link the Stripe session back to the order.
    if (admin && orderId) {
      await admin.from('shop_orders').update({ stripe_session_id: session.id }).eq('id', orderId)
    }

    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (err) {
    const msg = (err as Error).message
    console.error('Shop checkout error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
