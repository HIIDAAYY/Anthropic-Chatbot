/**
 * DEMO - Upload 5 clinic FAQs, each to its own isolated Pinecone namespace.
 *
 * Standalone uploader (modeled on upload-vorta-faq.ts) so the main knowledge
 * base (other clinics in upload-faq-namespaces.ts) is NEVER touched or duplicated.
 *
 * Clinics:
 *   - ira-skincare     dr. Ira Skin Care & Slimming
 *   - beauty-palace    Beauty Palace Aesthetic & Hair Transplant Center
 *   - drkhe-co         dr. Khé & Co
 *   - estetika-dental  Estetika Dental Clinic
 *   - eva-mulia        Eva Mulia Clinic
 *
 * Run: npx tsx scripts/upload-5-clinics.ts
 *
 * Each clinic is reachable at: http://localhost:3000?clinicId=<namespace>
 *
 * To remove the demo later:
 *  - delete this file + the 5 data/clinics/*-faq.md files below
 *  - delete the 5 namespaces in Pinecone
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

// ========== CLINIC CONFIGS ==========
interface ClinicConfig {
  id: string;
  name: string;
  filePath: string;
  namespace: string;
}

const CLINICS: ClinicConfig[] = [
  {
    id: "ira-skincare",
    name: "dr. Ira Skin Care & Slimming",
    filePath: resolve(__dirname, "../data/clinics/ira-skincare-faq.md"),
    namespace: "ira-skincare",
  },
  {
    id: "beauty-palace",
    name: "Beauty Palace Aesthetic & Hair Transplant Center",
    filePath: resolve(__dirname, "../data/clinics/beauty-palace-faq.md"),
    namespace: "beauty-palace",
  },
  {
    id: "drkhe-co",
    name: "dr. Khé & Co",
    filePath: resolve(__dirname, "../data/clinics/drkhe-co-faq.md"),
    namespace: "drkhe-co",
  },
  {
    id: "estetika-dental",
    name: "Estetika Dental Clinic",
    filePath: resolve(__dirname, "../data/clinics/estetika-dental-faq.md"),
    namespace: "estetika-dental",
  },
  {
    id: "eva-mulia",
    name: "Eva Mulia Clinic",
    filePath: resolve(__dirname, "../data/clinics/eva-mulia-faq.md"),
    namespace: "eva-mulia",
  },
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

async function uploadClinic(clinic: ClinicConfig) {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`🏥 ${clinic.name}  (namespace: ${clinic.namespace})`);
  console.log(`${"=".repeat(70)}`);

  const faqItems = parseFAQFile(clinic.filePath, clinic.id, clinic.name);

  if (faqItems.length === 0) {
    console.warn(`⚠️  No FAQ items parsed for ${clinic.name}, skipping.`);
    return { clinic: clinic.name, count: 0, success: false };
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
    await getPineconeIndex().namespace(clinic.namespace).deleteAll();
    console.log(`🧹 Cleared existing vectors in namespace "${clinic.namespace}"`);
  } catch (e: any) {
    // deleteAll throws 404 if the namespace doesn't exist yet — safe to ignore
    console.log(`(namespace "${clinic.namespace}" was empty or new — nothing to clear)`);
  }

  console.log(`📤 Uploading ${texts.length} items to "${clinic.namespace}"...`);
  const result = await upsertTextsToNamespace(texts, clinic.namespace);
  console.log(`✅ Uploaded ${result.count} vectors to namespace: ${result.namespace}`);

  return { clinic: clinic.name, count: result.count, success: true };
}

async function main() {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`🚀 DEMO UPLOAD - 5 Clinics (isolated namespaces)`);
  console.log(`${"=".repeat(80)}`);

  const results = [];
  for (const clinic of CLINICS) {
    try {
      results.push(await uploadClinic(clinic));
    } catch (error) {
      console.error(`❌ Failed to upload ${clinic.name}:`, error);
      results.push({ clinic: clinic.name, count: 0, success: false });
    }
  }

  console.log(`\n${"=".repeat(80)}`);
  console.log(`📈 SUMMARY`);
  console.log(`${"=".repeat(80)}`);
  const total = results.reduce((sum, r) => sum + (r.count || 0), 0);
  results.forEach((r) => {
    console.log(`   ${r.success ? "✅" : "❌"} ${r.clinic}: ${r.count} vectors`);
  });
  console.log(`\n📊 Total vectors uploaded: ${total}`);
  console.log(`🔒 Each clinic is isolated in its own namespace — main KB untouched.`);
  console.log(`\n🌐 Access the demos at:`);
  CLINICS.forEach((c) =>
    console.log(`   http://localhost:3000?clinicId=${c.namespace}  (${c.name})`)
  );
  console.log("");
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
