import { createBooking } from "@/app/lib/booking-service";

/**
 * POST /api/booking/create
 * Create a new booking
 */
export async function POST(req: Request) {
  try {
    const params = await req.json();
    const {
      customerId,
      businessId,
      serviceId,
      date,
      time,
      customerName,
      customerPhone,
      customerEmail,
      notes,
    } = params;

    if (
      !customerId ||
      !businessId ||
      !serviceId ||
      !date ||
      !time ||
      !customerName ||
      !customerPhone
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "customerId, businessId, serviceId, date, time, customerName, dan customerPhone diperlukan",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await createBooking({
      customerId,
      businessId,
      serviceId,
      date,
      time,
      customerName,
      customerPhone,
      customerEmail,
      notes,
    });

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
    console.error("Error in booking create endpoint:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Terjadi kesalahan saat membuat booking",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
