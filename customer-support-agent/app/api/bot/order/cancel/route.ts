import { cancelOrder } from "@/app/lib/order-service";

/**
 * POST /api/bot/order/cancel
 * Cancel an order (only if status is PENDING or PROCESSING)
 */
export async function POST(req: Request) {
  try {
    const { customerId, orderNumber, reason } = await req.json();

    if (!customerId || !orderNumber) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "customerId dan orderNumber diperlukan",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await cancelOrder(
      customerId,
      orderNumber,
      reason || "Customer requested cancellation"
    );

    if (!result.success) {
      return new Response(
        JSON.stringify(result),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: result.message,
        orderNumber: orderNumber,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in order cancellation endpoint:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Terjadi kesalahan saat membatalkan pesanan",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
