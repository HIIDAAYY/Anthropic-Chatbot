/**
 * Learning Service
 * Core logic for auto-learning from successful customer support conversations
 *
 * This service:
 * 1. Evaluates conversation quality using Claude
 * 2. Extracts Q&A pairs from high-quality conversations
 * 3. Checks for duplicates in knowledge base
 * 4. Syncs approved Q&A to Pinecone
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  getConversationById,
  createLearnedQAPair,
  markConversationAsLearned,
  updateQAPairStatus,
} from "./db-service";
import { queryPineconeWithText, upsertTexts } from "@/lib/pinecone";
import { randomUUID } from "crypto";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Quality threshold for auto-learning
const QUALITY_THRESHOLD = 0.7;
const AUTO_APPROVE_CONFIDENCE = 0.9;
const DUPLICATE_SIMILARITY_THRESHOLD = 0.85;

/**
 * Evaluate conversation quality to determine if it's suitable for learning
 * Returns a score from 0-1 and eligibility boolean
 */
export async function evaluateConversationQuality(conversationId: string): Promise<{
  score: number;
  eligible: boolean;
  reason: string;
  scores: {
    resolution: number;
    clarity: number;
    accuracy: number;
    reusability: number;
    professionalism: number;
  };
}> {
  try {
    // Get conversation with full context
    const conversation = await getConversationById(conversationId);

    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    // Basic eligibility checks before calling Claude
    const metadata = conversation.metadata;
    const messageCount = conversation.messages.length;

    // Pre-screening criteria
    if (metadata?.wasRedirected) {
      return {
        score: 0,
        eligible: false,
        reason: "Conversation was redirected to human agent",
        scores: {
          resolution: 0,
          clarity: 0,
          accuracy: 0,
          reusability: 0,
          professionalism: 0,
        },
      };
    }

    if (messageCount < 3 || messageCount > 30) {
      return {
        score: 0,
        eligible: false,
        reason: `Message count (${messageCount}) outside ideal range (3-30)`,
        scores: {
          resolution: 0,
          clarity: 0,
          accuracy: 0,
          reusability: 0,
          professionalism: 0,
        },
      };
    }

    // Format messages for Claude
    const formattedMessages = conversation.messages
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n\n");

    // Call Claude to evaluate quality
    const prompt = `You are evaluating a customer support conversation to determine if it should be used for training the chatbot's knowledge base.

Conversation Context:
- Status: ${conversation.status}
- Messages: ${messageCount}
- User Mood: ${metadata?.userMood || "unknown"}
- Categories: ${metadata?.categories?.join(", ") || "none"}
- Redirected: ${metadata?.wasRedirected || false}
- Context Used: ${metadata?.contextUsed || false}

Messages:
${formattedMessages}

Evaluate this conversation on the following criteria (0-1 score for each):
1. Resolution Quality: Was the issue clearly resolved? Did the bot provide a complete answer?
2. Answer Clarity: Were responses clear, well-structured, and easy to understand?
3. Factual Accuracy: Are answers factually correct based on the conversation context?
4. Reusability: Would this Q&A help future customers with similar questions?
5. Professionalism: Is the tone appropriate, respectful, and professional?

Consider these red flags (should lower scores):
- Incomplete answers or unresolved questions
- Confusing or contradictory information
- Off-topic responses
- Inappropriate language or tone
- Bot hallucinating or making up information

Return ONLY a raw JSON object (no markdown, no code blocks):
{
  "overallScore": 0.0-1.0,
  "eligible": boolean,
  "reason": "brief explanation",
  "scores": {
    "resolution": 0.0-1.0,
    "clarity": 0.0-1.0,
    "accuracy": 0.0-1.0,
    "reusability": 0.0-1.0,
    "professionalism": 0.0-1.0
  }
}`;

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001", // Use Haiku for cost-effectiveness
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    // Parse Claude's response
    let textContent = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    // Strip markdown code blocks if present
    textContent = textContent.replace(/```json\n?|\n?```/g, "").trim();

    const result = JSON.parse(textContent);

    console.log(`✅ Evaluated conversation ${conversationId}: score=${result.overallScore}`);

    return {
      ...result,
      score: result.overallScore,
    };
  } catch (error) {
    console.error("Error evaluating conversation quality:", error);
    throw error;
  }
}

/**
 * Extract Q&A pairs from a conversation using Claude
 */
export async function extractQAPairs(conversationId: string): Promise<
  Array<{
    question: string;
    answer: string;
    category: string;
    confidence: number;
    sourceMessageIds: string[];
  }>
