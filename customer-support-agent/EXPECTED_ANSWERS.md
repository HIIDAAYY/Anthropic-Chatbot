# 📝 Expected Answers Guide - Chatbot Testing

Dokumen ini berisi **jawaban yang seharusnya diberikan** oleh chatbot untuk setiap test case.

Gunakan ini sebagai **reference untuk validasi** apakah bot memberikan jawaban yang benar.

---

## ✅ Format Expected Answer

Setiap test case berisi:
- 🔹 **Question**: Pertanyaan test
- ✅ **Expected Answer**: Jawaban yang seharusnya diberikan
- 🏷️ **Expected Mood**: Mood yang seharusnya terdeteksi
- 💡 **Expected Suggested Questions**: 3 pertanyaan follow-up (approximate)
- 🔧 **Tool Called**: Tool yang seharusnya dipanggil (jika ada)
- ⚠️ **Redirect to Agent**: Apakah seharusnya redirect (true/false)
- 📋 **Validation Notes**: Hal-hal yang perlu dicek

---

# 1️⃣ BASIC FAQ TESTING

## Test 1.1: Informasi Klinik

### 🔹 Question 1: "Dimana lokasi klinik?"

✅ **Expected Answer:**
```
Klinik Glow Aesthetics berlokasi di Jl. Senopati Raya No. 45,
Kebayoran Baru, Jakarta Selatan 12190.

Petunjuk arah:
- Dekat dengan Blok M Plaza (sekitar 1.2 km)
- 5 menit jalan kaki dari Halte TransJakarta Senopati
- Seberang Starbucks Senopati
- Gedung warna putih dengan logo "Glow" besar di depan

Parkir tersedia di Basement B1 (gratis 2 jam pertama)
dan valet parking (Rp 20.000).

GPS Coordinates: -6.2368, 106.8097
```

🏷️ **Expected Mood:** `neutral` atau `curious`

💡 **Expected Suggested Questions:**
- "Jam berapa klinik buka?"
- "Bagaimana cara booking appointment?"
- "Apa saja treatment yang tersedia?"

🔧 **Tool Called:** None (FAQ only)

⚠️ **Redirect to Agent:** `false`

📋 **Validation Notes:**
- ✅ Harus mention alamat lengkap: "Jl. Senopati Raya No. 45"
- ✅ Harus mention landmark: "Seberang Starbucks Senopati"
- ✅ Harus mention parkir info
- ✅ Format clean, bukan raw JSON
- ✅ Bahasa Indonesia natural

---

### 🔹 Question 2: "Jam operasional klinik?"

✅ **Expected Answer:**
```
Jam operasional Klinik Glow Aesthetics:

📅 Senin - Jumat: 09:00 - 20:00 WIB
📅 Sabtu: 09:00 - 18:00 WIB
📅 Minggu & Hari Libur: 10:00 - 16:00 WIB

Catatan:
- Last appointment harus booking minimal 1 jam sebelum closing
- Konsultasi dokter available sampai jam 18:00 (hari kerja)
  dan 16:00 (weekend)

Kami buka setiap hari termasuk weekend!
```

🏷️ **Expected Mood:** `neutral` atau `curious`

💡 **Expected Suggested Questions:**
- "Apakah buka pada hari libur nasional?"
- "Bagaimana cara menghubungi klinik?"
- "Apakah bisa booking untuk hari ini?"

🔧 **Tool Called:** None

⚠️ **Redirect to Agent:** `false`

📋 **Validation Notes:**
- ✅ Harus mention 3 kategori jam: weekdays, Sabtu, Minggu
- ✅ Harus mention last appointment policy
- ✅ Format rapi dengan emoji atau bullet points

---

### 🔹 Question 3: "Apa nomor telepon klinik?"

✅ **Expected Answer:**
```
Anda bisa menghubungi Klinik Glow Aesthetics melalui:

📱 WhatsApp: +62 812-8888-5555 (24/7, paling cepat!)
📞 Telepon: (021) 5555-8888 (jam kerja)
📧 Email: hello@glowaesthetics.id

WhatsApp adalah cara tercepat dengan response time 5-10 menit
di jam kerja. Anda bisa booking, konsultasi, atau tanya-tanya
kapan saja!
```

🏷️ **Expected Mood:** `neutral`

💡 **Expected Suggested Questions:**
- "Apakah bisa konsultasi via WhatsApp?"
- "Bagaimana cara booking appointment?"
- "Apakah ada customer service di luar jam operasional?"

🔧 **Tool Called:** None

⚠️ **Redirect to Agent:** `false`

📋 **Validation Notes:**
- ✅ Harus mention WhatsApp, telepon, dan email
- ✅ Harus mention WhatsApp 24/7 available
- ✅ Nomor lengkap dan benar

---

### 🔹 Question 4: "Siapa dokter yang praktek di klinik?"

✅ **Expected Answer:**
```
Klinik Glow Aesthetics didirikan dan dipimpin oleh
dr. Amanda Kusuma, Sp.KK (Spesialis Kulit dan Kelamin).

dr. Amanda memiliki:
- 12 tahun pengalaman di bidang dermatologi dan estetika
- Lulusan Universitas Indonesia
- Fellowship di Seoul National University Hospital (Korea Selatan)

Beliau sangat passionate tentang skincare science dan ingin
membuat perawatan kulit premium accessible untuk semua orang
Indonesia.

Semua treatment disupervisi langsung oleh dr. Amanda,
dan konsultasi dokter GRATIS setiap sesi!
```

🏷️ **Expected Mood:** `curious`

💡 **Expected Suggested Questions:**
- "Apakah klinik tersertifikasi resmi?"
- "Apa keunggulan Klinik Glow Aesthetics?"
- "Apa saja treatment yang tersedia?"

🔧 **Tool Called:** None

⚠️ **Redirect to Agent:** `false`

---

## Test 1.2: Treatment & Layanan

### 🔹 Question 5: "Apa saja treatment yang tersedia?"

✅ **Expected Answer:**
```
Klinik Glow Aesthetics menyediakan 4 kategori treatment utama:

💆‍♀️ FACIAL TREATMENTS:
1. Facial Basic Glow (Rp 250.000)
2. Facial Premium Hydrating (Rp 450.000)
3. Facial Acne Solution (Rp 400.000)
4. Facial Brightening (Rp 400.000)
5. Facial Anti-Aging (Rp 500.000)

⚡ LASER & ADVANCED TREATMENTS:
6. Laser CO2 Fractional (Rp 1.200.000)
7. Laser Toning (Rp 800.000)
8. IPL Photofacial (Rp 950.000)
9. Microneedling RF (Rp 1.500.000)

💉 INJECTION & FILLER:
10. Filler Hyaluronic Acid (Rp 3.500.000)
11. Botox Forehead/Frown (Rp 2.500.000)
12. Skin Booster Injection (Rp 1.800.000)

🧪 CHEMICAL PEELING & SPECIAL:
13. Chemical Peeling Light (Rp 350.000)
14. Chemical Peeling Medium (Rp 600.000)
15. HIFU Facial Lifting (Rp 3.000.000)

Semua treatment bisa dicustomize sesuai kebutuhan kulit Anda!
```

🏷️ **Expected Mood:** `curious`

