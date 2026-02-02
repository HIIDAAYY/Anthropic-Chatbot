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
        if (period === 'today') {
            dateFilter.setHours(0, 0, 0, 0);
        } else if (period === '7d') {
            dateFilter.setDate(dateFilter.getDate() - 7);
        } else if (period === '30d') {
            dateFilter.setDate(dateFilter.getDate() - 30);
        }

        const [
            totalConversations,
            activeHandoffs,
            handoffStats,
            salesStats
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
            })
        ]);

        // Calculate AI Resolution Rate
        // Total conversations - Resolved Handoffs (assuming resolved handoffs were NOT handled by AI fully)
        // This is a rough approximation. 
        const resolvedHandoffs = handoffStats.find(h => h.status === 'RESOLVED')?._count || 0;
        const aiResolutionRate = totalConversations > 0
            ? Math.round(((totalConversations - resolvedHandoffs) / totalConversations) * 100)
            : 100;

        return NextResponse.json({
            metrics: {
                totalConversations,
                activeHandoffs,
                aiResolutionRate,
                avgIntentScore: Math.round(salesStats._avg.intentScore || 0),
                conversions: salesStats._count.convertedToBooking,
            }
        });
    } catch (error) {
        console.error('Analytics overview error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
