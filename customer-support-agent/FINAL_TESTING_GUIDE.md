# Final Testing Guide - Bot Tools Native API Implementation

## 🎯 Objective

Verify bahwa bot tools sekarang bekerja dengan **Anthropic's native Tool Use API** dan dapat **execute tools properly** dengan real data dari database.

---

## ✅ Pre-Testing Checklist

- [ ] Dev server running: `npm run dev`
- [ ] Database running: `docker-compose up -d`
- [ ] Prisma migrations applied: `npx prisma migrate status` (should show "All migrations up to date")
- [ ] Test data seeded: Customer + Order visible di Prisma Studio
- [ ] No TypeScript errors in console

---

## 🧪 Test Sequence (Do in Order)

### **Test 0: Verify Code Changes**

Sebelum testing, verify file sudah berubah:

```bash
# Check bot-tools.ts punya BOT_TOOLS array
grep -n "export const BOT_TOOLS: Anthropic.Tool\[\]" app/lib/bot-tools.ts
# Expected: Should find the line

# Check chat route punya tools import
grep -n "BOT_TOOLS" app/api/chat/route.ts | head -5
# Expected: Should show multiple lines with BOT_TOOLS references

# Check for tool execution logic
grep -n "tool_use" app/api/chat/route.ts
# Expected: Should find "stop_reason === 'tool_use'"
```

---

### **Test 1: Track Order (🟢 Primary Test)**

**Setup:**
1. Open http://localhost:3000
2. Open DevTools (F12) → Console tab
3. Keep eye on dev server console too

**Action:**
```
Chat: "Mana pesanan saya ORD-2025-001?"
```

**Harapkan di Dev Server Console:**
```
🤖 Calling Claude API with tools...
📊 Stop reason: tool_use
🔧 Tool use detected, executing tools...
📦 Found 1 tool(s) to execute
🔧 Executing tool: track_order
✅ Tool 'track_order' executed successfully
🔄 Sending tool results back to Claude...
✅ Claude response with tool results received
✅ Message generation completed
```

**Harapkan di Chat:**
```
📦 Status Pengiriman Pesanan ORD-2025-001

Status: 🚚 Dalam Perjalanan
Kurir: JNE
Nomor Resi: JNE123456789
Lokasi Terakhir: Jakarta
Estimasi Tiba: 26 November 2025

🔗 Lacak Paket Secara Real-time
```

**✅ Success Indicator:**
- ✓ Dev console menunjukkan "tool_use" detected
- ✓ Tool execution logs muncul
- ✓ Chat menunjukkan tracking NUMBER (JNE123456789) bukan generic answer
- ✓ Tidak ada error di console

**Jika GAGAL:**
```
Kemungkinan issues:
❌ "stop_reason: end_turn" → Tools tidak recognize (check tools definition)
❌ "Executing tool: track_order" not appear → Tool extraction failed
❌ Generic answer about tracking → Tool tidak execute
❌ TypeError in console → Import or type issue

Action: Check BOT_TOOLS_FIX_SUMMARY.md troubleshooting section
```

---

### **Test 2: Verify Payment**

**Action:**
```
Chat: "Sudah terbayar belum pesanan saya?"
```

**Harapkan di Dev Console:**
```
🔧 Tool use detected, executing tools...
📦 Found 1 tool(s) to execute
🔧 Executing tool: verify_payment
✅ Tool 'verify_payment' executed successfully
```

**Harapkan di Chat:**
```
✅ Status Pembayaran: Pembayaran Berhasil

Metode: Transfer Bank
Jumlah: Rp150.000
Dibayar: 20 November 2025
```

**✅ Success Indicators:**
- ✓ Shows actual payment status (COMPLETED)
- ✓ Shows actual payment method
- ✓ Tool logs appear in console

---

### **Test 3: Check Inventory**

**Action:**
```
Chat: "Apakah Kaos Basic Crewneck tersedia?"
```

**Harapkan di Dev Console:**
```
🔧 Executing tool: check_inventory
✅ Tool 'check_inventory' executed successfully
```

**Harapkan di Chat:**
```
✅ Kaos Basic Crewneck
Status: Tersedia
Stok: 50 unit
```

**✅ Success Indicators:**
- ✓ Shows actual quantity (50)
- ✓ Shows availability correctly

---

### **Test 4: Out of Stock Product**

**Action:**
```
Chat: "Apakah Dress Midi Floral ada stoknya?"
```

**Harapkan di Chat:**
```
❌ Dress Midi Floral
Status: Habis Terjual
```

**✅ Success Indicators:**
- ✓ Correctly identifies as out of stock
- ✓ Shows quantity is 0

---

### **Test 5: Order Summary**

**Action:**
```
Chat: "Berapa total pesanan saya?"
```

**Harapkan di Dev Console:**
```
🔧 Executing tool: get_order_summary
✅ Tool 'get_order_summary' executed successfully
```

**Harapkan di Chat:**
```
📊 Ringkasan Pesanan Anda

Total Orders: 1
Active Orders: 0
Total Spent: Rp150.000
```

---

### **Test 6: Cannot Cancel Shipped Order**

**Action:**
```
Chat: "Batalkan pesanan saya"
```

**Harapkan di Dev Console:**
```
🔧 Executing tool: cancel_order
✅ Tool 'cancel_order' executed successfully
```

