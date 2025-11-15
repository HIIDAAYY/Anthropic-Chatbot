/**
 * Script to search for payment-related information in Pinecone
 * Run: npx tsx scripts/search-payment.ts
 */

// Load environment variables
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local") });

import { queryPineconeWithText } from "../lib/pinecone";

async function searchPayment() {
  console.log("💳 Searching for payment-related information...\n");
  console.log("━".repeat(80));

  // Wait a bit to avoid rate limit
  console.log("⏳ Waiting 5 seconds to avoid rate limit...");
  await new Promise(resolve => setTimeout(resolve, 5000));

  try {
    const query = "metode pembayaran";
    console.log(`\n📝 Query: "${query}"`);
    console.log("─".repeat(80));

    const results = await queryPineconeWithText(query, 5);

    if (results.matches.length === 0) {
      console.log("❌ No results found");
      return;
    }

    console.log(`\n✅ Found ${results.matches.length} results:\n`);

    results.matches.forEach((match: any, index: number) => {
      const score = (match.score * 100).toFixed(1);
      const text = match.metadata?.text || "No text available";

      console.log(`${index + 1}. [${score}% match]`);
      console.log(`ID: ${match.id}`);
      console.log(`Text: ${text}`);
      console.log();
      console.log("─".repeat(80));
    });

    console.log("\n✅ Search completed!");

  } catch (error: any) {
    console.error("❌ Error:", error.message);
    if (error.statusCode === 429) {
      console.error("\n⚠️  Rate limit exceeded. Please wait 1-2 minutes and try again.");
    }
  }
}

searchPayment();
