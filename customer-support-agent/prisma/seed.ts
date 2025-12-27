import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // Buat customer dengan phone number yang konsisten
  // Phone number ini akan digunakan di web session untuk demo
  const DEMO_PHONE = "081234567890";

  const customer = await prisma.customer.upsert({
    where: { phoneNumber: DEMO_PHONE },
    update: {},
    create: {
      phoneNumber: DEMO_PHONE,
      name: "Adi Mulyana",
    },
  });

  console.log(`✅ Customer ready: ${customer.name} (${customer.phoneNumber})`);
  console.log(`📱 Customer ID: ${customer.id}`);

  // Buat order
  const order = await prisma.order.upsert({
    where: { orderNumber: "ORD-2025-001" },
    update: {},
    create: {
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
  const inventoryItems = [
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
  ];

  for (const item of inventoryItems) {
    await prisma.inventory.upsert({
      where: { productId: item.productId },
      update: { quantity: item.quantity },
      create: item,
    });
  }

  // ============================================
  // BOOKING SYSTEM: Create Businesses
  // ============================================
  console.log("\n🏢 Creating businesses...");

  // Beauty Clinic
  const beautyClinic = await prisma.business.upsert({
    where: { phoneNumber: "whatsapp:+6281234567891" },
    update: {},
    create: {
      name: "Sozo Skin Clinic",
      type: "BEAUTY_CLINIC",
      phoneNumber: "whatsapp:+6281234567891",
      email: "info@sozoskin.com",
      address: "Jl. Sudirman No. 123, Jakarta Selatan",
      businessHours: {
        mon: ["09:00-17:00"],
        tue: ["09:00-17:00"],
        wed: ["09:00-17:00"],
        thu: ["09:00-17:00"],
        fri: ["09:00-17:00"],
        sat: ["10:00-15:00"],
        sun: [],
      },
      settings: {
        create: {
          advanceBookingDays: 30,
          minNoticeHours: 24,
          slotDurationMinutes: 60,
          reminderHoursBefore: 24,
          enableWhatsAppReminder: true,
          requireDepositPercent: 50,
        },
      },
    },
  });

  // Travel Agency
  const travelAgency = await prisma.business.upsert({
    where: { phoneNumber: "whatsapp:+6281234567892" },
    update: {},
    create: {
      name: "Bali Adventure Tours",
      type: "TRAVEL_AGENCY",
      phoneNumber: "whatsapp:+6281234567892",
      email: "info@baliadventure.com",
      address: "Jl. Sunset Road No. 456, Bali",
      businessHours: {
        mon: ["08:00-20:00"],
        tue: ["08:00-20:00"],
        wed: ["08:00-20:00"],
        thu: ["08:00-20:00"],
        fri: ["08:00-20:00"],
        sat: ["08:00-20:00"],
        sun: ["08:00-20:00"],
      },
      settings: {
        create: {
          advanceBookingDays: 60,
          minNoticeHours: 48,
          slotDurationMinutes: 480,
          reminderHoursBefore: 48,
          enableWhatsAppReminder: true,
          requireDepositPercent: 30,
        },
      },
    },
  });

  console.log(`✅ Created clinic: ${beautyClinic.name}`);
  console.log(`✅ Created travel: ${travelAgency.name}`);

  // ============================================
  // BOOKING SYSTEM: Create Services
  // ============================================
  console.log("\n💆 Creating services...");

  // Beauty Clinic Services
  const facialService = await prisma.service.upsert({
    where: { id: "facial-basic" },
    update: {},
    create: {
      id: "facial-basic",
      businessId: beautyClinic.id,
      name: "Facial Treatment Basic",
      description: "Pembersihan wajah menyeluruh dengan teknologi modern",
      category: "facial",
      price: 25000000, // 250k in cents
      depositAmount: 12500000,
      durationMinutes: 60,
      isActive: true,
    },
  });

  const laserService = await prisma.service.upsert({
    where: { id: "laser-co2" },
    update: {},
    create: {
      id: "laser-co2",
      businessId: beautyClinic.id,
      name: "Laser CO2 Fractional",
      description: "Treatment untuk jerawat, bekas jerawat, dan pori-pori besar",
      category: "laser",
      price: 50000000, // 500k in cents
      depositAmount: 25000000,
      durationMinutes: 90,
      isActive: true,
    },
  });

  // Travel Agency Services
  const baliTour = await prisma.service.upsert({
    where: { id: "bali-day-tour" },
    update: {},
    create: {
      id: "bali-day-tour",
      businessId: travelAgency.id,
      name: "Bali Full Day Tour",
      description: "Ubud + Tanah Lot + Uluwatu with sunset dinner",
      category: "day_tour",
      price: 75000000, // 750k in cents
      depositAmount: 22500000,
      durationMinutes: 600,
      isActive: true,
    },
  });

  const baliPackage = await prisma.service.upsert({
    where: { id: "bali-3d2n" },
    update: {},
    create: {
      id: "bali-3d2n",
      businessId: travelAgency.id,
      name: "Bali 3D2N Package",
      description: "Hotel + Tours + Transportation + Meals",
      category: "package",
      price: 250000000, // 2.5jt in cents
      depositAmount: 75000000,
      durationMinutes: 4320, // 3 days
      isActive: true,
    },
  });

  console.log(`✅ Created ${4} services`);

  // ============================================
  // BOOKING SYSTEM: Create Resources
  // ============================================
  console.log("\n👨‍⚕️ Creating resources...");

  // Clinic Resources
  const drSarah = await prisma.resource.create({
    data: {
      businessId: beautyClinic.id,
      name: "Dr. Sarah",
      type: "DOCTOR",
      availability: {
        mon: ["09:00-17:00"],
        tue: ["09:00-17:00"],
        wed: ["09:00-17:00"],
        thu: ["09:00-17:00"],
        fri: ["09:00-17:00"],
        sat: [],
        sun: [],
      },
      metadata: {
        specialization: "Dermatology",
        experience: "10 years",
      },
      isActive: true,
    },
  });

  const therapist1 = await prisma.resource.create({
    data: {
      businessId: beautyClinic.id,
      name: "Therapist Maya",
      type: "THERAPIST",
      availability: {
        mon: ["09:00-17:00"],
        tue: ["09:00-17:00"],
        wed: ["09:00-17:00"],
        thu: ["09:00-17:00"],
        fri: ["09:00-17:00"],
        sat: ["10:00-15:00"],
        sun: [],
      },
      metadata: {
        specialization: "Facial treatment",
      },
      isActive: true,
    },
  });

  const room1 = await prisma.resource.create({
    data: {
      businessId: beautyClinic.id,
      name: "Treatment Room 1",
      type: "ROOM",
      availability: {
        mon: ["09:00-17:00"],
        tue: ["09:00-17:00"],
        wed: ["09:00-17:00"],
        thu: ["09:00-17:00"],
        fri: ["09:00-17:00"],
        sat: ["10:00-15:00"],
        sun: [],
      },
      metadata: {
        capacity: 1,
      },
      isActive: true,
    },
  });

  // Travel Agency Resources
  const guide1 = await prisma.resource.create({
    data: {
      businessId: travelAgency.id,
      name: "Guide Komang",
      type: "TOUR_GUIDE",
      availability: {
        mon: ["08:00-20:00"],
        tue: ["08:00-20:00"],
        wed: ["08:00-20:00"],
        thu: ["08:00-20:00"],
        fri: ["08:00-20:00"],
        sat: ["08:00-20:00"],
        sun: ["08:00-20:00"],
      },
      metadata: {
        languages: ["Indonesian", "English", "Japanese"],
        experience: "15 years",
      },
      isActive: true,
    },
  });

  const van1 = await prisma.resource.create({
    data: {
      businessId: travelAgency.id,
      name: "Toyota Hiace - BAL 1234",
      type: "VEHICLE",
      availability: {
        mon: ["08:00-20:00"],
        tue: ["08:00-20:00"],
        wed: ["08:00-20:00"],
        thu: ["08:00-20:00"],
        fri: ["08:00-20:00"],
        sat: ["08:00-20:00"],
        sun: ["08:00-20:00"],
      },
      metadata: {
        capacity: 12,
        type: "Van",
      },
      isActive: true,
    },
  });

  console.log(`✅ Created ${5} resources`);

  // ============================================
  // BOOKING SYSTEM: Create Sample Booking
  // ============================================
  console.log("\n📅 Creating sample booking...");

  const sampleBooking = await prisma.booking.create({
    data: {
      bookingNumber: "BKG-2025-001",
      customerId: customer.id,
      businessId: beautyClinic.id,
      serviceId: facialService.id,
      bookingDate: new Date("2025-12-28"),
      startTime: new Date("2025-12-28T10:00:00"),
      endTime: new Date("2025-12-28T11:00:00"),
      status: "CONFIRMED",
      customerName: customer.name || "Adi Mulyana",
      customerPhone: customer.phoneNumber,
      customerEmail: "adi@example.com",
      notes: "First time customer",
      totalAmount: facialService.price,
      depositAmount: facialService.depositAmount,
      resources: {
        create: [
          {
            resourceId: therapist1.id,
          },
          {
            resourceId: room1.id,
          },
        ],
      },
      payment: {
        create: {
          amount: facialService.price,
          paidAmount: facialService.depositAmount!,
          paymentType: "BANK_TRANSFER",
          status: "SETTLEMENT",
          bank: "bca",
          vaNumber: "8001234567890",
          paidAt: new Date(),
        },
      },
      reminders: {
        create: {
          scheduledFor: new Date("2025-12-27T10:00:00"),
          method: "WHATSAPP",
          status: "PENDING",
          message: "Reminder: Anda memiliki appointment besok jam 10:00 di Sozo Skin Clinic untuk Facial Treatment Basic",
        },
      },
    },
  });

  console.log(`✅ Created booking: ${sampleBooking.bookingNumber}`);

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
  console.log("📊 Booking System Data:");
  console.log(`   Businesses: 2 (1 clinic, 1 travel)`);
  console.log(`   Services: 4 (2 clinic, 2 travel)`);
  console.log(`   Resources: 5 (3 clinic, 2 travel)`);
  console.log(`   Sample Booking: ${sampleBooking.bookingNumber}`);
  console.log("=" .repeat(60));
  console.log("\n💡 WhatsApp Numbers:");
  console.log(`   Sozo Skin Clinic: ${beautyClinic.phoneNumber}`);
  console.log(`   Bali Adventure Tours: ${travelAgency.phoneNumber}`);
  console.log(`   Demo Customer: ${customer.phoneNumber}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
