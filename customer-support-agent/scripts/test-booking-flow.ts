/**
 * Test script to verify booking flow with bot asking all 5 questions
 * Run: npx tsx scripts/test-booking-flow.ts
 */

import fetch from "node-fetch";

async function testBookingFlow() {
  console.log("🧪 TESTING BOOKING FLOW - PURITY CLINIC HIFU TREATMENT\n");
  console.log("=" + "=".repeat(70) + "\n");

  try {
    const response = await fetch("http://localhost:3002/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: "Saya mau booking treatment HIFU di Purity, ada slot kapan?",
          },
        ],
        model: "claude-haiku-4-5-20251001",
        sessionId: "test-booking-purity-001",
      }),
    });

    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error("Response:", errorText);
      return;
    }

    const data = (await response.json()) as any;

    console.log("📋 BOT RESPONSE:\n");
    console.log(data.response);
    console.log("\n" + "=".repeat(70) + "\n");

    // Check if all 5 questions are mentioned
    const requiredQuestions = [
      "1️⃣", // Tanggal
      "2️⃣", // Jam
      "3️⃣", // Nama Lengkap
      "4️⃣", // Nomor Telepon
      "5️⃣", // Email
    ];

    const allQuestionsPresent = requiredQuestions.every((q) =>
      data.response.includes(q)
    );

    console.log("✅ VALIDATION RESULTS:");
    console.log(`- All 5 numbered questions present: ${allQuestionsPresent ? "✅ YES" : "❌ NO"}`);
    console.log(
      `- Response contains "Tanggal": ${data.response.includes("Tanggal") ? "✅" : "❌"}`
    );
    console.log(
      `- Response contains "Jam": ${data.response.includes("Jam") ? "✅" : "❌"}`
    );
    console.log(
      `- Response contains "Nama Lengkap": ${data.response.includes("Nama Lengkap") ? "✅" : "❌"}`
    );
    console.log(
      `- Response contains "Nomor Telepon": ${data.response.includes("Nomor Telepon") ? "✅" : "❌"}`
    );
    console.log(
      `- Response contains "Email": ${data.response.includes("Email") ? "✅" : "❌"}`
    );

    if (allQuestionsPresent) {
      console.log("\n✅ SUCCESS: Bot is asking all 5 booking detail questions!");
    } else {
      console.log("\n❌ FAILURE: Bot is NOT asking all 5 questions properly!");
      console.log("Bot should list all 5 numbered questions with emojis.");
    }
  } catch (error) {
    console.error("❌ Error:", (error as Error).message);
  }
}

testBookingFlow();
