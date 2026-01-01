import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local
const envPath = resolve(__dirname, "../.env.local");
console.log(`Loading .env from: ${envPath}`);
config({ path: envPath, override: true });

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
    update: {
      name: "Klinik Glow Aesthetics Jakarta",
      email: "hello@glowaesthetics.id",
      address: "Jl. Senopati Raya No. 45, Kebayoran Baru, Jakarta Selatan 12190",
    },
    create: {
      name: "Klinik Glow Aesthetics Jakarta",
      type: "BEAUTY_CLINIC",
      phoneNumber: "whatsapp:+6281234567891",
      email: "hello@glowaesthetics.id",
      address: "Jl. Senopati Raya No. 45, Kebayoran Baru, Jakarta Selatan 12190",
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

  // ============================================
  // KLINIK GLOW AESTHETICS SERVICES (from Knowledge Base)
  // ============================================

  // FACIAL TREATMENTS
  const facialBasic = await prisma.service.upsert({
    where: { id: "facial-basic-glow" },
    update: { name: "Facial Basic Glow", price: 25000000, description: "Pembersihan wajah menyeluruh dengan deep cleansing, eksfoliasi, ekstraksi komedo, masker, dan pijat relaksasi" },
    create: {
      id: "facial-basic-glow",
      businessId: beautyClinic.id,
      name: "Facial Basic Glow",
      description: "Pembersihan wajah menyeluruh dengan deep cleansing, eksfoliasi, ekstraksi komedo, masker, dan pijat relaksasi",
      category: "facial",
      price: 25000000, // Rp 250.000
      depositAmount: 12500000,
      durationMinutes: 60,
      isActive: true,
    },
  });

  const facialPremium = await prisma.service.upsert({
    where: { id: "facial-premium-hydrating" },
    update: { name: "Facial Premium Hydrating", price: 45000000 },
    create: {
      id: "facial-premium-hydrating",
      businessId: beautyClinic.id,
      name: "Facial Premium Hydrating",
      description: "Facial premium dengan serum hyaluronic acid dan LED light therapy untuk hidrasi maksimal",
      category: "facial",
      price: 45000000, // Rp 450.000
      depositAmount: 22500000,
      durationMinutes: 75,
      isActive: true,
    },
  });

  const facialAcne = await prisma.service.upsert({
    where: { id: "facial-acne-solution" },
    update: { name: "Facial Acne Solution", price: 40000000 },
    create: {
      id: "facial-acne-solution",
      businessId: beautyClinic.id,
      name: "Facial Acne Solution",
      description: "Treatment khusus untuk kulit berjerawat dengan high-frequency, anti-bacterial serum, dan acne mask",
      category: "facial",
      price: 40000000, // Rp 400.000
      depositAmount: 20000000,
      durationMinutes: 75,
      isActive: true,
    },
  });

  const facialBrightening = await prisma.service.upsert({
    where: { id: "facial-glow-brightening" },
    update: { name: "Facial Glow Brightening", price: 55000000 },
    create: {
      id: "facial-glow-brightening",
      businessId: beautyClinic.id,
      name: "Facial Glow Brightening",
      description: "Treatment untuk mencerahkan kulit dengan vitamin C, niacinamide, dan light therapy",
      category: "facial",
      price: 55000000, // Rp 550.000
      depositAmount: 27500000,
      durationMinutes: 75,
      isActive: true,
    },
  });

  const facialSignature = await prisma.service.upsert({
    where: { id: "facial-signature-gold" },
    update: { name: "Facial Signature Gold", price: 75000000 },
    create: {
      id: "facial-signature-gold",
      businessId: beautyClinic.id,
      name: "Facial Signature Gold",
      description: "Premium facial dengan gold serum, LED therapy, dan teknik pijat eksklusif",
      category: "facial",
      price: 75000000, // Rp 750.000
      depositAmount: 37500000,
      durationMinutes: 90,
      isActive: true,
    },
  });

  // LASER & ADVANCED TREATMENTS
  const laserCO2 = await prisma.service.upsert({
    where: { id: "laser-co2-fractional" },
    update: { name: "Laser CO2 Fractional", price: 120000000 },
    create: {
      id: "laser-co2-fractional",
      businessId: beautyClinic.id,
      name: "Laser CO2 Fractional",
      description: "Gold standard untuk skin resurfacing, mengatasi bekas jerawat, kerutan, dan pori-pori besar",
      category: "laser",
      price: 120000000, // Rp 1.200.000
      depositAmount: 60000000,
      durationMinutes: 90,
      isActive: true,
    },
  });

  const laserToning = await prisma.service.upsert({
    where: { id: "laser-toning" },
    update: { name: "Laser Toning", price: 80000000 },
    create: {
      id: "laser-toning",
      businessId: beautyClinic.id,
      name: "Laser Toning",
      description: "Laser untuk mencerahkan kulit, meratakan warna kulit, dan mengecilkan pori",
      category: "laser",
      price: 80000000, // Rp 800.000
      depositAmount: 40000000,
      durationMinutes: 45,
      isActive: true,
    },
  });

  const iplPhotofacial = await prisma.service.upsert({
    where: { id: "ipl-photofacial" },
    update: { name: "IPL Photofacial", price: 90000000 },
    create: {
      id: "ipl-photofacial",
      businessId: beautyClinic.id,
      name: "IPL Photofacial",
      description: "Intense Pulsed Light untuk mengatasi flek, kemerahan, dan rejuvenasi kulit",
      category: "laser",
      price: 90000000, // Rp 900.000
      depositAmount: 45000000,
      durationMinutes: 45,
      isActive: true,
    },
  });

  const microneedlingRF = await prisma.service.upsert({
    where: { id: "microneedling-rf" },
    update: { name: "Microneedling RF", price: 100000000 },
    create: {
      id: "microneedling-rf",
      businessId: beautyClinic.id,
      name: "Microneedling RF",
      description: "Kombinasi microneedling dengan radiofrequency untuk mengencangkan kulit dan mengatasi scarring",
      category: "laser",
      price: 100000000, // Rp 1.000.000
      depositAmount: 50000000,
      durationMinutes: 60,
      isActive: true,
    },
  });

  // INJECTION & FILLER
  const fillerHA = await prisma.service.upsert({
    where: { id: "filler-hyaluronic-acid" },
    update: { name: "Filler Hyaluronic Acid", price: 350000000 },
    create: {
      id: "filler-hyaluronic-acid",
      businessId: beautyClinic.id,
      name: "Filler Hyaluronic Acid",
      description: "Filler untuk menambah volume, mengisi kerutan, dan membentuk kontur wajah",
      category: "injection",
      price: 350000000, // Rp 3.500.000
      depositAmount: 175000000,
      durationMinutes: 45,
      isActive: true,
    },
  });

  const botox = await prisma.service.upsert({
    where: { id: "botox-forehead" },
    update: { name: "Botox Forehead/Frown", price: 250000000 },
    create: {
      id: "botox-forehead",
      businessId: beautyClinic.id,
      name: "Botox Forehead/Frown",
      description: "Botox untuk menghilangkan kerutan dahi dan garis ekspresi (frown lines)",
      category: "injection",
      price: 250000000, // Rp 2.500.000
      depositAmount: 125000000,
      durationMinutes: 30,
      isActive: true,
    },
  });

  const skinBooster = await prisma.service.upsert({
    where: { id: "skin-booster" },
    update: { name: "Skin Booster", price: 200000000 },
    create: {
      id: "skin-booster",
      businessId: beautyClinic.id,
      name: "Skin Booster",
      description: "Injeksi hyaluronic acid untuk hidrasi mendalam dan membuat kulit glowing",
      category: "injection",
      price: 200000000, // Rp 2.000.000
      depositAmount: 100000000,
      durationMinutes: 45,
      isActive: true,
    },
  });

  // CHEMICAL PEELING & SPECIAL
  const peelingLight = await prisma.service.upsert({
    where: { id: "chemical-peeling-light" },
    update: { name: "Chemical Peeling Light", price: 35000000 },
    create: {
      id: "chemical-peeling-light",
      businessId: beautyClinic.id,
      name: "Chemical Peeling Light",
      description: "Peeling ringan dengan AHA/BHA untuk eksfoliasi dan mencerahkan kulit",
      category: "peeling",
      price: 35000000, // Rp 350.000
      depositAmount: 17500000,
      durationMinutes: 30,
      isActive: true,
    },
  });

  const peelingMedium = await prisma.service.upsert({
    where: { id: "chemical-peeling-medium" },
    update: { name: "Chemical Peeling Medium", price: 60000000 },
    create: {
      id: "chemical-peeling-medium",
      businessId: beautyClinic.id,
      name: "Chemical Peeling Medium",
      description: "Peeling medium-depth untuk mengatasi flek, bekas jerawat, dan uneven skin tone",
      category: "peeling",
      price: 60000000, // Rp 600.000
      depositAmount: 30000000,
      durationMinutes: 45,
      isActive: true,
    },
  });

  const hifuFacial = await prisma.service.upsert({
    where: { id: "hifu-facial-lifting" },
    update: { name: "HIFU Facial Lifting", price: 300000000 },
    create: {
      id: "hifu-facial-lifting",
      businessId: beautyClinic.id,
      name: "HIFU Facial Lifting",
      description: "High Intensity Focused Ultrasound untuk mengencangkan dan lifting wajah tanpa operasi",
      category: "advanced",
      price: 300000000, // Rp 3.000.000
      depositAmount: 150000000,
      durationMinutes: 90,
      isActive: true,
    },
  });

  // Keep the old service ID for backward compatibility (will be deactivated)
  await prisma.service.upsert({
    where: { id: "facial-basic" },
    update: { isActive: false },
    create: {
      id: "facial-basic",
      businessId: beautyClinic.id,
      name: "Facial Treatment Basic (Legacy)",
      description: "Legacy service - use facial-basic-glow instead",
      category: "facial",
      price: 25000000,
      depositAmount: 12500000,
      durationMinutes: 60,
      isActive: false,
    },
  });

  await prisma.service.upsert({
    where: { id: "laser-co2" },
    update: { isActive: false },
    create: {
      id: "laser-co2",
      businessId: beautyClinic.id,
      name: "Laser CO2 (Legacy)",
      description: "Legacy service - use laser-co2-fractional instead",
      category: "laser",
      price: 120000000,
      depositAmount: 60000000,
      durationMinutes: 90,
      isActive: false,
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

  console.log(`✅ Created 17 services (15 clinic + 2 travel)`);

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
      serviceId: facialBasic.id,
      bookingDate: new Date("2025-12-28"),
      startTime: new Date("2025-12-28T10:00:00"),
      endTime: new Date("2025-12-28T11:00:00"),
      status: "CONFIRMED",
      customerName: customer.name || "Adi Mulyana",
      customerPhone: customer.phoneNumber,
      customerEmail: "adi@example.com",
      notes: "First time customer",
      totalAmount: facialBasic.price,
      depositAmount: facialBasic.depositAmount,
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
          amount: facialBasic.price,
          paidAmount: facialBasic.depositAmount!,
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
          message: "Reminder: Anda memiliki appointment besok jam 10:00 di Klinik Glow Aesthetics Jakarta untuk Facial Basic Glow",
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
  console.log(`   Klinik Glow Aesthetics: ${beautyClinic.phoneNumber}`);
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
