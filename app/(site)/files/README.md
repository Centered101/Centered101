# 🚀 Freelance Delivery System - Stripe Only Version

## ระบบส่งงานลูกค้า + รับชำระเงิน (เฉพาะ Stripe)

เวอร์ชันนี้เป็นเวอร์ชันที่เรียบง่ายกว่า **ไม่มีระบบโอนเงิน + อัปโหลดสลิป**  
ใช้เฉพาะ **Stripe Checkout** ที่รองรับ:
- ✅ **PromptPay** (QR Code สำหรับไทย)
- ✅ **Card** (Visa/MasterCard)
- ✅ **Google Pay** (Auto-detect)

---

## 🎯 จุดเด่นของเวอร์ชันนี้

### ข้อดี
- ✨ **เรียบง่าย** - ไม่ต้องจัดการสลิป ไม่ต้องใช้ ImgBB
- ✨ **รวดเร็ว** - ลูกค้ากดปุ่มเดียว → ชำระเงินเสร็จ
- ✨ **ปลอดภัย** - Stripe จัดการทุกอย่าง (PCI DSS Compliant)
- ✨ **Real-time** - ยืนยันการชำระเงินทันที ไม่ต้องรอ admin
- ✨ **รองรับ PromptPay** - QR Code แบบไทย สแกนง่าย

### เหมาะกับ
- 💼 ฟรีแลนซ์ที่ต้องการระบบอัตโนมัติ 100%
- 💼 ต้องการรับเงินผ่านบัตรเครดิต/PromptPay
- 💼 ไม่ต้องการยุ่งยากกับการตรวจสอบสลิป

---

## 📋 ความแตกต่างจากเวอร์ชันเต็ม

| Feature | เวอร์ชันเต็ม | Stripe Only (นี้) |
|---------|-------------|------------------|
| ชำระผ่าน Stripe (PromptPay/Card) | ✅ | ✅ |
| ชำระผ่านโอนเงิน + อัปโหลดสลิป | ✅ | ❌ |
| ต้อง verify สลิปด้วยตนเอง | ✅ | ❌ |
| ยืนยันการชำระเงินอัตโนมัติ | ⚠️ (เฉพาะ Stripe) | ✅ (ทั้งหมด) |
| ImgBB API | ✅ Required | ❌ Not needed |
| ความซับซ้อน | ปานกลาง | ต่ำ |

---

## 🎬 วิธีการทำงาน

### สำหรับลูกค้า

```
1. เปิด Client Portal
   ↓
2. ดูข้อมูลโปรเจกต์ + Demo
   ↓
3. คลิกปุ่ม "ชำระเงิน"
   ↓
4. Redirect ไป Stripe Checkout
   ├─ เลือก PromptPay → สแกน QR Code
   ├─ เลือก Card → กรอกข้อมูลบัตร
   └─ Google Pay จะแสดงอัตโนมัติ
   ↓
5. ชำระเงินสำเร็จ
   ↓
6. Redirect กลับมา → ไฟล์ปลดล็อกทันที
   ↓
7. ดาวน์โหลดไฟล์
```

### ขั้นตอนการชำระเงิน (PromptPay)

```
คลิก "ชำระเงิน"
   ↓
Stripe แสดง QR Code
   ↓
เปิดแอปธนาคาร (KBank, SCB, Bangkok Bank, ฯลฯ)
   ↓
สแกน QR Code
   ↓
ยืนยันการชำระเงิน
   ↓
✅ สำเร็จ! (Real-time)
```

---

## 🛠️ การติดตั้ง

### Step 1: Setup Google Sheets
เหมือนเวอร์ชันเต็ม (3 sheets: projects, payments, downloads)

### Step 2: Setup Google Apps Script
1. Copy `google-apps-script/Code.gs`
2. Copy `google-apps-script/StripeIntegration.gs`
3. แก้ไข `SPREADSHEET_ID` และ `STRIPE_SECRET_KEY`
4. Deploy เป็น Web App

