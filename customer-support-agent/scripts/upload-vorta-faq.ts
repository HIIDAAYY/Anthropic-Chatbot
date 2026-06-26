/**
 * DEMO - Upload ONLY Vorta Beauty Clinic FAQ to its own Pinecone namespace.
 *
 * This is a TEMPORARY/standalone uploader so the main knowledge base (other
 * clinics in upload-faq-namespaces.ts) is NEVER touched or duplicated.
 *
 * Run: npx tsx scripts/upload-vorta-faq.ts
 *
 * To remove the demo later:
 *  - delete this file + data/clinics/vorta-clinic-faq.md
 *  - delete the "vorta-clinic" namespace in Pinecone
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Fix __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
const envPath = resolve(__dirname, "../.env.local");
console.log(`Loading .env from: ${envPath}`);
config({ path: envPath, override: true });

import fs from "fs";
import { upsertTextsToNamespace, getPineconeIndex } from "../lib/pinecone";
import { randomUUID } from "crypto";

// ========== VORTA CONFIG (single clinic only) ==========
const VORTA = {
  id: "vorta-clinic",
  name: "Vorta Beauty Clinic",
  filePath: resolve(__dirname, "../data/clinics/vorta-clinic-faq.md"),
  namespace: "vorta-clinic",
};

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
 * Parse clinic FAQ markdown file.
 * Same parsing logic as scripts/upload-faq-namespaces.ts:
 *   "## Category"  -> category
 *   "### Q: ..."   -> question  (also accepts "### ...")
 *   "A: ..."       -> answer (multi-line until next ###)
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

    let currentQuestion = "";
    let currentAnswer = "";
    let inAnswer = false;

    const pushItem = () => {
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
    };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];

      if (line.match(/^### /)) {
        pushItem();
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
        const nextNonEmpty = lines
          .slice(i + 1)
          .findIndex((l) => l.trim().length > 0);
        if (nextNonEmpty >= 0) {
          const nextLine = lines[i + nextNonEmpty + 1];
          if (!nextLine?.match(/^### /)) {
            currentAnswer += "\n";
          }
        }
      }
    }

    pushItem();
  }

  console.log(`   ✅ Parsed ${faqItems.length} Q&A pairs`);
  return faqItems;
}

async function main() {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`🚀 DEMO UPLOAD - Vorta Beauty Clinic (namespace: ${VORTA.namespace})`);
  console.log(`${"=".repeat(70)}\n`);

  const faqItems = parseFAQFile(VORTA.filePath, VORTA.id, VORTA.name);

  if (faqItems.length === 0) {
    console.error("⚠️  No FAQ items parsed. Aborting (check the markdown format).");
    process.exit(1);
  }

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

  // Idempotent re-upload: clear the namespace first so re-runs don't duplicate
  // vectors (IDs use randomUUID, so upsert alone would accumulate copies).
  try {
    await getPineconeIndex().namespace(VORTA.namespace).deleteAll();
    console.log(`🧹 Cleared existing vectors in namespace "${VORTA.namespace}"`);
  } catch (e: any) {
    // deleteAll throws 404 if the namespace doesn't exist yet — safe to ignore
    console.log(`(namespace "${VORTA.namespace}" was empty or new — nothing to clear)`);
  }

  console.log(`\n📤 Uploading ${texts.length} items to namespace "${VORTA.namespace}"...`);

  const result = await upsertTextsToNamespace(texts, VORTA.namespace);

  console.log(`\n✅ Successfully uploaded to namespace: ${result.namespace}`);
  console.log(`   Vectors uploaded: ${result.count}`);
  console.log(`\n🔒 Vorta data is isolated in its own namespace — main KB untouched.`);
  console.log(`🌐 Access the demo at: http://localhost:3000?clinicId=vorta-clinic\n`);
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
