/**
 * Test script for multi-clinic detection and retrieval
 * Run: npx tsx scripts/test-multi-clinic-detection.ts
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
console.log(`Loading .env from: ${envPath}\n`);
config({ path: envPath, override: true });

import { detectKnowledgeBase, retrieveContext } from "../app/lib/utils";

async function testMultiClinicSystem() {
  console.log("============================================================");
  console.log("🧪 MULTI-CLINIC DETECTION & RETRIEVAL TEST");
  console.log("============================================================\n");

  // Test cases for detection
  const testCases = [
    {
      query: "Berapa harga treatment di Glow?",
      expectedClinicId: "glow-clinic",
      description: "Specific: Klinik Glow Aesthetics",
    },
    {
      query: "Harga treatment di Purity berapa?",
      expectedClinicId: "purity-clinic",
      description: "Specific: The Purity Aesthetic Clinic",
    },
    {
      query: "Klinik Pramudia ada treatment vitiligo?",
      expectedClinicId: "pramudia-clinic",
      description: "Specific: Klinik Pramudia",
    },
    {
      query: "Beauty+ di PIK alamatnya mana?",
      expectedClinicId: "beauty-plus-clinic",
      description: "Specific: Beauty+ Clinic",
    },
    {
      query: "Ada klinik kecantikan yang bagus?",
      expectedClinicId: null,
      description: "Generic: All clinics",
    },
  ];

  console.log("📋 TEST 1: DETECTION LOGIC");
  console.log("─".repeat(60) + "\n");

  for (const testCase of testCases) {
    console.log(`🔍 Query: "${testCase.query}"`);
    console.log(`   Expected: ${testCase.description}`);

    const detected = detectKnowledgeBase(testCase.query);

    if (!detected) {
      console.log("   ❌ FAIL: No knowledge base detected\n");
      continue;
    }

    if (typeof detected === "string") {
      console.log(`   ⚠️  WARN: Detected as string "${detected}" (old format)\n`);
      continue;
    }

    if (detected.kb !== "clinic") {
      console.log(`   ❌ FAIL: Wrong KB type "${detected.kb}"\n`);
      continue;
    }

    if (detected.clinicId === testCase.expectedClinicId) {
      console.log(`   ✅ PASS: Detected clinicId = "${detected.clinicId || "null (all)"}"\n`);
    } else {
      console.log(`   ❌ FAIL: Expected "${testCase.expectedClinicId}", got "${detected.clinicId}"\n`);
    }
  }

  console.log("\n📋 TEST 2: RETRIEVAL WITH SPECIFIC CLINIC");
  console.log("─".repeat(60) + "\n");

  // Test retrieval for Glow Clinic
  const glowQuery = "Apa saja treatment facial di Glow?";
  console.log(`🔍 Query: "${glowQuery}"`);
  console.log(`   Testing retrieval for Klinik Glow Aesthetics...\n`);

  const glowDetection = detectKnowledgeBase(glowQuery);
  if (!glowDetection || typeof glowDetection === "string") {
    console.log("   ❌ FAIL: Detection failed or returned old format\n");
  } else {
    const glowResult = await retrieveContext(glowQuery, glowDetection, 3);
    console.log(`   Retrieved ${glowResult.ragSources.length} sources`);
    console.log(`   RAG working: ${glowResult.isRagWorking}`);

    if (glowResult.ragSources.length > 0) {
      console.log(`   Top source: ${glowResult.ragSources[0].fileName}`);
      console.log(`   Clinic ID: ${glowResult.ragSources[0].clinicId}`);
      console.log(`   Clinic Name: ${glowResult.ragSources[0].clinicName}`);

      const allFromGlow = glowResult.ragSources.every(
        (s) => s.clinicId === "glow-clinic"
      );
      if (allFromGlow) {
        console.log(`   ✅ PASS: All sources are from Klinik Glow Aesthetics\n`);
      } else {
        console.log(`   ❌ FAIL: Some sources are from other clinics\n`);
      }
    } else {
      console.log(`   ❌ FAIL: No sources retrieved\n`);
    }
  }

  console.log("\n📋 TEST 3: RETRIEVAL WITH GENERIC CLINIC");
  console.log("─".repeat(60) + "\n");

  // Test generic retrieval
  const genericQuery = "Ada treatment laser apa saja?";
  console.log(`🔍 Query: "${genericQuery}"`);
  console.log(`   Testing generic retrieval (all clinics)...\n`);

  const genericDetection = detectKnowledgeBase(genericQuery);
  if (!genericDetection || typeof genericDetection === "string") {
    console.log("   ❌ FAIL: Detection failed or returned old format\n");
  } else {
    const genericResult = await retrieveContext(genericQuery, genericDetection, 5);
    console.log(`   Retrieved ${genericResult.ragSources.length} sources`);
    console.log(`   RAG working: ${genericResult.isRagWorking}`);

    if (genericResult.ragSources.length > 0) {
      const clinics = new Set(
        genericResult.ragSources.map((s) => s.clinicId).filter(Boolean)
      );
      console.log(`   Clinics in results: ${Array.from(clinics).join(", ")}`);

      if (clinics.size > 1) {
        console.log(`   ✅ PASS: Results from multiple clinics (${clinics.size} clinics)\n`);
      } else {
        console.log(`   ⚠️  WARN: Only 1 clinic in results (expected multiple)\n`);
      }
    } else {
      console.log(`   ❌ FAIL: No sources retrieved\n`);
    }
  }

  console.log("\n📋 TEST 4: RETRIEVAL FOR PURITY CLINIC");
  console.log("─".repeat(60) + "\n");

  // Test Purity clinic
  const purityQuery = "Treatment HIFU di Purity gimana?";
  console.log(`🔍 Query: "${purityQuery}"`);
  console.log(`   Testing retrieval for The Purity Aesthetic Clinic...\n`);

  const purityDetection = detectKnowledgeBase(purityQuery);
  if (!purityDetection || typeof purityDetection === "string") {
    console.log("   ❌ FAIL: Detection failed or returned old format\n");
  } else {
    const purityResult = await retrieveContext(purityQuery, purityDetection, 3);
    console.log(`   Retrieved ${purityResult.ragSources.length} sources`);
    console.log(`   RAG working: ${purityResult.isRagWorking}`);

    if (purityResult.ragSources.length > 0) {
      console.log(`   Top source: ${purityResult.ragSources[0].fileName}`);
      console.log(`   Clinic ID: ${purityResult.ragSources[0].clinicId}`);

      const allFromPurity = purityResult.ragSources.every(
        (s) => s.clinicId === "purity-clinic"
      );
      if (allFromPurity) {
        console.log(`   ✅ PASS: All sources are from The Purity Aesthetic Clinic\n`);
      } else {
        console.log(`   ❌ FAIL: Some sources are from other clinics\n`);
      }
    } else {
      console.log(`   ❌ FAIL: No sources retrieved\n`);
    }
  }

  console.log("============================================================");
  console.log("✅ TESTING COMPLETE!");
  console.log("============================================================\n");
}

testMultiClinicSystem().catch((error) => {
  console.error("\n❌ Test error:", error);
  process.exit(1);
});
