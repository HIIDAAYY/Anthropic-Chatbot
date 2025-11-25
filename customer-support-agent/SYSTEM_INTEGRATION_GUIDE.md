# System Integration Guide

## Overview

Sudah ditambahkan **5 sistem terintegrasi** ke bot customer support Anda:

1. **Order Management System** - Track, cancel, dan lihat summary pesanan
2. **Payment Gateway** - Verify pembayaran dan berikan instruksi pembayaran
3. **Inventory Management** - Check real-time stock produk
4. **Shipping Tracking** - Lacak pengiriman pesanan
5. **CRM System** - Customer data dan history (via Prisma database)

---

## Architecture

```
Customer Chat
    ↓
Claude API (Chat Endpoint)
    ↓
[System Prompt dengan Bot Tools Definition]
    ↓
Bot Mencapai Keputusan: Gunakan Tool atau FAQ?
    ├─ Jika perlu data real-time → Execute Bot Tool
    └─ Jika FAQ info cukup → Use Knowledge Base
    ↓
Bot Tool Endpoints
├─ /api/bot/order/track
├─ /api/bot/order/cancel
├─ /api/bot/order/summary
├─ /api/bot/payment/verify
└─ /api/bot/inventory/check
    ↓
Service Layer
├─ order-service.ts
├─ payment-service.ts
├─ inventory-service.ts
├─ shipping-service.ts
    ↓
PostgreSQL Database (Prisma ORM)
├─ Order
├─ OrderItem
├─ Payment
├─ Inventory
├─ ShippingTracking
└─ [Existing Customer/Conversation models]
```

---

## Database Setup

### 1. Run Prisma Migration

Sebelum menggunakan features ini, jalankan migration untuk create table baru:

```bash
# Pastikan database sudah running
docker-compose up -d  # atau start PostgreSQL Anda

# Run migration
npx prisma migrate dev --name add_order_payment_inventory_shipping
```

### 2. Database Schema

5 model baru sudah ditambahkan ke `prisma/schema.prisma`:

- **Order** - Menyimpan info pesanan (orderNumber, status, totalAmount, shippingAddress)
- **OrderItem** - Item dalam pesanan (productId, quantity, price)
- **Payment** - Rekam pembayaran (orderId, amount, method, status)
- **Inventory** - Stock produk (productId, quantity)
- **ShippingTracking** - Info pengiriman (trackingNumber, carrier, status, location)

---

## Bot Tools (Functions)

Bot sekarang dapat memanggil 5 tools untuk resolve customer issues:

### 1. **track_order**

Melacak status pengiriman pesanan.

**Kapan digunakan:**
- "Di mana pesananku?"
- "Kapan paket sampai?"
- "Sudah dikirim belum?"

**API Endpoint:** `POST /api/bot/order/track`

**Input:**
```json
{
  "customerId": "string",
  "orderNumber": "string"
}
```

**Output:**
```json
{
  "success": true,
  "tracking": {
    "orderNumber": "ORD-2025-001",
    "trackingNumber": "JNE123456789",
    "carrier": "jne",
    "status": "IN_TRANSIT",
    "currentLocation": "Jakarta",
    "estimatedDelivery": "2025-11-26T00:00:00Z"
  },
  "orderStatus": "SHIPPED"
}
```

---

### 2. **cancel_order**

Membatalkan pesanan (hanya jika status PENDING atau PROCESSING).

**Kapan digunakan:**
- "Batalkan pesanan saya"
- "Saya ingin membatalkan order #123"

**API Endpoint:** `POST /api/bot/order/cancel`

**Input:**
```json
{
  "customerId": "string",
  "orderNumber": "string",
  "reason": "string (optional)"
}
```

**Output:**
```json
{
  "success": true,
  "message": "Pesanan ORD-2025-001 telah dibatalkan",
  "orderNumber": "ORD-2025-001"
}
```

