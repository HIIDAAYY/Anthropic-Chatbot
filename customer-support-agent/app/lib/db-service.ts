/**
 * Database Service Layer
 * Provides functions for managing customers, conversations, and messages
 */

import { PrismaClient, ConversationStatus, MessageRole, SalesFunnelStage, PromoType } from '@prisma/client';
import { logger } from './logger';

// Singleton pattern for Prisma Client
const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prismaClient = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

// 🔒 TENANT ISOLATION LOGGING
// Note: Prisma middleware ($use) requires @prisma/client ^5.0.0
// For now, we'll use manual logging in service functions
// TODO: Upgrade to Prisma 5+ and implement $use middleware for automatic enforcement

/**
 * Helper: Log database query for tenant models
 * Call this in service functions to track tenant isolation
 */
export function logTenantQuery(model: string, action: string, hasBusinessIdFilter: boolean) {
  logger.debug(`DB Query: ${model}.${action}`, {
    model,
    action,
    hasBusinessIdFilter,
  });

  if (!hasBusinessIdFilter && (action === 'findMany' || action === 'findFirst')) {
    logger.warn(`Query without businessId filter - potential data leak`, {
      model,
      action,
    });
  }
}

export const prisma = globalForPrisma.prisma || prismaClient;

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
      logger.info('Created new customer', { phoneNumber });
    }

    return customer;
  } catch (error) {
    logger.error('Error getting/creating customer', error);
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

    logger.info(`Added ${role} message to conversation`, { conversationId });
    return message;
  } catch (error) {
    logger.error('Error adding message', error);
    throw error;
  }
}

/**
 * Batch add multiple messages in a single transaction (performance optimization)
 */
