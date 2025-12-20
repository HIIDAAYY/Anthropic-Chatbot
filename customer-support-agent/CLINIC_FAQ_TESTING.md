# Clinic FAQ Testing Guide

## Panduan Testing Knowledge Base Klinik

Dokumentasi ini menjelaskan cara melakukan testing pada clinic knowledge base setelah upload.

## 🔧 Pre-Testing Checklist

Sebelum mulai testing, pastikan:

```bash
# 1. Cek file clinic_faq.md ada
ls -la clinic_faq.md

# 2. Cek script upload ada
ls -la scripts/upload-clinic-faq.ts

# 3. Cek .env.local memiliki API keys
cat .env.local | grep -E "OPENAI|PINECONE"

# 4. Run upload script
npx tsx scripts/upload-clinic-faq.ts

# 5. Restart dev server
npm run dev
```

## 🧪 Test Scenarios

### Test 1: Upload Verification

**Objective:** Verifikasi bahwa FAQ clinic berhasil diupload ke Pinecone

**Steps:**
```bash
npx tsx scripts/upload-clinic-faq.ts
```

**Expected Output:**
```
✅ Dimension match!
📤 Uploading batch 1/3 (30 items)...
   ✅ Batch 1 uploaded successfully
📤 Uploading batch 2/3 (30 items)...
   ✅ Batch 2 uploaded successfully
📤 Uploading batch 3/3 (10 items)...
   ✅ Batch 3 uploaded successfully
✅ All batches uploaded!
🎉 Clinic FAQ upload completed successfully!
```

**Success Criteria:**
- ✅ Script menyelesaikan tanpa error
- ✅ Total vectors uploaded = 70 items
- ✅ Message "upload completed successfully" muncul

---

### Test 2: Chatbot UI - Knowledge Base Selection

**Objective:** Verifikasi bahwa clinic knowledge base bisa dipilih di chatbot UI

**Steps:**
1. Buka browser: `http://localhost:3000`
2. Lihat dropdown **Knowledge Base Selection** di bagian atas
3. Pilih **"Clinic"** dari dropdown
4. Verify bahwa selection berubah

**Expected Output:**
```
Knowledge Base Selection dropdown:
- Default (OpenAI)
- Clinic ← Selected
```

**Success Criteria:**
- ✅ Dropdown ada dan berfungsi
- ✅ "Clinic" option tersedia
- ✅ Selection bisa diubah tanpa error

---

### Test 3: Query Tentang Klinik (General)

**Objective:** Test bahwa chatbot bisa menjawab pertanyaan umum tentang klinik

**Test Case 1: Lokasi Klinik**
- Query: "Dimana lokasi klinik kecantikan?"
- Expected: Jawaban dari FAQ tentang lokasi (Jl. Senopati No. 88, Jakarta Selatan)
- Retrieved: FAQ kategori "Informasi Umum Klinik"

**Test Case 2: Jam Operasional**
- Query: "Jam berapa klinik buka?"
- Expected: Jawaban tentang jam buka (Senin-Jumat 10:00-20:00, Sabtu-Minggu 10:00-18:00)
- Retrieved: FAQ kategori "Informasi Umum Klinik"

**Test Case 3: Kontak Klinik**
- Query: "Bagaimana cara menghubungi klinik?"
- Expected: Jawaban berisi WhatsApp, telepon, email
- Retrieved: FAQ kategori "Informasi Umum Klinik"

**Success Criteria:**
- ✅ Chatbot menjawab dengan informasi dari FAQ
- ✅ Right sidebar menampilkan retrieved sources
- ✅ Jawaban relevan dengan pertanyaan

---

### Test 4: Query Tentang Kecantikan

**Test Case 1: Treatment Jerawat**
- Query: "Bagaimana cara mengatasi jerawat dengan treatment profesional?"
- Expected: Jawaban tentang laser acne, chemical peeling, dsb
- Retrieved: FAQ kategori "Layanan Kecantikan Wajah & Kulit"
- Similarity Score: > 0.80

**Test Case 2: Botox & Filler**
- Query: "Berapa harga botox dan filler di klinik?"
- Expected: Informasi tentang botox, filler, durasi hasil
- Retrieved: Multiple FAQ items tentang botox dan filler
- Similarity Score: > 0.80

**Test Case 3: Microblading**
- Query: "Apa itu microblading dan berapa lama hasilnya bertahan?"
- Expected: Penjelasan microblading, durasi (12-18 bulan), perawatan
- Retrieved: FAQ "Apa itu microblading dan berapa lama hasil bertahan?"
- Similarity Score: > 0.85

