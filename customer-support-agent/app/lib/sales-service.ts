/**
 * Sales Service
 * Handles sales closing automation: upselling, cross-selling, promo generation,
 * objection handling, and sales funnel tracking
 */

import { prisma } from "@/app/lib/db-service";
import { SALES_CONFIG } from "./sales-config";

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface SalesOpportunity {
  opportunityType: "upsell" | "cross_sell" | "bundle" | "premium_upgrade";
  recommendedServices: string[];
  intentScore: number; // 0-100
  customerSegment:
    | "budget_conscious"
    | "quality_seeker"
    | "results_driven"
    | "first_timer";
  suggestedAction: string;
}

export interface UpsellRecommendation {
  serviceId: string;
  serviceName: string;
  reason: string; // Why this is recommended
  benefit: string; // Customer benefit
  price: number;
  savingsIfBundle: number; // If bought together
  urgency: string; // Limited slots, seasonal, trending
}

export interface PromoOffer {
  promoCode: string;
  promoType: string;
  description: string;
  discountPercent?: number;
  discountAmount?: number;
  applicableServices: string[];
  expiresAt: Date;
  termsAndConditions: string[];
  urgencyMessage: string;
}

export interface ObjectionResponse {
  objectionType: string;
  responseStrategy: string;
  talkingPoints: string[];
  alternativeSolutions: string[];
  socialProof?: string;
}

export interface DiscountValidation {
  valid: boolean;
  discountCode: string;
  discountPercent?: number;
  discountAmount?: number;
  finalPrice: number;
  originalPrice: number;
  errorMessage?: string;
}

// ============================================
// UPSELL MAPPING MATRIX
// ============================================

const UPSELL_MATRIX: Record<
  string,
  {
    upgrade?: string[];
    complement?: string[];
    bundle?: { services: string[]; discount: number };
  }
> = {
  "facial-basic-glow": {
    upgrade: ["facial-premium-hydrating", "facial-glow-brightening"],
    complement: ["chemical-peeling-light", "skin-booster"],
    bundle: {
      services: ["facial-basic-glow", "chemical-peeling-light"],
      discount: 15,
    },
  },
  "facial-premium-hydrating": {
    upgrade: ["facial-signature-gold"],
    complement: ["skin-booster", "microneedling-rf"],
    bundle: {
      services: ["facial-premium-hydrating", "skin-booster"],
      discount: 18,
    },
  },
  "facial-acne-solution": {
    upgrade: ["laser-toning", "chemical-peeling-medium"],
    complement: ["skin-booster"],
    bundle: { services: ["facial-acne-solution", "laser-toning"], discount: 18 },
  },
  "facial-glow-brightening": {
    upgrade: ["facial-signature-gold", "hifu-facial-lifting"],
    complement: ["chemical-peeling-medium", "laser-toning"],
    bundle: {
      services: ["facial-glow-brightening", "chemical-peeling-medium"],
      discount: 20,
    },
  },
  "facial-signature-gold": {
    complement: ["botox-forehead", "filler-hyaluronic-acid"],
    bundle: {
      services: ["facial-signature-gold", "botox-forehead"],
      discount: 20,
    },
  },
  "laser-co2-fractional": {
    complement: ["skin-booster", "filler-hyaluronic-acid"],
    bundle: {
      services: ["laser-co2-fractional", "skin-booster"],
      discount: 25,
    },
  },
  "laser-toning": {
    upgrade: ["ipl-photofacial", "laser-co2-fractional"],
    complement: ["chemical-peeling-medium", "microneedling-rf"],
    bundle: { services: ["laser-toning", "chemical-peeling-medium"], discount: 20 },
  },
  "ipl-photofacial": {
    complement: ["laser-toning", "microneedling-rf"],
    bundle: { services: ["ipl-photofacial", "laser-toning"], discount: 22 },
  },
  "microneedling-rf": {
    complement: ["skin-booster", "chemical-peeling-medium"],
    bundle: { services: ["microneedling-rf", "skin-booster"], discount: 20 },
  },
  "filler-hyaluronic-acid": {
    complement: ["botox-forehead", "facial-signature-gold"],
    bundle: {
      services: ["filler-hyaluronic-acid", "botox-forehead"],
      discount: 15,
    },
  },
  "botox-forehead": {
    complement: ["filler-hyaluronic-acid", "skin-booster"],
    bundle: { services: ["botox-forehead", "skin-booster"], discount: 18 },
  },
  "skin-booster": {
    complement: ["facial-premium-hydrating", "laser-co2-fractional"],
    bundle: {
      services: ["skin-booster", "facial-premium-hydrating"],
      discount: 20,
    },
  },
  "chemical-peeling-light": {
    upgrade: ["chemical-peeling-medium"],
    complement: ["facial-basic-glow", "laser-toning"],
    bundle: {
      services: ["chemical-peeling-light", "facial-basic-glow"],
      discount: 15,
    },
  },
  "chemical-peeling-medium": {
    upgrade: ["laser-co2-fractional"],
    complement: ["laser-toning", "microneedling-rf"],
    bundle: {
      services: ["chemical-peeling-medium", "laser-toning"],
      discount: 20,
    },
  },
  "hifu-facial-lifting": {
    complement: ["botox-forehead", "filler-hyaluronic-acid"],
    bundle: {
      services: ["hifu-facial-lifting", "botox-forehead"],
      discount: 22,
    },
  },
};

