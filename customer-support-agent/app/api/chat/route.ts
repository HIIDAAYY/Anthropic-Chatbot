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
  getOrCreateCustomer,
  getActiveConversation,
  createConversation,
  addMessage,
  updateConversationMetadata,
} from "@/app/lib/db-service";
import {
  BOT_TOOLS,
  extractToolUse,
  executeToolUse,
  formatToolResults,
} from "@/app/lib/bot-tools";

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
const responseSchema = z.object({
  response: z.string(),
  thinking: z.string(),
  user_mood: z.enum([
    "positive",
    "neutral",
    "negative",
    "curious",
    "frustrated",
    "confused",
  ]),
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
    "purity-clinic": "The Purity Aesthetic Clinic",
    "pramudia-clinic": "Klinik Pramudia",
    "beauty-plus-clinic": "Beauty+ Clinic",
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
  let { messages, model, knowledgeBaseId, sessionId, businessContext, customerId } = await req.json();

  // Set default model if not provided
  model = model || 'claude-haiku-4-5-20251001';

  // Validate messages array
  if (!messages || messages.length === 0) {
    console.error("❌ No messages provided in request");
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
    console.error("❌ Latest message has no content");
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
    console.warn("⚠️ No sessionId provided - messages will not be persisted");
  }

  console.log("📝 Latest Query:", latestMessage);
  measureTime("User Input Received");

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
      const { PrismaClient } = await import("@prisma/client");
      const prisma = new PrismaClient();

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
      if (specificClinicId && glowClinic) {
        const clinicBusinessMap: Record<string, any> = {
          "glow-clinic": {
            businessId: glowClinic.id, // ← Use real DB ID
            businessName: "Klinik Glow Aesthetics",
            businessType: "BEAUTY_CLINIC",
            settings: glowClinic.settings,
          },
          "purity-clinic": {
            businessId: glowClinic.id, // ← Map to Glow's real DB ID (booking purpose)
            businessName: "The Purity Aesthetic Clinic",
            businessType: "BEAUTY_CLINIC",
            settings: glowClinic.settings,
          },
          "pramudia-clinic": {
            businessId: glowClinic.id, // ← Map to Glow's real DB ID (booking purpose)
            businessName: "Klinik Pramudia",
            businessType: "BEAUTY_CLINIC",
            settings: glowClinic.settings,
          },
          "beauty-plus-clinic": {
            businessId: glowClinic.id, // ← Map to Glow's real DB ID (booking purpose)
            businessName: "Beauty+ Clinic",
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

      await prisma.$disconnect();
    } catch (error) {
      console.error("Error auto-detecting business:", error);
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
  - Focus on clinic's beauty and dental services, treatments, and policies`;
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

  const systemPrompt = `${getSystemPromptIntro()}

  **Knowledge Base Context:**
  To help you answer the customer's question, we have retrieved the following information from our knowledge base. Use this information to provide accurate answers:
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
  - Use "Hai/Halo" or "Hi" for warmth
  - Emojis: 1-2 per response (😊 💎 ✨ 💡) - don't overuse
  - Friendly words: "aku", "kamu", "yuk", "siap!"
  - End with engaging question or CTA
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
  
  **What TO do:**
  ✅ "Botox di Glow Rp 2,5jt untuk area forehead. Mau cek slot tersedia? 😊"
  ✅ Direct answer first, then offer details
  ✅ Short sentences, active voice
  ✅ Warm but efficient

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

  ✅ CORRECT (You MUST do this):
  You MUST ask for ALL booking details in ONE response using this EXACT format:

  "Baik! Untuk melanjutkan booking, saya butuh beberapa informasi:

  1️⃣ **Tanggal** - Kapan Anda ingin datang? (contoh: 15 Januari 2026)
  2️⃣ **Jam** - Jam berapa yang diinginkan? (contoh: 14:00 atau 2 siang)
  3️⃣ **Nama Lengkap** - Siapa nama Anda?
  4️⃣ **Nomor Telepon** - Nomor HP yang bisa dihubungi?
  5️⃣ **Email** (opsional) - Alamat email Anda?

  Mohon berikan semua informasi di atas ya! 😊"

  THIS IS NOT OPTIONAL. LIST ALL 5 QUESTIONS WITH EMOJIS (1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣) EVERY TIME!

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
  
  **CRITICAL: Response Format**
  You must return ONLY a raw JSON object. Do NOT wrap it in markdown code blocks or backticks.

  Return the JSON object directly in this exact structure:
  {
      "thinking": "Brief explanation of your reasoning for how you should address the user's query",
      "response": "Your response to the user (may include tool results or regular answer)",
      "user_mood": "positive|neutral|negative|curious|frustrated|confused",
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

  Here are a few examples of how your response should look like (following CONCISE BUT WARM style):

  Example 1 - Simple price question (CONCISE & WARM):
  {
    "thinking": "Simple price inquiry about facial - be direct but friendly",
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

  Example 2 - Booking request (DIRECT):
  {
    "thinking": "Customer wants to book HIFU, ask for details directly with warm tone",
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

  Example 3 - Service list from tool (WITH SHORT DESCRIPTIONS):
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

  Example 4 - Question with upsell (ONE LINE, NATURAL):
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

  Example 5 - Medical question redirect (WARM BUT CLEAR):
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

  try {
    console.log(`🚀 Query Processing`);
    measureTime("Claude Generation Start");

    const anthropicMessages = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Initial API call with tools
    let response = await retryWithBackoff(
      async () => {
        try {
          console.log("🤖 Calling Claude API with tools...");
          return await anthropic.messages.create({
            model: model,
            max_tokens: 2000,
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

    // Handle tool use if Claude requested it
    if (response.stop_reason === "tool_use") {
      console.log("🔧 Tool use detected, executing tools...");

      // Extract tool use blocks
      const toolUses = extractToolUse(response);
      console.log(`📦 Found ${toolUses.length} tool(s) to execute`);

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
      const messagesWithTools: Anthropic.MessageParam[] = [
        ...anthropicMessages,
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
      console.log("🔄 Sending tool results back to Claude...");
      response = await retryWithBackoff(
        async () => {
          try {
            return await anthropic.messages.create({
              model: model,
              max_tokens: 2000,
              messages: messagesWithTools,
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

      console.log("✅ Claude response with tool results received");
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

    // Parse the response as JSON (Claude is instructed to return JSON)
    let parsedResponse;
    try {
      // Try to parse as JSON
      if (textContent.trim().startsWith("{")) {
        parsedResponse = sanitizeAndParseJSON(textContent);
        console.log("📦 Parsed response object - response field (first 300 chars):", parsedResponse.response?.substring(0, 300));
      } else {
        // If not JSON, wrap response as simple text
        parsedResponse = {
          response: textContent,
          thinking: "Response provided by Claude with tool results",
          user_mood: "neutral" as const,
          suggested_questions: [],
          debug: { context_used: isRagWorking },
        };
      }
    } catch (parseError) {
      console.error("Error parsing JSON response:", parseError);
      // Fallback: return text as response
      parsedResponse = {
        response: textContent,
        thinking: "Tool execution completed",
        user_mood: "neutral" as const,
        suggested_questions: [],
        debug: { context_used: isRagWorking },
      };
    }

    const validatedResponse = responseSchema.parse(parsedResponse);

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

        if (latestUserMessage) {
          await addMessage(conversationIdForSave, "user", latestUserMessage.content);
          console.log("✅ User message saved to database");
        }

        // Save assistant response
        await addMessage(
          conversationIdForSave,
          "assistant",
          JSON.stringify({
            response: validatedResponse.response,
            thinking: validatedResponse.thinking,
          })
        );
        console.log("✅ Assistant message saved to database");

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