**Test Case 4: Laser Jerawat Safety**
- Query: "Apakah treatment laser jerawat aman?"
- Expected: Jawaban tentang keamanan laser acne, efek samping minimal
- Retrieved: FAQ "Apakah treatment laser aman untuk jerawat?"
- Similarity Score: > 0.80

**Success Criteria:**
- ✅ Semua query dijawab dengan informasi dari FAQ
- ✅ Similarity scores tinggi (> 0.75)
- ✅ Jawaban komprehensif dan akurat

---

### Test 5: Query Tentang Gigi

**Test Case 1: Scaling & Pembersihan**
- Query: "Bagaimana cara membersihkan karang gigi di klinik?"
- Expected: Penjelasan scaling, durasi, efek samping
- Retrieved: FAQ "Bagaimana cara membersihkan karang gigi?"
- Similarity Score: > 0.80

**Test Case 2: Penambalan Gigi**
- Query: "Apakah ada cara mengatasi gigi berlubang?"
- Expected: Informasi tentang penambalan, bahan, harga
- Retrieved: FAQ tentang penambalan gigi
- Similarity Score: > 0.80

**Test Case 3: Root Canal**
- Query: "Apakah root canal menyakitkan?"
- Expected: Jawaban bahwa ada anestesi, tidak sakit, bisa sedikit sensitif
- Retrieved: FAQ "Apakah root canal menyakitkan?"
- Similarity Score: > 0.85

**Test Case 4: Implant Gigi**
- Query: "Apa itu implant gigi dan berapa harganya?"
- Expected: Penjelasan implant, harga (Rp 8-15 juta per gigi), durasi
- Retrieved: FAQ tentang implant gigi
- Similarity Score: > 0.80

**Test Case 5: Veneer Gigi**
- Query: "Apa itu veneer gigi dan berapa tahan?"
- Expected: Penjelasan veneer, harga, durasi (porcelain 10-15 tahun, resin 5-7 tahun)
- Retrieved: FAQ "Apa itu veneer gigi dan berapa harganya?"
- Similarity Score: > 0.80

**Test Case 6: Gigi Sensitif**
- Query: "Bagaimana cara mengatasi gigi sensitif?"
- Expected: Jawaban tentang penyebab, treatment, pencegahan
- Retrieved: FAQ "Bagaimana cara mengatasi gigi sensitif?"
- Similarity Score: > 0.80

**Success Criteria:**
- ✅ Semua query dijawab dengan detail
- ✅ Harga dan durasi sesuai FAQ
- ✅ Similarity scores konsisten tinggi

---

### Test 6: Query Tentang Biaya & Pembayaran

**Test Case 1: Konsultasi Gratis**
- Query: "Apakah ada biaya konsultasi?"
- Expected: Jawaban bahwa konsultasi awal gratis
- Retrieved: FAQ "Berapa biaya konsultasi kecantikan dan gigi?"
- Similarity Score: > 0.85

**Test Case 2: Metode Pembayaran**
- Query: "Apa saja metode pembayaran yang diterima?"
- Expected: Jawaban tunai, debit, kartu kredit, e-wallet, transfer
- Retrieved: FAQ "Apa saja metode pembayaran yang diterima klinik?"
- Similarity Score: > 0.85

**Test Case 3: Cicilan**
- Query: "Apakah ada cicilan untuk treatment mahal?"
- Expected: Jawaban ada cicilan 0% dengan bank partner, 3-24 bulan
- Retrieved: FAQ "Apakah ada cicilan untuk treatment mahal?"
- Similarity Score: > 0.80

**Test Case 4: Diskon & Promo**
- Query: "Apakah ada diskon atau promo di klinik?"
- Expected: Jawaban ada paket bundling, member diskon, program referral
- Retrieved: FAQ "Apakah ada diskon atau promo kecantikan di klinik?"
- Similarity Score: > 0.80

**Success Criteria:**
- ✅ Jawaban komprehensif tentang biaya & pembayaran
- ✅ Informasi akurat tentang cicilan dan promo

---

### Test 7: Query Tentang Asuransi & Kebijakan

**Test Case 1: Pembatalan Appointment**
- Query: "Bagaimana cara membatalkan appointment?"
- Expected: Jawaban minimal 48 jam sebelum, ada biaya reschedule jika < 48 jam
- Retrieved: FAQ "Bagaimana kebijakan pembatalan dan pengembalian uang?"
- Similarity Score: > 0.80

