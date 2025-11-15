/**
 * Script to list all data in Pinecone index
 * This will show document IDs and metadata without doing embedding queries
 * Run: npx tsx scripts/list-all-data.ts
 */

// Load environment variables
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local") });

import { Pinecone } from "@pinecone-database/pinecone";

async function listAllData() {
  console.log("📋 Listing all data in Pinecone index...\n");
  console.log("━".repeat(80));

  try {
    // Initialize Pinecone
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });

    const indexName = process.env.PINECONE_INDEX_NAME!;
    const index = pinecone.Index(indexName);

    // Get index stats first
    const stats = await index.describeIndexStats();
    console.log(`\n📊 Index: ${indexName}`);
    console.log(`📈 Total vectors: ${stats.totalRecordCount || 0}`);
    console.log(`📐 Dimensions: ${stats.dimension}\n`);
    console.log("━".repeat(80));

    // List vectors using query with a dummy vector
    // This is a workaround since Pinecone doesn't have a direct "list all" API
    console.log("\n⚠️  Note: Pinecone doesn't provide a direct 'list all' API.");
    console.log("To view all documents, you have two options:\n");
    console.log("1. Use the Pinecone web dashboard: https://app.pinecone.io");
    console.log(`   - Go to your index: ${indexName}`);
    console.log("   - Click 'Query' tab to explore vectors\n");
    console.log("2. Query specific topics (see scripts/test-query.ts)\n");

    // Try to query with top results to show some sample data
    console.log("━".repeat(80));
    console.log("\n📝 Fetching sample documents...\n");

    // Create a dummy vector for querying
    const dummyVector = new Array(stats.dimension).fill(0);

    const queryResult = await index.query({
      vector: dummyVector,
      topK: 10,
      includeMetadata: true,
    });

    if (queryResult.matches && queryResult.matches.length > 0) {
      console.log(`Found ${queryResult.matches.length} sample documents:\n`);

      queryResult.matches.forEach((match, idx) => {
        console.log(`${idx + 1}. ID: ${match.id}`);
        if (match.metadata) {
          const text = match.metadata.text as string;
          const preview = text?.length > 100
            ? text.substring(0, 100) + "..."
            : text || "No text";
          console.log(`   Preview: ${preview}`);

          // Show other metadata
          const otherMeta = Object.entries(match.metadata)
            .filter(([key]) => key !== 'text')
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
          if (otherMeta) {
            console.log(`   Metadata: ${otherMeta}`);
          }
        }
        console.log();
      });
    }

    console.log("━".repeat(80));
    console.log("\n💡 Recommendations:");
    console.log("   - To search by topic, use: npx tsx scripts/test-query.ts");
    console.log("   - To view all data, use the Pinecone dashboard");
    console.log("   - To export all data, you'll need to use the Pinecone API with pagination\n");

  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

listAllData();
