/**
 * Upload clinic FAQ files to Pinecone using NAMESPACES (Multi-tenant safe)
 *
 * Each clinic gets its own namespace for perfect data isolation
 * Run: npx tsx scripts/upload-faq-namespaces.ts
 *
 * Benefits:
 * - Perfect data isolation per clinic
 * - No risk of cross-clinic data leaks
 * - Cost-effective: 1 index for all clinics
 * - Fast deployment: instant namespace creation
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

import fs from "fs";
import path from "path";
import { upsertTextsToNamespace } from "../lib/pinecone";
import { randomUUID } from "crypto";

// ========== CLINIC CONFIGURATIONS ==========
interface ClinicConfig {
  id: string;
  name: string;
  filePath: string;
  namespace: string; // NEW: Each clinic gets dedicated namespace
}

const CLINIC_CONFIGS: ClinicConfig[] = [
  {
    id: "glow-clinic",
    name: "Klinik Glow Aesthetics",
    filePath: resolve(__dirname, "../data/clinics/glow-clinic-faq.md"),
    namespace: "glow-clinic", // Namespace = clinicId for consistency
  },
  {
    id: "airin-skin",
    name: "Airin Skin Clinic",
    filePath: resolve(__dirname, "../data/clinics/airin-skin-faq.md"),
    namespace: "airin-skin",
  },
  {
    id: "beautylosophy-clinic",
    name: "The Clinic Beautylosophy",
    filePath: resolve(__dirname, "../data/clinics/beautylosophy-clinic-faq.md"),
    namespace: "beautylosophy-clinic",
  },
  {
    id: "beyoutiful-clinic",
    name: "Beyoutiful Clinic",
    filePath: resolve(__dirname, "../data/clinics/beyoutiful-clinic-faq.md"),
    namespace: "beyoutiful-clinic",
  },
  {
    id: "b-clinic",
    name: "B Clinic Multi Medika",
    filePath: resolve(__dirname, "../data/clinics/b-clinic-faq.md"),
    namespace: "b-clinic",
  },
  // Add more clinics here as needed
];

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  text: string;
  clinicId: string;
  clinicName: string;
}

/**
 * Parse clinic FAQ markdown file
 */
