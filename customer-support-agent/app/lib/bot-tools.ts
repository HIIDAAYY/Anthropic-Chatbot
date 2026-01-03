/**
 * Bot Tools
 * Functions that the bot can call to perform system actions
 * Uses Anthropic's native Tool Use API
 */

import Anthropic from "@anthropic-ai/sdk";

export interface BotAction {
  tool: string;
  input: Record<string, any>;
}

/**
 * Anthropic Tool Definitions for native tool use
 * These are passed to the Claude API to enable tool calling
 *
 * BOOKING SYSTEM TOOLS (Clinic & Travel Agency)
 */
export const BOT_TOOLS: Anthropic.Tool[] = [
  // ============================================
  // BOOKING SYSTEM TOOLS
  // ============================================
  {
    name: "check_availability",
    description:
      "Mengecek ketersediaan waktu untuk booking layanan (treatment/tour). Menampilkan slot waktu yang tersedia pada tanggal tertentu. Gunakan untuk pertanyaan seperti 'Apakah tersedia tanggal 25 Desember jam 10?' atau 'Jam berapa saja yang tersedia?'",
    input_schema: {
      type: "object",
      properties: {
        serviceId: {
          type: "string",
          description: "ID layanan yang ingin di-booking (contoh: 'facial-basic', 'bali-day-tour')",
        },
        date: {
          type: "string",
          description: "Tanggal yang ingin dicek dalam format YYYY-MM-DD (contoh: '2025-12-25')",
        },
        preferredTime: {
          type: "string",
          description: "Waktu yang diinginkan dalam format HH:MM (contoh: '10:00'). Opsional, jika tidak ada akan tampilkan semua slot tersedia.",
        },
      },
      required: ["serviceId", "date"],
    },
  },
  {
    name: "create_booking",
    description:
      "Membuat booking baru untuk layanan (treatment/tour). Hanya gunakan setelah mengecek availability terlebih dahulu dan customer sudah konfirmasi semua detailnya.",
    input_schema: {
      type: "object",
      properties: {
        businessId: {
          type: "string",
          description: "ID bisnis tempat booking dilakukan. MUST use the exact businessId provided in the system context (e.g., 'cmjnua0xe000axdh3ztv3cgfo'). DO NOT generate or create your own businessId.",
        },
        serviceId: {
          type: "string",
          description: "ID layanan yang ingin di-booking",
        },
        date: {
          type: "string",
          description: "Tanggal booking dalam format YYYY-MM-DD",
        },
        time: {
          type: "string",
          description: "Waktu booking dalam format HH:MM",
        },
        customerName: {
          type: "string",
          description: "Nama lengkap customer",
        },
        customerPhone: {
          type: "string",
          description: "Nomor telepon customer",
        },
        customerEmail: {
          type: "string",
          description: "Email customer (opsional)",
        },
        notes: {
          type: "string",
          description: "Catatan tambahan dari customer (opsional)",
        },
      },
      required: ["businessId", "serviceId", "date", "time", "customerName", "customerPhone"],
    },
  },
  {
    name: "get_booking_details",
    description:
      "Mendapatkan detail lengkap booking berdasarkan nomor booking. Gunakan untuk pertanyaan seperti 'Detail booking saya nomor BKG-2025-001?' atau 'Info lengkap booking saya?'",
    input_schema: {
      type: "object",
      properties: {
        bookingNumber: {
          type: "string",
          description: "Nomor booking (contoh: 'BKG-2025-001')",
        },
      },
      required: ["bookingNumber"],
    },
  },
  {
    name: "list_customer_bookings",
    description:
      "Menampilkan semua booking milik customer. Gunakan untuk pertanyaan seperti 'Apa saja booking saya?' atau 'Lihat riwayat booking saya'",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "reschedule_booking",
    description:
      "Mengubah jadwal booking yang sudah ada ke tanggal dan waktu baru. Hanya bisa untuk booking berstatus PENDING atau CONFIRMED. Harus cek availability dulu sebelum reschedule.",
    input_schema: {
      type: "object",
      properties: {
        bookingNumber: {
          type: "string",
          description: "Nomor booking yang ingin diubah",
        },
        newDate: {
          type: "string",
          description: "Tanggal baru dalam format YYYY-MM-DD",
        },
        newTime: {
          type: "string",
          description: "Waktu baru dalam format HH:MM",
        },
      },
      required: ["bookingNumber", "newDate", "newTime"],
    },
  },
  {
    name: "cancel_booking",
    description:
      "Membatalkan booking. Tidak bisa membatalkan booking yang sudah COMPLETED atau NO_SHOW. Customer akan mendapat konfirmasi pembatalan.",
    input_schema: {
      type: "object",
      properties: {
        bookingNumber: {
          type: "string",
          description: "Nomor booking yang ingin dibatalkan",
        },
        reason: {
          type: "string",
          description: "Alasan pembatalan (opsional)",
        },
      },
      required: ["bookingNumber"],
    },
  },
  {
    name: "list_services",
    description:
      "Menampilkan daftar layanan yang tersedia (treatment untuk klinik kecantikan, tour/package untuk travel agency). Gunakan untuk pertanyaan seperti 'Layanan apa saja yang tersedia?' atau 'Ada treatment apa?'",
    input_schema: {
      type: "object",
      properties: {
        businessId: {
          type: "string",
          description: "ID bisnis untuk filter layanan tertentu (opsional, jika tidak ada akan tampilkan semua)",
        },
        category: {
          type: "string",
          description: "Kategori layanan untuk filter (opsional, contoh: 'facial', 'laser', 'day_tour', 'package')",
        },
      },
      required: [],
    },
  },
  {
    name: "create_payment_link",
    description:
      "Membuat link pembayaran Midtrans untuk booking. Customer akan dapat link untuk membayar via VA, GoPay, QRIS, OVO, atau ShopeePay. Gunakan setelah booking berhasil dibuat.",
    input_schema: {
      type: "object",
      properties: {
        bookingNumber: {
          type: "string",
          description: "Nomor booking yang ingin dibayar",
        },
        paymentType: {
          type: "string",
          description: "Jenis pembayaran yang dipilih customer: 'BANK_TRANSFER', 'GOPAY', 'QRIS', 'OVO', 'SHOPEEPAY'",
        },
        bank: {
          type: "string",
          description: "Nama bank untuk VA (hanya untuk BANK_TRANSFER): 'bca', 'bni', 'bri', 'mandiri', 'permata'",
        },
      },
      required: ["bookingNumber", "paymentType"],
    },
  },
  {
    name: "check_payment_status",
    description:
      "Mengecek status pembayaran booking. Menampilkan apakah sudah dibayar, pending, atau expired. Gunakan untuk pertanyaan 'Apakah pembayaran saya sudah masuk?'",
    input_schema: {
      type: "object",
      properties: {
        bookingNumber: {
          type: "string",
          description: "Nomor booking yang ingin dicek pembayarannya",
        },
      },
      required: ["bookingNumber"],
    },
  },

  // ============================================
  // SALES AUTOMATION TOOLS
  // ============================================
  {
    name: "detect_sales_opportunity",
    description:
      "Analisa percakapan untuk deteksi peluang penjualan. Mengembalikan rekomendasi upsell/cross-sell dan scoring intent customer berdasarkan percakapan. Gunakan untuk memahami buying signals dari customer.",
    input_schema: {
      type: "object",
      properties: {
        conversationContext: {
          type: "string",
          description:
            "Ringkasan percakapan customer termasuk minat, budget hints, dan kekhawatiran mereka",
        },
      },
      required: ["conversationContext"],
    },
  },
  {
    name: "get_upsell_recommendations",
    description:
      "Dapatkan rekomendasi upsell/cross-sell berdasarkan service yang diminati customer. Mengembalikan daftar treatment tambahan yang relevan dengan benefit dan harga. Gunakan saat customer sudah menunjukkan interest pada service tertentu.",
    input_schema: {
      type: "object",
      properties: {
        serviceId: {
          type: "string",
          description:
            "ID service yang customer minati (contoh: 'facial-basic-glow', 'laser-toning')",
        },
        customerIntent: {
          type: "string",
          enum: ["budget_conscious", "quality_seeker", "results_driven", "first_timer"],
          description:
            "Kategori intent customer: budget_conscious (cari murah), quality_seeker (mau premium), results_driven (mau hasil cepat), first_timer (pertama kali)",
        },
        maxRecommendations: {
          type: "number",
          description: "Jumlah maksimal rekomendasi yang dikembalikan (default: 3)",
        },
      },
      required: ["serviceId", "customerIntent"],
    },
  },
  {
    name: "generate_promo_offer",
    description:
      "Generate penawaran promo otomatis untuk mendorong konversi. Bisa berupa diskon persentase, paket bundle, atau limited-time offer dengan kode promo unik. Gunakan saat customer ragu atau mention budget concerns. MAX 20% discount.",
    input_schema: {
      type: "object",
      properties: {
        serviceIds: {
          type: "array",
          items: { type: "string" },
          description: "Daftar service IDs yang akan dipromo",
        },
        promoType: {
          type: "string",
          enum: [
            "percentage_discount",
            "bundle_package",
            "first_timer_special",
            "limited_time",
          ],
          description:
            "Jenis promo: percentage_discount (diskon %), bundle_package (paket hemat), first_timer_special (new customer), limited_time (flash sale)",
        },
        urgencyLevel: {
          type: "string",
          enum: ["low", "medium", "high"],
          description:
            "Tingkat urgency: low (10%, 7 hari), medium (15%, 3 hari), high (20%, 24 jam)",
        },
      },
      required: ["serviceIds", "promoType", "urgencyLevel"],
    },
  },
  {
    name: "handle_objection",
    description:
      "Dapatkan response untuk menangani keberatan customer (harga mahal, takut sakit, belum yakin, dll). Mengembalikan strategi, talking points, dan solusi alternatif. Gunakan saat customer menunjukkan keraguan.",
    input_schema: {
      type: "object",
      properties: {
        objectionType: {
          type: "string",
          enum: [
            "price_too_high",
            "need_time_to_think",
            "fear_of_pain",
            "not_sure_suitable",
            "comparing_competitors",
            "budget_constraint",
          ],
          description:
            "Jenis keberatan: price_too_high (mahal), need_time_to_think (mikir dulu), fear_of_pain (takut sakit), not_sure_suitable (belum yakin cocok), comparing_competitors (banding kompetitor), budget_constraint (budget terbatas)",
        },
        serviceId: {
          type: "string",
          description: "Service yang sedang dibahas untuk konteks lebih spesifik (opsional)",
        },
      },
      required: ["objectionType"],
    },
  },
  {
    name: "update_sales_stage",
    description:
      "Update tahap sales funnel untuk conversation ini. Track progress customer dari awareness → interest → consideration → intent → booking. WAJIB panggil setiap turn untuk tracking konversi.",
    input_schema: {
      type: "object",
      properties: {
        stage: {
          type: "string",
          enum: [
            "AWARENESS",
            "INTEREST",
            "CONSIDERATION",
            "INTENT",
            "BOOKING",
            "PAYMENT",
            "COMPLETED",
          ],
          description:
            "Tahap funnel: AWARENESS (baru chat), INTEREST (tanya service), CONSIDERATION (bandingkan), INTENT (siap booking), BOOKING (sudah booking), PAYMENT (sudah bayar), COMPLETED (selesai)",
        },
        serviceInterest: {
          type: "array",
          items: { type: "string" },
          description: "Service IDs yang customer minati",
        },
        intentScore: {
          type: "number",
          description: "Score 0-100 seberapa likely customer akan booking",
        },
      },
      required: ["stage", "intentScore"],
    },
  },
  {
    name: "apply_discount_code",
    description:
      "Validasi dan aplikasikan kode promo/discount ke booking. Menghitung harga akhir setelah diskon. Gunakan saat customer memberikan atau menanyakan kode promo.",
    input_schema: {
      type: "object",
      properties: {
        discountCode: {
          type: "string",
          description: "Kode promo yang customer masukkan (contoh: 'GLOW20ABC')",
        },
        serviceIds: {
          type: "array",
          items: { type: "string" },
          description: "Service IDs yang akan di-booking",
        },
        bookingDate: {
          type: "string",
          description: "Tanggal booking untuk validasi periode promo (format: YYYY-MM-DD)",
        },
      },
      required: ["discountCode", "serviceIds"],
    },
  },
];

