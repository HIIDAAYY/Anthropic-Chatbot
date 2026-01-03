/**
 * Sales Analytics Service
 * Provides aggregated sales metrics and analytics for the dashboard
 */

import { prisma } from '@/app/lib/db-service';
import { SalesFunnelStage } from '@prisma/client';

// Date range options for analytics
export type DateRange = '7d' | '30d' | '90d' | 'all';

interface DateFilter {
  gte?: Date;
}

function getDateFilter(range: DateRange): DateFilter {
  const now = new Date();
  switch (range) {
    case '7d':
      return { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
    case '30d':
      return { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
    case '90d':
      return { gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) };
    case 'all':
    default:
      return {};
  }
}

/**
 * Get overall sales performance metrics
 */
export async function getSalesOverview(range: DateRange = '30d') {
  const dateFilter = getDateFilter(range);

  try {
    // Total conversations in period
    const totalConversations = await prisma.conversation.count({
      where: {
        startedAt: dateFilter,
      },
    });

    // Conversations that converted to bookings
    const convertedConversations = await prisma.conversationMetadata.count({
      where: {
        convertedToBooking: true,
      },
    });

    // Total revenue from conversions
    const revenueData = await prisma.conversationMetadata.aggregate({
      where: {
        convertedToBooking: true,
      },
      _sum: {
        conversionRevenue: true,
      },
    });

    // Average intent score
    const intentData = await prisma.conversationMetadata.aggregate({
      where: {
        // ConversationMetadata doesn't have createdAt field
        // Date filtering happens at Conversation level above
      },
      _avg: {
        intentScore: true,
      },
    });

    // Promo codes used
    const promoUsage = await prisma.promoCode.aggregate({
      where: {
        validUntil: dateFilter, // Filter by promo expiry date
      },
      _sum: {
        usageCount: true,
      },
    });

    // Upsell attempts and success
    const upsellAttempts = await prisma.upsellAttempt.count({
      where: {
        shownAt: dateFilter,
      },
    });

    const upsellAccepted = await prisma.upsellAttempt.count({
      where: {
        shownAt: dateFilter,
        wasAccepted: true,
      },
    });

    const conversionRate =
      totalConversations > 0
        ? ((convertedConversations / totalConversations) * 100).toFixed(1)
        : '0';

    const upsellRate =
      upsellAttempts > 0
        ? ((upsellAccepted / upsellAttempts) * 100).toFixed(1)
        : '0';

    return {
      totalConversations,
      convertedConversations,
      conversionRate: parseFloat(conversionRate),
      totalRevenue: revenueData._sum.conversionRevenue || 0,
      averageIntentScore: Math.round(intentData._avg.intentScore || 0),
      promoCodesUsed: promoUsage._sum.usageCount || 0,
      upsellAttempts,
      upsellAccepted,
      upsellRate: parseFloat(upsellRate),
      averageOrderValue:
        convertedConversations > 0
          ? Math.round((revenueData._sum.conversionRevenue || 0) / convertedConversations)
          : 0,
    };
  } catch (error) {
    console.error('Error getting sales overview:', error);
    throw error;
  }
}

/**
 * Get sales funnel breakdown
 */
export async function getSalesFunnelMetrics(range: DateRange = '30d') {
  const dateFilter = getDateFilter(range);

  try {
    const stages: SalesFunnelStage[] = [
      'AWARENESS',
      'INTEREST',
      'CONSIDERATION',
      'INTENT',
      'BOOKING',
      'PAYMENT',
      'COMPLETED',
    ];

    const funnelData = await Promise.all(
      stages.map(async (stage) => {
        const count = await prisma.conversationMetadata.count({
          where: {
            salesStage: stage,
            createdAt: dateFilter,
          },
        });

        return {
          stage,
          count,
        };
      })
    );

    // Calculate drop-off rates
    const funnelWithDropoff = funnelData.map((item, index) => {
      if (index === 0) {
        return { ...item, dropoffRate: 0 };
      }
      const previousCount = funnelData[index - 1].count;
      const dropoff =
        previousCount > 0
          ? ((previousCount - item.count) / previousCount) * 100
          : 0;
      return { ...item, dropoffRate: Math.round(dropoff) };
    });

    return funnelWithDropoff;
  } catch (error) {
    console.error('Error getting sales funnel metrics:', error);
    throw error;
  }
}

/**
 * Get promo code performance metrics
 */
export async function getPromoCodeMetrics(range: DateRange = '30d') {
  const dateFilter = getDateFilter(range);

  try {
    const promoCodes = await prisma.promoCode.findMany({
      where: {
        createdAt: dateFilter,
      },
      include: {
        bookings: true,
      },
      orderBy: { usageCount: 'desc' },
      take: 10,
    });

    const metrics = promoCodes.map((promo) => {
      const totalDiscount = promo.bookings.reduce((sum, booking) => {
        return sum + (booking.discountAmount || 0);
      }, 0);

      return {
        code: promo.code,
        type: promo.type,
        discountValue: promo.discountValue,
        usageCount: promo.usageCount,
        totalDiscountGiven: totalDiscount,
        conversionCount: promo.bookings.length,
        isActive: promo.isActive,
        validUntil: promo.validUntil,
      };
    });

    // Summary stats
    const totalPromos = await prisma.promoCode.count({
      where: { createdAt: dateFilter },
    });

    const activePromos = await prisma.promoCode.count({
      where: {
        createdAt: dateFilter,
        isActive: true,
      },
    });

    const totalUsage = await prisma.promoCode.aggregate({
      where: { createdAt: dateFilter },
      _sum: { usageCount: true },
    });

    return {
      topPromoCodes: metrics,
      summary: {
        totalPromos,
        activePromos,
        totalUsage: totalUsage._sum.usageCount || 0,
      },
    };
  } catch (error) {
    console.error('Error getting promo code metrics:', error);
    throw error;
  }
}

/**
 * Get upsell performance metrics
 */
export async function getUpsellMetrics(range: DateRange = '30d') {
  const dateFilter = getDateFilter(range);

  try {
    // Group upsells by type
    const upsellsByType = await prisma.upsellAttempt.groupBy({
      by: ['upsellType'],
      where: {
        shownAt: dateFilter,
      },
      _count: { id: true },
    });

    // Get accepted rates by type
    const acceptedByType = await prisma.upsellAttempt.groupBy({
      by: ['upsellType'],
      where: {
        shownAt: dateFilter,
        wasAccepted: true,
      },
      _count: { id: true },
    });

    // Combine for conversion rates
    const typeMetrics = upsellsByType.map((type) => {
      const accepted = acceptedByType.find((a) => a.upsellType === type.upsellType);
      const acceptedCount = accepted?._count.id || 0;
      const conversionRate =
        type._count.id > 0
          ? ((acceptedCount / type._count.id) * 100).toFixed(1)
          : '0';

      return {
        type: type.upsellType,
        attempts: type._count.id,
        accepted: acceptedCount,
        conversionRate: parseFloat(conversionRate),
      };
    });

    // Top upsell suggestions
    const topSuggestions = await prisma.upsellAttempt.groupBy({
      by: ['suggestedServiceId'],
      where: {
        shownAt: dateFilter,
        wasAccepted: true,
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    // Total revenue from upsells
    const upsellRevenue = await prisma.upsellAttempt.aggregate({
      where: {
        shownAt: dateFilter,
        wasAccepted: true,
      },
      _sum: { priceDifference: true },
    });

    return {
      byType: typeMetrics,
      topSuggestions: topSuggestions.map((s) => ({
        serviceId: s.suggestedServiceId,
        acceptedCount: s._count.id,
      })),
      totalUpsellRevenue: upsellRevenue._sum.priceDifference || 0,
    };
  } catch (error) {
    console.error('Error getting upsell metrics:', error);
    throw error;
  }
}

/**
 * Get objection handling metrics
 */
export async function getObjectionMetrics(range: DateRange = '30d') {
  const dateFilter = getDateFilter(range);

  try {
    // Get conversations with objections
    const conversationsWithObjections = await prisma.conversationMetadata.findMany({
      where: {
        createdAt: dateFilter,
        objectionsFaced: { isEmpty: false },
      },
      select: {
        objectionsFaced: true,
        convertedToBooking: true,
      },
    });

    // Count objection types
    const objectionCounts: Record<string, { total: number; converted: number }> = {};

    conversationsWithObjections.forEach((conv) => {
      (conv.objectionsFaced || []).forEach((objection) => {
        if (!objectionCounts[objection]) {
          objectionCounts[objection] = { total: 0, converted: 0 };
        }
        objectionCounts[objection].total++;
        if (conv.convertedToBooking) {
          objectionCounts[objection].converted++;
        }
      });
    });

    // Calculate recovery rates
    const objectionMetrics = Object.entries(objectionCounts).map(
      ([objection, counts]) => ({
        objection,
        occurrences: counts.total,
        recoveredConversions: counts.converted,
        recoveryRate:
          counts.total > 0
            ? parseFloat(((counts.converted / counts.total) * 100).toFixed(1))
            : 0,
      })
    );

    // Sort by occurrences
    objectionMetrics.sort((a, b) => b.occurrences - a.occurrences);

    return {
      objections: objectionMetrics,
      totalObjectionConversations: conversationsWithObjections.length,
      averageRecoveryRate:
        objectionMetrics.length > 0
          ? parseFloat(
              (
                objectionMetrics.reduce((sum, o) => sum + o.recoveryRate, 0) /
                objectionMetrics.length
              ).toFixed(1)
            )
          : 0,
    };
  } catch (error) {
    console.error('Error getting objection metrics:', error);
    throw error;
  }
}

/**
 * Get daily conversion trends
 */
export async function getConversionTrends(range: DateRange = '30d') {
  const dateFilter = getDateFilter(range);

  try {
    // Get all conversions in range
    const conversions = await prisma.conversationMetadata.findMany({
      where: {
        conversionTime: dateFilter,
        convertedToBooking: true,
      },
      select: {
        conversionTime: true,
        conversionRevenue: true,
      },
      orderBy: { conversionTime: 'asc' },
    });

    // Group by day
    const dailyData: Record<
      string,
      { date: string; conversions: number; revenue: number }
    > = {};

    conversions.forEach((conv) => {
      if (conv.conversionTime) {
        const dateKey = conv.conversionTime.toISOString().split('T')[0];
        if (!dailyData[dateKey]) {
          dailyData[dateKey] = { date: dateKey, conversions: 0, revenue: 0 };
        }
        dailyData[dateKey].conversions++;
        dailyData[dateKey].revenue += conv.conversionRevenue || 0;
      }
    });

    return Object.values(dailyData);
  } catch (error) {
    console.error('Error getting conversion trends:', error);
    throw error;
  }
}

/**
 * Get top performing services by conversion
 */
export async function getTopServicesMetrics(range: DateRange = '30d') {
  const dateFilter = getDateFilter(range);

  try {
    // Get conversations with services interested
    const conversations = await prisma.conversationMetadata.findMany({
      where: {
        createdAt: dateFilter,
        servicesInterested: { isEmpty: false },
      },
      select: {
        servicesInterested: true,
        convertedToBooking: true,
        conversionRevenue: true,
      },
    });

    // Aggregate by service
    const serviceStats: Record<
      string,
      { interested: number; converted: number; revenue: number }
    > = {};

    conversations.forEach((conv) => {
      (conv.servicesInterested || []).forEach((service) => {
        if (!serviceStats[service]) {
          serviceStats[service] = { interested: 0, converted: 0, revenue: 0 };
        }
        serviceStats[service].interested++;
        if (conv.convertedToBooking) {
          serviceStats[service].converted++;
          serviceStats[service].revenue += conv.conversionRevenue || 0;
        }
      });
    });

    // Calculate conversion rates and sort
    const serviceMetrics = Object.entries(serviceStats)
      .map(([service, stats]) => ({
        service,
        inquiries: stats.interested,
        conversions: stats.converted,
        revenue: stats.revenue,
        conversionRate:
          stats.interested > 0
            ? parseFloat(
                ((stats.converted / stats.interested) * 100).toFixed(1)
              )
            : 0,
      }))
      .sort((a, b) => b.conversions - a.conversions)
      .slice(0, 10);

    return serviceMetrics;
  } catch (error) {
    console.error('Error getting top services metrics:', error);
    throw error;
  }
}

/**
 * Get comprehensive sales dashboard data
 */
export async function getSalesDashboardData(range: DateRange = '30d') {
  try {
    const [
      overview,
      funnel,
      promos,
      upsells,
      objections,
      trends,
      topServices,
    ] = await Promise.all([
      getSalesOverview(range),
      getSalesFunnelMetrics(range),
      getPromoCodeMetrics(range),
      getUpsellMetrics(range),
      getObjectionMetrics(range),
      getConversionTrends(range),
      getTopServicesMetrics(range),
    ]);

    return {
      overview,
      funnel,
      promos,
      upsells,
      objections,
      trends,
      topServices,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error getting sales dashboard data:', error);
    throw error;
  }
}