**Batasan:**
- Hanya bisa batalkan order dengan status `PENDING` atau `PROCESSING`
- Jika sudah `SHIPPED` atau `DELIVERED`, arahkan ke human agent

---

### 3. **get_order_summary**

Melihat ringkasan pesanan customer (total orders, active orders, recent orders).

**Kapan digunakan:**
- "Berapa total pesanan saya?"
- "Pesanan apa yang sedang aktif?"
- "Tunjukkan history pesanan saya"

**API Endpoint:** `POST /api/bot/order/summary`

**Input:**
```json
{
  "customerId": "string"
}
```

**Output:**
```json
{
  "success": true,
  "summary": {
    "totalOrders": 5,
    "activeOrders": 1,
    "totalSpent": 500000,
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

---

### 4. **verify_payment**

Mengecek status pembayaran dan memberikan instruksi jika belum terbayar.

**Kapan digunakan:**
- "Sudah terbayar belum?"
- "Bagaimana cara bayar?"
- "Saya sudah transfer, kok belum terverifikasi?"

**API Endpoint:** `POST /api/bot/payment/verify`

**Input:**
```json
{
  "customerId": "string",
  "orderNumber": "string",
  "detailed": false
}
```

**Output (Belum Terbayar):**
```json
{
  "success": true,
  "isPaid": false,
  "instructions": "💳 **Instruksi Transfer Bank**\n\nJumlah: Rp150.000\nReferensi: ORD-2025-001\n\n📍 Ke salah satu rekening UrbanStyle ID:\n- BCA: 1234567890..."
}
```

**Output (Sudah Terbayar):**
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

---

### 5. **check_inventory**

Mengecek ketersediaan stok produk secara real-time.

**Kapan digunakan:**
- "Apakah kaos ukuran M ada?"
- "Berapa stok produk X?"
- "Produk ini masih dijual nggak?"

**API Endpoint:** `POST /api/bot/inventory/check`

**Input (Single Product):**
```json
{
  "productIds": ["prod-001"],
  "quantities": [2]
}
```

**Input (Multiple Products):**
```json
{
  "productIds": ["prod-001", "prod-002", "prod-003"]
}
```

**Output:**
```json
{
  "success": true,
  "stocks": [
    {
      "productId": "prod-001",
      "productName": "Kaos Basic Crewneck",
      "quantity": 25,
      "inStock": true
    }
  ],
  "totalProducts": 1,
  "productsInStock": 1
}
```

---

## Service Layer

Setiap tool punya service file yang handle business logic:

### [order-service.ts](app/lib/order-service.ts)

**Functions:**
- `getCustomerOrders(customerId)` - Get all orders
- `getOrderByNumber(customerId, orderNumber)` - Get specific order
- `getOrderSummary(customerId)` - Get summary
- `cancelOrder(customerId, orderNumber, reason)` - Cancel order
- `updateShippingAddress(customerId, orderNumber, newAddress)` - Update address
- `formatOrderForChat(order)` - Format untuk display di chat

### [payment-service.ts](app/lib/payment-service.ts)

**Functions:**
- `getPaymentStatus(customerId, orderNumber)` - Get payment info
- `verifyPayment(customerId, orderNumber)` - Check if paid
- `getPaymentInstructions(customerId, orderNumber)` - Get payment steps
- `formatPaymentForChat(payment)` - Format untuk display

**Payment Methods Supported:**
- `bank_transfer` - Transfer Bank (BCA, Mandiri)
- `e_wallet` - E-Wallet (GoPay, OVO, ShopeePay)
- `credit_card` - Kartu Kredit
- `cod` - Cash on Delivery

### [inventory-service.ts](app/lib/inventory-service.ts)

**Functions:**
- `checkProductStock(productId)` - Check single product
- `checkMultipleProductsStock(productIds)` - Check multiple
- `canOrderProduct(productId, requestedQuantity)` - Check if can order
- `getLowStockProducts()` - Get low stock items
- `getOutOfStockProducts()` - Get out of stock
- `updateProductStock(productId, newQuantity, reason)` - Update stock

### [shipping-service.ts](app/lib/shipping-service.ts)

**Functions:**
- `getShippingTracking(customerId, orderNumber)` - Get tracking info
- `getCustomerShipments(customerId)` - Get recent shipments
- `updateShippingStatus(orderNumber, newStatus, location)` - Update status
- `getTrackingUrl(trackingNumber, carrier)` - Get tracking link
- `isOrderDelivered(customerId, orderNumber)` - Check delivery status

**Shipping Carriers Supported:**
- `jne` - JNE
- `sicepat` - SiCepat
- `tiki` - TIKI
- `pos` - POS Indonesia
- `gofresh` - GoFresh

**Shipping Statuses:**
- `PROCESSING` - Sedang diproses
- `PENDING_PICKUP` - Menunggu pengambilan
- `IN_TRANSIT` - Dalam perjalanan
- `OUT_FOR_DELIVERY` - Sedang diantar
- `DELIVERED` - Terkirim
- `FAILED` - Gagal
- `RETURNED` - Dikembalikan

---

## Seeding Test Data

Untuk test bot dengan data real, Anda perlu seed database. Buat file `prisma/seed.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Buat customer
  const customer = await prisma.customer.create({
    data: {
      phoneNumber: "081234567890",
      name: "Adi Mulyana",
    },
  });

  // Buat order
  const order = await prisma.order.create({
    data: {
      orderNumber: "ORD-2025-001",
      customerId: customer.id,
      totalAmount: 150000,
      shippingAddress: "Jl. Merdeka No. 123, Jakarta",
      status: "SHIPPED",
      shippingMethod: "regular",
      items: {
        create: [
          {
            productId: "KAOS-001",
            productName: "Kaos Basic Crewneck",
            quantity: 1,
            price: 79000,
            subtotal: 79000,
          },
          {
            productId: "CELANA-001",
            productName: "Celana Chino Slim Fit",
            quantity: 1,
            price: 59000,
            subtotal: 59000,
          },
        ],
      },
      payment: {
        create: {
          amount: 150000,
          method: "bank_transfer",
          status: "COMPLETED",
          transactionId: "TRX-123456",
          paidAt: new Date("2025-11-20"),
        },
      },
      shipping: {
        create: {
          trackingNumber: "JNE123456789",
          carrier: "jne",
          currentStatus: "IN_TRANSIT",
          currentLocation: "Jakarta",
          estimatedDelivery: new Date("2025-11-26"),
          shippedAt: new Date("2025-11-21"),
        },
      },
    },
  });

  // Buat inventory
  await prisma.inventory.createMany({
    data: [
      {
        productId: "KAOS-001",
        productName: "Kaos Basic Crewneck",
        quantity: 50,
        warehouseLocation: "Jakarta",
      },
      {
        productId: "CELANA-001",
        productName: "Celana Chino Slim Fit",
        quantity: 30,
        warehouseLocation: "Jakarta",
      },
      {
        productId: "DRESS-001",
        productName: "Dress Midi Floral",
        quantity: 0,
        warehouseLocation: "Jakarta",
      },
    ],
  });

  console.log("✅ Seed data created successfully!");
  console.log(`Customer ID: ${customer.id}`);
  console.log(`Order: ${order.orderNumber}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Kemudian run:

```bash
npx prisma db seed
```

---

## Testing Bot with Tools

### Test Flow 1: Track Order

**Customer:** "Mana pesanan saya ORD-2025-001?"

**Bot akan:**
1. Detect ada order number dalam pertanyaan
2. Call `track_order` tool
3. Get tracking info dari database
4. Return detailed tracking info + estimated delivery

**Expected Response:**
```
📦 Status Pengiriman Pesanan ORD-2025-001

Status: 🚚 Dalam Perjalanan
Kurir: JNE
Nomor Resi: JNE123456789
Lokasi Terakhir: Jakarta
Estimasi Tiba: 26 November 2025

🔗 Lacak Paket Secara Real-time (dengan link ke JNE)
```

### Test Flow 2: Check Payment Status

**Customer:** "Sudah terbayar belum pesanan saya?"

**Bot akan:**
1. Identify pesanan yang ditanya
2. Call `verify_payment` tool
3. Check payment status
4. Return status + instruksi jika belum terbayar

**Expected Response (Sudah Terbayar):**
```
✅ Status Pembayaran: Pembayaran Berhasil

Metode: Transfer Bank
Jumlah: Rp150.000
Dibayar: 20 November 2025
```

### Test Flow 3: Check Inventory

**Customer:** "Apakah Kaos Basic Crewneck ukuran M masih ada?"

**Bot akan:**
1. Parse pertanyaan → identify product
2. Call `check_inventory` tool
3. Get stock dari database
4. Return availability info

**Expected Response:**
```
✅ Kaos Basic Crewneck
Status: Tersedia
Stok: 50 unit
```

---

## Implementation Checklist

Untuk fully integrate sistem ini:

- [ ] **Migrate Database**
  ```bash
  npx prisma migrate dev --name add_order_payment_inventory_shipping
  ```

- [ ] **Seed Test Data**
  ```bash
  npx prisma db seed
  ```

- [ ] **Run Development Server**
  ```bash
  npm run dev
  ```

- [ ] **Test Bot with Order Number**
  - Open web interface
  - Chat: "Lacak pesanan ORD-2025-001"
  - Verify bot calls track_order endpoint
  - Verify response shows shipping info

- [ ] **Test Bot with Payment**
  - Chat: "Apakah ORD-2025-001 sudah terbayar?"
  - Verify bot shows payment status

- [ ] **Test Bot with Stock**
  - Chat: "Apakah Kaos Basic Crewneck ada stoknya?"
  - Verify bot shows inventory status

- [ ] **Monitor Logs**
  - Check console untuk tool execution logs
  - Verify database queries berhasil

---

## Next Steps (Future Enhancements)

### 1. **Real Payment Gateway Integration**
Ganti mock payment data dengan integration:
- Stripe / PayPal
- Midtrans (untuk Indonesia)
- Custom payment processor

### 2. **Real Shipping API Integration**
Ganti mock tracking data:
- JNE API untuk real tracking
- SiCepat API
- Integrate dengan semua carrier

### 3. **Real Inventory Sync**
Connect ke actual inventory system:
- Real-time stock updates
- Auto-restock notifications
- Low stock alerts

### 4. **Advanced Features**
- Order modifications after payment
- Refund processing automation
- Upsell recommendations based on order history
- Subscription orders
- Pre-order management

### 5. **Analytics**
- Track bot tool usage
- Identify most used features
- Customer satisfaction metrics
- Tool success/failure rates

---

## Troubleshooting

### "Cannot reach database server"
```bash
# Ensure PostgreSQL running
docker-compose up -d

# Check connection
npx prisma db execute --stdin < /dev/null
```

### "Tool endpoint returns 404"
- Check route file exists: `/api/bot/[tool]/[action]/route.ts`
- Verify service functions imported correctly
- Check JSON input format

### "customerId not recognized"
- Verify sessionId passed correctly from frontend
- Check if customer exists in database:
  ```bash
  npx prisma studio
  ```

### Tools not being called
- Verify BOT_TOOLS_DEFINITION imported in chat route
- Check Claude system prompt includes tool definitions
- Monitor logs for tool parsing

---

## Production Checklist

Sebelum deploy ke production:

- [ ] Setup environment variables untuk database
- [ ] Run migrations di production database
- [ ] Setup error monitoring (Sentry, etc.)
- [ ] Add API rate limiting untuk bot endpoints
- [ ] Add input validation/sanitization
- [ ] Setup database backups
- [ ] Monitor API performance
- [ ] Setup alerts untuk tool failures
- [ ] Test failover scenarios
- [ ] Document custom configurations

---

**Status:** ✅ System integration fully implemented and ready for development!
