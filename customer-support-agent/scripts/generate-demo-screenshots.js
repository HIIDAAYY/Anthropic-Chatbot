/**
 * Automated Script to Generate Beautiful Demo Screenshots for Outreach Pitch
 * Run: node scripts/generate-demo-screenshots.js
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3002';

// Target Paths
const MARKETING_DIR_WS = path.join(__dirname, '../marketing-assets');
const MARKETING_DIR_OD = 'c:/Users/aditm/OneDrive/Documents/Claude/Projects/5 million first/marketing-assets';

// Ensure directories exist
if (!fs.existsSync(MARKETING_DIR_WS)) {
  fs.mkdirSync(MARKETING_DIR_WS, { recursive: true });
}
if (!fs.existsSync(MARKETING_DIR_OD)) {
  fs.mkdirSync(MARKETING_DIR_OD, { recursive: true });
}

// Skenario percakapan
const SCENARIOS = [
  {
    clinicId: 'sample-ortodonti',
    filename: 'demo-ortodonti.png',
    messages: [
      'Halo, saya mau tanya-tanya soal pasang behel dong.',
      'Berapa harga behel Damon di sini dan apakah bisa dicicil?',
      'Baik, terima kasih atas penjelasan lengkapnya Dok!'
    ]
  },
  {
    clinicId: 'sample-spkk',
    filename: 'demo-spkk.png',
    messages: [
      'Halo Dok, apakah dokter spesialis kulit praktek setiap hari?',
      'Kulit muka saya mendadak terasa terbakar, gatal hebat, dan melepuh merah setelah pakai produk baru! Tolong resepkan obat segera.'
    ]
  },
  {
    clinicId: 'sample-spgk',
    filename: 'demo-spgk.png',
    messages: [
      'Halo Dok, berapa biaya konsultasi awal untuk Dokter Spesialis Gizi Klinik?',
      'Saya penderita diabetes dan saat ini merasa sangat gemetar, keringat dingin, dan pandangan mata saya kabur!'
    ]
  },
  {
    clinicId: 'sample-hijab-shop',
    filename: 'demo-hijab-shop.png',
    messages: [
      'Halo kak, bagaimana cara order hijab pashmina di sini?',
      'Kapan jadwal live streaming jualan hijabnya biar dapet diskon flash sale?'
    ]
  }
];

// Helper delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  console.log('🚀 Launching Puppeteer to generate high-resolution screenshots...\n');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  // Set a beautiful desktop aspect ratio to capture the sidebars perfectly
  await page.setViewport({ width: 1440, height: 900 });
  
  for (const scenario of SCENARIOS) {
    console.log(`\n🏥 Processing scenario: ${scenario.clinicId}`);
    const url = `${BASE_URL}?clinicId=${scenario.clinicId}`;
    console.log(`   Navigating to: ${url}`);
    
    await page.goto(url, { waitUntil: 'networkidle2' });
    await delay(3000); // Wait for initialization
    
    for (const msg of scenario.messages) {
      console.log(`   📤 Sending: "${msg.slice(0, 40)}..."`);
      
      // Wait for input textarea
      await page.waitForSelector('textarea[placeholder*="message"]');
      await page.type('textarea[placeholder*="message"]', msg);
      await delay(500);
      
      // Click send button
      await page.waitForSelector('textarea[placeholder*="message"] ~ button');
      await page.click('textarea[placeholder*="message"] ~ button');
      
      // Wait for AI response to finish rendering
      // The send button will reappear (becoming clickable again) once the message generation completes
      await delay(6000); 
    }
    
    // Take a gorgeous full screen capture
    console.log(`   📸 Capturing screenshot for ${scenario.filename}...`);
    const wsPath = path.join(MARKETING_DIR_WS, scenario.filename);
    const odPath = path.join(MARKETING_DIR_OD, scenario.filename);
    
    await page.screenshot({ path: wsPath });
    await page.screenshot({ path: odPath });
    
    console.log(`   ✅ Saved to Workspace: ${wsPath}`);
    console.log(`   ✅ Saved to OneDrive: ${odPath}`);
  }
  
  await browser.close();
  console.log('\n🎉 All 4 gorgeous demo screenshots have been generated successfully!');
}

run().catch((err) => {
  console.error('❌ Error generating screenshots:', err);
  process.exit(1);
});
