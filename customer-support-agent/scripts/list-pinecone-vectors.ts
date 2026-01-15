/**
 * Script to list all vectors in Pinecone using list API
 * Shows actual vector IDs, metadata structure, and content
 * Run: npx tsx scripts/list-pinecone-vectors.ts
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

async function listAllVectors() {
  console.log("\n" + "=".repeat(70));
  console.log("📋 PINECONE VECTOR LISTING");
  console.log("=".repeat(70) + "\n");

  // Initialize Pinecone
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });

  const indexName = process.env.PINECONE_INDEX_NAME!;
  console.log(`📌 Pinecone index: "${indexName}"\n`);

  const index = pinecone.Index(indexName);

  // Get index stats first
  console.log("📈 Index Statistics:");
  const stats = await index.describeIndexStats();
  console.log(`   Total vectors: ${stats.totalRecordCount || 0}`);
  console.log(`   Dimension: ${stats.dimension}`);
  console.log(`   Namespaces: ${Object.keys(stats.namespaces || {}).length}\n`);

  const totalVectors = stats.totalRecordCount || 0;

  if (totalVectors === 0) {
    console.log("⚠️  Index is empty");
    return;
  }

  // Check namespaces
  console.log("🏷️  Namespaces in index:");
  if (stats.namespaces && Object.keys(stats.namespaces).length > 0) {
    Object.entries(stats.namespaces).forEach(([ns, nsStats]: any) => {
      console.log(
        `   • "${ns}": ${nsStats.recordCount || 0} vectors`
      );
    });
  } else {
    console.log(`   • (default namespace): ${totalVectors} vectors`);
  }

  console.log(
    "\n🔍 Note: Pinecone list() API returns vector IDs, not actual vectors"
  );
  console.log("   Using query with low-confidence vectors to reveal metadata...\n");

  // Try different query approaches to reveal data
  try {
    // Approach 1: Query with all-zeros vector (least discriminative)
    console.log("📊 Approach 1: Query all vectors with zero vector");
    const zeroVector = new Array(1536).fill(0);

    const results = await index.query({
      vector: zeroVector,
      topK: 200, // Get up to 200 vectors
      includeMetadata: true,
    });

    console.log(
      `   Found ${results.matches.length} matches (if any)\n`
    );

    if (results.matches.length > 0) {
      console.log("=" + "=".repeat(69));
      console.log("📝 VECTOR DETAILS");
      console.log("=" + "=".repeat(69));

      // Group vectors
      const bySource: Record<string, any[]> = {};
      const byClinic: Record<string, any[]> = {};

      results.matches.forEach((match: any, idx: number) => {
        const meta = match.metadata || {};
        const source = meta.source || "no-source";
        const clinic = meta.clinicId || "no-clinic";

        if (!bySource[source]) bySource[source] = [];
        if (!byClinic[clinic]) byClinic[clinic] = [];

        bySource[source].push({ idx, id: match.id, meta });
        byClinic[clinic].push({ idx, id: match.id, meta });
      });

      // Show by source
      console.log("\n🏥 Vectors by Source:");
      Object.entries(bySource).forEach(([source, vectors]) => {
        console.log(
          `   ${source}: ${vectors.length} vectors`
        );
        vectors.slice(0, 2).forEach((v: any) => {
          const meta = v.meta;
          console.log(`      • ID: ${v.id}`);
          console.log(`        Clinic: ${meta.clinicId || "N/A"}`);
          console.log(`        Category: ${meta.category || "N/A"}`);
          if (meta.clinicName) console.log(`        Clinic Name: ${meta.clinicName}`);
          if (meta.title) console.log(`        Title: ${meta.title}`);
          if (meta.question) {
            const q = meta.question.substring(0, 50);
            console.log(`        Question: ${q}...`);
          }
        });
        if (vectors.length > 2) {
          console.log(`      ... and ${vectors.length - 2} more`);
        }
      });

      // Show by clinic
      console.log("\n🏨 Vectors by Clinic:");
      Object.entries(byClinic).forEach(([clinic, vectors]) => {
        console.log(
          `   ${clinic}: ${vectors.length} vectors`
        );
        if (vectors.length > 0) {
          const meta = vectors[0].meta;
          console.log(`      Clinic Name: ${meta.clinicName || "N/A"}`);
          console.log(`      Categories: ${[...new Set(vectors.map((v: any) => v.meta.category))].join(", ") || "N/A"}`);
        }
      });

      // Show structure of one sample
      if (results.matches.length > 0) {
        console.log("\n📄 Full Metadata Structure (Sample Vector):");
        const sample = results.matches[0];
        console.log(`\n   ID: ${sample.id}`);
        console.log(`   Score: ${sample.score}`);
        console.log(`\n   Metadata:`);
        if (sample.metadata) {
          Object.entries(sample.metadata).forEach(([key, value]: any) => {
            if (typeof value === "string" && value.length > 100) {
              console.log(`      ${key}: ${value.substring(0, 80)}...`);
            } else if (typeof value === "string") {
              console.log(`      ${key}: ${value}`);
            } else {
              console.log(`      ${key}: ${JSON.stringify(value)}`);
            }
          });
        }
      }

      // Summary statistics
      console.log("\n" + "=" + "=".repeat(69));
      console.log("📊 SUMMARY");
      console.log("=" + "=".repeat(69));

      console.log(`\n   Total vectors in query result: ${results.matches.length}`);
      console.log(`   Total vectors in index: ${totalVectors}`);
      console.log(
        `   Coverage: ${((results.matches.length / totalVectors) * 100).toFixed(1)}%\n`
      );

      console.log("   Data Distribution:");
      console.log(`      • By Source: ${Object.keys(bySource).length} sources`);
      Object.entries(bySource).forEach(([source, vectors]) => {
        console.log(`        - ${source}: ${vectors.length} vectors`);
      });

      console.log(`\n      • By Clinic: ${Object.keys(byClinic).length} clinics`);
      Object.entries(byClinic).forEach(([clinic, vectors]) => {
        const clinicName = vectors[0]?.meta?.clinicName || clinic;
        console.log(`        - ${clinicName} (${clinic}): ${vectors.length} vectors`);
      });
    } else {
      console.log("   ⚠️  No vectors found using zero vector query");
      console.log("   Vectors might be stored but not queryable with this method\n");

      // Try to get raw vector IDs if available
      console.log("🔍 Attempting to fetch raw vector list...");
      try {
        // Pinecone doesn't have a direct list() API in all versions
        // But we can try to query with a high topK
        console.log("   (Note: Full vector iteration may require Pinecone Pro or specific API)");
      } catch (e: any) {
        console.log(`   Error: ${e.message}`);
      }
    }
  } catch (error: any) {
    console.error("❌ Error:", error.message || error);
    throw error;
  }

  console.log("\n" + "=".repeat(70));
  console.log("✨ Done!");
  console.log("=".repeat(70) + "\n");
}

// Run
listAllVectors().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
