/**
 * Error Monitoring Service
 * Sends critical errors to webhook (Discord/Slack) for immediate alerts
 *
 * Setup:
 * 1. Create Discord webhook: Server Settings → Integrations → Webhooks
 * 2. Add DISCORD_WEBHOOK_URL to .env.local
 * 3. Errors will be sent to your Discord channel automatically
 *
 * Alternative: Use Slack webhook URL for Slack notifications
 */

import { logger } from './logger';

interface ErrorContext {
  userId?: string;
  clinicId?: string;
  endpoint?: string;
  [key: string]: unknown;
}

interface ErrorAlert {
  message: string;
  error: Error | unknown;
  context?: ErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class ErrorMonitor {
  private webhookUrl: string | undefined;
  private enabled: boolean;
  private errorCount = 0;
  private lastErrorTime = 0;
  private rateLimitMs = 60000; // 1 minute between similar errors

  constructor() {
    this.webhookUrl = process.env.DISCORD_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL;
    this.enabled = !!this.webhookUrl && process.env.NODE_ENV === 'production';

    if (!this.enabled && process.env.NODE_ENV === 'production') {
      logger.warn('Error monitoring disabled - no webhook URL configured');
    }
  }

  /**
   * Send error alert to webhook
   */
  async alert(alert: ErrorAlert): Promise<void> {
    try {
      // Log locally first
      logger.error(alert.message, alert.error, alert.context);

      // Don't send to webhook if disabled or rate limited
      if (!this.enabled) {
        return;
      }

      const now = Date.now();
      if (now - this.lastErrorTime < this.rateLimitMs) {
        // Rate limit: Don't spam webhook
        return;
      }

      this.lastErrorTime = now;
      this.errorCount++;

      // Format error message
      const errorMessage = this.formatError(alert);

      // Send to webhook
      await this.sendToWebhook(errorMessage, alert.severity);
    } catch (webhookError) {
      // Don't let monitoring errors crash the app
      logger.error('Failed to send error alert to webhook', webhookError);
    }
  }

  /**
   * Format error for webhook display
   */
  private formatError(alert: ErrorAlert): string {
    const errorStack = alert.error instanceof Error ? alert.error.stack : String(alert.error);
    const contextStr = alert.context ? JSON.stringify(alert.context, null, 2) : 'No context';

    return `**${alert.severity.toUpperCase()} ERROR**

**Message:** ${alert.message}

**Error:**
\`\`\`
${errorStack?.slice(0, 1000) || 'No stack trace'}
\`\`\`

**Context:**
\`\`\`json
${contextStr.slice(0, 500)}
\`\`\`

**Error Count:** ${this.errorCount}
**Time:** ${new Date().toISOString()}`;
  }

  /**
   * Send to Discord/Slack webhook
   */
  private async sendToWebhook(message: string, severity: ErrorAlert['severity']): Promise<void> {
    if (!this.webhookUrl) return;

    // Discord webhook format
    const discordPayload = {
      content: message.slice(0, 2000), // Discord has 2000 char limit
      embeds: [
        {
          title: `🚨 ${severity.toUpperCase()} Error Alert`,
          description: message.slice(0, 4000),
          color: this.getSeverityColor(severity),
          timestamp: new Date().toISOString(),
        },
      ],
    };

    // Slack webhook format (compatible with Discord)
    const slackPayload = {
      text: message.slice(0, 3000),
    };

    // Try Discord format first, fallback to Slack
    const payload = this.webhookUrl.includes('discord.com')
      ? discordPayload
      : slackPayload;

    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Get color for Discord embed based on severity
   */
  private getSeverityColor(severity: ErrorAlert['severity']): number {
    const colors = {
      low: 0x3498db, // Blue
      medium: 0xf39c12, // Orange
      high: 0xe67e22, // Dark orange
      critical: 0xe74c3c, // Red
    };
    return colors[severity];
  }

  /**
   * Track API errors
   */
  async apiError(endpoint: string, error: Error, context?: ErrorContext): Promise<void> {
    await this.alert({
      message: `API Error: ${endpoint}`,
      error,
      context: { ...context, endpoint },
      severity: 'high',
    });
  }

  /**
   * Track database errors
   */
  async dbError(operation: string, error: Error, context?: ErrorContext): Promise<void> {
    await this.alert({
      message: `Database Error: ${operation}`,
      error,
      context: { ...context, operation },
      severity: 'critical', // DB errors are critical
    });
  }

  /**
   * Track RAG/AI errors
   */
  async ragError(error: Error, context?: ErrorContext): Promise<void> {
    await this.alert({
      message: 'RAG/AI Service Error',
      error,
      context,
      severity: 'medium', // RAG errors can be recovered with fallback
    });
  }

  /**
   * Track security issues
   */
  async securityAlert(message: string, context?: ErrorContext): Promise<void> {
    await this.alert({
      message: `🔒 Security Alert: ${message}`,
      error: new Error(message),
      context,
      severity: 'critical',
    });
  }

  /**
   * Health check - test webhook
   */
  async testWebhook(): Promise<boolean> {
    try {
      if (!this.webhookUrl) {
        logger.warn('No webhook URL configured');
        return false;
      }

      await this.sendToWebhook(
        '✅ Error monitoring webhook test successful!',
        'low'
      );

      logger.info('Webhook test successful');
      return true;
    } catch (error) {
      logger.error('Webhook test failed', error);
      return false;
    }
  }
}

// Export singleton instance
export const errorMonitor = new ErrorMonitor();

// Export types
export type { ErrorContext, ErrorAlert };
