import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Check stock for a specific product
 */
export async function checkProductStock(productId: string) {
  try {
    const inventory = await prisma.inventory.findUnique({
      where: { productId },
    });

    if (!inventory) {
      return {
        success: false,
        error: "Produk tidak ditemukan dalam sistem inventory",
        inStock: false,
        quantity: 0,
      };
    }

    return {
      success: true,
      productId: inventory.productId,
      productName: inventory.productName,
      quantity: inventory.quantity,
      inStock: inventory.quantity > 0,
      warehouseLocation: inventory.warehouseLocation,
      lastUpdated: inventory.lastUpdated,
    };
  } catch (error) {
    console.error("Error checking product stock:", error);
    return {
      success: false,
      error: "Gagal mengecek ketersediaan stok",
      inStock: false,
      quantity: 0,
    };
  }
}

/**
 * Check stock for multiple products
 */
export async function checkMultipleProductsStock(productIds: string[]) {
  try {
    const inventories = await prisma.inventory.findMany({
      where: {
        productId: { in: productIds },
      },
    });

    const stockMap = new Map(
      inventories.map((inv) => [
        inv.productId,
        {
          productName: inv.productName,
          quantity: inv.quantity,
          inStock: inv.quantity > 0,
          warehouseLocation: inv.warehouseLocation,
        },
      ])
    );

    return {
      success: true,
      stocks: stockMap,
      totalProducts: productIds.length,
      productsInStock: inventories.filter((inv) => inv.quantity > 0).length,
    };
  } catch (error) {
    console.error("Error checking multiple products stock:", error);
    return {
      success: false,
      error: "Gagal mengecek ketersediaan stok",
      stocks: new Map(),
    };
  }
}

/**
 * Check if product can be ordered (stock > 0 and quantity <= stock)
 */
export async function canOrderProduct(
  productId: string,
  requestedQuantity: number
): Promise<{
  success: boolean;
  canOrder: boolean;
  availableQuantity: number;
  error?: string;
}> {
  try {
    const inventory = await prisma.inventory.findUnique({
      where: { productId },
    });

    if (!inventory) {
      return {
        success: false,
        canOrder: false,
        availableQuantity: 0,
        error: "Produk tidak ditemukan",
      };
    }

    const canOrder = inventory.quantity >= requestedQuantity;

    return {
      success: true,
      canOrder,
      availableQuantity: inventory.quantity,
      ...(canOrder ? {} : { error: `Stok hanya tersedia ${inventory.quantity} unit` }),
    };
  } catch (error) {
    console.error("Error checking if product can be ordered:", error);
    return {
      success: false,
      canOrder: false,
      availableQuantity: 0,
      error: "Gagal mengecek ketersediaan",
    };
  }
}

/**
 * Get low stock products (quantity <= 10)
 */
export async function getLowStockProducts() {
  try {
    const lowStockItems = await prisma.inventory.findMany({
      where: {
        quantity: { lte: 10 },
      },
      orderBy: { quantity: "asc" },
    });

    return {
      success: true,
      lowStockItems,
      count: lowStockItems.length,
    };
  } catch (error) {
    console.error("Error fetching low stock products:", error);
    return {
      success: false,
      error: "Gagal mengambil daftar stok terbatas",
      lowStockItems: [],
    };
  }
}

/**
 * Get out of stock products
 */
export async function getOutOfStockProducts() {
  try {
    const outOfStockItems = await prisma.inventory.findMany({
      where: { quantity: 0 },
      orderBy: { lastUpdated: "desc" },
    });

    return {
      success: true,
      outOfStockItems,
      count: outOfStockItems.length,
    };
  } catch (error) {
    console.error("Error fetching out of stock products:", error);
    return {
      success: false,
      error: "Gagal mengambil daftar produk habis",
      outOfStockItems: [],
    };
  }
}

/**
 * Update product stock (admin/system use)
 * NOTE: In production, this should have proper authorization
 */
export async function updateProductStock(
  productId: string,
  newQuantity: number,
  reason: string = "Manual update"
) {
  try {
    const updated = await prisma.inventory.update({
      where: { productId },
      data: {
        quantity: newQuantity,
        lastUpdated: new Date(),
      },
    });

    console.log(
      `📊 Stock updated for ${updated.productName}: ${newQuantity} units (Reason: ${reason})`
    );

    return {
      success: true,
      inventory: updated,
    };
  } catch (error) {
    console.error("Error updating product stock:", error);
    return {
      success: false,
      error: "Gagal memperbarui stok",
    };
  }
}

/**
 * Format stock info for chat display
 */
export function formatStockForChat(stock: {
  productName: string;
  quantity: number;
  inStock: boolean;
}): string {
  if (stock.inStock) {
    return `
✅ **${stock.productName}**
Status: Tersedia
Stok: ${stock.quantity} unit
    `.trim();
  } else {
    return `
❌ **${stock.productName}**
Status: Habis Terjual
Notifikasi: Silakan aktifkan "Beri Tahu Saya" di halaman produk untuk mendapat informasi ketika stok kembali tersedia.
    `.trim();
  }
}

/**
 * Check and get availability message
 */
export function getAvailabilityMessage(productName: string, inStock: boolean): string {
  if (inStock) {
    return `Produk ${productName} saat ini tersedia dan siap dipesan. Silakan checkout sekarang sebelum stok habis!`;
  } else {
    return `Produk ${productName} saat ini habis. Anda bisa mengaktifkan notifikasi "Beri Tahu Saya" di halaman produk agar mendapat informasi ketika stok tersedia kembali.`;
  }
}
