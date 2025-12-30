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

async function updateBusinessName() {
  try {
    console.log('🔄 Updating business name from Sozo to Klinik Glow Aesthetics...\n');

    // Find the business with old name
    const result = await prisma.business.updateMany({
      where: {
        OR: [
          { name: { contains: "Sozo" } },
          { phoneNumber: "whatsapp:+6281234567891" }
        ]
      },
      data: {
        name: "Klinik Glow Aesthetics Jakarta",
        email: "hello@glowaesthetics.id",
        address: "Jl. Senopati Raya No. 45, Kebayoran Baru, Jakarta Selatan 12190",
      }
    });

    console.log(`✅ Updated ${result.count} business record(s)`);

    // Verify
    const businesses = await prisma.business.findMany();
    console.log('\n📊 Current businesses in database:');
    businesses.forEach(b => {
      console.log(`   - ${b.name} (${b.type})`);
    });

    console.log('\n✅ Update complete!');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateBusinessName()
  .then(() => {
    console.log('\n🎉 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
