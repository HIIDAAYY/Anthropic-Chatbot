/**
 * Check what was actually uploaded to Pinecone
 */
import { config } from "dotenv";
import { resolve } from "path";
import { getPineconeIndex } from "../lib/pinecone";

// Load environment variables
config({ path: resolve(__dirname, "../.env.local") });

async function checkUploadedData() {
  const index = getPineconeIndex();

  const testNamespaces = ["dermies-max", "jasper-skincare"];

  console.log("\n🔍 Checking Uploaded Data in Pinecone\n");

  for (const namespace of testNamespaces) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`📦 Namespace: ${namespace}`);
    console.log(`${"=".repeat(60)}\n`);

    try {
      const namespacedIndex = index.namespace(namespace);

      // Fetch a few vectors to see what's there
      const stats = await namespacedIndex.describeIndexStats();
      console.log(`Total vectors: ${stats.namespaces?.[namespace]?.recordCount || 0}`);

      // Query for location-related content
      const results = await namespacedIndex.query({
        vector: Array(1536).fill(0), // dummy vector
        topK: 10,
        includeMetadata: true,
      });

      console.log(`\nSample Q&A pairs in namespace:\n`);
      results.matches?.forEach((match: any, idx: number) => {
        console.log(`${idx + 1}. Question: ${match.metadata?.question || "N/A"}`);
        if (match.metadata?.question?.toLowerCase().includes("lokasi")) {
          console.log(`   ✅ LOCATION Q&A FOUND!`);
          console.log(`   Answer: ${match.metadata?.answer?.slice(0, 150)}...`);
        }
        console.log();
      });
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
    }
  }
}

checkUploadedData()
  .then(() => {
    console.log("\n✅ Check complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Check failed:", error);
    process.exit(1);
  });
