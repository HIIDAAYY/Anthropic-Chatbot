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

import { getPineconeIndex } from '@/lib/pinecone';

async function deleteAllVectors() {
  try {
    console.log('🗑️  Deleting ALL vectors from Pinecone index...\n');

    const index = getPineconeIndex();

    console.log('🔄 Executing deleteAll()...');
    await index.namespace('').deleteAll();

    console.log('✅ All vectors deleted successfully!\n');

    // Wait a bit and verify
    console.log('⏳ Waiting 3 seconds for deletion to complete...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    const stats = await index.describeIndexStats();
    console.log('📊 Index stats after deletion:');
    console.log('   Total vectors:', stats.totalRecordCount);
    console.log('\n✅ Pinecone index is now empty and ready for fresh upload!');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

deleteAllVectors()
  .then(() => {
    console.log('\n🎉 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