💡 **Expected Suggested Questions:**
- "Berapa harga facial treatment?"
- "Treatment apa yang bagus untuk jerawat?"
- "Bagaimana cara booking appointment?"

🔧 **Tool Called:** None (FAQ dengan RAG retrieval)

⚠️ **Redirect to Agent:** `false`

📋 **Validation Notes:**
- ✅ Harus list minimal 10+ treatment
- ✅ Harus include harga untuk each treatment
- ✅ Harus group by kategori (Facial, Laser, Injection, Peeling)
- ✅ Format rapi dengan emoji/numbering

---

### 🔹 Question 6: "Berapa harga facial treatment?"

✅ **Expected Answer:**
```
Harga facial treatment di Klinik Glow Aesthetics:

1. Facial Basic Glow: Rp 250.000
   - Treatment lengkap 6 tahapan (60 menit)
   - Cocok untuk first-timer atau maintenance

2. Facial Premium Hydrating: Rp 450.000
   - Dengan hyaluronic acid serum premium
   - Intensive hydration (75 menit)

3. Facial Acne Solution: Rp 400.000
   - Khusus untuk kulit berjerawat
   - Include salicylic acid treatment

4. Facial Brightening: Rp 400.000
   - Untuk mencerahkan kulit kusam
   - Dengan vitamin C serum

5. Facial Anti-Aging: Rp 500.000
   - Anti-aging dengan peptide serum
   - Face massage lifting technique

Semua harga sudah termasuk konsultasi dokter GRATIS!
```

🏷️ **Expected Mood:** `curious` atau `neutral`

💡 **Expected Suggested Questions:**
- "Bagaimana cara booking facial?"
- "Berapa lama durasi facial treatment?"
- "Apakah ada paket hemat untuk facial?"

🔧 **Tool Called:** None (RAG retrieval)

⚠️ **Redirect to Agent:** `false`

📋 **Validation Notes:**
- ✅ Harus mention minimal 3-5 jenis facial
- ✅ Harga harus akurat sesuai FAQ
- ✅ Include brief description untuk each type

---

### 🔹 Question 7: "Treatment apa yang bagus untuk jerawat?"

✅ **Expected Answer:**
```
Untuk kulit berjerawat, kami merekomendasikan:

🎯 REKOMENDASI UTAMA:

1. Facial Acne Solution (Rp 400.000)
   - Treatment khusus untuk acne-prone skin
   - Include salicylic acid untuk deep clean
   - Ekstraksi komedo gentle
   - Anti-inflammatory mask

2. Chemical Peeling Light (Rp 350.000)
   - Menggunakan AHA/BHA
   - Exfoliasi mendalam
   - Cocok untuk jerawat aktif ringan-sedang

3. Laser Toning (Rp 800.000)
   - Untuk jerawat + bekas jerawat (scars)
   - Meratakan tekstur kulit
   - Reduce kemerahan

Dokter kami akan melakukan skin analysis dulu untuk
menentukan treatment yang paling cocok untuk kondisi
jerawat Anda. Konsultasi dokter GRATIS!
```

🏷️ **Expected Mood:** `curious` atau `confused`

💡 **Expected Suggested Questions:**
- "Berapa lama hasil treatment jerawat terlihat?"
- "Apakah jerawat bisa kambuh lagi setelah treatment?"
- "Bagaimana cara booking konsultasi dokter?"

🔧 **Tool Called:** None

⚠️ **Redirect to Agent:** `false`

📋 **Validation Notes:**
- ✅ Harus recommend specific treatments untuk acne
- ✅ Mention skin analysis sebelum treatment
- ✅ Tone helpful dan supportive

---

## Test 1.3: Booking & Appointment

### 🔹 Question 8: "Bagaimana cara booking appointment?"

✅ **Expected Answer:**
```
Ada 3 cara mudah untuk booking appointment:

📱 1. VIA WHATSAPP (PALING CEPAT):
   - Chat ke: +62 812-8888-5555
   - Format: "Halo, saya mau booking [nama treatment]
     untuk tanggal [DD/MM] jam [XX:00]"
   - Kami akan confirm ketersediaan slot
   - Response dalam 5-10 menit!

📞 2. VIA TELEPON:
   - Call: (021) 5555-8888
   - Langsung bicara dengan resepsionis
   - Jam kerja: 09:00-20:00 (Senin-Jumat)

🌐 3. ONLINE BOOKING:
   - Website: www.glowaesthetics.id
   - Klik "Book Now"
   - Pilih treatment, tanggal, dan jam
   - Isi data diri
   - Terima konfirmasi via email/WA

TIPS:
- Booking minimal H-1 untuk weekdays
- Booking H-3 untuk weekend (cepat penuh!)
- Member Premium bisa same-day booking

WhatsApp adalah cara tercepat dan paling praktis!
```

🏷️ **Expected Mood:** `curious`

💡 **Expected Suggested Questions:**
- "Apakah bisa booking untuk hari ini?"
- "Berapa lama durasi treatment facial?"
- "Apakah perlu DP untuk booking?"

🔧 **Tool Called:** None

⚠️ **Redirect to Agent:** `false`

📋 **Validation Notes:**
- ✅ Harus explain 3 cara booking: WA, Telepon, Online
- ✅ Include contact details lengkap
- ✅ Mention booking timeline (H-1, H-3)
- ✅ Tone helpful dan clear step-by-step

---

### 🔹 Question 9: "Apakah bisa booking untuk hari ini?"

✅ **Expected Answer:**
```
Ya, bisa! Kami menerima same-day booking tergantung
ketersediaan slot.

CARA BOOKING HARI INI:
1. Langsung WhatsApp: +62 812-8888-5555
2. Bilang: "Mau booking treatment [nama] untuk hari ini"
3. Kami akan cek slot available
4. Jika ada, langsung bisa fix jadwal!

CATATAN:
✅ Member Premium: Priority same-day booking
✅ Non-member: Subject to availability
✅ Weekend: Lebih sulit dapat slot (recommend book H-2 atau H-3)
✅ Treatment laser/injection: Minimal booking H-1 (perlu persiapan)

SLOT PALING SERING AVAILABLE:
- Pagi (09:00-11:00) - weekdays
- Sore (16:00-18:00) - weekdays

TIP: Facial Basic Glow lebih mudah dapat slot same-day
karena durasinya lebih pendek!

Chat kami sekarang untuk cek availability! 😊
```

🏷️ **Expected Mood:** `curious`

💡 **Expected Suggested Questions:**
- "Berapa lama durasi facial treatment?"
- "Apakah walk-in tanpa booking juga bisa?"
- "Apa benefit menjadi member premium?"

🔧 **Tool Called:** None

⚠️ **Redirect to Agent:** `false`

📋 **Validation Notes:**
- ✅ Jawab "Ya bisa" dengan clarification
- ✅ Explain process untuk same-day booking
- ✅ Mention slot availability constraints
- ✅ Suggest best time untuk same-day booking

---

## Test 1.4: Payment & Pricing

### 🔹 Question 10: "Metode pembayaran apa saja yang diterima?"

