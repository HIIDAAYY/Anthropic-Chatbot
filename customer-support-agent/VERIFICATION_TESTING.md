# Verification & Testing Guide

## ✅ Step 1: Verify Database Setup

### Check Prisma Connection
```bash
# In your project directory
npx prisma studio
```

**Expected:** Prisma Studio opens at http://localhost:5555

**Check these tables:**
- [ ] customers (should have 1 record)
- [ ] orders (should have 1 record: ORD-2025-001)
- [ ] order_items (should have 2 items)
- [ ] payments (should have 1 record with COMPLETED status)
- [ ] inventory (should have 3 products)
- [ ] shipping_tracking (should have 1 record)

---

## ✅ Step 2: Verify API Endpoints

### Test Order Tracking Endpoint

Open Postman or use curl:

```bash
curl -X POST http://localhost:3000/api/bot/order/track \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "YOUR_CUSTOMER_ID",
    "orderNumber": "ORD-2025-001"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "tracking": {
    "trackingNumber": "JNE123456789",
    "carrier": "jne",
    "status": "IN_TRANSIT",
    "currentLocation": "Jakarta",
    "estimatedDelivery": "2025-11-26T00:00:00Z"
  },
  "orderStatus": "SHIPPED"
}
```

### Test Payment Verification Endpoint

```bash
curl -X POST http://localhost:3000/api/bot/payment/verify \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "YOUR_CUSTOMER_ID",
    "orderNumber": "ORD-2025-001"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "isPaid": true,
  "payment": {
    "status": "COMPLETED",
    "method": "bank_transfer",
    "paidAt": "2025-11-20T15:30:00Z"
  }
}
```

### Test Inventory Check Endpoint

```bash
curl -X POST http://localhost:3000/api/bot/inventory/check \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "YOUR_CUSTOMER_ID",
    "productIds": ["KAOS-001"]
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "stocks": [
    {
      "productId": "KAOS-001",
      "productName": "Kaos Basic Crewneck",
      "quantity": 50,
      "inStock": true
    }
  ],
  "totalProducts": 1,
  "productsInStock": 1
}
```

---

## 🔍 Step 3: Check Dev Server Logs

While dev server is running, watch for these log patterns:

### When Bot Calls Tools:
```
🔍 Querying Pinecone...
🚀 Query Processing
✅ Message generation completed
```

### When Tools Are Executed:
```
🔍 Initiating RAG retrieval...
✅ RAG retrieval completed successfully
📤 Sending notification to agent...
```

### Database Saves:
```
📝 Latest Query: [customer message]
✅ User message saved to database
✅ Assistant message saved to database
✅ Conversation metadata updated
```

**No errors should appear** - if you see errors, check troubleshooting section.

---

## 🧪 Step 4: Test Bot in Chat Interface

### Test Scenario 1: Track Order

**Input:** "Mana pesanan saya ORD-2025-001?"

**What Should Happen:**
1. Bot recognizes order number
2. Bot decides: "I need real tracking data → use track_order tool"
3. Bot calls `/api/bot/order/track`
4. Bot receives tracking info from database
5. Bot formats and displays to user

**Expected Output:**
```
📦 Status Pengiriman Pesanan ORD-2025-001

Status: 🚚 Dalam Perjalanan
Kurir: JNE
Nomor Resi: JNE123456789
Lokasi Terakhir: Jakarta
Estimasi Tiba: 26 November 2025

🔗 Lacak Paket Secara Real-time
```

**Sign of Success:**
- ✅ Shows actual tracking number (JNE123456789)
- ✅ Shows actual carrier (JNE)
- ✅ Shows actual location (Jakarta)
- ✅ NOT generic FAQ response

### Test Scenario 2: Check Payment Status

**Input:** "Sudah terbayar belum pesanan saya?"

**Expected Output:**
```
✅ Status Pembayaran: Pembayaran Berhasil

Metode: Transfer Bank
Jumlah: Rp150.000
Dibayar: 20 November 2025
```

**Sign of Success:**
- ✅ Shows actual payment status (COMPLETED)
- ✅ Shows actual amount (150000)
- ✅ NOT just general payment instructions

### Test Scenario 3: Check Order Summary

