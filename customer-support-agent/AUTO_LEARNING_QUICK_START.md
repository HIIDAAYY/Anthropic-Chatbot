# 🚀 Auto-Learning Quick Start (5 Minutes)

## ✅ SUDAH SELESAI - TINGGAL TEST!

Semua feature auto-learning sudah 100% siap. File ini akan guide Anda untuk test dalam **5 menit**.

---

## 🧪 Quick Test (Follow These 5 Steps)

### Step 1: List Candidates (30 detik)
```bash
npx tsx scripts/manual-learn.ts --list-candidates
```

**What to expect:** List of 10 conversations yang bisa di-learn

**Copy one conversation ID** untuk step selanjutnya.

---

### Step 2: Test Quality (1 menit)
```bash
npx tsx scripts/manual-learn.ts --test-quality <PASTE_ID_HERE>
```

**What to expect:**
```
Overall Score: 85.2%
Eligible: true

Detailed Scores:
  Resolution:     90.0%
  Clarity:        85.0%
  Accuracy:       88.0%
```

---

### Step 3: Test Extraction (1 menit)
```bash
npx tsx scripts/manual-learn.ts --test-extract <PASTE_ID_HERE>
```

**What to expect:**
```
Extracted 3 Q&A pairs:

1. [shipping] Confidence: 92.0%
   Q: Berapa lama pengiriman ke Jakarta?
   A: Untuk pengiriman ke Jakarta...
```

---

### Step 4: Full Learning (2 menit)
```bash
npx tsx scripts/manual-learn.ts --conversation-id <PASTE_ID_HERE> --auto-approve --auto-sync
```

**What to expect:**
```
Result:
  ✅ Success: true
  📊 Quality Score: 85.2%
  📝 Q&A Created: 2
  ✅ Auto-Approved: 2
  🔗 Synced to KB: 2
```

---

### Step 5: Check Stats (30 detik)
```bash
npx tsx scripts/manual-learn.ts --stats
```

**What to expect:**
```
Total Q&A Pairs:        2
  - Synced to KB:       2

Average Quality Score:  85.2%
Average Confidence:     90.0%
```

---

## 🎉 DONE!

Kalau semua steps berhasil → **Feature 100% working!**

Bot Anda sekarang bisa:
- ✅ Evaluate conversation quality
- ✅ Extract Q&A automatically
- ✅ Detect duplicates
- ✅ Sync to knowledge base

---

## 📚 More Documentation

- **AUTO_LEARNING.md** - Complete guide (250+ lines)
- **IMPLEMENTATION_SUMMARY.md** - Technical details
- **QUICK_START.md** - System integration guide

---

## 🤖 Setup Automation (Optional)

### Daily Auto-Learning

Create `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/admin/learning/auto-learn",
    "schedule": "0 2 * * *"
  }]
}
```

Deploy → Bot learns automatically every day!

---

## 🆘 Issues?

### "No conversations found"
→ Bot belum punya conversations. Chat dulu di http://localhost:3000

### "Quality too low"
→ Normal! Coba conversation lain.

### "API error"
→ Check .env.local punya semua API keys

---

**That's it! 🚀 Happy Learning!**
