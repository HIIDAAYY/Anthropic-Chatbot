/**
 * Test Error Monitoring Webhook
 * Run: npx tsx scripts/test-error-monitor.ts
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
console.log(`Loading .env from: ${envPath}`);
config({ path: envPath, override: true });

// Dynamic import to ensure env vars are loaded first
// import { errorMonitor } from "../app/lib/error-monitor";

async function testErrorMonitor() {
  console.log("🧪 Testing Error Monitoring Webhook\n");
  console.log("=".repeat(50));

  // Check configuration
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.error("\n❌ ERROR: No webhook URL configured!");
    console.error("\nPlease add one of the following to your .env.local:");
    console.error("  DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...");
    console.error("  SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...");
    console.error("\nSee ERROR_MONITORING_SETUP.md for instructions.");
    process.exit(1);
  }

  console.log(`✅ Webhook URL configured: ${webhookUrl.slice(0, 50)}...`);
  console.log("=".repeat(50));

  // Import errorMonitor dynamically
  const { errorMonitor } = await import("../app/lib/error-monitor");

  // Test 1: Basic webhook test
  console.log("\n📤 Test 1: Sending test message...");
  const webhookOk = await errorMonitor.testWebhook();

  if (!webhookOk) {
    console.error("\n❌ Webhook test FAILED!");
    console.error("Possible issues:");
    console.error("  - Invalid webhook URL");
    console.error("  - Webhook was deleted in Discord/Slack");
    console.error("  - Network connection issue");
    console.error("\nCheck your webhook URL and try again.");
    process.exit(1);
  }

  console.log("✅ Basic webhook test passed!");

  // Test 2: Critical error alert
  console.log("\n📤 Test 2: Sending critical error alert...");
  await errorMonitor.dbError(
    "test_operation",
    new Error("This is a test database error - IGNORE"),
    {
      testMode: true,
      clinicId: "test-clinic",
      timestamp: new Date().toISOString(),
    }
  );
  console.log("✅ Critical error alert sent!");

  // Test 3: High priority alert
  console.log("\n📤 Test 3: Sending high priority alert...");
  await errorMonitor.apiError(
    "/api/test",
    new Error("This is a test API error - IGNORE"),
    {
      testMode: true,
      statusCode: 500,
    }
  );
  console.log("✅ High priority alert sent!");

  // Test 4: Security alert
  console.log("\n📤 Test 4: Sending security alert...");
  await errorMonitor.securityAlert(
    "Test security alert - IGNORE",
    {
      testMode: true,
      ip: "127.0.0.1",
      action: "suspicious_activity",
    }
  );
  console.log("✅ Security alert sent!");

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("🎉 ALL TESTS PASSED!");
  console.log("=".repeat(50));
  console.log("\nYou should have received 4 messages in your channel:");
  console.log("  1. Test webhook message");
  console.log("  2. Critical database error");
  console.log("  3. High priority API error");
  console.log("  4. Critical security alert");
  console.log("\nIf you didn't receive messages:");
  console.log("  - Check your Discord/Slack channel");
  console.log("  - Verify webhook URL is correct");
  console.log("  - Check webhook wasn't deleted");
  console.log("\nError monitoring is ready for production! 🚀");
}

testErrorMonitor().catch((error) => {
  console.error("\n❌ Test failed with error:");
  console.error(error);
  process.exit(1);
});
