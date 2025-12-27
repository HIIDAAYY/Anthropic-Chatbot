import { listCustomerBookings } from "@/app/lib/booking-service";

/**
 * POST /api/booking/list
 * List all bookings for a customer
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

    const result = await listCustomerBookings(customerId);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in booking list endpoint:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Terjadi kesalahan saat mengambil daftar booking",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
