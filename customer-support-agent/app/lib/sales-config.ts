/**
 * Sales Automation Configuration
 * Configure sales closing features, promo rules, and conversion goals
 */

export const SALES_CONFIG = {
  // ============================================
  // FEATURE FLAGS
  // ============================================
  enableSalesClosing: true,
  enableUpselling: true,
  enableAutoPromos: true,
  enableObjectionHandling: true,

  // ============================================
  // UPSELL SETTINGS
  // ============================================
  maxUpsellRecommendations: 3,
  upsellShowProbability: 0.8, // 80% chance to show upsells

  // ============================================
  // PROMO SETTINGS (MAX 20% as per requirement)
  // ============================================
  autoPromoTriggers: {
    considerationStage: true, // Auto offer promo at consideration stage
    budgetMention: true, // Auto offer when "mahal" mentioned
    exitIntent: true, // Last-ditch offer before leaving
  },

  // Discount ranges by urgency level (MAX 20%)
  promoDiscountRanges: {
    low: { min: 5, max: 10 }, // 5-10% off
    medium: { min: 10, max: 15 }, // 10-15% off
    high: { min: 15, max: 20 }, // 15-20% off (MAXIMUM)
  },

  // Promo validity periods
  promoValidityHours: {
    low: 168, // 7 days
    medium: 72, // 3 days
    high: 24, // 24 hours
  },

  // ============================================
  // FUNNEL TRACKING
  // ============================================
  intentScoreThresholds: {
    awareness: 0, // 0-19
    interest: 20, // 20-39
    consideration: 40, // 40-59
    intent: 60, // 60-79
    booking: 80, // 80-100
  },

  // ============================================
  // CONVERSION GOALS
  // ============================================
  targetConversionRate: 0.3, // 30% conversations → bookings
  targetAOV: 750000, // Rp 750k average order value
  targetUpsellRate: 0.4, // 40% accept upsells

  // ============================================
  // OBJECTION HANDLING
  // ============================================
  maxObjectionAttempts: 3, // Max times to address same objection
  objectionCooldownMinutes: 5, // Time before re-addressing objection

  // ============================================
  // SALES RESTRICTIONS
  // ============================================
  maxDiscountPercentage: 20, // HARD LIMIT: Cannot exceed 20%
  minBookingAmountForPromo: 200000, // Rp 200k minimum for promos
  promoCodeLength: 10, // Length of generated promo codes
};

// Type export for TypeScript support
export type SalesConfig = typeof SALES_CONFIG;
