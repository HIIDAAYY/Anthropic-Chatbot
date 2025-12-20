# Clinic Knowledge Base Setup Guide

## Panduan Setup Knowledge Base Klinik Kecantikan & Gigi

Dokumentasi ini menjelaskan cara setup, upload, dan menggunakan knowledge base klinik kecantikan & gigi di chatbot customer support agent.

## 📋 Isi Knowledge Base

Knowledge base klinik kecantikan & gigi mencakup **70 FAQ** yang dibagi dalam kategori berikut:

### Kategori FAQ:
1. **Informasi Umum Klinik** (8 FAQ)
   - Profil klinik, lokasi, jam operasional, kontak
   - Sertifikasi dokter dan izin operasional

2. **Layanan Kecantikan Wajah & Kulit** (19 FAQ)
   - Treatment jerawat (laser, chemical peeling)
   - Penghilangan flek dan anti-aging (botox, filler, microblading)
   - Facial treatment dan skincare consultation
   - Kombinasi treatment dan promo

3. **Layanan Perawatan Gigi** (27 FAQ)
   - Pemeriksaan dan pembersihan gigi (scaling)
   - Penambalan dan root canal
   - Pencabutan gigi dan replacement gigi
   - Prostetik gigi (veneer, crown, implant)
   - Perawatan gigi sensitif

4. **Biaya & Pembayaran** (7 FAQ)
   - Tarif konsultasi dan treatment
   - Metode pembayaran dan cicilan
   - Paket bundling dan program loyalitas

5. **Asuransi & Kebijakan** (6 FAQ)
   - Kebijakan pembatalan dan refund
   - Perlindungan data dan privasi
   - Jaminan hasil treatment
   - Medical leave dan asuransi

6. **Pertanyaan Teknis** (6 FAQ)
   - Aplikasi mobile, appointment booking
   - Download hasil foto sebelum-sesudah
   - Customer service dan support

**Total: 70 FAQ tentang klinik kecantikan & gigi**

## 🚀 Setup & Upload Knowledge Base

### Step 1: File yang Sudah Tersedia

Knowledge base klinik sudah tersedia dalam 2 file:

