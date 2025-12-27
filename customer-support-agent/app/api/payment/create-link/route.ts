import { createPaymentLink } from "@/app/lib/midtrans-service";

/**
 * POST /api/payment/create-link
 * Create Midtrans payment link for a booking
 */
export async function POST(req: Request) {
  try {
    const { bookingNumber, paymentType, bank } = await req.json();

    if (!bookingNumber || !paymentType) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "bookingNumber dan paymentType diperlukan",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate payment type
    const validPaymentTypes = [
      "BANK_TRANSFER",
      "GOPAY",
      "QRIS",
      "OVO",
      "SHOPEEPAY",
    ];
    if (!validPaymentTypes.includes(paymentType)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Tipe pembayaran tidak valid. Pilih: ${validPaymentTypes.join(", ")}`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate bank if payment type is BANK_TRANSFER
    if (paymentType === "BANK_TRANSFER") {
      if (!bank) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Bank harus dipilih untuk Virtual Account",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const validBanks = ["bca", "bni", "bri", "mandiri", "permata"];
      if (!validBanks.includes(bank.toLowerCase())) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Bank tidak valid. Pilih: ${validBanks.join(", ")}`,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    const result = await createPaymentLink(bookingNumber, paymentType, bank);

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
    console.error("Error in payment create-link endpoint:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Terjadi kesalahan saat membuat link pembayaran",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
