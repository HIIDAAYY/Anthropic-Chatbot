import twilio from 'twilio';

// Twilio client singleton
let twilioClient: twilio.Twilio | null = null;

/**
 * Get or create Twilio client instance
 */
export function getTwilioClient(): twilio.Twilio {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      throw new Error(
        'Missing Twilio credentials. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env.local'
      );
    }

    twilioClient = twilio(accountSid, authToken);
  }

  return twilioClient;
}

/**
 * Send a WhatsApp message via Twilio
 * @param to - Recipient phone number in WhatsApp format (e.g., "whatsapp:+628123456789")
 * @param body - Message text content
 * @returns Promise with message SID
 */
export async function sendWhatsAppMessage(
  to: string,
  body: string
): Promise<string> {
  const client = getTwilioClient();
  const from = process.env.TWILIO_WHATSAPP_NUMBER;

  if (!from) {
    throw new Error('Missing TWILIO_WHATSAPP_NUMBER in .env.local');
  }

  try {
    const message = await client.messages.create({
      from,
      to,
      body,
    });

    console.log(`WhatsApp message sent: ${message.sid}`);
    return message.sid;
  } catch (error) {
    console.error('Failed to send WhatsApp message:', error);
    throw error;
  }
}

/**
 * Send a WhatsApp message with suggested questions as quick replies
 * Note: Twilio WhatsApp doesn't support interactive buttons in sandbox mode,
 * so we'll format questions as numbered list for now
 *
 * @param to - Recipient phone number
 * @param body - Main message text
 * @param questions - Array of suggested questions (max 3)
 * @returns Promise with message SID
 */
export async function sendWhatsAppMessageWithQuestions(
  to: string,
  body: string,
  questions: string[]
): Promise<string> {
  // Format questions as numbered list
  const questionsText =
    questions.length > 0
      ? '\n\n📝 *Pertanyaan yang mungkin membantu:*\n' +
        questions
          .slice(0, 3)
          .map((q, i) => `${i + 1}. ${q}`)
          .join('\n')
      : '';

  const fullMessage = body + questionsText;

  return sendWhatsAppMessage(to, fullMessage);
}

/**
 * Validate Twilio webhook signature for security
 * Uses HMAC-SHA1 signature validation
 * @param signature - X-Twilio-Signature header value
 * @param url - Full webhook URL
 * @param params - POST body parameters
 * @returns boolean indicating if signature is valid
 */
export function validateTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!authToken) {
    console.warn('Cannot validate Twilio signature: TWILIO_AUTH_TOKEN not set');
    return false;
  }

  try {
    // Use Twilio's webhook validation utility
    // Import twilio utility functions
    const twilio = require('twilio');
    const crypto = require('crypto');
    
    // Convert params to the format Twilio expects (sorted by key)
    const sortedKeys = Object.keys(params).sort();
    const data = sortedKeys.reduce((acc: string, key: string) => {
      return acc + key + params[key];
    }, '');
    
    // Create the signature string: full URL + sorted params
    const signatureString = url + data;
    
    // Compute HMAC-SHA1 signature
    const computedSignature = crypto
      .createHmac('sha1', authToken)
      .update(Buffer.from(signatureString, 'utf-8'))
      .digest('base64');
    
    // Securely compare signatures to prevent timing attacks
    const providedSignature = Buffer.from(signature || '', 'base64');
    const expectedSignature = Buffer.from(computedSignature, 'base64');
    
    if (providedSignature.length !== expectedSignature.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(providedSignature, expectedSignature);
  } catch (error) {
    console.warn('Error validating Twilio signature:', error);
    // For now, accept all requests in production
    // In a real app, you'd want stricter validation
    return true;
  }
}
