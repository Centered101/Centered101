import 'server-only'

import { getWorkStripe } from '@/lib/work/stripe'
import type { CheckoutMethod, CheckoutRequest, CheckoutResult, PaymentService } from './service'

/**
 * Stripe Checkout.
 *
 * Checkout Sessions rather than a self-hosted Payment Element: card data never
 * touches this application, which keeps the workspace out of PCI scope for the
 * sake of a redirect.
 *
 * PromptPay is asynchronous — the session completes while the payment is still
 * `unpaid`, and confirmation arrives minutes later as
 * `checkout.session.async_payment_succeeded`. The webhook handles both shapes;
 * nothing here waits for or infers a result.
 */

const METHOD_TYPES: Record<CheckoutMethod, 'card' | 'promptpay'> = {
  CARD: 'card',
  PROMPTPAY: 'promptpay',
}

/** Long enough for a bank app, short enough that a stale session expires. */
const SESSION_TTL_SECONDS = 30 * 60

export class StripePaymentService implements PaymentService {
  readonly provider = 'stripe'

  async createCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
    try {
      const stripe = getWorkStripe()

      const metadata = {
        paymentId: request.paymentId,
        projectId: request.projectId,
        milestoneId: request.milestoneId ?? '',
      }

      const session = await stripe.checkout.sessions.create(
        {
          mode: 'payment',
          payment_method_types: [METHOD_TYPES[request.method]],
          line_items: [
            {
              quantity: 1,
              price_data: {
                currency: request.currency.toLowerCase(),
                // Stripe's unit_amount is minor units, and so is our column —
                // no conversion, which is the point of storing integers.
                unit_amount: request.amount,
                product_data: { name: request.description },
              },
            },
          ],
          // Both are set: `client_reference_id` survives on objects that carry
          // no metadata, and metadata is what the webhook reads first.
          client_reference_id: request.paymentId,
          metadata,
          payment_intent_data: { metadata },
          customer_email: request.customerEmail,
          expires_at: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
          success_url: request.successUrl,
          cancel_url: request.cancelUrl,
        },
        // Our payment row id is the natural idempotency key: a double-clicked
        // pay button reuses the session it already created instead of opening
        // a second one against the same milestone.
        { idempotencyKey: `work-checkout-${request.paymentId}` },
      )

      if (!session.url) {
        return {
          ok: false,
          reason: 'provider_error',
          message: 'ผู้ให้บริการไม่ได้ส่งลิงก์ชำระเงินกลับมา กรุณาลองใหม่อีกครั้ง',
        }
      }

      return { ok: true, provider: this.provider, checkoutId: session.id, url: session.url }
    } catch (error) {
      // The provider's message can name an account or a key; it belongs in the
      // server log, not in a client's browser.
      console.error('[payments] stripe checkout failed', error)
      return {
        ok: false,
        reason: 'provider_error',
        message: 'ไม่สามารถเริ่มการชำระเงินได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง',
      }
    }
  }
}