### Step 3: Get Stripe API Keys
1. ไปที่ https://dashboard.stripe.com/
2. สมัครสมาชิก
3. Developers > API keys
4. คัดลอก:
   - Publishable key (pk_test_...)
   - Secret key (sk_test_...)

### Step 4: เปิดใช้งาน PromptPay ใน Stripe

**⚠️ สำคัญมาก!**

1. ไปที่ Stripe Dashboard
2. Settings > Payment methods
3. หา "PromptPay" แล้วคลิก **Enable**
4. Stripe จะขอให้:
   - ยืนยันธุรกิจอยู่ในประเทศไทย
   - เพิ่มข้อมูลธุรกิจ
   - อัปโหลดเอกสารยืนยัน (ถ้าจำเป็น)

**หมายเหตุ**:
- PromptPay ใช้ได้เฉพาะ Stripe ในประเทศไทย
- ถ้าไม่เปิด PromptPay ลูกค้าจะเห็นแค่ Card + Google Pay

### Step 5: Configure Frontend
```javascript
// assets/js/config.js
const CONFIG = {
    API_URL: 'YOUR_GOOGLE_APPS_SCRIPT_URL',
    STRIPE_PUBLISHABLE_KEY: 'pk_test_...',
    STRIPE_SUCCESS_URL: window.location.origin + '/index.html?payment=success',
    STRIPE_CANCEL_URL: window.location.origin + '/index.html?payment=cancelled'
};
```

### Step 6: Deploy
Upload ไปยัง Web Hosting (GitHub Pages, Netlify, ฯลฯ)

---

## 💰 ค่าธรรมเนียม Stripe

| Payment Method | ค่าธรรมเนียม (ไทย) |
|----------------|-------------------|
| **PromptPay** | 2.2% + ฿0 |
| **Card (ไทย)** | 2.9% + ฿10 |
| **Card (ต่างประเทศ)** | 3.4% + ฿10 |
| **Google Pay** | 2.9% + ฿10 |

**ตัวอย่าง**:
- ชำระ ฿10,000 ผ่าน PromptPay = เสีย ฿220
- ชำระ ฿10,000 ผ่าน Card = เสีย ฿300

---

## 📱 ธนาคารที่รองรับ PromptPay (ผ่าน Stripe)

- ✅ ธนาคารกสิกรไทย (KBank)
- ✅ ธนาคารไทยพาณิชย์ (SCB)
- ✅ ธนาคารกรุงเทพ (Bangkok Bank)
- ✅ ธนาคารกรุงไทย (Krungthai)
- ✅ ธนาคารกรุงศรีอยุธยา (Krungsri)
- ✅ ธนาคารทหารไทยธนชาต (TTB)
- ✅ และอื่นๆ ที่รองรับ PromptPay

---

## 🔒 ความปลอดภัย

### Stripe Security Features
- ✅ PCI DSS Level 1 Certified
- ✅ 3D Secure (สำหรับบัตร)
- ✅ Fraud Detection
- ✅ Encryption SSL/TLS
- ✅ ไม่เก็บข้อมูลบัตรในระบบคุณ

### Your System Security
- ✅ ไฟล์ล็อกจนกว่าจะชำระเงิน
- ✅ Download Token แบบ One-time use
- ✅ ลิงก์จริงซ่อนอยู่ใน Backend
- ✅ ไม่มีข้อมูลการชำระเงินในระบบคุณ (อยู่ใน Stripe)

---

## 🎨 ตัวอย่าง UI

### หน้าชำระเงิน (Stripe Checkout)

```
┌─────────────────────────────────────┐
│  GED Value Pack 4 (4 วิชา)         │
│  THB 9,990.00                       │
│  60% OFF                            │
├─────────────────────────────────────┤
│  Email: email@example.com           │
├─────────────────────────────────────┤
│  Payment method:                    │
│  ○ PromptPay (แสดง QR Code)        │
│  ○ Card (กรอกข้อมูลบัตร)           │
│  ○ Google Pay                       │
├─────────────────────────────────────┤
│  [Continue with PromptPay]          │
└─────────────────────────────────────┘
```

