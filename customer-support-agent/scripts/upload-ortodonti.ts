/**
 * Script to upload sample-ortodonti-faq.md to Pinecone under "sample-ortodonti" namespace
 * Run: npx tsx scripts/upload-ortodonti.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";
import { upsertTextsToNamespace } from "../lib/pinecone";
import { randomUUID } from "crypto";

// Fix __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
const envPath = resolve(__dirname, "../.env.local");
console.log(`Loading .env from: ${envPath}`);
config({ path: envPath, override: true });

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
function parseFAQFile(filePath: string, clinicId: string, clinicName: string): FAQItem[] {
  console.log(`📖 Parsing FAQ file: ${filePath}...`);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
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

  console.log(`✅ Parsed ${faqItems.length} Q&A pairs`);
  return faqItems;
}

async function main() {
  const clinicId = "sample-ortodonti";
  const clinicName = "Klinik Ortodonti Demo";
  const namespace = "sample-ortodonti";
  const filePath = resolve(__dirname, "../data/clinics/sample-ortodonti-faq.md");

  console.log(`🏥 Uploading Ortodonti FAQ to namespace: ${namespace}`);
  console.log("━".repeat(80));

  // Parse FAQ
  const faqItems = parseFAQFile(filePath, clinicId, clinicName);

  if (faqItems.length === 0) {
    console.error("❌ No FAQ items parsed, aborting.");
    return;
  }

  // Prepare texts
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

  console.log(`📤 Uploading ${texts.length} vectors to namespace "${namespace}"...`);

  try {
    const result = await upsertTextsToNamespace(texts, namespace);
    console.log(`\n🎉 Upload Complete!`);
    console.log(`   Namespace: ${result.namespace}`);
    console.log(`   Vectors uploaded: ${result.count}`);
  } catch (error) {
    console.error("❌ Failed to upload to Pinecone:", error);
  }
}

main().catch(console.error);
