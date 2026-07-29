# ⚡ Quick Start Guide - Stripe Only Version

## เริ่มใช้งานใน 10 นาที!

---

## ขั้นตอนที่ 1: Setup Stripe (3 นาที)

### 1.1 สมัคร Stripe
1. ไปที่: https://dashboard.stripe.com/register
2. กรอกข้อมูล Email, Password
3. เลือก Country: **Thailand** ⚠️ สำคัญ!
4. Verify Email

### 1.2 เปิดใช้งาน PromptPay
1. Login เข้า Stripe Dashboard
2. **Settings > Payment methods**
3. หา "**PromptPay**" แล้วคลิก **Enable**
4. กรอกข้อมูลธุรกิจ:
   - Business name
   - Business type (Individual/Company)
   - Address
5. Submit

**⚠️ Important**: PromptPay ต้องใช้เวลาอนุมัติ 1-3 วันทำการ  
ระหว่างนี้ใช้ Card ได้ปกติ

### 1.3 Get API Keys
1. ไปที่: **Developers > API keys**
2. คัดลอก 2 keys นี้:
   ```
   Publishable key: pk_test_...
   Secret key: sk_test_...  (คลิก Reveal ก่อน)
   ```
3. **เก็บไว้ดีๆ** (จะใช้ในขั้นตอนถัดไป)

---

## ขั้นตอนที่ 2: Setup Google Sheets (2 นาที)

### 2.1 สร้าง Spreadsheet
1. ไปที่: https://sheets.google.com
2. สร้าง Blank spreadsheet ใหม่
3. เปลี่ยนชื่อเป็น: `Freelance Delivery System`

### 2.2 สร้าง 3 Sheets

**Sheet 1: projects** (เปลี่ยนชื่อจาก Sheet1)
```
A1: project_id
B1: client_name
C1: client_email
D1: project_title
E1: description
F1: demo_url
G1: payment_type
H1: total_price
I1: installments
J1: installment_amounts
K1: current_step
L1: status
M1: created_at
```

**Sheet 2: payments** (เพิ่ม Sheet ใหม่)
```
A1: payment_id
B1: project_id
C1: step_number
D1: amount
E1: payment_method
F1: slip_url
G1: stripe_session_id
H1: payment_status
I1: verified_by
J1: timestamp
```

**Sheet 3: downloads** (เพิ่ม Sheet ใหม่)
```
A1: download_id
B1: project_id
C1: step_number
D1: file_name
E1: file_url
F1: download_token
G1: is_unlocked
H1: created_at
```

### 2.3 คัดลอก Spreadsheet ID
ดู URL:
```
https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/edit
                                      ^^^^^^^^^^^^^^^^^^^^^^^^
                                      นี่คือ SPREADSHEET_ID
```

---

## ขั้นตอนที่ 3: Setup Apps Script (3 นาที)

### 3.1 เปิด Apps Script
1. ใน Google Sheets: **Extensions > Apps Script**

### 3.2 Copy Code
1. **ลบโค้ดเดิมทั้งหมด**
2. Copy `google-apps-script/Code.gs` ไปวาง
3. แก้ไข:
   ```javascript
   const SPREADSHEET_ID = 'ใส่ ID ที่คัดลอกมา';
   ```
4. Save (Ctrl+S)

### 3.3 เพิ่ม Stripe Integration
1. คลิก **+ ข้าง Files** > **Script**
2. ตั้งชื่อ: `StripeIntegration`
3. Copy `google-apps-script/StripeIntegration.gs` ไปวาง
4. แก้ไข:
   ```javascript
   const STRIPE_SECRET_KEY = 'sk_test_...'; // ใส่ Secret Key
   ```
5. Save

### 3.4 Deploy
1. คลิก **Deploy > New deployment**
2. Select type: **Web app**
3. Execute as: **Me**
4. Who has access: **Anyone**
5. คลิก **Deploy**
6. **Copy Web app URL** (ใช้ในขั้นตอนถัดไป)

### 3.5 สร้างโปรเจกต์ตัวอย่าง
1. เลือก function: `createSampleProject`
2. คลิก **Run** (▶️)
3. อนุญาตเข้าถึง (ครั้งแรก)
4. ดู **Execution log**
5. **Copy Project ID** (PROJ_xxx)

---

## ขั้นตอนที่ 4: Setup Frontend (2 นาที)

### 4.1 แก้ไข config.js
เปิดไฟล์ `assets/js/config.js`

```javascript
const CONFIG = {
    // ใส่ URL จาก Step 3.4
    API_URL: 'https://script.google.com/macros/s/.../exec',
    
    // ใส่ Publishable Key จาก Step 1.3
    STRIPE_PUBLISHABLE_KEY: 'pk_test_...',
    
    // ไม่ต้องแก้ (ถ้าใช้ domain ปกติ)
    STRIPE_SUCCESS_URL: window.location.origin + '/index.html?payment=success',
    STRIPE_CANCEL_URL: window.location.origin + '/index.html?payment=cancelled'
};
```

---

## ขั้นตอนที่ 5: Deploy & Test (2 นาที)

