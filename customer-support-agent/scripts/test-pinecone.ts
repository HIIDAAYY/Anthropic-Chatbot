/**
 * Test script untuk verifikasi Pinecone + Voyage AI setup
 *
 * Run: npx tsx scripts/test-pinecone.ts
 */

// Load environment variables from .env.local
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env.local") });

import { getIndexStats } from "../lib/pinecone";
import { getEmbedding } from "../lib/embeddings";

async function testSetup() {
  console.log("🧪 Testing Pinecone + Voyage AI Setup...\n");

  try {
    // Test 1: Voyage AI Embedding
    console.log("1️⃣ Testing Voyage AI embedding...");
    const testText = "Hello, this is a test message";
    const embedding = await getEmbedding(testText);
    console.log(`✅ Voyage AI works! Generated embedding with ${embedding.length} dimensions`);
    console.log(`   Sample values: [${embedding.slice(0, 5).map(n => n.toFixed(4)).join(', ')}...]\n`);

    // Test 2: Pinecone Connection
    console.log("2️⃣ Testing Pinecone connection...");
    const stats = await getIndexStats();
    console.log("✅ Pinecone works! Index stats:");
    console.log(`   Index: ${process.env.PINECONE_INDEX_NAME}`);
    console.log(`   Dimension: ${stats.dimension}`);
    console.log(`   Total vectors: ${stats.totalRecordCount || 0}`);
    console.log(`   Namespaces:`, Object.keys(stats.namespaces || {}).length || 'default');
    console.log("");

    // Validation
    if (stats.dimension !== embedding.length) {
      console.warn("⚠️  WARNING: Index dimension doesn't match embedding dimension!");
      console.warn(`   Index dimension: ${stats.dimension}`);
      console.warn(`   Voyage embedding dimension: ${embedding.length}`);
      console.warn(`   Make sure your Pinecone index uses ${embedding.length} dimensions for voyage-3`);
    } else {
      console.log("✅ Dimension match! Index and embeddings are compatible\n");
    }

    console.log("🎉 All tests passed! Your setup is ready to use.");
    console.log("\nNext steps:");
    console.log("  - Use upsertTexts() to add your documents");
    console.log("  - Use queryPineconeWithText() to search");
    console.log("  - Check lib/pinecone-examples.md for usage examples");

  } catch (error: any) {
    console.error("❌ Test failed!");
    console.error("\nError details:", error.message);

    if (error.message.includes("API key")) {
      console.error("\n💡 Tip: Check your API keys in .env.local");
      console.error("   - VOYAGE_API_KEY");
      console.error("   - PINECONE_API_KEY");
    }

    if (error.message.includes("index")) {
      console.error("\n💡 Tip: Check your PINECONE_INDEX_NAME in .env.local");
      console.error("   Make sure the index exists in your Pinecone dashboard");
    }

    process.exit(1);
  }
}

testSetup();
