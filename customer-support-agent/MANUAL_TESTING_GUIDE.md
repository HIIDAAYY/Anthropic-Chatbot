# Manual Testing Guide - Customer Support Bot

## 🎯 Tujuan
Panduan ini membantu Anda melakukan testing manual terhadap semua fitur bot untuk memastikan semuanya berjalan dengan baik.

## 🚀 Cara Menggunakan Panduan Ini

### 1. Persiapan
- ✅ Pastikan server sudah berjalan: `npm run dev`
- ✅ Buka browser ke http://localhost:3000
- ✅ Siapkan catatan untuk mendokumentasikan hasil testing

### 2. Testing Flow
Untuk setiap test di bawah:
1. Ketik query/pertanyaan di chat
2. Perhatikan response bot
3. Centang ✅ jika berhasil atau ❌ jika ada masalah
4. Catat masalah yang ditemukan

---

## 📝 CHECKLIST TESTING

### A. BASIC CHAT & UI
- [ ] Chat interface tampil dengan benar
- [ ] Bisa mengetik dan send message
- [ ] Bot merespon dengan cepat (\u003c5 detik)
- [ ] Message history tersimpan dan terlihat
- [ ] Suggested questions muncul di setiap response
- [ ] UI responsive (coba resize window)

### B. FITUR FAQ (Knowledge Base)

#### Test B1: Informasi Klinik
- [ ] Query: "Dimana lokasi klinik?"
  - Response lengkap dengan alamat? ✅/❌
  - Suggested questions relevan? ✅/❌

- [ ] Query: "Jam operasional klinik?"
  - Jam buka tutup jelas? ✅/❌

- [ ] Query: "Apa nomor telepon klinik?"
  - Nomor telepon diberikan? ✅/❌

#### Test B2: Treatment & Layanan
- [ ] Query: "Apa saja treatment yang tersedia?"
  - List treatment lengkap? ✅/❌
  - Penjelasan jelas? ✅/❌

- [ ] Query: "Berapa harga facial treatment?"
  - Harga disebutkan? ✅/❌
  - Format harga jelas? ✅/❌

#### Test B3: Payment & Pricing
- [ ] Query: "Metode pembayaran apa saja yang diterima?"
  - List metode payment lengkap? ✅/❌

- [ ] Query: "Apakah ada promo atau diskon?"
  - Info promo jelas atau honest jika tidak ada? ✅/❌

### C. BOT TOOLS (Fitur Real-time)

#### Test C1: Cek Availability
- [ ] Query: "Cek ketersediaan slot untuk besok"
  - Tool `check_availability` dipanggil? ✅/❌
  - Response bukan raw JSON? ✅/❌
  - Informasi slot jelas? ✅/❌

#### Test C2: Create Booking
- [ ] Query: "Saya mau booking facial untuk tanggal 5 Februari jam 10 pagi"
  - Tool `create_booking` dipanggil? ✅/❌
  - Konfirmasi booking jelas? ✅/❌
  - Appointment ID diberikan? ✅/❌

#### Test C3: Generate Payment Link
- [ ] Query: "Buatkan link pembayaran untuk booking saya"
  - Tool `generate_payment_link` dipanggil? ✅/❌
  - Link payment diberikan? ✅/❌
  - Instruksi pembayaran jelas? ✅/❌

#### Test C4: Reschedule Booking
- [ ] Query: "Saya mau reschedule appointment saya ke tanggal 8 Februari"
  - Tool `reschedule_booking` dipanggil? ✅/❌
  - Konfirmasi reschedule jelas? ✅/❌

### D. MULTILINGUAL SUPPORT

#### Test D1: Bahasa Indonesia
- [ ] Query: "Berapa harga treatment jerawat?"
  - Bot merespon dalam Bahasa Indonesia? ✅/❌
  - Grammar natural? ✅/❌

#### Test D2: English
- [ ] Query: "What is the price for acne treatment?"
  - Bot merespon dalam English? ✅/❌
  - Grammar natural? ✅/❌

#### Test D3: Language Switching
- [ ] Query 1: "Hello, what treatments do you offer?"
  - Bot respon English? ✅/❌
- [ ] Query 2 (lanjutan): "Berapa harganya?"
  - Bot switch ke Indonesian? ✅/❌

### E. MOOD DETECTION

#### Test E1: Positive Mood
- [ ] Query: "Wah kliniknya bagus sekali! Saya tertarik booking"
  - Mood detected: positive? ✅/❌
  - Bot response friendly? ✅/❌

#### Test E2: Curious Mood
- [ ] Query: "Saya penasaran, apa bedanya laser dengan IPL?"
  - Mood detected: curious? ✅/❌
  - Bot memberikan penjelasan detailed? ✅/❌

#### Test E3: Confused Mood
- [ ] Query: "Saya bingung harus pilih treatment yang mana"
  - Mood detected: confused? ✅/❌
  - Bot memberikan guidance? ✅/❌

#### Test E4: Negative/Frustrated Mood
- [ ] Query: "Treatment kemarin malah bikin kulit saya iritasi!"
  - Mood detected: negative/frustrated? ✅/❌
  - Bot empathetic? ✅/❌
  - Redirect to human agent triggered? ✅/❌

### F. HANDOFF TO HUMAN AGENT

#### Test F1: Complaint
- [ ] Query: "Saya mau komplain, treatment kemarin jerawat saya malah tambah parah!"
  - `redirect_to_agent` = true? ✅/❌
  - Bot menyarankan contact human agent? ✅/❌
  - (Cek console) Email notification terkirim? ✅/❌

