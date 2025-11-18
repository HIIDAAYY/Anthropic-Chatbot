/**
 * WhatsApp Session Management
 * Maintains conversation history per phone number
 */

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface WhatsAppSession {
  phoneNumber: string;
  messages: Message[];
  lastActivity: Date;
}

// In-memory session store
// For production, consider using Redis or a database
const sessions = new Map<string, WhatsAppSession>();

// Session timeout: 30 minutes
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

/**
 * Get or create a session for a phone number
 * @param phoneNumber - WhatsApp phone number (e.g., "whatsapp:+628123456789")
 * @returns WhatsAppSession
 */
export function getSession(phoneNumber: string): WhatsAppSession {
  let session = sessions.get(phoneNumber);

  if (!session) {
    // Create new session
    session = {
      phoneNumber,
      messages: [],
      lastActivity: new Date(),
    };
    sessions.set(phoneNumber, session);
    console.log(`Created new session for ${phoneNumber}`);
  } else {
    // Check if session has expired
    const timeSinceLastActivity =
      Date.now() - session.lastActivity.getTime();

    if (timeSinceLastActivity > SESSION_TIMEOUT_MS) {
      // Reset expired session
      console.log(`Session expired for ${phoneNumber}, creating new session`);
      session.messages = [];
    }

    // Update last activity
    session.lastActivity = new Date();
  }

  return session;
}

/**
 * Add a user message to the session
 * @param phoneNumber - WhatsApp phone number
 * @param content - Message content
 */
export function addUserMessage(
  phoneNumber: string,
  content: string
): WhatsAppSession {
  const session = getSession(phoneNumber);
  session.messages.push({
    role: 'user',
    content,
  });
  session.lastActivity = new Date();

  // Keep only last 10 messages to prevent memory issues
  if (session.messages.length > 10) {
    session.messages = session.messages.slice(-10);
  }

  console.log(
    `Added user message to session ${phoneNumber}. Total messages: ${session.messages.length}`
  );

  return session;
}

/**
 * Add an assistant message to the session
 * @param phoneNumber - WhatsApp phone number
 * @param content - Message content
 */
export function addAssistantMessage(
  phoneNumber: string,
  content: string
): WhatsAppSession {
  const session = getSession(phoneNumber);
  session.messages.push({
    role: 'assistant',
    content,
  });
  session.lastActivity = new Date();

  // Keep only last 10 messages to prevent memory issues
  if (session.messages.length > 10) {
    session.messages = session.messages.slice(-10);
  }

  console.log(
    `Added assistant message to session ${phoneNumber}. Total messages: ${session.messages.length}`
  );

  return session;
}

/**
 * Clear all messages from a session
 * @param phoneNumber - WhatsApp phone number
 */
export function clearSession(phoneNumber: string): void {
  const session = sessions.get(phoneNumber);
  if (session) {
    session.messages = [];
    session.lastActivity = new Date();
    console.log(`Cleared session for ${phoneNumber}`);
  }
}

/**
 * Delete a session completely
 * @param phoneNumber - WhatsApp phone number
 */
export function deleteSession(phoneNumber: string): boolean {
  const deleted = sessions.delete(phoneNumber);
  if (deleted) {
    console.log(`Deleted session for ${phoneNumber}`);
  }
  return deleted;
}

/**
 * Get all active sessions
 * @returns Array of active sessions
 */
export function getActiveSessions(): WhatsAppSession[] {
  return Array.from(sessions.values());
}

/**
 * Clean up expired sessions
 * Call this periodically to prevent memory leaks
 */
export function cleanupExpiredSessions(): number {
  const now = Date.now();
  let cleaned = 0;

  for (const [phoneNumber, session] of sessions.entries()) {
    const timeSinceLastActivity = now - session.lastActivity.getTime();

    if (timeSinceLastActivity > SESSION_TIMEOUT_MS) {
      sessions.delete(phoneNumber);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`Cleaned up ${cleaned} expired sessions`);
  }

  return cleaned;
}

/**
 * Get session statistics
 * @returns Object with session stats
 */
export function getSessionStats() {
  return {
    totalSessions: sessions.size,
    sessions: Array.from(sessions.entries()).map(([phoneNumber, session]) => ({
      phoneNumber,
      messageCount: session.messages.length,
      lastActivity: session.lastActivity,
      isActive:
        Date.now() - session.lastActivity.getTime() < SESSION_TIMEOUT_MS,
    })),
  };
}

// Auto-cleanup expired sessions every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    cleanupExpiredSessions();
  }, 10 * 60 * 1000);
}