✅ **Expected Answer:**
```
Klinik Glow Aesthetics menerima berbagai metode pembayaran:

💳 PAYMENT METHODS AVAILABLE:

1. CASH (Tunai)
   - Rupiah only
   - Bayar di klinik setelah treatment

2. DEBIT CARD
   - Semua bank (BCA, Mandiri, BNI, BRI, dll)
   - EDC machine available

3. CREDIT CARD
   - Visa, Mastercard, JCB
   - Bisa cicilan 0% untuk 3/6/12 bulan (bank tertentu)

4. E-WALLET / QRIS
   - GoPay, OVO, Dana, ShopeePay
   - LinkAja, Flip
   - Scan QRIS langsung

5. BANK TRANSFER
   - BCA, Mandiri, BNI
   - Untuk pre-payment atau booking deposit

6. INSURANCE
   - Partner dengan 5+ insurance companies
   - Cek eligibility dengan customer service

NO HIDDEN COST! Harga yang tertera = harga final.
Tax & service charge sudah included.
```

🏷️ **Expected Mood:** `neutral` atau `curious`

💡 **Expected Suggested Questions:**
- "Apakah bisa bayar dengan QRIS?"
- "Apakah ada installment plan?"
- "Apakah perlu DP untuk booking?"

🔧 **Tool Called:** None

⚠️ **Redirect to Agent:** `false`

📋 **Validation Notes:**
- ✅ List minimal 4-5 payment methods
- ✅ Mention: Cash, Card, E-wallet, Transfer, Insurance
- ✅ Mention "no hidden cost"
- ✅ Format organized dengan categories

---

### 🔹 Question 11: "Apakah bisa bayar dengan QRIS?"

✅ **Expected Answer:**
```
Ya, bisa! Kami menerima pembayaran via QRIS untuk
semua e-wallet:

✅ QRIS ACCEPTED:
- GoPay
- OVO
- Dana
- ShopeePay
- LinkAja
- Flip
- Dan e-wallet lainnya

CARA BAYAR:
1. Setelah treatment selesai
2. Minta QRIS code ke resepsionis
3. Scan dengan e-wallet app Anda
4. Bayar sesuai nominal treatment
5. Terima receipt via email/WA

KEUNTUNGAN BAYAR PAKAI QRIS:
💰 Cashback promo dari e-wallet (check app Anda)
⚡ Instant payment confirmation
📱 Paperless - receipt langsung digital
🎁 Kadang ada promo khusus QRIS dari klinik

Payment method paling praktis dan cepat! 😊
```

🏷️ **Expected Mood:** `curious` atau `neutral`

💡 **Expected Suggested Questions:**
- "Apakah ada promo atau diskon?"
- "Apakah bisa cicilan untuk treatment mahal?"
- "Berapa minimum payment untuk QRIS?"

🔧 **Tool Called:** None

⚠️ **Redirect to Agent:** `false`

📋 **Validation Notes:**
- ✅ Jawab "Ya bisa" dengan confident
- ✅ List e-wallets yang supported
- ✅ Explain payment process
- ✅ Mention benefits/cashback

---

# 2️⃣ REAL-TIME TOOLS TESTING

## Test 2.1: Track Order

### 🔹 Question 12: "Dimana pesanan saya ORD-2025-001?"

✅ **Expected Answer:**
```
Saya sudah mengecek status pesanan Anda.

📦 ORDER ID: ORD-2025-001
📍 STATUS: In Transit (Dalam Pengiriman)
🚚 KURIR: JNE Regular

TRACKING INFO:
- Current Location: Hub Jakarta Selatan
- Last Update: 2025-01-09 14:30 WIB
- Estimated Delivery: 10 Januari 2025

RIWAYAT:
✅ 08 Jan, 09:00 - Pesanan dikemas
✅ 08 Jan, 15:00 - Diserahkan ke kurir JNE
✅ 09 Jan, 08:00 - Tiba di hub Jakarta Selatan
🔄 09 Jan, 14:30 - Dalam perjalanan ke alamat Anda

Pesanan Anda akan tiba besok! Anda akan menerima notifikasi
SMS/WA saat paket dalam perjalanan untuk pengiriman.

Ada yang bisa saya bantu lagi?
```

🏷️ **Expected Mood:** `curious` atau `neutral`

💡 **Expected Suggested Questions:**
- "Apakah bisa ubah alamat pengiriman?"
- "Bagaimana jika pesanan belum sampai sesuai estimasi?"
- "Apakah ada nomor resi tracking?"

🔧 **Tool Called:** `track_order` ✅

⚠️ **Redirect to Agent:** `false`

📋 **Validation Notes:**
- ✅ Tool `track_order` MUST be called
- ✅ Response TIDAK boleh raw JSON
- ✅ Harus formatted dengan clean text
- ✅ Include: Order ID, Status, Location, Estimated delivery
- ✅ Tone helpful dan informative
- ⚠️ Check console logs untuk verify tool call:
  ```
  [Tool Call] track_order with order_id: ORD-2025-001
  ```

---

### 🔹 Question 13: "Status pengiriman order ORD-2025-002?"

✅ **Expected Answer:**
```
Status pesanan Anda sudah saya cek:

📦 ORDER ID: ORD-2025-002
📍 STATUS: Delivered (Sudah Diterima)
✅ DELIVERED DATE: 7 Januari 2025, 16:45 WIB

DETAIL PENERIMA:
- Diterima oleh: [Nama penerima]
- Lokasi: [Alamat customer]

Pesanan Anda sudah sampai dengan selamat kemarin!
Apakah produk sudah diterima dengan baik?

Jika ada kendala dengan produk (rusak/cacat/salah item),
mohon segera hubungi kami untuk proses retur/penggantian.
Claim maksimal 3 hari setelah diterima.
```

🏷️ **Expected Mood:** `neutral` atau `curious`

💡 **Expected Suggested Questions:**
- "Bagaimana cara retur produk?"
- "Apakah bisa komplain jika produk rusak?"
- "Berapa lama proses refund?"

🔧 **Tool Called:** `track_order` ✅

⚠️ **Redirect to Agent:** `false`

📋 **Validation Notes:**
- ✅ Tool called correctly
- ✅ Show delivery status clearly
- ✅ Mention claim policy (3 hari)
- ✅ Proactive: Ask if product received okay

---

## Test 2.2: Verify Payment

### 🔹 Question 14: "Sudah terbayar belum pesanan ORD-2025-001?"

✅ **Expected Answer:**
```
Saya sudah mengecek status pembayaran Anda:

💳 ORDER ID: ORD-2025-001
✅ PAYMENT STATUS: PAID (Sudah Lunas)

DETAIL PEMBAYARAN:
- Payment Method: Transfer Bank BCA
- Amount Paid: Rp 450.000
- Payment Date: 8 Januari 2025, 10:30 WIB
- Payment Confirmed: 8 Januari 2025, 11:00 WIB

Pembayaran Anda sudah kami terima dan dikonfirmasi! ✅
Pesanan sedang dalam proses pengiriman.

Receipt sudah dikirim ke email Anda.
Butuh invoice resmi untuk keperluan kantor?
```

🏷️ **Expected Mood:** `neutral` atau `curious`

💡 **Expected Suggested Questions:**
- "Kapan pesanan saya dikirim?"
- "Apakah bisa minta invoice untuk reimbursement?"
- "Dimana pesanan saya sekarang?"