**Test Case 2: Asuransi**
- Query: "Apakah klinik menerima asuransi kesehatan?"
- Expected: Jawaban bekerja sama dengan beberapa asuransi
- Retrieved: FAQ "Bagaimana jika saya ingin membayar dengan asuransi?"
- Similarity Score: > 0.80

**Test Case 3: Privasi Data**
- Query: "Bagaimana privasi data pasien terjaga?"
- Expected: Jawaban data dilindungi, tidak dibagikan ke pihak ketiga
- Retrieved: FAQ "Bagaimana privasi data pasien terjaga?"
- Similarity Score: > 0.85

**Success Criteria:**
- ✅ Informasi kebijakan lengkap dan jelas
- ✅ Privacy & security concerns dijawab dengan baik

---

### Test 8: Query Teknis

**Test Case 1: Aplikasi Mobile**
- Query: "Apakah ada aplikasi mobile klinik?"
- Expected: Jawaban aplikasi tersedia di iOS dan Android
- Retrieved: FAQ "Apakah ada aplikasi mobile untuk appointment?"
- Similarity Score: > 0.85

**Test Case 2: WhatsApp Support**
- Query: "Bagaimana cara menghubungi klinik via WhatsApp?"
- Expected: Jawaban WhatsApp aktif jam 10:00-20:00 WIB
- Retrieved: FAQ "Apakah klinik bisa dihubungi via WhatsApp?"
- Similarity Score: > 0.85

**Success Criteria:**
- ✅ Technical support queries dijawab dengan akurat

---

### Test 9: Edge Cases & Irrelevant Queries

**Test Case 1: Off-Topic Query**
- Query: "Bagaimana cara membuat website?"
- Expected: Claude mengatakan ini di luar scope klinik FAQ
- Behavior: Chatbot akan gunakan general knowledge (tidak dari FAQ)
- Should NOT retrieve clinic FAQ sources

**Test Case 2: Hybrid Query**
- Query: "Saya mau treatment jerawat dan juga perawatan gigi, apa bisa bareng?"
- Expected: Jawaban yes, bisa combined treatment, recommend konsultasi dengan dokter
- Retrieved: Multiple FAQ tentang kecantikan dan gigi
- Similarity Score: > 0.75

**Test Case 3: Very Specific Query**
- Query: "Apakah bisa perawatan gigi saat hamil?"
- Expected: Chatbot cari di FAQ, jika tidak ada, gunakan general knowledge
- Should handle gracefully jika tidak exact match

**Success Criteria:**
- ✅ Off-topic queries handled gracefully
- ✅ Hybrid queries dijawab dari multiple FAQ items
- ✅ Specific queries dijawab dengan disclaimer jika tidak di FAQ

---

### Test 10: Right Sidebar - Retrieved Sources

**Objective:** Verifikasi bahwa right sidebar menampilkan sources dengan benar

**Steps:**
1. Buka chatbot dengan clinic knowledge base
2. Tanya pertanyaan yang harusnya retrieve dari FAQ
3. Lihat right sidebar - "Knowledge Base History"
4. Verify bahwa sources ditampilkan dengan detail

**Expected Output:**
```
Knowledge Base History
━━━━━━━━━━━━━━━━━━━━━

Query: "Berapa harga treatment laser jerawat?"

Retrieved Sources:
1. Berapa harga treatment kecantikan?
   Similarity: 0.92
   Category: Layanan Kecantikan Wajah & Kulit
   Source: clinic

   Answer: Facial treatment biasa (basic) Rp 300.000,
           facial treatment medium Rp 500.000...

2. Apakah treatment laser aman untuk jerawat?
   Similarity: 0.88
   Category: Layanan Kecantikan Wajah & Kulit
   Source: clinic

   Answer: Ya. Laser acne yang digunakan klinik telah tersertifikasi FDA...
```

**Success Criteria:**
- ✅ Right sidebar menampilkan retrieved sources
- ✅ Similarity scores terlihat
- ✅ Category dan source (clinic) terlihat
- ✅ Answer lengkap ditampilkan

---

## 📊 Testing Checklist

