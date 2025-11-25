import {
  verifyPayment,
  getPaymentStatus,
  getPaymentInstructions,
} from "@/app/lib/payment-service";

/**
 * POST /api/bot/payment/verify
 * Verify if payment has been completed
 */
export async function POST(req: Request) {
  try {
    const { customerId, orderNumber, detailed } = await req.json();

    if (!customerId || !orderNumber) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "customerId dan orderNumber diperlukan",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // If detailed flag is true, return full payment info
    if (detailed) {
      const paymentResult = await getPaymentStatus(customerId, orderNumber);
      return new Response(JSON.stringify(paymentResult), {
        status: paymentResult.success ? 200 : 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Otherwise just verify if paid
    const verifyResult = await verifyPayment(customerId, orderNumber);

    if (!verifyResult.success) {
      return new Response(JSON.stringify(verifyResult), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // If not paid, also get payment instructions
    if (!verifyResult.isPaid) {
      const instructionsResult = await getPaymentInstructions(
        customerId,
        orderNumber
      );

      return new Response(
        JSON.stringify({
          ...verifyResult,
          instructions: instructionsResult.instructions,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(verifyResult), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in payment verification endpoint:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Terjadi kesalahan saat memverifikasi pembayaran",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
