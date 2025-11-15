/**
 * Test script to query existing Pinecone data
 * Run: npx tsx scripts/test-query.ts
 */

// Load environment variables
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local") });

import { queryPineconeWithText } from "../lib/pinecone";

// Sample test queries
const sampleQueries = [
  "How do I return a product?",
  "What is your refund policy?",
  "How long does shipping take?",
  "How can I track my order?",
  "What payment methods do you accept?",
];

async function runTests() {
  console.log("🧪 Testing Pinecone Queries with Existing Data (82 vectors)\n");
  console.log("━".repeat(80));

  for (const query of sampleQueries) {
    console.log(`\n📝 Query: "${query}"`);
    console.log("─".repeat(80));

    try {
      const results = await queryPineconeWithText(query, 3);

      if (results.matches.length === 0) {
        console.log("❌ No results found");
        continue;
      }

      console.log(`✅ Found ${results.matches.length} results:\n`);

      results.matches.forEach((match: any, index: number) => {
        const score = (match.score * 100).toFixed(1);
        const text = match.metadata?.text || "No text available";
        const preview = text.length > 150 ? text.substring(0, 150) + "..." : text;

        console.log(`${index + 1}. [${score}% match] ${match.id}`);
        console.log(`   ${preview}`);
        console.log();
      });
    } catch (error: any) {
      console.error("❌ Error:", error.message);
    }

    console.log("─".repeat(80));
  }

  console.log("\n✅ Query testing completed!");
}

runTests();
