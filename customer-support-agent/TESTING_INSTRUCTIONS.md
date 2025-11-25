# Testing Instructions - Langkah demi Langkah

## 🎯 Objective
Verify bahwa bot bisa **call tools** dan menampilkan **real data** dari database.

---

## 📋 Step 0: Get Your Customer ID

Sebelum testing, Anda perlu customer ID dari seed data:

### Cara 1: Via Prisma Studio
```bash
npx prisma studio
```
- Buka http://localhost:5555
- Klik `customers` table
- Copy nilai `id` field
- Contoh: `clz1a2b3c4d5e6f7g8h9i0j1`

### Cara 2: Via Database Query
```bash
npx prisma db execute --stdin << EOF
SELECT id, phone_number, name FROM customers LIMIT 1;
EOF
```

**Save customer ID untuk step berikutnya!**

---

## ✅ Step 1: Direct API Testing (Verify Endpoints)

### Test A: Track Order

Open terminal dan run:

```bash
curl -X POST http://localhost:3000/api/bot/order/track \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "PASTE_YOUR_CUSTOMER_ID_HERE",
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

**✅ Success Indicators:**
- Status 200 (not 404 or 500)
- `"success": true`
- Shows actual tracking number
- Shows actual carrier
- Shows actual location

---

### Test B: Verify Payment

```bash
curl -X POST http://localhost:3000/api/bot/payment/verify \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "PASTE_YOUR_CUSTOMER_ID_HERE",
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

**✅ Success Indicators:**
- `"success": true`
- `"isPaid": true` (already paid)
- Shows actual payment status

---

### Test C: Check Inventory

```bash
curl -X POST http://localhost:3000/api/bot/inventory/check \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "PASTE_YOUR_CUSTOMER_ID_HERE",
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

**✅ Success Indicators:**
- `"success": true`
- Shows actual quantity (50)
- Shows actual product name
- Correct inStock value

---

### Test D: Get Order Summary

```bash
curl -X POST http://localhost:3000/api/bot/order/summary \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "PASTE_YOUR_CUSTOMER_ID_HERE"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "summary": {
    "totalOrders": 1,
    "activeOrders": 0,
    "totalSpent": 150000,
    "recentOrders": [
      {
        "orderNumber": "ORD-2025-001",
        "status": "SHIPPED",
        "totalAmount": 150000,
        "createdAt": "2025-11-20T10:00:00Z"
      }
    ]
  }
}
```

**✅ Success Indicators:**
- `"success": true`
- Shows actual order count
- Shows actual total spent
- Lists actual recent orders

---

### Test E: Cancel Order

```bash
curl -X POST http://localhost:3000/api/bot/order/cancel \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "PASTE_YOUR_CUSTOMER_ID_HERE",
    "orderNumber": "ORD-2025-001",
    "reason": "Testing cancellation"
  }'
```

**Expected Response (SHOULD FAIL - because SHIPPED):**
```json
{
  "success": false,
  "error": "Pesanan dengan status SHIPPED tidak dapat dibatalkan. Hanya pesanan dengan status PENDING atau PROCESSING yang dapat dibatalkan."
}
```

**⚠️ This is CORRECT behavior!** Test order is SHIPPED, so can't cancel.

---

## 🧪 Step 2: Chat Interface Testing

### Setup
1. Open browser: http://localhost:3000
2. Keep dev server console visible
3. Open browser F12 → Network tab

### Test 1: Track Order

**Type:** `"Mana pesanan saya ORD-2025-001?"`

**What to Expect:**
```
Bot: "📦 Status Pengiriman Pesanan ORD-2025-001

Status: 🚚 Dalam Perjalanan
Kurir: JNE
Nomor Resi: JNE123456789
Lokasi Terakhir: Jakarta
Estimasi Tiba: 26 November 2025

🔗 Lacak Paket Secara Real-time"
```

**Verify These:**
- [ ] Shows actual tracking number (JNE123456789)
- [ ] Shows actual carrier (JNE)
- [ ] Shows actual location (Jakarta)
- [ ] NOT a generic FAQ answer

**Check Dev Console:**
- Should see: `🔍 Querying Pinecone...`
- Should see: `✅ Message generation completed`
- No errors (red text)

**Check Network Tab:**
- Should see POST to `/api/bot/order/track`
- Response should include tracking data

---

### Test 2: Check Payment Status

**Type:** `"Sudah terbayar belum pesanan saya?"`

**What to Expect:**
```
Bot: "✅ Status Pembayaran: Pembayaran Berhasil

