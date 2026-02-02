import { PrismaClient } from '@prisma/client';
import { compare } from 'bcrypt';
import { randomBytes } from 'crypto';

async function test() {
    const prisma = new PrismaClient();
    try {
        console.log('Testing login flow...\n');
        
        const admin = await prisma.adminUser.findUnique({
            where: { username: 'admin' }
        });
        
        if (!admin) {
            console.log('Admin not found!');
            return;
        }
        
        console.log('Admin found:', admin.username);
        
        const isValid = await compare('Admin123!', admin.passwordHash);
        console.log('Password valid:', isValid);
        
        console.log('\nTrying to create session...');
        const session = await prisma.adminSession.create({
            data: {
                id: randomBytes(16).toString('hex'),
                adminUserId: admin.id,
                tokenHash: randomBytes(32).toString('hex'),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });
        
        console.log('Session created:', session.id);
        
        console.log('\nTrying to create audit log...');
        await prisma.adminAuditLog.create({
            data: {
                id: randomBytes(16).toString('hex'),
                adminUserId: admin.id,
                action: 'LOGIN',
                details: { username: admin.username },
            },
        });
        
        console.log('Audit log created!');
        console.log('\nAll database operations work!');
        
    } catch (error: any) {
        console.error('Error:', error.message);
        console.error('\nStack:', error.stack);
    } finally {
        await prisma.$disconnect();
    }
}

test();