```markdown
### Upload & Infrastructure
- [ ] Script upload berhasil menjalankan 70 items
- [ ] Tidak ada error pada saat upload
- [ ] Total vectors di Pinecone meningkat ~70 items
- [ ] Dev server berhasil direstart

### Chatbot UI
- [ ] Knowledge Base Selection dropdown ada
- [ ] Bisa switch ke "Clinic" knowledge base
- [ ] Tidak ada error saat switch

### General Clinic Questions
- [ ] Lokasi klinik dijawab benar
- [ ] Jam operasional dijawab benar
- [ ] Kontak klinik dijawab benar
- [ ] Sertifikasi dokter dijawab benar

### Kecantikan Queries (min 5 test cases passed)
- [ ] Jerawat treatment dijawab benar
- [ ] Botox/filler dijawab benar
- [ ] Microblading dijawab benar
- [ ] Laser safety dijawab benar
- [ ] Peeling/skincare dijawab benar

### Gigi Queries (min 5 test cases passed)
- [ ] Scaling/pembersihan dijawab benar
- [ ] Penambalan gigi dijawab benar
- [ ] Root canal dijawab benar
- [ ] Implant dijawab benar
- [ ] Veneer dijawab benar

### Payment & Billing Queries
- [ ] Konsultasi gratis dijawab benar
- [ ] Metode pembayaran dijawab benar
- [ ] Cicilan dijawab benar
- [ ] Harga akurat sesuai FAQ

### Asuransi & Policy
- [ ] Pembatalan policy dijawab benar
- [ ] Asuransi support dijawab benar
- [ ] Privacy policy dijawab benar

### Technical Support
- [ ] Aplikasi mobile dijawab benar
- [ ] WhatsApp support dijawab benar
- [ ] Customer service hours dijawab benar

### Edge Cases
- [ ] Off-topic queries handled gracefully
- [ ] Hybrid queries dijawab dari multiple sources
- [ ] Specific queries handled well

### UI/UX
- [ ] Right sidebar menampilkan sources
- [ ] Similarity scores akurat
- [ ] Category dan source labels terlihat
- [ ] Response formatting bagus
```

## 🐛 Troubleshooting Testing

### Issue: FAQ tidak retrieve sama sekali

**Diagnosis:**
```bash
# Check if vectors in Pinecone
curl -X POST "https://api.pinecone.io/query" \
  -H "Api-Key: $PINECONE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"vector": [...], "topK": 5}'
```

**Solusi:**
1. Cek apakah upload script berhasil (cek output)
2. Cek PINECONE_API_KEY dan INDEX_NAME benar
3. Try re-run upload script
4. Restart dev server

### Issue: Similarity scores rendah (< 0.5)

**Possible Causes:**
- Embedding model tidak matching
- Query language berbeda dari FAQ bahasa
- Query terlalu spesifik / jauh dari FAQ content

**Solusi:**
1. Verify embedding model (OpenAI text-embedding-3-small)
2. Rephrase query lebih sederhana
3. Tambah FAQ baru yang lebih spesifik

### Issue: Right sidebar tidak muncul

**Solusi:**
1. Enable right sidebar di component (check `RightSidebar.tsx`)
2. Check browser console untuk error
3. Verify `knowledgeBaseId` correctly set ke 'clinic'

### Issue: Clinic FAQ tercampur dengan UrbanStyle FAQ

**Note:** Ini sebenarnya OK - kedua knowledge base bisa coexist di index yang sama.

**Untuk strict separation:**
1. Buat Pinecone index terpisah untuk clinic
2. Update env variable `PINECONE_INDEX_NAME` untuk clinic index
3. Modify chatbot logic untuk select index based on `knowledgeBaseId`

## ✅ Test Completion Criteria

Clinic knowledge base dianggap **TESTED & READY** jika:

- ✅ Upload script berhasil tanpa error
- ✅ Minimal 80% test cases passed
- ✅ Similarity scores > 0.75 untuk relevant queries
- ✅ Off-topic queries handled gracefully
- ✅ Right sidebar menampilkan sources dengan benar
- ✅ No major UI/UX issues

## 📝 Test Report Template

```markdown
# Clinic Knowledge Base Testing Report

**Date:** [Testing Date]
**Tester:** [Your Name]
**Status:** [PASS / FAIL]

## Summary
- Total Test Cases: 50+
- Passed: [X]
- Failed: [X]
- Success Rate: [X%]

## Issues Found
1. [Issue 1] - Severity: [High/Medium/Low]
2. [Issue 2] - Severity: [High/Medium/Low]

## Recommendations
- [Recommendation 1]
- [Recommendation 2]

## Sign-off
- Tester: [Name]
- Date: [Date]
- Ready for Production: [Yes/No]
```

---

**Good luck dengan testing! 🚀**

Jika ada pertanyaan atau issues, hubungi development team.

Dokumentasi terakhir update: 19 Januari 2025
