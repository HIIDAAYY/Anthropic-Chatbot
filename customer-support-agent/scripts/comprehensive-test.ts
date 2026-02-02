/**
 * Comprehensive Testing Script for Customer Support Bot
 * Tests all major features and generates detailed report
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
const CLINIC_ID = "lumina-aesthetic";
const TEST_CUSTOMER_ID = "test-customer-comprehensive-" + Date.now();

interface TestResult {
    category: string;
    testName: string;
    query: string;
    passed: boolean;
    response?: any;
    error?: string;
    duration: number;
    notes?: string;
}

const testResults: TestResult[] = [];
let totalTests = 0;
let passedTests = 0;

// Helper function to test chat API
async function testChatQuery(query: string, expectedChecks: any = {}, category: string, testName: string): Promise<TestResult> {
    totalTests++;
    const startTime = Date.now();

    try {
        console.log(`\n🧪 Testing: ${category} - ${testName}`);
        console.log(`📝 Query: "${query}"`);

        const response = await fetch(`${BASE_URL}/api/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                message: query,
                clinicId: CLINIC_ID,
                customerId: TEST_CUSTOMER_ID,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const duration = Date.now() - startTime;

        // Perform checks
        let passed = true;
        let notes = "";

        // Check response exists
        if (!data.response || data.response.length === 0) {
            passed = false;
            notes += "No response text. ";
        }

        // Check if tools were called (if expected)
        if (expectedChecks.expectToolUse && !data.tools_used?.length) {
            passed = false;
            notes += "Expected tool use but none found. ";
        }

        // Check mood detection
        if (expectedChecks.expectMood && !data.user_mood) {
            passed = false;
            notes += "No mood detected. ";
        }

        // Check redirect to agent
        if (expectedChecks.expectRedirect && !data.redirect_to_agent?.should_redirect) {
            passed = false;
            notes += "Expected redirect to agent but not triggered. ";
        }

        // Check suggested questions
        if (!data.suggested_questions || data.suggested_questions.length === 0) {
            notes += "No suggested questions. ";
        }

        // Check response is not raw JSON
        if (data.response.includes('{') && data.response.includes('"order_id"')) {
            passed = false;
            notes += "Response contains raw JSON instead of formatted text. ";
        }

        if (passed) {
            passedTests++;
            console.log(`✅ PASS - ${duration}ms`);
        } else {
            console.log(`❌ FAIL - ${duration}ms - ${notes}`);
        }

        console.log(`📊 Response: ${data.response.substring(0, 150)}...`);
        if (data.tools_used?.length) {
            console.log(`🔧 Tools used: ${data.tools_used.join(", ")}`);
        }
        console.log(`😊 Mood: ${data.user_mood}`);

        return {
            category,
            testName,
            query,
            passed,
            response: data,
            duration,
            notes: notes || "All checks passed",
        };
    } catch (error: any) {
        const duration = Date.now() - startTime;
        console.log(`❌ ERROR - ${error.message}`);

        return {
            category,
            testName,
            query,
            passed: false,
            duration,
            error: error.message,
        };
    }
}

// Test admin dashboard API
async function testAdminAPI(): Promise<void> {
    console.log("\n\n🔐 TESTING ADMIN DASHBOARD API");
    console.log("=".repeat(60));

    // Test 1: List conversations
    try {
        console.log("\n🧪 Testing: Admin - List Conversations");
        const response = await fetch(`${BASE_URL}/api/admin/conversations/list`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (response.ok) {
            const data = await response.json();
            console.log(`✅ PASS - Found ${data.conversations?.length || 0} conversations`);
            passedTests++;
        } else {
            console.log(`❌ FAIL - Status: ${response.status}`);
        }
        totalTests++;
    } catch (error: any) {
        console.log(`❌ ERROR - ${error.message}`);
        totalTests++;
    }

    // Test 2: List handoffs
    try {
        console.log("\n🧪 Testing: Admin - List Handoffs");
        const response = await fetch(`${BASE_URL}/api/admin/handoff/list`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (response.ok) {
            const data = await response.json();
            console.log(`✅ PASS - Found ${data.handoffs?.length || 0} handoffs`);
            passedTests++;
        } else {
            console.log(`❌ FAIL - Status: ${response.status}`);
        }
        totalTests++;
    } catch (error: any) {
        console.log(`❌ ERROR - ${error.message}`);
        totalTests++;
    }
}

// Main test runner
async function runAllTests() {
    console.log("🚀 STARTING COMPREHENSIVE BOT TESTING");
    console.log("=".repeat(60));
    console.log(`📍 Base URL: ${BASE_URL}`);
    console.log(`🏥 Clinic ID: ${CLINIC_ID}`);
    console.log(`👤 Test Customer ID: ${TEST_CUSTOMER_ID}`);
    console.log("=".repeat(60));

    // ========== 1. BASIC FAQ TESTING ==========
    console.log("\n\n📚 CATEGORY 1: BASIC FAQ TESTING");
    console.log("=".repeat(60));

    testResults.push(
        await testChatQuery(
            "Dimana lokasi klinik?",
            { expectMood: true },
            "Basic FAQ",
            "Location Query"
        )
    );

    testResults.push(
        await testChatQuery(
            "Jam operasional klinik?",
            { expectMood: true },
            "Basic FAQ",
            "Operating Hours"
        )
    );

    testResults.push(
        await testChatQuery(
            "Apa saja treatment yang tersedia?",
            { expectMood: true },
            "Basic FAQ",
            "Services List"
        )
    );

    testResults.push(
        await testChatQuery(
            "Berapa harga facial treatment?",
            { expectMood: true },
            "Basic FAQ",
            "Pricing Query"
        )
    );

    // ========== 2. BOT TOOLS TESTING ==========
    console.log("\n\n🛠️ CATEGORY 2: BOT TOOLS TESTING");
    console.log("=".repeat(60));

    testResults.push(
        await testChatQuery(
            "Cek ketersediaan slot untuk besok",
            { expectToolUse: true, expectMood: true },
            "Bot Tools",
            "Check Availability"
        )
    );

    testResults.push(
        await testChatQuery(
            "Saya mau booking facial untuk tanggal 5 Februari jam 10 pagi",
            { expectToolUse: true, expectMood: true },
            "Bot Tools",
            "Create Booking"
        )
    );

    // ========== 3. MULTILINGUAL TESTING ==========
    console.log("\n\n🌍 CATEGORY 3: MULTILINGUAL TESTING");
    console.log("=".repeat(60));

    testResults.push(
        await testChatQuery(
            "What treatments do you offer?",
            { expectMood: true },
            "Multilingual",
            "English Query"
        )
    );

    testResults.push(
        await testChatQuery(
            "Berapa harganya?",
            { expectMood: true },
            "Multilingual",
            "Indonesian Query"
        )
    );

    // ========== 4. MOOD DETECTION TESTING ==========
    console.log("\n\n😊 CATEGORY 4: MOOD DETECTION TESTING");
    console.log("=".repeat(60));

    testResults.push(
        await testChatQuery(
            "Wah kliniknya bagus sekali! Saya tertarik booking",
            { expectMood: true },
            "Mood Detection",
            "Positive Mood"
        )
    );

    testResults.push(
        await testChatQuery(
            "Saya penasaran, apa bedanya laser dengan IPL?",
            { expectMood: true },
            "Mood Detection",
            "Curious Mood"
        )
    );

    testResults.push(
        await testChatQuery(
            "Saya bingung harus pilih treatment yang mana",
            { expectMood: true },
            "Mood Detection",
            "Confused Mood"
        )
    );

    // ========== 5. HUMAN AGENT HANDOFF TESTING ==========
    console.log("\n\n👤 CATEGORY 5: HUMAN AGENT HANDOFF TESTING");
    console.log("=".repeat(60));

    testResults.push(
        await testChatQuery(
            "Saya mau komplain, treatment kemarin jerawat saya malah tambah parah!",
            { expectRedirect: true, expectMood: true },
            "Agent Handoff",
            "Complaint"
        )
    );

    testResults.push(
        await testChatQuery(
            "Tolong cancel appointment saya tanggal 15 Januari",
            { expectRedirect: true, expectMood: true },
            "Agent Handoff",
            "Cancellation Request"
        )
    );

    // ========== 6. EDGE CASES TESTING ==========
    console.log("\n\n⚠️ CATEGORY 6: EDGE CASES TESTING");
    console.log("=".repeat(60));

    testResults.push(
        await testChatQuery(
            "asdfghjkl",
            { expectMood: true },
            "Edge Cases",
            "Invalid Input"
        )
    );

    testResults.push(
        await testChatQuery(
            "Siapa presiden Indonesia?",
            { expectMood: true },
            "Edge Cases",
            "Out of Scope"
        )
    );

    testResults.push(
        await testChatQuery(
            "Apakah klinik jual mobil?",
            { expectMood: true },
            "Edge Cases",
            "Non-existent Service"
        )
    );

    // ========== 7. ADMIN DASHBOARD TESTING ==========
    await testAdminAPI();

    // ========== GENERATE REPORT ==========
    console.log("\n\n📊 GENERATING TEST REPORT");
    console.log("=".repeat(60));

    generateReport();
}

function generateReport() {
    console.log("\n\n" + "=".repeat(80));
    console.log("📋 COMPREHENSIVE TEST REPORT");
    console.log("=".repeat(80));

    // Summary
    console.log(`\n✅ Tests Passed: ${passedTests}/${totalTests} (${Math.round((passedTests / totalTests) * 100)}%)`);
    console.log(`❌ Tests Failed: ${totalTests - passedTests}/${totalTests}`);

    // Average response time
    const avgDuration = testResults.reduce((sum, r) => sum + r.duration, 0) / testResults.length;
    console.log(`⏱️  Average Response Time: ${Math.round(avgDuration)}ms`);

    // Results by category
    const categories = [...new Set(testResults.map(r => r.category))];

    console.log("\n\n📊 RESULTS BY CATEGORY:");
    console.log("-".repeat(80));

    categories.forEach(category => {
        const categoryTests = testResults.filter(r => r.category === category);
        const categoryPassed = categoryTests.filter(r => r.passed).length;
        const categoryTotal = categoryTests.length;

        console.log(`\n${category}: ${categoryPassed}/${categoryTotal} passed`);

        categoryTests.forEach(test => {
            const icon = test.passed ? "✅" : "❌";
            console.log(`  ${icon} ${test.testName}`);
            if (!test.passed && test.notes) {
                console.log(`     Issue: ${test.notes}`);
            }
            if (test.error) {
                console.log(`     Error: ${test.error}`);
            }
        });
    });

    // Failed tests details
    const failedTests = testResults.filter(r => !r.passed);
    if (failedTests.length > 0) {
        console.log("\n\n❌ FAILED TESTS DETAILS:");
        console.log("-".repeat(80));

        failedTests.forEach((test, idx) => {
            console.log(`\n${idx + 1}. ${test.category} - ${test.testName}`);
            console.log(`   Query: "${test.query}"`);
            console.log(`   Issue: ${test.notes || test.error}`);
            if (test.response?.response) {
                console.log(`   Response: ${test.response.response.substring(0, 200)}...`);
            }
        });
    }

    // Performance insights
    console.log("\n\n⚡ PERFORMANCE INSIGHTS:");
    console.log("-".repeat(80));

    const slowTests = testResults.filter(r => r.duration > 5000);
    if (slowTests.length > 0) {
        console.log(`\n⚠️  ${slowTests.length} tests took longer than 5 seconds:`);
        slowTests.forEach(test => {
            console.log(`   - ${test.category} - ${test.testName}: ${test.duration}ms`);
        });
    } else {
        console.log("✅ All tests completed within reasonable time (\u003c5s)");
    }

    // Recommendations
    console.log("\n\n💡 RECOMMENDATIONS:");
    console.log("-".repeat(80));

    if (passedTests / totalTests < 0.7) {
        console.log("⚠️  CRITICAL: Less than 70% tests passing. Major fixes needed.");
    } else if (passedTests / totalTests < 0.9) {
        console.log("⚠️  WARNING: Less than 90% tests passing. Some improvements needed.");
    } else if (passedTests / totalTests === 1) {
        console.log("✅ EXCELLENT: All tests passing! Bot is functioning correctly.");
    } else {
        console.log("✅ GOOD: Most tests passing. Minor improvements needed.");
    }

    if (avgDuration > 5000) {
        console.log("⚠️  PERFORMANCE: Average response time is slow. Consider optimization.");
    }

    console.log("\n" + "=".repeat(80));
    console.log("📝 Test completed at: " + new Date().toLocaleString());
    console.log("=".repeat(80) + "\n");
}

// Run all tests
runAllTests().catch(console.error);
