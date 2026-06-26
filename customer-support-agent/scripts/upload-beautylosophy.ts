/**
 * Upload The Clinic Beautylosophy FAQ to its Pinecone namespace.
 * Idempotent (clears namespace then re-uploads). Touches ONLY beautylosophy-clinic.
 * Run: npx tsx scripts/upload-beautylosophy.ts
 */
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, "../.env.local"), override: true });

import fs from "fs";
import { upsertTextsToNamespace, getPineconeIndex } from "../lib/pinecone";
import { randomUUID } from "crypto";

const CLINIC = {
  id: "beautylosophy-clinic",
  name: "The Clinic Beautylosophy",
  filePath: resolve(__dirname, "../data/clinics/beautylosophy-clinic-faq.md"),
  namespace: "beautylosophy-clinic",
};

interface FAQItem {
  id: string; question: string; answer: string; category: string;
  text: string; clinicId: string; clinicName: string;
}

function parseFAQFile(filePath: string, clinicId: string, clinicName: string): FAQItem[] {
  console.log(`\n📖 Parsing ${clinicName}...`);
  if (!fs.existsSync(filePath)) { console.error(`   ❌ File not found: ${filePath}`); return []; }
  const content = fs.readFileSync(filePath, "utf-8");
  const faqItems: FAQItem[] = [];
  const categoryBlocks = content.split(/^## /m).slice(1);
  for (const block of categoryBlocks) {
    const lines = block.split("\n");
    const category = lines[0].trim();
    let currentQuestion = "", currentAnswer = "", inAnswer = false;
    const pushItem = () => {
      if (currentQuestion && currentAnswer) {
        faqItems.push({
          id: `${clinicId}-${randomUUID()}`,
          question: currentQuestion, answer: currentAnswer.trim(), category,
          text: `${currentQuestion}\n\n${currentAnswer.trim()}`, clinicId, clinicName,
        });
      }
    };
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.match(/^### /)) {
        pushItem();
        currentQuestion = line.replace(/^### /, "").replace(/^Q: /, "").trim();
        currentAnswer = ""; inAnswer = true;
      } else if (inAnswer && line.trim().length > 0 && !line.match(/^###/)) {
        let answerLine = line;
        if (currentAnswer === "" && line.match(/^A: /)) answerLine = line.replace(/^A: /, "");
        currentAnswer += answerLine + "\n";
      } else if (inAnswer && line.trim().length === 0) {
        const nextNonEmpty = lines.slice(i + 1).findIndex((l) => l.trim().length > 0);
        if (nextNonEmpty >= 0) {
          const nextLine = lines[i + nextNonEmpty + 1];
          if (!nextLine?.match(/^### /)) currentAnswer += "\n";
        }
      }
    }
    pushItem();
  }
  console.log(`   ✅ Parsed ${faqItems.length} Q&A pairs`);
  return faqItems;
}

async function main() {
  console.log(`\n🚀 Upload ${CLINIC.name} (namespace: ${CLINIC.namespace})`);
  const faqItems = parseFAQFile(CLINIC.filePath, CLINIC.id, CLINIC.name);
  if (faqItems.length === 0) { console.error("⚠️  No FAQ items parsed. Aborting."); process.exit(1); }
  const texts = faqItems.map((item) => ({
    id: item.id, text: item.text,
    metadata: {
      question: item.question, answer: item.answer, category: item.category,
      clinicId: item.clinicId, clinicName: item.clinicName, source: "clinic",
    },
  }));
  try {
    await getPineconeIndex().namespace(CLINIC.namespace).deleteAll();
    console.log(`🧹 Cleared existing vectors in namespace "${CLINIC.namespace}"`);
  } catch {
    console.log(`(namespace "${CLINIC.namespace}" was empty or new — nothing to clear)`);
  }
  console.log(`📤 Uploading ${texts.length} items...`);
  const result = await upsertTextsToNamespace(texts, CLINIC.namespace);
  console.log(`✅ Uploaded ${result.count} vectors to namespace: ${result.namespace}`);
}

main().catch((e) => { console.error("❌ Fatal error:", e); process.exit(1); });
