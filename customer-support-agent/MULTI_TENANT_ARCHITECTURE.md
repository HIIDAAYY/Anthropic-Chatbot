# 🏢 Multi-Tenant Architecture Guide

## Problem Statement

Anda punya **4 klien** (Klinik Glow, Purity, Pramudia, Beauty+) yang masing-masing:
- ✅ Punya knowledge base sendiri
- ✅ Tidak boleh akses knowledge base klien lain
- ✅ Butuh data isolation untuk privacy & security

**Goal:** Klinik Glow chatbot **TIDAK BISA** jawab pertanyaan tentang Klinik Purity, dan sebaliknya.

---

## 🎯 Architecture Options

### Option 1: Multiple Pinecone Indexes (Yang Anda Pikirkan) ❌

**Implementasi:**
```
pinecone-glow-clinic     → Index untuk Klinik Glow
pinecone-purity-clinic   → Index untuk Klinik Purity
pinecone-pramudia-clinic → Index untuk Klinik Pramudia
pinecone-beautyplus      → Index untuk Beauty+ Clinic
```

**Pros:**
✅ **Complete isolation** - Fisik terpisah, tidak mungkin cross-contamination
✅ **Simple logic** - Ganti PINECONE_INDEX_NAME per klien
✅ **Independent scaling** - Bisa upgrade individual index

**Cons:**
❌ **SANGAT MAHAL** - Pinecone charge **per index** ($70-100/month EACH!)
   - 4 klien = $280-400/month HANYA untuk Pinecone
   - 10 klien = $700-1000/month 😱
❌ **Tidak scalable** - Imagine 100 klien = 100 indexes
❌ **Maintenance nightmare** - Update, backup, monitor 100 indexes
❌ **Slow deployment** - Provision new index untuk setiap klien baru (10-15 menit)

**Cost Calculation:**
```
Pinecone Serverless: ~$0.40 per 1M queries
Pinecone Standard: $70/month per index (p1.x1)

4 klien × $70 = $280/month minimum
```

**Verdict:** ❌ **TIDAK EFISIEN** untuk SaaS dengan banyak klien

---

### Option 2: Single Index with Namespaces ✅ **RECOMMENDED**

**Implementasi:**
```
Single Pinecone Index: "anthropic-chatbot"

Namespaces:
├── glow-clinic        → Data Klinik Glow
├── purity-clinic      → Data Klinik Purity
├── pramudia-clinic    → Data Klinik Pramudia
└── beautyplus-clinic  → Data Beauty+ Clinic
```

**Pros:**
✅ **Cost-effective** - SATU index untuk semua klien ($70/month total!)
✅ **Perfect isolation** - Namespace seperti "database terpisah"
✅ **Scalable** - Support 100+ namespaces dalam 1 index
✅ **Fast deployment** - Create namespace instant (< 1 detik)
✅ **Easy maintenance** - Manage 1 index saja
✅ **Native Pinecone feature** - Built-in, tidak perlu hack

**Cons:**
⚠️ **Shared quota** - All tenants share index capacity (rare issue)
⚠️ **Need proper namespace management** - Must ensure correct namespace per request

**Cost Calculation:**
```
1 index × $70 = $70/month
100 klien × $70 = STILL $70/month! 🎉
```

**Verdict:** ✅ **BEST CHOICE** untuk SaaS multi-tenant

---

### Option 3: Single Index with Metadata Filtering ⚠️ **ALTERNATIVE**

**Implementasi:**
```
Single Pinecone Index: "anthropic-chatbot"
No namespaces, use metadata filter:

Vector 1: { text: "...", clinicId: "glow-clinic" }
Vector 2: { text: "...", clinicId: "purity-clinic" }
Vector 3: { text: "...", clinicId: "pramudia-clinic" }

Query dengan filter: { clinicId: { $eq: "glow-clinic" } }
```

