/**
 * Script to delete vectors from Pinecone for removed clinics
 * Deletes all vectors with clinicId: purity-clinic, pramudia-clinic, beauty-plus-clinic
 * Run: npx tsx scripts/cleanup-pinecone-clinics.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Fix __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
const envPath = resolve(__dirname, "../.env.local");
console.log(`Loading .env from: ${envPath}`);
config({ path: envPath, override: true });

import { Pinecone } from "@pinecone-database/pinecone";

// Clinics to delete from Pinecone
const CLINICS_TO_DELETE = [
  "purity-clinic",
  "pramudia-clinic",
  "beauty-plus-clinic",
];

async function cleanupPinecone() {
  console.log("\n" + "=".repeat(60));
  console.log("🗑️  PINECONE CLEANUP - DELETE REMOVED CLINICS");
  console.log("=".repeat(60));

  // Initialize Pinecone
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });

  const indexName = process.env.PINECONE_INDEX_NAME!;
  console.log(`📌 Pinecone index: "${indexName}\n`);

  const index = pinecone.Index(indexName);

  // Get initial stats
  console.log("📊 Getting current index statistics...");
  const initialStats = await index.describeIndexStats();
  console.log(`   Total vectors before cleanup: ${initialStats.totalRecordCount || 0}`);

  // For each clinic to delete, query and delete vectors
  for (const clinicId of CLINICS_TO_DELETE) {
    console.log(`\n🔍 Processing clinic: ${clinicId}`);
    console.log(`   Creating filter for clinicId="${clinicId}"...`);

    try {
      // Query vectors with metadata filter for this clinic
      const filter = { clinicId: { $eq: clinicId } };

      // First, get a sample to understand what we're deleting
      const sampleResults = await index.query({
        vector: new Array(1536).fill(0), // Dummy vector (dimension should match your index)
        topK: 1,
        includeMetadata: true,
        filter: filter,
      });

      const vectorCount = sampleResults.matches.length;

      if (vectorCount === 0) {
        console.log(`   ⚠️  No vectors found for ${clinicId}`);
        continue;
      }

      console.log(`   Found ${vectorCount} vector(s) to delete`);

      // Pinecone doesn't have a native "deleteByMetadata", so we need to:
      // 1. Query to get all IDs matching the filter (in batches)
      // 2. Delete them using deleteMany

      // Since we know the IDs follow pattern "clinicId-UUID", we can delete by prefix
      // But safer approach: query with topK large number and delete batch by batch

      console.log(`   🔄 Querying for all vectors with ${clinicId}...`);

      // Query in batches to get all IDs
      let allIds: string[] = [];
      let offset = 0;
      const batchSize = 1000;

      // Note: Pinecone doesn't support offset in query, so we'll use a different approach
      // We'll query and collect IDs until we get fewer than batchSize results
      const queryResults = await index.query({
        vector: new Array(1536).fill(0),
        topK: 10000, // Max topK to get all matching vectors
        includeMetadata: true,
        filter: filter,
      });

      allIds = queryResults.matches.map((m) => m.id);

      console.log(`   📋 Total IDs to delete: ${allIds.length}`);

      if (allIds.length === 0) {
        console.log(`   ✅ No vectors to delete for ${clinicId}`);
        continue;
      }

      // Delete in batches to avoid overwhelming the API
      for (let i = 0; i < allIds.length; i += batchSize) {
        const batchIds = allIds.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(allIds.length / batchSize);

        console.log(
          `   🗑️  Deleting batch ${batchNum}/${totalBatches} (${batchIds.length} vectors)...`
        );

        try {
          await index.deleteMany(batchIds);
          console.log(`   ✅ Batch ${batchNum} deleted successfully`);
        } catch (error: any) {
          console.error(`   ❌ Error deleting batch ${batchNum}:`, error.message);
          throw error;
        }

        // Small delay between batches to be gentle on the API
        if (i + batchSize < allIds.length) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      console.log(`   ✅ Deleted ${allIds.length} vectors for ${clinicId}`);
    } catch (error: any) {
      console.error(
        `   ❌ Error processing ${clinicId}:`,
        error.message || error
      );
      throw error;
    }
  }

  // Get final stats
  console.log(`\n📊 Getting final index statistics...`);
  const finalStats = await index.describeIndexStats();
  const vectorsDeleted =
    (initialStats.totalRecordCount || 0) - (finalStats.totalRecordCount || 0);

  console.log(`   Total vectors before: ${initialStats.totalRecordCount || 0}`);
  console.log(`   Total vectors after: ${finalStats.totalRecordCount || 0}`);
  console.log(`   Vectors deleted: ${vectorsDeleted}`);

  console.log("\n" + "=".repeat(60));
  console.log("✅ CLEANUP COMPLETE!");
  console.log("=".repeat(60));
  console.log("\n📌 Remaining knowledge base:");
  console.log("   ✅ glow-clinic (Klinik Glow Aesthetics)");
  console.log("\n🗑️  Removed clinics:");
  console.log("   ❌ purity-clinic (The Purity Aesthetic Clinic)");
  console.log("   ❌ pramudia-clinic (Klinik Pramudia)");
  console.log("   ❌ beauty-plus-clinic (Beauty+ Clinic)");
  console.log("\n✨ Your Pinecone index is now cleaned up!\n");
}

// Run
cleanupPinecone().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
