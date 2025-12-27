import { listServices } from "@/app/lib/service-service";

/**
 * POST /api/service/list
 * List all available services with optional filters
 */
export async function POST(req: Request) {
  try {
    const { businessId, category } = await req.json();

    const result = await listServices({ businessId, category });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in service list endpoint:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Terjadi kesalahan saat mengambil daftar layanan",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * GET /api/service/list
 * List all available services (for browser access)
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const businessId = url.searchParams.get("businessId") || undefined;
    const category = url.searchParams.get("category") || undefined;

    const result = await listServices({ businessId, category });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in service list endpoint:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Terjadi kesalahan saat mengambil daftar layanan",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
