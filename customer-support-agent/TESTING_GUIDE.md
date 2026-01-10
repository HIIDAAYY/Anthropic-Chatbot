# 🧪 Comprehensive Chatbot Testing Guide

## Panduan Testing Customer Support Chatbot

Gunakan test script ini untuk memastikan semua fitur bot berfungsi dengan baik.

---

## 📋 Test Categories & Questions

### 1️⃣ **BASIC FAQ TESTING** (Informasi Umum)

#### Test 1.1: Informasi Klinik
```
🔹 "Dimana lokasi klinik?"
🔹 "Jam operasional klinik?"
🔹 "Apa nomor telepon klinik?"
🔹 "Siapa dokter yang praktek di klinik?"
```

**Expected Result:**
- ✅ Bot memberikan jawaban lengkap dari knowledge base
- ✅ Format jawaban natural dan mudah dibaca
- ✅ Suggested questions muncul (3 pertanyaan follow-up)

---

#### Test 1.2: Treatment & Layanan
```
🔹 "Apa saja treatment yang tersedia?"
🔹 "Berapa harga facial treatment?"
🔹 "Apa bedanya chemical peeling dan laser treatment?"
🔹 "Treatment apa yang bagus untuk jerawat?"
```

**Expected Result:**
- ✅ Bot mencari info dari RAG knowledge base
- ✅ Jawaban sesuai dengan FAQ content
- ✅ Context dari Pinecone digunakan

---

#### Test 1.3: Booking & Appointment
```
🔹 "Bagaimana cara booking appointment?"
🔹 "Apakah bisa booking untuk hari ini?"
🔹 "Berapa lama durasi treatment facial?"
🔹 "Apakah bisa reschedule appointment?"
```

**Expected Result:**
- ✅ Instruksi booking yang jelas
- ✅ Bot menjelaskan prosedur step-by-step

---

#### Test 1.4: Payment & Pricing
```
🔹 "Metode pembayaran apa saja yang diterima?"
🔹 "Apakah bisa bayar dengan QRIS?"
🔹 "Berapa harga paket membership?"
🔹 "Apakah ada promo atau diskon?"
```

**Expected Result:**
- ✅ Informasi payment lengkap
- ✅ Bot tidak membuat-buat info yang tidak ada di knowledge base

---

### 2️⃣ **REAL-TIME TOOLS TESTING** (Native Tool Use API)

#### Test 2.1: Track Order 📦
```
🔹 "Dimana pesanan saya ORD-2025-001?"
🔹 "Track order saya dengan nomor ORD-2025-002"
🔹 "Kapan pesanan saya sampai?"
🔹 "Status pengiriman order ORD-2025-003?"
```

**Expected Result:**
- ✅ Bot memanggil `track_order` tool
- ✅ Menampilkan real-time tracking info:
  - Order ID
  - Shipping status (Processing/In Transit/Delivered)
  - Current location
  - Estimated delivery date
- ✅ Response dalam format yang clean (bukan JSON mentah)

**How to Verify:**
- Check console logs untuk melihat tool call
- Response harus user-friendly, bukan raw JSON

---

#### Test 2.2: Verify Payment 💳
```
🔹 "Sudah terbayar belum pesanan ORD-2025-001?"
🔹 "Cek status pembayaran order ORD-2025-002"
🔹 "Apakah payment saya sudah masuk?"
🔹 "Bagaimana cara bayar pesanan ORD-2025-004?"
```

**Expected Result:**
- ✅ Bot memanggil `verify_payment` tool
- ✅ Menampilkan payment status:
  - Paid/Pending/Failed
  - Payment method used
  - Payment date (jika sudah bayar)
  - Payment instructions (jika belum bayar)
- ✅ Response formatted dengan baik

---

#### Test 2.3: Check Inventory 📦
```
🔹 "Apakah serum vitamin C masih ada stock?"
🔹 "Stock sunscreen SPF 50 berapa?"
🔹 "Cek ketersediaan moisturizer dan toner"
🔹 "Ada stock untuk produk apa saja?"
```

**Expected Result:**
- ✅ Bot memanggil `check_inventory` tool
- ✅ Menampilkan stock info:
  - Product name
  - Stock quantity
  - In stock / Out of stock status
- ✅ Bisa check multiple products sekaligus

---

#### Test 2.4: Get Order Summary 📊
```
🔹 "Berapa total pesanan saya?"
🔹 "Apa saja order history saya?"
🔹 "Tampilkan ringkasan pesanan saya"
🔹 "Berapa kali saya order di klinik ini?"
```