**Pros:**
✅ **Cheapest** - 1 index untuk semua
✅ **Simple structure** - Tidak perlu manage namespaces
✅ **Cross-tenant analytics** - Bisa query all clinics jika needed

**Cons:**
⚠️ **Weaker isolation** - Data fisik tidak terpisah
⚠️ **Security risk** - Jika filter bug, bisa leak data klien lain
⚠️ **Performance overhead** - Filter check pada setiap query
❌ **No hard boundaries** - Semua data dalam 1 "bucket"

**Verdict:** ⚠️ **Okay untuk dev/testing**, tapi **NOT RECOMMENDED untuk production** dengan sensitive data

---

## 🏆 Recommendation: Use Namespaces (Option 2)

### Why Namespaces Win:

1. **Cost Efficiency:**
   - 4 klien: $70/month (vs $280 dengan multiple indexes)
   - 100 klien: STILL $70/month!

2. **Perfect Balance:**
   - Security: ✅ Data isolated per namespace
   - Cost: ✅ Pay for 1 index only
   - Performance: ✅ No overhead
   - Scalability: ✅ Support unlimited tenants

3. **Production-Ready:**
   - Used by major SaaS companies (Notion, Zapier, etc.)
   - Pinecone's recommended approach for multi-tenancy

---

## 🔧 Implementation Guide

### Current State (Your Code)

Good news! Your code **ALREADY supports metadata filtering**:

**File:** `app/lib/utils.ts` (lines 56-81)
```typescript
if (sourceFilter.clinicId) {
  pineconeFilter = {
    $and: [
      { source: { $eq: "clinic" } },
      { clinicId: { $eq: sourceFilter.clinicId } },
    ],
  };
}
```

**This is Option 3 (Metadata Filtering)**

---

## ✅ How to Upgrade to Namespace Architecture (Option 2)

### Step 1: Update Pinecone Upload Script

**File:** `scripts/upload-faq.ts` (create or modify)

```typescript
import { getPineconeIndex } from "@/lib/pinecone";
import { getOpenAIEmbedding } from "@/lib/openai-embeddings";
import fs from "fs";
import path from "path";

interface ClinicConfig {
  id: string;
  name: string;
  faqFile: string;
  namespace: string; // NEW!
}

const CLINICS: ClinicConfig[] = [
  {
    id: "glow-clinic",
    name: "Klinik Glow Aesthetics",
    faqFile: "data/clinics/glow-clinic-faq.md",
    namespace: "glow-clinic", // Each clinic gets own namespace
  },
  {
    id: "purity-clinic",
    name: "The Purity Aesthetic Clinic",
    faqFile: "data/clinics/purity-clinic-faq.md",
    namespace: "purity-clinic",
  },
  {
    id: "pramudia-clinic",
    name: "Klinik Pramudia",
    faqFile: "data/clinics/pramudia-clinic-faq.md",
    namespace: "pramudia-clinic",
  },
  {
    id: "beautyplus-clinic",
    name: "Beauty+ Clinic",
    faqFile: "data/clinics/beauty-plus-clinic-faq.md",
    namespace: "beautyplus-clinic",
  },
];

async function uploadClinicToNamespace(clinic: ClinicConfig) {
  console.log(`\n🏥 Uploading ${clinic.name} to namespace: ${clinic.namespace}`);

  // Read FAQ file
  const faqContent = fs.readFileSync(clinic.faqFile, "utf-8");

  // Split into chunks (Q&A pairs)
  const chunks = splitIntoChunks(faqContent);

  // Get Pinecone index with NAMESPACE
  const index = getPineconeIndex();
  const namespacedIndex = index.namespace(clinic.namespace); // 🔑 KEY LINE!

  // Generate embeddings and upsert
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await getOpenAIEmbedding(chunk.text);

    await namespacedIndex.upsert([
      {
        id: `${clinic.id}-${i}`,
        values: embedding,
        metadata: {
          text: chunk.text,
          clinicId: clinic.id,
          clinicName: clinic.name,
          source: "clinic",
          category: chunk.category || "general",
        },
      },
    ]);

    console.log(`  ✅ Uploaded chunk ${i + 1}/${chunks.length}`);
  }

  console.log(`✅ ${clinic.name} upload complete!`);
}

async function main() {
  for (const clinic of CLINICS) {
    await uploadClinicToNamespace(clinic);
  }
  console.log("\n🎉 All clinics uploaded to their namespaces!");
}

main();
```

