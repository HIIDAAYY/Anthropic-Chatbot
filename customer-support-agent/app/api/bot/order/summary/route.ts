import { getOrderSummary, getCustomerOrders } from "@/app/lib/order-service";

/**
 * POST /api/bot/order/summary
 * Get customer's order summary (total orders, active orders, recent orders)
 */
export async function POST(req: Request) {
  try {
    const { customerId } = await req.json();

    if (!customerId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "customerId diperlukan",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const summaryResult = await getOrderSummary(customerId);

    if (!summaryResult.success) {
      return new Response(
        JSON.stringify(summaryResult),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: summaryResult.summary,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in order summary endpoint:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Terjadi kesalahan saat mengambil ringkasan pesanan",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
