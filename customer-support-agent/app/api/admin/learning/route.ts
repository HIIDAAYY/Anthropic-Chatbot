/**
 * Admin Learning API
 * Endpoints for managing the auto-learning system
 *
 * GET    /api/admin/learning/candidates  - List eligible conversations
 * POST   /api/admin/learning/extract     - Extract Q&A from conversations
 * GET    /api/admin/learning/pending     - Get pending Q&A pairs
 * POST   /api/admin/learning/approve     - Approve Q&A pairs
 * POST   /api/admin/learning/reject      - Reject Q&A pairs
 * POST   /api/admin/learning/sync        - Sync approved Q&A to Pinecone
 * GET    /api/admin/learning/stats       - Get learning statistics
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getLearnedQAPairs,
  getLearnedQAStats,
  approveQAPair,
  rejectQAPair,
  prisma,
} from "@/app/lib/db-service";
import {
  learnFromConversation,
  learnFromConversations,
  syncToKnowledgeBase,
} from "@/app/lib/learning-service";

// Simple API key protection (optional)
// Set LEARNING_ADMIN_KEY in .env.local for production
function checkAuth(req: NextRequest): boolean {
  const adminKey = process.env.LEARNING_ADMIN_KEY;
  if (!adminKey) return true; // No auth required if key not set

  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${adminKey}`;
}

/**
 * GET /api/admin/learning/candidates
 * List conversations eligible for learning
 */
export async function GET(req: NextRequest) {
  try {
    if (!checkAuth(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    // Get pending Q&A pairs
    if (action === "pending") {
      const limit = parseInt(searchParams.get("limit") || "50");
      const offset = parseInt(searchParams.get("offset") || "0");

      const qaPairs = await getLearnedQAPairs({
        status: "PENDING",
        limit,
        offset,
      });

      return NextResponse.json({
        success: true,
        count: qaPairs.length,
        qaPairs: qaPairs.map((qa) => ({
          id: qa.id,
          conversationId: qa.conversationId,
          question: qa.question,
          answer: qa.answer,
          category: qa.category,
          qualityScore: qa.qualityScore,
          confidenceScore: qa.confidenceScore,
          extractedAt: qa.extractedAt,
          customerPhone: qa.conversation.customer.phoneNumber,
        })),
      });
    }

    // Get statistics
    if (action === "stats") {
      const stats = await getLearnedQAStats();
      return NextResponse.json({ success: true, stats });
    }

    // Default: Get candidate conversations
    const days = parseInt(searchParams.get("days") || "7");
    const limit = parseInt(searchParams.get("limit") || "50");
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const conversations = await prisma.conversation.findMany({
      where: {
        startedAt: { gte: since },
        metadata: {
          wasRedirected: false,
          learningEligible: false, // Not yet learned
        },
      },
      include: {
        customer: {
          select: {
            phoneNumber: true,
          },
        },
        metadata: {
          select: {
            userMood: true,
            categories: true,
            contextUsed: true,
          },
        },
        messages: {
          select: { id: true },
        },
      },
      orderBy: { startedAt: "desc" },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      count: conversations.length,
      conversations: conversations.map((c) => ({
        id: c.id,
        customerPhone: c.customer.phoneNumber,
        messageCount: c.messages.length,
        mood: c.metadata?.userMood,
        categories: c.metadata?.categories,
        contextUsed: c.metadata?.contextUsed,
        startedAt: c.startedAt,
      })),
    });
  } catch (error) {
    console.error("Error in GET /api/admin/learning:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/learning
 * Handle various learning operations
 */
export async function POST(req: NextRequest) {
  try {
    if (!checkAuth(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    // Extract Q&A from conversations
    if (action === "extract") {
      const { conversationIds, autoApprove, autoSync } = body;

      if (!conversationIds || !Array.isArray(conversationIds)) {
        return NextResponse.json(
          { error: "conversationIds array required" },
          { status: 400 }
        );
      }

      const result = await learnFromConversations(conversationIds, {
        autoApprove: autoApprove || false,
        autoSync: autoSync || false,
      });

      return NextResponse.json({ success: true, result });
    }

    // Approve Q&A pair
    if (action === "approve") {
      const { qaPairIds, reviewedBy, notes } = body;

      if (!qaPairIds || !Array.isArray(qaPairIds)) {
        return NextResponse.json(
          { error: "qaPairIds array required" },
          { status: 400 }
        );
      }

      const results = [];
      for (const id of qaPairIds) {
        const qaPair = await approveQAPair(id, reviewedBy || "admin", notes);
        results.push(qaPair);
      }

      return NextResponse.json({
        success: true,
        approved: results.length,
        qaPairs: results,
      });
    }

    // Reject Q&A pair
    if (action === "reject") {
      const { qaPairIds, reviewedBy, reason } = body;

      if (!qaPairIds || !Array.isArray(qaPairIds)) {
        return NextResponse.json(
          { error: "qaPairIds array required" },
          { status: 400 }
        );
      }

      if (!reason) {
        return NextResponse.json(
          { error: "reason required for rejection" },
          { status: 400 }
        );
      }

      const results = [];
      for (const id of qaPairIds) {
        const qaPair = await rejectQAPair(id, reviewedBy || "admin", reason);
        results.push(qaPair);
      }

      return NextResponse.json({
        success: true,
        rejected: results.length,
        qaPairs: results,
      });
    }

    // Sync approved Q&A to Pinecone
    if (action === "sync") {
      const { qaPairIds } = body;

      let qaPairsToSync = [];

      if (qaPairIds && Array.isArray(qaPairIds)) {
        // Sync specific Q&A pairs
        qaPairsToSync = qaPairIds;
      } else {
        // Sync all approved Q&A pairs
        const approved = await getLearnedQAPairs({
          status: "APPROVED",
          limit: 100,
        });
        qaPairsToSync = approved.map((qa) => qa.id);
      }

      const results = {
        total: qaPairsToSync.length,
        synced: 0,
        failed: 0,
        errors: [] as any[],
      };

      for (const id of qaPairsToSync) {
        try {
          await syncToKnowledgeBase(id);
          results.synced++;
        } catch (error) {
          results.failed++;
          results.errors.push({ id, error: (error as Error).message });
        }
      }

      return NextResponse.json({ success: true, results });
    }

    return NextResponse.json(
      { error: "Invalid action. Use: extract, approve, reject, or sync" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in POST /api/admin/learning:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
