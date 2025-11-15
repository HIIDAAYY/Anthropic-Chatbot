/**
 * Script to parse urbanstyle_faq.md and upload to Pinecone with OpenAI embeddings
 * Run: npx tsx scripts/upload-faq.ts
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
import { v4 as uuidv4 } from "crypto";
import { randomUUID } from "crypto";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  text: string; // Full text for embedding
}

/**
 * Parse FAQ markdown file
 */
function parseFAQFile(filePath: string): FAQItem[] {
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

      // Question pattern: ### Question text?
      if (line.match(/^### /)) {
        // Save previous Q&A if exists
        if (currentQuestion && currentAnswer) {
          faqItems.push({
            id: randomUUID(),
            question: currentQuestion,
            answer: currentAnswer.trim(),
            category,
            text: `${currentQuestion}\n\n${currentAnswer.trim()}`,
          });
        }

        currentQuestion = line.replace(/^### /, "").trim();
        currentAnswer = "";
        inAnswer = true;
      } else if (inAnswer && line.trim().length > 0 && !line.match(/^###/)) {
        // Accumulate answer lines
        currentAnswer += line + "\n";
      } else if (inAnswer && line.trim().length === 0) {
        // Empty line marks end of answer (unless followed by more answer text)
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
        id: randomUUID(),
        question: currentQuestion,
        answer: currentAnswer.trim(),
        category,
        text: `${currentQuestion}\n\n${currentAnswer.trim()}`,
      });
    }
  }

  return faqItems;
}

/**
 * Upload FAQ items to Pinecone
 */
async function uploadFAQToPinecone(faqItems: FAQItem[]) {
  console.log(`📊 Parsed ${faqItems.length} FAQ items from markdown\n`);
  console.log("Sample items:");
  faqItems.slice(0, 3).forEach((item) => {
    console.log(`  • [${item.category}] ${item.question.substring(0, 50)}...`);
  });
  console.log("");

  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });

  const indexName = process.env.PINECONE_INDEX_NAME!;
  console.log(`📌 Index name from env: "${indexName}"`);
  const index = pinecone.Index(indexName);

  // Check index dimensions
  console.log("🔍 Checking Pinecone index...");
  const stats = await index.describeIndexStats();
  const expectedDimensions = getOpenAIDimensions();

  console.log(`   Index dimension: ${stats.dimension}`);
  console.log(`   OpenAI text-embedding-3-small dimension: ${expectedDimensions}`);

  if (stats.dimension !== expectedDimensions) {
    console.error(
      `❌ ERROR: Index dimension mismatch!`
    );
    console.error(
      `   Your index has ${stats.dimension} dimensions, but OpenAI text-embedding-3-small uses ${expectedDimensions}`
    );
    console.error(`   Please create a new Pinecone index with ${expectedDimensions} dimensions`);
    process.exit(1);
  }

  console.log("✅ Dimension match!\n");

  // Process in batches to avoid rate limits
  const batchSize = 30;
  const delayBetweenBatches = 2000; // 2 seconds between batches

  for (let i = 0; i < faqItems.length; i += batchSize) {
    const batch = faqItems.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(faqItems.length / batchSize);

    console.log(
      `📤 Uploading batch ${batchNum}/${totalBatches} (${batch.length} items)...`
    );

    try {
      // Generate embeddings for this batch
      const texts = batch.map((item) => item.text);
      console.log(`   🔄 Generating embeddings...`);
      const embeddings = await getOpenAIEmbeddings(texts);

      // Prepare vectors for Pinecone
      const vectors = batch.map((item, idx) => ({
        id: item.id,
        values: embeddings[idx],
        metadata: {
          text: item.text,
          question: item.question,
          answer: item.answer,
          category: item.category,
        },
      }));

      // Upsert to Pinecone
      console.log(`   ⬆️  Upserting to Pinecone...`);
      await index.upsert(vectors);

      console.log(`   ✅ Batch ${batchNum} uploaded successfully\n`);

      // Delay between batches to be nice to the API
      if (i + batchSize < faqItems.length) {
        console.log(`   ⏳ Waiting ${delayBetweenBatches / 1000}s before next batch...`);
        await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
      }
    } catch (error: any) {
      console.error(`   ❌ Error uploading batch ${batchNum}:`, error.message);
      throw error;
    }
  }

  // Verify upload
  console.log("✅ All batches uploaded!\n");
  console.log("🔍 Verifying upload...");
  const finalStats = await index.describeIndexStats();
  console.log(`   Total vectors in index: ${finalStats.totalRecordCount || 0}`);
  console.log(`   Expected: ${faqItems.length}`);

  if (finalStats.totalRecordCount === faqItems.length) {
    console.log("\n✅ Upload successful! All FAQ items are in Pinecone.\n");
  } else {
    console.warn(
      `\n⚠️  Warning: Vector count mismatch. Expected ${faqItems.length}, got ${finalStats.totalRecordCount}`
    );
  }
}

/**
 * Main execution
 */
async function main() {
  console.log("📖 FAQ Upload Script - Using OpenAI Embeddings\n");
  console.log("━".repeat(80));

  try {
    // Parse FAQ file
    const faqFilePath = resolve(__dirname, "../urbanstyle_faq.md");

    if (!fs.existsSync(faqFilePath)) {
      console.error(`❌ FAQ file not found: ${faqFilePath}`);
      process.exit(1);
    }

    console.log(`📄 Reading FAQ file: ${faqFilePath}\n`);
    const faqItems = parseFAQFile(faqFilePath);

    // Upload to Pinecone
    await uploadFAQToPinecone(faqItems);

    console.log("━".repeat(80));
    console.log("\n🎉 FAQ upload completed successfully!");
    console.log("\n💡 Next steps:");
    console.log("   - Restart your dev server: npm run dev");
    console.log("   - Test the chatbot with questions about UrbanStyle ID");
    console.log("   - Check the Knowledge Base History panel for retrieved sources");

  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
