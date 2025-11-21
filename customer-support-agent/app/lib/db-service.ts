/**
 * Database Service Layer
 * Provides functions for managing customers, conversations, and messages
 */

import { PrismaClient, ConversationStatus, MessageRole } from '@prisma/client';

// Singleton pattern for Prisma Client
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Session timeout: 30 minutes (in milliseconds)
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

/**
 * Get or create a customer by phone number
 */
export async function getOrCreateCustomer(phoneNumber: string) {
  try {
    let customer = await prisma.customer.findUnique({
      where: { phoneNumber },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: { phoneNumber },
      });
      console.log(`Created new customer: ${phoneNumber}`);
    }

    return customer;
  } catch (error) {
    console.error('Error getting/creating customer:', error);
    throw error;
  }
}

/**
 * Get active conversation for a customer
 * Returns null if no active conversation or if conversation has expired
 */
export async function getActiveConversation(customerId: string) {
  try {
    const conversation = await prisma.conversation.findFirst({
      where: {
        customerId,
        status: ConversationStatus.ACTIVE,
      },
      include: {
        messages: {
          orderBy: { timestamp: 'asc' },
          take: 10, // Limit to last 10 messages
        },
        metadata: true,
      },
      orderBy: { startedAt: 'desc' },
    });

    if (!conversation) {
      return null;
    }

    // Check if conversation has expired
    const timeSinceStart = Date.now() - conversation.startedAt.getTime();
    if (timeSinceStart > SESSION_TIMEOUT_MS) {
      // Auto-end expired conversation
      await endConversation(conversation.id);
      console.log(`Auto-ended expired conversation: ${conversation.id}`);
      return null;
    }

    return conversation;
  } catch (error) {
    console.error('Error getting active conversation:', error);
    throw error;
  }
}

/**
 * Create a new conversation for a customer
 */
export async function createConversation(customerId: string) {
  try {
    const conversation = await prisma.conversation.create({
      data: {
        customerId,
        status: ConversationStatus.ACTIVE,
      },
      include: {
        messages: true,
        metadata: true,
      },
    });

    console.log(`Created new conversation: ${conversation.id} for customer: ${customerId}`);
    return conversation;
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
}

/**
 * Add a message to a conversation
 */
export async function addMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string
) {
  try {
    const message = await prisma.message.create({
      data: {
        conversationId,
        role: role as MessageRole,
        content,
      },
    });

    console.log(`Added ${role} message to conversation: ${conversationId}`);
    return message;
  } catch (error) {
    console.error('Error adding message:', error);
    throw error;
  }
}

/**
 * Get conversation history (messages)
 */
export async function getConversationHistory(
  conversationId: string,
  limit: number = 10
) {
  try {
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { timestamp: 'asc' },
      take: limit,
    });

    return messages;
  } catch (error) {
    console.error('Error getting conversation history:', error);
    throw error;
  }
}

/**
 * Update conversation metadata (mood, categories, redirect info)
 */
export async function updateConversationMetadata(
  conversationId: string,
  data: {
    userMood?: string;
    categories?: string[];
    redirectReason?: string;
    wasRedirected?: boolean;
    contextUsed?: boolean;
  }
) {
  try {
    // Check if metadata exists
    const existing = await prisma.conversationMetadata.findUnique({
      where: { conversationId },
    });

    let metadata;
    if (existing) {
      // Update existing metadata
      metadata = await prisma.conversationMetadata.update({
        where: { conversationId },
        data,
      });
    } else {
      // Create new metadata
      metadata = await prisma.conversationMetadata.create({
        data: {
          conversationId,
          ...data,
        },
      });
    }

    console.log(`Updated metadata for conversation: ${conversationId}`);
    return metadata;
  } catch (error) {
    console.error('Error updating conversation metadata:', error);
    throw error;
  }
}

/**
 * End a conversation
 */
export async function endConversation(conversationId: string) {
  try {
    const conversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: ConversationStatus.ENDED,
        endedAt: new Date(),
      },
    });

    console.log(`Ended conversation: ${conversationId}`);
    return conversation;
  } catch (error) {
    console.error('Error ending conversation:', error);
    throw error;
  }
}

