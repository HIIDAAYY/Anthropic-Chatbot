# Auto-Learning Feature Documentation

## 🎯 Overview

Fitur **Auto-Learning** memungkinkan bot Anda untuk **secara otomatis belajar** dari percakapan customer support yang sukses. Bot akan:

1. ✅ Mengidentifikasi percakapan berkualitas tinggi
2. 🧠 Mengekstrak Q&A pairs menggunakan Claude AI
3. 🔍 Check duplikasi di knowledge base
4. ✅ Auto-approve Q&A dengan confidence tinggi
5. 🔗 Sync ke Pinecone untuk digunakan di percakapan selanjutnya

**Benefit:**
- Bot jadi lebih pintar seiring waktu
- Otomatis update knowledge base tanpa manual input
- Learn dari customer interactions yang real
- Improve response quality secara continuous

---

## 📂 Files Created

### 1. Database Schema
- **`prisma/schema.prisma`**
  - Model `LearnedQAPair` - Stores extracted Q&A pairs
  - Enum `LearnedQAStatus` - PENDING, APPROVED, REJECTED, SYNCED, ARCHIVED
  - Updated `ConversationMetadata` dengan learning fields

### 2. Core Services
- **`app/lib/learning-service.ts`** (~450 lines)
  - `evaluateConversationQuality()` - Evaluate dengan Claude
  - `extractQAPairs()` - Extract Q&A dengan Claude
  - `checkDuplicate()` - Check di Pinecone
  - `syncToKnowledgeBase()` - Upsert ke Pinecone
  - `learnFromConversation()` - Main workflow
  - `learnFromConversations()` - Batch processing

- **`app/lib/db-service.ts`** (+280 lines)
  - `createLearnedQAPair()`
  - `getLearnedQAPairs()`
  - `getLearnedQAPairById()`
  - `approveQAPair()`
  - `rejectQAPair()`
  - `updateQAPairStatus()`
  - `markConversationAsLearned()`
  - `getLearnedQAStats()`

### 3. API Endpoints
- **`app/api/admin/learning/route.ts`**
  - `GET /api/admin/learning?action=candidates` - List eligible conversations
  - `GET /api/admin/learning?action=pending` - Get pending Q&A
  - `GET /api/admin/learning?action=stats` - Get statistics
  - `POST /api/admin/learning` - Extract, approve, reject, sync

- **`app/api/admin/learning/auto-learn/route.ts`**
  - `POST /api/admin/learning/auto-learn` - Cron job endpoint
  - `GET /api/admin/learning/auto-learn` - Get config & stats

### 4. CLI Tool
- **`scripts/manual-learn.ts`**
  - Complete CLI for testing and manual operations
  - See "Testing" section below

---

## ⚙️ Configuration

### Environment Variables

Add to `.env.local`:

```env
# Optional: API key for admin endpoints
LEARNING_ADMIN_KEY=your-secret-key-here

# Optional: For Vercel Cron authentication
CRON_SECRET=your-cron-secret

# Already exists (required):
ANTHROPIC_API_KEY=sk-ant-...
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=...
OPENAI_API_KEY=...
```

### Tuning Parameters

Edit in `app/lib/learning-service.ts`:

```typescript
const QUALITY_THRESHOLD = 0.7;              // Min score untuk eligible
const AUTO_APPROVE_CONFIDENCE = 0.9;        // Auto-approve jika confidence >= 90%
const DUPLICATE_SIMILARITY_THRESHOLD = 0.85; // Threshold untuk deteksi duplikat
```

---

## 🧪 Testing

### 1. Lihat Eligible Conversations

```bash
npx tsx scripts/manual-learn.ts --list-candidates
```

Output: List 10 conversations yang bisa di-learn

### 2. Test Quality Evaluation

```bash
npx tsx scripts/manual-learn.ts --test-quality <conversation-id>
```

Output:
- Overall score (0-100%)
- Breakdown: resolution, clarity, accuracy, reusability, professionalism
- Eligible: true/false
- Reason

### 3. Test Q&A Extraction

```bash
npx tsx scripts/manual-learn.ts --test-extract <conversation-id>
```

Output:
- Number of Q&A pairs extracted
- Each Q&A dengan question, answer, category, confidence

### 4. Run Full Learning Process

```bash
# Basic (no auto-approve)
npx tsx scripts/manual-learn.ts --conversation-id <id>

# With auto-approve (confidence > 0.9)
npx tsx scripts/manual-learn.ts --conversation-id <id> --auto-approve

# With auto-sync to Pinecone
npx tsx scripts/manual-learn.ts --conversation-id <id> --auto-approve --auto-sync
```

### 5. Batch Learning