export async function addMessages(
  messages: Array<{
    conversationId: string;
    role: 'user' | 'assistant';
    content: string;
  }>
) {
  try {
    const result = await prisma.message.createMany({
      data: messages.map(msg => ({
        conversationId: msg.conversationId,
        role: msg.role as MessageRole,
        content: msg.content,
      })),
    });

    logger.info('Batch added messages', { count: result.count });
    return result;
  } catch (error) {
    logger.error('Error batch adding messages', error);
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
 * Update conversation metadata (mood, categories, redirect info, resolution info)
 */
export async function updateConversationMetadata(
  conversationId: string,
  data: {
    userMood?: string;
    categories?: string[];
    redirectReason?: string;
    wasRedirected?: boolean;
    contextUsed?: boolean;
    resolvedAt?: Date;
    resolvedBy?: string;
    resolutionNotes?: string;
    lastDetectedClinicId?: string;
  }
) {
  try {
    // Check if metadata exists
    const existing = await prisma.conversationMetadata.findUnique({
      where: { conversationId },
    });

    // TEMPORARY FIX: Remove lastDetectedClinicId until Prisma Client is regenerated
    const safeData: any = { ...data };
    if ('lastDetectedClinicId' in safeData) {
      delete safeData.lastDetectedClinicId;
    }

    let metadata;
    if (existing) {
      // Update existing metadata
      metadata = await prisma.conversationMetadata.update({
        where: { conversationId },
        data: safeData,
      });
    } else {
      // Create new metadata
      metadata = await prisma.conversationMetadata.create({
        data: {
          conversationId,
          ...safeData,
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
    const now = new Date();

    // Use transaction to ensure both updates happen atomically
    const result = await prisma.$transaction(async (tx) => {
      // First, upsert metadata with resolution info
      await tx.conversationMetadata.upsert({
        where: { conversationId },
        create: {
          conversationId,
          wasRedirected: true,
          resolvedAt: now,
          resolvedBy,
          resolutionNotes,
        },
        update: {
          resolvedAt: now,
          resolvedBy,
          resolutionNotes,
        },
      });

      // Then update conversation status to ENDED
      const conversation = await tx.conversation.update({
        where: { id: conversationId },
        data: {
          status: ConversationStatus.ENDED,
          endedAt: now,
        },
      });

      return conversation;
    });

    console.log(`✅ Conversation ${conversationId} marked as ENDED and resolved`);
    console.log(`✅ Status changed to: ${result.status}`);
    return result;
  } catch (error) {
    console.error('❌ Error marking conversation as resolved:', error);
    console.error('❌ Conversation ID:', conversationId);
    throw error;
  }
}

/**
 * Get all conversations pending agent action (redirected but not yet resolved)
 */
export async function getPendingConversations() {
  try {
    // Use raw query to bypass Prisma Accelerate cache completely
    const conversations = await prisma.$queryRaw<any[]>`
      SELECT
        c.id,
        c.customer_id as "customerId",
        c.status,
        c.started_at as "startedAt",
        c.ended_at as "endedAt",
        cu.name as "customerName",
        cu.phone_number as "customerPhone",
        m.user_mood as "userMood",
        m.redirect_reason as "redirectReason",
        m.notification_sent_at as "notificationSentAt"
      FROM conversations c
      LEFT JOIN customers cu ON c.customer_id = cu.id
      LEFT JOIN conversation_metadata m ON c.id = m.conversation_id
      WHERE c.status = 'REDIRECTED'
      AND ${Date.now()} > 0 -- Cache buster to bypass Prisma Accelerate
      ORDER BY c.started_at DESC
    `;

    console.log('🔍 Raw query result count:', conversations.length);
    console.log('🔍 Conversation statuses:', conversations.map(c => `${c.id}: ${c.status}`));

    // Transform raw results to match expected format
    const result = await Promise.all(
      conversations.map(async (conv) => {
        const messages = await prisma.message.findMany({
          where: { conversationId: conv.id },
          orderBy: { timestamp: 'desc' },
          take: 5,
        });

        return {
          id: conv.id,
          customerId: conv.customerId,
          status: conv.status,
          startedAt: conv.startedAt,
          endedAt: conv.endedAt,
          customer: {
            name: conv.customerName,
            phoneNumber: conv.customerPhone,
          },
          metadata: {
            userMood: conv.userMood,
            redirectReason: conv.redirectReason,
            notificationSentAt: conv.notificationSentAt,
          },
          messages: messages,
        };
      })
    );

    console.log('✅ Returning', result.length, 'pending conversations');
    return result;
  } catch (error) {
    console.error('Error getting pending conversations:', error);
    throw error;
  }
}

// ===== AUTO-LEARNING: LearnedQAPair CRUD Functions =====

/**
 * Create a new learned Q&A pair from a conversation
 */
export async function createLearnedQAPair(data: {
  conversationId: string;
  sourceMessageIds: string[];
  question: string;
  answer: string;
  category?: string;
  qualityScore: number;
  confidenceScore: number;
}) {
  try {
    const qaPair = await prisma.learnedQAPair.create({
      data,
      include: {
        conversation: {
          include: {
            customer: true,
            metadata: true,
          },
        },
      },
    });

    console.log(`✅ Created learned Q&A pair: ${qaPair.id}`);
    return qaPair;
  } catch (error) {
    console.error('Error creating learned Q&A pair:', error);
    throw error;
  }
}

/**
 * Get learned Q&A pairs with optional filters
 */
export async function getLearnedQAPairs(filter?: {
  status?: string;
  conversationId?: string;
  minQualityScore?: number;
  category?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    const where: any = {};

    if (filter?.status) {
      where.status = filter.status;
    }

    if (filter?.conversationId) {
      where.conversationId = filter.conversationId;
    }

    if (filter?.minQualityScore !== undefined) {
      where.qualityScore = { gte: filter.minQualityScore };
    }

    if (filter?.category) {
      where.category = filter.category;
    }

    const qaPairs = await prisma.learnedQAPair.findMany({
      where,
      include: {
        conversation: {
          include: {
            customer: true,
            metadata: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: filter?.limit || 50,
      skip: filter?.offset || 0,
    });

    return qaPairs;
  } catch (error) {
    console.error('Error getting learned Q&A pairs:', error);
    throw error;
  }
}

/**
 * Get a single learned Q&A pair by ID
 */
export async function getLearnedQAPairById(id: string) {
  try {
    const qaPair = await prisma.learnedQAPair.findUnique({
      where: { id },
      include: {
        conversation: {
          include: {
            customer: true,
            metadata: true,
            messages: {
              orderBy: { timestamp: 'asc' },
            },
          },
        },
      },
    });

    return qaPair;
  } catch (error) {
    console.error('Error getting learned Q&A pair:', error);
    throw error;
  }
}

/**
 * Approve a Q&A pair for syncing to knowledge base
 */
export async function approveQAPair(
  id: string,
  reviewedBy: string,
  notes?: string
) {
  try {
    const qaPair = await prisma.learnedQAPair.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedBy,
        reviewedAt: new Date(),
        reviewNotes: notes,
      },
    });

    console.log(`✅ Approved Q&A pair: ${id}`);
    return qaPair;
  } catch (error) {
    console.error('Error approving Q&A pair:', error);
    throw error;
  }
}

/**
 * Reject a Q&A pair
 */
export async function rejectQAPair(
  id: string,
  reviewedBy: string,
  reason: string
) {
  try {
    const qaPair = await prisma.learnedQAPair.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedBy,
        reviewedAt: new Date(),
        reviewNotes: reason,
      },
    });

    console.log(`✅ Rejected Q&A pair: ${id}`);
    return qaPair;
  } catch (error) {
    console.error('Error rejecting Q&A pair:', error);
    throw error;
  }
}

/**
 * Update Q&A pair status (for syncing)
 */
export async function updateQAPairStatus(
  id: string,
  status: string,
  pineconeId?: string
) {
  try {
    const data: any = {
      status,
    };

    if (pineconeId) {
      data.pineconeId = pineconeId;
      data.syncedAt = new Date();
    }

    const qaPair = await prisma.learnedQAPair.update({
      where: { id },
      data,
    });

    console.log(`✅ Updated Q&A pair status: ${id} -> ${status}`);
    return qaPair;
  } catch (error) {
    console.error('Error updating Q&A pair status:', error);
    throw error;
  }
}

/**
 * Mark conversation as learned (update metadata)
 */
export async function markConversationAsLearned(
  conversationId: string,
  qualityScore: number
) {
  try {
    await prisma.conversationMetadata.upsert({
      where: { conversationId },
      create: {
        conversationId,
        qualityScore,
        learningEligible: true,
        learnedAt: new Date(),
      },
      update: {
        qualityScore,
        learningEligible: true,
        learnedAt: new Date(),
      },
    });

    console.log(`✅ Marked conversation as learned: ${conversationId}`);
  } catch (error) {
    console.error('Error marking conversation as learned:', error);
    throw error;
  }
}

/**
 * Get learning statistics
 */
export async function getLearnedQAStats() {
  try {
    const total = await prisma.learnedQAPair.count();
    const pending = await prisma.learnedQAPair.count({
      where: { status: 'PENDING' },
    });
    const approved = await prisma.learnedQAPair.count({
      where: { status: 'APPROVED' },
    });
    const synced = await prisma.learnedQAPair.count({
      where: { status: 'SYNCED' },
    });
    const rejected = await prisma.learnedQAPair.count({
      where: { status: 'REJECTED' },
    });

    // Average quality scores
    const qualityStats = await prisma.learnedQAPair.aggregate({
      _avg: {
        qualityScore: true,
        confidenceScore: true,
      },
    });

    // Learning-eligible conversations
    const eligibleConversations = await prisma.conversationMetadata.count({
      where: { learningEligible: true },
    });

    return {
      total,
      pending,
      approved,
      synced,
      rejected,
      avgQualityScore: qualityStats._avg.qualityScore || 0,
      avgConfidenceScore: qualityStats._avg.confidenceScore || 0,
      eligibleConversations,
    };
  } catch (error) {
    console.error('Error getting learned Q&A stats:', error);
    throw error;
  }
}

// ===== SALES AUTOMATION: Sales Funnel & Promo Functions =====

/**
 * Create a sales funnel log entry
 */
export async function createSalesFunnelLog(data: {
  conversationId: string;
  fromStage: SalesFunnelStage;
  toStage: SalesFunnelStage;
  intentScoreBefore: number;
  intentScoreAfter: number;
  triggerAction?: string;
  notes?: string;
}) {
  try {
    const log = await prisma.salesFunnelLog.create({
      data,
    });

    console.log(`✅ Sales funnel log: ${data.fromStage} → ${data.toStage}`);
    return log;
  } catch (error) {
    console.error('Error creating sales funnel log:', error);
    throw error;
  }
}

/**
 * Create a new promo code
 */
export async function createPromoCode(data: {
  code: string;
  type: PromoType;
  discountValue: number;
  description?: string;
  minPurchaseAmount?: number;
  maxUsageCount?: number;
  validUntil?: Date;
  applicableServices?: string[];
  conversationId?: string;
  customerId?: string;
}) {
  try {
    const promo = await prisma.promoCode.create({
      data,
    });

    console.log(`✅ Created promo code: ${data.code} (${data.discountValue}% off)`);
    return promo;
  } catch (error) {
    console.error('Error creating promo code:', error);
    throw error;
  }
}

/**
 * Get promo code by code string
 */
export async function getPromoCodeByCode(code: string) {
  try {
    const promo = await prisma.promoCode.findUnique({
      where: { code },
      include: {
        conversation: true,
        customer: true,
        bookings: true,
      },
    });

    return promo;
  } catch (error) {
    console.error('Error getting promo code:', error);
    throw error;
  }
}

/**
 * Validate and check if promo code is usable
 */
export async function validatePromoCode(code: string, purchaseAmount?: number) {
  try {
    const promo = await getPromoCodeByCode(code);

    if (!promo) {
      return { valid: false, reason: 'Kode promo tidak ditemukan' };
    }

    if (!promo.isActive) {
      return { valid: false, reason: 'Kode promo sudah tidak aktif' };
    }

    if (promo.validUntil && promo.validUntil < new Date()) {
      return { valid: false, reason: 'Kode promo sudah expired' };
    }

    if (promo.maxUsageCount && promo.usageCount >= promo.maxUsageCount) {
      return { valid: false, reason: 'Kode promo sudah mencapai batas penggunaan' };
    }

    if (purchaseAmount && promo.minPurchaseAmount && purchaseAmount < promo.minPurchaseAmount) {
      return {
        valid: false,
        reason: `Minimum pembelian Rp ${promo.minPurchaseAmount.toLocaleString('id-ID')}`,
      };
    }

    return { valid: true, promo };
  } catch (error) {
    console.error('Error validating promo code:', error);
    throw error;
  }
}

/**
 * Increment promo code usage count
 */
export async function incrementPromoUsage(code: string) {
  try {
    const promo = await prisma.promoCode.update({
      where: { code },
      data: {
        usageCount: { increment: 1 },
      },
    });

    console.log(`✅ Promo ${code} usage incremented to ${promo.usageCount}`);
    return promo;
  } catch (error) {
    console.error('Error incrementing promo usage:', error);
    throw error;
  }
}

/**
 * Deactivate a promo code
 */
export async function deactivatePromoCode(code: string) {
  try {
    const promo = await prisma.promoCode.update({
      where: { code },
      data: { isActive: false },
    });

    console.log(`✅ Promo ${code} deactivated`);
    return promo;
  } catch (error) {
    console.error('Error deactivating promo code:', error);
    throw error;
  }
}

/**
 * Create an upsell attempt record
 */
export async function createUpsellAttempt(data: {
  conversationId: string;
  originalServiceId: string;
  suggestedServiceId: string;
  upsellType: string;
  reasonShown: string;
  priceDifference?: number;
}) {
  try {
    const attempt = await prisma.upsellAttempt.create({
      data,
    });

    console.log(`✅ Upsell attempt recorded: ${data.originalServiceId} → ${data.suggestedServiceId}`);
    return attempt;
  } catch (error) {
    console.error('Error creating upsell attempt:', error);
    throw error;
  }
}

/**
 * Mark upsell attempt as accepted
 */
export async function markUpsellAccepted(upsellId: string) {
  try {
    const attempt = await prisma.upsellAttempt.update({
      where: { id: upsellId },
      data: {
        wasAccepted: true,
        acceptedAt: new Date(),
      },
    });

    console.log(`✅ Upsell ${upsellId} marked as accepted`);
    return attempt;
  } catch (error) {
    console.error('Error marking upsell accepted:', error);
    throw error;
  }
}

/**
 * Get upsell attempts for a conversation
 */
export async function getUpsellAttempts(conversationId: string) {
  try {
    const attempts = await prisma.upsellAttempt.findMany({
      where: { conversationId },
      orderBy: { shownAt: 'desc' },
    });

    return attempts;
  } catch (error) {
    console.error('Error getting upsell attempts:', error);
    throw error;
  }
}

/**
 * Update sales-related metadata on a conversation
 */
export async function updateSalesMetadata(
  conversationId: string,
  data: {
    salesStage?: SalesFunnelStage;
    intentScore?: number;
    servicesInterested?: string[];
    objectionsFaced?: string[];
    promosOffered?: string[];
    upsellsShown?: string[];
    conversionProbability?: number;
    linkedBookingId?: string;
    convertedToBooking?: boolean;
    conversionRevenue?: number;
    conversionTime?: Date;
  }
) {
  try {
    const existing = await prisma.conversationMetadata.findUnique({
      where: { conversationId },
    });

    let metadata;
    if (existing) {
      metadata = await prisma.conversationMetadata.update({
        where: { conversationId },
        data,
      });
    } else {
      metadata = await prisma.conversationMetadata.create({
        data: {
          conversationId,
          ...data,
        },
      });
    }

    console.log(`✅ Updated sales metadata for conversation: ${conversationId}`);
    return metadata;
  } catch (error) {
    console.error('Error updating sales metadata:', error);
    throw error;
  }
}

/**
 * Link conversation to a booking (conversion tracking)
 */
export async function linkConversationToBooking(
  conversationId: string,
  bookingId: string,
  revenue: number
) {
  try {
    const metadata = await prisma.conversationMetadata.upsert({
      where: { conversationId },
      create: {
        conversationId,
        linkedBookingId: bookingId,
        convertedToBooking: true,
        conversionRevenue: revenue,
        conversionTime: new Date(),
        salesStage: SalesFunnelStage.BOOKING,
      },
      update: {
        linkedBookingId: bookingId,
        convertedToBooking: true,
        conversionRevenue: revenue,
        conversionTime: new Date(),
        salesStage: SalesFunnelStage.BOOKING,
      },
    });

    console.log(`✅ Linked conversation ${conversationId} to booking ${bookingId}`);
    return metadata;
  } catch (error) {
    console.error('Error linking conversation to booking:', error);
    throw error;
  }
}

/**
 * Get sales funnel logs for a conversation
 */
export async function getSalesFunnelLogs(conversationId: string) {
  try {
    const logs = await prisma.salesFunnelLog.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });

    return logs;
  } catch (error) {
    console.error('Error getting sales funnel logs:', error);
    throw error;
  }
}

/**
 * Get all active promo codes
 */
export async function getActivePromoCodes() {
  try {
    const promos = await prisma.promoCode.findMany({
      where: {
        isActive: true,
        OR: [
          { validUntil: null },
          { validUntil: { gte: new Date() } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    return promos;
  } catch (error) {
    console.error('Error getting active promo codes:', error);
    throw error;
  }
}

/**
 * Get promo codes by customer
 */
export async function getCustomerPromoCodes(customerId: string) {
  try {
    const promos = await prisma.promoCode.findMany({
      where: {
        customerId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return promos;
  } catch (error) {
    console.error('Error getting customer promo codes:', error);
    throw error;
  }
}
