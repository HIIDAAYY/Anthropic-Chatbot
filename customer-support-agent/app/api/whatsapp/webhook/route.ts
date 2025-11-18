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

/**
 * WhatsApp Webhook - Receives incoming WhatsApp messages from Twilio
 * POST /api/whatsapp/webhook
 */
export async function POST(req: NextRequest) {
  try {
    // Parse form data from Twilio
    const formData = await req.formData();
    const from = formData.get('From') as string; // Sender's WhatsApp number
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

    // Get or create session for this phone number
    const session = getSession(from);

    // Add user message to session
    addUserMessage(from, body);

    console.log(
      `Session for ${from} has ${session.messages.length} messages`
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
        }),
      }
    );

    if (!chatResponse.ok) {
      console.error('Chat API error:', chatResponse.statusText);
      throw new Error('Failed to get response from chat API');
    }

    const chatData = await chatResponse.json();
    console.log('Chat API response:', chatData);

    // Extract response parts
    const responseText = chatData.response || 'Maaf, terjadi kesalahan.';
    const suggestedQuestions = chatData.suggested_questions || [];
    const shouldRedirect = chatData.redirect_to_agent?.should_redirect || false;

    // Add assistant message to session
    addAssistantMessage(from, responseText);

    // Send response via WhatsApp
    if (shouldRedirect) {
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

    // Try to send error message to user
    try {
      const formData = await req.formData();
      const from = formData.get('From') as string;

      if (from) {
        await sendWhatsAppMessage(
          from,
          'Maaf, terjadi kesalahan sistem. Mohon coba lagi dalam beberapa saat. 🙏'
        );
      }
    } catch (sendError) {
      console.error('Failed to send error message:', sendError);
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