```bash
# Learn from last 7 days
npx tsx scripts/manual-learn.ts --days 7 --auto-approve

# Learn from last 30 days dengan sync
npx tsx scripts/manual-learn.ts --days 30 --auto-approve --auto-sync
```

### 6. Review & Statistics

```bash
# Review pending Q&A
npx tsx scripts/manual-learn.ts --review

# Show statistics
npx tsx scripts/manual-learn.ts --stats
```

---

## 🔌 API Usage

### Get Eligible Conversations

```bash
curl http://localhost:3000/api/admin/learning?action=candidates&days=7
```

### Get Pending Q&A

```bash
curl http://localhost:3000/api/admin/learning?action=pending&limit=20
```

### Extract Q&A from Conversations

```bash
curl -X POST http://localhost:3000/api/admin/learning \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_LEARNING_ADMIN_KEY" \
  -d '{
    "action": "extract",
    "conversationIds": ["clm123", "clm456"],
    "autoApprove": true,
    "autoSync": false
  }'
```

### Approve Q&A Pairs

```bash
curl -X POST http://localhost:3000/api/admin/learning \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_LEARNING_ADMIN_KEY" \
  -d '{
    "action": "approve",
    "qaPairIds": ["qa123", "qa456"],
    "reviewedBy": "admin@example.com",
    "notes": "Good quality Q&A"
  }'
```

### Sync to Pinecone

```bash
curl -X POST http://localhost:3000/api/admin/learning \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_LEARNING_ADMIN_KEY" \
  -d '{
    "action": "sync",
    "qaPairIds": ["qa123", "qa456"]
  }'
```

### Manual Trigger Auto-Learn

```bash
curl -X POST http://localhost:3000/api/admin/learning/auto-learn \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_LEARNING_ADMIN_KEY" \
  -d '{
    "lookbackDays": 7,
    "autoApprove": true,
    "autoSync": true
  }'
```

---

## ⏰ Automation Setup

### Option 1: Vercel Cron (Recommended)

Create `vercel.json` in project root:

```json
{
  "crons": [
    {
      "path": "/api/admin/learning/auto-learn",
      "schedule": "0 2 * * *"
    }
  ]
}
```

Schedule runs **daily at 2 AM UTC**.

### Option 2: GitHub Actions

Create `.github/workflows/auto-learn.yml`:

```yaml
name: Auto-Learn from Conversations
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  auto-learn:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Auto-Learning
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/admin/learning/auto-learn \
            -H "Authorization: Bearer ${{ secrets.LEARNING_ADMIN_KEY }}" \
            -H "Content-Type: application/json"
```

### Option 3: External Cron Service

Use services like:
- **Cron-job.org** - Free, web-based
- **EasyCron** - Reliable with monitoring
- **AWS EventBridge** - Scalable

Setup:
1. URL: `https://your-app.vercel.app/api/admin/learning/auto-learn`
2. Method: POST
3. Header: `Authorization: Bearer YOUR_LEARNING_ADMIN_KEY`
4. Schedule: `0 2 * * *` (daily 2 AM)

---

## 📊 Workflow

### Semi-Automated (Recommended)

```
1. Cron job runs daily at 2 AM
   ↓
2. Auto-evaluate conversations from last 7 days
   ↓
3. Extract Q&A pairs from high-quality conversations
   ↓
4. Auto-approve Q&A with confidence > 0.9
   ↓
5. Auto-sync approved Q&A to Pinecone
   ↓
6. Low-confidence Q&A → PENDING status
   ↓
7. Admin reviews PENDING weekly (optional)
   ↓
8. Manually approve/reject via CLI or API
```

### Fully Manual

```
1. Run CLI: npx tsx scripts/manual-learn.ts --list-candidates
2. Pick conversation IDs
3. Test extraction: npx tsx scripts/manual-learn.ts --test-extract <id>
4. Extract: npx tsx scripts/manual-learn.ts --conversation-id <id>
5. Review pending: npx tsx scripts/manual-learn.ts --review
6. Approve manually
7. Sync manually
```

---

## 🎛️ Quality Control

### What Makes a Conversation "Good"?

✅ **Eligible:**
- Not redirected to human agent (`wasRedirected = false`)
- Positive or neutral user mood
- Used knowledge base context (`contextUsed = true`)
- Message count: 3-30 messages
- Clear Q&A patterns

❌ **Not Eligible:**
- Redirected to agent (unresolved)
- Too short (< 3 messages)
- Too long (> 30 messages)
- Negative mood / frustrated user
- Off-topic or spam

### Quality Scores

Claude evaluates on **5 criteria** (0-1 each):
1. **Resolution** - Issue resolved completely?
2. **Clarity** - Responses clear and structured?
3. **Accuracy** - Factually correct?
4. **Reusability** - Helpful for future customers?
5. **Professionalism** - Appropriate tone?

