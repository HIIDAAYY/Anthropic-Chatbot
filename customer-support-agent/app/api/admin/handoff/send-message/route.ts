import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/app/lib/admin-auth';

export async function POST(request: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { conversationId, message } = await request.json();

        // Create message
        const newMessage = await prisma.message.create({
            data: {
                conversationId,
                role: 'assistant',
                content: message,
            },
        });

        // TODO: Trigger WhatsApp API to send message to customer
        // This is a placeholder for the actual WhatsApp integration

        // Audit log
        await prisma.adminAuditLog.create({
            data: {
                id: crypto.randomUUID(),
                adminUserId: user.id,
                action: 'SEND_MESSAGE',
                resource: 'Message',
                resourceId: newMessage.id,
                details: { conversationId },
            },
        });

        return NextResponse.json({ message: newMessage });
    } catch (error) {
        console.error('Send message error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
