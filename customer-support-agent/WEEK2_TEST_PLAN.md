# Week 2 Integration Test Plan
## Booking System & Payment Gateway

**Test Environment:** https://customer-support-agent-alpha.vercel.app
**Date:** 2025-12-27
**Features:** Bot tools, Midtrans payment, API routes, business auto-detection

---

## ✅ Pre-Test Checklist

- [x] Code committed and pushed to GitHub
- [x] Midtrans credentials configured in .env.local
- [x] Database seeded with beauty clinic business
- [x] WhatsApp webhook configured

---

## 🧪 Test Suite

### Test 1: Web Chat Business Auto-Detection
**Objective:** Verify web chat automatically detects clinic business and enables booking tools

**Steps:**
1. Open https://customer-support-agent-alpha.vercel.app in browser
2. Send message: "halo, saya mau booking treatment"
3. Observe bot response

**Expected Result:**
- Bot should recognize booking intent
- Bot should have access to booking tools (list_services, check_availability, etc.)
- No error about missing business context

**Status:** [ ] Pass [ ] Fail

**Notes:**
```

```

---

### Test 2: Service Listing Flow
**Objective:** Verify bot calls list_services tool instead of guessing from knowledge base

**Steps:**
1. Continue from Test 1 or start new chat
2. Send message: "ada layanan apa saja?"
3. Check bot response and Vercel logs

**Expected Result:**
- Bot calls `list_services` tool with correct businessId
- Response shows actual services from database:
  - Facial Basic (facial-basic)
  - Facial Acne (facial-acne)
  - Laser CO2 Fractional (laser-co2)
  - Chemical Peeling (chemical-peeling)
  - IPL Photofacial (ipl-photofacial)
- Services include price and duration

**Vercel Logs Check:**
```
Look for: "Tool use: list_services"
Should NOT see: guessed service IDs like "laser-treatment"
```

**Status:** [ ] Pass [ ] Fail

**Notes:**
```

```

---

### Test 3: Service ID Mapping
**Objective:** Verify bot uses EXACT service IDs from list_services, no guessing

**Steps:**
1. After seeing service list, say: "saya mau Laser CO2 Fractional"
2. Check Vercel logs for tool calls

**Expected Result:**
- Bot uses serviceId: `"laser-co2"` (exact match from database)
- Bot does NOT use: `"laser-treatment"`, `"laser-co2-fractional"`, or other guessed IDs
- No SERVICE_NOT_FOUND errors

**Vercel Logs Check:**
```
Tool use: check_availability
Parameters: { serviceId: "laser-co2", ... }
```

**Status:** [ ] Pass [ ] Fail

**Notes:**
```

```

---

### Test 4: Availability Check
**Objective:** Verify availability checking works with correct service ID

**Steps:**
1. After selecting service, provide date: "besok jam 10 pagi"
2. Wait for bot response

**Expected Result:**
- Bot calls `check_availability` with:
  - Correct serviceId
  - Valid date (tomorrow in YYYY-MM-DD format)
  - Preferred time: "10:00"
- Response shows available time slots or confirms availability

**Status:** [ ] Pass [ ] Fail

**Notes:**
```

```

---

### Test 5: Complete Booking Creation
**Objective:** Verify end-to-end booking creation flow

**Steps:**
1. After availability check, provide booking details:
   - Time: "10:00"
   - Name: "Test User"
   - Phone: "081234567890"
2. Wait for booking confirmation

**Expected Result:**
- Bot calls `create_booking` with all required parameters:
  - customerId (auto-detected or created)
  - businessId (clinic ID)
  - serviceId: "laser-co2"
  - date, time, customerName, customerPhone
- Response includes:
  - Booking number (format: BK-YYYYMMDD-XXXX)
  - Service name
  - Date and time
  - Total price
  - Payment status: PENDING

**Status:** [ ] Pass [ ] Fail

**Notes:**
```

```

---

### Test 6: Payment Link Generation
**Objective:** Verify Midtrans payment link creation

**Steps:**
1. After booking created, select payment method: "GoPay"
2. Wait for payment link

**Expected Result:**
- Bot calls `create_payment_link` with:
  - bookingNumber from previous step
  - paymentType: "GOPAY"
- Response includes:
  - Midtrans Snap payment URL
  - Link is valid and accessible
  - Shows booking details and amount

**Midtrans Sandbox Check:**
- Payment URL should start with: `https://app.sandbox.midtrans.com/snap/v4/`
- URL should load Midtrans payment page

**Status:** [ ] Pass [ ] Fail

**Notes:**
```

```

---

### Test 7: Payment Status Check
**Objective:** Verify payment status checking

**Steps:**
1. Use booking number from Test 5
2. Send message: "cek status pembayaran [booking-number]"

**Expected Result:**
- Bot calls `check_payment_status` with:
  - customerId
  - bookingNumber
