# Pinecone + Voyage AI Integration - Usage Examples

## Setup

### 1. Install Dependencies

```bash
npm install @pinecone-database/pinecone voyageai
```

### 2. Environment Variables

Add to your `.env.local`:

```env
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=your_index_name
VOYAGE_API_KEY=your_voyage_api_key
```

### 3. Create Pinecone Index

Make sure your Pinecone index dimensions match Voyage AI model:
- **voyage-3**: 1024 dimensions (recommended)
- **voyage-3-lite**: 512 dimensions
- **voyage-code-3**: 1024 dimensions

## Usage Examples

### Example 1: Query with Text (Simple)

```typescript
import { queryPineconeWithText } from "@/lib/pinecone";

// Search for relevant documents
const results = await queryPineconeWithText(
  "How do I return a product?",
  5 // top 5 results
);

console.log(results.matches);
// [
//   { id: "doc1", score: 0.92, metadata: { text: "...", category: "returns" } },
//   { id: "doc2", score: 0.87, metadata: { text: "...", category: "refunds" } },
//   ...
// ]
```

### Example 2: Query with Filters

```typescript
import { queryPineconeWithText } from "@/lib/pinecone";

// Search only in specific category
const results = await queryPineconeWithText(
  "How do I return a product?",
  5,
  { category: "returns" } // filter by metadata
);
```

### Example 3: Add Documents to Pinecone

```typescript
import { upsertTexts } from "@/lib/pinecone";

// Add customer support documents
await upsertTexts([
  {
    id: "doc1",
    text: "To return a product, go to Orders > Select item > Request Return",
    metadata: {
      category: "returns",
      language: "en",
    },
  },
  {
    id: "doc2",
    text: "Refunds are processed within 5-7 business days",
    metadata: {
      category: "refunds",
      language: "en",
    },
  },
]);
```

### Example 4: Use in API Route (Next.js)

```typescript
// app/api/search/route.ts
import { queryPineconeWithText } from "@/lib/pinecone";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    // Search Pinecone
    const results = await queryPineconeWithText(query, 3);

    // Extract relevant context
    const context = results.matches
      .map((match) => match.metadata?.text)
      .filter(Boolean)
      .join("\n\n");

    return NextResponse.json({ context, results });
  } catch (error) {
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
```

### Example 5: RAG (Retrieval-Augmented Generation) with Claude

```typescript
import { queryPineconeWithText } from "@/lib/pinecone";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function answerQuestion(question: string) {
  // 1. Search for relevant context in Pinecone
  const results = await queryPineconeWithText(question, 3);

  // 2. Extract context
  const context = results.matches
    .map((match) => match.metadata?.text)
    .filter(Boolean)
    .join("\n\n");

  // 3. Generate answer with Claude using retrieved context
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Answer the following question using the provided context.

Context:
${context}

Question: ${question}

Answer:`,
      },
    ],
  });

  return message.content[0].text;
}

// Usage
const answer = await answerQuestion("How do I return a product?");
console.log(answer);
```

### Example 6: Batch Processing

```typescript
import { upsertTexts } from "@/lib/pinecone";

// Load documents from JSON/CSV/Database
const documents = [
  { id: "faq1", text: "Question 1 answer...", category: "general" },
  { id: "faq2", text: "Question 2 answer...", category: "billing" },
  // ... hundreds more
];

// Process in batches (Pinecone recommends 100 vectors per batch)
const batchSize = 100;
for (let i = 0; i < documents.length; i += batchSize) {
  const batch = documents.slice(i, i + batchSize);
  await upsertTexts(batch);
  console.log(`Processed ${i + batch.length} / ${documents.length}`);
}
```

### Example 7: Delete Documents

```typescript
import { deleteVectors } from "@/lib/pinecone";

// Delete specific documents
await deleteVectors(["doc1", "doc2", "doc3"]);
```

### Example 8: Get Index Statistics

```typescript
import { getIndexStats } from "@/lib/pinecone";

const stats = await getIndexStats();
console.log(stats);
// {
//   namespaces: { '': { vectorCount: 1000 } },
//   dimension: 1024,
//   indexFullness: 0.01
// }
```

## Advanced: Direct Vector Operations

If you already have embeddings, you can use low-level functions:

```typescript
import { queryPinecone, upsertVectors } from "@/lib/pinecone";
import { getEmbedding } from "@/lib/embeddings";

// Generate embedding manually
const embedding = await getEmbedding("my text");

// Query with embedding
const results = await queryPinecone(embedding, 5);

// Upsert with pre-computed embeddings
await upsertVectors([
  {
    id: "vec1",
    values: embedding,
    metadata: { text: "my text" },
  },
]);
```

## Best Practices

1. **Store original text in metadata** - Always include the original text in metadata so you can retrieve it later
2. **Use batch operations** - Process multiple documents at once for better performance
3. **Add relevant metadata** - Include category, language, date, etc. for better filtering
4. **Choose right model** - Use `voyage-3` for general text, `voyage-code-3` for code
5. **Monitor costs** - Voyage AI charges per token, batch requests when possible
6. **Handle errors** - Wrap calls in try-catch blocks
7. **Cache embeddings** - Don't re-embed the same text multiple times

## Troubleshooting

### Error: "Index not found"
- Make sure `PINECONE_INDEX_NAME` matches your actual index name
- Check that index exists in Pinecone dashboard

### Error: "Dimension mismatch"
- Ensure your Pinecone index dimensions match Voyage model:
  - `voyage-3` = 1024 dimensions
  - `voyage-3-lite` = 512 dimensions

### Error: "Invalid API key"
- Check `PINECONE_API_KEY` and `VOYAGE_API_KEY` are correct
- Make sure `.env.local` is loaded (restart dev server)

## Resources

- [Pinecone Documentation](https://docs.pinecone.io)
- [Voyage AI Documentation](https://docs.voyageai.com)
- [Voyage AI Models](https://docs.voyageai.com/docs/embeddings)
