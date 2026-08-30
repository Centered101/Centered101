/**
 * ========================================
 * PAYMENT LOGIC (STRIPE ONLY VERSION)
 * รองรับเฉพาะ Stripe Checkout
 * PromptPay, Card, Google Pay
 * ========================================
 */

/**
 * เริ่มการชำระเงิน (ไปยัง Stripe Checkout)
 */
async function startPayment() {
    if (!PROJECT_DATA) {
        showToast('ไม่พบข้อมูลโปรเจกต์', 'error');
        return;
    }
    
    const projectId = getProjectIdFromUrl();
    const paymentType = PROJECT_DATA.payment_type;
    
    // คำนวณ step และ amount
    let stepNumber, amount;
    
    if (paymentType === 'full') {
        // ชำระเต็มจำนวน
        stepNumber = PROJECT_DATA.installments || 1;
        amount = PROJECT_DATA.total_price;
    } else {
        // ชำระเป็นงวด - ชำระงวดถัดไป
        const currentStep = PROJECT_DATA.current_step || 0;
        stepNumber = currentStep + 1;
        
        const installmentAmounts = PROJECT_DATA.installment_amounts || [];
        amount = installmentAmounts[currentStep] || (PROJECT_DATA.total_price / PROJECT_DATA.installments);
    }
    
    // ตรวจสอบว่าชำระครบแล้วหรือยัง
    if (PROJECT_DATA.status === 'DONE') {
        showToast('คุณได้ชำระเงินครบแล้ว', 'info');
        return;
    }
    
    // Redirect ไป Stripe Checkout
    showToast('กำลังเตรียมหน้าชำระเงิน...', 'info');
    
    try {
        await StripeAPI.createCheckoutSession(amount, projectId, stepNumber);
    } catch (error) {
        showToast('เกิดข้อผิดพลาด: ' + error.message, 'error');
    }
}

/**
 * แสดงส่วนการชำระเงิน
 */
function renderPaymentSection() {
    if (!PROJECT_DATA) return;
    
    const paymentType = PROJECT_DATA.payment_type;
    const currentStep = PROJECT_DATA.current_step || 0;
    const totalInstallments = PROJECT_DATA.installments || 1;
    const status = PROJECT_DATA.status;
    
    // ซ่อนทุกอันก่อน
    $('#installmentSection').hide();
    $('#fullPaymentSection').hide();
    $('#paymentButton').hide();
    $('#completedMessage').hide();
    
    // ถ้าเสร็จแล้ว
    if (status === 'DONE') {
        $('#completedMessage').show();
        return;
    }
    
    // แสดงตามประเภทการชำระ
    if (paymentType === 'installment') {
        renderInstallmentSteps();
        $('#installmentSection').show();
        
        // ถ้ายังมีงวดที่ต้องจ่าย
        if (currentStep < totalInstallments) {
            const installmentAmounts = PROJECT_DATA.installment_amounts || [];
            const nextAmount = installmentAmounts[currentStep] || (PROJECT_DATA.total_price / totalInstallments);
            
            CURRENT_STEP = currentStep + 1;
            CURRENT_AMOUNT = nextAmount;
            
            // แสดงปุ่มชำระเงิน
            $('#paymentButton').show();
            $('#paymentButtonAmount').text(formatPrice(nextAmount));
        }
    } else {
        // Full payment
        $('#fullPaymentAmount').text(formatPrice(PROJECT_DATA.total_price));
        $('#fullPaymentSection').show();
        
        // ตรวจสอบว่าจ่ายแล้วหรือยัง
        const hasPaid = PAYMENTS_DATA.some(p => p.payment_status === 'VERIFIED');
        
        if (hasPaid) {
            $('#completedMessage').show();
        } else {
            CURRENT_STEP = totalInstallments;
            CURRENT_AMOUNT = PROJECT_DATA.total_price;
            
            $('#paymentButton').show();
            $('#paymentButtonAmount').text(formatPrice(PROJECT_DATA.total_price));
        }
    }
}

/**
 * แสดง Payment Steps (งวด)
 */
function renderInstallmentSteps() {
    if (!PROJECT_DATA) return;
    
    const currentStep = PROJECT_DATA.current_step || 0;
    const totalInstallments = PROJECT_DATA.installments || 1;
    const installmentAmounts = PROJECT_DATA.installment_amounts || [];
    
    let html = '<div class="space-y-4">';
    
    for (let i = 0; i < totalInstallments; i++) {
        const stepNumber = i + 1;
        const amount = installmentAmounts[i] || (PROJECT_DATA.total_price / totalInstallments);
        const isPaid = stepNumber <= currentStep;
        const isActive = stepNumber === currentStep + 1;
        const isLocked = stepNumber > currentStep + 1;
        
        let stepClass = '';
        let iconClass = '';
        let statusBadge = '';
        
        if (isPaid) {
            stepClass = 'completed';
            iconClass = 'fa-check';
            statusBadge = '<span class="status-badge bg-green-100 text-success">ชำระแล้ว</span>';
        } else if (isActive) {
            stepClass = 'active';
            iconClass = 'fa-circle';
            statusBadge = '<span class="status-badge bg-blue-100 text-primary">งวดถัดไป</span>';
        } else {
            stepClass = '';
            iconClass = 'fa-lock';
            statusBadge = '<span class="status-badge bg-gray-100 text-gray-600">รอชำระ</span>';
        }
        
        html += `
            <div class="step-item">
                <div class="step-circle ${stepClass}">
                    <i class="fas ${iconClass} text-xs"></i>
                </div>
                <div class="flex items-center justify-between">
                    <div>
                        <h4 class="font-semibold text-gray-800">งวดที่ ${stepNumber}</h4>
                        <p class="text-sm text-gray-600">จำนวนเงิน: ${formatPrice(amount)}</p>
                    </div>
                    ${statusBadge}
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    
    $('#paymentSteps').html(html);
}

/**
 * จัดการ Stripe Callback
 */
function handleStripeCallback() {
    const { status, sessionId } = getPaymentStatusFromUrl();
    const projectId = getProjectIdFromUrl();
    const urlParams = new URLSearchParams(window.location.search);
    const stepNumber = parseInt(urlParams.get('step')) || 1;
    
    if (status === 'success' && sessionId) {
        showToast('กำลังยืนยันการชำระเงิน...', 'info');
        StripeAPI.handleCallback(projectId, stepNumber, sessionId);
    } else if (status === 'cancelled') {
        showToast('ยกเลิกการชำระเงินแล้ว', 'warning');
        
        // ลบ query params ออกจาก URL
        setTimeout(() => {
            window.history.replaceState({}, document.title, `index.html?project_id=${projectId}`);
        }, 2000);
    }
}

console.log('Payment Logic loaded (Stripe Only Version)');
