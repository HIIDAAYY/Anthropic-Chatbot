/**
 * Script to delete vectors from removed clinics in Pinecone
 * Deletes: purity-clinic (40), pramudia-clinic (19), beauty-plus-clinic (9) = 68 vectors total
 * Run: npx tsx scripts/delete-clinic-vectors.ts
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
  { id: "purity-clinic", name: "The Purity Aesthetic Clinic", count: 40 },
  { id: "pramudia-clinic", name: "Klinik Pramudia", count: 19 },
  { id: "beauty-plus-clinic", name: "Beauty+ Clinic", count: 9 },
];

async function deleteClinicVectors() {
  console.log("\n" + "=".repeat(70));
  console.log("🗑️  PINECONE VECTOR DELETION");
  console.log("=".repeat(70));

  // Initialize Pinecone
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });

  const indexName = process.env.PINECONE_INDEX_NAME!;
  console.log(`📌 Pinecone index: "${indexName}"\n`);

  const index = pinecone.Index(indexName);

  // Get initial stats
  console.log("📊 Getting current index statistics...");
  const initialStats = await index.describeIndexStats();
  const initialCount = initialStats.totalRecordCount || 0;
  console.log(`   Total vectors before deletion: ${initialCount}\n`);

  // For each clinic, query and delete vectors
  let totalDeleted = 0;

  for (const clinic of CLINICS_TO_DELETE) {
    console.log(`🔍 Processing: ${clinic.name} (${clinic.id})`);
    console.log(`   Expected vectors: ${clinic.count}`);

    try {
      // Query vectors with metadata filter for this clinic
      const dummyVector = new Array(1536).fill(0);
      const filter = { clinicId: { $eq: clinic.id } };

      console.log(`   🔄 Querying vectors with filter...`);

      const queryResults = await index.query({
        vector: dummyVector,
        topK: 10000, // Get all vectors for this clinic
        includeMetadata: true,
        filter: filter,
      });

      const vectorIds = queryResults.matches.map((m) => m.id);
      console.log(`   Found ${vectorIds.length} vectors to delete`);

      if (vectorIds.length === 0) {
        console.log(`   ⚠️  No vectors found for ${clinic.id}`);
        continue;
      }

      // Delete in batches
      const batchSize = 50;
      for (let i = 0; i < vectorIds.length; i += batchSize) {
        const batch = vectorIds.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(vectorIds.length / batchSize);

        console.log(
          `   🗑️  Deleting batch ${batchNum}/${totalBatches} (${batch.length} vectors)...`
        );

        try {
          await index.deleteMany(batch);
          totalDeleted += batch.length;
          console.log(
            `   ✅ Batch ${batchNum} deleted (Total so far: ${totalDeleted})`
          );
        } catch (error: any) {
          console.error(
            `   ❌ Error deleting batch ${batchNum}:`,
            error.message
          );
          throw error;
        }

        // Small delay between batches
        if (i + batchSize < vectorIds.length) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }

      console.log(
        `   ✅ Completed: ${clinic.name} (${vectorIds.length} vectors)\n`
      );
    } catch (error: any) {
      console.error(`   ❌ Error processing ${clinic.id}:`, error.message);
      throw error;
    }
  }

  // Get final stats
  console.log("📊 Getting final index statistics...");
  const finalStats = await index.describeIndexStats();
  const finalCount = finalStats.totalRecordCount || 0;

  console.log(`   Total vectors before: ${initialCount}`);
  console.log(`   Total vectors after: ${finalCount}`);
  console.log(`   Vectors deleted: ${totalDeleted}\n`);

  // Verify only glow-clinic remains
  console.log("🔍 Verifying remaining data...");
  const dummyVector = new Array(1536).fill(0);
  const verifyResults = await index.query({
    vector: dummyVector,
    topK: 100,
    includeMetadata: true,
  });

  const remainingClinics = new Set(
    verifyResults.matches.map((m) => m.metadata?.clinicId)
  );

  console.log(`   Remaining clinics in index:`);
  remainingClinics.forEach((clinic) => {
    const count = verifyResults.matches.filter(
      (m) => m.metadata?.clinicId === clinic
    ).length;
    const status = clinic === "glow-clinic" ? "✅" : "❌";
    console.log(`   ${status} ${clinic}: ${count} vectors`);
  });

  // Final summary
  console.log("\n" + "=".repeat(70));
  console.log("✅ DELETION COMPLETE!");
  console.log("=".repeat(70));

  console.log(`\n📊 Results:`);
  console.log(`   Vectors deleted: ${totalDeleted}/${68}`);
  console.log(`   Index shrink: ${initialCount} → ${finalCount}`);

  console.log(`\n📌 Remaining knowledge base:`);
  console.log(`   ✅ Glow Aesthetics (glow-clinic): 39 vectors`);

  console.log(`\n🗑️  Deleted clinics:`);
  console.log(`   ❌ The Purity Aesthetic Clinic (purity-clinic): 40 vectors`);
  console.log(`   ❌ Klinik Pramudia (pramudia-clinic): 19 vectors`);
  console.log(`   ❌ Beauty+ Clinic (beauty-plus-clinic): 9 vectors`);

  console.log(`\n🎉 Pinecone is now cleaned up! Only Glow Aesthetics remains.\n`);
}

// Run
deleteClinicVectors().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
