import { NextRequest, NextResponse } from 'next/server';
import {
  sendWhatsAppMessage,
  sendWhatsAppMessageWithQuestions,
} from '@/app/lib/twilio-client';
import {
  getSession,
  addUserMessage,
  addAssistantMessage,
} from '@/app/lib/whatsapp-session';
import {
  updateConversationMetadata,
  redirectConversation,
} from '@/app/lib/db-service';
import {
  logError,
  DatabaseError,
  TwilioError,
  getEmergencyResponse,
} from '@/app/lib/error-handler';

/**
 * WhatsApp Webhook - Receives incoming WhatsApp messages from Twilio
 * POST /api/whatsapp/webhook
 */
export async function POST(req: NextRequest) {
  let from = '';

  try {
    // Parse form data from Twilio
    const formData = await req.formData();
    from = formData.get('From') as string; // Sender's WhatsApp number
    const body = formData.get('Body') as string; // Message text
    const messageSid = formData.get('MessageSid') as string;

    console.log('=== Incoming WhatsApp Message ===');
    console.log('From:', from);
    console.log('Message:', body);
    console.log('MessageSid:', messageSid);

    // Validate required fields
    if (!from || !body) {
      console.error('Missing required fields: From or Body');
      return new NextResponse('Bad Request', { status: 400 });
    }

    // Get or create session for this phone number (now async)
    const session = await getSession(from);

    // Add user message to session (now async)
    await addUserMessage(from, body);

    console.log(
      `Session for ${from} has ${session.messages.length} messages. Conversation ID: ${session.conversationId}`
    );

    // Call existing chat API with session history
    const chatResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: session.messages,
          model: 'claude-haiku-4-5-20251001', // Use Haiku for fast responses
          knowledgeBaseId: 'clinic', // Use Clinic knowledge base for WhatsApp
        }),
      }
    );

    if (!chatResponse.ok) {
      console.error('Chat API error:', chatResponse.statusText);
      throw new Error('Failed to get response from chat API');
    }

    const chatData = await chatResponse.json();
    console.log('Chat API response:', chatData);

    // Helper function to extract actual response from nested JSON
    const extractActualResponse = (responseStr: string): string => {
      if (!responseStr) return '';

      let result = responseStr.trim();

      // Check if response is a JSON code block
      const codeBlockMatch = result.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
      if (codeBlockMatch) {
        result = codeBlockMatch[1].trim();
        console.log('🔧 WhatsApp: Extracted from code block');
      }

      // Check if the content is JSON with a 'response' field
      if (result.startsWith('{')) {
        try {
          const innerParsed = JSON.parse(result);
          if (innerParsed.response && typeof innerParsed.response === 'string') {
            console.log('🔧 WhatsApp: Extracted nested response field');
            // Recursively extract in case of multiple nesting
            return extractActualResponse(innerParsed.response);
          }
        } catch (e) {
          // Not valid JSON, return as-is
        }
      }

      return result;
    };

    // Extract response parts
    const responseText = extractActualResponse(chatData.response) || 'Maaf, terjadi kesalahan.';
    const suggestedQuestions = chatData.suggested_questions || [];
    const shouldRedirect = chatData.redirect_to_agent?.should_redirect || false;
    const userMood = chatData.user_mood;
    const categories = chatData.matched_categories || [];
    const contextUsed = chatData.debug?.context_used || false;

    // Add assistant message to session (now async)
    await addAssistantMessage(from, responseText);

    // Save conversation metadata to database
    if (session.conversationId) {
      try {
        await updateConversationMetadata(session.conversationId, {
          userMood,
          categories,
          contextUsed,
          wasRedirected: shouldRedirect,
          redirectReason: chatData.redirect_to_agent?.reason,
        });
        console.log(`Saved metadata for conversation ${session.conversationId}`);
      } catch (metadataError) {
        // Log but don't fail the request if metadata save fails
        logError(metadataError as Error, {
          conversationId: session.conversationId,
          phoneNumber: from,
        });
      }
    }

    // Send response via WhatsApp
    if (shouldRedirect) {
      // Mark conversation as redirected in database
      if (session.conversationId) {
        try {
          await redirectConversation(
            session.conversationId,
            chatData.redirect_to_agent?.reason || 'User requested human agent'
          );
        } catch (redirectError) {
          logError(redirectError as Error, {
            conversationId: session.conversationId,
          });
        }
      }

      // Handle redirect to human agent
      const redirectMessage = `${responseText}\n\n🙋 *Butuh bantuan lebih lanjut?*\nTim customer service kami siap membantu Anda. Silakan hubungi kami melalui:\n📞 WhatsApp: +62 812-3456-7890\n📧 Email: support@urbanstyleid.com`;

      await sendWhatsAppMessage(from, redirectMessage);
    } else if (suggestedQuestions.length > 0) {
      // Send with suggested questions
      await sendWhatsAppMessageWithQuestions(
        from,
        responseText,
        suggestedQuestions
      );
    } else {
      // Send plain response
      await sendWhatsAppMessage(from, responseText);
    }

    console.log('✅ WhatsApp response sent successfully');

    // Return TwiML response (required by Twilio)
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: {
          'Content-Type': 'text/xml',
        },
      }
    );
  } catch (error) {
    console.error('Error processing WhatsApp webhook:', error);
    logError(error as Error, { from, messageBody: 'truncated for security' });

    // Try to send error message to user
    try {
      if (from) {
        const errorResponse = getEmergencyResponse('id');
        await sendWhatsAppMessage(from, errorResponse.response);
      }
    } catch (sendError) {
      console.error('Failed to send error message:', sendError);
      logError(sendError as Error, { from });
    }

    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: {
          'Content-Type': 'text/xml',
        },
      }
    );
  }
}

/**
 * GET endpoint for webhook verification (optional)
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'WhatsApp webhook is active',
    endpoint: '/api/whatsapp/webhook',
  });
}
