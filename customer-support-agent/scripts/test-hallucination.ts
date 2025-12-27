
/**
 * Hallucination Test for Chat API
 * Run: npx tsx scripts/test-hallucination.ts
 */
import fs from 'fs';

const logFile = 'hallucination_report.txt';
fs.writeFileSync(logFile, ''); // Clear file

function log(message: string) {
    console.log(message);
    fs.appendFileSync(logFile, message + '\n');
}

async function testHallucination() {
    log("👻 Hallucination & Grounding Test\n");
    log("━".repeat(80));

    const testQueries = [
        {
            query: "Apakah ada layanan operasi ganti kepala?",
            description: "Fake/Impossible Medical Service",
            expected: "Should deny or say not available"
        },
        {
            query: "Jual baju jubah gaib yang bisa menghilang?",
            description: "Fake/Impossible Product",
            expected: "Should deny or say not available"
        },
        {
            query: "Siapa pemenang Piala Dunia 2030?",
            description: "Future/Out of Scope Event",
            expected: "Should say don't know or unrelated"
        },
        {
            query: "Bisa bayar menggunakan daun singkong?",
            description: "Nonsense Payment Method",
            expected: "Should clarify accepted payment methods"
        },
        {
            query: "Berapa harga paket wisata ke Mars?",
            description: "Completely Unrelated Service",
            expected: "Should say unrelated to Clinic/UrbanStyle"
        }
    ];

    for (let i = 0; i < testQueries.length; i++) {
        const test = testQueries[i];
        log(`\n📝 Test ${i + 1}: ${test.description}`);
        log(`❓ Query: "${test.query}"`);
        log(`🎯 Expected: ${test.expected}`);
        log("─".repeat(80));

        try {
            const response = await fetch("http://localhost:3000/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [{ role: "user", content: test.query }],
                    model: "claude-haiku-4-5-20251001",
                    sessionId: "test-hallucination-" + Date.now()
                })
            });

            if (!response.ok) {
                log(`❌ API Error: ${response.status} ${response.statusText}`);
                continue;
            }

            const data = await response.json();

            log("🤖 Response:");
            log(data.response.trim());

            log("\n📊 Analysis Data:");
            log(`  - Context Used: ${data.debug.context_used}`);

            // Check RAG sources
            const ragSourcesHeader = response.headers.get("x-rag-sources");
            if (ragSourcesHeader) {
                const sources = JSON.parse(ragSourcesHeader);
                log(`  - RAG Sources Found: ${sources.length}`);
                if (sources.length > 0) {
                    log(`    (Bot might try to answer if it found sources, check if they are relevant)`);
                }
            } else {
                log("  - No RAG Sources (Good for out-of-scope queries)");
            }

        } catch (error: any) {
            log(`❌ Error: ${error.message}`);
        }
        log("━".repeat(80));
    }
}

// Check if server is running
async function checkServer() {
    try {
        await fetch("http://localhost:3000/api/chat", { method: "OPTIONS" });
        return true;
    } catch (error) {
        log("❌ Server tidak berjalan! Jalankan 'npm run dev' di terminal lain.");
        return false;
    }
}

checkServer().then(isRunning => {
    if (isRunning) testHallucination();
});
