/**
 * Upload batch 2 clinics (NanoGlow, E3A Emily, DC Beauty, dr. Yustini, Farla),
 * each to its own Pinecone namespace. Idempotent (clears then re-uploads).
 * Run: npx tsx scripts/upload-batch2.ts
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

const CLINICS = [
  { id: "nanoglow", name: "NanoGlow Aesthetic Clinic", file: "nanoglow-faq.md" },
  { id: "e3a-emily", name: "E3A Emily Aesthetics & Anti Aging Clinic", file: "e3a-emily-faq.md" },
  { id: "dc-beauty", name: "DC Beauty Clinic", file: "dc-beauty-faq.md" },
  { id: "dr-yustini", name: "Klinik dr. Yustini", file: "dr-yustini-faq.md" },
  { id: "farla", name: "Farla Aesthetic Clinic", file: "farla-faq.md" },
].map((c) => ({ ...c, namespace: c.id, filePath: resolve(__dirname, "../data/clinics/" + c.file) }));

interface FAQItem {
  id: string; question: string; answer: string; category: string;
  text: string; clinicId: string; clinicName: string;
}

function parseFAQFile(filePath: string, clinicId: string, clinicName: string): FAQItem[] {
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
  return faqItems;
}

async function main() {
  for (const c of CLINICS) {
    console.log(`\n🏥 ${c.name} (namespace: ${c.namespace})`);
    const items = parseFAQFile(c.filePath, c.id, c.name);
    console.log(`   ✅ Parsed ${items.length} Q&A`);
    if (!items.length) continue;
    const texts = items.map((it) => ({
      id: it.id, text: it.text,
      metadata: {
        question: it.question, answer: it.answer, category: it.category,
        clinicId: it.clinicId, clinicName: it.clinicName, source: "clinic",
      },
    }));
    try {
      await getPineconeIndex().namespace(c.namespace).deleteAll();
      console.log(`   🧹 Cleared namespace`);
    } catch { console.log(`   (namespace empty/new)`); }
    const result = await upsertTextsToNamespace(texts, c.namespace);
    console.log(`   📤 Uploaded ${result.count} vectors`);
  }
  console.log("\n✅ Batch 2 upload complete.");
}

main().catch((e) => { console.error("❌ Fatal error:", e); process.exit(1); });