### เมื่อเลือก PromptPay

```
┌─────────────────────────────────────┐
│  Scan this QR code with your        │
│  mobile banking app                 │
│                                     │
│     ████████████████████            │
│     ██  ████  ██  ████  ██          │
│     ████████████████████            │
│     ██  ████  ██  ████  ██          │
│     ████████████████████            │
│                                     │
│  THB 9,990.00                       │
│                                     │
│  Supported by: KBank, SCB,          │
│  Bangkok Bank, Krungthai, etc.      │
└─────────────────────────────────────┘
```

---

## 🧪 การทดสอบ

### Test Mode (PromptPay)
```
⚠️ PromptPay ไม่มีโหมดทดสอบ!

วิธีทดสอบ:
1. ใช้บัตรทดสอบแทน: 4242 4242 4242 4242
2. หรือทดสอบกับยอดเงินจริงแบบน้อยๆ (฿10-20)
3. แล้ว Refund ภายหลัง
```

### Test Card Numbers
```
Card: 4242 4242 4242 4242
Expiry: 12/34
CVC: 123
```

---

## 📊 โครงสร้างไฟล์

```
stripe-only-version/
├── index.html                   # หน้า Client Portal
├── assets/
│   └── js/
│       ├── config.js           # Configuration
│       ├── api.js              # API Handler
│       ├── payment.js          # Payment Logic (Stripe Only)
│       └── app.js              # Main App
├── google-apps-script/
│   ├── Code.gs                 # Main API
│   └── StripeIntegration.gs    # Stripe + PromptPay
└── README.md                   # คู่มือนี้
```

---

## ❓ FAQ

**Q: PromptPay กับ Card ต่างกันอย่างไร?**
A:
- PromptPay = QR Code สแกนจากแอปธนาคาร (ค่าธรรมเนียมถูกกว่า 2.2%)
- Card = กรอกเลขบัตร (ค่าธรรมเนียม 2.9% + ฿10)

**Q: Google Pay แสดงเมื่อไหร่?**
A: Auto-detect ถ้าลูกค้าเปิดด้วย Chrome/Android และมี Google Pay

**Q: ต้อง verify ธุรกิจไหม?**
A: ใช่ สำหรับเปิดใช้ PromptPay ต้อง verify ธุรกิจกับ Stripe

**Q: รองรับเงินบาทอย่างเดียวเหรอ?**
A: ใช่ PromptPay รองรับเฉพาะ THB

**Q: ถ้าลูกค้ายกเลิกการชำระเงิน?**
A: ระบบจะ redirect กลับมา แล้วลูกค้าสามารถลองใหม่ได้

---

## 🚀 เริ่มต้นใช้งาน

1. ติดตั้งตาม Setup Guide
2. เปิดใช้งาน PromptPay ใน Stripe Dashboard
3. ทดสอบด้วยบัตรทดสอบ
4. Go Live!

---

## 📞 Support

ถ้ามีปัญหา:
1. ตรวจสอบว่าเปิดใช้ PromptPay ใน Stripe แล้วหรือยัง
2. ตรวจสอบ Console Logs (F12)
3. ดู Stripe Dashboard > Logs
4. ตรวจสอบ API Keys ว่าถูกต้อง

---

## 🎉 ข้อดีของการใช้ Stripe Only

1. **ไม่ต้องตรวจสอบสลิป** - ประหยัดเวลา
2. **Real-time Verification** - ลูกค้าได้ไฟล์ทันที
3. **Professional** - ดูมืออาชีพกว่า
4. **รองรับหลายช่องทาง** - PromptPay, Card, Google Pay
5. **ปลอดภัย** - Stripe จัดการทั้งหมด

---

**เวอร์ชันนี้เหมาะสำหรับคนที่ต้องการระบบง่ายๆ และรับชำระเงินอัตโนมัติ 100%!** 🚀
