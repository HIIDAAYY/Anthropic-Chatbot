/**
 * Script to search for payment methods in Pinecone
 * Run: npx tsx scripts/search-payment2.ts
 */

// Load environment variables
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local") });

import { queryPineconeWithText } from "../lib/pinecone";

async function searchPayment() {
  console.log("💳 Searching for payment information...\n");

  const queries = [
    "Apa saja metode pembayaran yang diterima",
    "cara bayar transfer bank",
    "pembayaran e-wallet gopay ovo",
  ];

  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];

    console.log("━".repeat(80));
    console.log(`\n📝 Query ${i + 1}: "${query}"`);
    console.log("─".repeat(80));

    // Wait between queries to avoid rate limit
    if (i > 0) {
      console.log("⏳ Waiting 10 seconds to avoid rate limit...");
      await new Promise(resolve => setTimeout(resolve, 10000));
    }

    try {
      const results = await queryPineconeWithText(query, 3);

      if (results.matches.length === 0) {
        console.log("❌ No results found");
        continue;
      }

      console.log(`\n✅ Found ${results.matches.length} results:\n`);

      results.matches.forEach((match: any, index: number) => {
        const score = (match.score * 100).toFixed(1);
        const text = match.metadata?.text || "No text available";

        console.log(`${index + 1}. [${score}% relevance]`);
        console.log(`${text}\n`);
      });

    } catch (error: any) {
      console.error("❌ Error:", error.message);
      if (error.statusCode === 429) {
        console.error("\n⚠️  Rate limit exceeded. Skipping remaining queries.");
        break;
      }
    }
  }

  console.log("━".repeat(80));
  console.log("\n✅ Search completed!");
}

searchPayment();
