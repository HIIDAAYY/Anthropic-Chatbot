/**
 * Quick interactive test for chat API
 * Run: npx tsx scripts/quick-test.ts
 */

async function quickTest() {
  console.log("🧪 Quick Chat API Test\n");
  console.log("━".repeat(80));

  const testQueries = [
    {
      messages: [{ role: "user", content: "Berapa harga facial treatment?" }],
      description: "Clinic Query - Facial Treatment"
    },
    {
      messages: [{ role: "user", content: "Ada baju kemeja ukuran XL stock?" }],
      description: "UrbanStyle Query - Fashion"
    },
    {
      messages: [
        { role: "user", content: "Apa layanan klinik yang tersedia?" },
        { role: "assistant", content: "Klinik kami menyediakan layanan kecantikan dan gigi." },
        { role: "user", content: "Berapa harganya?" }
      ],
      description: "Follow-up Question (with context)"
    }
  ];

  for (let i = 0; i < testQueries.length; i++) {
    const test = testQueries[i];
    console.log(`\n📝 Test ${i + 1}: ${test.description}`);
    console.log("─".repeat(80));
    console.log("Query:", test.messages[test.messages.length - 1].content);

    try {
      const response = await fetch("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: test.messages,
          model: "claude-haiku-4-5-20251001",
          // knowledgeBaseId will be auto-detected by the system
          sessionId: "test-session-" + Date.now()
        })
      });

      if (!response.ok) {
        console.log("❌ API Error:", response.status, response.statusText);
        continue;
      }

      const data = await response.json();

      console.log("\n✅ Response:");
      console.log(data.response.slice(0, 200) + "...");
      console.log("\n📊 Metadata:");
      console.log("  - User Mood:", data.user_mood);
      console.log("  - Context Used:", data.debug.context_used);
      console.log("  - Categories:", data.matched_categories?.join(", ") || "none");

      // Check RAG sources from headers
      const ragSources = response.headers.get("x-rag-sources");
      if (ragSources) {
        const sources = JSON.parse(ragSources);
        console.log("  - RAG Sources:", sources.length);
        sources.forEach((source: any, idx: number) => {
          console.log(`    ${idx + 1}. [${source.source || 'default'}] ${source.fileName}`);
        });
      }

      console.log("\n" + "━".repeat(80));
    } catch (error: any) {
      console.log("❌ Error:", error.message);
    }
  }

  console.log("\n✅ Testing completed!");
  console.log("\n💡 Tips:");
  console.log("  - Check terminal logs for auto-detection messages");
  console.log("  - Verify RAG sources match the query topic");
  console.log("  - Clinic queries should use clinic sources");
  console.log("  - Fashion queries should use urbanstyle sources");
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch("http://localhost:3000/api/chat", {
      method: "OPTIONS"
    });
    return true;
  } catch (error) {
    console.log("❌ Server tidak berjalan!");
    console.log("📝 Jalankan dulu: npm run dev");
    console.log();
    return false;
  }
}

checkServer().then(isRunning => {
  if (isRunning) {
    quickTest();
  }
});
