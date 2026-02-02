/**
 * Clear all clinic namespaces and re-upload fresh data
 */
import { config } from "dotenv";
import { resolve } from "path";
import { getPineconeIndex } from "../lib/pinecone";
import { execSync } from "child_process";

// Load environment variables
config({ path: resolve(__dirname, "../.env.local") });

const CLINIC_IDS = [
  "glow-clinic",
  "airin-skin",
  "beautylosophy-clinic",
  "beyoutiful-clinic",
  "b-clinic",
  "click-house",
  "derma-express",
  "dermies-max",
  "euroskinlab",
  "gloskin-aesthetic",
  "jakarta-aesthetic",
  "jasper-skincare",
  "kusuma-beauty",
  "maharis-clinic",
  "nmw-skincare",
  "ovela-clinic",
  "promec-clinic",
  "queen-plastic",
  "sozo-skin",
  "youth-beauty",
  "zap-premiere",
];

async function clearNamespaces() {
  console.log("\n🗑️  Clearing All Clinic Namespaces\n");

  const index = getPineconeIndex();

  for (const clinicId of CLINIC_IDS) {
    try {
      const namespacedIndex = index.namespace(clinicId);

      console.log(`🗑️  Deleting namespace: ${clinicId}...`);

      // Delete all vectors in this namespace
      await namespacedIndex.deleteAll();

      console.log(`   ✅ Deleted namespace: ${clinicId}`);
    } catch (error: any) {
      console.error(`   ❌ Error deleting ${clinicId}:`, error.message);
    }
  }

  console.log("\n✅ All namespaces cleared!");
}

async function reupload() {
  console.log("\n📤 Re-uploading Fresh Data...\n");

  try {
    execSync("npx tsx scripts/upload-multi-clinic-faq.ts", {
      cwd: resolve(__dirname, ".."),
      stdio: "inherit",
    });

    console.log("\n✅ Re-upload complete!");
  } catch (error) {
    console.error("\n❌ Re-upload failed:", error);
    throw error;
  }
}

async function main() {
  await clearNamespaces();
  await reupload();
}

main()
  .then(() => {
    console.log("\n🎉 Clean and re-upload successful!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Process failed:", error);
    process.exit(1);
  });
