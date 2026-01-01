/**
 * Booking Service
 * Handles all booking/appointment operations for beauty clinics and travel agencies
 */

import { PrismaClient, BookingStatus, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

export interface CreateBookingParams {
  customerId: string;
  businessId: string;
  serviceId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  notes?: string;
}

export interface AvailabilityResult {
  success: boolean;
  available: boolean;
  slots?: string[];
  message: string;
  error?: string;
}

export interface BookingResult {
  success: boolean;
  booking?: any;
  message: string;
  error?: string;
}

/**
 * Generate unique booking number
 */
function generateBookingNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `BKG-${year}-${random}`;
}

/**
 * Parse date and time strings into DateTime
 */
function parseDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00`);
}

/**
 * Check if a time slot is available for booking
 */
export async function checkAvailability(
  serviceId: string,
  date: string,
  preferredTime?: string
): Promise<AvailabilityResult> {
  try {
    // Get service details
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        business: {
          include: {
            settings: true,
          },
        },
      },
    });

    if (!service) {
      return {
        success: false,
        available: false,
        message: "Service tidak ditemukan",
        error: "SERVICE_NOT_FOUND",
      };
    }

    if (!service.isActive) {
      return {
        success: false,
        available: false,
        message: "Service sedang tidak tersedia",
        error: "SERVICE_INACTIVE",
      };
    }

    // Check if date is in the past
    // Parse date string as local date (not UTC) to avoid timezone issues
    const [year, month, day] = date.split("-").map(Number);
    const bookingDate = new Date(year, month - 1, day); // month is 0-indexed
    bookingDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (bookingDate < today) {
      return {
        success: false,
        available: false,
        message: "Tanggal sudah lewat",
        error: "DATE_IN_PAST",
      };
    }

    // Check blackout dates
    const blackout = await prisma.blackoutDate.findFirst({
      where: {
        businessId: service.businessId,
        date: bookingDate,
      },
    });

    if (blackout) {
      return {
        success: false,
        available: false,
        message: `Tanggal tidak tersedia: ${blackout.reason}`,
        error: "BLACKOUT_DATE",
      };
    }

    // Check business hours
    const dayOfWeek = bookingDate
      .toLocaleDateString("en-US", { weekday: "short" })
      .toLowerCase();
    const businessHours = service.business.businessHours as any;
    const dayHours = businessHours[dayOfWeek];

    if (!dayHours || dayHours.length === 0) {
      return {
        success: false,
        available: false,
        message: "Bisnis tutup pada hari tersebut",
        error: "BUSINESS_CLOSED",
      };
    }

    // Get available slots
    const slots = await getAvailableSlots(
      service.businessId,
      serviceId,
      bookingDate
    );

    if (preferredTime) {
      const isAvailable = slots.includes(preferredTime);
      return {
        success: true,
        available: isAvailable,
        slots: slots,
        message: isAvailable
          ? `Slot ${preferredTime} tersedia`
          : `Slot ${preferredTime} tidak tersedia. Slot lain: ${slots.join(", ")}`,
      };
    }

    return {
      success: true,
      available: slots.length > 0,
      slots: slots,
      message:
        slots.length > 0
          ? `Tersedia ${slots.length} slot`
          : "Tidak ada slot tersedia",
    };
  } catch (error) {
    console.error("Error checking availability:", error);
    return {
      success: false,
      available: false,
      message: "Gagal mengecek ketersediaan",
      error: "SYSTEM_ERROR",
    };
  }
}

/**
 * Get available time slots for a specific date
 */
async function getAvailableSlots(
  businessId: string,
  serviceId: string,
  date: Date
): Promise<string[]> {
  try {
    // Get service duration
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        business: true,
      },
    });

    if (!service) return [];

    // Get business hours for this day
    const dayOfWeek = date
      .toLocaleDateString("en-US", { weekday: "short" })
      .toLowerCase();
    const businessHours = service.business.businessHours as any;
    const dayHours = businessHours[dayOfWeek];

    if (!dayHours || dayHours.length === 0) return [];

    // Parse business hours (e.g., ["09:00-17:00"])
    const slots: string[] = [];
    for (const hourRange of dayHours) {
      const [start, end] = hourRange.split("-");
      const [startHour, startMin] = start.split(":").map(Number);
      const [endHour, endMin] = end.split(":").map(Number);

      // Generate slots
      let currentHour = startHour;
      let currentMin = startMin;

      while (
        currentHour < endHour ||
        (currentHour === endHour && currentMin < endMin)
      ) {
        const timeString = `${currentHour.toString().padStart(2, "0")}:${currentMin.toString().padStart(2, "0")}`;
        slots.push(timeString);

        // Advance by service duration
        currentMin += service.durationMinutes;
        if (currentMin >= 60) {
          currentHour += Math.floor(currentMin / 60);
          currentMin = currentMin % 60;
        }
      }
    }

    // Filter out booked slots
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await prisma.booking.findMany({
      where: {
        businessId: businessId,
        bookingDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          in: ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"],
        },
      },
      select: {
        startTime: true,
        endTime: true,
      },
    });

    // Remove booked slots
    const availableSlots = slots.filter((slot) => {
      const slotTime = parseDateTime(
        date.toISOString().split("T")[0],
        slot
      ).getTime();

      for (const booking of bookings) {
        const bookingStart = booking.startTime.getTime();
        const bookingEnd = booking.endTime.getTime();

        if (slotTime >= bookingStart && slotTime < bookingEnd) {
          return false;
        }
      }
      return true;
    });

    return availableSlots;
  } catch (error) {
    console.error("Error getting available slots:", error);
    return [];
  }
}

/**
 * Create a new booking
 */
export async function createBooking(
  params: CreateBookingParams
): Promise<BookingResult> {
  try {
    const { customerId, businessId, serviceId, date, time, customerName, customerPhone, customerEmail, notes } = params;

    // Check availability first
    const availability = await checkAvailability(serviceId, date, time);
    if (!availability.success || !availability.available) {
      return {
        success: false,
        message: availability.message,
        error: availability.error,
      };
    }

    // Get service details
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        business: {
          include: {
            settings: true,
          },
        },
      },
    });

    if (!service) {
      return {
        success: false,
        message: "Service tidak ditemukan",
        error: "SERVICE_NOT_FOUND",
      };
    }

    // Calculate start and end time
    const startTime = parseDateTime(date, time);
    const endTime = new Date(
      startTime.getTime() + service.durationMinutes * 60000
    );

    // Generate booking number
    const bookingNumber = generateBookingNumber();

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        bookingNumber,
        customerId,
        businessId,
        serviceId,
        bookingDate: new Date(date),
        startTime,
        endTime,
        status: "PENDING",
        customerName,
        customerPhone,
        customerEmail,
        notes,
        totalAmount: service.price,
        depositAmount: service.depositAmount,
      },
      include: {
        service: true,
        business: true,
      },
    });

    return {
      success: true,
      booking,
      message: `Booking berhasil dibuat dengan nomor ${bookingNumber}`,
    };
  } catch (error) {
    console.error("Error creating booking:", error);
    return {
      success: false,
      message: "Gagal membuat booking",
      error: "SYSTEM_ERROR",
    };
  }
}

/**
 * Get booking by booking number
 */
export async function getBookingByNumber(
  customerId: string,
  bookingNumber: string
): Promise<BookingResult> {
  try {
    const booking = await prisma.booking.findFirst({
      where: {
        bookingNumber,
        customerId,
      },
      include: {
        service: true,
        business: true,
        payment: true,
        resources: {
          include: {
            resource: true,
          },
        },
      },
    });

    if (!booking) {
      return {
        success: false,
        message: "Booking tidak ditemukan",
        error: "BOOKING_NOT_FOUND",
      };
    }

    return {
      success: true,
      booking,
      message: "Booking ditemukan",
    };
  } catch (error) {
    console.error("Error getting booking:", error);
    return {
      success: false,
      message: "Gagal mengambil data booking",
      error: "SYSTEM_ERROR",
    };
  }
}

/**
 * List all bookings for a customer
 */
export async function listCustomerBookings(customerId: string): Promise<{
  success: boolean;
  bookings?: any[];
  message: string;
  error?: string;
}> {
  try {
    const bookings = await prisma.booking.findMany({
      where: {
        customerId,
      },
      include: {
        service: true,
        business: true,
        payment: true,
      },
      orderBy: {
        bookingDate: "desc",
      },
    });

    return {
      success: true,
      bookings,
      message: `Ditemukan ${bookings.length} booking`,
    };
  } catch (error) {
    console.error("Error listing bookings:", error);
    return {
      success: false,
      message: "Gagal mengambil daftar booking",
      error: "SYSTEM_ERROR",
    };
  }
}

/**
 * Reschedule a booking
 */
export async function rescheduleBooking(
  customerId: string,
  bookingNumber: string,
  newDate: string,
  newTime: string
): Promise<BookingResult> {
  try {
    // Get existing booking
    const existing = await prisma.booking.findFirst({
      where: {
        bookingNumber,
        customerId,
      },
      include: {
        service: true,
      },
    });

    if (!existing) {
      return {
        success: false,
        message: "Booking tidak ditemukan",
        error: "BOOKING_NOT_FOUND",
      };
    }

    // Check if can reschedule
    if (!["PENDING", "CONFIRMED"].includes(existing.status)) {
      return {
        success: false,
        message: `Booking dengan status ${existing.status} tidak bisa diubah`,
        error: "INVALID_STATUS",
      };
    }

    // Check new availability
    const availability = await checkAvailability(
      existing.serviceId,
      newDate,
      newTime
    );
    if (!availability.success || !availability.available) {
      return {
        success: false,
        message: availability.message,
        error: availability.error,
      };
    }

    // Update booking
    const newStartTime = parseDateTime(newDate, newTime);
    const newEndTime = new Date(
      newStartTime.getTime() + existing.service.durationMinutes * 60000
    );

    const updated = await prisma.booking.update({
      where: { id: existing.id },
      data: {
        bookingDate: new Date(newDate),
        startTime: newStartTime,
        endTime: newEndTime,
      },
      include: {
        service: true,
        business: true,
      },
    });

    return {
      success: true,
      booking: updated,
      message: "Booking berhasil diubah",
    };
  } catch (error) {
    console.error("Error rescheduling booking:", error);
    return {
      success: false,
      message: "Gagal mengubah booking",
      error: "SYSTEM_ERROR",
    };
  }
}

/**
 * Cancel a booking
 */
export async function cancelBooking(
  customerId: string,
  bookingNumber: string,
  reason?: string
): Promise<BookingResult> {
  try {
    // Get existing booking
    const existing = await prisma.booking.findFirst({
      where: {
        bookingNumber,
        customerId,
      },
    });

    if (!existing) {
      return {
        success: false,
        message: "Booking tidak ditemukan",
        error: "BOOKING_NOT_FOUND",
      };
    }

    // Check if already cancelled
    if (existing.status === "CANCELLED") {
      return {
        success: false,
        message: "Booking sudah dibatalkan",
        error: "ALREADY_CANCELLED",
      };
    }

    // Check if can cancel
    if (["COMPLETED", "NO_SHOW"].includes(existing.status)) {
      return {
        success: false,
        message: `Booking dengan status ${existing.status} tidak bisa dibatalkan`,
        error: "INVALID_STATUS",
      };
    }

    // Update booking
    const updated = await prisma.booking.update({
      where: { id: existing.id },
      data: {
        status: "CANCELLED",
        cancellationReason: reason,
        cancelledAt: new Date(),
      },
      include: {
        service: true,
        business: true,
      },
    });

    return {
      success: true,
      booking: updated,
      message: "Booking berhasil dibatalkan",
    };
  } catch (error) {
    console.error("Error cancelling booking:", error);
    return {
      success: false,
      message: "Gagal membatalkan booking",
      error: "SYSTEM_ERROR",
    };
  }
}

/**
 * Format booking for chat display
 */
export function formatBookingForChat(booking: any): string {
  const date = new Date(booking.bookingDate).toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const time = new Date(booking.startTime).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  let status = "";
  switch (booking.status) {
    case "PENDING":
      status = "⏳ Menunggu Pembayaran";
      break;
    case "CONFIRMED":
      status = "✅ Terkonfirmasi";
      break;
    case "CHECKED_IN":
      status = "📍 Check-in";
      break;
    case "IN_PROGRESS":
      status = "🔄 Sedang Berlangsung";
      break;
    case "COMPLETED":
      status = "✔️ Selesai";
      break;
    case "CANCELLED":
      status = "❌ Dibatalkan";
      break;
    case "NO_SHOW":
      status = "⚠️ Tidak Hadir";
      break;
  }

  const amount = (booking.totalAmount / 100).toLocaleString("id-ID");

  let message = `📅 *Booking ${booking.bookingNumber}*\n\n`;
  message += `🏢 ${booking.business.name}\n`;
  message += `💆 ${booking.service.name}\n`;
  message += `📆 ${date}\n`;
  message += `🕐 ${time}\n`;
  message += `${status}\n`;
  message += `💰 Rp ${amount}\n`;

  if (booking.payment && booking.payment.status === "SETTLEMENT") {
    message += `✅ Pembayaran: Lunas\n`;
  } else if (booking.payment && booking.payment.status === "PENDING") {
    message += `⏳ Pembayaran: Menunggu\n`;
  }

  if (booking.notes) {
    message += `\n📝 Catatan: ${booking.notes}`;
  }

  return message;
}
