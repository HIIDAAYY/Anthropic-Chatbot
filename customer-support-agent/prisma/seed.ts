import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // Buat customer dengan phone number yang konsisten
  // Phone number ini akan digunakan di web session untuk demo
  const DEMO_PHONE = "081234567890";

  const customer = await prisma.customer.create({
    data: {
      phoneNumber: DEMO_PHONE,
      name: "Adi Mulyana",
    },
  });

  console.log(`✅ Customer created: ${customer.name} (${customer.phoneNumber})`);
  console.log(`📱 Customer ID: ${customer.id}`);

  // Buat order
  const order = await prisma.order.create({
    data: {
      orderNumber: "ORD-2025-001",
      customerId: customer.id,
      totalAmount: 150000,
      shippingAddress: "Jl. Merdeka No. 123, Jakarta",
      status: "SHIPPED",
      shippingMethod: "regular",
      items: {
        create: [
          {
            productId: "KAOS-001",
            productName: "Kaos Basic Crewneck",
            quantity: 1,
            price: 79000,
            subtotal: 79000,
          },
          {
            productId: "CELANA-001",
            productName: "Celana Chino Slim Fit",
            quantity: 1,
            price: 59000,
            subtotal: 59000,
          },
        ],
      },
      payment: {
        create: {
          amount: 150000,
          method: "bank_transfer",
          status: "COMPLETED",
          transactionId: "TRX-123456",
          paidAt: new Date("2025-11-20"),
        },
      },
      shipping: {
        create: {
          trackingNumber: "JNE123456789",
          carrier: "jne",
          currentStatus: "IN_TRANSIT",
          currentLocation: "Jakarta",
          estimatedDelivery: new Date("2025-11-26"),
          shippedAt: new Date("2025-11-21"),
        },
      },
    },
  });

  // Buat inventory
  await prisma.inventory.createMany({
    data: [
      {
        productId: "KAOS-001",
        productName: "Kaos Basic Crewneck",
        quantity: 50,
        warehouseLocation: "Jakarta",
      },
      {
        productId: "CELANA-001",
        productName: "Celana Chino Slim Fit",
        quantity: 30,
        warehouseLocation: "Jakarta",
      },
      {
        productId: "DRESS-001",
        productName: "Dress Midi Floral",
        quantity: 0,
        warehouseLocation: "Jakarta",
      },
    ],
  });

  console.log("\n✅ Seed data created successfully!");
  console.log("=" .repeat(60));
  console.log("📊 Demo Data Summary:");
  console.log(`   Customer ID: ${customer.id}`);
  console.log(`   Customer Phone: ${customer.phoneNumber}`);
  console.log(`   Order Number: ${order.orderNumber}`);
  console.log(`   Order Status: ${order.status}`);
  console.log(`   Payment Status: COMPLETED`);
  console.log(`   Shipping Status: IN_TRANSIT`);
  console.log("=" .repeat(60));
  console.log("\n💡 Use phone number '081234567890' in chat for demo\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
