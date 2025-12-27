import { getServiceById } from "@/app/lib/service-service";

/**
 * POST /api/service/details
 * Get service details by ID
 */
export async function POST(req: Request) {
  try {
    const { serviceId } = await req.json();

    if (!serviceId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "serviceId diperlukan",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await getServiceById(serviceId);

    if (!result.success) {
      return new Response(JSON.stringify(result), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in service details endpoint:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Terjadi kesalahan saat mengambil detail layanan",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * GET /api/service/details?serviceId=xxx
 * Get service details by ID (for browser access)
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const serviceId = url.searchParams.get("serviceId");

    if (!serviceId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "serviceId diperlukan",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await getServiceById(serviceId);

    if (!result.success) {
      return new Response(JSON.stringify(result), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in service details endpoint:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Terjadi kesalahan saat mengambil detail layanan",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