🔧 **Tool Called:** `verify_payment` ✅

⚠️ **Redirect to Agent:** `false`

📋 **Validation Notes:**
- ✅ Tool `verify_payment` MUST be called
- ✅ Show clear payment status: PAID/PENDING/FAILED
- ✅ Include payment details: method, amount, date
- ✅ Proactive: Offer invoice if needed
- ✅ NOT raw JSON format

---

### 🔹 Question 15: "Cek status pembayaran order ORD-2025-003"

✅ **Expected Answer:**
```
Saya sudah cek pembayaran pesanan Anda:

💳 ORDER ID: ORD-2025-003
⏳ PAYMENT STATUS: PENDING (Menunggu Pembayaran)

DETAIL PEMBAYARAN:
- Total Amount: Rp 1.200.000
- Payment Deadline: 10 Januari 2025, 23:59 WIB
- Payment Method: Transfer Bank

CARA PEMBAYARAN:

📌 BANK BCA
No. Rekening: 1234567890
Atas nama: PT Glow Aesthetics Indonesia
Nominal: Rp 1.200.000

INSTRUKSI:
1. Transfer tepat sesuai nominal (Rp 1.200.000)
2. Kirim bukti transfer via WhatsApp: +62 812-8888-5555
3. Konfirmasi dalam 1x24 jam
4. Pesanan akan diproses setelah payment confirmed

⚠️ PENTING: Jika tidak dibayar sebelum deadline,
order akan otomatis dibatalkan.

Butuh bantuan untuk payment?
```

🏷️ **Expected Mood:** `neutral`

💡 **Expected Suggested Questions:**
- "Apakah bisa extend deadline pembayaran?"
- "Apakah bisa ubah payment method?"
- "Bagaimana cara kirim bukti transfer?"

🔧 **Tool Called:** `verify_payment` ✅

⚠️ **Redirect to Agent:** `false`

📋 **Validation Notes:**
- ✅ Tool called correctly
- ✅ Clear payment status: PENDING
- ✅ Include payment instructions dengan detail lengkap:
  - Bank account number
  - Exact amount
  - Payment deadline
- ✅ Clear steps untuk complete payment
- ✅ Mention consequences jika tidak bayar

---

## Test 2.3: Check Inventory

### 🔹 Question 16: "Apakah serum vitamin C masih ada stock?"

✅ **Expected Answer:**
```
Saya sudah cek stock untuk Anda:

📦 PRODUK: Serum Vitamin C
✅ STATUS: IN STOCK
📊 STOCK TERSEDIA: 24 unit

DETAIL PRODUK:
- Nama: Some By Mi Yuja Niacin Brightening Serum
- Harga: Rp 185.000
- Size: 50ml
- Made in: Korea

BENEFIT:
✨ Mencerahkan kulit kusam
✨ Reduce dark spots
✨ Boost collagen production
✨ Antioxidant protection

Stock ready untuk immediate purchase!
Bisa dibeli langsung di klinik atau order via WhatsApp
untuk delivery.

Mau order sekarang?
```

🏷️ **Expected Mood:** `curious` atau `neutral`

💡 **Expected Suggested Questions:**
- "Bagaimana cara order produk?"
- "Apakah ada promo untuk skincare products?"
- "Produk lain apa yang recommended?"

🔧 **Tool Called:** `check_inventory` ✅

⚠️ **Redirect to Agent:** `false`

📋 **Validation Notes:**
- ✅ Tool `check_inventory` MUST be called
- ✅ Show stock status clearly: IN STOCK / OUT OF STOCK
- ✅ Include stock quantity (e.g., "24 unit")
- ✅ Optional: Include product details (price, size)
- ✅ Proactive: Ask if customer wants to order
- ✅ NOT raw JSON

---

### 🔹 Question 17: "Cek ketersediaan moisturizer dan toner"

✅ **Expected Answer:**
```
Saya sudah cek stock kedua produk untuk Anda:

1️⃣ COSRX Advanced Snail Mucin Moisturizer
   ✅ STATUS: IN STOCK
   📊 STOCK: 18 unit
   💰 HARGA: Rp 145.000

2️⃣ Some By Mi AHA BHA PHA 30 Days Miracle Toner
   ✅ STATUS: IN STOCK
   📊 STOCK: 32 unit
   💰 HARGA: Rp 165.000

📦 PAKET COMBO HEMAT:
Beli keduanya dapat diskon 10%!
Total: Rp 279.000 (hemat Rp 31.000)

Stock ready dan bisa langsung dibeli hari ini!
Mau saya buatkan pesanan?
```

🏷️ **Expected Mood:** `curious`

💡 **Expected Suggested Questions:**
- "Bagaimana cara order 2 produk sekaligus?"
- "Apakah ada paket bundling untuk skincare?"
- "Berapa ongkir jika order untuk delivery?"

🔧 **Tool Called:** `check_inventory` ✅

⚠️ **Redirect to Agent:** `false`

📋 **Validation Notes:**
- ✅ Tool called untuk multiple products
- ✅ Show stock untuk BOTH products
- ✅ Format organized (numbering/bullets)
- ✅ Proactive: Offer combo discount jika applicable
- ✅ Ask if want to order

---

## Test 2.4: Get Order Summary

### 🔹 Question 18: "Berapa total pesanan saya?"

✅ **Expected Answer:**
```
Saya sudah cek ringkasan pesanan Anda:

📊 ORDER SUMMARY:

TOTAL ORDERS: 5 pesanan
💰 TOTAL SPENDING: Rp 2.450.000

RECENT ORDERS:
1. ORD-2025-001 - Facial Premium Hydrating (Rp 450.000)
   Status: In Transit
   Date: 8 Jan 2025

2. ORD-2024-178 - Serum Vitamin C + Moisturizer (Rp 320.000)
   Status: Delivered
   Date: 28 Des 2024

3. ORD-2024-156 - Laser Toning Treatment (Rp 800.000)
   Status: Completed
   Date: 15 Des 2024

4. ORD-2024-132 - Facial Acne Solution (Rp 400.000)
   Status: Completed
   Date: 2 Des 2024

5. ORD-2024-089 - Chemical Peeling (Rp 350.000)
   Status: Completed
   Date: 10 Nov 2024

🎁 LOYALTY STATUS:
Anda sudah menghabiskan Rp 2.450.000
Hanya Rp 550.000 lagi untuk upgrade ke GOLD MEMBER
(diskon 15% untuk semua treatment!)

Thank you for being a loyal customer! 💚
```

🏷️ **Expected Mood:** `curious` atau `neutral`

💡 **Expected Suggested Questions:**
- "Bagaimana cara jadi Gold Member?"
- "Apa benefit menjadi member?"
- "Apakah ada program referral?"

🔧 **Tool Called:** `get_order_summary` ✅

⚠️ **Redirect to Agent:** `false`

📋 **Validation Notes:**
- ✅ Tool `get_order_summary` MUST be called
- ✅ Show total order count
- ✅ Show total spending amount
- ✅ List recent orders (at least 3-5)
- ✅ Include order details: ID, product, amount, status, date
- ✅ Proactive: Mention loyalty program/membership
- ✅ Format organized dengan clear structure
- ✅ NOT raw JSON

