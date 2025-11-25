# System Integration Architecture

## High-Level Flow

```
Customer Chat Input
    ↓
Claude API (Chat Endpoint)
    ↓
[Bot Decision: FAQ or Tool?]
    ├─ Real-time data needed? → Use Bot Tool
    └─ Static info ok? → Use FAQ/RAG
    ↓
[If Tool: Execute]
    ├─ Call /api/bot/[tool]/[action]
    ├─ Service Layer processes request
    ├─ Query PostgreSQL via Prisma
    └─ Return formatted response
    ↓
Response to Customer
```

---

## System Diagram

```
┌─────────────────────────────────┐
│   CUSTOMER CHAT INTERFACE       │
│   (Web, WhatsApp, etc.)         │
└────────────┬────────────────────┘
             │
             ▼
    ┌─────────────────────┐
    │   /api/chat route   │
    │  Claude API Call    │
    └────────┬────────────┘
             │
      ┌──────┴──────┐
      │             │
      ▼             ▼
  ┌────────┐    ┌──────────────────┐
  │  RAG   │    │  BOT TOOLS       │
  │(FAQ)   │    │ (NEW!)           │
  │        │    │ ├─ track_order   │
  │Pinecone│    │ ├─ cancel_order  │
  └────────┘    │ ├─ get_summary   │
                │ ├─ verify_payment│
                │ └─ check_inv     │
                └────────┬─────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
    ┌────────────┐  ┌───────────┐  ┌─────────────┐
    │ Order      │  │ Payment   │  │ Inventory   │
    │ Service    │  │ Service   │  │ Service     │
    └─────┬──────┘  └─────┬─────┘  └──────┬──────┘
          │                │               │
          └────────────────┼───────────────┘
                           │
                           ▼
                ┌──────────────────────┐
                │ Prisma ORM           │
                │ (Type-safe queries)  │
                └──────────┬───────────┘
                           │
                           ▼
                ┌──────────────────────┐
                │  PostgreSQL Database │
                │                      │
                │ ├─ Order            │
                │ ├─ OrderItem        │
                │ ├─ Payment          │
                │ ├─ Inventory        │
                │ └─ ShippingTracking  │
                └──────────────────────┘
```

---

## Bot Tools (5 APIs)

### 1. Track Order

**When:** Customer asks "Where's my order?", "When will it arrive?"

**Endpoint:** `POST /api/bot/order/track`

**Flow:**
```
Input: {customerId, orderNumber}
  ↓
order-service.getOrderByNumber()
  ↓
shipping-service.getShippingTracking()
  ↓
Query: ShippingTracking table
  ↓
Output: {trackingNumber, carrier, status, location, estimatedDelivery}
```

**Example Response:**
```json
{
  "success": true,
  "tracking": {
    "trackingNumber": "JNE123456789",
    "carrier": "jne",
    "status": "IN_TRANSIT",
    "currentLocation": "Jakarta",
    "estimatedDelivery": "2025-11-26"
  }
}
```

---

### 2. Cancel Order

**When:** Customer says "Cancel my order"

**Endpoint:** `POST /api/bot/order/cancel`

**Restrictions:**
- ✅ Can cancel: PENDING, PROCESSING
- ❌ Cannot cancel: SHIPPED, DELIVERED, CANCELLED

**Flow:**
```
Input: {customerId, orderNumber, reason}
  ↓
order-service.cancelOrder()
  ↓
Check status in Order table
  ↓
If PENDING/PROCESSING:
  Update status → CANCELLED
  ✅ Success

If SHIPPED/DELIVERED:
  ❌ Cannot cancel
  Redirect to agent
```

---

### 3. Order Summary

**When:** "How many orders do I have?", "Show my order history"

**Endpoint:** `POST /api/bot/order/summary`

**Flow:**
```
Input: {customerId}
  ↓
order-service.getOrderSummary()
  ↓
Query: Order + Payment tables
  ↓
Calculate:
  - totalOrders (count)
  - activeOrders (not DELIVERED/CANCELLED)
  - totalSpent (sum amounts where paid)
  - recentOrders (last 3)
  ↓
Output: {totalOrders, activeOrders, totalSpent, recentOrders}
```