/**
 * Execute a bot action by calling the appropriate service function directly
 * This avoids HTTP fetch issues (405, network errors) within the same server
 *
 * BOOKING SYSTEM ONLY - E-commerce tools removed
 */
import {
  checkAvailability,
  createBooking,
  getBookingByNumber,
  listCustomerBookings,
  rescheduleBooking,
  cancelBooking as cancelBookingService,
} from "@/app/lib/booking-service";
import { listServices, getServiceById } from "@/app/lib/service-service";
import {
  createPaymentLink,
  checkBookingPaymentStatus,
} from "@/app/lib/midtrans-service";
import {
  detectSalesOpportunity,
  getUpsellRecommendations,
  generatePromoOffer,
  handleObjection,
  updateSalesFunnel,
  applyDiscountCode,
} from "@/app/lib/sales-service";

/**
 * Execute a bot action by calling the appropriate service function directly
 * This avoids HTTP fetch issues (405, network errors) within the same server
 */
export async function executeBotAction(action: BotAction): Promise<any> {
  const { tool, input } = action;
  const {
    customerId,
    // Booking-related parameters
    serviceId,
    date,
    preferredTime,
    businessId,
    time,
    customerName,
    customerPhone,
    customerEmail,
    notes,
    bookingNumber,
    newDate,
    newTime,
    reason,
    category,
    paymentType,
    bank,
  } = input;

  try {
    console.log(`🔧 Executing tool '${tool}' directly via service call`);

    switch (tool) {
      // ============================================
      // BOOKING SYSTEM TOOLS
      // ============================================
      case "check_availability":
        if (!serviceId || !date) {
          return { success: false, error: "serviceId dan date diperlukan" };
        }
        return await checkAvailability(serviceId, date, preferredTime);

      case "create_booking":
        console.log('🔍 create_booking called with params:', {
          customerId,
          businessId,
          serviceId,
          date,
          time,
          customerName,
          customerPhone,
        });
        if (!customerId || !businessId || !serviceId || !date || !time || !customerName || !customerPhone) {
          console.error('❌ Missing required parameters:', {
            hasCustomerId: !!customerId,
            hasBusinessId: !!businessId,
            hasServiceId: !!serviceId,
            hasDate: !!date,
            hasTime: !!time,
            hasCustomerName: !!customerName,
            hasCustomerPhone: !!customerPhone,
          });
          return {
            success: false,
            error: "customerId, businessId, serviceId, date, time, customerName, dan customerPhone diperlukan"
          };
        }
        return await createBooking({
          customerId,
          businessId,
          serviceId,
          date,
          time,
          customerName,
          customerPhone,
          customerEmail,
          notes,
        });

      case "get_booking_details":
        if (!customerId || !bookingNumber) {
          return { success: false, error: "customerId dan bookingNumber diperlukan" };
        }
        return await getBookingByNumber(customerId, bookingNumber);

      case "list_customer_bookings":
        if (!customerId) {
          return { success: false, error: "customerId diperlukan" };
        }
        return await listCustomerBookings(customerId);

      case "reschedule_booking":
        if (!customerId || !bookingNumber || !newDate || !newTime) {
          return { success: false, error: "customerId, bookingNumber, newDate, dan newTime diperlukan" };
        }
        return await rescheduleBooking(customerId, bookingNumber, newDate, newTime);

      case "cancel_booking":
        if (!customerId || !bookingNumber) {
          return { success: false, error: "customerId dan bookingNumber diperlukan" };
        }
        return await cancelBookingService(customerId, bookingNumber, reason);

      case "list_services":
        return await listServices({ businessId, category });

      case "create_payment_link":
        if (!bookingNumber || !paymentType) {
          return { success: false, error: "bookingNumber dan paymentType diperlukan" };
        }
        return await createPaymentLink(bookingNumber, paymentType, bank);

      case "check_payment_status":
        if (!customerId || !bookingNumber) {
          return { success: false, error: "customerId dan bookingNumber diperlukan" };
        }
        return await checkBookingPaymentStatus(customerId, bookingNumber);

      // ============================================
      // SALES AUTOMATION TOOLS
      // ============================================
      case "detect_sales_opportunity":
        if (!input.conversationContext) {
          return { success: false, error: "conversationContext diperlukan" };
        }
        return await detectSalesOpportunity(
          input.conversationContext,
          input.conversationId || ""
        );

      case "get_upsell_recommendations":
        if (!input.serviceId || !input.customerIntent) {
          return { success: false, error: "serviceId dan customerIntent diperlukan" };
        }
        return await getUpsellRecommendations(
          input.serviceId,
          input.customerIntent,
          input.maxRecommendations || 3
        );

      case "generate_promo_offer":
        if (!input.serviceIds || !input.promoType || !input.urgencyLevel) {
          return {
            success: false,
            error: "serviceIds, promoType, dan urgencyLevel diperlukan",
          };
        }
        return await generatePromoOffer(
          input.serviceIds,
          input.promoType,
          input.urgencyLevel
        );

      case "handle_objection":
        if (!input.objectionType) {
          return { success: false, error: "objectionType diperlukan" };
        }
        return await handleObjection(input.objectionType, input.serviceId);

      case "update_sales_stage":
        if (!input.stage || input.intentScore === undefined) {
          return { success: false, error: "stage dan intentScore diperlukan" };
        }
        if (!input.conversationId) {
          console.warn("⚠️ No conversationId for sales funnel update - skipping database log");
          return { success: true, warning: "Funnel update skipped - no conversationId" };
        }
        return await updateSalesFunnel(
          input.conversationId,
          input.stage,
          input.intentScore,
          input.serviceInterest || []
        );

      case "apply_discount_code":
        if (!input.discountCode || !input.serviceIds) {
          return { success: false, error: "discountCode dan serviceIds diperlukan" };
        }
        return await applyDiscountCode(
          input.discountCode,
          input.serviceIds,
          input.bookingDate || new Date().toISOString().split("T")[0]
        );

      default:
        return {
          success: false,
          error: `Tool '${tool}' tidak dikenali`,
        };
    }
  } catch (error) {
    console.error(`Error executing bot action '${tool}':`, error);
    return {
      success: false,
      error: "Terjadi kesalahan saat menjalankan perintah",
    };
  }
}

