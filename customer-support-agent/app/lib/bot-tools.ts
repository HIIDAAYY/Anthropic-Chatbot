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
];

/**
 * Execute a bot action by calling the appropriate API endpoint
 */
import { getShippingTracking } from "@/app/lib/shipping-service";
import { getOrderByNumber, cancelOrder, getOrderSummary } from "@/app/lib/order-service";
import { verifyPayment } from "@/app/lib/payment-service";
import { checkMultipleProductsStock } from "@/app/lib/inventory-service";

/**
 * Execute a bot action by calling the appropriate service function directly
 * This avoids HTTP fetch issues (405, network errors) within the same server
 */
export async function executeBotAction(action: BotAction): Promise<any> {
  const { tool, input } = action;
  const { customerId, orderNumber, productIds, quantities, reason } = input;

  try {
    console.log(`🔧 Executing tool '${tool}' directly via service call`);

    switch (tool) {
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
