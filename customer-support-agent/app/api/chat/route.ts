import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { retrieveContext, RAGSource, detectKnowledgeBase } from "@/app/lib/utils";
import crypto from "crypto";
import customerSupportCategories from "@/app/lib/customer_support_categories.json";
import {
  RAGError,
  ClaudeAPIError,
  logError,
  retryWithBackoff,
  getEmergencyResponse,
} from "@/app/lib/error-handler";
import {
  prisma,
  getOrCreateCustomer,
  getActiveConversation,
  createConversation,
  addMessage,
  addMessages,
  updateConversationMetadata,
} from "@/app/lib/db-service";
import {
  BOT_TOOLS,
  extractToolUse,
  executeToolUse,
  formatToolResults,
} from "@/app/lib/bot-tools";
import { responseCache } from "@/app/lib/response-cache";
import { getSimpleResponse } from "@/app/lib/simple-responses";
import { logger } from "@/app/lib/logger";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Debug message helper function
// Input: message string and optional data object
// Output: JSON string with message, sanitized data, and timestamp
const debugMessage = (msg: string, data: any = {}) => {
  console.log(msg, data);
  const timestamp = new Date().toISOString().replace(/[^\x20-\x7E]/g, "");
  const safeData = JSON.parse(JSON.stringify(data));
  return JSON.stringify({ msg, data: safeData, timestamp });
};

// Define the schema for the AI response using Zod
// This ensures type safety and validation for the AI's output
// Valid user mood values
const VALID_USER_MOODS = [
  "positive",
  "neutral",
  "negative",
  "curious",
  "frustrated",
  "confused",
  "concerned",
  "interested",
  "worried",
  "angry",
  "happy",
  "considering",
] as const;

const responseSchema = z.object({
  response: z.string(),
  thinking: z.string(),
  user_mood: z.string().transform((val) => {
    // Check if the mood is in our valid list
    if (VALID_USER_MOODS.includes(val as any)) {
      return val as (typeof VALID_USER_MOODS)[number];
    }
    // Map common unknown moods to valid ones
    const moodMapping: Record<string, (typeof VALID_USER_MOODS)[number]> = {
      "sad": "negative",
      "upset": "negative",
      "annoyed": "frustrated",
      "excited": "positive",
      "enthusiastic": "positive",
      "skeptical": "curious",
      "uncertain": "confused",
      "anxious": "worried",
      "disappointed": "negative",
      "hopeful": "positive",
      "impatient": "frustrated",
    };
    return moodMapping[val.toLowerCase()] || "neutral";
  }),
  suggested_questions: z.array(z.string()),
  debug: z.object({
    context_used: z.boolean(),
  }),
  matched_categories: z.array(z.string()).optional(),
  tools_used: z.array(z.string()).optional(),
  redirect_to_agent: z
    .object({
      should_redirect: z.boolean(),
      reason: z.string().optional(),
    })
    .optional(),
});

// Helper function to sanitize header values
// Input: string value
// Output: sanitized string (ASCII characters only)
function sanitizeHeaderValue(value: string): string {
  return value.replace(/[^\x00-\x7F]/g, "");
}

// Helper function to get clinic name by ID
// Input: clinicId string
// Output: full clinic name for system prompt
function getClinicNameById(clinicId: string): string {
  const clinicMap: Record<string, string> = {
    "glow-clinic": "Klinik Glow Aesthetics",
    "airin-skin": "Airin Skin Clinic",
    "beautylosophy-clinic": "The Clinic Beautylosophy",
    "beyoutiful-clinic": "Beyoutiful Clinic",
    "b-clinic": "B Clinic Multi Medika",
    "click-house": "Click House",
    "derma-express": "Derma Express",
    "dermies-max": "Dermies Max",
    "euroskinlab": "Euroskinlab",
    "gloskin-aesthetic": "Gloskin Aesthetic",
    "jakarta-aesthetic": "Jakarta Aesthetic Clinic",
    "jasper-skincare": "Jasper Skincare",
    "kusuma-beauty": "Kusuma Beauty Clinic",
    "maharis-clinic": "Maharis Clinic",
    "nmw-skincare": "NMW Skin Care",
    "ovela-clinic": "Ovela Clinic",
    "promec-clinic": "Promec Clinic",
    "queen-plastic": "Queen Plastic Surgery",
    "sozo-skin": "Sozo Skin Clinic",
    "youth-beauty": "Youth & Beauty Clinic",
    "zap-premiere": "ZAP Premiere",
  };
  return clinicMap[clinicId] || "Klinik Kecantikan & Gigi (Beauty & Dental Clinic)";
}

// Helper function to log timestamps for performance measurement
// Input: label string and start time
// Output: Logs the duration for the labeled operation
const logTimestamp = (label: string, start: number) => {
  const timestamp = new Date().toISOString();
  const time = ((performance.now() - start) / 1000).toFixed(2);
  console.log(`⏱️ [${timestamp}] ${label}: ${time}s`);
};