---

### 4. Verify Payment

**When:** "Is it paid?", "How do I pay?", "Payment instructions"

**Endpoint:** `POST /api/bot/payment/verify`

**Flow:**
```
Input: {customerId, orderNumber, detailed}
  ↓
payment-service.verifyPayment()
  ↓
Query: Payment table
  ↓
If COMPLETED:
  ✅ isPaid = true
  Return status

If PENDING:
  ❌ isPaid = false
  Generate instructions based on method:
  - Bank Transfer → Account numbers + confirmation steps
  - E-Wallet → Which e-wallets accepted
  - Credit Card → Secure payment link
  - COD → Instructions for delivery
```

---

### 5. Check Inventory

**When:** "Is it in stock?", "How much stock?", "Available?"

**Endpoint:** `POST /api/bot/inventory/check`

**Flow:**
```
Input: {productIds, quantities (optional)}
  ↓
inventory-service.checkProductStock() or checkMultipleProductsStock()
  ↓
Query: Inventory table
  ↓
If quantity provided:
  Can order this much? → true/false

Otherwise:
  Just return current quantity
  inStock = (quantity > 0)
  ↓
Output: {productId, quantity, inStock}
```

---

## Service Layer

### order-service.ts

```typescript
getCustomerOrders(customerId)
├─ Get all orders for customer
├─ Include items, payment, shipping
└─ Return array of orders

getOrderByNumber(customerId, orderNumber)
├─ Get specific order
├─ Verify customer ownership
└─ Return order with relations

getOrderSummary(customerId)
├─ Count total orders
├─ Count active orders
├─ Sum total spent
└─ Return summary

cancelOrder(customerId, orderNumber, reason)
├─ Find order
├─ Check status (PENDING or PROCESSING)
├─ Update to CANCELLED
└─ Return success/error

formatOrderForChat(order)
└─ Format for nice display in chat
```

### payment-service.ts

```typescript
getPaymentStatus(customerId, orderNumber)
├─ Find payment record
├─ Return status + details
└─ Handle no payment scenario

verifyPayment(customerId, orderNumber)
├─ Check if isPaid
├─ Return boolean
└─ Include payment details

getPaymentInstructions(customerId, orderNumber)
├─ Check payment method
├─ Generate instructions:
│  ├─ bank_transfer → account + reference
│  ├─ e_wallet → options + link
│  ├─ credit_card → secure payment
│  └─ cod → delivery instructions
└─ Return formatted instructions

formatPaymentForChat(payment)
└─ Format status for nice display
```

### inventory-service.ts

```typescript
checkProductStock(productId)
├─ Find product in inventory
├─ Return quantity + availability
└─ Handle not found

checkMultipleProductsStock(productIds)
├─ Get all requested products
├─ Return map of {productId: stock}
└─ Show in-stock count

canOrderProduct(productId, requestedQuantity)
├─ Check if enough stock
├─ Return {canOrder, availableQuantity}
└─ Handle insufficient stock

formatStockForChat(stock)
└─ Format availability for display
```

### shipping-service.ts

```typescript
getShippingTracking(customerId, orderNumber)
├─ Find shipping record
├─ Return tracking + status
└─ Handle not shipped

getCustomerShipments(customerId)
├─ Get recent shipments (5 most)
├─ Include tracking info
└─ Return shipments array

getTrackingUrl(trackingNumber, carrier)
├─ Generate tracking link per carrier:
│  ├─ jne → tracking.jne.co.id
│  ├─ sicepat → tracking.sicepat.com
│  ├─ tiki → tiki.id/tracking
│  ├─ pos → posindonesia.co.id
│  └─ gofresh → gofresh.gojek.com
└─ Return URL or null

formatShippingForChat(shipping)
└─ Format with status + tracking link
```

---

## Database Tables

