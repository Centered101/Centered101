/**
 * ========================================
 * CONFIGURATION FILE (STRIPE ONLY VERSION)
 * ไม่มีระบบโอนเงิน - ใช้ Stripe เท่านั้น
 * ========================================
 */

const CONFIG = {
    // Google Apps Script API URL
    API_URL: 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE',
    
    // Stripe Publishable Key
    STRIPE_PUBLISHABLE_KEY: 'YOUR_STRIPE_PUBLISHABLE_KEY_HERE',
    
    // Stripe Success/Cancel URLs
    STRIPE_SUCCESS_URL: window.location.origin + '/index.html?payment=success',
    STRIPE_CANCEL_URL: window.location.origin + '/index.html?payment=cancelled',
    
    // Messages
    MESSAGES: {
        LOADING: 'กำลังโหลด...',
        SUCCESS: 'สำเร็จ!',
        ERROR: 'เกิดข้อผิดพลาด',
        PAYMENT_SUCCESS: 'ชำระเงินสำเร็จ',
        FILE_LOCKED: 'ไฟล์ถูกล็อก กรุณาชำระเงินก่อน',
        FILE_UNLOCKED: 'ไฟล์พร้อมดาวน์โหลด',
        PAYMENT_PROCESSING: 'กำลังดำเนินการชำระเงิน...'
    },
    
    // Payment Methods ที่รองรับใน Stripe
    STRIPE_PAYMENT_METHODS: [
        'promptpay',  // PromptPay (QR Code)
        'card',       // Visa/MasterCard
        // 'google_pay'  // Google Pay (auto-detect by Stripe)
    ]
};

// Project State
let PROJECT_DATA = null;
let PAYMENTS_DATA = [];
let DOWNLOADS_DATA = [];

// Current State
let CURRENT_STEP = 0;
let CURRENT_AMOUNT = 0;

/**
 * ดึง Project ID จาก URL
 */
function getProjectIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('project_id') || 'DEMO_PROJECT';
}

/**
 * ดึง Payment Status จาก URL (Stripe callback)
 */
function getPaymentStatusFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
        status: urlParams.get('payment'),
        sessionId: urlParams.get('session_id')
    };
}

/**
 * Format ราคา
 */
function formatPrice(price) {
    return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB',
        minimumFractionDigits: 0
    }).format(price);
}

/**
 * Format วันที่
 */
function formatDate(date) {
    return new Intl.DateTimeFormat('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(date));
}

/**
 * Show Toast Notification
 */
function showToast(message, type = 'info') {
    const toast = $('#toast');
    const toastIcon = $('#toastIcon');
    const toastMessage = $('#toastMessage');
    
    const icons = {
        success: { icon: 'fa-check-circle', color: 'text-success', border: 'border-success' },
        error: { icon: 'fa-exclamation-circle', color: 'text-danger', border: 'border-danger' },
        warning: { icon: 'fa-exclamation-triangle', color: 'text-warning', border: 'border-warning' },
        info: { icon: 'fa-info-circle', color: 'text-primary', border: 'border-primary' }
    };
    
    const config = icons[type] || icons.info;
    
    toastIcon.removeClass().addClass(`fas ${config.icon} ${config.color} text-xl`);
    toast.find('.border-l-4').removeClass('border-primary border-success border-danger border-warning').addClass(config.border);
    toastMessage.text(message);
    
    toast.removeClass('hidden');
    
    setTimeout(() => hideToast(), 5000);
}

/**
 * Hide Toast
 */
function hideToast() {
    $('#toast').addClass('hidden');
}

/**
 * Show Loading
 */
function showLoading() {
    $('#loadingScreen').removeClass('hidden');
    $('#mainContent').addClass('hidden');
}

/**
 * Hide Loading
 */
function hideLoading() {
    $('#loadingScreen').addClass('hidden');
    $('#mainContent').removeClass('hidden');
}

console.log('Config loaded successfully (Stripe Only Version)');