// ============================================
// OBJECTION RESPONSES PLAYBOOK
// ============================================

const OBJECTION_RESPONSES: Record<string, ObjectionResponse> = {
  price_too_high: {
    objectionType: "price_too_high",
    responseStrategy: "Value justification + payment options",
    talkingPoints: [
      "Investasi untuk kesehatan kulit jangka panjang, bukan biaya sesaat",
      "Menggunakan produk & teknologi premium imported dari Korea dan USA",
      "Treatment dikerjakan oleh therapist bersertifikat dengan pengalaman 5+ tahun",
      "Termasuk konsultasi gratis dengan dokter Sp.KK (senilai Rp 200.000)",
      "Follow-up consultation gratis 7 hari setelah treatment",
    ],
    alternativeSolutions: [
      "Paket bundling: hemat 15-20% untuk kombinasi treatment",
      "Cicilan 0% hingga 3 bulan via kartu kredit BCA, Mandiri, BNI",
      "Program loyalty: treatment ke-5 GRATIS",
      "Mulai dengan treatment basic dulu, upgrade nanti setelah lihat hasil",
    ],
    socialProof: "Sudah dipercaya 15,000+ customers di Jakarta dengan 4.9/5 rating",
  },

  need_time_to_think: {
    objectionType: "need_time_to_think",
    responseStrategy: "Create urgency + risk reversal",
    talkingPoints: [
      "Slot untuk minggu ini tinggal 30% - weekend biasanya fully booked",
      "Promo spesial ini berakhir dalam 24 jam",
      "Free skin consultation senilai Rp 200.000 kalau booking hari ini",
      "Reschedule gratis tanpa biaya tambahan hingga 24 jam sebelum treatment",
    ],
    alternativeSolutions: [
      "Booking sekarang, bayar H-1 (tidak perlu bayar dulu)",
      "Reschedule gratis kapanpun sebelum H-1",
      "Hold slot dengan DP Rp 100.000 yang bisa refund 100%",
      "Money-back guarantee jika tidak puas dengan hasilnya",
    ],
    socialProof:
      '95% customer kami bilang: "Enaknya langsung booking, ga perlu mikir lama!"',
  },

  fear_of_pain: {
    objectionType: "fear_of_pain",
    responseStrategy: "Address concerns + education",
    talkingPoints: [
      "Treatment menggunakan teknik minimal invasive - nyamannya seperti facial biasa",
      "Numbing cream premium untuk kenyamanan maksimal (kalau perlu)",
      "Skala nyeri rata-rata cuma 2-3 dari 10 menurut 500+ customer",
      "Dokter Sp.KK standby untuk monitor seluruh prosedur",
      "Bisa stop anytime jika merasa tidak nyaman",
    ],
    alternativeSolutions: [
      "Mulai dengan facial basic yang paling gentle dulu",
      "Free test patch di area kecil untuk cek sensitivitas kulit",
      "Konsultasi gratis dengan dokter untuk pilih treatment sesuai tolerance",
      "Setting treatment intensity bisa disesuaikan dengan kenyamanan Anda",
    ],
    socialProof:
      '95% customer kami bilang: "Ternyata tidak seseram yang dibayangkan!"',
  },

  not_sure_suitable: {
    objectionType: "not_sure_suitable",
    responseStrategy: "Expert guidance + skin analysis",
    talkingPoints: [
      "Treatment kami customized sesuai jenis kulit dan kebutuhan Anda",
      "Free skin analysis menggunakan alat canggih sebelum treatment",
      "Dokter Sp.KK akan recommend treatment yang paling cocok",
      "Bisa diskusi detail kondisi kulit saat konsultasi gratis",
    ],
    alternativeSolutions: [
      "Booking konsultasi gratis dulu dengan dokter (tanpa treatment)",
      "Skin analysis gratis untuk tahu treatment yang tepat",
      "Lihat portfolio before-after customer dengan kondisi kulit serupa",
      "Trial mini-treatment dengan harga spesial untuk test hasilnya",
    ],
    socialProof:
      "98% customer puas dengan hasil treatment setelah konsultasi dengan dokter kami",
  },

  comparing_competitors: {
    objectionType: "comparing_competitors",
    responseStrategy: "Differentiation + value proposition",
    talkingPoints: [
      "Kami fokus pada HASIL, bukan cuma harga murah",
      "Produk yang kami pakai: medical-grade imported (bukan lokal/KW)",
      "Semua treatment supervised by dokter Sp.KK (bukan cuma beautician)",
      "Garansi kepuasan: money-back jika tidak ada perubahan setelah 3x treatment",
      "After-sales support 24/7 via WhatsApp - bukan cuma jual putus",
    ],
    alternativeSolutions: [
      "Bandingkan kualitas produk yang dipakai (kami transparansi 100%)",
      "Cek review dan rating kami: 4.9/5 dari 3,000+ reviews",
      "Lihat sertifikasi dokter dan klinik kami (semua legal & tersertifikasi)",
      "Price match guarantee: kalau ada yang lebih murah dengan kualitas sama, kami match!",
    ],
    socialProof:
      "85% customer kami datang dari referral satisfied customers - bukan dari iklan",
  },

  budget_constraint: {
    objectionType: "budget_constraint",
    responseStrategy: "Affordable options + flexible payment",
    talkingPoints: [
      "Kami punya treatment mulai dari Rp 250.000 untuk hasil maksimal",
      "Investasi kecil sekarang = save besar untuk jangka panjang",
      "Lebih murah daripada beli skincare mahal yang belum tentu cocok",
      "1x treatment kami = efek 3 bulan skincare rutin",
    ],
    alternativeSolutions: [
      "Mulai dengan Facial Basic (Rp 250k) - affordable dan efektif",
      "Paket bundling: hemat 15-20% untuk 3x atau 5x treatment",
      "Cicilan 0% hingga 3 bulan tanpa bunga",
      "Program installment: bayar 50% dulu, sisanya bulan depan",
    ],
    socialProof:
      "80% customer kami adalah kalangan menengah - treatment premium tidak harus mahal!",
  },
};

