import { checkAvailability } from "@/app/lib/booking-service";

/**
 * POST /api/booking/availability
 * Check availability for a service on a specific date
 */
export async function POST(req: Request) {
  try {
    const { serviceId, date, preferredTime } = await req.json();

    if (!serviceId || !date) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "serviceId dan date diperlukan",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await checkAvailability(serviceId, date, preferredTime);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in availability check endpoint:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Terjadi kesalahan saat mengecek ketersediaan",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
