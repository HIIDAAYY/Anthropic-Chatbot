# Quick Start: System Integration Setup

## Prerequisites
- PostgreSQL running locally (port 5433) atau Docker
- Node.js 18+
- npm or yarn

---

## Step 1: Setup Database (5 min)

### Option A: Using Docker Compose
```bash
# Ensure Docker is running
docker-compose up -d

# Verify connection
npx prisma db execute --stdin < /dev/null
```

### Option B: Using Existing PostgreSQL
Update `.env.local`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/urbanstyle_cs"
```

---

## Step 2: Run Prisma Migration (2 min)

```bash
# Apply schema changes
npx prisma migrate dev --name add_order_payment_inventory_shipping
```

**What it does:**
- Creates 5 new tables (Order, OrderItem, Payment, Inventory, ShippingTracking)
- Adds indexes for performance
- Updates Customer table to link to Order

---

## Step 3: Seed Test Data (1 min)

### Create prisma/seed.ts:
```bash
# Copy the seed file
cp SYSTEM_INTEGRATION_GUIDE.md# (Look for seed code section and create file)
```

### Or manually create test data:
```bash
npx prisma studio
```

Then create:
1. Customer: `phoneNumber: "081234567890"`, `name: "Test User"`
2. Order: `orderNumber: "ORD-2025-001"`, `status: "SHIPPED"`
3. Payment: `status: "COMPLETED"`
4. ShippingTracking: `trackingNumber: "JNE123456789"`
5. Inventory: `productName: "Kaos Basic"`, `quantity: 50`

---

## Step 4: Start Dev Server (1 min)

```bash
npm run dev
```

Output should show:
```
ready - started server on 0.0.0.0:3000
```

---

## Step 5: Test Bot (5 min)

### Test 1: Order Tracking
Open http://localhost:3000

**Chat:**
```
"Mana pesanan saya ORD-2025-001?"
```

**Expected Response:**
```
📦 Status Pengiriman Pesanan ORD-2025-001

Status: 🚚 Dalam Perjalanan
Kurir: JNE
Nomor Resi: JNE123456789
Lokasi Terakhir: Jakarta
Estimasi Tiba: 26 November 2025

🔗 Lacak Paket Secara Real-time
```

### Test 2: Payment Verification
**Chat:**
```
"Apakah pesanan ORD-2025-001 sudah terbayar?"
```

**Expected Response:**
```
✅ Status Pembayaran: Pembayaran Berhasil

Metode: Transfer Bank
Jumlah: Rp150.000
Dibayar: 20 November 2025
```

### Test 3: Order Summary
**Chat:**
```
"Berapa total pesanan saya?"
```

**Expected Response:**
```
📊 Ringkasan Pesanan

Total Orders: 1
Active Orders: 0
Total Spent: Rp150.000

Recent Orders:
- ORD-2025-001: SHIPPED (Rp150.000)
```

### Test 4: Order Cancellation
**Chat:**
```
"Batalkan pesanan ORD-2025-001"
```

**Note:** Will only work if order status is PENDING or PROCESSING. If already SHIPPED, bot will say cannot cancel.

### Test 5: Inventory Check
**Chat:**
```
"Apakah Kaos Basic ada stoknya?"
```

**Expected Response:**
```
✅ Kaos Basic
Status: Tersedia
Stok: 50 unit
```

---

## Verify It's Working

### Check Console Logs
```
🔍 Querying Pinecone...
🚀 Query Processing
✅ Message generation completed
📤 Sending notification to agent...
```

### Check Database
```bash
npx prisma studio
```

Navigate to Tables → Orders → View data was saved correctly

### Check API Endpoints Directly

```bash
# Test order tracking
curl -X POST http://localhost:3000/api/bot/order/track \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "YOUR_CUSTOMER_ID",
    "orderNumber": "ORD-2025-001"
  }'