Metode: Transfer Bank
Jumlah: Rp150.000
Dibayar: 20 November 2025"
```

**Verify These:**
- [ ] Shows COMPLETED status (not PENDING)
- [ ] Shows actual payment method
- [ ] Shows actual amount
- [ ] NOT payment instructions (since already paid)

---

### Test 3: Check Inventory

**Type:** `"Apakah Kaos Basic Crewneck ada stoknya?"`

**What to Expect:**
```
Bot: "✅ Kaos Basic Crewneck
Status: Tersedia
Stok: 50 unit"
```

**Verify These:**
- [ ] Shows actual quantity (50)
- [ ] Shows correct availability
- [ ] Shows correct product name

---

### Test 4: Out of Stock Item

**Type:** `"Apakah Dress Midi Floral ada?"`

**What to Expect:**
```
Bot: "❌ Dress Midi Floral
Status: Habis Terjual
Notifikasi: Silakan aktifkan 'Beri Tahu Saya'..."
```

**Verify These:**
- [ ] Shows quantity is 0
- [ ] Correctly identifies as out of stock
- [ ] Suggests "Beri Tahu Saya" option

---

### Test 5: Order Summary

**Type:** `"Berapa total pesanan saya?"`

**What to Expect:**
```
Bot: "📊 Ringkasan Pesanan Anda

Total Orders: 1
Active Orders: 0
Total Spent: Rp150.000

Recent Orders:
- ORD-2025-001: SHIPPED"
```

**Verify These:**
- [ ] Shows actual order count (1)
- [ ] Shows actual active orders (0)
- [ ] Shows actual total spent

---

## 🔍 Debugging: If Something Doesn't Work

### Issue 1: Endpoint Returns 404

**Problem:** curl shows "Cannot POST /api/bot/order/track"

**Solution:**
1. Check file exists: `ls app/api/bot/order/track/route.ts`
2. Check spelling: File must be named exactly `route.ts`
3. Restart server: `npm run dev`
4. Wait 2-3 seconds for reload

---

### Issue 2: Bot Ignores Tools, Uses FAQ Instead

**Problem:** Bot responds with generic FAQ instead of calling tools

**Symptoms:**
- Track order → Shows general shipping info (not specific tracking)
- Check payment → Shows payment methods (not actual status)

**Solution:**
1. Check chat route has tools definition:
   ```bash
   grep "BOT_TOOLS_DEFINITION" app/api/chat/route.ts
   ```
   Should return a line (not empty)

2. Restart dev server completely:
   ```bash
   # Kill process
   Ctrl+C

   # Restart
   npm run dev
   ```

3. Check console logs while chatting:
   - Should see `🔍 Querying Pinecone...`
   - Should see `✅ Message generation completed`
   - Look for errors (red text)

---

### Issue 3: API Returns Error

**Problem:** curl response shows `"success": false`

**Check:**
1. Customer ID is correct: `npx prisma studio` → customers table
2. Order number exists: `npx prisma studio` → orders table
3. Product ID exists: `npx prisma studio` → inventory table

**Common Errors:**
```
"error": "Pesanan tidak ditemukan"
→ Check customer owns this order

"error": "Gagal mengambil data pesanan"
→ Database connection issue, restart server

"error": "Cannot reach database"
→ PostgreSQL not running, start Docker
```

---

### Issue 4: Database Queries Slow

**Problem:** Responses take >1 second

**Check:**
1. Database running locally: `docker ps`
2. Check Prisma indexes exist: `npx prisma db execute`
3. Monitor resource usage: `docker stats`

---

## ✅ Final Verification Checklist

Run through these before saying "it's working":

### Database ✅
- [ ] Can open Prisma Studio without errors
- [ ] Tables exist: customers, orders, payments, inventory, shipping_tracking
- [ ] Test data visible: 1 customer, 1 order, etc.

### API Endpoints ✅
- [ ] All 5 curl tests return `"success": true`
- [ ] No 404 or 500 errors
- [ ] Responses contain real data (not empty)

### Bot Chat ✅
- [ ] Track order shows actual tracking number
- [ ] Check payment shows actual status
- [ ] Check stock shows actual quantity
- [ ] Summary shows actual counts
- [ ] Out of stock detected correctly

### Logs & Console ✅
- [ ] Dev server shows no errors
- [ ] Database queries logged successfully
- [ ] Network tab shows POST requests to `/api/bot/*`

### Data Persistence ✅
- [ ] Chat messages saved to database
- [ ] Can see them in Prisma Studio messages table
- [ ] Conversation history maintained

---

## 🎉 Success!

If all checks above pass, congratulations! 🎊

**Your bot system integration is working!**

Next steps:
1. Create more test data (different order statuses)
2. Test edge cases (non-existent order, etc.)
3. Connect to real data sources
4. Monitor performance in production

---

## 📞 Stuck?

1. **Check logs** - Dev server console
2. **Check database** - Prisma Studio (npx prisma studio)
3. **Check network** - Browser F12 Network tab
4. **Check files** - Verify all files exist in right locations
5. **Restart server** - npm run dev

---

**Ready? Start with Step 1 curl commands above! 🚀**