1. **`clinic_faq.md`** - File markdown berisi 70 FAQ
   - Format: Markdown dengan kategori (##) dan pertanyaan (###)
   - Bahasa: Indonesia
   - Ukuran: ~60KB

2. **`scripts/upload-clinic-faq.ts`** - Script upload otomatis
   - Parse file markdown
   - Generate embeddings menggunakan OpenAI
   - Upload ke Pinecone vector database

### Step 2: Pastikan Environment Sudah Siap

Sebelum upload, pastikan `.env.local` Anda memiliki:

```env
# Required untuk embeddings
OPENAI_API_KEY=sk-proj-...

# Required untuk Pinecone
PINECONE_API_KEY=pcsk_...
PINECONE_INDEX_NAME=anthropicchatbot
```

### Step 3: Upload Clinic FAQ ke Pinecone

```bash
# Run script upload clinic FAQ
npx tsx scripts/upload-clinic-faq.ts
```

**Output yang diharapkan:**
```
📖 FAQ Upload Script - Using OpenAI Embeddings

📄 Reading clinic FAQ file: .../clinic_faq.md

📊 Parsed 70 FAQ items from clinic markdown

Sample items:
  • [Informasi Umum Klinik] Apa itu Klinik Kecantikan & Gigi?
  • [Informasi Umum Klinik] Dimana lokasi Klinik Kecantikan & Gigi?
  • [Layanan Kecantikan Wajah & Kulit] Apa saja layanan kecantikan yang disediakan?

📌 Index name from env: "anthropicchatbot"
🔍 Checking Pinecone index...
   Index dimension: 1536
   OpenAI text-embedding-3-small dimension: 1536
✅ Dimension match!

📤 Uploading batch 1/3 (30 items)...
   🔄 Generating embeddings...
   ⬆️  Upserting to Pinecone...
   ✅ Batch 1 uploaded successfully

[... more batches ...]

✅ All batches uploaded!
🔍 Verifying upload...
   Total vectors in index: ~200+ (tergantung berapa FAQ sebelumnya)

🎉 Clinic FAQ upload completed successfully!

💡 Next steps:
   - Restart your dev server: npm run dev
   - Test the chatbot with questions about clinic kecantikan & gigi
   - Check the Knowledge Base History panel for retrieved clinic sources
   - Switch knowledgeBaseId to 'clinic' in chatbot settings to use clinic FAQ
```

### Step 4: Restart Dev Server

```bash
npm run dev
```

Dev server akan restart dan siap menggunakan clinic knowledge base.

## 🤖 Menggunakan Clinic Knowledge Base di Chatbot

### Cara 1: Via Chatbot UI (Manual Switch)

1. Buka chatbot di browser: `http://localhost:3000`
2. Di bagian atas kanan, ada dropdown **Knowledge Base Selection**
3. Pilih knowledge base yang ingin digunakan:
   - **Default (OpenAI/Voyage)** - Untuk UrbanStyle Fashion FAQ
   - **Clinic** - Untuk Clinic Kecantikan & Gigi FAQ
4. Mulai bertanya tentang klinik, chatbot akan retrieve jawaban dari clinic FAQ

### Cara 2: Via API (Programmatically)

Saat mengirim request ke `/api/chat`, tambahkan parameter `knowledgeBaseId`:

```javascript
// Untuk clinic knowledge base
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Berapa harga treatment laser jerawat?",
    knowledgeBaseId: 'clinic', // Gunakan clinic FAQ
    sessionId: 'user-session-123',
    model: 'claude-haiku-4-5-20251001'
  })
});

const data = await response.json();
console.log(data.response);
```

### Cara 3: Default di Code (Di ChatArea.tsx)

Edit file `components/ChatArea.tsx` untuk mengubah default knowledge base:

```typescript
// Cari bagian state initialization
const [knowledgeBaseId, setKnowledgeBaseId] = useState("clinic"); // Change dari default ke "clinic"
```

## 📊 Struktur Data di Pinecone

Setiap FAQ clinic disimpan di Pinecone dengan struktur:

```json
{
  "id": "uuid-12345",
  "values": [1536 embedding dimensions dari OpenAI],
  "metadata": {
    "text": "Pertanyaan lengkap + jawaban",
    "question": "Berapa harga treatment laser jerawat?",
    "answer": "Harga laser acne berkisar Rp ...",
    "category": "Layanan Kecantikan Wajah & Kulit",
    "source": "clinic"
  }
}
```

Metadata `source: "clinic"` membantu membedakan antara clinic FAQ dan UrbanStyle FAQ dalam database yang sama.

## 🔍 Testing Knowledge Base

### Test Pertanyaan Clinic (Harus Retrieve dari Clinic FAQ):

1. **Tentang klinik:**
   - "Dimana lokasi klinik kecantikan?"
   - "Jam berapa klinik buka?"
   - "Apakah dokter di klinik bersertifikat?"

2. **Tentang kecantikan:**
   - "Berapa harga treatment botox?"
   - "Apakah laser jerawat aman?"
   - "Apa itu microblading?"
   - "Berapa lama hasil filler bertahan?"

3. **Tentang gigi:**
   - "Berapa harga penambalan gigi?"
   - "Apakah root canal menyakitkan?"
   - "Apa itu implant gigi dan harganya berapa?"
   - "Bagaimana cara merawat gigi sensitif?"

4. **Tentang pembayaran:**
   - "Apakah ada cicilan untuk treatment?"
   - "Apa saja metode pembayaran yang diterima?"

### Melihat Retrieved Sources:

1. Di chatbot UI, ada panel **Right Sidebar** yang menampilkan:
   - Source dokumen yang diambil dari Pinecone
   - Similarity score untuk setiap source
   - Jawaban lengkap dari FAQ

2. Contoh output:
   ```
   Retrieved Sources:
   ━━━━━━━━━━━━━━━━

   1. Berapa harga treatment laser jerawat?
      Similarity: 0.92
      Category: Layanan Kecantikan Wajah & Kulit
      Source: clinic

      Answer: Klinik menyediakan berbagai treatment jerawat:
      laser acne (untuk jerawat aktif), chemical peeling...
   ```

## 🔄 Update atau Tambah FAQ Baru

Jika ingin update atau menambah FAQ clinic:

### Langkah 1: Edit `clinic_faq.md`

```markdown
## Kategori Baru atau Existing

### Pertanyaan Baru?
Jawaban untuk pertanyaan baru...

### Pertanyaan Lama (Edit)
Jawaban yang diupdate...
```

### Langkah 2: Re-upload ke Pinecone

```bash
npx tsx scripts/upload-clinic-faq.ts
```

Script akan:
- Parse file markdown terbaru
- Generate embeddings baru
- Update vector di Pinecone (jika ID sama) atau tambah baru (jika ID beda)

### Langkah 3: Restart dev server

```bash
npm run dev
```

## 📝 Format Markdown FAQ

Untuk menambah FAQ baru, gunakan format ini:

```markdown
## Kategori FAQ

### Pertanyaan Baru?
Jawaban lengkap untuk pertanyaan. Bisa multi-paragraph.

Paragraph kedua jika ada penjelasan lebih.

### Pertanyaan Lainnya?
Jawaban lainnya...
```

**Rules:**
- Gunakan `##` untuk kategori (akan menjadi category di metadata)
- Gunakan `###` untuk pertanyaan (akan menjadi question di metadata)
- Jawaban adalah text setelah `###` hingga pertanyaan berikutnya atau kategori baru
- Pertanyaan harus berakhir dengan `?`
- Hindari spasi berlebih antara Q&A

## 🧪 Troubleshooting

### Error: "FAQ file not found"
```
❌ FAQ file not found: .../clinic_faq.md
```
**Solusi:** Pastikan file `clinic_faq.md` ada di root directory project.

### Error: "Index dimension mismatch"
```
❌ ERROR: Index dimension mismatch!
   Your index has 1024 dimensions, but OpenAI text-embedding-3-small uses 1536
```
**Solusi:** Buat Pinecone index baru dengan 1536 dimensions atau gunakan embedding model lain.

### Error: "OPENAI_API_KEY not found"
```
❌ Error: OPENAI_API_KEY not found in environment
```
**Solusi:** Pastikan `OPENAI_API_KEY` ada di `.env.local`

### Clinic FAQ tidak muncul di hasil search
- Pastikan script upload berhasil (cek output "✅ Clinic FAQ upload completed successfully!")
- Pastikan dev server sudah direstart setelah upload
- Pastikan `knowledgeBaseId` diset ke 'clinic' (bukan default)
- Cek di Pinecone dashboard apakah vectors sudah ada

### Hasil pencarian kurang relevan
- Clinic knowledge base berisi 70 FAQ dengan coverage lengkap
- Jika pertanyaan sangat spesifik atau tidak ada di FAQ, Claude akan berusaha menjawab berdasarkan general knowledge
- Tambah FAQ baru jika ada pertanyaan yang sering ditanyakan tapi tidak ada di knowledge base

## 📱 Integration dengan WhatsApp (Optional)

Jika chatbot terintegrasi dengan WhatsApp (Twilio), clinic knowledge base akan otomatis digunakan:

1. Customer mengirim pertanyaan via WhatsApp
2. Message masuk ke `/api/whatsapp/webhook`
3. Chatbot menggunakan clinic knowledge base untuk retrieve jawaban
4. Response dikirim kembali ke WhatsApp dengan formatted message

Tidak perlu setup tambahan - semua konfigurasi sudah terintegrasi di backend.

## 📈 Performance & Scale

### Capacity:
- **70 FAQ clinic** dalam 1 index Pinecone
- Bisa dikombinasikan dengan **UrbanStyle FAQ** dalam index yang sama
- Total vectors di index bisa jutaan tanpa performa issue

### Response Time:
- Retrieval dari Pinecone: ~100-200ms
- Embedding generation: ~1-2 detik per batch
- Claude API response: ~2-5 detik per message

### Cost Estimate (Monthly):
- Pinecone: ~$0-30/bulan (free tier generous)
- OpenAI Embeddings: ~$0.02 per 1 juta tokens (sangat murah)
- Claude API: Tergantung usage

## 🎯 Use Cases

Clinic knowledge base ini cocok untuk:

1. **Customer Support Chatbot**
   - Support staff bisa membagi beban dengan AI chatbot
   - FAQ lengkap mencakup 90% pertanyaan pasien
   - Instant response 24/7

2. **Website Chatbot**
   - Embed di website klinik sebagai virtual assistant
   - Pasien bisa tanya-tanya sebelum appointment
   - Reduce support ticket volume

3. **WhatsApp Business Assistant**
   - Terintegrasi dengan Twilio WhatsApp API
   - Auto-reply pertanyaan umum
   - Support agent bisa handle kompleks cases

4. **Mobile App Integration**
   - Chatbot di aplikasi mobile klinik
   - Pasien bisa tanya booking, treatment, harga
   - Seamless customer experience

## 🔐 Security & Privacy

- FAQ dienkripsi di Pinecone
- Embedding hanya berisi text FAQ, tidak ada data patient
- Tidak ada PII (personally identifiable information) di knowledge base
- Akses ke Pinecone protected dengan API key

## ✅ Checklist Setup

- [ ] File `clinic_faq.md` ada di root directory
- [ ] File `scripts/upload-clinic-faq.ts` ada di directory
- [ ] `OPENAI_API_KEY` ada di `.env.local`
- [ ] `PINECONE_API_KEY` dan `PINECONE_INDEX_NAME` ada di `.env.local`
- [ ] Run `npx tsx scripts/upload-clinic-faq.ts` dan berhasil
- [ ] Dev server direstart dengan `npm run dev`
- [ ] Test chatbot dengan pertanyaan clinic
- [ ] Verify retrieved sources di right sidebar
- [ ] Customize FAQ jika diperlukan untuk clinic spesifik

## 📞 Support & Customization

Jika Anda ingin:
- **Menambah FAQ baru:** Edit `clinic_faq.md`, re-upload dengan script
- **Mengubah harga treatment:** Edit answer di `clinic_faq.md`, re-upload
- **Menambah kategori baru:** Edit struktur markdown, re-upload
- **Mengintegrasikan dengan sistem lain:** Modifikasi API routes di `app/api/chat`

Semua perubahan bisa dilakukan tanpa code changes yang kompleks - cukup edit markdown file dan re-upload!

---

**Questions atau Issues?**
Hubungi support klinik atau developer yang setup chatbot ini.

Dokumentasi terakhir update: 19 Januari 2025
