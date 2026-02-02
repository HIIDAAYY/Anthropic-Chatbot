import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/app/lib/admin-auth';

export async function GET() {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const notifications = await prisma.notification.findMany({
            where: {
                agentId: user.id,
                isRead: false,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 10,
        });

        const unreadCount = await prisma.notification.count({
            where: {
                agentId: user.id,
                isRead: false,
            },
        });

        return NextResponse.json({ notifications, unreadCount });
    } catch (error) {
        console.error('Notifications error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await request.json();

        if (id) {
            // Mark specific notification as read
            await prisma.notification.update({
                where: { id, agentId: user.id },
                data: { isRead: true },
            });
        } else {
            // Mark all as read
            await prisma.notification.updateMany({
                where: { agentId: user.id, isRead: false },
                data: { isRead: true },
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Notifications update error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
