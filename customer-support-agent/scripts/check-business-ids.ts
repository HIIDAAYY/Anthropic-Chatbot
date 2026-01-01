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

async function checkBusinessIds() {
  try {
    console.log('\n📊 Checking Business IDs in Database...\n');

    const businesses = await prisma.business.findMany({
      include: {
        _count: {
          select: { services: true }
        }
      }
    });

    console.log(`Found ${businesses.length} businesses:\n`);
    console.log('='.repeat(80));

    businesses.forEach((business, i) => {
      console.log(`${i + 1}. ${business.name}`);
      console.log(`   ID: ${business.id}`);
      console.log(`   Type: ${business.type}`);
      console.log(`   Phone: ${business.phoneNumber}`);
      console.log(`   Email: ${business.email}`);
      console.log(`   Services: ${business._count.services}`);
      console.log('');
    });

    console.log('='.repeat(80));

    // Check for Klinik Glow Aesthetics specifically
    const clinic = await prisma.business.findFirst({
      where: {
        OR: [
          { name: { contains: 'Glow' } },
          { name: { contains: 'Klinik' } },
          { type: 'BEAUTY_CLINIC' }
        ]
      },
      include: {
        services: {
          where: { isActive: true },
          select: { id: true, name: true }
        }
      }
    });

    if (clinic) {
      console.log('\n✅ Found Klinik Glow Aesthetics:');
      console.log(`   ID: ${clinic.id}`);
      console.log(`   Name: ${clinic.name}`);
      console.log(`   Active Services: ${clinic.services.length}`);
      console.log('\n   Service IDs:');
      clinic.services.forEach(s => {
        console.log(`   - ${s.id}: ${s.name}`);
      });
    } else {
      console.log('\n❌ No clinic found!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkBusinessIds()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