---

# 3️⃣ MULTI-LANGUAGE TESTING

## Test 3.1: Bahasa Indonesia

### 🔹 Question 19: "Berapa harga treatment jerawat?"

✅ **Expected Answer:**
```
Harga treatment untuk jerawat di Klinik Glow Aesthetics:

1. Facial Acne Solution: Rp 400.000
   - Treatment khusus untuk acne-prone skin
   - Include salicylic acid & ekstraksi komedo
   - Durasi: 60 menit

2. Chemical Peeling Light: Rp 350.000
   - Exfoliasi dengan AHA/BHA
   - Cocok untuk jerawat aktif ringan-sedang
   - Durasi: 45 menit

3. Laser Toning: Rp 800.000
   - Untuk jerawat + bekas jerawat (scars)
   - Meratakan tekstur kulit
   - Durasi: 40 menit

Dokter akan melakukan skin analysis dulu (GRATIS) untuk
tentukan treatment yang paling sesuai dengan kondisi
kulit Anda.
```

🏷️ **Expected Mood:** `curious`

💡 **Expected Suggested Questions (MUST IN INDONESIAN):**
- "Berapa kali treatment diperlukan untuk hasil maksimal?"
- "Apakah jerawat bisa kambuh lagi?"
- "Bagaimana cara booking konsultasi dokter?"

🔧 **Tool Called:** None

⚠️ **Redirect to Agent:** `false`

📋 **Validation Notes:**
- ✅ Response MUST be in Bahasa Indonesia
- ✅ Grammar natural dan tidak kaku
- ✅ Suggested questions juga dalam Bahasa Indonesia
- ✅ No English mixing (kecuali brand names)

---

## Test 3.2: English

### 🔹 Question 20: "What is the price for acne treatment?"

✅ **Expected Answer:**
```
Acne treatment prices at Glow Aesthetics Clinic:

1. Facial Acne Solution: Rp 400,000
   - Specialized treatment for acne-prone skin
   - Includes salicylic acid & gentle extraction
   - Duration: 60 minutes

2. Chemical Peeling Light: Rp 350,000
   - AHA/BHA exfoliation
   - Suitable for mild to moderate active acne
   - Duration: 45 minutes

3. Laser Toning: Rp 800,000
   - For acne + acne scars treatment
   - Evens out skin texture
   - Duration: 40 minutes

Our doctor will perform a FREE skin analysis first to
determine the most suitable treatment for your skin condition.
```

🏷️ **Expected Mood:** `curious`

💡 **Expected Suggested Questions (MUST IN ENGLISH):**
- "How many sessions are needed for optimal results?"
- "Can acne come back after treatment?"
- "How do I book a doctor consultation?"

🔧 **Tool Called:** None

⚠️ **Redirect to Agent:** `false`

📋 **Validation Notes:**
- ✅ Response MUST be in English
- ✅ Grammar correct dan natural
- ✅ Suggested questions juga dalam English
- ✅ Price format: "Rp 400,000" (with comma)
- ✅ Professional tone

---

# 4️⃣ MOOD DETECTION TESTING

## Test 4.1: Positive Mood

### 🔹 Question 21: "Wah kliniknya bagus sekali! Saya tertarik booking"

✅ **Expected Answer:**
```
Terima kasih! Kami senang Anda tertarik dengan klinik kami! 😊

Untuk booking appointment, Anda bisa:

📱 WhatsApp (PALING CEPAT):
   +62 812-8888-5555
   Chat: "Halo, saya mau booking [treatment] untuk [tanggal]"

📞 Telepon:
   (021) 5555-8888

🌐 Website:
   www.glowaesthetics.id → klik "Book Now"

Treatment apa yang Anda minati?
- Facial (basic/premium/acne/brightening)
- Laser treatment
- Chemical peeling
- Atau mau konsultasi dokter dulu?

Tim kami siap membantu Anda mendapatkan kulit impian! 💚
```

🏷️ **Expected Mood:** `positive` ✅

💡 **Expected Suggested Questions:**
- "Apa saja treatment yang paling populer?"
- "Berapa harga facial basic?"
- "Apakah ada promo untuk first-timer?"

🔧 **Tool Called:** None

⚠️ **Redirect to Agent:** `false`

📋 **Validation Notes:**
- ✅ Bot detects mood: **positive**
- ✅ Response tone: Friendly, warm, enthusiastic
- ✅ Use positive language: "senang", "siap membantu"
- ✅ May include emoji (appropriate amount)
- ✅ Proactive: Ask what treatment interested

---

## Test 4.2: Curious Mood

### 🔹 Question 22: "Saya penasaran, apa bedanya chemical peeling dan laser treatment?"

✅ **Expected Answer:**
```
Pertanyaan bagus! Mari saya jelaskan perbedaannya:

🧪 CHEMICAL PEELING:

CARA KERJA:
- Menggunakan asam kimia (AHA/BHA/PHA)
- Exfoliasi lapisan kulit terluar secara kimia
- Melepaskan sel kulit mati

UNTUK:
- Kulit kusam
- Jerawat ringan-sedang
- Fine lines
- Hyperpigmentation ringan

KELEBIHAN:
✅ Lebih gentle
✅ Minimal downtime (2-3 hari)
✅ Harga lebih terjangkau (Rp 350k-600k)

⚡ LASER TREATMENT:

CARA KERJA:
- Menggunakan sinar laser (light energy)
- Penetrasi lebih dalam ke dermis
- Stimulasi collagen production

UNTUK:
- Acne scars (bekas jerawat)
- Deep wrinkles
- Severe hyperpigmentation
- Skin tightening

KELEBIHAN:
✅ Hasil lebih dramatis
✅ Long-lasting results
✅ Cocok untuk masalah kulit yang lebih serius

DOWNTIME:
- Chemical peeling: 2-3 hari
- Laser: 5-7 hari

HARGA:
- Chemical peeling: Rp 350k-600k
- Laser: Rp 800k-1.2jt

REKOMENDASI:
Konsultasi dengan dokter untuk tahu mana yang lebih
cocok untuk kondisi kulit Anda. Konsultasi GRATIS!
```

🏷️ **Expected Mood:** `curious` ✅

💡 **Expected Suggested Questions:**
- "Mana yang lebih cocok untuk pemula?"
- "Apakah bisa kombinasi keduanya?"
- "Bagaimana cara booking konsultasi dokter?"

🔧 **Tool Called:** None

⚠️ **Redirect to Agent:** `false`

📋 **Validation Notes:**
- ✅ Bot detects mood: **curious**
- ✅ Response tone: Informative, educational, detailed
- ✅ Explain thoroughly dengan comparison table/list
- ✅ No condescending tone
- ✅ Encourage consultation untuk personalized advice

---

## Test 4.3: Negative/Frustrated Mood

### 🔹 Question 23: "Treatment kemarin malah bikin kulit saya iritasi!"

