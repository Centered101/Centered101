import 'server-only'

import type { CheckoutRequest, CheckoutResult, PaymentService } from './service'

/**
 * The adapter used when no provider is configured.
 *
 * It REFUSES rather than simulates. A mock that returned a fake success URL
 * would reintroduce the exact defect this phase exists to remove (audit D8):
 * a client seeing "ชำระเงินสำเร็จ" while no money moved and no webhook ever
 * fires, leaving a milestone that looks paid to them and unpaid to us.
 *
 * Refusing keeps the environments honestly different — a workspace without
 * keys cannot take money, and now says so.
 */
export class MockPaymentService implements PaymentService {
  readonly provider = 'mock'

  async createCheckout(_request: CheckoutRequest): Promise<CheckoutResult> {
    return {
      ok: false,
      reason: 'unconfigured',
      message:
        'ระบบชำระเงินออนไลน์ยังไม่ได้เปิดใช้งานในสภาพแวดล้อมนี้ ' +
        'กรุณาติดต่อทีมงานเพื่อชำระผ่านช่องทางอื่น',
    }
  }
}
