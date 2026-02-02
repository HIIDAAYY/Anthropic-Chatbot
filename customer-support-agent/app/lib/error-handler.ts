/**
 * Error Handling Utilities
 * Provides custom error classes and error handling functions
 */

import { errorMonitor } from './error-monitor';

/**
 * Base class for custom application errors
 */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Database-related errors
 */
export class DatabaseError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(message, 500);
    this.name = 'DatabaseError';
    if (originalError) {
      this.stack = originalError.stack;
    }
  }
}

/**
 * RAG (Retrieval-Augmented Generation) errors
 */
export class RAGError extends AppError {
  constructor(message: string, public source: 'Pinecone' | 'Bedrock' = 'Pinecone') {
    super(message, 500);
    this.name = 'RAGError';
  }
}

/**
 * Claude API errors
 */
export class ClaudeAPIError extends AppError {
  constructor(message: string, statusCode: number = 500) {
    super(message, statusCode);
    this.name = 'ClaudeAPIError';
  }
}

/**
 * Twilio/WhatsApp errors
 */
export class TwilioError extends AppError {
  constructor(message: string) {
    super(message, 500);
    this.name = 'TwilioError';
  }
}

/**
 * Configuration errors
 */
export class ConfigError extends AppError {
  constructor(message: string) {
    super(message, 500, false);
    this.name = 'ConfigError';
  }
}

/**
 * Generate user-friendly error message
 * Returns appropriate message in Indonesian or English
 */
export function getUserFriendlyErrorMessage(
  error: Error,
  language: 'id' | 'en' = 'id'
): string {
  const messages = {
    id: {
      database: 'Maaf, terjadi masalah dengan sistem kami. Mohon coba lagi dalam beberapa saat. 🙏',
      rag: 'Maaf, saat ini kami kesulitan mengakses informasi. Apakah Anda ingin berbicara dengan customer service kami?',
      claude: 'Maaf, sistem AI kami sedang mengalami gangguan. Mohon coba lagi atau hubungi customer service kami.',
      twilio: 'Maaf, terjadi masalah saat mengirim pesan. Mohon coba lagi dalam beberapa saat.',
      default: 'Maaf, terjadi kesalahan sistem. Mohon coba lagi atau hubungi customer service kami di support@urbanstyleid.com 🙏',
    },
    en: {
      database: 'Sorry, there is an issue with our system. Please try again in a moment. 🙏',
      rag: 'Sorry, we are having difficulty accessing information. Would you like to speak with our customer service?',
      claude: 'Sorry, our AI system is experiencing issues. Please try again or contact our customer service.',
      twilio: 'Sorry, there was a problem sending the message. Please try again in a moment.',
      default: 'Sorry, a system error occurred. Please try again or contact our customer service at support@urbanstyleid.com 🙏',
    },
  };

  const lang = messages[language];

  if (error instanceof DatabaseError) {
    return lang.database;
  } else if (error instanceof RAGError) {
    return lang.rag;
  } else if (error instanceof ClaudeAPIError) {
    return lang.claude;
  } else if (error instanceof TwilioError) {
    return lang.twilio;
  }

  return lang.default;
}

/**
 * Log error with context
 */
export function logError(error: Error, context?: Record<string, any>) {
  const timestamp = new Date().toISOString();
  const isOperational = error instanceof AppError ? error.isOperational : false;

  console.error('=== ERROR LOG ===');
  console.error('Timestamp:', timestamp);
  console.error('Name:', error.name);
  console.error('Message:', error.message);
  console.error('Operational:', isOperational);

  // Send critical errors to monitoring webhook
  if (!isOperational || error instanceof DatabaseError || error instanceof ClaudeAPIError) {
    errorMonitor.alert({
      message: `${error.name}: ${error.message}`,
      error,
      context,
      severity: error instanceof DatabaseError ? 'critical' : 'high',
    }).catch((monitorError) => {
      console.error('Failed to send error to monitor:', monitorError);
    });
  }

  if (context) {
    console.error('Context:', JSON.stringify(context, null, 2));
  }

  if (error.stack) {
    console.error('Stack:', error.stack);
  }

  console.error('=================');
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    factor?: number;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    factor = 2,
  } = options;

  let lastError: Error;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        throw lastError;
      }

      console.log(
        `Attempt ${attempt} failed. Retrying in ${delay}ms... Error: ${lastError.message}`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * factor, maxDelay);
    }
  }

  throw lastError!;
}

/**
 * Handle async errors in route handlers
 */
export function asyncHandler(
  fn: (req: Request, ...args: any[]) => Promise<Response>
) {
  return async (req: Request, ...args: any[]) => {
    try {
      return await fn(req, ...args);
    } catch (error) {
      logError(error as Error, {
        url: req.url,
        method: req.method,
      });

      const message = getUserFriendlyErrorMessage(error as Error);

      return new Response(
        JSON.stringify({
          response: message,
          thinking: 'System error occurred',
          user_mood: 'neutral',
          debug: { context_used: false },
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
}

/**
 * Validate required environment variables
 */
export function validateEnvVars(requiredVars: string[]): void {
  const missing: string[] = [];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    throw new ConfigError(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

/**
 * Check if error should trigger fallback response
 */
export function shouldFallbackToHuman(error: Error): boolean {
  // Fallback to human for critical errors
  return (
    error instanceof RAGError ||
    error instanceof ClaudeAPIError ||
    (error instanceof DatabaseError && error.message.includes('connection'))
  );
}

/**
 * Get emergency fallback response
 */
export function getEmergencyResponse(language: 'id' | 'en' = 'id') {
  const responses = {
    id: {
      response:
        'Maaf, sistem kami sedang mengalami gangguan. Untuk bantuan segera, silakan hubungi:\n\n📞 WhatsApp: +62 812-3456-7890\n📧 Email: support@urbanstyleid.com\n\nTerima kasih atas pengertiannya. 🙏',
      thinking: 'System is experiencing critical issues, providing emergency contact',
      user_mood: 'neutral' as const,
      suggested_questions: [],
      debug: { context_used: false },
      redirect_to_agent: {
        should_redirect: true,
        reason: 'System error - emergency fallback',
      },
    },
    en: {
      response:
        'Sorry, our system is experiencing issues. For immediate assistance, please contact:\n\n📞 WhatsApp: +62 812-3456-7890\n📧 Email: support@urbanstyleid.com\n\nThank you for your understanding. 🙏',
      thinking: 'System is experiencing critical issues, providing emergency contact',
      user_mood: 'neutral' as const,
      suggested_questions: [],
      debug: { context_used: false },
      redirect_to_agent: {
        should_redirect: true,
        reason: 'System error - emergency fallback',
      },
    },
  };

  return responses[language];
}
