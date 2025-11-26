const fetch = require('node-fetch');

async function testResolve() {
  // Get conversations first
  const conversationsRes = await fetch('https://customer-support-agent-alpha.vercel.app/api/admin/conversations?key=123456');
  const conversations = await conversationsRes.json();
  
  console.log('📋 Conversations:', JSON.stringify(conversations, null, 2));
  
  if (conversations.length > 0) {
    const conversationId = conversations[0].id;
    console.log('\n🔧 Testing resolve for conversation:', conversationId);
    
    const resolveRes = await fetch(`https://customer-support-agent-alpha.vercel.app/api/admin/conversation/${conversationId}/resolve?key=123456`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resolvedBy: 'Test User',
        notes: 'Test resolution'
      })
    });
    
    const result = await resolveRes.json();
    console.log('\n📤 Resolve response:', JSON.stringify(result, null, 2));
    console.log('Status:', resolveRes.status);
  }
}

testResolve().catch(console.error);