/**
 * Mark conversation as redirected to human agent
 */
export async function redirectConversation(
  conversationId: string,
  reason: string
) {
  try {
    const conversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: ConversationStatus.REDIRECTED,
      },
    });

    // Update metadata
    await updateConversationMetadata(conversationId, {
      wasRedirected: true,
      redirectReason: reason,
    });

    console.log(`Redirected conversation: ${conversationId} - Reason: ${reason}`);
    return conversation;
  } catch (error) {
    console.error('Error redirecting conversation:', error);
    throw error;
  }
}

/**
 * Get conversation by ID with full details
 */
export async function getConversationById(conversationId: string) {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        customer: true,
        messages: {
          orderBy: { timestamp: 'asc' },
        },
        metadata: true,
      },
    });

    return conversation;
  } catch (error) {
    console.error('Error getting conversation by ID:', error);
    throw error;
  }
}

/**
 * Get all conversations for a customer
 */
export async function getCustomerConversations(customerId: string) {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { customerId },
      include: {
        messages: {
          orderBy: { timestamp: 'asc' },
        },
        metadata: true,
      },
      orderBy: { startedAt: 'desc' },
    });

    return conversations;
  } catch (error) {
    console.error('Error getting customer conversations:', error);
    throw error;
  }
}

/**
 * Clean up old ended conversations (older than 30 days)
 */
export async function cleanupOldConversations() {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await prisma.conversation.deleteMany({
      where: {
        status: {
          in: [ConversationStatus.ENDED, ConversationStatus.REDIRECTED],
        },
        endedAt: {
          lt: thirtyDaysAgo,
        },
      },
    });

    console.log(`Cleaned up ${result.count} old conversations`);
    return result.count;
  } catch (error) {
    console.error('Error cleaning up old conversations:', error);
    throw error;
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats() {
  try {
    const [
      totalCustomers,
      totalConversations,
      activeConversations,
      totalMessages,
      redirectedConversations,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.conversation.count(),
      prisma.conversation.count({
        where: { status: ConversationStatus.ACTIVE },
      }),
      prisma.message.count(),
      prisma.conversation.count({
        where: { status: ConversationStatus.REDIRECTED },
      }),
    ]);

    return {
      totalCustomers,
      totalConversations,
      activeConversations,
      totalMessages,
      redirectedConversations,
    };
  } catch (error) {
    console.error('Error getting database stats:', error);
    throw error;
  }
}

// ===== PHASE 4: NOTIFICATION & RESOLUTION FUNCTIONS =====

/**
 * Update notification tracking after sending notification to agent
 */
export async function updateNotificationStatus(
  conversationId: string,
  status: 'sent' | 'failed',
  method: string // "email", "whatsapp", or "email,whatsapp"
) {
  try {
    return await prisma.conversationMetadata.update({
      where: { conversationId },
      data: {
        notificationSentAt: new Date(),
        notificationStatus: status,
        notificationMethod: method,
      },
    });
  } catch (error) {
    console.error('Error updating notification status:', error);
    throw error;
  }
}

/**
 * Mark conversation as resolved by human agent
 */
export async function markConversationResolved(
  conversationId: string,
  resolvedBy: string,
  resolutionNotes: string
) {
  try {
    return await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: ConversationStatus.ENDED,
        metadata: {
          update: {
            resolvedAt: new Date(),
            resolvedBy,
            resolutionNotes,
          },
        },
      },
    });
  } catch (error) {
    console.error('Error marking conversation as resolved:', error);
    throw error;
  }
}

/**
 * Get all conversations pending agent action (redirected but not yet resolved)
 */
export async function getPendingConversations() {
  try {
    return await prisma.conversation.findMany({
      where: {
        status: ConversationStatus.REDIRECTED,
        metadata: {
          resolvedAt: null,
        },
      },
      include: {
        customer: true,
        metadata: true,
        messages: { take: 5, orderBy: { timestamp: 'desc' } },
      },
      orderBy: { startedAt: 'desc' },
    });
  } catch (error) {
    console.error('Error getting pending conversations:', error);
    throw error;
  }
}
