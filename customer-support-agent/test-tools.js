#!/usr/bin/env node

const fetch = require('node-fetch');

async function testBotTools() {
  const tests = [
    {
      name: "Test 1: Track Order",
      message: "Mana pesanan saya ORD-2025-001?"
    },
    {
      name: "Test 2: Verify Payment",
      message: "Sudah terbayar belum pesanan saya?"
    },
    {
      name: "Test 3: Check Inventory",
      message: "Apakah Kaos Basic Crewneck tersedia?"
    },
    {
      name: "Test 4: Order Summary",
      message: "Berapa total pesanan saya?"
    }
  ];

  for (const test of tests) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 ${test.name}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`User: "${test.message}"`);

    try {
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: test.message }],
          model: 'claude-3-5-sonnet-20241022',
          sessionId: `test-${Date.now()}`
        })
      });

      const data = await response.json();

      if (data.response) {
        console.log(`\nBot Response:\n${data.response}`);
      }

      if (data.tools_used && data.tools_used.length > 0) {
        console.log(`\n✅ Tools Used: ${data.tools_used.join(', ')}`);
      } else {
        console.log(`\n⚠️ No tools were used`);
      }

    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
  }
}

testBotTools();
