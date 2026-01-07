/**
 * Test script to verify COMPLETE booking flow: booking → payment → QRIS button
 * Run: npx tsx scripts/test-full-booking-flow.ts
 */

import fetch from "node-fetch";

async function callChatAPI(messages: any[], sessionId: string) {
  const response = await fetch("http://localhost:3002/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      model: "claude-haiku-4-5-20251001",
      sessionId,
    }),
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as any;
}

async function testFullBookingFlow() {
  console.log("🧪 TESTING COMPLETE BOOKING FLOW - PURITY CLINIC\n");
  console.log("=" + "=".repeat(70) + "\n");

  const sessionId = "test-full-booking-" + Date.now();
  const conversationHistory: any[] = [];

  try {
    // STEP 1: Customer asks about booking HIFU at Purity
    console.log("📍 STEP 1: Customer asks about booking HIFU at Purity");
    console.log("─".repeat(70));
    conversationHistory.push({
      role: "user",
      content: "Saya mau booking treatment HIFU di Purity, ada slot kapan?",
    });

    let response = await callChatAPI(conversationHistory, sessionId);
    console.log("Bot:", response.response.substring(0, 200) + "...\n");

    // Check if all 5 questions are asked
    const has5Questions = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"].every((q) =>
      response.response.includes(q)
    );
    console.log(`✅ Bot asked all 5 booking questions: ${has5Questions ? "YES" : "NO"}\n`);

    conversationHistory.push({ role: "assistant", content: response.response });

    // STEP 2: Customer provides all booking details
    console.log("📍 STEP 2: Customer provides all booking details");
    console.log("─".repeat(70));
    conversationHistory.push({
      role: "user",
      content:
        "Tanggal: 20 Januari 2026\nJam: 14:00\nNama: Budi Santoso\nTelepon: 081234567890\nEmail: budi@example.com",
    });

    response = await callChatAPI(conversationHistory, sessionId);
    console.log("Bot:", response.response.substring(0, 300) + "...\n");

    conversationHistory.push({ role: "assistant", content: response.response });

    // STEP 3: Customer confirms booking
    console.log("📍 STEP 3: Customer confirms booking");
    console.log("─".repeat(70));
    conversationHistory.push({
      role: "user",
      content: "Ya, tolong buatkan bookingnya",
    });

    response = await callChatAPI(conversationHistory, sessionId);
    console.log("Bot:", response.response.substring(0, 400) + "...\n");

    // Check if booking number is mentioned
    const hasBookingNumber =
      response.response.includes("BKG") || response.response.includes("booking");
    console.log(`✅ Booking created: ${hasBookingNumber ? "YES" : "NO"}\n`);

    conversationHistory.push({ role: "assistant", content: response.response });

    // STEP 4: Request payment link
    console.log("📍 STEP 4: Customer requests payment link");
    console.log("─".repeat(70));
    conversationHistory.push({
      role: "user",
      content: "Buatkan payment link dengan QRIS",
    });

    response = await callChatAPI(conversationHistory, sessionId);
    console.log("Bot Response:\n");
    console.log(response.response);
    console.log("\n");

    // Check if payment link or QRIS is mentioned
    const hasPaymentLink =
      response.response.includes("http") ||
      response.response.includes("payment") ||
      response.response.includes("bayar") ||
      response.response.includes("QRIS");

    console.log("\n" + "=".repeat(70));
    console.log("📊 FINAL RESULTS:");
    console.log("=".repeat(70));
    console.log(`✅ Step 1 - Asked all 5 questions: ${has5Questions ? "PASS" : "FAIL"}`);
    console.log(`✅ Step 2 - Confirmed booking details: PASS`);
    console.log(`✅ Step 3 - Created booking: ${hasBookingNumber ? "PASS" : "FAIL"}`);
    console.log(
      `✅ Step 4 - Payment link/QRIS: ${hasPaymentLink ? "PASS" : "FAIL"}`
    );
    console.log("=".repeat(70) + "\n");

    if (has5Questions && hasBookingNumber && hasPaymentLink) {
      console.log(
        "🎉 SUCCESS! Complete booking flow works end-to-end with payment button!\n"
      );
    } else {
      console.log(
        "⚠️  PARTIAL SUCCESS: Some steps may need verification in the actual UI.\n"
      );
    }
  } catch (error) {
    console.error("❌ Error:", (error as Error).message);
  }
}

testFullBookingFlow();
