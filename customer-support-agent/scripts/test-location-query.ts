/**
 * Test location query for clinic namespaces
 */
import { config } from "dotenv";
import { resolve } from "path";
import { queryPineconeWithTextInNamespace } from "../lib/pinecone";

// Load environment variables
config({ path: resolve(__dirname, "../.env.local") });

async function testLocationQuery() {
  const testCases = [
    { clinicId: "dermies-max", clinicName: "Dermies Max" },
    { clinicId: "jasper-skincare", clinicName: "Jasper Skincare" },
    { clinicId: "click-house", clinicName: "Click House" },
  ];

  const queries = [
    "cabangnya ada di mana?",
    "lokasi klinik",
    "Di mana lokasi",
    "dimana alamat klinik",
  ];

  console.log("\n🔍 Testing Location Queries for Clinics\n");

  for (const testCase of testCases) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`🏥 Testing: ${testCase.clinicName} (${testCase.clinicId})`);
    console.log(`${"=".repeat(60)}\n`);

    for (const query of queries) {
      console.log(`📝 Query: "${query}"`);

      try {
        const results = await queryPineconeWithTextInNamespace(
          query,
          testCase.clinicId,
          3
        );

        if (results.matches && results.matches.length > 0) {
          console.log(`✅ Found ${results.matches.length} results:\n`);
          results.matches.forEach((match: any, idx: number) => {
            console.log(`   ${idx + 1}. Score: ${match.score?.toFixed(3)}`);
            console.log(`      Question: ${match.metadata?.question || "N/A"}`);
            console.log(
              `      Answer: ${match.metadata?.answer?.slice(0, 100) || "N/A"}...`
            );
            console.log();
          });
        } else {
          console.log("❌ No results found\n");
        }
      } catch (error: any) {
        console.error(`❌ Error: ${error.message}\n`);
      }
    }
  }
}

testLocationQuery()
  .then(() => {
    console.log("\n✅ Test complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  });
