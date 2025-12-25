/**
 * Script to verify Pinecone data and check source metadata
 * This will help identify if data is properly tagged with "clinic" and "urbanstyle"
 * Run: npx tsx scripts/check-pinecone-data.ts
 */

// Load environment variables
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local") });

import { Pinecone } from "@pinecone-database/pinecone";
import { getOpenAIEmbedding } from "../lib/openai-embeddings";

async function checkPineconeData() {
  console.log("🔍 Checking Pinecone Data for Knowledge Base Separation\n");
  console.log("━".repeat(80));

  try {
    // Initialize Pinecone
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });

    const indexName = process.env.PINECONE_INDEX_NAME!;
    const index = pinecone.Index(indexName);

    // Get index stats
    const stats = await index.describeIndexStats();
    console.log(`\n📊 Index: ${indexName}`);
    console.log(`📈 Total vectors: ${stats.totalRecordCount || 0}`);
    console.log(`📐 Dimensions: ${stats.dimension}\n`);
    console.log("━".repeat(80));

    // Test 1: Query with clinic-related keywords
    console.log("\n🏥 TEST 1: Querying with CLINIC keywords (facial treatment)");
    console.log("━".repeat(80));

    const clinicEmbedding = await getOpenAIEmbedding("facial treatment perawatan wajah");

    // Query WITHOUT filter (to see what we get from all sources)
    console.log("\n📍 Query WITHOUT filter:");
    const clinicResultsNoFilter = await index.query({
      vector: clinicEmbedding,
      topK: 5,
      includeMetadata: true,
    });

    if (clinicResultsNoFilter.matches && clinicResultsNoFilter.matches.length > 0) {
      console.log(`Found ${clinicResultsNoFilter.matches.length} results:\n`);
      clinicResultsNoFilter.matches.forEach((match, idx) => {
        const source = match.metadata?.source || "NO SOURCE METADATA";
        const text = (match.metadata?.text as string) || "No text";
        const preview = text.length > 80 ? text.substring(0, 80) + "..." : text;
        console.log(`${idx + 1}. Source: [${source}] Score: ${match.score?.toFixed(4)}`);
        console.log(`   Preview: ${preview}\n`);
      });
    } else {
      console.log("❌ No results found!\n");
    }

    // Query WITH clinic filter
    console.log("📍 Query WITH filter (source = 'clinic'):");
    const clinicResultsWithFilter = await index.query({
      vector: clinicEmbedding,
      topK: 5,
      includeMetadata: true,
      filter: { source: { $eq: "clinic" } },
    });

    if (clinicResultsWithFilter.matches && clinicResultsWithFilter.matches.length > 0) {
      console.log(`✅ Found ${clinicResultsWithFilter.matches.length} CLINIC results:\n`);
      clinicResultsWithFilter.matches.forEach((match, idx) => {
        const source = match.metadata?.source || "NO SOURCE";
        const text = (match.metadata?.text as string) || "No text";
        const preview = text.length > 80 ? text.substring(0, 80) + "..." : text;
        console.log(`${idx + 1}. Source: [${source}] Score: ${match.score?.toFixed(4)}`);
        console.log(`   Preview: ${preview}\n`);
      });
    } else {
      console.log("❌ No CLINIC results found! This is a PROBLEM.\n");
    }

    console.log("━".repeat(80));

    // Test 2: Query with urbanstyle-related keywords
    console.log("\n👔 TEST 2: Querying with URBANSTYLE keywords (fashion clothes)");
    console.log("━".repeat(80));

    const urbanstyleEmbedding = await getOpenAIEmbedding("fashion clothes baju kemeja");

    // Query WITHOUT filter
    console.log("\n📍 Query WITHOUT filter:");
    const urbanstyleResultsNoFilter = await index.query({
      vector: urbanstyleEmbedding,
      topK: 5,
      includeMetadata: true,
    });

    if (urbanstyleResultsNoFilter.matches && urbanstyleResultsNoFilter.matches.length > 0) {
      console.log(`Found ${urbanstyleResultsNoFilter.matches.length} results:\n`);
      urbanstyleResultsNoFilter.matches.forEach((match, idx) => {
        const source = match.metadata?.source || "NO SOURCE METADATA";
        const text = (match.metadata?.text as string) || "No text";
        const preview = text.length > 80 ? text.substring(0, 80) + "..." : text;
        console.log(`${idx + 1}. Source: [${source}] Score: ${match.score?.toFixed(4)}`);
        console.log(`   Preview: ${preview}\n`);
      });
    } else {
      console.log("❌ No results found!\n");
    }

    // Try different possible source values for UrbanStyle
    const possibleUrbanstyleSources = ["urbanstyle", "UrbanStyle", "default", ""];
    let urbanstyleFound = false;

    for (const sourceValue of possibleUrbanstyleSources) {
      console.log(`📍 Testing filter (source = '${sourceValue || "empty"}'):`);

      const filter = sourceValue
        ? { source: { $eq: sourceValue } }
        : { source: { $exists: false } };

      const urbanstyleResultsWithFilter = await index.query({
        vector: urbanstyleEmbedding,
        topK: 5,
        includeMetadata: true,
        filter,
      });

      if (urbanstyleResultsWithFilter.matches && urbanstyleResultsWithFilter.matches.length > 0) {
        console.log(`✅ Found ${urbanstyleResultsWithFilter.matches.length} results with source='${sourceValue}':\n`);
        urbanstyleResultsWithFilter.matches.forEach((match, idx) => {
          const source = match.metadata?.source || "NO SOURCE";
          const text = (match.metadata?.text as string) || "No text";
          const preview = text.length > 80 ? text.substring(0, 80) + "..." : text;
          console.log(`${idx + 1}. Source: [${source}] Score: ${match.score?.toFixed(4)}`);
          console.log(`   Preview: ${preview}\n`);
        });
        urbanstyleFound = true;
        break;
      } else {
        console.log(`   No results found.\n`);
      }
    }

    if (!urbanstyleFound) {
      console.log("⚠️  No UrbanStyle data found with any common source values!\n");
    }

    console.log("━".repeat(80));

    // Test 3: Analyze source metadata distribution
    console.log("\n📊 TEST 3: Analyzing Source Metadata Distribution");
    console.log("━".repeat(80));
    console.log("\nNote: Using dummy vector to sample data distribution...\n");

    const dummyVector = new Array(stats.dimension).fill(0);
    const sampleResults = await index.query({
      vector: dummyVector,
      topK: 50, // Sample more for better distribution analysis
      includeMetadata: true,
    });

    const sourceDistribution: Record<string, number> = {};

    if (sampleResults.matches) {
      sampleResults.matches.forEach((match) => {
        const source = match.metadata?.source as string || "NO_SOURCE_METADATA";
        sourceDistribution[source] = (sourceDistribution[source] || 0) + 1;
      });

      console.log("Source Distribution (from sample of 50 documents):");
      Object.entries(sourceDistribution)
        .sort((a, b) => b[1] - a[1])
        .forEach(([source, count]) => {
          const percentage = ((count / sampleResults.matches.length) * 100).toFixed(1);
          console.log(`  ${source}: ${count} documents (${percentage}%)`);
        });
    }

    console.log("\n━".repeat(80));

    // Summary and Recommendations
    console.log("\n📝 SUMMARY & RECOMMENDATIONS");
    console.log("━".repeat(80));

    const hasClinicData = clinicResultsWithFilter.matches && clinicResultsWithFilter.matches.length > 0;
    const hasUrbanstyleData = urbanstyleFound;

    console.log("\n✓ Clinic Data:", hasClinicData ? "FOUND ✅" : "NOT FOUND ❌");
    console.log("✓ UrbanStyle Data:", hasUrbanstyleData ? "FOUND ✅" : "NOT FOUND ❌");

    if (!hasClinicData && !hasUrbanstyleData) {
      console.log("\n⚠️  CRITICAL ISSUE:");
      console.log("   No data found for either knowledge base!");
      console.log("   ACTION REQUIRED: Upload data with proper 'source' metadata");
    } else if (!hasClinicData) {
      console.log("\n⚠️  ISSUE:");
      console.log("   Clinic data is missing or not properly tagged with source='clinic'");
      console.log("   ACTION REQUIRED: Upload clinic data or fix metadata");
    } else if (!hasUrbanstyleData) {
      console.log("\n⚠️  ISSUE:");
      console.log("   UrbanStyle data is missing or has inconsistent source metadata");
      console.log("   ACTION REQUIRED: Check source metadata for UrbanStyle data");
    } else {
      console.log("\n✅ GOOD:");
      console.log("   Both knowledge bases have data");
      console.log("   NEXT STEP: Proceed with implementing native filtering fixes");
    }

    console.log("\n💡 Metadata Structure Expected:");
    console.log("   For Clinic: { source: 'clinic', text: '...', ... }");
    console.log("   For UrbanStyle: { source: 'urbanstyle', text: '...', ... }");
    console.log("                OR { text: '...', ... } (no source = default UrbanStyle)");

    console.log("\n━".repeat(80));

  } catch (error: any) {
    console.error("❌ Error:", error.message);
    if (error.stack) {
      console.error("\nStack trace:", error.stack);
    }
    process.exit(1);
  }
}

checkPineconeData();
