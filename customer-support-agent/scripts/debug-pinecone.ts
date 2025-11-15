import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local") });

import { Pinecone } from "@pinecone-database/pinecone";

async function debug() {
  console.log("🔍 Debugging Pinecone Connection\n");
  console.log("Environment Variables:");
  console.log("  PINECONE_INDEX_NAME:", process.env.PINECONE_INDEX_NAME);
  console.log("  PINECONE_ENVIRONMENT:", process.env.PINECONE_ENVIRONMENT);
  console.log("  PINECONE_API_KEY:", process.env.PINECONE_API_KEY?.slice(0, 10) + "...");

  try {
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });

    console.log("\n🔄 Listing all indexes...\n");
    const indexes = await pinecone.listIndexes();

    console.log(`Found ${indexes.length} indexes:`);
    indexes.forEach((idx: any) => {
      console.log(`  • ${idx.name}`);
      console.log(`    - Dimension: ${idx.dimension}`);
      console.log(`    - Metric: ${idx.metric}`);
      console.log(`    - Spec: ${JSON.stringify(idx.spec)}`);
    });

    console.log("\n📊 Checking target index...");
    const indexName = process.env.PINECONE_INDEX_NAME!;
    const targetIndex = indexes.find((idx: any) => idx.name === indexName);

    if (targetIndex) {
      console.log(`✅ Found target index: ${indexName}`);
      console.log(`   Dimension: ${targetIndex.dimension}`);
    } else {
      console.log(`❌ Target index not found: ${indexName}`);
    }

  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }
}

debug();
