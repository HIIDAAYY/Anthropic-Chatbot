/**
 * Admin API: Sales Analytics Dashboard
 * GET /api/admin/sales?key=xxx&range=30d
 * Returns comprehensive sales analytics data
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSalesDashboardData, DateRange } from '@/app/lib/sales-analytics-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Simple auth check using query parameter
    const key = req.nextUrl.searchParams.get('key');

    if (!key || key !== process.env.ADMIN_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid admin key' },
        { status: 401 }
      );
    }

    // Get date range from query params (default: 30d)
    const rangeParam = req.nextUrl.searchParams.get('range') || '30d';
    const validRanges: DateRange[] = ['7d', '30d', '90d', 'all'];
    const range: DateRange = validRanges.includes(rangeParam as DateRange)
      ? (rangeParam as DateRange)
      : '30d';

    console.log(`📊 Fetching sales analytics for range: ${range}...`);

    // Get comprehensive sales dashboard data
    const dashboardData = await getSalesDashboardData(range);

    console.log('✅ Sales analytics generated successfully');
    console.log(`   - Conversations: ${dashboardData.overview.totalConversations}`);
    console.log(`   - Conversion Rate: ${dashboardData.overview.conversionRate}%`);
    console.log(`   - Total Revenue: Rp ${dashboardData.overview.totalRevenue.toLocaleString()}`);

    // Create response with no-cache headers
    const response = NextResponse.json(dashboardData);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('❌ Error fetching sales analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales analytics' },
      { status: 500 }
    );
  }
}