// ============================================
// SALES OPPORTUNITY DETECTION
// ============================================

export async function detectSalesOpportunity(
  conversationContext: string,
  conversationId: string
): Promise<SalesOpportunity> {
  console.log("🔍 Detecting sales opportunity...");

  // Keyword analysis for customer intent
  const lowerContext = conversationContext.toLowerCase();

  let intentScore = 0;
  let customerSegment: SalesOpportunity["customerSegment"] = "first_timer";
  let opportunityType: SalesOpportunity["opportunityType"] = "upsell";

  // Budget-conscious signals
  if (
    lowerContext.includes("murah") ||
    lowerContext.includes("mahal") ||
    lowerContext.includes("budget") ||
    lowerContext.includes("hemat") ||
    lowerContext.includes("diskon")
  ) {
    customerSegment = "budget_conscious";
    intentScore += 15;
  }

  // Quality-seeker signals
  if (
    lowerContext.includes("premium") ||
    lowerContext.includes("terbaik") ||
    lowerContext.includes("bagus") ||
    lowerContext.includes("kualitas") ||
    lowerContext.includes("recommended")
  ) {
    customerSegment = "quality_seeker";
    intentScore += 25;
    opportunityType = "premium_upgrade";
  }

  // Results-driven signals
  if (
    lowerContext.includes("hasil") ||
    lowerContext.includes("cepat") ||
    lowerContext.includes("efektif") ||
    lowerContext.includes("manjur") ||
    lowerContext.includes("ampuh")
  ) {
    customerSegment = "results_driven";
    intentScore += 20;
  }

  // Interest signals
  if (
    lowerContext.includes("tertarik") ||
    lowerContext.includes("mau") ||
    lowerContext.includes("pengen") ||
    lowerContext.includes("booking")
  ) {
    intentScore += 30;
  }

  // Objection/hesitation signals (reduce score)
  if (
    lowerContext.includes("mikir dulu") ||
    lowerContext.includes("nanti") ||
    lowerContext.includes("belum yakin")
  ) {
    intentScore -= 15;
  }

  // Service comparison signals
  if (
    lowerContext.includes("atau") ||
    lowerContext.includes("banding") ||
    lowerContext.includes("vs")
  ) {
    opportunityType = "cross_sell";
  }

  // Ensure score is between 0-100
  intentScore = Math.max(0, Math.min(100, intentScore + 30)); // Base score 30

  const suggestedAction =
    intentScore >= 60
      ? "Strong buying intent - present promo and create urgency"
      : intentScore >= 40
        ? "Consideration stage - recommend upsells with benefits"
        : "Early interest - educate and build value";

  console.log(`✅ Opportunity detected: ${opportunityType}, Intent: ${intentScore}`);

  return {
    opportunityType,
    recommendedServices: [], // Will be filled by getUpsellRecommendations
    intentScore,
    customerSegment,
    suggestedAction,
  };
}