✅ **Expected Answer:**
```
Mohon maaf sekali mendengar hal ini terjadi.
Kami sangat prihatin dengan kondisi kulit Anda. 🙏

Reaksi iritasi setelah treatment bisa terjadi karena
beberapa faktor (alergi, kulit sensitif, atau post-treatment
normal reaction).

YANG PERLU DILAKUKAN SEKARANG:

1. ⚠️ JANGAN gunakan produk lain dulu
2. 💧 Kompres dengan air dingin (10-15 menit)
3. 🧴 Gunakan moisturizer gentle (jika ada)
4. ❌ Hindari sunlight langsung

PENTING:
Saya akan menghubungkan Anda dengan tim customer service
dan dokter kami untuk penanganan lebih lanjut.

📱 EMERGENCY CONTACT:
- WhatsApp: +62 812-8888-5555
- Emergency Hotline: +62 811-9999-5555 (dr. Amanda on-call)

Atau jika kondisi sangat serius (bengkak parah, sesak napas),
segera ke IGD rumah sakit terdekat.

Tim kami akan segera menghubungi Anda untuk follow-up
dan solusi terbaik. Sekali lagi mohon maaf atas ketidaknyamanan ini.
```

🏷️ **Expected Mood:** `negative` atau `frustrated` ✅

💡 **Expected Suggested Questions:**
- "Bagaimana cara klaim garansi treatment?"
- "Apakah bisa refund jika tidak puas?"
- "Bagaimana proses komplain resmi?"

🔧 **Tool Called:** None

⚠️ **Redirect to Agent:** `true` ✅ VERY IMPORTANT!

📋 **Validation Notes:**
- ✅ Bot detects mood: **negative** or **frustrated**
- ✅ Response tone: Empathetic, apologetic, urgent
- ✅ **MUST redirect to human agent**: `should_redirect: true`
- ✅ Provide immediate action steps
- ✅ Provide emergency contact details
- ✅ Express genuine concern & apology
- ✅ **Email notification sent** to agent email
- ✅ **Conversation status: REDIRECTED** in database

---

## Test 4.4: Confused Mood

### 🔹 Question 24: "Saya bingung harus pilih treatment yang mana"

✅ **Expected Answer:**
```
Tidak perlu bingung! Saya akan bantu Anda pilih treatment
yang paling cocok. 😊

Untuk recommend treatment yang tepat, saya perlu tahu
dulu beberapa hal:

❓ PERTANYAAN SIMPLE:

1. Apa concern utama kulit Anda?
   - Jerawat aktif
   - Bekas jerawat (scars)
   - Kulit kusam
   - Flek hitam / dark spots
   - Kerutan / aging
   - Kulit kering
   - Atau lainnya?

2. Pernah treatment sebelumnya?
   - Belum pernah sama sekali (first-timer)
   - Pernah facial biasa
   - Pernah laser/advanced treatment

3. Budget range Anda?
   - Under Rp 500k
   - Rp 500k - 1jt
   - Above 1jt
   - Flexible

Kalau Anda jawab 3 pertanyaan ini, saya bisa kasih
rekomendasi treatment yang paling sesuai!

ATAU: Anda juga bisa langsung konsultasi GRATIS dengan
dokter kami (dr. Amanda, Sp.KK) untuk skin analysis
profesional. Dokter akan recommend treatment terbaik
sesuai kondisi kulit Anda.

Mau saya bantu pilih sekarang atau prefer konsul dokter dulu?
```

🏷️ **Expected Mood:** `confused` ✅

💡 **Expected Suggested Questions:**
- "Apa treatment yang paling recommended untuk pemula?"
- "Berapa harga konsultasi dokter?"
- "Apakah bisa trial treatment dulu sebelum commit?"

🔧 **Tool Called:** None

⚠️ **Redirect to Agent:** `false`

📋 **Validation Notes:**
- ✅ Bot detects mood: **confused**
- ✅ Response tone: Helpful, patient, guiding
- ✅ Break down complexity into simple questions
- ✅ Use bullet points / numbered lists
- ✅ Provide clear options
- ✅ Offer consultation sebagai alternative
- ✅ Not overwhelming dengan too much info at once

---

# 5️⃣ HUMAN AGENT HANDOFF TESTING

## Test 5.1: Complex Complaint

### 🔹 Question 25: "Saya mau komplain, dokternya tidak profesional!"

✅ **Expected Answer:**
```
Mohon maaf sekali mendengar pengalaman Anda yang kurang
menyenangkan. Kami sangat serius dalam menangani komplain
seperti ini. 🙏

Saya akan segera menghubungkan Anda dengan Customer Care
Manager kami untuk menindaklanjuti komplain ini secara langsung.

Yang akan dilakukan:
1. ✅ Tim kami akan menghubungi Anda dalam 1-2 jam
2. ✅ Investigasi menyeluruh terhadap kasus ini
3. ✅ Solusi terbaik untuk Anda
4. ✅ Follow-up sampai masalah terselesaikan

Untuk mempercepat proses, mohon hubungi:

📱 WhatsApp: +62 812-8888-5555
📧 Email: complaints@glowaesthetics.id
☎️ Hotline: (021) 5555-8888 (ext. 3 untuk complaints)

Atau tim kami akan menghubungi Anda terlebih dahulu.

Mohon berikan sedikit detail:
- Kapan kejadian ini?
- Nama treatment yang dilakukan?
- Detail masalah yang dialami?

Feedback Anda sangat penting untuk kami improve layanan.
Terima kasih atas kesabarannya.
```

🏷️ **Expected Mood:** `negative` atau `frustrated`

💡 **Expected Suggested Questions:**
- "Bagaimana prosedur komplain resmi?"
- "Berapa lama proses penyelesaian komplain?"
- "Apakah ada garansi atau kompensasi?"

🔧 **Tool Called:** None

⚠️ **Redirect to Agent:** `true` ✅✅✅ CRITICAL!

📋 **Validation Notes:**
- ✅✅✅ **MUST redirect**: `should_redirect: true`
- ✅ **Redirect reason**: "complaint" or "customer dissatisfaction"
- ✅ Response: Empathetic, apologetic, action-oriented
- ✅ Provide multiple contact channels
- ✅ Set expectation untuk response time (1-2 jam)
- ✅ **Email notification sent** to AGENT_EMAIL
- ✅ **Database conversation status**: `REDIRECTED`
- ✅ **Admin dashboard** should show this conversation
- ⚠️ IF NOT REDIRECTING = CRITICAL BUG!

---

## Test 5.2: Refund Request

### 🔹 Question 26: "Saya mau refund pesanan saya"

✅ **Expected Answer:**
```
Saya mengerti Anda ingin melakukan refund.

Untuk proses refund, ada beberapa hal yang perlu kami cek dulu:
- Alasan refund
- Kapan pesanan/treatment dilakukan
- Apakah sesuai dengan kebijakan refund kami

KEBIJAKAN REFUND UMUM:
✅ Treatment belum dilakukan: Full refund
✅ Produk belum dibuka/dipakai: Full refund (maks 7 hari)
✅ Treatment sudah dilakukan tapi ada masalah: Partial refund
   atau free treatment ulang (case by case)
❌ Treatment sudah dilakukan dengan normal results:
   No refund (sesuai ToS)

Karena refund request memerlukan approval dan verifikasi,
saya akan menghubungkan Anda dengan Finance & Customer Service
team untuk proses lebih lanjut.

📱 KONTAK UNTUK REFUND:
- WhatsApp: +62 812-8888-5555 (mention "Refund Request")
- Email: refund@glowaesthetics.id
- Telepon: (021) 5555-8888 (ext. 2)

Atau tim kami akan menghubungi Anda dalam 1-2 jam untuk
proses refund.

Mohon siapkan:
- Order ID / Invoice number
- Alasan refund
- Bukti pendukung (foto, medical report, dll - jika ada)

Proses refund biasanya 3-7 hari kerja setelah approved.
```