/**
 * Check if the response from Claude contains tool calls
 * and execute them
 */
export async function processBotActions(
  responseText: string,
  customerId: string
): Promise<{ actions: BotAction[]; results: any[] }> {
  const actions: BotAction[] = [];
  const results: any[] = [];

  // Look for JSON tool calls in the response
  // Pattern: {"tool": "tool_name", "input": {...}}
  const toolPattern = /\{"tool":\s*"([^"]+)",\s*"input":\s*(\{[^}]+\})\}/g;
  let match;

  while ((match = toolPattern.exec(responseText)) !== null) {
    try {
      const toolName = match[1];
      const inputStr = match[2];
      const input = JSON.parse(inputStr);

      // Add customerId to all tool inputs
      const actionInput = { customerId, ...input };

      const action: BotAction = {
        tool: toolName,
        input: actionInput,
      };

      actions.push(action);

      // Execute the action
      const result = await executeBotAction({
        ...action,
        input: actionInput,
      });

      results.push({
        tool: toolName,
        result,
      });
    } catch (error) {
      console.error("Error processing bot action:", error);
    }
  }

  return { actions, results };
}

/**
 * Extract tool use blocks from Claude's response
 */
export function extractToolUse(response: Anthropic.Message): Array<{
  id: string;
  name: string;
  input: Record<string, any>;
}> {
  const toolUses: Array<{ id: string; name: string; input: Record<string, any> }> = [];

  for (const block of response.content) {
    if (block.type === "tool_use") {
      toolUses.push({
        id: block.id,
        name: block.name,
        input: block.input as Record<string, any>,
      });
    }
  }

  return toolUses;
}

