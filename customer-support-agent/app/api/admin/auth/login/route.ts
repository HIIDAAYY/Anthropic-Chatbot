import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, createSession } from '@/app/lib/admin-auth';

export async function POST(request: Request) {
    try {
        const { username, password } = await request.json();
        console.log('[LOGIN] Attempting login for:', username);

        if (!username || !password) {
            console.log('[LOGIN] Missing username or password');
            return NextResponse.json(
                { error: 'Username and password are required' },
                { status: 400 }
            );
        }

        const admin = await prisma.adminUser.findUnique({
            where: { username },
        });

        console.log('[LOGIN] User found:', admin ? admin.username : 'NOT FOUND');

        if (!admin || !admin.isActive) {
            console.log('[LOGIN] User not found or inactive');
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        console.log('[LOGIN] Verifying password...');
        const isValid = await verifyPassword(password, admin.passwordHash);
        console.log('[LOGIN] Password valid:', isValid);

        if (!isValid) {
            console.log('[LOGIN] Password mismatch');
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