# Test inventory check
curl -X POST http://localhost:3000/api/bot/inventory/check \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "YOUR_CUSTOMER_ID",
    "productIds": ["KAOS-001"]
  }'
```

---

## Troubleshooting

### Error: "Can't reach database server"
```bash
# Check if PostgreSQL is running
docker ps

# Or start it
docker-compose up -d
```

### Error: "Prisma client not generated"
```bash
npm install
npx prisma generate
```

### Bot doesn't call tools
- Check system prompt includes `BOT_TOOLS_DEFINITION`
- Verify chat endpoint is at `/api/chat`
- Monitor console for logs
- Check request format (customerId in tool input)

### Tools return 404
- Verify route files exist in `/api/bot/`
- Check file naming: `route.ts` not `route.js`
- Restart dev server after creating files

### Data not in database
- Verify migration ran: `npx prisma migrate status`
- Check database connection: `npx prisma db execute`
- Use Prisma Studio to view: `npx prisma studio`

---

## What's Next?

### 1. Connect Real Data
Replace mock data with your actual systems:
- Import existing orders from order management system
- Sync payment data from payment gateway
- Connect to inventory management
- Integrate with shipping APIs

### 2. Test Edge Cases
```
# Test scenarios:
- Order that doesn't exist
- Customer with multiple orders
- Product out of stock
- Payment that failed
- Shipping with no tracking number
```

### 3. Monitor & Optimize
```bash
# Monitor query performance
npm run dev -- --debug

# Check database indexes
npx prisma db push

# View slow queries
# (depends on your PostgreSQL setup)
```

### 4. Add More Features
- Refund processing
- Return/exchange handling
- Coupon/voucher support
- Product recommendations
- Order history analytics

---

## File Reference

Key files to understand:

```
project-root/
├── prisma/
│   └── schema.prisma          ← Database schema (5 new models)
├── app/lib/
│   ├── order-service.ts       ← Order operations
│   ├── payment-service.ts     ← Payment operations
│   ├── inventory-service.ts   ← Stock management
│   ├── shipping-service.ts    ← Tracking operations
│   └── bot-tools.ts           ← Tool execution
├── app/api/
│   ├── chat/route.ts          ← Updated chat endpoint (includes tools)
│   └── bot/
│       ├── order/track        ← Track order
│       ├── order/cancel       ← Cancel order
│       ├── order/summary      ← Order summary
│       ├── payment/verify     ← Verify payment
│       └── inventory/check    ← Check stock
├── SYSTEM_INTEGRATION_GUIDE.md ← Full documentation
├── IMPLEMENTATION_SUMMARY.md   ← What was built
└── QUICK_START.md             ← This file
```

---

## Success Indicators

✅ You know it's working when:

1. **Database Connected**
   - `npx prisma studio` opens without errors
   - Can see Order, Payment, Inventory tables

2. **APIs Working**
   - curl requests return JSON (not 404)
   - Console logs show tool execution

3. **Bot Using Tools**
   - Bot asks for order number when customer mentions order
   - Bot calls tracking endpoint
   - Response includes real shipping data

4. **Data Persistence**
   - Messages saved to database
   - Orders visible in Prisma Studio
   - Payment status accurate

---

## Estimated Timeline

```
⏱️ Total Setup Time: ~20-30 minutes

5 min   → Database setup
2 min   → Prisma migration
1 min   → Seed data
1 min   → Start server
5 min   → Test all 5 bot tools
5-10 min → Verify, troubleshoot, celebrate! 🎉
```

---

## Questions?

Check these docs in order:
1. **QUICK_START.md** (this file) - Setup & testing
2. **SYSTEM_INTEGRATION_GUIDE.md** - Detailed documentation
3. **IMPLEMENTATION_SUMMARY.md** - Architecture overview

---

**Ready? Let's go! 🚀**

```bash
npm run dev
# Open http://localhost:3000
# Chat: "Lacak pesanan ORD-2025-001"
# Watch the magic happen ✨
```
