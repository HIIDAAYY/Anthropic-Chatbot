import { PrismaClient } from '@prisma/client';
import { compare } from 'bcrypt';

async function testAdminLogin() {
    const prisma = new PrismaClient();

    try {
        console.log('Testing admin login...\n');

        // Find admin user
        const admin = await prisma.adminUser.findUnique({
            where: { username: 'admin' }
        });

        if (!admin) {
            console.log('❌ Admin user NOT FOUND in database!');
            console.log('\nPlease run: npx tsx prisma/seed-admin.ts');
            return;
        }

        console.log('✅ Admin user found:');
        console.log('   Username:', admin.username);
        console.log('   Name:', admin.name);
        console.log('   isActive:', admin.isActive);
        console.log('   Role:', admin.role);
        console.log('   Hash:', admin.passwordHash.substring(0, 30) + '...');

        // Test password verification
        const testPassword = 'Admin123!';
        console.log('\nTesting password:', testPassword);

        const isValid = await compare(testPassword, admin.passwordHash);
        console.log('Password verification result:', isValid ? '✅ VALID' : '❌ INVALID');

        if (!isValid) {
            console.log('\n⚠️ Password hash might be incorrect.');
            console.log('Re-running seed should fix this.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testAdminLogin();
