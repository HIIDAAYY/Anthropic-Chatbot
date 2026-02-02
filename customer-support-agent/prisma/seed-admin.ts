import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding admin data...');

    const passwordHash = await hash('Admin123!', 12);
    const agentPasswordHash = await hash('Agent123!', 12);

    // Create Super Admin
    const admin = await prisma.adminUser.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            id: 'admin-1',
            username: 'admin',
            passwordHash,
            name: 'Super Admin',
            email: 'admin@example.com',
            role: 'SUPER_ADMIN',
            updatedAt: new Date(),
        },
    });

    // Create Agents
    const agent1 = await prisma.adminUser.upsert({
        where: { username: 'agent1' },
        update: {},
        create: {
            id: 'agent-1',
            username: 'agent1',
            passwordHash: agentPasswordHash,
            name: 'Agent One',
            email: 'agent1@example.com',
            role: 'ADMIN',
            updatedAt: new Date(),
        },
    });

    const agent2 = await prisma.adminUser.upsert({
        where: { username: 'agent2' },
        update: {},
        create: {
            id: 'agent-2',
            username: 'agent2',
            passwordHash: agentPasswordHash,
            name: 'Agent Two',
            email: 'agent2@example.com',
            role: 'ADMIN',
            updatedAt: new Date(),
        },
    });

    console.log('Created admin users:', { admin, agent1, agent2 });

    // Create dummy conversations if needed (optional, assuming main seed does this or app usage)
    // But for admin dashboard demo, let's ensure we have some data.

    // Check if we have customers
    let customer = await prisma.customer.findFirst();
    if (!customer) {
        customer = await prisma.customer.create({
            data: {
                phoneNumber: '6281234567890',
                name: 'John Doe',
            }
        });
    }

    // Create a pending handoff conversation
    const conv1 = await prisma.conversation.create({
        data: {
            customerId: customer.id,
            status: 'REDIRECTED',
            messages: {
                create: [
                    { role: 'user', content: 'I need to speak to a human agent please.' },
                    { role: 'assistant', content: 'I understand. I will transfer you to an agent.' },
                ]
            }
        }
    });

    await prisma.conversationHandoff.create({
        data: {
            conversationId: conv1.id,
            priority: 2, // High
            handoffReason: 'Customer requested human agent',
            status: 'PENDING',
        }
    });

    console.log('Seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
