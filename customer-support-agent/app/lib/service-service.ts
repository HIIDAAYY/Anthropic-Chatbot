/**
 * Service Management
 * Handles listing and retrieving services/treatments/packages
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface ListServicesParams {
  businessId?: string;
  category?: string;
}

/**
 * List all active services
 */
export async function listServices(params: ListServicesParams = {}) {
  try {
    const { businessId, category } = params;

    const services = await prisma.service.findMany({
      where: {
        isActive: true,
        ...(businessId && { businessId }),
        ...(category && { category }),
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return {
      success: true,
      services,
      count: services.length,
      message: `Ditemukan ${services.length} layanan`,
    };
  } catch (error) {
    console.error("Error listing services:", error);
    return {
      success: false,
      services: [],
      count: 0,
      message: "Gagal mengambil daftar layanan",
      error: "SYSTEM_ERROR",
    };
  }
}

/**
 * Get service by ID
 */
export async function getServiceById(serviceId: string) {
  try {
    const service = await prisma.service.findUnique({
      where: {
        id: serviceId,
        isActive: true,
      },
      include: {
        business: true,
      },
    });

    if (!service) {
      return {
        success: false,
        message: "Layanan tidak ditemukan",
        error: "SERVICE_NOT_FOUND",
      };
    }

    return {
      success: true,
      service,
      message: "Layanan ditemukan",
    };
  } catch (error) {
    console.error("Error getting service:", error);
    return {
      success: false,
      message: "Gagal mengambil data layanan",
      error: "SYSTEM_ERROR",
    };
  }
}

/**
 * Format services for chat display
 */
export function formatServicesForChat(services: any[]): string {
  if (services.length === 0) {
    return "Tidak ada layanan tersedia saat ini.";
  }

  let message = "📋 *Daftar Layanan*\n\n";

  // Group by business
  const grouped = services.reduce((acc: any, service) => {
    const businessName = service.business.name;
    if (!acc[businessName]) {
      acc[businessName] = [];
    }
    acc[businessName].push(service);
    return acc;
  }, {});

  for (const [businessName, businessServices] of Object.entries(grouped)) {
    message += `🏢 *${businessName}*\n`;

    (businessServices as any[]).forEach((service, index) => {
      const price = (service.price / 100).toLocaleString("id-ID");
      const duration = service.durationMinutes;
      const hours = Math.floor(duration / 60);
      const mins = duration % 60;
      const durationStr =
        hours > 0
          ? `${hours}j${mins > 0 ? ` ${mins}m` : ""}`
          : `${mins}m`;

      message += `\n${index + 1}. *${service.name}*\n`;
      if (service.description) {
        message += `   ${service.description}\n`;
      }
      message += `   💰 Rp ${price} | ⏱️ ${durationStr}\n`;
    });

    message += "\n";
  }

  return message.trim();
}

/**
 * Format single service for chat display
 */
export function formatServiceForChat(service: any): string {
  const price = (service.price / 100).toLocaleString("id-ID");
  const deposit = service.depositAmount
    ? (service.depositAmount / 100).toLocaleString("id-ID")
    : null;
  const duration = service.durationMinutes;
  const hours = Math.floor(duration / 60);
  const mins = duration % 60;
  const durationStr =
    hours > 0 ? `${hours} jam${mins > 0 ? ` ${mins} menit` : ""}` : `${mins} menit`;

  let message = `📋 *${service.name}*\n\n`;

  if (service.description) {
    message += `📝 ${service.description}\n\n`;
  }

  message += `🏢 ${service.business.name}\n`;
  message += `💰 Harga: Rp ${price}\n`;

  if (deposit) {
    message += `💵 DP: Rp ${deposit}\n`;
  }

  message += `⏱️ Durasi: ${durationStr}\n`;

  if (service.category) {
    message += `🏷️ Kategori: ${service.category}\n`;
  }

  return message;
}