🏷️ **Expected Mood:** `neutral` atau `negative`

💡 **Expected Suggested Questions:**
- "Berapa lama proses refund?"
- "Apakah bisa partial refund?"
- "Bagaimana jika komplain sudah lewat 7 hari?"

🔧 **Tool Called:** None

⚠️ **Redirect to Agent:** `true` ✅✅✅

📋 **Validation Notes:**
- ✅✅✅ **MUST redirect**: `should_redirect: true`
- ✅ **Redirect reason**: "refund request requires approval"
- ✅ Explain general refund policy
- ✅ Set clear expectations (timeline, documents needed)
- ✅ Provide contact untuk refund team
- ✅ **Email sent** to agent
- ✅ **Status**: REDIRECTED in database

---

## Test 5.3: Appointment Cancellation

### 🔹 Question 27: "Tolong cancel appointment saya tanggal 15 Jan"

✅ **Expected Answer:**
```
Baik, saya akan bantu proses pembatalan appointment Anda.

KEBIJAKAN PEMBATALAN:
✅ Cancel H-2 atau lebih: Free cancellation (no charge)
✅ Cancel H-1: Charge 25% dari harga treatment
❌ Cancel H (same day): Charge 50% dari harga treatment
❌ No-show: Charge 100%

Untuk proses cancellation dan cek apakah appointment Anda
ada biaya pembatalan atau tidak, saya akan hubungkan Anda
dengan Booking Team.

📱 UNTUK CANCEL APPOINTMENT:
- WhatsApp: +62 812-8888-5555 (mention "Cancel Appointment")
- Telepon: (021) 5555-8888 (langsung ke receptionist)

INFORMASI YANG DIBUTUHKAN:
- Nama lengkap Anda
- Tanggal appointment: 15 Januari
- Treatment apa yang di-book
- (Optional) Alasan pembatalan

Apakah Anda ingin reschedule ke tanggal lain atau
pembatalan permanen?

Tim kami akan confirm cancellation dalam 30 menit via WhatsApp.
```

🏷️ **Expected Mood:** `neutral`

💡 **Expected Suggested Questions:**
- "Apakah bisa reschedule tanpa biaya?"
- "Bagaimana jika ada emergency dan harus cancel H?"
- "Apakah deposit bisa dikembalikan?"

🔧 **Tool Called:** None

⚠️ **Redirect to Agent:** `true` ✅

📋 **Validation Notes:**
- ✅ **MUST redirect**: `should_redirect: true`
- ✅ **Reason**: "requires access to booking system"
- ✅ Explain cancellation policy clearly
- ✅ Ask if prefer reschedule vs cancel
- ✅ Provide direct contact untuk urgent cancellation
- ✅ Set expectation: 30 min confirmation time

---

# 6️⃣ EDGE CASES & ERROR HANDLING

## Test 6.1: Invalid Input

### 🔹 Question 28: "asdfghjkl"

✅ **Expected Answer:**
```
Maaf, saya tidak mengerti maksud Anda.

Bisa tolong jelaskan lebih detail apa yang ingin Anda tanyakan?

Beberapa hal yang bisa saya bantu:
- Informasi klinik (lokasi, jam buka, kontak)
- Treatment dan harga
- Cara booking appointment
- Track pesanan
- Cek status pembayaran
- Cek stock produk
- Komplain atau feedback

Atau Anda bisa langsung hubungi customer service kami:
📱 WhatsApp: +62 812-8888-5555
```

🏷️ **Expected Mood:** `neutral` atau `confused`

💡 **Expected Suggested Questions:**
- "Dimana lokasi klinik?"
- "Apa saja treatment yang tersedia?"
- "Bagaimana cara booking?"

🔧 **Tool Called:** None

⚠️ **Redirect to Agent:** `false`

📋 **Validation Notes:**
- ✅ Bot should NOT crash
- ✅ Graceful error handling
- ✅ Polite response: "Maaf, saya tidak mengerti"
- ✅ Provide help menu / options
- ✅ Offer suggested questions
- ✅ Provide fallback: contact human CS

---

## Test 6.2: Out of Scope

### 🔹 Question 29: "Siapa presiden Indonesia?"

✅ **Expected Answer:**
```
Maaf, saya hanya bisa membantu dengan pertanyaan seputar
Klinik Glow Aesthetics dan layanan kami.

Saya tidak bisa menjawab pertanyaan umum di luar scope
klinik kecantikan.

APA YANG BISA SAYA BANTU?
✅ Informasi treatment & harga
✅ Booking appointment
✅ Lokasi & jam operasional klinik
✅ Track order & payment
✅ Produk skincare
✅ Konsultasi treatment

Ada yang bisa saya bantu seputar klinik kami?
```

🏷️ **Expected Mood:** `neutral`

💡 **Expected Suggested Questions:**
- "Apa saja treatment yang tersedia?"
- "Berapa harga facial basic?"
- "Dimana lokasi klinik?"

🔧 **Tool Called:** None

⚠️ **Redirect to Agent:** `false`

📋 **Validation Notes:**
- ✅ Bot decline politely
- ✅ Explain scope limitation
- ✅ Redirect conversation to relevant topics
- ✅ Offer help menu
- ✅ NOT fabricate answer untuk out-of-scope questions

---

## Test 6.3: Invalid Order ID

### 🔹 Question 30: "Track pesanan ORD-9999-XXX"

✅ **Expected Answer:**
```
Saya sudah mencoba mencari pesanan dengan ID ORD-9999-XXX,
tetapi tidak ditemukan dalam sistem kami.

KEMUNGKINAN:
1. ❌ Order ID salah ketik
2. ❌ Order belum terdaftar dalam sistem (terlalu baru)
3. ❌ Order dari platform lain (bukan Glow Aesthetics)

SOLUSI:
✅ Cek kembali Order ID Anda (biasanya di email/WhatsApp confirmation)
✅ Format Order ID kami: ORD-YYYY-NNN (contoh: ORD-2025-001)
✅ Atau hubungi customer service dengan nama & nomor HP Anda

📱 CUSTOMER SERVICE:
- WhatsApp: +62 812-8888-5555
- Telepon: (021) 5555-8888

Tim kami bisa bantu track dengan data lain (nama, HP, email).

Mau coba dengan Order ID lain?
```

🏷️ **Expected Mood:** `neutral` atau `confused`

💡 **Expected Suggested Questions:**
- "Bagaimana format Order ID yang benar?"
- "Berapa lama setelah order baru dapat Order ID?"
- "Apakah bisa track tanpa Order ID?"

🔧 **Tool Called:** `track_order` (akan return "not found")

⚠️ **Redirect to Agent:** `false`