// ============================================
// UPSELL RECOMMENDATION ENGINE
// ============================================

export async function getUpsellRecommendations(
  serviceId: string,
  customerIntent:
    | "budget_conscious"
    | "quality_seeker"
    | "results_driven"
    | "first_timer",
  maxRecommendations: number = 3
): Promise<UpsellRecommendation[]> {
  console.log(`🎯 Getting upsell recommendations for ${serviceId}...`);

  const serviceMapping = UPSELL_MATRIX[serviceId];
  if (!serviceMapping) {
    console.log("⚠️ No upsell mapping found for this service");
    return [];
  }

  const recommendations: UpsellRecommendation[] = [];

  // Get service details from database
  try {
    const originalService = await prisma.service.findFirst({
      where: { id: serviceId },
    });

    if (!originalService) {
      console.log("⚠️ Service not found in database");
      return [];
    }

    // Strategy by customer intent
    let servicesToRecommend: string[] = [];

    switch (customerIntent) {
      case "budget_conscious":
        // Recommend complementary services (cheaper additions)
        servicesToRecommend = serviceMapping.complement || [];
        break;

      case "quality_seeker":
        // Recommend premium upgrades
        servicesToRecommend = serviceMapping.upgrade || [];
        if (serviceMapping.complement) {
          servicesToRecommend.push(...serviceMapping.complement.slice(0, 1));
        }
        break;

      case "results_driven":
        // Recommend both upgrades and high-impact complements
        servicesToRecommend = [
          ...(serviceMapping.upgrade || []),
          ...(serviceMapping.complement || []),
        ];
        break;

      case "first_timer":
        // Recommend safe, popular bundles
        if (serviceMapping.bundle) {
          servicesToRecommend = serviceMapping.bundle.services.filter(
            (s) => s !== serviceId
          );
        }
        servicesToRecommend.push(...(serviceMapping.complement?.slice(0, 2) || []));
        break;
    }

    // Fetch service details for recommendations
    const services = await prisma.service.findMany({
      where: { id: { in: servicesToRecommend }, isActive: true },
    });

    for (const service of services.slice(0, maxRecommendations)) {
      const bundleDiscount = serviceMapping.bundle?.discount || 0;
      const savings = bundleDiscount
        ? Math.floor(((originalService.price + service.price) * bundleDiscount) / 100)
        : 0;

      let reason = "";
      let benefit = "";
      let urgency = "";

      // Customize messaging by intent
      if (customerIntent === "budget_conscious") {
        reason = `Paket hemat ${bundleDiscount}% - kombinasi perfect untuk hasil maksimal`;
        benefit = `Hemat Rp ${(savings / 1000).toFixed(0)}k jika bundling`;
        urgency = "Promo bundling terbatas minggu ini";
      } else if (customerIntent === "quality_seeker") {
        reason = "Upgrade ke premium untuk hasil lebih cepat dan tahan lama";
        benefit = "Teknologi terbaru dengan hasil terbaik di kelasnya";
        urgency = "Treatment premium ini waitlist 2 minggu - booking sekarang";
      } else if (customerIntent === "results_driven") {
        reason = "Kombinasi treatment untuk hasil maksimal dalam waktu singkat";
        benefit = "Efektivitas meningkat 70% dengan kombinasi treatment ini";
        urgency = "85% customer kami pilih kombinasi ini";
      } else {
        reason = "Paling populer di kalangan first-timers";
        benefit = "Hasil terlihat setelah 1x treatment";
        urgency = "Recommended by our doctors";
      }

      recommendations.push({
        serviceId: service.id,
        serviceName: service.name,
        reason,
        benefit,
        price: service.price,
        savingsIfBundle: savings,
        urgency,
      });
    }

    console.log(`✅ Generated ${recommendations.length} recommendations`);
    return recommendations;
  } catch (error) {
    console.error("❌ Error generating upsell recommendations:", error);
    return [];
  }
}