> {
  try {
    // Get conversation with full context
    const conversation = await getConversationById(conversationId);

    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    // Format messages for Claude
    const messagesWithIds = conversation.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
    }));

    const formattedMessages = messagesWithIds
      .map((m) => `[${m.id}] ${m.role.toUpperCase()}: ${m.content}`)
      .join("\n\n");

    // Call Claude to extract Q&A pairs
    const prompt = `Extract reusable Q&A pairs from this customer support conversation.

Conversation Messages:
${formattedMessages}

Instructions:
1. Identify clear question-answer patterns
2. Combine multi-turn exchanges into single Q&A if they're related
3. Rephrase questions to be more general and searchable (remove customer-specific details)
4. Ensure answers are complete and standalone
5. Extract 1-5 Q&A pairs (quality over quantity)
6. Include message IDs that were used to create each Q&A

Categories to choose from:
- payment: Payment methods, billing, invoices
- shipping: Delivery, tracking, shipping methods
- product: Product information, features, availability
- account: User accounts, login, registration
- order: Order status, cancellation, returns
- general: General inquiries, FAQs
- clinic: For clinic-related conversations (treatments, appointments, pricing)

Return ONLY a raw JSON array (no markdown, no code blocks):
[
  {
    "question": "General version of customer's question",
    "answer": "Complete, standalone answer",
    "category": "payment|shipping|product|account|order|general|clinic",
    "confidence": 0.0-1.0,
    "sourceMessageIds": ["msg_id1", "msg_id2"]
  }
]

Example:
[
  {
    "question": "Berapa lama pengiriman ke Jakarta?",
    "answer": "Untuk pengiriman ke Jakarta, kami menawarkan same-day delivery via GoSend/GrabExpress jika order sebelum jam 14:00. Untuk pengiriman regular, estimasi 2-3 hari kerja.",
    "category": "shipping",
    "confidence": 0.95,
    "sourceMessageIds": ["clm123", "clm124"]
  }
]

If no suitable Q&A pairs can be extracted, return an empty array [].`;

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    // Parse Claude's response
    let textContent = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    // Strip markdown code blocks if present
    textContent = textContent.replace(/```json\n?|\n?```/g, "").trim();

    let result = JSON.parse(textContent);

    // Ensure result is an array
    if (!Array.isArray(result)) {
      result = [];
    }

    console.log(`✅ Extracted ${result.length} Q&A pairs from conversation ${conversationId}`);

    return result;
  } catch (error) {
    console.error("Error extracting Q&A pairs:", error);
    throw error;
  }
}

/**
 * Check if a question is a duplicate in the knowledge base
 */
export async function checkDuplicate(question: string): Promise<{
  isDuplicate: boolean;
  similarity: number;
  existingQuestion?: string;
}> {
  try {
    // Query Pinecone with the question
    const results = await queryPineconeWithText(question, 3);

    if (!results.matches || results.matches.length === 0) {
      return { isDuplicate: false, similarity: 0 };
    }

    // Check if top result exceeds similarity threshold
    const topMatch = results.matches[0];
    const similarity = topMatch.score || 0;

    if (similarity >= DUPLICATE_SIMILARITY_THRESHOLD) {
      return {
        isDuplicate: true,
        similarity,
        existingQuestion: topMatch.metadata?.question as string,
      };
    }

    return { isDuplicate: false, similarity };
  } catch (error) {
    console.error("Error checking duplicate:", error);
    // On error, assume not duplicate to avoid blocking learning
    return { isDuplicate: false, similarity: 0 };
  }
}

/**
 * Sync a Q&A pair to Pinecone knowledge base
 */
export async function syncToKnowledgeBase(qaPairId: string): Promise<void> {
  try {
    const { getLearnedQAPairById } = await import("./db-service");
    const qaPair = await getLearnedQAPairById(qaPairId);

    if (!qaPair) {
      throw new Error(`Q&A pair not found: ${qaPairId}`);
    }

    // Generate Pinecone ID
    const pineconeId = `learned_${randomUUID()}`;

    // Combine question and answer for embedding
    const text = `${qaPair.question}\n\n${qaPair.answer}`;

    // Upsert to Pinecone
    await upsertTexts([
      {
        id: pineconeId,
        text,
        metadata: {
          question: qaPair.question,
          answer: qaPair.answer,
          category: qaPair.category,
          source: "learned", // Tag as learned from conversations
          learnedFrom: qaPair.conversationId,
          qualityScore: qaPair.qualityScore,
          confidenceScore: qaPair.confidenceScore,
          createdAt: qaPair.createdAt.toISOString(),
        },
      },
    ]);

    // Update database with Pinecone ID
    await updateQAPairStatus(qaPairId, "SYNCED", pineconeId);

    console.log(`✅ Synced Q&A pair ${qaPairId} to Pinecone as ${pineconeId}`);
  } catch (error) {
    console.error("Error syncing to knowledge base:", error);
    throw error;
  }
}

