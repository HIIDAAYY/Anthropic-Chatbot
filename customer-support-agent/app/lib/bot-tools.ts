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
 */
export const BOT_TOOLS: Anthropic.Tool[] = [
  {
    name: "track_order",
    description:
      "Melacak status pengiriman pesanan pelanggan. Gunakan untuk menjawab pertanyaan seperti 'Mana pesanan saya?' atau 'Kapan paket sampai?'",
    input_schema: {
      type: "object",
      properties: {
        orderNumber: {
          type: "string",
          description:
            "Nomor pesanan pelanggan (contoh: ORD-2025-001). Harus ditanyakan ke customer jika tidak ada.",
        },
      },
      required: ["orderNumber"],
    },
  },
  {
    name: "cancel_order",
    description:
      "Membatalkan pesanan yang masih berstatus PENDING atau PROCESSING. Tidak bisa membatalkan pesanan yang sudah SHIPPED atau DELIVERED.",
    input_schema: {
      type: "object",
      properties: {
        orderNumber: {
          type: "string",
          description: "Nomor pesanan yang akan dibatalkan",
        },
        reason: {
          type: "string",
          description: "Alasan pembatalan (opsional)",
        },
      },
      required: ["orderNumber"],
    },
  },
  {
    name: "get_order_summary",
    description:
      "Mendapatkan ringkasan pesanan pelanggan termasuk total pesanan, pesanan aktif, dan total pengeluaran. Tidak memerlukan input khusus selain customerId dari session.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "verify_payment",
    description:
      "Memverifikasi status pembayaran pesanan. Menampilkan apakah sudah dibayar, metode pembayaran, dan instruksi pembayaran jika belum dibayar.",
    input_schema: {
      type: "object",
      properties: {
        orderNumber: {
          type: "string",
          description: "Nomor pesanan yang ingin dicek pembayarannya",
        },
        detailed: {
          type: "boolean",
          description:
            "Tampilkan detail pembayaran lengkap (opsional, default: false)",
        },
      },
      required: ["orderNumber"],
    },
  },
  {
    name: "check_inventory",
    description:
      "Mengecek ketersediaan stok produk secara real-time. Gunakan untuk menjawab pertanyaan seperti 'Apakah produk X tersedia?' atau 'Berapa stok kaos ukuran M?'",
    input_schema: {
      type: "object",
      properties: {
        productIds: {
          type: "array",
          items: {
            type: "string",
          },
          description:
            "ID produk yang ingin dicek (contoh: ['KAOS-001', 'CELANA-001'])",
        },
        quantities: {
          type: "array",
          items: {
            type: "number",
          },
          description:
            "Jumlah yang ingin dipesan (opsional, untuk validasi apakah bisa order dengan qty ini)",
        },
      },
      required: ["productIds"],
    },
  },
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
          description: "ID bisnis tempat booking dilakukan",
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
];

/**
 * Execute a bot action by calling the appropriate API endpoint
 */
import { getShippingTracking } from "@/app/lib/shipping-service";
import { getOrderByNumber, cancelOrder, getOrderSummary } from "@/app/lib/order-service";
import { verifyPayment } from "@/app/lib/payment-service";
import { checkMultipleProductsStock } from "@/app/lib/inventory-service";
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

/**
 * Execute a bot action by calling the appropriate service function directly
 * This avoids HTTP fetch issues (405, network errors) within the same server
 */
export async function executeBotAction(action: BotAction): Promise<any> {
  const { tool, input } = action;
  const {
    customerId,
    orderNumber,
    productIds,
    quantities,
    reason,
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
    category,
    paymentType,
    bank,
  } = input;

  try {
    console.log(`🔧 Executing tool '${tool}' directly via service call`);

    switch (tool) {
      // ============================================
      // E-COMMERCE TOOLS
      // ============================================
      case "track_order":
        if (!customerId || !orderNumber) {
          return { success: false, error: "customerId dan orderNumber diperlukan" };
        }
        // Logic from /api/bot/order/track
        const orderResult = await getOrderByNumber(customerId, orderNumber);
        if (!orderResult.success) {
          return { success: false, error: "Pesanan tidak ditemukan. Mohon periksa kembali nomor pesanan Anda." };
        }
        const trackingResult = await getShippingTracking(customerId, orderNumber);
        if (!trackingResult.success) {
          return {
            success: false,
            error: trackingResult.error || "Informasi pengiriman belum tersedia",
            orderStatus: orderResult.order?.status
          };
        }
        return {
          success: true,
          tracking: trackingResult.tracking,
          orderStatus: orderResult.order?.status
        };

      case "cancel_order":
        return await cancelOrder(customerId, orderNumber, reason);

      case "get_order_summary":
        return await getOrderSummary(customerId);

      case "verify_payment":
        return await verifyPayment(customerId, orderNumber);

      case "check_inventory":
        return await checkMultipleProductsStock(productIds);

      // ============================================
      // BOOKING SYSTEM TOOLS
      // ============================================
      case "check_availability":
        if (!serviceId || !date) {
          return { success: false, error: "serviceId dan date diperlukan" };
        }
        return await checkAvailability(serviceId, date, preferredTime);

      case "create_booking":
        if (!customerId || !businessId || !serviceId || !date || !time || !customerName || !customerPhone) {
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
  customerId: string
): Promise<Array<{ id: string; name: string; result: any }>> {
  const results: Array<{ id: string; name: string; result: any }> = [];

  for (const toolUse of toolUses) {
    try {
      // Add customerId to input
      const input = { customerId, ...toolUse.input };

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