### 5.1 ทดสอบบน Local (วิธีง่าย)
```bash
# เปิด Terminal ในโฟลเดอร์โปรเจกต์
python -m http.server 8000

# เปิด Browser: http://localhost:8000
```

### 5.2 เปิดหน้าเว็บ
```
http://localhost:8000/index.html?project_id=PROJ_xxx
```
(แทน PROJ_xxx ด้วย ID จาก Step 3.5)

### 5.3 ทดสอบการชำระเงิน

**ทดสอบด้วย Card:**
```
Card: 4242 4242 4242 4242
Expiry: 12/34
CVC: 123
Name: Test User
```

**ทดสอบ PromptPay:**
- ⚠️ PromptPay ไม่มี Test Mode
- ถ้ายังไม่ได้อนุมัติ จะไม่เห็นตัวเลือก PromptPay
- รอการอนุมัติจาก Stripe (1-3 วัน)

---

## ✅ Checklist

- [ ] สมัคร Stripe แล้ว
- [ ] เปิดใช้งาน PromptPay (รอการอนุมัติ)
- [ ] ได้ API Keys แล้ว (Publishable + Secret)
- [ ] สร้าง Google Sheets แล้ว (3 sheets)
- [ ] Setup Apps Script แล้ว
- [ ] Deploy Apps Script แล้ว
- [ ] แก้ไข config.js แล้ว
- [ ] ทดสอบด้วยบัตรทดสอบได้แล้ว

---

## 🚀 Go Live!

### เมื่อพร้อม Production

1. **เปลี่ยน Stripe เป็น Live Mode**
   - Stripe Dashboard > Switch to **Live mode**
   - Developers > API keys
   - Copy Live keys (pk_live_... และ sk_live_...)

2. **อัปเดต Keys**
   - `config.js`: ใส่ `pk_live_...`
   - `StripeIntegration.gs`: ใส่ `sk_live_...`
   - Deploy Apps Script ใหม่

3. **Upload ไป Hosting**
   - GitHub Pages (ฟรี)
   - Netlify (ฟรี)
   - Vercel (ฟรี)
   - หรือ Web Hosting ใดก็ได้

4. **เพิ่มโปรเจกต์จริง**
   - เปิด Google Sheets
   - เพิ่มข้อมูลใน Sheet `projects`
   - เพิ่มไฟล์ใน Sheet `downloads`

5. **ส่ง Link ให้ลูกค้า**
   ```
   https://your-website.com/index.html?project_id=PROJ_001
   ```

---

## 🎯 ตัวอย่างข้อมูลโปรเจกต์

### เพิ่มใน Sheet: projects

```
A2: PROJ_001
B2: คุณสมชาย
C2: somchai@email.com
D2: ระบบจัดการสต็อก
E2: ระบบจัดการสต็อกสินค้าสำหรับร้านค้า
F2: https://demo.com
G2: full
H2: 15000
I2: 1
J2: [15000]
K2: 0
L2: PENDING
M2: 2025-02-10
```

### เพิ่มใน Sheet: downloads

```
A2: DL_001
B2: PROJ_001
C2: 1
D2: source-code.zip
E2: https://drive.google.com/file/d/YOUR_FILE_ID/view
F2: (เว้นว่าง)
G2: FALSE
H2: 2025-02-10
```

---

## 💡 Tips

### 1. PromptPay vs Card
- PromptPay: ถูกกว่า (2.2%) แต่ต้องรออนุมัติ
- Card: ใช้ได้ทันที (2.9% + ฿10)

### 2. Test Mode
- ใช้ `pk_test_...` และ `sk_test_...`
- ไม่มีเงินจริงถูกหัก
- ใช้บัตรทดสอบ 4242 4242 4242 4242

### 3. Live Mode
- ใช้ `pk_live_...` และ `sk_live_...`
- มีเงินจริง
- ต้องผ่านการ verify ธุรกิจ

---

## ❓ FAQ

**Q: PromptPay ยังไม่แสดง?**
A: รอการอนุมัติจาก Stripe (1-3 วัน)

**Q: ทดสอบ PromptPay ได้ไหม?**
A: ไม่ได้ ต้องใช้เงินจริง แนะนำให้รอจนกว่าจะ Go Live

**Q: ค่าธรรมเนียมเท่าไหร่?**
A:
- PromptPay: 2.2%
- Card (ไทย): 2.9% + ฿10
- Card (ต่างประเทศ): 3.4% + ฿10

**Q: ระบบช้าไหม?**
A: ไม่ PromptPay verify แบบ real-time (~3-5 วินาที)

---

## 🎉 เสร็จแล้ว!

คุณมีระบบส่งงาน + รับชำระเงินอัตโนมัติแล้ว! 🚀

**Next Steps:**
1. รอ PromptPay อนุมัติ (ถ้ายังไม่ได้)
2. ทดสอบกับลูกค้าจริง
3. เก็บเงินผ่าน Stripe
4. Withdraw เงินไปบัญชีธนาคาร

**Good luck! 💼✨**
