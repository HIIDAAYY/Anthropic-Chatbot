import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { retrieveContext, RAGSource } from "@/app/lib/utils";
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
  const { messages, model, knowledgeBaseId, sessionId } = await req.json();
  const latestMessage = messages[messages.length - 1].content;

  // Validate sessionId for database persistence
  if (!sessionId) {
    console.warn("⚠️ No sessionId provided - messages will not be persisted");
  }

  console.log("📝 Latest Query:", latestMessage);
  measureTime("User Input Received");

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

    // Retry RAG retrieval with exponential backoff (max 2 retries)
    const result = await retryWithBackoff(
      () => retrieveContext(latestMessage, knowledgeBaseId),
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

  // Change the system prompt based on knowledge base
  const getSystemPromptIntro = () => {
    if (knowledgeBaseId === "clinic") {
      return `You are acting as a customer support assistant for Klinik Kecantikan & Gigi (Beauty & Dental Clinic), an Indonesian healthcare facility. You are chatting with patients/customers who need help with beauty treatments, dental services, appointments, pricing, and other clinic-related questions.

  **Important Guidelines:**
  - Respond in the SAME LANGUAGE as the customer's question (Indonesian or English)
  - Be friendly, helpful, and professional with a warm tone suitable for healthcare
  - Customers are primarily Indonesian, so be culturally aware and use appropriate greetings
  - Focus on clinic's beauty and dental services, treatments, and policies`;
    }

    // Default: UrbanStyle
    return `You are acting as a customer support assistant for UrbanStyle ID, an Indonesian fashion e-commerce platform. You are chatting with customers who need help with orders, payments, shipping, returns, products, and other e-commerce related questions.

  **Important Guidelines:**
  - Respond in the SAME LANGUAGE as the customer's question (Indonesian or English)
  - Be friendly, helpful, and professional with a warm tone suitable for fashion retail
  - Customers are primarily Indonesian, so be culturally aware and use appropriate greetings
  - Focus on UrbanStyle ID's products, services, and policies`;
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

  **Available Tools:**
  You have access to tools for real-time information. When needed:
  - Use "track_order" to get actual shipping status and tracking numbers
  - Use "verify_payment" to check real payment status and provide payment instructions
  - Use "check_inventory" to check product stock availability
  - Use "get_order_summary" to show customer's order history and spending
  - Use "cancel_order" to cancel pending orders (only PENDING or PROCESSING status)

  ${categoriesContext}

  If the question is completely unrelated to ${knowledgeBaseId === "clinic" ? "beauty, dental, healthcare, or clinic services" : "e-commerce, fashion, shopping, or UrbanStyle ID services"}, politely redirect the user to a human agent.

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

  Here are a few examples of how your response should look like:

  Example 1 - Indonesian customer asking about payment (with knowledge base info):
  {
    "thinking": "Customer asking about payment methods, found relevant information in knowledge base",
    "response": "Halo! UrbanStyle ID menerima berbagai metode pembayaran seperti Transfer Bank (BCA, Mandiri), E-Wallet (GoPay, OVO, ShopeePay), dan Kartu Kredit (Visa, Mastercard). Anda bisa memilih metode yang paling nyaman saat checkout. Ada yang ingin saya bantu lagi?",
    "user_mood": "curious",
    "suggested_questions": ["Bagaimana cara melakukan transfer bank?", "Apakah tersedia COD?", "Berapa lama proses pengiriman?"],
    "debug": {
      "context_used": true
    },
    "matched_categories": ["payment", "billing"],
    "redirect_to_agent": {
      "should_redirect": false
    }
  }

  Example 2 - English customer asking about shipping (with knowledge base info):
  {
    "thinking": "Customer asking about shipping, providing information from knowledge base",
    "response": "For shipping within Jakarta, we offer same-day delivery via GoSend/GrabExpress if you order before 2:00 PM. For other areas, standard shipping typically takes 2-5 business days depending on your location. You can track your order status in your account dashboard.",
    "user_mood": "neutral",
    "suggested_questions": ["How much is the shipping cost?", "Can I change my delivery address?", "What if my item doesn't arrive?"],
    "debug": {
      "context_used": true
    },
    "matched_categories": ["shipping", "delivery"],
    "redirect_to_agent": {
      "should_redirect": false
    }
  }

  Example 3 - Customer needs human agent (no relevant info or complex issue):
  {
    "thinking": "Customer asking to track specific order number, this requires account access",
    "response": "Untuk melacak status pesanan dengan nomor order spesifik, saya perlu menghubungkan Anda dengan tim customer service kami yang bisa mengakses detail pesanan Anda. Apakah Anda ingin saya sambungkan ke customer service?",
    "user_mood": "curious",
    "suggested_questions": [],
    "debug": {
      "context_used": false
    },
    "matched_categories": ["order_tracking"],
    "redirect_to_agent": {
      "should_redirect": true,
      "reason": "Requires access to specific order details in customer account"
    }
  }

  Example 4 - Question completely unrelated to UrbanStyle ID services:
  {
    "thinking": "Customer asking about Android app development which is completely unrelated to e-commerce, fashion, or UrbanStyle ID services. I should politely redirect to human agent.",
    "response": "Halo! Sepertinya pertanyaan Anda tidak terkait dengan layanan UrbanStyle ID. Saya di sini untuk membantu Anda dengan pesanan, produk fashion, pembayaran, pengiriman, dan hal-hal lainnya yang berkaitan dengan belanja di UrbanStyle ID. Jika Anda memiliki pertanyaan tentang fashion atau belanja di platform kami, saya siap membantu!",
    "user_mood": "neutral",
    "suggested_questions": ["Bagaimana cara membuat akun UrbanStyle ID?", "Produk fashion apa yang sedang trending?", "Bagaimana cara melakukan pemesanan?"],
    "debug": {
      "context_used": false
    },
    "matched_categories": [],
    "redirect_to_agent": {
      "should_redirect": true,
      "reason": "Question completely unrelated to UrbanStyle ID e-commerce services (asking about Android app development)"
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
      // For demo purposes, use the seeded customer phone number
      // In production, you'd use the logged-in user's actual phone number
      const DEMO_PHONE = "081234567890";
      const customer = await getOrCreateCustomer(DEMO_PHONE);

      // Execute tools
      const toolResults = await executeToolUse(toolUses, customer.id);

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

        // Get or create customer
        // Use sessionId to identify web users, fallback to demo phone
        const customerIdentifier = sessionId ? `web_${sessionId} ` : "081234567890";
        const customer = await getOrCreateCustomer(customerIdentifier);

        // Get active conversation, or create one if it doesn't exist
        let conversation = await getActiveConversation(customer.id);
        if (!conversation) {
          conversation = await createConversation(customer.id);
          console.log("📝 Created new conversation for customer");
        }

        // Save the latest user message (which is the one being responded to)
        // The messages array contains all messages sent to the API
        // We need to save only the latest user message sent
        const latestUserMessage = [...messages]
          .reverse()
          .find((m: any) => m.role === "user");

        if (latestUserMessage) {
          await addMessage(conversation.id, "user", latestUserMessage.content);
          console.log("✅ User message saved to database");
        }

        // Save assistant response
        await addMessage(
          conversation.id,
          "assistant",
          JSON.stringify({
            response: validatedResponse.response,
            thinking: validatedResponse.thinking,
          })
        );
        console.log("✅ Assistant message saved to database");

        // Update conversation metadata
        await updateConversationMetadata(conversation.id, {
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
              conversation.id,
              responseWithId.redirect_to_agent.reason || "User requested human assistance"
            );
            console.log("✅ Conversation status changed to REDIRECTED");

            console.log("📤 Sending notification to agent...");
            const { emailSent, whatsappSent } = await notifyAgent(conversation.id);

            // Update notification tracking in database
            const method = [emailSent && 'email', whatsappSent && 'whatsapp']
              .filter(Boolean)
              .join(',');
            const status = emailSent || whatsappSent ? 'sent' : 'failed';

            await updateNotificationStatus(conversation.id, status, method);
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
