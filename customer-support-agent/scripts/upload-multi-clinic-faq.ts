/**
 * Script to parse multiple clinic FAQ files and upload to Pinecone with clinic-specific metadata
 * Run: npx tsx scripts/upload-multi-clinic-faq.ts
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
import { Pinecone } from "@pinecone-database/pinecone";
import { getOpenAIEmbeddings, getOpenAIDimensions } from "../lib/openai-embeddings";
import { randomUUID } from "crypto";

// ========== CLINIC CONFIGURATIONS ==========
const CLINIC_CONFIGS = [
  {
    id: "glow-clinic",
    name: "Klinik Glow Aesthetics",
    filePath: resolve(__dirname, "../data/clinics/glow-clinic-faq.md"),
  },
];

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  text: string; // Full text for embedding
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
  console.log(`\n📖 Parsing ${clinicName} (${path.basename(filePath)})...`);

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

        // Extract question (remove "### Q: " or "### ")
        currentQuestion = line.replace(/^### /, "").replace(/^Q: /, "").trim();
        currentAnswer = "";
        inAnswer = true;
      } else if (inAnswer && line.trim().length > 0 && !line.match(/^###/)) {
        // Remove "A: " prefix if exists (first line of answer)
        let answerLine = line;
        if (currentAnswer === "" && line.match(/^A: /)) {
          answerLine = line.replace(/^A: /, "");
        }
        // Accumulate answer lines
        currentAnswer += answerLine + "\n";
      } else if (inAnswer && line.trim().length === 0) {
        // Empty line - check if answer continues
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

  console.log(`   ✅ Parsed ${faqItems.length} Q&A pairs from ${clinicName}`);
  return faqItems;
}

/**
 * Upload multi-clinic FAQ items to Pinecone
 */
async function uploadMultiClinicFAQToPinecone(allFaqItems: FAQItem[]) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📊 TOTAL FAQ ITEMS TO UPLOAD: ${allFaqItems.length}`);
  console.log(`${"=".repeat(60)}\n`);

  // Group by clinic for stats
  const clinicStats = CLINIC_CONFIGS.map((clinic) => {
    const count = allFaqItems.filter((item) => item.clinicId === clinic.id).length;
    return { name: clinic.name, count };
  });

  console.log("📈 Breakdown by clinic:");
  clinicStats.forEach((stat) => {
    console.log(`   • ${stat.name}: ${stat.count} Q&A pairs`);
  });
  console.log("");

  // Initialize Pinecone
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });

  const indexName = process.env.PINECONE_INDEX_NAME!;
  console.log(`📌 Pinecone index: "${indexName}"`);
  const index = pinecone.Index(indexName);

  // Check index dimensions
  console.log("🔍 Checking Pinecone index...");
  const stats = await index.describeIndexStats();
  const expectedDimensions = getOpenAIDimensions();

  console.log(`   Index dimension: ${stats.dimension}`);
  console.log(`   OpenAI embedding dimension: ${expectedDimensions}`);

  if (stats.dimension !== expectedDimensions) {
    console.error(`❌ ERROR: Dimension mismatch!`);
    console.error(
      `   Index: ${stats.dimension} dims, OpenAI: ${expectedDimensions} dims`
    );
    console.error(`   Create new index with ${expectedDimensions} dimensions`);
    process.exit(1);
  }

  console.log("✅ Dimension match!\n");

  // Process in batches
  const batchSize = 30;
  const delayBetweenBatches = 2000; // 2 seconds
  const totalBatches = Math.ceil(allFaqItems.length / batchSize);

  console.log(`📤 Starting upload: ${totalBatches} batches\n`);

  for (let i = 0; i < allFaqItems.length; i += batchSize) {
    const batch = allFaqItems.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;

    console.log(`📤 Batch ${batchNum}/${totalBatches} (${batch.length} items)...`);

    // Show which clinics in this batch
    const batchClinics = [...new Set(batch.map((item) => item.clinicName))];
    console.log(`   Clinics: ${batchClinics.join(", ")}`);

    try {
      // Generate embeddings
      const texts = batch.map((item) => item.text);
      console.log(`   🔄 Generating embeddings...`);
      const embeddings = await getOpenAIEmbeddings(texts);

      // Prepare vectors with clinic-specific metadata
      const vectors = batch.map((item, idx) => ({
        id: item.id, // Already prefixed with clinicId
        values: embeddings[idx],
        metadata: {
          text: item.text,
          question: item.question,
          answer: item.answer,
          category: item.category,
          source: "clinic", // Backward compatible
          clinicId: item.clinicId, // NEW: Clinic identifier
          clinicName: item.clinicName, // NEW: Full clinic name
        },
      }));

      // Upsert to Pinecone
      console.log(`   ⬆️  Upserting to Pinecone...`);
      await index.upsert(vectors);

      console.log(`   ✅ Batch ${batchNum} uploaded successfully\n`);

      // Delay between batches
      if (i + batchSize < allFaqItems.length) {
        console.log(`   ⏳ Waiting ${delayBetweenBatches / 1000}s before next batch...\n`);
        await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
      }
    } catch (error: any) {
      console.error(`   ❌ Error uploading batch ${batchNum}:`, error.message);
      throw error;
    }
  }

  // Verify upload
  console.log(`${"=".repeat(60)}`);
  console.log("✅ ALL BATCHES UPLOADED SUCCESSFULLY!");
  console.log(`${"=".repeat(60)}\n`);

  console.log("🔍 Verifying upload...");
  const finalStats = await index.describeIndexStats();
  console.log(`   Total vectors in index: ${finalStats.totalRecordCount || 0}`);

  console.log("\n🎉 Multi-clinic FAQ upload complete!\n");
  console.log("Summary:");
  clinicStats.forEach((stat) => {
    console.log(`   ✅ ${stat.name}: ${stat.count} Q&A pairs uploaded`);
  });
  console.log("");
}

/**
 * Main execution
 */
async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("🏥 MULTI-CLINIC FAQ UPLOADER");
  console.log("=".repeat(60));

  let allFaqItems: FAQItem[] = [];

  // Parse all clinic FAQ files
  for (const clinic of CLINIC_CONFIGS) {
    const items = parseFAQFile(clinic.filePath, clinic.id, clinic.name);
    allFaqItems = allFaqItems.concat(items);
  }

  if (allFaqItems.length === 0) {
    console.error("\n❌ No FAQ items parsed! Check file paths and formats.");
    process.exit(1);
  }

  // Upload to Pinecone
  await uploadMultiClinicFAQToPinecone(allFaqItems);

  console.log("✨ Done! Your multi-clinic knowledge base is ready!\n");
}

// Run
main().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
