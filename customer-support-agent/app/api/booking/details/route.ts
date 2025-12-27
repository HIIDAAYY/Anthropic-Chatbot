import { getBookingByNumber } from "@/app/lib/booking-service";

/**
 * POST /api/booking/details
 * Get booking details by booking number
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

    const result = await getBookingByNumber(customerId, bookingNumber);

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
    console.error("Error in booking details endpoint:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Terjadi kesalahan saat mengambil detail booking",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
