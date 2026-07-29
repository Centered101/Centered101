import Stripe from 'stripe'

// The shop uses its OWN Stripe account/keys, separate from Centered101.
// Falls back to the shared keys only if the shop-specific ones are unset,
// so existing setups keep working until SHOP_STRIPE_* are configured.
let _shopStripe: Stripe | null = null

export function getShopStripe(): Stripe {
  if (!_shopStripe) {
    const key = process.env.SHOP_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY
    if (!key) {
      throw new Error('SHOP_STRIPE_SECRET_KEY (or STRIPE_SECRET_KEY) is not configured')
    }
    _shopStripe = new Stripe(key, { apiVersion: '2026-05-27.dahlia' as const })
  }
  return _shopStripe
}

export function getShopWebhookSecret(): string | undefined {
  return process.env.SHOP_STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET
}
