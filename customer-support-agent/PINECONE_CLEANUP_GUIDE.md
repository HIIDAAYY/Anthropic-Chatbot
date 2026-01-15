# Pinecone Cleanup Guide

## Overview
3 klinik knowledge bases telah dihapus dari project:
- ❌ **The Purity Aesthetic Clinic** (purity-clinic)
- ❌ **Klinik Pramudia** (pramudia-clinic)
- ❌ **Beauty+ Clinic** (beauty-plus-clinic)

✅ **Remaining**: Glow Aesthetics (glow-clinic) saja

## Problem
Vectors (embeddings) untuk 3 klinik yang dihapus masih tersimpan di Pinecone. Kita perlu membersihkannya.

## Solution
Run cleanup script untuk delete vectors dari 3 klinik:

```bash
npx tsx scripts/cleanup-pinecone-clinics.ts
```

## What the Script Does

1. **Connects to Pinecone** - Menggunakan API key dari `.env.local`
2. **Checks initial stats** - Menghitung total vectors sebelum cleanup
3. **For each removed clinic:**
   - Query vectors dengan filter `clinicId`
   - Collect all matching vector IDs
   - Delete in batches (max 1000 per batch)
4. **Reports final stats** - Menampilkan jumlah vectors sebelum & sesudah
5. **Confirmation** - Hanya glow-clinic yang tersisa

## Expected Output

```
============================================================
🗑️  PINECONE CLEANUP - DELETE REMOVED CLINICS
============================================================
📌 Pinecone index: "customer-support"

📊 Getting current index statistics...
   Total vectors before cleanup: 9000

🔍 Processing clinic: purity-clinic
   Found 2212 vector(s) to delete
   🗑️  Deleting batch 1/3 (1000 vectors)...
   ✅ Batch 1 deleted successfully
   ...
   ✅ Deleted 2212 vectors for purity-clinic

🔍 Processing clinic: pramudia-clinic
   ✅ Deleted 1269 vectors for pramudia-clinic

🔍 Processing clinic: beauty-plus-clinic
   ✅ Deleted 675 vectors for beauty-plus-clinic

📊 Getting final index statistics...
   Total vectors before: 9000
   Total vectors after: 5170
   Vectors deleted: 3830

============================================================
✅ CLEANUP COMPLETE!
============================================================

📌 Remaining knowledge base:
   ✅ glow-clinic (Klinik Glow Aesthetics)

🗑️  Removed clinics:
   ❌ purity-clinic (The Purity Aesthetic Clinic)
   ❌ pramudia-clinic (Klinik Pramudia)
   ❌ beauty-plus-clinic (Beauty+ Clinic)

✨ Your Pinecone index is now cleaned up!
```

## Prerequisites

✅ `PINECONE_API_KEY` in `.env.local`
✅ `PINECONE_INDEX_NAME` in `.env.local`
✅ Valid Pinecone account & index

## What if I Want to Undo?

If you deleted accidentally, you can re-upload Glow clinic data:

```bash
npx tsx scripts/upload-multi-clinic-faq.ts
```

This will:
- Upload ONLY glow-clinic FAQ
- Add 5,170 vectors back
- Restore to "Glow only" state

## Timeline

| Action | Files | Status |
|--------|-------|--------|
| Delete FAQ files | 3 `.md` files deleted | ✅ Done |
| Update code logic | 3 `.ts` files updated | ✅ Done |
| Cleanup Pinecone | Run script above | ⏳ Pending |

## Notes

- Script deletes vectors in **batches of 1000** to avoid API rate limits
- Safe to run multiple times (if vectors already deleted, script won't find them)
- Non-destructive for glow-clinic vectors
- Takes ~30-60 seconds depending on network speed
