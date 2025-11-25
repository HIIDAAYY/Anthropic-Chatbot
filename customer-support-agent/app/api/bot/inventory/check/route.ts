import {
  checkProductStock,
  checkMultipleProductsStock,
  canOrderProduct,
} from "@/app/lib/inventory-service";

/**
 * POST /api/bot/inventory/check
 * Check stock for one or multiple products
 */
export async function POST(req: Request) {
  try {
    const { productIds, quantities } = await req.json();

    // Validate input
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "productIds array diperlukan",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Single product check
    if (productIds.length === 1) {
      const productId = productIds[0];
      const requestedQty = quantities ? quantities[0] : 1;

      // Check if specific quantity can be ordered
      if (requestedQty) {
        const canOrderResult = await canOrderProduct(productId, requestedQty);
        return new Response(JSON.stringify(canOrderResult), {
          status: canOrderResult.success ? 200 : 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Just check stock
      const stockResult = await checkProductStock(productId);
      return new Response(JSON.stringify(stockResult), {
        status: stockResult.success ? 200 : 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Multiple products check
    const multipleResult = await checkMultipleProductsStock(productIds);

    // Convert Map to object for JSON serialization
    const stocksArray = Array.from(multipleResult.stocks.entries()).map(
      ([productId, stock]) => ({
        productId,
        ...stock,
      })
    );

    return new Response(
      JSON.stringify({
        success: multipleResult.success,
        stocks: stocksArray,
        totalProducts: multipleResult.totalProducts,
        productsInStock: multipleResult.productsInStock,
        error: multipleResult.error,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in inventory check endpoint:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Terjadi kesalahan saat mengecek ketersediaan stok",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