/**
 * Process a single conversation for learning
 * Main workflow:
 * 1. Evaluate quality
 * 2. Extract Q&A if quality is good
 * 3. Check for duplicates
 * 4. Auto-approve high-confidence Q&A
 * 5. Sync if auto-approved
 */
export async function learnFromConversation(
  conversationId: string,
  options: {
    autoApprove?: boolean;
    autoSync?: boolean;
  } = {}
): Promise<{
  success: boolean;
  qualityScore: number;
  qaPairsCreated: number;
  qaPairsApproved: number;
  qaPairsSynced: number;
  message: string;
}> {
  try {
    console.log(`🎓 Starting learning from conversation: ${conversationId}`);

    // Step 1: Evaluate quality
    const evaluation = await evaluateConversationQuality(conversationId);

    if (!evaluation.eligible || evaluation.score < QUALITY_THRESHOLD) {
      console.log(`⏭️  Skipping conversation ${conversationId}: ${evaluation.reason}`);
      return {
        success: false,
        qualityScore: evaluation.score,
        qaPairsCreated: 0,
        qaPairsApproved: 0,
        qaPairsSynced: 0,
        message: `Not eligible for learning: ${evaluation.reason}`,
      };
    }

    // Mark conversation as learned
    await markConversationAsLearned(conversationId, evaluation.score);

    // Step 2: Extract Q&A pairs
    const extractedQAs = await extractQAPairs(conversationId);

    if (extractedQAs.length === 0) {
      console.log(`⏭️  No Q&A pairs extracted from conversation ${conversationId}`);
      return {
        success: true,
        qualityScore: evaluation.score,
        qaPairsCreated: 0,
        qaPairsApproved: 0,
        qaPairsSynced: 0,
        message: "No suitable Q&A pairs found",
      };
    }

    let created = 0;
    let approved = 0;
    let synced = 0;

    // Step 3: Process each Q&A pair
    for (const qa of extractedQAs) {
      // Check for duplicates
      const dupCheck = await checkDuplicate(qa.question);

      if (dupCheck.isDuplicate) {
        console.log(
          `⏭️  Skipping duplicate Q&A: "${qa.question.substring(0, 50)}..." (similarity: ${dupCheck.similarity})`
        );
        continue;
      }

      // Create Q&A pair in database
      const qaPair = await createLearnedQAPair({
        conversationId,
        sourceMessageIds: qa.sourceMessageIds,
        question: qa.question,
        answer: qa.answer,
        category: qa.category,
        qualityScore: evaluation.score,
        confidenceScore: qa.confidence,
      });

      created++;

      // Auto-approve high-confidence Q&A if enabled
      if (options.autoApprove && qa.confidence >= AUTO_APPROVE_CONFIDENCE) {
        const { approveQAPair } = await import("./db-service");
        await approveQAPair(qaPair.id, "auto-learning-system", "Auto-approved (high confidence)");
        approved++;

        // Auto-sync if enabled
        if (options.autoSync) {
          await syncToKnowledgeBase(qaPair.id);
          synced++;
        }
      }
    }

    console.log(`✅ Learning complete for ${conversationId}: created=${created}, approved=${approved}, synced=${synced}`);

    return {
      success: true,
      qualityScore: evaluation.score,
      qaPairsCreated: created,
      qaPairsApproved: approved,
      qaPairsSynced: synced,
      message: `Created ${created} Q&A pairs, ${approved} auto-approved, ${synced} synced`,
    };
  } catch (error) {
    console.error("Error in learnFromConversation:", error);
    throw error;
  }
}

/**
 * Batch process multiple conversations
 */
export async function learnFromConversations(
  conversationIds: string[],
  options: {
    autoApprove?: boolean;
    autoSync?: boolean;
  } = {}
): Promise<{
  totalProcessed: number;
  successful: number;
  failed: number;
  totalQAPairs: number;
  totalApproved: number;
  totalSynced: number;
  results: Array<{
    conversationId: string;
    success: boolean;
    error?: string;
  }>;
}> {
  const summary = {
    totalProcessed: 0,
    successful: 0,
    failed: 0,
    totalQAPairs: 0,
    totalApproved: 0,
    totalSynced: 0,
    results: [] as Array<{ conversationId: string; success: boolean; error?: string }>,
  };

  for (const conversationId of conversationIds) {
    try {
      const result = await learnFromConversation(conversationId, options);

      summary.totalProcessed++;
      summary.successful++;
      summary.totalQAPairs += result.qaPairsCreated;
      summary.totalApproved += result.qaPairsApproved;
      summary.totalSynced += result.qaPairsSynced;
      summary.results.push({ conversationId, success: true });
    } catch (error) {
      summary.totalProcessed++;
      summary.failed++;
      summary.results.push({
        conversationId,
        success: false,
        error: (error as Error).message,
      });
    }
  }

  return summary;
}
