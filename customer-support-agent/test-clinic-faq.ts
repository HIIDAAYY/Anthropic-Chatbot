/**
 * Test clinic FAQ retrieval from Pinecone
 * Tests the bot's ability to answer clinic-related questions using the 87 clinic vectors
 */

import 'dotenv/config';

const API_URL = 'http://localhost:3000/api/chat';

interface TestCase {
  question: string;
  expectedKeywords: string[];
  description: string;
}

const testCases: TestCase[] = [
  {
    question: 'Dimana lokasi klinik Anda?',
    expectedKeywords: ['lokasi', 'alamat', 'jalan', 'klinik'],
    description: 'Clinic location (should retrieve from FAQ)',
  },
  {
    question: 'Berapa harga untuk treatment facial?',
    expectedKeywords: ['harga', 'rp', 'treatment', 'facial'],
    description: 'Facial treatment pricing',
  },
  {
    question: 'Jam berapa klinik buka?',
    expectedKeywords: ['jam', 'buka', 'tutup', 'operasional'],
    description: 'Operating hours',
  },
  {
    question: 'Bagaimana cara melakukan booking?',
    expectedKeywords: ['booking', 'cara', 'proses', 'reservasi'],
    description: 'Booking process',
  },
  {
    question: 'Apa saja layanan klinik yang tersedia?',
    expectedKeywords: ['layanan', 'tersedia', 'treatment', 'dental', 'facial'],
    description: 'Available services',
  },
];

async function testClinicFAQ() {
  console.log('🏥 Testing Clinic FAQ Retrieval from Pinecone\n');
  console.log('═'.repeat(70));

  let passCount = 0;
  let totalTests = testCases.length;

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n📝 Test ${i + 1}/${totalTests}: ${testCase.description}`);
    console.log(`Q: "${testCase.question}"`);
    console.log('-'.repeat(70));

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: testCase.question,
            },
          ],
          sessionId: `test-${i}`,
        }),
      });

      const data = await response.json();

      // Parse response
      const responseText = data.response?.response || data.message || JSON.stringify(data);
      const contextUsed = data.response?.debug?.context_used || false;

      // Check for expected keywords
      const lowerResponse = responseText.toLowerCase();
      const foundKeywords = testCase.expectedKeywords.filter(kw =>
        lowerResponse.includes(kw.toLowerCase())
      );

      const keywordMatch = foundKeywords.length / testCase.expectedKeywords.length;
      const pass = keywordMatch >= 0.5; // At least 50% of keywords found

      if (pass) {
        passCount++;
        console.log('✅ PASS - Keywords found:', foundKeywords.join(', '));
      } else {
        console.log('❌ FAIL - Keywords not found');
        console.log('   Found:', foundKeywords.join(', '));
        console.log('   Missing:', testCase.expectedKeywords.filter(kw => !foundKeywords.includes(kw)).join(', '));
      }

      console.log(`📌 Context Used: ${contextUsed ? '✅ YES (RAG)' : '❌ NO'}`);
      console.log(`📄 Response: ${responseText.substring(0, 200)}...`);

    } catch (error) {
      console.error('❌ ERROR:', error instanceof Error ? error.message : String(error));
    }
  }

  console.log('\n' + '═'.repeat(70));
  console.log(`\n📊 TEST RESULTS: ${passCount}/${totalTests} tests passed`);
  console.log(`✅ Success Rate: ${((passCount / totalTests) * 100).toFixed(1)}%`);

  if (passCount === totalTests) {
    console.log('\n🎉 All clinic FAQ tests passed! Bot is properly retrieving clinic knowledge base.');
  } else if (passCount >= totalTests * 0.8) {
    console.log('\n✅ Most clinic FAQ tests passed. Bot is retrieving clinic knowledge base.');
  } else {
    console.log('\n⚠️ Some FAQ tests failed. Check if clinic vectors are properly in Pinecone.');
  }

  process.exit(passCount === totalTests ? 0 : 1);
}

testClinicFAQ().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