**Expected Result:**
- ✅ Bot memanggil `get_order_summary` tool
- ✅ Menampilkan:
  - Total order count
  - Total spending amount
  - Recent orders list
- ✅ Response rapi dan mudah dibaca

---

### 3️⃣ **MULTI-LANGUAGE TESTING** 🌍

#### Test 3.1: Bahasa Indonesia
```
🔹 "Berapa harga treatment jerawat?"
🔹 "Saya mau booking facial untuk besok"
🔹 "Apakah klinik buka hari Minggu?"
```

**Expected Result:**
- ✅ Bot merespons dalam Bahasa Indonesia
- ✅ Grammar dan tone natural
- ✅ Suggested questions dalam Bahasa Indonesia

---

#### Test 3.2: English
```
🔹 "What is the price for acne treatment?"
🔹 "I want to book a facial for tomorrow"
🔹 "Is the clinic open on Sunday?"
```

**Expected Result:**
- ✅ Bot merespons dalam English
- ✅ Natural English grammar
- ✅ Suggested questions dalam English

---

#### Test 3.3: Language Switching
```
🔹 "Hello, what treatments do you offer?"
🔹 [Bot responds in English]
🔹 "Berapa harganya?"
🔹 [Bot should switch to Indonesian]
```

**Expected Result:**
- ✅ Bot deteksi perubahan bahasa
- ✅ Switch language seamlessly

---

### 4️⃣ **MOOD DETECTION TESTING** 😊😐😠

#### Test 4.1: Positive Mood
```
🔹 "Wah kliniknya bagus sekali! Saya tertarik booking"
🔹 "Thank you so much! This is very helpful"
🔹 "Senang sekali ada klinik dengan harga terjangkau"
```

**Expected Result:**
- ✅ Bot deteksi mood: `positive`
- ✅ Response tone friendly dan supportive

---

#### Test 4.2: Curious Mood
```
🔹 "Saya penasaran, apa bedanya laser dengan IPL?"
🔹 "Could you explain more about chemical peeling?"
🔹 "Bagaimana cara kerja microneedling?"
```

**Expected Result:**
- ✅ Bot deteksi mood: `curious`
- ✅ Response informatif dan detailed

---

#### Test 4.3: Negative/Frustrated Mood
```
🔹 "Treatment kemarin malah bikin kulit saya iritasi!"
🔹 "Saya kecewa dengan layanan klinik ini"
🔹 "Kenapa harus mahal sekali sih?"
```

**Expected Result:**
- ✅ Bot deteksi mood: `negative` atau `frustrated`
- ✅ Response empathetic
- ✅ **Redirect to human agent** (should_redirect: true)

---

#### Test 4.4: Confused Mood
```
🔹 "Saya bingung harus pilih treatment yang mana"
🔹 "I don't understand the difference between treatments"
🔹 "Tolong jelaskan dengan lebih simple"
```

**Expected Result:**
- ✅ Bot deteksi mood: `confused`
- ✅ Response simplify explanation
- ✅ Step-by-step guidance

---

### 5️⃣ **HUMAN AGENT HANDOFF TESTING** 👤

#### Test 5.1: Complex Complaints
```
🔹 "Saya mau komplain, treatment kemarin jerawat saya malah tambah parah!"
🔹 "Dokternya tidak profesional, saya mau refund"
🔹 "Saya tidak puas dengan layanan klinik ini"
```

**Expected Result:**
- ✅ `redirect_to_agent: true`
- ✅ Reason: komplain atau complaint
- ✅ Bot message: menyarankan connect ke human agent
- ✅ Email notification terkirim ke agent email
- ✅ Conversation tersimpan di admin dashboard dengan status `REDIRECTED`

---

#### Test 5.2: Personal Data Requests
```
🔹 "Tolong cancel appointment saya tanggal 15 Januari"
🔹 "Saya mau ubah data pribadi saya"
🔹 "Bagaimana cara hapus akun saya?"
```

**Expected Result:**
- ✅ `redirect_to_agent: true`
- ✅ Reason: memerlukan akses ke personal data
- ✅ Bot suggest contact customer service

---

#### Test 5.3: Refund & Cancellation
```
🔹 "Saya mau refund pesanan saya"
🔹 "Tolong cancel order ORD-2025-001"
🔹 "Bagaimana prosedur refund di klinik ini?"
```

**Expected Result:**
- ✅ `redirect_to_agent: true`
- ✅ Reason: refund/cancellation memerlukan human approval
- ✅ Bot explain general policy, tapi redirect untuk proses

