/**
 * Analytics Service
 * Provides functions for conversation analytics and reporting
 */

import { prisma } from './db-service';
import { ConversationStatus } from '@prisma/client';

/**
 * Get conversation statistics for a time range
 */
export async function getConversationStats(timeRange?: {
  startDate?: Date;
  endDate?: Date;
}) {
  const { startDate, endDate } = timeRange || {};

  const whereClause: any = {};
  if (startDate || endDate) {
    whereClause.startedAt = {};
    if (startDate) whereClause.startedAt.gte = startDate;
    if (endDate) whereClause.startedAt.lte = endDate;
  }

  const [
    totalConversations,
    activeConversations,
    endedConversations,
    redirectedConversations,
    averageMessagesPerConversation,
  ] = await Promise.all([
    prisma.conversation.count({ where: whereClause }),
    prisma.conversation.count({
      where: { ...whereClause, status: ConversationStatus.ACTIVE },
    }),
    prisma.conversation.count({
      where: { ...whereClause, status: ConversationStatus.ENDED },
    }),
    prisma.conversation.count({
      where: { ...whereClause, status: ConversationStatus.REDIRECTED },
    }),
    prisma.message
      .groupBy({
        by: ['conversationId'],
        _count: { id: true },
      })
      .then((results) => {
        const total = results.reduce((sum, r) => sum + r._count.id, 0);
        return results.length > 0 ? total / results.length : 0;
      }),
  ]);

  const redirectRate =
    totalConversations > 0
      ? (redirectedConversations / totalConversations) * 100
      : 0;

  const resolutionRate =
    totalConversations > 0
      ? ((totalConversations - redirectedConversations) / totalConversations) * 100
      : 0;

  return {
    totalConversations,
    activeConversations,
    endedConversations,
    redirectedConversations,
    redirectRate: redirectRate.toFixed(2) + '%',
    resolutionRate: resolutionRate.toFixed(2) + '%',
    averageMessagesPerConversation: averageMessagesPerConversation.toFixed(2),
  };
}

/**
 * Get mood distribution
 */
export async function getMoodDistribution(timeRange?: {
  startDate?: Date;
  endDate?: Date;
}) {
  const { startDate, endDate } = timeRange || {};

  let conversationWhere: any = {};
  if (startDate || endDate) {
    conversationWhere.startedAt = {};
    if (startDate) conversationWhere.startedAt.gte = startDate;
    if (endDate) conversationWhere.startedAt.lte = endDate;
  }

  const metadata = await prisma.conversationMetadata.findMany({
    where: {
      userMood: { not: null },
      conversation: conversationWhere,
    },
    select: { userMood: true },
  });

  const moodCounts: Record<string, number> = {};
  metadata.forEach((m) => {
    const mood = m.userMood || 'unknown';
    moodCounts[mood] = (moodCounts[mood] || 0) + 1;
  });

  const total = metadata.length;
  const moodDistribution = Object.entries(moodCounts).map(([mood, count]) => ({
    mood,
    count,
    percentage: total > 0 ? ((count / total) * 100).toFixed(2) + '%' : '0%',
  }));

  return {
    total,
    distribution: moodDistribution,
  };
}

/**
 * Get category distribution
 */
export async function getCategoryDistribution(timeRange?: {
  startDate?: Date;
  endDate?: Date;
}) {
  const { startDate, endDate } = timeRange || {};

  let conversationWhere: any = {};
  if (startDate || endDate) {
    conversationWhere.startedAt = {};
    if (startDate) conversationWhere.startedAt.gte = startDate;
    if (endDate) conversationWhere.startedAt.lte = endDate;
  }

  const metadata = await prisma.conversationMetadata.findMany({
    where: {
      conversation: conversationWhere,
    },
    select: { categories: true },
  });

  const categoryCounts: Record<string, number> = {};
  metadata.forEach((m) => {
    m.categories.forEach((category) => {
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
  });

  const totalCategories = Object.values(categoryCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  const categoryDistribution = Object.entries(categoryCounts)
    .map(([category, count]) => ({
      category,
      count,
      percentage:
        totalCategories > 0
          ? ((count / totalCategories) * 100).toFixed(2) + '%'
          : '0%',
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalCategories,
    distribution: categoryDistribution,
  };
}

/**
 * Get redirect reasons summary
 */
export async function getRedirectReasons(timeRange?: {
  startDate?: Date;
  endDate?: Date;
}) {
  const { startDate, endDate } = timeRange || {};

  let conversationWhere: any = { status: ConversationStatus.REDIRECTED };
  if (startDate || endDate) {
    conversationWhere.startedAt = {};
    if (startDate) conversationWhere.startedAt.gte = startDate;
    if (endDate) conversationWhere.startedAt.lte = endDate;
  }

  const metadata = await prisma.conversationMetadata.findMany({
    where: {
      wasRedirected: true,
      redirectReason: { not: null },
      conversation: conversationWhere,
    },
    select: { redirectReason: true },
  });

  const reasonCounts: Record<string, number> = {};
  metadata.forEach((m) => {
    const reason = m.redirectReason || 'Unknown';
    reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
  });

  const total = metadata.length;
  const reasonSummary = Object.entries(reasonCounts)
    .map(([reason, count]) => ({
      reason,
      count,
      percentage: total > 0 ? ((count / total) * 100).toFixed(2) + '%' : '0%',
    }))
    .sort((a, b) => b.count - a.count);

  return {
    total,
    reasons: reasonSummary,
  };
}

/**
 * Get top customers by conversation count
 */
export async function getTopCustomers(limit: number = 10) {
  const customers = await prisma.customer.findMany({
    include: {
      _count: {
        select: { conversations: true },
      },
    },
    orderBy: {
      conversations: {
        _count: 'desc',
      },
    },
    take: limit,
  });

  return customers.map((c) => ({
    phoneNumber: c.phoneNumber,
    name: c.name,
    conversationCount: c._count.conversations,
    createdAt: c.createdAt,
  }));
}

/**
 * Get comprehensive dashboard data
 */
export async function getDashboardData(timeRange?: {
  startDate?: Date;
  endDate?: Date;
}) {
  const [
    conversationStats,
    moodDistribution,
    categoryDistribution,
    redirectReasons,
    topCustomers,
  ] = await Promise.all([
    getConversationStats(timeRange),
    getMoodDistribution(timeRange),
    getCategoryDistribution(timeRange),
    getRedirectReasons(timeRange),
    getTopCustomers(5),
  ]);

  return {
    conversationStats,
    moodDistribution,
    categoryDistribution,
    redirectReasons,
    topCustomers,
    generatedAt: new Date().toISOString(),
  };
}