- Response shows:
  - Payment status (PENDING/PAID/FAILED/EXPIRED)
  - Booking status
  - Payment details if available

**Status:** [ ] Pass [ ] Fail

**Notes:**
```

```

---

### Test 8: Booking List
**Objective:** Verify customer can see their bookings

**Steps:**
1. Send message: "tampilkan booking saya"

**Expected Result:**
- Bot calls `list_bookings` with customerId
- Response shows all customer bookings with:
  - Booking number
  - Service name
  - Date and time
  - Status
  - Payment status

**Status:** [ ] Pass [ ] Fail

**Notes:**
```

```

---

### Test 9: Booking Reschedule
**Objective:** Verify booking can be rescheduled

**Steps:**
1. Request reschedule: "reschedule booking [booking-number] ke besok jam 2 siang"
2. Confirm reschedule

**Expected Result:**
- Bot calls `reschedule_booking` with:
  - bookingNumber
  - newDate
  - newTime: "14:00"
- Checks availability for new slot
- Updates booking with new date/time
- Confirmation message with updated details

**Status:** [ ] Pass [ ] Fail

**Notes:**
```

```

---

### Test 10: Booking Cancellation
**Objective:** Verify booking can be cancelled

**Steps:**
1. Request cancel: "cancel booking [booking-number]"
2. Confirm cancellation

**Expected Result:**
- Bot calls `cancel_booking` with bookingNumber
- Booking status updated to CANCELLED
- Confirmation message
- Cannot reschedule cancelled booking

**Status:** [ ] Pass [ ] Fail

**Notes:**
```

```

---

### Test 11: WhatsApp Booking Flow
**Objective:** Verify WhatsApp has same booking functionality as web

**Steps:**
1. Send WhatsApp message to clinic number: +6285161220535
2. Message: "halo, mau booking dong"
3. Follow same flow as Test 2-6

**Expected Result:**
- Same booking tools available
- Same service listing
- Same booking creation flow
- Consistent behavior between web and WhatsApp

**Status:** [ ] Pass [ ] Fail

**Notes:**
```

```

---

### Test 12: Service Details
**Objective:** Verify service detail retrieval

**Steps:**
1. Ask: "info detail tentang Laser CO2 Fractional"

**Expected Result:**
- Bot calls `get_service_details` with serviceId: "laser-co2"
- Response includes:
  - Service name
  - Description
  - Duration
  - Price
  - Category

**Status:** [ ] Pass [ ] Fail

**Notes:**
```

```

---

## 🐛 Bug Tracking

### Known Fixed Issues
1. ✅ Message content undefined - Added validation
2. ✅ Bot repeating responses - Session refresh fix
3. ✅ Service ID 'laser-treatment' not found - Added list_services requirement
4. ✅ Missing customerId - Pass from webhook to chat API
5. ✅ Guessing service IDs - 3-step validation rules
6. ✅ Web chat no booking tools - Auto-detect business context

### New Issues Found During Testing
```
Issue #:
Description:
Steps to Reproduce:
Expected:
Actual:
Severity: [ ] Critical [ ] High [ ] Medium [ ] Low
Status: [ ] Open [ ] In Progress [ ] Fixed
```

---

## 📊 Test Results Summary

**Total Tests:** 12
**Passed:** ___
**Failed:** ___
**Pass Rate:** ___%

**Critical Issues:** ___
**Blockers:** ___

---

## 🚀 Deployment Verification

**Latest Commit:** c9663a5 - feat: Add web business auto-detection for unified booking experience
**Deployed URL:** https://customer-support-agent-alpha.vercel.app
**Deployment Status:** [ ] Verified [ ] Pending

**Environment Variables:**
- [x] MIDTRANS_SERVER_KEY configured
- [x] MIDTRANS_CLIENT_KEY configured
- [x] MIDTRANS_IS_PRODUCTION=false (sandbox mode)
- [x] DATABASE_URL configured
- [x] TWILIO credentials configured

---

## 📝 Testing Notes

### Vercel Logs Access
```bash
# View real-time logs
vercel logs --follow

# View recent logs
vercel logs
```

### Database Check
```bash
# Connect to database
npx prisma studio

# Check business records
# Verify services exist with correct IDs
# Verify bookings are being created
```

### API Endpoint Testing
```bash
# Test service list API
curl -X POST https://customer-support-agent-alpha.vercel.app/api/service/list \
  -H "Content-Type: application/json"

# Test booking availability
curl -X POST https://customer-support-agent-alpha.vercel.app/api/booking/availability \
  -H "Content-Type: application/json" \
  -d '{"serviceId":"laser-co2","date":"2025-12-28","preferredTime":"10:00"}'
```

---

## ✅ Sign-Off

**Tested By:** _______________
**Date:** _______________
**Approved By:** _______________
**Date:** _______________

**Ready for Production:** [ ] Yes [ ] No [ ] With Conditions

**Conditions:**
```

```