**Harapkan di Chat:**
```
❌ Pesanan dengan status SHIPPED tidak dapat dibatalkan.
Hanya pesanan dengan status PENDING atau PROCESSING yang dapat dibatalkan.
```

**✅ Success Indicators:**
- ✓ Shows correct reason why can't cancel
- ✓ Tool was attempted (logs show execution)

---

## 📊 Success Metrics

### **Individual Test Passing Rate**
```
Test 1 (Track Order):     ✓✓✓✓✓ (5/5 indicators)
Test 2 (Payment):         ✓✓✓ (3/3 indicators)
Test 3 (Inventory):       ✓✓ (2/2 indicators)
Test 4 (Out of Stock):    ✓✓ (2/2 indicators)
Test 5 (Summary):         ✓✓ (2/2 indicators)
Test 6 (Cannot Cancel):   ✓✓ (2/2 indicators)
───────────────────────────────────
TOTAL:                    ✓✓✓✓✓✓ 16/16
```

**Overall Success:**
- ✅ 6/6 tests pass → **System working perfectly!**
- ⚠️ 4-5/6 tests pass → **Mostly working, debug the failing test**
- ❌ <4/6 tests pass → **Core issue, check setup**

---

## 🔍 Monitoring & Logging

### **Key Logs to Watch**

**Expected logs di Dev Console (dalam order):**
```
1. 🤖 Calling Claude API with tools...
2. 📊 Stop reason: tool_use
3. 🔧 Tool use detected, executing tools...
4. 📦 Found 1 tool(s) to execute
5. 🔧 Executing tool: [TOOL_NAME]
6. ✅ Tool '[TOOL_NAME]' executed successfully
7. 🔄 Sending tool results back to Claude...
8. ✅ Claude response with tool results received
9. ✅ Message generation completed
```

**Logs that indicate PROBLEMS:**
```
❌ "stop_reason: end_turn" (tidak "tool_use")
❌ Tool execution failed
❌ TypeError: Cannot read property 'tool_use'
❌ "Invalid JSON response from AI"
❌ No logs about tools (means code not reached)
```

---

## 🛠️ Quick Debugging

### **If Test 1 Fails (Most Critical)**

**Symptom:** Generic "Untuk lacak pesanan..." response

**Debug steps:**
```bash
# 1. Check if tools are exported
grep "export const BOT_TOOLS" app/lib/bot-tools.ts

# 2. Check chat route imports them
grep "import.*BOT_TOOLS" app/api/chat/route.ts

# 3. Check if tools passed to API
grep "tools: BOT_TOOLS" app/api/chat/route.ts

# 4. Check stop_reason checking
grep "stop_reason === \"tool_use\"" app/api/chat/route.ts
```

If any grep returns nothing → **That's the problem, fix it!**

### **If Multiple Tests Fail**

**Likely causes (in priority order):**
1. Dev server not restarted after code changes
   ```bash
   # Kill server: Ctrl+C
   npm run build  # Clear cache
   npm run dev    # Restart
   ```

2. Tools not properly exported from bot-tools.ts
   ```bash
   # Check exports
   grep "^export" app/lib/bot-tools.ts | head -10
   ```

3. SDK version mismatch
   ```bash
   npm install --save-exact @anthropic-ai/sdk@latest
   npm run dev
   ```

4. TypeScript errors not showing in console
   ```bash
   npm run build
   # Check for errors
   ```

---

## 📸 Screenshots to Capture

After successful tests, screenshot:

1. **Chat with tracking response showing:**
   - Tracking number: JNE123456789
   - Carrier: JNE
   - Status: In Transit
   - Location: Jakarta

2. **Dev console showing tool execution logs**

3. **Multiple successful tool tests** (2-3 different tools)

---

## ✨ Expected Behavior Differences

### **BEFORE (Broken):**
```
User: "Mana pesanan saya?"
Bot: "Untuk melacak pesanan, silakan hubungi customer service"
❌ No real data
❌ Redirects to human
```

### **AFTER (Fixed):**
```
User: "Mana pesanan saya ORD-2025-001?"
Bot: "📦 Pesanan sedang dalam perjalanan...
     Kurir: JNE
     Nomor: JNE123456789
     Estimasi: 26 Nov"
✅ Real tracking data
✅ Instant response
✅ No redirection needed
```

---

## 🎯 Final Verification

Run ALL tests above in sequence. Record results:

| Test | Expected | Actual | Pass? |
|------|----------|--------|-------|
| 1. Track Order | Real tracking # | | ☐ |
| 2. Payment | Actual status | | ☐ |
| 3. Stock | Quantity 50 | | ☐ |
| 4. Out of Stock | 0 quantity | | ☐ |
| 5. Summary | Total 1 | | ☐ |
| 6. Cannot Cancel | Error message | | ☐ |

**Pass Rate:** ___/6 (__%)

---

## 🚀 If All Tests Pass

Congratulations! 🎉

**Next Steps:**
1. Share results
2. Create more test data (different statuses)
3. Test edge cases (non-existent orders, etc.)
4. Monitor production logs
5. Deploy with confidence

---

**Ready? Let's test! 💪**

```bash
npm run dev
# Open http://localhost:3000
# Chat: "Mana pesanan saya ORD-2025-001?"
# Watch console for tool execution logs
# 🤞 Fingers crossed for tool_use!
```