**Input:** "Berapa total pesanan saya?"

**Expected Output:**
```
📊 Ringkasan Pesanan Anda

Total Orders: 1
Active Orders: 0
Total Spent: Rp150.000

Recent Orders:
- ORD-2025-001: SHIPPED (Rp150.000)
```

**Sign of Success:**
- ✅ Shows actual order count (1)
- ✅ Shows actual total spent
- ✅ Shows actual active orders

### Test Scenario 4: Check Inventory

**Input:** "Apakah Kaos Basic ada stoknya?"

**Expected Output:**
```
✅ Kaos Basic Crewneck
Status: Tersedia
Stok: 50 unit
```

**Sign of Success:**
- ✅ Shows actual quantity (50)
- ✅ Shows correct availability status

### Test Scenario 5: Out of Stock Product

**Input:** "Apakah Dress Midi Floral tersedia?"

**Expected Output:**
```
❌ Dress Midi Floral
Status: Habis Terjual
Notifikasi: Silakan aktifkan "Beri Tahu Saya"...
```

**Sign of Success:**
- ✅ Shows quantity is 0
- ✅ Correctly says out of stock

### Test Scenario 6: Cancel Order

**Input:** "Batalkan pesanan ORD-2025-001"

**What Should Happen:**
- ✅ If status is PENDING/PROCESSING → Can cancel ✅
- ❌ If status is SHIPPED (like test data) → Should say cannot cancel

**Expected Output:**
```
❌ Pesanan dengan status SHIPPED tidak dapat dibatalkan.
Hanya pesanan dengan status PENDING atau PROCESSING yang dapat dibatalkan.

Untuk membatalkan, silakan hubungi Customer Service.
```

**Sign of Success:**
- ✅ Shows why cancellation isn't possible
- ✅ Explains the status requirement

---

## 🔧 Troubleshooting

### Problem 1: Tools Not Being Called

**Symptoms:**
- Chat returns generic FAQ answers instead of real data
- No API calls visible in logs

**Check This:**
1. Verify system prompt includes tools:
   ```bash
   # Check chat route
   grep "BOT_TOOLS_DEFINITION" app/api/chat/route.ts
   ```

2. Check if Claude is in system prompt:
   ```bash
   # Should see tools listed
   npx prisma studio
   # View chat messages to see prompt
   ```

3. Restart dev server:
   ```bash
   # Kill current server
   npm run dev
   ```

### Problem 2: API Returns 404

**Symptoms:**
- Endpoint not found error
- Tool execution fails silently

**Check This:**
1. Verify files exist:
   ```bash
   ls app/api/bot/order/track/
   ls app/api/bot/payment/verify/
   ls app/api/bot/inventory/check/
   ```

2. Check file naming (must be `route.ts`):
   ```bash
   # Should show route.ts files
   find app/api/bot -name "*.ts"
   ```

3. Restart server (new files need reload):
   ```bash
   npm run dev
   ```

### Problem 3: Database Query Fails

**Symptoms:**
- Tool returns error
- "Cannot find record" message

**Check This:**
1. Verify data exists in Prisma Studio:
   ```bash
   npx prisma studio
   # Navigate to Orders → should see ORD-2025-001
   ```

2. Check customerId matches:
   - Get customer ID from Prisma Studio
   - Use same ID in test requests

3. Verify relationships:
   - Order should link to Customer
   - Order should link to Payment & ShippingTracking

### Problem 4: Wrong Response Format

**Symptoms:**
- Tool returns data but malformed
- Chat can't parse response

**Check This:**
1. Verify response schema in chat route:
   ```bash
   grep "responseSchema" app/api/chat/route.ts
   ```

2. Check service formatting functions:
   ```bash
   # Should have format*ForChat functions
   grep "formatOrderForChat\|formatPaymentForChat" app/lib/*.ts
   ```

3. View actual API response:
   ```bash
   # Use curl to test directly
   curl -X POST http://localhost:3000/api/bot/order/track ...
   # Should return valid JSON
   ```

---

## 📊 Testing Matrix

