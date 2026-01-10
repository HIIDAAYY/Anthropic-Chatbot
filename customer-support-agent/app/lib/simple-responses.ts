/**
 * Pre-defined responses for simple queries
 * Skips Claude API for common greetings and acknowledgments
 */

interface SimpleResponse {
  response: string;
  mood: 'positive' | 'neutral' | 'negative' | 'curious' | 'frustrated' | 'confused';
  suggestedQuestions: string[];
}

const SIMPLE_PATTERNS: Record<string, SimpleResponse> = {
  // Greetings
  'hi|hello|hai|halo|hei|hey': {
    response: 'Hai! Ada yang bisa saya bantu? 😊',
    mood: 'positive',
    suggestedQuestions: [
      'Berapa harga facial treatment?',
      'Jam operasional klinik?',
      'Cara booking appointment?'
    ],
  },

  // Thanks
  'terima kasih|thank you|thanks|thx|makasih|tengkyu': {
    response: 'Sama-sama! Senang bisa membantu. Ada yang bisa dibantu lagi? 😊',
    mood: 'positive',
    suggestedQuestions: [
      'Info promo terbaru?',
      'Booking treatment?',
      'Tanya treatment lain?'
    ],
  },

  // Goodbye
  'bye|goodbye|dadah|sampai jumpa': {
    response: 'Sampai jumpa! Jangan ragu untuk chat lagi kalau ada pertanyaan ya! 👋',
    mood: 'positive',
    suggestedQuestions: [],
  },

  // Simple acknowledgments
  'ok|oke|okay|baik|sip': {
    response: 'Siap! Ada yang bisa saya bantu? 😊',
    mood: 'neutral',
    suggestedQuestions: [
      'Lihat harga treatment?',
      'Cek jadwal booking?',
      'Info klinik?'
    ],
  },
};

/**
 * Check if query matches simple pattern
 * Returns pre-defined response if matched, null otherwise
 */
export function getSimpleResponse(query: string): any | null {
  // Normalize query
  const normalized = query.toLowerCase().trim();
  const cleaned = normalized.replace(/[.,!?]/g, ''); // Remove punctuation

  // Check if query is very short (likely simple)
  if (cleaned.length > 50) {
    return null; // Too long, probably complex
  }

  // Try pattern matching
  for (const [pattern, responseData] of Object.entries(SIMPLE_PATTERNS)) {
    const regex = new RegExp(`^(${pattern})$`, 'i');
    if (regex.test(cleaned)) {
      console.log(`✅ Simple pattern matched: "${pattern}"`);
      console.log(`💰 Skipping API call - saved ~$0.0045`);

      return {
        response: responseData.response,
        thinking: 'Pre-defined simple response (no API call)',
        user_mood: responseData.mood,
        suggested_questions: responseData.suggestedQuestions,
        debug: { context_used: false },
        matched_categories: [],
        tools_used: [],
        redirect_to_agent: { should_redirect: false },
      };
    }
  }

  return null;
}
