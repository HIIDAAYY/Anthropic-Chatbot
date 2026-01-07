/**
 * Script to delete old clinic vectors from Pinecone before re-upload
 * Run: npx tsx scripts/delete-old-clinic-vectors.ts
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

async function deleteOldClinicVectors() {
  console.log("\n" + "=".repeat(60));
  console.log("🗑️  OLD CLINIC VECTORS CLEANUP");
  console.log("=".repeat(60) + "\n");

  // Initialize Pinecone
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });

  const indexName = process.env.PINECONE_INDEX_NAME!;
  console.log(`📌 Pinecone index: "${indexName}"\n`);

  const index = pinecone.Index(indexName);

  // Get current stats
  console.log("🔍 Checking current index stats...");
  const beforeStats = await index.describeIndexStats();
  console.log(`   Total vectors before deletion: ${beforeStats.totalRecordCount || 0}`);

  // Check if there are clinic vectors
  const namespaceStats = beforeStats.namespaces?.[""] || {};
  console.log(`   Vectors in default namespace: ${namespaceStats.recordCount || 0}\n`);

  // Confirm deletion
  console.log("⚠️  WARNING: This will delete ALL vectors from the index!");
  console.log("   Pinecone serverless doesn't support metadata filtering in deleteMany,");
  console.log("   so we need to delete all vectors and re-upload all clinic FAQs.");
  console.log("   You should re-upload with upload-multi-clinic-faq.ts after this!\n");

  console.log("🗑️  Deleting clinic vectors...");

  try {
    // Delete all vectors in the default namespace
    // Note: Pinecone serverless doesn't support metadata filtering in deleteMany
    // So we'll delete all vectors and re-upload all clinic FAQs
    await index.namespace("").deleteAll();

    console.log("✅ Deletion request sent to Pinecone (ALL vectors)\n");

    // Note: Pinecone deletion is eventually consistent
    console.log("⏳ Note: Deletion is eventually consistent (may take a few seconds)");
    console.log("   Waiting 5 seconds for deletion to propagate...\n");

    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Get final stats
    console.log("🔍 Checking final index stats...");
    const afterStats = await index.describeIndexStats();
    console.log(`   Total vectors after deletion: ${afterStats.totalRecordCount || 0}`);

    const deletedCount = (beforeStats.totalRecordCount || 0) - (afterStats.totalRecordCount || 0);
    console.log(`   Estimated vectors deleted: ~${deletedCount}\n`);

    console.log("=".repeat(60));
    console.log("✅ CLEANUP COMPLETE!");
    console.log("=".repeat(60) + "\n");

    console.log("📝 Next steps:");
    console.log("   1. Run: npx tsx scripts/upload-multi-clinic-faq.ts");
    console.log("   2. This will upload all 4 clinic FAQs with new metadata\n");
  } catch (error: any) {
    console.error("\n❌ Error during deletion:", error.message);
    throw error;
  }
}

// Confirmation prompt
console.log("\n⚠️  WARNING: This will delete ALL vectors from your Pinecone index!");
console.log("Press CTRL+C to cancel, or wait 5 seconds to proceed...\n");

setTimeout(() => {
  deleteOldClinicVectors().catch((error) => {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  });
}, 5000);