| Test Case | Input | Expected | Status |
|-----------|-------|----------|--------|
| Track Order | "Mana pesanan?" | Shows tracking # + location | [ ] |
| Check Payment | "Sudah bayar?" | Shows COMPLETED status | [ ] |
| Check Stock | "Ada stok?" | Shows quantity | [ ] |
| Order Summary | "Total pesanan?" | Shows count + spent | [ ] |
| Out of Stock | "Dress ada?" | Shows 0 unit | [ ] |
| Cancel Shipped | "Batalkan" | Cannot cancel message | [ ] |

---

## 🔍 How to Monitor Tool Execution

### In Browser Console (F12):

Check Network tab:
1. Press F12 → Network tab
2. Chat with bot
3. Look for POST requests to `/api/bot/*`
4. Click each request to see:
   - Request body (input)
   - Response body (output)

### In Dev Server Console:

Watch for logs like:
```
🔍 Querying Pinecone with: "Mana pesanan saya"
✅ Pinecone returned 3 results
🚀 Query Processing
✅ Message generation completed
📤 Sending notification...
✅ Agent notified via: email
```

### In Database (Prisma Studio):

After each chat:
1. Go to `npx prisma studio`
2. Check `messages` table
3. Should see new message records
4. View message content to confirm it was saved

---

## ✅ Verification Checklist

Run through this before declaring success:

**Database:**
- [ ] Prisma Studio opens without errors
- [ ] All 6 tables visible
- [ ] Test data loaded (1 customer, 1 order, etc.)
- [ ] Customer ID matches seed data

**API Endpoints:**
- [ ] `/api/bot/order/track` returns 200 + tracking data
- [ ] `/api/bot/payment/verify` returns 200 + payment status
- [ ] `/api/bot/inventory/check` returns 200 + stock info
- [ ] All responses have valid JSON format

**Bot Behavior:**
- [ ] Bot recognizes order numbers in chat
- [ ] Bot shows tracking information (not generic answer)
- [ ] Bot shows payment status (not instructions)
- [ ] Bot shows stock availability (not just "check website")
- [ ] All responses include real data from database

**Logs:**
- [ ] Dev server shows no errors
- [ ] Database queries execute successfully
- [ ] No "404" or "undefined" errors
- [ ] Tool calls are logged when triggered

**Integration:**
- [ ] Chat messages saved to database
- [ ] Metadata stored correctly
- [ ] Tools called automatically (no manual step)
- [ ] Response includes tool_used field

---

## 🎉 Success Criteria

You know everything is working when:

✅ **Chat shows real data**
- Tracking number is actual value, not generic
- Stock quantity shows real number
- Payment status shows actual status

✅ **No errors in console**
- No 404 errors
- No database connection errors
- No JSON parse errors

✅ **All 5 scenarios work**
- Track order ✓
- Check payment ✓
- Check inventory ✓
- Get summary ✓
- Out of stock handling ✓

✅ **Data persists**
- Messages saved to database
- Can see them in Prisma Studio
- Conversation history maintained

---

## 📈 Next Steps After Verification

Once all tests pass:

1. **Create More Test Data**
   ```bash
   npx prisma studio
   # Add more orders, different statuses, etc.
   ```

2. **Test Edge Cases**
   - Non-existent order
   - Multiple orders for same customer
   - Different payment methods
   - Shipped vs pending orders

3. **Connect Real Data**
   - Import actual orders
   - Link real payment records
   - Sync with inventory system
   - Integrate shipping APIs

4. **Monitor Performance**
   - Check query speed (should be <100ms)
   - Monitor database connections
   - Check for N+1 queries

5. **Deploy to Production**
   - Setup environment variables
   - Configure database backups
   - Setup error monitoring
   - Enable API logging

---

## 🆘 Still Having Issues?

Check in this order:
1. **QUICK_START.md** - Setup guide
2. **SYSTEM_INTEGRATION_GUIDE.md** - Detailed reference
3. **Dev Server Logs** - What's actually happening
4. **Prisma Studio** - What's in the database
5. **Network Tab (F12)** - What's being sent/received

If still stuck:
- Share error messages from console
- Show what's in Prisma Studio
- Show network request/response
- Show dev server logs

---

**Ready to test? Open http://localhost:3000 and let's go! 🚀**
