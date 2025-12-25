/**
 * Test script for Knowledge Base auto-detection
 * Run: npx tsx scripts/test-kb-detection.ts
 */

import { detectKnowledgeBase } from "../app/lib/utils";

console.log("🧪 Testing Knowledge Base Auto-Detection\n");
console.log("━".repeat(80));

const testCases = [
  // Clinic-related queries
  { query: "Berapa harga facial treatment?", expected: "clinic" },
  { query: "Apakah ada layanan scaling gigi?", expected: "clinic" },
  { query: "Saya mau konsultasi dokter gigi", expected: "clinic" },
  { query: "What is the price for teeth whitening?", expected: "clinic" },
  { query: "Apakah botox aman?", expected: "clinic" },
  { query: "Jam praktek dokter hari Senin?", expected: "clinic" },
  { query: "Treatment untuk jerawat ada?", expected: "clinic" },
  { query: "Perawatan wajah untuk kulit kering", expected: "clinic" },

  // UrbanStyle-related queries
  { query: "Ada baju kemeja ukuran XL?", expected: "urbanstyle" },
  { query: "Bagaimana cara tracking pesanan saya?", expected: "urbanstyle" },
  { query: "Apakah ada diskon untuk dress?", expected: "urbanstyle" },
  { query: "How to check my order status?", expected: "urbanstyle" },
  { query: "Promo apa yang berlaku hari ini?", expected: "urbanstyle" },
  { query: "Stock celana jeans warna hitam masih ada?", expected: "urbanstyle" },
  { query: "Cara bayar dengan COD gimana?", expected: "urbanstyle" },
  { query: "Bisa retur barang tidak?", expected: "urbanstyle" },

  // Ambiguous queries (should default to urbanstyle)
  { query: "Halo, apa kabar?", expected: "urbanstyle" },
  { query: "Terima kasih!", expected: "urbanstyle" },
  { query: "Butuh bantuan", expected: "urbanstyle" },
];

let passed = 0;
let failed = 0;

console.log("\n🏥 CLINIC Queries:\n");
testCases.slice(0, 8).forEach((testCase, idx) => {
  console.log(`Test ${idx + 1}: "${testCase.query}"`);
  const result = detectKnowledgeBase(testCase.query);
  const expectedResult = testCase.expected === "clinic" ? "clinic" : undefined;
  const isCorrect = result === expectedResult;

  if (isCorrect) {
    console.log(`✅ PASS - Detected: ${result || 'urbanstyle'}\n`);
    passed++;
  } else {
    console.log(`❌ FAIL - Expected: ${expectedResult || 'urbanstyle'}, Got: ${result || 'urbanstyle'}\n`);
    failed++;
  }
});

console.log("━".repeat(80));
console.log("\n👔 URBANSTYLE Queries:\n");
testCases.slice(8, 16).forEach((testCase, idx) => {
  console.log(`Test ${idx + 9}: "${testCase.query}"`);
  const result = detectKnowledgeBase(testCase.query);
  const expectedResult = testCase.expected === "clinic" ? "clinic" : undefined;
  const isCorrect = result === expectedResult;

  if (isCorrect) {
    console.log(`✅ PASS - Detected: ${result || 'urbanstyle'}\n`);
    passed++;
  } else {
    console.log(`❌ FAIL - Expected: ${expectedResult || 'urbanstyle'}, Got: ${result || 'urbanstyle'}\n`);
    failed++;
  }
});

console.log("━".repeat(80));
console.log("\n❓ AMBIGUOUS Queries (should default to urbanstyle):\n");
testCases.slice(16).forEach((testCase, idx) => {
  console.log(`Test ${idx + 17}: "${testCase.query}"`);
  const result = detectKnowledgeBase(testCase.query);
  const expectedResult = testCase.expected === "clinic" ? "clinic" : undefined;
  const isCorrect = result === expectedResult;

  if (isCorrect) {
    console.log(`✅ PASS - Detected: ${result || 'urbanstyle'}\n`);
    passed++;
  } else {
    console.log(`❌ FAIL - Expected: ${expectedResult || 'urbanstyle'}, Got: ${result || 'urbanstyle'}\n`);
    failed++;
  }
});

console.log("━".repeat(80));
console.log("\n📊 Test Results:");
console.log(`   Total: ${testCases.length}`);
console.log(`   ✅ Passed: ${passed}`);
console.log(`   ❌ Failed: ${failed}`);
console.log(`   Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%`);

if (failed === 0) {
  console.log("\n🎉 All tests passed!");
} else {
  console.log("\n⚠️  Some tests failed. Review the keyword lists in detectKnowledgeBase()");
}

console.log("\n━".repeat(80));
