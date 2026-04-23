import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/app/lib/admin-auth';

export async function GET(request: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period') || 'today';

        let dateFilter = new Date();
        let daysCount = 1;
        if (period === 'today') {
            dateFilter.setHours(0, 0, 0, 0);
            daysCount = 1;
        } else if (period === '7d') {
            dateFilter.setDate(dateFilter.getDate() - 7);
            daysCount = 7;
        } else if (period === '30d') {
            dateFilter.setDate(dateFilter.getDate() - 30);
            daysCount = 30;
        } else if (period === '90d') {
            dateFilter.setDate(dateFilter.getDate() - 90);
            daysCount = 90;
        }

        const [
            totalConversations,
            activeHandoffs,
            handoffStats,
            salesStats,
            conversations,
            uniqueCustomers,
            totalHandoffs,
        ] = await Promise.all([
            prisma.conversation.count({
                where: { startedAt: { gte: dateFilter } }
            }),
            prisma.conversationHandoff.count({
                where: { status: { in: ['PENDING', 'IN_PROGRESS'] } }
            }),
            prisma.conversationHandoff.groupBy({
                by: ['status'],
                where: { handoffAt: { gte: dateFilter } },
                _count: true,
            }),
            prisma.conversationMetadata.aggregate({
                where: { conversation: { startedAt: { gte: dateFilter } } },
                _avg: { intentScore: true },
                _count: { convertedToBooking: true },
            }),
            // Fetch conversations with their metadata for trends
            prisma.conversation.findMany({
                where: { startedAt: { gte: dateFilter } },
                include: {
                    metadata: { select: { userMood: true, categories: true, wasRedirected: true } },
                    _count: { select: { messages: true } },
                },
                orderBy: { startedAt: 'asc' },
            }),
            // Unique customers count
            prisma.customer.count({
                where: { conversations: { some: { startedAt: { gte: dateFilter } } } }
            }),
            // Total handoffs in period
            prisma.conversationHandoff.count({
                where: { handoffAt: { gte: dateFilter } }
            }),
        ]);

        // Calculate AI Resolution Rate
        const resolvedHandoffs = handoffStats.find(h => h.status === 'RESOLVED')?._count || 0;
        const aiResolutionRate = totalConversations > 0
            ? Math.round(((totalConversations - resolvedHandoffs) / totalConversations) * 100)
            : 100;

        // === Build daily conversation trends ===
        const dailyTrends: Record<string, { date: string; conversations: number; redirected: number }> = {};

        // Initialize all days in period
        for (let i = 0; i < daysCount; i++) {
            const d = new Date();
            d.setDate(d.getDate() - (daysCount - 1 - i));
            const key = d.toISOString().split('T')[0]; // "YYYY-MM-DD"
            dailyTrends[key] = { date: key, conversations: 0, redirected: 0 };
        }

        // Fill in actual data
        for (const conv of conversations) {
            const key = conv.startedAt.toISOString().split('T')[0];
            if (dailyTrends[key]) {
                dailyTrends[key].conversations++;
                if (conv.metadata?.wasRedirected) {
                    dailyTrends[key].redirected++;
                }
            }
        }

        const trends = Object.values(dailyTrends);

        // === Build top categories from real metadata ===
        const categoryCounts: Record<string, number> = {};
        for (const conv of conversations) {
            const cats = conv.metadata?.categories || [];
            if (cats.length === 0) {
                categoryCounts['Other'] = (categoryCounts['Other'] || 0) + 1;
            } else {
                for (const cat of cats) {
                    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
                }
            }
        }

        // Sort by count and take top 5
        const topCategories = Object.entries(categoryCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, count]) => {
                const total = Object.values(categoryCounts).reduce((a, b) => a + b, 0);
                return { name, count, percent: total > 0 ? Math.round((count / total) * 100) : 0 };
            });

        // === Build mood distribution ===
        const moodCounts: Record<string, number> = {};
        for (const conv of conversations) {
            const mood = conv.metadata?.userMood || 'neutral';
            moodCounts[mood] = (moodCounts[mood] || 0) + 1;
        }

        return NextResponse.json({
            metrics: {
                totalConversations,
                activeHandoffs,
                aiResolutionRate,
                avgIntentScore: Math.round(salesStats._avg.intentScore || 0),
                conversions: salesStats._count.convertedToBooking,
                activeUsers: uniqueCustomers,
                totalHandoffs,
            },
            trends,
            topCategories,
            moodDistribution: moodCounts,
        });
    } catch (error) {
        console.error('Analytics overview error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
