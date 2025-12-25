/**
 * Auto-Learning Cron Job Endpoint
 * POST /api/admin/learning/auto-learn
 *
 * This endpoint should be called by a cron job (e.g., Vercel Cron, GitHub Actions)
 * to automatically learn from new conversations on a scheduled basis.
 *
 * Recommended schedule: Daily at 2 AM
 *
 * Setup with Vercel Cron:
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/admin/learning/auto-learn",
 *     "schedule": "0 2 * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { learnFromConversations } from "@/app/lib/learning-service";
import { prisma } from "@/app/lib/db-service";

// Configuration
const DEFAULT_LOOKBACK_DAYS = 7; // Look back 7 days
const QUALITY_THRESHOLD = 0.7; // Minimum quality score
const AUTO_APPROVE_CONFIDENCE = 0.9; // Auto-approve if confidence >= 90%
const MAX_CONVERSATIONS_PER_RUN = 100; // Limit to prevent timeouts

// Simple API key protection
function checkAuth(req: NextRequest): boolean {
  const adminKey = process.env.LEARNING_ADMIN_KEY;
  if (!adminKey) return true; // No auth required if key not set

  const authHeader = req.headers.get("authorization");
  const cronSecret = req.headers.get("x-vercel-cron-secret");

  // Accept either admin key or Vercel cron secret
  return (
    authHeader === `Bearer ${adminKey}` ||
    Boolean(cronSecret && cronSecret === process.env.CRON_SECRET)
  );
}

/**
 * POST /api/admin/learning/auto-learn
 * Automatically learn from recent conversations
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    console.log("🤖 Auto-learning job started");

    if (!checkAuth(req)) {
      console.log("❌ Unauthorized auto-learn request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body for optional configuration
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // No body provided, use defaults
    }

    const lookbackDays = body.lookbackDays || DEFAULT_LOOKBACK_DAYS;
    const autoApprove = body.autoApprove !== false; // Default: true
    const autoSync = body.autoSync !== false; // Default: true
    const maxConversations = body.maxConversations || MAX_CONVERSATIONS_PER_RUN;

    console.log(`📅 Looking back ${lookbackDays} days`);
    console.log(`🤖 Auto-approve: ${autoApprove ? "YES" : "NO"}`);
    console.log(`🔗 Auto-sync: ${autoSync ? "YES" : "NO"}`);

    // Find eligible conversations
    const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

    const conversations = await prisma.conversation.findMany({
      where: {
        startedAt: { gte: since },
        status: { in: ["ACTIVE", "ENDED"] }, // Include both active and ended
        metadata: {
          wasRedirected: false, // Not redirected to agent
          learningEligible: false, // Not yet learned from
        },
      },
      include: {
        messages: {
          select: { id: true },
        },
      },
      orderBy: { startedAt: "desc" },
      take: maxConversations,
    });

    console.log(`📊 Found ${conversations.length} eligible conversations`);

    if (conversations.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No eligible conversations found",
        processed: 0,
        qaPairsCreated: 0,
        qaPairsApproved: 0,
        qaPairsSynced: 0,
        duration: Date.now() - startTime,
      });
    }

    // Filter conversations by message count (3-30 messages)
    const filteredConversations = conversations.filter(
      (c) => c.messages.length >= 3 && c.messages.length <= 30
    );

    console.log(
      `📊 After filtering: ${filteredConversations.length} conversations (3-30 messages)`
    );

    if (filteredConversations.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No conversations meet message count criteria (3-30)",
        processed: 0,
        qaPairsCreated: 0,
        qaPairsApproved: 0,
        qaPairsSynced: 0,
        duration: Date.now() - startTime,
      });
    }

    // Process conversations
    const conversationIds = filteredConversations.map((c) => c.id);
    const result = await learnFromConversations(conversationIds, {
      autoApprove,
      autoSync,
    });

    const duration = Date.now() - startTime;

    console.log(`✅ Auto-learning completed in ${duration}ms`);
    console.log(`📊 Processed: ${result.totalProcessed}`);
    console.log(`✅ Successful: ${result.successful}`);
    console.log(`❌ Failed: ${result.failed}`);
    console.log(`📝 Q&A Created: ${result.totalQAPairs}`);
    console.log(`✅ Auto-Approved: ${result.totalApproved}`);
    console.log(`🔗 Synced to KB: ${result.totalSynced}`);

    // Prepare summary for response
    const summary = {
      success: true,
      message: "Auto-learning completed",
      timestamp: new Date().toISOString(),
      config: {
        lookbackDays,
        autoApprove,
        autoSync,
        maxConversations,
      },
      stats: {
        candidateConversations: conversations.length,
        filteredConversations: filteredConversations.length,
        processed: result.totalProcessed,
        successful: result.successful,
        failed: result.failed,
        qaPairsCreated: result.totalQAPairs,
        qaPairsApproved: result.totalApproved,
        qaPairsSynced: result.totalSynced,
      },
      duration,
    };

    // Log failed conversations if any
    if (result.failed > 0) {
      console.log("❌ Failed conversations:");
      result.results
        .filter((r) => !r.success)
        .forEach((r) => {
          console.log(`  - ${r.conversationId}: ${r.error}`);
        });
    }

    return NextResponse.json(summary);
  } catch (error) {
    console.error("💥 Auto-learning job failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
        duration: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/learning/auto-learn
 * Get status/info about auto-learning
 */
export async function GET(req: NextRequest) {
  try {
    const { getLearnedQAStats } = await import("@/app/lib/db-service");
    const stats = await getLearnedQAStats();

    return NextResponse.json({
      success: true,
      message: "Auto-learning endpoint is active",
      config: {
        defaultLookbackDays: DEFAULT_LOOKBACK_DAYS,
        qualityThreshold: QUALITY_THRESHOLD,
        autoApproveConfidence: AUTO_APPROVE_CONFIDENCE,
        maxConversationsPerRun: MAX_CONVERSATIONS_PER_RUN,
      },
      stats,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
