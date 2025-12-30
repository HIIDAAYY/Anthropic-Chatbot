/**
 * Delete all UrbanStyle vectors from Pinecone
 * This script removes vectors that don't have source="clinic" metadata
 *
 * Prerequisites:
 * - PINECONE_API_KEY must be set in .env.local
 * - PINECONE_INDEX_NAME must be set in .env.local
 *
 * Usage: npx tsx scripts/delete-urbanstyle-vectors.ts
 */

import 'dotenv/config';
import { getPineconeIndex, getIndexStats } from '@/lib/pinecone';

async function deleteUrbanStyleVectors() {
  try {
    console.log('🗑️  Starting UrbanStyle vector deletion from Pinecone...\n');

    // Get initial stats
    console.log('📊 Fetching index statistics before deletion...');
    const statsBefore = await getIndexStats();
    console.log('   Total vectors before:', statsBefore.totalRecordCount);
    console.log('   Namespaces:', JSON.stringify(statsBefore.namespaces, null, 2));
    console.log('');

    const index = getPineconeIndex();

    // Delete all vectors that don't have source="clinic"
    // Pinecone syntax: deleteMany with filter
    console.log('🔍 Deleting vectors where source != "clinic"...');

    // Note: Pinecone's deleteMany with filter syntax
    // This deletes all vectors that don't match source="clinic"
    await index.namespace('').deleteMany({
      source: { $ne: "clinic" } // Not equal to clinic
    });

    console.log('✅ Successfully deleted all UrbanStyle vectors');
    console.log('   Only clinic vectors remain in Pinecone\n');

    // Wait a bit for Pinecone to update stats
    console.log('⏳ Waiting for Pinecone to update statistics...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Get final stats
    console.log('📊 Fetching index statistics after deletion...');
    const statsAfter = await getIndexStats();
    console.log('   Total vectors after:', statsAfter.totalRecordCount);
    console.log('   Namespaces:', JSON.stringify(statsAfter.namespaces, null, 2));
    console.log('');

    console.log('🎉 Cleanup complete! All UrbanStyle vectors have been removed.');
    console.log('   Your Pinecone index now only contains clinic knowledge base.');

  } catch (error) {
    console.error('❌ Error deleting vectors:', error);
    console.error('\nIf you see a "filter not supported" error, you may need to:');
    console.error('1. Delete all vectors: index.namespace("").deleteAll()');
    console.error('2. Re-upload only clinic vectors using: npx tsx scripts/upload-clinic-faq.ts');
    throw error;
  }
}

// Run the cleanup
deleteUrbanStyleVectors()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