---

### Step 2: Update Pinecone Query Function

**File:** `lib/pinecone.ts`

```typescript
/**
 * Query Pinecone with text in a specific namespace
 * @param text - Text query to search for
 * @param topK - Number of results to return
 * @param namespace - Namespace to query (e.g., "glow-clinic")
 * @param filter - Optional metadata filter
 */
export async function queryPineconeWithTextInNamespace(
  text: string,
  namespace: string, // 🔑 NEW PARAMETER
  topK: number = 5,
  filter?: Record<string, any>
) {
  try {
    // Convert text to embedding using OpenAI
    const embedding = await getOpenAIEmbedding(text);

    // Get namespaced index
    const index = getPineconeIndex();
    const namespacedIndex = index.namespace(namespace); // 🔑 KEY LINE!

    // Query within namespace
    const results = await namespacedIndex.query({
      vector: embedding,
      topK: topK,
      includeMetadata: true,
      ...(filter && { filter }),
    });

    return results;
  } catch (error) {
    console.error(`Error querying namespace ${namespace}:`, error);
    throw error;
  }
}
```

---

### Step 3: Update RAG Retrieval Logic

**File:** `app/lib/utils.ts`

```typescript
export async function retrieveContextFromPinecone(
  query: string,
  n: number = 3,
  clinicId: string, // 🔑 NEW: Required clinicId parameter
): Promise<{
  context: string;
  isRagWorking: boolean;
  ragSources: RAGSource[];
}> {
  try {
    // Map clinicId to namespace
    const namespace = clinicId; // e.g., "glow-clinic" → "glow-clinic" namespace

    console.log(`🔍 Querying namespace: ${namespace} for query: "${query}"`);

    // Query Pinecone within specific namespace
    const results = await queryPineconeWithTextInNamespace(
      query,
      namespace, // 🔑 Isolate to this clinic's namespace only!
      n
    );

    // Parse results
    const ragSources: RAGSource[] = results.matches
      .filter((match: any) => match.metadata?.text)
      .map((match: any, index: number) => ({
        id: match.id || `pinecone-${index}`,
        fileName: match.metadata?.clinicName || "Knowledge Base",
        snippet: match.metadata?.text || "",
        score: match.score || 0,
      }));

    if (ragSources.length === 0) {
      return {
        context: "",
        isRagWorking: false,
        ragSources: [],
      };
    }

    const context = ragSources
      .map((source) => source.snippet)
      .join("\n\n---\n\n");

    return {
      context,
      isRagWorking: true,
      ragSources,
    };
  } catch (error) {
    console.error("❌ Pinecone retrieval error:", error);
    return {
      context: "",
      isRagWorking: false,
      ragSources: [],
    };
  }
}
```

---

### Step 4: Pass ClinicId from Frontend

**Option A: URL Parameter (Simplest for MVP)**

```
https://yourdomain.com/chat?clinicId=glow-clinic
https://yourdomain.com/chat?clinicId=purity-clinic
```

**Frontend:** `page.tsx`
```typescript
const searchParams = useSearchParams();
const clinicId = searchParams.get('clinicId') || 'glow-clinic';

// Pass clinicId to API
fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({
    messages,
    clinicId, // 🔑 Send clinic identifier
  })
})
```

