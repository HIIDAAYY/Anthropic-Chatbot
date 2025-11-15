/**
 * Script to clear all vectors from Pinecone index
 * Run: npx tsx scripts/clear-pinecone.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local") });

import { Pinecone } from "@pinecone-database/pinecone";

async function clearPinecone() {
  console.log("⚠️  WARNING: This will DELETE all vectors from Pinecone index!\n");
  console.log("Index:", process.env.PINECONE_INDEX_NAME);
  console.log("Are you sure? (This action cannot be undone)\n");

  // For safety, require confirmation
  const args = process.argv.slice(2);
  if (!args.includes("--confirm")) {
    console.log("❌ Aborted. To confirm, run:");
    console.log("   npx tsx scripts/clear-pinecone.ts --confirm");
    process.exit(1);
  }

  try {
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });

    const indexName = process.env.PINECONE_INDEX_NAME!;
    const index = pinecone.Index(indexName);

    console.log("🔄 Fetching all vector IDs...");

    // Get stats first
    const stats = await index.describeIndexStats();
    const totalVectors = stats.totalRecordCount || 0;

    console.log(`📊 Total vectors to delete: ${totalVectors}\n`);

    if (totalVectors === 0) {
      console.log("✅ Index is already empty!");
      return;
    }

    // Delete all vectors by deleting the entire namespace
    // This is the most efficient way
    console.log("🗑️  Deleting all vectors...");
    await index.deleteAll();

    console.log("✅ All vectors deleted successfully!\n");

    // Verify
    const newStats = await index.describeIndexStats();
    const remainingVectors = newStats.totalRecordCount || 0;
    console.log(`📊 Remaining vectors: ${remainingVectors}`);

  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

clearPinecone();