// Main POST request handler
export async function POST(req: Request) {
  const apiStart = performance.now();
  const measureTime = (label: string) => logTimestamp(label, apiStart);

  // Extract data from the request body
  let { messages, model, knowledgeBaseId, sessionId, businessContext, customerId, clinicId } = await req.json();

  // 🔑 CLINIC CONTEXT: Use provided clinicId or default to "glow-clinic"
  // This ensures bot always has a clinic context for booking operations
  // Example: clinicId = "glow-clinic" → Bot only knows about Glow Aesthetics
  if (!clinicId) {
    // Default to glow-clinic when no clinicId is specified
    clinicId = "glow-clinic";
    console.log(`🏥 No clinicId specified - defaulting to: ${clinicId}`);
  }

  console.log(`🏥 CLINIC CONTEXT: ${clinicId} (single-tenant mode)`);
  // Override knowledgeBaseId to force this specific clinic
  knowledgeBaseId = { kb: "clinic", clinicId: clinicId };
  console.log(`🔒 Data isolation enabled - Bot restricted to ${clinicId} only`);

  // Set default model if not provided
  model = model || 'claude-haiku-4-5-20251001';

  // Validate messages array
  if (!messages || messages.length === 0) {
    logger.error("No messages provided in request");
    return new Response(
      JSON.stringify({
        response: "Maaf, tidak ada pesan yang diterima.",
        thinking: "No messages in request",
        user_mood: "confused",
        suggested_questions: [],
        debug: { context_used: false },
        redirect_to_agent: { should_redirect: false },
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const latestMessage = messages[messages.length - 1]?.content || '';

  if (!latestMessage) {
    logger.error("Latest message has no content");
    return new Response(
      JSON.stringify({
        response: "Maaf, pesan Anda tidak dapat dibaca.",
        thinking: "Latest message has no content",
        user_mood: "confused",
        suggested_questions: [],
        debug: { context_used: false },
        redirect_to_agent: { should_redirect: false },
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Validate sessionId for database persistence
  if (!sessionId) {
    logger.warn("No sessionId provided - messages will not be persisted");
  }

  console.log("📝 Latest Query:", latestMessage);
  measureTime("User Input Received");

  // 💾 CHECK CACHE: Try to get cached response first
  const cachedResponse = responseCache.get(clinicId, latestMessage);
  if (cachedResponse) {
    console.log('💰 Using cached response - NO API CALL');

    // Still save to DB for conversation history
    if (sessionId) {
      try {
        const customerIdentifier = `web_${sessionId}`;
        const customer = await getOrCreateCustomer(customerIdentifier);
        let conversation = await getActiveConversation(customer.id);
        if (!conversation) {
          conversation = await createConversation(customer.id);
        }
        await addMessages([
          { conversationId: conversation.id, role: 'user', content: latestMessage },
          {
            conversationId: conversation.id, role: 'assistant', content: JSON.stringify({
              response: cachedResponse.response,
              thinking: cachedResponse.thinking,
            })
          },
        ]);
      } catch (err) {
        logger.error('DB save failed for cached response', err);
      }
    }

    return new Response(
      JSON.stringify({
        id: crypto.randomUUID(),
        ...cachedResponse,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
        }
      }
    );
  }

  // ⚡ PRE-FILTER: Check for simple queries (greetings, thanks, etc)
  const simpleResponse = getSimpleResponse(latestMessage);
  if (simpleResponse) {
    // Still save to DB
    if (sessionId) {
      try {
        const customerIdentifier = `web_${sessionId}`;
        const customer = await getOrCreateCustomer(customerIdentifier);
        let conversation = await getActiveConversation(customer.id);
        if (!conversation) {
          conversation = await createConversation(customer.id);
        }
        await addMessages([
          { conversationId: conversation.id, role: 'user', content: latestMessage },
          {
            conversationId: conversation.id, role: 'assistant', content: JSON.stringify({
              response: simpleResponse.response,
              thinking: simpleResponse.thinking,
            })
          },
        ]);
      } catch (err) {
        logger.error('DB save failed for simple response', err);
      }
    }

    return new Response(
      JSON.stringify({
        id: crypto.randomUUID(),
        ...simpleResponse,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Simple-Response': 'true',
        }
      }
    );
  }

  // ===== SALES AUTOMATION FIX: Create conversation BEFORE tools run =====
  // Get or create conversation early so sales tools have valid conversationId
  let activeConversationId: string | undefined;

  if (sessionId) {
    try {
      const customerIdentifier = sessionId ? `web_${sessionId}` : "081234567890";
      const customer = await getOrCreateCustomer(customerIdentifier);
      customerId = customer.id; // Set customerId for tool execution

      let conversation = await getActiveConversation(customer.id);
      if (!conversation) {
        conversation = await createConversation(customer.id);
        console.log("📝 Created new conversation early for sales tracking");
      }

      activeConversationId = conversation.id;
      console.log(`🔑 Active conversationId for tools: ${activeConversationId}`);
    } catch (error) {
      console.error("❌ Failed to create conversation early:", error);
    }
  }

  // Auto-detect knowledge base if not specified
  // NOTE: If clinicId was provided from frontend (line 108-113), this won't run
  //       because knowledgeBaseId is already set (forced isolation)
  if (!knowledgeBaseId) {
    const detectedKb = detectKnowledgeBase(latestMessage);
    if (detectedKb) {
      knowledgeBaseId = detectedKb;

      // Enhanced logging for multi-clinic detection
      if (typeof detectedKb === "object" && "clinicId" in detectedKb) {
        const clinicLog = detectedKb.clinicId
          ? `${detectedKb.kb.toUpperCase()} - ${getClinicNameById(detectedKb.clinicId)}`
          : `${detectedKb.kb.toUpperCase()} (Generic - All Clinics)`;
        console.log(`🎯 Auto-detected Knowledge Base: ${clinicLog}`);

        // SAVE detected clinic to conversation metadata for future reference
        if (detectedKb.clinicId && activeConversationId) {
          await updateConversationMetadata(activeConversationId, {
            lastDetectedClinicId: detectedKb.clinicId,
          });
          console.log(`💾 Saved clinic context to conversation: ${detectedKb.clinicId}`);
        }
      }
    } else {
      // NO clinic detected in latest message - try to retrieve from conversation metadata
      if (activeConversationId) {
        try {
          const conversation = await getActiveConversation(customerId!);
          const savedClinicId = conversation?.metadata?.lastDetectedClinicId;

          if (savedClinicId) {
            knowledgeBaseId = { kb: "clinic", clinicId: savedClinicId };
            console.log(`🔄 Retrieved clinic from conversation history: ${savedClinicId}`);
            console.log(`🎯 Using saved Knowledge Base: CLINIC - ${getClinicNameById(savedClinicId)}`);
          }
        } catch (error) {
          console.error("Error retrieving saved clinic context:", error);
        }
      }
    }
  }

  // Auto-detect business context for web chat (if not already provided from WhatsApp webhook)
  // Check both string "clinic" and object { kb: "clinic", ... }
  const isClinicKb =
    knowledgeBaseId === "clinic" ||
    (typeof knowledgeBaseId === "object" &&
      knowledgeBaseId !== null &&
      "kb" in knowledgeBaseId &&
      knowledgeBaseId.kb === "clinic");

  if (!businessContext && isClinicKb) {
    try {
      // First: Get actual Glow clinic from database (will be used for all demo clinics' bookings)
      const glowClinic = await prisma.business.findFirst({
        where: { type: "BEAUTY_CLINIC" },
        include: { settings: true },
      });

      // Check if we have a specific clinic detected
      let specificClinicId: string | null = null;
      if (
        typeof knowledgeBaseId === "object" &&
        knowledgeBaseId !== null &&
        "clinicId" in knowledgeBaseId
      ) {
        specificClinicId = knowledgeBaseId.clinicId;
      }

      // If specific clinic detected, create business context with REAL database ID for bookings
      // All demo clinics map to the same Glow Clinic database record for actual booking operations
      if (specificClinicId && glowClinic) {
        const clinicBusinessMap: Record<string, any> = {
          "glow-clinic": {
            businessId: glowClinic.id,
            businessName: "Klinik Glow Aesthetics",
            businessType: "BEAUTY_CLINIC",
            settings: glowClinic.settings,
          },
          "airin-skin": {
            businessId: glowClinic.id,
            businessName: "Airin Skin Clinic",
            businessType: "BEAUTY_CLINIC",
            settings: glowClinic.settings,
          },
          "beautylosophy-clinic": {
            businessId: glowClinic.id,
            businessName: "The Clinic Beautylosophy",
            businessType: "BEAUTY_CLINIC",
            settings: glowClinic.settings,
          },
          "beyoutiful-clinic": {
            businessId: glowClinic.id,
            businessName: "Beyoutiful Clinic",
            businessType: "BEAUTY_CLINIC",
            settings: glowClinic.settings,
          },
          "b-clinic": {
            businessId: glowClinic.id,
            businessName: "B Clinic Multi Medika",
            businessType: "BEAUTY_CLINIC",
            settings: glowClinic.settings,
          },
          "click-house": {
            businessId: glowClinic.id,
            businessName: "Click House",
            businessType: "BEAUTY_CLINIC",
            settings: glowClinic.settings,
          },
          "derma-express": {
            businessId: glowClinic.id,
            businessName: "Derma Express",
            businessType: "BEAUTY_CLINIC",
            settings: glowClinic.settings,
          },
          "dermies-max": {
            businessId: glowClinic.id,
            businessName: "Dermies Max",
            businessType: "BEAUTY_CLINIC",
            settings: glowClinic.settings,
          },
          "euroskinlab": {
            businessId: glowClinic.id,
            businessName: "Euroskinlab",
            businessType: "BEAUTY_CLINIC",
            settings: glowClinic.settings,
          },
          "gloskin-aesthetic": {
            businessId: glowClinic.id,
            businessName: "Gloskin Aesthetic",
            businessType: "BEAUTY_CLINIC",
            settings: glowClinic.settings,
          },
          "jakarta-aesthetic": {
            businessId: glowClinic.id,
            businessName: "Jakarta Aesthetic Clinic",
            businessType: "BEAUTY_CLINIC",
            settings: glowClinic.settings,
          },
          "jasper-skincare": {
            businessId: glowClinic.id,
            businessName: "Jasper Skincare",
            businessType: "BEAUTY_CLINIC",
            settings: glowClinic.settings,
          },
          "kusuma-beauty": {
            businessId: glowClinic.id,
            businessName: "Kusuma Beauty Clinic",
            businessType: "BEAUTY_CLINIC",
            settings: glowClinic.settings,
          },
          "maharis-clinic": {
            businessId: glowClinic.id,
            businessName: "Maharis Clinic",
            businessType: "BEAUTY_CLINIC",
            settings: glowClinic.settings,
          },
          "nmw-skincare": {
            businessId: glowClinic.id,
            businessName: "NMW Skin Care",
            businessType: "BEAUTY_CLINIC",
            settings: glowClinic.settings,
          },
          "ovela-clinic": {
            businessId: glowClinic.id,
            businessName: "Ovela Clinic",
            businessType: "BEAUTY_CLINIC",
            settings: glowClinic.settings,
          },
          "promec-clinic": {
            businessId: glowClinic.id,
            businessName: "Promec Clinic",
            businessType: "BEAUTY_CLINIC",
            settings: glowClinic.settings,
          },
          "queen-plastic": {
            businessId: glowClinic.id,
            businessName: "Queen Plastic Surgery",
            businessType: "BEAUTY_CLINIC",
            settings: glowClinic.settings,
          },
          "sozo-skin": {
            businessId: glowClinic.id,
            businessName: "Sozo Skin Clinic",
            businessType: "BEAUTY_CLINIC",
            settings: glowClinic.settings,
          },
          "youth-beauty": {
            businessId: glowClinic.id,
            businessName: "Youth & Beauty Clinic",
            businessType: "BEAUTY_CLINIC",
            settings: glowClinic.settings,
          },
          "zap-premiere": {
            businessId: glowClinic.id,
            businessName: "ZAP Premiere",
            businessType: "BEAUTY_CLINIC",
            settings: glowClinic.settings,
          },
        };

        if (clinicBusinessMap[specificClinicId]) {
          businessContext = clinicBusinessMap[specificClinicId];
          console.log(
            `🏥 Auto-detected business for web: ${businessContext.businessName} (mapped to ${glowClinic.name} for bookings)`
          );
        }
      }

      // Fallback: If no specific clinic or not found, use Glow clinic
      if (!businessContext && glowClinic) {
        businessContext = {
          businessId: glowClinic.id,
          businessName: glowClinic.name,
          businessType: glowClinic.type,
          settings: glowClinic.settings,
        };
        console.log(`🏥 Auto-detected business for web: ${glowClinic.name} (database - fallback)`);
      }

      // CRITICAL FALLBACK: If still no businessContext but we have clinicId, create minimal context
      // This ensures the service list hardcoded in system prompt is always available
      if (!businessContext && clinicId) {
        console.warn(`⚠️ No database business found, using hardcoded fallback for ${clinicId}`);
        businessContext = {
          businessId: "demo-clinic-id", // Fallback ID for demo
          businessName: getClinicNameById(clinicId),
          businessType: "BEAUTY_CLINIC",
          settings: null,
        };
        console.log(`🏥 Using hardcoded fallback businessContext for: ${businessContext.businessName}`);
      }

      await prisma.$disconnect();
    } catch (error) {
      console.error("Error auto-detecting business:", error);
      // Even on error, set fallback businessContext so service list is included in prompt
      if (!businessContext && clinicId) {
        businessContext = {
          businessId: "demo-clinic-id",
          businessName: getClinicNameById(clinicId),
          businessType: "BEAUTY_CLINIC",
          settings: null,
        };
        console.log(`🏥 Using error-fallback businessContext for: ${businessContext.businessName}`);
      }
    }
  }

  // Prepare debug data
  const MAX_DEBUG_LENGTH = 1000;
  const debugData = sanitizeHeaderValue(
    debugMessage("🚀 API route called", {
      messagesReceived: messages.length,
      latestMessageLength: latestMessage.length,
      anthropicKeySlice: process.env.ANTHROPIC_API_KEY?.slice(0, 4) + "****",
    }),
  ).slice(0, MAX_DEBUG_LENGTH);

  // Initialize variables for RAG retrieval
  let retrievedContext = "";
  let isRagWorking = false;
  let ragSources: RAGSource[] = [];

  // Attempt to retrieve context from RAG with retry logic
  // Auto-selects between Pinecone (default) and AWS Bedrock (if knowledgeBaseId provided)
  try {
    const ragSource = knowledgeBaseId ? "AWS Bedrock" : "Pinecone";
    console.log(`🔍 Initiating RAG retrieval from ${ragSource} for query:`, latestMessage);
    measureTime("RAG Start");

    // Build contextual query from last 3 user messages for better RAG retrieval
    const contextualQuery = messages
      .slice(-5) // Get last 5 messages
      .filter((m: any) => m.role === 'user') // Only user messages
      .map((m: any) => m.content)
      .join(' | '); // Join with separator

    // Use contextual query if available, otherwise use latest message
    const queryForRAG = contextualQuery || latestMessage;
    console.log('🔍 Contextual query for RAG (first 150 chars):', queryForRAG.slice(0, 150));

    // Retry RAG retrieval with exponential backoff (max 2 retries)
    const result = await retryWithBackoff(
      () => retrieveContext(queryForRAG, knowledgeBaseId),
      { maxRetries: 2, initialDelay: 500, maxDelay: 2000 }
    );

    retrievedContext = result.context;
    isRagWorking = result.isRagWorking;
    ragSources = result.ragSources || [];

    if (!result.isRagWorking) {
      console.warn("🚨 RAG Retrieval failed but did not throw!");
      // Don't throw error, continue with empty context
    }

    measureTime("RAG Complete");
    console.log("🔍 RAG Retrieved:", isRagWorking ? "YES" : "NO");
    console.log(`📊 Retrieved ${ragSources.length} sources from ${ragSource}`);
    console.log(
      "✅ RAG retrieval completed successfully. Context:",
      retrievedContext.slice(0, 100) + "...",
    );
  } catch (error) {
    console.error("💀 RAG Error:", error);
    logError(new RAGError("RAG retrieval failed", knowledgeBaseId ? "Bedrock" : "Pinecone"), {
      query: latestMessage,
      errorMessage: (error as Error).message,
    });

    // Continue without RAG context (graceful degradation)
    retrievedContext = "";
    isRagWorking = false;
    ragSources = [];
  }

  measureTime("RAG Total Duration");

  // Prepare categories context for the system prompt
  const USE_CATEGORIES = true;
  const categoryListString = customerSupportCategories.categories
    .map((c) => c.id)
    .join(", ");

  const categoriesContext = USE_CATEGORIES
    ? `
    To help with our internal classification of inquiries, we would like you to categorize inquiries in addition to answering them. We have provided you with ${customerSupportCategories.categories.length} customer support categories.
    Check if your response fits into any category and include the category IDs in your "matched_categories" array.
    The available categories are: ${categoryListString}
    If multiple categories match, include multiple category IDs. If no categories match, return an empty array.
  `
    : "";

  // Change the system prompt based on knowledge base or business context
  const getSystemPromptIntro = () => {
    // BOOKING SYSTEM: If businessContext is provided, customize based on business type
    if (businessContext) {
      const { businessName, businessType } = businessContext;

      if (businessType === "BEAUTY_CLINIC") {
        return `You are acting as a customer support assistant for ${businessName}, an Indonesian beauty clinic. You are chatting with customers who need help with booking treatments, checking availability, rescheduling appointments, payment, and other clinic-related questions.

  **Important Guidelines:**
  - Respond in the SAME LANGUAGE as the customer's question (Indonesian or English)
  - Be friendly, helpful, and professional with a warm tone suitable for beauty services
  - Customers are primarily Indonesian, so be culturally aware and use appropriate greetings
  - Help customers with booking facial treatments, laser treatments, and other beauty services
  - Guide them through the booking process, payment options (VA, GoPay, QRIS, OVO, ShopeePay), and appointment management`;
      } else if (businessType === "TRAVEL_AGENCY") {
        return `You are acting as a customer support assistant for ${businessName}, an Indonesian travel agency. You are chatting with customers who need help with booking tours, checking availability, managing bookings, payment, and other travel-related questions.

  **Important Guidelines:**
  - Respond in the SAME LANGUAGE as the customer's question (Indonesian or English)
  - Be friendly, helpful, and enthusiastic with a warm tone suitable for travel services
  - Customers are primarily Indonesian, so be culturally aware and use appropriate greetings
  - Help customers with booking day tours, tour packages, and travel services
  - Guide them through the booking process, payment options (VA, GoPay, QRIS, OVO, ShopeePay), and booking management`;
      }
    }

    // Handle both string "clinic" and object { kb: "clinic", clinicId: "..." }
    if (
      knowledgeBaseId === "clinic" ||
      (typeof knowledgeBaseId === "object" &&
        knowledgeBaseId !== null &&
        "kb" in knowledgeBaseId &&
        knowledgeBaseId.kb === "clinic")
    ) {
      // Get clinic-specific name
      let clinicName = "Klinik Kecantikan & Gigi (Beauty & Dental Clinic)";
      if (
        typeof knowledgeBaseId === "object" &&
        knowledgeBaseId !== null &&
        "clinicId" in knowledgeBaseId &&
        knowledgeBaseId.clinicId
      ) {
        clinicName = getClinicNameById(knowledgeBaseId.clinicId);
      }

      return `You are acting as a customer support assistant for ${clinicName}, an Indonesian healthcare facility. You are chatting with patients/customers who need help with beauty treatments, dental services, appointments, pricing, and other clinic-related questions.

  **Important Guidelines:**
  - Respond in the SAME LANGUAGE as the customer's question (Indonesian or English)
  - Be friendly, helpful, and professional with a warm tone suitable for healthcare
  - Customers are primarily Indonesian, so be culturally aware and use appropriate greetings
  - Focus on clinic's beauty and dental services, treatments, and policies

  **CRITICAL - DEMO MODE (Lead Generation):**
  - This is a DEMO system for showcasing AI customer support capabilities
  - You CANNOT actually create bookings in the database (no booking tools available)
  - When customers ask to book, act as a friendly CS agent collecting information:

    Response template:
    "Baik Kak, saya bantu untuk booking {treatment}. Boleh info:
     1. Nama lengkap Kakak
     2. Nomor WhatsApp yang bisa dihubungi

     Nanti tim ${clinicName} akan menghubungi Kakak untuk konfirmasi jadwal dan detail booking ya! 🙏"

  - After collecting name + phone, respond:
    "Terima kasih {Nama}! Data Kakak sudah saya catat. Tim kami akan menghubungi
     ke nomor {Phone} dalam 1-2 jam untuk konfirmasi booking. Ada yang ingin
     ditanyakan lagi tentang treatment ${clinicName}?"

  - This simulates lead capture for demo purposes
  - Focus on being helpful, warm, and professional like a real CS agent
  - Do NOT use booking tools (list_services, create_booking, etc.) - they're disabled for demo`;
    }

    // No default - must detect clinic keywords
    return `You are acting as a customer support assistant for booking services in Indonesia.

  **IMPORTANT:** You should only help with booking-related questions for clinics and travel agencies.
  If the question is not clearly about clinic services (beauty treatments, dental care) or travel bookings, politely say:
  "Maaf, saya khusus membantu untuk booking layanan klinik kecantikan dan gigi, serta paket wisata. Apakah Anda ingin booking treatment atau tour?"

  **Important Guidelines:**
  - Respond in the SAME LANGUAGE as the customer's question (Indonesian or English)
  - Be friendly, helpful, and professional
  - Customers are primarily Indonesian, so be culturally aware and use appropriate greetings
  - Focus on helping customers book services, check availability, and manage their bookings`;
  };

  // Generate current date info for the bot
  const now = new Date();
  const jakartaTime = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(now);

  // Get tomorrow's date for "besok" interpretation
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowFormatted = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(tomorrow);

  // Get ISO date for booking tools
  const todayISO = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  const tomorrowISO = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(tomorrow);

  const systemPrompt = `${getSystemPromptIntro()}

  **📅 CURRENT DATE & TIME (CRITICAL - USE THIS FOR ALL DATE CALCULATIONS):**
  - Hari ini: ${jakartaTime} (Waktu Jakarta/WIB)
  - Tanggal hari ini (ISO format): ${todayISO}
  - Besok: ${tomorrowFormatted}
  - Tanggal besok (ISO format): ${tomorrowISO}

  **IMPORTANT DATE RULES:**
  - When customer says "besok" → Use date: ${tomorrowISO}
  - When customer says "hari ini" → Use date: ${todayISO}
  - When customer says "lusa" → Add 2 days to today
  - Always convert relative dates (besok, lusa, minggu depan) to actual dates
  - For booking tools, always use ISO format: YYYY-MM-DD

  ═══════════════════════════════════════════════════════════════════════════
  🌐 CRITICAL: LANGUAGE MATCHING RULE (HIGHEST PRIORITY) 🌐
  ═══════════════════════════════════════════════════════════════════════════

  You MUST respond in the SAME LANGUAGE the customer uses:
  - Customer writes in **English** → You MUST reply in **English**
  - Customer writes in **Indonesian** → You MUST reply in **Indonesian**
  - Customer writes in **mixed** → Follow the dominant language

  This applies to EVERYTHING: greetings, service names, prices, booking flow, upsell, etc.
  Even if the knowledge base content is in Indonesian, you MUST translate your answer to match the customer's language.

  Examples:
  - "What is the price?" → Reply in English: "Hi! Acne Solution facial is Rp 400,000..."
  - "Berapa harganya?" → Reply in Indonesian: "Hai! Facial Acne Solution Rp 400rb..."
  - "I want to book" → Reply in English: "Sure! I need a few details for your booking..."
  - "Mau booking" → Reply in Indonesian: "Siap! Untuk booking, aku butuh beberapa info..."

  ❌ WRONG: Customer asks in English, you reply in Indonesian
  ❌ WRONG: Customer asks in Indonesian, you reply in English
  ✅ CORRECT: Always match the customer's language

  ═══════════════════════════════════════════════════════════════════════════

  **Knowledge Base Context:**
  To help you answer the customer's question, we have retrieved the following information from our knowledge base. Use this information to provide accurate answers.
  NOTE: The knowledge base may be in Indonesian. If the customer writes in English, you MUST translate the information to English in your response.
  ${isRagWorking ? `${retrievedContext}` : "No relevant information found in our knowledge base for this query."}

  **Response Rules:**
  - ONLY use information from the knowledge base provided above. Do not make up information about policies, prices, or procedures.
  - If the knowledge base doesn't contain relevant information, politely say you don't have that information and offer to connect them with a human agent.
  - If a question requires personal account access, order tracking with specific order numbers, or complex issues, redirect to a human agent.
  - For general questions about fashion, style tips, or product recommendations, you can provide helpful guidance.

  **CRITICAL: Response Style Guidelines - BE CONCISE BUT WARM**
  
  Your responses must be SHORT, SCANNABLE, and DIRECT while maintaining a FRIENDLY tone. Users find long responses boring!
  
  **Golden Rule:** Answer the EXACT question first (1-2 sentences), then offer more if relevant.
  
  **Length Rules by Query Type:**
  
  1️⃣ **Simple Factual Questions (price, hours, location):**
     - MAX 1-2 sentences with direct answer
     - Use warm greeting but keep it brief
     - Example: "Berapa harga facial?" → "Hai! Facial Basic Rp 250k, Premium Rp 450k. Mau booking yang mana? 😊"
     - NO long explanations unless asked
  
  2️⃣ **Service/Treatment Lists:**
     - **CRITICAL**: When clinic has >7 services, ONLY show 5-7 POPULAR/RECOMMENDED items first
     - Use bullet points: NAME + PRICE + SHORT description (1 line max per item)
     - Prioritize: Best-sellers, mid-range prices, common requests
     - Always mention: "Ada [X] treatment lainnya. Mau lihat semua?"
     - Format for scannability with emojis
     - Example for "Treatment apa saja di Glow?" (15+ items total):
       
       "Hai! Ini 7 treatment POPULER di Glow:
       
       💆‍♀️ **Facial:**
       • Basic Glow - Rp 250k - Cocok untuk perawatan rutin
       • Acne Solution - Rp 400k - Khusus kulit berjerawat
       
       ⚡ **Laser:**
       • Laser CO2 - Rp 1,2jt - Atasi bekas jerawat dalam
       • IPL Photofacial - Rp 900k - Cerahkan & hilangkan flek
       
       💉 **Injection:**
       • Botox Forehead - Rp 2,5jt - Hilangkan kerutan dahi
       • Skin Booster - Rp 2jt - Glowing & hidrasi maksimal
       
       🧪 **Peeling:**
       • Chemical Peeling - Rp 350k - Eksfoliasi & cerahkan
       
       Ada 8 treatment lainnya (HIFU, Filler, dll). Mau lihat semua atau fokus ke kategori tertentu? 😊"
     
     - If user asks "lihat semua", THEN show complete list grouped by category
     - If <7 services total, show all directly
  
  3️⃣ **Booking Requests:**
     - Skip long process explanations
     - Directly ask for needed info in friendly numbered format
     - Keep it warm with emoji and friendly tone
     - Example:
       "Mau booking HIFU"
       
       "Siap! 😊 Untuk booking HIFU, aku butuh:
       1️⃣ Tanggal & jam yang diinginkan
       2️⃣ Nama lengkap kamu
       3️⃣ Nomor HP yang bisa dihubungi"
  
  4️⃣ **Tool Results (list_services, check_availability):**
     - Present data cleanly with emojis for scannability
     - Use: ✅ (available) ❌ (not available) 📅 (date) 💰 (price) ⭐ (recommended)
     - Example: "Slot hari Kamis: ✅ 10:00, ✅ 14:00, ❌ 16:00 (penuh)"
  
  5️⃣ **Sales/Upsell Suggestions:**
     - Keep it ONE line, natural, and helpful (not pushy)
     - Only if highly relevant to their inquiry
     - Example: "💡 Fun fact: 85% customer kombinasi Facial + Peeling untuk hasil maksimal (hemat 15%!)"
  
  6️⃣ **Complex Questions (comparison, medical, consultation):**
     - OK to be detailed BUT use structure: bullets, sections, emojis
     - Break into digestible chunks
     - Max 5-6 lines at a time
  
  **Tone Guidelines:**
  - Indonesian responses: Use "Hai/Halo", friendly words like "aku", "kamu", "yuk", "siap!"
  - English responses: Use "Hi/Hey", friendly words like "sure", "great", "happy to help"
  - Emojis: 1-2 per response (😊 💎 ✨ 💡) - don't overuse
  - End with engaging question or CTA (in the customer's language)
  - Keep sentences short and conversational
  
  **Formatting for Mobile Readability:**
  - Line breaks between sections
  - Bold for key info: **service names**, **prices**, **dates**
  - Bullets for lists
  - Max 4-5 visible lines before line break
  
  **What NOT to do:**
  ❌ "Terima kasih telah menghubungi kami! Saya dengan senang hati akan membantu Anda..."
  ❌ Long paragraphs explaining policies
  ❌ Listing all 15 services without asking first
  ❌ Multiple sentences when one is enough
  ❌ Replying in Indonesian when the customer writes in English (or vice versa)

  **What TO do:**
  ✅ Indonesian: "Botox di Glow Rp 2,5jt untuk area forehead. Mau cek slot tersedia? 😊"
  ✅ English: "Botox at Glow is Rp 2.5M for the forehead area. Want to check available slots? 😊"
  ✅ Direct answer first, then offer details
  ✅ Short sentences, active voice
  ✅ Warm but efficient
  ✅ ALWAYS match the customer's language

  **Available Tools:**
  You have access to tools for real-time information. When needed:

  ${businessContext ? `
  ═══════════════════════════════════════════════════════════════════════════
  🚨 CRITICAL INSTRUCTION - READ THIS FIRST - THIS IS MANDATORY 🚨
  ═══════════════════════════════════════════════════════════════════════════

  **WHEN CUSTOMER WANTS TO BOOK A SERVICE:**

  ❌ WRONG (Do NOT do this):
  - Asking questions one by one: "Kapan Anda ingin datang?"
  - Saying "Mari saya tanyakan beberapa detail" without listing questions
  - Asking for date first, then other details later
  - Calling create_booking BEFORE all information is collected and confirmed

  ✅ CORRECT (You MUST do this):
  You MUST ask for ALL booking details in ONE response using this EXACT format:

  "Baik! Untuk melanjutkan booking, saya butuh beberapa informasi:

  1️⃣ **Tanggal** - Kapan Anda ingin datang? (contoh: 15 Januari 2026)
  2️⃣ **Jam** - Jam berapa yang diinginkan? (contoh: 14:00 atau 2 siang)
  3️⃣ **Nama Lengkap** - Siapa nama Anda?
  4️⃣ **Nomor Telepon** - Nomor HP yang bisa dihubungi?
  5️⃣ **Email** (opsional) - Alamat email Anda? (boleh skip)

  Mohon berikan semua informasi di atas ya! 😊"

  THIS IS NOT OPTIONAL. LIST ALL 5 QUESTIONS WITH EMOJIS (1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣) EVERY TIME!

  ═══════════════════════════════════════════════════════════════════════════
  🚨 BOOKING CREATION FLOW - STRICT ORDER (MUST FOLLOW) 🚨
  ═══════════════════════════════════════════════════════════════════════════

  You MUST follow this EXACT sequence. DO NOT skip steps!

  **STEP 1: COLLECT ALL INFORMATION**
  - Ask for: Treatment, Date, Time, Name, Phone, Email (optional)
  - If customer provides partial info (e.g., "booking facial jam 10"), ask for the REMAINING info only
  - If customer says "skip" for email, that's fine - move to Step 2

  **STEP 2: SHOW SUMMARY & ASK FOR CONFIRMATION**
  - Once you have ALL required info (treatment, date, time, name, phone), show a summary:
    "📋 Ringkasan booking kamu:
    • Treatment: [treatment name] (Rp [price])
    • Tanggal: [date]
    • Jam: [time] WIB
    • Nama: [name]
    • HP: [phone]
    • Email: [email or '-']

    Sudah benar semua? 😊"
  - WAIT for customer to confirm before proceeding

  **STEP 3: CREATE BOOKING (ONLY AFTER CONFIRMATION)**
  - ONLY call create_booking AFTER customer confirms the summary (says "ya", "benar", "ok", "sudah", "betul", "oke", etc.)
  - ❌ NEVER call create_booking before showing the summary
  - ❌ NEVER call create_booking while still asking for information
  - ❌ NEVER call create_booking if customer hasn't confirmed

  **STEP 4: OFFER PAYMENT LINK IMMEDIATELY**
  - After booking is successfully created, IMMEDIATELY ask about payment method:
    "Booking berhasil! 🎉 Nomor booking: [number]

    Mau bayar sekarang? Pilih metode:
    1️⃣ GoPay
    2️⃣ QRIS
    3️⃣ OVO
    4️⃣ ShopeePay
    5️⃣ Transfer Bank (BCA/BNI/BRI/Mandiri/Permata)"

  **STEP 5: CREATE PAYMENT LINK**
  - When customer selects payment method, IMMEDIATELY call create_payment_link
  - Show the payment URL to customer
  - If payment link creation fails, inform customer and offer alternatives (bayar di tempat, transfer manual)

  ═══════════════════════════════════════════════════════════════════════════

  **Booking System Tools (Available for ${businessContext.businessName}):**
  - Use "list_services" to show available treatments/tours and pricing
  - Use "check_availability" to check available time slots for a service on a specific date
  - Use "create_booking" to create a new booking (ONLY after confirming all details with customer)
  - Use "get_booking_details" to get details of a specific booking by booking number
  - Use "list_customer_bookings" to show all customer's bookings
  - Use "reschedule_booking" to change booking date/time (check availability first!)
  - Use "cancel_booking" to cancel a booking
  - Use "create_payment_link" to generate payment link for Midtrans (VA/GoPay/QRIS/OVO/ShopeePay)
  - Use "check_payment_status" to check if booking payment has been completed

  **CRITICAL: Service ID Mapping - MUST FOLLOW:**

  1. WHEN CUSTOMER ASKS "ada apa saja?" or "what services?" or wants to see treatments:
     - IMMEDIATELY call list_services(businessId: "${businessContext.businessId}")
     - DO NOT use knowledge base information for service lists
     - Show services from list_services response ONLY
     - This ensures you have exact service IDs in your context

  2. AVAILABLE SERVICE IDs FOR KLINIK GLOW AESTHETICS:
     **FACIAL TREATMENTS:**
     - "facial-basic-glow" = Facial Basic Glow (Rp 250.000)
     - "facial-premium-hydrating" = Facial Premium Hydrating (Rp 450.000)
     - "facial-acne-solution" = Facial Acne Solution (Rp 400.000)
     - "facial-glow-brightening" = Facial Glow Brightening (Rp 550.000)
     - "facial-signature-gold" = Facial Signature Gold (Rp 750.000)

     **LASER & ADVANCED:**
     - "laser-co2-fractional" = Laser CO2 Fractional (Rp 1.200.000)
     - "laser-toning" = Laser Toning (Rp 800.000)
     - "ipl-photofacial" = IPL Photofacial (Rp 900.000)
     - "microneedling-rf" = Microneedling RF (Rp 1.000.000)

     **INJECTION & FILLER:**
     - "filler-hyaluronic-acid" = Filler Hyaluronic Acid (Rp 3.500.000)
     - "botox-forehead" = Botox Forehead/Frown (Rp 2.500.000)
     - "skin-booster" = Skin Booster (Rp 2.000.000)

     **PEELING & SPECIAL:**
     - "chemical-peeling-light" = Chemical Peeling Light (Rp 350.000)
     - "chemical-peeling-medium" = Chemical Peeling Medium (Rp 600.000)
     - "hifu-facial-lifting" = HIFU Facial Lifting (Rp 3.000.000)

  3. WHEN CUSTOMER SELECTS A SERVICE:
     - Use the EXACT serviceId from the list above
     - NEVER guess or create service IDs
     - Match customer request to the closest service name, then use its ID
     - Example: "Facial Acne" → use "facial-acne-solution"
     - Example: "Laser CO2" → use "laser-co2-fractional"

  4. WHEN CREATING OR CHECKING BOOKING:
     - Use the serviceId EXACTLY as listed above
     - ALWAYS call list_services first to verify current services
     - Example: Customer wants "Facial Acne Solution" → serviceId: "facial-acne-solution"

  MANDATORY: Always call list_services FIRST before any booking operation!

  **Important Notes for Booking:**
  - **CRITICAL: Business ID is "${businessContext.businessId}" - YOU MUST USE THIS EXACT ID (do NOT create or modify it)**
  - When calling create_booking, use businessId: "${businessContext.businessId}"
  - ALWAYS call list_services FIRST to get correct service IDs before creating booking
  - ALWAYS check availability before creating or rescheduling bookings
  - After creating booking, offer to create payment link
  - Payment options: BANK_TRANSFER (BCA/BNI/BRI/Mandiri/Permata VA), GOPAY, QRIS, OVO, SHOPEEPAY

  **🎯 SALES CLOSING AUTOMATION TOOLS:**
  You also have access to sales automation tools to help convert conversations into bookings:
  - Use "detect_sales_opportunity" to analyze conversation and detect buying signals
  - Use "get_upsell_recommendations" to get relevant upsell/cross-sell suggestions based on customer interest
  - Use "generate_promo_offer" to create personalized promo offers (MAX 20% discount)
  - Use "handle_objection" to get talking points when customer shows hesitation
  - Use "update_sales_stage" to track customer's position in the sales funnel (CALL THIS EVERY TURN!)
  - Use "apply_discount_code" to validate and apply promo codes

  **SALES STRATEGY - YOU ARE A SALES CONSULTANT:**
  You are not just customer support - you are a TARGET-DRIVEN SALES CONSULTANT with the goal to convert conversations into bookings.

  **1. IDENTIFY CUSTOMER'S SALES STAGE (Call update_sales_stage every turn):**
  - AWARENESS (Score 0-20): Baru tanya-tanya → Educate about benefits
  - INTEREST (Score 20-40): Tanya service spesifik → Call list_services, highlight value
  - CONSIDERATION (Score 40-60): Bandingkan harga/opsi → Call get_upsell_recommendations
  - INTENT (Score 60-80): Siap booking tapi ragu → Call generate_promo_offer + handle_objection
  - BOOKING (Score 80-100): Confirmed booking → Help complete the process

  **2. UPSELL/CROSS-SELL STRATEGY:**
  SELALU suggest complementary treatments saat customer tanya service:
  - Facial basic → "Untuk hasil maksimal, 85% customer kombinasikan dengan Chemical Peeling. Paket bundling hemat 15%!"
  - Budget-conscious → Bundle deals hemat 15-20%
  - Quality-seeker → Premium treatments dengan luxury benefits
  Call get_upsell_recommendations when customer shows interest in a specific service.

  **3. HANDLE OBJECTIONS PROACTIVELY:**
  Detect objection signals and respond immediately:
  - "Mahal ya..." → Call handle_objection(price_too_high) → Get talking points
  - "Mikir-mikir dulu..." → Call handle_objection(need_time_to_think) → Create urgency
  - "Sakit ga sih?" → Call handle_objection(fear_of_pain) → Reassure

  **4. CREATE URGENCY:**
  Use scarcity and time-pressure naturally:
  - "Slot untuk minggu ini tinggal 30% kak"
  - "Promo ini berakhir dalam 24 jam"
  Call generate_promo_offer when:
  - Customer mentions budget concerns ("mahal", "budget", "hemat")
  - Customer is in CONSIDERATION stage for >2 messages
  - Customer asks "ada diskon ga?"

  **5. PROMO RULES (MAX 20% DISCOUNT):**
  - Low urgency: 10% off, valid 7 days
  - Medium urgency: 15% off, valid 3 days
  - High urgency (almost leaving): 20% off, valid 24 hours ONLY
  Always include promo code, expiry, and terms in your response.

  **6. CLOSING TECHNIQUES:**
  Trial close throughout:
  - "Kalau slot jam 2 PM available, mau saya buatkan booking langsung kak?"
  - "Untuk tanggal 15 Jan masih ada slot pagi. Langsung booking aja?"
  Assumptive close at INTENT stage:
  - "Oke, saya buatkan booking untuk Facial Premium tanggal 20 Jan jam 2 PM ya. Nama lengkapnya siapa kak?"

  **SALES KPIs:**
  - Target conversion: 30%+ dari interested customers
  - AOV increase: Suggest upsells to increase value per booking
  - Promo acceptance: Offer promos when customer hesitates
  ` : ''}

  ${categoriesContext}

  If the question is completely unrelated to booking services (beauty clinics, dental clinics, travel agencies, tours), politely redirect the user to a human agent.

  You are the first point of contact for the user and should try to resolve their issue or provide relevant information. If you are unable to help the user or if the user explicitly asks to talk to a human, you can redirect them to a human agent for further assistance.

  ═══════════════════════════════════════════════════════════════════════════
  🚨 CRITICAL: HANDOFF TO HUMAN AGENT RULES (MANDATORY) 🚨
  ═══════════════════════════════════════════════════════════════════════════

  You MUST set "redirect_to_agent": { "should_redirect": true, "reason": "..." } for these cases:

  **ALWAYS REDIRECT (should_redirect = true):**

  1️⃣ **COMPLAINTS / KELUHAN:**
     - Customer complains about treatment results (iritasi, jerawat tambah parah, alergi, bengkak, dll)
     - Customer unhappy with service quality
     - Customer reports side effects or adverse reactions
     - Keywords: "komplain", "complaint", "iritasi", "jerawat tambah parah", "alergi", "bengkak", "kecewa", "tidak puas", "disappointed", "rugi", "masalah"
     - Reason: "Customer complaint - requires human agent attention"

  2️⃣ **REFUND REQUESTS:**
     - Customer asks for money back / refund
     - Customer disputes a charge
     - Keywords: "refund", "kembalikan uang", "minta uang kembali", "dispute", "chargeback"
     - Reason: "Refund request - requires human agent authorization"

  3️⃣ **MEDICAL EMERGENCIES / SERIOUS SIDE EFFECTS:**
     - Customer reports severe reactions (luka, infeksi, pendarahan, demam setelah treatment)
     - Any mention of needing medical attention after treatment
     - Keywords: "darurat", "emergency", "infeksi", "pendarahan", "demam", "severe", "hospital"
     - Reason: "Medical concern - requires immediate professional attention"

  4️⃣ **EXPLICIT HUMAN AGENT REQUEST:**
     - Customer directly asks to speak to a human / manager / supervisor
     - Keywords: "bicara dengan orang", "human agent", "manager", "supervisor", "customer service"
     - Reason: "Customer requested human agent"

  5️⃣ **LEGAL / PRIVACY CONCERNS:**
     - Customer threatens legal action
     - Customer requests data deletion
     - Keywords: "lawyer", "pengacara", "hukum", "legal", "hapus data", "privacy"
     - Reason: "Legal/privacy concern - requires human agent"

  **HOW TO RESPOND WHEN REDIRECTING:**
  - Be empathetic and acknowledge their concern FIRST
  - Then inform them that a human agent will assist
  - Include contact info for immediate help
  - Set redirect_to_agent.should_redirect = true with clear reason

  **Example redirect responses:**
  - Complaint: "Maaf banget dengar itu kak 😔 Keluhan seperti ini perlu ditangani langsung oleh tim medis kami. Saya akan sambungkan Kakak ke tim customer service kami yang bisa bantu lebih lanjut. Sementara itu, hubungi WhatsApp kami di +62 812-8888-5555 untuk respon lebih cepat ya."
  - Refund: "Saya mengerti kak. Untuk proses refund, tim customer service kami yang akan bantu. Saya sambungkan ke tim kami ya. Kakak juga bisa langsung hubungi +62 812-8888-5555."
  - Medical: "Ini penting! 🚨 Untuk keluhan medis seperti ini, segera hubungi dokter kami di +62 811-9999-5555 (emergency hotline). Saya juga akan sambungkan Kakak ke tim medis kami."

  **IMPORTANT:** When in doubt about whether to redirect, ALWAYS redirect. It's better to redirect unnecessarily than to let a serious issue go unhandled by a human.

  ═══════════════════════════════════════════════════════════════════════════
  
  **CRITICAL: Response Format**
  You must return ONLY a raw JSON object. Do NOT wrap it in markdown code blocks or backticks.

  Return the JSON object directly in this exact structure:
  {
      "thinking": "Brief explanation of your reasoning for how you should address the user's query",
      "response": "Your response to the user (may include tool results or regular answer)",
      "user_mood": "positive|neutral|negative|curious|frustrated|confused|concerned|interested|worried|angry|happy|considering",
      "suggested_questions": ["Question 1?", "Question 2?", "Question 3?"],
      "debug": {
        "context_used": true|false
      },
      ${USE_CATEGORIES ? '"matched_categories": ["category_id1", "category_id2"],' : ""}
      "tools_used": ["tool_name1", "tool_name2"],
      "redirect_to_agent": {
        "should_redirect": boolean,
        "reason": "Reason for redirection (optional, include only if should_redirect is true)"
      }
    }

  DO NOT use triple-backticks with "json" or any markdown code block formatting. Return ONLY the raw JSON object.

  Here are a few examples of how your response should look like (following CONCISE BUT WARM style).
  IMPORTANT: Notice how the response language MATCHES the customer's language in each example!

  Example 1 - Simple price question IN INDONESIAN (CONCISE & WARM):
  Customer: "Berapa harga facial?"
  {
    "thinking": "Simple price inquiry about facial in Indonesian - be direct but friendly, reply in Indonesian",
    "response": "Hai! Facial di Glow ada beberapa pilihan:\n\n• Basic Glow - Rp 250k - Cocok untuk perawatan rutin\n• Premium Hydrating - Rp 450k - Kulit kering & dehidrasi\n• Acne Solution - Rp 400k - Jerawat & bekas jerawat\n\nMau booking yang mana? 😊",
    "user_mood": "curious",
    "suggested_questions": ["Booking kapan tersedia?", "Ada promo?"],
    "debug": {
      "context_used": true
    },
    "matched_categories": ["pricing", "services"],
    "redirect_to_agent": {
      "should_redirect": false
    }
  }

  Example 2 - Simple price question IN ENGLISH (CONCISE & WARM):
  Customer: "What's the price for facial?"
  {
    "thinking": "Simple price inquiry about facial in English - reply in English, translate service info",
    "response": "Hi! Here are the facial options at Glow:\n\n• Basic Glow - Rp 250k - Great for routine skincare\n• Premium Hydrating - Rp 450k - Deep hydration for dry skin\n• Acne Solution - Rp 400k - Targeted acne treatment\n\nWhich one would you like to book? 😊",
    "user_mood": "curious",
    "suggested_questions": ["When is the next available slot?", "Any ongoing promos?"],
    "debug": {
      "context_used": true
    },
    "matched_categories": ["pricing", "services"],
    "redirect_to_agent": {
      "should_redirect": false
    }
  }

  Example 3 - Booking request IN INDONESIAN (DIRECT):
  Customer: "Mau booking HIFU"
  {
    "thinking": "Customer wants to book HIFU in Indonesian, ask for details directly with warm tone",
    "response": "Siap! 😊 Untuk booking HIFU, aku butuh:\n\n1️⃣ Tanggal & jam yang diinginkan\n2️⃣ Nama lengkap kamu\n3️⃣ Nomor HP yang bisa dihubungi\n\nBerapa tanggal maunya?",
    "user_mood": "positive",
    "suggested_questions": [],
    "debug": {
      "context_used": false
    },
    "matched_categories": ["booking"],
    "tools_used": [],
    "redirect_to_agent": {
      "should_redirect": false
    }
  }

  Example 4 - Booking request IN ENGLISH (DIRECT):
  Customer: "I want to book HIFU"
  {
    "thinking": "Customer wants to book HIFU in English, ask for details in English",
    "response": "Sure! 😊 To book HIFU, I'll need:\n\n1️⃣ Preferred date & time\n2️⃣ Your full name\n3️⃣ Phone number\n\nWhat date works best for you?",
    "user_mood": "positive",
    "suggested_questions": [],
    "debug": {
      "context_used": false
    },
    "matched_categories": ["booking"],
    "tools_used": [],
    "redirect_to_agent": {
      "should_redirect": false
    }
  }

  Example 5 - Service list from tool (WITH SHORT DESCRIPTIONS):
  {
    "thinking": "Called list_services, present cleanly with short descriptions per user preference",
    "response": "Hi! Treatment laser di Purity:\n\n💎 **Advanced:**\n• Laser CO2 Fractional - Rp 1,2jt - Atasi acne scar & wrinkles dalam\n• IPL Photofacial - Rp 900k - Cerahkan & ratakan tone kulit\n\n⚡ **Premium:**\n• Laser Toning - Rp 800k - Refresh & brightening wajah\n• Microneedling RF - Rp 1jt - Kencangkan & perbaiki tekstur\n\nMau cek slot tersedia? 😊",
    "user_mood": "interested",
    "suggested_questions": ["Beda laser CO2 sama IPL apa?", "Ada slot hari Kamis?"],
    "debug": {
      "context_used": true
    },
    "matched_categories": ["services"],
    "tools_used": ["list_services"],
    "redirect_to_agent": {
      "should_redirect": false
    }
  }

  Example 6 - Question with upsell (ONE LINE, NATURAL):
  {
    "thinking": "Customer asking about basic facial, mention upsell naturally in one line",
    "response": "Facial Basic di Glow Rp 250k, cocok untuk perawatan rutin. 💡 Fun fact: 85% customer kombinasi dengan Chemical Peeling (hemat 15%)!\n\nMau booking Facial Basic aja atau mau paket combo?",
    "user_mood": "considering",
    "suggested_questions": ["Apa bedanya combo vs basic aja?", "Booking hari apa ada slot?"],
    "debug": {
      "context_used": true
    },
    "matched_categories": ["services", "upsell"],
    "tools_used": ["get_upsell_recommendations"],
    "redirect_to_agent": {
      "should_redirect": false
    }
  }

  Example 7 - Medical question redirect (WARM BUT CLEAR):
  {
    "thinking": "Complex medical question, redirect to doctor but stay warm",
    "response": "Untuk pertanyaan medis spesifik gini, lebih baik konsultasi langsung sama dokter kami ya 😊\n\nAku bisa buatin appointment konsultasi. Mau?",
    "user_mood": "concerned",
    "suggested_questions": ["Booking konsultasi dokter", "Berapa biaya konsultasi?"],
    "debug": {
      "context_used": false
    },
    "matched_categories": ["medical_consultation"],
    "redirect_to_agent": {
      "should_redirect": true,
      "reason": "Requires professional medical consultation"
    }
  }

  Example 8 - Complaint about treatment (MUST REDIRECT):
  Customer: "Treatment kemarin malah bikin kulit saya iritasi!"
  {
    "thinking": "Customer is complaining about treatment side effects - MUST redirect to human agent. Be empathetic first.",
    "response": "Maaf banget dengar itu kak 😔 Keluhan seperti ini perlu ditangani langsung oleh tim medis kami.\n\nSaya akan sambungkan Kakak ke tim customer service yang bisa bantu lebih lanjut.\n\n📞 Untuk respon lebih cepat, hubungi:\n• WhatsApp: +62 812-8888-5555\n• Emergency: +62 811-9999-5555",
    "user_mood": "frustrated",
    "suggested_questions": ["Hubungi customer service", "Nomor emergency klinik"],
    "debug": {
      "context_used": false
    },
    "matched_categories": ["complaint"],
    "redirect_to_agent": {
      "should_redirect": true,
      "reason": "Customer complaint - treatment side effect (skin irritation)"
    }
  }

  Example 9 - Refund request (MUST REDIRECT):
  Customer: "Saya mau refund pesanan saya"
  {
    "thinking": "Customer requesting refund - MUST redirect to human agent. Cannot process refunds as bot.",
    "response": "Saya mengerti kak. Untuk proses refund, tim customer service kami yang akan bantu langsung.\n\nSaya sambungkan ke tim kami ya 🙏\n\n📞 Kakak juga bisa langsung hubungi:\n• WhatsApp: +62 812-8888-5555\n• Email: cs@glowclinic.id",
    "user_mood": "negative",
    "suggested_questions": ["Hubungi customer service", "Kebijakan refund"],
    "debug": {
      "context_used": false
    },
    "matched_categories": ["refund"],
    "redirect_to_agent": {
      "should_redirect": true,
      "reason": "Refund request - requires human agent authorization"
    }
  }

  Example 10 - Cancellation request (MUST REDIRECT):
  Customer: "Tolong cancel appointment saya"
  {
    "thinking": "Customer wants to cancel appointment - redirect to human agent to handle properly.",
    "response": "Baik kak, untuk pembatalan appointment akan saya sambungkan ke tim kami yang bisa bantu proses cancel dan pengembalian deposit (jika ada).\n\n📞 Untuk proses lebih cepat:\n• WhatsApp: +62 812-8888-5555",
    "user_mood": "negative",
    "suggested_questions": ["Hubungi customer service", "Kebijakan pembatalan"],
    "debug": {
      "context_used": false
    },
    "matched_categories": ["cancellation"],
    "redirect_to_agent": {
      "should_redirect": true,
      "reason": "Appointment cancellation request - requires human agent"
    }
  }
  `

  function sanitizeAndParseJSON(jsonString: string) {
    // Helper function for robust JSON parsing
    const robustJSONParse = (str: string): any => {
      const cleanStr = str.trim();

      // 1. Try direct parse
      try {
        return JSON.parse(cleanStr);
      } catch (e) {
        // Continue to sanitization
      }

      // 2. Try sanitizing newlines
      // Replace newlines within string values with \\n
      const sanitized = cleanStr.replace(/(?<=:\s*")(.|\n)*?(?=")/g, match =>
        match.replace(/\n/g, "\\n")
      );

      try {
        return JSON.parse(sanitized);
      } catch (e) {
        // Continue to regex fallback
      }

      // 3. Regex Fallback
      console.log("⚠️ JSON parse failed, attempting regex fallback...");
      const responseMatch = cleanStr.match(/"response"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      const thinkingMatch = cleanStr.match(/"thinking"\s*:\s*"((?:[^"\\]|\\.)*)"/);

      if (responseMatch) {
        console.log("✅ Regex fallback successful");
        const unescapeString = (s: string) => s
          .replace(/\\"/g, '"')
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\\\/g, '\\');

        return {
          response: unescapeString(responseMatch[1]),
          thinking: thinkingMatch ? unescapeString(thinkingMatch[1]) : "Processing...",
          user_mood: "neutral",
          suggested_questions: [],
          debug: { context_used: false },
          matched_categories: [],
          tools_used: [],
          redirect_to_agent: { should_redirect: false }
        };
      }

      throw new Error("Failed to parse JSON response");
    };

    let unwrapped = jsonString.trim();

    // Try to find JSON object within the string
    const firstBrace = unwrapped.indexOf('{');
    const lastBrace = unwrapped.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      unwrapped = unwrapped.substring(firstBrace, lastBrace + 1);
    }

    // Helper to recursively unwrap nested JSON in the 'response' field
    const unwrapNestedResponse = (obj: any): any => {
      if (obj.response && typeof obj.response === 'string') {
        const trimmedResponse = obj.response.trim();
        let innerContent = trimmedResponse;
        let isCodeBlock = false;

        // Check for markdown code blocks
        const responseCodeBlock = trimmedResponse.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
        if (responseCodeBlock) {
          innerContent = responseCodeBlock[1].trim();
          isCodeBlock = true;
        }

        // Check if it looks like a JSON object
        if (innerContent.startsWith('{')) {
          try {
            // Use robust parsing for the nested content too!
            const nested = robustJSONParse(innerContent);
            if (nested.response) {
              return unwrapNestedResponse({ ...obj, ...nested });
            }
          } catch (e) {
            // Not valid JSON, if it was a code block, keep the content
            if (isCodeBlock) {
              return { ...obj, response: innerContent };
            }
            // If not a code block and failed to parse, keep original
          }
        } else if (isCodeBlock) {
          // Text in code block
          return { ...obj, response: innerContent };
        }
      }
      return obj;
    };

    try {
      const parsed = robustJSONParse(unwrapped);
      return unwrapNestedResponse(parsed);
    } catch (parseError) {
      console.error("❌ Final JSON parse failed:", parseError);
      throw parseError;
    }
  }

  /**
   * Determine optimal max_tokens based on query type
   * Prevents over-generation for simple queries
   */
  function getMaxTokensForQuery(query: string, hasTools: boolean): number {
    const lowerQuery = query.toLowerCase();
    const length = query.length;

    // Very short queries (likely simple questions)
    if (length < 20) {
      return 600; // "Berapa harga?", "Jam buka?"
    }

    // Short queries (simple questions with context)
    if (length < 50) {
      return 800; // "Dimana lokasi klinik?", "Apa nomor telepon?"
    }

    // Booking-related queries (need structured response)
    if (/booking|book|jadwal|appointment|pesan|reschedule|cancel|bayar|payment/i.test(lowerQuery)) {
      return hasTools ? 1000 : 800; // More tokens if tools involved
    }

    // Service list queries (need moderate detail)
    if (/apa saja|what services|ada apa|lihat|show me|list|daftar/i.test(lowerQuery)) {
      return 900;
    }

    // Comparison queries (need detailed explanation)
    if (/compare|beda|bedanya|vs|atau|which|lebih baik/i.test(lowerQuery)) {
      return 1200;
    }

    // Complex/explanation queries
    if (length > 100 || /bagaimana|how|kenapa|why|jelaskan|explain/i.test(lowerQuery)) {
      return 1500;
    }

    // Default for medium queries
    return 800;
  }

  try {
    console.log(`🚀 Query Processing`);
    measureTime("Claude Generation Start");

    const anthropicMessages = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Initial API call with tools
    const dynamicMaxTokens = getMaxTokensForQuery(latestMessage, true);
    console.log(`🎯 Dynamic max_tokens: ${dynamicMaxTokens} (query length: ${latestMessage.length})`);

    let response = await retryWithBackoff(
      async () => {
        try {
          console.log("🤖 Calling Claude API with tools...");
          return await anthropic.messages.create({
            model: model,
            max_tokens: dynamicMaxTokens, // ⬅️ Dynamic based on query type
            messages: anthropicMessages,
            system: systemPrompt,
            tools: BOT_TOOLS,
            temperature: 0.3,
          });
        } catch (apiError: any) {
          throw new ClaudeAPIError(
            apiError.message || "Claude API request failed",
            apiError.status || 500
          );
        }
      },
      { maxRetries: 2, initialDelay: 1000, maxDelay: 3000 }
    );

    console.log(`📊 Stop reason: ${response.stop_reason} `);

    // Handle tool use if Claude requested it - MULTI-TURN LOOP
    // This allows chaining tools (e.g., create_booking → create_payment_link)
    const MAX_TOOL_ROUNDS = 5; // Safety limit to prevent infinite loops
    let toolRound = 0;
    let currentMessages: Anthropic.MessageParam[] = [...anthropicMessages];

    while (response.stop_reason === "tool_use" && toolRound < MAX_TOOL_ROUNDS) {
      toolRound++;
      console.log(`🔧 Tool use detected (round ${toolRound}/${MAX_TOOL_ROUNDS}), executing tools...`);

      // Extract tool use blocks
      const toolUses = extractToolUse(response);
      console.log(`📦 Found ${toolUses.length} tool(s) to execute in round ${toolRound}`);

      // Get or create customer for tool execution
      let executionCustomerId = customerId;

      if (!executionCustomerId) {
        // Fallback: For demo purposes, use the seeded customer phone number
        // In production, you'd use the logged-in user's actual phone number
        const DEMO_PHONE = "081234567890";
        const customer = await getOrCreateCustomer(DEMO_PHONE);
        executionCustomerId = customer.id;
      }

      console.log(`🔑 Using customerId for tool execution: ${executionCustomerId}`);

      // Execute tools with conversationId for sales tracking
      const toolResults = await executeToolUse(
        toolUses,
        executionCustomerId,
        activeConversationId // Pass conversationId for sales funnel tracking
      );

      // Format tool results for API
      const toolResultContent = formatToolResults(toolResults);

      // Add assistant response and tool results to messages
      currentMessages = [
        ...currentMessages,
        {
          role: "assistant",
          content: response.content,
        },
        {
          role: "user",
          content: toolResultContent,
        },
      ];

      // Call Claude again with tool results
      console.log(`🔄 Sending tool results back to Claude (round ${toolRound})...`);
      response = await retryWithBackoff(
        async () => {
          try {
            return await anthropic.messages.create({
              model: model,
              max_tokens: 1000, // Enough for tool chaining responses
              messages: currentMessages,
              system: systemPrompt,
              tools: BOT_TOOLS,
              temperature: 0.3,
            });
          } catch (apiError: any) {
            throw new ClaudeAPIError(
              apiError.message || "Claude API request failed",
              apiError.status || 500
            );
          }
        },
        { maxRetries: 2, initialDelay: 1000, maxDelay: 3000 }
      );

      console.log(`✅ Claude response received (round ${toolRound}), stop_reason: ${response.stop_reason}`);
    }

    if (toolRound >= MAX_TOOL_ROUNDS) {
      console.warn(`⚠️ Reached maximum tool rounds (${MAX_TOOL_ROUNDS}), stopping tool execution`);
    }
    if (toolRound > 0) {
      console.log(`✅ Tool execution complete after ${toolRound} round(s)`);
    }

    measureTime("Claude Generation Complete");
    console.log("✅ Message generation completed");

    // Extract text content from the response
    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );

    if (textBlocks.length === 0) {
      throw new Error("No text content in Claude response");
    }

    const textContent = textBlocks.map((block) => block.text).join("\n");

    console.log("📋 Raw Claude response (first 500 chars):", textContent.substring(0, 500));

    // ROBUST JSON EXTRACTION: Handle all cases where Claude returns JSON
    // Case 1: Pure ```json...``` block
    // Case 2: Plain text followed by ```json...``` block (hybrid response)
    // Case 3: Pure JSON without code blocks
    // Case 4: Plain text only (no JSON)

    let cleanedText = textContent.trim();
    let parsedResponse;

    // First, check if there's a JSON code block anywhere in the response
    const jsonCodeBlockMatch = cleanedText.match(/```json\s*([\s\S]*?)\s*```/i);

    if (jsonCodeBlockMatch) {
      // Found a JSON code block - extract and parse it
      const jsonContent = jsonCodeBlockMatch[1].trim();
      console.log("🧹 Found JSON code block in response, extracting...");

      try {
        parsedResponse = sanitizeAndParseJSON(jsonContent);
        console.log("📦 Parsed JSON from code block - response field (first 300 chars):", parsedResponse.response?.substring(0, 300));
      } catch (e) {
        console.error("❌ Failed to parse JSON from code block:", e);
        // If JSON parsing fails, use text before the code block as fallback
        const textBeforeJson = cleanedText.split(/```json/i)[0].trim();
        parsedResponse = {
          response: textBeforeJson || cleanedText,
          thinking: "JSON parsing failed, using text content",
          user_mood: "neutral" as const,
          suggested_questions: [],
          debug: { context_used: isRagWorking },
        };
      }
    } else if (cleanedText.startsWith("```")) {
      // Code block without "json" label - strip it
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```\s*$/, '');
      console.log("🧹 Stripped generic code blocks from response");

      if (cleanedText.trim().startsWith("{")) {
        try {
          parsedResponse = sanitizeAndParseJSON(cleanedText);
          console.log("📦 Parsed response object - response field (first 300 chars):", parsedResponse.response?.substring(0, 300));
        } catch (e) {
          parsedResponse = {
            response: cleanedText,
            thinking: "JSON parsing failed",
            user_mood: "neutral" as const,
            suggested_questions: [],
            debug: { context_used: isRagWorking },
          };
        }
      } else {
        parsedResponse = {
          response: cleanedText,
          thinking: "Response provided by Claude",
          user_mood: "neutral" as const,
          suggested_questions: [],
          debug: { context_used: isRagWorking },
        };
      }
    } else if (cleanedText.startsWith("{")) {
      // Pure JSON without code blocks
      try {
        parsedResponse = sanitizeAndParseJSON(cleanedText);
        console.log("📦 Parsed pure JSON response - response field (first 300 chars):", parsedResponse.response?.substring(0, 300));
      } catch (parseError) {
        console.error("Error parsing JSON response:", parseError);
        parsedResponse = {
          response: cleanedText,
          thinking: "JSON parsing failed",
          user_mood: "neutral" as const,
          suggested_questions: [],
          debug: { context_used: isRagWorking },
        };
      }
    } else {
      // Plain text only - no JSON detected
      // But check if there's stray JSON at the end without code blocks (edge case)
      const jsonStartIndex = cleanedText.lastIndexOf('\n{');
      if (jsonStartIndex > 0) {
        const possibleJson = cleanedText.substring(jsonStartIndex + 1).trim();
        if (possibleJson.startsWith('{') && possibleJson.endsWith('}')) {
          try {
            const jsonParsed = JSON.parse(possibleJson);
            if (jsonParsed.response) {
              console.log("🧹 Found trailing JSON object, using parsed response");
              parsedResponse = jsonParsed;
            } else {
              throw new Error("No response field in trailing JSON");
            }
          } catch (e) {
            // Not valid JSON, use entire text
            parsedResponse = {
              response: cleanedText,
              thinking: "Response provided by Claude with tool results",
              user_mood: "neutral" as const,
              suggested_questions: [],
              debug: { context_used: isRagWorking },
            };
          }
        } else {
          parsedResponse = {
            response: cleanedText,
            thinking: "Response provided by Claude with tool results",
            user_mood: "neutral" as const,
            suggested_questions: [],
            debug: { context_used: isRagWorking },
          };
        }
      } else {
        parsedResponse = {
          response: cleanedText,
          thinking: "Response provided by Claude with tool results",
          user_mood: "neutral" as const,
          suggested_questions: [],
          debug: { context_used: isRagWorking },
        };
      }
    }

    // Additional safeguard: Ensure response field is clean text, not nested JSON
    if (parsedResponse.response && typeof parsedResponse.response === 'string') {
      const trimmedResponse = parsedResponse.response.trim();
      // Check if response field contains JSON (nested JSON issue)
      if (trimmedResponse.startsWith('{') || trimmedResponse.startsWith('[')) {
        try {
          const nestedParsed = JSON.parse(trimmedResponse);
          // If nested object has a 'response' field, use that instead
          if (nestedParsed && typeof nestedParsed === 'object' && nestedParsed.response) {
            console.log("⚠️ Detected nested JSON in response field, unwrapping...");
            parsedResponse.response = nestedParsed.response;
            // Also merge other fields if present
            if (nestedParsed.thinking) parsedResponse.thinking = nestedParsed.thinking;
            if (nestedParsed.user_mood) parsedResponse.user_mood = nestedParsed.user_mood;
            if (nestedParsed.suggested_questions) parsedResponse.suggested_questions = nestedParsed.suggested_questions;
          }
        } catch (e) {
          // Not valid JSON, keep original - this is expected for normal text responses
        }
      }
    }

    // Use safeParse to prevent Zod validation errors from crashing the response
    const parseResult = responseSchema.safeParse(parsedResponse);
    let validatedResponse;

    if (parseResult.success) {
      validatedResponse = parseResult.data;
    } else {
      // Log the validation error but still return the response
      console.warn("⚠️ Zod validation failed, using fallback:", parseResult.error.issues.map(i => `${i.path}: ${i.message}`).join(", "));
      validatedResponse = {
        response: parsedResponse.response || cleanedText || "Maaf, terjadi kesalahan. Silakan coba lagi.",
        thinking: parsedResponse.thinking || "Validation fallback",
        user_mood: "neutral" as const,
        suggested_questions: Array.isArray(parsedResponse.suggested_questions) ? parsedResponse.suggested_questions : [],
        debug: { context_used: isRagWorking },
        matched_categories: parsedResponse.matched_categories,
        tools_used: parsedResponse.tools_used,
        redirect_to_agent: parsedResponse.redirect_to_agent,
      };
    }

    const responseWithId = {
      id: crypto.randomUUID(),
      ...validatedResponse,
    };

    // Check if redirection to a human agent is needed
    if (responseWithId.redirect_to_agent?.should_redirect) {
      console.log("🚨 AGENT REDIRECT TRIGGERED!");
      console.log("Reason:", responseWithId.redirect_to_agent.reason);
    }

    // Save conversation to database if sessionId is provided
    if (sessionId) {
      try {
        measureTime("Database Save Start");

        // Use the conversation created earlier for sales tracking
        // If not available (shouldn't happen), create it now as fallback
        let conversationIdForSave = activeConversationId;

        if (!conversationIdForSave) {
          const customerIdentifier = sessionId ? `web_${sessionId}` : "081234567890";
          const customer = await getOrCreateCustomer(customerIdentifier);

          let conversation = await getActiveConversation(customer.id);
          if (!conversation) {
            conversation = await createConversation(customer.id);
            console.log("📝 Created new conversation for customer (fallback)");
          }
          conversationIdForSave = conversation.id;
        }

        // Save the latest user message (which is the one being responded to)
        // The messages array contains all messages sent to the API
        // We need to save only the latest user message sent
        const latestUserMessage = [...messages]
          .reverse()
          .find((m: any) => m.role === "user");

        // Batch save messages for better performance
        const messagesToSave = [];
        if (latestUserMessage) {
          messagesToSave.push({
            conversationId: conversationIdForSave,
            role: 'user' as const,
            content: latestUserMessage.content
          });
        }
        messagesToSave.push({
          conversationId: conversationIdForSave,
          role: 'assistant' as const,
          content: JSON.stringify({
            response: validatedResponse.response,
            thinking: validatedResponse.thinking,
          })
        });

        await addMessages(messagesToSave);
        logger.info('Messages saved to database', { count: messagesToSave.length });

        // Update conversation metadata
        await updateConversationMetadata(conversationIdForSave, {
          userMood: validatedResponse.user_mood,
          categories: validatedResponse.matched_categories || [],
          contextUsed: validatedResponse.debug.context_used,
          // Don't set redirectReason and wasRedirected here - will be set by redirectConversation()
        });
        console.log("✅ Conversation metadata updated");

        // ===== PHASE 4: Notify agent if redirect is needed =====
        console.log("🔍 DEBUG - redirect_to_agent:", JSON.stringify(responseWithId.redirect_to_agent));
        console.log("🔍 DEBUG - should_redirect value:", responseWithId.redirect_to_agent?.should_redirect);

        if (responseWithId.redirect_to_agent?.should_redirect) {
          const { redirectConversation } = await import("@/app/lib/db-service");
          const { notifyAgent } = await import("@/app/lib/notification-service");
          const { updateNotificationStatus } = await import("@/app/lib/db-service");

          try {
            // CRITICAL FIX: Update conversation status to REDIRECTED
            await redirectConversation(
              conversationIdForSave,
              responseWithId.redirect_to_agent.reason || "User requested human assistance"
            );
            console.log("✅ Conversation status changed to REDIRECTED");

            console.log("📤 Sending notification to agent...");
            const { emailSent, whatsappSent } = await notifyAgent(conversationIdForSave);

            // Update notification tracking in database
            const method = [emailSent && 'email', whatsappSent && 'whatsapp']
              .filter(Boolean)
              .join(',');
            const status = emailSent || whatsappSent ? 'sent' : 'failed';

            await updateNotificationStatus(conversationIdForSave, status, method);
            console.log(`✅ Agent notified via: ${method} `);
          } catch (notificationError) {
            console.error("❌ Failed to notify agent:", notificationError);
          }
        }
        // ===== END PHASE 4 =====

        measureTime("Database Save Complete");
      } catch (dbError) {
        console.error("❌ Database save failed:", dbError);
        logError(dbError as Error, {
          sessionId,
          conversationContext: "chat API save",
          userMessage: latestMessage.slice(0, 100),
        });
        // Continue anyway - don't fail the API call if database save fails
      }
    }

    // 🔒 FINAL VALIDATION: Ensure response field is ALWAYS a string
    // This prevents any JSON objects from leaking to frontend
    if (typeof responseWithId.response !== 'string') {
      console.error("⚠️ CRITICAL: response field is not a string!", typeof responseWithId.response);
      // Force convert to string - use type assertion for error handling
      const responseValue = responseWithId.response as any;
      if (responseValue && typeof responseValue === 'object') {
        // If it's an object with a 'response' field, extract it
        if ('response' in responseValue) {
          responseWithId.response = String(responseValue.response);
        } else {
          // Otherwise, stringify but wrap in error message
          responseWithId.response = "Maaf, terjadi kesalahan format response. Silakan coba lagi.";
          console.error("Response object without response field:", responseValue);
        }
      } else {
        responseWithId.response = String(responseValue);
      }
    }

    // Log the cleaned response being sent to frontend
    console.log("📤 Final response being sent to frontend (first 300 chars):", responseWithId.response?.substring(0, 300));
    console.log("📊 Response metadata:", {
      user_mood: responseWithId.user_mood,
      suggested_questions_count: responseWithId.suggested_questions?.length,
      redirect_to_agent: responseWithId.redirect_to_agent?.should_redirect,
      response_type: typeof responseWithId.response, // 🔍 Log type for debugging
    });

    // 💾 CACHE RESPONSE: Store for future identical queries
    const inputTokens = response.usage?.input_tokens || 0;
    const outputTokens = response.usage?.output_tokens || 0;

    responseCache.set(
      clinicId,
      latestMessage,
      {
        response: responseWithId.response,
        thinking: responseWithId.thinking,
        user_mood: responseWithId.user_mood,
        suggested_questions: responseWithId.suggested_questions,
        debug: responseWithId.debug,
        matched_categories: responseWithId.matched_categories,
        tools_used: responseWithId.tools_used,
        redirect_to_agent: responseWithId.redirect_to_agent,
      },
      inputTokens,
      outputTokens
    );

    console.log('📊 Cache stats:', responseCache.getStats());

    // Prepare the response object
    const apiResponse = new Response(JSON.stringify(responseWithId), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add RAG sources to the response headers if available
    if (ragSources.length > 0) {
      apiResponse.headers.set(
        "x-rag-sources",
        sanitizeHeaderValue(JSON.stringify(ragSources)),
      );
    }

    // Add debug data to the response headers
    apiResponse.headers.set("X-Debug-Data", sanitizeHeaderValue(debugData));

    measureTime("API Complete");

    return apiResponse;
  } catch (error) {
    // Handle errors in AI response generation
    console.error("💥 Error in message generation:", error);
    logError(error as Error, {
      model,
      messagesCount: messages.length,
      latestQuery: latestMessage,
    });

    // Return emergency fallback response
    const language = latestMessage.match(/[a-zA-Z]/) ? 'en' : 'id';
    const errorResponse = getEmergencyResponse(language);

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "X-Error": "claude-api-failure",
      },
    });
  }
}
