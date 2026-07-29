/**
 * ========================================
 * STRIPE INTEGRATION WITH PROMPTPAY
 * รองรับ: PromptPay, Card, Google Pay
 * ========================================
 */

const STRIPE_SECRET_KEY = 'YOUR_STRIPE_SECRET_KEY_HERE';
const STRIPE_API_URL = 'https://api.stripe.com/v1';

/**
 * สร้าง Stripe Checkout Session
 * รองรับ PromptPay (promptpay) + Card + Google Pay
 */
function createStripeCheckout(data) {
  try {
    const amount = data.amount;
    const projectId = data.project_id;
    const stepNumber = data.step_number;
    const successUrl = data.success_url;
    const cancelUrl = data.cancel_url;
    
    // ดึงข้อมูลโปรเจกต์
    const projectResult = getProject(projectId);
    if (!projectResult.success) {
      return { success: false, error: 'Project not found' };
    }
    
    const project = projectResult.data;
    
    // สร้าง line items
    const lineItems = [{
      price_data: {
        currency: 'thb',
        product_data: {
          name: project.project_title,
          description: project.payment_type === 'full' 
            ? 'ชำระเต็มจำนวน' 
            : `งวดที่ ${stepNumber}/${project.installments}`,
          images: project.demo_url ? [project.demo_url] : []
        },
        unit_amount: Math.round(amount * 100) // Stripe ใช้หน่วย satang
      },
      quantity: 1
    }];
    
    // Payment Method Types ที่รองรับ
    // PromptPay จะแสดง QR Code ให้ลูกค้าสแกน
    const paymentMethodTypes = [
      'promptpay',  // PromptPay (QR Code) - สำหรับไทย
      'card'        // Visa/MasterCard
    ];
    
    // Metadata
    const metadata = {
      project_id: projectId,
      step_number: stepNumber.toString(),
      payment_type: project.payment_type,
      client_email: project.client_email
    };
    
    // สร้าง Checkout Session Payload
    const payload = {
      payment_method_types: paymentMethodTypes.join(','),
      line_items: JSON.stringify(lineItems),
      mode: 'payment',
      success_url: successUrl + '&session_id={CHECKOUT_SESSION_ID}',
      cancel_url: cancelUrl,
      metadata: JSON.stringify(metadata),
      customer_email: project.client_email,
      locale: 'th', // ภาษาไทย
      billing_address_collection: 'auto',
      // PromptPay specific settings
      payment_intent_data: JSON.stringify({
        metadata: metadata,
        description: `${project.project_title} - งวดที่ ${stepNumber}`
      })
    };
    
    // เรียก Stripe API
    const options = {
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + STRIPE_SECRET_KEY,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      payload: createQueryString(payload)
    };
    
    const response = UrlFetchApp.fetch(STRIPE_API_URL + '/checkout/sessions', options);
    const session = JSON.parse(response.getContentText());
    
    if (session.error) {
      return { 
        success: false, 
        error: session.error.message 
      };
    }
    
    return {
      success: true,
      checkout_url: session.url,
      session_id: session.id
    };
    
  } catch (error) {
    Logger.log('Stripe Checkout Error: ' + error.toString());
    return { 
      success: false, 
      error: error.toString()
    };
  }
}

/**
 * Helper: สร้าง Query String
 */
function createQueryString(params) {
  return Object.keys(params)
    .map(key => {
      const value = params[key];
      return encodeURIComponent(key) + '=' + encodeURIComponent(value);
    })
    .join('&');
}

/**
 * ตรวจสอบ Stripe Payment Status
 */
function verifyStripePayment(sessionId) {
  try {
    const options = {
      method: 'get',
      headers: {
        'Authorization': 'Bearer ' + STRIPE_SECRET_KEY
      }
    };
    
    const response = UrlFetchApp.fetch(
      STRIPE_API_URL + '/checkout/sessions/' + sessionId,
      options
    );
    
    const session = JSON.parse(response.getContentText());
    
    return {
      success: true,
      payment_status: session.payment_status,
      amount_total: session.amount_total / 100,
      metadata: session.metadata,
      payment_method_types: session.payment_method_types
    };
    
  } catch (error) {
    Logger.log('Verify Payment Error: ' + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Stripe Webhook Handler
 */
function handleStripeWebhook(e) {
  try {
    const event = JSON.parse(e.postData.contents);
    
    Logger.log('Stripe Webhook Event: ' + event.type);
    
    switch (event.type) {
      case 'checkout.session.completed':
        handleCheckoutCompleted(event.data.object);
        break;
      case 'payment_intent.succeeded':
        handlePaymentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        handlePaymentFailed(event.data.object);
        break;
    }
    
    return ContentService.createTextOutput(JSON.stringify({ received: true }))
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('Webhook Error: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * จัดการเมื่อ Checkout สำเร็จ
 */
function handleCheckoutCompleted(session) {
  try {
    const metadata = session.metadata;
    const projectId = metadata.project_id;
    const stepNumber = parseInt(metadata.step_number);
    const amount = session.amount_total / 100;
    
    // ดึง payment method ที่ใช้
    const paymentMethodTypes = session.payment_method_types || ['unknown'];
    const paymentMethod = paymentMethodTypes[0]; // promptpay หรือ card
    
    // บันทึกการชำระเงิน
    const paymentData = {
      project_id: projectId,
      step_number: stepNumber,
      amount: amount,
      payment_method: paymentMethod, // 'promptpay' or 'card'
      stripe_session_id: session.id,
      payment_status: 'VERIFIED'
    };
    
    submitPayment(paymentData);
    
    Logger.log(`Payment completed via ${paymentMethod} for project: ${projectId}`);
    
  } catch (error) {
    Logger.log('Handle Checkout Error: ' + error.toString());
  }
}

/**
 * จัดการเมื่อชำระเงินสำเร็จ
 */
function handlePaymentSucceeded(paymentIntent) {
  Logger.log('Payment succeeded: ' + paymentIntent.id);
  Logger.log('Payment Method: ' + (paymentIntent.payment_method_types || 'unknown'));
}

/**
 * จัดการเมื่อชำระเงินล้มเหลว
 */
function handlePaymentFailed(paymentIntent) {
  Logger.log('Payment failed: ' + paymentIntent.id);
  // อัปเดตสถานะถ้าต้องการ
}

/**
 * ===== IMPORTANT NOTES =====
 * 
 * การตั้งค่า PromptPay ใน Stripe:
 * 
 * 1. ไปที่ Stripe Dashboard
 * 2. Settings > Payment methods
 * 3. เปิดใช้งาน "PromptPay"
 * 4. ต้องมี Business อยู่ในประเทศไทย
 * 5. ต้องผ่านการ verify บัญชี
 * 
 * Payment Method Types:
 * - 'promptpay' : QR Code แบบไทย
 * - 'card' : Visa/MasterCard
 * - 'google_pay' : Auto-detect (ไม่ต้องระบุ)
 * 
 * PromptPay Features:
 * - แสดง QR Code ให้ลูกค้าสแกน
 * - รองรับทุกธนาคารในไทย
 * - Real-time verification
 * - ค่าธรรมเนียม ~2.2%
 * 
 * Card Features:
 * - Visa, MasterCard, Amex
 * - 3D Secure support
 * - Save card for later
 * - ค่าธรรมเนียม ~2.9% + ฿10
 * 
 */
