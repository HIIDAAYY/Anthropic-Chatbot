import { NextResponse } from 'next/server';
import { deleteSession, getSessionUser } from '@/app/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export async function POST() {
    try {
        const user = await getSessionUser();

        if (user) {
            await prisma.adminAuditLog.create({
                data: {
                    id: crypto.randomUUID(),
                    adminUserId: user.id,
                    action: 'LOGOUT',
                },
            });
        }

        await deleteSession();

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Logout error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