📋 **Validation Notes:**
- ✅ Tool called tapi handle "not found" gracefully
- ✅ NO crash atau error message
- ✅ Explain kemungkinan penyebab
- ✅ Provide solutions
- ✅ Offer alternative (contact CS dengan data lain)
- ✅ Ask if want to try different Order ID

---

# 7️⃣ SEMANTIC SEARCH & RAG TESTING

## Test 7.1: Semantic Understanding

### 🔹 Question 31: "Kulit saya berjerawat, gimana cara mengatasinya?"

✅ **Expected Answer:**
```
Untuk mengatasi kulit berjerawat, Klinik Glow Aesthetics
punya beberapa treatment yang efektif:

🎯 REKOMENDASI:

1. Facial Acne Solution (Rp 400.000)
   - Treatment khusus untuk acne-prone skin
   - Include salicylic acid, ekstraksi, anti-inflammatory mask
   - Durasi: 60 menit
   - Cocok untuk: Jerawat aktif ringan-sedang

2. Chemical Peeling Light (Rp 350.000)
   - Exfoliasi mendalam dengan AHA/BHA
   - Buka pori tersumbat
   - Reduce inflammation
   - Durasi: 45 menit

3. Laser Toning (Rp 800.000)
   - Untuk jerawat + bekas jerawat
   - Hasil lebih dramatis
   - Durasi: 40 menit

TREATMENT PLAN KAMI:
- Konsultasi GRATIS dengan dokter untuk skin analysis
- Dokter akan tentukan treatment paling cocok
- Regular treatment (biasanya 4-6 sesi untuk hasil optimal)
- Home care skincare recommendation

Jangan khawatir, dr. Amanda spesialist di acne treatment!
Sudah handle ribuan kasus acne. Mau booking konsultasi?
```

🏷️ **Expected Mood:** `curious` atau `confused`

💡 **Expected Suggested Questions:**
- "Berapa kali treatment diperlukan?"
- "Apakah jerawat bisa sembuh permanen?"
- "Bagaimana cara booking konsultasi dokter?"

🔧 **Tool Called:** None (RAG semantic search)

⚠️ **Redirect to Agent:** `false`

📋 **Validation Notes:**
- ✅ Bot understand: "berjerawat" = "acne"
- ✅ Bot understand: "cara mengatasi" = asking for treatment
- ✅ Semantic search via Pinecone/Voyage AI working
- ✅ Retrieved relevant context tentang acne treatment
- ✅ Answer comprehensive meskipun wording berbeda dari FAQ
- ✅ Show treatment options dengan detail

---

# 📊 QUICK VALIDATION CHECKLIST

Setelah testing, gunakan checklist ini:

## ✅ FAQ & Basic Features
- [ ] Bot memberikan jawaban akurat sesuai knowledge base
- [ ] Format response clean (NOT raw JSON)
- [ ] Bahasa natural dan tidak robotic
- [ ] Suggested questions relevant (3 pertanyaan)
- [ ] Response time < 5 seconds

## ✅ Real-Time Tools
- [ ] `track_order` tool called dan return formatted response
- [ ] `verify_payment` tool called dan show clear payment status
- [ ] `check_inventory` tool called dan show stock info
- [ ] `get_order_summary` tool called dan show order history
- [ ] All tool responses formatted (NOT raw JSON)
- [ ] Check console logs untuk verify tool calls

## ✅ Multi-Language
- [ ] Bot detect Bahasa Indonesia correctly
- [ ] Bot detect English correctly
- [ ] Response bahasa match user input language
- [ ] Suggested questions dalam bahasa yang sama

## ✅ Mood Detection
- [ ] Positive mood detected → friendly tone
- [ ] Curious mood detected → informative tone
- [ ] Negative mood detected → empathetic tone + REDIRECT
- [ ] Frustrated mood detected → urgent tone + REDIRECT
- [ ] Confused mood detected → guiding tone dengan simple steps

## ✅ Human Agent Handoff
- [ ] Komplain → `redirect_to_agent: true`
- [ ] Refund request → `redirect_to_agent: true`
- [ ] Appointment cancellation → `redirect_to_agent: true`
- [ ] Email notification sent to agent
- [ ] Conversation status `REDIRECTED` in database
- [ ] Admin dashboard shows pending conversation

## ✅ Error Handling
- [ ] Invalid input handled gracefully (no crash)
- [ ] Out-of-scope questions declined politely
- [ ] Invalid Order ID handled dengan clear error message
- [ ] Very long input processed without timeout

## ✅ RAG & Context
- [ ] Semantic search working (Pinecone + Voyage AI)
- [ ] Bot understand different wording for same question
- [ ] Context dari knowledge base digunakan
- [ ] Bot honest ketika tidak tahu jawaban (tidak fabricate)

---

# 🎯 CRITICAL BUGS TO WATCH FOR

## 🚨 HIGH PRIORITY BUGS:

### Bug #1: Raw JSON Response
**Symptoms:** Bot returns raw JSON instead of formatted text
```json
{"order_id": "ORD-2025-001", "status": "delivered"}
```
**Expected:** Clean formatted text
**Fix:** Check tool response parsing in route.ts

---

### Bug #2: Tools Not Being Called
**Symptoms:** User asks "Track order ORD-2025-001" but tool tidak dipanggil
**Expected:** Tool `track_order` should be called
**Fix:** Check tool definitions, tool_choice parameter, Anthropic API integration

---

### Bug #3: No Redirect When Should
**Symptoms:** User komplain tapi `redirect_to_agent: false`
**Expected:** `redirect_to_agent: true` untuk complaints/refunds/cancellations
**Fix:** Check redirect logic in route.ts, check email sending, check database update

---

### Bug #4: Wrong Language Response
**Symptoms:** User tanya dalam Indonesian tapi bot jawab dalam English
**Expected:** Response bahasa harus match user input
**Fix:** Check language detection, check system prompt instructions

---

### Bug #5: Crash on Invalid Input
**Symptoms:** Bot error/timeout pada invalid input or very long text
**Expected:** Graceful error handling
**Fix:** Add try-catch, input validation, length limits

---

# 💯 SCORING GUIDE

Give score for each category:

**FAQ Accuracy:** ___/10
- 10 = All FAQ answers correct & comprehensive
- 5 = Some answers missing context
- 0 = Wrong answers atau fabricated info

**Tool Functionality:** ___/10
- 10 = All 4 tools working perfectly
- 5 = Some tools work, some don't
- 0 = No tools working

**Language Support:** ___/10
- 10 = Perfect ID & EN detection/response
- 5 = Works but sometimes wrong language
- 0 = Language detection not working

**Mood Detection:** ___/10
- 10 = Accurate mood detection & appropriate tone
- 5 = Mood detected but tone not adjusted
- 0 = No mood detection

**Human Handoff:** ___/10
- 10 = All redirects work + email + database updated
- 5 = Redirects work but no email/database
- 0 = No redirect when should

**Error Handling:** ___/10
- 10 = All edge cases handled gracefully
- 5 = Some crashes on edge cases
- 0 = Frequent crashes

**TOTAL SCORE:** ___/60

**PASSING SCORE:** 45+ (75%)

---

**Good luck with testing! 🚀**

If you find issues, document them clearly with:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots/logs if possible
