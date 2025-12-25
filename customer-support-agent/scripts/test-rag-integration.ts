/**
 * Integration test for RAG with native Pinecone filtering
 * Tests if clinic queries get clinic data and urbanstyle queries get urbanstyle data
 * Run: npx tsx scripts/test-rag-integration.ts
 */

// Load environment variables
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local") });

import { retrieveContext, detectKnowledgeBase } from "../app/lib/utils";

async function testRAGIntegration() {
  console.log("🧪 Testing RAG Integration with Native Filtering\n");
  console.log("━".repeat(80));

  const testQueries = [
    {
      query: "Berapa harga facial treatment dan perawatan wajah?",
      expectedKB: "clinic",
      description: "Clinic query - should return clinic data"
    },
    {
      query: "Apakah ada layanan scaling gigi dan tambal gigi?",
      expectedKB: "clinic",
      description: "Dental query - should return clinic data"
    },
    {
      query: "Ada baju kemeja ukuran XL stock?",
      expectedKB: undefined,
      description: "Fashion query - should return urbanstyle data"
    },
    {
      query: "Bagaimana cara tracking pesanan dan resi pengiriman?",
      expectedKB: undefined,
      description: "E-commerce query - should return urbanstyle data"
    }
  ];

  for (let i = 0; i < testQueries.length; i++) {
    const test = testQueries[i];
    console.log(`\nTest ${i + 1}: ${test.description}`);
    console.log(`Query: "${test.query}"`);
    console.log("─".repeat(80));

    // Step 1: Auto-detect KB
    const detectedKB = detectKnowledgeBase(test.query);
    const detectionCorrect = detectedKB === test.expectedKB;

    console.log(`\n1️⃣ Auto-Detection:`);
    console.log(`   Expected: ${test.expectedKB || 'urbanstyle'}`);
    console.log(`   Detected: ${detectedKB || 'urbanstyle'}`);
    console.log(`   Result: ${detectionCorrect ? '✅ CORRECT' : '❌ WRONG'}`);

    // Step 2: Retrieve context with detected KB
    console.log(`\n2️⃣ RAG Retrieval:`);
    try {
      const result = await retrieveContext(test.query, detectedKB, 3);

      console.log(`   RAG Working: ${result.isRagWorking ? '✅ YES' : '❌ NO'}`);
      console.log(`   Sources Retrieved: ${result.ragSources.length}`);

      if (result.ragSources.length > 0) {
        console.log(`\n   📄 Retrieved Sources:`);
        result.ragSources.forEach((source, idx) => {
          const sourceTag = source.source || 'no-source';
          const preview = source.snippet.slice(0, 100);
          console.log(`      ${idx + 1}. [${sourceTag}] Score: ${source.score.toFixed(4)}`);
          console.log(`         "${preview}..."`);
        });

        // Verify all sources match expected KB
        const allSourcesCorrect = result.ragSources.every(source => {
          if (test.expectedKB === "clinic") {
            return source.source === "clinic";
          } else {
            // For urbanstyle, source should be empty/undefined or "default"
            return !source.source || source.source === "default";
          }
        });

        console.log(`\n   Source Verification: ${allSourcesCorrect ? '✅ All sources match expected KB' : '❌ Some sources from wrong KB!'}`);

        if (!allSourcesCorrect) {
          console.log(`   ⚠️  WARNING: Retrieved data from wrong knowledge base!`);
          result.ragSources.forEach(source => {
            const expected = test.expectedKB === "clinic" ? "clinic" : "empty/default";
            const actual = source.source || "empty";
            if ((test.expectedKB === "clinic" && source.source !== "clinic") ||
                (test.expectedKB !== "clinic" && source.source === "clinic")) {
              console.log(`      ❌ Expected source: ${expected}, Got: ${actual}`);
            }
          });
        }
      } else {
        console.log(`   ⚠️  No results retrieved - this may indicate a problem`);
      }

    } catch (error: any) {
      console.log(`   ❌ ERROR: ${error.message}`);
    }

    console.log("\n" + "━".repeat(80));
  }

  console.log("\n✅ Integration test completed!");
  console.log("\n💡 What to check:");
  console.log("   1. Auto-detection should correctly identify KB");
  console.log("   2. RAG should retrieve results");
  console.log("   3. All retrieved sources should be from the correct KB");
  console.log("   4. Clinic queries → clinic sources only");
  console.log("   5. Fashion queries → urbanstyle sources only (no clinic)");
  console.log("\n" + "━".repeat(80));
}

testRAGIntegration();
