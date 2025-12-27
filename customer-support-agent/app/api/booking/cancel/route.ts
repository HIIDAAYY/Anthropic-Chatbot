import { cancelBooking } from "@/app/lib/booking-service";

/**
 * POST /api/booking/cancel
 * Cancel a booking
 */
export async function POST(req: Request) {
  try {
    const { customerId, bookingNumber, reason } = await req.json();

    if (!customerId || !bookingNumber) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "customerId dan bookingNumber diperlukan",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await cancelBooking(customerId, bookingNumber, reason);

    if (!result.success) {
      return new Response(JSON.stringify(result), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in booking cancel endpoint:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Terjadi kesalahan saat membatalkan booking",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
