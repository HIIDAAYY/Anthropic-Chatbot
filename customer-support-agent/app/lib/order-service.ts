import { PrismaClient, OrderStatus } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Get customer's orders
 */
export async function getCustomerOrders(customerId: string) {
  try {
    const orders = await prisma.order.findMany({
      where: { customerId },
      include: {
        items: true,
        payment: true,
        shipping: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      orders,
      count: orders.length,
    };
  } catch (error) {
    console.error("Error fetching customer orders:", error);
    return {
      success: false,
      error: "Gagal mengambil data pesanan",
      orders: [],
    };
  }
}

/**
 * Get single order by order number
 */
export async function getOrderByNumber(
  customerId: string,
  orderNumber: string
) {
  try {
    // Validate customerId for security
    const order = await prisma.order.findFirst({
      where: {
        orderNumber,
        customerId,
      },
      include: {
        items: true,
        payment: true,
        shipping: true,
      },
    });

    if (!order) {
      return {
        success: false,
        error: "Pesanan tidak ditemukan",
        order: null,
      };
    }

    return {
      success: true,
      order,
    };
  } catch (error) {
    console.error("Error fetching order:", error);
    return {
      success: false,
      error: "Gagal mengambil detail pesanan",
      order: null,
    };
  }
}

/**
 * Get order summary for customer
 */
export async function getOrderSummary(customerId: string) {
  try {
    const orders = await prisma.order.findMany({
      where: { customerId },
      include: { payment: true },
    });

    const summary = {
      totalOrders: orders.length,
      activeOrders: orders.filter(
        (o) => o.status !== OrderStatus.DELIVERED && o.status !== OrderStatus.CANCELLED
      ).length,
      totalSpent: orders
        .filter((o) => o.payment?.status === "COMPLETED")
        .reduce((sum, o) => sum + o.totalAmount, 0),
      recentOrders: orders.slice(0, 3).map((o) => ({
        orderNumber: o.orderNumber,
        status: o.status,
        totalAmount: o.totalAmount,
        createdAt: o.createdAt,
      })),
    };

    return {
      success: true,
      summary,
    };
  } catch (error) {
    console.error("Error fetching order summary:", error);
    return {
      success: false,
      error: "Gagal mengambil ringkasan pesanan",
      summary: null,
    };
  }
}

/**
 * Cancel order (only if status is PENDING or PROCESSING)
 */
export async function cancelOrder(
  customerId: string,
  orderNumber: string,
  reason: string
) {
  try {
    // Get order first
    const order = await prisma.order.findFirst({
      where: {
        orderNumber,
        customerId,
      },
    });

    if (!order) {
      return {
        success: false,
        error: "Pesanan tidak ditemukan",
      };
    }

    // Check if order can be cancelled
    if (
      order.status !== OrderStatus.PENDING &&
      order.status !== OrderStatus.PROCESSING
    ) {
      return {
        success: false,
        error: `Pesanan dengan status ${order.status} tidak dapat dibatalkan. Hanya pesanan dengan status PENDING atau PROCESSING yang dapat dibatalkan.`,
      };
    }

    // Update order status to CANCELLED
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.CANCELLED,
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      message: `Pesanan ${orderNumber} telah dibatalkan`,
      order: updatedOrder,
    };
  } catch (error) {
    console.error("Error cancelling order:", error);
    return {
      success: false,
      error: "Gagal membatalkan pesanan. Hubungi Customer Service untuk bantuan lebih lanjut.",
    };
  }
}

/**
 * Update shipping address (only if order not yet shipped)
 */
export async function updateShippingAddress(
  customerId: string,
  orderNumber: string,
  newAddress: string
) {
  try {
    const order = await prisma.order.findFirst({
      where: {
        orderNumber,
        customerId,
      },
    });

    if (!order) {
      return {
        success: false,
        error: "Pesanan tidak ditemukan",
      };
    }

    // Check if order has been shipped
    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.PROCESSING) {
      return {
        success: false,
        error: `Alamat pengiriman tidak dapat diubah karena pesanan sudah dalam status ${order.status}`,
      };
    }

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        shippingAddress: newAddress,
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      message: "Alamat pengiriman telah diperbarui",
      order: updatedOrder,
    };
  } catch (error) {
    console.error("Error updating shipping address:", error);
    return {
      success: false,
      error: "Gagal memperbarui alamat pengiriman",
    };
  }
}

/**
 * Format order for display in chat
 */
export function formatOrderForChat(order: any): string {
  return `
📦 **Pesanan ${order.orderNumber}**
Status: ${formatOrderStatus(order.status)}
Total: Rp${(order.totalAmount / 100).toLocaleString("id-ID")}
Tanggal: ${new Date(order.createdAt).toLocaleDateString("id-ID")}
Items: ${order.items.length} produk

${order.shipping ? `
📍 **Pengiriman:**
Status: ${formatShippingStatus(order.shipping.currentStatus)}
Kurir: ${order.shipping.carrier || "Belum diketahui"}
Estimasi: ${order.shipping.estimatedDelivery ? new Date(order.shipping.estimatedDelivery).toLocaleDateString("id-ID") : "Belum diketahui"}
${order.shipping.trackingNumber ? `Nomor Resi: ${order.shipping.trackingNumber}` : ""}
` : ""}

${order.payment ? `
💳 **Pembayaran:**
Status: ${formatPaymentStatus(order.payment.status)}
Metode: ${formatPaymentMethod(order.payment.method)}
` : ""}
  `.trim();
}

function formatOrderStatus(status: string): string {
  const statuses: Record<string, string> = {
    PENDING: "⏳ Menunggu Pembayaran",
    PROCESSING: "📋 Sedang Diproses",
    SHIPPED: "🚚 Sedang Dikirim",
    DELIVERED: "✅ Terkirim",
    CANCELLED: "❌ Dibatalkan",
    RETURNED: "↩️ Dikembalikan",
    FAILED: "⚠️ Gagal",
  };
  return statuses[status] || status;
}

function formatShippingStatus(status: string): string {
  const statuses: Record<string, string> = {
    PROCESSING: "Sedang Diproses",
    PENDING_PICKUP: "Menunggu Pengambilan",
    IN_TRANSIT: "Dalam Perjalanan",
    OUT_FOR_DELIVERY: "Sedang Diantar",
    DELIVERED: "Terkirim",
    FAILED: "Pengiriman Gagal",
    RETURNED: "Dikembalikan",
  };
  return statuses[status] || status;
}

function formatPaymentStatus(status: string): string {
  const statuses: Record<string, string> = {
    PENDING: "Menunggu Pembayaran",
    COMPLETED: "Pembayaran Berhasil",
    FAILED: "Pembayaran Gagal",
    REFUNDED: "Dana Dikembalikan",
  };
  return statuses[status] || status;
}

function formatPaymentMethod(method: string): string {
  const methods: Record<string, string> = {
    bank_transfer: "Transfer Bank",
    e_wallet: "E-Wallet",
    credit_card: "Kartu Kredit",
    cod: "Bayar di Tempat (COD)",
  };
  return methods[method] || method;
}
