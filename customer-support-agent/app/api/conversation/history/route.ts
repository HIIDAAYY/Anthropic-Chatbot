/**
 * Conversation History API Endpoint
 * GET /api/conversation/history?sessionId=...
 * Returns the conversation history for a given session
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getOrCreateCustomer, getActiveConversation } from "@/app/lib/db-service";
import { prisma } from "@/app/lib/db-service";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Missing sessionId parameter" },
        { status: 400 }
      );
    }

    console.log("📚 Loading conversation history for session:", sessionId);

    // Get or create customer with web session identifier
    const customer = await getOrCreateCustomer(`web_${sessionId}`);

    // Get active conversation
    const conversation = await getActiveConversation(customer.id);

    if (!conversation) {
      console.log("📭 No active conversation found for customer");
      return NextResponse.json({
        success: true,
        messages: [],
      });
    }

    // Get all messages in the conversation
    const dbMessages = await prisma.message.findMany({
      where: {
        conversationId: conversation.id,
      },
      orderBy: {
        timestamp: "asc",
      },
    });

    console.log(`✅ Retrieved ${dbMessages.length} messages from database`);

    // Convert database messages to frontend format
    const messages = dbMessages.map((msg) => {
      // Try to parse the content if it's JSON (for assistant messages)
      let parsedContent = msg.content;
      if (msg.role === "assistant") {
        try {
          const parsed = JSON.parse(msg.content);
          // Ensure it has all required fields for the MessageContent component
          parsedContent = JSON.stringify({
            response: parsed.response || msg.content,
            thinking: parsed.thinking || "",
            user_mood: parsed.user_mood || "neutral",
            suggested_questions: parsed.suggested_questions || [],
            debug: parsed.debug || { context_used: false },
            matched_categories: parsed.matched_categories || [],
            redirect_to_agent: parsed.redirect_to_agent || {
              should_redirect: false,
            },
          });
        } catch (e) {
          // If not JSON, wrap in the expected format
          parsedContent = JSON.stringify({
            response: msg.content,
            thinking: "",
            user_mood: "neutral",
            suggested_questions: [],
            debug: { context_used: false },
            matched_categories: [],
            redirect_to_agent: { should_redirect: false },
          });
        }
      }

      return {
        id: msg.id,
        role: msg.role,
        content: parsedContent,
      };
    });

    return NextResponse.json({
      success: true,
      messages,
      conversationId: conversation.id,
      customerId: customer.id,
    });
  } catch (error) {
    console.error("❌ Conversation history API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve conversation history",
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
