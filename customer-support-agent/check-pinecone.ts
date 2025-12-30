import 'dotenv/config';
import { queryPineconeWithText } from '@/lib/pinecone';

async function checkData() {
  console.log('🔍 Checking Pinecone vectors...\n');

  try {
    const result = await queryPineconeWithText('dimana lokasi klinik', 3);
    console.log('Query Results:');
    console.log(JSON.stringify(result, null, 2));

    if (result.matches && result.matches.length > 0) {
      console.log('\n✅ Vectors found in Pinecone');
      result.matches.forEach((match, idx) => {
        console.log(`\nMatch ${idx + 1}:`);
        console.log('  ID:', match.id);
        console.log('  Score:', match.score);
        console.log('  Metadata:', JSON.stringify(match.metadata, null, 2));
      });
    } else {
      console.log('\n❌ No vectors found in Pinecone');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkData();
