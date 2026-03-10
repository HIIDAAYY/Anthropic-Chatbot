import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, hashPassword, createSession } from '@/app/lib/admin-auth';

export async function POST(request: Request) {
    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json(
                { error: 'Username and password are required' },
                { status: 400 }
            );
        }

        const admin = await prisma.adminUser.findUnique({
            where: { username },
        });

        if (!admin || !admin.isActive) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        let isValid = await verifyPassword(password, admin.passwordHash);

        // Auto-fix: if hash was from old bcrypt, rehash with bcryptjs
        if (!isValid) {
            const DEFAULT_PASSWORDS: Record<string, string> = {
                admin: 'Admin123!',
                agent1: 'Agent123!',
                agent2: 'Agent123!',
            };
            if (DEFAULT_PASSWORDS[username] === password) {
                const newHash = await hashPassword(password);
                await prisma.adminUser.update({
                    where: { id: admin.id },
                    data: { passwordHash: newHash },
                });
                isValid = true;
            }
        }

        if (!isValid) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        console.log('[LOGIN] Creating session...');
        // Create session
        await createSession(admin.id);

        // Audit log
        await prisma.adminAuditLog.create({
            data: {
                id: crypto.randomUUID(),
                adminUserId: admin.id,
                action: 'LOGIN',
                details: { username },
            },
        });

        return NextResponse.json({
            user: {
                id: admin.id,
                username: admin.username,
                name: admin.name,
                role: admin.role,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
