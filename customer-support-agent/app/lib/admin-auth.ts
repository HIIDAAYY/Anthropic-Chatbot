import { hash, compare } from 'bcrypt';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';

const SALT_ROUNDS = 12;
const SESSION_DURATION_DAYS = 7;

export async function hashPassword(password: string): Promise<string> {
    return hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return compare(password, hash);
}

export async function createSession(adminUserId: string) {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

    // Create session in DB
    await prisma.adminSession.create({
        data: {
            id: randomBytes(16).toString('hex'),
            adminUserId,
            tokenHash: token, // In a real prod app, you might want to hash this token too
            expiresAt,
        },
    });

    // Set cookie
    cookies().set('admin_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: expiresAt,
        path: '/',
    });

    return token;
}

export async function validateSession() {
    const token = cookies().get('admin_session')?.value;
    if (!token) return null;

    const session = await prisma.adminSession.findUnique({
        where: { tokenHash: token },
        include: { AdminUser: true },
    });

    if (!session || session.expiresAt < new Date()) {
        return null;
    }

    return session.AdminUser;
}

export async function deleteSession() {
    const token = cookies().get('admin_session')?.value;
    if (token) {
        await prisma.adminSession.deleteMany({
            where: { tokenHash: token },
        });
    }
    cookies().delete('admin_session');
}

export async function getSessionUser() {
    return validateSession();
}
