/**
 * Calendar and Resource Management Service
 * Handles availability checking and resource allocation
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Check if multiple resources are available during a time range
 */
export async function checkResourceAvailability(
  resourceIds: string[],
  startTime: Date,
  endTime: Date
): Promise<{
  success: boolean;
  available: boolean;
  conflicts?: any[];
  message: string;
}> {
  try {
    // Get all bookings that overlap with the requested time range
    const conflicts = await prisma.bookingResource.findMany({
      where: {
        resourceId: {
          in: resourceIds,
        },
        booking: {
          status: {
            in: ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"],
          },
          OR: [
            {
              // Booking starts during the requested time
              startTime: {
                gte: startTime,
                lt: endTime,
              },
            },
            {
              // Booking ends during the requested time
              endTime: {
                gt: startTime,
                lte: endTime,
              },
            },
            {
              // Booking completely overlaps the requested time
              AND: [
                {
                  startTime: {
                    lte: startTime,
                  },
                },
                {
                  endTime: {
                    gte: endTime,
                  },
                },
              ],
            },
          ],
        },
      },
      include: {
        resource: true,
        booking: true,
      },
    });

    if (conflicts.length > 0) {
      return {
        success: true,
        available: false,
        conflicts,
        message: `${conflicts.length} resource(s) tidak tersedia pada waktu tersebut`,
      };
    }

    return {
      success: true,
      available: true,
      message: "Semua resource tersedia",
    };
  } catch (error) {
    console.error("Error checking resource availability:", error);
    return {
      success: false,
      available: false,
      message: "Gagal mengecek ketersediaan resource",
    };
  }
}

/**
 * Allocate resources to a booking
 */
export async function allocateResources(
  bookingId: string,
  resourceIds: string[]
): Promise<{
  success: boolean;
  message: string;
  error?: string;
}> {
  try {
    // Create booking resource records
    await prisma.bookingResource.createMany({
      data: resourceIds.map((resourceId) => ({
        bookingId,
        resourceId,
      })),
      skipDuplicates: true,
    });

    return {
      success: true,
      message: `${resourceIds.length} resource(s) berhasil dialokasikan`,
    };
  } catch (error) {
    console.error("Error allocating resources:", error);
    return {
      success: false,
      message: "Gagal mengalokasikan resource",
      error: "SYSTEM_ERROR",
    };
  }
}

/**
 * Release resources from a booking
 */
export async function releaseResources(bookingId: string): Promise<{
  success: boolean;
  message: string;
  error?: string;
}> {
  try {
    const result = await prisma.bookingResource.deleteMany({
      where: {
        bookingId,
      },
    });

    return {
      success: true,
      message: `${result.count} resource(s) berhasil dilepas`,
    };
  } catch (error) {
    console.error("Error releasing resources:", error);
    return {
      success: false,
      message: "Gagal melepas resource",
      error: "SYSTEM_ERROR",
    };
  }
}

/**
 * Check if a date is a blackout date
 */
export async function isBlackoutDate(
  businessId: string,
  date: Date
): Promise<boolean> {
  try {
    const blackout = await prisma.blackoutDate.findFirst({
      where: {
        businessId,
        date: date,
      },
    });

    return blackout !== null;
  } catch (error) {
    console.error("Error checking blackout date:", error);
    return false;
  }
}

/**
 * Get available time slots for a service on a specific date
 */
export async function getAvailableSlots(
  businessId: string,
  serviceId: string,
  date: Date
): Promise<{
  success: boolean;
  slots: string[];
  message: string;
}> {
  try {
    // Get service and business details
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        business: true,
      },
    });

    if (!service) {
      return {
        success: false,
        slots: [],
        message: "Service tidak ditemukan",
      };
    }

    // Check if date is blackout
    const isBlackout = await isBlackoutDate(businessId, date);
    if (isBlackout) {
      return {
        success: false,
        slots: [],
        message: "Tanggal tidak tersedia (hari libur)",
      };
    }

    // Get business hours for this day
    const dayOfWeek = date
      .toLocaleDateString("en-US", { weekday: "short" })
      .toLowerCase();
    const businessHours = service.business.businessHours as any;
    const dayHours = businessHours[dayOfWeek];

    if (!dayHours || dayHours.length === 0) {
      return {
        success: false,
        slots: [],
        message: "Bisnis tutup pada hari tersebut",
      };
    }

    // Generate all possible slots
    const allSlots: string[] = [];
    for (const hourRange of dayHours) {
      const [start, end] = hourRange.split("-");
      const [startHour, startMin] = start.split(":").map(Number);
      const [endHour, endMin] = end.split(":").map(Number);

      let currentHour = startHour;
      let currentMin = startMin;

      while (
        currentHour < endHour ||
        (currentHour === endHour && currentMin < endMin)
      ) {
        const timeString = `${currentHour.toString().padStart(2, "0")}:${currentMin.toString().padStart(2, "0")}`;
        allSlots.push(timeString);

        // Advance by service duration
        currentMin += service.durationMinutes;
        if (currentMin >= 60) {
          currentHour += Math.floor(currentMin / 60);
          currentMin = currentMin % 60;
        }
      }
    }

    // Get existing bookings for this date
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

    // Filter out booked slots
    const availableSlots = allSlots.filter((slot) => {
      const slotTime = new Date(`${date.toISOString().split("T")[0]}T${slot}:00`).getTime();

      for (const booking of bookings) {
        const bookingStart = booking.startTime.getTime();
        const bookingEnd = booking.endTime.getTime();

        // Check if slot conflicts with any booking
        if (slotTime >= bookingStart && slotTime < bookingEnd) {
          return false;
        }
      }
      return true;
    });

    return {
      success: true,
      slots: availableSlots,
      message: `Ditemukan ${availableSlots.length} slot tersedia`,
    };
  } catch (error) {
    console.error("Error getting available slots:", error);
    return {
      success: false,
      slots: [],
      message: "Gagal mengambil slot tersedia",
    };
  }
}

/**
 * Get resource by ID
 */
export async function getResourceById(resourceId: string) {
  try {
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      include: {
        business: true,
      },
    });

    if (!resource) {
      return {
        success: false,
        message: "Resource tidak ditemukan",
      };
    }

    return {
      success: true,
      resource,
      message: "Resource ditemukan",
    };
  } catch (error) {
    console.error("Error getting resource:", error);
    return {
      success: false,
      message: "Gagal mengambil data resource",
    };
  }
}

/**
 * List all resources for a business
 */
export async function listBusinessResources(
  businessId: string,
  type?: string
) {
  try {
    const resources = await prisma.resource.findMany({
      where: {
        businessId,
        isActive: true,
        ...(type && { type: type as any }),
      },
      orderBy: {
        name: "asc",
      },
    });

    return {
      success: true,
      resources,
      count: resources.length,
      message: `Ditemukan ${resources.length} resource`,
    };
  } catch (error) {
    console.error("Error listing resources:", error);
    return {
      success: false,
      resources: [],
      count: 0,
      message: "Gagal mengambil daftar resource",
    };
  }
}