**Backend:** `app/api/chat/route.ts`
```typescript
export async function POST(req: Request) {
  const { messages, clinicId } = await req.json();

  if (!clinicId) {
    return new Response(JSON.stringify({ error: "Missing clinicId" }), {
      status: 400,
    });
  }

  // Retrieve context for THIS clinic only
  const { context } = await retrieveContextFromPinecone(
    latestMessage,
    3,
    clinicId // 🔑 Namespace isolation!
  );

  // Rest of logic...
}
```

---

**Option B: Subdomain (Production-Ready)**

```
glow.yourdomain.com     → clinicId = "glow-clinic"
purity.yourdomain.com   → clinicId = "purity-clinic"
pramudia.yourdomain.com → clinicId = "pramudia-clinic"
```

**Middleware:** `middleware.ts`
```typescript
export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";

  const clinicMap: Record<string, string> = {
    "glow.yourdomain.com": "glow-clinic",
    "purity.yourdomain.com": "purity-clinic",
    "pramudia.yourdomain.com": "pramudia-clinic",
  };

  const clinicId = clinicMap[hostname] || "default";

  // Add clinicId to request headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-clinic-id", clinicId);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}
```

**Backend:** `app/api/chat/route.ts`
```typescript
export async function POST(req: Request) {
  const clinicId = req.headers.get("x-clinic-id") || "default";

  // Use namespace based on clinicId
  const { context } = await retrieveContextFromPinecone(
    latestMessage,
    3,
    clinicId
  );
}
```

---

**Option C: Database Lookup (Enterprise)**

```typescript
// User logs in → Get user's clinicId from database
const session = await getServerSession(authOptions);
const user = await db.user.findUnique({
  where: { email: session.user.email },
  include: { clinic: true },
});

const clinicId = user.clinic.id; // e.g., "glow-clinic"

// Query their namespace only
const { context } = await retrieveContextFromPinecone(
  query,
  3,
  clinicId
);
```

---

## 📊 Architecture Comparison

| Feature | Multiple Indexes | Namespaces ✅ | Metadata Filtering |
|---------|-----------------|---------------|-------------------|
| **Cost (4 clients)** | $280/month | $70/month | $70/month |
| **Cost (100 clients)** | $7,000/month 😱 | $70/month 🎉 | $70/month |
| **Data Isolation** | ✅ Perfect | ✅ Perfect | ⚠️ Logical only |
| **Security** | ✅ Excellent | ✅ Excellent | ⚠️ Filter-dependent |
| **Scalability** | ❌ Poor | ✅ Excellent | ✅ Good |
| **Deployment Speed** | ❌ 10-15 min | ✅ Instant | ✅ Instant |
| **Maintenance** | ❌ High | ✅ Low | ✅ Low |
| **Query Performance** | ✅ Fast | ✅ Fast | ⚠️ Slightly slower |
| **Production Ready** | ⚠️ Only for few clients | ✅ Yes | ⚠️ Not for sensitive data |

---

## 🔐 Security Considerations

### Namespace Isolation (Recommended)

```typescript
// ✅ SECURE: Namespace enforced at Pinecone level
const results = await index.namespace("glow-clinic").query({...});

// ❌ IMPOSSIBLE: Cannot access other clinic's data
const results = await index.namespace("glow-clinic").query({...});
// → Only returns glow-clinic data, even if you try to filter for purity-clinic
```

### Metadata Filtering (Current Approach)

```typescript
// ⚠️ RISK: If filter logic has bug, could leak data
const results = await index.query({
  filter: { clinicId: { $eq: clinicId } } // What if this is bypassed?
});

// Example vulnerability:
if (!clinicId) { // Oops, forgot validation!
  // Query without filter → returns ALL clinics data 😱
  const results = await index.query({...});
}
```

**Verdict:** Namespaces provide **defense in depth** - even with code bugs, data stays isolated.

---

## 🚀 Migration Plan

