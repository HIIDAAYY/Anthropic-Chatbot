import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/app/lib/admin-auth';
import { Prisma } from '@prisma/client';

export async function GET(request: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        const where: Prisma.ConversationHandoffWhereInput = {};

        if (status && status !== 'ALL') {
            where.status = status as any;
        } else if (status !== 'ALL') {
            // Default to showing pending and in_progress if no status specified or for main queue
            where.status = { in: ['PENDING', 'IN_PROGRESS'] };
        }

        const handoffs = await prisma.conversationHandoff.findMany({
            where,
            include: {
                conversation: {
                    include: {
                        customer: true,
                    }
                },
                assignedAgent: {
                    select: { name: true }
                }
            },
            orderBy: [
                { priority: 'desc' },
                { handoffAt: 'asc' },
            ],
        });

        return NextResponse.json({ handoffs });
    } catch (error) {
        console.error('Handoff list error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
