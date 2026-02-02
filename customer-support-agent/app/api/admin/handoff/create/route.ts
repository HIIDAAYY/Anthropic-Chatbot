import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/app/lib/admin-auth';

export async function POST(request: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { conversationId, priority, reason } = await request.json();

        // Create handoff
        const handoff = await prisma.conversationHandoff.create({
            data: {
                conversationId,
                priority,
                handoffReason: reason,
                status: 'PENDING',
            },
        });

        // Update conversation status
        await prisma.conversation.update({
            where: { id: conversationId },
            data: { status: 'REDIRECTED' },
        });

        // Create notification for all agents (except current user if they triggered it, but usually AI triggers it. 
        // Here human triggers it, so maybe notify others?)
        // For simplicity, notify all admins.
        const admins = await prisma.adminUser.findMany({
            where: { isActive: true },
        });

        await prisma.notification.createMany({
            data: admins.map(admin => ({
                agentId: admin.id,
                type: 'handoff_request',
                title: 'New Handoff Request',
                message: `Priority ${priority} handoff requested. Reason: ${reason}`,
                relatedConversationId: conversationId,
                relatedHandoffId: handoff.id,
            })),
        });

        // Audit log
        await prisma.adminAuditLog.create({
            data: {
                id: crypto.randomUUID(),
                adminUserId: user.id,
                action: 'CREATE_HANDOFF',
                resource: 'ConversationHandoff',
                resourceId: handoff.id,
                details: { conversationId, priority, reason },
            },
        });

        return NextResponse.json({ handoff });
    } catch (error) {
        console.error('Create handoff error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
