/**
 * Manual Learning Script
 * Test dan debug auto-learning feature dengan mudah
 *
 * Usage:
 * npx tsx scripts/manual-learn.ts --help
 * npx tsx scripts/manual-learn.ts --conversation-id clm123456
 * npx tsx scripts/manual-learn.ts --days 7 --auto-approve
 * npx tsx scripts/manual-learn.ts --list-candidates
 * npx tsx scripts/manual-learn.ts --review
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
console.log(`ANTHROPIC_API_KEY loaded: ${process.env.ANTHROPIC_API_KEY ? "YES (" + process.env.ANTHROPIC_API_KEY.substring(0, 5) + "...)" : "NO"}`);

// Dynamic imports to avoid hoisting issues
let learnFromConversation: any;
let learnFromConversations: any;
let evaluateConversationQuality: any;
let extractQAPairs: any;
let getConversationById: any;
let getLearnedQAPairs: any;
let getLearnedQAStats: any;
let prisma: any;

async function loadDependencies() {
  const learningService = await import("../app/lib/learning-service");
  learnFromConversation = learningService.learnFromConversation;
  learnFromConversations = learningService.learnFromConversations;
  evaluateConversationQuality = learningService.evaluateConversationQuality;
  extractQAPairs = learningService.extractQAPairs;

  const dbService = await import("../app/lib/db-service");
  getConversationById = dbService.getConversationById;
  getLearnedQAPairs = dbService.getLearnedQAPairs;
  getLearnedQAStats = dbService.getLearnedQAStats;
  prisma = dbService.prisma;
}

// Parse CLI arguments
const args = process.argv.slice(2);
const options: any = {};

for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith("--")) {
    const key = args[i].slice(2);
    const nextArg = args[i + 1];

    if (nextArg && !nextArg.startsWith("--")) {
      options[key] = nextArg;
      i++;
    } else {
      options[key] = true;
    }
  }
}

async function main() {
  try {
    await loadDependencies();

    console.log("\n" + "=".repeat(80));
    console.log("🎓 Manual Learning Script");
    console.log("=".repeat(80) + "\n");

    // Help command
    if (options.help) {
      showHelp();
      process.exit(0);
    }

    // List candidate conversations
    if (options["list-candidates"]) {
      await listCandidates();
      process.exit(0);
    }

    // Test single conversation quality
    if (options["test-quality"]) {
      await testQuality(options["test-quality"]);
      process.exit(0);
    }

    // Test Q&A extraction
    if (options["test-extract"]) {
      await testExtraction(options["test-extract"]);
      process.exit(0);
    }

    // Learn from single conversation
    if (options["conversation-id"]) {
      await learnSingleConversation(
        options["conversation-id"],
        !!options["auto-approve"],
        !!options["auto-sync"]
      );
      process.exit(0);
    }

    // Learn from conversations in time range
    if (options.days) {
      await learnFromTimeRange(parseInt(options.days), !!options["auto-approve"], !!options["auto-sync"]);
      process.exit(0);
    }

    // Review pending Q&A
    if (options.review) {
      await reviewPendingQA();
      process.exit(0);
    }

    // Show statistics
    if (options.stats) {
      await showStats();
      process.exit(0);
    }

    // Default: show help
    showHelp();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
Usage: npx tsx scripts/manual-learn.ts [OPTIONS]

COMMANDS:
  --conversation-id <id>        Learn from specific conversation
  --days <number>               Learn from conversations from last N days
  --list-candidates             Show conversations eligible for learning
  --test-quality <id>           Test quality evaluation for a conversation
  --test-extract <id>           Test Q&A extraction for a conversation
  --review                      Review and approve pending Q&A pairs
  --stats                       Show learning statistics
  --help                        Show this help message

OPTIONS:
  --auto-approve               Auto-approve high-confidence Q&A (confidence > 0.9)
  --auto-sync                  Auto-sync approved Q&A to Pinecone

EXAMPLES:
  # Test quality evaluation
  npx tsx scripts/manual-learn.ts --test-quality clm123456

  # Test Q&A extraction
  npx tsx scripts/manual-learn.ts --test-extract clm123456

  # Learn from one conversation with auto-approval
  npx tsx scripts/manual-learn.ts --conversation-id clm123456 --auto-approve

  # Learn from all conversations from last 7 days
  npx tsx scripts/manual-learn.ts --days 7 --auto-approve

  # Show eligible conversations
  npx tsx scripts/manual-learn.ts --list-candidates

  # Show statistics
  npx tsx scripts/manual-learn.ts --stats
`);
}

async function listCandidates() {
  console.log("🔍 Finding eligible conversations...\n");

  const conversations = await prisma.conversation.findMany({
    where: {
      status: "ACTIVE",
      metadata: {
        wasRedirected: false,
      },
    },
    include: {
      customer: true,
      metadata: true,
      messages: {
        select: { id: true },
      },
    },
    orderBy: { startedAt: "desc" },
    take: 50,
  });

  if (conversations.length === 0) {
    console.log("❌ No eligible conversations found");
    return;
  }

  console.log(`Found ${conversations.length} eligible conversations:\n`);

  for (let i = 0; i < Math.min(10, conversations.length); i++) {
    const conv = conversations[i];
    console.log(`${i + 1}. ID: ${conv.id}`);
    console.log(`   Customer: ${conv.customer.phoneNumber}`);
    console.log(`   Messages: ${conv.messages.length}`);
    console.log(`   Mood: ${conv.metadata?.userMood || "unknown"}`);
    console.log(`   Started: ${conv.startedAt.toLocaleString()}`);
    console.log();
  }

  if (conversations.length > 10) {
    console.log(`... and ${conversations.length - 10} more\n`);
  }
}

async function testQuality(conversationId: string) {
  console.log(`\n📊 Testing quality evaluation for: ${conversationId}\n`);

  const conversation = await getConversationById(conversationId);
  if (!conversation) {
    console.log("❌ Conversation not found");
    return;
  }

  console.log(`Customer: ${conversation.customer.phoneNumber}`);
  console.log(`Messages: ${conversation.messages.length}`);
  console.log(`Status: ${conversation.status}`);
  console.log();

  console.log("Evaluating quality...\n");
  const evaluation = await evaluateConversationQuality(conversationId);

  console.log(`Overall Score: ${(evaluation.score * 100).toFixed(1)}%`);
  console.log(`Eligible: ${evaluation.eligible}`);
  console.log(`Reason: ${evaluation.reason}\n`);

  console.log("Detailed Scores:");
  console.log(`  Resolution:     ${(evaluation.scores.resolution * 100).toFixed(1)}%`);
  console.log(`  Clarity:        ${(evaluation.scores.clarity * 100).toFixed(1)}%`);
  console.log(`  Accuracy:       ${(evaluation.scores.accuracy * 100).toFixed(1)}%`);
  console.log(`  Reusability:    ${(evaluation.scores.reusability * 100).toFixed(1)}%`);
  console.log(`  Professionalism: ${(evaluation.scores.professionalism * 100).toFixed(1)}%\n`);
}

async function testExtraction(conversationId: string) {
  console.log(`\n🔧 Testing Q&A extraction for: ${conversationId}\n`);

  const conversation = await getConversationById(conversationId);
  if (!conversation) {
    console.log("❌ Conversation not found");
    return;
  }

  console.log(`Customer: ${conversation.customer.phoneNumber}`);
  console.log(`Messages: ${conversation.messages.length}\n`);

  console.log("Extracting Q&A pairs...\n");
  const qaPairs = await extractQAPairs(conversationId);

  if (qaPairs.length === 0) {
    console.log("⏭️  No Q&A pairs extracted");
    return;
  }

  console.log(`Extracted ${qaPairs.length} Q&A pairs:\n`);

  for (let i = 0; i < qaPairs.length; i++) {
    const qa = qaPairs[i];
    console.log(`${i + 1}. [${qa.category}] Confidence: ${(qa.confidence * 100).toFixed(1)}%`);
    console.log(`   Q: ${qa.question}`);
    console.log(`   A: ${qa.answer.substring(0, 150)}${qa.answer.length > 150 ? "..." : ""}`);
    console.log();
  }
}

async function learnSingleConversation(
  conversationId: string,
  autoApprove: boolean,
  autoSync: boolean
) {
  console.log(`\n🎓 Learning from conversation: ${conversationId}\n`);

  const conversation = await getConversationById(conversationId);
  if (!conversation) {
    console.log("❌ Conversation not found");
    return;
  }

  console.log(`Customer: ${conversation.customer.phoneNumber}`);
  console.log(`Messages: ${conversation.messages.length}`);
  if (autoApprove) console.log(`Auto-approve: ${autoApprove ? "YES" : "NO"}`);
  if (autoSync) console.log(`Auto-sync: ${autoSync ? "YES" : "NO"}`);
  console.log();

  const result = await learnFromConversation(conversationId, {
    autoApprove,
    autoSync,
  });

  console.log(`\nResult:`);
  console.log(`  ✅ Success: ${result.success}`);
  console.log(`  📊 Quality Score: ${(result.qualityScore * 100).toFixed(1)}%`);
  console.log(`  📝 Q&A Created: ${result.qaPairsCreated}`);
  console.log(`  ✅ Auto-Approved: ${result.qaPairsApproved}`);
  console.log(`  🔗 Synced to KB: ${result.qaPairsSynced}`);
  console.log(`  💬 Message: ${result.message}\n`);
}

async function learnFromTimeRange(days: number, autoApprove: boolean, autoSync: boolean) {
  console.log(`\n🎓 Learning from conversations from last ${days} days\n`);

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const conversations = await prisma.conversation.findMany({
    where: {
      startedAt: { gte: since },
      metadata: {
        wasRedirected: false,
        learningEligible: false, // Not yet learned
      },
    },
    select: { id: true },
    orderBy: { startedAt: "desc" },
    take: 100,
  });

  if (conversations.length === 0) {
    console.log("❌ No eligible conversations found");
    return;
  }

  console.log(`Found ${conversations.length} eligible conversations`);
  if (autoApprove) console.log(`Auto-approve: YES`);
  if (autoSync) console.log(`Auto-sync: YES`);
  console.log();

  const conversationIds = conversations.map((c: any) => c.id);
  const result = await learnFromConversations(conversationIds, {
    autoApprove,
    autoSync,
  });

  console.log(`\nResults:`);
  console.log(`  📊 Total Processed: ${result.totalProcessed}`);
  console.log(`  ✅ Successful: ${result.successful}`);
  console.log(`  ❌ Failed: ${result.failed}`);
  console.log(`  📝 Total Q&A Created: ${result.totalQAPairs}`);
  console.log(`  ✅ Auto-Approved: ${result.totalApproved}`);
  console.log(`  🔗 Synced to KB: ${result.totalSynced}\n`);

  if (result.failed > 0) {
    console.log("Failed conversations:");
    result.results
      .filter((r: any) => !r.success)
      .forEach((r: any) => {
        console.log(`  - ${r.conversationId}: ${r.error}`);
      });
  }
}

async function reviewPendingQA() {
  console.log(`\n📋 Pending Q&A Pairs for Review\n`);

  const pending = await getLearnedQAPairs({
    status: "PENDING",
    limit: 20,
  });

  if (pending.length === 0) {
    console.log("✅ No pending Q&A pairs - all clear!");
    return;
  }

  console.log(`Found ${pending.length} pending Q&A pairs:\n`);

  for (let i = 0; i < pending.length; i++) {
    const qa = pending[i];
    console.log(`${i + 1}. [${qa.category}] Score: ${(qa.qualityScore * 100).toFixed(1)}% | Confidence: ${(qa.confidenceScore * 100).toFixed(1)}%`);
    console.log(`   Q: ${qa.question}`);
    console.log(`   A: ${qa.answer.substring(0, 100)}${qa.answer.length > 100 ? "..." : ""}`);
    console.log(`   ID: ${qa.id}`);
    console.log();
  }

  console.log("To approve: npx tsx scripts/manual-learn.ts --approve-id <qa-id>");
  console.log("To reject: npx tsx scripts/manual-learn.ts --reject-id <qa-id>");
}

async function showStats() {
  console.log(`\n📊 Learning Statistics\n`);

  const stats = await getLearnedQAStats();

  console.log(`Total Q&A Pairs:        ${stats.total}`);
  console.log(`  - Pending Review:     ${stats.pending}`);
  console.log(`  - Approved:           ${stats.approved}`);
  console.log(`  - Synced to KB:       ${stats.synced}`);
  console.log(`  - Rejected:           ${stats.rejected}`);
  console.log();
  console.log(`Average Quality Score:  ${(stats.avgQualityScore * 100).toFixed(1)}%`);
  console.log(`Average Confidence:     ${(stats.avgConfidenceScore * 100).toFixed(1)}%`);
  console.log(`Learning-Eligible Conversations: ${stats.eligibleConversations}\n`);
}

main();