### Phase 1: Setup (1-2 hours)
1. ✅ Create upload script with namespace support
2. ✅ Upload each clinic to their namespace
3. ✅ Verify data isolation (query each namespace)

### Phase 2: Code Changes (2-3 hours)
1. ✅ Update `lib/pinecone.ts` - Add namespace functions
2. ✅ Update `app/lib/utils.ts` - Use namespace queries
3. ✅ Update `app/api/chat/route.ts` - Pass clinicId
4. ✅ Update frontend - Detect/pass clinicId

### Phase 3: Testing (1-2 hours)
1. ✅ Test Klinik Glow → Should NOT see Purity data
2. ✅ Test Klinik Purity → Should NOT see Glow data
3. ✅ Test all 4 clinics independently
4. ✅ Verify complete isolation

### Phase 4: Cleanup (30 mins)
1. ✅ Remove old metadata filtering code
2. ✅ Update documentation
3. ✅ Deploy to production

**Total Time:** ~6-8 hours

---

## 💰 Cost Savings Example

### Scenario: 20 Clinic Clients

**Option 1: Multiple Indexes**
```
20 indexes × $70/month = $1,400/month
Annual cost: $16,800
```

**Option 2: Namespaces (Recommended)**
```
1 index × $70/month = $70/month
Annual cost: $840

💰 SAVINGS: $15,960/year! 🎉
```

---

## 📝 Code Checklist

Use this checklist for implementation:

### Upload Script
- [ ] Create `scripts/upload-faq-namespaces.ts`
- [ ] Define clinic configs with namespaces
- [ ] Implement `uploadClinicToNamespace()` function
- [ ] Test upload for each clinic
- [ ] Verify data in Pinecone console

### Pinecone Library
- [ ] Add `queryPineconeWithTextInNamespace()` function
- [ ] Update `getPineconeIndex()` to support namespaces
- [ ] Add namespace parameter to all query functions

### RAG Retrieval
- [ ] Update `retrieveContextFromPinecone()` signature
- [ ] Add `clinicId` → `namespace` mapping
- [ ] Update all callers to pass clinicId

### API Route
- [ ] Extract clinicId from request (URL/header/body)
- [ ] Validate clinicId exists
- [ ] Pass clinicId to RAG retrieval
- [ ] Return error if invalid clinicId

### Frontend
- [ ] Detect clinicId (URL param/subdomain/auth)
- [ ] Pass clinicId to API calls
- [ ] Handle multi-clinic scenarios

### Testing
- [ ] Test each clinic independently
- [ ] Verify data isolation (no cross-clinic leaks)
- [ ] Test edge cases (invalid clinicId, etc.)
- [ ] Performance testing

---

## 🎯 Final Recommendation

**Use Pinecone Namespaces (Option 2)** because:

1. ✅ **Cost-effective:** $70/month for unlimited clients
2. ✅ **Secure:** Perfect data isolation
3. ✅ **Scalable:** Support 1000+ clients easily
4. ✅ **Production-ready:** Used by major companies
5. ✅ **Fast deployment:** Add new client in seconds
6. ✅ **Easy maintenance:** Manage 1 index only

**Avoid Multiple Indexes** because:
- ❌ Too expensive for SaaS
- ❌ Not scalable beyond 5-10 clients
- ❌ Maintenance nightmare

**Avoid Metadata Filtering** because:
- ⚠️ Weaker security guarantees
- ⚠️ Risk of data leaks if filter bugs
- ⚠️ Not suitable for sensitive data

---

## 📚 Resources

- [Pinecone Namespaces Documentation](https://docs.pinecone.io/docs/namespaces)
- [Multi-Tenancy Best Practices](https://docs.pinecone.io/docs/multi-tenancy)
- [Pinecone Pricing](https://www.pinecone.io/pricing/)

---

**Status:** Ready for Implementation
**Estimated Time:** 6-8 hours
**Cost Impact:** Save $15,960/year (for 20 clients)
