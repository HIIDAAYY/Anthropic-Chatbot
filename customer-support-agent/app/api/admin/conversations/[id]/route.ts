import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/app/lib/admin-auth';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const conversation = await prisma.conversation.findUnique({
            where: { id: params.id },
            include: {
                customer: true,
                messages: {
                    orderBy: { timestamp: 'asc' },
                },
                metadata: true,
                handoff: {
                    include: {
                        assignedAgent: {
                            select: { id: true, name: true, username: true }
                        }
                    }
                }
            },
        });

        if (!conversation) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        return NextResponse.json({ conversation });
    } catch (error) {
        console.error('Conversation detail error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
