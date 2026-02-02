/**
 * Comprehensive Automated Testing Script
 * Tests all features from MANUAL_TESTING_GUIDE.md
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = path.join(__dirname, '../test-results/screenshots');
const REPORT_FILE = path.join(__dirname, '../test-results/automated-test-report.md');

// Ensure directories exist
if (!fs.existsSync(path.join(__dirname, '../test-results'))) {
  fs.mkdirSync(path.join(__dirname, '../test-results'), { recursive: true });
}
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Helper function to add test result
function addTestResult(category, testName, passed, notes = '', screenshotPath = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
  
  testResults.details.push({
    category,
    testName,
    passed,
    notes,
    screenshotPath,
    timestamp: new Date().toISOString()
  });
  
  console.log(`${passed ? '✅' : '❌'} [${category}] ${testName}: ${notes}`);
}

// Helper function to wait for bot response
async function waitForBotResponse(page, timeout = 15000) {
  try {
    // Wait for the response to appear
    await page.waitForFunction(
      () => {
        const messages = document.querySelectorAll('[class*="message"]');
        return messages.length > 0;
      },
      { timeout }
    );
    
    // Wait a bit more for complete rendering
    await page.waitForTimeout(2000);
    return true;
  } catch (error) {
    console.error('Timeout waiting for bot response:', error.message);
    return false;
  }
}

// Helper function to send message
async function sendMessage(page, message) {
  try {
    // Find input field - try multiple selectors
    const inputSelectors = [
      'textarea[placeholder*="message"]',
      'input[type="text"]',
      'textarea',
      '[contenteditable="true"]'
    ];
    
    let inputFound = false;
    for (const selector of inputSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        await page.type(selector, message);
        inputFound = true;
        break;
      } catch (e) {
        continue;
      }
    }
    
    if (!inputFound) {
      throw new Error('Could not find input field');
    }
    
    // Find and click send button
    const buttonSelectors = [
      'button[type="submit"]',
      'button:has-text("Send")',
      'button:has-text("Kirim")',
      'button[aria-label*="send"]',
      'button[aria-label*="Send"]'
    ];
    
    let buttonClicked = false;
    for (const selector of buttonSelectors) {
      try {
        const button = await page.$(selector);
        if (button) {
          await button.click();
          buttonClicked = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!buttonClicked) {
      // Try pressing Enter as fallback
      await page.keyboard.press('Enter');
    }
    
    return true;
  } catch (error) {
    console.error('Error sending message:', error.message);
    return false;
  }
}

// Helper function to get last bot response
async function getLastBotResponse(page) {
  try {
    const response = await page.evaluate(() => {
      const messages = Array.from(document.querySelectorAll('[class*="message"]'));
      const lastMessage = messages[messages.length - 1];
      return lastMessage ? lastMessage.innerText : '';
    });
    return response;
  } catch (error) {
    console.error('Error getting bot response:', error.message);
    return '';
  }
}

// Main testing function
async function runTests() {
  console.log('🚀 Starting Automated Testing...\n');
  
  const browser = await puppeteer.launch({
    headless: false, // Set to true for CI/CD
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  try {
    // ==================== A. BASIC CHAT & UI ====================
    console.log('\n========== A. BASIC CHAT & UI ==========');
    
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-initial-page.png') });
    
    // Test A1: Chat interface visible
    const chatInterfaceVisible = await page.evaluate(() => {
      const hasInput = document.querySelector('textarea, input[type="text"]');
      const hasButton = document.querySelector('button');
      return hasInput && hasButton;
    });
    addTestResult('Basic UI', 'Chat interface visible', chatInterfaceVisible, 
      chatInterfaceVisible ? 'Input and button found' : 'Missing input or button',
      '01-initial-page.png');
    
    // Test A2: Can send message
    const testMessage = 'Halo, apa saja treatment yang tersedia?';
    const messageSent = await sendMessage(page, testMessage);
    addTestResult('Basic UI', 'Can type and send message', messageSent,
      messageSent ? `Sent: "${testMessage}"` : 'Failed to send message');
    
    // Test A3: Bot responds
    const gotResponse = await waitForBotResponse(page);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-first-response.png') });
    
    const responseText = await getLastBotResponse(page);
    const botResponded = gotResponse && responseText.length > 0;
    addTestResult('Basic UI', 'Bot responds', botResponded,
      botResponded ? `Response: ${responseText.substring(0, 100)}...` : 'No response received',
      '02-first-response.png');
    
    // Test A4: Message history visible
    const historyVisible = await page.evaluate(() => {
      const messages = document.querySelectorAll('[class*="message"]');
      return messages.length >= 2; // User message + bot response
    });
    addTestResult('Basic UI', 'Message history visible', historyVisible,
      historyVisible ? 'Multiple messages visible' : 'History not visible');
    
    // Test A5: Suggested questions appear
    const suggestedQuestionsVisible = await page.evaluate(() => {
      const suggestions = document.querySelectorAll('button[class*="suggest"], [class*="suggestion"]');
      return suggestions.length > 0;
    });
    addTestResult('Basic UI', 'Suggested questions appear', suggestedQuestionsVisible,
      suggestedQuestionsVisible ? 'Suggestions found' : 'No suggestions visible');
    
    await page.waitForTimeout(2000);
    
    // ==================== B. FAQ TESTING ====================
    console.log('\n========== B. FAQ (KNOWLEDGE BASE) ==========');
    
    const faqTests = [
      { query: 'Dimana lokasi klinik?', testName: 'Lokasi klinik', keywords: ['lokasi', 'alamat', 'jalan'] },
      { query: 'Jam operasional klinik?', testName: 'Jam operasional', keywords: ['jam', 'buka', 'tutup', 'senin', 'minggu'] },
      { query: 'Apa nomor telepon klinik?', testName: 'Nomor telepon', keywords: ['telepon', 'nomor', 'whatsapp', '08', '+62'] },
      { query: 'Berapa harga facial treatment?', testName: 'Harga treatment', keywords: ['rp', 'harga', 'biaya', 'facial'] },
      { query: 'Metode pembayaran apa saja yang diterima?', testName: 'Metode pembayaran', keywords: ['transfer', 'cash', 'pembayaran', 'kartu'] },
      { query: 'Apakah ada promo atau diskon?', testName: 'Info promo', keywords: ['promo', 'diskon', 'tidak ada', 'belum ada', 'paket'] }
    ];
    
    for (let i = 0; i < faqTests.length; i++) {
      const test = faqTests[i];
      await sendMessage(page, test.query);
      await waitForBotResponse(page);
      
      const response = await getLastBotResponse(page);
      const hasRelevantInfo = test.keywords.some(keyword => 
        response.toLowerCase().includes(keyword.toLowerCase())
      );
      
      await page.screenshot({ 
        path: path.join(SCREENSHOT_DIR, `03-faq-${i + 1}-${test.testName.replace(/ /g, '-')}.png`) 
      });
      
      addTestResult('FAQ', test.testName, hasRelevantInfo,
        hasRelevantInfo ? `Found keywords: ${test.keywords.filter(k => response.toLowerCase().includes(k.toLowerCase())).join(', ')}` : 'No relevant keywords found',
        `03-faq-${i + 1}-${test.testName.replace(/ /g, '-')}.png`);
      
      await page.waitForTimeout(1500);
    }
    
    // ==================== C. BOT TOOLS TESTING ====================
    console.log('\n========== C. BOT TOOLS ==========');
    
    // Test C1: Check availability
    await sendMessage(page, 'Cek ketersediaan slot untuk besok');
    await waitForBotResponse(page, 20000); // Tools might take longer
    const availabilityResponse = await getLastBotResponse(page);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-check-availability.png') });
    
    const hasAvailabilityInfo = !availabilityResponse.includes('{') && 
                                (availabilityResponse.toLowerCase().includes('tersedia') || 
                                 availabilityResponse.toLowerCase().includes('slot') ||
                                 availabilityResponse.toLowerCase().includes('available'));
    addTestResult('Bot Tools', 'Check availability', hasAvailabilityInfo,
      hasAvailabilityInfo ? 'Availability info provided (not raw JSON)' : 'Raw JSON or no info',
      '04-check-availability.png');
    
    await page.waitForTimeout(2000);
    
    // Test C2: Create booking
    await sendMessage(page, 'Saya mau booking facial untuk tanggal 5 Februari 2026 jam 10 pagi');
    await waitForBotResponse(page, 20000);
    const bookingResponse = await getLastBotResponse(page);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-create-booking.png') });
    
    const hasBookingConfirmation = bookingResponse.toLowerCase().includes('booking') ||
                                   bookingResponse.toLowerCase().includes('appointment') ||
                                   bookingResponse.toLowerCase().includes('konfirmasi');
    addTestResult('Bot Tools', 'Create booking', hasBookingConfirmation,
      hasBookingConfirmation ? 'Booking confirmation received' : 'No booking confirmation',
      '05-create-booking.png');
    
    await page.waitForTimeout(2000);
    
    // ==================== D. MULTILINGUAL SUPPORT ====================
    console.log('\n========== D. MULTILINGUAL SUPPORT ==========');
    
    // Test D1: Indonesian
    await sendMessage(page, 'Berapa harga treatment jerawat?');
    await waitForBotResponse(page);
    const indonesianResponse = await getLastBotResponse(page);
    const isIndonesian = indonesianResponse.match(/[a-z]+/) && 
                        (indonesianResponse.includes('Rp') || 
                         indonesianResponse.toLowerCase().includes('harga'));
    addTestResult('Multilingual', 'Bahasa Indonesia', isIndonesian,
      isIndonesian ? 'Responded in Indonesian' : 'Not Indonesian');
    
    await page.waitForTimeout(1500);
    
    // Test D2: English
    await sendMessage(page, 'What is the price for acne treatment?');
    await waitForBotResponse(page);
    const englishResponse = await getLastBotResponse(page);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-english-response.png') });
    
    const isEnglish = englishResponse.match(/[a-zA-Z]+/) && 
                     !indonesianResponse.toLowerCase().includes('apa');
    addTestResult('Multilingual', 'English', isEnglish,
      isEnglish ? 'Responded in English' : 'Not English',
      '06-english-response.png');
    
    await page.waitForTimeout(1500);
    
    // ==================== E. MOOD DETECTION ====================
    console.log('\n========== E. MOOD DETECTION ==========');
    
    const moodTests = [
      { query: 'Wah kliniknya bagus sekali! Saya tertarik booking', mood: 'Positive', keywords: ['terima kasih', 'senang', 'bagus', 'silakan'] },
      { query: 'Saya bingung harus pilih treatment yang mana', mood: 'Confused', keywords: ['bantu', 'rekomendasi', 'saran', 'bisa'] },
      { query: 'Treatment kemarin malah bikin kulit saya iritasi!', mood: 'Negative', keywords: ['maaf', 'mohon maaf', 'agen', 'tim', 'hubungi'] }
    ];
    
    for (let i = 0; i < moodTests.length; i++) {
      const test = moodTests[i];
      await sendMessage(page, test.query);
      await waitForBotResponse(page);
      
      const response = await getLastBotResponse(page);
      const hasAppropriateResponse = test.keywords.some(keyword => 
        response.toLowerCase().includes(keyword.toLowerCase())
      );
      
      await page.screenshot({ 
        path: path.join(SCREENSHOT_DIR, `07-mood-${i + 1}-${test.mood.toLowerCase()}.png`) 
      });
      
      addTestResult('Mood Detection', `${test.mood} mood`, hasAppropriateResponse,
        hasAppropriateResponse ? `Appropriate response for ${test.mood.toLowerCase()} mood` : 'Response not appropriate',
        `07-mood-${i + 1}-${test.mood.toLowerCase()}.png`);
      
      await page.waitForTimeout(1500);
    }
    
    // ==================== F. HANDOFF TO HUMAN ====================
    console.log('\n========== F. HANDOFF TO HUMAN AGENT ==========');
    
    await sendMessage(page, 'Saya mau komplain, treatment kemarin jerawat saya malah tambah parah!');
    await waitForBotResponse(page);
    const complaintResponse = await getLastBotResponse(page);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-handoff-complaint.png') });
    
    const handoffTriggered = complaintResponse.toLowerCase().includes('agen') ||
                            complaintResponse.toLowerCase().includes('tim kami') ||
                            complaintResponse.toLowerCase().includes('hubungi') ||
                            complaintResponse.toLowerCase().includes('contact');
    addTestResult('Handoff', 'Complaint triggers handoff', handoffTriggered,
      handoffTriggered ? 'Handoff to human suggested' : 'No handoff triggered',
      '08-handoff-complaint.png');
    
    await page.waitForTimeout(2000);
    
    // ==================== G. EDGE CASES ====================
    console.log('\n========== G. EDGE CASES ==========');
    
    // Test G1: Invalid input
    await sendMessage(page, 'asdfghjkl');
    await waitForBotResponse(page);
    const invalidResponse = await getLastBotResponse(page);
    const handlesInvalid = invalidResponse.length > 0 && 
                          !invalidResponse.includes('error') &&
                          !invalidResponse.includes('Error');
    addTestResult('Edge Cases', 'Invalid input', handlesInvalid,
      handlesInvalid ? 'Handled gracefully' : 'Error or no response');
    
    await page.waitForTimeout(1500);
    
    // Test G2: Out of scope
    await sendMessage(page, 'Siapa presiden Indonesia?');
    await waitForBotResponse(page);
    const oosResponse = await getLastBotResponse(page);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09-out-of-scope.png') });
    
    const declinesPolitely = oosResponse.toLowerCase().includes('tidak') ||
                            oosResponse.toLowerCase().includes('maaf') ||
                            oosResponse.toLowerCase().includes('klinik');
    addTestResult('Edge Cases', 'Out of scope query', declinesPolitely,
      declinesPolitely ? 'Declined politely' : 'Did not decline properly',
      '09-out-of-scope.png');
    
    await page.waitForTimeout(1500);
    
    // ==================== H. ADMIN DASHBOARD ====================
    console.log('\n========== H. ADMIN DASHBOARD ==========');
    
    const adminPages = [
      { url: '/admin/conversations', name: 'Conversations page' },
      { url: '/admin/handoffs', name: 'Handoffs page' },
      { url: '/admin/analytics', name: 'Analytics page' }
    ];
    
    for (let i = 0; i < adminPages.length; i++) {
      const adminPage = adminPages[i];
      try {
        await page.goto(BASE_URL + adminPage.url, { waitUntil: 'networkidle2', timeout: 10000 });
        await page.screenshot({ 
          path: path.join(SCREENSHOT_DIR, `10-admin-${i + 1}-${adminPage.name.replace(/ /g, '-')}.png`) 
        });
        
        const pageLoaded = await page.evaluate(() => {
          return !document.body.innerText.includes('404') && 
                 !document.body.innerText.includes('Not Found');
        });
        
        addTestResult('Admin Dashboard', adminPage.name, pageLoaded,
          pageLoaded ? 'Page loaded successfully' : 'Page not found or error',
          `10-admin-${i + 1}-${adminPage.name.replace(/ /g, '-')}.png`);
      } catch (error) {
        addTestResult('Admin Dashboard', adminPage.name, false,
          `Error: ${error.message}`);
      }
      
      await page.waitForTimeout(1000);
    }
    
    // ==================== FINAL SCREENSHOT ====================
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11-final-state.png'), fullPage: true });
    
  } catch (error) {
    console.error('❌ Fatal error during testing:', error);
    addTestResult('System', 'Testing execution', false, `Fatal error: ${error.message}`);
  } finally {
    await browser.close();
  }
  
  // Generate report
  generateReport();
  
  console.log('\n✅ Testing completed!');
  console.log(`📊 Results: ${testResults.passed}/${testResults.total} passed (${Math.round(testResults.passed/testResults.total*100)}%)`);
  console.log(`📄 Report saved to: ${REPORT_FILE}`);
  console.log(`📸 Screenshots saved to: ${SCREENSHOT_DIR}`);
}

// Generate markdown report
function generateReport() {
  const timestamp = new Date().toLocaleString('id-ID');
  const passRate = Math.round((testResults.passed / testResults.total) * 100);
  
  let report = `# Automated Testing Report\n\n`;
  report += `**Generated**: ${timestamp}\n\n`;
  report += `## Summary\n\n`;
  report += `- **Total Tests**: ${testResults.total}\n`;
  report += `- **Passed**: ${testResults.passed} ✅\n`;
  report += `- **Failed**: ${testResults.failed} ❌\n`;
  report += `- **Pass Rate**: ${passRate}%\n\n`;
  
  if (passRate >= 80) {
    report += `> [!NOTE]\n> ✅ **SUCCESS**: Bot meets the 80%+ passing criteria!\n\n`;
  } else {
    report += `> [!WARNING]\n> ⚠️ **NEEDS IMPROVEMENT**: Pass rate below 80% threshold.\n\n`;
  }
  
  report += `## Detailed Results\n\n`;
  
  // Group by category
  const categories = {};
  testResults.details.forEach(result => {
    if (!categories[result.category]) {
      categories[result.category] = [];
    }
    categories[result.category].push(result);
  });
  
  Object.keys(categories).forEach(category => {
    report += `### ${category}\n\n`;
    report += `| Test | Status | Notes | Screenshot |\n`;
    report += `|------|--------|-------|------------|\n`;
    
    categories[category].forEach(result => {
      const status = result.passed ? '✅' : '❌';
      const screenshot = result.screenshotPath ? `[View](./screenshots/${path.basename(result.screenshotPath)})` : '-';
      report += `| ${result.testName} | ${status} | ${result.notes} | ${screenshot} |\n`;
    });
    
    report += `\n`;
  });
  
  report += `## Screenshots\n\n`;
  report += `All screenshots are available in the [\`screenshots\`](./screenshots/) directory.\n\n`;
  
  report += `## Recommendations\n\n`;
  
  const failedTests = testResults.details.filter(r => !r.passed);
  if (failedTests.length > 0) {
    report += `### Issues to Address\n\n`;
    failedTests.forEach((test, i) => {
      report += `${i + 1}. **[${test.category}] ${test.testName}**: ${test.notes}\n`;
    });
  } else {
    report += `No critical issues found. All tests passed! 🎉\n`;
  }
  
  fs.writeFileSync(REPORT_FILE, report);
}

// Run the tests
runTests().catch(console.error);
