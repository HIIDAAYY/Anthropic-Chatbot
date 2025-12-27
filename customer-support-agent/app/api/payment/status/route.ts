import { checkBookingPaymentStatus } from "@/app/lib/midtrans-service";

/**
 * POST /api/payment/status
 * Check payment status for a booking
 */
export async function POST(req: Request) {
  try {
    const { customerId, bookingNumber } = await req.json();

    if (!customerId || !bookingNumber) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "customerId dan bookingNumber diperlukan",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await checkBookingPaymentStatus(customerId, bookingNumber);

    if (!result.success) {
      return new Response(JSON.stringify(result), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in payment status endpoint:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Terjadi kesalahan saat mengecek status pembayaran",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * GET /api/payment/status?customerId=xxx&bookingNumber=xxx
 * Check payment status for a booking (for browser access)
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const customerId = url.searchParams.get("customerId");
    const bookingNumber = url.searchParams.get("bookingNumber");

    if (!customerId || !bookingNumber) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "customerId dan bookingNumber diperlukan",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await checkBookingPaymentStatus(customerId, bookingNumber);

    if (!result.success) {
      return new Response(JSON.stringify(result), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in payment status endpoint:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Terjadi kesalahan saat mengecek status pembayaran",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
