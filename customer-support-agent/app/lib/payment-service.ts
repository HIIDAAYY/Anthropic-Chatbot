import { PrismaClient, PaymentStatus } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Get payment status for an order
 */
export async function getPaymentStatus(
  customerId: string,
  orderNumber: string
) {
  try {
    const order = await prisma.order.findFirst({
      where: {
        orderNumber,
        customerId,
      },
      include: { payment: true },
    });

    if (!order) {
      return {
        success: false,
        error: "Pesanan tidak ditemukan",
        payment: null,
      };
    }

    if (!order.payment) {
      return {
        success: false,
        error: "Data pembayaran untuk pesanan ini belum ada",
        payment: null,
      };
    }

    return {
      success: true,
      payment: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: order.totalAmount,
        method: order.payment.method,
        status: order.payment.status,
        paidAt: order.payment.paidAt,
        invoiceUrl: order.payment.invoiceUrl,
      },
    };
  } catch (error) {
    console.error("Error fetching payment status:", error);
    return {
      success: false,
      error: "Gagal mengambil status pembayaran",
      payment: null,
    };
  }
}

/**
 * Verify payment has been completed
 */
export async function verifyPayment(
  customerId: string,
  orderNumber: string
): Promise<{
  success: boolean;
  isPaid: boolean;
  payment?: any;
  error?: string;
}> {
  try {
    const order = await prisma.order.findFirst({
      where: {
        orderNumber,
        customerId,
      },
      include: { payment: true },
    });

    if (!order) {
      return {
        success: false,
        isPaid: false,
        error: "Pesanan tidak ditemukan",
      };
    }

    if (!order.payment) {
      return {
        success: true,
        isPaid: false,
        payment: null,
      };
    }

    const isPaid = order.payment.status === PaymentStatus.COMPLETED;

    return {
      success: true,
      isPaid,
      payment: {
        status: order.payment.status,
        method: order.payment.method,
        paidAt: order.payment.paidAt,
      },
    };
  } catch (error) {
    console.error("Error verifying payment:", error);
    return {
      success: false,
      isPaid: false,
      error: "Gagal memverifikasi pembayaran",
    };
  }
}

/**
 * Get payment instructions for pending payment
 */
export async function getPaymentInstructions(
  customerId: string,
  orderNumber: string
) {
  try {
    const order = await prisma.order.findFirst({
      where: {
        orderNumber,
        customerId,
      },
      include: { payment: true },
    });

    if (!order) {
      return {
        success: false,
        error: "Pesanan tidak ditemukan",
        instructions: null,
      };
    }

    if (!order.payment) {
      return {
        success: false,
        error: "Data pembayaran belum tersedia",
        instructions: null,
      };
    }

    if (order.payment.status === PaymentStatus.COMPLETED) {
      return {
        success: true,
        message: "Pembayaran sudah berhasil",
        isPaid: true,
        instructions: null,
      };
    }

    // Generate payment instructions based on method
    const instructions = generatePaymentInstructions(
      order.payment.method,
      order.totalAmount,
      orderNumber
    );

    return {
      success: true,
      isPaid: false,
      instructions,
    };
  } catch (error) {
    console.error("Error getting payment instructions:", error);
    return {
      success: false,
      error: "Gagal mengambil instruksi pembayaran",
      instructions: null,
    };
  }
}

/**
 * Generate payment instructions based on payment method
 */
function generatePaymentInstructions(
  method: string,
  amount: number,
  orderNumber: string
): string {
  const formattedAmount = (amount / 100).toLocaleString("id-ID");

  switch (method) {
    case "bank_transfer":
      return `
💳 **Instruksi Transfer Bank**

Jumlah: Rp${formattedAmount}
Referensi: ${orderNumber}

📍 Ke salah satu rekening UrbanStyle ID:
- BCA: 1234567890 (a.n. UrbanStyle ID)
- Mandiri: 9876543210 (a.n. UrbanStyle ID)

⚠️ **PENTING:**
1. Pastikan nominal transfer TEPAT sesuai dengan jumlah di atas
2. Masukkan referensi pesanan (${orderNumber}) di keterangan transfer
3. Setelah transfer, WAJIB submit formulir Konfirmasi Pembayaran di website
4. Pesanan akan diproses maksimal 1x24 jam setelah pembayaran terverifikasi
      `.trim();

    case "e_wallet":
      return `
📱 **Instruksi Pembayaran E-Wallet**

Jumlah: Rp${formattedAmount}
Referensi: ${orderNumber}

Pilih salah satu e-wallet favorit Anda:
- GoPay
- OVO
- ShopeePay

Link pembayaran akan dikirim ke nomor WhatsApp Anda.
Selesaikan pembayaran dalam 15 menit.

Pembayaran akan otomatis terverifikasi dalam sistem kami.
      `.trim();

    case "credit_card":
      return `
💳 **Instruksi Pembayaran Kartu Kredit**

Jumlah: Rp${formattedAmount}
Referensi: ${orderNumber}

Pilih kartu kredit Anda di halaman checkout:
- Visa
- Mastercard

Link pembayaran aman dengan SSL encryption.
Proses verifikasi: 5-10 menit setelah pembayaran.
      `.trim();

    case "cod":
      return `
💵 **Pembayaran di Tempat (COD)**

Jumlah: Rp${formattedAmount}
Referensi: ${orderNumber}

✅ Pembayaran akan dilakukan saat paket tiba
Kurir akan datang dengan barang Anda

📍 Siapkan uang cash sesuai jumlah di atas
⏰ Perkiraan pengiriman: 1-7 hari kerja
      `.trim();

    default:
      return `Instruksi pembayaran tidak tersedia untuk metode ini. Hubungi Customer Service untuk bantuan.`;
  }
}

/**
 * Format payment for chat display
 */
export function formatPaymentForChat(payment: any): string {
  const statusEmoji =
    payment.status === "COMPLETED"
      ? "✅"
      : payment.status === "FAILED"
        ? "❌"
        : "⏳";

  return `
${statusEmoji} **Status Pembayaran: ${formatPaymentStatus(payment.status)}**

Metode: ${formatPaymentMethod(payment.method)}
Jumlah: Rp${(payment.amount / 100).toLocaleString("id-ID")}
${payment.paidAt ? `Dibayar: ${new Date(payment.paidAt).toLocaleDateString("id-ID")}` : "Belum dibayar"}
${payment.transactionId ? `ID Transaksi: ${payment.transactionId}` : ""}
  `.trim();
}

function formatPaymentStatus(status: string): string {
  const statuses: Record<string, string> = {
    PENDING: "Menunggu Pembayaran",
    COMPLETED: "Pembayaran Berhasil",
    FAILED: "Pembayaran Gagal",
    REFUNDED: "Dana Dikembalikan",
  };
  return statuses[status] || status;
}

function formatPaymentMethod(method: string): string {
  const methods: Record<string, string> = {
    bank_transfer: "Transfer Bank",
    e_wallet: "E-Wallet",
    credit_card: "Kartu Kredit",
    cod: "Bayar di Tempat (COD)",
  };
  return methods[method] || method;
}
