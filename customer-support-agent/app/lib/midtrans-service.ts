/**
 * Midtrans Payment Gateway Service
 * Handles payment link creation, status checking, and webhook processing
 *
 * Supported payment methods:
 * - BANK_TRANSFER: BCA, BNI, BRI, Mandiri, Permata Virtual Account
 * - GOPAY: GoPay e-wallet
 * - QRIS: Universal QR payment
 * - OVO: OVO e-wallet
 * - SHOPEEPAY: ShopeePay e-wallet
 */

import { PrismaClient } from "@prisma/client";
// Note: midtrans-client package needs to be installed first
// Will be imported after npm install

const prisma = new PrismaClient();

// Midtrans configuration from environment variables
const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || "";
const MIDTRANS_CLIENT_KEY = process.env.MIDTRANS_CLIENT_KEY || "";
const MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === "true";

// Base64 encode server key for Authorization header
const MIDTRANS_AUTH = Buffer.from(MIDTRANS_SERVER_KEY + ":").toString("base64");

/**
 * Get Midtrans API base URL
 */
function getMidtransApiUrl(): string {
  return MIDTRANS_IS_PRODUCTION
    ? "https://api.midtrans.com"
    : "https://api.sandbox.midtrans.com";
}

/**
 * Get Midtrans Snap URL
 */
function getMidtransSnapUrl(): string {
  return MIDTRANS_IS_PRODUCTION
    ? "https://app.midtrans.com/snap/v1"
    : "https://app.sandbox.midtrans.com/snap/v1";
}

/**
 * Create payment link for a booking
 */
export async function createPaymentLink(
  bookingNumber: string,
  paymentType: string,
  bank?: string
): Promise<{
  success: boolean;
  paymentUrl?: string;
  vaNumber?: string;
  qrCode?: string;
  deeplink?: string;
  message: string;
  error?: string;
}> {
  try {
    // Get booking details
    const booking = await prisma.booking.findUnique({
      where: { bookingNumber },
      include: {
        customer: true,
        service: true,
        business: true,
        payment: true,
      },
    });

    if (!booking) {
      return {
        success: false,
        message: "Booking tidak ditemukan",
        error: "BOOKING_NOT_FOUND",
      };
    }

    // Check if already paid
    if (booking.payment?.status === "SETTLEMENT") {
      return {
        success: false,
        message: "Booking ini sudah dibayar",
        error: "ALREADY_PAID",
      };
    }

    // Generate unique order ID for Midtrans
    const midtransOrderId = `${bookingNumber}-${Date.now()}`;

    // Calculate amounts
    const grossAmount = booking.totalAmount / 100; // Convert from cents to rupiah
    const depositAmount = booking.depositAmount
      ? booking.depositAmount / 100
      : grossAmount;

    // Prepare transaction details
    const transactionDetails = {
      order_id: midtransOrderId,
      gross_amount: depositAmount, // Charge deposit amount first
    };

    // Prepare item details
    const itemDetails = [
      {
        id: booking.serviceId,
        price: depositAmount,
        quantity: 1,
        name: booking.service.name,
        category: booking.service.category || "service",
      },
    ];

    // Prepare customer details
    const customerDetails = {
      first_name: booking.customerName,
      email: booking.customerEmail || `${booking.customer.phoneNumber}@example.com`,
      phone: booking.customerPhone,
    };

    // Prepare payment type specific parameters
    let enabledPayments: string[] = [];
    let bankTransferConfig: any = {};

    switch (paymentType) {
      case "BANK_TRANSFER":
        if (!bank) {
          return {
            success: false,
            message: "Bank harus dipilih untuk Virtual Account",
            error: "BANK_REQUIRED",
          };
        }
        enabledPayments = ["bank_transfer"];
        bankTransferConfig = {
          bank_transfer: {
            bank: bank.toLowerCase(),
          },
        };
        break;

      case "GOPAY":
        enabledPayments = ["gopay"];
        break;

      case "QRIS":
        enabledPayments = ["qris"];
        break;

      case "OVO":
        enabledPayments = ["ovo"];
        break;

      case "SHOPEEPAY":
        enabledPayments = ["shopeepay"];
        break;

      default:
        return {
          success: false,
          message: "Tipe pembayaran tidak valid",
          error: "INVALID_PAYMENT_TYPE",
        };
    }

    // Prepare Snap API request
    const snapRequest = {
      transaction_details: transactionDetails,
      item_details: itemDetails,
      customer_details: customerDetails,
      enabled_payments: enabledPayments,
      ...bankTransferConfig,
      callbacks: {
        finish: `${process.env.NEXT_PUBLIC_APP_URL}/booking/${bookingNumber}?payment=success`,
        error: `${process.env.NEXT_PUBLIC_APP_URL}/booking/${bookingNumber}?payment=error`,
        pending: `${process.env.NEXT_PUBLIC_APP_URL}/booking/${bookingNumber}?payment=pending`,
      },
    };

    console.log("📤 Creating Midtrans payment:", {
      orderId: midtransOrderId,
      amount: depositAmount,
      paymentType,
      bank,
    });

    // Call Midtrans Snap API
    const response = await fetch(`${getMidtransSnapUrl()}/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${MIDTRANS_AUTH}`,
        Accept: "application/json",
      },
      body: JSON.stringify(snapRequest),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("❌ Midtrans API error:", result);
      return {
        success: false,
        message: result.error_messages?.[0] || "Gagal membuat link pembayaran",
        error: "MIDTRANS_API_ERROR",
      };
    }

    console.log("✅ Midtrans payment created:", result.token);

    // Save or update payment record
    const paymentData = {
      bookingId: booking.id,
      amount: booking.totalAmount,
      paidAmount: 0,
      paymentType: paymentType as any,
      status: "PENDING" as any,
      midtransOrderId,
      midtransTransactionId: result.token,
      paymentUrl: result.redirect_url,
      bank: bank?.toLowerCase(),
    };

    if (booking.payment) {
      await prisma.bookingPayment.update({
        where: { id: booking.payment.id },
        data: paymentData,
      });
    } else {
      await prisma.bookingPayment.create({
        data: paymentData,
      });
    }

    // Return appropriate response based on payment type
    if (paymentType === "BANK_TRANSFER") {
      // For VA, we need to get VA number from transaction status
      const statusResult = await checkTransactionStatus(midtransOrderId);
      return {
        success: true,
        paymentUrl: result.redirect_url,
        vaNumber: statusResult.vaNumber,
        message: `Link pembayaran berhasil dibuat. Silakan transfer ke VA ${bank?.toUpperCase()}: ${statusResult.vaNumber}`,
      };
    } else if (paymentType === "GOPAY" || paymentType === "SHOPEEPAY") {
      return {
        success: true,
        paymentUrl: result.redirect_url,
        deeplink: result.redirect_url,
        message: `Link pembayaran ${paymentType} berhasil dibuat. Klik link untuk membayar.`,
      };
    } else if (paymentType === "QRIS") {
      return {
        success: true,
        paymentUrl: result.redirect_url,
        qrCode: result.redirect_url,
        message: "QR Code pembayaran berhasil dibuat. Scan untuk membayar.",
      };
    }

    return {
      success: true,
      paymentUrl: result.redirect_url,
      message: "Link pembayaran berhasil dibuat",
    };
  } catch (error) {
    console.error("Error creating payment link:", error);
    return {
      success: false,
      message: "Gagal membuat link pembayaran",
      error: "SYSTEM_ERROR",
    };
  }
}

