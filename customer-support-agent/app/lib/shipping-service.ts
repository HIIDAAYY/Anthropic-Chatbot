import { PrismaClient, ShippingStatus } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Get shipping tracking information for an order
 */
export async function getShippingTracking(
  customerId: string,
  orderNumber: string
) {
  try {
    // For demo purposes, find order by order number only
    // In production, you'd want to validate customerId for security
    const order = await prisma.order.findFirst({
      where: {
        orderNumber,
        // Commented out for demo to allow testing with any session
        // customerId,
      },
      include: { shipping: true },
    });

    if (!order) {
      return {
        success: false,
        error: "Pesanan tidak ditemukan",
        tracking: null,
      };
    }

    if (!order.shipping) {
      return {
        success: false,
        error: "Informasi pengiriman belum tersedia. Pesanan mungkin masih dalam proses.",
        tracking: null,
      };
    }

    return {
      success: true,
      tracking: {
        orderNumber: order.orderNumber,
        trackingNumber: order.shipping.trackingNumber,
        carrier: order.shipping.carrier,
        status: order.shipping.currentStatus,
        currentLocation: order.shipping.currentLocation,
        shippedAt: order.shipping.shippedAt,
        estimatedDelivery: order.shipping.estimatedDelivery,
        deliveredAt: order.shipping.deliveredAt,
      },
    };
  } catch (error) {
    console.error("Error fetching shipping tracking:", error);
    return {
      success: false,
      error: "Gagal mengambil informasi pengiriman",
      tracking: null,
    };
  }
}

/**
 * Get all shipments for a customer (recent 5)
 */
