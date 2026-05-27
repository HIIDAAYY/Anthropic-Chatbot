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

  // Affirmations
  'ya|iya|yep|yap|yes': {
    response: 'Siap! Ada yang bisa saya bantu? 😊',
    mood: 'neutral',
    suggestedQuestions: ['Info layanan kami?', 'Cara booking?', 'Jam operasional?'],
  },

  // Negatives
  'tidak|nggak|ngga|no|nope': {
    response: 'Baik! Jika ada pertanyaan lain, jangan ragu untuk tanya ya 😊',
    mood: 'neutral',
    suggestedQuestions: [],
  },

  // Help requests
  'bantuan|tolong|help': {
    response: 'Halo! Saya siap bantu. Silakan sampaikan pertanyaannya ya! 😊',
    mood: 'positive',
    suggestedQuestions: ['Info harga layanan?', 'Cara melakukan booking?', 'Hubungi agen kami?'],
  },

  // Info requests
  'info|informasi': {
    response: 'Halo! Info apa yang kamu butuhkan? 😊',
    mood: 'neutral',
    suggestedQuestions: ['Info harga treatment?', 'Info jam operasional?', 'Info cara booking?'],
  },

  // Confused/unclear
  'hah|huh|apaan': {
    response: 'Maaf, bisa dijelaskan lebih lanjut pertanyaannya? 😊',
    mood: 'neutral',
    suggestedQuestions: ['Tanya tentang layanan?', 'Tanya tentang booking?', 'Tanya tentang harga?'],
  },

  // Apology
  'maaf|sorry|sori': {
    response: 'Tidak apa-apa! Ada yang bisa saya bantu? 😊',
    mood: 'positive',
    suggestedQuestions: ['Info layanan kami?', 'Cara booking?', 'Hubungi agen?'],
  },

  // Time-of-day greetings
  'selamat pagi|selamat siang|selamat sore|selamat malam': {
    response: 'Halo, selamat datang! Ada yang bisa saya bantu? 😊',
    mood: 'positive',
    suggestedQuestions: ['Info layanan kami?', 'Cara booking treatment?', 'Jam operasional?'],
  },

  // Compliments
  'bagus|keren|mantap|luar biasa|top': {
    response: 'Makasih banyak! 😊 Ada yang bisa saya bantu lagi?',
    mood: 'positive',
    suggestedQuestions: ['Info treatment lainnya?', 'Booking layanan?', 'Promo terbaru?'],
  },

  // Wait/hold
  'tunggu|wait|sebentar': {
    response: 'Siap, saya tunggu! Silakan sampaikan pertanyaannya ya 😊',
    mood: 'neutral',
    suggestedQuestions: [],
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
