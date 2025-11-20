/**
 * WhatsApp Session Management
 * Now integrated with PostgreSQL database for persistent storage
 */

import {
  getOrCreateCustomer,
  getActiveConversation,
  createConversation,
  addMessage as dbAddMessage,
} from './db-service';
import { DatabaseError, logError } from './error-handler';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface WhatsAppSession {
  phoneNumber: string;
  messages: Message[];
  lastActivity: Date;
  conversationId?: string; // Added to track DB conversation
  customerId?: string; // Added to track DB customer
}

/**
 * Get or create a session for a phone number
 * Now loads from database for persistent sessions
 * @param phoneNumber - WhatsApp phone number (e.g., "whatsapp:+628123456789")
 * @returns WhatsAppSession
 */
export async function getSession(
  phoneNumber: string
): Promise<WhatsAppSession> {
  try {
    // Get or create customer in database
    const customer = await getOrCreateCustomer(phoneNumber);

    // Get active conversation
    let conversation = await getActiveConversation(customer.id);

    // Create new conversation if none exists or expired
    if (!conversation) {
      conversation = await createConversation(customer.id);
    }

    // Convert database messages to session format
    const messages: Message[] = conversation.messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    // Create session object
    const session: WhatsAppSession = {
      phoneNumber,
      messages,
      lastActivity: new Date(),
      conversationId: conversation.id,
      customerId: customer.id,
    };

    console.log(
      `Loaded session for ${phoneNumber} - Conversation: ${conversation.id}`
    );

    return session;
  } catch (error) {
    logError(error as Error, { phoneNumber });
    throw new DatabaseError(
      'Failed to load session from database',
      error as Error
    );
  }
}

/**
 * Add a user message to the session
 * Saves to database for persistence
 * @param phoneNumber - WhatsApp phone number
 * @param content - Message content
 */
export async function addUserMessage(
  phoneNumber: string,
  content: string
): Promise<WhatsAppSession> {
  try {
    const session = await getSession(phoneNumber);

    if (!session.conversationId) {
      throw new DatabaseError('Session has no conversation ID');
    }

    // Save message to database
    await dbAddMessage(session.conversationId, 'user', content);

    // Update session in memory
    session.messages.push({
      role: 'user',
      content,
    });
    session.lastActivity = new Date();

    // Keep only last 10 messages in memory
    if (session.messages.length > 10) {
      session.messages = session.messages.slice(-10);
    }

    console.log(
      `Added user message to conversation ${session.conversationId}. Total messages: ${session.messages.length}`
    );

    return session;
  } catch (error) {
    logError(error as Error, { phoneNumber });
    throw new DatabaseError('Failed to add user message', error as Error);
  }
}

/**
 * Add an assistant message to the session
 * Saves to database for persistence
 * @param phoneNumber - WhatsApp phone number
 * @param content - Message content
 */
export async function addAssistantMessage(
  phoneNumber: string,
  content: string
): Promise<WhatsAppSession> {
  try {
    const session = await getSession(phoneNumber);

    if (!session.conversationId) {
      throw new DatabaseError('Session has no conversation ID');
    }

    // Save message to database
    await dbAddMessage(session.conversationId, 'assistant', content);

    // Update session in memory
    session.messages.push({
      role: 'assistant',
      content,
    });
    session.lastActivity = new Date();

    // Keep only last 10 messages in memory
    if (session.messages.length > 10) {
      session.messages = session.messages.slice(-10);
    }

    console.log(
      `Added assistant message to conversation ${session.conversationId}. Total messages: ${session.messages.length}`
    );

    return session;
  } catch (error) {
    logError(error as Error, { phoneNumber });
    throw new DatabaseError('Failed to add assistant message', error as Error);
  }
}

/**
 * Clear a session (not needed anymore - database handles this)
 * Kept for backward compatibility
 * @deprecated Use database-backed sessions instead
 */
export async function clearSession(phoneNumber: string): Promise<void> {
  console.log(`Clear session requested for ${phoneNumber} - handled by database`);
}

/**
 * Delete a session (not needed anymore - database handles this)
 * Kept for backward compatibility
 * @deprecated Use database-backed sessions instead
 */
export async function deleteSession(phoneNumber: string): Promise<boolean> {
  console.log(`Delete session requested for ${phoneNumber} - handled by database`);
  return true;
}

/**
 * Get session statistics
 * @deprecated Use getDatabaseStats from db-service.ts instead
 */
export async function getSessionStats() {
  // Redirect to database stats
  const { getDatabaseStats } = await import('./db-service');
  return getDatabaseStats();
}
