import { getShippingTracking } from "@/app/lib/shipping-service";
import { getOrderByNumber } from "@/app/lib/order-service";

/**
 * POST /api/bot/order/track
 * Track an order's shipping status
 */
export async function POST(req: Request) {
  try {
    const { customerId, orderNumber } = await req.json();

    if (!customerId || !orderNumber) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "customerId dan orderNumber diperlukan",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get order details first
    const orderResult = await getOrderByNumber(customerId, orderNumber);
    if (!orderResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Pesanan tidak ditemukan. Mohon periksa kembali nomor pesanan Anda.",
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get shipping tracking
    const trackingResult = await getShippingTracking(customerId, orderNumber);

    if (!trackingResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            trackingResult.error ||
            "Informasi pengiriman belum tersedia untuk pesanan ini",
          orderStatus: orderResult.order?.status,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        tracking: trackingResult.tracking,
        orderStatus: orderResult.order?.status,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in order tracking endpoint:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Terjadi kesalahan saat mengambil informasi tracking",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