---

### 6️⃣ **EDGE CASES & ERROR HANDLING** ⚠️

#### Test 6.1: Invalid Input
```
🔹 "asdfghjkl"
🔹 "123456789"
🔹 "?????????"
```

**Expected Result:**
- ✅ Bot tidak crash
- ✅ Response: "Maaf, saya tidak mengerti. Bisa jelaskan lebih detail?"
- ✅ Suggested questions untuk guide user

---

#### Test 6.2: Out of Scope Questions
```
🔹 "Siapa presiden Indonesia?"
🔹 "Bagaimana cara memasak nasi goreng?"
🔹 "Apa cuaca hari ini?"
```

**Expected Result:**
- ✅ Bot decline politely
- ✅ Response: "Maaf, saya hanya bisa membantu dengan pertanyaan seputar klinik..."
- ✅ Suggested questions untuk redirect ke relevant topics

---

#### Test 6.3: Invalid Order ID
```
🔹 "Track pesanan ORD-9999-XXX"
🔹 "Cek payment untuk order yang tidak ada"
```

**Expected Result:**
- ✅ Bot handle gracefully
- ✅ Response: "Order ID tidak ditemukan. Mohon cek kembali nomor order Anda"
- ✅ No crash atau error

---

#### Test 6.4: Very Long Input
```
🔹 [Paste 1000+ words text]
```

**Expected Result:**
- ✅ Bot process tanpa timeout
- ✅ Response tetap relevant
- ✅ Tidak over-respond

---

### 7️⃣ **SUGGESTED QUESTIONS TESTING** 💡

#### Test 7.1: Relevance
```
🔹 "Berapa harga facial?"
```

**Expected Result:**
- ✅ Suggested questions relevant ke topic pricing/booking:
  - "Bagaimana cara booking appointment?"
  - "Apa saja paket treatment yang tersedia?"
  - "Apakah ada promo atau diskon?"

---

#### Test 7.2: Follow-up Flow
```
🔹 "Dimana lokasi klinik?"
🔹 [Bot responds + suggested questions]
🔹 Click salah satu suggested question
```

**Expected Result:**
- ✅ Suggested questions clickable (jika UI support)
- ✅ Flow conversation natural
- ✅ Context preserved

---

### 8️⃣ **CONTEXT & SESSION TESTING** 💾

#### Test 8.1: Context Awareness
```
🔹 "Berapa harga facial?"
🔹 [Bot responds]
🔹 "Kalau untuk laser treatment?"
🔹 [Bot should understand context = asking about laser treatment price]
```

**Expected Result:**
- ✅ Bot understand context dari previous message
- ✅ No need to repeat full question

---

#### Test 8.2: Session Persistence
```
🔹 Send message: "Halo"
🔹 Refresh browser
🔹 Send message: "Saya mau lanjut tanya treatment"
```

**Expected Result:**
- ✅ Session ID preserved
- ✅ Conversation history tersimpan di database
- ✅ Bot remember previous context (jika dalam same session)

---

### 9️⃣ **RAG & KNOWLEDGE BASE TESTING** 🧠

#### Test 9.1: Semantic Search
```
🔹 "Kulit saya berjerawat, gimana cara mengatasinya?"
🔹 (Similar meaning to: "Treatment untuk jerawat")
```

**Expected Result:**
- ✅ Bot menggunakan semantic search (Voyage AI embeddings)
- ✅ Menemukan relevant context meskipun wording berbeda
- ✅ Context dari Pinecone digunakan

---

#### Test 9.2: Multiple Context Matching
```
🔹 "Berapa harga treatment jerawat dan berapa lama durasinya?"
```

**Expected Result:**
- ✅ Bot retrieve multiple relevant contexts
- ✅ Answer mencakup:
  - Price information
  - Duration information
- ✅ Comprehensive response

---

#### Test 9.3: No Context Available
```
🔹 "Apakah klinik jual mobil?"
🔹 (Question yang tidak ada di knowledge base)
```

**Expected Result:**
- ✅ Bot honest: "Maaf, saya tidak memiliki informasi tentang itu"
- ✅ Suggest relevant questions
- ✅ Tidak fabricate jawaban

---

## 📊 Testing Checklist

### ✅ Core Features
- [ ] FAQ responses accurate
- [ ] Real-time tools working (track_order, verify_payment, check_inventory, get_order_summary)
- [ ] Multi-language support (ID/EN)
- [ ] Mood detection correct
- [ ] Suggested questions relevant
- [ ] Human agent handoff working
- [ ] Email notifications sent

