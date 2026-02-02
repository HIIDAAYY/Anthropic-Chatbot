import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/app/lib/admin-auth';

export async function POST(request: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { handoffId, agentId } = await request.json();

        // Check if already assigned
        const existing = await prisma.conversationHandoff.findUnique({
            where: { id: handoffId },
        });

        if (!existing) {
            return NextResponse.json({ error: 'Handoff not found' }, { status: 404 });
        }

        if (existing.assignedAgentId && existing.assignedAgentId !== agentId) {
            return NextResponse.json({ error: 'Already assigned to another agent' }, { status: 400 });
        }

        // Update handoff
        const handoff = await prisma.conversationHandoff.update({
            where: { id: handoffId },
            data: {
                assignedAgentId: agentId,
                status: 'IN_PROGRESS',
            },
            include: { conversation: true },
        });

        // Notify assigned agent (if not self)
        if (agentId !== user.id) {
            await prisma.notification.create({
                data: {
                    agentId,
                    type: 'handoff_assigned',
                    title: 'Handoff Assigned',
                    message: `You have been assigned to conversation ${handoff.conversation.id}`,
                    relatedConversationId: handoff.conversationId,
                    relatedHandoffId: handoff.id,
                },
            });
        }

        // Audit log
        await prisma.adminAuditLog.create({
            data: {
                id: crypto.randomUUID(),
                adminUserId: user.id,
                action: 'ASSIGN_HANDOFF',
                resource: 'ConversationHandoff',
                resourceId: handoff.id,
                details: { assignedTo: agentId },
            },
        });

        return NextResponse.json({ handoff });
    } catch (error) {
        console.error('Assign handoff error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
