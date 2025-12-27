import { handleMidtransWebhook } from "@/app/lib/midtrans-service";

/**
 * POST /api/payment/webhook
 * Handle Midtrans payment webhook notifications
 *
 * This endpoint receives payment status updates from Midtrans
 * and updates the booking payment status accordingly.
 *
 * IMPORTANT: Configure this URL in your Midtrans dashboard:
 * Settings > Configuration > Payment Notification URL
 * https://your-domain.com/api/payment/webhook
 */
export async function POST(req: Request) {
  try {
    const notification = await req.json();

    console.log("📥 Received Midtrans webhook notification");

    const result = await handleMidtransWebhook(notification);

    if (!result.success) {
      console.error("❌ Webhook processing failed:", result.error);
      return new Response(JSON.stringify(result), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("✅ Webhook processed successfully");

    // Midtrans expects 200 OK response
    return new Response(
      JSON.stringify({
        success: true,
        message: "Notification processed",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in payment webhook endpoint:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Terjadi kesalahan saat memproses notifikasi pembayaran",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * GET /api/payment/webhook
 * Test endpoint to verify webhook is accessible
 */
export async function GET(req: Request) {
  return new Response(
    JSON.stringify({
      success: true,
      message: "Midtrans payment webhook endpoint is active",
      info: "POST payment notifications to this URL from Midtrans dashboard",
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