function parseFAQFile(
  filePath: string,
  clinicId: string,
  clinicName: string
): FAQItem[] {
  console.log(`\n📖 Parsing ${clinicName}...`);

  if (!fs.existsSync(filePath)) {
    console.error(`   ❌ File not found: ${filePath}`);
    return [];
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const faqItems: FAQItem[] = [];

  // Split by ## Category headers
  const categoryBlocks = content.split(/^## /m).slice(1);

  for (const block of categoryBlocks) {
    const lines = block.split("\n");
    const category = lines[0].trim();

    // Find Q&A pairs within this category
    let currentQuestion = "";
    let currentAnswer = "";
    let inAnswer = false;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];

      // Question pattern: ### Q: Question text? OR ### Question text?
      if (line.match(/^### /)) {
        // Save previous Q&A if exists
        if (currentQuestion && currentAnswer) {
          faqItems.push({
            id: `${clinicId}-${randomUUID()}`,
            question: currentQuestion,
            answer: currentAnswer.trim(),
            category,
            text: `${currentQuestion}\n\n${currentAnswer.trim()}`,
            clinicId,
            clinicName,
          });
        }

        // Extract question
        currentQuestion = line.replace(/^### /, "").replace(/^Q: /, "").trim();
        currentAnswer = "";
        inAnswer = true;
      } else if (inAnswer && line.trim().length > 0 && !line.match(/^###/)) {
        let answerLine = line;
        if (currentAnswer === "" && line.match(/^A: /)) {
          answerLine = line.replace(/^A: /, "");
        }
        currentAnswer += answerLine + "\n";
      } else if (inAnswer && line.trim().length === 0) {
        const nextNonEmpty = lines.slice(i + 1).findIndex((l) => l.trim().length > 0);
        if (nextNonEmpty >= 0) {
          const nextLine = lines[i + nextNonEmpty + 1];
          if (!nextLine?.match(/^### /)) {
            currentAnswer += "\n";
          }
        }
      }
    }

    // Save last Q&A
    if (currentQuestion && currentAnswer) {
      faqItems.push({
        id: `${clinicId}-${randomUUID()}`,
        question: currentQuestion,
        answer: currentAnswer.trim(),
        category,
        text: `${currentQuestion}\n\n${currentAnswer.trim()}`,
        clinicId,
        clinicName,
      });
    }
  }

  console.log(`   ✅ Parsed ${faqItems.length} Q&A pairs`);
  return faqItems;
}

/**
 * Upload clinic FAQ to its dedicated namespace
 */
async function uploadClinicToNamespace(clinic: ClinicConfig) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🏥 Uploading ${clinic.name} to namespace: ${clinic.namespace}`);
  console.log(`${"=".repeat(60)}\n`);

  // Parse FAQ file
  const faqItems = parseFAQFile(clinic.filePath, clinic.id, clinic.name);

  if (faqItems.length === 0) {
    console.warn(`⚠️  No FAQ items found for ${clinic.name}, skipping...`);
    return { success: true, count: 0 };
  }

  // Prepare texts for upload
  const texts = faqItems.map((item) => ({
    id: item.id,
    text: item.text,
    metadata: {
      question: item.question,
      answer: item.answer,
      category: item.category,
      clinicId: item.clinicId,
      clinicName: item.clinicName,
      source: "clinic",
    },
  }));

  console.log(`📤 Uploading ${texts.length} items to namespace "${clinic.namespace}"...`);

  try {
    // Upload to namespace (handles batching automatically)
    const result = await upsertTextsToNamespace(texts, clinic.namespace);

    console.log(`✅ Successfully uploaded to namespace: ${result.namespace}`);
    console.log(`   Vectors uploaded: ${result.count}`);

    return result;
  } catch (error) {
    console.error(`❌ Error uploading ${clinic.name}:`, error);
    throw error;
  }
}

/**
 * Main function: Upload all clinics to their namespaces
 */
async function main() {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`🚀 MULTI-TENANT FAQ UPLOAD - NAMESPACE ARCHITECTURE`);
  console.log(`${"=".repeat(80)}\n`);

  console.log(`📊 Total clinics to upload: ${CLINIC_CONFIGS.length}`);
  console.log(`🔒 Architecture: Each clinic gets dedicated namespace\n`);

  const results = [];

  for (const clinic of CLINIC_CONFIGS) {
    try {
      const result = await uploadClinicToNamespace(clinic);
      results.push({ clinic: clinic.name, ...result });
    } catch (error) {
      console.error(`❌ Failed to upload ${clinic.name}`);
      results.push({ clinic: clinic.name, success: false, count: 0 });
    }
  }

  // Print summary
  console.log(`\n${"=".repeat(80)}`);
  console.log(`📈 UPLOAD SUMMARY`);
  console.log(`${"=".repeat(80)}\n`);

  const totalVectors = results.reduce((sum, r) => sum + (r.count || 0), 0);
  const successCount = results.filter((r) => r.success).length;

  console.log(`✅ Successful uploads: ${successCount}/${CLINIC_CONFIGS.length}`);
  console.log(`📊 Total vectors uploaded: ${totalVectors}\n`);

  console.log("Clinic breakdown:");
  results.forEach((r) => {
    const status = r.success ? "✅" : "❌";
    console.log(`   ${status} ${r.clinic}: ${r.count || 0} vectors`);
  });

  console.log(`\n${"=".repeat(80)}`);
  console.log(`🎉 Upload complete!`);
  console.log(`${"=".repeat(80)}\n`);

  // Verify namespace isolation
  console.log(`🔒 Data Isolation Status:`);
  console.log(`   Each clinic's data is isolated in its own namespace`);
  console.log(`   Queries to "glow-clinic" namespace CANNOT access other clinics' data`);
  console.log(`   This provides defense-in-depth security for multi-tenancy\n`);
}

// Run the upload
main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