// ============================================
// PROMO GENERATION
// ============================================

export async function generatePromoOffer(
  serviceIds: string[],
  promoType:
    | "percentage_discount"
    | "bundle_package"
    | "first_timer_special"
    | "limited_time",
  urgencyLevel: "low" | "medium" | "high"
): Promise<PromoOffer> {
  console.log(`💰 Generating ${promoType} promo with ${urgencyLevel} urgency...`);

  // Get discount percentage based on urgency (MAX 20%)
  const discountConfig = SALES_CONFIG.promoDiscountRanges[urgencyLevel];
  const discountPercent =
    Math.floor(
      Math.random() * (discountConfig.max - discountConfig.min + 1) + discountConfig.min
    );

  // Generate unique promo code
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  const promoCode = `GLOW${discountPercent}${random}`.substring(
    0,
    SALES_CONFIG.promoCodeLength
  );

  // Calculate expiry date
  const validityHours = SALES_CONFIG.promoValidityHours[urgencyLevel];
  const expiresAt = new Date(Date.now() + validityHours * 60 * 60 * 1000);

  // Build promo description
  let description = "";
  let urgencyMessage = "";
  let termsAndConditions: string[] = [];

  switch (promoType) {
    case "percentage_discount":
      description = `Diskon ${discountPercent}% untuk semua treatment`;
      urgencyMessage =
        urgencyLevel === "high"
          ? "⚡ FLASH SALE - Berlaku 24 jam saja!"
          : urgencyLevel === "medium"
            ? "⏰ Promo terbatas - Berlaku 3 hari!"
            : "🎉 Promo spesial minggu ini!";
      termsAndConditions = [
        `Minimal pembelian Rp ${(SALES_CONFIG.minBookingAmountForPromo / 1000).toFixed(0)}k`,
        `Berlaku hingga ${expiresAt.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`,
        "Tidak dapat digabung dengan promo lain",
        "Satu kode promo per customer",
      ];
      break;

    case "bundle_package":
      description = `Paket bundling hemat ${discountPercent}% - Kombinasi treatment untuk hasil maksimal`;
      urgencyMessage = "🎁 Bundle exclusive untuk Anda!";
      termsAndConditions = [
        "Berlaku untuk minimal 2 treatment sekaligus",
        `Berlaku hingga ${expiresAt.toLocaleDateString("id-ID")}`,
        "Booking harus dilakukan dalam 1 appointment",
      ];
      break;

    case "first_timer_special":
      description = `Welcome bonus ${discountPercent}% untuk customer baru!`;
      urgencyMessage = "🎊 Special untuk first-time customer!";
      termsAndConditions = [
        "Khusus customer baru (belum pernah treatment)",
        "Berlaku untuk semua jenis treatment",
        `Valid hingga ${expiresAt.toLocaleDateString("id-ID")}`,
        "Satu kali penggunaan per customer",
      ];
      break;

    case "limited_time":
      description = `Limited time offer - Diskon ${discountPercent}%!`;
      urgencyMessage =
        urgencyLevel === "high"
          ? "⚡ HANYA 24 JAM - Jangan sampai kehabisan!"
          : "⏰ Promo terbatas - Buruan booking!";
      termsAndConditions = [
        `Berlaku HANYA hingga ${expiresAt.toLocaleDateString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`,
        "Slot terbatas - first come first served",
        `Min. booking Rp ${(SALES_CONFIG.minBookingAmountForPromo / 1000).toFixed(0)}k`,
      ];
      break;
  }

  // Save promo code to database
  try {
    await prisma.promoCode.create({
      data: {
        code: promoCode,
        type: promoType.toUpperCase() as any,
        discountValue: discountPercent,
        applicableServices: serviceIds,
        minPurchaseAmount: SALES_CONFIG.minBookingAmountForPromo,
        maxUsageCount: urgencyLevel === "high" ? 1 : 10, // High urgency = single use
        validUntil: expiresAt,
        isActive: true,
        // Note: createdAt is auto-set by schema default
      },
    });

    console.log(`✅ Promo code created: ${promoCode} (${discountPercent}%)`);
  } catch (error) {
    console.error("❌ Failed to save promo code:", error);
  }

  return {
    promoCode,
    promoType,
    description,
    discountPercent,
    applicableServices: serviceIds,
    expiresAt,
    termsAndConditions,
    urgencyMessage,
  };
}