export async function getCustomerShipments(customerId: string) {
  try {
    const orders = await prisma.order.findMany({
      where: {
        customerId,
        shipping: { isNot: null },
      },
      include: { shipping: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const shipments = orders
      .filter((o) => o.shipping)
      .map((o) => ({
        orderNumber: o.orderNumber,
        trackingNumber: o.shipping!.trackingNumber,
        carrier: o.shipping!.carrier,
        status: o.shipping!.currentStatus,
        estimatedDelivery: o.shipping!.estimatedDelivery,
      }));

    return {
      success: true,
      shipments,
      count: shipments.length,
    };
  } catch (error) {
    console.error("Error fetching customer shipments:", error);
    return {
      success: false,
      error: "Gagal mengambil data pengiriman",
      shipments: [],
    };
  }
}

/**
 * Update shipping status (from API webhook or admin)
 */
export async function updateShippingStatus(
  orderNumber: string,
  newStatus: ShippingStatus,
  currentLocation?: string,
  estimatedDelivery?: Date
) {
  try {
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: { shipping: true },
    });

    if (!order || !order.shipping) {
      return {
        success: false,
        error: "Pengiriman tidak ditemukan",
      };
    }

    const updated = await prisma.shippingTracking.update({
      where: { id: order.shipping.id },
      data: {
        currentStatus: newStatus,
        currentLocation: currentLocation || order.shipping.currentLocation,
        estimatedDelivery: estimatedDelivery || order.shipping.estimatedDelivery,
        ...(newStatus === ShippingStatus.DELIVERED
          ? { deliveredAt: new Date() }
          : newStatus === ShippingStatus.IN_TRANSIT
            ? { shippedAt: new Date() }
            : {}),
      },
    });

    return {
      success: true,
      tracking: updated,
    };
  } catch (error) {
    console.error("Error updating shipping status:", error);
    return {
      success: false,
      error: "Gagal memperbarui status pengiriman",
    };
  }
}

/**
 * Get tracking URL for a specific carrier
 */
export function getTrackingUrl(
  trackingNumber: string,
  carrier: string | null
): string | null {
  const trackingUrls: Record<string, (num: string) => string> = {
    jne: (num) => `https://tracking.jne.co.id/tracking/trace/${num}`,
    sicepat: (num) => `https://tracking.sicepat.com/trace/${num}`,
    tiki: (num) => `https://www.tiki.id/tracking/trace/${num}`,
    pos: (num) => `https://www.posindonesia.co.id/id/lacak-pengiriman?nokirim=${num}`,
    gofresh: (num) => `https://gofresh.gojek.com/track/${num}`,
  };

  if (!trackingNumber || !carrier) return null;

  const urlGenerator = trackingUrls[carrier.toLowerCase()];
  return urlGenerator ? urlGenerator(trackingNumber) : null;
}

/**
 * Format shipping info for chat display
 */
export function formatShippingForChat(shipping: {
  orderNumber: string;
  trackingNumber?: string;
  carrier?: string;
  status: string;
  currentLocation?: string;
  estimatedDelivery?: Date;
}): string {
  const trackingUrl = shipping.trackingNumber
    ? getTrackingUrl(shipping.trackingNumber, shipping.carrier || null)
    : null;

  return `
📦 **Status Pengiriman Pesanan ${shipping.orderNumber}**

Status: ${formatShippingStatus(shipping.status)}
Kurir: ${shipping.carrier ? formatCarrier(shipping.carrier) : "Belum diketahui"}
${shipping.trackingNumber ? `Nomor Resi: ${shipping.trackingNumber}` : "Belum ada resi"}
${shipping.currentLocation ? `Lokasi Terakhir: ${shipping.currentLocation}` : ""}
${shipping.estimatedDelivery ? `Estimasi Tiba: ${new Date(shipping.estimatedDelivery).toLocaleDateString("id-ID")}` : "Estimasi belum tersedia"}

${trackingUrl ? `🔗 [Lacak Paket Secara Real-time](${trackingUrl})` : ""}

Untuk informasi lebih detail, silakan cek website kurir menggunakan nomor resi di atas.
  `.trim();
}

function formatShippingStatus(status: string): string {
  const statuses: Record<string, string> = {
    PROCESSING: "⏳ Sedang Diproses",
    PENDING_PICKUP: "📋 Menunggu Pengambilan dari Gudang",
    IN_TRANSIT: "🚚 Dalam Perjalanan",
    OUT_FOR_DELIVERY: "📍 Sedang Diantar ke Alamat Anda",
    DELIVERED: "✅ Terkirim",
    FAILED: "⚠️ Pengiriman Gagal",
    RETURNED: "↩️ Dikembalikan ke Gudang",
  };
  return statuses[status] || status;
}

function formatCarrier(carrier: string): string {
  const carriers: Record<string, string> = {
    jne: "JNE",
    sicepat: "SiCepat",
    tiki: "TIKI",
    pos: "POS Indonesia",
    gofresh: "GoFresh",
  };
  return carriers[carrier.toLowerCase()] || carrier;
}

/**
 * Check if order has been delivered
 */
export async function isOrderDelivered(
  customerId: string,
  orderNumber: string
): Promise<boolean> {
  try {
    const order = await prisma.order.findFirst({
      where: {
        orderNumber,
        customerId,
      },
      include: { shipping: true },
    });

    return order?.shipping?.currentStatus === ShippingStatus.DELIVERED || false;
  } catch (error) {
    console.error("Error checking if order is delivered:", error);
    return false;
  }
}

/**
 * Get estimated delivery status
 */
export function getDeliveryStatusMessage(
  status: string,
  estimatedDelivery?: Date
): string {
  switch (status) {
    case ShippingStatus.PROCESSING:
      return "Pesanan Anda sedang disiapkan dan akan diambil oleh kurir dalam waktu singkat.";

    case ShippingStatus.PENDING_PICKUP:
      return "Pesanan Anda sudah siap dan sedang menunggu untuk diambil oleh kurir.";

    case ShippingStatus.IN_TRANSIT:
      if (estimatedDelivery) {
        const days = Math.ceil(
          (new Date(estimatedDelivery).getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24)
        );
        return `Paket Anda sedang dalam perjalanan dan diperkirakan tiba dalam ${days} hari (${new Date(estimatedDelivery).toLocaleDateString("id-ID")}).`;
      }
      return "Paket Anda sedang dalam perjalanan menuju alamat tujuan.";

    case ShippingStatus.OUT_FOR_DELIVERY:
      return "Kurir sedang dalam perjalanan untuk mengantarkan paket Anda. Mohon siapkan diri untuk menerimanya.";

    case ShippingStatus.DELIVERED:
      return "Paket Anda telah berhasil diterima. Terima kasih telah berbelanja di UrbanStyle ID!";

    case ShippingStatus.FAILED:
      return "Pengiriman paket gagal. Mohon hubungi Customer Service untuk bantuan lebih lanjut.";

    case ShippingStatus.RETURNED:
      return "Paket Anda dikembalikan ke gudang kami. Hubungi Customer Service untuk bantuan.";

    default:
      return "Status pengiriman tidak diketahui.";
  }
}
