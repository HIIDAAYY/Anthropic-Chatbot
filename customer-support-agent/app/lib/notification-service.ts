/**
 * Notification Service for Phase 4
 * Sends email alerts to agents when customer needs manual help
 */
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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
 * Main function: Notify agent via email
 * This is called when bot detects it can't help the customer
 */
export async function notifyAgent(conversationId: string) {
  console.log('📤 Sending email notification for conversation:', conversationId);

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

  // Send notification via email only
  const emailSent = await sendAgentNotificationEmail(
    conversationId,
    customerName,
    lastMessage,
    redirectReason
  );

  if (emailSent) {
    console.log('✅ Agent notified successfully via email');
  } else {
    console.error('❌ Email notification failed');
  }

  return { emailSent, whatsappSent: false };
}
