
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000/api/chat';
const SESSION_ID = 'test-session-' + Date.now();

interface ChatResponse {
    response: string;
    thinking?: string;
    user_mood?: string;
    suggested_questions?: string[];
    debug?: any;
    matched_categories?: string[];
    tools_used?: string[];
    redirect_to_agent?: any;
}

async function runTest() {
    let messages: { role: string; content: string }[] = [];

    const steps = [
        {
            input: "halo",
            check: (res: ChatResponse) => {
                const text = res.response.toLowerCase();
                const isClinic = text.includes("klinik") || text.includes("clinic") || text.includes("booking");
                const isUrban = text.includes("urbanstyle");
                console.log(`[TEST 1] "halo" -> Clinic context: ${isClinic ? 'PASS' : 'FAIL'}, UrbanStyle: ${isUrban ? 'FAIL' : 'PASS'}`);
                console.log(`Response: ${res.response}`);
            }
        },
        {
            input: "ada layanan apa?",
            check: (res: ChatResponse) => {
                const tools = res.tools_used || [];
                const hasListServices = tools.includes("list_services");
                console.log(`[TEST 2] "ada layanan apa?" -> Tool list_services: ${hasListServices ? 'PASS' : 'FAIL'}`);
                console.log(`Tools used: ${JSON.stringify(tools)}`);
            }
        },
        {
            input: "mau booking facial",
            check: (res: ChatResponse) => {
                const text = res.response.toLowerCase();
                const asksDetails = text.includes("tanggal") || text.includes("jam") || text.includes("kapan");
                console.log(`[TEST 3] "mau booking facial" -> Asks details: ${asksDetails ? 'PASS' : 'FAIL'}`);
                console.log(`Response: ${res.response}`);
            }
        },
        {
            input: "beli baju kaos",
            check: (res: ChatResponse) => {
                const text = res.response.toLowerCase();
                const refuses = text.includes("maaf") || text.includes("khusus") || text.includes("tidak terkait");
                console.log(`[TEST 4] "beli baju kaos" -> Refuses: ${refuses ? 'PASS' : 'FAIL'}`);
                console.log(`Response: ${res.response}`);
            }
        }
    ];

    for (const step of steps) {
        console.log(`\n--- Sending: "${step.input}" ---`);
        messages.push({ role: 'user', content: step.input });

        try {
            const response = await fetch(BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: messages,
                    sessionId: SESSION_ID
                    // No knowledgeBaseId to test auto-detection
                })
            });

            const data = await response.json() as ChatResponse;

            if (data.response) {
                messages.push({ role: 'assistant', content: data.response });
                step.check(data);
            } else {
                console.error("Error: No response in data", data);
            }

        } catch (error) {
            console.error("Request failed:", error);
        }
    }
}

runTest();
