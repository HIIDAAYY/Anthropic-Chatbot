/**
 * Test script to verify multi-clinic booking system works for all clinics
 * Run: npx tsx scripts/test-multi-clinic-booking.ts
 */

import fetch from "node-fetch";

async function callChatAPI(query: string, sessionId: string) {
  const response = await fetch("http://localhost:3002/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: query }],
      model: "claude-haiku-4-5-20251001",
      sessionId,
    }),
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as any;
}

async function testClinicBooking(
  clinicName: string,
  query: string,
  expectedKeywords: string[]
) {
  console.log(`\n📍 Testing: ${clinicName}`);
  console.log("─".repeat(70));
  console.log(`Query: "${query}"\n`);

  try {
    const sessionId = `test-${clinicName.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
    const response = await callChatAPI(query, sessionId);

    console.log("Bot Response (first 300 chars):");
    console.log(response.response.substring(0, 300) + "...\n");

    // Check if all 5 questions are asked
    const has5Questions = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"].every((q) =>
      response.response.includes(q)
    );

    // Check if clinic name is mentioned
    const hasClinicName = expectedKeywords.some((keyword) =>
      response.response.toLowerCase().includes(keyword.toLowerCase())
    );

    // Check if it's asking for booking details
    const asksForDetails =
      response.response.includes("Tanggal") ||
      response.response.includes("booking") ||
      response.response.includes("informasi");

    console.log("Validation:");
    console.log(`  - Asked all 5 questions: ${has5Questions ? "✅" : "❌"}`);
    console.log(`  - Clinic context detected: ${hasClinicName ? "✅" : "❌"}`);
    console.log(`  - Asks for booking details: ${asksForDetails ? "✅" : "❌"}`);

    return {
      clinic: clinicName,
      success: has5Questions && asksForDetails,
      has5Questions,
      hasClinicName,
      asksForDetails,
    };
  } catch (error) {
    console.error(`❌ Error testing ${clinicName}:`, (error as Error).message);
    return {
      clinic: clinicName,
      success: false,
      has5Questions: false,
      hasClinicName: false,
      asksForDetails: false,
      error: (error as Error).message,
    };
  }
}

async function testAllClinics() {
  console.log("🧪 TESTING MULTI-CLINIC BOOKING SYSTEM\n");
  console.log("=" + "=".repeat(70) + "\n");

  const testCases = [
    {
      name: "Klinik Glow Aesthetics",
      query: "Saya mau booking facial di Glow",
      keywords: ["Glow", "facial"],
    },
    {
      name: "The Purity Aesthetic Clinic",
      query: "Booking HIFU di Purity dong",
      keywords: ["Purity", "HIFU"],
    },
    {
      name: "Klinik Pramudia",
      query: "Mau konsultasi vitiligo di Pramudia",
      keywords: ["Pramudia", "vitiligo"],
    },
    {
      name: "Beauty+ Clinic",
      query: "Treatment Fat Laser di Beauty+ ada?",
      keywords: ["Beauty", "Fat Laser"],
    },
  ];

  const results = [];

  for (const testCase of testCases) {
    const result = await testClinicBooking(
      testCase.name,
      testCase.query,
      testCase.keywords
    );
    results.push(result);

    // Wait between tests to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("📊 SUMMARY - MULTI-CLINIC BOOKING TEST");
  console.log("=".repeat(70) + "\n");

  results.forEach((result) => {
    const status = result.success ? "✅ PASS" : "❌ FAIL";
    console.log(`${status} - ${result.clinic}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  const passCount = results.filter((r) => r.success).length;
  const totalCount = results.length;

  console.log("\n" + "─".repeat(70));
  console.log(`Total: ${passCount}/${totalCount} clinics working correctly`);
  console.log("─".repeat(70) + "\n");

  if (passCount === totalCount) {
    console.log("🎉 SUCCESS! All clinics can handle booking requests!\n");
  } else {
    console.log("⚠️  Some clinics need attention. Check details above.\n");
  }
}

testAllClinics();
