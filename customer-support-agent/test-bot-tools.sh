#!/bin/bash

# Bot Tools Testing Script
# Run this to verify all 5 bot tools are working

echo "🚀 Starting Bot Tools Verification..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:3000"
CUSTOMER_ID="YOUR_CUSTOMER_ID"  # Replace with actual ID from Prisma Studio
ORDER_NUMBER="ORD-2025-001"
PRODUCT_ID="KAOS-001"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}NOTE: Replace CUSTOMER_ID with actual ID from Prisma Studio${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test 1: Track Order
echo -e "${YELLOW}Test 1: Track Order${NC}"
echo "Endpoint: POST /api/bot/order/track"
echo "Input: {customerId: $CUSTOMER_ID, orderNumber: $ORDER_NUMBER}"
echo ""

RESPONSE=$(curl -s -X POST "$BASE_URL/api/bot/order/track" \
  -H "Content-Type: application/json" \
  -d "{
    \"customerId\": \"$CUSTOMER_ID\",
    \"orderNumber\": \"$ORDER_NUMBER\"
  }")

echo -e "${GREEN}Response:${NC}"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""
echo "✓ Expected: tracking number, carrier, status, location"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 2: Verify Payment
echo -e "${YELLOW}Test 2: Verify Payment${NC}"
echo "Endpoint: POST /api/bot/payment/verify"
echo "Input: {customerId: $CUSTOMER_ID, orderNumber: $ORDER_NUMBER}"
echo ""

RESPONSE=$(curl -s -X POST "$BASE_URL/api/bot/payment/verify" \
  -H "Content-Type: application/json" \
  -d "{
    \"customerId\": \"$CUSTOMER_ID\",
    \"orderNumber\": \"$ORDER_NUMBER\"
  }")

echo -e "${GREEN}Response:${NC}"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""
echo "✓ Expected: isPaid (true/false), payment status"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 3: Check Inventory
echo -e "${YELLOW}Test 3: Check Inventory${NC}"
echo "Endpoint: POST /api/bot/inventory/check"
echo "Input: {customerId: $CUSTOMER_ID, productIds: [\"$PRODUCT_ID\"]}"
echo ""

RESPONSE=$(curl -s -X POST "$BASE_URL/api/bot/inventory/check" \
  -H "Content-Type: application/json" \
  -d "{
    \"customerId\": \"$CUSTOMER_ID\",
    \"productIds\": [\"$PRODUCT_ID\"]
  }")

echo -e "${GREEN}Response:${NC}"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""
echo "✓ Expected: productId, quantity, inStock"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 4: Get Order Summary
echo -e "${YELLOW}Test 4: Get Order Summary${NC}"
echo "Endpoint: POST /api/bot/order/summary"
echo "Input: {customerId: $CUSTOMER_ID}"
echo ""

RESPONSE=$(curl -s -X POST "$BASE_URL/api/bot/order/summary" \
  -H "Content-Type: application/json" \
  -d "{
    \"customerId\": \"$CUSTOMER_ID\"
  }")

echo -e "${GREEN}Response:${NC}"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""
echo "✓ Expected: totalOrders, activeOrders, totalSpent, recentOrders"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 5: Cancel Order
echo -e "${YELLOW}Test 5: Cancel Order${NC}"
echo "Endpoint: POST /api/bot/order/cancel"
echo "Input: {customerId: $CUSTOMER_ID, orderNumber: $ORDER_NUMBER}"
echo ""

RESPONSE=$(curl -s -X POST "$BASE_URL/api/bot/order/cancel" \
  -H "Content-Type: application/json" \
  -d "{
    \"customerId\": \"$CUSTOMER_ID\",
    \"orderNumber\": \"$ORDER_NUMBER\",
    \"reason\": \"Customer requested\"
  }")

echo -e "${GREEN}Response:${NC}"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""
echo "⚠️ Note: Will only work if order status is PENDING or PROCESSING"
echo "Test data order is SHIPPED, so this should fail with appropriate message"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Testing Complete!${NC}"
echo ""
echo "If all responses above returned success: true, then your bot tools are working!"
echo ""
echo "Next Step: Test in chat at http://localhost:3000"
echo "Example: 'Mana pesanan saya $ORDER_NUMBER?'"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
