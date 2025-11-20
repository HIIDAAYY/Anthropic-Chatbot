/**
 * Test Database Connection
 * Tests PostgreSQL connection and basic CRUD operations
 */

import { prisma } from '../app/lib/db-service';

async function testConnection() {
  console.log('🧪 Testing Database Connection...\n');

  try {
    // Test 1: Basic connection
    console.log('1️⃣ Testing basic connection...');
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL successfully!\n');

    // Test 2: Raw query
    console.log('2️⃣ Testing raw query...');
    const result = await prisma.$queryRaw`SELECT NOW() as current_time`;
    console.log('✅ Raw query successful:', result);
    console.log('');

    // Test 3: Count tables
    console.log('3️⃣ Checking database tables...');
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
    `;
    console.log(`✅ Found ${tables.length} tables:`);
    tables.forEach((t) => console.log(`   - ${t.tablename}`));
    console.log('');

    // Test 4: Test CRUD operations
    console.log('4️⃣ Testing CRUD operations...');

    // Create a test customer
    const testCustomer = await prisma.customer.create({
      data: {
        phoneNumber: `test:+${Date.now()}`,
        name: 'Test Customer',
      },
    });
    console.log(`✅ Created test customer: ${testCustomer.id}`);

    // Create a test conversation
    const testConversation = await prisma.conversation.create({
      data: {
        customerId: testCustomer.id,
      },
    });
    console.log(`✅ Created test conversation: ${testConversation.id}`);

    // Create a test message
    const testMessage = await prisma.message.create({
      data: {
        conversationId: testConversation.id,
        role: 'user',
        content: 'This is a test message',
      },
    });
    console.log(`✅ Created test message: ${testMessage.id}`);

    // Read the data back
    const customer = await prisma.customer.findUnique({
      where: { id: testCustomer.id },
      include: {
        conversations: {
          include: {
            messages: true,
          },
        },
      },
    });
    console.log('✅ Successfully read data back from database');

    // Update
    await prisma.customer.update({
      where: { id: testCustomer.id },
      data: { name: 'Updated Test Customer' },
    });
    console.log('✅ Successfully updated customer');

    // Delete (cleanup)
    await prisma.customer.delete({
      where: { id: testCustomer.id },
    });
    console.log('✅ Successfully deleted test data\n');

    // Test 5: Get statistics
    console.log('5️⃣ Getting database statistics...');
    const stats = await Promise.all([
      prisma.customer.count(),
      prisma.conversation.count(),
      prisma.message.count(),
    ]);

    console.log('📊 Database Statistics:');
    console.log(`   - Total Customers: ${stats[0]}`);
    console.log(`   - Total Conversations: ${stats[1]}`);
    console.log(`   - Total Messages: ${stats[2]}`);
    console.log('');

    console.log('✅ All tests passed! Database is working correctly! 🎉\n');
  } catch (error) {
    console.error('❌ Database test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