// ============================================
// OBJECTION HANDLING
// ============================================

export async function handleObjection(
  objectionType:
    | "price_too_high"
    | "need_time_to_think"
    | "fear_of_pain"
    | "not_sure_suitable"
    | "comparing_competitors"
    | "budget_constraint",
  serviceId?: string
): Promise<ObjectionResponse> {
  console.log(`🛡️ Handling objection: ${objectionType}`);

  const response = OBJECTION_RESPONSES[objectionType];

  if (!response) {
    console.log("⚠️ No playbook found for this objection");
    return {
      objectionType,
      responseStrategy: "General reassurance",
      talkingPoints: [
        "Saya mengerti kekhawatiran Anda",
        "Banyak customer kami juga punya concern yang sama di awal",
        "Mari kita diskusikan lebih detail untuk find solusi terbaik",
      ],
      alternativeSolutions: [
        "Konsultasi gratis dengan dokter untuk address concerns",
        "Lihat review dan testimoni customer lain",
      ],
      socialProof: "Dipercaya oleh 15,000+ satisfied customers",
    };
  }

  return response;
}

// ============================================
// SALES FUNNEL TRACKING
// ============================================

export async function updateSalesFunnel(
  conversationId: string,
  stage: "AWARENESS" | "INTEREST" | "CONSIDERATION" | "INTENT" | "BOOKING" | "PAYMENT" | "COMPLETED",
  intentScore: number,
  serviceInterest: string[]
): Promise<void> {
  console.log(`📊 Updating sales funnel: ${conversationId} → ${stage} (${intentScore})`);

  try {
    // Get previous stage and intent score from conversation metadata
    const existingMetadata = await prisma.conversationMetadata.findUnique({
      where: { conversationId },
      select: { salesStage: true, intentScore: true },
    });

    const fromStage = (existingMetadata?.salesStage || "AWARENESS") as any;
    const intentScoreBefore = existingMetadata?.intentScore || 0;

    // Create funnel log entry to track the transition
    await prisma.salesFunnelLog.create({
      data: {
        conversationId,
        fromStage,
        toStage: stage as any,
        intentScoreBefore,
        intentScoreAfter: intentScore,
        triggerAction: `stage_update`,
        notes: `Services: ${serviceInterest.join(", ")}`,
      },
    });

    // Update conversation metadata
    await prisma.conversationMetadata.upsert({
      where: { conversationId },
      create: {
        conversationId,
        salesStage: stage,
        intentScore,
        servicesInterested: serviceInterest,
      },
      update: {
        salesStage: stage,
        intentScore,
        servicesInterested: serviceInterest,
        conversionProbability: intentScore / 100,
      },
    });

    console.log("✅ Funnel updated successfully");
  } catch (error) {
    console.error("❌ Failed to update funnel:", error);
  }
}

// ============================================
// DISCOUNT CODE VALIDATION
// ============================================

