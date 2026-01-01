import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Fix __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
const envPath = resolve(__dirname, "../.env.local");
console.log(`Loading .env from: ${envPath}`);
config({ path: envPath, override: true });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function addClinicServices() {
  try {
    console.log('🔄 Adding Klinik Glow Aesthetics services to database...\n');

    // Find the clinic business
    const clinic = await prisma.business.findFirst({
      where: {
        OR: [
          { name: { contains: "Glow" } },
          { name: { contains: "Klinik" } },
          { phoneNumber: "whatsapp:+6281234567891" }
        ]
      }
    });

    if (!clinic) {
      console.error('❌ Clinic not found in database!');
      return;
    }

    console.log(`✅ Found clinic: ${clinic.name} (${clinic.id})\n`);

    // Define all services from Knowledge Base
    const services = [
      // FACIAL TREATMENTS
      {
        id: "facial-basic-glow",
        name: "Facial Basic Glow",
        description: "Pembersihan wajah menyeluruh dengan deep cleansing, eksfoliasi, ekstraksi komedo, masker, dan pijat relaksasi",
        category: "facial",
        price: 25000000, // Rp 250.000
        depositAmount: 12500000,
        durationMinutes: 60,
      },
      {
        id: "facial-premium-hydrating",
        name: "Facial Premium Hydrating",
        description: "Facial premium dengan serum hyaluronic acid dan LED light therapy untuk hidrasi maksimal",
        category: "facial",
        price: 45000000, // Rp 450.000
        depositAmount: 22500000,
        durationMinutes: 75,
      },
      {
        id: "facial-acne-solution",
        name: "Facial Acne Solution",
        description: "Treatment khusus untuk kulit berjerawat dengan high-frequency, anti-bacterial serum, dan acne mask",
        category: "facial",
        price: 40000000, // Rp 400.000
        depositAmount: 20000000,
        durationMinutes: 75,
      },
      {
        id: "facial-glow-brightening",
        name: "Facial Glow Brightening",
        description: "Treatment untuk mencerahkan kulit dengan vitamin C, niacinamide, dan light therapy",
        category: "facial",
        price: 55000000, // Rp 550.000
        depositAmount: 27500000,
        durationMinutes: 75,
      },
      {
        id: "facial-signature-gold",
        name: "Facial Signature Gold",
        description: "Premium facial dengan gold serum, LED therapy, dan teknik pijat eksklusif",
        category: "facial",
        price: 75000000, // Rp 750.000
        depositAmount: 37500000,
        durationMinutes: 90,
      },
      // LASER & ADVANCED TREATMENTS
      {
        id: "laser-co2-fractional",
        name: "Laser CO2 Fractional",
        description: "Gold standard untuk skin resurfacing, mengatasi bekas jerawat, kerutan, dan pori-pori besar",
        category: "laser",
        price: 120000000, // Rp 1.200.000
        depositAmount: 60000000,
        durationMinutes: 90,
      },
      {
        id: "laser-toning",
        name: "Laser Toning",
        description: "Laser untuk mencerahkan kulit, meratakan warna kulit, dan mengecilkan pori",
        category: "laser",
        price: 80000000, // Rp 800.000
        depositAmount: 40000000,
        durationMinutes: 45,
      },
      {
        id: "ipl-photofacial",
        name: "IPL Photofacial",
        description: "Intense Pulsed Light untuk mengatasi flek, kemerahan, dan rejuvenasi kulit",
        category: "laser",
        price: 90000000, // Rp 900.000
        depositAmount: 45000000,
        durationMinutes: 45,
      },
      {
        id: "microneedling-rf",
        name: "Microneedling RF",
        description: "Kombinasi microneedling dengan radiofrequency untuk mengencangkan kulit dan mengatasi scarring",
        category: "laser",
        price: 100000000, // Rp 1.000.000
        depositAmount: 50000000,
        durationMinutes: 60,
      },
      // INJECTION & FILLER
      {
        id: "filler-hyaluronic-acid",
        name: "Filler Hyaluronic Acid",
        description: "Filler untuk menambah volume, mengisi kerutan, dan membentuk kontur wajah",
        category: "injection",
        price: 350000000, // Rp 3.500.000
        depositAmount: 175000000,
        durationMinutes: 45,
      },
      {
        id: "botox-forehead",
        name: "Botox Forehead/Frown",
        description: "Botox untuk menghilangkan kerutan dahi dan garis ekspresi (frown lines)",
        category: "injection",
        price: 250000000, // Rp 2.500.000
        depositAmount: 125000000,
        durationMinutes: 30,
      },
      {
        id: "skin-booster",
        name: "Skin Booster",
        description: "Injeksi hyaluronic acid untuk hidrasi mendalam dan membuat kulit glowing",
        category: "injection",
        price: 200000000, // Rp 2.000.000
        depositAmount: 100000000,
        durationMinutes: 45,
      },
      // CHEMICAL PEELING & SPECIAL
      {
        id: "chemical-peeling-light",
        name: "Chemical Peeling Light",
        description: "Peeling ringan dengan AHA/BHA untuk eksfoliasi dan mencerahkan kulit",
        category: "peeling",
        price: 35000000, // Rp 350.000
        depositAmount: 17500000,
        durationMinutes: 30,
      },
      {
        id: "chemical-peeling-medium",
        name: "Chemical Peeling Medium",
        description: "Peeling medium-depth untuk mengatasi flek, bekas jerawat, dan uneven skin tone",
        category: "peeling",
        price: 60000000, // Rp 600.000
        depositAmount: 30000000,
        durationMinutes: 45,
      },
      {
        id: "hifu-facial-lifting",
        name: "HIFU Facial Lifting",
        description: "High Intensity Focused Ultrasound untuk mengencangkan dan lifting wajah tanpa operasi",
        category: "advanced",
        price: 300000000, // Rp 3.000.000
        depositAmount: 150000000,
        durationMinutes: 90,
      },
    ];

    console.log('📝 Adding/updating services...\n');

    for (const service of services) {
      const result = await prisma.service.upsert({
        where: { id: service.id },
        update: {
          name: service.name,
          description: service.description,
          price: service.price,
          depositAmount: service.depositAmount,
          durationMinutes: service.durationMinutes,
          isActive: true,
        },
        create: {
          id: service.id,
          businessId: clinic.id,
          name: service.name,
          description: service.description,
          category: service.category,
          price: service.price,
          depositAmount: service.depositAmount,
          durationMinutes: service.durationMinutes,
          isActive: true,
        },
      });
      console.log(`   ✅ ${service.name} (${service.id})`);
    }

    // Deactivate old legacy services
    console.log('\n🔄 Deactivating legacy services...');
    await prisma.service.updateMany({
      where: {
        id: { in: ['facial-basic', 'laser-co2'] },
        businessId: clinic.id,
      },
      data: { isActive: false },
    });
    console.log('   ✅ Legacy services deactivated');

    // Show summary
    const activeServices = await prisma.service.findMany({
      where: { businessId: clinic.id, isActive: true },
      orderBy: { name: 'asc' },
    });

    console.log('\n📊 Active Services Summary:');
    console.log('=' .repeat(60));
    activeServices.forEach((s, i) => {
      const price = (s.price / 100).toLocaleString('id-ID');
      console.log(`${i + 1}. ${s.name}`);
      console.log(`   ID: ${s.id} | Rp ${price} | ${s.durationMinutes} min`);
    });
    console.log('=' .repeat(60));
    console.log(`Total: ${activeServices.length} active services\n`);

    console.log('✅ Services update complete!');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addClinicServices()
  .then(() => {
    console.log('\n🎉 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
