
// import fetch from 'node-fetch'; // Using global fetch in Node 18+

const BASE_URL = 'http://localhost:3000/api/chat';

interface TestGroup {
    clinicName: string;
    questions: string[];
}

const testGroups: TestGroup[] = [
    {
        clinicName: "Glow Aesthetics",
        questions: [
            "Saya mau booking facial di Glow",
            "Treatment apa saja yang ada di Klinik Glow?",
            "Berapa harga facial di Glow?",
            "Booking botox di Glow ada slot hari Kamis?"
        ]
    },
    {
        clinicName: "The Purity Aesthetic Clinic",
        questions: [
            "Booking HIFU di Purity dong",
            "Ada treatment laser di Purity?",
            "Harga treatment HIFU berapa di Purity?",
            "Saya ingin booking treatment premium di The Purity"
        ]
    },
    {
        clinicName: "Klinik Pramudia",
        questions: [
            "Mau konsultasi vitiligo di Pramudia",
            "Ada treatment dermatologi di Klinik Pramudia?",
            "Pramudia specialist apa?",
            "Booking treatment di Pramudia ada?"
        ]
    },
    {
        clinicName: "Beauty+ Clinic",
        questions: [
            "Treatment Fat Laser di Beauty+ ada?",
            "Booking di Beauty+ untuk treatment apa saja?",
            "Cabang Beauty+ mana yang paling dekat?",
            "Harga treatment di Beauty+ berapa?"
        ]
    },
    {
        clinicName: "GENERIC (All Clinics)",
        questions: [
            "Ada klinik kecantikan yang bagus?",
            "Treatment laser apa saja yang tersedia?",
            "Clinic mana yang paling recommended?",
            "Mau tanya booking treatment"
        ]
    }
];

async function runTests() {
    console.log("🚀 Starting Chatbot Test Queries...\n");

    for (const group of testGroups) {
        console.log(`\n════════════════════════════════════════════════════════════`);
        console.log(`🏥 Testing Group: ${group.clinicName}`);
        console.log(`════════════════════════════════════════════════════════════`);

        // Generate a unique session ID for this group to maintain context
        const sessionId = `test-session-${Date.now()}-${group.clinicName.replace(/\s+/g, '-')}`;
        let messages: { role: string, content: string }[] = [];

        for (const question of group.questions) {
            console.log(`\n👤 User: ${question}`);

            // Add user message to history
            messages.push({ role: 'user', content: question });

            try {
                const response = await fetch(BASE_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        messages: messages,
                        sessionId: sessionId,
                        // We let the backend auto-detect the clinic/knowledge base
                        // to properly test the "Open localhost:3000 and ask" scenario
                    }),
                });

                if (!response.ok) {
                    console.error(`❌ API Error: ${response.status} ${response.statusText}`);
                    const text = await response.text();
                    console.error(`   Details: ${text}`);
                    continue;
                }

                const data = await response.json();

                console.log(`🤖 Bot: ${data.response}`);
                if (data.thinking) {
                    console.log(`   (Thinking: ${data.thinking})`);
                }
                if (data.matched_categories && data.matched_categories.length > 0) {
                    console.log(`   (Categories: ${data.matched_categories.join(', ')})`);
                }

                // Add assistant response to history for context in next turn
                messages.push({ role: 'assistant', content: data.response });

                // Small delay to be nice to the API
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                console.error(`❌ Request Failed:`, error);
            }
        }
    }

    console.log("\n✅ Test Complete!");
}

runTests();