/**
 * Execute all tool use blocks and return tool results
 */
export async function executeToolUse(
  toolUses: Array<{ id: string; name: string; input: Record<string, any> }>,
  customerId: string,
  conversationId?: string // SALES AUTOMATION FIX: Add conversationId for funnel tracking
): Promise<Array<{ id: string; name: string; result: any }>> {
  const results: Array<{ id: string; name: string; result: any }> = [];

  for (const toolUse of toolUses) {
    try {
      // Add customerId and conversationId to input for sales tracking
      const input = {
        customerId,
        conversationId: conversationId || undefined, // Only add if available
        ...toolUse.input
      };

      // Execute the tool
      const result = await executeBotAction({
        tool: toolUse.name,
        input,
      });

      results.push({
        id: toolUse.id,
        name: toolUse.name,
        result,
      });
    } catch (error) {
      console.error(`❌ Error executing tool '${toolUse.name}':`, error);
      results.push({
        id: toolUse.id,
        name: toolUse.name,
        result: {
          success: false,
          error: `Gagal mengeksekusi tool ${toolUse.name}`,
        },
      });
    }
  }

  return results;
}

/**
 * Format tool results as tool_result content blocks for API
 */
export function formatToolResults(
  toolResults: Array<{ id: string; name: string; result: any }>
): Anthropic.ToolResultBlockParam[] {
  return toolResults.map((tr) => ({
    type: "tool_result" as const,
    tool_use_id: tr.id,
    content: JSON.stringify(tr.result),
  }));
}
