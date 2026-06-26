/**
 * Quick retrieval test for the 5 demo clinics.
 * Verifies each namespace returns the right Q&A for a realistic question.
 * Run: npx tsx scripts/test-5-clinics.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });

import { queryPineconeWithTextInNamespace } from "../lib/pinecone";

const TESTS: { namespace: string; clinic: string; query: string }[] = [
  { namespace: "ira-skincare", clinic: "dr. Ira", query: "jam buka klinik hari minggu" },
  { namespace: "ira-skincare", clinic: "dr. Ira", query: "ada treatment slimming apa saja?" },
  { namespace: "beauty-palace", clinic: "Beauty Palace", query: "berapa harga hair transplant?" },
  { namespace: "beauty-palace", clinic: "Beauty Palace", query: "apakah konsultasi gratis?" },
  { namespace: "drkhe-co", clinic: "dr. Khé & Co", query: "apakah ada layanan gigi / dental?" },
  { namespace: "drkhe-co", clinic: "dr. Khé & Co", query: "alamat dan nomor whatsapp" },
  { namespace: "estetika-dental", clinic: "Estetika Dental", query: "berapa harga scaling gigi?" },
  { namespace: "estetika-dental", clinic: "Estetika Dental", query: "buka hari minggu tidak?" },
  { namespace: "eva-mulia", clinic: "Eva Mulia", query: "cabang di tangerang ada di mana?" },
  { namespace: "eva-mulia", clinic: "Eva Mulia", query: "harga acne treatment jerawat" },
];

async function main() {
  console.log("🧪 Retrieval test — 5 clinics\n" + "━".repeat(80));
  for (const t of TESTS) {
    console.log(`\n[${t.clinic}]  Q: "${t.query}"`);
    const res = await queryPineconeWithTextInNamespace(t.query, t.namespace, 1);
    const m: any = res.matches?.[0];
    if (!m) {
      console.log("   ❌ no match");
      continue;
    }
    const score = (m.score * 100).toFixed(1);
    const q = m.metadata?.question || "(no question)";
    const a = (m.metadata?.answer || "").toString().replace(/\n/g, " ");
    console.log(`   ✅ ${score}% → ${q}`);
    console.log(`      A: ${a.slice(0, 160)}${a.length > 160 ? "…" : ""}`);
  }
  console.log("\n" + "━".repeat(80) + "\n✅ done");
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