### Order Table
```sql
CREATE TABLE orders (
  id CUID PRIMARY KEY,
  order_number VARCHAR UNIQUE NOT NULL,
  customer_id CUID NOT NULL (FK),
  status OrderStatus DEFAULT PENDING,
  total_amount INT,
  shipping_address TEXT,
  estimated_delivery TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,

  INDEXES: customer_id, order_number, status
)
```

### Payment Table
```sql
CREATE TABLE payments (
  id CUID PRIMARY KEY,
  order_id CUID UNIQUE NOT NULL (FK),
  amount INT,
  method PaymentMethod,
  status PaymentStatus DEFAULT PENDING,
  transaction_id VARCHAR,
  paid_at TIMESTAMP,
  invoice_url VARCHAR,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,

  INDEXES: order_id, status
)
```

### Inventory Table
```sql
CREATE TABLE inventory (
  id CUID PRIMARY KEY,
  product_id VARCHAR UNIQUE NOT NULL,
  product_name VARCHAR,
  quantity INT,
  warehouse_location VARCHAR,
  last_updated TIMESTAMP,

  No indexes (small table)
)
```

### ShippingTracking Table
```sql
CREATE TABLE shipping_tracking (
  id CUID PRIMARY KEY,
  order_id CUID UNIQUE NOT NULL (FK),
  tracking_number VARCHAR UNIQUE,
  carrier ShippingCarrier,
  current_status ShippingStatus DEFAULT PROCESSING,
  current_location VARCHAR,
  estimated_delivery TIMESTAMP,
  delivered_at TIMESTAMP,
  shipped_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,

  INDEXES: order_id, tracking_number, current_status
)
```

---

## API Response Format

All endpoints return consistent JSON:

**Success:**
```json
{
  "success": true,
  "data": {...},
  "message": "Operation completed"
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE"
}
```

---

## Data Flow Example: Track Order

```
User Message:
"Mana pesanan saya ORD-2025-001?"

↓

Chat API receives:
{messages: [{role: "user", content: "..."}], sessionId, ...}

↓

Claude System Prompt:
"You have access to these tools: track_order, cancel_order, ..."

↓

Claude generates response JSON:
{
  "thinking": "User wants to track order...",
  "response": "Saya akan melacak pesanan Anda...",
  "tools_used": ["track_order"]
}

↓

Chat API processes tools_used:
Parse: "track_order"
Call: executeBotAction({tool: "track_order", input: {customerId, orderNumber}})

↓

POST /api/bot/order/track
Input: {customerId: "cust_123", orderNumber: "ORD-2025-001"}

↓

order-service.getOrderByNumber():
SELECT * FROM orders WHERE order_number = 'ORD-2025-001' AND customer_id = 'cust_123'

↓

shipping-service.getShippingTracking():
SELECT * FROM shipping_tracking WHERE order_id = 'order_123'

↓

formatShippingForChat():
"📦 Status Pengiriman ORD-2025-001
Status: Dalam Perjalanan
Kurir: JNE
Nomor Resi: JNE123456789
Estimasi: 26 November 2025"

↓

Chat API returns formatted response:
{
  "response": "✅ Pesanan Anda sedang...\n📦 JNE123456789",
  "tools_used": ["track_order"]
}

↓

User sees real tracking information ✅
```

---

## Key Features

✅ **Type-Safe:** Prisma ORM ensures type safety
✅ **Error Handling:** Try-catch in all services
✅ **Formatting:** Consistent display in chat
✅ **Performance:** Indexed queries for speed
✅ **Security:** SQL injection safe (ORM)
✅ **Scalable:** Modular design for easy expansion

---

## What's Next?

1. **Setup Database** → `npx prisma migrate dev`
2. **Seed Data** → `npx prisma db seed`
3. **Test Tools** → Chat with bot
4. **Connect Real Data** → Import actual orders/payments/inventory
5. **Add More Features** → Refunds, returns, recommendations

See [QUICK_START.md](QUICK_START.md) for testing instructions.
