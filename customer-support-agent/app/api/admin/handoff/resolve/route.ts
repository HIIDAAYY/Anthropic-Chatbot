import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/app/lib/admin-auth';

export async function POST(request: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { handoffId, resolutionNotes } = await request.json();

        // Update handoff
        const handoff = await prisma.conversationHandoff.update({
            where: { id: handoffId },
            data: {
                status: 'RESOLVED',
                resolvedAt: new Date(),
                resolutionNotes,
            },
        });

        // Update conversation status
        await prisma.conversation.update({
            where: { id: handoff.conversationId },
            data: { status: 'ENDED' },
        });

        // Audit log
        await prisma.adminAuditLog.create({
            data: {
                id: crypto.randomUUID(),
                adminUserId: user.id,
                action: 'RESOLVE_HANDOFF',
                resource: 'ConversationHandoff',
                resourceId: handoff.id,
                details: { resolutionNotes },
            },
        });

        return NextResponse.json({ handoff });
    } catch (error) {
        console.error('Resolve handoff error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
