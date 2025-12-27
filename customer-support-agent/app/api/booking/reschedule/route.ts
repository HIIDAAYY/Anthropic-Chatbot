import { rescheduleBooking } from "@/app/lib/booking-service";

/**
 * POST /api/booking/reschedule
 * Reschedule an existing booking
 */
export async function POST(req: Request) {
  try {
    const { customerId, bookingNumber, newDate, newTime } = await req.json();

    if (!customerId || !bookingNumber || !newDate || !newTime) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "customerId, bookingNumber, newDate, dan newTime diperlukan",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await rescheduleBooking(
      customerId,
      bookingNumber,
      newDate,
      newTime
    );

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
    console.error("Error in booking reschedule endpoint:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Terjadi kesalahan saat mengubah jadwal booking",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