export async function applyDiscountCode(
  discountCode: string,
  serviceIds: string[],
  bookingDate: string
): Promise<DiscountValidation> {
  console.log(`🎫 Validating promo code: ${discountCode}`);

  try {
    // Find promo code
    const promo = await prisma.promoCode.findUnique({
      where: { code: discountCode },
    });

    if (!promo) {
      return {
        valid: false,
        discountCode,
        finalPrice: 0,
        originalPrice: 0,
        errorMessage: "Kode promo tidak ditemukan",
      };
    }

    // Check if active
    if (!promo.isActive) {
      return {
        valid: false,
        discountCode,
        finalPrice: 0,
        originalPrice: 0,
        errorMessage: "Kode promo sudah tidak aktif",
      };
    }

    // Check expiry (schema only has validUntil, no validFrom)
    const now = new Date();
    if (promo.validUntil && now > promo.validUntil) {
      return {
        valid: false,
        discountCode,
        finalPrice: 0,
        originalPrice: 0,
        errorMessage: `Kode promo sudah expired (berlaku sampai ${promo.validUntil.toLocaleDateString("id-ID")})`,
      };
    }

    // Check usage limit (schema uses usageCount, not currentUsageCount)
    if (promo.maxUsageCount && promo.usageCount >= promo.maxUsageCount) {
      return {
        valid: false,
        discountCode,
        finalPrice: 0,
        originalPrice: 0,
        errorMessage: "Kode promo sudah mencapai batas penggunaan",
      };
    }

    // Check applicable services
    if (
      promo.applicableServices.length > 0 &&
      !serviceIds.some((id) => promo.applicableServices.includes(id))
    ) {
      return {
        valid: false,
        discountCode,
        finalPrice: 0,
        originalPrice: 0,
        errorMessage: "Kode promo tidak berlaku untuk service yang dipilih",
      };
    }

    // Calculate prices
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds } },
    });

    const originalPrice = services.reduce((sum, service) => sum + service.price, 0);

    // Check minimum purchase
    if (promo.minPurchaseAmount && originalPrice < promo.minPurchaseAmount) {
      return {
        valid: false,
        discountCode,
        finalPrice: originalPrice,
        originalPrice,
        errorMessage: `Minimal pembelian Rp ${(promo.minPurchaseAmount / 1000).toFixed(0)}k untuk menggunakan kode promo ini`,
      };
    }

    // Schema uses discountValue for percentage value
    let discountAmount = 0;
    if (promo.discountValue) {
      discountAmount = Math.floor((originalPrice * promo.discountValue) / 100);
    }

    const finalPrice = originalPrice - discountAmount;

    console.log(
      `✅ Promo valid: ${promo.discountValue || 0}% off, save Rp ${discountAmount}`
    );

    return {
      valid: true,
      discountCode,
      discountPercent: promo.discountValue || undefined,
      discountAmount,
      finalPrice,
      originalPrice,
    };
  } catch (error) {
    console.error("❌ Error validating promo code:", error);
    return {
      valid: false,
      discountCode,
      finalPrice: 0,
      originalPrice: 0,
      errorMessage: "Terjadi error saat memvalidasi kode promo",
    };
  }
}

// ============================================
// CONVERSION TRACKING
// ============================================

export async function trackConversionToBooking(
  conversationId: string,
  bookingId: string,
  revenue: number
): Promise<void> {
  console.log(`💰 Tracking conversion: ${conversationId} → ${bookingId}`);

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { startedAt: true },
    });

    if (!conversation) {
      console.log("⚠️ Conversation not found");
      return;
    }

    // Calculate conversion duration in seconds for logging
    const conversionDurationSeconds = Math.floor(
      (Date.now() - conversation.startedAt.getTime()) / 1000
    );

    // Schema expects DateTime for conversionTime, so use current time
    const conversionTimeDate = new Date();

    await prisma.conversationMetadata.upsert({
      where: { conversationId },
      create: {
        conversationId,
        linkedBookingId: bookingId,
        convertedToBooking: true,
        conversionRevenue: revenue,
        conversionTime: conversionTimeDate,
      },
      update: {
        linkedBookingId: bookingId,
        convertedToBooking: true,
        conversionRevenue: revenue,
        conversionTime: conversionTimeDate,
      },
    });

    console.log(
      `✅ Conversion tracked: Rp ${revenue} in ${conversionDurationSeconds}s (${(conversionDurationSeconds / 60).toFixed(1)} minutes)`
    );
  } catch (error) {
    console.error("❌ Failed to track conversion:", error);
  }
}