### ✅ Technical
- [ ] No crashes or errors
- [ ] Response time < 5 seconds
- [ ] RAG retrieval working
- [ ] Database session persistence
- [ ] Context awareness working

### ✅ UX/UI
- [ ] Responses formatted cleanly (not raw JSON)
- [ ] Natural language tone
- [ ] Suggested questions clickable
- [ ] Chat history scrollable
- [ ] Loading indicators working

---

## 🐛 Common Issues to Check

### Issue 1: Bot Returns Raw JSON Instead of Text
**Test:**
```
"Track pesanan ORD-2025-001"
```

**Should NOT return:**
```json
{"order_id": "ORD-2025-001", "status": "delivered"}
```

**Should return:**
```
Pesanan Anda dengan nomor ORD-2025-001 sudah dikirim dan
saat ini dalam perjalanan ke alamat Anda. Estimasi sampai: 15 Jan 2025.
```

---

### Issue 2: Tools Not Being Called
**Test:**
```
"Dimana pesanan ORD-2025-001?"
```

**Check console logs:**
- Should see: `[Tool Call] track_order with order_id: ORD-2025-001`
- Should see Anthropic API tool_use blocks

**If not working:**
- Check tool definitions in `app/api/chat/route.ts`
- Check Anthropic API key valid
- Check tool_choice parameter

---

### Issue 3: Wrong Language Response
**Test:**
```
User: "Berapa harga facial?"
Bot: [Responds in English instead of Indonesian]
```

**Fix:**
- Check language detection logic
- Check system prompt includes language instructions

---

### Issue 4: No Redirect to Agent When Should
**Test:**
```
"Saya mau komplain, layanan jelek!"
```

**Check:**
- `redirect_to_agent.should_redirect` should be `true`
- Email should be sent (check logs)
- Conversation status in DB should be `REDIRECTED`

**If not working:**
- Check redirect logic in route.ts
- Check Resend API key
- Check AGENT_EMAIL configured

---

## 🎯 Success Criteria

Bot is working correctly if:

✅ **80%+ FAQ questions** answered correctly
✅ **All 4 real-time tools** working without errors
✅ **Language detection** accurate (ID/EN)
✅ **Mood detection** reasonable (not perfect, but good enough)
✅ **Complex questions** redirect to human agent
✅ **No crashes** on edge cases
✅ **Response time** < 5 seconds average
✅ **Suggested questions** always provided
✅ **Email notifications** sent when redirect
✅ **Sessions** persist in database

---

## 📝 Testing Report Template

After testing, fill out this report:

```
## Test Results: [Date]

### ✅ Working Features
- FAQ responses: [PASS/FAIL]
- Track order tool: [PASS/FAIL]
- Verify payment tool: [PASS/FAIL]
- Check inventory tool: [PASS/FAIL]
- Get order summary tool: [PASS/FAIL]
- Multi-language (ID): [PASS/FAIL]
- Multi-language (EN): [PASS/FAIL]
- Mood detection: [PASS/FAIL]
- Suggested questions: [PASS/FAIL]
- Human agent redirect: [PASS/FAIL]
- Email notifications: [PASS/FAIL]

### ❌ Issues Found
1. [Issue description]
   - Steps to reproduce: [...]
   - Expected: [...]
   - Actual: [...]

2. [Issue description]
   - Steps to reproduce: [...]
   - Expected: [...]
   - Actual: [...]

### 💡 Improvement Suggestions
1. [Suggestion]
2. [Suggestion]

### 📊 Performance Metrics
- Average response time: [X seconds]
- Tool call success rate: [X%]
- FAQ accuracy: [X%]
- Redirect accuracy: [X%]
```

---

## 🚀 How to Run This Test

### Option 1: Manual Testing (Recommended for first time)
1. Start dev server: `npm run dev`
2. Open browser: http://localhost:3000
3. Go through each test category above
4. Document results in testing report

### Option 2: Automated Testing (Advanced)
```bash
# Run comprehensive UI test script
npx tsx scripts/comprehensive-ui-test.ts
```

This will run automated tests for all features.

---

## 📞 Need Help?

If you find issues during testing:
1. Check console logs for errors
2. Check database connections (PostgreSQL, Pinecone)
3. Verify all API keys configured correctly
4. Check `.env.local` file
5. Review recent git commits for breaking changes

---

**Happy Testing! 🎉**