#### Test F2: Cancellation Request
- [ ] Query: "Tolong cancel appointment saya tanggal 15 Januari"
  - Redirect to agent triggered? ✅/❌
  - Reason jelas? ✅/❌

#### Test F3: Refund Request
- [ ] Query: "Saya mau refund pesanan saya"
  - Redirect to agent triggered? ✅/❌

### G. EDGE CASES

#### Test G1: Invalid Input
- [ ] Query: "asdfghjkl"
  - Bot tidak crash? ✅/❌
  - Response polite? ✅/❌
  - Suggested questions diberikan? ✅/❌

#### Test G2: Out of Scope
- [ ] Query: "Siapa presiden Indonesia?"
  - Bot decline politely? ✅/❌
  - Redirect ke topic klinik? ✅/❌

#### Test G3: 
Non-existent Service
- [ ] Query: "Apakah klinik jual mobil?"
  - Bot honest jika tidak ada info? ✅/❌
  - Tidak fabricate answer? ✅/❌

### H. ADMIN DASHBOARD

#### Test H1: Access Dashboard
- [ ] Buka: http://localhost:3000/admin/conversations
  - Dashboard tampil? ✅/❌
  - Login required (jika ada auth)? ✅/❌

#### Test H2: View Conversations
- [ ] Apakah list conversations terlihat? ✅/❌
- [ ] Apakah ada filter/search? ✅/❌
- [ ] Apakah conversation details bisa dibuka? ✅/❌

#### Test H3: Handoff Management
- [ ] Buka: http://localhost:3000/admin/handoffs
  - List handoffs terlihat? ✅/❌
  - Status handoff jelas (pending/resolved)? ✅/❌

#### Test H4: Analytics
- [ ] Buka: http://localhost:3000/admin/analytics
  - Dashboard analytics tampil? ✅/❌
  - Chart/grafik terlihat? ✅/❌
  - Data akurat? ✅/❌

#### Test H5: Send Message to Customer
- [ ] Dari admin dashboard, coba reply ke conversation
  - Bisa send message? ✅/❌
  - Message tersimpan? ✅/❌

#### Test H6: Resolve Handoff
- [ ] Coba resolve salah satu pending handoff
  - Resolve button works? ✅/❌
  - Status berubah ke resolved? ✅/❌
  - Resolution notes tersimpan? ✅/❌

### I. PERFORMANCE & QUALITY

#### Test I1: Response Time
- [ ] Kebanyakan response \u003c 3 detik? ✅/❌
- [ ] Tidak ada timeout? ✅/❌

#### Test I2: Response Quality
- [ ] Response tidak berupa raw JSON? ✅/❌
- [ ] Bahasa natural dan friendly? ✅/❌
- [ ] Tidak ada hallucination (info yang dibuat-buat)? ✅/❌

#### Test I3: Context Awareness
- [ ] Query 1: "Berapa harga facial?"
- [ ] Query 2: "Kalau untuk laser treatment?"
  - Bot understand context from previous message? ✅/❌

---

## 📊 HASIL TESTING

### Summary
- Total Tests: ___ / ___
- Passed: ___ (___%)
- Failed: ___

### Issues Found

#### Issue 1: [Nama Issue]
- **Kategori**: [FAQ/Tools/UI/Dashboard/etc]
- **Severity**: [Critical/High/Medium/Low]
- **Deskripsi**: 
- **Steps to Reproduce**:
  1. 
  2. 
- **Expected**:
- **Actual**:
- **Screenshot/Evidence**: 

#### Issue 2: [Nama Issue]
- **Kategori**: 
- **Severity**: 
- **Deskripsi**: 
- **Steps to Reproduce**:
- **Expected**:
- **Actual**:

### Recommendations
1. 
2. 
3. 

---

## ✅ KRITERIA SUCCESS

Bot dianggap **BERHASIL** jika:
- ✅ **80%+** dari semua tests passing
- ✅ Semua **critical features** working (chat, FAQ, tools)
- ✅ Tidak ada **major bugs** atau crashes
- ✅ **Response time** average \u003c 5 detik
- ✅ **Admin dashboard** bisa diakses dan functional

Bot perlu **PERBAIKAN** jika:
- ⚠️ \u003c 80% tests passing
- ⚠️ Ada critical bugs
- ⚠️ Response time sering \u003e 5 detik
- ⚠️ Tools sering gagal dipanggil
- ⚠️ Dashboard error atau tidak functional

---

## 🔍 Tips Debugging

### Jika Bot Tidak Merespon:
1. Cek console browser (F12) untuk errors
2. Cek terminal server untuk error logs
3. Verify Anthropic API key valid
4. Cek database connection (PostgreSQL)

### Jika Tools Tidak Dipanggil:
1. Cek console logs untuk tool call attempts
2. Verify tool definitions di `app/api/chat/route.ts`
3. Test dengan query yang lebih spesifik

### Jika RAG Tidak Working:
1. Verify Pinecone connection
2. Check embeddings uploaded: `npx tsx scripts/test-pinecone.ts`
3. Verify Voyage AI API key

### Jika Admin Dashboard Error:
1. Cek database migrations: `npx prisma migrate dev`
2. Verify admin routes di `app/admin/`
3. Cek console browser untuk API errors

---

## 📞 Bantuan Lebih Lanjut

Dokumentasi lengkap ada di:
- `TESTING_GUIDE.md` - Detailed testing guide
- `README.md` - Project documentation
- `ADMIN_DASHBOARD_PROMPT.md` - Admin features
- `BOT_TOOLS_FIX_SUMMARY.md` - Tools troubleshooting

---

**Last Updated**: {{ date }}
**Tester**: {{ your_name }}
