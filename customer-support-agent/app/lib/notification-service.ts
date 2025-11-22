/**
 * Notification Service for Phase 4
 * Sends email & WhatsApp alerts to agents when customer needs manual help
 */
import { Resend } from 'resend';
import twilio from 'twilio';

const resend = new Resend(process.env.RESEND_API_KEY);
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * Send email notification to agent
 */
export async function sendAgentNotificationEmail(
  conversationId: string,
  customerName: string,
  lastMessage: string,
  redirectReason: string
) {
  try {
    const adminLink = `${process.env.NEXT_PUBLIC_BASE_URL}/admin/conversations?key=${process.env.ADMIN_KEY}`;

    const result = await resend.emails.send({
      from: 'Customer Support Bot <onboarding@resend.dev>',
      to: process.env.AGENT_EMAIL!,
      subject: '🚨 Customer Membutuhkan Bantuan Manual',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">🚨 Customer Membutuhkan Bantuan</h2>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 10px; font-weight: bold;">Customer:</td>
              <td style="padding: 10px;">${customerName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 10px; font-weight: bold;">Conversation ID:</td>
              <td style="padding: 10px;">${conversationId}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 10px; font-weight: bold;">Alasan:</td>
              <td style="padding: 10px;">${redirectReason}</td>
            </tr>
          </table>

          <div style="background: #f9fafb; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0;">
            <h3 style="margin-top: 0;">Pesan Terakhir Customer:</h3>
            <p style="margin: 0;">${lastMessage}</p>
          </div>

          <a href="${adminLink}"
             style="display: inline-block; padding: 12px 24px; background: #16a34a; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px;">
            Buka Admin Panel
          </a>

          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Klik tombol di atas untuk melihat detail lengkap conversation dan merespons customer.
          </p>
        </div>
      `,
    });

    console.log('✅ Email notification sent to', process.env.AGENT_EMAIL);
    console.log('📧 Resend API Response:', JSON.stringify(result));
    return true;
  } catch (error) {
    console.error('❌ Email notification failed:', error);
    console.error('📧 Email Config:', {
      from: 'onboarding@resend.dev',
      to: process.env.AGENT_EMAIL,
      agentEmailDefined: !!process.env.AGENT_EMAIL,
      resendKeyDefined: !!process.env.RESEND_API_KEY,
      resendKeyLength: process.env.RESEND_API_KEY?.length,
    });

    // Log full error details from Resend
    if (error && typeof error === 'object') {
      console.error('📧 Resend Error Details:', JSON.stringify(error, null, 2));
    }

    return false;
  }
}

/**
 * Send WhatsApp notification to agent
 */
export async function sendAgentNotificationWhatsApp(
  conversationId: string,
  customerName: string,
  lastMessage: string,
  redirectReason: string
) {
  try {
    const adminLink = `${process.env.NEXT_PUBLIC_BASE_URL}/admin/conversations?key=${process.env.ADMIN_KEY}`;

    // Truncate message if too long
    const truncatedMessage = lastMessage.length > 100
      ? lastMessage.slice(0, 100) + '...'
      : lastMessage;

    const message = `🚨 *Customer Butuh Bantuan*

*Customer:* ${customerName}
*Alasan:* ${redirectReason}

*Pesan Terakhir:*
"${truncatedMessage}"

*Admin Panel:* ${adminLink}`;

    const result = await twilioClient.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: `whatsapp:${process.env.AGENT_WHATSAPP_NUMBER}`,
      body: message,
    });

    console.log('✅ WhatsApp notification sent to', process.env.AGENT_WHATSAPP_NUMBER);
    console.log('📱 Twilio Response:', JSON.stringify(result));
    return true;
  } catch (error) {
    console.error('❌ WhatsApp notification failed:', error);
    console.error('📱 WhatsApp Config:', {
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: `whatsapp:${process.env.AGENT_WHATSAPP_NUMBER}`,
      twilioSidDefined: !!process.env.TWILIO_ACCOUNT_SID,
      twilioTokenDefined: !!process.env.TWILIO_AUTH_TOKEN,
      twilioNumberDefined: !!process.env.TWILIO_WHATSAPP_NUMBER,
      agentNumberDefined: !!process.env.AGENT_WHATSAPP_NUMBER,
      agentNumberFormat: process.env.AGENT_WHATSAPP_NUMBER,
    });

    // Log full error details from Twilio
    if (error && typeof error === 'object') {
      console.error('📱 Twilio Error Details:', JSON.stringify(error, null, 2));
    }

    return false;
  }
}

/**
 * Main function: Notify agent via all channels
 * This is called when bot detects it can't help the customer
 */
export async function notifyAgent(conversationId: string) {
  console.log('📤 Sending agent notification for conversation:', conversationId);

  // Get conversation details from database
  const { prisma } = await import('./db-service');

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      customer: true,
      metadata: true,
      messages: { take: 1, orderBy: { timestamp: 'desc' } },
    },
  });

  if (!conversation) {
    console.error('❌ Conversation not found:', conversationId);
    return { emailSent: false, whatsappSent: false };
  }

  const lastMessage = conversation.messages[0]?.content || 'No message';
  const redirectReason = conversation.metadata?.redirectReason || 'Unknown reason';
  const customerName = conversation.customer.name || 'Unknown';

  // Send via both channels (parallel)
  const [emailSent, whatsappSent] = await Promise.all([
    sendAgentNotificationEmail(
      conversationId,
      customerName,
      lastMessage,
      redirectReason
    ),
    sendAgentNotificationWhatsApp(
      conversationId,
      customerName,
      lastMessage,
      redirectReason
    ),
  ]);

  // Log results
  const method = [emailSent && 'email', whatsappSent && 'whatsapp']
    .filter(Boolean)
    .join(',');

  if (!emailSent && !whatsappSent) {
    console.error('❌ All notification channels failed!');
  } else {
    console.log(`✅ Agent notified successfully via: ${method}`);
  }

  return { emailSent, whatsappSent };
}