/**
 * Check transaction status from Midtrans
 */
export async function checkTransactionStatus(orderId: string): Promise<{
  success: boolean;
  status?: string;
  transactionStatus?: string;
  vaNumber?: string;
  paidAmount?: number;
  paidAt?: Date;
  message: string;
  error?: string;
}> {
  try {
    console.log("🔍 Checking Midtrans transaction status:", orderId);

    const response = await fetch(`${getMidtransApiUrl()}/v2/${orderId}/status`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${MIDTRANS_AUTH}`,
        Accept: "application/json",
      },
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("❌ Midtrans status check error:", result);
      return {
        success: false,
        message: "Gagal mengecek status pembayaran",
        error: "MIDTRANS_API_ERROR",
      };
    }

    console.log("✅ Transaction status:", result.transaction_status);

    // Extract VA number if available
    let vaNumber: string | undefined;
    if (result.va_numbers && result.va_numbers.length > 0) {
      vaNumber = result.va_numbers[0].va_number;
    } else if (result.permata_va_number) {
      vaNumber = result.permata_va_number;
    } else if (result.bca_va_number) {
      vaNumber = result.bca_va_number;
    }

    // Map Midtrans status to our status
    let status = "PENDING";
    let paidAmount = 0;
    let paidAt: Date | undefined;

    switch (result.transaction_status) {
      case "capture":
      case "settlement":
        status = "SETTLEMENT";
        paidAmount = parseFloat(result.gross_amount) * 100; // Convert to cents
        paidAt = new Date(result.settlement_time || result.transaction_time);
        break;
      case "pending":
        status = "PENDING";
        break;
      case "deny":
      case "cancel":
      case "expire":
        status = "FAILED";
        break;
      default:
        status = "PENDING";
    }

    return {
      success: true,
      status,
      transactionStatus: result.transaction_status,
      vaNumber,
      paidAmount,
      paidAt,
      message: `Status: ${result.transaction_status}`,
    };
  } catch (error) {
    console.error("Error checking transaction status:", error);
    return {
      success: false,
      message: "Gagal mengecek status pembayaran",
      error: "SYSTEM_ERROR",
    };
  }
}

/**
 * Check booking payment status
 */
export async function checkBookingPaymentStatus(
  customerId: string,
  bookingNumber: string
): Promise<{
  success: boolean;
  payment?: any;
  status?: string;
  message: string;
  error?: string;
}> {
  try {
    const booking = await prisma.booking.findFirst({
      where: {
        bookingNumber,
        customerId,
      },
      include: {
        payment: true,
      },
    });

    if (!booking) {
      return {
        success: false,
        message: "Booking tidak ditemukan",
        error: "BOOKING_NOT_FOUND",
      };
    }

    if (!booking.payment) {
      return {
        success: true,
        status: "NO_PAYMENT",
        message: "Belum ada pembayaran untuk booking ini",
      };
    }

    // If payment is pending, check latest status from Midtrans
    if (
      booking.payment.status === "PENDING" &&
      booking.payment.midtransOrderId
    ) {
      const statusResult = await checkTransactionStatus(
        booking.payment.midtransOrderId
      );

      if (statusResult.success && statusResult.status) {
        // Update payment record
        await prisma.bookingPayment.update({
          where: { id: booking.payment.id },
          data: {
            status: statusResult.status as any,
            paidAmount: statusResult.paidAmount || 0,
            paidAt: statusResult.paidAt,
          },
        });

        // If payment is settled, update booking status
        if (statusResult.status === "SETTLEMENT") {
          await prisma.booking.update({
            where: { id: booking.id },
            data: { status: "CONFIRMED" },
          });
        }

        return {
          success: true,
          payment: {
            ...booking.payment,
            status: statusResult.status,
            paidAmount: statusResult.paidAmount,
            paidAt: statusResult.paidAt,
          },
          status: statusResult.status,
          message: `Status pembayaran: ${statusResult.status}`,
        };
      }
    }

    return {
      success: true,
      payment: booking.payment,
      status: booking.payment.status,
      message: `Status pembayaran: ${booking.payment.status}`,
    };
  } catch (error) {
    console.error("Error checking booking payment status:", error);
    return {
      success: false,
      message: "Gagal mengecek status pembayaran",
      error: "SYSTEM_ERROR",
    };
  }
}

/**
 * Handle Midtrans webhook notification
 */
export async function handleMidtransWebhook(notification: any): Promise<{
  success: boolean;
  message: string;
  error?: string;
}> {
  try {
    console.log("📥 Received Midtrans webhook:", notification);

    const orderId = notification.order_id;
    const transactionStatus = notification.transaction_status;
    const fraudStatus = notification.fraud_status;

    // Verify notification signature
    const signatureKey = notification.signature_key;
    const expectedSignature = require("crypto")
      .createHash("sha512")
      .update(
        `${orderId}${notification.status_code}${notification.gross_amount}${MIDTRANS_SERVER_KEY}`
      )
      .digest("hex");

    if (signatureKey !== expectedSignature) {
      console.error("❌ Invalid signature");
      return {
        success: false,
        message: "Invalid signature",
        error: "INVALID_SIGNATURE",
      };
    }

    // Get payment record
    const payment = await prisma.bookingPayment.findFirst({
      where: { midtransOrderId: orderId },
      include: { booking: true },
    });

    if (!payment) {
      console.error("❌ Payment not found for order:", orderId);
      return {
        success: false,
        message: "Payment not found",
        error: "PAYMENT_NOT_FOUND",
      };
    }

    // Update payment status based on transaction status
    let newStatus = "PENDING";
    let bookingStatus = payment.booking.status;

    if (transactionStatus === "capture") {
      if (fraudStatus === "accept") {
        newStatus = "SETTLEMENT";
        bookingStatus = "CONFIRMED";
      }
    } else if (transactionStatus === "settlement") {
      newStatus = "SETTLEMENT";
      bookingStatus = "CONFIRMED";
    } else if (
      transactionStatus === "cancel" ||
      transactionStatus === "deny" ||
      transactionStatus === "expire"
    ) {
      newStatus = "FAILED";
    } else if (transactionStatus === "pending") {
      newStatus = "PENDING";
    }

    // Update payment
    await prisma.bookingPayment.update({
      where: { id: payment.id },
      data: {
        status: newStatus as any,
        midtransTransactionId: notification.transaction_id,
        paidAmount:
          newStatus === "SETTLEMENT"
            ? parseFloat(notification.gross_amount) * 100
            : 0,
        paidAt: newStatus === "SETTLEMENT" ? new Date() : null,
      },
    });

    // Update booking status
    await prisma.booking.update({
      where: { id: payment.bookingId },
      data: { status: bookingStatus },
    });

    console.log("✅ Payment updated:", {
      orderId,
      status: newStatus,
      bookingStatus,
    });

    return {
      success: true,
      message: "Webhook processed successfully",
    };
  } catch (error) {
    console.error("Error processing Midtrans webhook:", error);
    return {
      success: false,
      message: "Failed to process webhook",
      error: "SYSTEM_ERROR",
    };
  }
}
