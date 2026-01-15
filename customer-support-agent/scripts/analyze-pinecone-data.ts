/**
 * Script to analyze all data currently stored in Pinecone
 * Shows detailed breakdown of vectors, metadata, sources, clinics, etc.
 * Run: npx tsx scripts/analyze-pinecone-data.ts
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

interface DataAnalysis {
  totalVectors: number;
  vectorsBySource: Record<string, number>;
  vectorsByClinic: Record<string, number>;
  vectorsByCategory: Record<string, number>;
  samples: Array<{
    id: string;
    metadata: Record<string, any>;
  }>;
  clinicBreakdown: Record<
    string,
    {
      count: number;
      categories: Record<string, number>;
      sample: any;
    }
  >;
}

async function analyzeData() {
  console.log("\n" + "=".repeat(70));
  console.log("📊 PINECONE DATA ANALYSIS");
  console.log("=".repeat(70));

  // Initialize Pinecone
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });

  const indexName = process.env.PINECONE_INDEX_NAME!;
  console.log(`📌 Pinecone index: "${indexName}\n`);

  const index = pinecone.Index(indexName);

  // Get index stats
  console.log("📈 Getting index statistics...");
  const stats = await index.describeIndexStats();
  console.log(`   Total vectors in index: ${stats.totalRecordCount || 0}`);
  console.log(`   Index dimension: ${stats.dimension}`);
  console.log(`   Index status: ${stats.indexFullness || "N/A"}\n`);

  const totalVectors = stats.totalRecordCount || 0;

  if (totalVectors === 0) {
    console.log("⚠️  Index is empty - no data to analyze");
    return;
  }

  // Initialize analysis object
  const analysis: DataAnalysis = {
    totalVectors,
    vectorsBySource: {},
    vectorsByClinic: {},
    vectorsByCategory: {},
    samples: [],
    clinicBreakdown: {},
  };

  console.log("🔍 Querying all vectors from Pinecone...");
  console.log("   (This may take a moment for large indexes)\n");

  // Query all vectors using a null/zero vector for broad search
  // Note: We'll do multiple queries with different metadata filters to understand the data
  try {
    // Strategy 1: Query with dummy vector to get samples
    const dummyVector = new Array(1536).fill(0);

    console.log("📋 Getting first 100 vectors as sample...");
    const sampleResults = await index.query({
      vector: dummyVector,
      topK: 100,
      includeMetadata: true,
    });

    console.log(`   Found ${sampleResults.matches.length} vectors\n`);

    // Analyze samples
    for (const match of sampleResults.matches) {
      const metadata = match.metadata || {};

      // Count by source
      const source = metadata.source || "unknown";
      analysis.vectorsBySource[source] =
        (analysis.vectorsBySource[source] || 0) + 1;

      // Count by clinic
      const clinicId = metadata.clinicId || "unknown";
      analysis.vectorsByClinic[clinicId] =
        (analysis.vectorsByClinic[clinicId] || 0) + 1;

      // Count by category
      const category = metadata.category || "unknown";
      analysis.vectorsByCategory[category] =
        (analysis.vectorsByCategory[category] || 0) + 1;

      // Store sample
      analysis.samples.push({
        id: match.id,
        metadata: metadata,
      });

      // Clinic breakdown
      if (!analysis.clinicBreakdown[clinicId]) {
        analysis.clinicBreakdown[clinicId] = {
          count: 1,
          categories: { [category]: 1 },
          sample: metadata,
        };
      } else {
        analysis.clinicBreakdown[clinicId].count++;
        analysis.clinicBreakdown[clinicId].categories[category] =
          (analysis.clinicBreakdown[clinicId].categories[category] || 0) + 1;
      }
    }

    // Print analysis
    console.log("=".repeat(70));
    console.log("📊 DATA BREAKDOWN");
    console.log("=".repeat(70));

    console.log("\n🏥 Vectors by Source:");
    Object.entries(analysis.vectorsBySource).forEach(([source, count]) => {
      const percentage = ((count / analysis.samples.length) * 100).toFixed(1);
      console.log(`   • ${source}: ${count} (${percentage}%)`);
    });

    console.log("\n🏨 Vectors by Clinic:");
    Object.entries(analysis.vectorsByClinic).forEach(([clinic, count]) => {
      const percentage = ((count / analysis.samples.length) * 100).toFixed(1);
      console.log(`   • ${clinic}: ${count} (${percentage}%)`);
    });

    console.log("\n📂 Vectors by Category:");
    Object.entries(analysis.vectorsByCategory)
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, count]) => {
        const percentage = ((count / analysis.samples.length) * 100).toFixed(1);
        console.log(`   • ${category}: ${count} (${percentage}%)`);
      });

    // Detailed clinic breakdown
    console.log("\n" + "=".repeat(70));
    console.log("🔬 DETAILED CLINIC BREAKDOWN");
    console.log("=".repeat(70));

    Object.entries(analysis.clinicBreakdown).forEach(([clinicId, data]) => {
      console.log(`\n📍 ${clinicId}`);
      console.log(`   Total vectors: ${data.count}`);
      console.log(`   Categories:`);
      Object.entries(data.categories)
        .sort((a, b) => b[1] - a[1])
        .forEach(([category, count]) => {
          console.log(`      • ${category}: ${count}`);
        });

      console.log(`\n   Sample metadata:`);
      console.log(`      - ID: ${data.sample.id}`);
      console.log(`      - Source: ${data.sample.source}`);
      console.log(`      - Category: ${data.sample.category}`);
      console.log(`      - Clinic Name: ${data.sample.clinicName || "N/A"}`);
      if (data.sample.question) {
        const questionPreview = data.sample.question.substring(0, 60);
        console.log(`      - Sample Q: ${questionPreview}...`);
      }
    });

    // Show sample vector details
    console.log("\n" + "=".repeat(70));
    console.log("📝 SAMPLE VECTOR DETAILS (First 5)");
    console.log("=".repeat(70));

    analysis.samples.slice(0, 5).forEach((sample, idx) => {
      console.log(`\n${idx + 1}. Vector ID: ${sample.id}`);
      console.log(`   Source: ${sample.metadata.source || "N/A"}`);
      console.log(`   Clinic: ${sample.metadata.clinicId || "N/A"}`);
      console.log(`   Category: ${sample.metadata.category || "N/A"}`);
      console.log(`   Clinic Name: ${sample.metadata.clinicName || "N/A"}`);

      if (sample.metadata.question) {
        console.log(`   Question: ${sample.metadata.question.substring(0, 80)}`);
      }

      if (sample.metadata.text) {
        const textPreview = sample.metadata.text.substring(0, 80);
        console.log(`   Text preview: ${textPreview}...`);
      }
    });

    // Summary
    console.log("\n" + "=".repeat(70));
    console.log("✅ SUMMARY");
    console.log("=".repeat(70));

    console.log(`\n📊 Estimated Data in Pinecone:`);
    console.log(`   Total vectors analyzed: ${analysis.samples.length}/100 sample`);
    console.log(`   Index total: ~${totalVectors} vectors`);

    console.log(`\n📚 Knowledge Base Status:`);
    const hasGlow = Object.keys(analysis.vectorsByClinic).some((c) =>
      c.includes("glow")
    );
    const hasPurity = Object.keys(analysis.vectorsByClinic).some((c) =>
      c.includes("purity")
    );
    const hasPramudia = Object.keys(analysis.vectorsByClinic).some((c) =>
      c.includes("pramudia")
    );
    const hasBeautyPlus = Object.keys(analysis.vectorsByClinic).some((c) =>
      c.includes("beauty")
    );

    console.log(`   ${hasGlow ? "✅" : "❌"} Glow Aesthetics`);
    console.log(`   ${hasPurity ? "⚠️" : "✅"} The Purity (should be removed)`);
    console.log(`   ${hasPramudia ? "⚠️" : "✅"} Pramudia (should be removed)`);
    console.log(`   ${hasBeautyPlus ? "⚠️" : "✅"} Beauty+ (should be removed)`);

    console.log(`\n🔧 Data Sources:`);
    Object.entries(analysis.vectorsBySource).forEach(([source, count]) => {
      console.log(`   • ${source}: ${count} vectors`);
    });

    if (Object.keys(analysis.vectorsByCategory).length > 0) {
      console.log(`\n📂 Content Categories:`);
      const topCategories = Object.entries(analysis.vectorsByCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      topCategories.forEach(([category, count]) => {
        console.log(`   • ${category}: ${count} vectors`);
      });

      if (
        Object.keys(analysis.vectorsByCategory).length >
        topCategories.length
      ) {
        const remaining =
          Object.keys(analysis.vectorsByCategory).length -
          topCategories.length;
        console.log(`   ... and ${remaining} more categories`);
      }
    }

    console.log("\n" + "=".repeat(70));
    console.log("✨ Analysis Complete!");
    console.log("=".repeat(70) + "\n");
  } catch (error: any) {
    console.error("❌ Error during analysis:", error.message || error);
    throw error;
  }
}

// Run
analyzeData().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