**Overall score** = Average of 5 scores

### Confidence Scores

For each extracted Q&A:
- **> 0.9** - Auto-approve & sync
- **0.7-0.9** - Pending review
- **< 0.7** - Skip or reject

---

## 📈 Monitoring

### Check Statistics

```bash
npx tsx scripts/manual-learn.ts --stats
```

Output:
- Total Q&A pairs
- Pending / Approved / Synced / Rejected
- Average quality score
- Average confidence
- Learning-eligible conversations

### Review Pending Q&A

```bash
npx tsx scripts/manual-learn.ts --review
```

### Database Queries

```sql
-- Learning-eligible conversations
SELECT COUNT(*) FROM conversation_metadata WHERE learning_eligible = true;

-- Q&A by status
SELECT status, COUNT(*) FROM learned_qa_pairs GROUP BY status;

-- Recent learnings
SELECT * FROM learned_qa_pairs ORDER BY created_at DESC LIMIT 10;

-- Top quality Q&A
SELECT question, answer, quality_score, confidence_score
FROM learned_qa_pairs
WHERE status = 'SYNCED'
ORDER BY quality_score DESC
LIMIT 10;
```

---

## 🚨 Troubleshooting

### Issue: No conversations found

**Cause:** No eligible conversations in time range

**Solution:**
```bash
# Increase lookback days
npx tsx scripts/manual-learn.ts --days 30
```

### Issue: Low quality scores

**Cause:** Conversations not meeting quality criteria

**Solution:**
- Check conversation content quality
- Ensure bot is using knowledge base (`contextUsed = true`)
- Improve conversation flow

### Issue: No Q&A extracted

**Cause:** Claude couldn't find clear Q&A patterns

**Solution:**
- Review conversation manually
- Check message structure
- Ensure clear questions and answers

### Issue: Duplicates detected

**Cause:** Similar Q&A already in Pinecone

**Solution:**
- This is expected behavior (prevents duplicates)
- Check existing knowledge base
- Lower `DUPLICATE_SIMILARITY_THRESHOLD` if needed

### Issue: Sync failed

**Cause:** Pinecone/OpenAI API error

**Solution:**
- Check API keys
- Check Pinecone index exists
- Check network connectivity
- Retry sync via API

---

## 💰 Cost Estimation

### Claude API (Haiku)

- Quality evaluation: ~500 tokens/conversation
- Q&A extraction: ~1000 tokens/conversation
- Total: ~1500 tokens/conversation

**Pricing:**
- Input: $0.25 / 1M tokens
- Output: $1.25 / 1M tokens

**Example:**
- 100 conversations/day
- ~150K tokens/day
- **Cost: ~$0.40/day or $12/month**

### OpenAI Embeddings

- ~50 tokens per Q&A pair
- 10 Q&A/day = 500 tokens/day

**Pricing:**
- text-embedding-3-small: $0.02 / 1M tokens
- **Cost: ~$0.03/month**

### Pinecone

- Minimal storage increase
- 10 Q&A/day × 30 = 300 vectors/month
- **Cost: Negligible**

**Total: ~$12-15/month**

---

## 🎯 Success Metrics

Track these to measure effectiveness:

1. **KB Growth** - # learned Q&A over time
2. **Resolution Rate** - % conversations without redirect
3. **Context Usage** - % responses using RAG
4. **Approval Rate** - % extracted Q&A approved
5. **Duplicate Rate** - % duplicates detected

---

## 🔒 Security

1. **API Key Protection** - Use `LEARNING_ADMIN_KEY`
2. **Cron Secret** - Use `CRON_SECRET` for Vercel Cron
3. **Data Privacy** - Q&A extracted from real conversations
4. **Audit Trail** - All actions tracked with timestamps
5. **Rollback** - Can archive/delete learned Q&A if needed

---

## 📝 Next Steps

### After Implementation:

1. ✅ Test dengan existing conversations
2. ✅ Run manual learning untuk 5-10 conversations
3. ✅ Review extracted Q&A quality
4. ✅ Adjust thresholds if needed
5. ✅ Setup cron job automation
6. ✅ Monitor for 1-2 weeks
7. ✅ Iterate based on results

### Future Enhancements:

- [ ] Admin dashboard UI for reviewing Q&A
- [ ] A/B testing untuk measure impact
- [ ] Multi-language support
- [ ] Category-specific quality thresholds
- [ ] Integration dengan feedback loops
- [ ] Automatic retraining prompts

---

## 📞 Support

Jika ada issues atau questions:
1. Check logs: `console.log` di learning-service.ts
2. Run dengan `--test-quality` atau `--test-extract` untuk debug
3. Check database: `npx prisma studio`
4. Review API responses: Use verbose mode

**Happy Learning! 🎓**
