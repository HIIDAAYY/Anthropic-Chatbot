const testCustomerId = `test_sales_${Date.now()}`;

console.log('🧪 Testing Sales Automation...');
console.log(`📱 Customer ID: ${testCustomerId}\n`);

async function testSalesAutomation() {
  try {
    const response = await fetch('http://localhost:3003/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: "Halo, saya tertarik dengan facial glow. Berapa harganya?" }
        ],
        customerId: testCustomerId
      })
    });

    const data = await response.json();
    console.log('✅ Response received:\n');
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSalesAutomation();
